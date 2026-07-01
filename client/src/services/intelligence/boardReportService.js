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

export const REPORT_PERIODS = ["Monthly", "Quarterly", "Semi-Annual", "Annual"];
export const BOARD_REPORT_SECTIONS = [
  "executive_summary", "financial_performance", "sales_pipeline", "operational_kpis",
  "risk_flags", "compliance_status", "strategic_recommendations"
];

export async function getBoardReports() {
  const json = await apiFetch("/intelligence/ph/board-reports");
  return json.data || [];
}

export async function generateBoardReport(options = {}) {
  const json = await apiFetch("/intelligence/ph/board-reports/generate", {
    method: "POST",
    body: JSON.stringify({
      period: options.period || "Monthly",
      sections: options.sections || BOARD_REPORT_SECTIONS,
      include_benchmarks: options.includeBenchmarks !== false,
    }),
  });
  return json.data;
}

export async function getBoardReport(id) {
  const json = await apiFetch(`/intelligence/ph/board-reports/${id}`);
  return json.data;
}

export async function exportBoardReport(report, format = "pdf") {
  if (format === "json") {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-report-${report.id || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === "csv") {
    const kpis = report.kpis || [];
    const headers = Object.keys(kpis[0] || {}).join(",");
    const rows = kpis.map(kpi => Object.values(kpi).join(",")).join("\n");
    const csv = headers + "\n" + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-report-${report.id || Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return Promise.resolve(true);
}
