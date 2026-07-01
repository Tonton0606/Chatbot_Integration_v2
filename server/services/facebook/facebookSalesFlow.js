const logger = require('../../config/logger');
const {
  createFacebookFlowStateService,
} = require("./facebookFlowState");

const {
  isAffirmativeReply,
  isNegativeReply,
} = require("./facebookCtaResolver");

const {
  buildCtaOptionsReply,
  handlePostConfirmationFlow,
  normalizeConfirmedFlowData,
} = require("./facebookPostConfirmationFlow");

const {
  inferLeadStageFromIntent,
  syncFacebookLead,
} = require("./facebookLeadCrmSync");

const {
  analyzeFacebookPageIntelligence,
} = require("./facebookPageIntelligence");

const {
  qualifyFacebookLead,
  extractDailyVolume,
} = require("./facebookLeadQualification");

const {
  buildAdaptiveSalesReply,
  buildRecommendationReply,
} = require("./facebookSalesResponder");

const {
  getNextContactField,
  getNextDiscoveryField,
  shouldAskContactBeforeAction,
  shouldConfirmBeforeCta,
} = require("./facebookDiscoveryPolicy");

const {
  buildLeadConfirmationReply,
  canSaveConfirmedLeadToCrm,
  getConfirmedLeadData,
  getPendingLeadData,
  isConfirmationAccepted,
  isConfirmationRejected,
  needsLeadConfirmation,
  promotePendingToConfirmed,
  resetLeadConfirmation,
} = require("./facebookLeadConfirmation");

const {
  captureExpectedField,
  setAwaitingField,
} = require("./facebookExpectedFieldCapture");

const {
  deriveInquirySource,
  buildAdContextGreeting,
  buildReferralQuickReplies,
} = require("./facebookReferralContext");

const {
  naturalizeReply,
} = require("./facebookReplyNaturalizer");

const {
  createFacebookKnowledgeManager,
} = require("./facebookKnowledgeManager");

const {
  buildObjectionResponse,
  detectObjectionType,
  shouldHandleObjection,
} = require("./facebookObjectionHandling");

const {
  detectBehavioralSignals,
  calculateEngagementScore,
  generateBehavioralInsights,
  buildBehavioralResponse,
  predictNextBestAction,
} = require("./facebookBehavioralTriggers");

const {
  matchAutoReplyRule,
} = require("./facebookAutoReplyRules");

const GENERIC_FALLBACK_REPLY = "How can I help you today? Feel free to ask about our products, pricing, or to schedule a consultation.";

const flowStateService = createFacebookFlowStateService();

const CUSTOMER_FIELDS = [
  "customerName",
  "phone",
  "email",
  "location",
  "businessType",
  "businessModel",
  "productOrServiceWanted",
  "problemEncountered",
  "desiredSolution",
  "inquirySource",
  "dailyVolume",
  "budgetOrQuantity",
  "preferredSchedule",
  "urgency",
];

const KNOWLEDGE_BYPASS_INTENTS = new Set([
  "affirmative_response",
  "negative_response",
  "human_request",
]);

const KNOWLEDGE_BYPASS_STAGES = new Set([
  "awaiting_lead_confirmation",
  "awaiting_lead_correction",
  "awaiting_demo_schedule",
  "demo_schedule_received",
]);

const OBJECTION_SKIP_STAGES = new Set([
  "awaiting_lead_confirmation",
  "awaiting_lead_correction",
  "awaiting_demo_schedule",
  "demo_schedule_received",
  "human_handoff",
]);

const { isFilipinoStyle } = require("./facebookReplyUtils");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Intent groups scored by keyword count. Each entry: { intent, keywords, confidence }.
// Evaluated in priority order — first group that scores > 0 wins.
// Universal intents (affirmative/negative) are checked before this table.
// SaaS/product-specific keywords have been removed so this works for any business type.
const INTENT_GROUPS = [
  {
    intent: "human_request",
    confidence: 0.9,
    keywords: [
      "tao", "agent", "representative", "human", "admin",
      "kausap", "tawag", "call", "staff", "speak to",
      "talk to", "connect me", "transfer",
    ],
  },
  {
    intent: "demo_request",
    confidence: 0.88,
    keywords: [
      "demo", "meeting", "schedule", "appointment", "book",
      "presentation", "pakita", "sample", "consultation", "consult",
      "try", "free trial", "libreng",
    ],
  },
  {
    intent: "pricing_inquiry",
    confidence: 0.88,
    keywords: [
      "magkano", "price", "pricing", "presyo", "cost",
      "bayad", "package", "plan", "rate", "how much",
      "gaano", "singil", "fee", "monthly", "yearly",
    ],
  },
  {
    intent: "greeting",
    confidence: 0.75,
    keywords: [
      "hello", "hi", "hey", "good day", "kumusta", "kamusta",
      "good morning", "good afternoon", "good evening", "magandang",
    ],
  },
  // Generic product/service inquiry — fires when the user expresses interest
  // in something specific without fitting a more precise category above.
  // Keywords intentionally kept broad so they work for any business type.
  {
    intent: "product_inquiry",
    confidence: 0.72,
    keywords: [
      "interested", "interesado", "gusto", "want", "need", "kailangan",
      "looking for", "hanap", "order", "buy", "purchase", "bilhin",
      "bibili", "available", "meron", "mayroon", "pa-order", "pa-book",
    ],
  },
];

function detectFacebookIntent(text = "", pageConfig = {}) {
  const message = String(text || "").toLowerCase();

  if (isAffirmativeReply(message) || isConfirmationAccepted(message)) {
    return { intent: "affirmative_response", confidence: 0.82 };
  }

  if (isNegativeReply(message) || isConfirmationRejected(message)) {
    return { intent: "negative_response", confidence: 0.82 };
  }
  
  const customHandoffKeywords = Array.isArray(pageConfig?.handoffKeywords)
    ? pageConfig.handoffKeywords.flatMap(k => String(k).split(',').map(s => s.toLowerCase().trim())).filter(Boolean)
    : [];

  // Score each group — pick the first one with any keyword match.
  // Multiple keyword hits increase confidence up to 0.95.
  for (const group of INTENT_GROUPS) {
    let checkKeywords = group.keywords;
    
    if (group.intent === "human_request" && customHandoffKeywords.length > 0) {
      checkKeywords = [...new Set([...checkKeywords, ...customHandoffKeywords])];
    }
    
    const hits = checkKeywords.filter((kw) => message.includes(kw)).length;
    if (hits > 0) {
      const boostedConfidence = Math.min(0.95, group.confidence + (hits - 1) * 0.03);
      return { intent: group.intent, confidence: boostedConfidence };
    }
  }

  return { intent: "unknown", confidence: 0.35 };
}


function shouldBypassKnowledgeLookup({ intentResult, currentStage }) {
  if (KNOWLEDGE_BYPASS_INTENTS.has(intentResult?.intent)) {
    return true;
  }

  if (KNOWLEDGE_BYPASS_STAGES.has(currentStage)) {
    return true;
  }

  return false;
}

function shouldForceKnowledgeLookup(text = "") {
  const message = normalizeText(text).toLowerCase();

  if (!message) return false;
  if (message.includes("?")) return true;

  return [
    "faq",
    "membership",
    "rate",
    "rates",
    "price",
    "pricing",
    "cost",
    "fee",
    "monthly",
    "package",
    "plan",
    "magkano",
    "presyo",
    "bayad",
    "how much",
    "available",
    "offer",
    "service",
    "product",
    "program",
    "guidance",
  ].some((keyword) => message.includes(keyword));
}

function mergeCustomerFields(base = {}, patch = {}) {
  const merged = { ...(base || {}) };

  CUSTOMER_FIELDS.forEach((field) => {
    const value = normalizeText(patch?.[field]);

    if (value) {
      merged[field] = value;
    }
  });

  return merged;
}

function extractSafeQualificationData(qualification = {}) {
  const extracted =
    qualification.extractedData && typeof qualification.extractedData === "object"
      ? qualification.extractedData
      : {};

  const safe = {};

  CUSTOMER_FIELDS.forEach((field) => {
    const value = normalizeText(extracted[field]);

    if (value) {
      safe[field] = value;
    }
  });

  return safe;
}

function mergeFlowData(currentData = {}, pageIntelligence = {}, qualification = {}) {
  const alreadyConfirmed = currentData.crmConfirmed === true;

  const pendingLeadData = alreadyConfirmed
    ? {}
    : mergeCustomerFields(
        getPendingLeadData(currentData),
        extractSafeQualificationData(qualification)
      );

  return {
    ...(currentData || {}),
    pageType: pageIntelligence?.pageType || currentData.pageType || "",
    offeringType: pageIntelligence?.offeringType || currentData.offeringType || "",
    customerGoal: pageIntelligence?.customerGoal || currentData.customerGoal || "",
    customerIntent:
      pageIntelligence?.customerIntent || currentData.customerIntent || "",
    pendingLeadData,
    confirmedLeadData: getConfirmedLeadData(currentData),
    crmConfirmed: alreadyConfirmed,
    awaitingField: alreadyConfirmed ? "" : currentData.awaitingField || "",
    leadScore:
      qualification?.leadScore !== undefined
        ? qualification.leadScore
        : currentData.leadScore,
    leadPriority: qualification?.leadPriority || currentData.leadPriority || "",
    qualificationSummary:
      qualification?.qualificationSummary ||
      currentData.qualificationSummary ||
      "",
  };
}

function buildDiscoveryReply({
  data,
  intentResult,
  nextField,
  pageConfig,
  pageIntelligence,
  qualification,
  compactFacebookReply,
}) {
  return compactFacebookReply(
    buildAdaptiveSalesReply({
      intentResult,
      data,
      nextField,
      pageConfig,
      pageIntelligence,
      qualification: {
        ...qualification,
        nextBestQuestion: "",
      },
      discoveryOnly: true,
      includeLinks: false,
    })
  );
}

function buildConfirmationMessage(data = {}, compactFacebookReply) {
  const reply = buildLeadConfirmationReply(data);

  return compactFacebookReply(
    reply ||
      "Please confirm if the details are correct by replying YES, or send the corrected details."
  );
}

function buildNextStepAfterDiscovery({
  data,
  intentResult,
  pageConfig,
  pageIntelligence,
  qualification,
  compactFacebookReply,
}) {
  if (data.crmConfirmed === true) {
    return {
      stage: "awaiting_cta_choice",
      data: normalizeConfirmedFlowData(data),
      reply: buildCtaOptionsReply(compactFacebookReply),
    };
  }

  const nextDiscoveryField = getNextDiscoveryField({
    intentResult,
    data,
    pageIntelligence,
    pageConfig,
  });

  if (nextDiscoveryField) {
    const nextData = setAwaitingField(data, nextDiscoveryField);

    return {
      stage:
        nextDiscoveryField === "dailyVolume"
          ? "awaiting_daily_volume"
          : "adaptive_qualification",
      data: nextData,
      reply: buildDiscoveryReply({
        data: nextData,
        intentResult,
        nextField: nextDiscoveryField,
        pageConfig,
        pageIntelligence,
        qualification,
        compactFacebookReply,
      }),
    };
  }

  if (shouldAskContactBeforeAction({ intentResult, data, pageIntelligence, pageConfig })) {
    const nextContactField = getNextContactField({ data });
    const nextData = setAwaitingField(data, nextContactField);

    return {
      stage: "collecting_contact",
      data: nextData,
      reply: buildDiscoveryReply({
        data: nextData,
        intentResult,
        nextField: nextContactField,
        pageConfig,
        pageIntelligence,
        qualification,
        compactFacebookReply,
      }),
    };
  }

  const clearedData = {
    ...data,
    awaitingField: "",
  };

  if (
    shouldConfirmBeforeCta({ intentResult, data: clearedData, pageIntelligence, pageConfig }) ||
    needsLeadConfirmation(clearedData)
  ) {
    return {
      stage: "awaiting_lead_confirmation",
      data: clearedData,
      reply: buildConfirmationMessage(clearedData, compactFacebookReply),
    };
  }

  return {
    stage: "recommendation",
    data: clearedData,
    reply: compactFacebookReply(
      buildRecommendationReply({
        data: clearedData,
        pageConfig,
        pageIntelligence,
      })
    ),
  };
}

function applyExpectedFieldCapture({ data = {}, incomingText = "" }) {
  if (data.crmConfirmed === true) {
    return normalizeConfirmedFlowData(data);
  }

  const result = captureExpectedField({
    data,
    incomingText,
  });

  return result.captured ? result.data : data;
}

function buildStatefulSalesReply({
  incomingText,
  intentResult,
  pageConfig,
  pageId,
  senderId,
  compactFacebookReply,
  pageIntelligence,
  qualification,
  behavioralSignals = [],
  engagementScore = 0,
  behavioralInsights = [],
  nextBestAction = null,
}) {
  const state = flowStateService.getFlowState(pageId, senderId);
  const mergedData = mergeFlowData(state.data || {}, pageIntelligence, qualification);
  const data = applyExpectedFieldCapture({
    data: mergedData,
    incomingText,
  });

  // Objection handling: intercept price/stall/trust/competitor/timing/etc.
  // objections with empathetic, value-framed replies. Skipped during
  // confirmation/correction/scheduling/handoff stages where YES/NO drives flow.
  if (
    !OBJECTION_SKIP_STAGES.has(state.stage) &&
    shouldHandleObjection(intentResult, incomingText, pageConfig)
  ) {
    const objectionType = detectObjectionType(incomingText, pageConfig);
    const objectionReply = buildObjectionResponse({
      objectionType,
      pageConfig,
      pageIntelligence: {
        ...(pageIntelligence || {}),
        rawCustomerMessage: incomingText,
      },
      data,
      compactFacebookReply,
    });

    if (objectionReply) {
      const nextStage =
        state.stage && state.stage !== "new"
          ? state.stage
          : "adaptive_qualification";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: nextStage,
          data: {
            ...data,
            lastObjection: objectionType,
            objectionCount: (Number(data.objectionCount) || 0) + 1,
          },
        }),
        reply: objectionReply,
      };
    }
  }

  // Behavioral triggers: detect engagement signals and adapt response
  if (
    !OBJECTION_SKIP_STAGES.has(state.stage) &&
    intentResult.intent !== "human_request" &&
    intentResult.intent !== "affirmative_response" &&
    intentResult.intent !== "negative_response" &&
    behavioralSignals.length > 0
  ) {
    const behavioralResponse = buildBehavioralResponse({
      signals: behavioralSignals,
      flowData: data,
      pageConfig,
      pageIntelligence,
      compactFacebookReply,
      isFilipino: isFilipinoStyle(incomingText),
    });

    if (behavioralResponse) {
      const nextStage =
        state.stage && state.stage !== "new"
          ? state.stage
          : "adaptive_qualification";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: nextStage,
          data: {
            ...data,
            behavioralSignals: behavioralSignals.map(s => s.type),
            engagementScore,
            behavioralInsights,
            nextBestAction,
          },
        }),
        reply: behavioralResponse,
      };
    }
  }

  if (state.stage === "awaiting_lead_confirmation") {
    if (intentResult.intent === "affirmative_response") {
      const confirmedData = normalizeConfirmedFlowData(
        promotePendingToConfirmed(data)
      );

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "awaiting_cta_choice",
          data: confirmedData,
        }),
        reply: buildCtaOptionsReply(compactFacebookReply),
      };
    }

    if (intentResult.intent === "negative_response") {
      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "awaiting_lead_correction",
          data: resetLeadConfirmation(data),
        }),
        reply: compactFacebookReply(
          "No problem po. Please send the corrected details, and I’ll confirm them again before saving."
        ),
      };
    }

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "awaiting_lead_confirmation",
        data,
      }),
      reply: buildConfirmationMessage(data, compactFacebookReply),
    };
  }

  if (state.stage === "awaiting_lead_correction") {
    const nextData = resetLeadConfirmation(data);

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "awaiting_lead_confirmation",
        data: nextData,
      }),
      reply: buildConfirmationMessage(nextData, compactFacebookReply),
    };
  }

  if (state.stage === "awaiting_daily_volume") {
    const extractedVolume = extractDailyVolume(incomingText);
    const nextData = {
      ...data,
      awaitingField: "",
      pendingLeadData: mergeCustomerFields(getPendingLeadData(data), {
        ...(extractedVolume ? { dailyVolume: extractedVolume } : {}),
      }),
    };

    const nextStep = buildNextStepAfterDiscovery({
      data: nextData,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (state.stage === "collecting_contact") {
    const nextStep = buildNextStepAfterDiscovery({
      data,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (
    state.stage === "adaptive_qualification" ||
    state.stage === "understanding_inquiry"
  ) {
    const nextStep = buildNextStepAfterDiscovery({
      data,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (
    data.crmConfirmed === true ||
    state.stage === "recommendation" ||
    state.stage === "awaiting_cta_choice" ||
    state.stage === "pricing_overview" ||
    state.stage === "awaiting_demo_schedule" ||
    state.stage === "demo_schedule_received" ||
    state.stage === "human_handoff"
  ) {
    if (intentResult.intent === "greeting") {
      const pageName = normalizeText(pageConfig?.pageName) || "this page";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "understanding_inquiry",
          data: {
            ...data,
            requestedHuman: false,
            ctaChoice: "",
          },
        }),
        reply: compactFacebookReply(
          `Hello po! This is ${pageName}. How can we help you today?`
        ),
      };
    }

    if (shouldForceKnowledgeLookup(incomingText)) {
      const priceInfo = normalizeText(pageConfig?.productServicePriceRanges);
      const servicesInfo = normalizeText(pageConfig?.productServices);

      const reply = priceInfo
        ? ["Here is the available pricing information:", "", priceInfo].join("\n")
        : servicesInfo
          ? ["Here are the products/services we offer:", "", servicesInfo].join("\n")
          : "I don't have an approved answer for that yet. Please wait for the page owner to review your question.";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "understanding_inquiry",
          data: {
            ...data,
            requestedHuman: false,
            ctaChoice: "",
          },
        }),
        reply: compactFacebookReply(reply),
      };
    }

    return handlePostConfirmationFlow({
      incomingText,
      data,
      stateStage: state.stage,
      pageConfig,
      flowStateService,
      pageId,
      senderId,
      compactFacebookReply,
    });
  }

  if (intentResult.intent === "greeting") {
    const pageName = normalizeText(pageConfig?.pageName) || "this page";

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "understanding_inquiry",
        data,
      }),
      reply: compactFacebookReply(
        `Hello po! This is ${pageName}. How can we help you today?`
      ),
    };
  }

  if (intentResult.intent === "unknown") {
    const isFilipino = isFilipinoStyle(incomingText);
    const pageName = normalizeText(pageConfig?.pageName) || "this page";
    const softOpener = isFilipino
      ? `Pasensya po, hindi ko masyado naintindihan ang mensahe niyo. Para mas matulungan ko po kayo, pwede ba ninyong i-clarify kung ano ang kailangan niyo? 😊`
      : `I'm not quite sure I caught that. Could you share a bit more about what you're looking for? I'd love to help! 😊`;

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "understanding_inquiry",
        data: { ...data, interest: "unknown" },
      }),
      reply: compactFacebookReply(softOpener),
    };
  }

  if (
    intentResult.intent === "human_request" ||
    intentResult.intent === "demo_request" ||
    intentResult.intent === "pricing_inquiry" ||
    intentResult.intent === "product_inquiry"
  ) {
    const nextStep = buildNextStepAfterDiscovery({
      data: {
        ...data,
        interest: intentResult.intent,
      },
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  const nextStep = buildNextStepAfterDiscovery({
    data,
    intentResult,
    pageConfig,
    pageIntelligence,
    qualification,
    compactFacebookReply,
  });

  return {
    handled: true,
    flowState: flowStateService.setFlowState(pageId, senderId, {
      stage: nextStep.stage,
      data: nextStep.data,
    }),
    reply: nextStep.reply,
  };
}

function getConversationPatchFromFlow({
  statefulResult,
  intentResult,
  replyText,
  pageIntelligence,
  qualification,
  knowledgeResult,
}) {
  const flowState = statefulResult?.flowState || { stage: "new", data: {} };
  const data = flowState.data || {};
  const confirmedLeadData = getConfirmedLeadData(data);

  const knowledgePatch =
    knowledgeResult && typeof knowledgeResult === "object"
      ? {
          knowledge: {
            handled: Boolean(knowledgeResult.handled),
            source: knowledgeResult.source || "",
            confidence: knowledgeResult.confidence || 0,
            shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
            bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
            faqId: knowledgeResult.faq?.id || null,
          },
        }
      : {};

  return {
    currentState: flowState.stage || "new",
    leadStage: inferLeadStageFromIntent(intentResult.intent),
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    businessType: confirmedLeadData.businessType || undefined,
    dailyInquiries: confirmedLeadData.dailyVolume || undefined,
    interestedFeatures: [
      confirmedLeadData.productOrServiceWanted,
      confirmedLeadData.desiredSolution,
      data.customerGoal,
    ].filter(Boolean),
    conversationSummary:
      qualification?.qualificationSummary || data.qualificationSummary || undefined,
    lastAiResponse: replyText || undefined,
    metadata: {
      flowData: data,
      pendingLeadData: getPendingLeadData(data),
      confirmedLeadData,
      pageIntelligence: pageIntelligence || null,
      qualification: qualification || null,
      ...knowledgePatch,
    },
  };
}

function buildCrmFlowState(flowStateForCrm = {}) {
  const data = flowStateForCrm.data || {};
  const confirmedLeadData = getConfirmedLeadData(data);

  return {
    ...flowStateForCrm,
    data: {
      ...data,
      crmConfirmed: true,
      confirmedLeadData,
      pendingLeadData: {},
      awaitingField: "",
    },
  };
}

async function appendAiConversationMessage({
  conversationStateService,
  conversation,
  workspaceId,
  pageId,
  senderId,
  replyText,
  intentResult,
  metadata = {},
}) {
  if (!conversationStateService || !conversation?.id || !workspaceId) {
    return null;
  }

  return conversationStateService.appendConversationMessage({
    conversationId: conversation.id,
    workspaceId,
    pageId,
    customerPsid: senderId,
    senderType: "ai",
    messageText: replyText,
    messageType: "text",
    aiGenerated: true,
    intent: intentResult.intent,
    metadata,
  });
}

// Maps a flow stage to Messenger quick replies. Payloads use the exact tokens
// that facebookCtaResolver (resolveCtaChoice / isAffirmativeReply / isNegativeReply)
// already parses, so a tapped quick reply routes through the flow with no new mapping.
const UNKNOWN_INTENT_QUICK_REPLIES = [
  { title: "See pricing", payload: "pricing" },
  { title: "Book a demo", payload: "demo" },
  { title: "Talk to a human", payload: "human" },
];

function deriveQuickReplies(stage = "", intentResult = {}) {
  switch (stage) {
    case "awaiting_cta_choice":
      return [
        { title: "Book a demo", payload: "demo" },
        { title: "See pricing", payload: "pricing" },
        { title: "Talk to a human", payload: "human" },
      ];
    case "pricing_overview":
      return [
        { title: "Book a demo", payload: "demo" },
        { title: "Talk to a human", payload: "human" },
      ];
    case "awaiting_lead_confirmation":
      return [
        { title: "Yes, that's correct", payload: "yes" },
        { title: "Edit details", payload: "no" },
      ];
    case "understanding_inquiry":
      // Provide navigation shortcuts on first contact
      if (intentResult?.intent === "unknown" || intentResult?.intent === "greeting") {
        return UNKNOWN_INTENT_QUICK_REPLIES;
      }
      return [];
    case "human_handoff":
      return [];
    default:
      return [];
  }
}

async function handleFacebookSalesConversation({
  supabaseClient,
  normalizeText: externalNormalizeText,
  compactFacebookReply,
  generateChatbotReply,
  conversationStateService,
  senderId,
  incomingText,
  requestMessages,
  pageConfig,
  referral = null,
}) {
  const cleanText =
    typeof externalNormalizeText === "function"
      ? externalNormalizeText(incomingText)
      : normalizeText(incomingText);

  const pageId = pageConfig.pageId || "default";
  const workspaceId =
    typeof externalNormalizeText === "function"
      ? externalNormalizeText(pageConfig?.connectedWorkspaceId)
      : normalizeText(pageConfig?.connectedWorkspaceId);

  // Failsafe: Check if conversation is in human handoff/paused state
  if (supabaseClient && workspaceId) {
    const { data: clientConv } = await supabaseClient
      .from("client_facebook_conversations")
      .select("bot_paused, status")
      .eq("workspace_id", workspaceId)
      .eq("page_id", pageId)
      .eq("customer_psid", senderId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    logger.info("[Sales Flow Failsafe Debug] Query params:", { workspaceId, pageId, senderId });
    logger.info("[Sales Flow Failsafe Debug] clientConv fetched:", clientConv);

    if (clientConv && (clientConv.bot_paused || clientConv.status === "human_handoff")) {
      logger.info(`[Sales Flow Failsafe] Chatbot is paused for customer ${senderId}. Aborting AI response.`);
      return { text: "Please wait for the agent reply.", quickReplies: [] };
    }
  }

  // ── Layer 0: Auto-reply keyword rules (Manychat-style) ──
  // Check BEFORE intent detection and AI — instant canned response
  if (supabaseClient && workspaceId) {
    try {
      const autoReply = await matchAutoReplyRule({
        text: cleanText,
        supabaseClient,
        workspaceId,
        pageId,
      });

      if (autoReply?.handled && autoReply.reply) {
        logger.info({ pageId, senderId, ruleId: autoReply.ruleId }, "Auto-reply rule matched");

        if (conversationStateService && workspaceId) {
          const arConv = await conversationStateService.getOrCreateConversation({
            workspaceId,
            pageId,
            customerPsid: senderId,
            currentState: "auto_replied",
            metadata: { source: "facebook", pageName: pageConfig.pageName || "" },
          });

          if (arConv?.id) {
            await conversationStateService.appendConversationMessage({
              conversationId: arConv.id,
              workspaceId,
              pageId,
              customerPsid: senderId,
              senderType: "customer",
              messageText: cleanText,
              messageType: "text",
              aiGenerated: false,
            });
            await conversationStateService.appendConversationMessage({
              conversationId: arConv.id,
              workspaceId,
              pageId,
              customerPsid: senderId,
              senderType: "ai",
              messageText: autoReply.reply,
              messageType: "text",
              aiGenerated: true,
              metadata: { source: "auto_reply_rule", ruleId: autoReply.ruleId },
            });
            await conversationStateService.updateConversation(arConv.id, {
              lastCustomerMessage: cleanText,
              lastAiResponse: autoReply.reply,
              lastMessageAt: new Date().toISOString(),
            });
          }
        }

        return {
          text: compactFacebookReply(autoReply.reply),
          quickReplies: autoReply.quickReplies || [],
        };
      }
    } catch (arErr) {
      logger.warn({ err: arErr.message }, "Auto-reply rule check failed — continuing to AI");
    }
  }

  const intentResult = detectFacebookIntent(cleanText, pageConfig);

  let conversation = null;
  let dbRequestMessages = [];
  let currentFlowState = flowStateService.getFlowState(pageId, senderId);

  if (conversationStateService && workspaceId) {
    conversation = await conversationStateService.getOrCreateConversation({
      workspaceId,
      pageId,
      customerPsid: senderId,
      currentState: "new",
      leadStage: inferLeadStageFromIntent(intentResult.intent),
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      metadata: {
        source: "facebook",
        pageName: pageConfig.pageName || "",
      },
    });

    if (conversation?.id) {
      currentFlowState = flowStateService.hydrateFlowStateFromConversation(
        pageId,
        senderId,
        conversation
      );

      // ── Welcome message (Manychat-style) ──
      // If welcome is enabled and this is a brand-new conversation (no prior messages),
      // send the configured welcome message instead of processing through AI.
      const welcomeMessage = pageConfig.welcomeMessage || pageConfig.welcome_message || "";
      const welcomeEnabled = pageConfig.welcomeEnabled ?? pageConfig.welcome_enabled ?? false;

      if (welcomeEnabled && welcomeMessage && (!currentFlowState.stage || currentFlowState.stage === "new")) {
        const priorMessages = await conversationStateService.getRecentConversationMessages(
          conversation.id, 2
        );

        if (priorMessages.length <= 1) {
          const welcomeReply = compactFacebookReply(welcomeMessage);
          const configuredStarters = Array.isArray(pageConfig.conversationStarters)
            ? pageConfig.conversationStarters
            : [];
          const welcomeQuickReplies = configuredStarters.length > 0
            ? configuredStarters.map((label) => ({
                title: label,
                payload: label.toLowerCase().replace(/\s+/g, "_"),
              }))
            : [
                { title: "View Products", payload: "products" },
                { title: "Pricing", payload: "pricing" },
                { title: "Talk to Agent", payload: "human" },
              ];

          await conversationStateService.appendConversationMessage({
            conversationId: conversation.id,
            workspaceId, pageId, customerPsid: senderId,
            senderType: "customer", messageText: cleanText,
            messageType: "text", aiGenerated: false,
          });
          await conversationStateService.appendConversationMessage({
            conversationId: conversation.id,
            workspaceId, pageId, customerPsid: senderId,
            senderType: "ai", messageText: welcomeReply,
            messageType: "text", aiGenerated: true,
            metadata: { source: "welcome_message" },
          });
          await conversationStateService.updateConversation(conversation.id, {
            currentState: "understanding_inquiry",
            lastCustomerMessage: cleanText,
            lastAiResponse: welcomeReply,
            lastMessageAt: new Date().toISOString(),
          });

          flowStateService.setFlowState(pageId, senderId, {
            stage: "understanding_inquiry",
            data: { welcomeSent: true },
          });

          return { text: welcomeReply, quickReplies: welcomeQuickReplies };
        }
      }

      await conversationStateService.appendConversationMessage({
        conversationId: conversation.id,
        workspaceId,
        pageId,
        customerPsid: senderId,
        senderType: "customer",
        messageText: cleanText,
        messageType: "text",
        aiGenerated: false,
        intent: intentResult.intent,
        metadata: {
          intentConfidence: intentResult.confidence,
        },
      });

      const recentMessages =
        await conversationStateService.getRecentConversationMessages(
          conversation.id,
          12
        );

      dbRequestMessages =
        conversationStateService.toChatMessages(recentMessages);
    }
  }

  // First-contact ad/link opener: when a prospect arrives from a Click-to-Messenger
  // ad or m.me ref link, greet with context (what they came for) instead of a cold
  // qualification question. Also stamps the lead source for CRM attribution.
  if (referral && (!currentFlowState.stage || currentFlowState.stage === "new")) {
    const opener = buildAdContextGreeting({
      referral,
      pageConfig,
      incomingText: cleanText,
    });

    if (opener) {
      const inquirySource = deriveInquirySource(referral);
      const openerReply = compactFacebookReply(opener);

      const nextData = {
        ...(currentFlowState.data || {}),
        inquirySource,
        referral: {
          ref: referral.ref,
          adId: referral.adId,
          source: referral.source,
        },
        pendingLeadData: mergeCustomerFields(
          getPendingLeadData(currentFlowState.data || {}),
          { inquirySource }
        ),
      };

      const openerFlowState = flowStateService.setFlowState(pageId, senderId, {
        stage: "understanding_inquiry",
        data: nextData,
      });

      if (conversationStateService && conversation?.id && workspaceId) {
        await appendAiConversationMessage({
          conversationStateService,
          conversation,
          workspaceId,
          pageId,
          senderId,
          replyText: openerReply,
          intentResult,
          metadata: { state: "understanding_inquiry", inquirySource },
        });

        await conversationStateService.updateConversation(conversation.id, {
          currentState: "understanding_inquiry",
          leadStage: inferLeadStageFromIntent(intentResult.intent),
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          lastCustomerMessage: cleanText,
          lastAiResponse: openerReply,
          lastMessageAt: new Date().toISOString(),
          metadata: {
            ...(conversation.metadata || {}),
            flowData: openerFlowState.data,
            inquirySource,
            referral: nextData.referral,
          },
        });
      }

      return {
        text: openerReply,
        quickReplies: buildReferralQuickReplies(referral),
      };
    }
  }

  if (
    supabaseClient &&
    workspaceId &&
    (!shouldBypassKnowledgeLookup({
      intentResult,
      currentStage: currentFlowState.stage,
    }) ||
      shouldForceKnowledgeLookup(cleanText))
  ) {
    const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });

    const knowledgeResult = await knowledgeManager.resolveKnowledgeReply({
      workspaceId,
      pageId,
      incomingText: cleanText,
      pageConfig,
      conversationId: conversation?.id || "",
      compactFacebookReply,
      generateChatbotReply,
      conversationMessages: dbRequestMessages,
    });

    if (knowledgeResult?.handled && knowledgeResult.reply) {
      const nextStage = knowledgeResult.shouldHandoff
        ? "human_handoff"
        : currentFlowState.stage || "understanding_inquiry";

      const nextFlowState = flowStateService.setFlowState(pageId, senderId, {
        stage: nextStage,
        data: {
          ...(currentFlowState.data || {}),
          knowledgeHandled: true,
          knowledgeSource: knowledgeResult.source || "",
          requestedAction: knowledgeResult.shouldHandoff
            ? "human"
            : currentFlowState.data?.requestedAction || "",
        },
      });

      await appendAiConversationMessage({
        conversationStateService,
        conversation,
        workspaceId,
        pageId,
        senderId,
        replyText: knowledgeResult.reply,
        intentResult,
        metadata: {
          state: nextFlowState.stage,
          knowledge: {
            handled: true,
            source: knowledgeResult.source || "",
            confidence: knowledgeResult.confidence || 0,
            shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
            bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
            faqId: knowledgeResult.faq?.id || null,
          },
        },
      });

      if (conversationStateService && conversation?.id && workspaceId) {
        await conversationStateService.updateConversation(conversation.id, {
          currentState: nextFlowState.stage,
          leadStage: inferLeadStageFromIntent(intentResult.intent),
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          lastCustomerMessage: cleanText,
          lastAiResponse: knowledgeResult.reply,
          lastMessageAt: new Date().toISOString(),
          humanTakeover: Boolean(knowledgeResult.shouldHandoff),
          metadata: {
            ...(conversation.metadata || {}),
            flowData: nextFlowState.data,
            knowledge: {
              handled: true,
              source: knowledgeResult.source || "",
              confidence: knowledgeResult.confidence || 0,
              shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
              bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
              faqId: knowledgeResult.faq?.id || null,
            },
          },
        });
      }

      return {
        text: knowledgeResult.reply,
        quickReplies: deriveQuickReplies(nextFlowState.stage, intentResult),
      };
    }
  }

  const recentMessagesForIntelligence = (
    dbRequestMessages.length ? dbRequestMessages : requestMessages
  ).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const pageIntelligence = await analyzeFacebookPageIntelligence({
    incomingText: cleanText,
    pageConfig,
    flowData: currentFlowState.data || {},
    recentMessages: recentMessagesForIntelligence,
  });

  const qualification = await qualifyFacebookLead({
    incomingText: cleanText,
    pageConfig,
    pageIntelligence,
    flowData: {
      ...(currentFlowState.data || {}),
      pendingLeadData: getPendingLeadData(currentFlowState.data || {}),
      confirmedLeadData: getConfirmedLeadData(currentFlowState.data || {}),
    },
    recentMessages: recentMessagesForIntelligence,
  });

  const behavioralSignals = detectBehavioralSignals(
    cleanText,
    recentMessagesForIntelligence.slice(-6)
  );

  const engagementScore = calculateEngagementScore(
    behavioralSignals,
    recentMessagesForIntelligence.length,
    0
  );

  const behavioralInsights = generateBehavioralInsights(behavioralSignals, currentFlowState.data || {}, recentMessagesForIntelligence);
  const nextBestAction = predictNextBestAction({
    signals: behavioralSignals,
    flowData: currentFlowState.data || {},
    conversationPattern: { messageCount: recentMessagesForIntelligence.length },
    pageConfig,
  });

  const hydratedFlowState = flowStateService.setFlowState(pageId, senderId, {
    stage: currentFlowState.stage || "new",
    data: mergeFlowData(
      currentFlowState.data || {},
      pageIntelligence,
      qualification
    ),
  });

  const statefulResult = buildStatefulSalesReply({
    incomingText: cleanText,
    intentResult,
    pageConfig,
    pageId,
    senderId,
    compactFacebookReply,
    pageIntelligence,
    qualification,
    behavioralSignals,
    engagementScore,
    behavioralInsights,
    nextBestAction,
  });

  const flowStateForCrm = statefulResult.flowState || hydratedFlowState;
  const shouldSyncCrm = canSaveConfirmedLeadToCrm(flowStateForCrm.data || {});
  const crmFlowState = shouldSyncCrm ? buildCrmFlowState(flowStateForCrm) : null;

  const lead = crmFlowState
    ? await syncFacebookLead({
        supabaseClient,
        pageConfig,
        senderId,
        incomingText: cleanText,
        intentResult,
        flowState: crmFlowState,
        pageIntelligence,
      })
    : null;

  let replyText =
    statefulResult.handled && statefulResult.reply
      ? compactFacebookReply(
          await naturalizeReply({
            draft: statefulResult.reply,
            stage: statefulResult.flowState?.stage,
            pageConfig,
            conversationMessages: dbRequestMessages.length
              ? dbRequestMessages
              : requestMessages,
            generateChatbotReply,
            env: process.env,
          })
        )
      : await generateChatbotReply(
          dbRequestMessages.length ? dbRequestMessages : requestMessages,
          {
            businessType: pageConfig.businessType || "",
            pageName: pageConfig.pageName || "",
            productServices: pageConfig.productServices || "",
            productServicePriceRanges:
              pageConfig.productServicePriceRanges || "",
            websiteLink: pageConfig.websiteLink || "",
            shoppeLink: pageConfig.shoppeLink || "",
            lazadaLink: pageConfig.lazadaLink || "",
            knowledge: pageConfig.knowledge || "",
            businessDescription: pageConfig.knowledge || "",
            defaultReply: pageConfig.defaultReply || pageConfig.default_reply || "",
            pageIntelligence,
            qualification,
          }
        );

  if (conversationStateService && conversation?.id && workspaceId) {
    await conversationStateService.appendConversationMessage({
      conversationId: conversation.id,
      workspaceId,
      pageId,
      customerPsid: senderId,
      senderType: "ai",
      messageText: replyText,
      messageType: "text",
      aiGenerated: true,
      intent: intentResult.intent,
      metadata: {
        state: statefulResult.flowState?.stage || "new",
        pageIntelligence,
        qualification,
        crmSyncAttempted: Boolean(crmFlowState),
        crmSyncCreated: Boolean(lead),
      },
    });

    await conversationStateService.updateConversation(conversation.id, {
      ...getConversationPatchFromFlow({
        statefulResult,
        intentResult,
        replyText,
        pageIntelligence,
        qualification,
      }),
      clientLeadId: lead?.id || undefined,
      clientContactId: lead?.contact_id || undefined,
      lastCustomerMessage: cleanText,
      lastMessageAt: new Date().toISOString(),
    });
  }

  // ── Default reply fallback (Manychat-style) ──
  // If AI returned an empty or generic fallback, use the configured default reply
  const defaultReply = pageConfig.defaultReply || pageConfig.default_reply || "";
  if (defaultReply && (!replyText || replyText === GENERIC_FALLBACK_REPLY)) {
    replyText = compactFacebookReply(defaultReply);
  }

  return {
    text: replyText,
    quickReplies: deriveQuickReplies(statefulResult.flowState?.stage, intentResult),
  };
}

module.exports = {
  handleFacebookSalesConversation,
  deriveQuickReplies,
};
