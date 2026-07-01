/**
 * Reply naturalizer.
 *
 * The sales engine makes deterministic DECISIONS (which stage, which field to
 * ask, which CTA, which price/link to surface) and emits a reliable template
 * string. Those templates can feel scripted. This layer rephrases the wording
 * through the LLM so it sounds like a warm human agent — while keeping every
 * fact, number, link, and question intact, and always falling back to the
 * template if the rewrite is unavailable or looks unsafe.
 *
 * Disable globally with FB_NATURALIZE_REPLIES=false.
 */

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Stages whose exact wording must be preserved (echoed lead details, pricing
// facts, structured CTA lists). Never rewrite these.
const PRESERVE_STAGES = new Set([
  "awaiting_lead_confirmation",
  "awaiting_lead_correction",
  "pricing_overview",
]);

function draftHasQuestion(text = "") {
  return /\?/.test(text);
}

// Skip naturalizer for replies that are already complex or structured:
// multi-line (3+ lines), long (220+ chars), or contain list markers.
// These are already human-like enough and the extra LLM call only adds
// latency without improving quality.
function shouldSkipNaturalize(text = "") {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length >= 3) return true;
  if (text.length >= 220) return true;
  if (/^[•\-*✅]/m.test(text)) return true;
  return false;
}

async function naturalizeReply({
  draft,
  stage = "",
  pageConfig = {},
  conversationMessages = [],
  generateChatbotReply,
  env = process.env,
}) {
  const baseDraft = normalizeText(draft);

  if (!baseDraft) return draft;
  if (env.FB_NATURALIZE_REPLIES === "false") return baseDraft;
  if (PRESERVE_STAGES.has(stage)) return baseDraft;
  if (shouldSkipNaturalize(baseDraft)) return baseDraft;
  if (typeof generateChatbotReply !== "function") return baseDraft;

  const persona = normalizeText(pageConfig.aiInstruction);

  const system = [
    "You rewrite a draft Facebook Messenger reply so it sounds like a warm, natural human sales/CSR agent — not a robot.",
    "STRICT RULES:",
    "- Keep ALL facts, numbers, prices, links, and names exactly as in the draft. Do NOT add new facts, offers, or claims.",
    "- If the draft asks a question, keep that same question. Keep the same call-to-action.",
    "- Match the customer's language (English or Taglish/Filipino). Keep it concise — 1 to 4 short sentences for Messenger.",
    "- Sound conversational and friendly, never scripted or formal-templated.",
    persona ? `Persona/tone to embody: ${persona}` : "",
    "Return ONLY the rewritten message text — no quotes, no preamble.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const messages = [
      { role: "system", content: system },
      ...conversationMessages
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: `Draft to rewrite:\n${baseDraft}` },
    ];

    const result = await generateChatbotReply(messages, {
      pageName: pageConfig.pageName || "",
      aiInstruction: persona,
    });

    const rewritten = normalizeText(
      typeof result === "string" ? result : result?.text || ""
    );

    // Safety fallbacks: empty, provider refusal, runaway length, or dropped a
    // question the draft required.
    if (!rewritten) return baseDraft;
    if (/I can only help with/i.test(rewritten)) return baseDraft;
    if (rewritten.length > baseDraft.length * 2 + 140) return baseDraft;
    if (draftHasQuestion(baseDraft) && !draftHasQuestion(rewritten)) {
      return baseDraft;
    }

    return rewritten;
  } catch (err) {
    return baseDraft;
  }
}

module.exports = {
  naturalizeReply,
  PRESERVE_STAGES,
  shouldSkipNaturalize,
};
