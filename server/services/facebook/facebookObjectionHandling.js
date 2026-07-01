/**
 * Objection Handling System for Facebook Chatbot
 * Handles common sales objections with intelligent, contextual responses
 */

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const { isFilipinoStyle } = require("./facebookReplyUtils");

function detectObjectionType(text = "", pageConfig = {}) {
  const message = normalizeText(text).toLowerCase();
  
  // Use configurable objection patterns if available
  const customPatterns = pageConfig?.businessLogicSettings?.objectionPatterns;
  
  if (customPatterns && typeof customPatterns === "object") {
    // Check each objection type with custom patterns
    for (const [objectionType, patterns] of Object.entries(customPatterns)) {
      if (Array.isArray(patterns)) {
        const patternRegex = new RegExp(patterns.join("|"), "i");
        if (patternRegex.test(message)) {
          return objectionType;
        }
      }
    }
  }

  // Fall back to default patterns
  // Price objections
  if (
    /(mahal|gastos|budget|pera|walang pondo|walang pera|expensive|costly|pricey|too much|di ko afford|di ko kaya|hindi ko afford|hindi ko kaya|cheaper|bawas|discount|sale|promo)/i.test(message)
  ) {
    return "price_objection";
  }

  // Stalling / "I'll think about it"
  if (
    /(i'll think|think about it|consider|i'll consider|mamimili|magsusuri|review|check|i'll get back|balik|follow up|follow-up|next time|mamaya|bukas|later|mamaya na|after|soon)/i.test(message)
  ) {
    return "stall_objection";
  }

  // "Send details first"
  if (
    /(send details|send info|email me|text me|message me|details first|info first|brochure|catalog|pamphlet|ipadala|send|paki send|paki-text|paki-email)/i.test(message)
  ) {
    return "details_request";
  }

  // Trust / legitimacy concerns
  if (
    /(legit|legitimate|scam|fake|trust|tiwala|nagdadalawang isip|doubt|sigurado|siguradong|prove|proba|testimonials|reviews|ref|referral|nagkaroon|nagka)/i.test(message)
  ) {
    return "trust_objection";
  }

  // Competitor comparison
  if (
    /(other|iba|competitor|kumpetisyon|cheaper elsewhere|mas mura|other option|kumuha na lang|kumuha sa|try other|check other)/i.test(message)
  ) {
    return "competitor_objection";
  }

  // Timing / not ready
  if (
    /(not ready|hindi pa|too early|mamaya pa|next month|next year|busy|occupied|no time|walang oras|hindi oras)/i.test(message)
  ) {
    return "timing_objection";
  }

  // Authority / need to ask someone
  if (
    /(ask my|consult|partner|spouse|boss|manager|team|pamilya|asawa|magulang|kumonsulta|tanungin)/i.test(message)
  ) {
    return "authority_objection";
  }

  return null;
}

function buildPriceObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "we";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");
  const leadData = data.pendingLeadData || data.confirmedLeadData || {};
  const interest = normalizeText(leadData.productOrServiceWanted) || "our services";
  const businessType = normalizeText(leadData.businessType) || "your business";

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Naiintindihan ko po na may concern sa budget! 😊`,
        "",
        `Para sa ${businessType} na gusto niyo ng ${interest}, may mga option po kaming pwedeng i-customize depende sa kailangan niyo.`,
        "",
        `Halimbawa, kung nag-start lang po kayo, may starter package po kami na mas mura. Pag tumataas na ang volume, pwede na kayong mag-upgrade.`,
        "",
        `Gusto niyo po bang mag-book ng FREE consultation para makita natin yung best fit para sa inyo?`,
        "",
        `O kaya, pwede ko po i-send yung detailed pricing breakdown para ma-review niyo nang maayos.`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `I completely understand budget concerns! 😊`,
      "",
      `For ${businessType} looking for ${interest}, we have flexible options that can be customized to your needs.`,
      "",
      `For example, if you're just starting out, we have starter packages at lower rates. As your volume grows, you can always upgrade.`,
      "",
      `Would you like to book a FREE consultation so we can find the best fit for your budget?`,
      "",
      `Or I can send you a detailed pricing breakdown for you to review at your convenience.`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildStallObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "we";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");
  const leadData = data.pendingLeadData || data.confirmedLeadData || {};
  const interest = normalizeText(leadData.productOrServiceWanted) || "our services";

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Sige po, no rush! 😊`,
        "",
        `Pero baka helpful lang ito: Marami pong nag-iisip na 2-3 days bago mag-decide, at ang pinaka-common na reason kaya sila nag-decide na kumuha ay nakita nilang clear ang value.`,
        "",
        `Para hindi niyo makalimutan, pwede ko po kayong i-add sa priority list namin para may dedicated follow-up kami.`,
        "",
        `Anong best way para ma-follow-up kayo?`,
        `1. Call/text sa number na ibigay niyo`,
        `2. Message dito sa Messenger`,
        `3. Email`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `No rush at all! 😊`,
      "",
      `Just a helpful tip: Many customers take 2-3 days to decide, and the #1 reason they finally move forward is when they see the clear value for their specific situation.`,
      "",
      `So you don't forget about this, I can add you to our priority follow-up list for dedicated attention.`,
      "",
      `What's the best way to follow up with you?`,
      `1. Call/text to your number`,
      `2. Message here on Messenger`,
      `3. Email`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildDetailsRequestResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "we";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");
  const productsOrServices = normalizeText(pageConfig.productServices);
  const priceRanges = normalizeText(pageConfig.productServicePriceRanges);
  const websiteLink = normalizeText(pageConfig.websiteLink);

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Oo naman! Ipapadala ko po ang complete details. 😊`,
        "",
        productsOrServices ? `Mga Alok:\n${productsOrServices}` : "",
        priceRanges ? `Price Range:\n${priceRanges}` : "",
        "",
        `Para mas detailed, pwede niyo po ring i-check ang website namin:`,
        websiteLink || "I'll send the link shortly!",
        "",
        `Kung may specific question po kayo after niyo basahin, I'm here to help!`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `Absolutely! Let me send you the complete details. 😊`,
      "",
      productsOrServices ? `Our Offers:\n${productsOrServices}` : "",
      priceRanges ? `Price Range:\n${priceRanges}` : "",
      "",
      `For more detailed information, you can also check our website:`,
      websiteLink || "I'll send the link shortly!",
      "",
      `Feel free to ask me any questions after you've reviewed everything!`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildTrustObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "us";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");
  // pageConfig.socialProofText: optional newline-separated list of trust points
  // the business owner configured. Falls back to generic lines when absent.
  const customProof = normalizeText(pageConfig.socialProofText);

  const proofLines = customProof
    ? customProof.split("\n").filter(Boolean).map((l) => `✅ ${l.trim()}`)
    : isFilipino
      ? [
          `✅ Trusted na po kami ng aming mga kliyente`,
          `✅ May existing clients po kaming puwedeng mag-share ng kanilang experience`,
          `✅ Transparent po ang aming proseso — walang hidden fees`,
        ]
      : [
          `✅ Trusted by our existing clients`,
          `✅ We have happy clients who can share their experience`,
          `✅ Fully transparent process — no hidden fees`,
        ];

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Naiintindihan ko po! Importanteng maging confident kayo before committing. 😊`,
        "",
        `Nakakatulong po ito:`,
        ...proofLines,
        "",
        `Gusto niyo po bang makipag-usap sa isa sa aming existing clients?`,
        `O kaya, pwede na rin po kayong mag-book ng FREE demo para personally niyo makita kung paano ito works.`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `I completely understand! It's important to feel confident before committing. 😊`,
      "",
      `Here's what helps:`,
      ...proofLines,
      "",
      `Would you like to speak with one of our existing clients?`,
      `Or you can book a FREE demo to see exactly how it works for yourself.`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildCompetitorObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "us";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");
  // pageConfig.competitiveAdvantages: optional newline-separated list of
  // differentiators the business owner configured. Falls back to generic lines.
  const customAdvantages = normalizeText(pageConfig.competitiveAdvantages);

  const advantageLines = customAdvantages
    ? customAdvantages.split("\n").filter(Boolean).map((l) => `✅ ${l.trim()}`)
    : isFilipino
      ? [
          `✅ Personalized support — nandito kami kahit pagkatapos ng purchase`,
          `✅ Dedicated onboarding para hindi kayo ma-confuse sa simula`,
          `✅ ${pageName} ay dinisenyo para sa specific na pangangailangan niyo`,
        ]
      : [
          `✅ Personalized support — we're here even after purchase`,
          `✅ Dedicated onboarding so you're never left figuring it out alone`,
          `✅ ${pageName} is built to fit your specific needs`,
        ];

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Sige po, worth it lang naman na i-compare! 😊`,
        "",
        `Ang aming advantage:`,
        ...advantageLines,
        "",
        `Pero syempre, kayo lang po ang makaka-decide kung ano ang best for your business.`,
        "",
        `Gusto niyo po bang makita kung paano kami naiiba sa iba through a quick demo?`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `Of course, it's always smart to compare! 😊`,
      "",
      `Here's what sets us apart:`,
      ...advantageLines,
      "",
      `Of course, you're the best judge of what works for your business.`,
      "",
      `Would you like to see how we're different through a quick demo?`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildTimingObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "we";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Naiintindihan ko po! Busy tayo lahat. 😊`,
        "",
        `Para hindi niyo makalimutan, pwede ko po kayong i-save sa priority list namin.`,
        "",
        `Kapag ready na kayo, pwede na rin po kayong mag-message dito anytime.`,
        "",
        `Kung gusto niyo ng advance info na pwede niyo nang basahin anytime, pwede ko po i-share yung resources namin.`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `I totally get it — we're all busy! 😊`,
      "",
      `I can save you to our priority list so we can follow up when the timing is right.`,
      "",
      `Feel free to message here anytime when you're ready.`,
      "",
      `If you'd like some advance info you can read at your own pace, I can share our resources with you.`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildAuthorityObjectionResponse({ pageConfig, pageIntelligence, data, compactFacebookReply }) {
  const pageName = normalizeText(pageConfig.pageName) || "we";
  const isFilipino = isFilipinoStyle(pageIntelligence?.rawCustomerMessage || "");

  if (isFilipino) {
    return compactFacebookReply(
      [
        `Mabuting idea po na kumonsulta! 😊`,
        "",
        `Para mas madali niong pag-usapan, pwede ko po kayong i-invite sa FREE consultation kung saan pwede kayong mag-bring ng partner/team.`,
        "",
        `Pwedeng i-schedule niyo po kung anong oras convenient sa inyo.`,
        "",
        `Anong oras po ang maganda para sa inyo?`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return compactFacebookReply(
    [
      `Great idea to consult with them! 😊`,
      "",
      `To make it easier, I can invite you to a FREE consultation where you can bring your partner/team too.`,
      "",
      `You can schedule it at whatever time works best for all of you.`,
      "",
      `What time works best for you?`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function buildObjectionResponse({
  objectionType,
  pageConfig,
  pageIntelligence,
  data,
  compactFacebookReply,
}) {
  switch (objectionType) {
    case "price_objection":
      return buildPriceObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "stall_objection":
      return buildStallObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "details_request":
      return buildDetailsRequestResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "trust_objection":
      return buildTrustObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "competitor_objection":
      return buildCompetitorObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "timing_objection":
      return buildTimingObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    case "authority_objection":
      return buildAuthorityObjectionResponse({
        pageConfig,
        pageIntelligence,
        data,
        compactFacebookReply,
      });

    default:
      return null;
  }
}

// Intents that indicate the user is already in a transactional flow where
// an objection surfacing mid-message should still be handled (e.g. "magkano
// pero mahal" = pricing_inquiry + price_objection in the same message).
const OBJECTION_ELIGIBLE_INTENTS = new Set([
  "unknown",
  "pricing_inquiry",
  "product_inquiry",
  "demo_request",
  "greeting",
]);

function shouldHandleObjection(intentResult, incomingText, pageConfig = {}) {
  const intent = intentResult?.intent || "unknown";

  if (!OBJECTION_ELIGIBLE_INTENTS.has(intent)) {
    return false;
  }

  return detectObjectionType(incomingText, pageConfig) !== null;
}

module.exports = {
  buildObjectionResponse,
  detectObjectionType,
  shouldHandleObjection,
};