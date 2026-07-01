/**
 * Follow-Up Worker for Facebook Chatbot
 *
 * Drives the pure decision layer in facebookFollowUpAutomation.js on a schedule.
 * Periodically scans active conversations, and for any lead that has gone silent
 * past its sequence delay (5min / 1hr / 24hr / 3days), sends the next re-engagement
 * message via the Graph API and advances the follow-up stage in metadata.
 *
 * This is the missing piece that turns the reactive chatbot into a proactive one.
 */

const logger = require("../../config/logger");
const { compactFacebookReply } = require("./facebookReplyUtils");
const {
  buildFollowUpMessage,
  buildFollowUpMetadata,
  checkFollowUpNeeded,
  getNextFollowUpStage,
} = require("./facebookFollowUpAutomation");
const { getEffectiveLeadData } = require("./facebookLeadConfirmation");

const CONVERSATIONS_TABLE = "client_facebook_conversations";

function createFacebookFollowUpWorker({
  supabaseClient,
  sendFacebookMessage,
  getFacebookConfig,
  env = process.env,
}) {
  const intervalMs =
    parseInt(env.FB_FOLLOWUP_INTERVAL_MS, 10) || 5 * 60 * 1000; // 5 min
  const batchSize = parseInt(env.FB_FOLLOWUP_BATCH_SIZE, 10) || 50;
  // Ignore conversations older than this window so we don't nudge stale leads forever.
  const maxAgeDays = parseInt(env.FB_FOLLOWUP_MAX_AGE_DAYS, 10) || 7;

  let timer = null;
  let running = false;

  async function processConversation(conversation) {
    const decision = checkFollowUpNeeded(conversation);
    if (!decision || !decision.template) {
      return false;
    }

    const pageId = conversation.page_id;
    const recipientId = conversation.customer_psid;
    if (!pageId || !recipientId) {
      return false;
    }

    const pageConfig =
      typeof getFacebookConfig === "function"
        ? await getFacebookConfig({ pageId })
        : {};

    const metadata =
      conversation.metadata && typeof conversation.metadata === "object"
        ? conversation.metadata
        : {};
    const flowData = metadata.flowData || {};
    const leadData = {
      ...getEffectiveLeadData(flowData),
      customerMessage: conversation.last_customer_message || "",
    };

    const message = buildFollowUpMessage({
      templateName: decision.template,
      leadData,
      pageConfig,
      compactFacebookReply,
    });

    if (!message) {
      return false;
    }

    await sendFacebookMessage(recipientId, message, { pageId });

    const nextStage = getNextFollowUpStage(decision.sequence, decision.stageIndex);
    const updatedMetadata = buildFollowUpMetadata(metadata, {
      sequence: decision.sequence,
      currentStageIndex: decision.stageIndex + 1,
      lastFollowUpAt: new Date().toISOString(),
      completed: nextStage === null,
    });

    const { error } = await supabaseClient
      .from(CONVERSATIONS_TABLE)
      .update({ metadata: updatedMetadata })
      .eq("id", conversation.id);

    if (error) {
      logger.error(
        { err: error, conversationId: conversation.id },
        "[FollowUpWorker] Failed to persist follow-up metadata"
      );
    }

    logger.info(
      {
        conversationId: conversation.id,
        sequence: decision.sequence,
        stageIndex: decision.stageIndex,
        template: decision.template,
      },
      "[FollowUpWorker] Sent follow-up message"
    );

    return true;
  }

  async function runOnce() {
    if (running) {
      return; // avoid overlapping runs
    }
    running = true;

    try {
      const cutoffIso = new Date(
        Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: conversations, error } = await supabaseClient
        .from(CONVERSATIONS_TABLE)
        .select(
          "id, workspace_id, page_id, customer_psid, conversation_status, last_message_at, last_customer_message, metadata, bot_paused"
        )
        .neq("conversation_status", "human_handoff")
        .neq("conversation_status", "closed")
        .gte("last_message_at", cutoffIso)
        .order("last_message_at", { ascending: true })
        .limit(batchSize);

      if (error) {
        logger.error({ err: error }, "[FollowUpWorker] Failed to query conversations");
        return;
      }

      if (!Array.isArray(conversations) || conversations.length === 0) {
        return;
      }

      let sent = 0;
      for (const conversation of conversations) {
        if (conversation.bot_paused) {
          continue;
        }

        try {
          const didSend = await processConversation(conversation);
          if (didSend) sent += 1;
        } catch (err) {
          logger.error(
            { err, conversationId: conversation.id },
            "[FollowUpWorker] Error processing conversation"
          );
        }
      }

      if (sent > 0) {
        logger.info({ sent, scanned: conversations.length }, "[FollowUpWorker] Run complete");
      }
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) {
      return;
    }

    if (!supabaseClient || typeof sendFacebookMessage !== "function") {
      logger.warn(
        "[FollowUpWorker] Not started: missing supabaseClient or sendFacebookMessage"
      );
      return;
    }

    timer = setInterval(() => {
      runOnce().catch((err) =>
        logger.error({ err }, "[FollowUpWorker] Unhandled run error")
      );
    }, intervalMs);

    if (typeof timer.unref === "function") {
      timer.unref();
    }

    logger.info({ intervalMs }, "[FollowUpWorker] Started");
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { start, stop, runOnce };
}

module.exports = {
  createFacebookFollowUpWorker,
};
