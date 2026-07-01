/**
 * Omni-Channel Webhook Router
 *
 * Receives webhooks from Instagram, TikTok, Shopee, and Lazada,
 * dispatches them to the appropriate channel adapter, and processes
 * the normalized messages through the unified AI engine.
 *
 * Route: /api/webhooks/omnichannel/:channel
 *
 * Facebook Messenger continues to use its own /api/webhooks/facebook route
 * (unchanged). This router handles the new channels only.
 */

const express = require("express");
const logger = require("../../config/logger");
const { supabase } = require("../../config/supabase");

const { InstagramAdapter } = require("../../services/omnichannel/adapters/instagramAdapter");
const { TikTokAdapter } = require("../../services/omnichannel/adapters/tiktokAdapter");
const { ShopeeAdapter } = require("../../services/omnichannel/adapters/shopeeAdapter");
const { LazadaAdapter } = require("../../services/omnichannel/adapters/lazadaAdapter");

const { processIncomingMessage, processIncomingComment } = require("../../services/omnichannel/messageProcessor");

const router = express.Router();

// ── Adapter registry ──────────────────────────────────────────────────────────

const adapters = {
  instagram: new InstagramAdapter({ supabaseClient: supabase, env: process.env }),
  tiktok: new TikTokAdapter({ supabaseClient: supabase, env: process.env }),
  shopee: new ShopeeAdapter({ supabaseClient: supabase, env: process.env }),
  lazada: new LazadaAdapter({ supabaseClient: supabase, env: process.env }),
};

// ── Dedup cache (same pattern as Facebook webhook) ────────────────────────────

const WEBHOOK_EVENT_TTL_MS = 2 * 60 * 1000;
const recentEvents = new Map();

function isDuplicateEvent(platformMsgId) {
  if (!platformMsgId) return false;
  const now = Date.now();
  const key = platformMsgId;

  if (recentEvents.has(key)) {
    const ts = recentEvents.get(key);
    if (now - ts < WEBHOOK_EVENT_TTL_MS) return true;
  }

  recentEvents.set(key, now);

  // Cleanup old entries
  if (recentEvents.size > 500) {
    for (const [k, ts] of recentEvents) {
      if (now - ts > WEBHOOK_EVENT_TTL_MS) recentEvents.delete(k);
    }
  }

  return false;
}

// ── Signature verification ────────────────────────────────────────────────────

const SIGNATURE_HEADERS = {
  instagram: "x-hub-signature-256",
  tiktok: "x-tiktok-signature",
  shopee: "x-shopee-signature",
  lazada: "authorization",
};

function getVerificationConfig(channel) {
  if (channel === "instagram") {
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    return appSecret ? { app_secret: appSecret } : null;
  }
  if (channel === "tiktok") {
    const verifyToken = process.env.TIKTOK_VERIFY_TOKEN;
    return verifyToken ? { verify_token: verifyToken } : null;
  }
  if (channel === "shopee") {
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;
    return partnerKey ? { channel_settings: { partner_key: partnerKey } } : null;
  }
  if (channel === "lazada") {
    const appSecret = process.env.LAZADA_APP_SECRET;
    return appSecret ? { channel_settings: { app_secret: appSecret } } : null;
  }
  return null;
}

async function verifyWebhookSignature(channel, adapter, req) {
  const sigHeader = SIGNATURE_HEADERS[channel];
  if (!sigHeader) return true;

  const signature = req.get(sigHeader);
  if (!signature) {
    logger.warn({ channel, sigHeader }, "[OmniChannel] Missing signature header");
    return false;
  }

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});

  const envConfig = getVerificationConfig(channel);
  if (envConfig) {
    const valid = adapter.verifySignature(signature, rawBody, envConfig);
    if (!valid) {
      logger.warn({ channel }, "[OmniChannel] Signature verification failed (env config)");
      return false;
    }
    return true;
  }

  logger.debug({ channel }, "[OmniChannel] No env secret configured — skipping signature verification (dev mode)");
  return true;
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/webhooks/omnichannel/:channel
 * Webhook verification (Instagram uses the same hub.challenge as Facebook)
 */
router.get("/:channel", (req, res) => {
  const channel = req.params.channel;
  const adapter = adapters[channel];

  if (!adapter) {
    return res.status(404).send("Unknown channel");
  }

  // Meta (Instagram) verification
  if (channel === "instagram") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && challenge) {
      logger.info({ channel }, "[OmniChannel] Webhook verified");
      return res.status(200).send(challenge);
    }
  }

  // TikTok verification
  if (channel === "tiktok") {
    const challenge = req.query["challenge"] || req.query["hub.challenge"];
    if (challenge) {
      return res.status(200).send(challenge);
    }
  }

  // Shopee verification
  if (channel === "shopee") {
    const challenge = req.query["challenge"] || req.query["echo"];
    if (challenge) {
      return res.status(200).send(challenge);
    }
  }

  // Lazada verification
  if (channel === "lazada") {
    const challenge = req.query["challenge"] || req.query["echo"];
    if (challenge) {
      return res.status(200).send(challenge);
    }
  }

  return res.status(200).send("OK");
});

/**
 * POST /api/webhooks/omnichannel/:channel
 * Receive and process webhook events
 */
router.post("/:channel", async (req, res) => {
  const channel = req.params.channel;
  const adapter = adapters[channel];

  if (!adapter) {
    return res.status(404).send("Unknown channel");
  }

  const payloadSize = JSON.stringify(req.body || {}).length;
  logger.info({
    channel,
    payloadSize,
    bodyKeys: Object.keys(req.body || {}),
  }, "[OmniChannel] Webhook received");

  const signatureValid = await verifyWebhookSignature(channel, adapter, req);
  if (!signatureValid) {
    logger.warn({ channel }, "[OmniChannel] Webhook rejected — invalid signature");
    return res.status(403).send("INVALID_SIGNATURE");
  }

  // Respond immediately — process async (same pattern as Facebook)
  res.status(200).send("EVENT_RECEIVED");

  try {
    // 1. Parse messages from webhook
    const messages = await adapter.parseWebhook(req.body);

    // 2. Parse comments from webhook
    const comments = await adapter.parseComments(req.body);

    if (messages.length === 0 && comments.length === 0) {
      logger.debug({ channel }, "[OmniChannel] No messages or comments in webhook");
      return;
    }

    // 3. Process messages
    for (const msg of messages) {
      if (isDuplicateEvent(msg.platformMsgId)) {
        logger.info({ channel, platformMsgId: msg.platformMsgId }, "[OmniChannel] Skipping duplicate message");
        continue;
      }

      // Get channel config
      const pageConfig = await adapter.getChannelConfig(msg.pageId);
      if (!pageConfig) {
        logger.warn({ channel, pageId: msg.pageId }, "[OmniChannel] No channel config found — skipping");
        continue;
      }

      // Process async — don't block other messages
      processIncomingMessage(msg, adapter, pageConfig).catch((err) => {
        logger.error({ err, channel, customerId: msg.customerId }, "[OmniChannel] Message processing failed");
      });
    }

    // 4. Process comments
    for (const comment of comments) {
      if (isDuplicateEvent(comment.commentId)) continue;

      const pageConfig = await adapter.getChannelConfig(comment.pageId);
      if (!pageConfig) {
        logger.warn({ channel, pageId: comment.pageId }, "[OmniChannel] No channel config for comment — skipping");
        continue;
      }

      processIncomingComment(comment, adapter, pageConfig).catch((err) => {
        logger.error({ err, channel, commentId: comment.commentId }, "[OmniChannel] Comment processing failed");
      });
    }
  } catch (err) {
    logger.error({ err, channel }, "[OmniChannel] Webhook processing error");
  }
});

module.exports = router;
