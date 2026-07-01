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

export const RISK_LEVELS = ["low", "medium", "high", "critical"];
export const SUPPLIER_CATEGORIES = ["raw_materials", "packaging", "logistics", "technology", "services", "equipment", "food_ingredients", "utilities"];
export const RISK_FACTORS = ["payment_terms", "delivery_reliability", "quality_consistency", "single_source_dependency", "financial_stability", "compliance", "geo_risk"];

export async function getSupplierRiskDashboard() {
  const json = await apiFetch("/intelligence/ph/suppliers");
  return json.data || [];
}

export async function addSupplier(supplier) {
  const json = await apiFetch("/intelligence/ph/suppliers", {
    method: "POST",
    body: JSON.stringify({
      supplier_name: supplier.supplier_name,
      category: supplier.category,
      contact_name: supplier.contact_name,
      contact_email: supplier.contact_email,
      risk_level: supplier.risk_level,
      on_time_delivery_rate: supplier.on_time_delivery_rate,
      quality_score: supplier.quality_score,
      price_stability_score: supplier.price_stability_score,
      risk_factors: supplier.risk_factors,
      notes: supplier.notes,
    }),
  });
  return json.data;
}

export async function updateSupplier(id, patch) {
  const json = await apiFetch(`/intelligence/ph/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return json.data;
}

export async function deleteSupplier(id) {
  const json = await apiFetch(`/intelligence/ph/suppliers/${id}`, {
    method: "DELETE",
  });
  return json.data;
}

export function computeRiskScore(supplier) {
  const delivery = (supplier.on_time_delivery_rate / 100) * 40;
  const quality = (supplier.quality_score / 10) * 35;
  const priceStability = (supplier.price_stability_score / 10) * 25;
  return delivery + quality + priceStability;
}
