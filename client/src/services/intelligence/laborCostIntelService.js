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

export const PH_STATUTORY = {
  sss_employer_rate: 0.095,
  philhealth_employer_rate: 0.025,
  pagibig_employer: 100,
  min_wage_ncr: 610,
  min_wage_regional: 500,
};

export const DEPARTMENTS = ["Operations", "Sales", "Finance", "HR", "IT", "Marketing", "Logistics", "Customer Service"];

export async function getLaborCostDashboard(periodMonth) {
  const json = await apiFetch(`/intelligence/ph/labor?period_month=${periodMonth || ""}`);
  return json.data || [];
}

export async function computeLaborCosts(periodMonth) {
  const json = await apiFetch("/intelligence/ph/labor/compute", {
    method: "POST",
    body: JSON.stringify({ period_month: periodMonth }),
  });
  return json.data;
}

export async function getLaborBreakdown(periodMonth) {
  const data = await computeLaborCosts(periodMonth);
  return data;
}
