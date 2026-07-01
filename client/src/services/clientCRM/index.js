import { supabase } from "../../config/supabaseClient";

import {
  CLIENT_DEAL_STAGES,
  CLIENT_DEAL_STAGE_LABELS,
  CLIENT_DEAL_STAGE_COLORS,
  CLIENT_DEAL_STAGE_PROBABILITIES,
  normalizeClientDeal,
} from "../clientDeals";

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function buildDealSelect() {
  return `
    id,
    workspace_id,
    lead_id,
    contact_id,
    title,
    stage,
    expected_revenue,
    probability,
    status,
    expected_close_date,
    description,
    source,
    created_by,
    created_at,
    updated_at,
    archived_at,
    archived_by,
    assignment_type,
    assigned_user_id,
    assigned_contact_id,
    assigned_name,
    contact:client_contacts!client_deals_contact_id_fkey (
      id,
      full_name,
      email,
      phone,
      company_name
    ),
    assigned_contact:client_contacts!client_deals_assigned_contact_id_fkey (
      id,
      full_name,
      email,
      phone,
      company_name
    ),
    assigned_user:profiles!client_deals_assigned_user_id_fkey (
      id,
      full_name,
      email
    )
  `;
}

function normalizeOpportunity(deal, stages = []) {
  const stageMeta = stages.find((stage) => stage.key === deal.stage);

  return {
    id: deal.id,
    workspace_id: deal.workspace_id,

    name: deal.title || "Untitled Deal",
    title: deal.title || "Untitled Deal",

    company: deal.company || "No company",
    contact: deal.contact_name || "Unknown contact",
    contact_id: deal.contact_id,
    email: deal.email || "",
    phone: deal.phone || "",

    stage: deal.stage || "new",
    stageName: CLIENT_DEAL_STAGE_LABELS[deal.stage] || deal.stage || "New",
    stageSortOrder: stageMeta?.sort_order || 0,

    revenue: Number(deal.value || 0),
    probability: Number(
      deal.probability || CLIENT_DEAL_STAGE_PROBABILITIES[deal.stage] || 0
    ),

    status: deal.status || "open",
    source: deal.source || "manual",
    description: deal.description || "",
    expectedCloseDate: deal.expected_close_date,

    owner: deal.owner || "Unassigned",
    assignment_type: deal.assignment_type || "self",
    assigned_user_id: deal.assigned_user_id || null,
    assigned_contact_id: deal.assigned_contact_id || null,
    assigned_name: deal.assigned_name || "",

    createdAt: deal.created_at,
    updatedAt: deal.updated_at || deal.created_at,
    archived_at: deal.archived_at || null,
  };
}

export function buildClientCRMKPIs(opportunities) {
  const active = opportunities.filter((opp) => !opp.archived_at);

  const open = active.filter((opp) => opp.status === "open");
  const won = active.filter((opp) => opp.status === "won");
  const lost = active.filter((opp) => opp.status === "lost");

  const openPipelineValue = open.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const weightedPipeline = open.reduce(
    (sum, opp) =>
      sum + Number(opp.revenue || 0) * (Number(opp.probability || 0) / 100),
    0
  );

  const wonRevenue = won.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const conversionRate =
    active.length > 0 ? Math.round((won.length / active.length) * 100) : 0;

  return {
    totalDeals: active.length,
    openDeals: open.length,
    wonDeals: won.length,
    lostDeals: lost.length,
    openPipelineValue,
    weightedPipeline,
    wonRevenue,
    conversionRate,
  };
}

function buildStages() {
  return CLIENT_DEAL_STAGES.map((key, index) => ({
    id: key,
    key,
    name: CLIENT_DEAL_STAGE_LABELS[key],
    color: CLIENT_DEAL_STAGE_COLORS[key],
    sort_order: index + 1,
    probability: CLIENT_DEAL_STAGE_PROBABILITIES[key],
    is_won: key === "won",
    is_lost: key === "lost",
  }));
}

function buildRecentActivities(opportunities) {
  return opportunities
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 6)
    .map((opp) => ({
      id: `activity_${opp.id}`,
      type:
        opp.status === "won"
          ? "won"
          : opp.status === "lost"
            ? "lost"
            : "updated",
      title: opp.name,
      company: opp.company,
      stageName: opp.stageName,
      status: opp.status,
      date: opp.updatedAt,
    }));
}

export async function getClientCRMData(workspaceId) {
  requireWorkspaceId(workspaceId);

  const stages = buildStages();

  const { data: deals, error: dealsError } = await supabase
    .from("client_deals")
    .select(buildDealSelect())
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (dealsError) throw dealsError;

  const { data: contacts, error: contactsError } = await supabase
    .from("client_contacts")
    .select("id, workspace_id, status, created_at, updated_at, archived_at")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (contactsError) throw contactsError;

  const { data: leads, error: leadsError } = await supabase
    .from("client_leads")
    .select("id, workspace_id, status, estimated_value, probability, created_at, updated_at, archived_at")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (leadsError) throw leadsError;

  const normalizedDeals = (deals || []).map(normalizeClientDeal);
  const opportunities = normalizedDeals.map((deal) =>
    normalizeOpportunity(deal, stages)
  );

  const recentActivities = buildRecentActivities(opportunities);

  return {
    stages,
    opportunities,
    deals: normalizedDeals,
    contacts: contacts || [],
    leads: leads || [],
    recentActivities,
    kpis: buildClientCRMKPIs(opportunities),
    stageLabels: CLIENT_DEAL_STAGE_LABELS,
    stageColors: CLIENT_DEAL_STAGE_COLORS,
  };
}
