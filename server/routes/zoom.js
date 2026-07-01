const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const IS_PROD = process.env.NODE_ENV === 'production';
function safeErr(err) { return IS_PROD ? 'An unexpected error occurred.' : (err?.response?.data?.message || err?.message || 'Unknown error'); }

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { google } = require('googleapis');
const { supabase } = require('../config/supabase');
const { getEmailTemplate } = require('../templates/emailTemplate');
const { getTransporter } = require('../services/emailService');
const logger = require('../config/logger');

// ─── HTML ESCAPE (prevent XSS in email HTML bodies) ─────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── GENERATE ICS CONTENT ────────────────────────────────────────
function generateICS({ summary, description, location, startDateTime, endDateTime, organizer_email, attendee_email }) {
  const format = (dt) => dt.toISOString().replace(/-|:|\.\d{3}/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ExphonifyPH//Demo Booking//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@exphonifyph.com`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(startDateTime)}`,
    `DTEND:${format(endDateTime)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location || ''}`,
    `ORGANIZER;CN=ExphonifyPH:mailto:${organizer_email}`,
    `ATTENDEE;CN=${attendee_email};RSVP=TRUE:mailto:${attendee_email}`,
    `ATTENDEE;CN=${organizer_email};RSVP=FALSE:mailto:${organizer_email}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─── SHARED EMAIL BASE TEMPLATE ──────────────────────────────────
function buildEmail({ iconChar, bannerColor = '#c9930c', title, greeting, intro, detailRows = [], meetingLink, calendarLink, adminNote, footerNote }) {
  const rowsHtml = detailRows
    .filter(([, val]) => val)
    .map(([label, val], i, arr) => `
      <tr>
        <td style="padding:14px 20px;font-size:11px;font-weight:700;letter-spacing:0.8px;color:#9ca3af;width:38%;${i < arr.length - 1 ? 'border-bottom:1px solid #f0e0a0;' : ''}">${label}</td>
        <td style="padding:14px 20px;font-size:14px;font-weight:600;color:#1f2937;${i < arr.length - 1 ? 'border-bottom:1px solid #f0e0a0;' : ''}">${val}</td>
      </tr>`)
    .join('');

  const meetingBtn = meetingLink ? `
    <div style="text-align:center;margin:28px 0;">
      <a href="${meetingLink}" style="display:inline-block;background:#c9930c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:700;">
        Join Meeting
      </a>
    </div>` : '';

  const calendarRow = calendarLink ? `
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${calendarLink}" style="color:#c9930c;font-size:13px;text-decoration:underline;">View in Google Calendar</a>
    </div>` : '';

  const adminNoteHtml = adminNote ? `
    <div style="background:#fffbf0;border-left:4px solid #c9930c;border-radius:4px;padding:18px 20px;margin-bottom:28px;">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#c9930c;margin:0 0 8px;">Message from Our Team</p>
      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0;">${adminNote}</p>
    </div>` : '';

  const footerNoteHtml = footerNote ? `
    <p style="font-size:13px;color:#9ca3af;font-style:italic;margin:0 0 16px;">${footerNote}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

    <!-- Hero Banner - Matching image design -->
    <div style="background:#c9930c;padding:48px;text-align:center;">
      <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:rgba(255,255,255,0.15);font-size:24px;color:#fff;margin-bottom:16px;">
        ${iconChar}
      </div>
      <h1 style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;margin:0 0 8px;">${title}</h1>
      <div style="font-size:14px;color:rgba(255,255,255,0.8);font-weight:500;">Hermes</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;">
      <p style="font-size:16px;color:#1f2937;margin:0 0 12px;">${greeting}</p>
      <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 32px;">${intro}</p>

      <!-- Detail rows -->
      ${rowsHtml ? `
      <table style="width:100%;border-radius:8px;overflow:hidden;background:#fffbf0;border:1px solid #f0e0a0;margin-bottom:28px;border-collapse:collapse;">
        ${rowsHtml}
      </table>` : ''}

      ${meetingBtn}
      ${calendarRow}
      ${adminNoteHtml}

      <!-- Help Section -->
      <div style="border-top:1px solid #f3f4f6;padding-top:24px;margin-top:8px;">
        ${footerNoteHtml}
        <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0;">
          If you have any questions, feel free to reply to this email and we'll be happy to help.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:28px 48px;text-align:center;">
      <div style="margin-bottom:12px;">
        <a href="#" style="color:#9ca3af;font-size:12px;text-decoration:none;margin:0 10px;">Privacy Policy</a>
        <a href="#" style="color:#9ca3af;font-size:12px;text-decoration:none;margin:0 10px;">Terms of Service</a>
        <a href="#" style="color:#9ca3af;font-size:12px;text-decoration:none;margin:0 10px;">Contact Us</a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        © ${new Date().getFullYear()} <a href="#" style="color:#c9930c;text-decoration:none;font-weight:500;">Hermes</a>. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ─── EMAIL TRANSPORTER — delegates to shared emailService ────────

// ─── GOOGLE CALENDAR AUTH ────────────────────────────────────────
function getGoogleCalendarClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const key = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

// ─── ZOOM TOKEN ──────────────────────────────────────────────────
async function getZoomToken() {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {},
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  return res.data.access_token;
}

// ─── CREATE ZOOM MEETING ─────────────────────────────────────────
async function createZoomMeeting(full_name, company, startDateTime, message) {
  const token = await getZoomToken();

  const zoomRes = await axios.post(
    `https://api.zoom.us/v2/users/${process.env.ZOOM_USER_EMAIL}/meetings`,
    {
      topic: `Demo Call with ${full_name}${company ? ` (${company})` : ''}`,
      type: 2,
      start_time: startDateTime.toISOString(),
      duration: 30,
      timezone: 'Asia/Manila',
      agenda: message || 'Demo booking via website',
      settings: { host_video: true, participant_video: true, waiting_room: true },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    zoom_meeting_id: String(zoomRes.data.id),
    zoom_join_url: zoomRes.data.join_url,
    zoom_start_url: zoomRes.data.start_url,
  };
}

// ─── CREATE GOOGLE MEET VIA CALENDAR ────────────────────────────
async function createGoogleMeet(full_name, company, startDateTime, message) {
  const calendar = getGoogleCalendarClient();
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
  const meet_link = process.env.GOOGLE_MEET_LINK;

  const event = {
    summary: `Demo Call with ${full_name}${company ? ` (${company})` : ''}`,
    description: `${message || 'Demo booking via website'}\n\nGoogle Meet Link: ${meet_link}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Manila' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Manila' },
    location: meet_link,
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
  });

  return {
    meet_link,
    calendar_event_id: response.data.id,
    calendar_event_link: response.data.htmlLink,
  };
}

// ─── ADD TO GOOGLE CALENDAR ──────────────────────────────────────
async function addToGoogleCalendar(full_name, company, startDateTime, message, zoom_join_url) {
  const calendar = getGoogleCalendarClient();
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

  const event = {
    summary: `Demo Call with ${full_name}${company ? ` (${company})` : ''}`,
    description: `${message || 'Demo booking via website'}\n\nZoom Link: ${zoom_join_url}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'Asia/Manila' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'Asia/Manila' },
    location: zoom_join_url,
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
  });

  return {
    calendar_event_id: response.data.id,
    calendar_event_link: response.data.htmlLink,
  };
}

// ─── SEND PENDING EMAIL (on initial booking) ─────────────────────
async function sendPendingEmails({ full_name, email, company, preferred_date, preferred_time, platform, message }) {
  const platformLabel = platform === 'zoom' ? 'Zoom' : 'Google Meet';
  const safeName    = escapeHtml(full_name);
  const safeCompany = escapeHtml(company);
  const safeEmail   = escapeHtml(email);
  const safeDate    = escapeHtml(preferred_date);
  const safeTime    = escapeHtml(preferred_time);
  const safeMsg     = escapeHtml(message);

  // ── Email to CLIENT ──
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Demo Request Received — Awaiting Confirmation`,
    html: buildEmail({
      iconChar: '⏳',
      bannerColor: '#c9930c',
      title: 'Demo Request Received',
      greeting: `Hi <strong>${safeName}</strong>,`,
      intro: "Thank you for your interest! We've received your demo request and our team is currently reviewing it. You'll receive another email with your meeting link once your booking is confirmed.",
      detailRows: [
        ['REQUESTED DATE', safeDate],
        ['REQUESTED TIME', `${safeTime} (Asia/Manila)`],
        ['PLATFORM', platformLabel],
      ],
      footerNote: 'We typically respond within 24 hours on business days.',
    }),
  });

  // ── Email to ADMIN ──
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New Demo Request — ${full_name}${company ? ` (${company})` : ''} (Pending Approval)`,
    html: buildEmail({
      iconChar: '📋',
      bannerColor: '#8b6914',
      title: 'New Demo Booking Request',
      greeting: 'Hello Admin,',
      intro: 'A new demo has been requested and is awaiting your approval. Please review the details below and log in to the admin panel to take action.',
      detailRows: [
        ['NAME',      safeName],
        ['COMPANY',   safeCompany || '—'],
        ['EMAIL',     safeEmail],
        ['DATE',      safeDate],
        ['TIME',      `${safeTime} (Asia/Manila)`],
        ['PLATFORM',  platformLabel],
        ['MESSAGE',   safeMsg || null],
      ],
      meetingLink: 'http://localhost:3000/Admin/Booking',
      footerNote: 'This is an automated notification sent to you as the admin.',
    }),
  });
}

// ─── SEND APPROVAL EMAIL (with meeting link) ─────────────────────
async function sendApprovalEmail({ full_name, email, company, preferred_date, preferred_time, platform, message, meet_link, zoom_join_url, calendar_event_link, startDateTime, admin_message }) {
  const platformLabel = platform === 'zoom' ? 'Zoom' : 'Google Meet';
  const meetingLink   = platform === 'zoom' ? zoom_join_url : meet_link;
  const endDateTime   = new Date(startDateTime.getTime() + 30 * 60000);

  const safeName      = escapeHtml(full_name);
  const safeCompany   = escapeHtml(company);
  const safeEmail     = escapeHtml(email);
  const safeDate      = escapeHtml(preferred_date);
  const safeTime      = escapeHtml(preferred_time);
  const safeMsg       = escapeHtml(message);
  const safeAdminMsg  = escapeHtml(admin_message);
  const safeMeetLink  = escapeHtml(meetingLink);
  const safeCalLink   = escapeHtml(calendar_event_link);

  const icsContent = generateICS({
    summary: `Demo Call with ${full_name}${company ? ` (${company})` : ''}`,
    description: `${message || 'Demo booking'}\n\nMeeting Link: ${meetingLink || ''}`,
    location: meetingLink || '',
    startDateTime,
    endDateTime,
    organizer_email: process.env.EMAIL_USER,
    attendee_email: email,
  });

  // ── Email to CLIENT ──
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Demo Confirmed — ${preferred_date} at ${preferred_time}`,
    attachments: [
      {
        filename: 'booking.ics',
        content: icsContent,
        contentType: 'text/calendar; method=REQUEST',
      },
    ],
    html: buildEmail({
      iconChar: '✓',
      bannerColor: '#c9930c',
      title: 'Demo Booking Confirmed',
      greeting: `Hi <strong>${safeName}</strong>,`,
      intro: "Great news! Your demo has been approved. Here are your session details — a calendar invite is also attached so you can add it directly to your calendar.",
      detailRows: [
        ['DATE',         safeDate],
        ['TIME',         `${safeTime} (Asia/Manila)`],
        ['PLATFORM',     platformLabel],
        ['MEETING LINK', meetingLink ? `<a href="${safeMeetLink}" style="color:#c9930c;">${safeMeetLink}</a>` : null],
      ],
      meetingLink: safeMeetLink,
      calendarLink: safeCalLink,
      adminNote: safeAdminMsg || null,
      footerNote: '📅 Open the attached booking.ics to add this to your calendar.',
    }),
  });

  // ── Email to ADMIN ──
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `Demo Approved — ${full_name}${company ? ` (${company})` : ''} on ${preferred_date}`,
    html: buildEmail({
      iconChar: '✓',
      bannerColor: '#8b6914',
      title: 'Demo Booking Approved',
      greeting: 'Hello Admin,',
      intro: 'You have approved a demo booking. Here is a summary for your records.',
      detailRows: [
        ['NAME',           safeName],
        ['COMPANY',        safeCompany || '—'],
        ['EMAIL',          safeEmail],
        ['DATE',           safeDate],
        ['TIME',           `${safeTime} (Asia/Manila)`],
        ['PLATFORM',       platformLabel],
        ['MEETING LINK',   meetingLink ? `<a href="${safeMeetLink}" style="color:#c9930c;">${safeMeetLink}</a>` : null],
        ['CALENDAR EVENT', calendar_event_link ? `<a href="${safeCalLink}" style="color:#c9930c;">View in Google Calendar</a>` : null],
        ['CLIENT MESSAGE', safeMsg || null],
        ['YOUR NOTE',      safeAdminMsg || null],
      ],
      footerNote: 'This is an automated confirmation sent to you as the admin.',
    }),
  });
}

// ─── SEND REJECTION EMAIL ─────────────────────────────────────────
async function sendRejectionEmail({ full_name, email, preferred_date, preferred_time, admin_message }) {
  const safeName     = escapeHtml(full_name);
  const safeDate     = escapeHtml(preferred_date);
  const safeTime     = escapeHtml(preferred_time);
  const safeAdminMsg = escapeHtml(admin_message);

  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Demo Request Update`,
    html: buildEmail({
      iconChar: '✕',
      bannerColor: '#b45309',
      title: 'Booking Status Update',
      greeting: `Hi <strong>${safeName}</strong>,`,
      intro: `Thank you for your interest in Hermes. After reviewing your request, we're unfortunately unable to confirm your demo scheduled for <strong>${safeDate} at ${safeTime}</strong> at this time.`,
      detailRows: [
        ['REQUESTED DATE', safeDate],
        ['REQUESTED TIME', safeTime],
      ],
      adminNote: safeAdminMsg || null,
      footerNote: 'Please feel free to submit a new booking request with a different date or time — we look forward to connecting with you.',
    }),
  });
}

// ─── BOOK ROUTE ────────────────────────────────────────────────
router.post('/book', async (req, res) => {
  

  const {
    full_name, company, email, phone,
    preferred_date, preferred_time, platform,
    message, recaptcha_token
  } = req.body;

  try {
    if (!full_name || !email || !preferred_date || !preferred_time || !platform) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (process.env.RECAPTCHA_SECRET_KEY && recaptcha_token) {
      const verifyRes = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: recaptcha_token } }
      );
      if (!verifyRes.data.success) {
        return res.status(400).json({ success: false, error: 'reCAPTCHA verification failed.' });
      }
    }

    const startDateTime = new Date(`${preferred_date}T${preferred_time}:00`);
    if (isNaN(startDateTime)) {
      return res.status(400).json({ success: false, error: 'Invalid date/time format' });
    }

    const { data, error } = await supabase
      .from('demo_bookings')
      .insert({
        full_name,
        company:         company || null,
        email,
        phone:           phone || null,
        preferred_date,
        preferred_time,
        platform,
        message:         message || null,
        source:          'website',
        status:          'pending',
        zoom_meeting_id: null,
        zoom_join_url:   null,
        zoom_start_url:  null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Supabase insert error in book route");
      throw error;
    }

    await sendPendingEmails({ full_name, email, company, preferred_date, preferred_time, platform, message });

    res.json({ success: true, booking_id: data.id });

  } catch (err) {
    logger.error({ err: err.response?.data || err }, "Book route error");
    res.status(err.response?.status || 500).json({
      success: false,
      error:   safeErr(err),
      details: err.response?.data || null,
    });
  }
});

// ─── APPROVE ROUTE ────────────────────────────────────────────────
router.post('/approve/:id', async (req, res) => {
  

  const { id } = req.params;
  const { admin_message } = req.body;

  try {
    const { data: booking, error: fetchError } = await supabase
      .from('demo_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { full_name, company, email, preferred_date, preferred_time, platform, message } = booking;
    const startDateTime = new Date(`${preferred_date}T${preferred_time}`);

    let zoom_meeting_id = null, zoom_join_url = null, zoom_start_url = null;
    let meet_link = null, calendar_event_id = null, calendar_event_link = null;

    if (platform === 'zoom') {
      const zoomData = await createZoomMeeting(full_name, company, startDateTime, message);
      zoom_meeting_id = zoomData.zoom_meeting_id;
      zoom_join_url   = zoomData.zoom_join_url;
      zoom_start_url  = zoomData.zoom_start_url;

      const calData = await addToGoogleCalendar(full_name, company, startDateTime, message, zoom_join_url);
      calendar_event_id   = calData.calendar_event_id;
      calendar_event_link = calData.calendar_event_link;
    }

    if (platform === 'google_meet') {
      const meetData = await createGoogleMeet(full_name, company, startDateTime, message);
      meet_link           = meetData.meet_link;
      calendar_event_id   = meetData.calendar_event_id;
      calendar_event_link = meetData.calendar_event_link;
    }

    const { error: updateError } = await supabase
      .from('demo_bookings')
      .update({
        status: 'approved',
        zoom_meeting_id,
        zoom_join_url,
        zoom_start_url,
        calendar_event_id,
        calendar_event_link,
        meet_link,
        admin_message: admin_message || null,
        approved_at:   new Date().toISOString(),
        rejected_at:   null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await sendApprovalEmail({
      full_name, email, company, preferred_date, preferred_time,
      platform, message, meet_link, zoom_join_url, calendar_event_link,
      startDateTime, admin_message,
    });

    res.json({ success: true, zoom_join_url, meet_link, calendar_event_link });

  } catch (err) {
    logger.error({ err: err.response?.data || err }, "Approve route error");
    res.status(500).json({ success: false, error: safeErr(err) });
  }
});

// ─── REJECT ROUTE ─────────────────────────────────────────────────
router.post('/reject/:id', async (req, res) => {
  

  const { id } = req.params;
  const { admin_message } = req.body;

  try {
    const { data: booking, error: fetchError } = await supabase
      .from('demo_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    await deleteGoogleCalendarEvent(booking.calendar_event_id);

    const { error: updateError } = await supabase
      .from('demo_bookings')
      .update({
        status:             'rejected',
        admin_message:      admin_message || null,
        rejected_at:        new Date().toISOString(),
        zoom_meeting_id:    null,
        zoom_join_url:      null,
        zoom_start_url:     null,
        meet_link:          null,
        calendar_event_id:  null,
        calendar_event_link: null,
        approved_at:        null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await sendRejectionEmail({
      full_name:      booking.full_name,
      email:          booking.email,
      preferred_date: booking.preferred_date,
      preferred_time: booking.preferred_time,
      admin_message,
    });

    res.json({ success: true });

  } catch (err) {
    logger.error({ err }, "Reject route error");
    res.status(500).json({ success: false, error: safeErr(err) });
  }
});

// ─── DELETE ROUTE ─────────────────────────────────────────────────
router.delete('/booking/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('demo_bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    logger.error({ err }, "Delete route error");
    res.status(500).json({ success: false, error: safeErr(err) });
  }
});

// ─── DELETE GOOGLE CALENDAR EVENT ───────────────────────────────
async function deleteGoogleCalendarEvent(eventId) {
  if (!eventId) {
    logger.warn({ eventId }, 'deleteGoogleCalendarEvent: no eventId, skipping');
    return;
  }
  logger.debug({ eventId, calendarId: process.env.GOOGLE_CALENDAR_ID }, 'Deleting calendar event');
  try {
    const calendar = getGoogleCalendarClient();
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId,
    });
    logger.info({ eventId }, 'Calendar event deleted');
  } catch (err) {
    if (err.code === 410 || err?.response?.status === 410) {
      logger.warn(`Calendar event ${eventId} already gone (410), skipping.`);
    } else {
      logger.error({ err: safeErr(err), details: err?.response?.data }, "Failed to delete calendar event");
    }
  }
}

// ─── GET ALL BOOKINGS ─────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, bookings: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeErr(err) });
  }
});

// ─── TEST ROUTE ──────────────────────────────────────────────────
router.get('/test-zoom', async (req, res) => {
  try {
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const result = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {},
      { headers: { Authorization: `Basic ${credentials}` } }
    );

    res.json({ success: true, token: result.data.access_token });
  } catch (err) {
    res.json({ success: false, error: safeErr(err), details: err.response?.data });
  }
});

module.exports = router;