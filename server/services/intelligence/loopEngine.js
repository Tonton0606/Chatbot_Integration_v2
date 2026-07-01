/**
 * Loop Engine Orchestrator
 *
 * Runs the continuous OBSERVE → ANALYZE → INSIGHT → DECIDE → ACT → LEARN cycle.
 * One LoopInstance per workspace, managed in memory.
 * State is persisted to Supabase on every tick.
 *
 * No Redis required — uses Node.js timers + EventEmitter.
 */

const EventEmitter = require("events");
const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const realtimeHub = require("./realtimeHub");

const { aggregate } = require("./dataAggregator");
const { mergeMetricMaps, resolveAggregatorModule } = require("./dataNormalizer");
const { buildDeterministicInsights } = require("./insightGenerator");
const { predictFromMetrics } = require("./predictionEngine");
const { evaluateAllRules } = require("./loopRuleEngine");
const { executeActions } = require("./loopActionExecutor");
const { recordRunLearning, getRuleEffectiveness } = require("./loopLearningEngine");

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_INTERVAL_MS     = 60 * 1000;      // 1 minute floor
const MAX_INTERVAL_MS     = 60 * 60 * 1000; // 1 hour ceiling

const DEFAULT_RULES = [
  // ── CRM / Sales ───────────────────────────────────────────────────────────
  { name: "Low Conversion Rate",   metric: "conversion_rate",  operator: "<",  threshold: 20,     severity: "critical", actions: ["send_alert", "create_task"] },
  { name: "Revenue Drop",          metric: "revenue_closed",   operator: "<",  threshold: 100000, severity: "warning",  actions: ["notify_admin"] },
  // ── Finance ───────────────────────────────────────────────────────────────
  { name: "High Overdue Amount",   metric: "overdue_amount",   operator: ">",  threshold: 500000, severity: "critical", actions: ["send_alert", "create_task"] },
  { name: "Low Collection Rate",   metric: "collection_rate",  operator: "<",  threshold: 60,     severity: "warning",  actions: ["send_alert"] },
  // ── HR ────────────────────────────────────────────────────────────────────
  { name: "High Absence Rate",     metric: "absence_rate",     operator: ">",  threshold: 15,     severity: "warning",  actions: ["notify_admin", "create_task"] },
  // ── Inventory ─────────────────────────────────────────────────────────────
  { name: "Low Stock Alert",       metric: "low_stock_items",  operator: ">",  threshold: 3,      severity: "critical", actions: ["send_alert", "create_task"] },
  // ── Facebook Ads ──────────────────────────────────────────────────────────
  { name: "Low ROAS",              metric: "fb_roas",          operator: "<",  threshold: 1.5,    severity: "critical", actions: ["send_alert", "create_task"],   description: "ROAS below 1.5 — campaigns spending more than earning" },
  { name: "Low CTR",               metric: "fb_ctr",           operator: "<",  threshold: 1.0,    severity: "warning",  actions: ["send_alert"],                  description: "CTR below 1% — ad creative or audience needs review" },
  { name: "High Cost Per Lead",    metric: "fb_cost_per_lead", operator: ">",  threshold: 500,    severity: "warning",  actions: ["send_alert", "create_task"],   description: "Cost per lead above ₱500" },
  { name: "High Ad Spend Burn",    metric: "fb_spend",         operator: ">",  threshold: 50000,  severity: "warning",  actions: ["notify_admin"],                description: "Ad spend exceeded ₱50,000 in period" },
  { name: "Multiple Low ROAS Campaigns", metric: "fb_low_roas_campaigns", operator: ">", threshold: 2, severity: "critical", actions: ["send_alert", "create_task", "pause_campaign"], description: "3+ campaigns with ROAS < 1.5" },
  { name: "No Facebook Leads",     metric: "fb_leads",         operator: "<",  threshold: 1,      severity: "warning",  actions: ["notify_admin"],                description: "Zero leads from Facebook Ads in period" },
];

// ── In-memory loop registry ──────────────────────────────────────────────────

const loops = new Map(); // workspaceId → LoopInstance

class LoopInstance extends EventEmitter {
  constructor(workspaceId, config) {
    super();
    this.workspaceId = workspaceId;
    this.config      = config;
    this.state       = "idle";   // idle | running | paused | error
    this.timer       = null;
    this.currentRunId = null;
    this.tickCount   = 0;
    this.lastRunAt   = null;
    this.lastMetrics = {};
    this.errors      = [];
  }

  get intervalMs() {
    const s = this.config.interval_seconds || 300;
    return Math.min(Math.max(s * 1000, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
  }

  start() {
    if (this.state === "running") return;
    this.state = "running";
    this._broadcast("loop.started", { workspace_id: this.workspaceId });
    this._scheduleTick();
    logger.info({ workspaceId: this.workspaceId, interval: this.intervalMs }, "[loop] started");
  }

  pause() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.state = "paused";
    this._broadcast("loop.paused", { workspace_id: this.workspaceId });
    logger.info({ workspaceId: this.workspaceId }, "[loop] paused");
  }

  stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.state = "idle";
    this._broadcast("loop.stopped", { workspace_id: this.workspaceId });
    loops.delete(this.workspaceId);
    logger.info({ workspaceId: this.workspaceId }, "[loop] stopped");
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.state === "running") {
      this.pause();
      this.start();
    }
  }

  status() {
    return {
      workspace_id:    this.workspaceId,
      state:           this.state,
      tick_count:      this.tickCount,
      last_run_at:     this.lastRunAt,
      interval_seconds: this.config.interval_seconds || 300,
      sources:         this.config.sources || [],
      rules_count:     (this.config.rules || DEFAULT_RULES).length,
      current_run_id:  this.currentRunId,
      errors:          this.errors.slice(-5),
    };
  }

  _scheduleTick() {
    if (this.state !== "running") return;
    this.timer = setTimeout(async () => {
      await this._tick();
      this._scheduleTick();
    }, this.intervalMs);
  }

  async _tick() {
    if (this.state !== "running") return;

    // Backpressure guard: skip this tick if the previous one is still running.
    // Prevents pile-up when a tick takes longer than the configured interval.
    if (this._tickRunning) {
      logger.warn({ workspaceId: this.workspaceId }, "[loop] previous tick still running — skipping");
      return;
    }
    this._tickRunning = true;

    const startedAt = Date.now();
    this.tickCount++;

    // ── Create run record ────────────────────────────────────────────────────
    const { data: runRow, error: runErr } = await supabase
      .from("loop_runs")
      .insert({
        workspace_id: this.workspaceId,
        config_id:    this.config.id || null,
        status:       "running",
        phase:        "observe",
      })
      .select("id")
      .single();

    if (runErr) {
      logger.warn({ runErr }, "[loop] failed to create run row — continuing");
    }
    const runId = runRow?.id || null;
    this.currentRunId = runId;

    this._broadcast("loop.tick_started", { run_id: runId, tick: this.tickCount });

    let metrics     = {};
    let insights    = [];
    let decisions   = [];
    let actionResults = [];
    let phase       = "observe";

    try {
      // ── 1. OBSERVE ────────────────────────────────────────────────────────
      phase = "observe";
      this._broadcastPhase(runId, phase);
      const sources = this.config.sources || ["crm", "finance", "marketing", "hr", "inventory"];
      const rawResults = await Promise.allSettled(
        sources.map(src => aggregate(resolveAggregatorModule(src), this.workspaceId, 30)
          .then(data => ({ source: src, data }))
          .catch(() => ({ source: src, data: { metrics: {} } }))
        )
      );
      const results = rawResults.map(r => r.status === "fulfilled" ? r.value : { source: "unknown", data: { metrics: {} } });
      metrics = mergeMetricMaps(results);

      // ── 2. ANALYZE ───────────────────────────────────────────────────────
      phase = "analyze";
      this._broadcastPhase(runId, phase);
      const anomalies = detectAnomalies(metrics, this.lastMetrics);

      // ── 3. INSIGHT ───────────────────────────────────────────────────────
      phase = "insight";
      this._broadcastPhase(runId, phase);
      const predictions = predictFromMetrics(metrics, [
        { metric: "revenue_closed",  horizon_days: 30 },
        { metric: "conversion_rate", horizon_days: 14 },
      ]);
      const rawInsights = buildDeterministicInsights({ module: { config: { sources } }, metrics, predictions });

      // Persist insights
      if (rawInsights.length) {
        const { data: savedInsights } = await supabase
          .from("intelligence_insights")
          .insert(rawInsights.map(i => ({
            workspace_id:        this.workspaceId,
            module_id:           null,
            title:               i.title,
            content:             i.content,
            severity:            i.severity,
            insight_type:        i.insight_type || "loop",
            confidence:          i.confidence || 75,
            evidence:            i.evidence || {},
            recommended_actions: i.recommended_actions || [],
          })))
          .select("id, title, severity");
        insights = savedInsights || rawInsights;
      }

      // ── 4. DECIDE ────────────────────────────────────────────────────────
      phase = "decide";
      this._broadcastPhase(runId, phase);
      const rules = this.config.rules?.length ? this.config.rules : DEFAULT_RULES;
      const ruleResults = evaluateAllRules(rules, metrics, this.lastMetrics);

      // Persist decisions
      const triggeredDecisions = ruleResults.filter(r => r.triggered);
      if (triggeredDecisions.length && runId) {
        const { data: savedDecisions } = await supabase
          .from("loop_decisions")
          .insert(triggeredDecisions.map(d => ({
            workspace_id:    this.workspaceId,
            run_id:          runId,
            rule_name:       d.rule_name,
            rule_config:     d.rule_config,
            metric:          d.metric,
            metric_value:    d.metric_value,
            threshold:       d.threshold,
            triggered:       true,
            confidence:      d.confidence,
            actions_planned: d.actions_planned,
          })))
          .select("id, rule_name, metric");
        decisions = savedDecisions || triggeredDecisions;
      }

      // ── 5. ACT ───────────────────────────────────────────────────────────
      phase = "act";
      this._broadcastPhase(runId, phase);
      const allActions = triggeredDecisions.flatMap(d => d.actions_planned || []);

      if (allActions.length) {
        actionResults = await executeActions(allActions, { workspaceId: this.workspaceId, runId });

        // Persist action records
        if (runId) {
          await supabase.from("loop_actions").insert(
            actionResults.map((r, i) => ({
              workspace_id:      this.workspaceId,
              run_id:            runId,
              action_type:       r.action_type,
              payload:           allActions[i]?.payload || {},
              status:            r.status,
              result:            r.result || {},
              requires_approval: r.requires_approval || false,
              executed_at:       r.executed_at || new Date().toISOString(),
            }))
          ).catch(() => {});
        }
      }

      // ── 6. LEARN ─────────────────────────────────────────────────────────
      phase = "learn";
      this._broadcastPhase(runId, phase);
      await recordRunLearning({
        workspaceId:  this.workspaceId,
        runId,
        decisions:    triggeredDecisions,
        actionResults,
        metricBefore: this.lastMetrics,
        metricAfter:  metrics,
      });

      // Update last metrics for next tick comparison
      this.lastMetrics = { ...metrics };
      this.lastRunAt   = new Date().toISOString();

      // ── Finalize run ─────────────────────────────────────────────────────
      phase = "done";
      const duration = Date.now() - startedAt;

      if (runId) {
        await supabase.from("loop_runs").update({
          status:           "completed",
          phase:            "done",
          metrics_snapshot: metrics,
          anomalies:        anomalies,
          insight_count:    insights.length,
          decision_count:   decisions.length,
          action_count:     actionResults.length,
          duration_ms:      duration,
          ended_at:         new Date().toISOString(),
        }).eq("id", runId);
      }

      const summary = {
        run_id:      runId,
        tick:        this.tickCount,
        duration_ms: duration,
        metrics_observed: Object.keys(metrics).length,
        anomalies_found:  anomalies.length,
        insights_generated: insights.length,
        decisions_made:   decisions.length,
        actions_executed: actionResults.filter(a => a.status === "executed").length,
        actions_pending:  actionResults.filter(a => a.status === "approval_required").length,
        phase: "done",
      };

      this._broadcast("loop.tick_completed", summary);
      logger.info(summary, "[loop] tick completed");

    } catch (err) {
      logger.error({ err, workspaceId: this.workspaceId, phase }, "[loop] tick error");
      this.errors.push({ phase, error: err.message, at: new Date().toISOString() });

      if (runId) {
        await supabase.from("loop_runs").update({
          status: "failed", phase, error: err.message, ended_at: new Date().toISOString(),
        }).eq("id", runId).catch(() => {});
      }

      this._broadcast("loop.tick_error", { run_id: runId, phase, error: err.message });
    } finally {
      // Always release the backpressure lock so the next scheduled tick can run.
      this._tickRunning = false;
    }
  }

  _broadcastPhase(runId, phase) {
    this._broadcast("loop.phase", { run_id: runId, phase, workspace_id: this.workspaceId });
    if (runId) {
      supabase.from("loop_runs").update({ phase }).eq("id", runId).catch(() => {});
    }
  }

  _broadcast(event, payload) {
    realtimeHub.publish(this.workspaceId, event, payload);
    this.emit(event, payload);
  }
}

// ── Anomaly detection ────────────────────────────────────────────────────────

function detectAnomalies(current, previous) {
  if (!previous || !Object.keys(previous).length) return [];
  const anomalies = [];

  for (const [key, curr] of Object.entries(current)) {
    const prev = previous[key];
    if (!prev || typeof curr !== "number") continue;
    const changePct = ((curr - prev) / prev) * 100;
    if (Math.abs(changePct) >= 20) {
      anomalies.push({
        metric: key,
        previous: prev,
        current: curr,
        change_pct: Math.round(changePct),
        direction: changePct > 0 ? "spike" : "drop",
        severity: Math.abs(changePct) >= 40 ? "critical" : "warning",
      });
    }
  }

  return anomalies;
}

// ── Public API ───────────────────────────────────────────────────────────────

async function getOrLoadConfig(workspaceId) {
  const { data } = await supabase
    .from("loop_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || {
    workspace_id:     workspaceId,
    name:             "Default Loop",
    interval_seconds: 300,
    sources:          ["crm", "finance", "marketing", "hr", "inventory"],
    rules:            DEFAULT_RULES,
    ai_enabled:       true,
  };
}

async function startLoop(workspaceId) {
  if (loops.has(workspaceId)) {
    const existing = loops.get(workspaceId);
    if (existing.state === "running") return existing.status();
    existing.start();
    return existing.status();
  }

  const config = await getOrLoadConfig(workspaceId);
  const instance = new LoopInstance(workspaceId, config);
  loops.set(workspaceId, instance);
  instance.start();

  // Run first tick immediately
  instance._tick().catch(err => logger.error({ err }, "[loop] immediate tick error"));

  return instance.status();
}

async function stopLoop(workspaceId) {
  const loop = loops.get(workspaceId);
  if (!loop) return { state: "idle", workspace_id: workspaceId };
  loop.stop();
  return { state: "idle", workspace_id: workspaceId };
}

async function pauseLoop(workspaceId) {
  const loop = loops.get(workspaceId);
  if (!loop) return { state: "idle", workspace_id: workspaceId };
  loop.pause();
  return loop.status();
}

function getLoopStatus(workspaceId) {
  const loop = loops.get(workspaceId);
  return loop ? loop.status() : { workspace_id: workspaceId, state: "idle", tick_count: 0 };
}

async function updateLoopConfig(workspaceId, patch) {
  // Upsert to DB
  const existing = await getOrLoadConfig(workspaceId);
  const merged = { ...existing, ...patch, workspace_id: workspaceId, updated_at: new Date().toISOString() };

  if (existing.id) {
    await supabase.from("loop_configs").update(merged).eq("id", existing.id);
  } else {
    const { data } = await supabase.from("loop_configs").insert(merged).select("id").single();
    if (data) merged.id = data.id;
  }

  // Update live instance if running
  const loop = loops.get(workspaceId);
  if (loop) loop.updateConfig(merged);

  return merged;
}

async function runOnce(workspaceId) {
  const config = await getOrLoadConfig(workspaceId);
  const instance = new LoopInstance(workspaceId, config);

  // Temporary instance — not stored in loops map
  await instance._tick();
  return instance.status();
}

async function getAllLoopStatuses() {
  return Array.from(loops.entries()).map(([wid, loop]) => loop.status());
}

/**
 * hydrateLoops — called at server startup to resume loops that were running
 * before the last process restart. Without this, loops silently die whenever
 * the server restarts (e.g. Render spin-down) and must be manually re-started.
 */
async function hydrateLoops() {
  try {
    const { data, error } = await supabase
      .from("loop_configs")
      .select("workspace_id, id, interval_seconds, sources, rules, ai_enabled, enabled")
      .eq("enabled", true);

    if (error) {
      logger.warn({ error: error.message }, "[loop] hydrateLoops: failed to query loop_configs");
      return;
    }

    if (!data || data.length === 0) {
      logger.info("[loop] hydrateLoops: no active loops to resume");
      return;
    }

    let resumed = 0;
    for (const config of data) {
      try {
        if (!loops.has(config.workspace_id)) {
          const instance = new LoopInstance(config.workspace_id, config);
          loops.set(config.workspace_id, instance);
          instance.start();
          resumed++;
        }
      } catch (err) {
        logger.warn({ err: err.message, workspaceId: config.workspace_id }, "[loop] hydrateLoops: failed to resume one loop");
      }
    }

    logger.info({ resumed, total: data.length }, "[loop] hydrateLoops: complete");
  } catch (err) {
    logger.warn({ err: err.message }, "[loop] hydrateLoops: unexpected error (non-fatal)");
  }
}

module.exports = {
  startLoop,
  stopLoop,
  pauseLoop,
  runOnce,
  getLoopStatus,
  updateLoopConfig,
  getAllLoopStatuses,
  hydrateLoops,
  DEFAULT_RULES,
};
