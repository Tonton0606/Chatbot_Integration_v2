/**
 * Omni-Channel Adapter Interface
 *
 * Defines the contract that every channel adapter (Instagram, TikTok, Shopee,
 * Lazada) must implement. Each adapter normalizes platform-specific webhook
 * payloads into a common format, and provides methods to send replies back.
 *
 * The existing Facebook sales flow, lead qualification, and follow-up engine
 * operate on the normalized format — they don't need to know which channel
 * the message came from.
 */

const logger = require("../../config/logger");

/**
 * Normalized incoming message from any channel.
 * @typedef {Object} NormalizedMessage
 * @property {string} channel        - 'instagram' | 'tiktok' | 'shopee' | 'lazada'
 * @property {string} pageId         - Platform-specific account/shop ID
 * @property {string} customerId     - Platform-specific user ID
 * @property {string} customerName   - Display name (best-effort)
 * @property {string} customerAvatar - Profile pic URL (best-effort)
 * @property {string} text           - Message text
 * @property {string} imageUrl       - Image attachment URL (if any)
 * @property {string} mediaType      - 'text' | 'image' | 'video' | 'audio' | 'file'
 * @property {string} platformMsgId  - Message ID from the platform (for dedup)
 * @property {Object} referral       - Ad/referral context (if any)
 * @property {Object} raw            - Original webhook payload (for debugging)
 */

/**
 * Normalized comment from any channel.
 * @typedef {Object} NormalizedComment
 * @property {string} channel
 * @property {string} pageId
 * @property {string} postId
 * @property {string} commentId
 * @property {string} fromId
 * @property {string} fromName
 * @property {string} text
 * @property {Object} raw
 */

class ChannelAdapter {
  constructor({ supabaseClient, config, env }) {
    this.supabase = supabaseClient;
    this.config = config || {};
    this.env = env || process.env;
    this.channel = ""; // overridden by subclass
  }

  /**
   * Parse a raw webhook payload and extract normalized messages.
   * @param {Object} body - Raw webhook body
   * @returns {Promise<Array<NormalizedMessage>>}
   */
  async parseWebhook(body) {
    throw new Error(`${this.channel} adapter: parseWebhook() not implemented`);
  }

  /**
   * Parse a raw webhook payload and extract normalized comments.
   * @param {Object} body - Raw webhook body
   * @returns {Promise<Array<NormalizedComment>>}
   */
  async parseComments(body) {
    return [];
  }

  /**
   * Send a text message back to the user on this channel.
   * @param {Object} params
   * @param {string} params.customerId - Recipient ID
   * @param {string} params.text       - Message text
   * @param {Object} params.pageConfig - Channel config (token, pageId, etc.)
   * @returns {Promise<{ success: boolean, platformMsgId?: string, error?: string }>}
   */
  async sendMessage({ customerId, text, pageConfig }) {
    throw new Error(`${this.channel} adapter: sendMessage() not implemented`);
  }

  /**
   * Send a typing indicator (if supported by the platform).
   * @param {Object} params
   * @returns {Promise<void>}
   */
  async sendTypingOn({ customerId, pageConfig }) {
    // Optional — default no-op
  }

  async sendTypingOff({ customerId, pageConfig }) {
    // Optional — default no-op
  }

  /**
   * Reply to a public comment on a post.
   * @param {Object} params
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async replyToComment({ commentId, text, pageConfig }) {
    throw new Error(`${this.channel} adapter: replyToComment() not implemented`);
  }

  /**
   * Send quick replies / suggested actions (if supported).
   * @param {Object} params
   * @returns {Promise<void>}
   */
  async sendQuickReplies({ customerId, text, replies, pageConfig }) {
    // Default: send as plain text with numbered options
    const fallback = `${text}\n\n${replies.map((r, i) => `${i + 1}. ${r.title}`).join("\n")}`;
    return this.sendMessage({ customerId, text: fallback, pageConfig });
  }

  /**
   * Verify webhook signature (platform-specific).
   * @param {string} signature - Signature header
   * @param {string} body      - Raw body string
   * @param {Object} config    - Channel config
   * @returns {boolean}
   */
  verifySignature(signature, body, config) {
    return true; // default: no verification (override in subclass)
  }

  /**
   * Get the channel config for a given page ID.
   * @param {string} pageId
   * @returns {Promise<Object|null>}
   */
  async getChannelConfig(pageId) {
    if (!this.supabase || !pageId) return null;

    const { data, error } = await this.supabase
      .from("omnichannel_channel_configs")
      .select("*")
      .eq("channel", this.channel)
      .eq("page_id", pageId)
      .eq("is_connected", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, channel: this.channel, pageId }, "[OmniChannel] Failed to load channel config");
      return null;
    }

    return data;
  }

  /**
   * Get or create a conversation record.
   * @param {Object} params
   * @returns {Promise<Object|null>}
   */
  async getOrCreateConversation({ workspaceId, pageId, customerId, customerName, customerAvatar, metadata }) {
    if (!this.supabase || !workspaceId) return null;

    const { data: existing } = await this.supabase
      .from("omnichannel_conversations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("channel", this.channel)
      .eq("page_id", pageId)
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await this.supabase
      .from("omnichannel_conversations")
      .insert({
        workspace_id: workspaceId,
        channel: this.channel,
        page_id: pageId,
        customer_id: customerId,
        customer_name: customerName || "",
        customer_avatar: customerAvatar || "",
        status: "active",
        metadata: metadata || {},
      })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, channel: this.channel, customerId }, "[OmniChannel] Failed to create conversation");
      return null;
    }

    return created;
  }

  /**
   * Append a message to a conversation.
   * @param {Object} params
   * @returns {Promise<void>}
   */
  async appendMessage({ conversationId, workspaceId, senderType, senderName, messageText, messageType, imageUrl, mediaType, platformMsgId, intent, replySource, metadata }) {
    if (!this.supabase || !conversationId) return;

    await this.supabase
      .from("omnichannel_messages")
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: senderType,
        sender_name: senderName || "",
        message_text: messageText || "",
        message_type: messageType || "text",
        image_url: imageUrl || "",
        media_type: mediaType || "",
        platform_msg_id: platformMsgId || "",
        intent: intent || "",
        reply_source: replySource || "",
        metadata: metadata || {},
      });

    await this.supabase
      .from("omnichannel_conversations")
      .update({
        last_message: messageText || "",
        last_message_at: new Date().toISOString(),
        last_sender_type: senderType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  /**
   * Get recent conversation messages for context.
   * @param {string} conversationId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentMessages(conversationId, limit = 12) {
    if (!this.supabase || !conversationId) return [];

    const { data, error } = await this.supabase
      .from("omnichannel_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) return [];

    return (data || []).map((msg) => ({
      role: msg.sender_type === "customer" ? "user" : "assistant",
      content: msg.message_text,
    }));
  }
}

module.exports = { ChannelAdapter };
