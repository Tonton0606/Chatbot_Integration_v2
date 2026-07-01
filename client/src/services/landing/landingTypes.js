/**
 * Hermes2 / ExponifyPH
 * Landing Engine — Shared Types & Constants
 *
 * Used by:
 * - Admin Landing Control
 * - Client Landing Builder
 * - Public Landing Renderer
 * - Booking
 * - Analytics
 * - Domains
 * - Templates
 * - Service Cards
 */

export const LANDING_STATUS = [
  "draft",
  "published",
  "disabled",
  "archived",
  "maintenance",
];

export const DOMAIN_STATUS = [
  "not_configured",
  "pending_dns",
  "verified",
  "failed",
  "disabled",
];

export const SSL_STATUS = [
  "pending",
  "active",
  "failed",
];

export const BOOKING_STATUSES = [
  "pending",
  "approved",
  "declined",
  "completed",
];

export const APPROVAL_MODES = [
  "manual",
  "auto",
];

export const DOMAIN_RECORD_TYPES = [
  "CNAME",
  "A",
  "ALIAS",
];

export const SECTION_TYPES = [
  "hero",
  "about",
  "services",
  "gallery",
  "testimonials",
  "faq",
  "booking",
  "pricing",
  "team",
  "portfolio",
  "products",
  "contact",
  "timeline",
  "stats",
  "custom",
];

export const CARD_STYLES = [
  "glass",
  "solid",
  "minimal",
  "premium",
];

export const BOOKING_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "select",
  "multiselect",
  "date",
  "time",
  "textarea",
  "checkbox",
];

export const EVENT_TYPES = [
  "page_view",
  "cta_click",
  "service_click",
  "booking_click",
  "booking_submit",
  "domain_visit",
];

export const DEVICE_TYPES = [
  "desktop",
  "tablet",
  "mobile",
];

export const MEETING_TYPES = [
  "google_meet",
  "zoom",
  "teams",
  "phone",
  "in_person",
];

export const INDUSTRIES = [
  {
    key: "insurance",
    label: "Insurance",
    icon: "ShieldCheck",
  },

  {
    key: "real_estate",
    label: "Real Estate",
    icon: "Building2",
  },

  {
    key: "consultant",
    label: "Consultant",
    icon: "BriefcaseBusiness",
  },

  {
    key: "clinic",
    label: "Clinic",
    icon: "HeartPulse",
  },

  {
    key: "restaurant",
    label: "Restaurant",
    icon: "Utensils",
  },

  {
    key: "furniture",
    label: "Furniture",
    icon: "Sofa",
  },

  {
    key: "education",
    label: "Education",
    icon: "GraduationCap",
  },

  {
    key: "construction",
    label: "Construction",
    icon: "Hammer",
  },

  {
    key: "fitness",
    label: "Fitness",
    icon: "Dumbbell",
  },

  {
    key: "law",
    label: "Law Firm",
    icon: "Scale",
  },

  {
    key: "finance",
    label: "Finance",
    icon: "Landmark",
  },

  {
    key: "beauty",
    label: "Beauty",
    icon: "Sparkles",
  },

  {
    key: "travel",
    label: "Travel",
    icon: "Plane",
  },

  {
    key: "photography",
    label: "Photography",
    icon: "Camera",
  },

  {
    key: "events",
    label: "Events",
    icon: "Calendar",
  },

  {
    key: "general",
    label: "General Business",
    icon: "Building",
  },
];

export const LANDING_PACKAGE_LIMITS = {
  free: {
    max_landings: 1,
    max_domains: 0,
    max_sections: 10,
  },

  starter: {
    max_landings: 3,
    max_domains: 1,
    max_sections: 25,
  },

  business: {
    max_landings: 10,
    max_domains: 5,
    max_sections: 100,
  },

  enterprise: {
    max_landings: null,
    max_domains: null,
    max_sections: null,
  },
};

export const STORAGE_BUCKETS = {
  landing_assets: "landing-assets",
};

export const DEFAULT_DOMAIN =
  "https://www.exponify.ph/l";

export const DEFAULT_THEME =
  "executive_navy";

export const DEFAULT_TEMPLATE =
  "general_business";

export const DEFAULT_BOOKING_PROVIDER =
  "google_meet";

export const DEFAULT_APPROVAL_MODE =
  "manual";

export const DEFAULT_CARD_STYLE =
  "premium";

export const DEFAULT_DEVICE =
  "desktop";
