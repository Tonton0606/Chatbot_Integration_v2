import { parseBookingDateTime, requireValue } from "./utils";

export function normalizeRecipient(item = {}) {
  return {
    id: item.id || null,
    type: item.type || "other",
    name: item.name || item.full_name || item.email || "",
    email: item.email || "",
  };
}

export function validateBookingPayload(payload) {
  requireValue(payload.workspace_id, "Workspace ID is required.");
  requireValue(payload.title, "Booking title is required.");
  requireValue(payload.creator_type, "Meeting owner type is required.");
  requireValue(payload.creator_name, "Meeting owner name is required.");
  requireValue(payload.creator_email, "Meeting owner email is required.");
  requireValue(payload.booking_mode, "Booking mode is required.");
  requireValue(payload.preferred_date, "Preferred date is required.");
  requireValue(payload.preferred_time, "Preferred time is required.");

  if (!["zoom", "google_meet"].includes(payload.platform)) {
    throw new Error("Platform must be Zoom or Google Meet.");
  }

  if (payload.booking_mode === "one_on_one") {
    requireValue(payload.recipient_type, "Recipient type is required.");
    requireValue(payload.recipient_name, "Recipient name is required.");
    requireValue(payload.recipient_email, "Recipient email is required.");
  }

  if (payload.booking_mode === "multiple") {
    if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      throw new Error("At least one recipient is required.");
    }

    payload.recipients.forEach((recipient) => {
      requireValue(
        recipient.email,
        "Every recipient must have an email."
      );
    });
  }
}

export function normalizeClientBooking(row = {}) {
  const meetingLink =
    row.platform === "zoom"
      ? row.zoom_join_url || row.meeting_link
      : row.meet_link || row.meeting_link;

  return {
    id: row.id,
    workspace_id: row.workspace_id,

    title: row.title || "Untitled Booking",

    full_name: row.full_name || "",
    email: row.email || "",
    phone: row.phone || "",
    company: row.company || "",

    creator_type: row.creator_type || "self",
    creator_name: row.creator_name || row.full_name || "",
    creator_email: row.creator_email || row.email || "",
    creator_contact_id: row.creator_contact_id || null,
    creator_employee_id: row.creator_employee_id || null,

    booking_mode: row.booking_mode || "one_on_one",

    recipient_type: row.recipient_type || "other",
    recipient_user_id: row.recipient_user_id || null,
    recipient_contact_id: row.recipient_contact_id || null,
    recipient_name: row.recipient_name || "",
    recipient_email: row.recipient_email || "",

    recipients: Array.isArray(row.recipients)
      ? row.recipients
      : [],

    preferred_date: row.preferred_date,
    preferred_time: row.preferred_time,

    original_preferred_date:
      row.original_preferred_date || null,

    original_preferred_time:
      row.original_preferred_time || null,

    platform: row.platform || "zoom",
    meeting_type: row.meeting_type || "video",

    status: row.status || "pending",
    source: row.source || "manual",

    service_interest: row.service_interest || "",

    message: row.message || "",
    client_message: row.client_message || "",
    rejection_reason: row.rejection_reason || "",
    reschedule_reason: row.reschedule_reason || "",

    meeting_link: meetingLink || "",

    meeting_id:
      row.meeting_id ||
      row.zoom_meeting_id ||
      "",

    meeting_password:
      row.meeting_password || "",

    zoom_meeting_id:
      row.zoom_meeting_id || "",

    zoom_join_url:
      row.zoom_join_url || "",

    zoom_start_url:
      row.zoom_start_url || "",

    meet_link:
      row.meet_link || "",

    calendar_event_id:
      row.calendar_event_id || "",

    calendar_event_link:
      row.calendar_event_link || "",

    created_by:
      row.created_by || null,

    approved_by:
      row.approved_by || null,

    rejected_by:
      row.rejected_by || null,

    rescheduled_by:
      row.rescheduled_by || null,

    approved_at:
      row.approved_at,

    rejected_at:
      row.rejected_at,

    rescheduled_at:
      row.rescheduled_at,

    archived_at:
      row.archived_at,

    archived_by:
      row.archived_by || null,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,

    dateTime: parseBookingDateTime(
      row.preferred_date,
      row.preferred_time
    ),
  };
}
