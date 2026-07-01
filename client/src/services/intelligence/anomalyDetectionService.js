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

export const ANOMALY_TYPES = ["round_number", "spike", "duplicate", "unusual_hours", "off_hours_access", "threshold_breach", "pattern_deviation"];
export const ANOMALY_SEVERITIES = ["low", "medium", "high", "critical"];
export const ANOMALY_MODULES = ["finance", "hr", "crm", "inventory", "payroll", "procurement"];

export async function getAnomalyDashboard(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.module) params.set("module", filters.module);
  if (filters.severity) params.set("severity", filters.severity);
  const query = params.toString() ? "?" + params.toString() : "";
  const json = await apiFetch("/intelligence/ph/anomalies" + query);
  return json.data || [];
}

export async function runAnomalyScan() {
  const json = await apiFetch("/intelligence/ph/anomalies/scan", { method: "POST" });
  return json.data;
}

export async function reviewAnomaly(id, status, notes) {
  const json = await apiFetch(`/intelligence/ph/anomalies/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status, review_notes: notes }),
  });
  return json.data;
}

export async function dismissAnomaly(id) {
  return reviewAnomaly(id, "dismissed", "Dismissed by user");
}

export async function escalateAnomaly(id, notes) {
  return reviewAnomaly(id, "escalated", notes);
}
