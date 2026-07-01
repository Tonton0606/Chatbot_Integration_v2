import { supabase } from "../../config/supabaseClient";

import { API_BASE_URL, parseApiResponse } from "./api";
import {
  requireValue,
  normalizeDate,
  normalizeTime,
} from "./utils";
import {
  normalizeRecipient,
  normalizeClientBooking,
  validateBookingPayload,
} from "./normalizers";
import { getCurrentUserProfile } from "./workspace";

export async function createClientBooking(workspaceId, payload) {
  const currentUser = await getCurrentUserProfile();

  const normalizedRecipients = Array.isArray(payload.recipients)
    ? payload.recipients.map(normalizeRecipient)
    : [];

  const bookingPayload = {
    workspace_id: workspaceId,

    title: payload.title?.trim(),

    full_name: payload.creator_name?.trim(),
    email: payload.creator_email?.trim(),
    phone: payload.phone || null,
    company: payload.company || null,

    creator_type: payload.creator_type || "self",
    creator_name: payload.creator_name?.trim(),
    creator_email: payload.creator_email?.trim(),
    creator_contact_id: payload.creator_contact_id || null,
    creator_employee_id: payload.creator_employee_id || null,

    booking_mode: payload.booking_mode || "one_on_one",

    recipient_type: payload.recipient_type || null,
    recipient_user_id: payload.recipient_user_id || null,
    recipient_contact_id: payload.recipient_contact_id || null,
    recipient_name: payload.recipient_name || null,
    recipient_email: payload.recipient_email || null,

    recipients: normalizedRecipients,

    preferred_date: normalizeDate(payload.preferred_date),
    preferred_time: normalizeTime(payload.preferred_time),

    platform: payload.platform || "zoom",
    meeting_type: "video",

    status: "pending",
    source: payload.source || "manual",

    message: payload.message || null,
    client_message: payload.client_message || null,
    service_interest: payload.service_interest || null,

    created_by: currentUser.id,
  };

  validateBookingPayload(bookingPayload);

  const { data, error } = await supabase
    .from("client_bookings")
    .insert(bookingPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeClientBooking(data);
}

export async function updateClientBooking(id, payload) {
  requireValue(id, "Booking ID is required.");

  const updatePayload = {
    title: payload.title,

    full_name: payload.creator_name,
    email: payload.creator_email,
    phone: payload.phone,
    company: payload.company,

    creator_type: payload.creator_type,
    creator_name: payload.creator_name,
    creator_email: payload.creator_email,
    creator_contact_id: payload.creator_contact_id,
    creator_employee_id: payload.creator_employee_id,

    booking_mode: payload.booking_mode,

    recipient_type: payload.recipient_type,
    recipient_user_id: payload.recipient_user_id,
    recipient_contact_id: payload.recipient_contact_id,
    recipient_name: payload.recipient_name,
    recipient_email: payload.recipient_email,

    recipients: Array.isArray(payload.recipients)
      ? payload.recipients.map(normalizeRecipient)
      : undefined,

    preferred_date: payload.preferred_date
      ? normalizeDate(payload.preferred_date)
      : undefined,

    preferred_time: payload.preferred_time
      ? normalizeTime(payload.preferred_time)
      : undefined,

    platform: payload.platform,
    meeting_type: "video",

    message: payload.message,
    client_message: payload.client_message,
    service_interest: payload.service_interest,
    source: payload.source,
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  if (
    updatePayload.platform &&
    !["zoom", "google_meet"].includes(updatePayload.platform)
  ) {
    throw new Error("Platform must be Zoom or Google Meet.");
  }

  const { data, error } = await supabase
    .from("client_bookings")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeClientBooking(data);
}

export async function approveClientBooking(id, payload = {}) {
  requireValue(id, "Booking ID is required.");

  const response = await fetch(
    `${API_BASE_URL}/client-bookings/approve/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_message:
          payload.client_message ||
          "Your booking has been approved.",
      }),
    }
  );

  const result = await parseApiResponse(response);

  return normalizeClientBooking(result.booking);
}

export async function rejectClientBooking(id, rejectionReason) {
  requireValue(id, "Booking ID is required.");
  requireValue(
    rejectionReason,
    "Rejection reason is required."
  );

  const response = await fetch(
    `${API_BASE_URL}/client-bookings/reject/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rejection_reason: rejectionReason,
      }),
    }
  );

  const result = await parseApiResponse(response);

  return normalizeClientBooking(result.booking);
}

export async function rebookClientBooking(id, payload = {}) {
  requireValue(id, "Booking ID is required.");
  requireValue(
    payload.preferred_date,
    "New preferred date is required."
  );
  requireValue(
    payload.preferred_time,
    "New preferred time is required."
  );

  const currentUser = await getCurrentUserProfile();

  const response = await fetch(
    `${API_BASE_URL}/client-bookings/rebook/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preferred_date: normalizeDate(
          payload.preferred_date
        ),
        preferred_time: normalizeTime(
          payload.preferred_time
        ),
        reschedule_reason:
          payload.reschedule_reason || null,
        user_id: currentUser.id,
      }),
    }
  );

  const result = await parseApiResponse(response);

  return normalizeClientBooking(result.booking);
}

export async function archiveClientBooking(id) {
  requireValue(id, "Booking ID is required.");

  const currentUser = await getCurrentUserProfile();

  const { data, error } = await supabase
    .from("client_bookings")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: currentUser.id,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeClientBooking(data);
}
