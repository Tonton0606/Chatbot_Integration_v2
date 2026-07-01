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

function normalizeMarketResearchForm(form = {}) {
  const industry =
    form.industry === "Others"
      ? String(form.customIndustry || "").trim() || "General business"
      : String(form.industry || "General business").trim();

  const region = String(form.region || "Philippines").trim() || "Philippines";
  const businessType = String(form.businessType || "Business").trim() || "Business";
  const targetAudience = String(form.targetAudience || "General market").trim() || "General market";

  const topic = form.additionalContext?.trim()
    ? `${industry} market in ${region} — ${form.additionalContext.trim()}`
    : `${industry} market in ${region} for ${businessType} targeting ${targetAudience}`;

  return {
    ...form,
    topic,
    industry,
    region,
    businessType,
    targetAudience,
    objectives: [`Understand ${industry} market opportunities in ${region}`, `Analyze competition for ${businessType}`],
  };
}

export async function getDataAnalyticsDashboard() {
  const runRes = await apiFetch("/intelligence/run", {
    method: "POST",
    body: JSON.stringify({ module: "data_analytics", days: 30 }),
  });

  const data = runRes.data || {};
  const metrics = data.metrics || data.kpis || {};

  const kpis = data.kpi_widgets || Object.entries(metrics).map(([label, val], i) => ({
    label,
    value: typeof val === "object" ? (val.formatted || String(val.value || "—")) : String(val),
    raw: typeof val === "object" ? String(val.raw || "") : "",
    color: ["#27ae60", "#4a90d9", "#c9a84c", "#9b59b6", "#e74c3c", "#1abc9c", "#f5a623"][i % 7],
  }));

  const revenueTrend = data.revenue_trend || data.trend || [];

  const departmentPerformance = (data.department_performance || data.departments || []).map((d, i) => ({
    dept: d.dept || d.name || `Dept ${i + 1}`,
    current: d.current || d.value || 0,
    previous: d.previous || d.prev || 0,
    change: d.change || "0%",
    status: d.status || (d.change?.startsWith("+") ? "up" : "down"),
    owner: d.owner || "",
    metric: d.metric || "Value",
  }));

  return { kpis, revenueTrend, departmentPerformance };
}

export async function generateMarketResearch(form = {}) {
  const normalizedForm = normalizeMarketResearchForm(form);
  const headers = await authHeaders();

  const res = await fetch(`${BASE}/ai/market-research`, {
    method: "POST",
    headers,
    body: JSON.stringify(normalizedForm),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Market research API error ${res.status}`);

  const data = json.data || json;
  const report = data.report || {};

  const ensureArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      return val.split(/\n|,/).map(s => s.trim()).filter(s => s.length > 0);
    }
    if (!val) return [];
    return [String(val)];
  };

  const getObj = (obj) => typeof obj === 'object' && obj !== null ? obj : {};
  
  const competitorsArr = ensureArray(report.competitors || report.competitorAnalysis);
  const trendsArr = ensureArray(report.trends || report.keyTrends);
  const opportunitiesArr = ensureArray(report.opportunities);
  const risksArr = ensureArray(report.risks);
  const recommendationsArr = ensureArray(report.recommendations);
  const referencesArr = ensureArray(report.references || report.sources);
  
  return {
    model: data.model || "AI",
    source: data.source,
    
    // Original Sections Format (keeping for fallback compatibility if needed)
    sections: {
      overview: [
        { title: "Executive Summary", detail: report.executiveSummary?.summary || report.executiveSummary || "No summary provided." }
      ],
      marketSize: [
        { title: "Market Size & Growth", detail: report.marketSize?.description || report.marketSize || "No data." }
      ],
      competitors: competitorsArr.map(c => ({
        title: c.name || "Competitor",
        detail: `Positioning: ${c.positioning || "N/A"}. Threat Level: ${c.threatLevel || "Medium"}.`,
        action: `Strengths: ${ensureArray(c.strengths).join(', ')}. Weaknesses: ${ensureArray(c.weaknesses).join(', ')}`
      })),
      trends: trendsArr.map(t => typeof t === 'object' ? { title: t.title || "Key Trend", detail: t.description || "Trend details" } : { title: "Key Trend", detail: t }),
      recommendations: recommendationsArr.map(r => typeof r === 'object' ? { title: r.title || r.recommendation || "Recommendation", detail: r.description || r.expectedImpact || "Recommendation details" } : { title: "Recommendation", detail: r })
    },
    
    // NEW STRUCTURE
    reportData: {
      executiveSummary: getObj(report.executiveSummary),
      marketOverview: getObj(report.marketOverview),
      marketSize: getObj(report.marketSize),
      competitors: competitorsArr.map(c => ({
        ...c,
        strengths: ensureArray(c.strengths),
        weaknesses: ensureArray(c.weaknesses)
      })),
      trends: trendsArr,
      opportunities: opportunitiesArr,
      risks: risksArr,
      recommendations: recommendationsArr,
      swot: getObj(report.swot),
      customerPersonas: ensureArray(report.customerPersonas),
      charts: ensureArray(report.charts),
      references: referencesArr
    },
    
    analytics: {
      scores: [
        { label: "Market Viability", value: report.executiveSummary?.marketViabilityScore || 85, interpretation: "Strong potential based on market size." },
        { label: "Competitive Intensity", value: report.executiveSummary?.competitionScore || 65, interpretation: "Moderate competition." }
      ],
      competitorBenchmarks: competitorsArr.map(c => ({
        brand: c.name || "Unknown", positioning: c.positioning || "N/A", pricing: "Competitive", strengths: ensureArray(c.strengths).join(', '), weaknesses: ensureArray(c.weaknesses).join(', '), threat: c.threatLevel || "Medium"
      })),
      opportunityMap: opportunitiesArr,
      roadmap: report.roadmap || [],
      assumptions: ["Based on available public data", "Estimates subject to market volatility"]
    },
    risks: risksArr,
    nextSteps: recommendationsArr
  };

}