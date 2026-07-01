const logger = require('../../config/logger');
const { detect: detectLanguage } = require("tinyld");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIncomingMessage(value = "") {
  return normalizeText(value)
    .replace(/\r/g, "\n")
    .replace(/[？]/g, "?")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean)
    : [];
}

function tokenize(value = "") {
  return normalizeLower(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function uniqueTokens(value = "") {
  return Array.from(new Set(tokenize(value)));
}

function hasAny(text = "", keywords = []) {
  const normalized = normalizeLower(text);
  return keywords.some((keyword) => normalized.includes(normalizeLower(keyword)));
}

function hasAnyWord(text = "", keywords = []) {
  const normalized = normalizeLower(text);
  return keywords.some((keyword) => {
    const escaped = normalizeLower(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(normalized);
  });
}

const TAGALOG_WORDS = [
  "ano",
  "anong",
  "mga",
  "paano",
  "saan",
  "kailan",
  "magkano",
  "presyo",
  "bayad",
  "meron",
  "wala",
  "pwede",
  "pede",
  "puwede",
  "kayo",
  "nyo",
  "niyo",
  "namin",
  "po",
  "opo",
  "salamat",
  "makakabili",
  "tulong",
  "serbisyo",
  "produkto",
  "inyo",
];

const ENGLISH_WORDS = [
  "what",
  "how",
  "where",
  "when",
  "why",
  "who",
  "which",
  "can",
  "do",
  "does",
  "is",
  "are",
  "service",
  "services",
  "product",
  "products",
  "offer",
  "offered",
  "booking",
  "book",
  "website",
  "price",
  "pricing",
];

function countWordMatches(text = "", keywords = []) {
  return keywords.reduce(
    (count, keyword) => count + (hasAnyWord(text, [keyword]) ? 1 : 0),
    0
  );
}

function isTagalogLike(text = "") {
  return countWordMatches(text, TAGALOG_WORDS) > 0;
}

function getLanguageStyle(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return "english";

  const tagalogScore = countWordMatches(normalized, TAGALOG_WORDS);
  const englishScore = countWordMatches(normalized, ENGLISH_WORDS);

  if (tagalogScore > 0 && englishScore > 0) return "taglish";

  try {
    const detected = detectLanguage(normalized);
    if (detected === "tl") {
      return englishScore > 0 ? "taglish" : "tagalog";
    }
  } catch {
    /* tinyld is best-effort only */
  }

  return tagalogScore > 0 ? "tagalog" : "english";
}

function isFilipinoStyle(text = "") {
  const style = getLanguageStyle(text);
  return style === "tagalog" || style === "taglish";
}

function isLikelyQuestion(text = "") {
  const normalized = normalizeLower(text);
  if (!normalized) return false;
  if (normalized.includes("?")) return true;

  return hasAny(normalized, [
    "what",
    "how",
    "when",
    "where",
    "why",
    "who",
    "which",
    "can",
    "do you",
    "does",
    "is there",
    "are there",
    "may",
    "pwede",
    "pede",
    "puwede",
    "ano",
    "paano",
    "saan",
    "kailan",
    "magkano",
    "may",
    "meron",
    "available",
    "avail",
    "offer",
    "services",
    "products",
    "product",
    "service",
    "delivery",
    "deliver",
    "gcash",
    "payment",
    "pay",
    "cost",
    "rate",
    "quote",
    "quotation",
    "booking",
    "appointment",
    "demo",
    "meeting",
    "located",
    "location",
    "branch",
    "address",
    "contact",
    "phone",
    "email",
    "hours",
    "open",
    "closed",
    "schedule",
    "reservation",
    "reserve",
    "reservation assistance",
    "house model",
    "house models",
    "model",
    "models",
    "calista",
    "unna",
    "brenna",
    "site viewing",
    "viewing",
    "tripping",
    "site tripping",
    "financing",
    "bank financing",
    "in-house financing",
    "requirements",
    "process",
  ]);
}

function isSimpleGreeting(text = "") {
  const normalized = normalizeLower(text).replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const greetings = [
    "hi", "hello", "hey", "good day", "kumusta", "kamusta",
    "good morning", "good afternoon", "good evening", "goodmorning",
    "goodafternoon", "goodevening", "morning", "afternoon", "evening",
    "hi po", "hello po", "hey po", "good day po", "kumusta po", "kamusta po",
    "good morning po", "good afternoon po", "good evening po", "morning po",
    "how are you", "how r u", "how is it going", "greetings"
  ];
  return greetings.includes(normalized) || greetings.some(g => normalized === g);
}

function isThankYou(text = "") {
  const normalized = normalizeLower(text).replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const thankYouWords = [
    "thank you", "thanks", "thankyou", "ty", "tq", 
    "salamat", "maraming salamat", "thank you po", 
    "salamat po", "thanks po", "gracias", "many thanks",
    "thank you very much", "thank u", "thanku", "salamat ng marami",
    "maraming salamat po", "thankyou po", "ty po", "tq po",
    "thank u po", "thanku po"
  ];
  return thankYouWords.includes(normalized) || thankYouWords.some(w => normalized === w);
}

function isSimpleConfirmation(text = "") {
  const normalized = normalizeLower(text);
  return [
    "yes",
    "y",
    "oo",
    "opo",
    "correct",
    "tama",
    "no",
    "n",
    "hindi",
    "di",
    "nope",
  ].includes(normalized);
}

function isProductsServicesQuestion(text = "") {
  return hasAny(text, [
    "what products",
    "what product",
    "what services",
    "what service",
    "what type of services",
    "type of services",
    "types of services",
    "services offered",
    "service offered",
    "products offered",
    "product offered",
    "offered services",
    "offered products",
    "products do you offer",
    "services do you offer",
    "ano products",
    "ano services",
    "ano mga serbisyo",
    "ano serbisyo",
    "anong serbisyo",
    "ano ang serbisyo",
    "ano ang nga services",
    "ano ang mga services",
    "ano ang services",
    "mga services",
    "services na",
    "services ang",
    "service na",
    "service ang",
    "services nyo",
    "services niyo",
    "services mo",
    "serbisyo nyo",
    "serbisyo niyo",
    "serbisyo mo",
    "ano offer",
    "anong offer",
    "offer nyo",
    "offer niyo",
    "offer mo",
    "what do you offer",
    "what can you offer",
    "ano inooffer",
    "ano ino-offer",
    "ano ang inooffer",
    "ano ang ino-offer",
    "ano available",
    "available services",
    "available products",
  ]);
}

function getKnowledgeTopic(text = "") {
  const normalized = normalizeLower(text);

  if (hasAny(normalized, ["papayat", "mag papayat", "magpapayat", "pumayat", "lose weight", "weight loss", "fat loss", "payat"])) {
    return "weight_loss";
  }

  if (hasAny(normalized, ["nutrition", "diet", "meal", "pagkain", "kain", "protein", "calorie", "healthy food"])) {
    return "nutrition";
  }

  if (hasAny(normalized, ["beginner", "baguhan", "newbie", "first time", "simula", "nagsisimula"])) {
    return "beginner";
  }

  if (hasAny(normalized, ["muscle", "muscle building", "gain muscle", "build muscle", "palaki", "laki katawan"])) {
    return "muscle_building";
  }

  if (hasAny(normalized, ["body transformation", "transformation", "body transform", "transform katawan"])) {
    return "body_transformation";
  }

  if (hasAny(normalized, ["home workout", "bahay", "workout sa bahay"])) {
    return "home_workout";
  }

  if (hasAny(normalized, ["reservation", "reserve", "reservation assistance"])) {
    return "reservation";
  }

  if (hasAny(normalized, ["house model", "house models", "model", "models", "calista", "unna", "brenna"])) {
    return "house_models";
  }

  if (hasAny(normalized, ["site viewing", "viewing", "tripping", "site tripping"])) {
    return "site_viewing";
  }

  if (hasAny(normalized, ["financing", "bank financing", "in-house financing", "payment terms"])) {
    return "financing";
  }

  return "";
}

function isAboutBusinessQuestion(text = "") {
  if (getKnowledgeTopic(text)) return false;

  return hasAny(text, [
    "what is",
    "who is",
    "about",
    "tell me about",
    "ano ang",
    "ano yung",
    "ano ang business",
    "ano itong",
    "tungkol saan",
    "kilala ba",
  ]);
}

function isPricingQuestion(text = "") {
  return hasAny(text, [
    "price",
    "pricing",
    "cost",
    "rate",
    "package",
    "plan",
    "magkano",
    "presyo",
    "bayad",
    "quotation",
    "quote",
  ]);
}

function isBookingQuestion(text = "") {
  return hasAny(text, [
    "book",
    "booking",
    "appointment",
    "meeting",
    "demo",
    "consult",
    "consultation",
    "schedule",
    "pa schedule",
    "magpa schedule",
    "site viewing",
    "site tripping",
  ]);
}

function isBusinessHoursQuestion(text = "") {
  return hasAny(text, [
    "business hours",
    "opening hours",
    "office hours",
    "store hours",
    "hours open",
    "what time open",
    "what time close",
    "open today",
    "are you open",
    "oras",
    "anong oras",
    "ano oras",
    "nagbubukas",
    "bukas",
    "sarado",
    "open ba",
  ]);
}

function isLocationQuestion(text = "") {
  return hasAny(text, [
    "location",
    "locations",
    "branch",
    "branches",
    "address",
    "where are you located",
    "where located",
    "service area",
    "coverage area",
    "coverage",
    "saan located",
    "saan kayo",
    "saan branch",
    "lugar",
  ]);
}

function isContactQuestion(text = "") {
  return hasAny(text, [
    "contact",
    "phone",
    "mobile",
    "number",
    "email",
    "messenger",
    "facebook page",
    "fb page",
    "how to contact",
    "contact details",
    "contact information",
    "paano contact",
    "contact nyo",
    "contact niyo",
    "numero",
    "email nyo",
    "email niyo",
  ]);
}

function isHouseModelsQuestion(text = "") {
  return hasAny(text, [
    "house model",
    "house models",
    "home model",
    "home models",
    "model unit",
    "model units",
    "available model",
    "available models",
    "calista",
    "unna",
    "brenna",
    "ano model",
    "anong model",
    "mga model",
  ]);
}

function isBenefitsQuestion(text = "") {
  return hasAny(text, [
    "benefit",
    "benefits",
    "key benefits",
    "features",
    "amenities",
    "why choose",
    "bakit",
    "advantage",
    "advantages",
  ]);
}

const BUSINESS_HOURS_TERMS = [
  "business hours",
  "opening hours",
  "office hours",
  "store hours",
  "hours",
  "schedule",
  "open",
  "closed",
  "close",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "weekday",
  "weekend",
  "oras",
  "bukas",
  "sarado",
  "nagbubukas",
];

function hasBusinessHoursSignal(text = "") {
  const normalized = normalizeLower(text);
  if (!normalized) return false;

  return (
    hasAny(normalized, BUSINESS_HOURS_TERMS) ||
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(normalized) ||
    /\b\d{1,2}\s*(?:-|to|until)\s*\d{1,2}\b/i.test(normalized)
  );
}

function isWebsiteLinkQuestion(text = "") {
  return hasAny(text, [
    "website",
    "web site",
    "site link",
    "official site",
    "link ng website",
    "website link",
  ]);
}

function isShopeeLinkQuestion(text = "") {
  return hasAny(text, [
    "shopee",
    "shoppee",
    "shoppe",
    "shopee link",
    "shoppee link",
  ]);
}

function isLazadaLinkQuestion(text = "") {
  return hasAny(text, [
    "lazada",
    "lazada link",
  ]);
}

function buildSingleLinkReply({ label, link, incomingText = "" }) {
  const normalizedLink = normalizeText(link);

  if (normalizedLink) {
    return isFilipinoStyle(incomingText)
      ? `Ito po ang ${label} link: ${normalizedLink}`
      : `${label}: ${normalizedLink}`;
  }

  return isFilipinoStyle(incomingText)
    ? `Sa ngayon, wala pa po kaming ${label} na available.`
    : `We do not have a ${label} link available yet.`;
}

function buildLinksReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const websiteLink =
    normalizeText(pageSettings.website_link) ||
    normalizeText(pageConfig.websiteLink);
  const shoppeLink =
    normalizeText(pageSettings.shoppe_link) ||
    normalizeText(pageConfig.shoppeLink);
  const lazadaLink =
    normalizeText(pageSettings.lazada_link) ||
    normalizeText(pageConfig.lazadaLink);

  const links = [
    websiteLink ? `Website: ${websiteLink}` : "",
    shoppeLink ? `Shopee: ${shoppeLink}` : "",
    lazadaLink ? `Lazada: ${lazadaLink}` : "",
  ].filter(Boolean);

  if (links.length) {
    return isFilipinoStyle(incomingText)
      ? ["Ito po ang available links namin:", "", links.join("\n")].join("\n")
      : links.join("\n");
  }

  return isFilipinoStyle(incomingText)
    ? "Sa ngayon, wala pa po kaming website, Shopee, or Lazada link na available."
    : "We do not have website, Shopee, or Lazada links available yet.";
}

function cleanKnowledgeText(value = "") {
  return normalizeText(value)
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const KNOWLEDGE_SECTION_KEYS = {
  businessOverview: [
    "business overview",
    "company overview",
    "about",
    "identity",
    "who the business is",
  ],
  productsServices: [
    "products and services",
    "products & services",
    "products/services",
    "services",
    "products",
    "packages",
    "plans",
    "solutions",
  ],
  houseModels: [
    "house models",
    "available house models",
    "model units",
    "home models",
    "house types",
  ],
  keyBenefits: [
    "key benefits",
    "benefits",
    "why choose",
    "features",
    "community features",
  ],
  pricingPayment: [
    "pricing and payment",
    "pricing",
    "price",
    "payment",
    "payment methods",
    "financing options",
    "promotions",
  ],
  businessHours: [
    "business hours",
    "operating hours",
    "opening hours",
    "office hours",
    "store hours",
    "availability",
  ],
  locationsCoverage: [
    "locations and coverage",
    "locations",
    "coverage",
    "branches",
    "office locations",
    "service areas",
    "coverage areas",
  ],
  customerInformation: [
    "customer information",
    "customer inquiry guidelines",
    "common requirements",
    "process",
    "policies",
    "frequently requested information",
  ],
  contactInformation: [
    "contact information",
    "contact",
    "phone numbers",
    "email",
    "website",
    "facebook page",
    "messenger",
    "contact methods",
  ],
  followUpQuestions: [
    "follow-up questions",
    "follow up questions",
    "followup questions",
    "follow-up",
    "follow up",
    "before providing recommendations",
  ],
  aiInstructions: [
    "ai instructions",
    "customer interaction rules",
    "chatbot rules",
    "instructions",
  ],
};

const KNOWLEDGE_SECTION_NAME_BY_HEADING = Object.entries(KNOWLEDGE_SECTION_KEYS)
  .reduce((acc, [key, headings]) => {
    headings.forEach((heading) => {
      acc[heading] = key;
    });
    return acc;
  }, {});

function normalizeSectionHeading(value = "") {
  return normalizeLower(value)
    .replace(/^#{1,6}\s*/, "")
    .replace(/[:：]\s*$/, "")
    .replace(/[^\p{L}\p{N}&/\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSectionKeyFromLine(line = "") {
  const normalized = normalizeSectionHeading(line);
  if (!normalized) return "";

  if (KNOWLEDGE_SECTION_NAME_BY_HEADING[normalized]) {
    return KNOWLEDGE_SECTION_NAME_BY_HEADING[normalized];
  }

  const directMatch = Object.entries(KNOWLEDGE_SECTION_KEYS).find(([, headings]) =>
    headings.some((heading) => normalized === heading)
  );
  if (directMatch) return directMatch[0];

  return "";
}

const INLINE_KNOWLEDGE_SECTION_HEADINGS = [
  "BUSINESS OVERVIEW",
  "COMPANY OVERVIEW",
  "PRODUCTS AND SERVICES",
  "PRODUCTS & SERVICES",
  "HOUSE MODELS",
  "AVAILABLE HOUSE MODELS",
  "KEY BENEFITS",
  "COMMUNITY FEATURES",
  "PRICING AND PAYMENT",
  "BUSINESS HOURS",
  "OPERATING HOURS",
  "OPENING HOURS",
  "OFFICE HOURS",
  "STORE HOURS",
  "LOCATIONS AND COVERAGE",
  "CUSTOMER INFORMATION",
  "CONTACT INFORMATION",
  "FOLLOW-UP QUESTIONS",
  "FOLLOW UP QUESTIONS",
  "FOLLOWUP QUESTIONS",
  "AI INSTRUCTIONS",
].sort((a, b) => b.length - a.length);

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeKnowledgeForSectionParsing(value = "") {
  let text = normalizeText(value)
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n");

  if (!text) return "";

  INLINE_KNOWLEDGE_SECTION_HEADINGS.forEach((heading) => {
    const escapedHeading = escapeRegExp(heading);

    text = text.replace(
      new RegExp(`(^|\\n)\\s*#{1,6}\\s*(${escapedHeading})\\s*:?\\s*`, "gi"),
      "\n$2\n"
    );

    text = text.replace(
      new RegExp(`(^|\\s)(${escapedHeading})\\s*:?\\s*`, "g"),
      "\n$2\n"
    );
  });

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseKnowledgeSections(value = "") {
  const text = normalizeKnowledgeForSectionParsing(value);
  const sections = {};
  if (!text) return sections;

  let currentKey = "";
  let buffer = [];

  const flush = () => {
    if (!currentKey) return;
    const content = cleanKnowledgeText(buffer.join("\n"));
    if (!content) return;
    sections[currentKey] = [sections[currentKey], content]
      .filter(Boolean)
      .join("\n\n");
  };

  text.split(/\n/).forEach((line) => {
    const sectionKey = getSectionKeyFromLine(line);
    if (sectionKey) {
      flush();
      currentKey = sectionKey;
      buffer = [];
      return;
    }

    const rawLine = normalizeText(line);
    const startsListItem = /^[-*•●·]/.test(rawLine);
    if (
      currentKey &&
      buffer.length > 0 &&
      !startsListItem &&
      !hasBusinessHoursSignal(rawLine) &&
      isLikelyHeadingOnlyBlock(line)
    ) {
      flush();
      currentKey = "";
      buffer = [];
      return;
    }

    if (currentKey) {
      buffer.push(line);
    }
  });

  flush();
  return sections;
}

function getKnowledgeSourceTexts({ pageSettings = {}, pageConfig = {} }) {
  return [
    pageSettings.business_description,
    pageSettings.businessDescription,
    pageSettings.knowledge,
    pageSettings.knowledge_base,
    pageSettings.admin_knowledge,
    pageConfig.knowledge,
    pageConfig.businessDescription,
    pageConfig.business_description,
    pageConfig.adminKnowledge,
    pageConfig.knowledge_base,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function knowledgeFingerprint(value = "") {
  return normalizeLower(value)
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[•●·]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKnowledgeText(value = "") {
  const text = normalizeText(value)
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => normalizeText(paragraph))
    .filter(Boolean);
  const seenParagraphs = new Set();
  const uniqueParagraphs = [];

  paragraphs.forEach((paragraph) => {
    const fingerprint = knowledgeFingerprint(paragraph);
    if (!fingerprint || seenParagraphs.has(fingerprint)) return;
    seenParagraphs.add(fingerprint);
    uniqueParagraphs.push(paragraph);
  });

  return uniqueParagraphs.join("\n\n").trim();
}

const TEMPLATE_PLACEHOLDER_FINGERPRINTS = new Set([
  "who the business is what it does and who it serves",
  "products services packages plans and solutions offered",
  "pricing information payment methods financing options and promotions",
  "operating hours and availability",
  "office locations branches service areas and coverage areas",
  "common requirements process policies and frequently requested information",
  "phone numbers facebook page messenger website and other contact methods",
  "before providing recommendations or specific information collect missing details when necessary",
]);

function isTemplatePlaceholderContent(value = "") {
  const fingerprint = knowledgeFingerprint(value);
  return !fingerprint || TEMPLATE_PLACEHOLDER_FINGERPRINTS.has(fingerprint);
}

function getKnowledgeSections({ pageSettings = {}, pageConfig = {} }) {
  const sources = getKnowledgeSourceTexts({ pageSettings, pageConfig })
    .map((value) => parseKnowledgeSections(value));

  return sources.reduce((merged, source) => {
    Object.entries(source).forEach(([key, value]) => {
      const cleanValue = normalizeText(value);
      if (!cleanValue) return;
      merged[key] = dedupeKnowledgeText([merged[key], cleanValue]
        .filter(Boolean)
        .join("\n\n"));
    });
    return merged;
  }, {});
}

function getKnowledgeSection({ pageSettings = {}, pageConfig = {} }, key = "") {
  const sections = getKnowledgeSections({ pageSettings, pageConfig });
  const section = dedupeKnowledgeText(sections[key]);
  return isTemplatePlaceholderContent(section) ? "" : section;
}

function removeAiInstructionSections(value = "") {
  const text = normalizeKnowledgeForSectionParsing(value);
  if (!text) return "";

  const lines = text.split(/\n/);
  const output = [];
  let skipping = false;

  lines.forEach((line) => {
    const sectionKey = getSectionKeyFromLine(line);
    if (sectionKey) {
      skipping = sectionKey === "aiInstructions" || sectionKey === "followUpQuestions";
      if (!skipping) output.push(line);
      return;
    }

    if (!skipping) output.push(line);
  });

  return output.join("\n").trim();
}

function isLikelyHeadingOnlyBlock(value = "") {
  const block = normalizeText(value);
  const normalized = normalizeLower(block);
  const tokenCount = tokenize(block).length;

  if (!block) return false;
  if (block.length > 100 || tokenCount > 10) return false;
  if (/\b(is|are|offers|provides|helps|specializes|focused|dedicated|located|serves)\b/i.test(block)) {
    return false;
  }

  return (
    normalized.includes("knowledge base") ||
    normalized.startsWith("about ") ||
    normalized === "about" ||
    normalized === "identity" ||
    normalized === "overview" ||
    normalized === "products and services" ||
    normalized === "products & services" ||
    normalized === "services" ||
    normalized === "pricing" ||
    normalized === "links" ||
    normalized === "faqs" ||
    !/[.!?]\s*$/.test(block)
  );
}

function combineHeadingWithBlock(heading = "", block = "") {
  const normalizedHeading = normalizeText(heading);
  const normalizedBlock = normalizeText(block);

  if (!normalizedHeading) return normalizedBlock;
  if (!normalizedBlock) return "";

  if (normalizeLower(normalizedBlock).startsWith(normalizeLower(normalizedHeading))) {
    return normalizedBlock;
  }

  return `${normalizedHeading}: ${normalizedBlock}`;
}

function splitBusinessItems(value = "") {
  const cleaned = normalizeText(value)
    .replace(/\\n/g, "\n")
    .replace(/[•●·]/g, "\n")
    .replace(/\s+-\s+/g, "\n")
    .replace(/^#{1,6}\s*/gm, "");
  if (!cleaned) return [];

  if (/:/.test(cleaned)) {
    const sections = cleaned.split(
      /\s+(?=[A-Z][A-Za-z &/+-]{2,45}:\s*)/g
    );
    if (sections.length > 1) {
      return sections
        .flatMap((section) => {
          const [heading, ...rest] = section.split(":");
          const body = normalizeText(rest.join(":"));
          if (!body) return [normalizeText(section)];

          const items = body
            .split(/,|;|\n+|[•●·]|\band\b/i)
            .map((item) => normalizeText(item))
            .filter(Boolean);

          return [
            normalizeText(`${normalizeText(heading)}:`),
            ...items.map((item) => `  - ${item}`),
          ];
        })
        .filter(Boolean);
    }
  }

  const delimiterParts = cleaned
    .split(/\n+|[;,|•●·]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const parts = delimiterParts.length > 1
    ? delimiterParts
    : cleaned
        .split(
          /\s+(?=(?:Affordable|Townhouses|Single|Residential|Property|Home|Bank|Move-In|Real Estate|Personal|Online|Customized|Weight|Muscle|Strength|Nutrition|Fitness|Body|Beginner|Life|Health|Insurance|Solar|Panel|Installation)\b)/g
        )
        .map((item) => normalizeText(item))
        .filter(Boolean);

  const stopHeadings = [
    "customer goals",
    "goals we help",
    "target customer",
    "ideal customer",
    "best for",
  ];

  const serviceBoundaryPattern =
    /\s+(?=(?:Property Investment|Customer Support Services|Home Financing Assistance|Bank Financing Assistance|Flexible Payment Options|Reservation Programs|Property Consultation|House Model Recommendations|Reservation Assistance|Site Viewing Assistance|Financing Guidance|Quotation Request|Real Estate Consultation|Homeownership Programs|Personal Training|Online Fitness Coaching|Customized Workout Programs|Weight Loss Programs|Muscle Building Programs|Strength and Conditioning Training|Nutrition Guidance|Fitness Consultation|Body Transformation Coaching|Beginner Fitness Programs|Home Workout Plans|Fitness Community Support|Life Insurance|Health Insurance|Solar Panel|Panel Installation)\b)/g;

  const expandedParts = parts.flatMap((part) =>
    normalizeText(part)
      .replace(/\bHomeownership Programs Financing Assistance\b/g, "Homeownership Programs\nFinancing Assistance")
      .split(serviceBoundaryPattern)
      .flatMap((item) => item.split(/\n+/))
      .map((item) => normalizeText(item))
      .filter(Boolean)
  );

  const cleanedParts = [];
  for (const part of expandedParts) {
    const item = normalizeText(part)
      .replace(/^[-*]\s*/, "")
      .replace(/[•●·]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!item || item.length < 3) continue;
    if (["products and services", "products & services", "services", "products"].includes(normalizeLower(item))) {
      continue;
    }
    if (stopHeadings.some((heading) => normalizeLower(item).includes(heading))) {
      break;
    }

    cleanedParts.push(item);
  }

  return Array.from(new Set(cleanedParts));
}

function splitStructuredBusinessItems(value = "") {
  const cleaned = normalizeText(value)
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[•●·]/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .trim();
  if (!cleaned) return [];

  const stopHeadings = [
    "customer goals",
    "goals we help",
    "target customer",
    "ideal customer",
    "best for",
    "customer information",
    "contact information",
    "ai instructions",
  ];

  const boundaryPattern =
    /\s+(?=(?:House and Lot Sales|Affordable Housing|Residential Communities|Townhouses|Single Attached Homes|Move-In Ready Homes|Property Investment|Property Investment Opportunities|Home Financing Assistance|Bank Financing Assistance|Flexible Payment Options|Reservation Programs|Reservation Assistance|Property Consultation|Real Estate Consultation|Site Viewing|Homeownership Programs|Personal Training|Online Fitness Coaching|Customized Workout Programs|Weight Loss Programs|Muscle Building Programs|Strength and Conditioning Training|Nutrition Guidance|Fitness Consultation|Body Transformation Coaching|Beginner Fitness Programs|Home Workout Plans|Fitness Community Support|Life Insurance|Health Insurance|Solar Panel|Panel Installation)\b)/g;

  const parts = cleaned
    .split(/\n+|[;,|]+/)
    .flatMap((part) => normalizeText(part).split(boundaryPattern))
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const items = [];
  for (const part of parts) {
    const item = normalizeText(part)
      .replace(/^[-*]\s*/, "")
      .replace(/[:：]\s*$/, "")
      .replace(/\s{2,}/g, " ");
    const normalized = normalizeLower(item);

    if (!item || item.length < 3) continue;
    if (["products and services", "products & services", "services", "products"].includes(normalized)) {
      continue;
    }
    if (stopHeadings.some((heading) => normalized.includes(heading))) {
      break;
    }

    items.push(item);
  }

  return Array.from(new Set(items));
}

function formatBulletList(value = "", options = {}) {
  const items = splitStructuredBusinessItems(value);
  if (items.length === 0) return normalizeText(value);

  const maxItems = Number(options.maxItems) || 16;
  const visibleItems = items.slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  const lines = visibleItems
    .map((item) => (item.startsWith("  - ") ? item : `- ${item}`))
    .join("\n");

  if (!hiddenCount) return lines;

  return [
    lines,
    "",
    options.moreLine || "Ask me about a specific service for details.",
  ].join("\n");
}

function buildUnknownReply({ incomingText = "", pageSettings = {}, pageConfig = {} }) {
  const websiteLink =
    normalizeText(pageSettings.website_link) ||
    normalizeText(pageConfig.websiteLink);
  const base = isFilipinoStyle(incomingText)
    ? "Hindi ko mahanap ang information na yan ngayon. Pwede kong i-connect ang inquiry mo sa team, or send ka pa ng additional details para mas ma-assist kita."
    : "I'm unable to find that information right now. I can connect your inquiry to our team, or you may provide additional details so I can assist further.";

  return websiteLink ? `${base}\n\nWebsite: ${websiteLink}` : base;
}

function knowledgeRichnessScore(record = {}, pageConfig = {}) {
  return [
    record.business_description,
    record.products_services,
    record.product_service_price_ranges,
    record.website_link,
    record.shoppe_link,
    record.lazada_link,
    pageConfig.knowledge,
  ].reduce((score, value) => score + normalizeText(value).length, 0);
}

function chooseBestPageSettings(records = [], pageConfig = {}) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const expectedPageId = normalizePageId(pageConfig.pageId);
  const expectedPageName = normalizeLower(pageConfig.pageName);

  return records
    .slice()
    .sort((a, b) => {
      const aPageMatch = normalizePageId(a.page_id) === expectedPageId;
      const bPageMatch = normalizePageId(b.page_id) === expectedPageId;
      if (aPageMatch !== bPageMatch) return aPageMatch ? -1 : 1;

      const aNameMatch =
        expectedPageName && normalizeLower(a.page_name) === expectedPageName;
      const bNameMatch =
        expectedPageName && normalizeLower(b.page_name) === expectedPageName;
      if (aNameMatch !== bNameMatch) return aNameMatch ? -1 : 1;

      const aScore = knowledgeRichnessScore(a, pageConfig);
      const bScore = knowledgeRichnessScore(b, pageConfig);
      if (aScore !== bScore) return bScore - aScore;

      const aUpdated = Date.parse(a.updated_at || a.created_at || "") || 0;
      const bUpdated = Date.parse(b.updated_at || b.created_at || "") || 0;
      return bUpdated - aUpdated;
    })[0];
}

function splitKnowledgeBlocks(value = "") {
  const cleaned = cleanKnowledgeText(value);
  if (!cleaned) return [];

  const rawBlocks = cleaned
    .split(/\n{2,}/)
    .map((block) => normalizeText(block.replace(/\n+/g, " ")))
    .filter(Boolean);

  const blocks = [];
  let pendingHeading = "";

  rawBlocks.forEach((block) => {
    if (isLikelyHeadingOnlyBlock(block)) {
      pendingHeading = block;
      return;
    }

    const combined = combineHeadingWithBlock(pendingHeading, block);
    pendingHeading = "";

    if (combined.length >= 30) {
      blocks.push(combined);
    }
  });

  return blocks;
}

function expandKnowledgeQueryText(question = "") {
  const normalized = normalizeLower(question);
  const expansions = [];

  if (hasAny(normalized, ["papayat", "mag papayat", "magpapayat", "pumayat", "lose weight", "weight loss", "fat loss", "payat"])) {
    expansions.push(
      "weight loss fat loss body fat nutrition exercise sleep lifestyle consistency progress tracking accountability coaching"
    );
  }

  if (hasAny(normalized, ["nutrition", "diet", "meal", "pagkain", "kain", "protein", "calorie"])) {
    expansions.push(
      "nutrition guidance portion control balanced meals protein intake hydration healthy food choices"
    );
  }

  if (hasAny(normalized, ["beginner", "baguhan", "newbie", "first time", "simula", "nagsisimula"])) {
    expansions.push(
      "beginner fitness starting slowly consistency proper exercise technique safety beginner friendly"
    );
  }

  if (hasAny(normalized, ["muscle", "muscle building", "gain muscle", "build muscle", "palaki", "laki katawan"])) {
    expansions.push(
      "muscle building progressive resistance training strength training protein recovery sleep muscle growth"
    );
  }

  if (hasAny(normalized, ["body transformation", "transformation", "body transform", "transform katawan"])) {
    expansions.push(
      "body transformation coaching body recomposition weight loss muscle building confidence sustainable health fitness habits"
    );
  }

  if (hasAny(normalized, ["home workout", "bahay", "workout sa bahay"])) {
    expansions.push("home workout plans beginner friendly workouts fitness coaching");
  }

  if (hasAny(normalized, ["reservation", "reserve", "reservation assistance"])) {
    expansions.push("reservation process reservation assistance requirements payment reservation programs customer information");
  }

  if (hasAny(normalized, ["house model", "house models", "model", "models", "calista", "unna", "brenna"])) {
    expansions.push("available house models house model information calista mid calista end calista pair unna brenna");
  }

  if (hasAny(normalized, ["site viewing", "viewing", "tripping", "site tripping"])) {
    expansions.push("site viewing site tripping schedules property viewing project location availability appointment");
  }

  if (hasAny(normalized, ["financing", "bank financing", "in-house financing", "payment terms"])) {
    expansions.push("financing options bank financing in-house financing flexible payment terms financing consultation");
  }

  if (isBusinessHoursQuestion(normalized)) {
    expansions.push(
      "business hours opening hours office hours store hours schedule open closed monday tuesday wednesday thursday friday saturday sunday am pm oras bukas sarado nagbubukas"
    );
  }

  return [question, ...expansions].join(" ");
}

function getMergedKnowledge({ pageSettings = {}, pageConfig = {} }) {
  const values = getKnowledgeSourceTexts({ pageSettings, pageConfig })
    .map((value) => removeAiInstructionSections(value))
    .filter(Boolean);

  return Array.from(new Set(values)).join("\n\n");
}

function getKnowledgeSources({ pageSettings = {}, pageConfig = {} }) {
  const clientBusinessDescription = removeAiInstructionSections(pageSettings.business_description);
  const adminKnowledge = removeAiInstructionSections(pageConfig.knowledge);
  const sections = getKnowledgeSections({ pageSettings, pageConfig });

  return {
    clientBusinessDescription,
    adminKnowledge,
    sections,
    combinedKnowledge: getMergedKnowledge({ pageSettings, pageConfig }),
  };
}

function scoreKnowledgeBlock(question = "", block = "") {
  const expandedQuestion = expandKnowledgeQueryText(question);
  const questionTokens = uniqueTokens(expandedQuestion).filter(
    (token) => !["what", "who", "how", "does", "your", "you", "the", "is"].includes(token)
  );
  const blockTokens = new Set(uniqueTokens(block));

  if (questionTokens.length === 0 || blockTokens.size === 0) return 0;

  let matches = 0;
  questionTokens.forEach((token) => {
    if (blockTokens.has(token)) matches += 1;
  });

  return matches / questionTokens.length;
}

function pickAboutKnowledgeBlock({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const overviewSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "businessOverview"
  );
  if (overviewSection) return overviewSection;

  const knowledge = getMergedKnowledge({ pageSettings, pageConfig });
  const blocks = splitKnowledgeBlocks(knowledge);
  if (blocks.length === 0) return "";

  const pageName =
    normalizeText(pageSettings.page_name) || normalizeText(pageConfig.pageName);
  const normalizedPageName = normalizeLower(pageName);

  const identityBlock = blocks.find((block) => {
    const normalized = normalizeLower(block);
    return (
      normalized.includes("identity") ||
      normalized.includes("about") ||
      (normalizedPageName && normalized.includes(normalizedPageName))
    );
  });

  if (identityBlock) return identityBlock;

  return blocks
    .map((block) => ({
      block,
      score: scoreKnowledgeBlock(incomingText, block),
    }))
    .sort((a, b) => b.score - a.score)[0]?.block || "";
}

function pickRelevantKnowledgeBlock({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
  minimumScore = 0.12,
}) {
  const knowledge = getMergedKnowledge({ pageSettings, pageConfig });
  const blocks = splitKnowledgeBlocks(knowledge);
  if (blocks.length === 0) return "";

  const scored = blocks
    .map((block) => ({
      block,
      score: scoreKnowledgeBlock(incomingText, block),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score >= minimumScore) {
    return scored[0].block;
  }

  return "";
}

function pickBusinessHoursKnowledgeBlock({
  pageSettings = {},
  pageConfig = {},
}) {
  const businessHoursSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "businessHours"
  );
  if (businessHoursSection) return businessHoursSection;

  const knowledge = getMergedKnowledge({ pageSettings, pageConfig });
  if (!knowledge) return "";

  const lines = cleanKnowledgeText(knowledge)
    .split(/\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const headingIndex = lines.findIndex((line) =>
    /^\s*(business hours|opening hours|office hours|store hours)\s*:?\s*$/i.test(line)
  );

  if (headingIndex >= 0) {
    const sectionLines = [];

    for (let i = headingIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (
        isLikelyHeadingOnlyBlock(line) &&
        !hasBusinessHoursSignal(line)
      ) {
        break;
      }

      sectionLines.push(line);

      if (sectionLines.length >= 5) {
        break;
      }
    }

    const sectionText = sectionLines.join("\n");
    return hasBusinessHoursSignal(sectionText) &&
      !isTemplatePlaceholderContent(sectionText)
      ? sectionText
      : "";
  }

  const matchedLines = [];
  lines.forEach((line, index) => {
    if (!hasBusinessHoursSignal(line)) return;
    if (/24\/7\s+security/i.test(line) && !hasAny(line, ["business hours", "opening hours", "office hours", "store hours"])) {
      return;
    }

    matchedLines.push(line);

    const nextLine = lines[index + 1];
    if (nextLine && hasBusinessHoursSignal(nextLine)) {
      matchedLines.push(nextLine);
    }
  });

  const matchedText = Array.from(new Set(matchedLines)).join("\n");
  return isTemplatePlaceholderContent(matchedText) ? "" : matchedText;
}

function cleanBusinessHoursText(value = "") {
  const text = normalizeText(value);
  if (!text) return "";

  const labelMatch = text.match(
    /\b(?:business hours|opening hours|office hours|store hours|hours)\s*:/i
  );

  if (labelMatch?.index > 0) {
    return text.slice(labelMatch.index).trim();
  }

  return text;
}

function scoreFaqMatch(question = "", faq = {}) {
  const queryTokens = uniqueTokens(question);
  const faqQuestionTokens = uniqueTokens(faq.question || "");
  const faqKeywords = normalizeArray(faq.keywords).map((keyword) =>
    normalizeLower(keyword)
  );

  if (queryTokens.length === 0 && faqQuestionTokens.length === 0 && faqKeywords.length === 0) {
    return 0;
  }

  let matches = 0;
  queryTokens.forEach((token) => {
    if (faqQuestionTokens.includes(token)) matches += 1;
  });

  const overlapScore = matches / Math.max(queryTokens.length, 1);
  const directQuestionMatch =
    normalizeLower(faq.question) &&
    normalizeLower(question).includes(normalizeLower(faq.question))
      ? 1
      : 0;

  // Spacing-supported keyword phrase match (does not split keyword by space)
  const keywordPhraseMatch = faqKeywords.some((keyword) =>
    normalizeLower(question).includes(keyword)
  )
    ? 0.35
    : 0;

  return Math.min(1, Math.max(overlapScore, directQuestionMatch) + keywordPhraseMatch);
}

function buildFaqReply(faq = {}) {
  return normalizeText(faq.answer);
}

async function localizeKnownReply({
  incomingText = "",
  reply = "",
  context = {},
  generateChatbotReply,
}) {
  const cleanReply = normalizeText(reply);

  return cleanReply;
}

function buildProductsServicesReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const productsServicesSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "productsServices"
  );
  const productsServices =
    productsServicesSection ||
    normalizeText(pageSettings.products_services) ||
    normalizeText(pageConfig.productServices);

  const businessDescription =
    getMergedKnowledge({ pageSettings, pageConfig });

  if (!productsServices && !businessDescription) return "";

  if (productsServices) {
    return [
      isFilipinoStyle(incomingText)
        ? "Ito ang main products/services:"
        : "Main products/services:",
      "",
      formatBulletList(productsServices, {
        maxItems: 16,
        moreLine: isFilipinoStyle(incomingText)
          ? "Pwede mong itanong ang specific service para sa details."
          : "Ask me about a specific service for details.",
      }),
    ].join("\n");
  }

  return [
    isFilipinoStyle(incomingText)
      ? "Ito po ang available na details tungkol sa page namin:"
      : "Here is what this page currently provides:",
    "",
    businessDescription,
  ].join("\n");
}

function buildHouseModelsReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const houseModelsSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "houseModels"
  );
  if (!houseModelsSection) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Ito ang available house models:"
      : "Available house models:",
    "",
    formatBulletList(houseModelsSection, { maxItems: 12 }),
  ].join("\n");
}

function buildBenefitsReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const benefitsSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "keyBenefits"
  );
  if (!benefitsSection) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Ito ang key benefits:"
      : "Key benefits:",
    "",
    formatBulletList(benefitsSection, { maxItems: 12 }),
  ].join("\n");
}

function buildAboutBusinessReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const aboutBlock = pickAboutKnowledgeBlock({
    incomingText,
    pageSettings,
    pageConfig,
  });

  const pageName =
    normalizeText(pageSettings.page_name) ||
    normalizeText(pageConfig.pageName) ||
    "this business";
  const businessType =
    normalizeText(pageSettings.business_type) ||
    normalizeText(pageConfig.businessType);
  const productServices =
    normalizeText(pageSettings.products_services) ||
    normalizeText(pageConfig.productServices);

  if (!aboutBlock) {
    const fallbackParts = [];

    if (businessType) {
      fallbackParts.push(
        isFilipinoStyle(incomingText)
          ? `${pageName} ay nasa ${businessType}.`
          : `${pageName} is a ${businessType}.`
      );
    }

    if (productServices) {
      fallbackParts.push(
        isFilipinoStyle(incomingText)
          ? `Nag-o-offer sila ng: ${productServices}`
          : `They offer: ${productServices}`
      );
    }

    return fallbackParts.join(" ");
  }

  const normalizedAbout = normalizeLower(aboutBlock);
  const alreadyLabeled =
    normalizedAbout.startsWith("about ") ||
    (pageName && normalizedAbout.startsWith(normalizeLower(pageName)));

  if (alreadyLabeled) {
    return aboutBlock;
  }

  return [
    isFilipinoStyle(incomingText)
      ? `Ito po ang tungkol sa ${pageName}:`
      : `About ${pageName}:`,
    "",
    aboutBlock,
  ].join("\n");
}

function buildTopicKnowledgeReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  if (!getKnowledgeTopic(incomingText)) return "";

  const relevantBlock = pickRelevantKnowledgeBlock({
    incomingText,
    pageSettings,
    pageConfig,
  });

  if (!relevantBlock) return "";

  return relevantBlock;
}

function buildPricingReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const pricingSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "pricingPayment"
  );
  const priceRanges =
    pricingSection ||
    normalizeText(pageSettings.product_service_price_ranges) ||
    normalizeText(pageConfig.productServicePriceRanges);

  if (!priceRanges) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Ito po ang available pricing information:"
      : "Here is the available pricing information:",
    "",
    priceRanges,
  ].join("\n");
}

function buildLocationReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const locationSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "locationsCoverage"
  );
  if (!locationSection) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Ito po ang location/coverage info:"
      : "Here is the location/coverage information:",
    "",
    locationSection,
  ].join("\n");
}

function buildContactReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const contactSection = getKnowledgeSection(
    { pageSettings, pageConfig },
    "contactInformation"
  );
  const websiteLink =
    normalizeText(pageSettings.website_link) ||
    normalizeText(pageConfig.websiteLink);

  const contactInfo = contactSection || (websiteLink ? `Website: ${websiteLink}` : "");
  if (!contactInfo) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Ito po ang contact info:"
      : "Here is the contact information:",
    "",
    contactInfo,
  ].join("\n");
}

function buildBookingReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const bookingLink =
    normalizeText(pageSettings.booking_link) ||
    normalizeText(pageSettings.website_link) ||
    normalizeText(pageConfig.websiteLink);

  if (!bookingLink) return "";

  return [
    isFilipinoStyle(incomingText)
      ? "Pwede po kayong mag-book or mag-inquire dito:"
      : "You can book or inquire here:",
    "",
    bookingLink,
  ].join("\n");
}

function buildBusinessHoursReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const relevantBlock = pickBusinessHoursKnowledgeBlock({
    pageSettings,
    pageConfig,
  });

  if (!relevantBlock) return "";

  if (!hasBusinessHoursSignal(relevantBlock)) {
    return "";
  }

  const hoursText = cleanBusinessHoursText(relevantBlock);

  return [
    isFilipinoStyle(incomingText)
      ? "Ito po ang business hours info:"
      : "Here are the business hours:",
    "",
    hoursText,
  ].join("\n");
}

function buildFallbackReply({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  const fallbackMode =
    normalizeText(pageSettings.fallback_mode) || "safe_reply_only";
  const languageStyle = getLanguageStyle(incomingText);

  const bookingLink =
    normalizeText(pageSettings.booking_link) ||
    normalizeText(pageSettings.website_link) ||
    normalizeText(pageConfig.websiteLink);

  const handoffEnabled =
    pageSettings.human_handoff_enabled !== false &&
    fallbackMode !== "booking_only" &&
    fallbackMode !== "safe_reply_only";

  const bookingEnabled =
    Boolean(bookingLink) &&
    fallbackMode !== "handoff_only" &&
    fallbackMode !== "safe_reply_only";

  const unknownReply = buildUnknownReply({ incomingText, pageSettings, pageConfig });
  const customHandoffMessage = normalizeText(pageConfig.handoffMessage);
  return {
    reply: unknownReply,
    shouldHandoff: handoffEnabled,
    bookingCtaSent: bookingEnabled,
  };

  if (languageStyle === "tagalog") {
    if (bookingEnabled && handoffEnabled) {
      return {
        reply: [
          "Wala pa po akong exact answer diyan ngayon.",
          "",
          "Pwede po kayong mag-book dito para ma-assist kayo directly ng team:",
          bookingLink,
          "",
          "Ipa-review ko rin po itong question sa page owner.",
        ].join("\n"),
        shouldHandoff: true,
        bookingCtaSent: true,
      };
    }

    if (bookingEnabled) {
      return {
        reply: [
          "Wala pa po akong exact answer diyan ngayon.",
          "",
          "Pwede po kayong mag-book dito para ma-assist kayo directly ng team:",
          bookingLink,
        ].join("\n"),
        shouldHandoff: false,
        bookingCtaSent: true,
      };
    }

    if (handoffEnabled) {
      return {
        reply: [
          "Wala pa po akong exact answer diyan ngayon.",
          "",
          customHandoffMessage || "Ipa-notify ko po ang page owner para ma-assist kayo. Please wait a moment.",
        ].join("\n"),
        shouldHandoff: true,
        bookingCtaSent: false,
      };
    }

    return {
      reply:
        "Wala pa po akong exact answer diyan ngayon. Ipa-review ko po itong question sa page owner.",
      shouldHandoff: false,
      bookingCtaSent: false,
    };
  }

  if (bookingEnabled && handoffEnabled) {
    return {
      reply: [
        "I don't have the exact answer for that yet.",
        "",
        "You may book a meeting here so the team can assist you directly:",
        bookingLink,
        "",
        "I’ll also notify the page owner about your question.",
      ].join("\n"),
      shouldHandoff: true,
      bookingCtaSent: true,
    };
  }

  if (bookingEnabled) {
    return {
      reply: [
        "I don't have the exact answer for that yet.",
        "",
        "You may book a meeting here so the team can assist you directly:",
        bookingLink,
      ].join("\n"),
      shouldHandoff: false,
      bookingCtaSent: true,
    };
  }

  if (handoffEnabled) {
    return {
      reply: [
        "I don't have the exact answer for that yet.",
        "",
        customHandoffMessage || "I’ll notify the page owner so they can take over this chat. Please wait a moment.",
      ].join("\n"),
      shouldHandoff: true,
      bookingCtaSent: false,
    };
  }

  return {
    reply:
      "I don't have the exact answer for that yet. I’ll make sure this question is reviewed by the page owner.",
    shouldHandoff: false,
    bookingCtaSent: false,
  };
}

function shouldTryKnowledgeFirst(text = "") {
  const normalizedText = normalizeIncomingMessage(text);
  if (!normalizedText) return false;
  if (isSimpleGreeting(normalizedText)) return false;
  if (isSimpleConfirmation(normalizedText)) return false;
  if (isThankYou(normalizedText)) return false;

  return true;
}

async function getPageSettings({
  supabaseClient,
  workspaceId,
  pageId,
  pageConfig = {},
}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const normalizedPageId = normalizePageId(pageId || pageConfig.pageId);

  const fallback = {
    workspace_id: normalizedWorkspaceId,
    page_id: normalizedPageId,
    page_name: pageConfig.pageName || "Facebook Page",
    business_type: pageConfig.businessType || "",
    business_description: pageConfig.knowledge || "",
    products_services: pageConfig.productServices || "",
    product_service_price_ranges: pageConfig.productServicePriceRanges || "",
    website_link: pageConfig.websiteLink || "",
    booking_link: "",
    shoppe_link: pageConfig.shoppeLink || "",
    lazada_link: pageConfig.lazadaLink || "",
    fallback_mode: "booking_and_handoff",
    ai_enabled: true,
    faq_enabled: true,
    suggestions_enabled: true,
    human_handoff_enabled: true,
    owner_notification_enabled: true,
  };

  if (!supabaseClient || !normalizedWorkspaceId || !normalizedPageId) {
    return fallback;
  }

  const { data, error } = await supabaseClient
    .from("client_facebook_page_settings")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("page_id", normalizedPageId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      message: error.message,
    }, "Failed to get client Facebook page settings");
    return fallback;
  }

  const exactMatch = chooseBestPageSettings(data, pageConfig);
  if (exactMatch) return exactMatch;

  const { data: workspaceRows, error: workspaceError } = await supabaseClient
    .from("client_facebook_page_settings")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (workspaceError) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      message: workspaceError.message,
    }, "Failed to get workspace Facebook page settings fallback");
    return fallback;
  }

  return chooseBestPageSettings(workspaceRows, pageConfig) || fallback;
}

async function getActiveFaqs({ supabaseClient, workspaceId }) {
  const normalizedWorkspaceId = normalizeText(workspaceId);

  if (!supabaseClient || !normalizedWorkspaceId) return [];

  const { data, error } = await supabaseClient
    .from("client_faqs")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("status", "active")
    .is("archived_at", null)
    .order("usage_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      message: error.message,
    }, "Failed to get client FAQs");
    return [];
  }

  return Array.isArray(data) ? data : [];
}

async function incrementFaqUsage({ supabaseClient, faq }) {
  if (!supabaseClient || !faq?.id) return null;

  const nextUsageCount = Number(faq.usage_count || 0) + 1;

  const { data, error } = await supabaseClient
    .from("client_faqs")
    .update({
      usage_count: nextUsageCount,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", faq.id)
    .select("*")
    .single();

  if (error) {
    logger.error({
      faqId: faq.id,
      message: error.message,
    }, "Failed to update FAQ usage");
    return null;
  }

  return data;
}

async function callFaqAiSelector({ incomingText, faqs }) {
  if (!process.env.GROQ_API_KEY) {
    logger.warn("GROQ_API_KEY is missing. Skipping AI FAQ matching.");
    return null;
  }

  const model = process.env.FB_PAGE_INTELLIGENCE_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

  // Prepare a slim list of FAQ candidates to keep tokens minimal
  const faqCandidates = faqs.map(faq => ({
    id: faq.id,
    question: faq.question,
    keywords: Array.isArray(faq.keywords) ? faq.keywords : []
  }));

  const messages = [
    {
      role: "system",
      content:
        "You are an AI assistant designed to match a user's question with the most contextually relevant FAQ from a list of FAQs.\n" +
        "You must analyze the meaning, intent, and context of the question (not just word-for-word matching).\n" +
        "Users may write in English, Tagalog, or Taglish (mix of both). Synonyms and colloquial terms should be understood (e.g., 'pinaka mura' or 'murang bahay' refers to the cheapest/lowest price model, 'tripping' refers to site viewing/schedule).\n" +
        "If a specific FAQ is a clear match for the question's intent, select it. If none of the FAQs answer the user's question, return null.\n" +
        "Return JSON format only."
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Select the most contextually relevant FAQ from the list for the user's message.",
        userMessage: incomingText,
        faqs: faqCandidates,
        requiredJsonShape: {
          matchedFaqId: "id-of-the-matched-faq-or-null",
          reasoning: "brief explanation of context matching"
        }
      }, null, 2)
    }
  ];

  try {
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
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      logger.error(`AI FAQ Selector API error (${response.status}): ${details}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    
    try {
      return JSON.parse(content);
    } catch (parseErr) {
      logger.error({ err: parseErr, content }, "Failed to parse AI FAQ Selector response");
      return null;
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to call AI FAQ Selector");
    return null;
  }
}

async function findBestFaqMatch({ supabaseClient, workspaceId, incomingText }) {
  const faqs = await getActiveFaqs({ supabaseClient, workspaceId });
  if (!faqs || faqs.length === 0) {
    return { faq: null, confidence: 0 };
  }

  // 1. Sort/Score via heuristic first
  const scoredFaqs = faqs.map(faq => ({
    faq,
    score: scoreFaqMatch(incomingText, faq)
  })).sort((a, b) => b.score - a.score);

  // 2. Try AI-based context matching if GROQ_API_KEY is available
  if (process.env.GROQ_API_KEY) {
    // Take the top 10 candidates to optimize speed/cost
    const candidates = scoredFaqs.slice(0, 10).map(item => item.faq);
    
    logger.info({ workspaceId, candidatesCount: candidates.length }, "Attempting AI FAQ matching");
    const aiResult = await callFaqAiSelector({ incomingText, faqs: candidates });
    
    if (aiResult && aiResult.matchedFaqId) {
      const matchedFaq = faqs.find(f => f.id === aiResult.matchedFaqId);
      if (matchedFaq) {
        logger.info({ workspaceId, faqId: matchedFaq.id, reasoning: aiResult.reasoning }, "AI FAQ match successful");
        return { faq: matchedFaq, confidence: 0.95 };
      }
    }
    logger.info({ workspaceId }, "AI FAQ match returned no match or failed. Falling back to heuristic match.");
  }

  // 3. Fallback to heuristic match
  const bestMatch = scoredFaqs[0];
  if (!bestMatch || bestMatch.score < 0.45) {
    return { faq: null, confidence: bestMatch ? bestMatch.score : 0 };
  }

  return { faq: bestMatch.faq, confidence: bestMatch.score };
}

async function createOrIncrementFaqSuggestion({
  supabaseClient,
  workspaceId,
  question,
  suggestedAnswer = "",
  sourceConversationId,
  confidence = 0,
}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const normalizedQuestion = normalizeText(question);

  if (!supabaseClient || !normalizedWorkspaceId || !normalizedQuestion) {
    return null;
  }

  const { data: existing, error: existingError } = await supabaseClient
    .from("client_faq_suggestions")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("question", normalizedQuestion)
    .eq("status", "pending")
    .is("archived_at", null)
    .maybeSingle();

  if (existingError) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      message: existingError.message,
    }, "Failed to search FAQ suggestion");
  }

  if (existing?.id) {
    const { data, error } = await supabaseClient
      .from("client_faq_suggestions")
      .update({
        frequency: Number(existing.frequency || 0) + 1,
        suggested_answer:
          normalizeText(existing.suggested_answer) ||
          normalizeText(suggestedAnswer) ||
          null,
        confidence: Math.max(Number(existing.confidence || 0), confidence),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      logger.error({
        suggestionId: existing.id,
        message: error.message,
      }, "Failed to update FAQ suggestion");
      return existing;
    }

    return data;
  }

  const { data, error } = await supabaseClient
    .from("client_faq_suggestions")
    .insert({
      workspace_id: normalizedWorkspaceId,
      question: normalizedQuestion,
      suggested_answer: normalizeText(suggestedAnswer) || null,
      source: "facebook_ai",
      source_conversation_id: normalizeText(sourceConversationId) || null,
      frequency: 1,
      confidence,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      message: error.message,
    }, "Failed to create FAQ suggestion");
    return null;
  }

  return data;
}

async function recordAnalyticsEvent({
  supabaseClient,
  workspaceId,
  pageId,
  event,
}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const normalizedPageId = normalizePageId(pageId);

  if (!supabaseClient || !normalizedWorkspaceId) return null;

  const today = new Date().toISOString().slice(0, 10);

  let query = supabaseClient
    .from("client_facebook_analytics")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("snapshot_date", today);

  query = normalizedPageId
    ? query.eq("page_id", normalizedPageId)
    : query.is("page_id", null);

  const { data: existing, error: existingError } = await query.maybeSingle();

  if (existingError) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      message: existingError.message,
    }, "Failed to search Facebook analytics snapshot");
  }

  const allowedCounters = new Set([
    "total_conversations",
    "qualified_leads",
    "contacts_created",
    "leads_created",
    "faq_hits",
    "knowledge_hits",
    "unanswered_questions",
    "human_handoffs",
    "booking_cta_sent",
  ]);

  if (!allowedCounters.has(event)) {
    return existing || null;
  }

  if (existing?.id) {
    const { data, error } = await supabaseClient
      .from("client_facebook_analytics")
      .update({
        [event]: Number(existing[event] || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      logger.error({
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        event,
        message: error.message,
      }, "Failed to update Facebook analytics snapshot");
      return existing;
    }

    return data;
  }

  const initialPayload = {
    workspace_id: normalizedWorkspaceId,
    page_id: normalizedPageId || null,
    snapshot_date: today,
    total_conversations: 0,
    qualified_leads: 0,
    contacts_created: 0,
    leads_created: 0,
    faq_hits: 0,
    knowledge_hits: 0,
    unanswered_questions: 0,
    human_handoffs: 0,
    booking_cta_sent: 0,
    [event]: 1,
  };

  const { data, error } = await supabaseClient
    .from("client_facebook_analytics")
    .insert(initialPayload)
    .select("*")
    .single();

  if (error) {
    logger.error({
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      event,
      message: error.message,
    }, "Failed to create Facebook analytics snapshot");
    return null;
  }

  return data;
}

async function answerFromPageKnowledge({
  incomingText,
  pageSettings,
  pageConfig,
}) {
  if (isWebsiteLinkQuestion(incomingText)) {
    return {
      handled: true,
      reply: buildSingleLinkReply({
        label: "Website",
        incomingText,
        link:
          normalizeText(pageSettings.website_link) ||
          normalizeText(pageConfig.websiteLink),
      }),
      source: "page_website_link",
    };
  }

  if (isShopeeLinkQuestion(incomingText)) {
    return {
      handled: true,
      reply: buildSingleLinkReply({
        label: "Shopee",
        incomingText,
        link:
          normalizeText(pageSettings.shoppe_link) ||
          normalizeText(pageConfig.shoppeLink),
      }),
      source: "page_shopee_link",
    };
  }

  if (isLazadaLinkQuestion(incomingText)) {
    return {
      handled: true,
      reply: buildSingleLinkReply({
        label: "Lazada",
        incomingText,
        link:
          normalizeText(pageSettings.lazada_link) ||
          normalizeText(pageConfig.lazadaLink),
      }),
      source: "page_lazada_link",
    };
  }

  if (hasAny(incomingText, ["links", "link", "where can i buy", "saan makakabili"])) {
    const reply = buildLinksReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_links",
      };
    }
  }

  if (isBusinessHoursQuestion(incomingText)) {
    const businessHoursSection = getKnowledgeSection(
      { pageSettings, pageConfig },
      "businessHours"
    );
    logger.info("[facebookKnowledge] business hours lookup", {
      pageId:
        normalizePageId(pageSettings.page_id) ||
        normalizePageId(pageConfig.pageId),
      pageName:
        normalizeText(pageSettings.page_name) ||
        normalizeText(pageConfig.pageName),
      hasBusinessDescription: Boolean(normalizeText(pageSettings.business_description)),
      businessDescriptionLength: normalizeText(pageSettings.business_description).length,
      hasAdminKnowledge: Boolean(normalizeText(pageConfig.knowledge)),
      adminKnowledgeLength: normalizeText(pageConfig.knowledge).length,
      hasBusinessHoursSection: Boolean(businessHoursSection),
      businessHoursSectionLength: businessHoursSection.length,
    });

    const reply = buildBusinessHoursReply({
      incomingText,
      pageSettings,
      pageConfig,
    });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_business_hours",
      };
    }

    return {
      handled: true,
      reply: buildUnknownReply({ incomingText, pageSettings, pageConfig }),
      source: "fallback_missing_business_hours",
      shouldHandoff: true,
      bookingCtaSent: Boolean(
        normalizeText(pageSettings.website_link) ||
          normalizeText(pageConfig.websiteLink)
      ),
    };
  }

  if (isLocationQuestion(incomingText)) {
    const reply = buildLocationReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_location",
      };
    }
  }

  if (isContactQuestion(incomingText)) {
    const reply = buildContactReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_contact",
      };
    }
  }

  if (isHouseModelsQuestion(incomingText)) {
    const reply = buildHouseModelsReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_house_models",
      };
    }
  }

  if (isBenefitsQuestion(incomingText)) {
    const reply = buildBenefitsReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_key_benefits",
      };
    }
  }

  const topicReply = buildTopicKnowledgeReply({
    incomingText,
    pageSettings,
    pageConfig,
  });

  if (topicReply) {
    return {
      handled: true,
      reply: topicReply,
      source: "page_knowledge_topic",
    };
  }

  if (isProductsServicesQuestion(incomingText)) {
    const reply = buildProductsServicesReply({
      incomingText,
      pageSettings,
      pageConfig,
    });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_products_services",
      };
    }
  }

  if (isAboutBusinessQuestion(incomingText)) {
    const reply = buildAboutBusinessReply({
      incomingText,
      pageSettings,
      pageConfig,
    });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_about_business",
      };
    }
  }

  if (isPricingQuestion(incomingText)) {
    const reply = buildPricingReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_pricing",
      };
    }
  }

  if (isBookingQuestion(incomingText)) {
    const reply = buildBookingReply({ incomingText, pageSettings, pageConfig });

    if (reply) {
      return {
        handled: true,
        reply,
        source: "page_booking",
        bookingCtaSent: true,
      };
    }
  }

  return {
    handled: false,
    reply: "",
    source: "",
  };
}

function buildAiKnowledgeContext({ pageSettings = {}, pageConfig = {} }) {
  const knowledgeSources = getKnowledgeSources({ pageSettings, pageConfig });
  const sectionLines = Object.entries(knowledgeSources.sections || {})
    .filter(([key]) => key !== "aiInstructions" && key !== "followUpQuestions")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");
  const followUpQuestions = normalizeText(
    knowledgeSources.sections?.followUpQuestions
  );
  const context = {
    pageName:
      normalizeText(pageSettings.page_name) ||
      normalizeText(pageConfig.pageName),
    businessType:
      normalizeText(pageSettings.business_type) ||
      normalizeText(pageConfig.businessType),
    productServices:
      normalizeText(pageSettings.products_services) ||
      normalizeText(pageConfig.productServices),
    productServicePriceRanges:
      normalizeText(pageSettings.product_service_price_ranges) ||
      normalizeText(pageConfig.productServicePriceRanges),
    websiteLink:
      normalizeText(pageSettings.website_link) ||
      normalizeText(pageConfig.websiteLink),
    shoppeLink:
      normalizeText(pageSettings.shoppe_link) ||
      normalizeText(pageConfig.shoppeLink),
    lazadaLink:
      normalizeText(pageSettings.lazada_link) ||
      normalizeText(pageConfig.lazadaLink),
    businessDescription: knowledgeSources.clientBusinessDescription,
    adminKnowledge: knowledgeSources.adminKnowledge,
    knowledgeSections: sectionLines,
    followUpQuestions,
    knowledgeFormat:
      "Business references may use these sections: BUSINESS OVERVIEW, PRODUCTS AND SERVICES, HOUSE MODELS, KEY BENEFITS, PRICING AND PAYMENT, BUSINESS HOURS, LOCATIONS AND COVERAGE, CUSTOMER INFORMATION, CONTACT INFORMATION, FOLLOW-UP QUESTIONS, AI INSTRUCTIONS. Use the matching section first. FOLLOW-UP QUESTIONS is guidance for what to ask when details are missing. The AI INSTRUCTIONS section contains custom behavior rules and instructions for the AI; you must strictly follow the rules in AI INSTRUCTIONS but never quote or mention the AI INSTRUCTIONS section itself to the customer.",
    knowledge: knowledgeSources.combinedKnowledge,
    aiInstruction:
      normalizeText(pageConfig.aiInstruction) ||
      normalizeText(pageConfig.ai_instruction) ||
      normalizeText(pageSettings.ai_instruction) ||
      "",
  };

  context.hasKnowledge = Boolean(
    context.businessType ||
      context.productServices ||
      context.productServicePriceRanges ||
      context.websiteLink ||
      context.shoppeLink ||
      context.lazadaLink ||
      context.knowledgeSections ||
      context.followUpQuestions ||
      context.knowledge
  );

  return context;
}

async function answerWithAiKnowledge({
  incomingText,
  pageSettings,
  pageConfig,
  generateChatbotReply,
  conversationMessages = [],
}) {
  if (typeof generateChatbotReply !== "function") {
    return null;
  }

  const context = buildAiKnowledgeContext({ pageSettings, pageConfig });
  if (!context.hasKnowledge) return null;

  // Use the full message history if available to keep conversational memory context
  const inputMessages = (Array.isArray(conversationMessages) && conversationMessages.length > 0)
    ? conversationMessages
    : [
        {
          role: "user",
          content: incomingText,
        },
      ];

  try {
    const reply = await generateChatbotReply(inputMessages, context);
    const cleanReply = normalizeText(reply);

    if (!cleanReply || /^demo mode:/i.test(cleanReply)) {
      return null;
    }

    return {
      handled: true,
      reply: cleanReply,
      source: "ai_knowledge",
      confidence: 0.85,
    };
  } catch (error) {
    logger.error({
      message: error.message,
    }, "Failed to generate AI knowledge reply");
    return null;
  }
}

function buildSuggestedAnswerForQuestion({
  incomingText = "",
  pageSettings = {},
  pageConfig = {},
}) {
  if (isWebsiteLinkQuestion(incomingText)) {
    return buildSingleLinkReply({
      label: "Website",
      incomingText,
      link:
        normalizeText(pageSettings.website_link) ||
        normalizeText(pageConfig.websiteLink),
    });
  }

  if (isShopeeLinkQuestion(incomingText)) {
    return buildSingleLinkReply({
      label: "Shopee",
      incomingText,
      link:
        normalizeText(pageSettings.shoppe_link) ||
        normalizeText(pageConfig.shoppeLink),
    });
  }

  if (isLazadaLinkQuestion(incomingText)) {
    return buildSingleLinkReply({
      label: "Lazada",
      incomingText,
      link:
        normalizeText(pageSettings.lazada_link) ||
        normalizeText(pageConfig.lazadaLink),
    });
  }

  if (isPricingQuestion(incomingText)) {
    return buildPricingReply({ incomingText, pageSettings, pageConfig });
  }

  if (isProductsServicesQuestion(incomingText)) {
    return buildProductsServicesReply({ incomingText, pageSettings, pageConfig });
  }

  const topicReply = buildTopicKnowledgeReply({
    incomingText,
    pageSettings,
    pageConfig,
  });

  if (topicReply) return topicReply;

  if (isAboutBusinessQuestion(incomingText)) {
    return buildAboutBusinessReply({ incomingText, pageSettings, pageConfig });
  }

  const relevantKnowledge = pickRelevantKnowledgeBlock({
    incomingText,
    pageSettings,
    pageConfig,
  });

  return relevantKnowledge;
}

function createFacebookKnowledgeManager({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookKnowledgeManager.");
  }
  async function resolveKnowledgeReply({
    workspaceId,
    pageId,
    incomingText,
    pageConfig = {},
    conversationId = "",
    compactFacebookReply,
    generateChatbotReply,
    recordAnalytics = true,
    conversationMessages = [],
  }) {
    const normalizedWorkspaceId = normalizeText(workspaceId);
    const normalizedPageId = normalizePageId(pageId || pageConfig.pageId);
    const cleanText = normalizeIncomingMessage(incomingText);

    const pageSettings = await getPageSettings({
      supabaseClient,
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      pageConfig,
    });

    if (pageSettings.faq_enabled !== false) {
      const { faq, confidence } = await findBestFaqMatch({
        supabaseClient,
        workspaceId: normalizedWorkspaceId,
        incomingText: cleanText,
      });

      if (faq?.id) {
        if (recordAnalytics) {
          await incrementFaqUsage({ supabaseClient, faq });

          await recordAnalyticsEvent({
            supabaseClient,
            workspaceId: normalizedWorkspaceId,
            pageId: normalizedPageId,
            event: "faq_hits",
          });
        }

        const reply = await localizeKnownReply({
          incomingText: cleanText,
          reply: buildFaqReply(faq),
          context: buildAiKnowledgeContext({ pageSettings, pageConfig }),
          generateChatbotReply,
        });

        return {
          handled: Boolean(reply),
          reply:
            typeof compactFacebookReply === "function"
              ? compactFacebookReply(reply)
              : reply,
          source: "faq",
          confidence,
          faq,
          shouldHandoff: false,
          bookingCtaSent: false,
        };
      }
    }

    if (pageSettings.ai_enabled === false) {
      return {
        handled: false,
        reply: "",
        source: "",
        shouldHandoff: false,
        bookingCtaSent: false,
      };
    }

    // 1. Try conversational AI lookup first (highly adaptive, multilingual, has conversation memory context)
    const aiKnowledgeResult = await answerWithAiKnowledge({
      incomingText: cleanText,
      pageSettings,
      pageConfig,
      generateChatbotReply,
      conversationMessages,
    });

    if (aiKnowledgeResult?.handled && aiKnowledgeResult.reply) {
      if (recordAnalytics) {
        await recordAnalyticsEvent({
          supabaseClient,
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          event: "knowledge_hits",
        });
      }

      const reply =
        typeof compactFacebookReply === "function"
          ? compactFacebookReply(aiKnowledgeResult.reply)
          : aiKnowledgeResult.reply;

      return {
        ...aiKnowledgeResult,
        reply,
        pageSettings,
        shouldHandoff: false,
        bookingCtaSent: false,
      };
    }

    // 2. Fallback to rigid rules-based page knowledge matching if AI returned null
    const pageKnowledgeResult = await answerFromPageKnowledge({
      incomingText: cleanText,
      pageSettings,
      pageConfig,
    });

    if (pageKnowledgeResult.handled) {
      if (recordAnalytics) {
        await recordAnalyticsEvent({
          supabaseClient,
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          event: "knowledge_hits",
        });

        if (pageKnowledgeResult.bookingCtaSent) {
          await recordAnalyticsEvent({
            supabaseClient,
            workspaceId: normalizedWorkspaceId,
            pageId: normalizedPageId,
            event: "booking_cta_sent",
          });
        }
      }

      const reply =
        typeof compactFacebookReply === "function"
          ? compactFacebookReply(pageKnowledgeResult.reply)
          : pageKnowledgeResult.reply;

      return {
        ...pageKnowledgeResult,
        reply,
        confidence: 0.65,
        pageSettings,
      };
    }

    // 3. Fallback to topic knowledge or raw matching
    const localKnowledgeReply =
      buildTopicKnowledgeReply({
        incomingText: cleanText,
        pageSettings,
        pageConfig,
      }) ||
      (isAboutBusinessQuestion(cleanText)
        ? buildAboutBusinessReply({
            incomingText: cleanText,
            pageSettings,
            pageConfig,
          })
        : pickRelevantKnowledgeBlock({
            incomingText: cleanText,
            pageSettings,
            pageConfig,
            minimumScore: 0.2,
          }));

    if (localKnowledgeReply) {
      if (recordAnalytics) {
        await recordAnalyticsEvent({
          supabaseClient,
          workspaceId: normalizedWorkspaceId,
          pageId: normalizedPageId,
          event: "knowledge_hits",
        });
      }

      const reply =
        typeof compactFacebookReply === "function"
          ? compactFacebookReply(localKnowledgeReply)
          : localKnowledgeReply;

      return {
        handled: true,
        reply,
        source: "page_knowledge_excerpt",
        confidence: 0.6,
        pageSettings,
        shouldHandoff: false,
        bookingCtaSent: false,
      };
    }

    // AI and fallback knowledge lookups failed to match anything
    return {
      handled: false,
      reply: "",
      source: "",
      shouldHandoff: false,
      bookingCtaSent: false,
    };

    if (recordAnalytics && pageSettings.suggestions_enabled !== false) {
      const suggestedAnswer = buildSuggestedAnswerForQuestion({
        incomingText: cleanText,
        pageSettings,
        pageConfig,
      });

      await createOrIncrementFaqSuggestion({
        supabaseClient,
        workspaceId: normalizedWorkspaceId,
        question: cleanText,
        suggestedAnswer,
        sourceConversationId: conversationId,
        confidence: 0,
      });
    }

    if (recordAnalytics) {
      await recordAnalyticsEvent({
        supabaseClient,
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        event: "unanswered_questions",
      });
    }

    const fallback = buildFallbackReply({
      incomingText: cleanText,
      pageSettings,
      pageConfig,
    });

    if (recordAnalytics && fallback.shouldHandoff) {
      await recordAnalyticsEvent({
        supabaseClient,
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        event: "human_handoffs",
      });
    }

    if (recordAnalytics && fallback.bookingCtaSent) {
      await recordAnalyticsEvent({
        supabaseClient,
        workspaceId: normalizedWorkspaceId,
        pageId: normalizedPageId,
        event: "booking_cta_sent",
      });
    }

    return {
      handled: true,
      reply:
        typeof compactFacebookReply === "function"
          ? compactFacebookReply(fallback.reply)
          : fallback.reply,
      source: "fallback",
      confidence: 0,
      shouldHandoff: fallback.shouldHandoff,
      bookingCtaSent: fallback.bookingCtaSent,
      pageSettings,
    };
  }

  return {
    createOrIncrementFaqSuggestion,
    findBestFaqMatch,
    getActiveFaqs,
    getPageSettings,
    recordAnalyticsEvent,
    resolveKnowledgeReply,
  };
}

module.exports = {
  buildBusinessHoursReply,
  buildProductsServicesReply,
  createFacebookKnowledgeManager,
  getPageSettings,
  isLikelyQuestion,
  pickBusinessHoursKnowledgeBlock,
  shouldTryKnowledgeFirst,
};
