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

export const PH_INDUSTRIES = [
  "Retail", "Food & Beverage", "Technology", "Manufacturing",
  "Real Estate", "Logistics", "Healthcare", "Education",
  "Financial Services", "Professional Services"
];
export const BENCHMARK_SEGMENTS = ["SMB", "Enterprise"];
export const BENCHMARK_METRICS = [
  { key: "gross_margin_pct", label: "Gross Margin %", unit: "%" },
  { key: "net_margin_pct", label: "Net Margin %", unit: "%" },
  { key: "revenue_growth_pct", label: "Revenue Growth %", unit: "%" },
  { key: "operating_expense_ratio", label: "OpEx Ratio", unit: "%" },
  { key: "employee_productivity", label: "Revenue per Employee", unit: "₱" },
  { key: "customer_acquisition_cost", label: "CAC", unit: "₱" },
  { key: "inventory_turnover", label: "Inventory Turnover", unit: "x" },
  { key: "accounts_receivable_days", label: "AR Days", unit: "days" },
];

export async function getIndustryBenchmarks(industry, segment) {
  const params = new URLSearchParams();
  if (industry) params.set("industry", industry);
  if (segment) params.set("segment", segment);
  const query = params.toString() ? "?" + params.toString() : "";
  const json = await apiFetch("/intelligence/ph/benchmarks" + query);
  return json.data || [];
}

export async function getBenchmarkComparison(industry, segment) {
  const json = await apiFetch(`/intelligence/ph/benchmarks/compare?industry=${industry}&segment=${segment}`);
  return json.data || [];
}

export async function getAllBenchmarks() {
  const json = await apiFetch("/intelligence/ph/benchmarks");
  return json.data || [];
}
