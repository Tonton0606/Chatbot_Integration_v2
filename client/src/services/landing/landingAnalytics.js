import { supabase } from "../../config/supabaseClient";

/**
 * Hermes2 / ExponifyPH
 * Landing Analytics Service
 *
 * Tracks and reads landing events:
 * - page views
 * - CTA clicks
 * - service clicks
 * - booking clicks
 * - booking submissions
 * - custom domain visits
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function createFallbackId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function createSafeUUID(prefix) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return createFallbackId(prefix);
}

function safeGetStorageValue(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorageValue(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    return null;
  }

  return value;
}

export function getDeviceType() {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const width = window.innerWidth;

  if (width <= 640) {
    return "mobile";
  }

  if (width <= 1024) {
    return "tablet";
  }

  return "desktop";
}

export function getSessionId() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }

  const key = "exponify_landing_session_id";
  const existingValue = safeGetStorageValue(window.sessionStorage, key);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = createSafeUUID("session");
  safeSetStorageValue(window.sessionStorage, key, nextValue);

  return nextValue;
}

export function getVisitorId() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  const key = "exponify_landing_visitor_id";
  const existingValue = safeGetStorageValue(window.localStorage, key);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = createSafeUUID("visitor");
  safeSetStorageValue(window.localStorage, key, nextValue);

  return nextValue;
}

export function getTrafficSource() {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");

  if (utmSource) {
    return utmSource;
  }

  if (typeof document !== "undefined" && document.referrer) {
    return document.referrer;
  }

  return "direct";
}

export function buildEventMetadata(extra = {}) {
  return {
    device_type: getDeviceType(),
    source: getTrafficSource(),
    ...extra,
  };
}

export async function trackLandingEvent({
  workspace_id,
  landing_page_id,
  event_type,
  event_source = null,
  metadata = {},
}) {
  requireValue(workspace_id, "workspace_id is required.");
  requireValue(event_type, "event_type is required.");

  const eventPayload = {
    workspace_id,
    landing_page_id: landing_page_id || null,
    event_type,
    event_source: event_source || getTrafficSource(),
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    metadata: {
      ...buildEventMetadata(metadata),
      href:
        typeof window !== "undefined"
          ? window.location.href
          : null,
      pathname:
        typeof window !== "undefined"
          ? window.location.pathname
          : null,
      user_agent:
        typeof navigator !== "undefined"
          ? navigator.userAgent
          : null,
    },
  };

  const { data, error } = await supabase
    .from("workspace_landing_events")
    .insert(eventPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function safelyTrackLandingEvent(payload) {
  try {
    return await trackLandingEvent(payload);
  } catch (error) {
    console.warn("Landing analytics event was not recorded:", error);
    return null;
  }
}

export async function getLandingEvents(landingPageId, { limit = 100 } = {}) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("workspace_landing_events")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLandingAnalyticsSummary(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const events = await getLandingEvents(landingPageId, {
    limit: 1000,
  });

  const views = events.filter(
    (event) => event.event_type === "page_view"
  ).length;

  const serviceClicks = events.filter(
    (event) => event.event_type === "service_click"
  ).length;

  const bookingClicks = events.filter(
    (event) => event.event_type === "booking_click"
  ).length;

  const bookingSubmissions = events.filter(
    (event) => event.event_type === "booking_submit"
  ).length;

  const conversionRate =
    views > 0
      ? Number(((bookingSubmissions / views) * 100).toFixed(2))
      : 0;

  return {
    views,
    service_clicks: serviceClicks,
    serviceClicks,
    booking_clicks: bookingClicks,
    bookingClicks,
    submissions: bookingSubmissions,
    booking_submissions: bookingSubmissions,
    bookingSubmissions,
    conversion_rate: conversionRate,
    conversionRate,
    events,
  };
}
