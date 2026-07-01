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

function normalizePrediction(p, i) {
  return {
    id: p.id || `p${i}`,
    title: p.title || p.name || "Prediction",
    probability: p.probability ?? p.confidence ?? 50,
    risk: p.risk || (p.probability > 70 ? "high" : p.probability > 40 ? "medium" : "low"),
    confidence: p.confidence ?? p.probability ?? 70,
    impact: p.impact || "Medium",
    module: p.module || p.category || "Intelligence",
    action: p.action || p.recommendation || "",
    status: p.status || "active",
    factors: Array.isArray(p.factors) ? p.factors : (Array.isArray(p.causes) ? p.causes : []),
  };
}

function groupPredictions(preds) {
  const groups = {};
  for (const p of preds) {
    const key = String(p.module || "other").toLowerCase().replace(/[^a-z]/g, "_");
    (groups[key] = groups[key] || []).push(p);
  }
  return groups;
}

export async function getPredictiveAIDashboard() {
  const [runRes, insightsRes] = await Promise.allSettled([
    apiFetch("/intelligence/run", {
      method: "POST",
      body: JSON.stringify({ module: "predictive_ai", days: 30 }),
    }),
    apiFetch("/intelligence/insights?limit=30"),
  ]);

  const runData = runRes.status === "fulfilled" ? (runRes.value.data || {}) : {};
  const rawInsights = insightsRes.status === "fulfilled" ? (insightsRes.value.data || []) : [];

  const allPreds = [
    ...(runData.predictions || []),
    ...(runData.insights || []),
    ...rawInsights,
  ];

  const seen = new Set();
  const unique = allPreds.filter(p => {
    const k = p.id || p.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const predictions = groupPredictions(unique.map(normalizePrediction));

  const recommendations = (runData.recommendations || []).map((r, i) => ({
    id: r.id || `rec${i}`,
    priority: r.priority || i + 1,
    title: r.title || r.action || "Recommendation",
    impact: r.impact || "",
    effort: r.effort || "Medium",
    owner: r.owner || "",
    status: r.status || "pending",
    module: r.module || "Intelligence",
  }));

  return { predictions, recommendations };
}

export async function createTaskFromPrediction(prediction) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/tasks/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `AI Recommendation: ${prediction.title}`,
      description: `${prediction.action || ""}\n\nProbability: ${prediction.probability}% | Risk: ${prediction.risk} | Impact: ${prediction.impact}`,
      priority: prediction.risk === "high" ? "critical" : prediction.risk === "medium" ? "high" : "medium",
      status: "todo",
      source: "intelligence_prediction",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Task creation failed");
  return json;
}

export async function createTaskFromRecommendation(rec) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/tasks/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: rec.title,
      description: `Module: ${rec.module}\nImpact: ${rec.impact}\nOwner: ${rec.owner}`,
      priority: rec.effort === "Low" ? "medium" : "high",
      status: "todo",
      source: "intelligence_recommendation",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Task creation failed");
  return json;
}
