import { supabase } from "../../config/supabaseClient";

function normalizeDate(value) {
  if (!value) return null;

  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return null;

  if (/^\d{2}:\d{2}/.test(value)) {
    return String(value).slice(0, 5);
  }

  return value;
}

export async function getPublicBookingAvailability(workspaceId) {
  if (!workspaceId) {
    return {
      settings: null,
      exceptions: [],
      bookings: [],
    };
  }

  const [settingsResult, exceptionsResult, bookingsResult] =
    await Promise.all([
      supabase
        .from("client_booking_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),

      supabase
        .from("client_booking_exceptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null),

      supabase
        .from("client_bookings")
        .select(
          "id, preferred_date, preferred_time, status"
        )
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .in("status", [
          "pending",
          "approved",
          "rescheduled",
          "reschedule_requested",
        ]),
    ]);

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  if (exceptionsResult.error) {
    throw exceptionsResult.error;
  }

  if (bookingsResult.error) {
    throw bookingsResult.error;
  }

  return {
    settings: settingsResult.data || null,
    exceptions: exceptionsResult.data || [],
    bookings: bookingsResult.data || [],
  };
}

export function buildBookedSlotSet(bookings = []) {
  return new Set(
    bookings.map(
      (booking) =>
        `${normalizeDate(
          booking.preferred_date
        )}|${normalizeTime(
          booking.preferred_time
        )}`
    )
  );
}

export function isBookedSlot(
  bookedSlots,
  preferredDate,
  preferredTime
) {
  return bookedSlots.has(
    `${normalizeDate(preferredDate)}|${normalizeTime(
      preferredTime
    )}`
  );
}
