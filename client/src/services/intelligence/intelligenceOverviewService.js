import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const INTEL_PERIODS = ["Today", "This Week", "This Month", "This Quarter", "This Year"];
export const INTEL_WORKSPACES = ["All Workspaces", "Executive", "CRM", "Marketing", "HR", "Finance", "Operations", "Inventory"];

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

export async function getIntelligenceOverviewDashboard() {
  const [modulesRes, runRes, insightsRes, reportsRes] = await Promise.allSettled([
    apiFetch("/intelligence/modules"),
    apiFetch("/intelligence/run", {
      method: "POST",
      body: JSON.stringify({ module: "executive_overview", days: 30 }),
    }),
    apiFetch("/intelligence/insights?limit=10"),
    apiFetch("/intelligence/reports?limit=6"),
  ]);

  const modules = modulesRes.status === "fulfilled" ? (modulesRes.value.data || []) : [];
  const runData = runRes.status === "fulfilled" ? (runRes.value.data || {}) : {};
  const rawInsights = insightsRes.status === "fulfilled" ? (insightsRes.value.data || []) : [];
  const rawReports = reportsRes.status === "fulfilled" ? (reportsRes.value.data || reportsRes.value.reports || []) : [];

  const forecast = runData.forecast || runData.predictions || {};
  const metrics = runData.metrics || runData.kpis || {};

  const overviewKpis = [
    { id: "rev", label: "Total Revenue", value: metrics.total_revenue || "—", change: metrics.revenue_change || "0%", positive: true, sub: "vs last quarter", icon: "peso" },
    { id: "frev", label: "Forecasted Revenue", value: metrics.forecasted_revenue || forecast.expected || "—", change: metrics.forecast_change || "+0%", positive: true, sub: "Q3 2026 projection", icon: "forecast" },
    { id: "pred", label: "Active Predictions", value: String(runData.prediction_count || rawInsights.length || 0), change: "+0", positive: true, sub: "across modules", icon: "brain" },
    { id: "alerts", label: "Critical Alerts", value: String(rawInsights.filter(i => i.severity === "critical").length || 0), change: "0", positive: false, sub: "requires attention", icon: "alert" },
    { id: "reports", label: "Report Runs", value: String(rawReports.length || 0), change: "+0", positive: true, sub: "this month", icon: "report" },
    { id: "sources", label: "Data Sources", value: String(modules.length || 0), change: "0", positive: true, sub: "modules active", icon: "source" },
  ];

  const forecastScenarios = runData.scenarios || [
    { id: "best", label: "Best Case", amount: forecast.best || "—", probability: 25, confidence: 72, color: "#27ae60", drivers: [] },
    { id: "expected", label: "Expected Case", amount: forecast.expected || "—", probability: 60, confidence: 88, color: "#4a90d9", drivers: [] },
    { id: "worst", label: "Worst Case", amount: forecast.worst || "—", probability: 15, confidence: 65, color: "#e74c3c", drivers: [] },
  ];

  const departmentHealth = modules.map((m, i) => ({
    id: m.id || `mod${i}`,
    label: m.name || m.slug || "Module",
    score: m.health_score || m.score || 75,
    trend: m.trend || "0%",
    risk: m.risk || "low",
    status: m.status || "healthy",
  }));

  const activeAlerts = rawInsights
    .filter(i => i.severity === "critical" || i.severity === "warning")
    .slice(0, 5)
    .map((item, i) => ({
      id: item.id || `a${i}`,
      title: item.title || "Alert",
      module: item.module || "Intelligence",
      severity: item.severity || "info",
      detected: item.created_at || new Date().toISOString(),
      status: item.status || "active",
      impact: item.impact || "Medium",
      action: item.action || item.recommendation || "",
      detail: item.explanation || item.description || "",
    }));

  const recentReports = rawReports.slice(0, 6).map((r, i) => ({
    id: r.id || `r${i}`,
    name: r.name || r.title || "Report",
    module: r.module || r.category || "Intelligence",
    generated: r.created_at || r.generated_at || new Date().toISOString(),
    format: r.format || "PDF",
    status: r.status || "ready",
    generatedBy: r.generated_by || r.created_by || "System",
    size: r.size || "—",
  }));

  const revenueTrend = runData.revenue_trend || runData.trend || [];

  return { overviewKpis, forecastScenarios, departmentHealth, activeAlerts, recentReports, revenueTrend };
}
