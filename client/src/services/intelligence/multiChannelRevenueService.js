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

export const CHANNELS = ["lazada", "shopee", "tiktok_shop", "facebook_shop", "pos", "direct", "website", "grab_mart", "foodpanda"];
export const CHANNEL_LABELS = {
  lazada: "Lazada",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  facebook_shop: "Facebook Shop",
  pos: "POS / In-Store",
  direct: "Direct Sales",
  website: "Website",
  grab_mart: "GrabMart",
  foodpanda: "FoodPanda",
};

export async function getMultiChannelDashboard(days = 30) {
  const [data1, data2] = await Promise.all([
    apiFetch(`/intelligence/ph/channels?days=${days}`),
    apiFetch(`/intelligence/ph/channels/summary?days=${days}`),
  ]);
  return { entries: data1.data || [], summary: data2.data || {} };
}

export async function addChannelEntry(entry) {
  const json = await apiFetch("/intelligence/ph/channels", {
    method: "POST",
    body: JSON.stringify({
      channel: entry.channel,
      gross_revenue: entry.gross_revenue,
      net_revenue: entry.net_revenue,
      orders: entry.orders,
      roas: entry.roas,
      period_date: entry.period_date,
    }),
  });
  return json.data;
}

export async function getChannelSummary(days = 30) {
  const json = await apiFetch(`/intelligence/ph/channels/summary?days=${days}`);
  return json.data;
}
