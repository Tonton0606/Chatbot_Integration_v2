const crypto = require("crypto");
const express = require("express");

const logger = require("../config/logger");
const { supabase } = require("../config/supabase");
const { getWorkspaceId: getAuthWorkspaceId } = require("../middleware/auth");

const router = express.Router();
const aiRouter = express.Router();

const CAMPAIGN_COLUMNS = [
  "id", "workspace_id", "campaign_name", "platforms", "objective",
  "campaign_type", "product_service_name", "destination_type", "destination_url",
  "page_name", "headline", "primary_text", "description", "call_to_action",
  "image_url", "audience_locations", "audience_age_min", "audience_age_max",
  "audience_gender", "audience_interests", "customer_type", "language",
  "audience_notes", "daily_budget", "total_budget", "budget_type", "bid_strategy",
  "schedule_type", "start_date", "end_date", "status", "approval_status",
  "rejection_reason", "internal_notes", "ai_suggestion", "publication_metadata",
  "activity_log", "metrics_clicks", "metrics_impressions", "metrics_reach",
  "metrics_messages", "metrics_leads", "metrics_bookings", "metrics_conversions",
  "metrics_spend", "created_by", "updated_by", "approved_by", "approved_at",
  "rejected_at", "archived_at", "created_at", "updated_at",
].join(",");

const VALID_STATUSES = new Set([
  "draft", "pending_approval", "approved", "rejected", "ready_to_publish",
  "active", "paused", "completed", "archived", "failed", "needs_connection",
]);
const VALID_PLATFORMS = new Set([
  "facebook", "instagram", "tiktok", "messenger", "shopee", "lazada", "website",
]);
const PLATFORMS_FOR_CONNECTIONS = [
  "facebook", "instagram", "tiktok", "messenger", "shopee", "lazada", "website",
];
const VALID_OBJECTIVES = new Set([
  "get_messages", "get_bookings", "get_website_visits", "promote_product",
  "promote_shopee_link", "promote_lazada_link", "generate_leads", "brand_awareness",
]);
const CONNECTION_COLUMNS = [
  "id", "workspace_id", "platform", "provider", "status", "facebook_page_id",
  "facebook_page_name", "ad_account_id", "ad_account_name", "external_business_id",
  "notes", "metadata", "connected_by", "connected_at", "last_tested_at",
  "created_at", "updated_at",
].join(",");

function normalizeText(value, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function label(value = "") {
  return String(value).split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function normalizeArray(value, maxItems = 30) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(source.map((item) => normalizeText(item, 100)).filter(Boolean))].slice(0, maxItems);
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function getWorkspaceId(req) {
  const id = getAuthWorkspaceId(req);
  return id ? normalizeText(id, 80) : "";
}

function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function buildActivity(type, req, message) {
  return {
    type,
    message,
    at: new Date().toISOString(),
    by: req.user?.id || null,
  };
}

function mapCampaign(row = {}) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignName: row.campaign_name || "",
    platforms: row.platforms || [],
    objective: row.objective || "brand_awareness",
    campaignType: row.campaign_type || "standard",
    productServiceName: row.product_service_name || "",
    destinationType: row.destination_type || "website_page",
    destinationUrl: row.destination_url || "",
    pageName: row.page_name || "",
    headline: row.headline || "",
    primaryText: row.primary_text || "",
    description: row.description || "",
    callToAction: row.call_to_action || "learn_more",
    imageUrl: row.image_url || "",
    audienceLocations: row.audience_locations || [],
    audienceAgeMin: Number(row.audience_age_min || 18),
    audienceAgeMax: Number(row.audience_age_max || 65),
    audienceGender: row.audience_gender || "all",
    audienceInterests: row.audience_interests || [],
    customerType: row.customer_type || "",
    language: row.language || "all",
    audienceNotes: row.audience_notes || "",
    dailyBudget: Number(row.daily_budget || 0),
    totalBudget: Number(row.total_budget || 0),
    budgetType: row.budget_type || "daily",
    bidStrategy: row.bid_strategy || "lowest_cost",
    scheduleType: row.schedule_type || "continuous",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    status: row.status || "draft",
    approvalStatus: row.approval_status || "not_submitted",
    rejectionReason: row.rejection_reason || "",
    internalNotes: row.internal_notes || "",
    aiSuggestion: row.ai_suggestion || {},
    publicationMetadata: row.publication_metadata || {},
    activityLog: row.activity_log || [],
    metrics: {
      clicks: Number(row.metrics_clicks || 0),
      impressions: Number(row.metrics_impressions || 0),
      reach: Number(row.metrics_reach || 0),
      messages: Number(row.metrics_messages || 0),
      leads: Number(row.metrics_leads || 0),
      bookings: Number(row.metrics_bookings || 0),
      conversions: Number(row.metrics_conversions || 0),
      spend: Number(row.metrics_spend || 0),
    },
    approvedAt: row.approved_at || null,
    rejectedAt: row.rejected_at || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function buildCampaignPayload(body = {}, partial = false) {
  const payload = {};
  const set = (key, value) => {
    if (!partial || body[key] !== undefined) payload[value[0]] = value[1]();
  };

  set("campaignName", ["campaign_name", () => normalizeText(body.campaignName, 160)]);
  set("platforms", ["platforms", () => normalizeArray(body.platforms, 7).filter((item) => VALID_PLATFORMS.has(item))]);
  set("objective", ["objective", () => VALID_OBJECTIVES.has(body.objective) ? body.objective : "brand_awareness"]);
  set("campaignType", ["campaign_type", () => normalizeText(body.campaignType, 80) || "standard"]);
  set("productServiceName", ["product_service_name", () => normalizeText(body.productServiceName, 240) || null]);
  set("destinationType", ["destination_type", () => normalizeText(body.destinationType, 80) || "website_page"]);
  set("destinationUrl", ["destination_url", () => normalizeText(body.destinationUrl, 2000) || null]);
  set("pageName", ["page_name", () => normalizeText(body.pageName, 160) || null]);
  set("headline", ["headline", () => normalizeText(body.headline, 255) || null]);
  set("primaryText", ["primary_text", () => normalizeText(body.primaryText, 2200) || null]);
  set("description", ["description", () => normalizeText(body.description, 500) || null]);
  set("callToAction", ["call_to_action", () => normalizeText(body.callToAction, 80) || "learn_more"]);
  set("imageUrl", ["image_url", () => normalizeText(body.imageUrl, 4000) || null]);
  set("audienceLocations", ["audience_locations", () => normalizeArray(body.audienceLocations)]);
  set("audienceAgeMin", ["audience_age_min", () => Math.min(65, Math.max(13, Number(body.audienceAgeMin) || 18))]);
  set("audienceAgeMax", ["audience_age_max", () => Math.min(65, Math.max(13, Number(body.audienceAgeMax) || 65))]);
  set("audienceGender", ["audience_gender", () => ["all", "male", "female"].includes(body.audienceGender) ? body.audienceGender : "all"]);
  set("audienceInterests", ["audience_interests", () => normalizeArray(body.audienceInterests)]);
  set("customerType", ["customer_type", () => normalizeText(body.customerType, 100) || null]);
  set("language", ["language", () => normalizeText(body.language, 50) || "all"]);
  set("audienceNotes", ["audience_notes", () => normalizeText(body.audienceNotes, 2000) || null]);
  set("dailyBudget", ["daily_budget", () => normalizeMoney(body.dailyBudget)]);
  set("totalBudget", ["total_budget", () => normalizeMoney(body.totalBudget)]);
  set("budgetType", ["budget_type", () => body.budgetType === "lifetime" ? "lifetime" : "daily"]);
  set("bidStrategy", ["bid_strategy", () => normalizeText(body.bidStrategy, 80) || "lowest_cost"]);
  set("scheduleType", ["schedule_type", () => normalizeText(body.scheduleType, 80) || "continuous"]);
  set("startDate", ["start_date", () => normalizeText(body.startDate, 10) || null]);
  set("endDate", ["end_date", () => normalizeText(body.endDate, 10) || null]);
  set("internalNotes", ["internal_notes", () => normalizeText(body.internalNotes, 5000) || null]);
  set("aiSuggestion", ["ai_suggestion", () => body.aiSuggestion && typeof body.aiSuggestion === "object" ? body.aiSuggestion : {}]);
  return payload;
}

async function getCampaign(workspaceId, campaignId) {
  const { data, error } = await supabase
    .from("social_media_ad_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function mapConnection(row = {}) {
  return {
    id: row.id || "",
    workspaceId: row.workspace_id || "",
    platform: row.platform || "",
    provider: row.provider || "manual",
    status: row.status || "not_connected",
    facebookPageId: row.facebook_page_id || "",
    facebookPageName: row.facebook_page_name || "",
    adAccountId: row.ad_account_id || "",
    adAccountName: row.ad_account_name || "",
    externalBusinessId: row.external_business_id || "",
    notes: row.notes || "",
    metadata: row.metadata || {},
    connectedAt: row.connected_at || null,
    lastTestedAt: row.last_tested_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function getWorkspaceFacebookPages(workspaceId) {
  const { data, error } = await supabase
    .from("fb_pages")
    .select("id,page_id,fb_page_id,fb_name")
    .eq("workspace_id", workspaceId)
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function getConnectionRows(workspaceId) {
  const { data, error } = await supabase
    .from("social_media_ad_connections")
    .select(CONNECTION_COLUMNS)
    .eq("workspace_id", workspaceId);
  if (error) {
    if (error.code === "42P01" || String(error.message || "").includes("social_media_ad_connections")) {
      logger.warn({ workspaceId }, "social ad connection table is not available; falling back to page-only connection status");
      return [];
    }
    throw error;
  }
  return data || [];
}

function summarizeConnections(rows = [], pages = []) {
  const byPlatform = {};
  rows.forEach((row) => {
    byPlatform[row.platform] = mapConnection(row);
  });

  const hasFacebookPage = Boolean(pages.length);
  const fallbackPage = pages[0] || {};
  const facebookPageId = fallbackPage.page_id || fallbackPage.fb_page_id || fallbackPage.id || "";
  const facebookPageName = fallbackPage.fb_name || "";

  ["facebook", "messenger"].forEach((platform) => {
    if (!byPlatform[platform]) {
      byPlatform[platform] = {
        platform,
        provider: "facebook_connect",
        status: hasFacebookPage ? "needs_review" : "not_connected",
        facebookPageId,
        facebookPageName,
        adAccountId: "",
        adAccountName: "",
        notes: hasFacebookPage ? "Facebook page found. Add a Meta Ad Account before publishing ads." : "",
        metadata: { source: "fb_pages", hasFacebookPage },
      };
    } else if (hasFacebookPage && !byPlatform[platform].facebookPageId) {
      byPlatform[platform].facebookPageId = facebookPageId;
      byPlatform[platform].facebookPageName = facebookPageName;
    }
  });

  PLATFORMS_FOR_CONNECTIONS.forEach((platform) => {
    if (!byPlatform[platform]) {
      byPlatform[platform] = {
        platform,
        provider: "manual",
        status: platform === "website" ? "connected" : ["shopee", "lazada"].includes(platform) ? "coming_soon" : "not_connected",
        facebookPageId: "",
        facebookPageName: "",
        adAccountId: "",
        adAccountName: "",
        notes: "",
        metadata: {},
      };
    }
  });

  return byPlatform;
}

const VALID_TRANSITIONS = {
  draft: ["pending_approval", "draft", "archived"],
  pending_approval: ["approved", "rejected", "draft", "archived"],
  approved: ["ready_to_publish", "paused", "archived", "draft"],
  ready_to_publish: ["active", "paused", "draft", "archived"],
  active: ["paused", "completed", "archived"],
  paused: ["active", "archived"],
  rejected: ["draft", "archived"],
  completed: ["archived"],
  archived: ["draft"],
  needs_connection: ["ready_to_publish", "draft", "archived"],
};

async function changeStatus(req, res, next, status, message, extra = {}) {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const current = await getCampaign(workspaceId, req.params.id);
    if (!current) return res.status(404).json({ success: false, error: "Campaign not found." });
    const allowed = VALID_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) return res.status(409).json({ success: false, error: `Cannot change status from "${current.status}" to "${status}".` });
    const activity = [...(Array.isArray(current.activity_log) ? current.activity_log : []), buildActivity(status, req, message)].slice(-100);
    const { data, error } = await supabase
      .from("social_media_ad_campaigns")
      .update({ status, activity_log: activity, updated_by: req.user.id, updated_at: new Date().toISOString(), ...extra })
      .eq("workspace_id", workspaceId)
      .eq("id", req.params.id)
      .select(CAMPAIGN_COLUMNS)
      .single();
    if (error) throw error;
    return res.json({ success: true, data: mapCampaign(data) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad status update failed");
    return next(err);
  }
}

router.get("/workspaces", async (req, res, next) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ success: false, error: "Admin access required." });
    const { data, error } = await supabase.from("workspaces").select("id,name").order("name").limit(200);
    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, "social ads workspace list failed");
    return next(err);
  }
});

router.get("/connections", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const [pages, rows] = await Promise.all([
      getWorkspaceFacebookPages(workspaceId),
      getConnectionRows(workspaceId),
    ]);
    const details = summarizeConnections(rows, pages);
    const statuses = Object.fromEntries(Object.entries(details).map(([platform, item]) => [platform, item.status]));
    statuses.ai = process.env.GROQ_API_KEY ? "connected" : "not_connected";
    return res.json({ success: true, data: { statuses, details, facebookPages: pages.map((page) => ({
      id: page.id,
      pageId: page.page_id || page.fb_page_id || page.id,
      pageName: page.fb_name || "Facebook Page",
    })) } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad connection check failed");
    return next(err);
  }
});

router.put("/connections/:platform", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const platform = normalizeText(req.params.platform, 30);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    if (!VALID_PLATFORMS.has(platform)) return res.status(400).json({ success: false, error: "Unsupported platform." });
    if (["shopee", "lazada"].includes(platform)) return res.status(409).json({ success: false, error: `${label(platform)} publishing is coming soon.` });

    const facebookPageId = normalizeText(req.body?.facebookPageId, 120);
    const adAccountId = normalizeText(req.body?.adAccountId, 120);
    if (["facebook", "instagram", "messenger"].includes(platform) && !facebookPageId) {
      return res.status(400).json({ success: false, error: "Select a Facebook page from Facebook Connect." });
    }
    if (["facebook", "instagram", "messenger"].includes(platform) && !adAccountId) {
      return res.status(400).json({ success: false, error: "Meta Ad Account ID is required before publishing ads." });
    }

    const now = new Date().toISOString();
    const payload = {
      workspace_id: workspaceId,
      platform,
      provider: normalizeText(req.body?.provider, 80) || "manual",
      status: "connected",
      facebook_page_id: facebookPageId || null,
      facebook_page_name: normalizeText(req.body?.facebookPageName, 180) || null,
      ad_account_id: adAccountId || null,
      ad_account_name: normalizeText(req.body?.adAccountName, 180) || null,
      external_business_id: normalizeText(req.body?.externalBusinessId, 180) || null,
      notes: normalizeText(req.body?.notes, 1000) || null,
      metadata: req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
      connected_by: req.user.id,
      connected_at: now,
      last_tested_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("social_media_ad_connections")
      .upsert(payload, { onConflict: "workspace_id,platform" })
      .select(CONNECTION_COLUMNS)
      .single();
    if (error) throw error;
    return res.json({ success: true, data: mapConnection(data) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), platform: req.params.platform }, "social ad connection save failed");
    return next(err);
  }
});

router.delete("/connections/:platform", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const platform = normalizeText(req.params.platform, 30);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    if (!VALID_PLATFORMS.has(platform)) return res.status(400).json({ success: false, error: "Unsupported platform." });
    const { error } = await supabase
      .from("social_media_ad_connections")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("platform", platform);
    if (error) throw error;
    return res.json({ success: true, data: { platform } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), platform: req.params.platform }, "social ad connection remove failed");
    return next(err);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const [{ data: campaigns, error: campaignError }, { data: daily, error: dailyError }] = await Promise.all([
      supabase.from("social_media_ad_campaigns").select(CAMPAIGN_COLUMNS).eq("workspace_id", workspaceId).is("archived_at", null).limit(500),
      supabase.from("social_media_ad_daily_metrics").select("metric_date,impressions,reach,clicks,messages,leads,bookings,conversions,spend").eq("workspace_id", workspaceId).order("metric_date", { ascending: true }).limit(365),
    ]);
    if (campaignError) throw campaignError;
    if (dailyError) throw dailyError;
    const rows = campaigns || [];
    const sum = (field) => rows.reduce((total, item) => total + Number(item[field] || 0), 0);
    const best = [...rows].sort((a, b) => Number(b.metrics_leads || 0) - Number(a.metrics_leads || 0))[0];
    return res.json({
      success: true,
      data: {
        summary: {
          totalCampaigns: rows.length,
          activeAds: rows.filter((item) => item.status === "active").length,
          draftAds: rows.filter((item) => item.status === "draft").length,
          pendingApproval: rows.filter((item) => item.status === "pending_approval").length,
          totalBudget: sum("total_budget"), totalSpend: sum("metrics_spend"),
          leadsGenerated: sum("metrics_leads"), bookingsGenerated: sum("metrics_bookings"),
          messagesReceived: sum("metrics_messages"), bestPerformingCampaign: best?.campaign_name || "None yet",
        },
        daily: daily || [],
      },
    });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad analytics failed");
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    let query = supabase.from("social_media_ad_campaigns").select(CAMPAIGN_COLUMNS).eq("workspace_id", workspaceId).order("created_at", { ascending: req.query.sort === "oldest" }).limit(limit);
    if (req.query.status && VALID_STATUSES.has(req.query.status)) query = query.eq("status", req.query.status);
    if (req.query.platform && VALID_PLATFORMS.has(req.query.platform)) query = query.contains("platforms", [req.query.platform]);
    if (req.query.objective && VALID_OBJECTIVES.has(req.query.objective)) query = query.eq("objective", req.query.objective);
    if (req.query.search) query = query.ilike("campaign_name", `%${normalizeText(req.query.search, 80).replace(/[%_]/g, "")}%`);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, data: (data || []).map(mapCampaign) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad campaign list failed");
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const campaign = await getCampaign(workspaceId, req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found." });
    return res.json({ success: true, data: mapCampaign(campaign) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad campaign read failed");
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const payload = buildCampaignPayload(req.body);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    if (!payload.campaign_name) return res.status(400).json({ success: false, error: "Campaign name is required." });
    if (!payload.platforms.length) return res.status(400).json({ success: false, error: "Select at least one platform." });
    if (!isValidHttpUrl(payload.destination_url)) return res.status(400).json({ success: false, error: "Destination URL must use http or https." });
    if (payload.audience_age_min > payload.audience_age_max) return res.status(400).json({ success: false, error: "Minimum age cannot exceed maximum age." });
    if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) return res.status(400).json({ success: false, error: "End date cannot be before start date." });
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("social_media_ad_campaigns").insert({
      ...payload, workspace_id: workspaceId, status: "draft", approval_status: "not_submitted",
      activity_log: [buildActivity("created", req, "Campaign created as draft.")],
      created_by: req.user.id, updated_by: req.user.id, created_at: now, updated_at: now,
    }).select(CAMPAIGN_COLUMNS).single();
    if (error) throw error;
    return res.status(201).json({ success: true, data: mapCampaign(data) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad campaign create failed");
    return next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    const current = await getCampaign(workspaceId, req.params.id);
    if (!current) return res.status(404).json({ success: false, error: "Campaign not found." });
    const updates = buildCampaignPayload(req.body, true);
    if (updates.destination_url !== undefined && !isValidHttpUrl(updates.destination_url)) return res.status(400).json({ success: false, error: "Destination URL must use http or https." });
    updates.updated_by = req.user.id;
    updates.updated_at = new Date().toISOString();
    updates.activity_log = [...(current.activity_log || []), buildActivity("updated", req, "Campaign details updated.")].slice(-100);
    const { data, error } = await supabase.from("social_media_ad_campaigns").update(updates).eq("workspace_id", workspaceId).eq("id", req.params.id).select(CAMPAIGN_COLUMNS).single();
    if (error) throw error;
    return res.json({ success: true, data: mapCampaign(data) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad campaign update failed");
    return next(err);
  }
});

router.post("/:id/duplicate", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const current = await getCampaign(workspaceId, req.params.id);
    if (!current) return res.status(404).json({ success: false, error: "Campaign not found." });
    const copy = { ...current };
    ["id", "created_at", "updated_at", "approved_at", "rejected_at", "archived_at", "approved_by"].forEach((key) => delete copy[key]);
    copy.campaign_name = `${current.campaign_name} - Copy`;
    copy.status = "draft";
    copy.approval_status = "not_submitted";
    copy.rejection_reason = null;
    copy.activity_log = [buildActivity("duplicated", req, `Duplicated from ${current.campaign_name}.`)];
    copy.created_by = req.user.id;
    copy.updated_by = req.user.id;
    const now = new Date().toISOString();
    copy.created_at = now;
    copy.updated_at = now;
    const { data, error } = await supabase.from("social_media_ad_campaigns").insert(copy).select(CAMPAIGN_COLUMNS).single();
    if (error) throw error;
    return res.status(201).json({ success: true, data: mapCampaign(data) });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad duplicate failed");
    return next(err);
  }
});

router.post("/:id/submit", (req, res, next) => changeStatus(req, res, next, "pending_approval", "Campaign submitted for approval.", { approval_status: "pending", rejection_reason: null }));
router.post("/:id/approve", (req, res, next) => changeStatus(req, res, next, "approved", "Campaign approved.", { approval_status: "approved", approved_by: req.user.id, approved_at: new Date().toISOString(), rejection_reason: null }));
router.post("/:id/pause", (req, res, next) => changeStatus(req, res, next, "paused", "Campaign paused."));
router.post("/:id/resume", (req, res, next) => changeStatus(req, res, next, "active", "Campaign resumed."));
router.post("/:id/draft", (req, res, next) => changeStatus(req, res, next, "draft", "Campaign saved as draft.", { approval_status: "not_submitted" }));
router.post("/:id/archive", (req, res, next) => changeStatus(req, res, next, "archived", "Campaign archived.", { archived_at: new Date().toISOString() }));

router.post("/:id/reject", async (req, res, next) => {
  const reason = normalizeText(req.body?.reason, 2000);
  if (!reason) return res.status(400).json({ success: false, error: "Rejection reason is required." });
  return changeStatus(req, res, next, "rejected", `Campaign rejected: ${reason}`, { approval_status: "rejected", rejection_reason: reason, rejected_at: new Date().toISOString() });
});

router.post("/:id/publish", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const current = await getCampaign(workspaceId, req.params.id);
    if (!current) return res.status(404).json({ success: false, error: "Campaign not found." });
    const [pages, rows] = await Promise.all([
      getWorkspaceFacebookPages(workspaceId),
      getConnectionRows(workspaceId),
    ]);
    const connectionDetails = summarizeConnections(rows, pages);
    const connected = current.platforms.every((platform) => {
      if (platform === "website") return true;
      if (["shopee", "lazada"].includes(platform)) return false;
      return connectionDetails[platform]?.status === "connected";
    });
    const status = connected ? "ready_to_publish" : "needs_connection";
    return changeStatus(req, res, next, status, connected ? "Campaign is ready for manual publishing." : "Campaign needs a platform connection before publishing.", {
      publication_metadata: { requestedAt: new Date().toISOString(), externalPublishAttempted: false },
    });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad publish readiness failed");
    return next(err);
  }
});

router.post("/connection-test/:platform", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const platform = normalizeText(req.params.platform, 30);
    if (!VALID_PLATFORMS.has(platform)) return res.status(400).json({ success: false, error: "Unsupported platform." });
    const [pages, rows] = await Promise.all([
      getWorkspaceFacebookPages(workspaceId),
      getConnectionRows(workspaceId),
    ]);
    const connectionDetails = summarizeConnections(rows, pages);
    const status = platform === "website" ? "connected" : ["shopee", "lazada"].includes(platform) ? "coming_soon" : connectionDetails[platform]?.status || "not_connected";
    const { error } = await supabase
      .from("social_media_ad_connections")
      .update({ last_tested_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("platform", platform);
    if (error && error.code !== "42P01") throw error;
    return res.json({ success: true, data: { platform, status, details: connectionDetails[platform] || null } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), platform: req.params.platform }, "social ad connection test failed");
    return next(err);
  }
});

router.post("/creative-image", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const match = normalizeText(req.body?.dataUrl, 3000000).match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    if (!match) return res.status(400).json({ success: false, error: "Upload a JPG, PNG, or WebP image." });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 2097152) return res.status(400).json({ success: false, error: "Image must be 2 MB or smaller." });
    const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
    const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("social-ad-creatives").upload(path, buffer, { contentType: match[1], upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("social-ad-creatives").getPublicUrl(path);
    return res.status(201).json({ success: true, data: { imageUrl: data.publicUrl } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad creative upload failed");
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const current = await getCampaign(workspaceId, req.params.id);
    if (!current) return res.status(404).json({ success: false, error: "Campaign not found." });
    if (!["draft", "rejected", "archived"].includes(current.status)) return res.status(409).json({ success: false, error: "Only draft, rejected, or archived campaigns can be permanently deleted." });
    const { error } = await supabase.from("social_media_ad_campaigns").delete().eq("workspace_id", workspaceId).eq("id", req.params.id);
    if (error) throw error;
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req), campaignId: req.params.id }, "social ad delete failed");
    return next(err);
  }
});

aiRouter.post("/", async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ success: false, error: "Workspace is required." });
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ success: false, configured: false, error: "AI connection not configured." });
    const context = {
      product: normalizeText(req.body?.productServiceName, 240),
      objective: normalizeText(req.body?.objective, 80),
      platform: normalizeArray(req.body?.platforms, 7).join(", "),
      audience: normalizeText(req.body?.customerType, 100),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Create a concise social ad draft. Return JSON only with headline, caption, cta, audienceSuggestion, hashtags (array), and budgetSuggestion. Do not claim the ad is published." },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const result = await response.json();
    const raw = result?.choices?.[0]?.message?.content || "{}";
    let suggestion;
    try {
      suggestion = JSON.parse(raw);
    } catch {
      suggestion = { headline: "", caption: raw.slice(0, 500), cta: "learn_more", audienceSuggestion: "", hashtags: [], budgetSuggestion: "" };
    }
    return res.json({ success: true, configured: true, data: {
      headline: normalizeText(suggestion.headline, 255), caption: normalizeText(suggestion.caption, 2200),
      cta: normalizeText(suggestion.cta, 80), audienceSuggestion: normalizeText(suggestion.audienceSuggestion, 500),
      hashtags: normalizeArray(suggestion.hashtags, 12), budgetSuggestion: normalizeText(suggestion.budgetSuggestion, 300),
    } });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: getWorkspaceId(req) }, "social ad AI suggestion failed");
    return next(err);
  }
});

module.exports = { socialMediaAdsRoutes: router, socialMediaAdsAiRoutes: aiRouter };
