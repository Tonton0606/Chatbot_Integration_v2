function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\?]/gu, " ") // keep alphanumeric, spaces, and question marks
    .replace(/\s+/g, " ");
}

const TAGALOG_INDICATORS = [
  "ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo",
  "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo",
  "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong",
  "serbisyo", "produkto", "inyo", "kausap", "tao", "ba", "ito", "dito",
  "amg", "ang", "amings", "aming"
];

/**
 * Checks if the text has Tagalog/Filipino style vocabulary.
 */
function isTagalogStyle(text) {
  const normalized = normalizeText(text);
  let matchCount = 0;
  for (const word of TAGALOG_INDICATORS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
    if (regex.test(normalized)) {
      matchCount++;
      if (matchCount >= 1) return true; // even 1 match is highly indicative in typical queries
    }
  }
  return false;
}

/**
 * Detects if the incoming message text indicates a request for human support.
 * Covers both English and Tagalog requests.
 * @param {string} text - The raw incoming message text.
 * @returns {boolean} - True if a human request is detected.
 */
function isHumanHandoffRequest(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  // English Keywords and Phrases
  const englishPhrases = [
    "need a human",
    "need human",
    "human please",
    "representative",
    "agent",
    "customer service",
    "customer support",
    "customer care",
    "real person",
    "live person",
    "actual person",
    "talk to someone",
    "speak with someone",
    "talk to a person",
    "speak with a person",
    "talk to a human",
    "speak with a human",
    "talk to an agent",
    "speak with an agent",
    "admin",
    "staff",
    "support representative",
    "talk to a live",
    "speak to a live",
    "human assistance",
    "human rep",
    "talk to representative",
    "speak to representative"
  ];

  // Tagalog Keywords and Phrases
  const tagalogPhrases = [
    "tao kausap",
    "makausap na tao",
    "makausap na representative",
    "may tao ba",
    "may tao po ba",
    "may tao ba dito",
    "may makausap ba",
    "may makausap po ba",
    "may makakausap ba",
    "may makakausap po ba",
    "may pwede ba makausap",
    "may pwede po ba makausap",
    "may puwede ba makausap",
    "may puwede po ba makausap",
    "may pwede ba ako makausap",
    "may pwede po ba akong makausap",
    "may pwede ba akong makausap",
    "may puwede ba ako makausap",
    "may puwede po ba akong makausap",
    "may puwede ba akong makausap",
    "pwede ba ako makausap",
    "pwede po ba akong makausap",
    "pwede ba akong makausap",
    "puwede ba ako makausap",
    "puwede po ba akong makausap",
    "puwede ba akong makausap",
    "pwede ko ba makausap",
    "pwede ko po ba makausap",
    "pwede ko bang makausap",
    "pwede ko po bang makausap",
    "representative po",
    "admin po",
    "agent po",
    "kausap customer service",
    "kausap customer support",
    "makausap po na tao",
    "pwede bang may makausap na tao",
    "pede bang may makausap na tao",
    "puwede bang may makausap na tao",
    "may representative ba",
    "may representative po ba",
    "kausap po",
    "tao po",
    "magkausap ng tao",
    "gusto ko ng tao kausap",
    "gusto ko makausap ang admin",
    "makausap ang staff",
    "makausap ang representative",
    "makakausap ang admin",
    "makakausap ang staff",
    "makakausap ang representative"
  ];

  // 1. Direct phrase matching
  for (const phrase of englishPhrases) {
    if (normalized.includes(phrase)) {
      return true;
    }
  }

  for (const phrase of tagalogPhrases) {
    if (normalized.includes(phrase)) {
      return true;
    }
  }

  // 2. Regular Expression Intent Detection
  // Matches "can i talk to someone", "can i speak with a human", etc.
  const talkToSomeoneRegex = /\b(can|could|may|want|need|wish|should)\s+(i|we)?\s*(talk|speak|chat|connect|communicate)\s*(to|with|g)\s*(someone|somebody|some\s+one|person|human|agent|rep|representative|staff|admin|support)\b/i;
  if (talkToSomeoneRegex.test(normalized)) {
    return true;
  }

  // Tagalog regular expression matching
  // Matches "gusto ko makausap ang tao", "pwedeng makausap ang admin", etc.
  const tagalogTalkRegex = /\b(makausap|makakausap|kausap|makipag-usap|makipagusap|gustong\s+makausap|gustong\s+makakausap)\s*(po|ba)?\s*(sa|ang|ng)?\s*(tao|admin|representative|agent|staff|customer\s+service|cs)\b/i;
  if (tagalogTalkRegex.test(normalized)) {
    return true;
  }

  // Tagalog query about human presence: "meron bang tao", "may makakausap po ba"
  const tagalogPresenceRegex = /\b(may|meron|merong|mays|mayroon|mayroong)\s*(po|ba)?\s*(bang|na|pwede|pede|puwede)?\s*(po|ba)?\s*(tao|makausap|makakausap|representative|agent|admin|staff)\b/i;
  if (tagalogPresenceRegex.test(normalized)) {
    return true;
  }

  // Word boundary matches for single-word indicators
  const singleWords = [
    "representative",
    "agent",
    "representative po",
    "agent po",
    "admin",
    "admin po",
    "staff",
    "staff po"
  ];
  for (const word of singleWords) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  isHumanHandoffRequest,
  isTagalogStyle,
  normalizeText
};
