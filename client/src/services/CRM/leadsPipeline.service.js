/**
 * Leads Pipeline Service
 * Normalized service layer for Leads Pipeline module.
 * Currently returns MOCK DATA.
 * Replace with real backend calls without UI changes.
 */

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

let mockLeadId = 1;
const MOCK_LEADS = [
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c1",
    name: "Website Redesign Inquiry",
    company: "Acme Corporation",
    contact_name: "Juan Dela Cruz",
    email: "juan@acme.ph",
    phone: "+63 912 345 6789",
    source: "website",
    stage: "Qualified",
    score: 75,
    estimated_value: 450000,
    status: "qualified",
    interest: "Full website redesign and CMS migration.",
    notes: "Referred by existing client. Budget confirmed.",
    assigned_admin_id: "admin_1",
    owner: "Alice Manager",
    created_at: "2026-04-01T08:00:00Z",
    updated_at: "2026-05-20T14:30:00Z",
    last_contacted_at: "2026-05-20T14:30:00Z",
    next_follow_up_at: "2026-05-25T10:00:00Z",
    activities: [],
  },
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c2",
    name: "CRM Integration Project",
    company: "TechStart PH",
    contact_name: "Maria Santos",
    email: "maria@techstart.ph",
    phone: "+63 917 123 4567",
    source: "referral",
    stage: "Proposal",
    score: 85,
    estimated_value: 320000,
    status: "proposal",
    interest: "Salesforce integration with custom API.",
    notes: "Proposal sent. Awaiting feedback.",
    assigned_admin_id: "admin_2",
    owner: "Bob Sales",
    created_at: "2026-03-15T09:00:00Z",
    updated_at: "2026-05-18T09:15:00Z",
    last_contacted_at: "2026-05-18T09:15:00Z",
    next_follow_up_at: "2026-05-24T14:00:00Z",
    activities: [],
  },
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c3",
    name: "Digital Marketing Retainer",
    company: "GlobalEx Inc.",
    contact_name: "Robert Lim",
    email: "robert@globalex.ph",
    phone: "+63 919 876 5432",
    source: "linkedin",
    stage: "Contacted",
    score: 50,
    estimated_value: 850000,
    status: "contacted",
    interest: "12-month digital marketing retainer.",
    notes: "Initial call completed. Needs case studies.",
    assigned_admin_id: null,
    owner: "Unassigned",
    created_at: "2026-05-01T07:00:00Z",
    updated_at: "2026-05-10T11:00:00Z",
    last_contacted_at: "2026-05-10T11:00:00Z",
    next_follow_up_at: "2026-05-26T09:00:00Z",
    activities: [],
  },
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c4",
    name: "Security Audit Request",
    company: "MetroBank",
    contact_name: "Ana Reyes",
    email: "ana@metrobank.ph",
    phone: "+63 915 234 5678",
    source: "cold_outreach",
    stage: "Converted",
    score: 100,
    estimated_value: 1200000,
    status: "converted",
    interest: "Comprehensive security audit and penetration testing.",
    notes: "Converted to opportunity on Apr 1.",
    assigned_admin_id: "admin_1",
    owner: "Alice Manager",
    created_at: "2026-01-20T08:30:00Z",
    updated_at: "2026-04-01T12:00:00Z",
    last_contacted_at: "2026-04-01T12:00:00Z",
    next_follow_up_at: null,
    activities: [],
  },
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c5",
    name: "Mobile App Development",
    company: "PinoyEats",
    contact_name: "Carlos Mendoza",
    email: "carlos@pinoyeats.ph",
    phone: "+63 918 345 6789",
    source: "event",
    stage: "New",
    score: 25,
    estimated_value: 680000,
    status: "new",
    interest: "Food delivery mobile application.",
    notes: "Met at startup summit. Needs follow-up.",
    assigned_admin_id: null,
    owner: "Unassigned",
    created_at: "2026-05-15T10:00:00Z",
    updated_at: "2026-05-15T10:00:00Z",
    last_contacted_at: "2026-05-15T10:00:00Z",
    next_follow_up_at: "2026-05-27T09:00:00Z",
    activities: [],
  },
  {
    id: `lead_${mockLeadId++}`,
    contact_id: "c6",
    name: "Patient Portal",
    company: "HealthPlus Medical",
    contact_name: "Dr. Lisa Tan",
    email: "lisa@healthplus.ph",
    phone: "+63 916 789 0123",
    source: "referral",
    stage: "Lost",
    score: 0,
    estimated_value: 550000,
    status: "lost",
    interest: "Patient portal with appointment scheduling.",
    notes: "Budget freeze. Re-engage in Q3.",
    assigned_admin_id: "admin_2",
    owner: "Bob Sales",
    created_at: "2025-12-01T09:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    last_contacted_at: "2026-03-01T10:00:00Z",
    next_follow_up_at: null,
    activities: [],
  },
];

const MOCK_ADMINS = [
  { id: "admin_1", full_name: "Alice Manager", email: "alice@exponify.ph", role: "Admin", status: "active" },
  { id: "admin_2", full_name: "Bob Sales", email: "bob@exponify.ph", role: "Admin", status: "active" },
  { id: "admin_3", full_name: "Charlie Director", email: "charlie@exponify.ph", role: "SuperAdmin", status: "active" },
];

/**
 * Fetch all assignable admins.
 */
export async function getAssignableAdmins() {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_ADMINS;
}

/**
 * Fetch all leads pipeline data.
 */
export async function getLeadsPipelineData() {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return MOCK_LEADS.slice();
}

/**
 * Filter leads by search, stage, source, and owner.
 */
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

/**
 * Update a lead's stage.
 */
export async function updateLeadStage(leadId, stage) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const idx = MOCK_LEADS.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead not found.");

  const status = STAGE_TO_STATUS[stage] || stage;
  const scoreMap = {
    new: 25,
    contacted: 50,
    qualified: 75,
    proposal: 85,
    converted: 100,
    lost: 0,
  };

  MOCK_LEADS[idx] = {
    ...MOCK_LEADS[idx],
    stage,
    status,
    score: scoreMap[status] ?? 25,
    updated_at: new Date().toISOString(),
  };

  return MOCK_LEADS[idx];
}

/**
 * Update a lead's assigned owner.
 */
export async function updateLeadOwner(leadId, assignedAdminId) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const idx = MOCK_LEADS.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead not found.");

  const admin = MOCK_ADMINS.find((a) => a.id === assignedAdminId);

  MOCK_LEADS[idx] = {
    ...MOCK_LEADS[idx],
    assigned_admin_id: assignedAdminId || null,
    owner: admin?.full_name || "Unassigned",
    updated_at: new Date().toISOString(),
  };

  return MOCK_LEADS[idx];
}

/**
 * Convert a lead to an opportunity.
 */
export async function convertLeadToOpportunity(leadId, options = {}) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const idx = MOCK_LEADS.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead not found.");

  const lead = MOCK_LEADS[idx];
  if (lead.status === "converted") {
    throw new Error("This lead has already been converted.");
  }

  const expectedRevenue = Number(options.expected_revenue || lead.estimated_value || 0);
  const opportunityTitle =
    options.title ||
    (lead.company ? `${lead.company} Opportunity` : `${lead.contact_name} Opportunity`);

  const opportunity = {
    id: `opp_${Date.now()}`,
    lead_id: lead.id,
    contact_id: lead.contact_id,
    title: opportunityTitle,
    expected_revenue: expectedRevenue,
    probability: 30,
    status: "open",
    expected_close_date: options.expected_close_date || null,
    description: options.description || lead.notes || null,
    assigned_admin_id: options.assigned_admin_id || lead.assigned_admin_id || null,
    source: lead.source || "manual",
    created_at: new Date().toISOString(),
  };

  MOCK_LEADS[idx] = {
    ...lead,
    status: "converted",
    stage: "Converted",
    score: 100,
    updated_at: new Date().toISOString(),
  };

  return {
    lead: MOCK_LEADS[idx],
    opportunity,
  };
}

/**
 * Format a value as Philippine Peso currency.
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}
