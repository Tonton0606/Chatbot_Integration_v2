/**
 * Comment Automation for Facebook Chatbot
 *
 * Pure decision + message-building layer for post/livestream comment automation.
 * The route wires the actual Graph API calls (public comment reply + private
 * reply that opens a Messenger thread). When the commenter replies in Messenger,
 * the normal `messages` webhook funnels them into handleFacebookSalesConversation.
 */

const { isFilipinoStyle, compactFacebookReply } = require("./facebookReplyUtils");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Decide whether to auto-reply to a comment.
 * Gated by a per-page toggle and an optional comma/newline-separated keyword
 * filter. With no filter set, every comment qualifies (toggle permitting).
 */
function shouldAutoReply(commentText, pageSettings = {}) {
  if (!pageSettings || pageSettings.commentAutomationEnabled !== true) {
    return false;
  }

  const text = normalizeText(commentText).toLowerCase();
  if (!text) return false;

  const rawFilter = normalizeText(pageSettings.commentKeywordFilter);
  if (!rawFilter) {
    return true;
  }

  const keywords = rawFilter
    .split(/[\n,]+/)
    .map((kw) => kw.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    return true;
  }

  return keywords.some((kw) => text.includes(kw));
}

/**
 * Build the public comment reply and the private-reply DM opener.
 * Uses an admin-configured template when present, otherwise a localized default.
 */
function buildCommentReplies({ commentText = "", pageConfig = {}, pageSettings = {} }) {
  const isFilipino = isFilipinoStyle(commentText);
  const pageName = normalizeText(pageConfig.pageName) || "us";

  const publicReply = compactFacebookReply(
    normalizeText(pageSettings.commentReplyTemplate) ||
      (isFilipino
        ? "Salamat sa interes niyo po! 💬 Na-message po namin kayo nang private para sa mga detalye."
        : "Thanks for your interest! 💬 We've sent you a private message with the details.")
  );

  const privateReply = compactFacebookReply(
    isFilipino
      ? `Hello po! Salamat sa comment niyo sa ${pageName}. 😊 Para po matulungan namin kayo, ano pong gusto ninyong malaman — pricing, demo, o iba pang detalye?`
      : `Hi! Thanks for commenting on ${pageName}. 😊 So we can help you, what would you like to know — pricing, a demo, or more details?`
  );

  return { publicReply, privateReply };
}

module.exports = {
  shouldAutoReply,
  buildCommentReplies,
};
