import { supabase } from "../../../config/supabaseClient";

import {
  normalizeBookingSettings,
  normalizeBookingException,
} from "./utils";

export async function getBookingSettings(
  workspaceId
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const { data, error } = await supabase
    .from("client_booking_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeBookingSettings(data || {});
}

export async function getBookingExceptions(
  workspaceId
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const { data, error } = await supabase
    .from("client_booking_exceptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("starts_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(
    normalizeBookingException
  );
}

export async function getActiveBookingExceptions(
  workspaceId,
  startDate,
  endDate
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  let query = supabase
    .from("client_booking_exceptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (startDate) {
    query = query.gte("ends_at", startDate);
  }

  if (endDate) {
    query = query.lte("starts_at", endDate);
  }

  const { data, error } = await query.order(
    "starts_at",
    {
      ascending: true,
    }
  );

  if (error) {
    throw error;
  }

  return (data || []).map(
    normalizeBookingException
  );
}

export async function getBlockedDates(
  workspaceId,
  startDate,
  endDate
) {
  const exceptions =
    await getActiveBookingExceptions(
      workspaceId,
      startDate,
      endDate
    );

  return exceptions.filter(
    (exception) =>
      exception.exception_type ===
        "unavailable" ||
      exception.exception_type ===
        "vacation" ||
      exception.exception_type ===
        "holiday"
  );
}
