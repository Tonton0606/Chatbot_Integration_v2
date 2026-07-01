const logger = require('../config/logger');
const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const { supabase } = require("../config/supabase");
const { getTransporter } = require("../services/emailService");
const { requireAuth } = require("../middleware/auth");
const { safeError } = require("../utils/safeError");

const router = express.Router();

const TIMEZONE = "Asia/Manila";
const DEFAULT_DURATION_MINUTES = 30;

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} is not configured.`);
  }

  return process.env[name];
}

function parseStartDateTime(preferredDate, preferredTime) {
  const startDateTime = new Date(`${preferredDate}T${preferredTime}`);

  if (Number.isNaN(startDateTime.getTime())) {
    throw new Error("Invalid booking date or time.");
  }

  return startDateTime;
}

function getEndDateTime(startDateTime) {
  return new Date(
    startDateTime.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000
  );
}

function getMeetingTitle(booking) {
  return `${booking.title || "Workspace Meeting"} with ${
    booking.recipient_name ||
    booking.creator_name ||
    booking.full_name ||
    "Guest"
  }`;
}

function getMeetingRecipients(booking) {
  if (booking.booking_mode === "multiple" && Array.isArray(booking.recipients)) {
    return booking.recipients
      .filter((recipient) => recipient?.email)
      .map((recipient) => ({
        name: recipient.name || recipient.email,
        email: recipient.email,
      }));
  }

  if (booking.recipient_email) {
    return [
      {
        name: booking.recipient_name || booking.recipient_email,
        email: booking.recipient_email,
      },
    ];
  }

  return [];
}

function generateICS({
  summary,
  description,
  location,
  startDateTime,
  endDateTime,
  organizerEmail,
  attendees,
}) {
  const format = (date) => date.toISOString().replace(/-|:|\.\d{3}/g, "");

  const attendeeRows = attendees
    .map(
      (attendee) =>
        `ATTENDEE;CN=${attendee.name};RSVP=TRUE:mailto:${attendee.email}`
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExponifyPH//Client Booking//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@exponifyph.com`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(startDateTime)}`,
    `DTEND:${format(endDateTime)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${String(description || "").replace(/\n/g, "\\n")}`,
    `LOCATION:${location || ""}`,
    `ORGANIZER;CN=ExponifyPH:mailto:${organizerEmail}`,
    attendeeRows,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildClientBookingEmail({
  title,
  greeting,
  intro,
  detailRows,
  meetingLink,
  calendarLink,
  note,
}) {
  const rows = detailRows
    .filter((row) => row.value)
    .map(
      (row) => `
        <tr>
          <td style="padding:12px 16px;font-size:11px;font-weight:700;letter-spacing:.7px;color:#9ca3af;width:36%;border-bottom:1px solid #f0e0a0;">
            ${row.label}
          </td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1f2937;border-bottom:1px solid #f0e0a0;">
            ${row.value}
          </td>
        </tr>
      `
    )
    .join("");

  const meetingButton = meetingLink
    ? `
      <div style="text-align:center;margin:28px 0;">
        <a href="${meetingLink}" style="display:inline-block;background:#c9930c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:700;">
          Join Meeting
        </a>
      </div>
    `
    : "";

  const calendarButton = calendarLink
    ? `
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${calendarLink}" style="color:#c9930c;font-size:13px;text-decoration:underline;">
          View in Google Calendar
        </a>
      </div>
    `
    : "";

  const noteBlock = note
    ? `
      <div style="background:#fffbf0;border-left:4px solid #c9930c;border-radius:6px;padding:16px 18px;margin-top:24px;">
        <p style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#c9930c;margin:0 0 8px;">
          Message
        </p>
        <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0;">
          ${note}
        </p>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
          <div style="background:#c9930c;padding:40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">
              ${title}
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">
              ExponifyPH Workspace Booking
            </p>
          </div>

          <div style="padding:36px 42px;">
            <p style="font-size:16px;color:#1f2937;margin:0 0 12px;">
              ${greeting}
            </p>

            <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 28px;">
              ${intro}
            </p>

            <table style="width:100%;border-radius:8px;overflow:hidden;background:#fffbf0;border:1px solid #f0e0a0;border-collapse:collapse;">
              ${rows}
            </table>

            ${meetingButton}
            ${calendarButton}
            ${noteBlock}

            <div style="border-top:1px solid #f3f4f6;margin-top:28px;padding-top:20px;">
              <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0;">
                This is an automated workspace booking notification.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function getWorkspaceIntegration(workspaceId, provider) {
  const { data, error } = await supabase
    .from("workspace_integrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.access_token && !data?.refresh_token) {
    throw new Error(
      `No active ${provider} integration found for this workspace. Connect ${provider} first.`
    );
  }

  return data;
}

async function updateIntegrationTokens(integrationId, updates) {
  const { data, error } = await supabase
    .from("workspace_integrations")
    .update(updates)
    .eq("id", integrationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;

  return new Date(expiresAt).getTime() <= Date.now() + 60 * 1000;
}

async function getGoogleAccessToken(integration) {
  if (!isExpired(integration.expires_at) && integration.access_token) {
    return integration.access_token;
  }

  if (!integration.refresh_token) {
    throw new Error("Google integration expired. Please reconnect Google.");
  }

  const response = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const tokens = response.data;

  await updateIntegrationTokens(integration.id, {
    access_token: tokens.access_token,
    expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
  });

  return tokens.access_token;
}

async function getZoomAccessToken(integration) {
  if (!isExpired(integration.expires_at) && integration.access_token) {
    return integration.access_token;
  }

  if (!integration.refresh_token) {
    throw new Error("Zoom integration expired. Please reconnect Zoom.");
  }

  const credentials = Buffer.from(
    `${requireEnv("ZOOM_OAUTH_CLIENT_ID")}:${requireEnv(
      "ZOOM_OAUTH_CLIENT_SECRET"
    )}`
  ).toString("base64");

  const response = await axios.post(
    "https://zoom.us/oauth/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const tokens = response.data;

  await updateIntegrationTokens(integration.id, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || integration.refresh_token,
    expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
  });

  return tokens.access_token;
}

async function createGoogleMeetFromWorkspace(booking, startDateTime) {
  const integration = await getWorkspaceIntegration(
    booking.workspace_id,
    "google"
  );

  const accessToken = await getGoogleAccessToken(integration);

  const oauth2Client = new google.auth.OAuth2(
    requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    requireEnv("GOOGLE_OAUTH_CLIENT_SECRET")
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: integration.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  const attendees = getMeetingRecipients(booking);
  const endDateTime = getEndDateTime(startDateTime);

  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: getMeetingTitle(booking),
      description: booking.message || "Workspace meeting",
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: TIMEZONE,
      },
      attendees: attendees.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
      conferenceData: {
        createRequest: {
          requestId: `client-booking-${booking.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  const meetLink =
    response.data.hangoutLink ||
    response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri ||
    "";

  return {
    meet_link: meetLink,
    calendar_event_id: response.data.id,
    calendar_event_link: response.data.htmlLink,
  };
}

async function createZoomFromWorkspace(booking, startDateTime) {
  const integration = await getWorkspaceIntegration(
    booking.workspace_id,
    "zoom"
  );

  const accessToken = await getZoomAccessToken(integration);

  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic: getMeetingTitle(booking),
      type: 2,
      start_time: startDateTime.toISOString(),
      duration: DEFAULT_DURATION_MINUTES,
      timezone: TIMEZONE,
      agenda: booking.message || "Workspace meeting",
      settings: {
        host_video: true,
        participant_video: true,
        waiting_room: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return {
    zoom_meeting_id: String(response.data.id),
    zoom_join_url: response.data.join_url,
    zoom_start_url: response.data.start_url,
  };
}

async function sendClientApprovalEmails({
  booking,
  meetingLink,
  calendarEventLink,
  clientMessage,
  startDateTime,
}) {
  const organizerEmail = process.env.EMAIL_USER;
  const attendees = getMeetingRecipients(booking);
  const endDateTime = getEndDateTime(startDateTime);

  if (!attendees.length) {
    return;
  }

  const platformLabel =
    booking.platform === "google_meet" ? "Google Meet" : "Zoom";

  const icsContent = generateICS({
    summary: getMeetingTitle(booking),
    description: `${booking.message || "Workspace meeting"}\n\nMeeting Link: ${
      meetingLink || ""
    }`,
    location: meetingLink || "",
    startDateTime,
    endDateTime,
    organizerEmail,
    attendees,
  });

  await Promise.all(
    attendees.map((attendee) =>
      getTransporter().sendMail({
        from: organizerEmail,
        to: attendee.email,
        subject: `Meeting Confirmed — ${booking.title}`,
        attachments: [
          {
            filename: "workspace-booking.ics",
            content: icsContent,
            contentType: "text/calendar; method=REQUEST",
          },
        ],
        html: buildClientBookingEmail({
          title: "Meeting Confirmed",
          greeting: `Hi <strong>${attendee.name}</strong>,`,
          intro:
            "Your workspace meeting has been approved. The meeting details are listed below.",
          detailRows: [
            {
              label: "TITLE",
              value: booking.title,
            },
            {
              label: "DATE",
              value: booking.preferred_date,
            },
            {
              label: "TIME",
              value: `${booking.preferred_time} (${TIMEZONE})`,
            },
            {
              label: "PLATFORM",
              value: platformLabel,
            },
            {
              label: "OWNER",
              value: booking.creator_name || booking.full_name,
            },
            {
              label: "MEETING LINK",
              value: meetingLink
                ? `<a href="${meetingLink}" style="color:#c9930c;">${meetingLink}</a>`
                : null,
            },
          ],
          meetingLink,
          calendarLink: calendarEventLink,
          note: clientMessage || booking.client_message || null,
        }),
      })
    )
  );

  if (booking.creator_email) {
    await getTransporter().sendMail({
      from: organizerEmail,
      to: booking.creator_email,
      subject: `Workspace Meeting Approved — ${booking.title}`,
      html: buildClientBookingEmail({
        title: "Workspace Meeting Approved",
        greeting: `Hi <strong>${booking.creator_name || "there"}</strong>,`,
        intro:
          "Your workspace booking has been approved and meeting details have been generated.",
        detailRows: [
          {
            label: "TITLE",
            value: booking.title,
          },
          {
            label: "DATE",
            value: booking.preferred_date,
          },
          {
            label: "TIME",
            value: `${booking.preferred_time} (${TIMEZONE})`,
          },
          {
            label: "PLATFORM",
            value: platformLabel,
          },
          {
            label: "MEETING LINK",
            value: meetingLink
              ? `<a href="${meetingLink}" style="color:#c9930c;">${meetingLink}</a>`
              : null,
          },
        ],
        meetingLink,
        calendarLink: calendarEventLink,
        note: clientMessage || null,
      }),
    });
  }
}

async function sendClientRejectionEmails({ booking, rejectionReason }) {
  const attendees = getMeetingRecipients(booking);

  if (!attendees.length) {
    return;
  }

  await Promise.all(
    attendees.map((attendee) =>
      getTransporter().sendMail({
        from: process.env.EMAIL_USER,
        to: attendee.email,
        subject: `Meeting Request Update — ${booking.title}`,
        html: buildClientBookingEmail({
          title: "Meeting Request Update",
          greeting: `Hi <strong>${attendee.name}</strong>,`,
          intro:
            "The workspace meeting request could not be approved at this time.",
          detailRows: [
            {
              label: "TITLE",
              value: booking.title,
            },
            {
              label: "REQUESTED DATE",
              value: booking.preferred_date,
            },
            {
              label: "REQUESTED TIME",
              value: booking.preferred_time,
            },
          ],
          note: rejectionReason || booking.rejection_reason || null,
        }),
      })
    )
  );
}

router.post("/approve/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { client_message } = req.body;
  const workspaceId = req.workspaceId;

  try {
    const { data: booking, error: fetchError } = await supabase
      .from("client_bookings")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        error: "Client booking not found.",
      });
    }

    const startDateTime = parseStartDateTime(
      booking.preferred_date,
      booking.preferred_time
    );

    let zoomMeetingId = null;
    let zoomJoinUrl = null;
    let zoomStartUrl = null;
    let meetLink = null;
    let calendarEventId = null;
    let calendarEventLink = null;
    let meetingLink = null;

    if (booking.platform === "zoom") {
      const zoomData = await createZoomFromWorkspace(booking, startDateTime);

      zoomMeetingId = zoomData.zoom_meeting_id;
      zoomJoinUrl = zoomData.zoom_join_url;
      zoomStartUrl = zoomData.zoom_start_url;
      meetingLink = zoomJoinUrl;
    } else if (booking.platform === "google_meet") {
      const meetData = await createGoogleMeetFromWorkspace(
        booking,
        startDateTime
      );

      meetLink = meetData.meet_link;
      meetingLink = meetLink;
      calendarEventId = meetData.calendar_event_id;
      calendarEventLink = meetData.calendar_event_link;
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported booking platform.",
      });
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("client_bookings")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        client_message: client_message || null,

        meeting_link: meetingLink,
        meeting_id: zoomMeetingId,

        zoom_meeting_id: zoomMeetingId,
        zoom_join_url: zoomJoinUrl,
        zoom_start_url: zoomStartUrl,

        meet_link: meetLink,

        calendar_event_id: calendarEventId,
        calendar_event_link: calendarEventLink,

        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    await sendClientApprovalEmails({
      booking: updatedBooking,
      meetingLink,
      calendarEventLink,
      clientMessage: client_message,
      startDateTime,
    });

    return res.json({
      success: true,
      booking: updatedBooking,
      meeting_link: meetingLink,
      zoom_join_url: zoomJoinUrl,
      zoom_start_url: zoomStartUrl,
      meet_link: meetLink,
      calendar_event_id: calendarEventId,
      calendar_event_link: calendarEventLink,
    });
  } catch (error) {
    logger.error({ err: error.response?.data || error }, "CLIENT BOOKING APPROVE ERROR");

    return res.status(500).json({
      success: false,
      error: safeError(error, "Failed to approve booking."),
    });
  }
});

router.post("/reject/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const workspaceId = req.workspaceId;

  try {
    const { data: booking, error: fetchError } = await supabase
      .from("client_bookings")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        error: "Client booking not found.",
      });
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("client_bookings")
      .update({
        status: "rejected",
        rejection_reason: rejection_reason || null,
        rejected_at: new Date().toISOString(),

        meeting_link: null,
        meeting_id: null,

        zoom_meeting_id: null,
        zoom_join_url: null,
        zoom_start_url: null,

        meet_link: null,

        calendar_event_id: null,
        calendar_event_link: null,

        approved_at: null,
        approved_by: null,
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    await sendClientRejectionEmails({
      booking: updatedBooking,
      rejectionReason: rejection_reason,
    });

    return res.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    logger.error({ err: error }, "CLIENT BOOKING REJECT ERROR:");

    return res.status(500).json({
      success: false,
      error: safeError(error, "Failed to reject booking."),
    });
  }
});


/* ======================================================
   REBOOK CLIENT BOOKING
====================================================== */

router.post("/rebook/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const workspaceId = req.workspaceId;

  const {
    preferred_date,
    preferred_time,
    reschedule_reason,
    user_id,
  } = req.body;

  try {

    if (!preferred_date || !preferred_time) {
      return res.status(400).json({
        success: false,
        error:
          "New preferred date and time are required.",
      });
    }


    const {
      data: booking,
      error: fetchError,
    } = await supabase
      .from("client_bookings")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .single();


    if (fetchError || !booking) {

      return res.status(404).json({
        success: false,
        error:
          "Client booking not found.",
      });

    }


    const {
      data: updatedBooking,
      error: updateError,
    } = await supabase
      .from("client_bookings")
      .update({

        original_preferred_date:
          booking.original_preferred_date ||
          booking.preferred_date,

        original_preferred_time:
          booking.original_preferred_time ||
          booking.preferred_time,


        preferred_date,
        preferred_time,


        status:
          "rescheduled",


        rescheduled_at:
          new Date().toISOString(),

        rescheduled_by:
          user_id || null,

        reschedule_reason:
          reschedule_reason || null,


        meeting_link:
          null,

        meeting_id:
          null,

        meeting_password:
          null,


        zoom_meeting_id:
          null,

        zoom_join_url:
          null,

        zoom_start_url:
          null,


        meet_link:
          null,


        calendar_event_id:
          null,

        calendar_event_link:
          null,


        approved_at:
          null,

        approved_by:
          null,


        rejected_at:
          null,

        rejected_by:
          null,

        rejection_reason:
          null,


        updated_at:
          new Date().toISOString(),

      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();


    if (updateError) {
      throw updateError;
    }


    return res.json({

      success:
        true,

      booking:
        updatedBooking,

    });

  } catch (error) {

    logger.error({ err: error }, "CLIENT BOOKING REBOOK ERROR:");


    return res.status(500).json({
      success: false,
      error: safeError(error, "Failed to rebook booking."),
    });
  }
});


router.get("/test", (_req, res) => {
  return res.json({
    success: true,
    route: "client-bookings",
  });
});

module.exports = router;
