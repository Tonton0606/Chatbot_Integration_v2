const express = require("express");
const { safeError } = require('../../utils/safeError');
const fs = require("fs");
const path = require("path");
const { supabase } = require("../../config/supabase");

const {
  createFacebookConfigService,
  normalizePageId,
  normalizeText,
} = require("../../services/facebook/facebookConfig");

const {
  matchAutoReplyRule,
  getActiveAutoReplyRules,
} = require("../../services/facebook/facebookAutoReplyRules");

const {
  createFacebookGraphApi,
  getTypingDelayMs,
  sleep,
} = require("../../services/facebook/facebookGraphApi");

const {
  compactFacebookReply,
} = require("../../services/facebook/facebookReplyUtils");

const {
  createFacebookChatbotReplyService,
} = require("../../services/facebook/facebookChatbotReply");

const {
  createFacebookWebhookSecurity,
} = require("../../services/facebook/facebookWebhookSecurity");

const {
  createFacebookConversationStateService,
} = require("../../services/facebook/facebookConversationState");

const {
  initConversationCache,
  getConversationHistory: cacheGetHistory,
  setConversationHistory: cacheSetHistory,
  cleanupExpiredConversations,
} = require("../../services/facebook/facebookConversationCache");

const {
  createFacebookClientConnectService,
} = require("../../services/facebook/facebookClientConnectService");

const {
  createFacebookWebhookMonitoringService,
} = require("../../services/facebook/facebookWebhookMonitoring");

const {
  createFacebookWebhookAlertingService,
} = require("../../services/facebook/facebookWebhookAlerting");

const {
  createFacebookConversationAnalyticsService,
} = require("../../services/facebook/facebookConversationAnalytics");

const {
  createFacebookWebhookIpAllowlistService,
} = require("../../services/facebook/facebookWebhookIpAllowlist");


const {
  createFacebookKnowledgeManager,
} = require("../../services/facebook/facebookKnowledgeManager");

const handoffManager = require("../../services/facebook/handoffManager");
const { isHumanHandoffRequest, isTagalogStyle } = require("../../utils/handoffDetection");
const { handleFacebookSalesConversation } = require("../../services/facebook/facebookSalesFlow");
const { handleFacebookComment } = require("../../services/facebook/facebookCommentAutoReply");
const {
  isWithinBusinessHours,
  getAwayMessage,
  getResponseDelayMs,
  detectSentiment,
  autoTagConversation,
} = require("../../services/facebook/chatbotAutomationService");

const { requireAuth } = require("../../middleware/auth");
const logger = require("../../config/logger");
const router = express.Router();

router.use("/admin", requireAuth);
router.use("/client", requireAuth);
router.use("/auto-reply-rules", requireAuth);
router.use("/flow-sequences", requireAuth);
router.use("/broadcasts", requireAuth);
router.use("/analytics", requireAuth);

const FB_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_manage_posts",
  "read_page_mailboxes",
];

const oauthPagesCache = new Map();
const OAUTH_CACHE_TTL_MS = 5 * 60 * 1000;

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

function getBackendUrl() {
  return process.env.BACKEND_URL || "http://localhost:5000";
}

function encodeOAuthState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeOAuthState(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getFacebookAppId() {
  return process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID || "";
}

router.get("/oauth/callback", async (req, res) => {
  const { code, state, error, error_reason } = req.query;

  const oauthRedirectBase = getFrontendUrl();
  const oauthRedirectPath = "/Admin/SocialMediaHub?tab=builder";

  if (error) {
    const params = new URLSearchParams({ oauth_error: error, oauth_reason: error_reason || "" });
    return res.redirect(`${oauthRedirectBase}${oauthRedirectPath}&${params.toString()}`);
  }

  if (!code || !state) {
    return res.redirect(`${oauthRedirectBase}${oauthRedirectPath}&oauth_error=missing_params`);
  }

  let parsedState;
  try {
    parsedState = decodeOAuthState(state);
  } catch {
    return res.redirect(`${oauthRedirectBase}${oauthRedirectPath}&oauth_error=invalid_state`);
  }

  const role = normalizeText(parsedState.role);

  const workspaceId = normalizeText(parsedState.workspaceId);
  const appId = getFacebookAppId();
  const appSecret = process.env.FB_APP_SECRET || "";

  if (!appId || !appSecret) {
    logger.error("FACEBOOK_APP_ID or FB_APP_SECRET not configured for OAuth");
    return res.redirect(`${oauthRedirectBase}${oauthRedirectPath}&oauth_error=app_not_configured`);
  }

  try {
    const redirectUri = `${getBackendUrl()}/api/webhooks/facebook/oauth/callback`;
    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Token exchange failed");
    }

    const userAccessToken = tokenData.access_token;

    const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,category,picture&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      throw new Error(pagesData.error.message || "Failed to fetch pages");
    }

    const pages = (Array.isArray(pagesData.data) ? pagesData.data : []).map(p => ({
      pageId: String(p.id),
      pageName: p.name || "",
      pageAccessToken: p.access_token || "",
      category: p.category || "",
      pictureUrl: p.picture?.data?.url || "",
    }));

    oauthPagesCache.set(workspaceId, {
      pages,
      cachedAt: Date.now(),
    });

    logger.info({ workspaceId, pageCount: pages.length }, "Facebook OAuth pages cached");

    const clientRedirectPath = role === "client" || role === "user"
      ? "/Client/Chatbot"
      : "/Admin/SocialMediaHub?tab=builder";
    const finalRedirectBase = normalizeText(parsedState.redirectPath)
      ? `${getFrontendUrl()}${parsedState.redirectPath}`
      : `${getFrontendUrl()}${clientRedirectPath}`;

    const params = new URLSearchParams({ oauth_success: "1", workspace: workspaceId });
    const separator = finalRedirectBase.includes("?") ? "&" : "?";
    return res.redirect(`${finalRedirectBase}${separator}${params.toString()}`);
  } catch (err) {
    logger.error({ err, workspaceId }, "Facebook OAuth callback failed");
    const params = new URLSearchParams({ oauth_error: "callback_failed", oauth_message: err.message || "" });
    return res.redirect(`${oauthRedirectBase}${oauthRedirectPath}&${params.toString()}`);
  }
});


const DEFAULT_CHATBOT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const WEBHOOK_EVENT_TTL_MS = 2 * 60 * 1000;
const recentWebhookEvents = new Map();
const LOCAL_FACEBOOK_PAGES_FILE = path.resolve(
  __dirname,
  "../../data/facebook-pages.json"
);

const fbRuntimeConfig = {
  pageId: "",
  pageName: "",
  pageAccessToken: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  knowledge: "",
  connectedWorkspaceId: "",
  verifyToken: "",
  appSecret: "",
};

const supabaseClient = supabase;

initConversationCache(supabaseClient);

const facebookConfigService = createFacebookConfigService({
  supabaseClient,
  runtimeConfig: fbRuntimeConfig,
  env: process.env,
});

const facebookClientConnectService = createFacebookClientConnectService({
  supabaseClient,
});

const {
  upsertPageSettings,
} = facebookClientConnectService;

const {
  getSupabaseFacebookPages,
  getSupabaseFacebookPagesByWorkspaceId,
  saveSupabasePageToken,
  updateSupabasePageAccessMode,
  updateSupabasePageDetails,
  deleteSupabasePage,
  getFacebookConfig,
  saveRuntimeConfig,
} = facebookConfigService;

const facebookGraphApi = createFacebookGraphApi({
  getFacebookConfig,
});

const {
  fetchFacebookPageConversations,
  subscribeFacebookPageToApp,
  sendFacebookMessage,
  sendFacebookSenderAction,
  sendQuickReplies,
  sendProductCarousel,
} = facebookGraphApi;

const {
  generateChatbotReply,
} = createFacebookChatbotReplyService({
  defaultChatbotModel: DEFAULT_CHATBOT_MODEL,
  env: process.env,
});

const {
  verifyFacebookSignature,
} = createFacebookWebhookSecurity({
  getFacebookConfig,
});

const conversationStateService = createFacebookConversationStateService({
  supabaseClient,
});

const webhookMonitoringService = createFacebookWebhookMonitoringService({
  supabaseClient,
});

const webhookAlertingService = createFacebookWebhookAlertingService({
  supabaseClient,
});

const conversationAnalyticsService = createFacebookConversationAnalyticsService({
  supabaseClient,
});

const webhookIpAllowlistService = createFacebookWebhookIpAllowlistService({
  supabaseClient,
});

function buildConversationKey(pageId, senderId) {
  const normalizedPageId = normalizePageId(pageId) || "default";
  const normalizedSenderId =
    typeof senderId === "string"
      ? senderId.trim()
      : String(senderId || "").trim();

  return `${normalizedPageId}:${normalizedSenderId}`;
}

function cleanupRecentWebhookEvents() {
  cleanupExpiredConversations();
  const now = Date.now();
  for (const [key, createdAt] of recentWebhookEvents.entries()) {
    if (now - createdAt > WEBHOOK_EVENT_TTL_MS) {
      recentWebhookEvents.delete(key);
    }
  }
}

function buildWebhookEventKey({ pageId, senderId, messageId, incomingText }) {
  const normalizedPageId = normalizePageId(pageId) || "default";
  const normalizedSenderId =
    typeof senderId === "string"
      ? senderId.trim()
      : String(senderId || "").trim();
  const normalizedMessageId = normalizeText(messageId);

  if (normalizedMessageId) {
    return `${normalizedPageId}:${normalizedSenderId}:${normalizedMessageId}`;
  }

  return `${normalizedPageId}:${normalizedSenderId}:${normalizeText(incomingText).toLowerCase()}`;
}

function markWebhookEventIfNew(event) {
  cleanupRecentWebhookEvents();

  const key = buildWebhookEventKey(event);
  if (recentWebhookEvents.has(key)) {
    return false;
  }

  recentWebhookEvents.set(key, Date.now());
  return true;
}

function getConversationHistory(pageId, senderId, psid, workspaceId) {
  const key = buildConversationKey(pageId, senderId);
  return cacheGetHistory(key, psid, workspaceId);
}

function setConversationHistory(pageId, senderId, messages = [], psid, workspaceId) {
  const key = buildConversationKey(pageId, senderId);
  cacheSetHistory(key, psid, workspaceId, messages);
}

function getPublicBaseUrl(req) {
  const configured =
    process.env.BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getFacebookWebhookUrl(req) {
  const configuredWebhookUrl = normalizeText(process.env.FACEBOOK_WEBHOOKS);

  if (configuredWebhookUrl) {
    try {
      const parsed = new URL(configuredWebhookUrl);
      const pathname = normalizeText(parsed.pathname);

      if (!pathname || pathname === "/") {
        parsed.pathname = "/api/webhooks/facebook";
      }

      return parsed.toString().replace(/\/$/, "");
    } catch {
      return configuredWebhookUrl.replace(/\/$/, "");
    }
  }

  return `${getPublicBaseUrl(req)}/api/webhooks/facebook`;
}

function maskPageAccessToken(token) {
  return token ? `${token.slice(0, 4)}********` : null;
}

function readLocalFacebookPages() {
  try {
    if (!fs.existsSync(LOCAL_FACEBOOK_PAGES_FILE)) return [];
    const parsed = JSON.parse(
      fs.readFileSync(LOCAL_FACEBOOK_PAGES_FILE, "utf8")
    );
    return Array.isArray(parsed?.pages) ? parsed.pages : [];
  } catch (error) {
    logger.error({ err: error }, "Failed to read local Facebook pages fallback");
    return [];
  }
}

function writeLocalFacebookPages(pages = []) {
  fs.mkdirSync(path.dirname(LOCAL_FACEBOOK_PAGES_FILE), { recursive: true });
  fs.writeFileSync(
    LOCAL_FACEBOOK_PAGES_FILE,
    JSON.stringify({ pages, updatedAt: new Date().toISOString() }, null, 2)
  );
  return pages;
}

function normalizeLocalFacebookPage(page = {}) {
  const pageId = normalizePageId(page.pageId || page.page_id || page.fb_page_id);
  if (!pageId) return null;

  return {
    fbPageRowId: normalizeText(page.fbPageRowId || page.id),
    pageId,
    pageName: normalizeText(page.pageName || page.fb_name || page.page_name),
    pageAccessToken: normalizeText(
      page.pageAccessToken || page.fb_token || page.page_access_token
    ),
    businessType: normalizeText(page.businessType || page.business_type),
    productServices: normalizeText(
      page.productServices || page.product_services || page.products_services
    ),
    productServicePriceRanges: normalizeText(
      page.productServicePriceRanges || page.product_service_price_ranges
    ),
    websiteLink: normalizeText(page.websiteLink || page.website_link),
    shoppeLink: normalizeText(page.shoppeLink || page.shoppe_link),
    lazadaLink: normalizeText(page.lazadaLink || page.lazada_link),
    knowledge: normalizeText(page.knowledge || page.knowledgeBase || page.knowledge_base),
    knowledgeBase: normalizeText(page.knowledgeBase || page.knowledge_base || page.knowledge),
    aiInstruction: normalizeText(page.aiInstruction || page.ai_instruction),
    connectedWorkspaceId: normalizeText(
      page.connectedWorkspaceId || page.workspace_id || page.connected_workspace_id
    ),
    accessMode:
      normalizeText(page.accessMode || page.access_mode).toLowerCase() ===
      "disable"
        ? "disable"
        : "enable",
    aiModel: normalizeText(page.aiModel || page.ai_model) || "groq",
    aiLanguage: normalizeText(page.aiLanguage || page.ai_language) || "en",
    aiTemperature: page.aiTemperature ?? page.ai_temperature ?? 0.4,
    businessHoursEnabled: Boolean(page.businessHoursEnabled ?? page.business_hours_enabled),
    responseDelaySeconds: page.responseDelaySeconds ?? page.response_delay_seconds ?? 0,
    handoffEnabled: Boolean(page.handoffEnabled ?? page.handoff_enabled),
    handoffKeywords: normalizeText(page.handoffKeywords || page.handoff_keywords),
    handoffMessage: normalizeText(page.handoffMessage || page.handoff_message),
    autoTagConversations: Boolean(page.autoTagConversations ?? page.auto_tag_conversations),
    sentimentAnalysis: Boolean(page.sentimentAnalysis ?? page.sentiment_analysis),
    welcomeMessage: normalizeText(page.welcomeMessage || page.welcome_message),
    welcomeEnabled: Boolean(page.welcomeEnabled ?? page.welcome_enabled),
    awayMessage: normalizeText(page.awayMessage || page.away_message),
    aiEnabled: (page.aiEnabled ?? page.ai_enabled) !== false,
    conversationStarters: page.conversationStarters || page.conversation_starters || [],
    businessHoursDays: page.businessHoursDays || page.business_hours_days || {},
    businessHoursStart: normalizeText(page.businessHoursStart || page.business_hours_start),
    businessHoursEnd: normalizeText(page.businessHoursEnd || page.business_hours_end),
    businessHoursTimezone: normalizeText(page.businessHoursTimezone || page.business_hours_timezone),
  };
}

function ensureSavedWorkspaceLink(savedPage, expectedWorkspaceId) {
  const normalizedExpected = normalizeText(expectedWorkspaceId);

  if (!normalizedExpected) {
    return;
  }

  const actualWorkspaceId = normalizeText(
    savedPage?.connectedWorkspaceId ||
      savedPage?.workspace_id ||
      savedPage?.workspaceId
  );

  if (actualWorkspaceId !== normalizedExpected) {
    throw new Error(
      `Facebook Page was not linked in fb_pages. Expected workspace_id ${normalizedExpected}, got ${actualWorkspaceId || "empty"}.`
    );
  }
}

function mergeFacebookPages(...pageLists) {
  const merged = new Map();

  pageLists.flat().forEach((page) => {
    const normalized = normalizeLocalFacebookPage(page);
    if (!normalized) return;

    const existing = merged.get(normalized.pageId) || {};
    merged.set(normalized.pageId, {
      ...existing,
      ...normalized,
      fbPageRowId: normalized.fbPageRowId || existing.fbPageRowId || "",
      pageAccessToken:
        normalized.pageAccessToken || existing.pageAccessToken || "",
      connectedWorkspaceId:
        normalized.connectedWorkspaceId || existing.connectedWorkspaceId || "",
    });
  });

  return Array.from(merged.values());
}

function upsertLocalFacebookPage(page = {}) {
  const normalized = normalizeLocalFacebookPage(page);
  if (!normalized) {
    throw new Error("pageId is required");
  }

  const pages = mergeFacebookPages(readLocalFacebookPages(), [normalized]);
  return writeLocalFacebookPages(pages);
}

function deleteLocalFacebookPage(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  const pages = readLocalFacebookPages().filter(
    (page) => normalizePageId(page.pageId) !== normalizedPageId
  );
  return writeLocalFacebookPages(pages);
}

async function getAllFacebookPages() {
  const supabasePages = await getSupabaseFacebookPages();
  
  if (supabaseClient && supabasePages.length > 0) {
    const workspaceIds = [...new Set(supabasePages.map(p => p.workspace_id || p.connected_workspace_id).filter(Boolean))];
    if (workspaceIds.length > 0) {
      try {
        const { data: settings } = await supabaseClient
          .from("client_facebook_page_settings")
          .select("*")
          .in("workspace_id", workspaceIds)
          .is("archived_at", null);
          
        if (settings && settings.length > 0) {
          supabasePages.forEach(p => {
            const normalizedPageId = p.page_id || p.pageId;
            const normalizedWorkspaceId = p.workspace_id || p.connected_workspace_id;
            const pageSetting =
              settings.find(s => s.page_id === normalizedPageId) ||
              settings.find(s => !s.page_id && s.workspace_id === normalizedWorkspaceId);
            if (pageSetting) {
              p.pageName = pageSetting.page_name || p.pageName || p.page_name || "";
              p.aiModel = pageSetting.ai_model || p.aiModel || p.ai_model;
              p.aiLanguage = pageSetting.ai_language || p.aiLanguage || p.ai_language;
              p.aiTemperature = pageSetting.ai_temperature ?? p.aiTemperature ?? p.ai_temperature;
              p.businessHoursEnabled = pageSetting.business_hours_enabled ?? p.businessHoursEnabled ?? p.business_hours_enabled;
              p.responseDelaySeconds = pageSetting.response_delay_seconds ?? p.responseDelaySeconds ?? p.response_delay_seconds;
              p.handoffEnabled = pageSetting.handoff_enabled ?? p.handoffEnabled ?? p.handoff_enabled;
              p.handoffKeywords = pageSetting.handoff_keywords || p.handoffKeywords || p.handoff_keywords;
              p.handoffMessage = pageSetting.handoff_message || p.handoffMessage || p.handoff_message;
              p.autoTagConversations = pageSetting.auto_tag_conversations ?? p.autoTagConversations ?? p.auto_tag_conversations;
              p.sentimentAnalysis = pageSetting.sentiment_analysis ?? p.sentimentAnalysis ?? p.sentiment_analysis;
              p.welcomeMessage = pageSetting.welcome_message || p.welcomeMessage || p.welcome_message;
              p.welcomeEnabled = pageSetting.welcome_enabled ?? p.welcomeEnabled ?? p.welcome_enabled;
              p.awayMessage = pageSetting.away_message || p.awayMessage || p.away_message;
              p.aiEnabled = pageSetting.ai_enabled ?? p.aiEnabled ?? p.ai_enabled;
              p.aiInstruction = pageSetting.ai_instruction || p.aiInstruction || p.ai_instruction;
              p.knowledge = pageSetting.knowledge_base || p.knowledge;
              p.knowledgeBase = pageSetting.knowledge_base || p.knowledgeBase || p.knowledge;
              p.conversationStarters = pageSetting.conversation_starters || p.conversationStarters || p.conversation_starters;
              p.businessHoursDays = pageSetting.business_hours_days || p.businessHoursDays || p.business_hours_days;
              p.businessHoursStart = pageSetting.business_hours_start || p.businessHoursStart || p.business_hours_start;
              p.businessHoursEnd = pageSetting.business_hours_end || p.businessHoursEnd || p.business_hours_end;
              p.businessHoursTimezone = pageSetting.business_hours_timezone || p.businessHoursTimezone || p.business_hours_timezone;
            }
          });
        }
      } catch (err) {
        logger.warn({ err }, "Failed to enrich facebook pages with client settings");
      }
    }
  }

  return mergeFacebookPages(supabasePages);
}


async function getClientPageSettingsForWorkspace(workspaceId) {
  const normalizedWorkspaceId = normalizeText(workspaceId);

  if (!normalizedWorkspaceId || !supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("client_facebook_page_settings")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    logger.error({
      err: error,
      workspaceId: normalizedWorkspaceId,
    }, "Failed to read client Facebook page settings");
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((page) =>
          normalizeLocalFacebookPage({
            ...page,
            connectedWorkspaceId: page.workspace_id,
          })
        )
        .filter(Boolean)
    : [];
}

async function getFacebookPagesForWorkspace(workspaceId) {
  const normalizedWorkspaceId = normalizeText(workspaceId);

  const supabasePages =
    await getSupabaseFacebookPagesByWorkspaceId(normalizedWorkspaceId);

  if (supabasePages.length > 0) {
    try {
      const { data: settings } = await supabaseClient
        .from("client_facebook_page_settings")
        .select("*")
        .eq("workspace_id", normalizedWorkspaceId)
        .is("archived_at", null);
        
      if (settings && settings.length > 0) {
        supabasePages.forEach(p => {
          const normalizedPageId = p.page_id || p.pageId;
          const pageSetting =
            settings.find(s => s.page_id === normalizedPageId) ||
            settings.find(s => !s.page_id);
            
          if (pageSetting) {
            p.pageName = pageSetting.page_name || p.pageName || p.page_name || "";
            p.aiModel = pageSetting.ai_model || p.aiModel || p.ai_model;
            p.aiLanguage = pageSetting.ai_language || p.aiLanguage || p.ai_language;
            p.welcomeMessage = pageSetting.welcome_message || p.welcomeMessage || p.welcome_message;
            p.welcomeEnabled = pageSetting.welcome_enabled ?? p.welcomeEnabled ?? p.welcome_enabled;
            p.aiEnabled = pageSetting.ai_enabled ?? p.aiEnabled ?? p.ai_enabled;
            p.aiInstruction = pageSetting.ai_instruction || p.aiInstruction || p.ai_instruction;
            p.knowledge = pageSetting.knowledge_base || p.knowledge;
            p.knowledgeBase = pageSetting.knowledge_base || p.knowledgeBase || p.knowledge;
            p.accessMode = pageSetting.access_mode || p.accessMode || p.access_mode || "enable";
          }
        });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to enrich facebook pages with client settings");
    }
  }

  const exactPages = mergeFacebookPages(supabasePages);

  return {
    pages: exactPages,
    matchMode: exactPages.length > 0 ? "exact" : "none",
  };
}

function mapStoredFacebookConversation(record = {}) {
  const threadId = normalizeText(record.id);
  const customerPsid = normalizeText(record.customer_psid);
  const customerName = normalizeText(record.customer_name) || "Facebook User";
  const customerProfilePic = normalizeText(record.customer_profile_pic);
  const lastCustomerMessage = normalizeText(record.last_customer_message);
  const lastAiResponse = normalizeText(record.last_ai_response);
  const updatedTime =
    normalizeText(record.last_message_at) ||
    normalizeText(record.updated_at) ||
    normalizeText(record.created_at);

  const messages = [];

  if (lastCustomerMessage) {
    messages.push({
      id: `${threadId || customerPsid}-customer`,
      text: lastCustomerMessage,
      fromId: customerPsid,
      fromName: customerName,
      createdTime: updatedTime,
      isPageMessage: false,
    });
  }

  if (lastAiResponse) {
    messages.push({
      id: `${threadId || customerPsid}-bot`,
      text: lastAiResponse,
      fromId: "Page",
      fromName: "Page",
      createdTime: updatedTime,
      isPageMessage: true,
    });
  }

  return {
    threadId: threadId || customerPsid,
    participantId: customerPsid,
    participantName: customerName,
    participantAvatar: customerProfilePic,
    updatedTime,
    snippet: lastCustomerMessage || lastAiResponse || "",
    messageCount: messages.length,
    messages,
    source: "stored",
  };
}

async function fetchStoredFacebookConversationThreads({
  workspaceId,
  pageId,
  limit = 50,
}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const normalizedPageId = normalizePageId(pageId);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  if (!normalizedWorkspaceId || !normalizedPageId || !supabaseClient) {
    return [];
  }

  const { data: convos, error: convosError } = await supabaseClient
    .from("facebook_conversations")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("page_id", normalizedPageId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(safeLimit);

  if (convosError) {
    logger.error({
      err: convosError,
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
    }, "Failed to load stored Facebook inbox conversations");
    return [];
  }

  if (!Array.isArray(convos) || convos.length === 0) {
    return [];
  }

  const threads = [];
  for (const record of convos) {
      const threadId = normalizeText(record.id);
      const customerPsid = normalizeText(record.customer_psid);
      let customerName = normalizeText(record.customer_name) || "Facebook User";
      let customerProfilePic = normalizeText(record.customer_profile_pic);
      
      if (!customerName || customerName === "Facebook User" || customerName.toLowerCase() === "facebook user" || !customerProfilePic) {
        try {
          const { data: handoffData } = await supabaseClient
            .from("client_facebook_conversations")
            .select("customer_name, customer_profile_pic")
            .eq("customer_psid", customerPsid)
            .maybeSingle();

          if (handoffData) {
            if (!customerProfilePic && handoffData.customer_profile_pic) {
              customerProfilePic = handoffData.customer_profile_pic;
            }
            if ((!customerName || customerName === "Facebook User" || customerName.toLowerCase() === "facebook user") && 
                handoffData.customer_name && handoffData.customer_name !== "Facebook User" && handoffData.customer_name.toLowerCase() !== "facebook user") {
              customerName = handoffData.customer_name;
            }
          }

          if ((!customerName || customerName === "Facebook User" || customerName.toLowerCase() === "facebook user") || !customerProfilePic) {
            const pageConfig = await getFacebookConfig({ pageId: record.page_id });
            if (pageConfig && pageConfig.pageAccessToken) {
              const url = `https://graph.facebook.com/v22.0/${customerPsid}?fields=first_name,last_name,name,profile_pic&access_token=${encodeURIComponent(pageConfig.pageAccessToken)}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (data.name && (!customerName || customerName === "Facebook User" || customerName.toLowerCase() === "facebook user")) {
                  customerName = data.name;
                } else if (data.first_name && (!customerName || customerName === "Facebook User" || customerName.toLowerCase() === "facebook user")) {
                  customerName = [data.first_name, data.last_name].filter(Boolean).join(" ");
                }
                if (data.profile_pic && !customerProfilePic) {
                  customerProfilePic = data.profile_pic;
                }
              }
            }
          }

          const updatePayload = {};
          if (customerName && customerName !== "Facebook User" && customerName.toLowerCase() !== "facebook user") updatePayload.customer_name = customerName;
          if (customerProfilePic) updatePayload.customer_profile_pic = customerProfilePic;

          if (Object.keys(updatePayload).length > 0) {
            supabaseClient.from("facebook_conversations").update(updatePayload).eq("id", threadId).then();
            supabaseClient.from("client_facebook_conversations").update(updatePayload).eq("customer_psid", customerPsid).then();
          }
        } catch (e) {
          if (!customerName) customerName = "Facebook User";
        }
      }
      const updatedTime =
        normalizeText(record.last_message_at) ||
        normalizeText(record.updated_at) ||
        normalizeText(record.created_at);

      // Fetch all messages for this thread
      const { data: dbMessages, error: msgError } = await supabaseClient
        .from("facebook_conversation_messages")
        .select("*")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: false })
        .limit(100);
        
      let messages = [];
      if (!msgError && Array.isArray(dbMessages)) {
        messages = dbMessages.slice().reverse().map((msg) => {
          return {
            id: normalizeText(msg.id),
            text: normalizeText(msg.message_text),
            imageUrl: msg.metadata?.mediaUrl || null,
            mediaType: msg.metadata?.mediaType || null,
            fromId: msg.sender_type === "customer" ? customerPsid : normalizePageId(record.page_id),
            fromName: msg.sender_type === "customer" ? customerName : "Page",
            createdTime: normalizeText(msg.created_at),
            isPageMessage: msg.sender_type !== "customer",
          };
        });
      }

      if (messages.length === 0) {
        record.customer_name = customerName;
        record.customer_profile_pic = customerProfilePic;
        threads.push(mapStoredFacebookConversation(record));
        continue;
      }

      let snippet = messages[messages.length - 1]?.text || "";
      if (!snippet && messages[messages.length - 1]?.imageUrl) {
        snippet = "[Media Attachment]";
      }

      threads.push({
        threadId: threadId || customerPsid,
        participantId: customerPsid,
        participantName: customerName,
        participantAvatar: customerProfilePic,
        updatedTime,
        snippet,
        messageCount: messages.length,
        messages,
        source: "stored",
      });
  }

  return threads.filter((thread) => thread.threadId);
}

async function syncClientFacebookPageSettings({
  pageId,
  pageName,
  businessType,
  productServices,
  productServicePriceRanges,
  websiteLink,
  shoppeLink,
  lazadaLink,
  knowledge,
  aiInstruction,
  connectedWorkspaceId,
  aiModel,
  aiLanguage,
  aiTemperature,
  welcomeEnabled,
  welcomeMessage,
  awayMessage,
  businessHoursEnabled,
  responseDelaySeconds,
  handoffEnabled,
  handoffMessage,
  handoffKeywords,
  aiEnabled,
  autoTagConversations,
  sentimentAnalysis,
  conversationStarters,
  businessHoursDays,
  businessHoursStart,
  businessHoursEnd,
  businessHoursTimezone,
}) {
  const normalizedWorkspaceId = normalizeText(connectedWorkspaceId);
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedWorkspaceId || !normalizedPageId) {
    return null;
  }

  return upsertPageSettings({
    workspaceId: normalizedWorkspaceId,
    pageId: normalizedPageId,
    payload: {
      pageId: normalizedPageId,
      pageName,
      businessType,
      businessDescription: knowledge,
      knowledgeBase: knowledge,
      productsServices: productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      fallbackMode: "safe_reply_only",
      aiEnabled: aiEnabled ?? true,
      faqEnabled: true,
      suggestionsEnabled: true,
      humanHandoffEnabled: true,
      ownerNotificationEnabled: true,
      aiInstruction,
      aiModel,
      aiLanguage,
      aiTemperature,
      welcomeEnabled,
      welcomeMessage,
      awayMessage,
      businessHoursEnabled,
      responseDelaySeconds,
      handoffEnabled,
      handoffMessage,
      handoffKeywords,
      conversationStarters,
      autoTagConversations,
      sentimentAnalysis,
      businessHoursDays,
      businessHoursStart,
      businessHoursEnd,
      businessHoursTimezone,
    },
  });
}

async function syncFacebookConversationWorkspace({ pageId, connectedWorkspaceId }) {
  const normalizedWorkspaceId = normalizeText(connectedWorkspaceId);
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedWorkspaceId || !normalizedPageId || !supabaseClient) {
    return null;
  }

  const { error } = await supabaseClient
    .from("facebook_conversations")
    .update({
      workspace_id: normalizedWorkspaceId,
      updated_at: new Date().toISOString(),
    })
    .eq("page_id", normalizedPageId);

  if (error) {
    throw new Error(error.message || "Failed to sync Facebook conversations.");
  }

  return true;
}

function isValidUuid(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}

function getRequestUserId(req) {
  const candidate = (
    normalizeText(req.user?.id) ||
    normalizeText(req.user?.user_id) ||
    normalizeText(req.body?.userId) ||
    normalizeText(req.query?.userId) ||
    ""
  );
  return isValidUuid(candidate) ? candidate : null;
}

function sendRouteError(res, error, fallbackMessage = "Facebook request failed.") {
  logger.error({ err: error }, "Facebook route request failed");
  return res.status(400).json({
    error: error?.message || fallbackMessage,
  });
}

function buildStatusPayload({
  req,
  config,
  connectedPages,
  success = undefined,
  note,
}) {
  const effectiveConnectedPages =
    Array.isArray(connectedPages) && connectedPages.length > 0
      ? connectedPages
      : config.pageId
        ? [
            {
              pageId: config.pageId,
              pageName: config.pageName,
              pageAccessToken: config.pageAccessToken,
              businessType: config.businessType,
              productServices: config.productServices,
              productServicePriceRanges: config.productServicePriceRanges,
              websiteLink: config.websiteLink,
              shoppeLink: config.shoppeLink,
              lazadaLink: config.lazadaLink,
              knowledge: config.knowledge,
              connectedWorkspaceId: config.connectedWorkspaceId,
              accessMode: config.accessMode,
            },
          ]
        : [];
  const primaryPage = effectiveConnectedPages[0] || {};

  return {
    ...(success === undefined ? {} : { success }),
    connected: Boolean(
      effectiveConnectedPages.length > 0 &&
        (config.verifyToken || config.pageAccessToken)
    ),
    pageId: config.pageId || primaryPage.pageId || null,
    pageName: config.pageName || primaryPage.pageName || null,
    businessType: config.businessType || primaryPage.businessType || null,
    productServices: config.productServices || primaryPage.productServices || null,
    productServicePriceRanges:
      config.productServicePriceRanges ||
      primaryPage.productServicePriceRanges ||
      null,
    websiteLink: config.websiteLink || primaryPage.websiteLink || null,
    shoppeLink: config.shoppeLink || primaryPage.shoppeLink || null,
    lazadaLink: config.lazadaLink || primaryPage.lazadaLink || null,
    knowledge: config.knowledge || primaryPage.knowledge || null,
    connectedWorkspaceId:
      config.connectedWorkspaceId || primaryPage.connectedWorkspaceId || null,
    hasPageAccessToken: Boolean(config.pageAccessToken || primaryPage.pageAccessToken),
    hasVerifyToken: Boolean(config.verifyToken),
    hasAppSecret: Boolean(config.appSecret),
    accessMode: config.accessMode,
    verifyToken: config.verifyToken || null,
    pageAccessTokenMasked: maskPageAccessToken(
      config.pageAccessToken || primaryPage.pageAccessToken
    ),
    webhookUrl: getFacebookWebhookUrl(req),
    
    // New Advanced Configuration Fields
    aiModel: config.aiModel || null,
    aiLanguage: config.aiLanguage || null,
    aiTemperature: config.aiTemperature ?? null,
    businessHoursEnabled: config.businessHoursEnabled ?? false,
    responseDelaySeconds: config.responseDelaySeconds ?? 0,
    handoffEnabled: config.handoffEnabled ?? false,
    handoffKeywords: config.handoffKeywords || null,
    handoffMessage: config.handoffMessage || null,
    autoTagConversations: config.autoTagConversations ?? false,
    sentimentAnalysis: config.sentimentAnalysis ?? false,
    welcomeMessage: config.welcomeMessage || null,
    welcomeEnabled: config.welcomeEnabled ?? false,
    awayMessage: config.awayMessage || null,
    aiEnabled: config.aiEnabled ?? true,
    aiInstruction: config.aiInstruction || null,
    conversationStarters: config.conversationStarters || null,
    businessHoursDays: config.businessHoursDays || null,
    businessHoursStart: config.businessHoursStart || null,
    businessHoursEnd: config.businessHoursEnd || null,
    businessHoursTimezone: config.businessHoursTimezone || null,
    
    connectedPages: effectiveConnectedPages.map((page) => ({
      ...page,
      pageAccessTokenMasked: maskPageAccessToken(page.pageAccessToken),
    })),
    connectedCount: effectiveConnectedPages.length,
    note,
  };
}

router.get("/", async (req, res) => {
  const mode = req.query["hub.mode"] || req.query.hub_mode;
  const token = req.query["hub.verify_token"] || req.query.hub_verify_token;
  const challenge = req.query["hub.challenge"] || req.query.hub_challenge;

  const config = await getFacebookConfig();
  const expectedToken = (config.verifyToken || "").trim();
  const receivedToken = typeof token === "string" ? token.trim() : token;

  logger.info({
    mode,
    receivedToken: receivedToken ? `${receivedToken.slice(0, 4)}****` : null,
    expectedToken: expectedToken ? `${expectedToken.slice(0, 4)}****` : null,
    hasChallenge: Boolean(challenge),
    configSource: {
      fromRuntime: Boolean(fbRuntimeConfig.verifyToken),
      fromEnv: Boolean(process.env.FB_VERIFY_TOKEN),
    },
  }, "Facebook webhook verification attempt");

  if (mode === "subscribe" && receivedToken && receivedToken === expectedToken) {
    logger.info("Facebook webhook verification success");
    return res.status(200).send(challenge);
  }

  logger.warn({
    mode,
    hasReceivedToken: Boolean(receivedToken),
    hasExpectedToken: Boolean(expectedToken),
    tokenMatched: receivedToken === expectedToken,
    hasChallenge: Boolean(challenge),
  }, "Facebook webhook verification failed");

  return res.sendStatus(403);
});

router.get("/admin/oauth/start", (req, res) => {
  const workspaceId = normalizeText(
    req.query?.workspaceId || req.workspaceId || ""
  );
  const role = normalizeText(req.query?.role || req.query?.userRole || "");
  const redirectPath = normalizeText(req.query?.redirectPath || "");

  const appId = getFacebookAppId();
  if (!appId) {
    return res.status(400).json({
      error: "FACEBOOK_APP_ID is not configured. Add it to server/.env to enable Facebook OAuth.",
    });
  }

  const redirectUri = `${getBackendUrl()}/api/webhooks/facebook/oauth/callback`;
  const state = encodeOAuthState({ workspaceId, role, redirectPath });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: FB_OAUTH_SCOPES.join(","),
    response_type: "code",
    auth_type: "rerequest",
  });

  const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;

  logger.info({ workspaceId }, "Facebook OAuth start");

  return res.json({ auth_url: authUrl });
});

router.get("/admin/oauth/pages", (req, res) => {
  const workspaceId = normalizeText(
    req.query?.workspaceId || req.workspaceId || ""
  );

  const cached = oauthPagesCache.get(workspaceId);
  if (!cached) {
    return res.json({ pages: [], expired: false });
  }

  if (Date.now() - cached.cachedAt > OAUTH_CACHE_TTL_MS) {
    oauthPagesCache.delete(workspaceId);
    return res.json({ pages: [], expired: true });
  }

  return res.json({ pages: cached.pages, expired: false });
});

router.post("/admin/oauth/sdk-token", async (req, res) => {
  const { accessToken } = req.body || {};
  const workspaceId = normalizeText(
    req.body?.workspaceId || req.workspaceId || ""
  );

  if (!accessToken) {
    return res.status(400).json({ error: "accessToken is required" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  try {
    const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,category,picture&limit=100&access_token=${encodeURIComponent(accessToken)}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return res.status(400).json({ error: pagesData.error.message || "Failed to fetch Facebook pages" });
    }

    const rawPages = Array.isArray(pagesData.data) ? pagesData.data : [];

    if (rawPages.length === 0) {
      return res.json({
        pages: [],
        expired: false,
        warning: "No Facebook Pages found. Make sure your Facebook account manages at least one Page.",
      });
    }

    const pages = rawPages.map((p) => ({
      pageId: p.id,
      pageName: p.name,
      pageAccessToken: p.access_token,
      category: p.category || "",
      pictureUrl: p.picture?.data?.url || "",
    }));

    oauthPagesCache.set(workspaceId, {
      pages,
      cachedAt: Date.now(),
    });

    logger.info({ workspaceId, pageCount: pages.length }, "Facebook SDK token pages cached");

    return res.json({ pages, expired: false });
  } catch (err) {
    logger.error({ err, workspaceId }, "Facebook SDK token exchange failed");
    return res.status(500).json({ error: err.message || "Failed to process Facebook token" });
  }
});

router.post("/admin/oauth/select-page", async (req, res) => {
  const { pageId, pageName, pageAccessToken } = req.body || {};
  const workspaceId = normalizeText(
    req.body?.workspaceId || req.workspaceId || ""
  );

  if (!pageId || !pageAccessToken) {
    return res.status(400).json({ error: "pageId and pageAccessToken are required" });
  }

  const verifyToken = `hermes_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  saveRuntimeConfig({
    pageId,
    pageName: pageName || "",
    pageAccessToken,
    verifyToken,
    accessMode: "enable",
    connectedWorkspaceId: workspaceId,
    workspaceId,
  });

  try {
    const savedPage = await saveSupabasePageToken({
      pageId,
      pageName: pageName || "",
      pageAccessToken,
      accessMode: "enable",
      connectedWorkspaceId: workspaceId,
      workspaceId,
    });
    ensureSavedWorkspaceLink(savedPage, workspaceId);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to save Facebook Page connection.",
    });
  }

  upsertLocalFacebookPage({
    pageId,
    pageName: pageName || "",
    pageAccessToken,
    verifyToken,
    accessMode: "enable",
    connectedWorkspaceId: workspaceId,
  });

  let subscriptionError = null;
  try {
    await subscribeFacebookPageToApp({ pageId, pageAccessToken });
  } catch (error) {
    subscriptionError = error;
  }

  try {
    await syncClientFacebookPageSettings({
      pageId,
      pageName: pageName || "",
      connectedWorkspaceId: workspaceId,
    });
  } catch (error) {
    logger.warn({ err: error, pageId }, "OAuth: page settings sync failed");
  }

  oauthPagesCache.delete(workspaceId);

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  logger.info({ workspaceId, pageId }, "Facebook OAuth page selected and connected");

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      note: subscriptionError
        ? "Page connected but webhook subscription failed. Click Subscribe Webhook to retry."
        : "Page connected successfully via Facebook OAuth.",
    })
  );
});

router.get("/admin/status", async (req, res) => {
  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasConfiguredPage = Boolean(config.pageId);
  const missingPageNote = usingServiceRole
    ? "No Facebook Pages were found in Supabase or the local fallback store. Save a Facebook Page connection to create one."
    : "No Facebook Pages were found. SUPABASE_SERVICE_ROLE_KEY is not loaded by the running backend process; restart the backend after adding it, or configure fb_pages RLS.";

  const payload = buildStatusPayload({
    req,
    config,
    connectedPages,
    note:
      connectedPages.length > 0
        ? "Facebook Pages are loaded from Supabase."
        : hasConfiguredPage
          ? "Supabase returned no fb_pages rows, so the runtime/env Facebook config is being shown. Add SUPABASE_SERVICE_ROLE_KEY or fix fb_pages RLS for persistent data."
          : missingPageNote,
  });

  logger.info({ 
    traceConnectedPages: payload.connectedPages.map(p => ({
      pageId: p.pageId,
      aiModel: p.aiModel,
      aiLanguage: p.aiLanguage,
      welcomeEnabled: p.welcomeEnabled
    })) 
  }, "Tracing /admin/status connectedPages payload");

  return res.status(200).json(payload);
});

router.post("/admin/connect", async (req, res) => {
  const {
    pageId,
    pageName,
    pageAccessToken,
    fbPageRowId,
    verifyToken,
    appSecret,
    accessMode,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    knowledgeBase,
    aiInstruction,
    ai_instruction,
    connectedWorkspaceId,
    workspaceId,
  } = req.body || {};
  const linkedWorkspaceId = normalizeText(workspaceId || connectedWorkspaceId);

  if (!pageAccessToken || !verifyToken) {
    return res.status(400).json({
      error: "pageAccessToken and verifyToken are required",
    });
  }

  const resolvedAiInstruction = aiInstruction || ai_instruction;
  const resolvedKnowledge = knowledgeBase || knowledge;

  saveRuntimeConfig({
    pageId,
    pageName,
    verifyToken,
    appSecret,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge: resolvedKnowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  try {
    const savedPage = await saveSupabasePageToken({
      pageId,
      fbPageRowId,
      pageName,
      pageAccessToken,
      accessMode,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge: resolvedKnowledge,
      aiInstruction: resolvedAiInstruction,
      connectedWorkspaceId: linkedWorkspaceId,
      workspaceId: linkedWorkspaceId,
    });
    ensureSavedWorkspaceLink(savedPage, linkedWorkspaceId);
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Failed to save Facebook Page workspace link to fb_pages.",
    });
  }

  upsertLocalFacebookPage({
    pageId,
    pageName,
    pageAccessToken,
    accessMode,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge: resolvedKnowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  let pageSettingsError = null;
  let conversationSyncError = null;
  let subscriptionError = null;

  try {
    await syncClientFacebookPageSettings({
      pageId,
      pageName,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge: resolvedKnowledge,
      aiInstruction: resolvedAiInstruction,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    pageSettingsError = error;
  }

  try {
    await syncFacebookConversationWorkspace({
      pageId,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    conversationSyncError = error;
  }

  try {
    await subscribeFacebookPageToApp({
      pageId,
      pageAccessToken,
    });
  } catch (error) {
    subscriptionError = error;
  }

  const config = await getFacebookConfig();
  const connectedPages = await getWorkspaceFacebookPages(linkedWorkspaceId);

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note:
        [
          "Page token saved to Supabase table fb_pages and local server fallback.",
          pageSettingsError
            ? `Page settings sync failed: ${pageSettingsError.message}`
            : "Client page settings synced.",
          conversationSyncError
            ? `Conversation workspace sync failed: ${conversationSyncError.message}`
            : "Conversation workspace links synced.",
          subscriptionError
            ? `Page webhook subscription failed: ${subscriptionError.message}`
            : "Page subscribed to Messenger webhooks.",
        ].join(" "),
    })
  );
});

router.post("/admin/subscribe-page", async (req, res) => {
  const pageId = normalizePageId(req.body?.pageId || req.query?.pageId);

  if (!pageId) {
    return res.status(400).json({ error: "pageId is required" });
  }

  try {
    const pageConfig = await getFacebookConfig({ pageId });

    if (!pageConfig.pageAccessToken) {
      return res.status(400).json({
        error: "Facebook Page access token is missing for this page.",
        pageId,
      });
    }

    const result = await subscribeFacebookPageToApp({
      pageId: pageConfig.pageId || pageId,
      pageAccessToken: pageConfig.pageAccessToken,
    });

    return res.status(200).json({
      success: true,
      pageId: pageConfig.pageId || pageId,
      pageName: pageConfig.pageName || "",
      subscribedFields: ["messages", "messaging_postbacks", "messaging_referrals", "feed"],
      result,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to subscribe Facebook page webhooks.");
  }
});

router.post("/admin/access-mode", async (req, res) => {
  const { pageId, accessMode } = req.body || {};

  let supabaseModeError = null;

  try {
    await updateSupabasePageAccessMode(pageId, accessMode);
  } catch (error) {
    supabaseModeError = error;
  }

  const existingPage =
    readLocalFacebookPages().find(
      (page) => normalizePageId(page.pageId) === normalizePageId(pageId)
    ) || { pageId };

  upsertLocalFacebookPage({
    ...existingPage,
    pageId,
    accessMode,
  });

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: supabaseModeError
        ? `Access mode saved to local server fallback because Supabase update failed: ${supabaseModeError.message}`
        : "Access mode updated successfully.",
    })
  );
});

router.post("/admin/page-details", async (req, res) => {
  const {
    pageId,
    pageName,
    fbPageRowId,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    knowledgeBase,
    aiInstruction,
    ai_instruction,
    connectedWorkspaceId,
    workspaceId,
    aiModel,
    aiLanguage,
    aiTemperature,
    welcomeEnabled,
    welcomeMessage,
    awayMessage,
    businessHoursEnabled,
    responseDelaySeconds,
    handoffEnabled,
    handoffMessage,
    handoffKeywords,
    aiEnabled,
    autoTagConversations,
    sentimentAnalysis,
    conversationStarters,
    businessHoursDays,
    businessHoursStart,
    businessHoursEnd,
    businessHoursTimezone,
  } = req.body || {};
  const linkedWorkspaceId = normalizeText(workspaceId || connectedWorkspaceId);
  const resolvedAiInstruction = aiInstruction || ai_instruction;
  const resolvedKnowledge = knowledgeBase || knowledge;

  try {
    const savedPage = await updateSupabasePageDetails(pageId, {
      pageName,
      fbPageRowId,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge: resolvedKnowledge,
      aiInstruction: resolvedAiInstruction,
      connectedWorkspaceId: linkedWorkspaceId,
      workspaceId: linkedWorkspaceId,
    });
    ensureSavedWorkspaceLink(savedPage, linkedWorkspaceId);
  } catch (error) {
    return res.status(400).json({
      error:
        error.message ||
        "Failed to update Facebook Page workspace link in fb_pages.",
    });
  }

  saveRuntimeConfig({
    pageId,
    pageName,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge: resolvedKnowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  const existingPage =
    readLocalFacebookPages().find(
      (page) => normalizePageId(page.pageId) === normalizePageId(pageId)
    ) || { pageId };

  upsertLocalFacebookPage({
    ...existingPage,
    pageId,
    pageName,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge: resolvedKnowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  let pageSettingsError = null;
  let conversationSyncError = null;

  try {
    await syncClientFacebookPageSettings({
      pageId,
      pageName,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge: resolvedKnowledge,
      connectedWorkspaceId: linkedWorkspaceId,
      aiModel,
      aiLanguage,
      aiTemperature,
      welcomeEnabled,
      welcomeMessage,
      awayMessage,
      businessHoursEnabled,
      responseDelaySeconds,
      handoffEnabled,
      handoffMessage,
      handoffKeywords,
      aiEnabled,
      autoTagConversations,
      sentimentAnalysis,
      conversationStarters,
      businessHoursDays,
      businessHoursStart,
      businessHoursEnd,
      businessHoursTimezone,
    });
  } catch (error) {
    pageSettingsError = error;
  }

  try {
    await syncFacebookConversationWorkspace({
      pageId,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    conversationSyncError = error;
  }

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: [
        "Page details updated successfully.",
        pageSettingsError
          ? `Page settings sync failed: ${pageSettingsError.message}`
          : "Client page settings synced.",
        conversationSyncError
          ? `Conversation workspace sync failed: ${conversationSyncError.message}`
          : "Conversation workspace links synced.",
      ].join(" "),
    })
  );
});

router.post("/admin/test-reply", async (req, res) => {
  const { pageId, message, history = [], customContext = {} } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: "Message is required." });
  }

  try {
    let pageConfig = {};
    if (pageId) {
      try {
        pageConfig = await getFacebookConfig({ pageId });
      } catch (err) {
        logger.warn({ err, pageId }, "Failed to load page config, using customContext fallback");
      }
    }

    const context = {
      pageName: customContext.pageName !== undefined ? customContext.pageName : (pageConfig.pageName || ""),
      welcomeEnabled: customContext.welcomeEnabled !== undefined ? customContext.welcomeEnabled : (pageConfig.welcomeEnabled || false),
      welcomeMessage: customContext.welcomeMessage !== undefined ? customContext.welcomeMessage : (pageConfig.welcomeMessage || ""),
      awayMessage: customContext.awayMessage !== undefined ? customContext.awayMessage : (pageConfig.awayMessage || ""),
      aiEnabled: customContext.aiEnabled !== undefined ? customContext.aiEnabled : (pageConfig.aiEnabled !== false),
      aiModel: DEFAULT_CHATBOT_MODEL,
      aiLanguage: customContext.aiLanguage !== undefined ? customContext.aiLanguage : (pageConfig.aiLanguage || "en"),
      aiTemperature: customContext.aiTemperature !== undefined ? customContext.aiTemperature : (pageConfig.aiTemperature || 0.4),
      businessHoursEnabled: customContext.businessHoursEnabled !== undefined ? customContext.businessHoursEnabled : (pageConfig.businessHoursEnabled || false),
      businessHoursStart: customContext.businessHoursStart !== undefined ? customContext.businessHoursStart : (pageConfig.businessHoursStart || "09:00"),
      businessHoursEnd: customContext.businessHoursEnd !== undefined ? customContext.businessHoursEnd : (pageConfig.businessHoursEnd || "18:00"),
      businessHoursTimezone: customContext.businessHoursTimezone !== undefined ? customContext.businessHoursTimezone : (pageConfig.businessHoursTimezone || "Asia/Manila"),
      businessHoursDays: customContext.businessHoursDays !== undefined ? customContext.businessHoursDays : (pageConfig.businessHoursDays || {}),
      responseDelaySeconds: customContext.responseDelaySeconds !== undefined ? customContext.responseDelaySeconds : (pageConfig.responseDelaySeconds || 0),
      handoffEnabled: customContext.handoffEnabled !== undefined ? customContext.handoffEnabled : (pageConfig.handoffEnabled || false),
      handoffKeywords: customContext.handoffKeywords !== undefined ? customContext.handoffKeywords : (pageConfig.handoffKeywords || ""),
      handoffMessage: customContext.handoffMessage !== undefined ? customContext.handoffMessage : (pageConfig.handoffMessage || ""),
      defaultReply: customContext.defaultReply !== undefined ? customContext.defaultReply : (pageConfig.defaultReply || pageConfig.default_reply || ""),
      autoTagConversations: customContext.autoTagConversations !== undefined ? customContext.autoTagConversations : (pageConfig.autoTagConversations || false),
      sentimentAnalysis: customContext.sentimentAnalysis !== undefined ? customContext.sentimentAnalysis : (pageConfig.sentimentAnalysis || false),
      conversationStarters: customContext.conversationStarters !== undefined ? customContext.conversationStarters : (pageConfig.conversationStarters || []),

      // Maintain legacy mapping for backend compatibility
      businessType: customContext.businessType !== undefined ? customContext.businessType : (pageConfig.businessType || ""),
      productServices: customContext.productServices !== undefined ? customContext.productServices : (pageConfig.productServices || ""),
      productServicePriceRanges: customContext.productServicePriceRanges !== undefined ? customContext.productServicePriceRanges : (pageConfig.productServicePriceRanges || ""),
      websiteLink: customContext.websiteLink !== undefined ? customContext.websiteLink : (pageConfig.websiteLink || ""),
      shoppeLink: customContext.shoppeLink !== undefined ? customContext.shoppeLink : (pageConfig.shoppeLink || ""),
      lazadaLink: customContext.lazadaLink !== undefined ? customContext.lazadaLink : (pageConfig.lazadaLink || ""),
      knowledge: customContext.knowledgeBase !== undefined
        ? customContext.knowledgeBase
        : (customContext.knowledge !== undefined
          ? customContext.knowledge
          : (pageConfig.knowledgeBase || pageConfig.knowledge || "")),
      aiInstruction: customContext.aiInstruction !== undefined ? customContext.aiInstruction : (pageConfig.aiInstruction || ""),
    };

    const ruleWorkspaceId = normalizeText(
      customContext.workspaceId ||
      customContext.connectedWorkspaceId ||
      pageConfig.connectedWorkspaceId ||
      pageConfig.workspaceId ||
      pageConfig.workspace_id ||
      ""
    );
    let autoReply = null;

    if (pageId) {
      autoReply = await matchAutoReplyRule({
        text: message.trim(),
        supabaseClient: supabase,
        workspaceId: ruleWorkspaceId,
        pageId,
      });

      if (!autoReply?.handled && !ruleWorkspaceId) {
        autoReply = await matchAutoReplyRule({
          text: message.trim(),
          supabaseClient: supabase,
          pageId,
        });
      }
    }

    if (autoReply?.handled && autoReply.reply) {
      const reply = compactFacebookReply(autoReply.reply);

      return res.status(200).json({
        success: true,
        data: {
          reply,
          quickReplies: autoReply.quickReplies || [],
          source: "auto_reply_rule",
          ruleId: autoReply.ruleId,
          contextUsed: {
            pageName: context.pageName,
            aiEnabled: context.aiEnabled,
            aiModel: context.aiModel,
            aiLanguage: context.aiLanguage,
            knowledgeBase: context.knowledge ? (context.knowledge.length > 100 ? context.knowledge.substring(0, 100) + "..." : context.knowledge) : "",
            aiInstruction: context.aiInstruction,
            responseDelaySeconds: 0,
            autoReplyRuleMatched: true,
            autoReplyRuleId: autoReply.ruleId,
          },
        },
      });
    }

    // Build a human-readable business hours summary and inject it into the AI knowledge
    // so the chatbot can correctly answer "what are your business hours?".
    // ChatbotBuilder stores days as 1=Monday … 7=Sunday (ISO weekday).
    // Key "0" is a legacy enabled-flag (boolean/number), not a real day — skip it when its value is not an object.
    const DAY_NAMES_BH_0 = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
    const DAY_NAMES_BH_1 = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday" };
    if (context.businessHoursEnabled) {
      const days = context.businessHoursDays;
      let openDays = [];
      if (days && typeof days === "object" && !Array.isArray(days)) {
        // Detect format: if any key is "7" (Sunday in ISO weekday), use 1-based map
        const keys = Object.keys(days).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
        const DAY_NAMES_BH = keys.some(k => k === 7) ? DAY_NAMES_BH_1 : DAY_NAMES_BH_0;
        openDays = Object.entries(days)
          .filter(([key, val]) => {
            // Skip key "0" that holds a boolean/number enabled-flag (not a day schedule object)
            if (key === "0" && typeof val !== "object") return false;
            return Boolean(val);
          })
          .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
          .map(([key, val]) => {
            const num = parseInt(key, 10);
            const dayName = !isNaN(num) ? (DAY_NAMES_BH[num] || key) : (key.charAt(0).toUpperCase() + key.slice(1));
            if (typeof val === "object" && val.open && val.close) {
              return `${dayName} (${val.open} to ${val.close})`;
            }
            return dayName;
          });
      } else if (Array.isArray(days)) {
        openDays = days.map(d => DAY_NAMES_BH_0[d] || String(d));
      }

      const hasSpecificHours = openDays.some(d => d.includes("("));
      const daysText = openDays.length > 0 ? openDays.join(", ") : "Monday to Friday";

      if (hasSpecificHours) {
        context.knowledge += `\n\nBUSINESS HOURS: Open ${daysText} (${context.businessHoursTimezone}). Outside these hours we send an away message.`;
      } else {
        context.knowledge += `\n\nBUSINESS HOURS: Open ${daysText} from ${context.businessHoursStart} to ${context.businessHoursEnd} (${context.businessHoursTimezone}). Outside these hours we send an away message.`;
      }
    } else {
      context.knowledge += "\n\nBUSINESS HOURS: We respond to inquiries as soon as possible and are available online at any time.";
    }
    if (context.welcomeEnabled && context.welcomeMessage) {
      context.knowledge += `\n\nWELCOME MESSAGE (sent to new customers): ${context.welcomeMessage}`;
    }
    if (context.handoffEnabled && context.handoffMessage) {
      const kwText = Array.isArray(context.handoffKeywords) ? context.handoffKeywords.join(", ") : (context.handoffKeywords || "agent, human");
      context.knowledge += `\n\nHUMAN HANDOFF: When a customer uses keywords like [${kwText}] we send: "${context.handoffMessage}"`;
    }

    const formattedHistory = (Array.isArray(history) ? history : []).map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: String(msg.content || "")
    }));

    formattedHistory.push({
      role: "user",
      content: message.trim()
    });

    let reply;
    let replySource = "ai";
    try {
      reply = await generateChatbotReply(formattedHistory, context);
    } catch (aiError) {
      logger.warn({
        err: aiError,
        requestId: req.requestId,
        pageId,
      }, "Test chatbot AI failed; using configured fallback reply");
      reply = compactFacebookReply(
        context.defaultReply ||
        context.awayMessage ||
        context.handoffMessage ||
        "Thanks for reaching out. Our team will get back to you as soon as possible."
      );
      replySource = "configured_fallback";
    }

    return res.status(200).json({
      success: true,
      data: {
        reply,
        source: replySource,
        contextUsed: {
          pageName: context.pageName,
          aiEnabled: context.aiEnabled,
          aiModel: context.aiModel,
          aiLanguage: context.aiLanguage,
          aiTemperature: context.aiTemperature,
          knowledgeBase: context.knowledge ? (context.knowledge.length > 100 ? context.knowledge.substring(0, 100) + "..." : context.knowledge) : "",
          aiInstruction: context.aiInstruction,
          welcomeEnabled: context.welcomeEnabled,
          welcomeMessage: context.welcomeMessage,
          awayMessage: context.awayMessage,
          businessHoursEnabled: context.businessHoursEnabled,
          businessHoursStart: context.businessHoursStart,
          businessHoursEnd: context.businessHoursEnd,
          businessHoursTimezone: context.businessHoursTimezone,
          businessHoursDays: context.businessHoursDays,
          responseDelaySeconds: context.responseDelaySeconds,
          handoffEnabled: context.handoffEnabled,
          handoffKeywords: context.handoffKeywords,
          handoffMessage: context.handoffMessage,
          defaultReply: context.defaultReply,
          autoTagConversations: context.autoTagConversations,
          sentimentAnalysis: context.sentimentAnalysis,
          conversationStarters: context.conversationStarters,
        }
      }
    });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, "Test chatbot reply failed");
    return res.status(500).json({ success: false, error: "Failed to generate test reply" });
  }
});

router.post("/admin/delete", async (req, res) => {
  const { pageId } = req.body || {};

  let supabaseDeleteError = null;

  try {
    await deleteSupabasePage(pageId);
  } catch (error) {
    supabaseDeleteError = error;
  }

  deleteLocalFacebookPage(pageId);

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: supabaseDeleteError
        ? `Page removed from local server fallback because Supabase delete failed: ${supabaseDeleteError.message}`
        : "Page deleted successfully.",
    })
  );
});

router.get("/client/pages", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  const { pages, matchMode } = await getFacebookPagesForWorkspace(workspaceId);

  return res.status(200).json({
    workspaceId,
    pages,
    count: pages.length,
    matchMode,
  });
});

router.get("/client/inbox", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const requestedPageId = normalizePageId(req.query?.pageId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  const { pages, matchMode } = await getFacebookPagesForWorkspace(workspaceId);

  if (pages.length === 0) {
    return res.status(200).json({
      workspaceId,
      pageId: "",
      pages: [],
      threads: [],
      count: 0,
      matchMode,
    });
  }

  const activePage =
    pages.find((page) => normalizePageId(page.pageId) === requestedPageId) ||
    pages[0];

  if (!activePage?.pageId) {
    return res.status(200).json({
      workspaceId,
      pageId: "",
      pages: [],
      threads: [],
      count: 0,
      matchMode,
    });
  }

  try {
    let nameMap = {};
    let picMap = {};
    try {
      const pageConfig = await getFacebookConfig({ pageId: activePage.pageId });
      if (pageConfig && pageConfig.pageAccessToken) {
        // Fetch EXACTLY like handoffManager
        const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(activePage.pageId)}/conversations?fields=participants{id,name,profile_pic}&limit=100&access_token=${encodeURIComponent(pageConfig.pageAccessToken)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.data)) {
            data.data.forEach(thread => {
              const participants = thread.participants?.data || [];
              participants.forEach(p => {
                if (p.id && p.id !== activePage.pageId) {
                  if (p.name && p.name.toLowerCase() !== "facebook user") {
                    nameMap[p.id] = p.name;
                  }
                  if (p.profile_pic) {
                    picMap[p.id] = p.profile_pic;
                  }
                }
              });
            });
          }
        }
      }
    } catch (e) {
      logger.error({ err: e }, "Failed to fetch graph participants for inbox name resolution");
    }

    const storedThreads = await fetchStoredFacebookConversationThreads({
      workspaceId,
      pageId: activePage.pageId,
      limit: req.query?.conversationLimit || 50,
    });

    storedThreads.forEach((st) => {
      let updated = false;
      const updatePayload = {};

      if (nameMap[st.participantId] && st.participantName.toLowerCase() === "facebook user") {
        st.participantName = nameMap[st.participantId];
        updatePayload.customer_name = st.participantName;
        updated = true;
      }
      if (picMap[st.participantId] && !st.participantAvatar) {
        st.participantAvatar = picMap[st.participantId];
        updatePayload.customer_profile_pic = st.participantAvatar;
        updated = true;
      }

      if (updated) {
        // Update database in background
        supabase.from("facebook_conversations").update(updatePayload).eq("id", st.threadId).then();
        supabase.from("client_facebook_conversations").update(updatePayload).eq("customer_psid", st.participantId).then();
      }

      // Also apply name to messages
      if (st.messages) {
        st.messages.forEach(msg => {
          if (!msg.isPageMessage && msg.fromName.toLowerCase() === "facebook user" && st.participantName.toLowerCase() !== "facebook user") {
            msg.fromName = st.participantName;
          }
        });
      }
    });

    const threads = storedThreads;

    return res.status(200).json({
      workspaceId,
      pageId: activePage.pageId,
      pages: pages.map((page) => ({
        pageId: page.pageId,
        pageName: page.pageName,
        accessMode: page.accessMode,
        connectedWorkspaceId: page.connectedWorkspaceId,
      })),
      threads,
      count: threads.length,
      inboxSource: "stored",
      matchMode,
    });
  } catch (error) {
    logger.error({ err: error, workspaceId }, "Failed to fetch stored threads for inbox");
    return res.status(502).json({
      error: "Failed to load Facebook inbox conversations",
      workspaceId,
      pageId: activePage.pageId,
      pages: pages.map((page) => ({
        pageId: page.pageId,
        pageName: page.pageName,
        accessMode: page.accessMode,
        connectedWorkspaceId: page.connectedWorkspaceId,
      })),
      threads: [],
      count: 0,
      matchMode,
    });
  }

});

router.get("/client/connect/dashboard", async (req, res) => {
  try {
    const data = await facebookClientConnectService.getDashboard({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
    });

    return res.status(200).json(data);
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook Connect dashboard.");
  }
});

router.get("/client/connect/faqs", async (req, res) => {
  try {
    const faqs = await facebookClientConnectService.listFaqs({
      workspaceId: req.query?.workspaceId,
      status: req.query?.status,
      search: req.query?.search,
    });

    return res.status(200).json({ faqs, count: faqs.length });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook FAQs.");
  }
});

router.post("/client/connect/faqs", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.createFaq({
      workspaceId: req.body?.workspaceId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    return res.status(201).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to create Facebook FAQ.");
  }
});

router.put("/client/connect/faqs/:faqId", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.updateFaq({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      faqId: req.params?.faqId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to update Facebook FAQ.");
  }
});

router.post("/client/connect/faqs/:faqId/archive", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.archiveFaq({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      faqId: req.params?.faqId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to archive Facebook FAQ.");
  }
});

router.get("/client/connect/suggestions", async (req, res) => {
  try {
    const suggestions = await facebookClientConnectService.listSuggestions({
      workspaceId: req.query?.workspaceId,
      status: req.query?.status,
    });

    return res.status(200).json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load FAQ suggestions.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/approve", async (req, res) => {
  try {
    const result = await facebookClientConnectService.approveSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      answer: req.body?.answer,
      category: req.body?.category,
      keywords: req.body?.keywords,
      userId: getRequestUserId(req),
    });

    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to approve FAQ suggestion.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/reject", async (req, res) => {
  try {
    const suggestion = await facebookClientConnectService.rejectSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ suggestion });
  } catch (error) {
    return sendRouteError(res, error, "Failed to reject FAQ suggestion.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/archive", async (req, res) => {
  try {
    const suggestion = await facebookClientConnectService.archiveSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ suggestion });
  } catch (error) {
    return sendRouteError(res, error, "Failed to archive FAQ suggestion.");
  }
});

router.get("/client/connect/settings", async (req, res) => {
  try {
    const settings = await facebookClientConnectService.getPageSettings({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
    });

    return res.status(200).json({ settings });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook page settings.");
  }
});

router.put("/client/connect/settings", async (req, res) => {
  try {
    const settings = await facebookClientConnectService.upsertPageSettings({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      pageId: req.body?.pageId || req.query?.pageId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    // Try to sync Messenger Profile (Get Started & Ice Breakers) to Facebook
    try {
      const pageConfig = await getFacebookConfig({ pageId: settings.pageId });
      if (pageConfig.pageAccessToken) {
        let iceBreakers = [];
        if (Array.isArray(settings.conversationStarters) && settings.conversationStarters.length > 0) {
          iceBreakers = settings.conversationStarters.map(s => ({
            question: s,
            payload: s
          }));
        }
        
        await facebookGraphApi.setMessengerProfile(
          { pageAccessToken: pageConfig.pageAccessToken },
          {
            getStarted: "GET_STARTED",
            iceBreakers: iceBreakers
          }
        );
      }
    } catch (fbErr) {
      logger.warn({ err: fbErr, pageId: settings.pageId }, "Failed to sync Messenger Profile to Facebook");
    }

    return res.status(200).json({ settings });
  } catch (error) {
    return sendRouteError(res, error, "Failed to update Facebook page settings.");
  }
});

router.get("/client/connect/analytics", async (req, res) => {
  try {
    const analytics = await facebookClientConnectService.listAnalytics({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
      limit: req.query?.limit,
    });

    return res.status(200).json({
      analytics,
      count: analytics.length,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook analytics.");
  }
});

router.get("/admin/test-faq", async (req, res) => {
  try {
    const pageId = normalizePageId(req.query?.pageId);
    const incomingText = normalizeText(
      req.query?.text || "What are your gym membership rates?"
    );
    const pageConfig = await getFacebookConfig({ pageId });
    const workspaceId = normalizeText(pageConfig.connectedWorkspaceId);

    if (!pageConfig.pageId) {
      return res.status(404).json({
        success: false,
        error: "Facebook page was not found in fb_pages.",
        pageId,
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "Facebook page is not linked to a workspace in fb_pages.workspace_id.",
        pageId: pageConfig.pageId,
        pageName: pageConfig.pageName,
      });
    }

    const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });
    const activeFaqs = await knowledgeManager.getActiveFaqs({
      supabaseClient,
      workspaceId,
    });
    const result = await knowledgeManager.resolveKnowledgeReply({
      workspaceId,
      pageId: pageConfig.pageId,
      incomingText,
      pageConfig,
      compactFacebookReply,
      generateChatbotReply,
      recordAnalytics: false,
    });

    return res.status(200).json({
      success: true,
      pageId: pageConfig.pageId,
      pageName: pageConfig.pageName,
      workspaceId,
      accessMode: pageConfig.accessMode,
      hasPageAccessToken: Boolean(pageConfig.pageAccessToken),
      activeFaqCount: activeFaqs.length,
      incomingText,
      handled: Boolean(result?.handled),
      source: result?.source || "",
      confidence: result?.confidence || 0,
      reply: result?.reply || "",
      matchedFaqId: result?.faq?.id || null,
      matchedQuestion: result?.faq?.question || "",
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to test Facebook FAQ reply.");
  }
});

router.get("/admin/webhook-diagnostics", async (req, res) => {
  try {
    const pageId = normalizePageId(req.query?.pageId);
    const pageConfig = await getFacebookConfig({ pageId });

    return res.status(200).json({
      success: true,
      build: "facebook-webhook-handoff-failsafe-2026-06-15-v2",
      webhookUrl: getFacebookWebhookUrl(req),
      pageId: pageConfig.pageId || pageId || null,
      pageName: pageConfig.pageName || null,
      accessMode: pageConfig.accessMode || null,
      connectedWorkspaceId: pageConfig.connectedWorkspaceId || null,
      hasPageAccessToken: Boolean(pageConfig.pageAccessToken),
      hasVerifyToken: Boolean(pageConfig.verifyToken),
      hasAppSecret: Boolean(pageConfig.appSecret),
      supabaseConnected: Boolean(supabaseClient),
      note:
        "If Messenger messages do not create 'Facebook webhook received' logs in this backend, Meta is calling a different webhook URL or a different deployment.",
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook webhook diagnostics.");
  }
});

router.get("/admin/analytics", async (req, res) => {
  try {
    const workspaceId = normalizeText(req.query?.workspaceId);
    const pageId = normalizeText(req.query?.pageId);
    const startDate = normalizeText(req.query?.startDate);
    const endDate = normalizeText(req.query?.endDate);

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const analytics = await conversationAnalyticsService.getAnalytics({
      workspaceId,
      pageId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook analytics.");
  }
});

router.get("/admin/analytics/summary", async (req, res) => {
  try {
    const workspaceId = normalizeText(req.query?.workspaceId);
    const pageId = normalizeText(req.query?.pageId);
    const startDate = normalizeText(req.query?.startDate);
    const endDate = normalizeText(req.query?.endDate);

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const summary = await conversationAnalyticsService.getAnalyticsSummary({
      workspaceId,
      pageId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook analytics summary.");
  }
});

router.post("/admin/analytics/regenerate", async (req, res) => {
  try {
    const { workspaceId, pageId, date } = req.body || {};

    if (!workspaceId || !pageId || !date) {
      return res.status(400).json({ error: "workspaceId, pageId, and date are required" });
    }

    const analytics = await conversationAnalyticsService.regenerateAnalytics({
      workspaceId,
      pageId,
      date,
    });

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to regenerate Facebook analytics.");
  }
});

router.get("/admin/ip-allowlist", async (req, res) => {
  try {
    const workspaceId = normalizeText(req.query?.workspaceId);

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const ipRanges = await webhookIpAllowlistService.getIpRanges({ workspaceId });

    return res.status(200).json({
      success: true,
      ipRanges,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load IP allowlist.");
  }
});

router.post("/admin/ip-allowlist", async (req, res) => {
  try {
    const { workspaceId, ipAddress, description, enabled } = req.body || {};

    if (!workspaceId || !ipAddress) {
      return res.status(400).json({ error: "workspaceId and ipAddress are required" });
    }

    const ipRange = await webhookIpAllowlistService.addIpRange({
      workspaceId,
      ipAddress,
      description,
      enabled,
    });

    return res.status(200).json({
      success: true,
      ipRange,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to add IP range to allowlist.");
  }
});

router.delete("/admin/ip-allowlist/:id", async (req, res) => {
  try {
    const allowlistId = req.params?.id;

    if (!allowlistId) {
      return res.status(400).json({ error: "allowlistId is required" });
    }

    await webhookIpAllowlistService.removeIpRange(allowlistId);

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to remove IP range from allowlist.");
  }
});

router.post("/admin/ip-allowlist/:id/toggle", async (req, res) => {
  try {
    const allowlistId = req.params?.id;
    const { enabled } = req.body || {};

    if (!allowlistId) {
      return res.status(400).json({ error: "allowlistId is required" });
    }

    const ipRange = await webhookIpAllowlistService.toggleIpRange(allowlistId, enabled);

    return res.status(200).json({
      success: true,
      ipRange,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to toggle IP range.");
  }
});

router.post("/admin/ip-allowlist/initialize-meta", async (req, res) => {
  try {
    const { workspaceId } = req.body || {};

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const ipRanges = await webhookIpAllowlistService.initializeMetaIpRanges({ workspaceId });

    return res.status(200).json({
      success: true,
      ipRanges,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to initialize Meta IP ranges.");
  }
});

router.get("/client/handoffs", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const pageId = normalizeText(req.query?.pageId);
  const filter = normalizeText(req.query?.filter) || "all";

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  try {
    const conversations = await handoffManager.getHandoffConversations({ workspaceId, pageId, filter });
    return res.status(200).json({ conversations });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load handoff conversations.");
  }
});

router.get("/client/handoffs/badge-count", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const pageId = normalizeText(req.query?.pageId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  try {
    const count = await handoffManager.getHandoffBadgeCount({ workspaceId, pageId });
    return res.status(200).json({ count });
  } catch (error) {
    return sendRouteError(res, error, "Failed to get handoff badge count.");
  }
});

router.get("/client/handoffs/:conversationId/messages", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const conversationId = req.params?.conversationId;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "workspaceId and conversationId are required" });
  }

  try {
    const messages = await handoffManager.getHandoffMessages({ workspaceId, conversationId });
    return res.status(200).json({ messages });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load handoff messages.");
  }
});

router.post("/client/handoffs/:conversationId/reply", async (req, res) => {
  const workspaceId = normalizeText(req.body?.workspaceId);
  const conversationId = req.params?.conversationId;
  const { messageText, mediaUrl, mediaType, senderName } = req.body || {};

  if (!workspaceId || !conversationId || (!messageText && !mediaUrl)) {
    return res.status(400).json({ error: "workspaceId, conversationId, and either messageText or mediaUrl are required" });
  }

  try {
    const result = await handoffManager.sendHumanReply({
      workspaceId,
      conversationId,
      messageText,
      mediaUrl,
      mediaType,
      senderName,
    });
    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to send handoff reply.");
  }
});

router.post("/client/handoffs/:conversationId/enable-chatbot", async (req, res) => {
  const workspaceId = normalizeText(req.body?.workspaceId);
  const conversationId = req.params?.conversationId;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "workspaceId and conversationId are required" });
  }

  try {
    const result = await handoffManager.enableChatbot({ workspaceId, conversationId });
    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to enable chatbot.");
  }
});

// Buffer incoming Facebook webhook events for the Loop Engine OBSERVE stage
async function bufferFacebookEvent(entry, event, eventType) {
  try {
    const { supabase: sb } = require("../../config/supabase");
    const pageId = normalizePageId(event?.recipient?.id || entry?.id);

    // Guard: Facebook page IDs are always numeric — reject anything else before
    // string-interpolating into the PostgREST .or() filter to prevent injection.
    if (!pageId || !/^\d+$/.test(pageId)) return;

    // Resolve workspace from fb_pages using parameterised eq() calls to avoid
    // interpolating untrusted data into a raw filter string.
    const [{ data: byPageId }, { data: byFbPageId }] = await Promise.all([
      sb.from("fb_pages").select("workspace_id, connected_workspace_id").eq("page_id", pageId).limit(1),
      sb.from("fb_pages").select("workspace_id, connected_workspace_id").eq("fb_page_id", pageId).limit(1),
    ]);
    const pages = byPageId?.length ? byPageId : (byFbPageId || []);

    const workspaceId = pages?.[0]?.workspace_id || pages?.[0]?.connected_workspace_id || null;

    await sb.from("facebook_events").insert({
      workspace_id: workspaceId,
      page_id:      pageId,
      event_type:   eventType,
      sender_id:    normalizePageId(event?.sender?.id),
      payload:      event || {},
    });
  } catch (err) {
    logger.warn({ err: err.message }, "[fb:webhook] buffer insert failed (non-fatal)");
  }
}

router.post("/", async (req, res) => {
  const webhookStartTime = Date.now();
  const payloadSize = JSON.stringify(req.body).length;
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

  logger.info({
    object: req.body?.object,
    entries: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
    hasSignature: Boolean(
      req.headers?.["x-hub-signature-256"] || req.headers?.["x-hub-signature"]
    ),
    clientIp,
  }, "Facebook webhook received");

  if (!(await verifyFacebookSignature(req))) {
    logger.warn({ requestId: req.requestId }, "Facebook webhook signature failed");
    
    // Log signature failure to monitoring
    webhookMonitoringService.logWebhookEvent({
      eventType: "webhook_verification",
      status: "signature_failed",
      errorMessage: "Invalid Facebook webhook signature",
      payloadSize,
      processingTimeMs: Date.now() - webhookStartTime,
      metadata: { requestId: req.requestId, clientIp },
    }).catch(() => {});

    // Check for signature failure alerts
    webhookAlertingService.checkAndTriggerAlerts({
      workspaceId: null,
      pageId: null,
      eventType: "webhook_verification",
      status: "signature_failed",
    }).catch(() => {});
    
    return res.status(403).json({ error: "Invalid Facebook webhook signature" });
  }

  // Check IP allowlist (if configured for any workspace)
  if (clientIp) {
    try {
      // Get all workspaces with IP allowlists
      const { data: workspacesWithAllowlist } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .select("workspace_id")
        .eq("enabled", true);

      if (Array.isArray(workspacesWithAllowlist) && workspacesWithAllowlist.length > 0) {
        const workspaceIds = [...new Set(workspacesWithAllowlist.map(w => w.workspace_id))];
        
        // Check if IP is allowed for any workspace
        let ipAllowed = false;
        for (const wsId of workspaceIds) {
          const allowed = await webhookIpAllowlistService.isIpAllowed({
            workspaceId: wsId,
            ipAddress: clientIp,
          });
          if (allowed) {
            ipAllowed = true;
            break;
          }
        }

        if (!ipAllowed) {
          logger.warn({ clientIp }, "Facebook webhook IP not in allowlist");
          
          webhookMonitoringService.logWebhookEvent({
            eventType: "webhook_verification",
            status: "ip_blocked",
            errorMessage: "IP not in allowlist",
            payloadSize,
            processingTimeMs: Date.now() - webhookStartTime,
            metadata: { clientIp },
          }).catch(() => {});
          
          return res.status(403).json({ error: "IP not in allowlist" });
        }
      }
    } catch (ipErr) {
      logger.warn({ err: ipErr }, "IP allowlist check failed - allowing request");
    }
  }

  // Check payload size limit (if configured for any workspace)
  const payloadSizeKB = payloadSize / 1024;
  try {
    // Get all workspaces with payload size limits
    const { data: workspacesWithLimits } = await supabaseClient
      .from("client_facebook_page_settings")
      .select("workspace_id, max_webhook_payload_size_kb")
      .gt("max_webhook_payload_size_kb", 0);

    if (Array.isArray(workspacesWithLimits) && workspacesWithLimits.length > 0) {
      for (const ws of workspacesWithLimits) {
        const limitKB = ws.max_webhook_payload_size_kb || 1024; // Default 1MB
        if (payloadSizeKB > limitKB) {
          logger.warn({ payloadSizeKB, limitKB, workspaceId: ws.workspace_id }, "Facebook webhook payload size exceeded");
          
          webhookMonitoringService.logWebhookEvent({
            eventType: "webhook_verification",
            status: "payload_too_large",
            errorMessage: `Payload size ${payloadSizeKB.toFixed(2)}KB exceeds limit ${limitKB}KB`,
            payloadSize,
            processingTimeMs: Date.now() - webhookStartTime,
            metadata: { payloadSizeKB, limitKB, workspaceId: ws.workspace_id },
          }).catch(() => {});
          
          return res.status(413).json({ error: "Payload too large" });
        }
      }
    }
  } catch (payloadErr) {
    logger.warn({ err: payloadErr }, "Payload size check failed - allowing request");
  }

  if (req.body.object !== "page") {
    return res.sendStatus(404);
  }

  const messageEvents = [];

  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {

      // Buffer event for Loop Engine OBSERVE stage (fire-and-forget)
      const evType = event?.message ? "message" : event?.postback ? "page_event" : event?.referral ? "ad_event" : "page_event";
      bufferFacebookEvent(entry, event, evType).catch(() => {});

      const senderId = event?.sender?.id;
      const recipientPageId = normalizePageId(event?.recipient?.id);
      const incomingText = event?.message?.text || "";
      const attachments = event?.message?.attachments || [];
      
      // Extract first media attachment (image, video, audio, or file)
      const mediaAttachment = attachments.find((a) => 
        ["image", "video", "audio", "file"].includes(a.type)
      );
      const imageUrl = mediaAttachment?.payload?.url || null;
      const mediaType = mediaAttachment?.type || null;
      const messageId = normalizeText(event?.message?.mid);

      const normalizedSenderId =
        typeof senderId === "number"
          ? String(senderId)
          : typeof senderId === "string"
            ? senderId.trim()
            : "";

      const hasValidSenderId = /^\d+$/.test(normalizedSenderId);

      // ── Ad Referral handler (Click-to-Messenger / Comment-to-Message ads) ──
      if (event?.referral && hasValidSenderId) {
        const referral = event.referral;
        const adId       = referral.ad_id       || "";
        const adsetId    = referral.adset_id    || "";
        const campaignId = referral.campaign_id || "";
        const refParam   = referral.ref         || "";
        const adSource   = referral.source      || "AD"; // "ADS", "SHORTLINK", etc.
        const adType     = referral.type        || "";   // "OPEN_THREAD", "AD"

        logger.info({
          senderId: normalizedSenderId,
          pageId: recipientPageId,
          adId, adsetId, campaignId, refParam, adSource,
        }, "FB ad referral received — sending ad-aware greeting");

        try {
          // Resolve page config to get business name and chatbot settings
          const adPageConfig = await getFacebookConfig({ pageId: recipientPageId }).catch(() => null);
          if (adPageConfig?.pageAccessToken) {
            const isTagalogRef = /tagalog|ph|pilipino|pinoy/i.test(refParam);
            const businessName = adPageConfig.pageName || "us";

            // Store ad context on the conversation for downstream qualification
            if (adPageConfig.connectedWorkspaceId) {
              await supabaseClient
                .from("client_facebook_conversations")
                .upsert({
                  workspace_id: adPageConfig.connectedWorkspaceId,
                  page_id: recipientPageId,
                  customer_psid: normalizedSenderId,
                  ad_id: adId || null,
                  adset_id: adsetId || null,
                  campaign_id: campaignId || null,
                  ad_ref: refParam || null,
                  ad_source: adSource || null,
                  inquiry_source: "Facebook Ad",
                  updated_at: new Date().toISOString(),
                }, { onConflict: "workspace_id,page_id,customer_psid" });
            }

            // Send typing indicator then ad-aware greeting
            await sendFacebookSenderAction(normalizedSenderId, "typing_on", {
              pageId: recipientPageId,
              pageAccessToken: adPageConfig.pageAccessToken,
            }).catch(() => {});
            await sleep(800);

            const greeting = isTagalogRef
              ? `Salamat sa inyong interes sa ${businessName}! 🎉 Ako ang inyong AI assistant. Paano ko kayo matutulungan ngayon?`
              : `Hi! Thanks for reaching out to ${businessName} 🎉 I'm your AI assistant — what can I help you with today?`;

            await sendFacebookMessage(normalizedSenderId, greeting, {
              pageId: recipientPageId,
              pageAccessToken: adPageConfig.pageAccessToken,
            });

            // Follow up with quick-reply options
            const qr = isTagalogRef
              ? [
                  { title: "Tingnan ang presyo", payload: "VIEW_PRICES" },
                  { title: "Mag-order na", payload: "PLACE_ORDER" },
                  { title: "Makipag-ugnayan", payload: "CONTACT_AGENT" },
                ]
              : [
                  { title: "View pricing", payload: "VIEW_PRICES" },
                  { title: "Place an order", payload: "PLACE_ORDER" },
                  { title: "Talk to an agent", payload: "CONTACT_AGENT" },
                ];
            await sendQuickReplies(
              normalizedSenderId,
              isTagalogRef ? "Piliin ang inyong gusto:" : "Choose an option to get started:",
              qr,
              { pageId: recipientPageId, pageAccessToken: adPageConfig.pageAccessToken }
            ).catch(() => {});

            // Fire workflow trigger for FB ad lead
            await supabaseClient.from("workflow_executions").insert({
              workspace_id: adPageConfig.connectedWorkspaceId,
              trigger_event: "facebook.lead_captured",
              trigger_data: {
                workspace_id: adPageConfig.connectedWorkspaceId,
                sender_id: normalizedSenderId,
                page_id: recipientPageId,
                ad_id: adId,
                adset_id: adsetId,
                campaign_id: campaignId,
                ref: refParam,
                source: "Facebook Ad",
              },
              status: "pending",
            }).catch(() => {});
          }
        } catch (adErr) {
          logger.warn({ err: adErr, senderId: normalizedSenderId }, "Ad referral greeting failed");
        }
        continue;
      }

      // ── Postback handler (quick-reply button taps) ────────────────────────
      if (event?.postback?.payload && hasValidSenderId) {
        const payload = event.postback.payload;

        if (payload === "VIEW_PRICES" || payload === "PLACE_ORDER") {
          // Resolve page config to get workspaceId — it is not in scope here.
          try {
            const postbackPageConfig = await getFacebookConfig({ pageId: recipientPageId }).catch(() => null);
            const postbackWorkspaceId = postbackPageConfig?.connectedWorkspaceId || null;

            const { data: products } = postbackWorkspaceId
              ? await supabaseClient
                  .from("products")
                  .select("name, description, price, image_url, product_url")
                  .eq("workspace_id", postbackWorkspaceId)
                  .eq("is_active", true)
                  .order("created_at", { ascending: false })
                  .limit(8)
              : { data: null };

            if (products && products.length > 0) {
              await sendProductCarousel(
                normalizedSenderId,
                products.map((pr) => ({
                  title: pr.name,
                  subtitle: pr.price ? `₱${pr.price}` : pr.description,
                  image_url: pr.image_url || undefined,
                  url: pr.product_url || undefined,
                  buttons: [{ title: "View Details", url: pr.product_url || fbRuntimeConfig.shoppeLink || fbRuntimeConfig.websiteLink || "#" }],
                })),
                { pageId: recipientPageId, workspaceId: postbackWorkspaceId }
              );
            } else {
              await sendFacebookMessage(
                normalizedSenderId,
                "Please visit our store for the latest products and pricing.",
                { pageId: recipientPageId, workspaceId: postbackWorkspaceId }
              );
            }
          } catch (carouselErr) {
            logger.warn({ err: carouselErr }, "Product carousel skipped");
          }
        } else if (payload === "CONTACT_AGENT") {
          await sendFacebookMessage(
            normalizedSenderId,
            "Sure! Type 'agent' or 'tao' anytime to connect with our team. 👥",
            { pageId: recipientPageId }
          );
        } else if (payload === "MORE_QUESTIONS") {
          await sendFacebookMessage(
            normalizedSenderId,
            "Of course! Please go ahead and type your question. 😊",
            { pageId: recipientPageId }
          );
        }
        continue;
      }

      if (!hasValidSenderId || event?.message?.is_echo || (!incomingText && !imageUrl)) {
        if (incomingText && !event?.message?.is_echo) {
          logger.warn({
            entryId: entry?.id,
            senderId,
            senderIdType: typeof senderId,
          }, "Skipping webhook event with invalid sender id");
        }

        continue;
      }

      // Handle media-only messages (no text) with auto-reply if enabled
      if (imageUrl && !incomingText) {
        const pageConfig = await getCachedPageConfig(pageId);
        if (pageConfig?.media_autoreply_enabled !== false && pageConfig?.media_autoreply_message) {
          try {
            await sendFacebookMessage(senderId, pageConfig.media_autoreply_message, {
              pageId: pageConfig.pageId,
              pageAccessToken: pageConfig.pageAccessToken,
            });
            logger.info({ senderId, mediaType }, "Media auto-reply sent");
          } catch (mediaErr) {
            logger.warn({ err: mediaErr, senderId }, "Media auto-reply failed");
          }
        }
        continue;
      }

      const messageEvent = {
        senderId: normalizedSenderId,
        incomingText,
        imageUrl,
        mediaType,
        messageId,
        entryId: entry?.id,
        pageId: recipientPageId || normalizePageId(entry?.id),
      };

      if (!markWebhookEventIfNew(messageEvent)) {
        logger.info({
          pageId: messageEvent.pageId,
          senderId: normalizedSenderId,
          messageId: messageId || null,
        }, "Skipping duplicate Facebook webhook message");
        continue;
      }

      messageEvents.push(messageEvent);
    }
  }

  // ── Comment auto-reply (entry.changes — field: "feed", verb: "add") ─────────
  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "feed") continue;
      const verb = change?.value?.verb;
      const item = change?.value?.item;
      if (verb !== "add" || item !== "comment") continue;

      const commentPageId = normalizePageId(entry.id);
      // fire-and-forget — do not block the 200 response
      (async () => {
        try {
          const commentPageConfig = await getFacebookConfig({ pageId: commentPageId });
          if (!commentPageConfig?.pageAccessToken) return;
          const { generateChatbotReply } = createFacebookChatbotReplyService({
            defaultChatbotModel: DEFAULT_CHATBOT_MODEL,
            env: process.env,
          });
          await handleFacebookComment({
            change,
            pageId: commentPageId,
            pageConfig: commentPageConfig,
            supabaseClient: supabase,
            generateChatbotReply,
          });
        } catch (err) {
          logger.warn({ err, commentPageId }, "Comment auto-reply failed");
        }
      })();
    }
  }

  logger.info({
    count: messageEvents.length,
    pages: Array.from(new Set(messageEvents.map((event) => event.pageId))).filter(Boolean),
  }, "Facebook webhook message batch");

  if (messageEvents.length === 0) {
    // Log successful webhook processing with no messages
    webhookMonitoringService.logWebhookEvent({
      eventType: "webhook_received",
      status: "success",
      payloadSize,
      processingTimeMs: Date.now() - webhookStartTime,
      metadata: { messageCount: 0 },
    }).catch(() => {});
    
    return res.status(200).send("EVENT_RECEIVED");
  }

  const pageConfigCache = new Map();

  async function getCachedPageConfig(pageId) {
    const cacheKey = normalizePageId(pageId) || "default";

    if (!pageConfigCache.has(cacheKey)) {
      pageConfigCache.set(cacheKey, await getFacebookConfig({ pageId }));
    }

    return pageConfigCache.get(cacheKey);
  }

  async function fetchFacebookUserProfile(senderId, pageAccessToken) {
    if (!senderId || !pageAccessToken) return null;
    try {
      const url = `https://graph.facebook.com/v22.0/${senderId}?fields=first_name,last_name,name&access_token=${encodeURIComponent(pageAccessToken)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
      }
    } catch (err) {
      logger.warn({ err, senderId }, "Facebook profile fetch error");
    }
    return null;
  }

  const replyResults = await Promise.allSettled(
    messageEvents.map(async ({ senderId, incomingText, imageUrl, mediaType, entryId, pageId, messageId }) => {
      const messageStartTime = Date.now();
      let messageStatus = "success";
      let messageError = null;

      try {
        const pageConfig = await getCachedPageConfig(pageId);
        const chatbotEnabled = pageConfig.accessMode !== "disable";

        // Human Handoff Check
        const workspaceId = pageConfig.connectedWorkspaceId;
        let botIsPaused = false; // tracks if this conversation is paused for human handoff
        if (workspaceId) {
          // Check if conversation exists
          const { data: existingConv } = await supabaseClient
            .from("facebook_conversations")
            .select("customer_name")
            .eq("customer_psid", senderId)
            .maybeSingle();
          
          let customerName = existingConv?.customer_name;

          if (!customerName || customerName === "Facebook User") {
            const fetchedName = await fetchFacebookUserProfile(senderId, pageConfig.pageAccessToken);
            if (fetchedName) {
              customerName = fetchedName;
              
              // Proactively cache/update facebook_conversations with the fetched name
              try {
                await supabaseClient
                  .from("facebook_conversations")
                  .update({ customer_name: customerName })
                  .eq("customer_psid", senderId);
              } catch (updateErr) {
                logger.error({
                  err: updateErr,
                  workspaceId,
                  pageId: pageConfig.pageId || pageId,
                  senderId,
                }, "Failed to update facebook_conversations name");
              }
            }
          }

          if (!customerName) {
            customerName = "Facebook User";
          }

          const handoffPageId = pageConfig.pageId || pageId;

          let { data: clientConv } = await supabaseClient
            .from("client_facebook_conversations")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("page_id", handoffPageId)
            .eq("customer_psid", senderId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          logger.debug({
            workspaceId,
            pageId: handoffPageId,
            senderId,
          }, "Facebook handoff lookup parameters");
          logger.debug({ clientConv }, "Facebook handoff conversation fetched");

          const isPausedHandoff =
            clientConv &&
            (clientConv.bot_paused || clientConv.status === "human_handoff");

          // 1. Existing handoffs stay human-only. Record the message, then stop.
          if (isPausedHandoff) {
            logger.info({
              workspaceId,
              pageId: handoffPageId,
              senderId,
              customerName,
            }, "Chatbot is already paused for customer; saving message without bot reply");
            botIsPaused = true;

            await supabaseClient
              .from("client_facebook_messages")
              .insert({
                conversation_id: clientConv.id,
                workspace_id: workspaceId,
                sender_type: "customer",
                sender_name: customerName,
                message_text: incomingText || (mediaType === "video" ? "Sent a video" : mediaType === "audio" ? "Sent audio" : mediaType === "file" ? "Sent a file" : "Sent an image"),
                image_url: imageUrl || null,
                facebook_mid: messageId || null,
              });

            const _mediaEmojis = { image: "📷", video: "🎬", audio: "🎵", file: "📎" };
            await supabaseClient
              .from("client_facebook_conversations")
              .update({
                customer_name: customerName,
                bot_paused: true,
                needs_human: true,
                status: "human_handoff",
                last_message: incomingText || `${_mediaEmojis[mediaType] || "📷"} ${mediaType === "video" ? "Video" : mediaType === "audio" ? "Audio" : mediaType === "file" ? "File" : "Photo"}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", clientConv.id);

            return; // Exit early: no transfer repeat, FAQ, fallback, or AI reply.
          }

          // 2. New handoff request: pause the bot, notify once, then stop.
          if (isHumanHandoffRequest(incomingText)) {
            logger.info({
              workspaceId,
              pageId: handoffPageId,
              senderId,
              customerName,
            }, "Human handoff request detected; sending transfer message");
            
            const isTagalog = isTagalogStyle(incomingText);
            const transferMessage = isTagalog
              ? "Sandali lamang. Ililipat ko kayo sa aming sales representative para mas matulungan kayo. 👥"
              : "Please wait. I will transfer you to a sales representative. 👥";

            if (!clientConv) {
              const { data: newConv, error: insertErr } = await supabaseClient
                .from("client_facebook_conversations")
                .insert({
                  workspace_id: workspaceId,
                  page_id: handoffPageId,
                  customer_psid: senderId,
                  customer_name: customerName,
                  last_message: incomingText,
                  bot_paused: true,
                  needs_human: true,
                  status: "human_handoff",
                })
                .select("*")
                .single();

              if (insertErr) {
                logger.error({
                  err: insertErr,
                  workspaceId,
                  pageId: handoffPageId,
                  senderId,
                }, "Failed to insert client conversation");
              }
              clientConv = newConv;
            } else {
              const { data: updatedConv, error: updateErr } = await supabaseClient
                .from("client_facebook_conversations")
                .update({
                  customer_name: customerName,
                  bot_paused: true,
                  needs_human: true,
                  status: "human_handoff",
                  last_message: incomingText,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", clientConv.id)
                .select("*")
                .single();

              if (updateErr) {
                logger.error({
                  err: updateErr,
                  workspaceId,
                  pageId: handoffPageId,
                  senderId,
                  conversationId: clientConv.id,
                }, "Failed to update client conversation");
              }
              clientConv = updatedConv || clientConv;
            }

            // Send typing indicators
            try {
              await sendFacebookSenderAction(senderId, "typing_on", {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {}

            await sleep(getTypingDelayMs(transferMessage));

            try {
              await sendFacebookMessage(senderId, transferMessage, {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {
              logger.warn({
                err,
                workspaceId,
                pageId: pageConfig.pageId || pageId,
                senderId,
              }, "Failed to send Facebook transfer response");
            }

            try {
              await sendFacebookSenderAction(senderId, "typing_off", {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {}

            if (clientConv) {
              // Save customer message
              await supabaseClient
                .from("client_facebook_messages")
                .insert({
                  conversation_id: clientConv.id,
                  workspace_id: workspaceId,
                  sender_type: "customer",
                  sender_name: customerName,
                  message_text: incomingText || (mediaType === "video" ? "Sent a video" : mediaType === "audio" ? "Sent audio" : mediaType === "file" ? "Sent a file" : "Sent an image"),
                  image_url: imageUrl || null,
                  facebook_mid: messageId || null,
                });

              // Save transfer message
              await supabaseClient
                .from("client_facebook_messages")
                .insert({
                  conversation_id: clientConv.id,
                  workspace_id: workspaceId,
                  sender_type: "bot",
                  sender_name: "Chatbot",
                  message_text: transferMessage,
                });
            }

            return; // Exit early: do not generate any AI response
          }
        }

        if (!chatbotEnabled) {
          logger.info({
            workspaceId: pageConfig.connectedWorkspaceId,
            pageId: pageConfig.pageId || pageId,
            senderId,
          }, "Chatbot disabled for page; no outgoing reply sent");
          return;
        }

        const businessType = pageConfig.businessType || "";
        const pageName = pageConfig.pageName || "";
        const productServices = pageConfig.productServices || "";
        const productServicePriceRanges =
          pageConfig.productServicePriceRanges || "";
        const websiteLink = pageConfig.websiteLink || "";
        const shoppeLink = pageConfig.shoppeLink || "";
        const lazadaLink = pageConfig.lazadaLink || "";

        const memoryPageId = pageConfig.pageId || pageId;
        const history = getConversationHistory(memoryPageId, senderId, senderId, workspaceId);
        const requestMessages = [
          ...history,
          { role: "user", content: incomingText },
        ];

        let replyText = "Please wait for the agent reply.";
        let dynamicQuickReplies = null;
        let conversation = null;
        let replySource = "default";
        let replyQuickReplies = [];

        // Fetch ad context stored during referral event (if this user came from an ad)
        let adContext = {};
        if (pageConfig.connectedWorkspaceId) {
          const { data: adConv } = await supabaseClient
            .from("client_facebook_conversations")
            .select("ad_id, adset_id, campaign_id, ad_ref, ad_source, inquiry_source")
            .eq("workspace_id", pageConfig.connectedWorkspaceId)
            .eq("page_id", pageConfig.pageId || pageId)
            .eq("customer_psid", senderId)
            .maybeSingle();
          if (adConv?.ad_id) adContext = adConv;
        }

        if (chatbotEnabled && !botIsPaused && pageConfig.connectedWorkspaceId) {
          const enrichedPageConfig = {
            ...pageConfig,
            businessType,
            pageName,
            productServices,
            productServicePriceRanges,
            websiteLink,
            shoppeLink,
            lazadaLink,
            knowledge: pageConfig.knowledge || "",
            welcomeMessage: pageConfig.welcome_message || pageConfig.welcomeMessage || "",
            welcomeEnabled: pageConfig.welcome_enabled ?? pageConfig.welcomeEnabled ?? false,
            defaultReply: pageConfig.default_reply || pageConfig.defaultReply || "",
            conversationStarters: pageConfig.conversationStarters || [],
            // Pass ad attribution into chatbot context
            inquirySource: adContext.inquiry_source || pageConfig.inquirySource || "",
            adId: adContext.ad_id || "",
            adRef: adContext.ad_ref || "",
            adSource: adContext.ad_source || "",
          };

          // ── Layer 0: Business hours check (ManyChat-style away mode) ──
          if (enrichedPageConfig.business_hours_enabled) {
            const inHours = isWithinBusinessHours(enrichedPageConfig);
            if (!inHours) {
              const awayMsg = getAwayMessage(enrichedPageConfig);
              replyText = compactFacebookReply(awayMsg);
              replySource = "business_hours_away";
              salesFlowHandled = true;

              if (conversationStateService && pageConfig.connectedWorkspaceId) {
                const awayConv = await conversationStateService.getOrCreateConversation({
                  workspaceId: pageConfig.connectedWorkspaceId,
                  pageId: pageConfig.pageId || pageId,
                  customerPsid: senderId,
                  metadata: { source: "facebook_webhook", pageName },
                });
                if (awayConv?.id) {
                  await conversationStateService.appendConversationMessage({
                    conversationId: awayConv.id,
                    workspaceId: pageConfig.connectedWorkspaceId,
                    pageId: pageConfig.pageId || pageId,
                    customerPsid: senderId,
                    senderType: "customer",
                    messageText: incomingText,
                    messageType: "text",
                    aiGenerated: false,
                  });
                  await conversationStateService.appendConversationMessage({
                    conversationId: awayConv.id,
                    workspaceId: pageConfig.connectedWorkspaceId,
                    pageId: pageConfig.pageId || pageId,
                    customerPsid: senderId,
                    senderType: "ai",
                    messageText: replyText,
                    messageType: "text",
                    aiGenerated: true,
                    metadata: { source: "business_hours_away" },
                  });
                  await conversationStateService.updateConversation(awayConv.id, {
                    lastCustomerMessage: incomingText,
                    lastAiResponse: replyText,
                    lastMessageAt: new Date().toISOString(),
                  });
                }
              }
            }
          }

          // ── Layer 1: Sales flow (intent detection, lead qualification, CRM sync)
          let salesFlowHandled = false;
          try {
            const salesReply = await handleFacebookSalesConversation({
              supabaseClient,
              normalizeText,
              compactFacebookReply,
              generateChatbotReply,
              conversationStateService,
              senderId,
              incomingText,
              requestMessages,
              pageConfig: enrichedPageConfig,
            });
            if (salesReply && salesReply !== "Please wait for the agent reply.") {
              replyText = typeof salesReply === "object" ? salesReply.text : salesReply;
              replyQuickReplies = typeof salesReply === "object" ? (salesReply.quickReplies || []) : [];
              replySource = "sales_flow";
              salesFlowHandled = true;
              if (typeof salesReply === 'object' && Array.isArray(salesReply.quickReplies) && salesReply.quickReplies.length > 0) {
                dynamicQuickReplies = salesReply.quickReplies;
              }
            }
          } catch (sfErr) {
            logger.warn({ err: sfErr, senderId }, "Sales flow error — falling back to knowledge manager");
          }

          // ── Layer 2: Knowledge manager (FAQ + KB AI) — fallback if sales flow skipped
          if (!salesFlowHandled) {
            let knowledgeResult = null;
            try {
              const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });
              knowledgeResult = await knowledgeManager.resolveKnowledgeReply({
                workspaceId: pageConfig.connectedWorkspaceId,
                pageId: pageConfig.pageId || pageId,
                incomingText,
                pageConfig: enrichedPageConfig,
                compactFacebookReply,
                generateChatbotReply,
                conversationMessages: requestMessages,
              });
            } catch (knowledgeErr) {
              logger.warn({
                err: knowledgeErr,
                senderId,
                pageId: pageConfig.pageId || pageId,
              }, "Knowledge AI failed; using configured fallback reply");
              replyText = compactFacebookReply(
                enrichedPageConfig.defaultReply ||
                enrichedPageConfig.awayMessage ||
                enrichedPageConfig.handoffMessage ||
                "Thanks for reaching out. Our team will get back to you as soon as possible."
              );
              replySource = "configured_fallback";
              salesFlowHandled = true;
            }

            if (knowledgeResult?.handled && knowledgeResult.reply) {
              replyText = knowledgeResult.reply;
              replySource = knowledgeResult.source || "knowledge";
              conversation = await conversationStateService.getOrCreateConversation({
                workspaceId: pageConfig.connectedWorkspaceId,
                pageId: pageConfig.pageId || pageId,
                customerPsid: senderId,
                metadata: { source: "facebook_webhook", pageName },
              });

              if (conversation?.id) {
                await conversationStateService.updateConversation(conversation.id, {
                  lastCustomerMessage: incomingText,
                  lastAiResponse: replyText,
                  lastMessageAt: new Date().toISOString(),
                  metadata: {
                    lastReplySource: knowledgeResult.source || "knowledge",
                    lastFaqId: knowledgeResult.faq?.id || null,
                    ...(adContext.ad_id ? { adId: adContext.ad_id, adSource: adContext.ad_source } : {}),
                  },
                });
              }
            }
          }

          if (!salesFlowHandled && replyText === "Please wait for the agent reply.") {
            replyText = compactFacebookReply(
              enrichedPageConfig.defaultReply ||
              enrichedPageConfig.awayMessage ||
              enrichedPageConfig.handoffMessage ||
              "Thanks for reaching out. Our team will get back to you as soon as possible."
            );
            replySource = "configured_fallback";
          }
        }

        // ── Auto-tagging + sentiment analysis (if enabled in page settings) ──
        if (workspaceId && pageConfig.auto_tag_conversations) {
          try {
            const sentiment = detectSentiment(incomingText);
            const { data: tagConv } = await supabaseClient
              .from("client_facebook_conversations")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("page_id", pageConfig.pageId || pageId)
              .eq("customer_psid", senderId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (tagConv?.id) {
              await autoTagConversation({
                supabaseClient,
                conversationId: tagConv.id,
                workspaceId,
                intent: replySource === "sales_flow" ? "sales" : replySource,
                leadPriority: null,
                sentiment,
              });
            }
          } catch (tagErr) {
            logger.debug({ err: tagErr?.message }, "Auto-tagging skipped");
          }
        }

        // Final Failsafe: Check if chatbot was paused/handoff triggered during processing
        if (workspaceId) {
          const { data: finalCheck } = await supabaseClient
            .from("client_facebook_conversations")
            .select("bot_paused, status")
            .eq("workspace_id", workspaceId)
            .eq("page_id", pageConfig.pageId || pageId)
            .eq("customer_psid", senderId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (finalCheck && (finalCheck.bot_paused || finalCheck.status === "human_handoff")) {
            logger.info({
              workspaceId,
              pageId: pageConfig.pageId || pageId,
              senderId,
            }, "Chatbot paused by failsafe; bypassing outgoing message");
            return;
          }
        }

        setConversationHistory(memoryPageId, senderId, [
          ...requestMessages,
          { role: "assistant", content: replyText },
        ], senderId, workspaceId);

        try {
          await sendFacebookSenderAction(senderId, "typing_on", {
            pageId: pageConfig.pageId,
            pageAccessToken: pageConfig.pageAccessToken,
          });
        } catch (typingError) {
          logger.warn({
            err: typingError,
            senderId,
            pageId: pageConfig.pageId || pageId,
          }, "Facebook typing_on skipped");
        }

        const settingsDelayMs = getResponseDelayMs(pageConfig);
        await sleep(settingsDelayMs ?? getTypingDelayMs(replyText));

        await sendFacebookMessage(senderId, replyText, {
          pageId: pageConfig.pageId,
          pageAccessToken: pageConfig.pageAccessToken,
          quickReplies: replyQuickReplies,
        });

        logger.info({
          pageId: pageConfig.pageId || pageId,
          senderId,
          replySource,
          replyLength: replyText.length,
        }, "Facebook webhook reply sent");

        // Send contextual quick-replies after AI response
        try {
          const isTagalog = isTagalogStyle(incomingText || "");
          const qr = dynamicQuickReplies || (isTagalog
            ? [
                { title: "Makipag-ugnayan", payload: "CONTACT_AGENT" },
                { title: "Tingnan ang presyo", payload: "VIEW_PRICES" },
                { title: "Mag-order na", payload: "PLACE_ORDER" },
                { title: "Iba pang katanungan", payload: "MORE_QUESTIONS" },
              ]
            : [
                { title: "Talk to an agent", payload: "CONTACT_AGENT" },
                { title: "View pricing", payload: "VIEW_PRICES" },
                { title: "Place an order", payload: "PLACE_ORDER" },
                { title: "More questions", payload: "MORE_QUESTIONS" },
              ]);
          await sendQuickReplies(
            senderId,
            isTagalog ? "Paano ko pa kayo matutulungan?" : "How else can I help you?",
            qr,
            { pageId: pageConfig.pageId, pageAccessToken: pageConfig.pageAccessToken }
          );
        } catch (qrErr) {
          logger.warn({ err: qrErr, senderId }, "Quick-replies skipped");
        }

        try {
          await sendFacebookSenderAction(senderId, "typing_off", {
            pageId: pageConfig.pageId,
            pageAccessToken: pageConfig.pageAccessToken,
          });
        } catch (typingError) {
          logger.warn({
            err: typingError,
            senderId,
            pageId: pageConfig.pageId || pageId,
          }, "Facebook typing_off skipped");
        }
      } catch (error) {
        messageStatus = "failure";
        messageError = error?.message || String(error);
        logger.error({
          err: error,
          senderId,
          entryId,
          pageId,
        }, "Facebook webhook reply error");
      }

      // Log message processing to monitoring
      webhookMonitoringService.logWebhookEvent({
        workspaceId: pageConfig?.connectedWorkspaceId,
        pageId,
        eventType: imageUrl ? "media_message" : "text_message",
        status: messageStatus,
        errorMessage: messageError,
        processingTimeMs: Date.now() - messageStartTime,
        senderId,
        metadata: {
          hasMedia: Boolean(imageUrl),
          mediaType,
          messageId,
        },
      }).catch(() => {});

      // Check for failure alerts
      if (messageStatus === "failure") {
        webhookAlertingService.checkAndTriggerAlerts({
          workspaceId: pageConfig?.connectedWorkspaceId,
          pageId,
          eventType: imageUrl ? "media_message" : "text_message",
          status: "failure",
        }).catch(() => {});
      }
    })
  );

  // Log overall webhook processing completion
  webhookMonitoringService.logWebhookEvent({
    eventType: "webhook_batch",
    status: "success",
    processingTimeMs: Date.now() - webhookStartTime,
    payloadSize,
    metadata: {
      messageCount: messageEvents.length,
      pages: Array.from(new Set(messageEvents.map((event) => event.pageId))).filter(Boolean),
    },
  }).catch(() => {});

  logger.info({
    total: replyResults.length,
    fulfilled: replyResults.filter((result) => result.status === "fulfilled").length,
    rejected: replyResults.filter((result) => result.status === "rejected").length,
  }, "Facebook webhook reply batch completed");

  return res.status(200).send("EVENT_RECEIVED");
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO-REPLY RULES (Manychat-style keyword triggers)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/auto-reply-rules/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, error } = await supabase
      .from("fb_auto_reply_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ rules: data || [] });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch auto-reply rules");
    return res.status(500).json({ error: "Failed to fetch rules" });
  }
});

router.get("/auto-reply-rules/:workspaceId/:pageId", async (req, res) => {
  try {
    const { workspaceId, pageId } = req.params;
    const { data, error } = await supabase
      .from("fb_auto_reply_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("page_id", pageId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ rules: data || [] });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch auto-reply rules");
    return res.status(500).json({ error: "Failed to fetch rules" });
  }
});

router.post("/auto-reply-rules", async (req, res) => {
  try {
    const {
      workspaceId,
      pageId,
      triggerKeyword,
      triggerMatchType = "contains",
      responseText,
      quickReplies = [],
      isActive = true,
      priority = 0,
    } = req.body;

    if (!triggerKeyword || !responseText) {
      return res.status(400).json({ error: "triggerKeyword and responseText are required" });
    }

    const { data, error } = await supabase
      .from("fb_auto_reply_rules")
      .insert({
        workspace_id: workspaceId || null,
        page_id: pageId || null,
        trigger_keyword: triggerKeyword,
        trigger_match_type: triggerMatchType,
        response_text: responseText,
        quick_replies: JSON.stringify(quickReplies),
        is_active: isActive,
        priority,
      })
      .select()
      .single();

    if (error) throw error;
    return res.json({ rule: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to create auto-reply rule");
    return res.status(500).json({ error: "Failed to create rule" });
  }
});

router.put("/auto-reply-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = [
      "triggerKeyword", "triggerMatchType", "responseText",
      "quickReplies", "isActive", "priority",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        let value = req.body[key];
        if (key === "quickReplies") value = JSON.stringify(value || []);
        if (key === "isActive") value = Boolean(value);
        if (key === "priority") value = parseInt(value, 10) || 0;
        updates[dbKey] = value;
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("fb_auto_reply_rules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ rule: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to update auto-reply rule");
    return res.status(500).json({ error: "Failed to update rule" });
  }
});

router.delete("/auto-reply-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.workspaceId || req.workspaceId || "";
    let query = supabase
      .from("fb_auto_reply_rules")
      .delete()
      .eq("id", id);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { error } = await query;

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to delete auto-reply rule");
    return res.status(500).json({ error: "Failed to delete rule" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SEQUENCE TRIGGERS (Custom Trigger Management)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/sequence-triggers/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, error } = await supabase
      .from("client_facebook_sequence_triggers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) throw error;
    return res.json({ triggers: data || [] });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch sequence triggers");
    return res.status(500).json({ error: "Failed to fetch triggers" });
  }
});

router.post("/sequence-triggers", async (req, res) => {
  try {
    const { workspaceId, name } = req.body;
    if (!name || !workspaceId) return res.status(400).json({ error: "Missing required fields" });

    const safeName = String(name).trim().substring(0, 100);

    const { data, error } = await supabase
      .from("client_facebook_sequence_triggers")
      .insert({
        workspace_id: workspaceId,
        name: safeName,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ trigger: data });
  } catch (err) {
    if (err.message.includes("duplicate key")) {
      return res.status(400).json({ error: "A trigger with this name already exists." });
    }
    logger.error({ err: err.message }, "Failed to create sequence trigger");
    return res.status(500).json({ error: "Failed to create trigger" });
  }
});

router.put("/sequence-triggers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const safeName = String(name).trim().substring(0, 100);

    const { data, error } = await supabase
      .from("client_facebook_sequence_triggers")
      .update({ name: safeName })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ trigger: data });
  } catch (err) {
    if (err.message.includes("duplicate key")) {
      return res.status(400).json({ error: "A trigger with this name already exists." });
    }
    logger.error({ err: err.message }, "Failed to update sequence trigger");
    return res.status(500).json({ error: "Failed to update trigger" });
  }
});

router.delete("/sequence-triggers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("client_facebook_sequence_triggers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to delete sequence trigger");
    return res.status(500).json({ error: "Failed to delete trigger" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FLOW SEQUENCES (Botcake-style multi-step drips)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/flow-sequences/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, error } = await supabase
      .from("fb_flow_sequences")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ sequences: data || [] });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch flow sequences");
    return res.status(500).json({ error: "Failed to fetch sequences" });
  }
});

router.post("/flow-sequences", async (req, res) => {
  try {
    const { workspaceId, pageId, name, triggerStage, steps, isActive = true } = req.body;

    if (!name || !Array.isArray(steps)) {
      return res.status(400).json({ error: "name and steps array are required" });
    }

    const { data, error } = await supabase
      .from("fb_flow_sequences")
      .insert({
        workspace_id: workspaceId || null,
        page_id: pageId || null,
        name,
        trigger_stage: triggerStage || null,
        steps: JSON.stringify(steps),
        is_active: isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return res.json({ sequence: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to create flow sequence");
    return res.status(500).json({ error: "Failed to create sequence" });
  }
});

router.put("/flow-sequences/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.triggerStage !== undefined) updates.trigger_stage = req.body.triggerStage;
    if (req.body.steps !== undefined) updates.steps = JSON.stringify(req.body.steps);
    if (req.body.isActive !== undefined) updates.is_active = Boolean(req.body.isActive);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("fb_flow_sequences")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ sequence: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to update flow sequence");
    return res.status(500).json({ error: "Failed to update sequence" });
  }
});

router.delete("/flow-sequences/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.workspaceId || req.workspaceId || "";
    let query = supabase
      .from("fb_flow_sequences")
      .delete()
      .eq("id", id);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { error } = await query;

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to delete flow sequence");
    return res.status(500).json({ error: "Failed to delete sequence" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BROADCAST CAMPAIGNS (ManyChat-style mass messaging)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/broadcasts/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, error } = await supabase
      .from("fb_broadcast_campaigns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ campaigns: data || [] });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch broadcasts");
    return res.status(500).json({ error: "Failed to fetch broadcasts" });
  }
});

router.post("/broadcasts", async (req, res) => {
  try {
    const { workspaceId, pageId, name, messageText, targetTags, targetSegment, quickReplies, scheduledAt } = req.body;
    const { data, error } = await supabase
      .from("fb_broadcast_campaigns")
      .insert({
        workspace_id: workspaceId,
        page_id: pageId,
        name,
        message_text: messageText,
        target_tags: targetTags || [],
        target_segment: targetSegment || 'all',
        quick_replies: quickReplies || [],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt || null,
      })
      .select()
      .single();
    if (error) throw error;
    return res.json({ campaign: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to create broadcast");
    return res.status(500).json({ error: "Failed to create broadcast" });
  }
});

router.put("/broadcasts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceId, name, messageText, targetSegment } = req.body;
    const { data, error } = await supabase
      .from("fb_broadcast_campaigns")
      .update({
        name,
        message_text: messageText,
        target_segment: targetSegment || 'all',
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return res.json({ campaign: data });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to update broadcast");
    return res.status(500).json({ error: "Failed to update broadcast" });
  }
});

router.post("/broadcasts/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.workspaceId || req.workspaceId || "";
    const { executeBroadcast } = require("../../services/facebook/broadcastService");

    let query = supabase
      .from("fb_broadcast_campaigns")
      .select("*")
      .eq("id", id);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: campaign } = await query.single();

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const pageConfigMap = {};
    if (campaign.page_id) {
      const pc = await getFacebookConfig({ pageId: campaign.page_id });
      if (pc?.pageAccessToken) pageConfigMap[campaign.page_id] = pc;
    } else {
      const pages = await getAllFacebookPages();
      for (const page of pages) {
        if (page.pageAccessToken) pageConfigMap[page.pageId] = page;
      }
    }

    await executeBroadcast({
      supabaseClient: supabase,
      campaignId: id,
      sendFacebookMessage,
      pageConfigMap,
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to send broadcast");
    return res.status(500).json({ error: "Failed to send broadcast" });
  }
});

router.delete("/broadcasts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.workspaceId || req.workspaceId || "";
    let query = supabase
      .from("fb_broadcast_campaigns")
      .delete()
      .eq("id", id);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { error } = await query;
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete broadcast" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CONVERSATION TAGS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/tags/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, error } = await supabase
      .from("fb_conversation_tags")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");
    if (error) throw error;
    return res.json({ tags: data || [] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch tags" });
  }
});

router.post("/tags", async (req, res) => {
  try {
    const { workspaceId, name, color, description } = req.body;
    const { data, error } = await supabase
      .from("fb_conversation_tags")
      .insert({ workspace_id: workspaceId, name, color: color || '#3b82f6', description })
      .select()
      .single();
    if (error) throw error;
    return res.json({ tag: data });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create tag" });
  }
});

router.delete("/tags/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from("fb_conversation_tag_map").delete().eq("tag_id", id);
    const { error } = await supabase.from("fb_conversation_tags").delete().eq("id", id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete tag" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CHATBOT ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/analytics/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const [convResult, ruleResult, seqResult, broadcastResult, tagResult] = await Promise.all([
      supabase.from("client_facebook_conversations").select("id, lead_priority, sentiment, tags, status, created_at").eq("workspace_id", workspaceId),
      supabase.from("fb_auto_reply_rules").select("id, is_active, match_count").eq("workspace_id", workspaceId),
      supabase.from("fb_flow_sequences").select("id, is_active").eq("workspace_id", workspaceId),
      supabase.from("fb_broadcast_campaigns").select("id, status, sent_count, failed_count").eq("workspace_id", workspaceId),
      supabase.from("fb_conversation_tags").select("id, name, color").eq("workspace_id", workspaceId),
    ]);

    const conversations = convResult.data || [];
    const rules = ruleResult.data || [];
    const sequences = seqResult.data || [];
    const broadcasts = broadcastResult.data || [];
    const tags = tagResult.data || [];

    const totalConversations = conversations.length;
    const hotLeads = conversations.filter(c => c.lead_priority === 'hot').length;
    const warmLeads = conversations.filter(c => c.lead_priority === 'warm').length;
    const coldLeads = conversations.filter(c => c.lead_priority === 'cold').length;
    const handoffs = conversations.filter(c => c.status === 'human_handoff').length;
    const positiveSentiment = conversations.filter(c => c.sentiment === 'positive').length;
    const negativeSentiment = conversations.filter(c => c.sentiment === 'negative').length;
    const activeRules = rules.filter(r => r.is_active).length;
    const totalRuleMatches = rules.reduce((sum, r) => sum + (r.match_count || 0), 0);
    const activeSequences = sequences.filter(s => s.is_active).length;
    const sentBroadcasts = broadcasts.filter(b => b.status === 'sent').length;
    const totalBroadcastRecipients = broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);

    return res.json({
      totalConversations,
      hotLeads,
      warmLeads,
      coldLeads,
      handoffs,
      positiveSentiment,
      negativeSentiment,
      neutralSentiment: totalConversations - positiveSentiment - negativeSentiment,
      activeRules,
      totalRules: rules.length,
      totalRuleMatches,
      activeSequences,
      totalSequences: sequences.length,
      sentBroadcasts,
      totalBroadcasts: broadcasts.length,
      totalBroadcastRecipients,
      tags,
    });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to fetch chatbot analytics");
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;
