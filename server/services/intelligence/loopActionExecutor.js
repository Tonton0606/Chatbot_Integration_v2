/**
 * Loop Action Executor
 *
 * Executes actions triggered by the rule engine.
 * Non-destructive actions run immediately.
 * Destructive actions are queued as approval_required.
 */

const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");

// ── Action Handlers ──────────────────────────────────────────────────────────

async function handleNotifyAdmin(payload, context) {
  logger.info({ payload, workspace: context.workspaceId }, "[loop:action] notify_admin");
  // In production: integrate with email/Slack service
  return { sent: true, channel: "admin_log", message: payload.rule_name };
}

async function handleSendAlert(payload, context) {
  // Persist as an intelligence insight so it shows in the dashboard
  const { error } = await supabase.from("intelligence_insights").insert({
    workspace_id: context.workspaceId,
    module_id: null,
    title: `[Alert] ${payload.rule_name || "Rule Triggered"}`,
    content: `Metric "${payload.metric}" = ${payload.value} triggered an automated alert.`,
    severity: payload.severity || "warning",
    insight_type: "alert",
    confidence: payload.confidence || 80,
    evidence: payload,
    recommended_actions: [],
  });
  if (error) logger.warn({ error }, "[loop:action] send_alert insert failed");
  return { persisted: !error };
}

async function handleCreateTask(payload, context) {
  const { error } = await supabase.from("tasks").insert({
    workspace_id: context.workspaceId,
    title: `[AI] ${payload.rule_name}: ${payload.metric} = ${payload.value}`,
    description: `Automatically created by Loop Engine. Rule: ${payload.rule_name}`,
    status: "todo",
    priority: payload.severity === "critical" ? "urgent" : "high",
    created_by: null,
  }).catch(() => ({ error: "tasks_table_missing" }));
  return { created: !error, error: error?.message };
}

async function handleCreateRecommendation(payload, context) {
  return { recommendation: payload.rule_name, noted: true };
}

async function handleLogInsight(payload, context) {
  return handleSendAlert(payload, context);
}

async function handleWebhook(payload, context) {
  if (!payload.url) return { skipped: true, reason: "no_url" };
  try {
    const res = await fetch(payload.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: context.workspaceId, ...payload }),
      signal: AbortSignal.timeout(8000),
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    return { error: err.message };
  }
}

// pause_campaign is intentionally immediate (not approval_required) because
// ad spend protection on low ROAS requires instant action to prevent budget bleed.
async function handlePauseCampaign(payload, context) {
  const { campaign_id, ad_account_id, rule_name, metric, value } = payload;
  if (!campaign_id) {
    logger.warn({ payload, workspace: context.workspaceId }, "[loop:action] pause_campaign missing campaign_id");
    return { paused: false, error: "missing campaign_id" };
  }

  // Fetch page access token for this workspace
  const { data: pageRow, error: tokenErr } = await supabase
    .from("fb_pages")
    .select("fb_token")
    .eq("workspace_id", context.workspaceId)
    .limit(1)
    .single();

  if (tokenErr || !pageRow?.fb_token) {
    logger.warn({ tokenErr, workspace: context.workspaceId }, "[loop:action] pause_campaign no access token");
    await supabase.from("intelligence_insights").insert({
      workspace_id: context.workspaceId,
      module_id: null,
      title: `[Campaign Pause Failed] ${rule_name || "Low ROAS"}`,
      content: `Could not pause campaign ${campaign_id}: no Facebook access token found for workspace.`,
      severity: "warning",
      insight_type: "alert",
      confidence: 90,
      evidence: payload,
      recommended_actions: ["Connect a Facebook page with a valid access token."],
    }).catch(() => {});
    return { paused: false, error: "no_access_token" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${campaign_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED", access_token: pageRow.fb_token }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    const body = await res.json();

    if (!res.ok || body.error) {
      const errMsg = body.error?.message || `HTTP ${res.status}`;
      logger.warn({ errMsg, campaign_id, workspace: context.workspaceId }, "[loop:action] pause_campaign FB API error");
      await supabase.from("intelligence_insights").insert({
        workspace_id: context.workspaceId,
        module_id: null,
        title: `[Campaign Pause Failed] ${rule_name || "Low ROAS"}`,
        content: `Failed to pause campaign ${campaign_id}. FB API error: ${errMsg}. Metric: ${metric} = ${value}.`,
        severity: "warning",
        insight_type: "alert",
        confidence: 90,
        evidence: { ...payload, fb_error: body.error },
        recommended_actions: ["Check ad account permissions and token validity."],
      }).catch(() => {});
      return { paused: false, campaign_id, error: errMsg };
    }

    logger.info({ campaign_id, metric, value, workspace: context.workspaceId }, "[loop:action] pause_campaign success");
    await supabase.from("intelligence_insights").insert({
      workspace_id: context.workspaceId,
      module_id: null,
      title: `[Campaign Paused] ${rule_name || "Low ROAS Detected"}`,
      content: `Campaign ${campaign_id} was automatically paused. Reason: ${metric} = ${value} triggered rule "${rule_name}".`,
      severity: "critical",
      insight_type: "action_taken",
      confidence: 95,
      evidence: payload,
      recommended_actions: ["Review campaign performance before re-enabling."],
    }).catch(() => {});
    return { paused: true, campaign_id };
  } catch (err) {
    logger.error({ err, campaign_id, workspace: context.workspaceId }, "[loop:action] pause_campaign fetch error");
    return { paused: false, campaign_id, error: err.message };
  }
}

// Destructive — require approval, just log intent
async function handleApprovalRequired(type, payload, context) {
  logger.info({ type, payload, workspace: context.workspaceId }, "[loop:action] queued for approval");
  return { queued: true, type, reason: "destructive_action_requires_approval" };
}

const IMMEDIATE_HANDLERS = {
  notify_admin:          handleNotifyAdmin,
  send_alert:            handleSendAlert,
  create_task:           handleCreateTask,
  create_recommendation: handleCreateRecommendation,
  log_insight:           handleLogInsight,
  webhook:               handleWebhook,
  send_email:            handleNotifyAdmin,
  send_slack:            handleNotifyAdmin,
  pause_campaign:        handlePauseCampaign,
};

// ── Main executor ────────────────────────────────────────────────────────────

async function executeAction(action, context) {
  const startedAt = Date.now();

  if (action.execution === "approval_required") {
    const result = await handleApprovalRequired(action.type, action.payload, context);
    return {
      action_type: action.type,
      status: "approval_required",
      requires_approval: true,
      result,
      executed_at: new Date().toISOString(),
    };
  }

  const handler = IMMEDIATE_HANDLERS[action.type];
  if (!handler) {
    return {
      action_type: action.type,
      status: "failed",
      error: `No handler registered for action type: ${action.type}`,
      executed_at: new Date().toISOString(),
    };
  }

  try {
    const result = await handler(action.payload, context);
    return {
      action_type: action.type,
      status: "executed",
      result,
      duration_ms: Date.now() - startedAt,
      executed_at: new Date().toISOString(),
    };
  } catch (err) {
    logger.error({ err, action }, "[loop:action] handler error");
    return {
      action_type: action.type,
      status: "failed",
      error: err.message,
      executed_at: new Date().toISOString(),
    };
  }
}

async function executeActions(actions = [], context) {
  const results = [];
  for (const action of actions) {
    const result = await executeAction(action, context);
    results.push(result);
  }
  return results;
}

module.exports = { executeAction, executeActions };
