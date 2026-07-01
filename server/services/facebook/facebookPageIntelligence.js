const logger = require('../../config/logger');
const DEFAULT_MODEL =
  process.env.FB_PAGE_INTELLIGENCE_MODEL ||
  process.env.GROQ_MODEL ||
  "llama-3.1-8b-instant";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildPageContext(pageConfig = {}) {
  return {
    pageName: normalizeText(pageConfig.pageName),
    pageBusinessType: normalizeText(pageConfig.businessType),
    productServices: normalizeText(pageConfig.productServices),
    productServicePriceRanges: normalizeText(
      pageConfig.productServicePriceRanges
    ),
    websiteLink: normalizeText(pageConfig.websiteLink),
    shoppeLink: normalizeText(pageConfig.shoppeLink),
    lazadaLink: normalizeText(pageConfig.lazadaLink),
    knowledge: normalizeText(pageConfig.knowledge),
  };
}

function buildFallbackIntelligence({ incomingText = "", pageConfig = {} }) {
  const text = normalizeText(incomingText);
  const pageContext = buildPageContext(pageConfig);

  return {
    pageType: "unknown",
    offeringType: "unknown",
    businessSummary:
      pageContext.pageBusinessType ||
      pageContext.productServices ||
      pageContext.knowledge ||
      "Business details are not fully configured yet.",
    customerGoal: "unknown",
    customerIntent: "unknown",
    missingFields: [],
    nextBestQuestion: "",
    responseGuidance:
      "Answer based on the configured Facebook page context and ask one useful follow-up question.",
    crmSignals: {
      leadType: "facebook_inquiry",
      priority: "normal",
      productInterest: "",
      serviceInterest: "",
      problem: "",
      suggestedAction: "",
    },
    confidence: 0.35,
    rawCustomerMessage: text,
  };
}

function getMissingUniversalFields(flowData = {}) {
  const missing = [];

  if (!normalizeText(flowData.businessType)) {
    missing.push("businessType");
  }

  if (!normalizeText(flowData.productOrServiceWanted)) {
    missing.push("productOrServiceWanted");
  }

  if (!normalizeText(flowData.problemEncountered)) {
    missing.push("problemEncountered");
  }

  if (!normalizeText(flowData.desiredSolution)) {
    missing.push("desiredSolution");
  }

  if (!normalizeText(flowData.dailyVolume)) {
    missing.push("dailyVolume");
  }

  if (!normalizeText(flowData.customerName)) {
    missing.push("customerName");
  }

  if (!normalizeText(flowData.phone)) {
    missing.push("phone");
  }

  return missing;
}

function buildDeterministicNextQuestion({
  missingFields = [],
  pageContext = {},
  intelligence = {},
}) {
  const pageName = pageContext.pageName || "this page";
  const offering = intelligence.offeringType || "offer";
  const field = missingFields[0];

  if (field === "businessType") {
    return "May I know what type of business or need you have?";
  }

  if (field === "productOrServiceWanted") {
    if (offering === "product") {
      return `What product from ${pageName} are you interested in?`;
    }

    if (offering === "service") {
      return `What service from ${pageName} are you interested in?`;
    }

    return "What product or service are you interested in?";
  }

  if (field === "problemEncountered") {
    return "What problem or challenge are you trying to solve right now?";
  }

  if (field === "desiredSolution") {
    return "What kind of solution or result would you like to achieve?";
  }

  if (field === "dailyVolume") {
    return "Around how many inquiries, orders, bookings, or customer messages do you usually receive per day?";
  }

  if (field === "customerName") {
    return "May I get your name so the team can assist you properly?";
  }

  if (field === "phone") {
    return "What contact number can our team use for follow-up?";
  }

  return "";
}

function buildIntelligencePrompt({
  incomingText,
  pageConfig,
  flowData,
  recentMessages = [],
}) {
  const pageContext = buildPageContext(pageConfig);

  return [
    {
      role: "system",
      content:
        "You are a Facebook page intelligence engine for a multi-tenant CRM SaaS. " +
        "Return JSON only. Your job is to understand the PAGE and the CUSTOMER INTENT. " +
        "CRITICAL: Do not extract customer lead fields here. " +
        "Never output customer business type, customer inquiry volume, customer name, phone, email, budget, location, or schedule. " +
        "Those are handled by a separate lead qualification engine. " +
        "Page context describes the Facebook page/business, not the customer. " +
        "Do not copy page business type into customer fields. " +
        "Only classify the page, offering type, customer intent, and response guidance.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Analyze this Facebook conversation turn for page-aware response guidance only.",
          pageContext,
          existingFlowData: flowData || {},
          recentMessages: recentMessages.slice(-8),
          incomingMessage: incomingText,
          requiredJsonShape: {
            pageType:
              "one of: product_business, service_business, booking_business, consultation_business, ecommerce_business, b2b_saas, mixed_business, unknown",
            offeringType:
              "one of: product, service, booking, consultation, software, mixed, unknown",
            businessSummary:
              "short summary of what the Facebook page/business appears to offer",
            customerGoal:
              "one of: buy_product, ask_price, ask_availability, book_schedule, request_consultation, request_support, ask_question, compare_options, human_request, unknown",
            customerIntent: "short machine-readable intent key",
            missingFields:
              "array of useful lead fields still worth asking, but do not fill their values",
            nextBestQuestion:
              "one short customer-facing question, ask only one thing",
            responseGuidance:
              "brief instruction for the response layer on how to answer next",
            crmSignals: {
              leadType: "",
              priority: "low, normal, high, urgent",
              productInterest: "",
              serviceInterest: "",
              problem: "",
              suggestedAction: "",
            },
            confidence: 0.0,
          },
        },
        null,
        2
      ),
    },
  ];
}

async function callGroqJson({ messages, model = DEFAULT_MODEL }) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      max_tokens: 700,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Page intelligence LLM error (${response.status}): ${details}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return safeJsonParse(content);
}

function normalizeIntelligence(raw, fallback) {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    pageType: normalizeText(source.pageType) || fallback.pageType,
    offeringType: normalizeText(source.offeringType) || fallback.offeringType,
    businessSummary:
      normalizeText(source.businessSummary) || fallback.businessSummary,
    customerGoal: normalizeText(source.customerGoal) || fallback.customerGoal,
    customerIntent:
      normalizeText(source.customerIntent) || fallback.customerIntent,
    missingFields: Array.isArray(source.missingFields)
      ? source.missingFields.map(normalizeText).filter(Boolean)
      : fallback.missingFields,
    nextBestQuestion:
      normalizeText(source.nextBestQuestion) || fallback.nextBestQuestion,
    responseGuidance:
      normalizeText(source.responseGuidance) || fallback.responseGuidance,
    crmSignals:
      source.crmSignals && typeof source.crmSignals === "object"
        ? {
            leadType: normalizeText(source.crmSignals.leadType),
            priority: normalizeText(source.crmSignals.priority) || "normal",
            productInterest: normalizeText(source.crmSignals.productInterest),
            serviceInterest: normalizeText(source.crmSignals.serviceInterest),
            problem: normalizeText(source.crmSignals.problem),
            suggestedAction: normalizeText(source.crmSignals.suggestedAction),
          }
        : fallback.crmSignals,
    confidence: Number.isFinite(Number(source.confidence))
      ? Math.max(0, Math.min(1, Number(source.confidence)))
      : fallback.confidence,
    rawCustomerMessage: fallback.rawCustomerMessage,
  };
}

async function analyzeFacebookPageIntelligence({
  incomingText,
  pageConfig = {},
  flowData = {},
  recentMessages = [],
}) {
  const fallback = buildFallbackIntelligence({
    incomingText,
    pageConfig,
  });

  let raw = null;

  try {
    raw = await callGroqJson({
      messages: buildIntelligencePrompt({
        incomingText,
        pageConfig,
        flowData,
        recentMessages,
      }),
    });
  } catch (error) {
    logger.error({
      message: error.message,
    }, "Facebook page intelligence fallback used");
  }

  const intelligence = normalizeIntelligence(raw, fallback);
  const missingFields =
    intelligence.missingFields.length > 0
      ? intelligence.missingFields
      : getMissingUniversalFields(flowData);

  const pageContext = buildPageContext(pageConfig);
  const nextBestQuestion =
    intelligence.nextBestQuestion ||
    buildDeterministicNextQuestion({
      missingFields,
      pageContext,
      intelligence,
    });

  return {
    ...intelligence,
    extractedData: {},
    mergedFlowData: {},
    missingFields,
    nextBestQuestion,
    pageContext,
  };
}

module.exports = {
  analyzeFacebookPageIntelligence,
  buildPageContext,
  buildDeterministicNextQuestion,
  getMissingUniversalFields,
};
