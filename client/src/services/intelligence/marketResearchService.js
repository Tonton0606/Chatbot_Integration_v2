import { supabase } from "../../config/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const h = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

export const INDUSTRIES = [
  "Technology & SaaS",
  "Retail & E-commerce",
  "Food & Beverage",
  "Healthcare & Wellness",
  "Real Estate & Construction",
  "Financial Services & Fintech",
  "Education & Training",
  "Manufacturing & Distribution",
  "Logistics & Supply Chain",
  "Marketing & Advertising",
  "Professional Services & Consulting",
  "Hospitality & Tourism",
  "Agriculture & Agri-tech",
  "Others",
];

export const REGIONS = [
  "Philippines",
  "Metro Manila",
  "Cebu",
  "Davao",
  "Southeast Asia",
  "Asia Pacific",
  "Global",
];

export const BUSINESS_TYPES = [
  "SMB (Small & Medium Business)",
  "Enterprise",
  "Startup",
  "Franchise",
  "Non-Profit",
  "Government Agency",
];

export const TARGET_AUDIENCES = [
  "General consumers (B2C)",
  "Business owners & decision-makers (B2B)",
  "Enterprise executives",
  "SMB owners",
  "Millennials & Gen Z",
  "Corporate clients",
  "Government & public sector",
];

export async function runMarketResearch(form = {}) {
  const headers = await authHeaders();
  const industry = form.industry === "Others" ? (form.customIndustry || "General") : (form.industry || "General");
  const region = form.region || "Philippines";
  const businessType = form.businessType || "Business";
  const targetAudience = form.targetAudience || "General market";

  const topic = form.additionalContext?.trim()
    ? `${industry} market in ${region} — ${form.additionalContext.trim()}`
    : `${industry} market in ${region} for ${businessType} targeting ${targetAudience}`;

  const payload = {
    topic,
    industry,
    region,
    businessType,
    targetAudience,
    additionalContext: form.additionalContext || "",
    objectives: [`Understand ${industry} market opportunities in ${region}`, `Analyze competition for ${businessType}`],
  };

  const res = await fetch(`${BASE}/ai/market-research`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Market research failed (${res.status})`);
  return json.data || json;
}
