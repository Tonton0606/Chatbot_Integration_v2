import { supabase } from "../../../config/supabaseClient";

import {
  normalizeBookingSettings,
  normalizeBookingException,
  validateBookingException,
} from "./utils";

export async function saveBookingSettings(
  workspaceId,
  payload = {}
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const settingsPayload = {
    workspace_id: workspaceId,
    timezone: payload.timezone || "Asia/Manila",
    slot_duration_minutes:
      Number(payload.slot_duration_minutes) || 60,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("client_booking_settings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  let result;
  let error;

  if (existing?.id) {
    ({ data: result, error } = await supabase
      .from("client_booking_settings")
      .update(settingsPayload)
      .eq("id", existing.id)
      .select("*")
      .single());
  } else {
    ({ data: result, error } = await supabase
      .from("client_booking_settings")
      .insert(settingsPayload)
      .select("*")
      .single());
  }

  if (error) {
    throw error;
  }

  return normalizeBookingSettings(result);
}

export async function createBookingException(
  workspaceId,
  payload = {}
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  validateBookingException(payload);

  const exceptionPayload = {
    workspace_id: workspaceId,

    title: payload.title.trim(),

    exception_type: payload.exception_type,

    starts_at: payload.starts_at,
    ends_at: payload.ends_at,

    is_full_day:
      payload.is_full_day ?? true,

    recurrence_rule:
      payload.recurrence_rule || null,

    reason: payload.reason || null,

    created_by:
      payload.created_by || null,
  };

  const { data, error } = await supabase
    .from("client_booking_exceptions")
    .insert(exceptionPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeBookingException(data);
}

export async function updateBookingException(
  id,
  payload = {}
) {
  if (!id) {
    throw new Error("Exception ID is required.");
  }

  validateBookingException(payload);

  const updatePayload = {
    title: payload.title.trim(),

    exception_type: payload.exception_type,

    starts_at: payload.starts_at,
    ends_at: payload.ends_at,

    is_full_day:
      payload.is_full_day ?? true,

    recurrence_rule:
      payload.recurrence_rule || null,

    reason: payload.reason || null,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("client_booking_exceptions")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeBookingException(data);
}

export async function archiveBookingException(
  id,
  archivedBy = null
) {
  if (!id) {
    throw new Error("Exception ID is required.");
  }

  const { data, error } = await supabase
    .from("client_booking_exceptions")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: archivedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeBookingException(data);
}
