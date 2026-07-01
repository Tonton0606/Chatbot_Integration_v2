/**
 * Shopee Chat Adapter
 *
 * Shopee Open Platform provides chat APIs for sellers to manage
 * buyer conversations. Key features:
 *   - /chat/v2/getMessages — retrieve buyer messages
 *   - /chat/v2/sendMessage — send text/image/product messages to buyers
 *   - Webhook push for new messages (via Shopee Push API)
 *   - 7-day conversation window after order creation
 *
 * PH Market Notes:
 *   - Shopee is the #1 e-commerce platform in the Philippines
 *   - Filipino SMBs heavily rely on Shopee chat for customer service
 *   - Common use cases: order inquiries, shipping questions, product details
 *   - Shopee has their own AI Chat Assistant (we build a better one)
 *
 * API Docs: https://open.shopee.com/developer-guide
 * PH Endpoint: https://partner.shopeemobile.com/api/v2
 *
 * Auth: Partner ID + Partner Key (HMAC-SHA256 signed requests)
 */

const crypto = require("crypto");
const logger = require("../../../config/logger");
const { ChannelAdapter } = require("../channelAdapter");

const SHOPEE_API_BASE = "https://partner.shopeemobile.com/api/v2";

class ShopeeAdapter extends ChannelAdapter {
  constructor(opts) {
    super(opts);
    this.channel = "shopee";
  }

  /**
   * Parse Shopee push notification webhook.
   *
   * Shopee sends push notifications for various events including:
   *   - chat.new_message — new buyer message
   *   - order.status_update — order status change
   *
   * The push payload contains:
   *   {
   *     "shop_id": 123456,
   *     "code": 0,
   *     "data": {
   *       "from_user_id": 123,
   *       "to_user_id": 456,
   *       "message_id": "...",
   *       "content": { "text": "..." },
   *       "message_type": "text"
   *     }
   *   }
   */
  async parseWebhook(body) {
    const messages = [];

    if (!body) return messages;

    const pushType = body.code || body.type || "";
    const shopId = String(body.shop_id || body.data?.shop_id || "");
    const data = body.data || body;

    // Handle new chat message push
    if (pushType === 0 || pushType === "chat.new_message" || data.message_id) {
      const fromId = String(data.from_user_id || data.sender_id || "");
      const toId = String(data.to_user_id || data.receiver_id || shopId);

      if (!fromId) return messages;

      const content = data.content || {};
      const text = content.text || data.text || "";
      const msgType = data.message_type || content.type || "text";

      let imageUrl = "";
      let mediaType = "text";

      if (msgType === "image" || content.image) {
        imageUrl = content.image?.url || content.image_url || "";
        mediaType = "image";
      } else if (msgType === "product" || content.product) {
        mediaType = "product";
      } else if (msgType === "order" || content.order) {
        mediaType = "order";
      }

      messages.push({
        channel: "shopee",
        pageId: shopId,
        customerId: fromId,
        customerName: data.from_user_name || "",
        customerAvatar: "",
        text,
        imageUrl,
        mediaType,
        platformMsgId: data.message_id || "",
        referral: null,
        raw: body,
      });
    }

    return messages;
  }

  /**
   * Send a message to a Shopee buyer.
   *
   * Uses the /chat/v2/sendMessage endpoint.
   * Requires: partner_id, partner_key, shop_id, and access token.
   */
  async sendMessage({ customerId, text, pageConfig }) {
    const partnerId = pageConfig?.channel_settings?.partner_id || this.env.SHOPEE_PARTNER_ID || "";
    const partnerKey = pageConfig?.channel_settings?.partner_key || this.env.SHOPEE_PARTNER_KEY || "";
    const shopId = pageConfig?.page_id || "";
    const accessToken = pageConfig?.access_token || "";

    if (!partnerId || !partnerKey || !shopId) {
      return { success: false, error: "Missing Shopee partner credentials" };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = "/api/v2/chat/sendMessage";
      const signBase = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
      const sign = crypto.createHmac("sha256", partnerKey).update(signBase).digest("hex");

      const url = `${SHOPEE_API_BASE}/chat/sendMessage?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: parseInt(customerId, 10),
          message_type: "text",
          content: { text },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        logger.warn({ status: res.status, body: txt }, "[Shopee] sendMessage failed");
        return { success: false, error: `Shopee send failed (${res.status}): ${txt}` };
      }

      const data = await res.json();
      if (data.error) {
        return { success: false, error: `Shopee error: ${data.error_msg || data.error}` };
      }

      return { success: true, platformMsgId: data?.response?.message_id || "" };
    } catch (err) {
      logger.error({ err }, "[Shopee] sendMessage error");
      return { success: false, error: err.message };
    }
  }

  /**
   * Send a product message (Shopee-specific feature).
   */
  async sendProductMessage({ customerId, productId, pageConfig }) {
    const partnerId = pageConfig?.channel_settings?.partner_id || this.env.SHOPEE_PARTNER_ID || "";
    const partnerKey = pageConfig?.channel_settings?.partner_key || this.env.SHOPEE_PARTNER_KEY || "";
    const shopId = pageConfig?.page_id || "";
    const accessToken = pageConfig?.access_token || "";

    if (!partnerId || !partnerKey || !shopId) {
      return { success: false, error: "Missing Shopee partner credentials" };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = "/api/v2/chat/sendMessage";
      const signBase = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
      const sign = crypto.createHmac("sha256", partnerKey).update(signBase).digest("hex");

      const url = `${SHOPEE_API_BASE}/chat/sendMessage?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: parseInt(customerId, 10),
          message_type: "product",
          content: { product_id: parseInt(productId, 10) },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `Shopee product send failed: ${txt}` };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Verify Shopee webhook signature.
   * Shopee uses HMAC-SHA256 with the partner key.
   */
  verifySignature(signature, body, config) {
    if (!signature || !config?.channel_settings?.partner_key) return false;

    const partnerKey = config.channel_settings.partner_key;
    const expected = crypto.createHmac("sha256", partnerKey).update(body).digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );
    } catch {
      return false;
    }
  }
}

module.exports = { ShopeeAdapter };
