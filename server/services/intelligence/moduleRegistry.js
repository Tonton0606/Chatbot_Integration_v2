const DEFAULT_VISUALS = [
  { id: "revenue", type: "kpi", metric: "revenue", title: "Revenue" },
  { id: "leads", type: "kpi", metric: "new_leads", title: "New Leads" },
  { id: "trend", type: "chart", chart: "line", metric: "revenue", title: "Revenue Trend" },
  { id: "insights", type: "insights", title: "Decision Brief" },
  { id: "predictions", type: "predictions", title: "Forecasts" },
  { id: "automations", type: "automations", title: "Automation Guardrails" },
];

const DEFAULT_MODULE_CONFIGS = {
  executive_decision_engine: {
    name: "Executive Decision Engine",
    slug: "executive_decision_engine",
    description: "Cross-functional ERP intelligence with live KPIs, insights, forecasts, and governed actions.",
    config: {
      refresh_seconds: 45,
      sources: ["crm", "marketing", "finance", "sales"],
      metrics: ["revenue", "pipeline_value", "new_leads", "conversion_rate", "collection_rate", "overdue_amount"],
      filters: ["date_range", "workspace", "source"],
      visuals: DEFAULT_VISUALS,
      predictions: [
        { metric: "revenue", horizon_days: 30 },
        { metric: "new_leads", horizon_days: 30 },
        { metric: "conversion_rate", horizon_days: 30 },
      ],
      automations: [
        {
          name: "Revenue Risk Alert",
          rule: { if: "revenue < 1", metric: "revenue", operator: "<", value: 1 },
          actions: [{ type: "send_alert", severity: "warning", message: "Revenue is below the configured threshold." }],
        },
      ],
    },
  },
};

function normalizeModuleConfig(module = {}) {
  const config = module.config || {};
  return {
    id: module.id || null,
    name: module.name || config.name || "Untitled Intelligence Module",
    slug: module.slug || config.slug || "custom_intelligence_module",
    description: module.description || config.description || "",
    status: module.status || "active",
    config: {
      refresh_seconds: Number(config.refresh_seconds || 60),
      sources: Array.isArray(config.sources) ? config.sources : ["crm", "marketing", "finance"],
      metrics: Array.isArray(config.metrics) ? config.metrics : [],
      filters: Array.isArray(config.filters) ? config.filters : ["date_range", "workspace", "source"],
      visuals: Array.isArray(config.visuals) ? config.visuals : DEFAULT_VISUALS,
      predictions: Array.isArray(config.predictions) ? config.predictions : [],
      automations: Array.isArray(config.automations) ? config.automations : [],
      thresholds: config.thresholds || {},
      layout: config.layout || {},
    },
  };
}

function getDefaultModule(slug = "executive_decision_engine") {
  return normalizeModuleConfig(DEFAULT_MODULE_CONFIGS[slug] || DEFAULT_MODULE_CONFIGS.executive_decision_engine);
}

module.exports = {
  DEFAULT_MODULE_CONFIGS,
  DEFAULT_VISUALS,
  getDefaultModule,
  normalizeModuleConfig,
};
