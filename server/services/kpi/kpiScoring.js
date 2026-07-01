'use strict';

/**
 * KPI Scoring Engine
 *
 * Aggregation model: A3/B3/C3 — weighted average, role-weighted team scoring
 * Trigger model: Hybrid (called on task completion for Tier1,
 *                cron-scheduled for Tier2 hourly aggregates)
 *
 * Score range: 0–100 for all metrics and composites.
 */

const { supabase } = require('../../config/supabase');
const logger = require('../../config/logger');

// ── WEIGHTS ───────────────────────────────────────────────────────────────────

const TASK_WEIGHTS = { on_time: 0.40, reopen: 0.30, cycle_time: 0.30 };
const PROJECT_WEIGHTS = {
  corporate: { milestone: 0.40, velocity: 0.35, budget: 0.25 },
  smb:       { milestone: 0.60, velocity: 0.40, budget: 0.00 },
};
const TEAM_WEIGHTS = { completion: 0.50, availability: 0.30, escalation: 0.20 };

// Role weight defaults (overridden by kpi_role_weights table per workspace)
const DEFAULT_ROLE_WEIGHTS = {
  junior: 0.75, mid: 1.00, senior: 1.25, manager: 1.50, default: 1.00,
};

// Cycle time benchmarks (hours) per priority — score degrades beyond threshold
const CYCLE_BENCHMARKS = {
  critical: 24, high: 48, medium: 96, low: 168,
};

// ── TASK SCORING ──────────────────────────────────────────────────────────────

/**
 * Score a single completed task and persist to kpi_task_scores.
 * Called immediately when task status → 'done' (Tier 1 real-time).
 */
async function scoreTask(taskId, workspaceId) {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .select('id, status, due_date, completed_at, started_at, reopen_count, priority, role_weight, primary_assignee_id, supporting_assignees, assignment_type, created_at')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      logger.warn({ taskId }, '[kpi] scoreTask: task not found');
      return null;
    }
    if (task.status !== 'done' || !task.primary_assignee_id) return null;

    const scores = computeTaskScores(task);
    const assignees = buildAssigneeCredits(task);

    // Persist score for each assignee
    const inserts = assignees.map(({ userId, creditPct }) => ({
      workspace_id:     workspaceId,
      task_id:          taskId,
      assignee_id:      userId,
      credit_pct:       creditPct,
      on_time:          scores.onTime,
      on_time_score:    scores.onTimeScore,
      reopen_count:     task.reopen_count || 0,
      reopen_score:     scores.reopenScore,
      cycle_time_hours: scores.cycleTimeHours,
      cycle_time_score: scores.cycleTimeScore,
      composite_score:  scores.composite,
      weighted_score:   +(scores.composite * (task.role_weight || 1.0) * (creditPct / 100)).toFixed(2),
      evaluated_at:     new Date().toISOString(),
    }));

    const { error: insErr } = await supabase.from('kpi_task_scores').insert(inserts);
    if (insErr) logger.error({ err: insErr }, '[kpi] scoreTask insert error');

    return scores;
  } catch (err) {
    logger.error({ err }, '[kpi] scoreTask unexpected error');
    return null;
  }
}

function computeTaskScores(task) {
  // T2 — On-time delivery
  let onTime = null;
  let onTimeScore = 50; // neutral if no due date
  if (task.due_date && task.completed_at) {
    onTime = new Date(task.completed_at) <= new Date(task.due_date);
    onTimeScore = onTime ? 100 : 0;
  }

  // T4 — Reopen rate (each reopen costs 25 points, floor 0)
  const reopenCount = task.reopen_count || 0;
  const reopenScore = Math.max(0, 100 - reopenCount * 25);

  // T5 — Cycle time vs benchmark
  const startRef = task.started_at || task.created_at;
  const endRef = task.completed_at;
  let cycleTimeHours = null;
  let cycleTimeScore = 50;
  if (startRef && endRef) {
    cycleTimeHours = +((new Date(endRef) - new Date(startRef)) / 3_600_000).toFixed(2);
    const benchmark = CYCLE_BENCHMARKS[task.priority] || CYCLE_BENCHMARKS.medium;
    if (cycleTimeHours <= benchmark) {
      cycleTimeScore = 100;
    } else {
      // Linear decay: 2x benchmark = 50, 3x = 0
      const ratio = cycleTimeHours / benchmark;
      cycleTimeScore = Math.max(0, Math.round(100 - (ratio - 1) * 50));
    }
  }

  const composite = +(
    onTimeScore  * TASK_WEIGHTS.on_time +
    reopenScore  * TASK_WEIGHTS.reopen  +
    cycleTimeScore * TASK_WEIGHTS.cycle_time
  ).toFixed(2);

  return { onTime, onTimeScore, reopenScore, cycleTimeHours, cycleTimeScore, composite };
}

function buildAssigneeCredits(task) {
  const primary = task.primary_assignee_id;
  const supporting = task.supporting_assignees || [];
  const type = task.assignment_type || 'individual';

  if (type === 'individual' || supporting.length === 0) {
    return [{ userId: primary, creditPct: 100 }];
  }
  if (type === 'collaborative') {
    const supportingCredit = supporting.length > 0 ? 40 / supporting.length : 0;
    return [
      { userId: primary, creditPct: 60 },
      ...supporting.map(uid => ({ userId: uid, creditPct: +supportingCredit.toFixed(2) })),
    ];
  }
  if (type === 'delegation') {
    // primary (junior) 70%, delegating manager not stored here — handled at team level
    return [{ userId: primary, creditPct: 70 }];
  }
  return [{ userId: primary, creditPct: 100 }];
}

// ── INDIVIDUAL ROLLING SCORE (Tier 2 — hourly batch) ─────────────────────────

/**
 * Recalculate rolling weekly KPI score for a user.
 * Called by the hourly cron job via loopActionExecutor.
 */
async function recalculateIndividualScore(userId, workspaceId, periodStart, periodEnd) {
  try {
    const { data: taskScores, error } = await supabase
      .from('kpi_task_scores')
      .select('on_time_score, reopen_score, cycle_time_score, composite_score, weighted_score, credit_pct, reopen_count')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', userId)
      .gte('evaluated_at', periodStart)
      .lte('evaluated_at', periodEnd);

    if (error) throw error;
    if (!taskScores || taskScores.length === 0) return null;

    const n = taskScores.length;
    const avg = (key) => +(taskScores.reduce((s, r) => s + (r[key] || 0), 0) / n).toFixed(2);

    const onTimeRate    = avg('on_time_score');
    const reopenRate    = avg('reopen_score');
    const cycleScore    = avg('cycle_time_score');
    const composite     = +(onTimeRate * TASK_WEIGHTS.on_time + reopenRate * TASK_WEIGHTS.reopen + cycleScore * TASK_WEIGHTS.cycle_time).toFixed(2);

    // Fetch role weight from profiles or kpi_role_weights
    const roleWeight = await getRoleWeight(userId, workspaceId);
    const weightedScore = +(composite * roleWeight).toFixed(2);

    const state = deriveScoreState(weightedScore);

    const row = {
      workspace_id:     workspaceId,
      user_id:          userId,
      period_start:     periodStart,
      period_end:       periodEnd,
      period_type:      'week',
      on_time_rate:     onTimeRate,
      reopen_rate:      reopenRate,
      cycle_time_score: cycleScore,
      composite_score:  composite,
      role_weight:      roleWeight,
      weighted_score:   weightedScore,
      tasks_evaluated:  n,
      tasks_on_time:    taskScores.filter(r => r.on_time_score === 100).length,
      tasks_reopened:   taskScores.filter(r => r.reopen_count > 0).length,
      tasks_completed:  n,
      score_state:      state,
      data_quality:     'confirmed',
      last_sync_at:     new Date().toISOString(),
      calculated_at:    new Date().toISOString(),
    };

    await supabase
      .from('kpi_individual_scores')
      .upsert(row, { onConflict: 'workspace_id,user_id,period_start,period_type' });

    return row;
  } catch (err) {
    logger.error({ err, userId }, '[kpi] recalculateIndividualScore error');
    return null;
  }
}

// ── PROJECT SCORE (Tier 2 — hourly batch) ────────────────────────────────────

async function recalculateProjectScore(projectId, workspaceId, periodStart, periodEnd, mode = 'smb') {
  try {
    const [tasksRes, milestonesRes] = await Promise.all([
      supabase.from('tasks')
        .select('id, status, due_date, completed_at, created_at')
        .eq('project_id', projectId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd),
      supabase.from('tasks')
        .select('id, status, due_date, completed_at')
        .eq('project_id', projectId)
        .eq('priority', 'critical')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd),
    ]);

    const tasks      = tasksRes.data || [];
    const milestones = milestonesRes.data || [];
    const total      = tasks.length;
    const completed  = tasks.filter(t => t.status === 'done').length;
    const overdue    = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length;

    // P1 — Milestone hit rate
    const mTotal = milestones.length;
    const mHit   = milestones.filter(m => m.status === 'done' && m.completed_at && m.due_date && new Date(m.completed_at) <= new Date(m.due_date)).length;
    const milestoneRate = mTotal > 0 ? +((mHit / mTotal) * 100).toFixed(2) : 100;

    // P3 — Task velocity (tasks completed / week)
    const weeks = Math.max(1, Math.round((new Date(periodEnd) - new Date(periodStart)) / 604_800_000));
    const velocity = +(completed / weeks).toFixed(2);
    const velocityScore = Math.min(100, +(velocity * 10).toFixed(2)); // 10 tasks/week = 100

    const weights = PROJECT_WEIGHTS[mode];
    const composite = +(
      milestoneRate * weights.milestone +
      velocityScore * weights.velocity
    ).toFixed(2);

    const row = {
      workspace_id:       workspaceId,
      project_id:         projectId,
      period_start:       periodStart,
      period_end:         periodEnd,
      period_type:        'week',
      milestone_hit_rate: milestoneRate,
      task_velocity:      velocity,
      composite_score:    composite,
      scoring_mode:       mode,
      tasks_total:        total,
      tasks_completed:    completed,
      tasks_overdue:      overdue,
      milestones_total:   mTotal,
      milestones_hit:     mHit,
      calculated_at:      new Date().toISOString(),
    };

    await supabase
      .from('kpi_project_scores')
      .upsert(row, { onConflict: 'workspace_id,project_id,period_start,period_type' });

    return row;
  } catch (err) {
    logger.error({ err, projectId }, '[kpi] recalculateProjectScore error');
    return null;
  }
}

// ── TEAM SCORE (Tier 2 — hourly batch) ───────────────────────────────────────

async function recalculateTeamScore(teamId, workspaceId, periodStart, periodEnd) {
  try {
    const { data: members } = await supabase
      .from('team_members')
      .select('id, user_id, role')
      .eq('team_id', teamId);

    if (!members || members.length === 0) return null;

    const userIds = members.map(m => m.user_id).filter(Boolean);

    const { data: scores } = await supabase
      .from('kpi_individual_scores')
      .select('user_id, weighted_score, role_weight')
      .eq('workspace_id', workspaceId)
      .eq('period_start', periodStart)
      .eq('period_type', 'week')
      .in('user_id', userIds);

    const evaluated = scores || [];
    const totalWeight = evaluated.reduce((s, r) => s + (r.role_weight || 1), 0);
    const weightedAvg = totalWeight > 0
      ? +(evaluated.reduce((s, r) => s + (r.weighted_score || 0) * (r.role_weight || 1), 0) / totalWeight).toFixed(2)
      : 0;

    // TM3 — Availability: members with scores / total members
    const availabilityRate = members.length > 0
      ? +((evaluated.length / members.length) * 100).toFixed(2)
      : 0;

    // TM5 — Escalation penalty (placeholder: 0 until escalations table wired)
    const escalationPenalty = 0;

    const composite = +(
      weightedAvg      * TEAM_WEIGHTS.completion   +
      availabilityRate * TEAM_WEIGHTS.availability  +
      Math.max(0, 100 - escalationPenalty) * TEAM_WEIGHTS.escalation
    ).toFixed(2);

    const row = {
      workspace_id:       workspaceId,
      team_id:            teamId,
      period_start:       periodStart,
      period_end:         periodEnd,
      period_type:        'week',
      avg_completion_rate: weightedAvg,
      availability_rate:   availabilityRate,
      escalation_rate:     0,
      escalation_penalty:  escalationPenalty,
      composite_score:     composite,
      member_count:        members.length,
      members_evaluated:   evaluated.length,
      calculated_at:       new Date().toISOString(),
    };

    await supabase
      .from('kpi_team_scores')
      .upsert(row, { onConflict: 'workspace_id,team_id,period_start,period_type' });

    return row;
  } catch (err) {
    logger.error({ err, teamId }, '[kpi] recalculateTeamScore error');
    return null;
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

async function getRoleWeight(userId, workspaceId) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile?.role) return DEFAULT_ROLE_WEIGHTS.default;

    const { data: rw } = await supabase
      .from('kpi_role_weights')
      .select('weight')
      .eq('workspace_id', workspaceId)
      .eq('role_name', profile.role)
      .maybeSingle();

    return rw?.weight || DEFAULT_ROLE_WEIGHTS[profile.role] || DEFAULT_ROLE_WEIGHTS.default;
  } catch {
    return DEFAULT_ROLE_WEIGHTS.default;
  }
}

function deriveScoreState(score) {
  if (score >= 70) return 'healthy';
  if (score >= 60) return 'watch';
  if (score >= 50) return 'concern';
  return 'critical';
}

function getCurrentPeriod() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split('T')[0],
    end:   sunday.toISOString().split('T')[0],
  };
}

module.exports = {
  scoreTask,
  recalculateIndividualScore,
  recalculateProjectScore,
  recalculateTeamScore,
  computeTaskScores,
  deriveScoreState,
  getCurrentPeriod,
};
