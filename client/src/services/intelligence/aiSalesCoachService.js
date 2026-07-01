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

export const DEAL_STAGES = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
export const COACHING_PRIORITIES = ["critical", "high", "medium", "low"];
export const COACHING_TYPES = ["stuck_deal", "win_probability_drop", "follow_up_due", "upsell_opportunity", "churn_risk_account"];

export async function getSalesCoachDashboard(repId) {
  const json = await apiFetch("/intelligence/ph/sales-coach" + (repId ? "?rep_id=" + repId : ""));
  return json.data || [];
}

export async function runSalesAnalysis() {
  const json = await apiFetch("/intelligence/ph/sales-coach/analyze", { method: "POST" });
  return json.data;
}

export async function dismissCoachInsight(id) {
  return Promise.resolve(true);
}

export function getWinProbability(stage) {
  const map = {
    prospect: 15,
    qualified: 30,
    proposal: 45,
    negotiation: 70,
    closed_won: 100,
    closed_lost: 0,
  };
  return map[stage] !== undefined ? map[stage] : 20;
}
