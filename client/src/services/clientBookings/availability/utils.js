import {
  BOOKING_DEFAULT_EXCEPTION,
  BOOKING_DEFAULT_SETTINGS,
} from "./constants";

export function normalizeBookingSettings(row = {}) {
  return {
    id: row.id || null,
    workspace_id: row.workspace_id || null,

    timezone:
      row.timezone ||
      BOOKING_DEFAULT_SETTINGS.timezone,

    slot_duration_minutes:
      Number(row.slot_duration_minutes) ||
      BOOKING_DEFAULT_SETTINGS.slot_duration_minutes,

    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function normalizeBookingException(row = {}) {
  return {
    id: row.id || null,
    workspace_id: row.workspace_id || null,

    title:
      row.title ||
      BOOKING_DEFAULT_EXCEPTION.title,

    exception_type:
      row.exception_type ||
      BOOKING_DEFAULT_EXCEPTION.exception_type,

    starts_at: row.starts_at || null,
    ends_at: row.ends_at || null,

    is_full_day:
      row.is_full_day ??
      BOOKING_DEFAULT_EXCEPTION.is_full_day,

    recurrence_rule:
      row.recurrence_rule ||
      BOOKING_DEFAULT_EXCEPTION.recurrence_rule,

    reason:
      row.reason ||
      BOOKING_DEFAULT_EXCEPTION.reason,

    created_by: row.created_by || null,

    archived_at: row.archived_at || null,
    archived_by: row.archived_by || null,

    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

export function validateBookingException(payload = {}) {
  if (!payload.title?.trim()) {
    throw new Error("Exception title is required.");
  }

  if (!payload.exception_type) {
    throw new Error("Exception type is required.");
  }

  if (!payload.starts_at) {
    throw new Error("Start date is required.");
  }

  if (!payload.ends_at) {
    throw new Error("End date is required.");
  }

  const startsAt = new Date(payload.starts_at);
  const endsAt = new Date(payload.ends_at);

  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid start date.");
  }

  if (Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid end date.");
  }

  if (endsAt < startsAt) {
    throw new Error(
      "End date cannot be earlier than start date."
    );
  }
}

export function isExceptionArchived(exception) {
  return Boolean(exception?.archived_at);
}

export function isDateWithinException(
  date,
  exception
) {
  if (!date || !exception) {
    return false;
  }

  const targetDate = new Date(date);
  const startDate = new Date(exception.starts_at);
  const endDate = new Date(exception.ends_at);

  return (
    targetDate >= startDate &&
    targetDate <= endDate
  );
}

export function isDateBlocked(
  date,
  exceptions = []
) {
  return exceptions.some((exception) =>
    isDateWithinException(date, exception)
  );
}
