import { supabase } from "../../config/supabaseClient";

export const DEAL_STAGE_COLORS = {
  new: "var(--brand-gold)",
  discovery: "var(--brand-gold)",
  qualified: "var(--brand-gold)",
  proposal: "var(--brand-gold)",
  negotiation: "var(--brand-gold)",
  won: "var(--success)",
  lost: "var(--danger)",
};

export const DEAL_SOURCES = [
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

const OWNER_REQUIRED_STAGE_KEYS = ["qualified", "proposal", "negotiation", "won"];

function normalizeDeal(opp) {
  const admin = opp.assigned_admin || {};

  return {
    id: opp.id,
    title: opp.title || "Untitled Deal",
    company: opp.contact?.company_name || "No company",
    contact_id: opp.contact?.id || opp.contact_id || null,
    contact_name: opp.contact?.full_name || "Unknown contact",
    email: opp.contact?.email || "",
    phone: opp.contact?.phone || "",

    assigned_admin_id: opp.assigned_admin_id || null,
    owner: admin.full_name || "Unassigned",
    owner_email: admin.email || "",

    stage_id: opp.stage?.id || opp.stage_id || null,
    stage: opp.stage?.key || "new",
    stage_name: opp.stage?.name || "New",

    value: Number(opp.expected_revenue || 0),
    probability: Number(opp.probability ?? opp.stage?.probability ?? 0),
    source: opp.source || "manual",
    status: opp.status || "open",
    expected_close_date: opp.expected_close_date,
    description: opp.description || "",
    updated_at: opp.updated_at || opp.created_at,
    created_at: opp.created_at,

    tags: [],
    activities: [],
  };
}

function validateOwnerRequirement(payload, stages = []) {
  const stage = stages.find((item) => item.id === payload.stage_id);
  const stageKey = stage?.key;

  const ownerRequired =
    OWNER_REQUIRED_STAGE_KEYS.includes(stageKey) || payload.status === "won";

  if (ownerRequired && !payload.assigned_admin_id) {
    throw new Error(
      "Assign an owner before moving this deal to Qualified, Proposal, Negotiation, or Won."
    );
  }
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

export async function getDealMeta() {
  const [
    { data: stages, error: stagesError },
    { data: contacts, error: contactsError },
    { data: admins, error: adminsError },
  ] = await Promise.all([
    supabase
      .from("crm_stages")
      .select("*")
      .order("sort_order", { ascending: true }),

    supabase
      .from("contacts")
      .select("id, full_name, email, phone, company_name, source, status")
      .order("full_name", { ascending: true }),

    supabase
      .from("profiles")
      .select("id, full_name, email, role, status")
      .order("full_name", { ascending: true }),
  ]);

  if (stagesError) throw stagesError;
  if (contactsError) throw contactsError;
  if (adminsError) throw adminsError;

  const adminOptions = (admins || []).filter((profile) =>
    ["admin", "superadmin", "super_admin"].includes(
      String(profile.role || "").toLowerCase()
    )
  );

  return {
    stages: stages || [],
    contacts: contacts || [],
    admins: adminOptions,
    sources: DEAL_SOURCES,
  };
}

export async function getDealsData() {
  const [
    { data: stages, error: stagesError },
    { data: opportunities, error: opportunitiesError },
    { data: admins, error: adminsError },
  ] = await Promise.all([
    supabase
      .from("crm_stages")
      .select("*")
      .order("sort_order", { ascending: true }),

    supabase
      .from("crm_opportunities")
      .select(`
        id,
        title,
        contact_id,
        stage_id,
        expected_revenue,
        probability,
        status,
        source,
        description,
        expected_close_date,
        assigned_admin_id,
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
        ),
        assigned_admin:profiles!crm_opportunities_assigned_admin_fk (
          id,
          full_name,
          email
        )
      `)
      .order("updated_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("id, full_name, email, role, status")
      .order("full_name", { ascending: true }),
  ]);

  if (stagesError) throw stagesError;
  if (opportunitiesError) throw opportunitiesError;
  if (adminsError) throw adminsError;

  const adminOptions = (admins || []).filter((profile) =>
    ["admin", "superadmin", "super_admin"].includes(
      String(profile.role || "").toLowerCase()
    )
  );

  const stageKeys = (stages || []).map((stage) => stage.key);

  const stageLabels = (stages || []).reduce((acc, stage) => {
    acc[stage.key] = stage.name;
    return acc;
  }, {});

  const stageColors = (stages || []).reduce((acc, stage) => {
    acc[stage.key] = DEAL_STAGE_COLORS[stage.key] || "var(--brand-gold)";
    return acc;
  }, {});

  return {
    deals: (opportunities || []).map(normalizeDeal),
    stages: stageKeys,
    stageLabels,
    stageColors,
    salespersons: [
      "Unassigned",
      ...adminOptions.map((admin) => admin.full_name || admin.email),
    ],
    sources: DEAL_SOURCES,
    rawStages: stages || [],
    admins: adminOptions,
  };
}

export async function createDeal(deal) {
  const { data: stages, error: stagesError } = await supabase
    .from("crm_stages")
    .select("*");

  if (stagesError) throw stagesError;

  const payload = {
    title: deal.title,
    contact_id: deal.contact_id || null,
    stage_id: deal.stage_id || null,
    expected_revenue: deal.value || deal.expected_revenue || 0,
    probability: deal.probability || 0,
    status: deal.status || "open",
    source: deal.source || "manual",
    expected_close_date: deal.expected_close_date || null,
    description: deal.description || null,
    assigned_admin_id: deal.assigned_admin_id || null,
  };

  validateOwnerRequirement(payload, stages || []);

  const { data, error } = await supabase
    .from("crm_opportunities")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateDeal(id, data) {
  const { data: current, error: currentError } = await supabase
    .from("crm_opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) throw new Error("Deal not found.");

  const { data: stages, error: stagesError } = await supabase
    .from("crm_stages")
    .select("*");

  if (stagesError) throw stagesError;

  const payload = {
    title: data.title,
    contact_id: data.contact_id,
    stage_id: data.stage_id,
    expected_revenue: data.value ?? data.expected_revenue,
    probability: data.probability,
    status: data.status,
    source: data.source,
    expected_close_date: data.expected_close_date || null,
    description: data.description,
    assigned_admin_id: data.assigned_admin_id,
    updated_at: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const mergedPayload = {
    ...current,
    ...payload,
  };

  validateOwnerRequirement(mergedPayload, stages || []);

  const { data: updated, error } = await supabase
    .from("crm_opportunities")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;

  return updated;
}

export async function deleteDeal(id) {
  const { error } = await supabase
    .from("crm_opportunities")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return { id };
}

export async function markDealWon(id) {
  const { data: deal, error: dealError } = await supabase
    .from("crm_opportunities")
    .select("assigned_admin_id")
    .eq("id", id)
    .maybeSingle();

  if (dealError) throw dealError;

  if (!deal?.assigned_admin_id) {
    throw new Error("Assign an owner before marking this deal as won.");
  }

  const { data: wonStage, error } = await supabase
    .from("crm_stages")
    .select("id")
    .eq("is_won", true)
    .maybeSingle();

  if (error) throw error;

  return updateDeal(id, {
    status: "won",
    probability: 100,
    stage_id: wonStage?.id,
    assigned_admin_id: deal.assigned_admin_id,
  });
}

export async function markDealLost(id) {
  const { data: lostStage, error } = await supabase
    .from("crm_stages")
    .select("id")
    .eq("is_lost", true)
    .maybeSingle();

  if (error) throw error;

  return updateDeal(id, {
    status: "lost",
    probability: 0,
    stage_id: lostStage?.id,
  });
}
