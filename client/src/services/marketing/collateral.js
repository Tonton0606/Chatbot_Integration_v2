import { supabase } from "../../config/supabaseClient";

const TABLE = "marketing_collateral_links";

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    url: row.url || "",
    type: row.asset_type || "design",
    description: row.description || "",
    date: row.created_at ? row.created_at.slice(0, 10) : "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

function toPayload(collateral, userId) {
  return {
    title: String(collateral.title || "").trim(),
    url: normalizeUrl(collateral.url),
    asset_type: collateral.type || "design",
    description: String(collateral.description || "").trim() || null,
    created_by: userId || null,
  };
}

export async function fetchMarketingCollateralLinks(filters = {}) {
  let query = supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.type && filters.type !== "all") {
    query = query.eq("asset_type", filters.type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createMarketingCollateralLink(collateral, userId) {
  const payload = toPayload(collateral, userId);

  if (!payload.title) throw new Error("Asset title is required.");
  if (!payload.url) throw new Error("Embedded URL is required.");

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function updateMarketingCollateralLink(id, collateral) {
  const payload = toPayload(collateral);
  delete payload.created_by;

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteMarketingCollateralLink(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export function subscribeToMarketingCollateralLinks(callback) {
  if (!supabase.channel) {
    return { unsubscribe: () => {} };
  }

  return supabase
    .channel("marketing_collateral_links_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      callback
    )
    .subscribe();
}
