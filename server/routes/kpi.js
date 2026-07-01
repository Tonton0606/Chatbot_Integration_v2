'use strict';

/**
 * KPI API Routes
 * All routes require authentication (requireAuth middleware).
 * Workspace isolation enforced on every query.
 */

const express  = require('express');
const { safeError } = require('../utils/safeError');
const router   = express.Router();
const logger   = require('../config/logger');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const {
  scoreTask,
  recalculateIndividualScore,
  recalculateProjectScore,
  recalculateTeamScore,
  getCurrentPeriod,
} = require('../services/kpi/kpiScoring');
const {
  generateIndividualSummary,
  generateTeamSummary,
  generateProjectSummary,
  runDailyBatch,
} = require('../services/kpi/kpiSummary');
const { buildForecast, predictFromMetrics } = require('../services/intelligence/predictionEngine');

// All routes protected
router.use(requireAuth);

function getWorkspaceId(req) {
  return req.headers['x-workspace-id'] || req.query.workspaceId || req.user?.workspaceId;
}

function ok(res, data, meta = {})    { res.json({ success: true, data, ...meta }); }
function fail(res, msg, status = 500) {
  if (status >= 500) logger.error({ err: String(msg) }, '[kpi] server error');
  else logger.warn({ reason: String(msg) }, '[kpi] client error');
  res.status(status).json({ success: false, error: status >= 500 ? 'Internal server error' : String(msg) });
}

// ── GET /kpi/individual/:userId ───────────────────────────────────────────────
// Individual performance scores — current + last 4 weeks

router.get('/individual/:userId', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { userId } = req.params;
    const { period_type = 'week', limit = 4 } = req.query;

    const { data, error } = await supabase
      .from('kpi_individual_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('period_type', period_type)
      .order('period_start', { ascending: false })
      .limit(Math.min(Number(limit), 12));

    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/team/:teamId ─────────────────────────────────────────────────────

router.get('/team/:teamId', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { data, error } = await supabase
      .from('kpi_team_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', req.params.teamId)
      .order('period_start', { ascending: false })
      .limit(8);

    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/project/:projectId ───────────────────────────────────────────────

router.get('/project/:projectId', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { data, error } = await supabase
      .from('kpi_project_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', req.params.projectId)
      .order('period_start', { ascending: false })
      .limit(8);

    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/summary/:subjectType/:subjectId ──────────────────────────────────
// Get performance summary with recommendations

router.get('/summary/:subjectType/:subjectId', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { subjectType, subjectId } = req.params;
    const { period_start } = req.query;
    const { start } = getCurrentPeriod();
    const ps = period_start || start;

    const [summaryRes, recsRes] = await Promise.all([
      supabase
        .from('kpi_performance_summaries')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('subject_type', subjectType)
        .eq('subject_id', subjectId)
        .eq('period_start', ps)
        .maybeSingle(),
      supabase
        .from('kpi_recommendations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('subject_id', subjectId)
        .eq('period_start', ps)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (summaryRes.error) throw summaryRes.error;

    return ok(res, {
      summary:         summaryRes.data,
      recommendations: recsRes.data || [],
    });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/dashboard ────────────────────────────────────────────────────────
// Workspace-wide KPI overview — top performers, at-risk, department ranking

router.get('/dashboard', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { start } = getCurrentPeriod();

    const [topRes, atRiskRes, teamRes, pendingRecsRes] = await Promise.all([
      // Top performers
      supabase
        .from('kpi_performance_summaries')
        .select('subject_id, subject_name, overall_score, score_trend, component_scores, stats')
        .eq('workspace_id', workspaceId)
        .eq('subject_type', 'individual')
        .eq('is_top_performer', true)
        .eq('period_start', start)
        .order('overall_score', { ascending: false })
        .limit(5),

      // At-risk individuals
      supabase
        .from('kpi_performance_summaries')
        .select('subject_id, subject_name, overall_score, score_trend, score_state, needs_attention')
        .eq('workspace_id', workspaceId)
        .eq('subject_type', 'individual')
        .eq('is_at_risk', true)
        .eq('period_start', start)
        .order('overall_score', { ascending: true })
        .limit(5),

      // Team scores
      supabase
        .from('kpi_team_scores')
        .select('team_id, composite_score, avg_completion_rate, availability_rate, member_count, members_evaluated')
        .eq('workspace_id', workspaceId)
        .eq('period_start', start)
        .order('composite_score', { ascending: false }),

      // Pending recommendations
      supabase
        .from('kpi_recommendations')
        .select('id, subject_type, subject_id, subject_name:kpi_performance_summaries(subject_name), category, priority, title, body')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .in('priority', ['high', 'critical'])
        .order('priority', { ascending: false })
        .limit(10),
    ]);

    return ok(res, {
      period:          start,
      top_performers:  topRes.data    || [],
      at_risk:         atRiskRes.data || [],
      team_scores:     teamRes.data   || [],
      pending_actions: pendingRecsRes.data || [],
    });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/leaderboard ──────────────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { start } = getCurrentPeriod();
    const { type = 'individual' } = req.query;

    // Explicit allowlist — table and column names are interpolated into the query,
    // so an unexpected `type` must be rejected, never silently coerced.
    if (type !== 'team' && type !== 'individual') {
      return fail(res, "type must be 'team' or 'individual'", 400);
    }

    const table = type === 'team' ? 'kpi_team_scores' : 'kpi_individual_scores';
    const scoreCol = type === 'team' ? 'composite_score' : 'weighted_score';
    const idCol = type === 'team' ? 'team_id' : 'user_id';

    const { data, error } = await supabase
      .from(table)
      .select(`${idCol}, ${scoreCol}, score_state, tasks_evaluated, on_time_rate, reopen_rate`)
      .eq('workspace_id', workspaceId)
      .eq('period_start', start)
      .order(scoreCol, { ascending: false })
      .limit(20);

    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /kpi/forecast ─────────────────────────────────────────────────────────
// Uses prediction engine to generate KPI forecasts based on historical data

router.get('/forecast', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { metric, horizon_days = 30 } = req.query;

    // Fetch historical KPI scores for the workspace as the prediction series
    const { data: scores, error: scoresErr } = await supabase
      .from('kpi_individual_scores')
      .select('weighted_score, period_start')
      .eq('workspace_id', workspaceId)
      .order('period_start', { ascending: true })
      .limit(52);

    if (scoresErr) throw scoresErr;

    if (!scores || scores.length === 0) {
      return ok(res, {
        forecast: [],
        confidence: 0,
        message: 'Not enough KPI data to generate forecast. Complete some tasks first.',
        model_info: { model: 'moving_average_with_trend', reason: 'no historical points' },
      });
    }

    // Build time series from scores
    const series = scores.map((s) => ({
      date: s.period_start,
      value: s.weighted_score,
    }));

    if (metric && metric !== 'kpi_score') {
      // Use predictFromMetrics for named metrics — feed snapshot data
      const metrics = { [metric]: scores[scores.length - 1]?.weighted_score || 0 };
      const configs = [{ metric, horizon_days: Number(horizon_days) }];
      const predictions = predictFromMetrics(metrics, configs);
      return ok(res, { predictions, source_table: 'kpi_individual_scores' });
    }

    const result = buildForecast(series, Number(horizon_days));
    return ok(res, {
      ...result,
      source_table: 'kpi_individual_scores',
      metrics_analyzed: [{ metric: 'kpi_score', points: series.length }],
    });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── PATCH /kpi/recommendations/:id ───────────────────────────────────────────
// Acknowledge or resolve a recommendation

router.patch('/recommendations/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { status, resolution_note } = req.body;
    const allowed = ['acknowledged', 'in_progress', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) return fail(res, 'Invalid status', 400);

    const update = {
      status,
      acknowledged_by: req.user?.id,
      acknowledged_at: new Date().toISOString(),
    };
    if (status === 'resolved') {
      update.resolution_note = resolution_note || null;
      update.resolved_at     = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('kpi_recommendations')
      .update(update)
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── POST /kpi/recalculate ─────────────────────────────────────────────────────
// Manual trigger for batch recalculation (admin only)

router.post('/recalculate', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { subject_type, subject_id, mode = 'smb' } = req.body;
    const { start, end } = getCurrentPeriod();

    let result = null;

    if (subject_type === 'individual') {
      await recalculateIndividualScore(subject_id, workspaceId, start, end);
      result = await generateIndividualSummary(subject_id, workspaceId, start, end);
    } else if (subject_type === 'team') {
      await recalculateTeamScore(subject_id, workspaceId, start, end);
      result = await generateTeamSummary(subject_id, workspaceId, start, end);
    } else if (subject_type === 'project') {
      await recalculateProjectScore(subject_id, workspaceId, start, end, mode);
      result = await generateProjectSummary(subject_id, workspaceId, start, end);
    } else if (subject_type === 'workspace') {
      result = await runDailyBatch(workspaceId, mode);
    } else {
      return fail(res, 'Invalid subject_type', 400);
    }

    return ok(res, result);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── POST /kpi/score-task ──────────────────────────────────────────────────────
// Internal: called by tasks route when a task is marked done

router.post('/score-task', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return fail(res, 'workspaceId required', 400);

    const { task_id } = req.body;
    if (!task_id) return fail(res, 'task_id required', 400);

    const result = await scoreTask(task_id, workspaceId);
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message);
  }
});

module.exports = router;
