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

function severityFromLevel(level = "") {
  const l = String(level).toLowerCase();
  if (l === "critical" || l === "error") return "critical";
  if (l === "warning" || l === "warn") return "warning";
  if (l === "info" || l === "notice") return "info";
  return "info";
}

export async function getAlertsMonitoringDashboard() {
  const [insightsRes, runRes] = await Promise.allSettled([
    apiFetch("/intelligence/insights?limit=50"),
    apiFetch("/intelligence/run", {
      method: "POST",
      body: JSON.stringify({ module: "alerts", days: 7 }),
    }),
  ]);

  const rawInsights = insightsRes.status === "fulfilled" ? (insightsRes.value.data || []) : [];
  const runData = runRes.status === "fulfilled" ? (runRes.value.data || {}) : {};

  const allItems = [
    ...rawInsights,
    ...(runData.insights || []),
    ...(runData.alerts || []),
  ];

  const seen = new Set();
  const activeAlerts = allItems
    .filter(item => {
      const key = item.id || item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, i) => ({
      id: item.id || `a${i}`,
      title: item.title || item.name || "Alert",
      module: item.module || item.category || "Intelligence",
      severity: severityFromLevel(item.severity || item.level),
      detected: item.detected_at || item.created_at || item.detected || new Date().toISOString(),
      status: item.status || "active",
      impact: item.impact || "Medium",
      action: item.action || item.recommendation || "",
      detail: item.detail || item.explanation || item.description || "",
    }));

  const monitoringRules = (runData.rules || runData.automations || []).map((r, i) => ({
    id: r.id || `mr${i}`,
    name: r.name || "Monitor Rule",
    module: r.module || r.category || "Intelligence",
    condition: r.condition || r.rule || r.description || "",
    status: r.status || "active",
    triggers: r.trigger_count || r.triggers || 0,
  }));

  // Also pull saved alert rules from DB
  const rulesRes = await apiFetch("/intelligence/alert-rules").catch(() => ({ data: [] }));
  const dbRules = (rulesRes.data || []).map((r, i) => ({
    id: r.id || `mr${i}`,
    name: r.name || "Monitor Rule",
    module: r.module || "Intelligence",
    condition: r.condition || "",
    status: r.status || "active",
    triggers: r.triggers || 0,
  }));

  return { activeAlerts, monitoringRules: dbRules.length ? dbRules : monitoringRules };
}

export async function createAlertRule(rule) {
  return apiFetch("/intelligence/alert-rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateAlertRule(id, patch) {
  return apiFetch(`/intelligence/alert-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteAlertRule(id) {
  return apiFetch(`/intelligence/alert-rules/${id}`, { method: "DELETE" });
}

export async function getAlertTimeline(limit = 20) {
  try {
    const data = await apiFetch(`/intelligence/insights/timeline?limit=${limit}`);
    return (data.data || []).map((r) => ({
      time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title: r.title || "Alert",
      action: r.status === "active" ? "Detected" : r.status === "reviewed" ? "Reviewed" : "Updated",
      user: "System",
      color: r.severity === "critical" ? "var(--danger)" : r.severity === "warning" ? "#f5a623" : "var(--brand-cyan)",
    }));
  } catch {
    return [];
  }
}
