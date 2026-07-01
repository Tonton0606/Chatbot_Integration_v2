import { supabase } from "../../config/supabaseClient";

export const CLIENT_LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "converted",
  "lost",
];

export const CLIENT_LEAD_STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  converted: "Converted",
  lost: "Lost",
};

export const CLIENT_LEAD_STAGE_COLORS = {
  new: "var(--brand-gold)",
  contacted: "var(--brand-gold)",
  qualified: "var(--success)",
  proposal: "var(--brand-gold)",
  converted: "var(--success)",
  lost: "var(--danger)",
};

export const CLIENT_LEAD_STAGE_PROBABILITIES = {
  new: 10,
  contacted: 30,
  qualified: 60,
  proposal: 80,
  converted: 100,
  lost: 0,
};

export const CLIENT_LEAD_SOURCES = [
  "manual",
  "website",
  "facebook",
  "referral",
  "landing_page",
  "demo_request",
  "demo_booking",
  "social_media",
  "other",
];

export const CLIENT_ASSIGNMENT_TYPES = [
  "self",
  "employee",
  "contact",
  "other",
];

export const CLIENT_LEAD_CONTACT_MODES = [
  "existing",
  "manual",
];

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

async function getMyClientWorkspace() {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No workspace found for current user.");

  return {
    userId,
    workspaceId: data.workspace_id,
    role: data.role,
  };
}

async function resolveWorkspace(workspaceId) {
  if (workspaceId) {
    return {
      userId: await getCurrentUserId(),
      workspaceId,
    };
  }

  return getMyClientWorkspace();
}

function getLeadScore(status, probability) {
  if (Number(probability) > 0) return Number(probability);

  const map = {
    new: 25,
    contacted: 45,
    qualified: 70,
    proposal: 85,
    converted: 100,
    lost: 0,
  };

  return map[status] ?? 25;
}

function getAssignmentLabel(lead) {
  if (lead.assignment_type === "self") return "Self";

  if (lead.assignment_type === "employee") {
    return lead.assigned_user?.full_name || lead.assigned_user?.email || "Employee";
  }

  if (lead.assignment_type === "contact") {
    return lead.assigned_contact?.full_name || "Contact";
  }

  if (lead.assignment_type === "other") {
    return lead.assigned_name || "Other";
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
      assignmentType === "contact"
        ? input.assigned_contact_id || null
        : null,

    assigned_name:
      assignmentType === "other"
        ? input.assigned_name || null
        : null,
  };
}

function buildLeadSelect() {
  return `
    id,
    workspace_id,
    contact_id,
    title,
    source,
    status,
    notes,
    created_by,
    created_at,
    updated_at,
    archived_at,
    archived_by,
    assignment_type,
    assigned_user_id,
    assigned_contact_id,
    assigned_name,
    estimated_value,
    probability,
    contact:client_contacts!client_leads_contact_id_fkey (
      id,
      full_name,
      email,
      phone,
      company_name
    ),
    assigned_contact:client_contacts!client_leads_assigned_contact_id_fkey (
      id,
      full_name,
      email,
      phone,
      company_name
    ),
    assigned_user:profiles!client_leads_assigned_user_id_fkey (
      id,
      full_name,
      email
    )
  `;
}

export function normalizeClientLead(lead) {
  const contact = lead.contact || {};
  const status = lead.status || "new";

  return {
    id: lead.id,
    workspace_id: lead.workspace_id,
    contact_id: lead.contact_id,

    title: lead.title || "Untitled Lead",
    name: lead.title || "Untitled Lead",
    interest: lead.title || "General Inquiry",

    source: lead.source || "manual",
    status,
    stage: CLIENT_LEAD_STAGE_LABELS[status] || "New",
    stage_key: status,
    stage_color: CLIENT_LEAD_STAGE_COLORS[status] || CLIENT_LEAD_STAGE_COLORS.new,

    notes: lead.notes || "",
    estimated_value: Number(lead.estimated_value || 0),
    probability: Number(
      lead.probability || CLIENT_LEAD_STAGE_PROBABILITIES[status] || 0
    ),
    score: getLeadScore(status, lead.probability),

    contact_name: contact.full_name || "Unnamed Contact",
    company: contact.company_name || "",
    email: contact.email || "",
    phone: contact.phone || "",

    assignment_type: lead.assignment_type || "self",
    assigned_user_id: lead.assigned_user_id || null,
    assigned_contact_id: lead.assigned_contact_id || null,
    assigned_name: lead.assigned_name || "",
    owner: getAssignmentLabel(lead),

    created_by: lead.created_by || null,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    archived_at: lead.archived_at || null,
    archived_by: lead.archived_by || null,

    last_contacted_at: lead.updated_at || lead.created_at,
    next_follow_up_at: null,
    activities: [],
  };
}

async function createManualClientContact(workspace, contact = {}, source = "manual") {
  const fullName = contact.full_name || contact.name;

  if (!fullName?.trim()) {
    throw new Error("Contact full name is required.");
  }

  const payload = cleanPayload({
    workspace_id: workspace.workspaceId,
    full_name: fullName.trim(),
    email: contact.email || null,
    phone: contact.phone || null,
    company_name: contact.company_name || contact.company || null,
    source,
    status: "lead",
    created_by: workspace.userId,
  });

  const { data, error } = await supabase
    .from("client_contacts")
    .insert(payload)
    .select("id, workspace_id, full_name, email, phone, company_name, source, status")
    .single();

  if (error) throw error;

  return data;
}

async function resolveLeadContact(workspace, lead) {
  const contactMode = lead.contact_mode || "existing";

  if (contactMode === "manual") {
    return createManualClientContact(workspace, lead.contact, lead.source || "manual");
  }

  if (!lead.contact_id) {
    throw new Error("Contact is required.");
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .select("id, workspace_id, full_name, email, phone, company_name")
    .eq("id", lead.contact_id)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Selected contact was not found in this workspace.");

  return data;
}

export async function getClientLeadsData(workspaceId) {
  const workspace = await resolveWorkspace(workspaceId);

  const { data, error } = await supabase
    .from("client_leads")
    .select(buildLeadSelect())
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return {
    leads: (data || []).map(normalizeClientLead),
    stages: CLIENT_LEAD_STAGES,
    stageLabels: CLIENT_LEAD_STAGE_LABELS,
    stageColors: CLIENT_LEAD_STAGE_COLORS,
    stageProbabilities: CLIENT_LEAD_STAGE_PROBABILITIES,
    sources: CLIENT_LEAD_SOURCES,
    assignmentTypes: CLIENT_ASSIGNMENT_TYPES,
    contactModes: CLIENT_LEAD_CONTACT_MODES,
  };
}

export async function getArchivedClientLeadsData(workspaceId) {
  const workspace = await resolveWorkspace(workspaceId);

  const { data, error } = await supabase
    .from("client_leads")
    .select(buildLeadSelect())
    .eq("workspace_id", workspace.workspaceId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeClientLead);
}

export async function getClientLeadLookups(workspaceId) {
  const workspace = await resolveWorkspace(workspaceId);

  const { data: contacts, error: contactsError } = await supabase
    .from("client_contacts")
    .select("id, workspace_id, full_name, email, phone, company_name, status, source")
    .eq("workspace_id", workspace.workspaceId)
    .order("full_name", { ascending: true });

  if (contactsError) throw contactsError;

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id, workspace_id, role")
    .eq("workspace_id", workspace.workspaceId);

  if (membersError) throw membersError;

  const memberIds = [
    ...new Set((members || []).map((member) => member.user_id).filter(Boolean)),
  ];

  let profiles = [];

  if (memberIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status")
      .in("id", memberIds)
      .order("full_name", { ascending: true });

    if (profilesError) throw profilesError;

    profiles = profileRows || [];
  }

  return {
    contacts: contacts || [],
    employees: profiles,
    currentUserId: workspace.userId,
    workspaceId: workspace.workspaceId,
    stages: CLIENT_LEAD_STAGES,
    stageLabels: CLIENT_LEAD_STAGE_LABELS,
    stageProbabilities: CLIENT_LEAD_STAGE_PROBABILITIES,
    sources: CLIENT_LEAD_SOURCES,
    assignmentTypes: CLIENT_ASSIGNMENT_TYPES,
    contactModes: CLIENT_LEAD_CONTACT_MODES,
  };
}

export async function getClientLeadById(id, workspaceId) {
  if (!id) throw new Error("Lead ID is required.");

  const workspace = await resolveWorkspace(workspaceId);

  const { data, error } = await supabase
    .from("client_leads")
    .select(buildLeadSelect())
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return normalizeClientLead(data);
}

export async function createClientLead(workspaceId, lead) {
  const workspace = await resolveWorkspace(workspaceId);
  const contact = await resolveLeadContact(workspace, lead);

  if (!lead?.title?.trim()) {
    throw new Error("Lead title is required.");
  }

  const status = lead.status || "new";

  const payload = cleanPayload({
    workspace_id: workspace.workspaceId,
    contact_id: contact.id,
    title: lead.title.trim(),
    source: lead.source || "manual",
    status,
    notes: lead.notes || null,
    estimated_value: Number(lead.estimated_value || 0),
    probability: Number(
      lead.probability ?? CLIENT_LEAD_STAGE_PROBABILITIES[status] ?? 0
    ),
    created_by: workspace.userId,
    archived_at: null,
    archived_by: null,
    ...buildAssignmentPayload(lead, workspace.userId),
  });

  const { data, error } = await supabase
    .from("client_leads")
    .insert(payload)
    .select(buildLeadSelect())
    .single();

  if (error) throw error;

  return normalizeClientLead(data);
}

export async function updateClientLead(id, workspaceId, lead) {
  if (!id) throw new Error("Lead ID is required.");

  const workspace = await resolveWorkspace(workspaceId);

  let contactId = lead.contact_id;

  if (lead.contact_mode === "manual") {
    const contact = await createManualClientContact(
      workspace,
      lead.contact,
      lead.source || "manual"
    );

    contactId = contact.id;
  }

  const nextStatus = lead.status;

  const payload = cleanPayload({
    contact_id: contactId,
    title: lead.title,
    source: lead.source,
    status: nextStatus,
    notes: lead.notes,
    estimated_value:
      lead.estimated_value !== undefined
        ? Number(lead.estimated_value || 0)
        : undefined,
    probability:
      lead.probability !== undefined
        ? Number(lead.probability || 0)
        : nextStatus
          ? CLIENT_LEAD_STAGE_PROBABILITIES[nextStatus]
          : undefined,
    ...(lead.assignment_type
      ? buildAssignmentPayload(lead, workspace.userId)
      : {}),
  });

  const { data, error } = await supabase
    .from("client_leads")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .select(buildLeadSelect())
    .single();

  if (error) throw error;

  return normalizeClientLead(data);
}

export async function archiveClientLead(id, workspaceId) {
  if (!id) throw new Error("Lead ID is required.");

  const workspace = await resolveWorkspace(workspaceId);

  const { data, error } = await supabase
    .from("client_leads")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: workspace.userId,
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .select(buildLeadSelect())
    .single();

  if (error) throw error;

  return normalizeClientLead(data);
}

export async function restoreClientLead(id, workspaceId) {
  if (!id) throw new Error("Lead ID is required.");

  const workspace = await resolveWorkspace(workspaceId);

  const { data, error } = await supabase
    .from("client_leads")
    .update({
      status: "new",
      archived_at: null,
      archived_by: null,
    })
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .select(buildLeadSelect())
    .single();

  if (error) throw error;

  return normalizeClientLead(data);
}

export async function deleteClientLead() {
  throw new Error("Client leads cannot be deleted. Archive the lead instead.");
}

export async function updateClientLeadStage(id, workspaceId, status) {
  return updateClientLead(id, workspaceId, {
    status,
    probability: CLIENT_LEAD_STAGE_PROBABILITIES[status] ?? 0,
  });
}

export async function updateClientLeadAssignment(id, workspaceId, assignment) {
  return updateClientLead(id, workspaceId, assignment);
}

export async function convertClientLeadToDeal(id, workspaceId, options = {}) {
  if (!id) throw new Error("Lead ID is required.");

  const workspace = await resolveWorkspace(workspaceId);

  const { data: lead, error: leadError } = await supabase
    .from("client_leads")
    .select(buildLeadSelect())
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) throw new Error("Lead not found.");

  if (lead.status === "converted") {
    throw new Error("This lead is already converted.");
  }

  const expectedRevenue = Number(
    options.expected_revenue ?? lead.estimated_value ?? 0
  );

  const dealPayload = cleanPayload({
    workspace_id: workspace.workspaceId,
    lead_id: lead.id,
    contact_id: lead.contact_id,
    title: options.title || `${lead.title || "Lead"} Deal`,
    stage: options.stage || "qualified",
    expected_revenue: expectedRevenue,
    probability: Number(options.probability ?? 60),
    status: "open",
    expected_close_date: options.expected_close_date || null,
    description: options.description || lead.notes || null,
    source: lead.source || "manual",
    created_by: workspace.userId,
    assignment_type: options.assignment_type || lead.assignment_type || "self",
    assigned_user_id:
      options.assigned_user_id !== undefined
        ? options.assigned_user_id
        : lead.assigned_user_id,
    assigned_contact_id:
      options.assigned_contact_id !== undefined
        ? options.assigned_contact_id
        : lead.assigned_contact_id,
    assigned_name:
      options.assigned_name !== undefined
        ? options.assigned_name
        : lead.assigned_name,
    archived_at: null,
    archived_by: null,
  });

  const { data: deal, error: dealError } = await supabase
    .from("client_deals")
    .insert(dealPayload)
    .select("*")
    .single();

  if (dealError) throw dealError;

  const updatedLead = await updateClientLead(id, workspace.workspaceId, {
    status: "converted",
    probability: 100,
  });

  return {
    lead: updatedLead,
    deal,
  };
}

export function filterClientLeads(leads, filters = {}) {
  return leads.filter((lead) => {
    if (lead.archived_at) return false;

    const search = String(filters.search || "").toLowerCase();

    const matchesSearch =
      !search ||
      String(lead.name || "").toLowerCase().includes(search) ||
      String(lead.title || "").toLowerCase().includes(search) ||
      String(lead.contact_name || "").toLowerCase().includes(search) ||
      String(lead.company || "").toLowerCase().includes(search) ||
      String(lead.email || "").toLowerCase().includes(search);

    const matchesStage =
      !filters.stage ||
      filters.stage === "all" ||
      lead.stage === filters.stage ||
      lead.status === filters.stage;

    const matchesSource =
      !filters.source ||
      filters.source === "all" ||
      lead.source === filters.source;

    const matchesOwner =
      !filters.owner ||
      filters.owner === "all" ||
      lead.owner === filters.owner ||
      lead.assigned_user_id === filters.owner ||
      lead.assigned_contact_id === filters.owner;

    return matchesSearch && matchesStage && matchesSource && matchesOwner;
  });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

export function formatShortCurrency(value) {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `₱${Math.round(value / 1000)}K`;
  return formatCurrency(value);
}
