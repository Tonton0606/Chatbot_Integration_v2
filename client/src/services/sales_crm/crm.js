// client/src/services/sales_crm/crm.js

import { supabase } from "../../config/supabaseClient";

function normalizeOpportunity(opp) {
  return {
    id: opp.id,
    name: opp.title || "Untitled Opportunity",
    title: opp.title || "Untitled Opportunity",
    company: opp.contact?.company_name || "No company",
    contact: opp.contact?.full_name || "Unknown contact",
    email: opp.contact?.email || "",
    phone: opp.contact?.phone || "",
    stage: opp.stage?.key || "new",
    stageName: opp.stage?.name || "New",
    stageSortOrder: opp.stage?.sort_order || 0,
    revenue: Number(opp.expected_revenue || 0),
    probability: Number(opp.probability || opp.stage?.probability || 0),
    status: opp.status || "open",
    source: opp.source || "manual",
    description: opp.description || "",
    expectedCloseDate: opp.expected_close_date,
    createdAt: opp.created_at,
    updatedAt: opp.updated_at || opp.created_at,
  };
}

export async function getCRMData() {
  const { data: stages, error: stagesError } = await supabase
    .from("crm_stages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (stagesError) throw stagesError;

  const { data: opportunities, error: opportunitiesError } = await supabase
    .from("crm_opportunities")
    .select(`
      id,
      title,
      expected_revenue,
      probability,
      status,
      source,
      description,
      expected_close_date,
      created_at,
      updated_at,
      contact:contacts (
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      stage:crm_stages (
        id,
        key,
        name,
        sort_order,
        probability,
        is_won,
        is_lost
      )
    `)
    .order("updated_at", { ascending: false });

  if (opportunitiesError) throw opportunitiesError;

  const normalizedOpportunities = (opportunities || []).map(normalizeOpportunity);

  const recentActivities = normalizedOpportunities
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 6)
    .map((opp) => ({
      id: `activity_${opp.id}`,
      type: opp.status === "won" ? "won" : opp.status === "lost" ? "lost" : "updated",
      title: opp.name,
      company: opp.company,
      stageName: opp.stageName,
      status: opp.status,
      date: opp.updatedAt,
    }));

  return {
    stages: stages || [],
    opportunities: normalizedOpportunities,
    recentActivities,
  };
}
