import { supabase } from "../../config/supabaseClient";

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Converted",
  "Lost",
];

export const LEAD_SOURCES = [
  "manual",
  "website",
  "facebook",
  "referral",
  "email_campaign",
  "linkedin",
  "landing_page",
  "demo_request",
  "demo_booking",
];

export const LEAD_OWNERS = ["Unassigned"];

export const STAGE_COLORS = {
  New: "var(--brand-gold)",
  Contacted: "var(--brand-gold)",
  Qualified: "var(--success)",
  Proposal: "var(--brand-gold)",
  Converted: "var(--success)",
  Lost: "var(--danger)",
};

export const LEAD_AI_INSIGHTS = {};

const STATUS_MAP = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  converted: "Converted",
  lost: "Lost",
};

const STAGE_TO_STATUS = {
  New: "new",
  Contacted: "contacted",
  Qualified: "qualified",
  Proposal: "proposal",
  Converted: "converted",
  Lost: "lost",
};

function normalizeLead(row) {
  const contact = row.contact || {};
  const admin = row.assigned_admin || {};

  return {
    id: row.id,
    contact_id: row.contact_id,

    name: row.title || "Untitled Lead",
    company: contact.company_name || "",
    contact_name: contact.full_name || "Unnamed Contact",
    email: contact.email || "",
    phone: contact.phone || "",

    source: row.source || "manual",
    stage: STATUS_MAP[row.status] || "New",
    score:
      row.status === "converted"
        ? 100
        : row.status === "qualified"
          ? 75
          : row.status === "contacted"
            ? 50
            : row.status === "proposal"
              ? 85
              : row.status === "lost"
                ? 0
                : 25,

    estimated_value: Number(row.estimated_value || 0),
    status: row.status || "new",
    interest: row.title || "General Inquiry",
    notes: row.notes || "",

    assigned_admin_id: row.assigned_admin_id || null,
    owner: admin.full_name || "Unassigned",

    created_at: row.created_at,
    updated_at: row.updated_at,
    last_contacted_at: row.updated_at || row.created_at,
    next_follow_up_at: null,

    activities: [],
  };
}

export async function getAssignableAdmins() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data || []).filter((profile) =>
    ["admin", "superadmin", "super_admin"].includes(
      String(profile.role || "").toLowerCase()
    )
  );
}

export async function getLeadsPipelineData() {
  const { data, error } = await supabase
    .from("crm_leads")
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      assigned_admin:profiles!crm_leads_assigned_admin_fk(
        id,
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeLead);
}

export function filterLeads(leads, filters) {
  return leads.filter((lead) => {
    const search = (filters.search || "").toLowerCase();

    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search) ||
      lead.contact_name.toLowerCase().includes(search) ||
      lead.company.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search);

    const matchesStage =
      filters.stage === "all" || lead.stage === filters.stage;

    const matchesSource =
      filters.source === "all" || lead.source === filters.source;

    const matchesOwner =
      filters.owner === "all" || lead.owner === filters.owner;

    return matchesSearch && matchesStage && matchesSource && matchesOwner;
  });
}

export async function updateLeadStage(leadId, stage) {
  if (!leadId) throw new Error("Lead ID is required.");

  const status = STAGE_TO_STATUS[stage] || stage;

  const { data, error } = await supabase
    .from("crm_leads")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      assigned_admin:profiles!crm_leads_assigned_admin_fk(
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) throw error;

  return normalizeLead(data);
}

export async function updateLeadOwner(leadId, assignedAdminId) {
  if (!leadId) throw new Error("Lead ID is required.");

  const { data, error } = await supabase
    .from("crm_leads")
    .update({
      assigned_admin_id: assignedAdminId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      assigned_admin:profiles!crm_leads_assigned_admin_fk(
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) throw error;

  return normalizeLead(data);
}

export async function convertLeadToOpportunity(leadId, options = {}) {
  if (!leadId) throw new Error("Lead ID is required.");

  const { data: lead, error: leadError } = await supabase
    .from("crm_leads")
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        phone,
        company_name
      )
    `)
    .eq("id", leadId)
    .single();

  if (leadError) throw leadError;
  if (!lead) throw new Error("Lead not found.");
  if (lead.status === "converted") {
    throw new Error("This lead has already been converted.");
  }

  const { data: qualifiedStage, error: stageError } = await supabase
    .from("crm_stages")
    .select("id, probability")
    .eq("key", "qualified")
    .maybeSingle();

  if (stageError) throw stageError;

  const expectedRevenue = Number(options.expected_revenue || 0);

  const opportunityTitle =
    options.title ||
    (lead.contact?.company_name
      ? `${lead.contact.company_name} Opportunity`
      : lead.contact?.full_name
        ? `${lead.contact.full_name} Opportunity`
        : "New Opportunity");

  const assignedAdminId =
    options.assigned_admin_id || lead.assigned_admin_id || null;

  const { data: opportunity, error: opportunityError } = await supabase
    .from("crm_opportunities")
    .insert({
      lead_id: lead.id,
      contact_id: lead.contact_id,
      stage_id: qualifiedStage?.id || null,
      title: opportunityTitle,
      expected_revenue: expectedRevenue,
      probability: qualifiedStage?.probability || 30,
      status: "open",
      expected_close_date: options.expected_close_date || null,
      description: options.description || lead.notes || null,
      assigned_admin_id: assignedAdminId,
      source: lead.source || "manual",
    })
    .select("*")
    .single();

  if (opportunityError) throw opportunityError;

  const { data: updatedLead, error: updateError } = await supabase
    .from("crm_leads")
    .update({
      status: "converted",
      assigned_admin_id: assignedAdminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id)
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      assigned_admin:profiles!crm_leads_assigned_admin_fk(
        id,
        full_name,
        email
      )
    `)
    .single();

  if (updateError) throw updateError;

  return {
    lead: normalizeLead(updatedLead),
    opportunity,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}
