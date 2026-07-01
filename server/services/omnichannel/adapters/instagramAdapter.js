/**
 * Instagram Channel Adapter
 *
 * Instagram uses the same Meta Graph API as Facebook Messenger.
 * Webhook payload structure is nearly identical — the main differences:
 *   - `req.body.object` is "instagram" (not "page")
 *   - Entry contains `messaging[]` for DMs and `changes[]` for comments
 *   - 24-hour messaging window is strictly enforced
 *   - Send API uses `/me/messages` with the IG account's access token
 *
 * PH Market Notes:
 *   - Instagram is the #2 social platform in the Philippines (after FB)
 *   - Heavy use for business / influencer marketing
 *   - Comment-to-DM is the primary growth tool for IG sellers
 */

const crypto = require("crypto");
const logger = require("../../../config/logger");
const { ChannelAdapter } = require("../channelAdapter");

const IG_GRAPH_API_BASE = "https://graph.facebook.com/v22.0";

class InstagramAdapter extends ChannelAdapter {
  constructor(opts) {
    super(opts);
    this.channel = "instagram";
  }

  /**
   * Parse Instagram webhook payload.
   * Handles both DM messages (entry.messaging) and comment events (entry.changes).
   */
  async parseWebhook(body) {
    const messages = [];

    if (!body || body.object !== "instagram") return messages;

    for (const entry of body.entry || []) {
      // ── DM messages ──
      for (const event of entry.messaging || []) {
        const senderId = event?.sender?.id;
        const recipientId = event?.recipient?.id;
        const msg = event?.message;

        if (!senderId || !msg) continue;

        const text = msg.text || "";
        const attachments = msg.attachments || [];
        const mediaAttachment = attachments.find((a) =>
          ["image", "video", "audio", "file"].includes(a.type)
        );

        // Ad referral context
        let referral = null;
        if (event.referral) {
          referral = {
            ref: event.referral.ref || "",
            adId: event.referral.ad_id || "",
            adsetId: event.referral.adset_id || "",
            campaignId: event.referral.campaign_id || "",
            source: event.referral.source || "AD",
          };
        }

        messages.push({
          channel: "instagram",
          pageId: recipientId || "",
          customerId: senderId,
          customerName: "", // IG doesn't send name in webhook; resolved via Graph API
          customerAvatar: "",
          text,
          imageUrl: mediaAttachment?.payload?.url || "",
          mediaType: mediaAttachment?.type || "text",
          platformMsgId: msg.mid || "",
          referral,
          raw: event,
        });
      }
    }

    return messages;
  }

  /**
   * Parse Instagram comment events from webhook.
   */
  async parseComments(body) {
    const comments = [];

    if (!body || body.object !== "instagram") return comments;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "comments") continue;

        const v = change.value;
        if (!v || v.verb !== "add" || !v.id) continue;

        // Skip if comment is from the page itself
        const fromId = String(v.from?.id || "");
        const pageId = String(entry.id || "");
        if (fromId && pageId && fromId === pageId) continue;

        comments.push({
          channel: "instagram",
          pageId,
          postId: v.media_id || "",
          commentId: v.id,
          fromId,
          fromName: v.from?.name || "",
          text: v.text || "",
          raw: change,
        });
      }
    }

    return comments;
  }

  /**
   * Send a DM via Instagram Messaging API.
   */
  async sendMessage({ customerId, text, pageConfig }) {
    const token = pageConfig?.access_token || pageConfig?.pageAccessToken;
    if (!token) return { success: false, error: "No access token" };

    try {
      const res = await fetch(
        `${IG_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: customerId },
            messaging_type: "RESPONSE",
            message: { text },
          }),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        logger.warn({ status: res.status, body: txt }, "[Instagram] sendMessage failed");
        return { success: false, error: `IG send failed (${res.status}): ${txt}` };
      }

      const data = await res.json();
      return { success: true, platformMsgId: data?.message_id || "" };
    } catch (err) {
      logger.error({ err }, "[Instagram] sendMessage error");
      return { success: false, error: err.message };
    }
  }

  /**
   * Send typing indicator.
   */
  async sendTypingOn({ customerId, pageConfig }) {
    const token = pageConfig?.access_token || pageConfig?.pageAccessToken;
    if (!token) return;

    try {
      await fetch(
        `${IG_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: customerId },
            sender_action: "typing_on",
          }),
        }
      );
    } catch {}
  }

  async sendTypingOff({ customerId, pageConfig }) {
    const token = pageConfig?.access_token || pageConfig?.pageAccessToken;
    if (!token) return;

    try {
      await fetch(
        `${IG_GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: customerId },
            sender_action: "typing_off",
          }),
        }
      );
    } catch {}
  }

  /**
   * Reply to a public Instagram comment.
   */
  async replyToComment({ commentId, text, pageConfig }) {
    const token = pageConfig?.access_token || pageConfig?.pageAccessToken;
    if (!token) return { success: false, error: "No access token" };

    try {
      const res = await fetch(
        `${IG_GRAPH_API_BASE}/${commentId}/replies?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: `IG comment reply failed (${res.status}): ${txt}` };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Verify Instagram webhook signature (same HMAC algorithm as Facebook).
   */
  verifySignature(signature, body, config) {
    if (!signature || !config?.app_secret) return false;

    const expected = crypto
      .createHmac("sha256", config.app_secret)
      .update(body)
      .digest("hex");

    const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(sig)
      );
    } catch {
      return false;
    }
  }
}

module.exports = { InstagramAdapter };
