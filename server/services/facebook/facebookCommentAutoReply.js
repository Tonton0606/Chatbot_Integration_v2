/**
 * Facebook Comment Auto-Reply Service
 * Handles entry.changes[] from the webhook where field = "feed" and verb = "add".
 *
 * Flow:
 *  1. Receive comment on a page post
 *  2. Skip if it's from the page itself (avoid reply loops)
 *  3. Generate a reply using the existing chatbot engine (same context as Messenger)
 *  4. Post the reply publicly under the comment via Graph API
 *  5. Optionally DM the commenter: "We replied to your comment! Also messaged you here 📩"
 *  6. Store to client_facebook_comments for inbox visibility
 *  7. Fire workflow trigger: facebook.comment_received
 */

const logger = require("../../config/logger");
const { compactFacebookReply } = require("./facebookReplyUtils");

const FB_GRAPH_API_BASE = "https://graph.facebook.com/v22.0";

function normalizeText(v) {
  return typeof v === "string" ? v.trim() : "";
}

function isTagalog(text = "") {
  return /\b(po|opo|salamat|magkano|presyo|saan|paano|pwede|pede|meron|wala|ang|ng|mga|ay|hindi|oo|gusto)\b/i.test(text);
}

// ── Graph API helpers ─────────────────────────────────────────────────────────

async function replyToComment(commentId, message, pageAccessToken) {
  const res = await fetch(
    `${FB_GRAPH_API_BASE}/${commentId}/comments?access_token=${encodeURIComponent(pageAccessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Comment reply failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function sendDmToCommenter(psid, message, pageAccessToken) {
  const res = await fetch(
    `${FB_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text: message },
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DM to commenter failed (${res.status}): ${txt}`);
  }
  return res.json();
}

// ── Determine if we should skip this comment ──────────────────────────────────

function shouldSkip(change, pageId) {
  const v = change?.value;
  if (!v) return true;
  if (v.item !== "comment") return true;
  if (v.verb !== "add") return true;        // skip edits/deletes
  if (!v.comment_id) return true;
  if (!normalizeText(v.message)) return true; // empty comment

  // Skip if the comment is FROM the page itself (avoid loops)
  const fromId = normalizeText(String(v.from?.id || ""));
  const normalizedPage = normalizeText(String(pageId || ""));
  if (fromId && normalizedPage && fromId === normalizedPage) return true;

  return false;
}

// ── Build chatbot prompt from comment ────────────────────────────────────────

function buildCommentMessages(commentText, pageConfig) {
  const pageName       = normalizeText(pageConfig.pageName);
  const businessType   = normalizeText(pageConfig.businessType);
  const products       = normalizeText(pageConfig.productServices);
  const pricing        = normalizeText(pageConfig.productServicePriceRanges);
  const knowledge      = normalizeText(pageConfig.knowledge);
  const aiInstruction  = normalizeText(pageConfig.aiInstruction || pageConfig.ai_instruction);

  const systemParts = [
    `You are a warm, friendly business representative for ${pageName || "this page"} replying to a PUBLIC Facebook post comment.`,
    "Rules:",
    "- Keep the reply SHORT (1–3 sentences max) — this is a public comment, not a long message",
    "- Be warm, natural, and match the language of the commenter (English, Tagalog, or Taglish)",
    "- Never reveal prices you're not sure about — say to DM for details instead",
    "- Do NOT use bullet lists or markdown — plain conversational text only",
    "- End with a gentle CTA to message the page for more details",
  ];

  if (businessType) systemParts.push(`Business type: ${businessType}`);
  if (products)     systemParts.push(`Products/Services: ${products}`);
  if (pricing)      systemParts.push(`Pricing range: ${pricing}`);
  if (knowledge)    systemParts.push(`Business knowledge:\n${knowledge}`);
  if (aiInstruction) systemParts.push(`Tone/behavior instruction: ${aiInstruction}`);

  return [
    { role: "system", content: systemParts.join("\n") },
    { role: "user",   content: commentText },
  ];
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handleFacebookComment({
  change,
  pageId,
  pageConfig,
  supabaseClient,
  generateChatbotReply,
}) {
  if (shouldSkip(change, pageId)) return;

  const v           = change.value;
  const commentId   = normalizeText(v.comment_id);
  const commentText = normalizeText(v.message);
  const fromName    = normalizeText(v.from?.name || "");
  const fromId      = normalizeText(String(v.from?.id || ""));
  const postId      = normalizeText(v.post_id || "");
  const workspaceId = normalizeText(pageConfig.connectedWorkspaceId);
  const token       = normalizeText(pageConfig.pageAccessToken);

  if (!token) {
    logger.warn({ pageId }, "[CommentReply] No page access token — skipping");
    return;
  }

  logger.info({ commentId, fromName, commentText: commentText.slice(0, 80) }, "[CommentReply] Processing comment");

  // Check if chatbot is enabled for this page
  if (pageConfig.chatbot_enabled === false) {
    logger.info({ pageId }, "[CommentReply] Chatbot disabled — skipping");
    return;
  }

  // Check if comment autoreply is specifically enabled for this page
  if (pageConfig.comment_autoreply_enabled === false) {
    logger.info({ pageId }, "[CommentReply] Comment autoreply disabled — skipping");
    return;
  }

  // Generate AI reply
  let replyText = "";
  try {
    const messages = buildCommentMessages(commentText, pageConfig);
    const raw = await generateChatbotReply(messages, {
      channel: "facebook_comment",
      pageName: pageConfig.pageName,
      businessType: pageConfig.businessType,
      knowledge: pageConfig.knowledge,
      productServices: pageConfig.productServices,
      productServicePriceRanges: pageConfig.productServicePriceRanges,
      aiInstruction: pageConfig.aiInstruction,
    });
    replyText = compactFacebookReply(raw);
  } catch (err) {
    logger.warn({ err, commentId }, "[CommentReply] AI generation failed — using fallback");
    const tagalog = isTagalog(commentText);
    replyText = tagalog
      ? `Salamat sa inyong komento, ${fromName || "po"}! 😊 Mag-message po kayo sa aming page para sa mas detalyadong impormasyon.`
      : `Thanks for your comment${fromName ? `, ${fromName}` : ""}! 😊 Feel free to send us a message for more details.`;
  }

  if (!replyText) return;

  // Post reply under comment
  try {
    await replyToComment(commentId, replyText, token);
    logger.info({ commentId }, "[CommentReply] Reply posted");
  } catch (err) {
    logger.warn({ err, commentId }, "[CommentReply] Failed to post reply");
    return;
  }

  // Store comment record for inbox visibility
  if (workspaceId) {
    await supabaseClient.from("client_facebook_comments").upsert({
      workspace_id: workspaceId,
      page_id: pageId,
      comment_id: commentId,
      post_id: postId,
      from_psid: fromId || null,
      from_name: fromName || null,
      comment_text: commentText,
      bot_reply: replyText,
      replied_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }, { onConflict: "comment_id" }).catch(() => {});

    // Fire workflow trigger
    await supabaseClient.from("workflow_executions").insert({
      workspace_id: workspaceId,
      trigger_event: "facebook.message_received",
      trigger_data: {
        workspace_id: workspaceId,
        type: "comment",
        comment_id: commentId,
        post_id: postId,
        from_psid: fromId,
        from_name: fromName,
        comment_text: commentText,
        bot_reply: replyText,
        page_id: pageId,
      },
      status: "pending",
    }).catch(() => {});
  }

  // Optional: DM the commenter with an invitation to continue in Messenger
  // (only works if commenter has previously interacted with the page)
  if (fromId && fromId !== pageId) {
    try {
      const dmMsg = isTagalog(commentText)
        ? `Nagreply na kami sa inyong komento! 😊 Mag-message lang dito sa aming page kung gusto ninyong makipag-usap nang mas detalyado.`
        : `We replied to your comment! 😊 Feel free to message us here anytime for more details.`;
      await sendDmToCommenter(fromId, dmMsg, token);
      logger.info({ fromId, commentId }, "[CommentReply] DM sent to commenter");
    } catch {
      // DM often fails if user hasn't messaged the page first — non-fatal
    }
  }
}

module.exports = { handleFacebookComment };
