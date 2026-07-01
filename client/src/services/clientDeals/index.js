import { supabase } from "../../config/supabaseClient";

export const CLIENT_DEAL_STAGES = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const CLIENT_DEAL_STAGE_LABELS = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const CLIENT_DEAL_STAGE_COLORS = {
  new: "var(--brand-gold)",
  qualified: "var(--brand-gold)",
  proposal: "var(--brand-gold)",
  negotiation: "var(--brand-gold)",
  won: "var(--success)",
  lost: "var(--danger)",
};

export const CLIENT_DEAL_STAGE_PROBABILITIES = {
  new: 10,
  qualified: 35,
  proposal: 55,
  negotiation: 75,
  won: 100,
  lost: 0,
};

export const CLIENT_DEAL_STATUSES = ["open", "won", "lost", "archived"];

export const CLIENT_DEAL_SOURCES = [
  "manual",
  "referral",
  "website",
  "social_media",
  "cold_outreach",
  "event",
  "landing_page",
  "demo_request",
  "demo_booking",
];

export const CLIENT_ASSIGNMENT_TYPES = [
  "self",
  "employee",
  "contact",
  "other",
];

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("Authenticated user is required.");

  return user.id;
}

function getAssignmentLabel(deal) {
  if (deal.assignment_type === "self") return "Self";

  if (deal.assignment_type === "employee") {
    return deal.assigned_user?.full_name || deal.assigned_user?.email || "Employee";
  }

  if (deal.assignment_type === "contact") {
    return deal.assigned_contact?.full_name || "Contact";
  }

  if (deal.assignment_type === "other") {
    return deal.assigned_name || "Other";
  }

  return "Unassigned";
}

function buildAssignmentPayload(input, fallbackUserId) {
  const assignmentType = input.assignment_type || "self";

  return {
    assignment_type: assignmentType,
    assigned_user_id:
      assignmentType === "self"
        ? fallbackUserId
        : assignmentType === "employee"
          ? input.assigned_user_id || null
          : null,
    assigned_contact_id:
      assignmentType === "contact" ? input.assigned_contact_id || null : null,
    assigned_name:
      assignmentType === "other" ? input.assigned_name || null : null,
  };
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

export function normalizeClientDeal(deal) {
  const contact = deal.contact || {};

  return {
    id: deal.id,
    workspace_id: deal.workspace_id,
    lead_id: deal.lead_id || null,
    contact_id: deal.contact_id || null,

    title: deal.title || "Untitled Deal",
    name: deal.title || "Untitled Deal",

    stage: deal.stage || "new",
    stageName: CLIENT_DEAL_STAGE_LABELS[deal.stage] || deal.stage || "New",
    stageColor:
      CLIENT_DEAL_STAGE_COLORS[deal.stage] || CLIENT_DEAL_STAGE_COLORS.new,

    status: deal.status || "open",

    expected_revenue: Number(deal.expected_revenue || 0),
    value: Number(deal.expected_revenue || 0),
    probability: Number(deal.probability || 0),

    expected_close_date: deal.expected_close_date || null,
    description: deal.description || "",
    source: deal.source || "manual",

    created_by: deal.created_by || null,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    archived_at: deal.archived_at || null,
    archived_by: deal.archived_by || null,

    contact_name: contact.full_name || "",
    company: contact.company_name || "",
    company_name: contact.company_name || "",
    email: contact.email || "",
    phone: contact.phone || "",

    assignment_type: deal.assignment_type || "self",
    assigned_user_id: deal.assigned_user_id || null,
    assigned_contact_id: deal.assigned_contact_id || null,
    assigned_name: deal.assigned_name || "",
    owner: getAssignmentLabel(deal),

    activities: [],
  };
}

export function buildClientCRMKPIs(deals) {
  const activeDeals = deals.filter((deal) => !deal.archived_at);
  const open = activeDeals.filter((deal) => deal.status === "open");
  const won = activeDeals.filter((deal) => deal.status === "won");
  const lost = activeDeals.filter((deal) => deal.status === "lost");

  const pipelineValue = open.reduce(
    (sum, deal) => sum + Number(deal.value || 0),
    0
  );

  const wonValue = won.reduce(
    (sum, deal) => sum + Number(deal.value || 0),
    0
  );

  const conversionRate =
    activeDeals.length > 0
      ? Math.round((won.length / activeDeals.length) * 100)
      : 0;

  return {
    totalDeals: activeDeals.length,
    openDeals: open.length,
    wonDeals: won.length,
    lostDeals: lost.length,
    pipelineValue,
    wonValue,
    conversionRate,
  };
}

export async function getClientDealLookups(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data: contacts, error: contactsError } = await supabase
    .from("client_contacts")
    .select("id, workspace_id, full_name, email, phone, company_name, status, source")
    .eq("workspace_id", workspaceId)
    .order("full_name", { ascending: true });

  if (contactsError) throw contactsError;

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id, workspace_id, role")
    .eq("workspace_id", workspaceId);

  if (membersError) throw membersError;

  const memberIds = [
    ...new Set((members || []).map((member) => member.user_id).filter(Boolean)),
  ];

  let employees = [];

  if (memberIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status")
      .in("id", memberIds)
      .order("full_name", { ascending: true });

    if (profilesError) throw profilesError;

    employees = profiles || [];
  }

  return {
    contacts: contacts || [],
    employees,
    stages: CLIENT_DEAL_STAGES,
    stageLabels: CLIENT_DEAL_STAGE_LABELS,
    stageColors: CLIENT_DEAL_STAGE_COLORS,
    stageProbabilities: CLIENT_DEAL_STAGE_PROBABILITIES,
    statuses: CLIENT_DEAL_STATUSES,
    sources: CLIENT_DEAL_SOURCES,
    assignmentTypes: CLIENT_ASSIGNMENT_TYPES,
  };
}

export async function getClientDealsData(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("client_deals")
    .select(buildDealSelect())
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const normalizedDeals = (data || []).map(normalizeClientDeal);

  return {
    deals: normalizedDeals,
    kpis: buildClientCRMKPIs(normalizedDeals),
    stages: CLIENT_DEAL_STAGES,
    stageLabels: CLIENT_DEAL_STAGE_LABELS,
    stageColors: CLIENT_DEAL_STAGE_COLORS,
    stageProbabilities: CLIENT_DEAL_STAGE_PROBABILITIES,
    statuses: CLIENT_DEAL_STATUSES,
    sources: CLIENT_DEAL_SOURCES,
    rawStages: CLIENT_DEAL_STAGES.map((stage, index) => ({
      id: stage,
      key: stage,
      name: CLIENT_DEAL_STAGE_LABELS[stage],
      probability: CLIENT_DEAL_STAGE_PROBABILITIES[stage],
      sort_order: index + 1,
      is_won: stage === "won",
      is_lost: stage === "lost",
    })),
    salespersons: [
      "Self",
      ...new Set(normalizedDeals.map((deal) => deal.owner).filter(Boolean)),
    ],
  };
}

export async function getArchivedClientDealsData(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("client_deals")
    .select(buildDealSelect())
    .eq("workspace_id", workspaceId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeClientDeal);
}

export async function getClientDealById(id, workspaceId) {
  requireWorkspaceId(workspaceId);

  if (!id) {
    throw new Error("Deal ID is required.");
  }

  const { data, error } = await supabase
    .from("client_deals")
    .select(buildDealSelect())
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return normalizeClientDeal(data);
}

export async function createClientDeal(workspaceId, deal) {
  requireWorkspaceId(workspaceId);

  const userId = await getCurrentUserId();
  const stage = deal.stage || "new";

  const payload = cleanPayload({
    workspace_id: workspaceId,
    lead_id: deal.lead_id || null,
    contact_id: deal.contact_id || null,
    title: deal.title || deal.name,
    stage,
    expected_revenue: Number(deal.expected_revenue ?? deal.value ?? 0),
    probability: Number(
      deal.probability ?? CLIENT_DEAL_STAGE_PROBABILITIES[stage] ?? 0
    ),
    status:
      deal.status ||
      (stage === "won" ? "won" : stage === "lost" ? "lost" : "open"),
    expected_close_date: deal.expected_close_date || null,
    description: deal.description || null,
    source: deal.source || "manual",
    created_by: userId,
    archived_at: null,
    archived_by: null,
    ...buildAssignmentPayload(deal, userId),
  });

  if (!payload.title) {
    throw new Error("Deal title is required.");
  }

  const { data, error } = await supabase
    .from("client_deals")
    .insert(payload)
    .select(buildDealSelect())
    .single();

  if (error) throw error;

  return normalizeClientDeal(data);
}

export async function updateClientDeal(id, workspaceId, deal) {
  requireWorkspaceId(workspaceId);

  if (!id) {
    throw new Error("Deal ID is required.");
  }

  const userId = await getCurrentUserId();

  const nextStage = deal.stage;
  const impliedStatus =
    nextStage === "won" ? "won" : nextStage === "lost" ? "lost" : undefined;

  const payload = cleanPayload({
    lead_id: deal.lead_id,
    contact_id: deal.contact_id,
    title: deal.title ?? deal.name,
    stage: nextStage,
    expected_revenue:
      deal.expected_revenue !== undefined || deal.value !== undefined
        ? Number(deal.expected_revenue ?? deal.value ?? 0)
        : undefined,
    probability:
      deal.probability !== undefined
        ? Number(deal.probability)
        : nextStage
          ? CLIENT_DEAL_STAGE_PROBABILITIES[nextStage]
          : undefined,
    status: deal.status ?? impliedStatus,
    expected_close_date: deal.expected_close_date || null,
    description: deal.description,
    source: deal.source,
    ...(deal.assignment_type
      ? buildAssignmentPayload(deal, userId)
      : {}),
  });

  const { data, error } = await supabase
    .from("client_deals")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select(buildDealSelect())
    .single();

  if (error) throw error;

  return normalizeClientDeal(data);
}

export async function archiveClientDeal(id, workspaceId) {
  requireWorkspaceId(workspaceId);

  if (!id) {
    throw new Error("Deal ID is required.");
  }

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("client_deals")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: userId,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select(buildDealSelect())
    .single();

  if (error) throw error;

  return normalizeClientDeal(data);
}

export async function restoreClientDeal(id, workspaceId) {
  requireWorkspaceId(workspaceId);

  if (!id) {
    throw new Error("Deal ID is required.");
  }

  const { data, error } = await supabase
    .from("client_deals")
    .update({
      status: "open",
      archived_at: null,
      archived_by: null,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(buildDealSelect())
    .single();

  if (error) throw error;

  return normalizeClientDeal(data);
}

export async function deleteClientDeal() {
  throw new Error("Client deals cannot be deleted. Archive the deal instead.");
}

export async function markClientDealWon(id, workspaceId) {
  return updateClientDeal(id, workspaceId, {
    status: "won",
    stage: "won",
    probability: 100,
  });
}

export async function markClientDealLost(id, workspaceId) {
  return updateClientDeal(id, workspaceId, {
    status: "lost",
    stage: "lost",
    probability: 0,
  });
}

export async function getClientDealMeta(workspaceId) {
  return getClientDealLookups(workspaceId);
}

export async function updateClientDealStage(id, workspaceId, stage) {
  return updateClientDeal(id, workspaceId, {
    stage,
    probability: CLIENT_DEAL_STAGE_PROBABILITIES[stage] ?? 0,
    status: stage === "won" ? "won" : stage === "lost" ? "lost" : "open",
  });
}
