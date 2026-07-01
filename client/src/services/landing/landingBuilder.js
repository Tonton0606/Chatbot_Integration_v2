import { supabase } from "../../config/supabaseClient";

import { getTemplateByKey } from "./landingTemplates";
import { cloneTemplateCards } from "./landingServiceCards";
import { getDefaultThemeForIndustry } from "./landingThemes";
import {
  createBookingMapping,
  getDefaultBookingPresetForIndustry,
} from "./landingBooking";
import {
  buildDefaultSectionPayload,
  createLandingSection,
  getLandingSections,
} from "./landingSections";

/**
 * Hermes2 / ExponifyPH
 * Landing Builder Service
 *
 * Handles workspace landing creation, initialization, publishing,
 * and workspace landing retrieval.
 *
 * Important:
 * - Admin preset tables are never mutated here.
 * - Client/workspace changes only touch workspace-owned landing tables.
 * - workspace_landing_pages does not contain template_key, industry_key, or theme_key.
 */

const DEFAULT_SECTIONS = [
  "hero",
  "about",
  "services",
  "booking",
  "faq",
  "contact",
];

const SINGLETON_SECTIONS = new Set([
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

function slugify(text = "") {
  const slug = String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "landing-page";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

async function generateUniqueSlug(baseSlug) {
  const base = slugify(baseSlug);

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("slug")
    .ilike("slug", `${base}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set((data || []).map((row) => row.slug));

  if (!existingSlugs.has(base)) {
    return base;
  }

  let counter = 2;

  while (existingSlugs.has(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

function buildPagePayload({
  workspace_id,
  title,
  slug,
  template,
  theme,
  bookingPreset,
  created_by,
}) {
  const templatePayload = asObject(template?.default_payload);

  return {
    workspace_id,
    slug,
    title,

    logo_url: templatePayload.logo_url || null,
    hero_image_url:
      templatePayload.hero_image_url ||
      template?.preview_image_url ||
      null,

    headline:
      templatePayload.headline ||
      `Welcome to ${title}`,

    subheadline:
      templatePayload.subheadline ||
      template?.description ||
      null,

    primary_cta_label:
      templatePayload.primary_cta_label ||
      "Book Appointment",

    primary_color:
      theme?.accent_color ||
      templatePayload.primary_color ||
      "#c9930c",

    secondary_color:
      theme?.secondary_color ||
      templatePayload.secondary_color ||
      "#0f172a",

    about_title:
      templatePayload.about_title ||
      "About Us",

    about_content:
      templatePayload.about_content ||
      null,

    services:
      asArray(templatePayload.services),

    testimonials:
      asArray(templatePayload.testimonials),

    faqs:
      asArray(templatePayload.faqs),

    social_links:
      asObject(templatePayload.social_links),

    show_booking:
      templatePayload.show_booking === undefined
        ? true
        : Boolean(templatePayload.show_booking),

    booking_title:
      templatePayload.booking_title ||
      bookingPreset?.name ||
      "Book an Appointment",

    booking_description:
      templatePayload.booking_description ||
      bookingPreset?.description ||
      null,

    booking_platform:
      bookingPreset?.meeting_type ||
      templatePayload.booking_platform ||
      "google_meet",

    seo_title:
      templatePayload.seo_title ||
      title,

    seo_description:
      templatePayload.seo_description ||
      template?.description ||
      null,

    status: "draft",
    published: false,
    published_at: null,

    created_by: created_by || null,
    updated_by: created_by || null,

    theme_mode:
      theme?.theme_mode ||
      template?.theme_mode ||
      templatePayload.theme_mode ||
      "dark",

    layout_template:
      template?.layout_template ||
      templatePayload.layout_template ||
      "exponify_premium",

    navigation_links:
      asArray(templatePayload.navigation_links),

    hero_badge:
      templatePayload.hero_badge ||
      null,

    hero_stats:
      asArray(templatePayload.hero_stats),

    feature_cards:
      asArray(templatePayload.feature_cards),

    process_steps:
      asArray(templatePayload.process_steps),

    cta_title:
      templatePayload.cta_title ||
      null,

    cta_description:
      templatePayload.cta_description ||
      null,

    custom_domain:
      templatePayload.custom_domain ||
      null,

    custom_domain_status: "not_configured",
    custom_domain_verified_at: null,

    enable_landing: true,
    maintenance_mode: false,
  };
}

async function hasWorkspaceCards(landingPageId) {
  const { count, error } = await supabase
    .from("workspace_landing_service_cards")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("landing_page_id", landingPageId);

  if (error) {
    throw error;
  }

  return Number(count || 0) > 0;
}

async function hasBookingMapping(landingPageId) {
  const { count, error } = await supabase
    .from("landing_booking_mappings")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("landing_page_id", landingPageId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return Number(count || 0) > 0;
}

function buildSectionList(template) {
  const templatePayload = asObject(template?.default_payload);
  const configuredSections = asArray(templatePayload.sections);

  if (configuredSections.length === 0) {
    return DEFAULT_SECTIONS.map((sectionType, index) => ({
      section_type: sectionType,
      order_index: index,
      payload: buildDefaultSectionPayload(sectionType),
    }));
  }

  return configuredSections.map((section, index) => {
    if (typeof section === "string") {
      return {
        section_type: section,
        order_index: index,
        payload: buildDefaultSectionPayload(section),
      };
    }

    const sectionType = section.section_type || section.type || "custom";

    return {
      template_key: section.template_key || template?.template_key || null,
      section_type: sectionType,
      title: section.title || null,
      subtitle: section.subtitle || null,
      description: section.description || null,
      image_url: section.image_url || null,
      payload: {
        ...buildDefaultSectionPayload(sectionType),
        ...asObject(section.payload || section.content),
      },
      order_index: Number.isFinite(Number(section.order_index))
        ? Number(section.order_index)
        : index,
      enabled:
        section.enabled === undefined
          ? true
          : Boolean(section.enabled),
    };
  });
}

export async function createLandingPage({
  workspace_id,
  title,
  slug,
  template_key,
  industry_key,
  created_by,
}) {
  requireValue(workspace_id, "workspace_id is required.");
  requireValue(title, "title is required.");

  const uniqueSlug = await generateUniqueSlug(slug || title);
  const template = await getTemplateByKey(template_key);

  const theme = await getDefaultThemeForIndustry(industry_key || null);

  let bookingPreset = null;

  if (industry_key) {
    bookingPreset = await getDefaultBookingPresetForIndustry(industry_key);
  }

  const pagePayload = buildPagePayload({
    workspace_id,
    title,
    slug: uniqueSlug,
    template,
    theme,
    bookingPreset,
    created_by,
  });

  const { data: page, error } = await supabase
    .from("workspace_landing_pages")
    .insert(pagePayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await initializeLanding({
    landingPageId: page.id,
    workspaceId: workspace_id,
    template,
    bookingPreset,
  });

  return page;
}

export async function initializeLanding({
  landingPageId,
  workspaceId,
  template,
  bookingPreset,
}) {
  requireValue(landingPageId, "landingPageId is required.");
  requireValue(workspaceId, "workspaceId is required.");

  const existingSections = await getLandingSections(landingPageId);
  const existingSingletonTypes = new Set(
    existingSections
      .filter((section) => SINGLETON_SECTIONS.has(section.section_type))
      .map((section) => section.section_type)
  );

  const sectionRows = buildSectionList(template);

  for (const section of sectionRows) {
    if (
      SINGLETON_SECTIONS.has(section.section_type) &&
      existingSingletonTypes.has(section.section_type)
    ) {
      continue;
    }

    await createLandingSection({
      landing_page_id: landingPageId,
      template_key: section.template_key || template?.template_key || null,
      section_type: section.section_type,
      title: section.title || null,
      subtitle: section.subtitle || null,
      description: section.description || null,
      image_url: section.image_url || null,
      payload: section.payload || buildDefaultSectionPayload(section.section_type),
      order_index: section.order_index || 0,
      enabled: section.enabled === undefined ? true : section.enabled,
    });
  }

  const cardsAlreadyExist = await hasWorkspaceCards(landingPageId);

  if (!cardsAlreadyExist && template?.template_key) {
    await cloneTemplateCards(
      workspaceId,
      landingPageId,
      template.template_key
    );
  }

  const mappingAlreadyExists = await hasBookingMapping(landingPageId);

  if (!mappingAlreadyExists && bookingPreset?.id) {
    await createBookingMapping({
      workspace_id: workspaceId,
      landing_page_id: landingPageId,
      booking_preset_id: bookingPreset.id,
      meeting_provider: bookingPreset.meeting_type || "google_meet",
      approval_mode: bookingPreset.approval_mode || "manual",
      create_lead: bookingPreset.auto_create_lead,
      create_contact: bookingPreset.auto_create_contact,
      create_booking: bookingPreset.auto_create_booking,
    });
  }

  return true;
}

export async function publishLanding(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      published: true,
      status: "published",
      published_at: new Date().toISOString(),
      maintenance_mode: false,
      enable_landing: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function unpublishLanding(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      published: false,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function disableLanding(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      published: false,
      status: "disabled",
      enable_landing: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function setLandingMaintenanceMode(landingPageId, enabled) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      maintenance_mode: Boolean(enabled),
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getWorkspaceLandings(workspaceId) {
  requireValue(workspaceId, "workspaceId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLandingPageById(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("*")
    .eq("id", landingPageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
