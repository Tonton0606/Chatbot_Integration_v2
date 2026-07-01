import { supabase } from "../../config/supabaseClient";

export const DEFAULT_LANDING_MAP = {
  section_title: "Find Us",
  section_subtitle: "Visit our location or contact us for directions.",
  location_name: "",
  full_address: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  business_hours: "",
  cta_text: "Get Directions",
  cta_link: "",
  marker_label: "Location",
  marker_popup: "",
  map_zoom: 15,
  map_theme: "standard",
  custom_color: "#c9930c",
  is_visible: true,
  section_order: 6,
};

const MAP_TABLE = "client_landingpage_map";
const SECTION_TABLE = "workspace_landing_sections";

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, fallback = null) {
  if (value === "" || value === null || value === undefined) return fallback;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

export function normalizeLandingMap(row = {}) {
  return {
    id: row.id || null,
    workspace_id: row.workspace_id || null,
    landing_page_id: row.landing_page_id || null,
    section_title: row.section_title || DEFAULT_LANDING_MAP.section_title,
    section_subtitle:
      row.section_subtitle || DEFAULT_LANDING_MAP.section_subtitle,
    location_name: row.location_name || "",
    full_address: row.full_address || "",
    latitude:
      row.latitude === null || row.latitude === undefined
        ? ""
        : String(row.latitude),
    longitude:
      row.longitude === null || row.longitude === undefined
        ? ""
        : String(row.longitude),
    phone: row.phone || "",
    email: row.email || "",
    business_hours: row.business_hours || "",
    cta_text: row.cta_text || DEFAULT_LANDING_MAP.cta_text,
    cta_link: row.cta_link || "",
    marker_label: row.marker_label || DEFAULT_LANDING_MAP.marker_label,
    marker_popup: row.marker_popup || "",
    map_zoom: normalizeNumber(row.map_zoom, DEFAULT_LANDING_MAP.map_zoom),
    map_theme: row.map_theme || DEFAULT_LANDING_MAP.map_theme,
    custom_color: row.custom_color || DEFAULT_LANDING_MAP.custom_color,
    is_visible: normalizeBoolean(row.is_visible, true),
    section_order: normalizeNumber(
      row.section_order,
      DEFAULT_LANDING_MAP.section_order
    ),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function buildLandingMapPayload(payload = {}) {
  return {
    workspace_id: payload.workspace_id,
    landing_page_id: payload.landing_page_id,
    section_title:
      cleanText(payload.section_title) || DEFAULT_LANDING_MAP.section_title,
    section_subtitle: cleanText(payload.section_subtitle),
    location_name: cleanText(payload.location_name),
    full_address: cleanText(payload.full_address),
    latitude: normalizeNumber(payload.latitude, null),
    longitude: normalizeNumber(payload.longitude, null),
    phone: cleanText(payload.phone),
    email: cleanText(payload.email),
    business_hours: cleanText(payload.business_hours),
    cta_text: cleanText(payload.cta_text),
    cta_link: cleanText(payload.cta_link),
    marker_label: cleanText(payload.marker_label),
    marker_popup: cleanText(payload.marker_popup),
    map_zoom: normalizeNumber(payload.map_zoom, DEFAULT_LANDING_MAP.map_zoom),
    map_theme: cleanText(payload.map_theme) || DEFAULT_LANDING_MAP.map_theme,
    custom_color:
      cleanText(payload.custom_color) || DEFAULT_LANDING_MAP.custom_color,
    is_visible: normalizeBoolean(payload.is_visible, true),
    section_order: normalizeNumber(
      payload.section_order,
      DEFAULT_LANDING_MAP.section_order
    ),
  };
}

export function hasLandingMapCoordinates(mapConfig = {}) {
  return (
    Number.isFinite(Number(mapConfig.latitude)) &&
    Number.isFinite(Number(mapConfig.longitude))
  );
}

async function getMapSection(landingPageId) {
  const { data, error } = await supabase
    .from(SECTION_TABLE)
    .select("*")
    .eq("landing_page_id", landingPageId)
    .eq("section_type", "map")
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getSectionCount(landingPageId) {
  const { count, error } = await supabase
    .from(SECTION_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("landing_page_id", landingPageId);

  if (error) throw error;
  return Number(count || 0);
}

function buildMapSectionPayload(mapConfig = {}) {
  return {
    source: "client_landingpage_map",
    title: mapConfig.section_title,
    subtitle: mapConfig.section_subtitle,
    description: mapConfig.full_address,
    map_config: normalizeLandingMap(mapConfig),
  };
}

export async function getLandingMapConfig({ workspaceId, landingPageId }) {
  requireValue(workspaceId, "workspaceId is required.");
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from(MAP_TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("landing_page_id", landingPageId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeLandingMap(data) : null;
}

export async function ensureLandingMapSection(mapConfig = {}) {
  requireValue(mapConfig.landing_page_id, "landing_page_id is required.");

  const normalized = normalizeLandingMap(mapConfig);
  const existingSection = await getMapSection(normalized.landing_page_id);
  const sectionPayload = buildMapSectionPayload(normalized);

  if (existingSection) {
    const { data, error } = await supabase
      .from(SECTION_TABLE)
      .update({
        title: normalized.section_title,
        subtitle: normalized.section_subtitle,
        description: normalized.full_address,
        enabled: normalized.is_visible,
        order_index: normalized.section_order,
        payload: {
          ...(existingSection.payload || {}),
          ...sectionPayload,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSection.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const fallbackOrder = await getSectionCount(normalized.landing_page_id);

  const { data, error } = await supabase
    .from(SECTION_TABLE)
    .insert({
      landing_page_id: normalized.landing_page_id,
      template_key: null,
      section_type: "map",
      title: normalized.section_title,
      subtitle: normalized.section_subtitle,
      description: normalized.full_address,
      image_url: null,
      payload: sectionPayload,
      order_index: Number.isFinite(Number(normalized.section_order))
        ? Number(normalized.section_order)
        : fallbackOrder,
      enabled: normalized.is_visible,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function saveLandingMapConfig(payload = {}) {
  requireValue(payload.workspace_id, "workspace_id is required.");
  requireValue(payload.landing_page_id, "landing_page_id is required.");

  const cleanPayload = buildLandingMapPayload(payload);
  const existing = await getLandingMapConfig({
    workspaceId: cleanPayload.workspace_id,
    landingPageId: cleanPayload.landing_page_id,
  });

  let saved;

  if (existing?.id) {
    const { data, error } = await supabase
      .from(MAP_TABLE)
      .update({
        ...cleanPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from(MAP_TABLE)
      .insert(cleanPayload)
      .select("*")
      .single();

    if (error) throw error;
    saved = data;
  }

  const normalized = normalizeLandingMap(saved);
  await ensureLandingMapSection(normalized);

  return normalized;
}

export async function syncLandingMapSectionState(section = {}) {
  if (!section?.landing_page_id || section.section_type !== "map") {
    return null;
  }

  const mapConfig = section.payload?.map_config;

  if (!mapConfig?.workspace_id) {
    return null;
  }

  return saveLandingMapConfig({
    ...mapConfig,
    section_title: section.title || mapConfig.section_title,
    section_subtitle: section.subtitle || mapConfig.section_subtitle,
    full_address: section.description || mapConfig.full_address,
    is_visible: section.enabled !== false,
    section_order: Number(section.order_index || 0),
  });
}

