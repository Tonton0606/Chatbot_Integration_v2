const DEFAULT_HERO_BENEFITS = [
  {
    title: "Life Protection",
    description: "Secure your family's future with the right coverage.",
  },
  {
    title: "Health Coverage",
    description: "Prepare for medical needs and unexpected expenses.",
  },
  {
    title: "Wealth Planning",
    description: "Build long-term financial confidence with guided planning.",
  },
];

const DEFAULT_HERO_METRICS = [
  {
    value: "Free",
    label: "Consultation",
  },
  {
    value: "1-on-1",
    label: "Guidance",
  },
  {
    value: "Custom",
    label: "Plan Options",
  },
];

export const DEFAULT_LANDING_TAB = "general";

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function sortByOrderIndex(rows = []) {
  return [...rows].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );
}

export function buildInitialPayload(landingPage = {}) {
  const sourcePayload =
    landingPage?.payload && typeof landingPage.payload === "object"
      ? landingPage.payload
      : {};

  return {
    ...sourcePayload,
    hero_template: sourcePayload.hero_template || "corporate_premium",
    hero_highlight_text: sourcePayload.hero_highlight_text || "",
    hero_secondary_cta_label:
      sourcePayload.hero_secondary_cta_label || "View Services",
    hero_benefits: Array.isArray(sourcePayload.hero_benefits)
      ? sourcePayload.hero_benefits
      : DEFAULT_HERO_BENEFITS,
    hero_metrics: Array.isArray(sourcePayload.hero_metrics)
      ? sourcePayload.hero_metrics
      : DEFAULT_HERO_METRICS,
  };
}

export function buildInitialForm(landingPage = {}) {
  return {
    title: landingPage?.title ?? "",
    slug: landingPage?.slug ?? "",

    headline: landingPage?.headline ?? "",
    subheadline: landingPage?.subheadline ?? "",
    hero_badge: landingPage?.hero_badge ?? "",
    primary_cta_label: landingPage?.primary_cta_label ?? "",

    logo_url: landingPage?.logo_url ?? "",
    hero_image_url: landingPage?.hero_image_url ?? "",

    theme_mode: landingPage?.theme_mode || "dark",
    layout_template: landingPage?.layout_template || "exponify_premium",
    primary_color: landingPage?.primary_color || "#c9930c",
    secondary_color: landingPage?.secondary_color || "#0f172a",

    show_booking:
      landingPage?.show_booking === undefined
        ? true
        : Boolean(landingPage.show_booking),

    booking_title: landingPage?.booking_title ?? "",
    booking_description: landingPage?.booking_description ?? "",
    booking_platform: landingPage?.booking_platform || "google_meet",

    custom_domain: landingPage?.custom_domain ?? "",
    custom_domain_status:
      landingPage?.custom_domain_status || "not_configured",

    maintenance_mode: Boolean(landingPage?.maintenance_mode),

    seo_title: landingPage?.seo_title ?? "",
    seo_description: landingPage?.seo_description ?? "",

    published: Boolean(landingPage?.published),
    status: landingPage?.status || "draft",
    payload: buildInitialPayload(landingPage),
  };
}

export function buildInitialIntegrationMapping({
  mapping = null,
  workspaceId = null,
  landingPageId = null,
} = {}) {
  return {
    id: mapping?.id || null,
    workspace_id: mapping?.workspace_id || workspaceId || null,
    landing_page_id: mapping?.landing_page_id || landingPageId || null,
    booking_preset_id: mapping?.booking_preset_id || null,
    service_card_id: mapping?.service_card_id || null,
    create_contact:
      mapping?.create_contact === undefined
        ? true
        : Boolean(mapping.create_contact),
    create_lead:
      mapping?.create_lead === undefined ? true : Boolean(mapping.create_lead),
    create_booking:
      mapping?.create_booking === undefined
        ? true
        : Boolean(mapping.create_booking),
    create_calendar_event:
      mapping?.create_calendar_event === undefined
        ? false
        : Boolean(mapping.create_calendar_event),
    meeting_provider: mapping?.meeting_provider || "google_meet",
    approval_mode: mapping?.approval_mode || "manual",
    crm_pipeline_stage: mapping?.crm_pipeline_stage || null,
    assigned_owner: mapping?.assigned_owner || null,
    status: mapping?.status || "active",
    metadata: asObject(mapping?.metadata),
  };
}

export function selectPrimaryIntegrationMapping(rows = []) {
  const activeRows = rows.filter((row) => row.status === "active");

  return (
    activeRows.find((row) => !row.service_card_id) ||
    activeRows[0] ||
    rows.find((row) => !row.service_card_id) ||
    rows[0] ||
    null
  );
}

export function getApiBase() {
  const rawApiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "";

  return String(rawApiBase)
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}
