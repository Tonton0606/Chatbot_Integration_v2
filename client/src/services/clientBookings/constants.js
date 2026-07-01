export const CLIENT_BOOKING_STATUSES = [
  "pending",
  "approved",
  "rescheduled",
  "reschedule_requested",
  "rejected",
  "cancelled",
];

export const CLIENT_BOOKING_PLATFORMS = [
  {
    value: "zoom",
    label: "Zoom",
  },
  {
    value: "google_meet",
    label: "Google Meet",
  },
];

export const CLIENT_BOOKING_MODES = [
  {
    value: "one_on_one",
    label: "One-on-One",
  },
  {
    value: "multiple",
    label: "Multiple Recipients",
  },
];

export const CLIENT_BOOKING_PARTY_TYPES = [
  {
    value: "self",
    label: "Myself",
  },
  {
    value: "contact",
    label: "Contact",
  },
  {
    value: "employee",
    label: "Employee",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const CLIENT_BOOKING_STATUS_STYLES = {
  pending:
    "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",

  new:
    "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",

  rescheduled:
    "border-blue-500/20 bg-blue-500/10 text-blue-400",

  reschedule_requested:
    "border-blue-500/20 bg-blue-500/10 text-blue-400",

  approved:
    "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",

  confirmed:
    "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",

  rejected:
    "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",

  cancelled:
    "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
};
