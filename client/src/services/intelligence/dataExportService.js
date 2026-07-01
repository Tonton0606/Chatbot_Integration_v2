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

export async function getDataExportDashboard() {
  const [reportsRes, scheduledRes] = await Promise.allSettled([
    apiFetch("/intelligence/reports?limit=20"),
    apiFetch("/intelligence/reports/scheduled"),
  ]);

  const rawReports = reportsRes.status === "fulfilled"
    ? (reportsRes.value.data || reportsRes.value.reports || [])
    : [];

  const rawScheduled = scheduledRes.status === "fulfilled"
    ? (scheduledRes.value.data || scheduledRes.value.scheduled || [])
    : [];

  const exportHistory = rawReports.map((r, i) => ({
    id: r.id || `ex${i}`,
    name: r.name || r.title || `Report ${i + 1}`,
    type: r.format || "PDF",
    generatedBy: r.generated_by || r.created_by || "System",
    date: r.created_at || r.generated_at || new Date().toISOString(),
    size: r.size || "—",
    status: r.status || "ready",
    downloadUrl: r.download_url || null,
  }));

  const scheduledExports = rawScheduled.map((s, i) => ({
    id: s.id || `se${i}`,
    name: s.name || `Scheduled Export ${i + 1}`,
    frequency: s.frequency || s.cron_label || "Weekly",
    format: s.format || "PDF",
    destination: s.destination || s.delivery_method || "Email",
    lastRun: s.last_run_at || s.last_run || null,
    nextRun: s.next_run_at || s.next_run || null,
    status: s.status || "active",
  }));

  return { exportHistory, scheduledExports };
}

export async function downloadExportFile(reportId, format = "pdf") {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/intelligence/reports/${reportId}/export?format=${format}`, { headers });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export async function runExport({ format, modules, scope, dateRange, includeAI }) {
  const headers = await authHeaders();

  if (format === "CSV") {
    const res = await fetch(`${BASE}/intelligence/export`, {
      method: "POST",
      headers,
      body: JSON.stringify({ format: "csv", modules: modules.map((m) => m.toLowerCase()), scope, dateRange, includeAI }),
    });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligence_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return { done: true };
  }

  const res = await fetch(`${BASE}/intelligence/export`, {
    method: "POST",
    headers,
    body: JSON.stringify({ format: format.toLowerCase(), modules: modules.map((m) => m.toLowerCase()), scope, dateRange, includeAI }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Export failed");

  if (format === "JSON") {
    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligence_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return json;
}

export async function scheduleExport({ name, format, modules, frequency, destination }) {
  return apiFetch("/intelligence/reports", {
    method: "POST",
    body: JSON.stringify({
      name: name || `Scheduled ${format} Export`,
      type: "scheduled_export",
      format,
      config: { modules, frequency, destination },
      status: "active",
    }),
  });
}
