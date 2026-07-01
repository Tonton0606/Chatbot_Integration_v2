/**
 * Facebook Follow-Up Scheduler
 * Runs every 30 minutes. Finds conversations where the bot sent the last message
 * but the customer never replied, then sends a contextual follow-up via the
 * existing chatbot engine.
 *
 * Follow-up windows:
 *   24h — "Nandito pa kami!" / "We're still here!"
 *   48h — Final check-in before marking lead as cold
 */

const logger = require("../../config/logger");
const { createFacebookChatbotReplyService } = require("./facebookChatbotReply");
const { compactFacebookReply } = require("./facebookReplyUtils");

const DEFAULT_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const FOLLOWUP_24H_MS = 24 * 60 * 60 * 1000;
const FOLLOWUP_48H_MS = 48 * 60 * 60 * 1000;
const INTERVAL_MS     = 30 * 60 * 1000; // run every 30 min

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTagalog(text = "") {
  return /\b(po|opo|salamat|magkano|presyo|saan|paano|pwede|pede|meron|wala|ang|ng|mga|ay|hindi|oo)\b/i.test(text);
}

function buildFollowUpMessage({ pageName, lastMessage, wave, isTagalogUser }) {
  const biz = pageName || "us";

  if (wave === 1) {
    return isTagalogUser
      ? `Huy! Nandito pa kami sa ${biz} 😊 May katanungan pa ba kayo? Handa kaming tumulong!`
      : `Hey! We're still here at ${biz} 😊 Do you have any questions? We're happy to help!`;
  }

  // wave 2 — 48h final
  return isTagalogUser
    ? `Huling tsansa ito! Kung may katanungan pa kayo o gusto na kayong mag-order, nandito lang kami sa ${biz}. Huwag mahiyang mag-message! 🙏`
    : `Last check-in from ${biz}! If you still have questions or want to place an order, we're just a message away 🙏`;
}

// ── Custom sequence runner (Botcake-style multi-step drips) ────────────────────

async function runCustomSequences({ supabase, sendFacebookMessage, getFacebookConfig, now }) {
  try {
    const { data: sequences, error: seqError } = await supabase
      .from("fb_flow_sequences")
      .select("*")
      .eq("is_active", true);

    if (seqError || !sequences || sequences.length === 0) return;

    for (const seq of sequences) {
      let steps = [];
      try {
        steps = Array.isArray(seq.steps) ? seq.steps : JSON.parse(seq.steps || "[]");
      } catch { continue; }
      if (!steps.length) continue;

      const { data: convs, error: convError } = await supabase
        .from("client_facebook_conversations")
        .select("id, workspace_id, page_id, customer_psid, customer_name, last_message, updated_at, follow_up_wave, last_sender_type, bot_paused, status, metadata")
        .eq("bot_paused", false)
        .neq("status", "human_handoff")
        .neq("status", "resolved")
        .eq("last_sender_type", "bot")
        .order("updated_at", { ascending: true })
        .limit(50);

      if (convError || !convs) continue;

      for (const conv of convs) {
        if (seq.workspace_id && conv.workspace_id !== seq.workspace_id) continue;
        if (seq.page_id && conv.page_id !== seq.page_id) continue;

        const seqTrigger = seq.trigger_stage ? String(seq.trigger_stage).toLowerCase().trim() : null;
        const activeTrigger = conv.metadata?.active_trigger ? String(conv.metadata.active_trigger).toLowerCase().trim() : null;

        // If sequence requires a specific custom trigger, it must match the conversation's active trigger.
        // If seqTrigger is null/empty ("Any Trigger"), it is always eligible.
        if (seqTrigger && seqTrigger !== activeTrigger) {
          continue;
        }

        const lastAt = new Date(conv.updated_at).getTime();
        const elapsedMin = Math.floor((now - lastAt) / (60 * 1000));
        const currentStep = (conv.follow_up_wave || 0);

        if (currentStep >= steps.length) continue;

        const step = steps[currentStep];
        if (!step || !step.messageText) continue;

        const delayMin = parseInt(step.delayMinutes, 10) || 0;
        if (elapsedMin < delayMin) continue;

        let pageConfig = null;
        try {
          pageConfig = await getFacebookConfig({ pageId: conv.page_id });
        } catch { continue; }

        if (!pageConfig?.pageAccessToken) continue;

        const stepQuickReplies = Array.isArray(step.quickReplies) ? step.quickReplies : [];

        try {
          await sendFacebookMessage(conv.customer_psid, compactFacebookReply(step.messageText), {
            pageId: conv.page_id,
            pageAccessToken: pageConfig.pageAccessToken,
            quickReplies: stepQuickReplies,
          });
        } catch (sendErr) {
          if (sendErr?.message?.includes("#10") || sendErr?.message?.includes("#100")) {
            await supabase
              .from("client_facebook_conversations")
              .update({ follow_up_wave: steps.length })
              .eq("id", conv.id);
            continue;
          }
          throw sendErr;
        }

        await supabase
          .from("client_facebook_conversations")
          .update({
            follow_up_wave: currentStep + 1,
            last_follow_up_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conv.id);

        logger.info({
          convId: conv.id,
          sequenceName: seq.name,
          step: currentStep + 1,
        }, "[Sequence] Custom sequence step sent");

        await new Promise((r) => setTimeout(r, 400));
      }
    }
  } catch (err) {
    logger.warn({ err }, "[Sequence] Custom sequence check failed");
  }
}

// ── Core check function ───────────────────────────────────────────────────────

async function runFollowUpCheck({ supabase, sendFacebookMessage, getFacebookConfig }) {
  const now = Date.now();
  const cutoff24h = new Date(now - FOLLOWUP_24H_MS).toISOString();
  const cutoff48h = new Date(now - FOLLOWUP_48H_MS).toISOString();

  // ── Check for custom sequences first (Botcake-style) ──
  await runCustomSequences({ supabase, sendFacebookMessage, getFacebookConfig, now });

  // Get conversations where:
  // - bot sent the last message (last_sender_type = 'bot')
  // - customer hasn't replied since 24h ago
  // - not paused / in human handoff
  // - follow-up not already sent at this wave
  const { data: convs, error } = await supabase
    .from("client_facebook_conversations")
    // client_facebook_conversations tracks recency via updated_at (last_message_at
    // does not exist on this table); alias it so downstream code is unchanged.
    .select("id, workspace_id, page_id, customer_psid, customer_name, last_message, last_message_at:updated_at, follow_up_wave, last_sender_type, bot_paused, status")
    .eq("last_sender_type", "bot")
    .eq("bot_paused", false)
    .neq("status", "human_handoff")
    .neq("status", "resolved")
    .lte("updated_at", cutoff24h)
    .lt("follow_up_wave", 2)  // max 2 follow-ups
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    logger.warn({ err: error }, "[FollowUp] Failed to query unanswered conversations");
    return;
  }

  if (!convs || convs.length === 0) return;

  logger.info({ count: convs.length }, "[FollowUp] Processing unanswered conversations");

  const { generateChatbotReply } = createFacebookChatbotReplyService({
    defaultChatbotModel: DEFAULT_MODEL,
    env: process.env,
  });

  for (const conv of convs) {
    try {
      const lastAt   = new Date(conv.last_message_at).getTime();
      const elapsed  = now - lastAt;
      const wave     = conv.follow_up_wave || 0;

      // Determine which wave this should be
      let nextWave = null;
      if (wave === 0 && elapsed >= FOLLOWUP_24H_MS) nextWave = 1;
      if (wave === 1 && elapsed >= FOLLOWUP_48H_MS) nextWave = 2;
      if (nextWave === null) continue;

      // Resolve page config and token
      let pageConfig = null;
      try {
        pageConfig = await getFacebookConfig({ pageId: conv.page_id });
      } catch {
        logger.warn({ pageId: conv.page_id }, "[FollowUp] Cannot resolve page config — skipping");
        continue;
      }

      if (!pageConfig?.pageAccessToken) continue;

      const userLang = isTagalog(conv.last_message || "");
      const followUpText = buildFollowUpMessage({
        pageName: pageConfig.pageName,
        lastMessage: conv.last_message,
        wave: nextWave,
        isTagalogUser: userLang,
      });

      try {
        await sendFacebookMessage(conv.customer_psid, followUpText, {
          pageId: conv.page_id,
          pageAccessToken: pageConfig.pageAccessToken,
        });
      } catch (sendErr) {
        const isWindowExpired =
          sendErr?.message?.includes("#10") ||
          sendErr?.message?.includes("#100") ||
          sendErr?.message?.includes("allowed window");

        if (isWindowExpired) {
          await supabase
            .from("client_facebook_conversations")
            .update({ follow_up_wave: 2 })
            .eq("id", conv.id);
          logger.debug({ convId: conv.id }, "[FollowUp] Skipped — outside 24h messaging window");
          continue;
        }
        throw sendErr;
      }

      // Update conversation record
      await supabase
        .from("client_facebook_conversations")
        .update({
          follow_up_wave: nextWave,
          last_follow_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);

      // Fire workflow trigger
      await supabase.from("workflow_executions").insert({
        workspace_id: conv.workspace_id,
        trigger_event: nextWave === 1 ? "leads.no_reply_24h" : "leads.no_reply_48h",
        trigger_data: {
          workspace_id: conv.workspace_id,
          conversation_id: conv.id,
          customer_psid: conv.customer_psid,
          customer_name: conv.customer_name,
          page_id: conv.page_id,
          last_message: conv.last_message,
          follow_up_wave: nextWave,
        },
        status: "pending",
      }).catch(() => {});

      logger.info({
        convId: conv.id,
        customerPsid: conv.customer_psid,
        wave: nextWave,
      }, "[FollowUp] Follow-up sent");

      // Throttle — avoid hitting FB rate limits
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      logger.warn({ err, convId: conv.id }, "[FollowUp] Failed for conversation — continuing");
    }
  }
}

// ── Scheduler bootstrap ───────────────────────────────────────────────────────

function startFollowUpScheduler({ supabase, sendFacebookMessage, getFacebookConfig }) {
  logger.info("[FollowUp] Scheduler started — interval: 30 min");

  // Run once immediately on boot (catches any missed windows)
  runFollowUpCheck({ supabase, sendFacebookMessage, getFacebookConfig }).catch((err) =>
    logger.warn({ err }, "[FollowUp] Initial check failed")
  );

  const timer = setInterval(() => {
    runFollowUpCheck({ supabase, sendFacebookMessage, getFacebookConfig }).catch((err) =>
      logger.warn({ err }, "[FollowUp] Interval check failed")
    );
  }, INTERVAL_MS);

  // Allow clean shutdown
  timer.unref?.();

  return timer;
}

async function fireTrigger({ supabase, workspaceId, pageId, psid, triggerName }) {
  if (!supabase || !workspaceId || !psid || !triggerName) return false;
  try {
    const { data: conv } = await supabase
      .from("client_facebook_conversations")
      .select("id, metadata")
      .eq("workspace_id", workspaceId)
      .eq("customer_psid", psid)
      .single();

    if (!conv) return false;

    const updatedMetadata = {
      ...(conv.metadata || {}),
      active_trigger: triggerName.trim(),
    };

    await supabase
      .from("client_facebook_conversations")
      .update({
        metadata: updatedMetadata,
        follow_up_wave: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conv.id);

    logger.info({ convId: conv.id, triggerName }, "[Sequence] Fired custom trigger for conversation");
    return true;
  } catch (err) {
    logger.error({ err }, "[Sequence] Failed to fire trigger");
    return false;
  }
}

module.exports = { startFollowUpScheduler, runFollowUpCheck, fireTrigger };
