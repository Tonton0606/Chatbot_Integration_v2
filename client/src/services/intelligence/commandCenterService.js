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

export async function getCommandCenterData() {
  const [execRes, alertsRes, loopRes] = await Promise.allSettled([
    apiFetch("/intelligence/run", { method: "POST", body: JSON.stringify({ module: "executive", days: 30 }) }),
    apiFetch("/intelligence/insights?limit=10"),
    apiFetch("/intelligence/loop/status"),
  ]);

  const exec = execRes.status === "fulfilled" ? (execRes.value.data || {}) : {};
  const rawAlerts = alertsRes.status === "fulfilled" ? (alertsRes.value.data || []) : [];
  const loopStatus = loopRes.status === "fulfilled" ? (loopRes.value.data || {}) : {};

  const crm = exec.crm || {};
  const finance = exec.finance || {};
  const hr = exec.hr || {};
  const marketing = exec.marketing || {};

  const commandKpis = [
    { id: "rev", label: "Monthly Revenue", value: finance.total_revenue || 0, format: "currency", trend: "+12%", color: "var(--brand-cyan)", icon: "💰" },
    { id: "deals", label: "Deals Won", value: crm.won_deals || 0, format: "number", trend: "+8%", color: "var(--success)", icon: "🤝" },
    { id: "leads", label: "New Leads", value: marketing.new_leads || 0, format: "number", trend: "+22%", color: "var(--brand-gold)", icon: "🎯" },
    { id: "team", label: "Active Team", value: hr.active_employees || 0, format: "number", trend: "0%", color: "var(--brand-cyan)", icon: "👥" },
    { id: "pipeline", label: "Pipeline Value", value: crm.pipeline_value || 0, format: "currency", trend: "+5%", color: "#9b59b6", icon: "📊" },
    { id: "attendance", label: "Attendance Rate", value: hr.attendance_rate || 0, format: "percent", trend: "-1%", color: "var(--success)", icon: "✅" },
    { id: "collection", label: "Collection Rate", value: finance.collection_rate || 0, format: "percent", trend: "+3%", color: "var(--brand-gold)", icon: "💳" },
    { id: "tasks", label: "Tasks Completed", value: hr.completed_tasks || 0, format: "number", trend: "+15%", color: "var(--success)", icon: "☑️" },
  ];

  const criticalAlerts = rawAlerts
    .filter((a) => a.severity === "critical" || a.severity === "warning")
    .slice(0, 5)
    .map((a, i) => ({
      id: a.id || `a${i}`,
      title: a.title || "Alert",
      severity: a.severity || "warning",
      module: a.module || "Intelligence",
      action: a.action || "",
    }));

  const departmentHealth = [
    { dept: "Sales / CRM", score: crm.conversion_rate || 65, status: (crm.conversion_rate || 65) > 50 ? "healthy" : "warning" },
    { dept: "Finance", score: finance.collection_rate || 72, status: (finance.collection_rate || 72) > 60 ? "healthy" : "warning" },
    { dept: "HR", score: hr.attendance_rate || 88, status: (hr.attendance_rate || 88) > 80 ? "healthy" : "warning" },
    { dept: "Marketing", score: marketing.lead_conversion_rate || 45, status: (marketing.lead_conversion_rate || 45) > 30 ? "healthy" : "warning" },
  ];

  const loopState = {
    running: loopStatus.state === "running",
    state: loopStatus.state || "idle",
    lastRun: loopStatus.last_run_at,
    decisions: loopStatus.total_decisions || 0,
    actions: loopStatus.total_actions || 0,
  };

  return { commandKpis, criticalAlerts, departmentHealth, loopState, exec };
}

export async function generateBoardReport() {
  return apiFetch("/intelligence/reports/generate", {
    method: "POST",
    body: JSON.stringify({
      name: `Board Report — ${new Date().toLocaleDateString()}`,
      type: "executive",
      period: 30,
      includeAI: true,
    }),
  });
}

export async function exportCommandSnapshot(format = "json") {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/intelligence/export`, {
    method: "POST",
    headers,
    body: JSON.stringify({ format, modules: ["crm", "finance", "hr", "marketing"], scope: "Executive Overview" }),
  });
  if (!res.ok) throw new Error("Export failed");
  if (format === "csv") {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executive_snapshot_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return { done: true };
  }
  return res.json();
}
