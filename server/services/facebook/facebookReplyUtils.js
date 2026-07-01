const GENERIC_FALLBACK_REPLY = "How can I help you today? Feel free to ask about our products, pricing, or to schedule a consultation.";

function extractReplyText(result) {
  if (!result) {
    return GENERIC_FALLBACK_REPLY;
  }

  if (Array.isArray(result.content) && result.content.length > 0) {
    const textPart = result.content.find((part) => part?.type === "text");
    if (textPart?.text) return compactFacebookReply(textPart.text);
  }

  if (typeof result.message === "string") {
    return compactFacebookReply(result.message);
  }

  if (typeof result.text === "string") {
    return compactFacebookReply(result.text);
  }

  return GENERIC_FALLBACK_REPLY;
}

function compactFacebookReply(rawText) {
  let cleaned = typeof rawText === "string" ? rawText : String(rawText || "");
  cleaned = cleaned.replace(/\\n/g, "\n").trim();

  cleaned = stripInternalAnalysis(cleaned);

  cleaned = cleaned.replace(/^based on the context provided[^\n]*\n?/i, "");
  cleaned = cleaned.replace(/^here'?s a possible response[:\s]*/i, "");
  cleaned = cleaned.replace(/^synthesized answer[:\s-]*/i, "");
  const sectionHeadingPattern = "(?:business overview|products and services|pricing and payment|business hours|locations and coverage|customer information|contact information|follow-up questions|follow up questions|ai instructions)";
  for (let i = 0; i < 3; i += 1) {
    cleaned = cleaned.replace(new RegExp(`^\\s*${sectionHeadingPattern}\\s*(?:[-:]\\s*)?`, "i"), "");
  }
  cleaned = cleaned.replace(new RegExp(`^\\s*${sectionHeadingPattern}\\s*$`, "gim"), "");
  cleaned = cleaned.replace(/\s*\((?:english|taglish|tagalog|filipino)\)\s*\/.*$/i, "");
  cleaned = cleaned.replace(/\s*\((?:english|taglish|tagalog|filipino)\)\s*/gi, " ");
  cleaned = cleaned.replace(/\s*\[\s*in\s+(?:english|taglish|tagalog|filipino)\s*:\s*[\s\S]*?\]/gi, " ");
  cleaned = cleaned.replace(/\s*\(\s*translation\s*:\s*[^)]*\)/gi, "");
  cleaned = cleaned.replace(/\s*\btranslation\s*:\s*[^.!?]*(?:[.!?]|$)/gi, " ");
  cleaned = cleaned.replace(/\s*\b(?:responding|translated|translation)\s+in\s+(?:english|taglish|tagalog|filipino)[^.!?]*(?:[.!?]|$)/gi, " ");
  cleaned = cleaned.replace(/\(\s*if the customer (?:is )?speaking in english[:\s][^)]+\)/gi, "");
  cleaned = cleaned.replace(/\(\s*if the customer (?:is )?in tagalog[:\s][^)]+\)/gi, "");
  cleaned = cleaned.replace(/\(\s*if the customer's question is in tagalog[:\s][^)]+\)/gi, "");
  cleaned = cleaned.replace(/\(\s*if the customer'?s language is [^)]+\)/gi, "");
  cleaned = cleaned.replace(/\(\s*in english[:\s][^)]+\)/gi, "");
  cleaned = cleaned.replace(/\(\s*please note[,:\s][^)]+\)/gi, "");
  cleaned = cleaned.replace(/\s*\(?\s*note\s*:\s*[\s\S]*$/i, "");
  cleaned = cleaned.replace(/\s*\bai instructions?\b[\s\S]*$/i, "");
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");
  cleaned = cleaned.replace(/^"|"$/g, "");
  cleaned = cleaned
    .split(/\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  cleaned = formatListText(cleaned);

  const maxChars = parseInt(process.env.FB_REPLY_MAX_CHARS, 10) || 700;
  if (cleaned.length > maxChars) {
    const short = cleaned.slice(0, maxChars);
    const lastSentenceEnd = Math.max(
      short.lastIndexOf("."),
      short.lastIndexOf("!"),
      short.lastIndexOf("?")
    );

    cleaned =
      lastSentenceEnd > 120
        ? short.slice(0, lastSentenceEnd + 1).trim()
        : `${short.trim()}...`;
  }

  const emojiList = ["🙂", "😊", "👍", "🙌", "😉", "✨"];
  const endsWithEmoji =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;

  let final = cleaned;

  if (!final) {
    return `Sige, paano kita matutulungan ngayon? ${emojiList[0]}`;
  }

  if (final.length < 80 && !/[.!?]$/.test(final)) {
    final = `${final.trim()}.`;
  }

  if (!endsWithEmoji.test(final)) {
    const idx = Math.floor(Math.abs(hashCode(final)) % emojiList.length);
    final = `${final} ${emojiList[idx]}`;
  }

  return final;
}

function stripInternalAnalysis(text) {
  if (!text) return text;

  let cleaned = String(text).trim();

  const synthesizedMatch = cleaned.match(
    /(?:^|\s)(?:[-*]\s*)*Synthesized Answer\s*:\s*/i
  );
  if (synthesizedMatch?.index >= 0) {
    cleaned = cleaned.slice(synthesizedMatch.index + synthesizedMatch[0].length);
  } else {
    cleaned = cleaned.replace(
      /^\s*(?:[-*]\s*)*Customer Language Detected\s*:\s*[-:\w\s/()]*\s*/i,
      ""
    );
  }

  const sourceSectionPatterns = [
    /\s*(?:[-*]\s*)*Breakdown of Sources Used\s*:\s*/i,
    /\s*(?:[-*]\s*)*Sources Used\s*:\s*/i,
    /\s*(?:[-*]\s*)*Rationale for Answer\s*:\s*/i,
    /\s*(?:[-*]\s*)*Reasoning\s*:\s*/i,
    /\s*(?:[-*]\s*)*Internal Analysis\s*:\s*/i,
  ];

  for (const pattern of sourceSectionPatterns) {
    const match = cleaned.search(pattern);
    if (match > 0) {
      cleaned = cleaned.slice(0, match).trim();
      break;
    }
  }

  cleaned = cleaned.replace(/^[-\s"]+/, "").replace(/["\s-]+$/g, "").trim();

  return cleaned;
}

function formatListText(text) {
  if (!text) return text;

  let formatted = text;

  // Replace bullet characters (•, ●, ▪, ▪️, ·) and list dashes/asterisks at start of lines with a standard "• "
  // This uses a start-of-line match to avoid touching bold formatting markers like **text**
  formatted = formatted.replace(/^[ \t]*[-*•●▪▪️·][ \t]+/gm, "• ");

  // Convert inline bullet characters separated by spaces into newlines with bullets
  formatted = formatted.replace(/\s+[•●▪▪️·]\s+/g, "\n• ");

  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  // Ensure list items are clean, and filter out empty bullets
  formatted = formatted
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "•" && line !== "-")
    .join("\n");

  return formatted.trim();
}

function hashCode(str) {
  let h = 0;

  if (!str) return h;

  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }

  return h;
}

function buildBusinessFallbackReply(context = {}, userText = "") {
  const defaultReply =
    typeof context.defaultReply === "string" ? context.defaultReply.trim() : "";
  if (defaultReply) return defaultReply;

  const knowledge =
    typeof context.knowledge === "string" ? context.knowledge.trim() : "";
  const productServices =
    typeof context.productServices === "string"
      ? context.productServices.trim()
      : "";
  const businessType =
    typeof context.businessType === "string" ? context.businessType.trim() : "";
  const pageName =
    typeof context.pageName === "string" ? context.pageName.trim() : "";
  const websiteLink =
    typeof context.websiteLink === "string" ? context.websiteLink.trim() : "";
  const shoppeLink =
    typeof context.shoppeLink === "string" ? context.shoppeLink.trim() : "";
  const lazadaLink =
    typeof context.lazadaLink === "string" ? context.lazadaLink.trim() : "";
  const productServicePriceRanges =
    typeof context.productServicePriceRanges === "string"
      ? context.productServicePriceRanges.trim()
      : "";

  const hasTagalog =
    /\b(ano|saan|may|wala|pa|po|kayo|kami|nyo|niyo|salamat|magkano)\b/i.test(
      userText
    );
  const langTagalog = hasTagalog;

  const parts = [];

  if (knowledge) {
    if (pageName) {
      parts.push(
        langTagalog
          ? `Ito ang details ng ${pageName}:`
          : `Here are the details for ${pageName}:`
      );
    } else {
      parts.push(langTagalog ? "Narito ang details:" : "Here are the details:");
    }

    parts.push(knowledge);

    if (websiteLink) {
      parts.push(`Website: ${websiteLink}`);
    }

    if (shoppeLink) {
      parts.push(`Shopee: ${shoppeLink}`);
    }

    if (lazadaLink) {
      parts.push(`Lazada: ${lazadaLink}`);
    }

    return parts.join(" ");
  }

  if (pageName) {
    parts.push(
      langTagalog
        ? `Ito ang mga ino-offer ng ${pageName}:`
        : `Here is what ${pageName} offers:`
    );
  } else {
    parts.push(langTagalog ? "Ito ang mga services namin:" : "Here are our services:");
  }

  if (productServices) {
    parts.push(productServices);
  } else if (businessType) {
    parts.push(`Business type: ${businessType}.`);
  } else {
    parts.push(
      langTagalog
        ? "Wala pa kaming nakalistang services ngayon."
        : "We don't have listed services yet."
    );
  }

  if (productServicePriceRanges) {
    parts.push(`Price range: ${productServicePriceRanges}`);
  }

  if (websiteLink) {
    parts.push(`Website: ${websiteLink}`);
  }

  if (shoppeLink) {
    parts.push(`Shopee: ${shoppeLink}`);
  }

  if (lazadaLink) {
    parts.push(`Lazada: ${lazadaLink}`);
  }

  return parts.join(" ");
}

function isFilipinoStyle(text = "", pageConfig = {}) {
  const normalized = String(text || "").toLowerCase();
  
  // Use configurable language detection keywords if available
  const customKeywords = pageConfig?.businessLogicSettings?.languageDetectionKeywords;
  
  if (customKeywords && typeof customKeywords === "object") {
    const filipinoKeywords = customKeywords.filipino;
    if (Array.isArray(filipinoKeywords) && filipinoKeywords.length > 0) {
      const pattern = new RegExp(`\\b(${filipinoKeywords.join("|")})\\b`, "i");
      return pattern.test(normalized);
    }
  }

  // Fall back to default keywords
  return /\b(ano|anong|mga|paano|saan|kailan|magkano|presyo|bayad|meron|wala|pwede|pede|puwede|kayo|nyo|niyo|namin|po|opo|salamat|makakabili|tulong|serbisyo|produkto|inyo|kita|ko|mo|sa|ang|na|at)\b/i.test(
    normalized
  );
}

module.exports = {
  buildBusinessFallbackReply,
  compactFacebookReply,
  extractReplyText,
  formatListText,
  hashCode,
  isFilipinoStyle,
  stripInternalAnalysis,
};
