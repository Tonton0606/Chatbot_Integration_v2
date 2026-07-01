/**
 * Omni-Channel Message Processor
 *
 * Takes normalized messages from any channel adapter and processes them
 * through the existing AI engine (Groq + knowledge base + sales flow).
 *
 * This is the bridge between the channel adapters and the AI/reply logic.
 * It reuses the existing Facebook chatbot reply service and sales flow
 * machinery — the only difference is the output channel.
 */

const logger = require("../../config/logger");
const { supabase } = require("../../config/supabase");
const { createFacebookChatbotReplyService } = require("../facebook/facebookChatbotReply");
const { compactFacebookReply, isFilipinoStyle } = require("../facebook/facebookReplyUtils");
const { handleFacebookSalesConversation } = require("../facebook/facebookSalesFlow");

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const { generateChatbotReply } = createFacebookChatbotReplyService({
  defaultChatbotModel: DEFAULT_MODEL,
  env: process.env,
});

/**
 * Process a normalized incoming message from any channel.
 *
 * @param {Object} normalizedMessage - Output from a channel adapter's parseWebhook()
 * @param {Object} adapter           - The channel adapter instance (for sending replies)
 * @param {Object} pageConfig        - Channel config (token, business context, etc.)
 * @returns {Promise<{ replied: boolean, replyText?: string, error?: string }>}
 */
async function processIncomingMessage(normalizedMessage, adapter, pageConfig) {
  const {
    channel,
    pageId,
    customerId,
    customerName,
    customerAvatar,
    text,
    imageUrl,
    mediaType,
    platformMsgId,
    referral,
    raw,
    sessionId, // Lazada-specific
  } = normalizedMessage;

  if (!text && mediaType === "text") {
    logger.debug({ channel, customerId }, "[OmniChannel] Empty text message — skipping");
    return { replied: false };
  }

  const workspaceId = pageConfig?.workspace_id || "";

  // 1. Get or create conversation
  const conversation = await adapter.getOrCreateConversation({
    workspaceId,
    pageId,
    customerId,
    customerName,
    customerAvatar,
    metadata: {
      referral: referral || null,
      sessionId: sessionId || null,
      rawChannel: channel,
    },
  });

  if (!conversation) {
    logger.warn({ channel, customerId }, "[OmniChannel] Could not create conversation");
    return { replied: false, error: "Conversation creation failed" };
  }

  // 2. Store incoming message
  await adapter.appendMessage({
    conversationId: conversation.id,
    workspaceId,
    senderType: "customer",
    senderName: customerName,
    messageText: text,
    messageType: mediaType,
    imageUrl,
    mediaType,
    platformMsgId,
    metadata: { raw },
  });

  // 3. Check if bot is paused (human handoff)
  if (conversation.bot_paused || conversation.status === "human_handoff") {
    logger.info({ channel, conversationId: conversation.id }, "[OmniChannel] Bot paused — skipping auto-reply");
    return { replied: false };
  }

  // 4. Check if chatbot is enabled for this channel config
  if (pageConfig?.chatbot_enabled === false) {
    return { replied: false };
  }

  // 5. Get conversation history for context
  const recentMessages = await adapter.getRecentMessages(conversation.id, 12);

  // 6. Build context from page config (same fields as Facebook)
  const context = {
    businessType: pageConfig.business_type || "",
    pageName: pageConfig.page_name || "",
    productServices: pageConfig.product_services || "",
    productServicePriceRanges: pageConfig.product_service_price_ranges || "",
    websiteLink: pageConfig.website_link || "",
    knowledge: pageConfig.knowledge || "",
    businessDescription: pageConfig.knowledge || "",
    aiInstruction: pageConfig.ai_instruction || "",
    shoppeLink: pageConfig.channel_settings?.shopee_link || "",
    lazadaLink: pageConfig.channel_settings?.lazada_link || "",
    channel,
  };

  // 7. Generate AI reply
  // For text messages, use the full sales flow (same as Facebook)
  // For media-only messages, send a contextual acknowledgment
  let replyText = "";

  if (!text && mediaType !== "text") {
    // Media-only message — acknowledge and ask what they need
    const isFilipino = isFilipinoStyle(customerName || "");
    replyText = isFilipino
      ? `Salamat sa pag-send ng ${mediaType === "image" ? "larawan" : mediaType === "video" ? "video" : "file"}! 😊 Ano po ang gusto niyang itanong o kailangan?`
      : `Thanks for the ${mediaType}! 😊 What would you like to know or how can I help?`;
  } else {
    // Build messages for AI
    const aiMessages = [
      ...recentMessages.slice(0, -1), // exclude the just-stored incoming message
      { role: "user", content: text },
    ];

    try {
      replyText = await generateChatbotReply(aiMessages, context);
      replyText = compactFacebookReply(replyText);
    } catch (err) {
      logger.error({ err, channel }, "[OmniChannel] AI reply generation failed");

      // Fallback reply
      const isFilipino = isFilipinoStyle(text);
      replyText = isFilipino
        ? `Hi${customerName ? ` ${customerName}` : ""}! 😊 Nagkaproblema lang po sa system namin. Paki-send ulit ang inyong message?`
        : `Hi${customerName ? ` ${customerName}` : ""}! 😊 We're experiencing a brief issue. Could you please send your message again?`;
    }
  }

  if (!replyText) return { replied: false };

  // 8. Send typing indicator (if supported)
  await adapter.sendTypingOn({ customerId, pageConfig });

  // 9. Send reply via the channel adapter
  const sendParams = {
    customerId,
    text: replyText,
    pageConfig,
  };

  // Lazada needs session_id
  if (channel === "lazada" && sessionId) {
    sendParams.sessionId = sessionId;
  }

  const sendResult = await adapter.sendMessage(sendParams);

  await adapter.sendTypingOff({ customerId, pageConfig });

  if (!sendResult.success) {
    logger.warn({ channel, error: sendResult.error }, "[OmniChannel] Failed to send reply");
    return { replied: false, error: sendResult.error };
  }

  // 10. Store bot reply
  await adapter.appendMessage({
    conversationId: conversation.id,
    workspaceId,
    senderType: "bot",
    senderName: pageConfig?.page_name || "Exponify AI",
    messageText: replyText,
    messageType: "text",
    platformMsgId: sendResult.platformMsgId || "",
    aiGenerated: true,
    replySource: "omnichannel",
    metadata: { channel },
  });

  // 11. Update conversation state
  await adapter.supabase
    .from("omnichannel_conversations")
    .update({
      last_message: replyText,
      last_message_at: new Date().toISOString(),
      last_sender_type: "bot",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return { replied: true, replyText };
}

/**
 * Process a normalized comment from any channel.
 * Generates an AI reply and posts it publicly.
 */
async function processIncomingComment(normalizedComment, adapter, pageConfig) {
  const { channel, pageId, postId, commentId, fromId, fromName, text } = normalizedComment;

  if (!text || !commentId) return { replied: false };

  const workspaceId = pageConfig?.workspace_id || "";

  if (pageConfig?.comment_autoreply_enabled === false) {
    return { replied: false };
  }

  // Generate AI reply (short, public-comment style)
  const context = {
    businessType: pageConfig.business_type || "",
    pageName: pageConfig.page_name || "",
    productServices: pageConfig.product_services || "",
    productServicePriceRanges: pageConfig.product_service_price_ranges || "",
    knowledge: pageConfig.knowledge || "",
    aiInstruction: pageConfig.ai_instruction || "",
    channel,
  };

  const systemParts = [
    `You are a warm, friendly business representative for ${context.pageName || "this page"} replying to a PUBLIC ${channel} comment.`,
    "Rules:",
    "- Keep the reply SHORT (1-3 sentences max) — this is a public comment",
    "- Be warm, natural, and match the language (English, Tagalog, or Taglish)",
    "- Never reveal prices you're not sure about — say to DM for details",
    "- No bullet lists or markdown — plain conversational text only",
    "- End with a gentle CTA to message for more details",
  ];

  if (context.businessType) systemParts.push(`Business type: ${context.businessType}`);
  if (context.productServices) systemParts.push(`Products/Services: ${context.productServices}`);
  if (context.knowledge) systemParts.push(`Business knowledge:\n${context.knowledge}`);
  if (context.aiInstruction) systemParts.push(`Tone/behavior: ${context.aiInstruction}`);

  let replyText = "";
  try {
    const messages = [
      { role: "system", content: systemParts.join("\n") },
      { role: "user", content: text },
    ];

    replyText = await generateChatbotReply(messages, context);
    replyText = compactFacebookReply(replyText);
  } catch (err) {
    logger.warn({ err, channel, commentId }, "[OmniChannel] Comment AI generation failed");
    const isFilipino = isFilipinoStyle(text);
    replyText = isFilipino
      ? `Salamat sa inyong komento, ${fromName || "po"}! 😊 Mag-message po kayo para sa mas detalyadong impormasyon.`
      : `Thanks for your comment${fromName ? `, ${fromName}` : ""}! 😊 Feel free to message us for more details.`;
  }

  if (!replyText) return { replied: false };

  // Post reply
  const result = await adapter.replyToComment({ commentId, text: replyText, pageConfig });

  if (!result.success) {
    logger.warn({ channel, error: result.error }, "[OmniChannel] Failed to post comment reply");
    return { replied: false, error: result.error };
  }

  // Store comment record
  if (workspaceId) {
    await adapter.supabase
      .from("omnichannel_messages")
      .insert({
        conversation_id: null,  // comments don't have a conversation
        workspace_id: workspaceId,
        sender_type: "customer",
        sender_name: fromName,
        message_text: text,
        message_type: "text",
        metadata: {
          type: "comment",
          channel,
          comment_id: commentId,
          post_id: postId,
          from_id: fromId,
          bot_reply: replyText,
        },
      })
      .catch(() => {});
  }

  return { replied: true, replyText };
}

module.exports = {
  processIncomingMessage,
  processIncomingComment,
};
