import { supabase } from "../../config/supabaseClient";

export const CONTACT_TYPES = ["person", "company"];

export const CONTACT_STATUSES = ["lead", "prospect", "customer", "archived"];

export const CONTACT_SOURCES = [
  "manual",
  "referral",
  "website",
  "social_media",
  "cold_outreach",
  "event",
];

function normalizeContact(contact) {
  const relatedDeals = contact.related_deals || contact.crm_opportunities || [];

  return {
    id: contact.id,
    name: contact.full_name || "Unnamed Contact",
    company: contact.company_name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    type: contact.company_name ? "person" : "company",
    status: contact.status || "lead",
    source: contact.source || "manual",
    job_title: "",
    tags: [],
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    last_activity_at: contact.updated_at || contact.created_at,
    related_deals: relatedDeals.map((deal) => ({
      id: deal.id,
      title: deal.title || "Untitled Deal",
      value: Number(deal.expected_revenue || 0),
      status: deal.status || "open",
    })),
    activities: [],
  };
}

export async function getContactsData() {
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select(`
      id,
      client_code,
      full_name,
      email,
      phone,
      company_name,
      source,
      status,
      assigned_admin_id,
      created_at,
      updated_at,
      crm_opportunities (
        id,
        title,
        expected_revenue,
        status,
        created_at,
        updated_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    contacts: (contacts || []).map(normalizeContact),
    types: CONTACT_TYPES,
    statuses: CONTACT_STATUSES,
    sources: CONTACT_SOURCES,
  };
}

export async function createContact(contact) {
  const payload = {
    full_name: contact.name || contact.full_name,
    email: contact.email,
    phone: contact.phone || null,
    company_name: contact.company || contact.company_name || null,
    source: contact.source || "manual",
    status: contact.status || "lead",
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeContact(data);
}

export async function updateContact(id, data) {
  const payload = {
    full_name: data.name ?? data.full_name,
    email: data.email,
    phone: data.phone,
    company_name: data.company ?? data.company_name,
    source: data.source,
    status: data.status,
    updated_at: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const { data: updated, error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeContact(updated);
}

export async function deleteContact(id) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) throw error;

  return { id };
}

export async function archiveContact(id) {
  return updateContact(id, {
    status: "archived",
  });
}
