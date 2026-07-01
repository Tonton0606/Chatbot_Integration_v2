import { supabase } from "../../config/supabaseClient";

import {
  DEFAULT_FAQS,
  DEFAULT_FEATURE_CARDS,
  DEFAULT_HERO_STATS,
  DEFAULT_NAVIGATION_LINKS,
  DEFAULT_PROCESS_STEPS,
  DEFAULT_SERVICES,
} from "./constants";

import { ensureLandingInitialized } from "./initialization";
import { normalizeLandingPage } from "./normalizers";
import { getDefaultTemplate } from "./templates";
import {
  generateUniqueLandingSlug,
  getCurrentUserId,
  requireWorkspaceId,
} from "./utils";
import { resolveClientWorkspace } from "./workspace";

export async function getClientLandingPage(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return normalizeLandingPage(data);
}

export async function createDefaultClientLandingPage(
  workspaceId,
  workspace = {}
) {
  requireWorkspaceId(workspaceId);

  const userId = await getCurrentUserId();
  const template = await getDefaultTemplate();

  const workspaceName = workspace.name || "Workspace";
  const templateKey = template?.template_key || "general_business";
  const slug = await generateUniqueLandingSlug(workspaceName || workspaceId);

  const payload = {
    workspace_id: workspaceId,
    slug,
    title: `${workspaceName} Landing Page`,
    theme_mode: template?.theme_mode || "dark",
    layout_template: template?.layout_template || "exponify_premium",
    headline: `Welcome to ${workspaceName}`,
    subheadline:
      "Showcase your services, promote your offer, and let visitors book appointments directly.",
    hero_badge: "Workspace Landing Page",
    primary_cta_label: "Book Appointment",
    primary_color: "#c9930c",
    secondary_color: "#0f172a",
    navigation_links: DEFAULT_NAVIGATION_LINKS,
    hero_stats: DEFAULT_HERO_STATS,
    about_title: `About ${workspaceName}`,
    about_content:
      "Use this section to introduce your business, explain what you offer, and build trust with visitors.",
    services: DEFAULT_SERVICES,
    feature_cards: DEFAULT_FEATURE_CARDS,
    process_steps: DEFAULT_PROCESS_STEPS,
    faqs: DEFAULT_FAQS,
    testimonials: [],
    social_links: {},
    booking_platform: "google_meet",
    show_booking: true,
    booking_title: "Book an Appointment",
    booking_description:
      "Send us your preferred schedule and our team will confirm your appointment.",
    cta_title: "Ready to work with us?",
    cta_description: "Submit a booking request and we will confirm your schedule.",
    enable_landing: true,
    maintenance_mode: false,
    status: "draft",
    published: false,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  const landingPage = normalizeLandingPage(data);

  await ensureLandingInitialized({
    landingPage,
    workspaceId,
    templateKey,
  });

  return landingPage;
}

export async function getOrCreateClientLandingPage(options = {}) {
  const workspaceContext = await resolveClientWorkspace(
    options.overrideWorkspaceId || ""
  );

  const template = await getDefaultTemplate();
  const templateKey = template?.template_key || "general_business";

  const existing = await getClientLandingPage(workspaceContext.workspaceId);

  if (existing) {
    await ensureLandingInitialized({
      landingPage: existing,
      workspaceId: workspaceContext.workspaceId,
      templateKey,
    });

    return {
      workspaceContext,
      landingPage: existing,
    };
  }

  const created = await createDefaultClientLandingPage(
    workspaceContext.workspaceId,
    workspaceContext.workspace
  );

  return {
    workspaceContext,
    landingPage: created,
  };
}

export async function updateClientLandingPage(id, payload) {
  if (!id) {
    throw new Error("Landing page ID is required.");
  }

  const userId = await getCurrentUserId();

  const updatePayload = {
    title: payload.title,
    theme_mode: payload.theme_mode,
    layout_template: payload.layout_template,
    logo_url: payload.logo_url,
    hero_image_url: payload.hero_image_url,
    headline: payload.headline,
    subheadline: payload.subheadline,
    hero_badge: payload.hero_badge,
    primary_cta_label: payload.primary_cta_label,
    primary_color: payload.primary_color,
    secondary_color: payload.secondary_color,
    navigation_links: payload.navigation_links,
    hero_stats: payload.hero_stats,
    about_title: payload.about_title,
    about_content: payload.about_content,
    services: payload.services,
    feature_cards: payload.feature_cards,
    process_steps: payload.process_steps,
    testimonials: payload.testimonials,
    faqs: payload.faqs,
    social_links: payload.social_links,
    payload: payload.payload,
    show_booking: payload.show_booking,
    booking_title: payload.booking_title,
    booking_description: payload.booking_description,
    booking_platform: payload.booking_platform,
    cta_title: payload.cta_title,
    cta_description: payload.cta_description,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    custom_domain: payload.custom_domain,
    custom_domain_status: payload.custom_domain_status,
    enable_landing: payload.enable_landing,
    maintenance_mode: payload.maintenance_mode,
    status: payload.status,
    published: payload.published,
    published_at: payload.published ? new Date().toISOString() : null,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (payload.slug) {
    updatePayload.slug = await generateUniqueLandingSlug(payload.slug, id);
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeLandingPage(data);
}

export async function enableClientLandingPage(id) {
  return updateClientLandingPage(id, {
    status: "published",
    published: true,
    enable_landing: true,
    maintenance_mode: false,
  });
}

export async function disableClientLandingPage(id) {
  return updateClientLandingPage(id, {
    status: "draft",
    published: false,
    enable_landing: false,
  });
}

export async function publishClientLandingPage(id) {
  return enableClientLandingPage(id);
}

export async function unpublishClientLandingPage(id) {
  return disableClientLandingPage(id);
}

export function buildPublicLandingUrl(slug, customDomain) {
  if (customDomain) {
    return `https://${customDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")}`;
  }

  if (!slug) return "";

  const base = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

  return `${base.replace(/\/+$/, "")}/l/${slug}`;
}
