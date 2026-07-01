/**
 * Omni-Channel Follow-Up Scheduler
 *
 * Runs every 30 minutes. Finds conversations across all non-Facebook channels
 * where the bot sent the last message but the customer never replied, then
 * sends a contextual follow-up.
 *
 * Follow-up windows:
 *   24h — "We're still here!" / "Nandito pa kami!"
 *   48h — Final check-in before marking lead as cold
 *
 * This mirrors the existing facebookFollowUpScheduler.js but operates on
 * the omnichannel_conversations table for Instagram, TikTok, Shopee, Lazada.
 *
 * PH Market Notes:
 *   - Filipino customers often go silent after initial inquiry
 *   - Follow-up messages in Tagalog significantly improve response rates
 *   - 24h window compliance is enforced per-channel (Meta, TikTok, Shopee, Lazada)
 */

const logger = require("../../config/logger");
const { supabase } = require("../../config/supabase");

const { InstagramAdapter } = require("./adapters/instagramAdapter");
const { TikTokAdapter } = require("./adapters/tiktokAdapter");
const { ShopeeAdapter } = require("./adapters/shopeeAdapter");
const { LazadaAdapter } = require("./adapters/lazadaAdapter");

const adapters = {
  instagram: new InstagramAdapter({ supabaseClient: supabase, env: process.env }),
  tiktok: new TikTokAdapter({ supabaseClient: supabase, env: process.env }),
  shopee: new ShopeeAdapter({ supabaseClient: supabase, env: process.env }),
  lazada: new LazadaAdapter({ supabaseClient: supabase, env: process.env }),
};

const FOLLOWUP_24H_MS = 24 * 60 * 60 * 1000;
const FOLLOWUP_48H_MS = 48 * 60 * 60 * 1000;
const INTERVAL_MS = 30 * 60 * 1000;

function isTagalog(text = "") {
  return /\b(po|opo|salamat|magkano|presyo|saan|paano|pwede|pede|meron|wala|ang|ng|mga|ay|hindi|oo|gusto)\b/i.test(text);
}

function buildFollowUpMessage({ pageName, wave, isTagalogUser }) {
  const biz = pageName || "us";

  if (wave === 1) {
    return isTagalogUser
      ? `Hi! Nandito pa kami sa ${biz} 😊 May katanungan pa ba kayo? Handa kaming tumulong!`
      : `Hey! We're still here at ${biz} 😊 Do you have any questions? We're happy to help!`;
  }

  return isTagalogUser
    ? `Huling tsansa ito! Kung may katanungan pa kayo o gusto na kayong mag-order, nandito lang kami sa ${biz}. Huwag mahiyang mag-message! 🙏`
    : `Last check-in from ${biz}! If you still have questions or want to place an order, we're just a message away 🙏`;
}

async function runOmniChannelFollowUpCheck() {
  const now = Date.now();
  const cutoff24h = new Date(now - FOLLOWUP_24H_MS).toISOString();

  const { data: convs, error } = await supabase
    .from("omnichannel_conversations")
    .select("*")
    .eq("last_sender_type", "bot")
    .eq("bot_paused", false)
    .neq("status", "human_handoff")
    .neq("status", "resolved")
    .neq("status", "closed")
    .lte("updated_at", cutoff24h)
    .lt("follow_up_wave", 2)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    logger.warn({ err: error }, "[OmniFollowUp] Failed to query unanswered conversations");
    return;
  }

  if (!convs || convs.length === 0) return;

  logger.info({ count: convs.length }, "[OmniFollowUp] Processing unanswered conversations");

  for (const conv of convs) {
    try {
      const lastAt = new Date(conv.updated_at).getTime();
      const elapsed = now - lastAt;
      const wave = conv.follow_up_wave || 0;

      let nextWave = null;
      if (wave === 0 && elapsed >= FOLLOWUP_24H_MS) nextWave = 1;
      if (wave === 1 && elapsed >= FOLLOWUP_48H_MS) nextWave = 2;
      if (nextWave === null) continue;

      const adapter = adapters[conv.channel];
      if (!adapter) {
        logger.warn({ channel: conv.channel }, "[OmniFollowUp] No adapter for channel — skipping");
        continue;
      }

      // Get channel config
      const pageConfig = await adapter.getChannelConfig(conv.page_id);
      if (!pageConfig?.access_token && conv.channel !== "lazada") {
        logger.warn({ channel: conv.channel, pageId: conv.page_id }, "[OmniFollowUp] No token — skipping");
        continue;
      }

      const userLang = isTagalog(conv.last_message || "");
      const followUpText = buildFollowUpMessage({
        pageName: pageConfig?.page_name || conv.page_name,
        wave: nextWave,
        isTagalogUser: userLang,
      });

      // Send via adapter
      const sendParams = {
        customerId: conv.customer_id,
        text: followUpText,
        pageConfig,
      };

      // Lazada needs session_id from metadata
      if (conv.channel === "lazada" && conv.metadata?.sessionId) {
        sendParams.sessionId = conv.metadata.sessionId;
      }

      const sendResult = await adapter.sendMessage(sendParams);

      if (!sendResult.success) {
        logger.warn({ convId: conv.id, error: sendResult.error }, "[OmniFollowUp] Send failed — marking as wave 2");

        await supabase
          .from("omnichannel_conversations")
          .update({ follow_up_wave: 2, updated_at: new Date().toISOString() })
          .eq("id", conv.id);
        continue;
      }

      // Update conversation
      await supabase
        .from("omnichannel_conversations")
        .update({
          follow_up_wave: nextWave,
          last_follow_up_at: new Date().toISOString(),
          last_sender_type: "bot",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);

      // Store follow-up message
      await supabase
        .from("omnichannel_messages")
        .insert({
          conversation_id: conv.id,
          workspace_id: conv.workspace_id,
          sender_type: "bot",
          sender_name: pageConfig?.page_name || "Exponify AI",
          message_text: followUpText,
          message_type: "text",
          ai_generated: true,
          reply_source: "follow_up",
          metadata: { follow_up_wave: nextWave, channel: conv.channel },
        });

      // Record follow-up
      await supabase
        .from("omnichannel_follow_ups")
        .insert({
          workspace_id: conv.workspace_id,
          conversation_id: conv.id,
          channel: conv.channel,
          wave: nextWave,
          message_text: followUpText,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

      // Fire workflow trigger
      await supabase.from("workflow_executions").insert({
        workspace_id: conv.workspace_id,
        trigger_event: nextWave === 1 ? "omnichannel.no_reply_24h" : "omnichannel.no_reply_48h",
        trigger_data: {
          workspace_id: conv.workspace_id,
          conversation_id: conv.id,
          customer_id: conv.customer_id,
          customer_name: conv.customer_name,
          channel: conv.channel,
          page_id: conv.page_id,
          last_message: conv.last_message,
          follow_up_wave: nextWave,
        },
        status: "pending",
      }).catch(() => {});

      logger.info({
        convId: conv.id,
        channel: conv.channel,
        wave: nextWave,
      }, "[OmniFollowUp] Follow-up sent");

      // Throttle
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      logger.warn({ err, convId: conv.id }, "[OmniFollowUp] Failed for conversation — continuing");
    }
  }
}

/**
 * Start the follow-up scheduler interval.
 */
function startOmniChannelFollowUpScheduler() {
  logger.info("[OmniFollowUp] Scheduler started — running every 30 minutes");

  // Run immediately on startup (after 10s delay for server boot)
  setTimeout(() => {
    runOmniChannelFollowUpCheck().catch((err) => {
      logger.error({ err }, "[OmniFollowUp] Initial run failed");
    });
  }, 10000);

  // Then every 30 minutes
  setInterval(() => {
    runOmniChannelFollowUpCheck().catch((err) => {
      logger.error({ err }, "[OmniFollowUp] Scheduled run failed");
    });
  }, INTERVAL_MS);
}

module.exports = {
  runOmniChannelFollowUpCheck,
  startOmniChannelFollowUpScheduler,
};
