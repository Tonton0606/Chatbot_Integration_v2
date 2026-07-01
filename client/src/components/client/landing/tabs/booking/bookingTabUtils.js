export const DEFAULT_BOOKING_PAYLOAD = {
  eyebrow: "Appointment",
  title: "Book an Appointment",
  description:
    "Visitors can submit their preferred schedule from your public page.",
  schedule_title: "Select Schedule",
  submit_button_label: "Submit Booking Request",
  submitting_button_label: "Submitting...",
  success_message: "Booking submitted successfully.",
  date_unavailable_message:
    "This date is unavailable. Please choose another date.",
  time_booked_message:
    "This time is already booked. Please choose another time.",
  time_unavailable_message:
    "This time is unavailable. Please choose another time.",
  platform_display_mode: "dropdown",
  platform_labels: {},
  platform_visibility: {},
  labels: {},
  placeholders: {},
  field_visibility: {},
  field_defaults: {},
  styles: {},
};

export const PLATFORM_DISPLAY_OPTIONS = [
  { value: "dropdown", label: "Dropdown" },
  { value: "cards", label: "Button Cards" },
  { value: "hidden", label: "Hidden / Auto-selected" },
];

export const BOOKING_PLATFORM_OPTIONS = [
  { key: "google_meet", label: "Google Meet" },
  { key: "zoom", label: "Zoom" },
  { key: "teams", label: "Microsoft Teams" },
  { key: "phone", label: "Phone Call" },
  { key: "in_person", label: "In Person" },
];

export const BOOKING_FIELD_CONTROLS = [
  {
    key: "first_name",
    label: "First Name",
    defaultLabel: "First Name",
    defaultPlaceholder: "Juan",
  },
  {
    key: "last_name",
    label: "Last Name",
    defaultLabel: "Last Name",
    defaultPlaceholder: "Dela Cruz",
  },
  {
    key: "email",
    label: "Email",
    defaultLabel: "Email",
    defaultPlaceholder: "juan@email.com",
  },
  {
    key: "phone",
    label: "Phone",
    defaultLabel: "Phone",
    defaultPlaceholder: "09XXXXXXXXX",
  },
  {
    key: "company",
    label: "Company",
    defaultLabel: "Company",
    defaultPlaceholder: "Company or organization",
  },
  {
    key: "service_interest",
    label: "Interested Service",
    defaultLabel: "Interested Service",
    defaultPlaceholder: "Which service are you interested in?",
  },
  {
    key: "message",
    label: "Message",
    defaultLabel: "Message",
    defaultPlaceholder: "Tell us what you need help with.",
  },
  {
    key: "preferred_date",
    label: "Preferred Date",
    defaultLabel: "Preferred Date",
    defaultPlaceholder: "",
  },
  {
    key: "preferred_time",
    label: "Preferred Time",
    defaultLabel: "Preferred Time",
    defaultPlaceholder: "",
  },
];

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function pickEditableText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return "";
}

export function getBookingSection(sections = []) {
  return (sections || []).find((section) => section.section_type === "booking");
}

export function normalizeBookingPayload(section, form) {
  const payload = asObject(section?.payload);

  return {
    ...DEFAULT_BOOKING_PAYLOAD,
    ...payload,
    title: pickEditableText(
      payload.title,
      section?.title,
      form?.booking_title,
      DEFAULT_BOOKING_PAYLOAD.title
    ),
    eyebrow: pickEditableText(
      payload.eyebrow,
      section?.subtitle,
      payload.subtitle,
      DEFAULT_BOOKING_PAYLOAD.eyebrow
    ),
    description: pickEditableText(
      payload.description,
      section?.description,
      payload.body,
      form?.booking_description,
      DEFAULT_BOOKING_PAYLOAD.description
    ),
    platform_display_mode:
      payload.platform_display_mode ||
      DEFAULT_BOOKING_PAYLOAD.platform_display_mode,
    platform_labels: {
      ...DEFAULT_BOOKING_PAYLOAD.platform_labels,
      ...asObject(payload.platform_labels),
    },
    platform_visibility: {
      ...DEFAULT_BOOKING_PAYLOAD.platform_visibility,
      ...asObject(payload.platform_visibility),
    },
    labels: {
      ...DEFAULT_BOOKING_PAYLOAD.labels,
      ...asObject(payload.labels),
    },
    placeholders: {
      ...DEFAULT_BOOKING_PAYLOAD.placeholders,
      ...asObject(payload.placeholders),
    },
    field_visibility: {
      ...DEFAULT_BOOKING_PAYLOAD.field_visibility,
      ...asObject(payload.field_visibility),
    },
    field_defaults: {
      ...DEFAULT_BOOKING_PAYLOAD.field_defaults,
      ...asObject(payload.field_defaults),
    },
    styles: {
      ...DEFAULT_BOOKING_PAYLOAD.styles,
      ...asObject(payload.styles),
    },
  };
}

export function getPayloadValue(payload, key) {
  return payload?.[key] ?? "";
}

export function isFieldVisible(fieldVisibility, fieldKey) {
  return fieldVisibility?.[fieldKey] !== false;
}

export function isPlatformVisible(platformVisibility, platformKey) {
  return platformVisibility?.[platformKey] !== false;
}
