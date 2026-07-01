'use strict';

/**
 * KPI Performance Summary + Recommendations Generator
 *
 * Generates plain-language performance summaries and actionable
 * improvement recommendations for individuals, teams, and projects.
 * Called by Tier 3 daily batch and on-demand via API.
 */

const { supabase } = require('../../config/supabase');
const logger = require('../../config/logger');
const { recalculateIndividualScore, recalculateProjectScore, recalculateTeamScore, getCurrentPeriod } = require('./kpiScoring');

// ── THRESHOLDS ────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  on_time_rate:    { excellent: 90, good: 75, concern: 60 },
  reopen_rate:     { excellent: 90, good: 75, concern: 60 }, // inverted — high = good (few reopens)
  cycle_time:      { excellent: 90, good: 70, concern: 50 },
  composite:       { healthy: 70, watch: 60, concern: 50 },
  top_performer:   85,
  at_risk:         60,
};

// ── INDIVIDUAL SUMMARY ────────────────────────────────────────────────────────

async function generateIndividualSummary(userId, workspaceId, periodStart, periodEnd) {
  try {
    // Fetch current period score
    const { data: current } = await supabase
      .from('kpi_individual_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .eq('period_type', 'week')
      .maybeSingle();

    if (!current) return null;

    // Fetch previous period for trend
    const prevStart = getPreviousPeriodStart(periodStart);
    const { data: previous } = await supabase
      .from('kpi_individual_scores')
      .select('weighted_score')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('period_start', prevStart)
      .eq('period_type', 'week')
      .maybeSingle();

    // Fetch user name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .maybeSingle();

    const score      = current.weighted_score || 0;
    const prevScore  = previous?.weighted_score || null;
    const delta      = prevScore !== null ? +(score - prevScore).toFixed(2) : null;
    const trend      = deriveTrend(score, prevScore);
    const isTop      = score >= THRESHOLDS.top_performer;
    const isAtRisk   = score < THRESHOLDS.at_risk;
    const needsAttn  = score < THRESHOLDS.composite.watch;

    const headline = buildIndividualHeadline(profile?.full_name || 'Team Member', current, score, trend);
    const body     = buildIndividualBody(current, score, trend, delta);

    const summary = {
      workspace_id:     workspaceId,
      subject_type:     'individual',
      subject_id:       userId,
      subject_name:     profile?.full_name || userId,
      period_start:     periodStart,
      period_end:       periodEnd,
      period_type:      'week',
      overall_score:    score,
      score_trend:      trend,
      score_delta:      delta,
      previous_score:   prevScore,
      score_state:      current.score_state,
      component_scores: {
        on_time_rate:     current.on_time_rate,
        reopen_score:     current.reopen_rate,
        cycle_time_score: current.cycle_time_score,
      },
      stats: {
        tasks_total:     current.tasks_evaluated,
        tasks_done:      current.tasks_completed,
        tasks_on_time:   current.tasks_on_time,
        tasks_reopened:  current.tasks_reopened,
      },
      summary_headline:  headline,
      summary_body:      body,
      is_top_performer:  isTop,
      is_at_risk:        isAtRisk,
      needs_attention:   needsAttn,
      generated_at:      new Date().toISOString(),
      generation_source: 'system',
    };

    const { data: saved, error } = await supabase
      .from('kpi_performance_summaries')
      .upsert(summary, { onConflict: 'workspace_id,subject_type,subject_id,period_start,period_type' })
      .select('id')
      .single();

    if (error) logger.error({ err: error }, '[kpiSummary] upsert individual summary error');

    // Generate recommendations
    if (saved?.id) {
      await generateIndividualRecommendations(saved.id, userId, workspaceId, current, score, periodStart);
    }

    return summary;
  } catch (err) {
    logger.error({ err, userId }, '[kpiSummary] generateIndividualSummary error');
    return null;
  }
}

// ── INDIVIDUAL RECOMMENDATIONS ────────────────────────────────────────────────

async function generateIndividualRecommendations(summaryId, userId, workspaceId, scores, composite, periodStart) {
  const recs = [];

  // T2 — On-time delivery
  if (scores.on_time_rate < THRESHOLDS.on_time_rate.concern) {
    recs.push({
      workspace_id:      workspaceId,
      summary_id:        summaryId,
      subject_type:      'individual',
      subject_id:        userId,
      period_start:      periodStart,
      category:          'timeliness',
      priority:          scores.on_time_rate < 40 ? 'high' : 'medium',
      title:             'On-Time Delivery Needs Improvement',
      body:              `On-time delivery rate is ${scores.on_time_rate}% — below the 60% threshold. Tasks are consistently missing deadlines.`,
      action_items:      [
        { action: 'Review open tasks for realistic due date alignment', owner: 'manager', deadline: '3 days' },
        { action: 'Check if tasks are blocked by external dependencies', owner: 'team_lead', deadline: '2 days' },
        { action: 'Schedule a 1:1 to identify blockers', owner: 'manager', deadline: '5 days' },
      ],
      trigger_metric:    'on_time_rate',
      trigger_value:     scores.on_time_rate,
      trigger_threshold: THRESHOLDS.on_time_rate.concern,
    });
  }

  // T4 — Reopen rate
  if (scores.reopen_rate < THRESHOLDS.reopen_rate.concern) {
    recs.push({
      workspace_id:      workspaceId,
      summary_id:        summaryId,
      subject_type:      'individual',
      subject_id:        userId,
      period_start:      periodStart,
      category:          'quality',
      priority:          scores.reopen_rate < 50 ? 'high' : 'medium',
      title:             'High Task Reopen Rate Detected',
      body:              `Task quality score is ${scores.reopen_rate}% — tasks are being sent back for rework. This impacts cycle time and team throughput.`,
      action_items:      [
        { action: 'Review definition-of-done criteria with team member', owner: 'manager', deadline: '3 days' },
        { action: 'Identify recurring patterns in reopened tasks', owner: 'team_lead', deadline: '5 days' },
        { action: 'Consider pairing with a senior team member for review', owner: 'manager', deadline: '7 days' },
      ],
      trigger_metric:    'reopen_rate',
      trigger_value:     scores.reopen_rate,
      trigger_threshold: THRESHOLDS.reopen_rate.concern,
    });
  }

  // T5 — Cycle time
  if (scores.cycle_time_score < THRESHOLDS.cycle_time.concern) {
    recs.push({
      workspace_id:      workspaceId,
      summary_id:        summaryId,
      subject_type:      'individual',
      subject_id:        userId,
      period_start:      periodStart,
      category:          'efficiency',
      priority:          'medium',
      title:             'Task Completion Speed Below Benchmark',
      body:              `Cycle time score is ${scores.cycle_time_score}% — tasks are taking significantly longer than expected for their priority level.`,
      action_items:      [
        { action: 'Assess if task scope matches assigned priority', owner: 'team_lead', deadline: '3 days' },
        { action: 'Check if member is overloaded — review total open tasks', owner: 'manager', deadline: '2 days' },
        { action: 'Identify training needs for task type', owner: 'hr', deadline: '14 days' },
      ],
      trigger_metric:    'cycle_time_score',
      trigger_value:     scores.cycle_time_score,
      trigger_threshold: THRESHOLDS.cycle_time.concern,
    });
  }

  // Workload — too many tasks
  if (scores.tasks_evaluated > 15) {
    recs.push({
      workspace_id:      workspaceId,
      summary_id:        summaryId,
      subject_type:      'individual',
      subject_id:        userId,
      period_start:      periodStart,
      category:          'workload',
      priority:          'medium',
      title:             'High Task Volume — Risk of Overload',
      body:              `${scores.tasks_evaluated} tasks evaluated this week. High workload may be contributing to quality and timeliness issues.`,
      action_items:      [
        { action: 'Review task assignments — redistribute if overloaded', owner: 'manager', deadline: '2 days' },
        { action: 'Prioritize critical and high tasks only this week', owner: 'team_lead', deadline: '1 day' },
      ],
      trigger_metric:    'tasks_evaluated',
      trigger_value:     scores.tasks_evaluated,
      trigger_threshold: 15,
    });
  }

  // Top performer recognition
  if (composite >= THRESHOLDS.top_performer) {
    recs.push({
      workspace_id:      workspaceId,
      summary_id:        summaryId,
      subject_type:      'individual',
      subject_id:        userId,
      period_start:      periodStart,
      category:          'recognition',
      priority:          'low',
      title:             'Top Performer This Week',
      body:              `Outstanding performance score of ${composite}. Consistently delivering on time with high quality.`,
      action_items:      [
        { action: 'Acknowledge performance in team meeting', owner: 'manager', deadline: '7 days' },
        { action: 'Consider for mentoring or stretch assignments', owner: 'manager', deadline: '14 days' },
      ],
      trigger_metric:    'composite_score',
      trigger_value:     composite,
      trigger_threshold: THRESHOLDS.top_performer,
    });
  }

  if (recs.length === 0) return;

  const { error } = await supabase.from('kpi_recommendations').insert(recs);
  if (error) logger.error({ err: error }, '[kpiSummary] insert recommendations error');
}

// ── TEAM SUMMARY ──────────────────────────────────────────────────────────────

async function generateTeamSummary(teamId, workspaceId, periodStart, periodEnd) {
  try {
    const { data: score } = await supabase
      .from('kpi_team_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (!score) return null;

    const { data: team } = await supabase
      .from('teams')
      .select('name, department')
      .eq('id', teamId)
      .maybeSingle();

    const prevStart = getPreviousPeriodStart(periodStart);
    const { data: prev } = await supabase
      .from('kpi_team_scores')
      .select('composite_score')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .eq('period_start', prevStart)
      .maybeSingle();

    const composite = score.composite_score;
    const delta     = prev ? +(composite - prev.composite_score).toFixed(2) : null;
    const trend     = deriveTrend(composite, prev?.composite_score);

    const summary = {
      workspace_id:     workspaceId,
      subject_type:     'team',
      subject_id:       teamId,
      subject_name:     team?.name || teamId,
      period_start:     periodStart,
      period_end:       periodEnd,
      period_type:      'week',
      overall_score:    composite,
      score_trend:      trend,
      score_delta:      delta,
      previous_score:   prev?.composite_score || null,
      score_state:      composite >= 70 ? 'healthy' : composite >= 60 ? 'watch' : 'concern',
      component_scores: {
        avg_completion_rate: score.avg_completion_rate,
        availability_rate:   score.availability_rate,
        escalation_rate:     score.escalation_rate,
      },
      stats: {
        member_count:      score.member_count,
        members_evaluated: score.members_evaluated,
      },
      summary_headline:  `${team?.name || 'Team'}: ${composite >= 70 ? '✓ On Track' : composite >= 60 ? '⚠ Watch' : '✗ Needs Attention'} — Score ${composite}/100`,
      summary_body:      buildTeamBody(score, composite, trend, delta),
      is_top_performer:  composite >= THRESHOLDS.top_performer,
      is_at_risk:        composite < THRESHOLDS.at_risk,
      needs_attention:   composite < THRESHOLDS.composite.watch,
      generated_at:      new Date().toISOString(),
      generation_source: 'system',
    };

    await supabase
      .from('kpi_performance_summaries')
      .upsert(summary, { onConflict: 'workspace_id,subject_type,subject_id,period_start,period_type' });

    return summary;
  } catch (err) {
    logger.error({ err, teamId }, '[kpiSummary] generateTeamSummary error');
    return null;
  }
}

// ── PROJECT SUMMARY ───────────────────────────────────────────────────────────

async function generateProjectSummary(projectId, workspaceId, periodStart, periodEnd) {
  try {
    const { data: score } = await supabase
      .from('kpi_project_scores')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (!score) return null;

    const { data: project } = await supabase
      .from('projects')
      .select('project_name')
      .eq('id', projectId)
      .maybeSingle();

    const composite = score.composite_score;
    const recs = [];

    if (score.tasks_overdue > 0) {
      recs.push({
        workspace_id:  workspaceId,
        subject_type:  'project',
        subject_id:    projectId,
        period_start:  periodStart,
        category:      'timeliness',
        priority:      score.tasks_overdue > 5 ? 'high' : 'medium',
        title:         `${score.tasks_overdue} Overdue Tasks Detected`,
        body:          `Project has ${score.tasks_overdue} tasks past their due date this period. Milestone hit rate: ${score.milestone_hit_rate}%.`,
        action_items:  [
          { action: 'Review and reprioritize overdue tasks', owner: 'project_lead', deadline: '2 days' },
          { action: 'Identify blockers causing delays', owner: 'team_lead', deadline: '1 day' },
        ],
        trigger_metric:    'tasks_overdue',
        trigger_value:     score.tasks_overdue,
        trigger_threshold: 1,
      });
    }

    const summary = {
      workspace_id:     workspaceId,
      subject_type:     'project',
      subject_id:       projectId,
      subject_name:     project?.project_name || projectId,
      period_start:     periodStart,
      period_end:       periodEnd,
      period_type:      'week',
      overall_score:    composite,
      score_trend:      'stable',
      score_state:      composite >= 70 ? 'healthy' : 'concern',
      component_scores: {
        milestone_hit_rate: score.milestone_hit_rate,
        task_velocity:      score.task_velocity,
      },
      stats: {
        tasks_total:     score.tasks_total,
        tasks_completed: score.tasks_completed,
        tasks_overdue:   score.tasks_overdue,
        milestones_hit:  score.milestones_hit,
      },
      summary_headline:  `${project?.project_name || 'Project'} — ${score.tasks_completed}/${score.tasks_total} tasks done, ${score.milestone_hit_rate}% milestones hit`,
      summary_body:      `Project velocity: ${score.task_velocity} tasks/week. Overall health score: ${composite}/100.`,
      is_at_risk:        composite < THRESHOLDS.at_risk,
      needs_attention:   score.tasks_overdue > 3,
      generated_at:      new Date().toISOString(),
      generation_source: 'system',
    };

    await supabase
      .from('kpi_performance_summaries')
      .upsert(summary, { onConflict: 'workspace_id,subject_type,subject_id,period_start,period_type' });

    if (recs.length > 0) {
      await supabase.from('kpi_recommendations').insert(recs);
    }

    return summary;
  } catch (err) {
    logger.error({ err, projectId }, '[kpiSummary] generateProjectSummary error');
    return null;
  }
}

// ── FULL WORKSPACE BATCH (Tier 3 — daily) ────────────────────────────────────

async function runDailyBatch(workspaceId, mode = 'smb') {
  const { start: periodStart, end: periodEnd } = getCurrentPeriod();
  logger.info({ workspaceId, periodStart }, '[kpiSummary] runDailyBatch start');

  try {
    // 1. Fetch all active users
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('workspace_id', workspaceId);

    // 2. Recalculate individual scores + summaries
    for (const u of (users || [])) {
      await recalculateIndividualScore(u.id, workspaceId, periodStart, periodEnd);
      await generateIndividualSummary(u.id, workspaceId, periodStart, periodEnd);
    }

    // 3. Teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('workspace_id', workspaceId);

    for (const t of (teams || [])) {
      await recalculateTeamScore(t.id, workspaceId, periodStart, periodEnd);
      await generateTeamSummary(t.id, workspaceId, periodStart, periodEnd);
    }

    // 4. Projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId);

    for (const p of (projects || [])) {
      await recalculateProjectScore(p.id, workspaceId, periodStart, periodEnd, mode);
      await generateProjectSummary(p.id, workspaceId, periodStart, periodEnd);
    }

    logger.info({ workspaceId }, '[kpiSummary] runDailyBatch complete');
    return { success: true, periodStart, periodEnd };
  } catch (err) {
    logger.error({ err, workspaceId }, '[kpiSummary] runDailyBatch error');
    return { success: false, error: err.message };
  }
}

// ── TEXT BUILDERS ─────────────────────────────────────────────────────────────

function buildIndividualHeadline(name, scores, composite, trend) {
  const trendIcon = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→';
  const state = composite >= 70 ? 'Strong' : composite >= 60 ? 'Moderate' : 'Needs Attention';
  return `${name}: ${state} — ${composite}/100 ${trendIcon} | On-time ${scores.on_time_rate}% | Reopen score ${scores.reopen_rate}%`;
}

function buildIndividualBody(scores, composite, trend, delta) {
  const lines = [
    `Performance score this week: ${composite}/100.`,
    delta !== null ? `${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points from last week (${trend}).` : 'No previous period data available.',
    `On-time delivery: ${scores.on_time_rate}% (${scores.tasks_on_time} of ${scores.tasks_evaluated} tasks).`,
    `Quality score: ${scores.reopen_rate}% — ${scores.tasks_reopened} task(s) reopened for rework.`,
    `Efficiency score: ${scores.cycle_time_score}% vs priority benchmarks.`,
  ];
  return lines.join(' ');
}

function buildTeamBody(score, composite, trend, delta) {
  return [
    `Team composite score: ${composite}/100.`,
    delta !== null ? `${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points from last week.` : '',
    `${score.members_evaluated} of ${score.member_count} members scored this period.`,
    `Avg completion rate: ${score.avg_completion_rate}%. Availability: ${score.availability_rate}%.`,
  ].filter(Boolean).join(' ');
}

function deriveTrend(current, previous) {
  if (previous === null || previous === undefined) return 'stable';
  const delta = current - previous;
  if (delta >= 5)  return 'improving';
  if (delta <= -5) return 'declining';
  return 'stable';
}

function getPreviousPeriodStart(periodStart) {
  const d = new Date(periodStart);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

module.exports = {
  generateIndividualSummary,
  generateTeamSummary,
  generateProjectSummary,
  runDailyBatch,
};
