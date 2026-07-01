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

function normalizeInsight(insight, i) {
  return {
    id: insight.id || `i${i}`,
    title: insight.title || insight.name || "AI Insight",
    module: insight.module || insight.category || "Intelligence",
    severity: insight.severity || insight.level || "info",
    explanation: insight.explanation || insight.description || insight.summary || "",
    action: insight.action || insight.recommendation || "",
    confidence: insight.confidence ?? insight.score ?? 80,
    metric: insight.metric || insight.kpi || "",
    causes: Array.isArray(insight.causes) ? insight.causes : (Array.isArray(insight.factors) ? insight.factors : []),
    affected: Array.isArray(insight.affected) ? insight.affected : (Array.isArray(insight.modules) ? insight.modules : []),
    impact: insight.impact || "",
  };
}

function normalizeRecommendation(r, i) {
  return {
    id: r.id || `rec${i}`,
    priority: r.priority || i + 1,
    title: r.title || r.action || "Recommendation",
    impact: r.impact || "",
    effort: r.effort || "Medium",
    owner: r.owner || "",
    status: r.status || "pending",
    module: r.module || r.category || "Intelligence",
  };
}

export async function getAIInsightsDashboard() {
  const [insightsRes, runRes] = await Promise.allSettled([
    apiFetch("/intelligence/insights?limit=20"),
    apiFetch("/intelligence/run", {
      method: "POST",
      body: JSON.stringify({ module: "ai_insights", days: 30 }),
    }),
  ]);

  const rawInsights = insightsRes.status === "fulfilled"
    ? (insightsRes.value.data || [])
    : [];

  const runData = runRes.status === "fulfilled"
    ? (runRes.value.data || {})
    : {};

  const allInsights = [
    ...rawInsights,
    ...(runData.insights || []),
  ];

  const seen = new Set();
  const insights = allInsights.filter(r => {
    const key = r.id || r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(normalizeInsight);

  const recommendations = (runData.recommendations || []).map(normalizeRecommendation);

  return { insights, recommendations };
}

export async function getInsightTimeline(limit = 20) {
  try {
    const data = await apiFetch(`/intelligence/insights/timeline?limit=${limit}`);
    return (data.data || []).map((r) => ({
      time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      event: r.title || "AI Insight",
      severity: r.severity || "info",
    }));
  } catch {
    return [];
  }
}

export async function takeInsightAction(insightId, action, notes = "") {
  return apiFetch(`/intelligence/insights/${insightId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, notes }),
  });
}

export async function createTaskFromInsight(insight) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/tasks/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `AI Insight: ${insight.title}`,
      description: insight.explanation || insight.action || "",
      priority: insight.severity === "critical" ? "critical" : "high",
      status: "todo",
      source: "intelligence",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Task creation failed");
  return json;
}
