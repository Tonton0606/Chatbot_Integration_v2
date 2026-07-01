export const BOOKING_EXCEPTION_TYPES = [
  "busy",
  "unavailable",
  "vacation",
  "holiday",
  "custom",
];

export const BOOKING_EXCEPTION_TYPE_OPTIONS = [
  {
    value: "busy",
    label: "Busy",
  },
  {
    value: "unavailable",
    label: "Unavailable",
  },
  {
    value: "vacation",
    label: "Vacation",
  },
  {
    value: "holiday",
    label: "Holiday",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

export const BOOKING_DEFAULT_SETTINGS = {
  timezone: "Asia/Manila",
  slot_duration_minutes: 60,
};

export const BOOKING_DEFAULT_EXCEPTION = {
  title: "",
  exception_type: "unavailable",
  starts_at: "",
  ends_at: "",
  is_full_day: true,
  recurrence_rule: "",
  reason: "",
};

export const BOOKING_TIMEZONE_OPTIONS = [
  {
    value: "Asia/Manila",
    label: "Asia/Manila",
  },
];

export const BOOKING_RECURRENCE_PRESETS = [
  {
    value: "",
    label: "Does Not Repeat",
  },
  {
    value: "FREQ=DAILY",
    label: "Daily",
  },
  {
    value: "FREQ=WEEKLY",
    label: "Weekly",
  },
  {
    value: "FREQ=MONTHLY",
    label: "Monthly",
  },
  {
    value: "FREQ=YEARLY",
    label: "Yearly",
  },
];
