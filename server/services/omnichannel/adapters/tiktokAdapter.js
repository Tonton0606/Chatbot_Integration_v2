/**
 * TikTok Business Messaging Adapter
 *
 * TikTok Business Messaging API allows businesses to send and receive
 * messages through TikTok's inbox. Key features:
 *   - Webhook events for incoming messages
 *   - Send text, image, and video messages
 *   - Welcome messages and suggested questions
 *   - 24-hour messaging window (similar to Meta)
 *
 * PH Market Notes:
 *   - TikTok is the fastest-growing social platform in the Philippines
 *   - #1 for short-form video content and live selling
 *   - Filipino SMBs use TikTok Shop for direct sales
 *   - Comment-to-DM is a major lead generation tool
 *
 * API Docs: https://business-api.tiktok.com/portal/docs
 */

const crypto = require("crypto");
const logger = require("../../../config/logger");
const { ChannelAdapter } = require("../channelAdapter");

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

class TikTokAdapter extends ChannelAdapter {
  constructor(opts) {
    super(opts);
    this.channel = "tiktok";
  }

  /**
   * Parse TikTok Business Messaging webhook payload.
   *
   * TikTok webhook event structure:
   *   {
   *     "event": "im.message.receive",
   *     "from_user_id": "...",
   *     "to_user_id": "...",  (business ID)
   *     "content": { "text": "..." },
   *     "message_id": "...",
   *     ...
   *   }
   */
  async parseWebhook(body) {
    const messages = [];

    if (!body) return messages;

    // TikTok sends different event types
    const eventType = body.event || body.type || "";

    // Handle message receive event
    if (eventType === "im.message.receive" || body.message) {
      const msgData = body.message || body;
      const senderId = msgData.from_user_id || msgData.sender_id || "";
      const recipientId = msgData.to_user_id || msgData.receiver_id || body.business_id || "";
      const content = msgData.content || {};
      const text = content.text || msgData.text || "";
      const msgType = content.type || msgData.message_type || "text";

      if (!senderId) return messages;

      let imageUrl = "";
      let mediaType = "text";

      if (msgType === "image" || content.image) {
        imageUrl = content.image?.url || content.image_url || "";
        mediaType = "image";
      } else if (msgType === "video" || content.video) {
        mediaType = "video";
      } else if (msgType === "audio" || content.audio) {
        mediaType = "audio";
      }

      messages.push({
        channel: "tiktok",
        pageId: recipientId,
        customerId: senderId,
        customerName: msgData.from_user_name || msgData.sender_name || "",
        customerAvatar: msgData.from_user_avatar || "",
        text,
        imageUrl,
        mediaType,
        platformMsgId: msgData.message_id || "",
        referral: body.referral ? {
          ref: body.referral.ref || "",
          adId: body.referral.ad_id || "",
          source: body.referral.source || "AD",
        } : null,
        raw: body,
      });
    }

    return messages;
  }

  /**
   * Parse TikTok comment events (if subscribed).
   * TikTok sends comment webhooks for business accounts.
   */
  async parseComments(body) {
    const comments = [];

    if (!body) return comments;

    const eventType = body.event || body.type || "";

    if (eventType === "video.comment.create" || eventType === "comment.create") {
      const data = body.data || body;
      const pageId = data.business_id || data.owner_id || "";
      const fromId = data.from_user_id || data.user_id || "";

      // Skip if from the page itself
      if (fromId && pageId && fromId === pageId) return comments;

      comments.push({
        channel: "tiktok",
        pageId,
        postId: data.video_id || data.post_id || "",
        commentId: data.comment_id || data.id || "",
        fromId,
        fromName: data.from_user_name || data.user_name || "",
        text: data.comment_text || data.text || "",
        raw: body,
      });
    }

    return comments;
  }

  /**
   * Send a message via TikTok Business Messaging API.
   */
  async sendMessage({ customerId, text, pageConfig }) {
    const accessToken = pageConfig?.access_token || "";
    const businessId = pageConfig?.page_id || pageConfig?.business_id || "";

    if (!accessToken || !businessId) {
      return { success: false, error: "Missing TikTok access token or business ID" };
    }

    try {
      const res = await fetch(
        `${TIKTOK_API_BASE}/business/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            business_id: businessId,
            recipient: { user_id: customerId },
            message: {
              type: "text",
              content: { text },
            },
          }),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        logger.warn({ status: res.status, body: txt }, "[TikTok] sendMessage failed");
        return { success: false, error: `TikTok send failed (${res.status}): ${txt}` };
      }

      const data = await res.json();
      return { success: true, platformMsgId: data?.data?.message_id || "" };
    } catch (err) {
      logger.error({ err }, "[TikTok] sendMessage error");
      return { success: false, error: err.message };
    }
  }

  /**
   * Send quick replies as suggested questions (TikTok native feature).
   */
  async sendQuickReplies({ customerId, text, replies, pageConfig }) {
    const accessToken = pageConfig?.access_token || "";
    const businessId = pageConfig?.page_id || pageConfig?.business_id || "";

    if (!accessToken || !businessId) {
      return this.sendMessage({ customerId, text, pageConfig });
    }

    try {
      const res = await fetch(
        `${TIKTOK_API_BASE}/business/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            business_id: businessId,
            recipient: { user_id: customerId },
            message: {
              type: "text",
              content: { text },
              suggested_questions: replies.map((r) => r.title),
            },
          }),
        }
      );

      if (!res.ok) {
        // Fallback to plain text
        return this.sendMessage({ customerId, text, pageConfig });
      }

      return { success: true };
    } catch {
      return this.sendMessage({ customerId, text, pageConfig });
    }
  }

  /**
   * Reply to a public TikTok comment.
   * TikTok Business API: POST /video/comment/reply/
   */
  async replyToComment({ commentId, text, pageConfig }) {
    const accessToken = pageConfig?.access_token || "";
    if (!accessToken) return { success: false, error: "No access token" };

    try {
      const res = await fetch(`${TIKTOK_API_BASE}/video/comment/reply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          comment_id: commentId,
          text,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `TikTok comment reply failed (${res.status}): ${txt}` };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Verify TikTok webhook signature.
   * TikTok uses a verification token in the webhook payload header.
   */
  verifySignature(signature, body, config) {
    if (!signature || !config?.verify_token) return false;

    // TikTok sends a verification token that must match
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(config.verify_token)
      );
    } catch {
      return false;
    }
  }
}

module.exports = { TikTokAdapter };
