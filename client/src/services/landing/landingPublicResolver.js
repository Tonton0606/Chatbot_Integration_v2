import { supabase } from "../../config/supabaseClient";
import { getLandingBookingMappings } from "./landingBooking";
import { getLandingMapConfig } from "./landingMap";
import { getLandingSections } from "./landingSections";
import { getThemeByKey } from "./landingThemes";
import { getWorkspaceFooter } from "../../pages/Client/Modules/landing/footerService";

/**
 * Hermes2 / ExponifyPH
 * Public Landing Resolver
 *
 * Resolves public landing pages by:
 * - /l/:slug
 * - custom domain hostname
 * - client subdomains like basilreyno.exponify.ph
 */

const PLATFORM_HOSTS = new Set(["exponify.ph", "www.exponify.ph"]);

const PLATFORM_DOMAIN = "exponify.ph";

function normalizeHostname(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function isLocalHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname?.startsWith("192.168.")
  );
}

function isRenderHost(hostname) {
  return hostname?.includes("onrender.com");
}

function isPlatformRootHost(hostname) {
  const normalizedHostname = normalizeHostname(hostname);

  return PLATFORM_HOSTS.has(normalizedHostname);
}

function isPlatformClientSubdomain(hostname) {
  const normalizedHostname = normalizeHostname(hostname);

  return (
    normalizedHostname.endsWith(`.${PLATFORM_DOMAIN}`) &&
    normalizedHostname !== PLATFORM_DOMAIN &&
    !PLATFORM_HOSTS.has(normalizedHostname)
  );
}

function shouldUseThemeFallback(value) {
  return !value || value === "dark" || value === "light";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function normalizeGroupKey(value) {
  return String(value || "general_services")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleFromKey(value) {
  if (!value) {
    return "General Services";
  }

  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getServicesPresentationSettings(payload = {}) {
  const settings = asObject(payload);

  return {
    payload: settings,
    layoutMode: settings.layout_mode || settings.layoutMode || "grid",
    mediaMode: settings.media_mode || settings.mediaMode || "image",
    interactionMode:
      settings.interaction_mode || settings.interactionMode || "direct",
    responsive: asObject(settings.responsive),
    layers: Array.isArray(settings.layers) ? settings.layers : [],
  };
}

function hasServiceGroupContent(group = {}) {
  return (
    (group.cards?.length || 0) > 0 ||
    Boolean(group.title) ||
    Boolean(group.subtitle) ||
    Boolean(group.description) ||
    Boolean(group.payload?.heading) ||
    Boolean(group.payload?.eyebrow) ||
    Boolean(group.payload?.description)
  );
}

function buildServiceGroupFromSection(section, cards = []) {
  const payload = asObject(section.payload);

  return {
    id: section.id,
    key: normalizeGroupKey(section.id),
    sectionId: section.id,
    title: payload.heading || section.title || payload.title || "",
    subtitle: payload.eyebrow || section.subtitle || payload.subtitle || "",
    category:
      payload.eyebrow ||
      section.small_label ||
      payload.category ||
      section.subtitle ||
      "",
    description: payload.description || section.description || "",
    order_index: Number(section.order_index ?? 999),
    ...getServicesPresentationSettings(payload),
    cards,
  };
}

function buildFallbackServiceGroup(cards = []) {
  const firstCard = cards[0] || {};
  const groupKey = normalizeGroupKey(
    firstCard.industry_key ||
      firstCard.business_format_key ||
      firstCard.business_format ||
      firstCard.template_key ||
      "general_services"
  );

  return {
    id: groupKey,
    key: groupKey,
    sectionId: null,
    title:
      firstCard.business_format_title ||
      firstCard.business_format ||
      titleFromKey(firstCard.industry_key),
    subtitle:
      firstCard.industry_category ||
      titleFromKey(firstCard.industry_key),
    category:
      firstCard.payload?.category ||
      firstCard.industry_category ||
      titleFromKey(firstCard.industry_key),
    description:
      firstCard.business_format_description ||
      firstCard.format_description ||
      "",
    order_index: Number(firstCard.order_index ?? 999),
    ...getServicesPresentationSettings({
      layout_mode: "grid",
      media_mode: "image",
      interaction_mode: "direct",
    }),
    cards,
  };
}

function buildLegacyServiceGroups(serviceCards = []) {
  const groups = new Map();

  serviceCards.forEach((card) => {
    const rawGroupKey =
      card.industry_key ||
      card.business_format_key ||
      card.business_format ||
      card.template_key ||
      "general_services";

    const groupKey = normalizeGroupKey(rawGroupKey);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        key: groupKey,
        sectionId: null,
        title:
          card.business_format_title ||
          card.business_format ||
          titleFromKey(card.industry_key),
        subtitle:
          card.industry_category ||
          titleFromKey(card.industry_key),
        category:
          card.payload?.category ||
          card.industry_category ||
          titleFromKey(card.industry_key),
        description:
          card.business_format_description ||
          card.format_description ||
          "",
        order_index: Number(card.order_index ?? 999),
        ...getServicesPresentationSettings({
          layout_mode: "grid",
          media_mode: "image",
          interaction_mode: "direct",
        }),
        cards: [],
      });
    }

    groups.get(groupKey).cards.push(card);
  });

  return Array.from(groups.values())
    .sort((a, b) => a.order_index - b.order_index)
    .map((group) => ({
      ...group,
      cards: group.cards.sort(
        (a, b) => Number(a.order_index ?? 999) - Number(b.order_index ?? 999)
      ),
    }));
}

function buildServiceGroups(serviceCards = [], sections = []) {
  const serviceSections = sections.filter(
    (section) => section.section_type === "services"
  );

  const visibleCards = serviceCards.filter(
    (card) => card.enabled !== false && card?.payload?.archived !== true
  );

  if (!serviceSections.length) {
    return buildLegacyServiceGroups(visibleCards).filter(hasServiceGroupContent);
  }

  return serviceSections
    .map((section, index) => {
      const directCards = visibleCards.filter(
        (card) => card.section_id === section.id
      );

      const fallbackCards =
        index === 0
          ? visibleCards.filter((card) => !card.section_id)
          : [];

      return buildServiceGroupFromSection(section, [
        ...directCards,
        ...fallbackCards,
      ]);
    })
    .filter(hasServiceGroupContent)
    .sort((a, b) => a.order_index - b.order_index)
    .map((group) => ({
      ...group,
      cards: group.cards.sort(
        (a, b) => Number(a.order_index ?? 999) - Number(b.order_index ?? 999)
      ),
    }));
}

function mergeMapConfigIntoSections(sections = [], mapConfig = null, landing = {}) {
  if (!mapConfig || mapConfig.is_visible === false) {
    return sections.filter((section) => section.section_type !== "map");
  }

  let hasMapSection = false;

  const nextSections = sections.map((section) => {
    if (section.section_type !== "map") return section;

    hasMapSection = true;

    return {
      ...section,
      title: mapConfig.section_title,
      subtitle: mapConfig.section_subtitle,
      description: mapConfig.full_address,
      enabled: mapConfig.is_visible !== false,
      order_index: Number(mapConfig.section_order ?? section.order_index),
      payload: {
        ...(section.payload || {}),
        title: mapConfig.section_title,
        subtitle: mapConfig.section_subtitle,
        description: mapConfig.full_address,
        map_config: mapConfig,
      },
    };
  });

  if (hasMapSection) return nextSections;

  return [
    ...nextSections,
    {
      id: `map-${mapConfig.id || landing.id}`,
      landing_page_id: landing.id,
      section_type: "map",
      title: mapConfig.section_title,
      subtitle: mapConfig.section_subtitle,
      description: mapConfig.full_address,
      enabled: mapConfig.is_visible !== false,
      order_index: Number(mapConfig.section_order ?? nextSections.length),
      payload: {
        title: mapConfig.section_title,
        subtitle: mapConfig.section_subtitle,
        description: mapConfig.full_address,
        map_config: mapConfig,
      },
    },
  ];
}

export function getCurrentHostname() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.hostname;
}

export function shouldResolveByDomain(hostname = getCurrentHostname()) {
  if (!hostname) {
    return false;
  }

  const normalizedHostname = normalizeHostname(hostname);

  if (isLocalHost(normalizedHostname) || isRenderHost(normalizedHostname)) {
    return false;
  }

  if (isPlatformClientSubdomain(normalizedHostname)) {
    return true;
  }

  return !isPlatformRootHost(normalizedHostname);
}

export async function resolveLandingPage({
  slug = null,
  hostname = getCurrentHostname(),
} = {}) {
  const normalizedHostname = hostname ? normalizeHostname(hostname) : null;

  if (shouldResolveByDomain(normalizedHostname)) {
    return resolveLandingByDomain(normalizedHostname);
  }

  return resolveLandingBySlug(slug);
}

export async function resolveLandingBySlug(slug) {
  if (!slug) {
    throw new Error("Landing slug is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .eq("status", "published")
    .or("enable_landing.is.null,enable_landing.eq.true")
    .or("maintenance_mode.is.null,maintenance_mode.eq.false")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return hydratePublicLanding(data);
}

export async function resolveLandingByDomain(hostname) {
  if (!hostname) {
    throw new Error("Hostname is required.");
  }

  const normalizedHost = normalizeHostname(hostname);

  const { data: domain, error: domainError } = await supabase
    .from("workspace_domains")
    .select(
      `
      *,
      landing:workspace_landing_pages(*)
    `
    )
    .eq("domain", normalizedHost)
    .eq("status", "verified")
    .maybeSingle();

  if (domainError) {
    throw domainError;
  }

  if (!domain?.landing) {
    return null;
  }

  const landing = domain.landing;

  if (
    landing.published !== true ||
    landing.status !== "published" ||
    landing.maintenance_mode === true ||
    landing.enable_landing === false
  ) {
    return null;
  }

  return hydratePublicLanding(landing, {
    domain,
  });
}

export async function hydratePublicLanding(landing, extras = {}) {
  if (!landing?.id) {
    return null;
  }

  const themeKey = shouldUseThemeFallback(landing.theme_key)
    ? "executive_navy"
    : landing.theme_key;

  const [sections, cardResult, bookingMappings, theme, mapConfig, footer] = await Promise.all([
    getLandingSections(landing.id, {
      enabledOnly: true,
    }),

    supabase
      .from("workspace_landing_service_cards")
      .select("*")
      .eq("landing_page_id", landing.id)
      .eq("enabled", true)
      .order("order_index", { ascending: true }),

    getLandingBookingMappings(landing.id),

    getThemeByKey(themeKey),

    getLandingMapConfig({
      workspaceId: landing.workspace_id,
      landingPageId: landing.id,
    }),

    getWorkspaceFooter(landing.workspace_id),
  ]);

  if (cardResult.error) {
    throw cardResult.error;
  }

  const visibleSections = mergeMapConfigIntoSections(
    sections || [],
    mapConfig,
    landing
  ).filter(
    (section) => section.enabled !== false
  );

  const visibleServiceCards = (cardResult.data || []).filter(
    (card) => card.enabled !== false && card?.payload?.archived !== true
  );

  return {
    landing,
    sections: visibleSections,
    serviceCards: visibleServiceCards,
    serviceGroups: buildServiceGroups(visibleServiceCards, visibleSections),
    bookingMappings,
    theme,
    footer,
    domain: extras.domain || null,
  };
}

export function buildPublicUrl(slug) {
  if (!slug) {
    return "";
  }

  return `https://www.exponify.ph/l/${slug}`;
}
