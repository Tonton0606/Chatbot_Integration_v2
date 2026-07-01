/**
 * CRM Service
 * Normalized service layer for CRM module.
 * Currently returns MOCK DATA.
 * Replace with real backend calls without UI changes.
 */

const MOCK_STAGES = [
  { id: "stage_1", key: "new", name: "New", sort_order: 1, probability: 10, is_won: false, is_lost: false },
  { id: "stage_2", key: "qualified", name: "Qualified", sort_order: 2, probability: 30, is_won: false, is_lost: false },
  { id: "stage_3", key: "proposal", name: "Proposal", sort_order: 3, probability: 60, is_won: false, is_lost: false },
  { id: "stage_4", key: "negotiation", name: "Negotiation", sort_order: 4, probability: 80, is_won: false, is_lost: false },
  { id: "stage_5", key: "won", name: "Closed Won", sort_order: 5, probability: 100, is_won: true, is_lost: false },
  { id: "stage_6", key: "lost", name: "Closed Lost", sort_order: 6, probability: 0, is_won: false, is_lost: true },
];

const MOCK_OPPORTUNITIES = [
  {
    id: "opp_1",
    name: "Acme Corp Website Redesign",
    title: "Acme Corp Website Redesign",
    company: "Acme Corporation",
    contact: "Juan Dela Cruz",
    email: "juan@acme.ph",
    phone: "+63 912 345 6789",
    stage: "proposal",
    stageName: "Proposal",
    stageSortOrder: 3,
    revenue: 450000,
    probability: 60,
    status: "open",
    source: "referral",
    description: "Full website redesign and CMS migration.",
    expectedCloseDate: "2026-06-15",
    createdAt: "2026-03-10T08:00:00Z",
    updatedAt: "2026-05-20T14:30:00Z",
  },
  {
    id: "opp_2",
    name: "TechStart CRM Integration",
    title: "TechStart CRM Integration",
    company: "TechStart PH",
    contact: "Maria Santos",
    email: "maria@techstart.ph",
    phone: "+63 917 123 4567",
    stage: "qualified",
    stageName: "Qualified",
    stageSortOrder: 2,
    revenue: 320000,
    probability: 30,
    status: "open",
    source: "website",
    description: "Salesforce integration with custom API.",
    expectedCloseDate: "2026-07-01",
    createdAt: "2026-04-05T10:00:00Z",
    updatedAt: "2026-05-18T09:15:00Z",
  },
  {
    id: "opp_3",
    name: "GlobalEx Digital Marketing Retainer",
    title: "GlobalEx Digital Marketing Retainer",
    company: "GlobalEx Inc.",
    contact: "Robert Lim",
    email: "robert@globalex.ph",
    phone: "+63 919 876 5432",
    stage: "negotiation",
    stageName: "Negotiation",
    stageSortOrder: 4,
    revenue: 850000,
    probability: 80,
    status: "open",
    source: "linkedin",
    description: "12-month digital marketing retainer.",
    expectedCloseDate: "2026-05-30",
    createdAt: "2026-02-20T06:00:00Z",
    updatedAt: "2026-05-22T16:45:00Z",
  },
  {
    id: "opp_4",
    name: "MetroBank Security Audit",
    title: "MetroBank Security Audit",
    company: "MetroBank",
    contact: "Ana Reyes",
    email: "ana@metrobank.ph",
    phone: "+63 915 234 5678",
    stage: "won",
    stageName: "Closed Won",
    stageSortOrder: 5,
    revenue: 1200000,
    probability: 100,
    status: "won",
    source: "cold_outreach",
    description: "Comprehensive security audit and penetration testing.",
    expectedCloseDate: "2026-04-01",
    createdAt: "2026-01-15T08:30:00Z",
    updatedAt: "2026-04-01T12:00:00Z",
  },
  {
    id: "opp_5",
    name: "PinoyEats Mobile App",
    title: "PinoyEats Mobile App",
    company: "PinoyEats",
    contact: "Carlos Mendoza",
    email: "carlos@pinoyeats.ph",
    phone: "+63 918 345 6789",
    stage: "new",
    stageName: "New",
    stageSortOrder: 1,
    revenue: 680000,
    probability: 10,
    status: "open",
    source: "event",
    description: "Food delivery mobile application.",
    expectedCloseDate: "2026-08-15",
    createdAt: "2026-05-01T07:00:00Z",
    updatedAt: "2026-05-01T07:00:00Z",
  },
  {
    id: "opp_6",
    name: "HealthPlus Patient Portal",
    title: "HealthPlus Patient Portal",
    company: "HealthPlus Medical",
    contact: "Dr. Lisa Tan",
    email: "lisa@healthplus.ph",
    phone: "+63 916 789 0123",
    stage: "lost",
    stageName: "Closed Lost",
    stageSortOrder: 6,
    revenue: 550000,
    probability: 0,
    status: "lost",
    source: "referral",
    description: "Patient portal with appointment scheduling.",
    expectedCloseDate: "2026-03-01",
    createdAt: "2025-11-10T09:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
];

function buildRecentActivities(opportunities) {
  return opportunities
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
}

/**
 * Fetch CRM data (stages, opportunities, recent activities).
 * Replace mock with real Supabase call when backend is ready.
 */
export async function getCrmData() {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    stages: MOCK_STAGES,
    opportunities: MOCK_OPPORTUNITIES,
    recentActivities: buildRecentActivities(MOCK_OPPORTUNITIES),
  };
}

/**
 * Get opportunity detail by ID.
 */
export async function getOpportunityById(id) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const opp = MOCK_OPPORTUNITIES.find((o) => o.id === id);
  if (!opp) throw new Error("Opportunity not found.");
  return opp;
}

/**
 * Create a new opportunity.
 */
export async function createOpportunity(payload) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newOpp = {
    id: `opp_${Date.now()}`,
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_OPPORTUNITIES.unshift(newOpp);
  return newOpp;
}

/**
 * Update an existing opportunity.
 */
export async function updateOpportunity(id, updates) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const idx = MOCK_OPPORTUNITIES.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error("Opportunity not found.");
  MOCK_OPPORTUNITIES[idx] = {
    ...MOCK_OPPORTUNITIES[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return MOCK_OPPORTUNITIES[idx];
}

/**
 * Delete an opportunity.
 */
export async function deleteOpportunity(id) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const idx = MOCK_OPPORTUNITIES.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error("Opportunity not found.");
  MOCK_OPPORTUNITIES.splice(idx, 1);
  return { id };
}
