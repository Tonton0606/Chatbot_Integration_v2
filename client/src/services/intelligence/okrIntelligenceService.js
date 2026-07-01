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

export const OKR_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
export const OKR_DEPARTMENTS = ["Company", "Sales", "Finance", "Operations", "HR", "Technology", "Marketing", "Social Media"];
export const OKR_STATUSES = ["on_track", "at_risk", "off_track", "completed"];
export const KR_METRIC_KEYS = ["total_revenue", "net_profit_margin", "customer_count", "churn_rate", "employee_satisfaction", "gross_margin", "collection_rate", "nps_score"];

export async function getOKRDashboard(quarter) {
  const json = await apiFetch(`/intelligence/ph/okr?quarter=${quarter || ""}`);
  return json.data || [];
}

export async function createObjective(obj) {
  const json = await apiFetch("/intelligence/ph/okr", {
    method: "POST",
    body: JSON.stringify({
      title: obj.title,
      department: obj.department,
      owner_name: obj.owner_name,
      quarter: obj.quarter,
    }),
  });
  return json.data;
}

export async function updateObjective(id, patch) {
  const json = await apiFetch(`/intelligence/ph/okr/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return json.data;
}

export async function deleteObjective(id) {
  const json = await apiFetch(`/intelligence/ph/okr/${id}`, { method: "DELETE" });
  return json.data;
}

export async function addKeyResult(objectiveId, kr) {
  const json = await apiFetch(`/intelligence/ph/okr/${objectiveId}/key-results`, {
    method: "POST",
    body: JSON.stringify({
      title: kr.title,
      metric_key: kr.metric_key,
      target_value: kr.target_value,
      current_value: kr.current_value,
      unit: kr.unit,
    }),
  });
  return json.data;
}

export async function updateKeyResult(krId, patch) {
  const json = await apiFetch(`/intelligence/ph/okr/kr/${krId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return json.data;
}

export async function syncOKRMetrics() {
  const json = await apiFetch("/intelligence/ph/okr/sync", { method: "POST" });
  return json.data;
}

export function computeProgress(currentValue, targetValue) {
  if (targetValue === 0) return 0;
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
}

export function getStatusColor(status) {
  const map = {
    on_track: "#27ae60",
    at_risk: "#f39c12",
    off_track: "#e74c3c",
    completed: "#4a90d9",
  };
  return map[status] || "#999";
}
