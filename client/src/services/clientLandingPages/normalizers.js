import { asArray, asObject } from "./utils";

const textOrEmpty = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const valueOrDefault = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

export function normalizeLandingPage(row) {
  if (!row) return null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,

    slug: textOrEmpty(row.slug),
    title: textOrEmpty(row.title),

    theme_mode: valueOrDefault(row.theme_mode, "dark"),
    layout_template: valueOrDefault(row.layout_template, "exponify_premium"),

    logo_url: textOrEmpty(row.logo_url),
    hero_image_url: textOrEmpty(row.hero_image_url),
    headline: textOrEmpty(row.headline),
    subheadline: textOrEmpty(row.subheadline),
    hero_badge: textOrEmpty(row.hero_badge),
    primary_cta_label: textOrEmpty(row.primary_cta_label),

    primary_color: valueOrDefault(row.primary_color, "#c9930c"),
    secondary_color: valueOrDefault(row.secondary_color, "#0f172a"),

    navigation_links: asArray(row.navigation_links),
    hero_stats: asArray(row.hero_stats),

    about_title: textOrEmpty(row.about_title),
    about_content: textOrEmpty(row.about_content),

    services: asArray(row.services),
    feature_cards: asArray(row.feature_cards),
    process_steps: asArray(row.process_steps),
    testimonials: asArray(row.testimonials),
    faqs: asArray(row.faqs),
    social_links: asObject(row.social_links),
    payload: asObject(row.payload),

    show_booking: Boolean(row.show_booking),

    booking_title: textOrEmpty(row.booking_title),
    booking_description: textOrEmpty(row.booking_description),
    booking_platform: valueOrDefault(row.booking_platform, "google_meet"),

    cta_title: textOrEmpty(row.cta_title),
    cta_description: textOrEmpty(row.cta_description),

    seo_title: textOrEmpty(row.seo_title),
    seo_description: textOrEmpty(row.seo_description),

    custom_domain: textOrEmpty(row.custom_domain),
    custom_domain_status: valueOrDefault(
      row.custom_domain_status,
      "not_configured"
    ),
    custom_domain_verified_at: row.custom_domain_verified_at || null,

    enable_landing: row.enable_landing !== false,
    maintenance_mode: Boolean(row.maintenance_mode),
    status: valueOrDefault(row.status, "draft"),
    published: Boolean(row.published),

    published_at: row.published_at,
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
