import { supabase } from "../../config/supabaseClient";
import { syncLandingMapSectionState } from "./landingMap";

export const DEFAULT_SECTION_TYPES = new Set([
  "hero",
  "about",
  "services",
  "booking",
  "map",
  "faq",
  "contact",
]);

const SINGLETON_SECTION_TYPES = new Set([
  "hero",
  "about",
  "booking",
  "faq",
  "contact",
]);

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function isDefaultLandingSection(section = {}) {
  if (
    ["hero", "about", "booking", "faq", "contact"].includes(
      section.section_type
    )
  ) {
    return true;
  }

  return section.section_type === "services" && !section.template_key;
}

export function canDeleteLandingSection(section = {}) {
  return !isDefaultLandingSection(section);
}

function normalizeSectionPayload(payload = {}) {
  return {
    landing_page_id: payload.landing_page_id,
    template_key: payload.template_key || null,
    section_type: payload.section_type || "custom",
    title: payload.title || null,
    subtitle: payload.subtitle || null,
    description: payload.description || null,
    image_url: payload.image_url || null,
    payload: isPlainObject(payload.payload) ? payload.payload : {},
    order_index: Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0,
    enabled:
      payload.enabled === undefined
        ? true
        : Boolean(payload.enabled),
  };
}

function buildSectionUpdatePayload(payload = {}) {
  const update = {};

  if ("template_key" in payload) {
    update.template_key = payload.template_key || null;
  }

  if ("section_type" in payload) {
    update.section_type = payload.section_type || "custom";
  }

  if ("title" in payload) {
    update.title = payload.title || null;
  }

  if ("subtitle" in payload) {
    update.subtitle = payload.subtitle || null;
  }

  if ("description" in payload) {
    update.description = payload.description || null;
  }

  if ("image_url" in payload) {
    update.image_url = payload.image_url || null;
  }

  if ("payload" in payload) {
    update.payload = isPlainObject(payload.payload) ? payload.payload : {};
  }

  if ("order_index" in payload) {
    update.order_index = Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0;
  }

  if ("enabled" in payload) {
    update.enabled = Boolean(payload.enabled);
  }

  update.updated_at = new Date().toISOString();

  return update;
}

async function getExistingSectionByType(landingPageId, sectionType) {
  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .eq("section_type", sectionType)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.section_type === "map") {
    await syncLandingMapSectionState(data);
  }

  return data;
}

async function getSectionById(id) {
  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getSectionTypes({ status = "active" } = {}) {
  const { data, error } = await supabase
    .from("landing_section_types")
    .select("*")
    .eq("status", status)
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLandingSections(
  landingPageId,
  { enabledOnly = false, includeArchived = false } = {}
) {
  requireValue(landingPageId, "landingPageId is required.");

  let query = supabase
    .from("workspace_landing_sections")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .order("order_index", { ascending: true });

  if (enabledOnly) {
    query = query.eq("enabled", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const sections = data || [];

  if (includeArchived) {
    return sections;
  }

  return sections.filter((section) => section.payload?.archived !== true);
}

export async function createLandingSection(payload) {
  requireValue(payload?.landing_page_id, "landing_page_id is required.");
  requireValue(payload?.section_type, "section_type is required.");

  if (SINGLETON_SECTION_TYPES.has(payload.section_type)) {
    const existingSection = await getExistingSectionByType(
      payload.landing_page_id,
      payload.section_type
    );

    if (existingSection && existingSection.payload?.archived !== true) {
      return existingSection;
    }
  }

  const cleanPayload = normalizeSectionPayload(payload);

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLandingSection(id, payload) {
  requireValue(id, "section id is required.");

  const cleanPayload = buildSectionUpdatePayload(payload);

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function toggleLandingSection(id, enabled) {
  requireValue(id, "section id is required.");

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .update({
      enabled: Boolean(enabled),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function reorderLandingSections(sections = []) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return [];
  }

  const results = await Promise.all(
    sections.map((section, index) =>
      supabase
        .from("workspace_landing_sections")
        .update({
          order_index: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id)
        .select("*")
        .single()
    )
  );

  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) {
    throw failedResult.error;
  }

  const updatedSections = results.map((result) => result.data);

  await Promise.all(
    updatedSections
      .filter((section) => section?.section_type === "map")
      .map((section) => syncLandingMapSectionState(section))
  );

  return updatedSections;
}

export async function archiveLandingSection(id) {
  requireValue(id, "section id is required.");

  const section = await getSectionById(id);

  if (isDefaultLandingSection(section)) {
    throw new Error(
      "Default landing sections cannot be deleted. Hide this section instead."
    );
  }

  const payload = {
    ...(section?.payload || {}),
    archived: true,
    archived_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .update({
      enabled: false,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteLandingSection(id, { hardDelete = false } = {}) {
  requireValue(id, "section id is required.");

  const section = await getSectionById(id);

  if (isDefaultLandingSection(section)) {
    throw new Error(
      "Default landing sections cannot be deleted. Hide this section instead."
    );
  }

  if (!hardDelete) {
    return archiveLandingSection(id);
  }

  const { error } = await supabase
    .from("workspace_landing_sections")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

export function buildDefaultSectionPayload(sectionType) {
  const defaults = {
    hero: {
      headline: "",
      subheadline: "",
      cta_label: "Book Consultation",
    },
    about: {
      title: "About Us",
      body: "",
    },
    services: {
      title: "Our Services",
      subtitle: "Choose the service that fits your needs.",
    },
    map: {
      title: "Find Us",
      subtitle: "Visit our location or contact us for directions.",
      map_config: {},
    },
    gallery: {
      title: "Gallery",
      images: [],
    },
    testimonials: {
      title: "What Clients Say",
      items: [],
    },
    faq: {
      title: "Frequently Asked Questions",
      faqs: [],
      items: [],
    },
    booking: {
      title: "Book an Appointment",
      subtitle: "Choose your preferred schedule.",
    },
    pricing: {
      title: "Pricing",
      items: [],
    },
    team: {
      title: "Meet the Team",
      members: [],
    },
    portfolio: {
      title: "Portfolio",
      items: [],
    },
    products: {
      title: "Products",
      items: [],
    },
    contact: {
      title: "Contact Us",
      body: "",
    },
    timeline: {
      title: "Our Process",
      items: [],
    },
    stats: {
      items: [],
    },
    custom: {
      title: "Custom Section",
      body: "",
    },
  };

  return defaults[sectionType] || {};
}
