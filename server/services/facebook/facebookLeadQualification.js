const logger = require('../../config/logger');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.FB_LEAD_QUALIFICATION_MODEL ||
  process.env.GROQ_MODEL ||
  "llama-3.1-8b-instant";

const QUALIFICATION_FIELDS = [
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

function normalizeForEvidence(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+@.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasEvidence(text = "", value = "") {
  const source = normalizeForEvidence(text);
  const target = normalizeForEvidence(value);

  if (!source || !target) return false;
  if (source.includes(target)) return true;

  const tokens = target
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  if (tokens.length === 0) return false;

  return tokens.every((token) => source.includes(token));
}

function buildEvidenceText({ incomingText = "", recentMessages = [] }) {
  const recentCustomerText = Array.isArray(recentMessages)
    ? recentMessages
        .filter((message) => message?.role === "user")
        .map((message) => normalizeText(message.content))
        .filter(Boolean)
        .join("\n")
    : "";

  return [recentCustomerText, incomingText].filter(Boolean).join("\n");
}

function normalizeEmail(value) {
  const text = normalizeText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : "";
}

function normalizePhone(value) {
  const text = normalizeText(value);
  const digits = text.replace(/[^\d+]/g, "");
  return digits.length >= 7 ? text : "";
}

function extractEmail(text = "") {
  const match = String(text || "").match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? normalizeEmail(match[0]) : "";
}

function extractPhone(text = "") {
  const match = String(text || "").match(
    /(?:\+?63|0)?\s?9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\+?\d[\d\s().-]{7,}\d/
  );

  return match ? normalizePhone(match[0]) : "";
}

function extractDailyVolume(text = "") {
  const message = normalizeText(text);
  const rangeMatch = message.match(/\b(\d+)\s*[-–to]+\s*(\d+)\b/i);
  if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]} per day`;

  const plusMatch = message.match(/\b(\d+)\s*\+/);
  if (
    plusMatch &&
    /(inquir|order|message|lead|customer|booking|daily|day|per day|araw|kada)/i.test(
      message
    )
  ) {
    return `${plusMatch[1]}+ per day`;
  }

  const numberMatch = message.match(/\b(\d+)\b/);
  if (
    numberMatch &&
    /(inquir|order|message|lead|customer|booking|daily|day|per day|araw|kada)/i.test(
      message
    )
  ) {
    return `${numberMatch[1]} per day`;
  }

  if (/(few|konti|kaunti)/i.test(message)) return "low volume";
  if (/(many|madami|marami|high)/i.test(message)) return "high volume";

  return "";
}

function buildFallbackQualification({
  incomingText = "",
  flowData = {},
  pageIntelligence = {},
  recentMessages = [],
}) {
  const evidenceText = buildEvidenceText({ incomingText, recentMessages });
  const email = extractEmail(evidenceText);
  const phone = extractPhone(evidenceText);
  const dailyVolume = extractDailyVolume(evidenceText);

  const mergedData = {
    ...(flowData || {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(dailyVolume ? { dailyVolume } : {}),
  };

  return {
    extractedData: {
      customerName: "",
      phone,
      email,
      location: "",
      businessType: "",
      businessModel: "",
      productOrServiceWanted: "",
      problemEncountered: "",
      desiredSolution: "",
      inquirySource: "",
      dailyVolume,
      budgetOrQuantity: "",
      preferredSchedule: "",
      urgency: "",
    },
    mergedData,
    qualificationSummary: "",
    leadScore: calculateLeadScore(mergedData),
    leadPriority: getLeadPriority(calculateLeadScore(mergedData)),
    missingFields: getMissingQualificationFields(mergedData),
    nextBestField: getNextBestField(mergedData),
    nextBestQuestion:
      buildNextBestQuestion({
        field: getNextBestField(mergedData),
        pageIntelligence,
      }) || pageIntelligence?.nextBestQuestion || "",
    confidence: 0.35,
  };
}

function sanitizeExtractedData({
  extractedData = {},
  fallback = {},
  evidenceText = "",
}) {
  const clean = {};

  QUALIFICATION_FIELDS.forEach((field) => {
    clean[field] = normalizeText(extractedData[field]);
  });

  clean.email = extractEmail(evidenceText) || "";
  clean.phone = extractPhone(evidenceText) || "";
  clean.dailyVolume = extractDailyVolume(evidenceText) || "";

  const evidenceRequiredFields = [
    "customerName",
    "location",
    "businessType",
    "businessModel",
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
    "inquirySource",
    "budgetOrQuantity",
    "preferredSchedule",
    "urgency",
  ];

  evidenceRequiredFields.forEach((field) => {
    if (clean[field] && !hasEvidence(evidenceText, clean[field])) {
      clean[field] = "";
    }
  });

  if (!clean.email) clean.email = fallback.extractedData?.email || "";
  if (!clean.phone) clean.phone = fallback.extractedData?.phone || "";
  if (!clean.dailyVolume) {
    clean.dailyVolume = fallback.extractedData?.dailyVolume || "";
  }

  return clean;
}

function mergeQualificationData(existing = {}, extracted = {}) {
  const merged = { ...(existing || {}) };

  QUALIFICATION_FIELDS.forEach((field) => {
    const value = normalizeText(extracted?.[field]);

    if (value) {
      merged[field] = value;
    }
  });

  return merged;
}

function getMissingQualificationFields(data = {}) {
  const missing = [];

  if (!normalizeText(data.businessType)) missing.push("businessType");
  if (!normalizeText(data.productOrServiceWanted)) {
    missing.push("productOrServiceWanted");
  }
  if (!normalizeText(data.problemEncountered)) {
    missing.push("problemEncountered");
  }
  if (!normalizeText(data.desiredSolution)) missing.push("desiredSolution");
  if (!normalizeText(data.dailyVolume)) missing.push("dailyVolume");
  if (!normalizeText(data.customerName)) missing.push("customerName");
  if (!normalizeText(data.phone)) missing.push("phone");

  return missing;
}

function getNextBestField(data = {}) {
  return getMissingQualificationFields(data)[0] || "";
}

function buildNextBestQuestion({
  field,
  pageConfig = {},
  pageIntelligence = {},
}) {
  const pageName = normalizeText(pageConfig.pageName) || "this page";
  const offeringType = normalizeText(pageIntelligence.offeringType);

  if (field === "businessType") {
    return "May I know what type of business or need you have?";
  }

  if (field === "productOrServiceWanted") {
    if (offeringType === "product") {
      return `What product from ${pageName} are you interested in?`;
    }

    if (offeringType === "service") {
      return `What service from ${pageName} are you interested in?`;
    }

    return "What product or service are you interested in?";
  }

  if (field === "problemEncountered") {
    return "What problem or challenge are you trying to solve right now?";
  }

  if (field === "desiredSolution") {
    return "What solution or result would you like to achieve?";
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

function calculateLeadScore(data = {}) {
  let score = 0;

  if (normalizeText(data.businessType)) score += 10;
  if (normalizeText(data.productOrServiceWanted)) score += 15;
  if (normalizeText(data.problemEncountered)) score += 15;
  if (normalizeText(data.desiredSolution)) score += 15;
  if (normalizeText(data.dailyVolume)) score += 10;
  if (normalizeText(data.customerName)) score += 10;
  if (normalizeText(data.phone)) score += 15;
  if (normalizeText(data.email)) score += 10;
  if (normalizeText(data.preferredSchedule)) score += 15;

  return Math.min(100, score);
}

function getLeadPriority(score) {
  if (score >= 80) return "hot";
  if (score >= 55) return "warm";
  if (score >= 30) return "cold";
  return "new";
}

function buildQualificationSummary(data = {}) {
  return [
    data.customerName ? `Customer: ${data.customerName}` : "",
    data.phone ? `Phone: ${data.phone}` : "",
    data.email ? `Email: ${data.email}` : "",
    data.location ? `Location: ${data.location}` : "",
    data.businessType ? `Business/Need: ${data.businessType}` : "",
    data.businessModel ? `Business model: ${data.businessModel}` : "",
    data.productOrServiceWanted
      ? `Interest: ${data.productOrServiceWanted}`
      : "",
    data.problemEncountered ? `Problem: ${data.problemEncountered}` : "",
    data.desiredSolution ? `Desired solution: ${data.desiredSolution}` : "",
    data.inquirySource ? `Inquiry source: ${data.inquirySource}` : "",
    data.dailyVolume ? `Volume: ${data.dailyVolume}` : "",
    data.budgetOrQuantity ? `Budget/Quantity: ${data.budgetOrQuantity}` : "",
    data.preferredSchedule
      ? `Preferred schedule: ${data.preferredSchedule}`
      : "",
    data.urgency ? `Urgency: ${data.urgency}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildQualificationPrompt({
  incomingText,
  pageConfig = {},
  pageIntelligence = {},
  flowData = {},
  recentMessages = [],
}) {
  return [
    {
      role: "system",
      content:
        "You are a CRM lead qualification extraction engine. Return JSON only. " +
        "CRITICAL: Never infer or guess customer-specific fields. " +
        "Only extract a customer field if the customer explicitly stated it in the current or recent messages. " +
        "Do not copy Facebook page metadata into customer fields. " +
        "Page context may help interpret wording, but it must not become customer data. " +
        "Never guess customer business type, inquiry volume, phone, email, budget, location, schedule, or name. " +
        "If a value is not explicitly supported by the customer's messages, return an empty string. " +
        "Unknown is safer than wrong data.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          pageContext: {
            pageName: normalizeText(pageConfig.pageName),
            businessType: normalizeText(pageConfig.businessType),
            productServices: normalizeText(pageConfig.productServices),
            priceRanges: normalizeText(pageConfig.productServicePriceRanges),
            knowledge: normalizeText(pageConfig.knowledge),
          },
          warning:
            "Do not place pageContext.businessType into extractedData.businessType unless the customer explicitly said that is their own business/need.",
          pageIntelligence,
          existingFlowData: flowData,
          recentMessages: recentMessages.slice(-8),
          incomingMessage: incomingText,
          requiredJsonShape: {
            extractedData: {
              customerName: "",
              phone: "",
              email: "",
              location: "",
              businessType: "",
              businessModel: "",
              productOrServiceWanted: "",
              problemEncountered: "",
              desiredSolution: "",
              inquirySource: "",
              dailyVolume: "",
              budgetOrQuantity: "",
              preferredSchedule: "",
              urgency: "",
            },
            qualificationSummary: "",
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
  if (!process.env.GROQ_API_KEY) return null;

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
      `Lead qualification LLM error (${response.status}): ${details}`
    );
  }

  const data = await response.json();
  return safeJsonParse(data?.choices?.[0]?.message?.content || "{}");
}

function normalizeQualification(
  raw,
  fallback,
  flowData,
  pageConfig,
  pageIntelligence,
  evidenceText
) {
  const source = raw && typeof raw === "object" ? raw : {};
  const extractedData =
    source.extractedData && typeof source.extractedData === "object"
      ? source.extractedData
      : {};

  const normalizedExtracted = sanitizeExtractedData({
    extractedData,
    fallback,
    evidenceText,
  });

  const mergedData = mergeQualificationData(flowData, normalizedExtracted);
  const missingFields = getMissingQualificationFields(mergedData);
  const nextBestField = getNextBestField(mergedData);
  const nextBestQuestion = buildNextBestQuestion({
    field: nextBestField,
    pageConfig,
    pageIntelligence,
  });

  const leadScore = calculateLeadScore(mergedData);
  const leadPriority = getLeadPriority(leadScore);

  return {
    extractedData: normalizedExtracted,
    mergedData,
    qualificationSummary: buildQualificationSummary(mergedData),
    leadScore,
    leadPriority,
    missingFields,
    nextBestField,
    nextBestQuestion,
    confidence: Number.isFinite(Number(source.confidence))
      ? Math.max(0, Math.min(1, Number(source.confidence)))
      : fallback.confidence,
  };
}

async function qualifyFacebookLead({
  incomingText,
  pageConfig = {},
  pageIntelligence = {},
  flowData = {},
  recentMessages = [],
}) {
  const evidenceText = buildEvidenceText({
    incomingText,
    recentMessages,
  });

  const fallback = buildFallbackQualification({
    incomingText,
    flowData,
    pageIntelligence,
    recentMessages,
  });

  let raw = null;

  try {
    raw = await callGroqJson({
      messages: buildQualificationPrompt({
        incomingText,
        pageConfig,
        pageIntelligence,
        flowData,
        recentMessages,
      }),
    });
  } catch (error) {
    logger.error({
      message: error.message,
    }, "Facebook lead qualification fallback used");
  }

  return normalizeQualification(
    raw,
    fallback,
    flowData,
    pageConfig,
    pageIntelligence,
    evidenceText
  );
}

module.exports = {
  buildNextBestQuestion,
  buildQualificationSummary,
  calculateLeadScore,
  extractDailyVolume,
  getLeadPriority,
  getMissingQualificationFields,
  getNextBestField,
  mergeQualificationData,
  qualifyFacebookLead,
};
