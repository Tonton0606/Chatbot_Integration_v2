import { BOOKING_DEFAULT_EXCEPTION } from "../../../../services/clientBookings/availability";

export function buildDefaultExceptionForm() {
  return {
    ...BOOKING_DEFAULT_EXCEPTION,
  };
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null;

  return new Date(value).toISOString();
}

export function formatExceptionDate(value) {
  if (!value) return "No date";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function sortExceptionsByStartDate(exceptions = []) {
  return [...exceptions].sort((a, b) => {
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
}
