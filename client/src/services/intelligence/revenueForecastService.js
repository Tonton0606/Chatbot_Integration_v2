import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

async function apiFetch(path, options = {}) {
  const headers = { ...(await authHeaders()), ...options.headers };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

export async function getRevenueForecastDashboard() {
  const runRes = await apiFetch("/intelligence/run", {
    method: "POST",
    body: JSON.stringify({ module: "revenue_forecast", days: 30 }),
  });

  const data = runRes.data || {};
  const forecast = data.forecast || data.predictions || {};

  const forecastScenarios = data.scenarios || [
    {
      id: "best",
      label: "Best Case",
      amount: forecast.best || "—",
      probability: forecast.best_probability ?? 25,
      confidence: forecast.best_confidence ?? 72,
      color: "#27ae60",
      drivers: forecast.best_drivers || [],
    },
    {
      id: "expected",
      label: "Expected Case",
      amount: forecast.expected || "—",
      probability: forecast.expected_probability ?? 60,
      confidence: forecast.confidence ?? 88,
      color: "#4a90d9",
      drivers: forecast.drivers || [],
    },
    {
      id: "worst",
      label: "Worst Case",
      amount: forecast.worst || "—",
      probability: forecast.worst_probability ?? 15,
      confidence: forecast.worst_confidence ?? 65,
      color: "#e74c3c",
      drivers: forecast.worst_drivers || [],
    },
  ];

  const pipelineContribution = (data.pipeline || data.deals || []).map((deal, i) => ({
    deal: deal.deal || deal.name || deal.title || `Deal ${i + 1}`,
    owner: deal.owner || deal.assigned_to || "",
    stage: deal.stage || deal.status || "Qualified",
    value: deal.value || deal.amount || 0,
    probability: deal.probability ?? 50,
    close: deal.close_date || deal.expected_close || "",
    weighted: deal.weighted_value || Math.round((deal.value || 0) * ((deal.probability || 50) / 100)),
  }));

  const revenueTrend = data.revenue_trend || data.trend || [];

  // Numeric base for the what-if scenario planner — the expected-case forecast
  // from the decision engine (0 when the workspace has no pipeline/finance data).
  const baseForecast = Number(forecast.expected) || 0;

  // AI-generated forecast insights from the run (title + content + severity).
  const aiInsights = Array.isArray(data.insights) ? data.insights : [];

  // Pull live finance KPIs
  const financeRes = await apiFetch("/intelligence/run", {
    method: "POST",
    body: JSON.stringify({ module: "finance", days: 30 }),
  }).catch(() => ({ data: {} }));

  const fin = financeRes.data?.metrics || {};
  const liveKpis = [
    { label: "Current Revenue", value: fin.total_revenue ? `₱${Number(fin.total_revenue).toLocaleString()}` : null, color: "var(--brand-cyan)" },
    { label: "Forecasted (Best Case)", value: forecast.best ? `₱${Number(forecast.best).toLocaleString()}` : null, color: "var(--success)" },
    { label: "Forecast Accuracy", value: forecast.accuracy ? `${forecast.accuracy}%` : null, color: "var(--brand-cyan)" },
    { label: "Pipeline Value", value: fin.pipeline_value ? `₱${Number(fin.pipeline_value).toLocaleString()}` : null, color: "var(--brand-gold)" },
    { label: "Collection Rate", value: fin.collection_rate ? `${fin.collection_rate}%` : null, color: "#9b59b6" },
    { label: "Revenue vs Target", value: fin.total_invoiced && fin.total_revenue ? `${Math.round((fin.total_revenue / fin.total_invoiced) * 100)}%` : null, color: "var(--success)" },
  ].filter((k) => k.value !== null);

  return { forecastScenarios, pipelineContribution, revenueTrend, liveKpis, baseForecast, aiInsights };
}
