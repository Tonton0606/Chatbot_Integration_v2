import { supabase } from "../../config/supabaseClient";

const DEFAULT_SERVICES = [
  {
    title: "Consultation",
    description: "Book a consultation with our team.",
    image_url: "",
    cta_label: "Book Consultation",
  },
  {
    title: "Business Support",
    description: "Get personalized support based on your goals.",
    image_url: "",
    cta_label: "Get Support",
  },
  {
    title: "Growth Planning",
    description: "Create a clear roadmap for your next stage of growth.",
    image_url: "",
    cta_label: "Start Planning",
  },
];

const DEFAULT_FEATURE_CARDS = [
  {
    title: "Fast Scheduling",
    description: "Let visitors book appointments directly from your landing page.",
    image_url: "",
    tag: "Booking",
  },
  {
    title: "Professional Online Presence",
    description: "Showcase your company, services, and offer in one public page.",
    image_url: "",
    tag: "Branding",
  },
  {
    title: "Workspace Integrated",
    description: "Bookings flow directly into your ExponifyPH workspace.",
    image_url: "",
    tag: "Automation",
  },
];

const DEFAULT_PROCESS_STEPS = [
  {
    title: "Discover",
    description: "Visitors learn about your company and services.",
  },
  {
    title: "Book",
    description: "They submit an appointment request through your landing page.",
  },
  {
    title: "Confirm",
    description: "You approve the booking and generate the meeting link.",
  },
];

const DEFAULT_HERO_STATS = [
  {
    label: "Fast Booking",
    value: "24/7",
  },
  {
    label: "Workspace Ready",
    value: "100%",
  },
  {
    label: "Google Meet",
    value: "Live",
  },
];

const DEFAULT_FAQS = [
  {
    question: "How do I book an appointment?",
    answer:
      "Use the booking form on this landing page and our team will confirm your request.",
  },
];

const DEFAULT_NAVIGATION_LINKS = [
  {
    label: "Services",
    target: "#services",
  },
  {
    label: "Process",
    target: "#process",
  },
  {
    label: "Book",
    target: "#booking",
  },
];

const DEFAULT_CORE_SECTIONS = [
  {
    section_type: "hero",
    title: "Hero",
    subtitle: "Welcome",
    description: "",
    payload: {
      headline: "",
      subheadline: "",
      cta_label: "Book Appointment",
    },
    order_index: 0,
  },
  {
    section_type: "about",
    title: "About Us",
    subtitle: "Company",
    description:
      "Use this section to introduce your business, explain what you offer, and build trust with visitors.",
    payload: {
      body:
        "Use this section to introduce your business, explain what you offer, and build trust with visitors.",
    },
    order_index: 1,
  },
  {
    section_type: "services",
    title: "Our Services",
    subtitle: "Services",
    description: "Choose the service that fits your needs.",
    payload: {
      headline: "Our Services",
      description: "Choose the service that fits your needs.",
      items: DEFAULT_SERVICES,
    },
    order_index: 2,
  },
  {
    section_type: "booking",
    title: "Book an Appointment",
    subtitle: "Appointment",
    description:
      "Send us your preferred schedule and our team will confirm your appointment.",
    payload: {
      title: "Book an Appointment",
      description:
        "Send us your preferred schedule and our team will confirm your appointment.",
    },
    order_index: 3,
  },
  {
    section_type: "faq",
    title: "Frequently Asked Questions",
    subtitle: "Support",
    description: "",
    payload: {
      faqs: DEFAULT_FAQS,
    },
    order_index: 4,
  },
  {
    section_type: "contact",
    title: "Contact Us",
    subtitle: "Contact",
    description: "Reach out through the booking form and our team will respond.",
    payload: {
      body: "Reach out through the booking form and our team will respond.",
    },
    order_index: 5,
  },
];

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function buildTemplateLookupKeys(templateKey, industryKey) {
  const keys = new Set();

  [templateKey, industryKey].forEach((value) => {
    const key = normalizeKey(value);
    if (key) keys.add(key);
  });

  const joined = Array.from(keys).join("_");

  if (joined.includes("insurance")) keys.add("insurance");
  if (joined.includes("real_estate") || joined.includes("realestate")) {
    keys.add("real_estate");
  }
  if (joined.includes("construction")) keys.add("construction");
  if (joined.includes("consultant") || joined.includes("consulting")) {
    keys.add("consultant");
  }
  if (joined.includes("clinic") || joined.includes("medical")) {
    keys.add("clinic");
  }
  if (joined.includes("restaurant")) keys.add("restaurant");
  if (joined.includes("furniture")) keys.add("furniture");
  if (joined.includes("education")) keys.add("education");
  if (joined.includes("fitness")) keys.add("fitness");
  if (joined.includes("law")) keys.add("law");
  if (joined.includes("finance")) keys.add("finance");
  if (joined.includes("beauty") || joined.includes("salon")) keys.add("beauty");
  if (joined.includes("travel")) keys.add("travel");
  if (joined.includes("photography")) keys.add("photography");
  if (joined.includes("event")) keys.add("events");
  if (joined.includes("general")) keys.add("general_business");

  return Array.from(keys).filter(Boolean);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user?.id || null;
}

async function generateUniqueLandingSlug(baseValue, currentLandingId = null) {
  const baseSlug = slugify(baseValue) || `landing-${Date.now()}`;

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) throw error;

  const usedSlugs = (data || [])
    .filter((row) => row.id !== currentLandingId)
    .map((row) => row.slug);

  if (!usedSlugs.includes(baseSlug)) return baseSlug;

  let counter = 2;

  while (usedSlugs.includes(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

async function getDefaultTemplate() {
  const { data, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function getTemplateServices(templateKey, industryKey = null) {
  const keys = buildTemplateLookupKeys(templateKey, industryKey);

  if (!keys.length) return [];

  const { data: byTemplateKey, error: templateError } = await supabase
    .from("landing_template_services")
    .select("*")
    .in("template_key", keys)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  if (templateError) throw templateError;

  if (byTemplateKey?.length) {
    return byTemplateKey;
  }

  const { data: byIndustryKey, error: industryError } = await supabase
    .from("landing_template_services")
    .select("*")
    .in("industry_key", keys)
    .eq("status", "active")
    .order("order_index", { ascending: true });

  if (industryError) throw industryError;

  return byIndustryKey || [];
}

async function getDefaultBookingPreset(templateKey) {
  if (!templateKey) return null;

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .select("*")
    .or(`preset_key.eq.${templateKey},industry_key.eq.${templateKey}`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function getLandingPageCore(landingPageId) {
  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("id, workspace_id, template_key, industry_key")
    .eq("id", landingPageId)
    .single();

  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error("Landing page workspace_id was not found.");
  }

  return data;
}

export async function resolveClientWorkspace() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      workspace_id,
      role,
      workspace:workspaces (
        id,
        name,
        workspace_type,
        status,
        owner_user_id
      )
    `
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error("No workspace assigned to this user.");
  }

  return {
    userId,
    workspaceId: data.workspace_id,
    role: data.role,
    workspace: data.workspace || null,
  };
}

export function normalizeLandingPage(row) {
  if (!row) return null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    slug: row.slug || "",
    title: row.title || "Landing Page",
    theme_mode: row.theme_mode || "dark",
    layout_template: row.layout_template || "exponify_premium",
    logo_url: row.logo_url || "",
    hero_image_url: row.hero_image_url || "",
    headline: row.headline || "Grow your business with us",
    subheadline: row.subheadline || "",
    hero_badge: row.hero_badge || "Premium Business Platform",
    primary_cta_label: row.primary_cta_label || "Book Appointment",
    primary_color: row.primary_color || "#c9930c",
    secondary_color: row.secondary_color || "#0f172a",
    navigation_links: asArray(row.navigation_links),
    hero_stats: asArray(row.hero_stats),
    about_title: row.about_title || "About Us",
    about_content: row.about_content || "",
    services: asArray(row.services),
    feature_cards: asArray(row.feature_cards),
    process_steps: asArray(row.process_steps),
    testimonials: asArray(row.testimonials),
    faqs: asArray(row.faqs),
    social_links: asObject(row.social_links),
    payload: asObject(row.payload),
    show_booking: Boolean(row.show_booking),
    booking_title: row.booking_title || "Book an Appointment",
    booking_description: row.booking_description || "",
    booking_platform: row.booking_platform || "google_meet",
    cta_title: row.cta_title || "Ready to get started?",
    cta_description:
      row.cta_description ||
      "Book an appointment and our team will get back to you.",
    seo_title: row.seo_title || "",
    seo_description: row.seo_description || "",
    custom_domain: row.custom_domain || "",
    custom_domain_status: row.custom_domain_status || "not_configured",
    custom_domain_verified_at: row.custom_domain_verified_at || null,
    enable_landing: row.enable_landing !== false,
    maintenance_mode: Boolean(row.maintenance_mode),
    status: row.status || "draft",
    published: Boolean(row.published),
    published_at: row.published_at,
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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

export async function getLandingSections(landingPageId) {
  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function ensureDefaultSections(landingPageId) {
  const existingSections = await getLandingSections(landingPageId);
  const existingTypes = new Set(
    existingSections.map((section) => section.section_type)
  );

  const missingSections = DEFAULT_CORE_SECTIONS.filter(
    (section) => !existingTypes.has(section.section_type)
  );

  if (!missingSections.length) return existingSections;

  const inserts = missingSections.map((section) => ({
    landing_page_id: landingPageId,
    template_key: null,
    section_type: section.section_type,
    title: section.title,
    subtitle: section.subtitle,
    description: section.description,
    image_url: "",
    payload: section.payload,
    order_index: section.order_index,
    enabled: true,
  }));

  const { error } = await supabase
    .from("workspace_landing_sections")
    .insert(inserts);

  if (error) {
    const duplicateError =
      error.code === "23505" ||
      String(error.message || "").includes("duplicate key");

    if (!duplicateError) throw error;
  }

  return getLandingSections(landingPageId);
}

async function ensureDefaultServiceCards({
  workspaceId,
  landingPageId,
  templateKey,
}) {
  const { data: existingCards, error: existingError } = await supabase
    .from("workspace_landing_service_cards")
    .select("id")
    .eq("landing_page_id", landingPageId)
    .limit(1);

  if (existingError) throw existingError;
  if (existingCards?.length) return;

  const sections = await getLandingSections(landingPageId);
  const servicesSection = sections.find(
    (section) => section.section_type === "services"
  );

  const templateServices = await getTemplateServices(templateKey, templateKey);

  const cards =
    templateServices.length > 0
      ? templateServices.map((service) => ({
          workspace_id: workspaceId,
          landing_page_id: landingPageId,
          section_id: servicesSection?.id || null,
          template_service_id: service.id,
          industry_key: service.industry_key,
          service_key: service.service_key,
          title: service.title,
          description: service.description,
          image_url: service.default_image_url,
          background_image_url: service.default_background_image_url,
          icon: service.icon,
          cta_label: service.cta_label,
          booking_category: service.booking_category,
          enabled:
            service.is_default_enabled === undefined
              ? true
              : Boolean(service.is_default_enabled),
          client_modified: false,
          order_index: service.order_index,
          payload: {
            source: "template",
            template_key: service.template_key,
          },
        }))
      : DEFAULT_SERVICES.map((service, index) => ({
          workspace_id: workspaceId,
          landing_page_id: landingPageId,
          section_id: servicesSection?.id || null,
          template_service_id: null,
          industry_key: templateKey || "general",
          service_key: slugify(service.title),
          title: service.title,
          description: service.description,
          image_url: service.image_url || null,
          background_image_url: null,
          icon: "Building2",
          cta_label: service.cta_label || "Book Consultation",
          booking_category: slugify(service.title),
          enabled: true,
          client_modified: false,
          order_index: index,
          payload: {
            source: "fallback",
          },
        }));

  if (!cards.length) return;

  const { error } = await supabase
    .from("workspace_landing_service_cards")
    .insert(cards);

  if (error) throw error;
}

async function ensureDefaultBookingMapping({
  workspaceId,
  landingPageId,
  templateKey,
}) {
  const { data: existingMappings, error: existingError } = await supabase
    .from("landing_booking_mappings")
    .select("id")
    .eq("landing_page_id", landingPageId)
    .limit(1);

  if (existingError) throw existingError;
  if (existingMappings?.length) return;

  const bookingPreset = await getDefaultBookingPreset(templateKey);

  const { error } = await supabase
    .from("landing_booking_mappings")
    .insert({
      workspace_id: workspaceId,
      landing_page_id: landingPageId,
      booking_preset_id: bookingPreset?.id || null,
      service_card_id: null,
      create_lead: true,
      create_contact: true,
      create_booking: true,
      create_calendar_event: false,
      meeting_provider: bookingPreset?.meeting_type || "google_meet",
      approval_mode: bookingPreset?.approval_mode || "manual",
      crm_pipeline_stage: null,
      assigned_owner: null,
      status: "active",
    });

  if (error) throw error;
}

async function ensureLandingInitialized({
  landingPage,
  workspaceId,
  templateKey,
}) {
  if (!landingPage?.id || !workspaceId) return;

  await ensureDefaultSections(landingPage.id);

  await ensureDefaultServiceCards({
    workspaceId,
    landingPageId: landingPage.id,
    templateKey,
  });

  await ensureDefaultBookingMapping({
    workspaceId,
    landingPageId: landingPage.id,
    templateKey,
  });
}

export async function createDefaultClientLandingPage(workspaceId, workspace = {}) {
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

export async function getOrCreateClientLandingPage() {
  const workspaceContext = await resolveClientWorkspace();
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

export async function getLandingPageTemplates() {
  const { data, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getLandingSectionTypes() {
  const { data, error } = await supabase
    .from("landing_section_types")
    .select("*")
    .eq("status", "active")
    .order("category", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function createLandingSection({
  landingPageId,
  templateKey = null,
  sectionType = "custom",
  title = "New Section",
  subtitle = "",
  description = "",
  imageUrl = "",
  payload = {},
  orderIndex = 0,
}) {
  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .insert({
      landing_page_id: landingPageId,
      template_key: templateKey,
      section_type: sectionType,
      title,
      subtitle,
      description,
      image_url: imageUrl,
      payload,
      order_index: orderIndex,
      enabled: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function updateLandingSection(sectionId, payload) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const updatePayload = {
    template_key: payload.template_key,
    section_type: payload.section_type,
    title: payload.title,
    subtitle: payload.subtitle,
    description: payload.description,
    image_url: payload.image_url,
    payload: payload.payload,
    order_index: payload.order_index,
    enabled: payload.enabled,
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .update(updatePayload)
    .eq("id", sectionId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function deleteLandingSection(sectionId) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const { error } = await supabase
    .from("workspace_landing_sections")
    .delete()
    .eq("id", sectionId);

  if (error) throw error;

  return true;
}

export async function createSectionFromTemplate({
  landingPageId,
  template,
  orderIndex = 0,
}) {
  console.log("CREATE TEMPLATE START", landingPageId, template);

  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  if (!template?.template_key && !template?.industry_key) {
    throw new Error("Template is required.");
  }

  const page = await getLandingPageCore(landingPageId);

  const sectionTitle =
    template.name ||
    template.label ||
    template.title ||
    "Service Group";

  const sectionSubtitle =
    template.industry_category ||
    template.category ||
    template.industry_key ||
    "Services";

  const sectionDescription =
    template.description ||
    "Explore available services.";

  const servicesSection = await createLandingSection({
    landingPageId,
    templateKey: template.template_key || template.industry_key,
    sectionType: "services",
    title: sectionTitle,
    subtitle: sectionSubtitle,
    description: sectionDescription,
    imageUrl: template.preview_image_url || "",
    payload: {
      source: "service_template",
      template_key: template.template_key || null,
      industry_key: template.industry_key || null,
      headline: sectionTitle,
      description: sectionDescription,
    },
    orderIndex,
  });

  const templateServices = await getTemplateServices(
    template.template_key,
    template.industry_key
  );

  console.log("TEMPLATE SERVICES", templateServices);

  const servicesToInsert =
    templateServices.length > 0
      ? templateServices
      : DEFAULT_SERVICES.map((service, index) => ({
          id: null,
          industry_key: template.industry_key || template.template_key || "general",
          service_key: slugify(service.title),
          title: service.title,
          description: service.description,
          default_image_url: service.image_url || null,
          default_background_image_url: null,
          icon: "Building2",
          cta_label: service.cta_label || "Book Consultation",
          booking_category: slugify(service.title),
          is_default_enabled: true,
          order_index: index + 1,
        }));

  const { data: existingCards, error: cardLookupError } = await supabase
    .from("workspace_landing_service_cards")
    .select("service_key, section_id")
    .eq("landing_page_id", landingPageId)
    .eq("section_id", servicesSection.id);

  if (cardLookupError) throw cardLookupError;

  const existingServiceKeys = new Set(
    (existingCards || []).map(
      (card) => `${card.section_id}:${card.service_key}`
    )
  );

  console.log("SERVICES SECTION", servicesSection);

  const cardsToInsert = servicesToInsert
    .filter(
      (service) =>
        !existingServiceKeys.has(
          `${servicesSection.id}:${service.service_key}`
        )
    )
    .map((service) => ({
      workspace_id: page.workspace_id,
      landing_page_id: landingPageId,
      section_id: servicesSection.id,
      template_service_id: service.id || null,
      industry_key:
        service.industry_key ||
        template.industry_key ||
        template.industry_category ||
        template.template_key ||
        null,
      service_key: service.service_key,
      title: service.title,
      description: service.description,
      image_url: service.default_image_url || null,
      background_image_url: service.default_background_image_url || null,
      icon: service.icon || "Building2",
      cta_label: service.cta_label || "Book Consultation",
      booking_category: service.booking_category || service.service_key,
      enabled:
        service.is_default_enabled === undefined
          ? true
          : Boolean(service.is_default_enabled),
      client_modified: false,
      order_index: Number(service.order_index || 0),
      payload: {
        source: service.id ? "template_service" : "fallback_service",
        template_key: template.template_key || null,
        industry_key: service.industry_key || template.industry_key || null,
        service_key: service.service_key,
        service_group_id: servicesSection.id,
        service_group_title: sectionTitle,
      },
    }));

  if (!cardsToInsert.length) {
    return servicesSection;
  }

  const { error: insertCardError } = await supabase
    .from("workspace_landing_service_cards")
    .insert(cardsToInsert);

  console.log("INSERT FINISHED");

  if (insertCardError) {
    throw insertCardError;
  }

  return servicesSection;
}

export async function uploadLandingAsset({
  workspaceId,
  landingPageId,
  file,
  assetType = "image",
  onProgress,
}) {
  requireWorkspaceId(workspaceId);

  if (!file) {
    throw new Error("File is required.");
  }

  const userId = await getCurrentUserId();

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("User session is required to upload landing assets.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase upload configuration is missing.");
  }

  const fileExt = file.name.split(".").pop();
  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const filePath = `${workspaceId}/${assetType}/${Date.now()}-${safeName}.${fileExt}`;
  const encodedPath = filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const uploadUrl = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/landing-assets-v2/${encodedPath}`;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uploadUrl);

    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");

    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }

      const percent = Math.max(
        1,
        Math.min(99, Math.round((event.loaded / event.total) * 100))
      );

      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === "function") {
          onProgress(100);
        }

        resolve();
        return;
      }

      let message = "Failed to upload landing asset.";

      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed.message || parsed.error || message;
      } catch {
        message = xhr.responseText || message;
      }

      reject(new Error(message));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading landing asset."));
    };

    xhr.onabort = () => {
      reject(new Error("Landing asset upload was cancelled."));
    };

    xhr.send(file);
  });

  const { data: publicData } = supabase.storage
    .from("landing-assets-v2")
    .getPublicUrl(filePath);

  const fileUrl = publicData?.publicUrl;

  if (!fileUrl) {
    throw new Error("Failed to generate public asset URL.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_assets")
    .insert({
      workspace_id: workspaceId,
      landing_page_id: landingPageId || null,
      asset_type: assetType,
      file_url: fileUrl,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    asset: data,
    fileUrl,
  };
}

export async function getLandingPageAnalytics(workspaceId, landingPageId) {
  requireWorkspaceId(workspaceId);

  let query = supabase
    .from("workspace_landing_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (landingPageId) {
    query = query.eq("landing_page_id", landingPageId);
  }

  const { data, error } = await query.limit(500);

  if (error) throw error;

  const events = data || [];

  const views = events.filter((event) =>
    ["view", "page_view"].includes(event.event_type)
  ).length;

  const bookingClicks = events.filter(
    (event) => event.event_type === "booking_click"
  ).length;

  const bookingSubmissions = events.filter(
    (event) => event.event_type === "booking_submit"
  ).length;

  const conversionRate =
    views > 0 ? Math.round((bookingSubmissions / views) * 100) : 0;

  return {
    events,
    stats: {
      views,
      bookingClicks,
      bookingSubmissions,
      conversionRate,
    },
  };
}

export function buildPublicLandingUrl(slug, customDomain) {
  if (customDomain) {
    return `https://${customDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")}`;
  }

  if (!slug) return "";

  const base =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    window.location.origin;

  return `${base.replace(/\/+$/, "")}/l/${slug}`;
}
