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

export async function getKpiBuilderDashboard() {
  const [modulesRes, sourcesRes] = await Promise.allSettled([
    apiFetch("/intelligence/modules"),
    apiFetch("/intelligence/data-sources"),
  ]);

  const modules = modulesRes.status === "fulfilled" ? (modulesRes.value.data || []) : [];
  const sources = sourcesRes.status === "fulfilled" ? (sourcesRes.value.data || []) : [];

  const kpiWidgets = modules.map((m, i) => ({
    id: m.id || `w${i}`,
    title: m.name || m.slug || `Module ${i + 1}`,
    type: m.widget_type || "kpi",
    metric: m.metric || m.kpi || m.name || "",
    value: m.current_value || m.value || "—",
    trend: m.trend || "0%",
    color: m.color || ["#27ae60", "#4a90d9", "#c9a84c", "#9b59b6", "#e74c3c", "#1abc9c"][i % 6],
    x: (i % 3) * 2,
    y: Math.floor(i / 3),
    w: 2,
    h: 1,
  }));

  const savedDashboards = sources.map((s, i) => ({
    id: s.id || `sd${i}`,
    name: s.name || `Data Source ${i + 1}`,
    widgets: s.widget_count || 0,
    lastModified: s.updated_at || s.created_at || new Date().toISOString(),
    owner: s.created_by || "System",
    shared: s.shared ?? false,
  }));

  // Also load saved KPI dashboards
  const dashRes = await apiFetch("/intelligence/kpi-dashboards").catch(() => ({ data: [] }));
  const kpiDashboards = (dashRes.data || []).map((d) => ({
    id: d.id,
    name: d.name,
    widgets: d.config?.widgets || [],
    lastModified: d.updated_at || d.created_at,
    owner: d.created_by || "System",
    shared: false,
  }));

  const mergedDashboards = kpiDashboards.length ? kpiDashboards : savedDashboards;
  return { kpiWidgets, savedDashboards: mergedDashboards };
}

export async function saveKpiDashboard(name, widgets, existingId = null) {
  if (existingId) {
    return apiFetch(`/intelligence/kpi-dashboards/${existingId}`, {
      method: "PUT",
      body: JSON.stringify({ name, widgets }),
    });
  }
  return apiFetch("/intelligence/kpi-dashboards", {
    method: "POST",
    body: JSON.stringify({ name, widgets }),
  });
}

