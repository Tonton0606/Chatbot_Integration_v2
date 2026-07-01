/**
 * Lazada IM (Instant Messaging) Adapter
 *
 * Lazada Open Platform provides IM APIs for sellers to manage
 * buyer conversations. Key features:
 *   - /im/message/list — retrieve messages for a session
 *   - /im/message/send — send a reply to a conversation
 *   - /im/session/list — get list of conversations
 *   - IM push (webhook) for incoming messages
 *
 * PH Market Notes:
 *   - Lazada is the #2 e-commerce platform in the Philippines
 *   - Filipino SMBs use Lazada for electronics, fashion, home goods
 *   - Chat is primarily for order inquiries and customer support
 *   - Seller can initiate conversation if order is < 7 days old
 *
 * API Docs: https://open.lazada.com
 * PH Endpoint: https://api.lazada.com.ph/rest
 *
 * Auth: App Key + App Secret (HMAC-MD5 signed requests)
 * Message templates: 1=text, 3=image, 4=emoji, 10006=item, 10007=order
 */

const crypto = require("crypto");
const logger = require("../../../config/logger");
const { ChannelAdapter } = require("../channelAdapter");

const LAZADA_API_BASE_PH = "https://api.lazada.com.ph/rest";

class LazadaAdapter extends ChannelAdapter {
  constructor(opts) {
    super(opts);
    this.channel = "lazada";
  }

  /**
   * Parse Lazada IM push notification webhook.
   *
   * Lazada sends push notifications for IM events:
   *   {
   *     "message_type": "im_message",
   *     "data": {
   *       "session_id": "...",
   *       "message_id": "...",
   *       "from_account_id": "123",
   *       "to_account_id": "456",
   *       "content": "{\"txt\":\"hello\"}",
   *       "template_id": 1,
   *       "send_time": 1234567890
   *     }
   *   }
   */
  async parseWebhook(body) {
    const messages = [];

    if (!body) return messages;

    const pushType = body.message_type || body.type || "";
    const data = body.data || body;

    // Handle IM message push
    if (pushType === "im_message" || pushType === "im.session.message" || data.message_id) {
      const fromId = String(data.from_account_id || data.from_user_id || "");
      const toId = String(data.to_account_id || data.to_user_id || "");
      const sessionId = data.session_id || "";

      if (!fromId) return messages;

      // Lazada content is JSON-encoded string
      let contentObj = {};
      try {
        contentObj = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
      } catch {
        contentObj = { txt: String(data.content || "") };
      }

      const templateId = data.template_id || 1;
      const text = contentObj.txt || contentObj.text || "";
      const msgType = contentObj.type || "";

      let imageUrl = "";
      let mediaType = "text";

      if (templateId === 3 || msgType === "image") {
        imageUrl = contentObj.url || contentObj.image || "";
        mediaType = "image";
      } else if (templateId === 10006 || msgType === "item") {
        mediaType = "product";
      } else if (templateId === 10007 || msgType === "order") {
        mediaType = "order";
      } else if (templateId === 6 || msgType === "video") {
        mediaType = "video";
      }

      messages.push({
        channel: "lazada",
        pageId: toId,  // seller account ID
        customerId: fromId,  // buyer account ID
        customerName: "",
        customerAvatar: "",
        text,
        imageUrl,
        mediaType,
        platformMsgId: data.message_id || "",
        referral: null,
        raw: body,
        // Lazada-specific: session_id is needed to reply
        sessionId,
      });
    }

    return messages;
  }

  /**
   * Send a message to a Lazada buyer via IM API.
   *
   * Uses /im/message/send endpoint.
   * Requires: session_id from the incoming message.
   */
  async sendMessage({ customerId, text, pageConfig, sessionId }) {
    const appKey = pageConfig?.channel_settings?.app_key || this.env.LAZADA_APP_KEY || "";
    const appSecret = pageConfig?.channel_settings?.app_secret || this.env.LAZADA_APP_SECRET || "";
    const sellerId = pageConfig?.page_id || "";
    const session = sessionId || pageConfig?.channel_settings?.session_id || "";

    if (!appKey || !appSecret) {
      return { success: false, error: "Missing Lazada app credentials" };
    }

    if (!session) {
      return { success: false, error: "Missing session_id for Lazada reply" };
    }

    try {
      const timestamp = String(Date.now());
      const path = "/im/message/send";

      // Build sign string (Lazada uses HMAC-MD5)
      const signBase = `${path}${timestamp}${appKey}${session}`;
      const sign = crypto.createHmac("md5", appSecret).update(signBase).digest("hex").toUpperCase();

      const url = `${LAZADA_API_BASE_PH}${path}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_key: appKey,
          timestamp,
          sign,
          session_id: session,
          template_id: 1,  // text message
          content: JSON.stringify({ txt: text }),
          to_account_id: parseInt(customerId, 10),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        logger.warn({ status: res.status, body: txt }, "[Lazada] sendMessage failed");
        return { success: false, error: `Lazada send failed (${res.status}): ${txt}` };
      }

      const data = await res.json();
      if (data.code && data.code !== "0") {
        return { success: false, error: `Lazada error: ${data.message || data.code}` };
      }

      return { success: true, platformMsgId: data?.data?.message_id || "" };
    } catch (err) {
      logger.error({ err }, "[Lazada] sendMessage error");
      return { success: false, error: err.message };
    }
  }

  /**
   * Send a product/item message (Lazada template_id: 10006).
   */
  async sendProductMessage({ customerId, itemId, pageConfig, sessionId }) {
    const appKey = pageConfig?.channel_settings?.app_key || this.env.LAZADA_APP_KEY || "";
    const appSecret = pageConfig?.channel_settings?.app_secret || this.env.LAZADA_APP_SECRET || "";
    const session = sessionId || pageConfig?.channel_settings?.session_id || "";

    if (!appKey || !appSecret || !session) {
      return { success: false, error: "Missing Lazada credentials or session" };
    }

    try {
      const timestamp = String(Date.now());
      const path = "/im/message/send";
      const signBase = `${path}${timestamp}${appKey}${session}`;
      const sign = crypto.createHmac("md5", appSecret).update(signBase).digest("hex").toUpperCase();

      const url = `${LAZADA_API_BASE_PH}${path}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_key: appKey,
          timestamp,
          sign,
          session_id: session,
          template_id: 10006,  // item message
          content: JSON.stringify({ item_id: parseInt(itemId, 10) }),
          to_account_id: parseInt(customerId, 10),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `Lazada product send failed: ${txt}` };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get list of conversations (sessions) for a seller.
   */
  async getSessionList(pageConfig) {
    const appKey = pageConfig?.channel_settings?.app_key || this.env.LAZADA_APP_KEY || "";
    const appSecret = pageConfig?.channel_settings?.app_secret || this.env.LAZADA_APP_SECRET || "";

    if (!appKey || !appSecret) return [];

    try {
      const timestamp = String(Date.now());
      const path = "/im/session/list";
      const signBase = `${path}${timestamp}${appKey}`;
      const sign = crypto.createHmac("md5", appSecret).update(signBase).digest("hex").toUpperCase();

      const url = `${LAZADA_API_BASE_PH}${path}?app_key=${appKey}&timestamp=${timestamp}&sign=${sign}`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return [];

      const data = await res.json();
      return data?.data?.session_list || [];
    } catch (err) {
      logger.error({ err }, "[Lazada] getSessionList error");
      return [];
    }
  }

  /**
   * Verify Lazada webhook signature.
   * Lazada uses HMAC-MD5 with the app secret.
   */
  verifySignature(signature, body, config) {
    if (!signature || !config?.channel_settings?.app_secret) return false;

    const appSecret = config.channel_settings.app_secret;
    const expected = crypto.createHmac("md5", appSecret).update(body).digest("hex").toUpperCase();

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature.toUpperCase())
      );
    } catch {
      return false;
    }
  }
}

module.exports = { LazadaAdapter };
