/**
 * Loop Engine API Routes
 *
 * GET  /api/intelligence/loop/status
 * POST /api/intelligence/loop/start
 * POST /api/intelligence/loop/stop
 * POST /api/intelligence/loop/pause
 * POST /api/intelligence/loop/run-once
 * GET  /api/intelligence/loop/runs
 * GET  /api/intelligence/loop/decisions
 * GET  /api/intelligence/loop/actions
 * POST /api/intelligence/loop/actions/:id/approve
 * POST /api/intelligence/loop/actions/:id/reject
 * GET  /api/intelligence/loop/learning
 * POST /api/intelligence/loop/learning/:actionId/feedback
 * GET  /api/intelligence/loop/config
 * POST /api/intelligence/loop/config
 */

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../../middleware/auth");
const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const loopEngine = require("../../services/intelligence/loopEngine");
const { getRuleEffectiveness, submitHumanFeedback } = require("../../services/intelligence/loopLearningEngine");

function requireWorkspace(req, res) {
  if (req.workspaceId) return true;
  res.status(400).json({ success: false, error: "workspace_id or x-workspace-id is required." });
  return false;
}

// ── STATUS ───────────────────────────────────────────────────────────────────

router.get("/status", requireAuth, (req, res) => {
  if (!requireWorkspace(req, res)) return;
  const status = loopEngine.getLoopStatus(req.workspaceId);
  res.json({ success: true, data: status });
});

// ── START ────────────────────────────────────────────────────────────────────

router.post("/start", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const status = await loopEngine.startLoop(req.workspaceId);
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error({ err }, "[loop route] start failed");
    next(err);
  }
});

// ── STOP ─────────────────────────────────────────────────────────────────────

router.post("/stop", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const status = await loopEngine.stopLoop(req.workspaceId);
    res.json({ success: true, data: status });
  } catch (err) { next(err); }
});

// ── PAUSE ────────────────────────────────────────────────────────────────────

router.post("/pause", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const status = await loopEngine.pauseLoop(req.workspaceId);
    res.json({ success: true, data: status });
  } catch (err) { next(err); }
});

// ── RUN ONCE ─────────────────────────────────────────────────────────────────

router.post("/run-once", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const result = await loopEngine.runOnce(req.workspaceId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, "[loop route] run-once failed");
    next(err);
  }
});

// ── RUNS ─────────────────────────────────────────────────────────────────────

router.get("/runs", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { data, error } = await supabase
      .from("loop_runs")
      .select("id,status,phase,insight_count,decision_count,action_count,duration_ms,started_at,ended_at,error")
      .eq("workspace_id", req.workspaceId)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

// ── DECISIONS ────────────────────────────────────────────────────────────────

router.get("/decisions", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { data, error } = await supabase
      .from("loop_decisions")
      .select("id,run_id,rule_name,metric,metric_value,threshold,triggered,confidence,actions_planned,created_at")
      .eq("workspace_id", req.workspaceId)
      .eq("triggered", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

// ── ACTIONS ──────────────────────────────────────────────────────────────────

router.get("/actions", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const statusFilter = req.query.status;
    let query = supabase
      .from("loop_actions")
      .select("id,run_id,action_type,payload,status,result,requires_approval,executed_at,created_at")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

router.post("/actions/:id/approve", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { error } = await supabase
      .from("loop_actions")
      .update({ status: "approved", approved_by: req.user.id, executed_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId);
    if (error) throw error;
    res.json({ success: true, message: "Action approved" });
  } catch (err) { next(err); }
});

router.post("/actions/:id/reject", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { error } = await supabase
      .from("loop_actions")
      .update({ status: "rejected", approved_by: req.user.id })
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId);
    if (error) throw error;
    res.json({ success: true, message: "Action rejected" });
  } catch (err) { next(err); }
});

// ── LEARNING ─────────────────────────────────────────────────────────────────

router.get("/learning", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const [logsRes, effectiveness] = await Promise.allSettled([
      supabase
        .from("loop_learning_logs")
        .select("id,outcome,performance_score,feedback_source,metric_before,metric_after,notes,created_at")
        .eq("workspace_id", req.workspaceId)
        .order("created_at", { ascending: false })
        .limit(100),
      getRuleEffectiveness(req.workspaceId),
    ]);

    const logs = logsRes.status === "fulfilled" ? (logsRes.value.data || []) : [];
    const eff  = effectiveness.status === "fulfilled" ? effectiveness.value : {};

    const summary = {
      total_logs:     logs.length,
      success_count:  logs.filter(l => l.outcome === "success").length,
      failure_count:  logs.filter(l => l.outcome === "failure").length,
      neutral_count:  logs.filter(l => l.outcome === "neutral").length,
      avg_score:      logs.length ? parseFloat((logs.reduce((s, l) => s + (l.performance_score || 0), 0) / logs.length).toFixed(3)) : 0,
    };

    res.json({ success: true, data: { logs, effectiveness: eff, summary } });
  } catch (err) { next(err); }
});

router.post("/learning/:actionId/feedback", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const result = await submitHumanFeedback({
      workspaceId: req.workspaceId,
      actionId:    req.params.actionId,
      outcome:     req.body.outcome,
      notes:       String(req.body.notes || "").slice(0, 500),
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── CONFIG ───────────────────────────────────────────────────────────────────

router.get("/config", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data } = await supabase
      .from("loop_configs")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    res.json({ success: true, data: data || { sources: ["crm","finance","marketing","hr","inventory"], rules: loopEngine.DEFAULT_RULES, interval_seconds: 300 } });
  } catch (err) { next(err); }
});

router.post("/config", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const allowed = ["name","enabled","interval_seconds","sources","rules","actions_config","ai_enabled"];
    const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const result = await loopEngine.updateLoopConfig(req.workspaceId, patch);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
