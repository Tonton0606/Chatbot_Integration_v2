/**
 * Referral / Ad context for Facebook chat.
 *
 * Click-to-Messenger ads, m.me ref links, and the website chat plugin all attach
 * a `referral` object to the opening event (standalone `referral`, `message.referral`,
 * or `postback.referral`). This module turns that raw signal into:
 *   - a normalized referral
 *   - a real CRM source tag (so leads are attributed to the ad/campaign, not just "facebook")
 *   - a natural, human-sounding first-contact opener that picks up where the
 *     prospect came from instead of a generic "How can we help?"
 *
 * Goal: make ad/page/link entries feel like a person who already knows the
 * context — not a cold bot.
 */

const { isFilipinoStyle } = require("./facebookReplyUtils");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Extract the referral object regardless of which event shape Meta used. */
function parseReferral(event = {}) {
  const raw =
    event?.referral ||
    event?.message?.referral ||
    event?.postback?.referral ||
    null;

  if (!raw) return null;

  const referral = {
    ref: normalizeText(raw.ref),
    adId: normalizeText(raw.ad_id),
    source: normalizeText(raw.source), // ADS | SHORTLINK | CUSTOMER_CHAT_PLUGIN | ...
    type: normalizeText(raw.type),
  };

  // Nothing useful — treat as no referral.
  if (!referral.ref && !referral.adId && !referral.source) {
    return null;
  }

  return referral;
}

/** Map a referral to a CRM-friendly source tag. */
function deriveInquirySource(referral) {
  if (!referral) return "";

  if (referral.adId) return `facebook_ad:${referral.adId}`;
  if (referral.source === "ADS") return "facebook_ad";
  if (referral.source === "SHORTLINK") {
    return referral.ref ? `m.me:${referral.ref}` : "m.me";
  }
  if (referral.source === "CUSTOMER_CHAT_PLUGIN") return "website_chat";
  if (referral.ref) return `facebook_ref:${referral.ref}`;

  return "facebook";
}

/** True when this lead clicked a paid ad (treat as higher intent). */
function isAdReferral(referral) {
  return Boolean(referral && (referral.adId || referral.source === "ADS"));
}

/**
 * Infer the topic the prospect arrived for, from the ref payload you set on the
 * ad/link (e.g. ref="pricing_promo", "free_demo", "automation"). Falls back to "".
 */
function inferTopicFromRef(ref = "") {
  const r = normalizeText(ref).toLowerCase();
  if (!r) return "";
  if (/(pric|presyo|magkano|rate|cost|package|promo|discount|sale)/.test(r)) return "pricing";
  if (/(demo|consult|book|appointment|meeting|trial)/.test(r)) return "demo";
  if (/(auto|chatbot|crm|lead|order|message|inquir)/.test(r)) return "automation";
  return "";
}

/**
 * Build a warm, natural first-contact opener for ad/link leads. Returns null for
 * organic page DMs (let the normal engine greet). The copy intentionally avoids
 * robotic phrasing and invites a specific next step.
 */
function buildAdContextGreeting({ referral, pageConfig = {}, incomingText = "" }) {
  if (!referral) return null;

  const pageName = normalizeText(pageConfig.pageName) || "us";
  const isFilipino = isFilipinoStyle(incomingText);
  const fromAd = isAdReferral(referral);
  const topic = inferTopicFromRef(referral.ref);

  const topicLine = (() => {
    if (topic === "pricing") {
      return isFilipino
        ? "Mukhang interesado kayo sa pricing namin — masaya akong i-walk through kayo. 😊"
        : "Looks like you're curious about our pricing — happy to walk you through it. 😊";
    }
    if (topic === "demo") {
      return isFilipino
        ? "Gusto niyo po yatang makakita ng demo — kaya nating ayusin yan. 😊"
        : "Seems you'd like to see a demo — we can set that up. 😊";
    }
    if (topic === "automation") {
      return isFilipino
        ? "Interesado po kayo sa automation setup — perpekto, tutulungan ko kayo. 😊"
        : "You're interested in automation — perfect, I can help with that. 😊";
    }
    return "";
  })();

  const intro = fromAd
    ? isFilipino
      ? `Hi po! Salamat sa pag-click sa aming ad. 👋`
      : `Hi there! Thanks for checking out our ad. 👋`
    : isFilipino
      ? `Hi po! Salamat sa pagbisita sa ${pageName}. 👋`
      : `Hi! Thanks for reaching out to ${pageName}. 👋`;

  const ask = isFilipino
    ? "Para mabigyan ko kayo agad ng tamang sagot — ano po ang pinaka-gusto ninyong malaman?"
    : "So I can point you to the right answer fast — what would you like to know first?";

  return [intro, topicLine, ask].filter(Boolean).join(" ");
}

/** Quick replies to pair with the opener, biased to the inferred topic. */
function buildReferralQuickReplies(referral) {
  const topic = inferTopicFromRef(referral?.ref);
  const all = [
    { title: "See pricing", payload: "pricing" },
    { title: "Book a demo", payload: "demo" },
    { title: "Talk to a human", payload: "human" },
  ];
  if (!topic) return all;
  // Lead with the topic they came for.
  const lead = all.filter((qr) => qr.payload === topic);
  const rest = all.filter((qr) => qr.payload !== topic);
  return [...lead, ...rest];
}

module.exports = {
  parseReferral,
  deriveInquirySource,
  isAdReferral,
  inferTopicFromRef,
  buildAdContextGreeting,
  buildReferralQuickReplies,
};
