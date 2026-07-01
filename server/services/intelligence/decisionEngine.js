const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const { aggregate } = require("./dataAggregator");
const { buildDeterministicInsights } = require("./insightGenerator");
const { evaluateRule, planActions } = require("./automationEngine");
const { mergeMetricMaps, normalizeSnapshot, resolveAggregatorModule } = require("./dataNormalizer");
const { normalizeModuleConfig, getDefaultModule } = require("./moduleRegistry");
const { predictFromMetrics } = require("./predictionEngine");
const { encryptCredentials, redactDataSource } = require("./credentialVault");
const realtimeHub = require("./realtimeHub");

function clampDays(days) {
  return Math.min(Math.max(Number(days) || 30, 1), 365);
}

async function listModules(workspaceId) {
  const { data, error } = await supabase
    .from("intelligence_modules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data?.length ? data.map(normalizeModuleConfig) : [getDefaultModule()];
}

async function createModule(workspaceId, userId, payload) {
  const normalized = normalizeModuleConfig(payload);
  const { data, error } = await supabase
    .from("intelligence_modules")
    .insert({
      workspace_id: workspaceId,
      name: normalized.name,
      slug: normalized.slug,
      description: normalized.description,
      config: normalized.config,
      status: normalized.status,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeModuleConfig(data);
}

async function getModule(workspaceId, moduleIdOrSlug) {
  if (!moduleIdOrSlug || moduleIdOrSlug === "default") return getDefaultModule();

  const base = supabase
    .from("intelligence_modules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  const query = /^[0-9a-f-]{36}$/i.test(moduleIdOrSlug)
    ? base.eq("id", moduleIdOrSlug)
    : base.eq("slug", moduleIdOrSlug);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? normalizeModuleConfig(data) : getDefaultModule(moduleIdOrSlug);
}

async function ingestSources({ workspaceId, module, days }) {
  const sources = module.config.sources?.length ? module.config.sources : ["executive"];
  const results = [];

  for (const source of sources) {
    const aggregatorModule = resolveAggregatorModule(source);
    try {
      const aggregated = await aggregate(aggregatorModule, workspaceId, days);
      results.push({ source, data: aggregated });
    } catch (err) {
      logger.warn({ err, workspaceId, source, module: module.slug }, "intelligence source aggregation failed");
      results.push({ source, data: { module: source, metrics: {}, error: "source_unavailable" } });
    }
  }

  const snapshots = results.flatMap((result) =>
    normalizeSnapshot({
      workspaceId,
      moduleId: module.id,
      source: result.source,
      aggregated: result.data,
    })
  );

  if (snapshots.length && module.id) {
    const { error } = await supabase.from("intelligence_data_snapshots").insert(snapshots);
    if (error) logger.warn({ err: error, workspaceId, moduleId: module.id }, "intelligence snapshots insert failed");
  }

  return { results, snapshots };
}

async function persistInsights(workspaceId, moduleId, insights) {
  if (!moduleId || !insights.length) return insights;
  const rows = insights.map((insight) => ({
    workspace_id: workspaceId,
    module_id: moduleId,
    title: insight.title,
    content: insight.content,
    severity: insight.severity,
    insight_type: insight.insight_type,
    confidence: insight.confidence,
    evidence: insight.evidence || {},
    recommended_actions: insight.recommended_actions || [],
  }));
  const { data, error } = await supabase.from("intelligence_insights").insert(rows).select("*");
  if (error) throw error;
  return data || insights;
}

async function persistPredictions(workspaceId, moduleId, predictions) {
  if (!moduleId || !predictions.length) return predictions;
  const rows = predictions.map((prediction) => ({
    workspace_id: workspaceId,
    module_id: moduleId,
    metric: prediction.metric,
    forecast_data: prediction.forecast_data,
    model_info: prediction.model_info,
    confidence: prediction.confidence,
    horizon_days: prediction.horizon_days,
  }));
  const { data, error } = await supabase.from("intelligence_predictions").insert(rows).select("*");
  if (error) throw error;
  return data || predictions;
}

async function runAutomations({ workspaceId, module, metrics }) {
  const configuredAutomations = module.config.automations || [];
  const { data: dbAutomations, error } = module.id
    ? await supabase
        .from("intelligence_automations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id)
        .eq("status", "active")
        .limit(100)
    : { data: [], error: null };
  if (error) throw error;

  const allAutomations = [
    ...configuredAutomations.map((automation, index) => ({
      id: null,
      name: automation.name || `Config Automation ${index + 1}`,
      rule: automation.rule || automation,
      actions: automation.actions || automation.then || [],
    })),
    ...(dbAutomations || []),
  ];

  const runs = [];
  for (const automation of allAutomations) {
    const evaluation = evaluateRule(automation.rule, metrics);
    if (!evaluation.matched) continue;

    const actionResults = planActions(automation.actions, { module, metrics });
    const status = actionResults.some((action) => action.status === "approval_required")
      ? "approval_required"
      : "executed";
    const run = {
      automation_id: automation.id || null,
      module_id: module.id || null,
      status,
      trigger_payload: evaluation,
      action_results: actionResults,
    };

    if (automation.id) {
      const { data, error: insertError } = await supabase
        .from("intelligence_automation_runs")
        .insert({ workspace_id: workspaceId, ...run })
        .select("*")
        .single();
      if (insertError) throw insertError;
      runs.push(data);
      await supabase
        .from("intelligence_automations")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", automation.id)
        .eq("workspace_id", workspaceId);
    } else {
      runs.push({ id: null, workspace_id: workspaceId, ...run, created_at: new Date().toISOString() });
    }
  }

  return runs;
}

async function runDecisionEngine({ workspaceId, moduleIdOrSlug, days = 30, persist = true }) {
  const module = await getModule(workspaceId, moduleIdOrSlug);
  const resolvedDays = clampDays(days);
  const { results } = await ingestSources({ workspaceId, module, days: resolvedDays });
  const metrics = mergeMetricMaps(results);
  const predictions = predictFromMetrics(metrics, module.config.predictions || []);
  const insights = buildDeterministicInsights({ module, metrics, predictions });
  const automations = await runAutomations({ workspaceId, module, metrics });

  const persistedPredictions = persist ? await persistPredictions(workspaceId, module.id, predictions) : predictions;
  const persistedInsights = persist ? await persistInsights(workspaceId, module.id, insights) : insights;

  const payload = {
    module,
    metrics,
    sources: results,
    insights: persistedInsights,
    predictions: persistedPredictions,
    automations,
    generated_at: new Date().toISOString(),
  };

  realtimeHub.publish(workspaceId, "intelligence.run", payload);
  return payload;
}

async function listInsights(workspaceId, moduleId, limit = 50) {
  let query = supabase
    .from("intelligence_insights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(limit) || 50, 100));

  if (moduleId) query = query.eq("module_id", moduleId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createAutomation(workspaceId, userId, payload) {
  const module = payload.module_id ? await getModule(workspaceId, payload.module_id) : null;
  const { data, error } = await supabase
    .from("intelligence_automations")
    .insert({
      workspace_id: workspaceId,
      module_id: module?.id || payload.module_id || null,
      name: payload.name,
      description: payload.description || null,
      rule: payload.rule,
      actions: payload.actions || [],
      status: payload.status || "active",
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function listDataSources(workspaceId) {
  const { data, error } = await supabase
    .from("intelligence_data_sources")
    .select("id,workspace_id,name,type,config,sync_strategy,sync_interval_seconds,status,last_synced_at,created_by,created_at,updated_at,credentials_encrypted")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []).map(redactDataSource);
}

async function createDataSource(workspaceId, userId, payload) {
  const { data, error } = await supabase
    .from("intelligence_data_sources")
    .insert({
      workspace_id: workspaceId,
      name: payload.name,
      type: payload.type,
      credentials_encrypted: encryptCredentials(payload.credentials || {}),
      config: payload.config || {},
      sync_strategy: payload.sync_strategy || "polling",
      sync_interval_seconds: payload.sync_interval_seconds || 900,
      status: payload.status || "active",
      created_by: userId,
    })
    .select("id,workspace_id,name,type,config,sync_strategy,sync_interval_seconds,status,last_synced_at,created_by,created_at,updated_at,credentials_encrypted")
    .single();

  if (error) throw error;
  return redactDataSource(data);
}

module.exports = {
  createAutomation,
  createDataSource,
  createModule,
  getModule,
  listDataSources,
  listInsights,
  listModules,
  runDecisionEngine,
};
