/**
 * Omni-Channel Inbox API Routes
 *
 * Provides admin and client workspace users with a unified inbox view
 * across all channels (Instagram, TikTok, Shopee, Lazada).
 *
 * All routes require auth + workspace scope.
 */

const express = require("express");
const logger = require("../../config/logger");
const { supabase } = require("../../config/supabase");

const { InstagramAdapter } = require("../../services/omnichannel/adapters/instagramAdapter");
const { TikTokAdapter } = require("../../services/omnichannel/adapters/tiktokAdapter");
const { ShopeeAdapter } = require("../../services/omnichannel/adapters/shopeeAdapter");
const { LazadaAdapter } = require("../../services/omnichannel/adapters/lazadaAdapter");

const adapters = {
  instagram: new InstagramAdapter({ supabaseClient: supabase, env: process.env }),
  tiktok: new TikTokAdapter({ supabaseClient: supabase, env: process.env }),
  shopee: new ShopeeAdapter({ supabaseClient: supabase, env: process.env }),
  lazada: new LazadaAdapter({ supabaseClient: supabase, env: process.env }),
};

const router = express.Router();

function normalizeText(v) {
  return typeof v === "string" ? v.trim() : "";
}

// ── Conversations ─────────────────────────────────────────────────────────────

/**
 * GET /api/omnichannel/conversations
 * List conversations for the workspace, optionally filtered by channel/status.
 */
router.get("/conversations", async (req, res) => {
  const workspaceId = req.workspaceId;
  const { channel, status, search, limit, offset } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID required" });
  }

  try {
    const pageNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    const fbOnly = channel === "facebook";
    const omniOnly = channel && channel !== "all" && channel !== "facebook";

    let fbConvs = [];
    let omniConvs = [];
    let omniCount = 0;

    if (!fbOnly) {
      let query = supabase
        .from("omnichannel_conversations")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);

      if (omniOnly) {
        query = query.eq("channel", channel);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,last_message.ilike.%${search}%`);
      }

      query = query
        .order("updated_at", { ascending: false })
        .range(offsetNum, offsetNum + pageNum - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error({ err: error, workspaceId }, "[OmniInbox] Failed to list conversations");
        return res.status(500).json({ error: "Failed to load conversations" });
      }

      omniConvs = (data || []).map((c) => ({ ...c, source_table: "omnichannel" }));
      omniCount = count || 0;
    }

    if (fbOnly || channel === "all" || !channel) {
      let fbQuery = supabase
        .from("client_facebook_conversations")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (status && status !== "all") {
        fbQuery = fbQuery.eq("status", status);
      }

      if (search) {
        fbQuery = fbQuery.or(`customer_name.ilike.%${search}%,last_message.ilike.%${search}%`);
      }

      fbQuery = fbQuery
        .order("updated_at", { ascending: false })
        .limit(fbOnly ? pageNum : 50);

      const { data: fbData, error: fbErr } = await fbQuery;

      if (!fbErr && fbData) {
        fbConvs = fbData.map((c) => ({
          ...c,
          channel: "facebook",
          customer_id: c.customer_psid || "",
          customer_avatar: c.customer_profile_pic || "",
          source_table: "facebook",
        }));
      }
    }

    const allConvs = [...omniConvs, ...fbConvs]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, pageNum);

    const totalCount = omniCount + fbConvs.length;

    return res.json({ conversations: allConvs, total: totalCount });
  } catch (err) {
    logger.error({ err, workspaceId }, "[OmniInbox] Conversations route error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/omnichannel/conversations/:id
 * Get a single conversation with its messages.
 */
router.get("/conversations/:id", async (req, res) => {
  const workspaceId = req.workspaceId;
  const conversationId = req.params.id;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "Workspace ID and conversation ID required" });
  }

  try {
    const { data: conv, error: convErr } = await supabase
      .from("omnichannel_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (convErr || !conv) {
      const { data: fbConv } = await supabase
        .from("client_facebook_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!fbConv) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const { data: fbMessages } = await supabase
        .from("client_facebook_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      return res.json({
        conversation: { ...fbConv, channel: "facebook", source_table: "facebook" },
        messages: (fbMessages || []).map((m) => ({
          ...m,
          sender_type: m.sender_type || (m.is_from_bot ? "bot" : "customer"),
          message_text: m.message_text || m.text || "",
        })),
      });
    }

    const { data: messages, error: msgErr } = await supabase
      .from("omnichannel_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgErr) {
      logger.error({ err: msgErr, conversationId }, "[OmniInbox] Failed to load messages");
    }

    return res.json({ conversation: { ...conv, source_table: "omnichannel" }, messages: messages || [] });
  } catch (err) {
    logger.error({ err, conversationId }, "[OmniInbox] Conversation detail error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Channel Configs ───────────────────────────────────────────────────────────

/**
 * GET /api/omnichannel/channels
 * List all channel configurations for the workspace.
 */
router.get("/channels", async (req, res) => {
  const workspaceId = req.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID required" });
  }

  try {
    const { data, error } = await supabase
      .from("omnichannel_channel_configs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("channel", { ascending: true });

    if (error) {
      logger.error({ err: error, workspaceId }, "[OmniInbox] Failed to list channel configs");
      return res.status(500).json({ error: "Failed to load channels" });
    }

    return res.json({ channels: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId }, "[OmniInbox] Channels route error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/omnichannel/channels
 * Create or update a channel configuration.
 */
router.post("/channels", async (req, res) => {
  const workspaceId = req.workspaceId;
  const {
    channel,
    pageId,
    pageName,
    accessToken,
    refreshToken,
    chatbotEnabled,
    commentAutoreplyEnabled,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    knowledge,
    aiInstruction,
    channelSettings,
    accessMode,
  } = req.body;

  if (!workspaceId || !channel || !pageId) {
    return res.status(400).json({ error: "workspaceId, channel, and pageId are required" });
  }

  const validChannels = ["instagram", "tiktok", "shopee", "lazada"];
  if (!validChannels.includes(channel)) {
    return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` });
  }

  try {
    const { data, error } = await supabase
      .from("omnichannel_channel_configs")
      .upsert({
        workspace_id: workspaceId,
        channel,
        page_id: pageId,
        page_name: pageName || "",
        access_token: accessToken || "",
        refresh_token: refreshToken || "",
        chatbot_enabled: chatbotEnabled !== false,
        comment_autoreply_enabled: commentAutoreplyEnabled !== false,
        business_type: businessType || "",
        product_services: productServices || "",
        product_service_price_ranges: productServicePriceRanges || "",
        website_link: websiteLink || "",
        knowledge: knowledge || "",
        ai_instruction: aiInstruction || "",
        channel_settings: channelSettings || {},
        access_mode: accessMode || "enable",
        is_connected: Boolean(accessToken),
        connected_at: accessToken ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,channel,page_id" })
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, workspaceId, channel }, "[OmniInbox] Failed to save channel config");
      return res.status(500).json({ error: "Failed to save channel configuration" });
    }

    return res.json({ channel: data });
  } catch (err) {
    logger.error({ err, workspaceId, channel }, "[OmniInbox] Channel save error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/omnichannel/channels/:id
 * Disconnect a channel.
 */
router.delete("/channels/:id", async (req, res) => {
  const workspaceId = req.workspaceId;
  const configId = req.params.id;

  if (!workspaceId || !configId) {
    return res.status(400).json({ error: "Workspace ID and config ID required" });
  }

  try {
    const { error } = await supabase
      .from("omnichannel_channel_configs")
      .update({
        is_connected: false,
        access_token: "",
        refresh_token: "",
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", configId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return res.status(500).json({ error: "Failed to disconnect channel" });
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, configId }, "[OmniInbox] Channel disconnect error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Human Handoff ─────────────────────────────────────────────────────────────

/**
 * POST /api/omnichannel/conversations/:id/reply
 * Send an agent reply through the channel adapter.
 */
router.post("/conversations/:id/reply", async (req, res) => {
  const workspaceId = req.workspaceId;
  const conversationId = req.params.id;
  const { text } = req.body;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "Workspace ID and conversation ID required" });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Reply text is required" });
  }

  try {
    const { data: conv, error: convErr } = await supabase
      .from("omnichannel_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (convErr || !conv) {
      const { data: fbConv } = await supabase
        .from("client_facebook_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!fbConv) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const { createFacebookGraphApi } = require("../../services/facebook/facebookGraphApi");
      const { createFacebookConfigService } = require("../../services/facebook/facebookConfig");
      const fbConfigService = createFacebookConfigService({ supabaseClient: supabase, runtimeConfig: {}, env: process.env });
      const fbGraphApi = createFacebookGraphApi({ getFacebookConfig: fbConfigService.getFacebookConfig });

      const sendResult = await fbGraphApi.sendFacebookMessage(
        fbConv.customer_psid,
        text.trim(),
        { pageId: fbConv.page_id }
      );

      if (!sendResult?.success) {
        return res.status(500).json({ error: sendResult?.error || "Failed to send Facebook reply" });
      }

      await supabase.from("client_facebook_messages").insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: "agent",
        message_text: text.trim(),
        is_from_bot: false,
      }).catch(() => {});

      await supabase.from("client_facebook_conversations")
        .update({ last_message: text.trim(), updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return res.json({ success: true });
    }

    if (conv.channel === "facebook" || conv.source_table === "facebook") {
      const { createFacebookGraphApi } = require("../../services/facebook/facebookGraphApi");
      const { createFacebookConfigService } = require("../../services/facebook/facebookConfig");
      const fbConfigService = createFacebookConfigService({ supabaseClient: supabase, runtimeConfig: {}, env: process.env });
      const fbGraphApi = createFacebookGraphApi({ getFacebookConfig: fbConfigService.getFacebookConfig });

      const sendResult = await fbGraphApi.sendFacebookMessage(
        conv.customer_psid || conv.customer_id,
        text.trim(),
        { pageId: conv.page_id }
      );

      if (!sendResult?.success) {
        return res.status(500).json({ error: sendResult?.error || "Failed to send Facebook reply" });
      }

      await supabase.from("client_facebook_messages").insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: "agent",
        message_text: text.trim(),
        is_from_bot: false,
      }).catch(() => {});

      await supabase.from("client_facebook_conversations")
        .update({ last_message: text.trim(), updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return res.json({ success: true });
    }

    const adapter = adapters[conv.channel];
    if (!adapter) {
      return res.status(400).json({ error: `No adapter for channel: ${conv.channel}` });
    }

    const pageConfig = await adapter.getChannelConfig(conv.page_id);
    if (!pageConfig) {
      return res.status(400).json({ error: "Channel config not found" });
    }

    const sendParams = {
      customerId: conv.customer_id,
      text: text.trim(),
      pageConfig,
    };

    if (conv.channel === "lazada" && conv.metadata?.sessionId) {
      sendParams.sessionId = conv.metadata.sessionId;
    }

    const sendResult = await adapter.sendMessage(sendParams);

    if (!sendResult.success) {
      logger.warn({ err: sendResult.error, conversationId }, "[OmniInbox] Agent reply send failed");
      return res.status(500).json({ error: sendResult.error || "Failed to send reply" });
    }

    await adapter.appendMessage({
      conversationId,
      workspaceId,
      senderType: "agent",
      senderName: req.user?.email || "Agent",
      messageText: text.trim(),
      messageType: "text",
      platformMsgId: sendResult.platformMsgId || "",
      metadata: { agentReply: true },
    });

    return res.json({ success: true, platformMsgId: sendResult.platformMsgId });
  } catch (err) {
    logger.error({ err, conversationId }, "[OmniInbox] Agent reply error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/omnichannel/conversations/:id/handoff
 * Pause the bot and mark conversation for human handoff.
 */
router.post("/conversations/:id/handoff", async (req, res) => {
  const workspaceId = req.workspaceId;
  const conversationId = req.params.id;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "Workspace ID and conversation ID required" });
  }

  try {
    const { error } = await supabase
      .from("omnichannel_conversations")
      .update({
        bot_paused: true,
        needs_human: true,
        status: "human_handoff",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("workspace_id", workspaceId);

    if (error) {
      const { error: fbErr } = await supabase
        .from("client_facebook_conversations")
        .update({
          bot_paused: true,
          needs_human: true,
          status: "human_handoff",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId);

      if (fbErr) {
        return res.status(500).json({ error: "Failed to enable handoff" });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, conversationId }, "[OmniInbox] Handoff error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/omnichannel/conversations/:id/enable-chatbot
 * Resume the bot after human handoff.
 */
router.post("/conversations/:id/enable-chatbot", async (req, res) => {
  const workspaceId = req.workspaceId;
  const conversationId = req.params.id;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "Workspace ID and conversation ID required" });
  }

  try {
    const { error } = await supabase
      .from("omnichannel_conversations")
      .update({
        bot_paused: false,
        needs_human: false,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("workspace_id", workspaceId);

    if (error) {
      const { error: fbErr } = await supabase
        .from("client_facebook_conversations")
        .update({
          bot_paused: false,
          needs_human: false,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId);

      if (fbErr) {
        return res.status(500).json({ error: "Failed to enable chatbot" });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, conversationId }, "[OmniInbox] Enable chatbot error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * POST /api/omnichannel/conversations/:id/resolve
 * Mark a conversation as resolved.
 */
router.post("/conversations/:id/resolve", async (req, res) => {
  const workspaceId = req.workspaceId;
  const conversationId = req.params.id;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "Workspace ID and conversation ID required" });
  }

  try {
    const { error } = await supabase
      .from("omnichannel_conversations")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("workspace_id", workspaceId);

    if (error) {
      const { error: fbErr } = await supabase
        .from("client_facebook_conversations")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId);

      if (fbErr) {
        return res.status(500).json({ error: "Failed to resolve conversation" });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, conversationId }, "[OmniInbox] Resolve error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/omnichannel/analytics
 * Get cross-channel analytics summary.
 */
router.get("/analytics", async (req, res) => {
  const workspaceId = req.workspaceId;

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID required" });
  }

  try {
    // Conversation counts by channel
    const { data: byChannel } = await supabase
      .from("omnichannel_conversations")
      .select("channel, status")
      .eq("workspace_id", workspaceId);

    const channelStats = {};
    for (const row of byChannel || []) {
      if (!channelStats[row.channel]) {
        channelStats[row.channel] = { total: 0, active: 0, human_handoff: 0, resolved: 0 };
      }
      channelStats[row.channel].total++;
      if (channelStats[row.channel][row.status] !== undefined) {
        channelStats[row.channel][row.status]++;
      }
    }

    // Facebook conversation counts
    const { data: fbByChannel } = await supabase
      .from("client_facebook_conversations")
      .select("status")
      .eq("workspace_id", workspaceId);

    if (fbByChannel && fbByChannel.length > 0) {
      channelStats.facebook = { total: 0, active: 0, human_handoff: 0, resolved: 0 };
      for (const row of fbByChannel) {
        channelStats.facebook.total++;
        if (channelStats.facebook[row.status] !== undefined) {
          channelStats.facebook[row.status]++;
        }
      }
    }

    // Message counts
    const { count: totalMessages } = await supabase
      .from("omnichannel_messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Follow-up stats
    const { data: followUps } = await supabase
      .from("omnichannel_follow_ups")
      .select("status, channel")
      .eq("workspace_id", workspaceId);

    const followUpStats = { sent: 0, pending: 0, failed: 0, skipped: 0 };
    for (const fu of followUps || []) {
      if (followUpStats[fu.status] !== undefined) followUpStats[fu.status]++;
    }

    return res.json({
      channels: channelStats,
      totalMessages: totalMessages || 0,
      followUps: followUpStats,
    });
  } catch (err) {
    logger.error({ err, workspaceId }, "[OmniInbox] Analytics error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
