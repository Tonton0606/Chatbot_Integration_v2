/**
 * Loop Learning Engine
 *
 * Stores outcomes of every action and decision.
 * Computes performance scores to improve future rule accuracy.
 * Auto-scores actions by comparing metric_before vs metric_after.
 */

const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const { toNumber } = require("./dataNormalizer");

/**
 * Auto-score outcome by comparing metric direction vs rule intent.
 * Returns -1.0 (bad) to +1.0 (good).
 */
function autoScore(decision, metricBefore, metricAfter) {
  const metric = decision.metric;
  if (!metric || !metricBefore || !metricAfter) return 0;

  const before = toNumber(metricBefore[metric]);
  const after  = toNumber(metricAfter[metric]);
  if (!before || !after) return 0;

  const change = (after - before) / before;

  // If rule fired because metric was too LOW and it went UP → good
  if (["<", "<="].includes(decision.operator)) {
    return change > 0 ? Math.min(1, change * 5) : Math.max(-1, change * 5);
  }
  // If rule fired because metric was too HIGH and it went DOWN → good
  if ([">", ">="].includes(decision.operator)) {
    return change < 0 ? Math.min(1, Math.abs(change) * 5) : Math.max(-1, -Math.abs(change) * 5);
  }
  return 0;
}

async function recordLearning({ workspaceId, runId, actionId, decisionId, actionResult, decision, metricBefore, metricAfter }) {
  const score = autoScore(decision || {}, metricBefore || {}, metricAfter || {});
  const outcome = score > 0.2 ? "success" : score < -0.2 ? "failure" : "neutral";

  const { error } = await supabase.from("loop_learning_logs").insert({
    workspace_id:      workspaceId,
    run_id:            runId || null,
    action_id:         actionId || null,
    decision_id:       decisionId || null,
    outcome,
    performance_score: score,
    metric_before:     metricBefore || {},
    metric_after:      metricAfter  || {},
    feedback_source:   "auto",
    notes: actionResult?.status === "failed" ? actionResult.error : null,
  });

  if (error) logger.warn({ error }, "[loop:learn] insert failed (non-fatal)");
  return { outcome, score };
}

async function recordRunLearning({ workspaceId, runId, decisions, actionResults, metricBefore, metricAfter }) {
  const logs = [];
  for (let i = 0; i < decisions.length; i++) {
    const decision  = decisions[i];
    const actionResult = actionResults[i] || {};
    if (!decision.triggered) continue;
    const log = await recordLearning({
      workspaceId,
      runId,
      actionId:   actionResult.id || null,
      decisionId: decision.id || null,
      actionResult,
      decision,
      metricBefore,
      metricAfter,
    });
    logs.push(log);
  }
  return logs;
}

/**
 * Compute rule effectiveness from historical logs.
 * Returns score 0–100 per rule name.
 */
async function getRuleEffectiveness(workspaceId) {
  const { data, error } = await supabase
    .from("loop_learning_logs")
    .select("notes, outcome, performance_score, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return {};

  const byRule = {};
  for (const log of data) {
    const key = log.notes || "unknown";
    if (!byRule[key]) byRule[key] = { total: 0, success: 0, score_sum: 0 };
    byRule[key].total++;
    if (log.outcome === "success") byRule[key].success++;
    byRule[key].score_sum += toNumber(log.performance_score);
  }

  return Object.fromEntries(
    Object.entries(byRule).map(([rule, stats]) => [
      rule,
      {
        success_rate: Math.round((stats.success / stats.total) * 100),
        avg_score: parseFloat((stats.score_sum / stats.total).toFixed(3)),
        total_runs: stats.total,
      },
    ])
  );
}

async function submitHumanFeedback({ workspaceId, actionId, outcome, notes }) {
  const { error } = await supabase.from("loop_learning_logs").insert({
    workspace_id:    workspaceId,
    action_id:       actionId,
    outcome:         outcome || "neutral",
    performance_score: outcome === "success" ? 1 : outcome === "failure" ? -1 : 0,
    feedback_source: "human",
    notes:           notes || null,
  });
  if (error) throw error;
  return { recorded: true };
}

module.exports = { recordLearning, recordRunLearning, getRuleEffectiveness, submitHumanFeedback };
