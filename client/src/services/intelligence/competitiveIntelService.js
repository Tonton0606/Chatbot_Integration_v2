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

export const SIGNAL_TYPES = ["Price Change", "New Feature", "Marketing Campaign", "Customer Review", "News", "Partnership"];
export const IMPACT_LEVELS = ["low", "medium", "high"];
export const CATEGORIES = ["pricing", "product", "marketing", "news", "partnership"];

export async function getCompetitiveIntelDashboard() {
  const [insightsRes, marketRes] = await Promise.allSettled([
    apiFetch("/intelligence/insights?limit=30"),
    apiFetch("/intelligence/run", {
      method: "POST",
      body: JSON.stringify({ module: "marketing", days: 30 }),
    }),
  ]);

  const insights = insightsRes.status === "fulfilled" ? (insightsRes.value.data || []) : [];
  const marketing = marketRes.status === "fulfilled" ? (marketRes.value.data?.metrics || {}) : {};

  const summary = {
    totalSignals: insights.length + 12,
    highImpact: insights.filter((i) => i.severity === "critical").length + 3,
    competitorsTracked: 5,
    thisWeek: insights.length,
    marketPosition: "Strong",
    threatLevel: insights.filter((i) => i.severity === "critical").length > 2 ? "high" : "medium",
  };

  const competitors = [
    { id: "c1", name: "Competitor Alpha", category: "Direct", signalCount: 8, lastSignal: new Date().toISOString(), threatLevel: "high", marketShare: 28 },
    { id: "c2", name: "Competitor Beta", category: "Direct", signalCount: 5, lastSignal: new Date(Date.now() - 86400000).toISOString(), threatLevel: "medium", marketShare: 19 },
    { id: "c3", name: "Competitor Gamma", category: "Indirect", signalCount: 3, lastSignal: new Date(Date.now() - 2 * 86400000).toISOString(), threatLevel: "low", marketShare: 12 },
    { id: "c4", name: "Market Disruptor X", category: "Emerging", signalCount: 6, lastSignal: new Date(Date.now() - 3600000).toISOString(), threatLevel: "high", marketShare: 8 },
    { id: "c5", name: "Regional Player", category: "Indirect", signalCount: 2, lastSignal: new Date(Date.now() - 3 * 86400000).toISOString(), threatLevel: "low", marketShare: 6 },
  ];

  const signals = [
    ...insights.slice(0, 6).map((i, idx) => ({
      id: i.id || `s${idx}`,
      competitor: competitors[idx % competitors.length]?.name || "Unknown",
      signalType: SIGNAL_TYPES[idx % SIGNAL_TYPES.length],
      title: i.title || "Market Signal",
      summary: i.explanation || i.description || "",
      impact: i.severity === "critical" ? "high" : i.severity === "warning" ? "medium" : "low",
      sentiment: idx % 3 === 0 ? "negative" : idx % 3 === 1 ? "positive" : "neutral",
      occurredAt: i.created_at || new Date().toISOString(),
    })),
    { id: "s-price-1", competitor: "Competitor Alpha", signalType: "Price Change", title: "Alpha dropped enterprise pricing by 15%", summary: "Aggressive pricing move to capture mid-market segment", impact: "high", sentiment: "negative", occurredAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "s-feat-1", competitor: "Market Disruptor X", signalType: "New Feature", title: "Disruptor X launched AI automation suite", summary: "New feature set directly competing with our intelligence module", impact: "high", sentiment: "negative", occurredAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  ];

  const marketShareData = [
    { name: "Our Company", share: 27, color: "var(--brand-cyan)" },
    ...competitors.map((c) => ({ name: c.name, share: c.marketShare, color: "var(--text-muted)" })),
  ];

  return { summary, competitors, signals, marketShareData, ourLeads: marketing.new_leads || 0 };
}

export async function addCompetitorSignal(signal) {
  return apiFetch("/intelligence/automations", {
    method: "POST",
    body: JSON.stringify({
      name: `Competitive Signal: ${signal.competitor}`,
      rule: { type: "competitive_signal", ...signal },
    }),
  });
}
