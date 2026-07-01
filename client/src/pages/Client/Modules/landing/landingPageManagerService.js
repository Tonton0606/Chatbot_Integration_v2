import { supabase } from "../../../../config/supabaseClient";

import {
  createLandingPage,
  getWorkspaceLandings,
} from "../../../../services/landing/landingBuilder";

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function normalizeSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listClientLandingPages(workspaceId) {
  requireValue(workspaceId, "workspaceId is required.");

  const pages = await getWorkspaceLandings(workspaceId);

  return (pages || []).filter((page) => page.status !== "archived");
}

export async function createClientLandingPage({
  workspaceId,
  title,
  slug,
  createdBy,
  templateKey = "general_business",
  industryKey = "general_business",
}) {
  requireValue(workspaceId, "workspaceId is required.");
  requireValue(title, "title is required.");

  return createLandingPage({
    workspace_id: workspaceId,
    title,
    slug: normalizeSlug(slug || title),
    template_key: templateKey,
    industry_key: industryKey,
    created_by: createdBy || null,
  });
}

export async function archiveClientLandingPage(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update({
      published: false,
      status: "archived",
      enable_landing: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", landingPageId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function duplicateClientLandingPage({
  sourcePage,
  createdBy,
}) {
  requireValue(sourcePage?.workspace_id, "sourcePage.workspace_id is required.");
  requireValue(sourcePage?.title, "sourcePage.title is required.");

  const duplicateTitle = `${sourcePage.title} Copy`;

  const newPage = await createLandingPage({
    workspace_id: sourcePage.workspace_id,
    title: duplicateTitle,
    slug: normalizeSlug(`${sourcePage.slug || sourcePage.title}-copy`),
    template_key: "general_business",
    industry_key: "general_business",
    created_by: createdBy || null,
  });

  const copyPayload = {
    logo_url: sourcePage.logo_url || null,
    hero_image_url: sourcePage.hero_image_url || null,
    headline: sourcePage.headline || "",
    subheadline: sourcePage.subheadline || null,
    primary_cta_label: sourcePage.primary_cta_label || "Book Appointment",
    primary_color: sourcePage.primary_color || "#c9930c",
    secondary_color: sourcePage.secondary_color || "#0f172a",
    about_title: sourcePage.about_title || "About Us",
    about_content: sourcePage.about_content || null,
    services: sourcePage.services || [],
    testimonials: sourcePage.testimonials || [],
    faqs: sourcePage.faqs || [],
    social_links: sourcePage.social_links || {},
    show_booking: sourcePage.show_booking !== false,
    booking_title: sourcePage.booking_title || "",
    booking_description: sourcePage.booking_description || "",
    booking_platform: sourcePage.booking_platform || "google_meet",
    seo_title: sourcePage.seo_title || null,
    seo_description: sourcePage.seo_description || null,
    theme_mode: sourcePage.theme_mode || "dark",
    layout_template: sourcePage.layout_template || "exponify_premium",
    navigation_links: sourcePage.navigation_links || [],
    hero_badge: sourcePage.hero_badge || null,
    hero_stats: sourcePage.hero_stats || [],
    feature_cards: sourcePage.feature_cards || [],
    process_steps: sourcePage.process_steps || [],
    cta_title: sourcePage.cta_title || null,
    cta_description: sourcePage.cta_description || null,
    payload: sourcePage.payload || {},
    visual_theme: sourcePage.visual_theme || "executive_gold",
    published: false,
    status: "draft",
    published_at: null,
    custom_domain: null,
    custom_domain_status: "not_configured",
    custom_domain_verified_at: null,
    enable_landing: true,
    maintenance_mode: false,
    updated_by: createdBy || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update(copyPayload)
    .eq("id", newPage.id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}
