const SOURCE_ALIASES = {
  executive:   ["crm", "marketing", "finance", "hr"],
  sales:       ["crm"],
  orders:      ["finance"],
  ads:         ["marketing"],
  meta_ads:    ["facebook"],
  google_ads:  ["marketing"],
  fb:          ["facebook"],
  facebook_ads:["facebook"],
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function flattenMetrics(payload = {}) {
  const metrics = {
    ...(payload.metrics || {}),
    ...(payload.summary_metrics || {}),
    ...(payload.crm || {}),
    ...(payload.finance || {}),
    ...(payload.hr || {}),
    ...(payload.marketing || {}),
  };

  // Include facebook metrics if present
  if (payload.facebook) Object.assign(metrics, payload.facebook);

  return Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [key, typeof value === "number" ? value : toNumber(value)])
  );
}

function resolveAggregatorModule(source) {
  const key = String(source || "executive").toLowerCase();
  return SOURCE_ALIASES[key]?.[0] || key;
}

function normalizeSnapshot({ workspaceId, moduleId, source, aggregated }) {
  const metricEntries = Object.entries(flattenMetrics(aggregated));
  return metricEntries.map(([metricKey, metricValue]) => ({
    workspace_id: workspaceId,
    module_id: moduleId || null,
    source_type: source,
    metric_key: metricKey,
    metric_value: metricValue,
    dimension: { source, module: aggregated?.module || source },
    raw_payload: aggregated || {},
    occurred_at: new Date().toISOString(),
  }));
}

function mergeMetricMaps(results = []) {
  return results.reduce((acc, result) => {
    for (const [key, value] of Object.entries(flattenMetrics(result.data))) {
      acc[key] = toNumber(acc[key]) + toNumber(value);
    }
    return acc;
  }, {});
}

function metricSeriesFromSnapshots(snapshots = [], metric) {
  return snapshots
    .filter((row) => row.metric_key === metric)
    .map((row) => ({
      date: String(row.occurred_at || row.created_at).slice(0, 10),
      value: toNumber(row.metric_value),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  flattenMetrics,
  mergeMetricMaps,
  metricSeriesFromSnapshots,
  normalizeSnapshot,
  resolveAggregatorModule,
  toNumber,
};
