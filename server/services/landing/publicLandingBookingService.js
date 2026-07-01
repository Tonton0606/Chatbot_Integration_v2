const {
  captureExternalLandingLead,
  resolveLandingTarget,
  trackLandingEvent,
} = require("./publicLandingSubmitService");

const { supabase } = require("../../config/supabase");

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  const email = cleanText(value).toLowerCase();
  return email || null;
}

function buildFullName(payload = {}) {
  const firstName = cleanText(payload.first_name);
  const lastName = cleanText(payload.last_name);
  const fullName = cleanText(payload.full_name);

  return `${firstName} ${lastName}`.trim() || fullName || "Landing Page Visitor";
}

function requireBookingFields(payload = {}) {
  if (!payload.preferred_date) {
    throw new Error("preferred_date is required.");
  }

  if (!payload.preferred_time) {
    throw new Error("preferred_time is required.");
  }

  const email = cleanText(payload.email);
  const phone = cleanText(payload.phone);

  if (!email && !phone) {
    throw new Error("Please provide either an email address or phone number.");
  }
}

function normalizeDate(value) {
  if (!value) return null;

  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return null;

  if (/^\d{2}:\d{2}/.test(value)) {
    return String(value).slice(0, 5);
  }

  const [rawTime, rawPeriod] = String(value).trim().split(/\s+/);
  const [rawHour, rawMinute = "00"] = String(rawTime || "").split(":");

  let hour = Number(rawHour);
  const minute = Number(rawMinute);
  const period = String(rawPeriod || "").toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return String(value).slice(0, 5);
  }

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildBookingDateTime(preferredDate, preferredTime) {
  const date = normalizeDate(preferredDate);
  const time = normalizeTime(preferredTime);

  if (!date || !time) return null;

  const dateTime = new Date(`${date}T${time}:00`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
}

function isSameDate(left, right) {
  return normalizeDate(left) === normalizeDate(right);
}

function isDateWithinRange(targetDate, startsAt, endsAt) {
  const target = new Date(`${normalizeDate(targetDate)}T12:00:00`);
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    Number.isNaN(target.getTime()) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return false;
  }

  return target >= start && target <= end;
}

function isDateTimeWithinRange(targetDateTime, startsAt, endsAt) {
  if (!targetDateTime) return false;

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return targetDateTime >= start && targetDateTime <= end;
}

function getWeekdayRRuleValue(date) {
  const weekday = new Date(`${normalizeDate(date)}T12:00:00`).getDay();

  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][weekday];
}

function matchesRecurrenceRule(preferredDate, exception) {
  const rule = cleanText(exception.recurrence_rule).toUpperCase();

  if (!rule) {
    return false;
  }

  const startsOn = normalizeDate(exception.starts_at);
  const preferredOn = normalizeDate(preferredDate);

  if (!startsOn || !preferredOn || preferredOn < startsOn) {
    return false;
  }

  if (rule.includes("FREQ=DAILY")) {
    return true;
  }

  if (rule.includes("FREQ=WEEKLY")) {
    const weekday = getWeekdayRRuleValue(preferredDate);
    return rule.includes(`BYDAY=${weekday}`) || !rule.includes("BYDAY=");
  }

  if (rule.includes("FREQ=MONTHLY")) {
    return new Date(`${preferredOn}T12:00:00`).getDate() ===
      new Date(`${startsOn}T12:00:00`).getDate();
  }

  if (rule.includes("FREQ=YEARLY")) {
    return preferredOn.slice(5) === startsOn.slice(5);
  }

  return false;
}

function isExceptionBlockingBooking({ exception, preferredDate, preferredDateTime }) {
  if (!exception || exception.archived_at) {
    return false;
  }

  if (exception.recurrence_rule) {
    return matchesRecurrenceRule(preferredDate, exception);
  }

  if (exception.is_full_day) {
    return isDateWithinRange(preferredDate, exception.starts_at, exception.ends_at);
  }

  return isDateTimeWithinRange(
    preferredDateTime,
    exception.starts_at,
    exception.ends_at
  );
}

async function getLandingBookingMapping({ workspaceId, landingPageId }) {
  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("landing_page_id", landingPageId)
    .is("service_card_id", null)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return data?.[0] || null;
}

function assertBookingAllowed(mapping) {
  if (!mapping) {
    return;
  }

  if (mapping.create_booking === false) {
    throw new Error("Booking is disabled for this landing page.");
  }
}

async function guardAgainstUnavailableBooking({ workspaceId, preferredDate, preferredTime }) {
  const normalizedDate = normalizeDate(preferredDate);
  const normalizedTime = normalizeTime(preferredTime);
  const preferredDateTime = buildBookingDateTime(normalizedDate, normalizedTime);

  if (!normalizedDate || !normalizedTime || !preferredDateTime) {
    throw new Error("Invalid preferred booking date or time.");
  }

  const { data: exceptions, error: exceptionsError } = await supabase
    .from("client_booking_exceptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (exceptionsError) throw exceptionsError;

  const blockingException = (exceptions || []).find((exception) =>
    isExceptionBlockingBooking({
      exception,
      preferredDate: normalizedDate,
      preferredDateTime,
    })
  );

  if (blockingException) {
    throw new Error(
      "The selected schedule is unavailable. Please choose another date or time."
    );
  }

  const activeStatuses = [
    "pending",
    "approved",
    "rescheduled",
    "reschedule_requested",
  ];

  const { data: conflictingBookings, error: conflictError } = await supabase
    .from("client_bookings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("preferred_date", normalizedDate)
    .eq("preferred_time", normalizedTime)
    .in("status", activeStatuses)
    .is("archived_at", null)
    .limit(1);

  if (conflictError) throw conflictError;

  if (conflictingBookings?.length) {
    throw new Error(
      "The selected schedule already has a booking request. Please choose another date or time."
    );
  }
}

async function guardAgainstBookingSpam({ workspaceId, email }) {
  const activeStatuses = ["pending", "rescheduled", "reschedule_requested"];

  if (email) {
    const { data, error } = await supabase
      .from("client_bookings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .in("status", activeStatuses)
      .is("archived_at", null)
      .limit(1);

    if (error) throw error;

    if (data?.length) {
      throw new Error(
        "You already have a pending booking request. Please wait for confirmation before submitting another one."
      );
    }
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("client_bookings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("status", activeStatuses)
    .gte("created_at", oneMinuteAgo)
    .is("archived_at", null)
    .limit(6);

  if (error) throw error;

  if ((data || []).length >= 5) {
    throw new Error(
      "Too many booking requests were submitted recently. Please try again in a minute."
    );
  }
}

async function createBooking({
  landingPage,
  payload,
  fullName,
  email,
  mapping,
}) {
  const platform =
    cleanText(payload.platform) ||
    cleanText(landingPage.booking_platform) ||
    cleanText(mapping?.meeting_provider) ||
    "google_meet";

  const title = `${
    landingPage.booking_title || "Landing Page Booking"
  } - ${fullName}`;

  const { data, error } = await supabase
    .from("client_bookings")
    .insert({
      workspace_id: landingPage.workspace_id,
      title,
      full_name: fullName,
      email,
      phone: cleanText(payload.phone) || null,
      company: cleanText(payload.company || payload.company_name) || null,
      preferred_date: normalizeDate(payload.preferred_date),
      preferred_time: normalizeTime(payload.preferred_time),
      platform,
      meeting_type: "video",
      status: "pending",
      source: "external_landing_page",
      message: cleanText(payload.message) || null,
      service_interest: cleanText(payload.service_interest) || null,
      creator_type: "other",
      creator_name: fullName,
      creator_email: email,
      booking_mode: "one_on_one",
      recipient_type: "workspace",
      recipient_name: "Workspace Team",
      recipient_user_id: mapping?.assigned_owner || null,
      recipients: [],
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function createExternalLandingBooking(payload = {}) {
  requireBookingFields(payload);

  const sourceDomain = cleanText(payload.source_domain);
  const sourcePlatform = cleanText(payload.source_platform) || "external_site";
  const email = normalizeEmail(payload.email);
  const fullName = buildFullName(payload);

  const landingPage = await resolveLandingTarget({
    landing_slug: payload.landing_slug,
    source_domain: sourceDomain,
  });

  const mapping = await getLandingBookingMapping({
    workspaceId: landingPage.workspace_id,
    landingPageId: landingPage.id,
  });

  assertBookingAllowed(mapping);

  await guardAgainstUnavailableBooking({
    workspaceId: landingPage.workspace_id,
    preferredDate: payload.preferred_date,
    preferredTime: payload.preferred_time,
  });

  await guardAgainstBookingSpam({
    workspaceId: landingPage.workspace_id,
    email,
  });

  const booking = await createBooking({
    landingPage,
    payload,
    fullName,
    email,
    mapping,
  });

  const crmResult = await captureExternalLandingLead({
    ...payload,
    source_domain: sourceDomain,
    source_platform: sourcePlatform,
    full_name: fullName,
    email,
    service_interest:
      cleanText(payload.service_interest) ||
      cleanText(landingPage.booking_title) ||
      "Booking",
    message: [
      cleanText(payload.message),
      `Booking ID: ${booking.id}`,
      payload.preferred_date ? `Preferred Date: ${payload.preferred_date}` : null,
      payload.preferred_time ? `Preferred Time: ${payload.preferred_time}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  await trackLandingEvent({
    workspaceId: landingPage.workspace_id,
    landingPageId: landingPage.id,
    eventType: "external_booking_submit",
    sourceDomain,
    sourcePlatform,
    metadata: {
      booking_id: booking.id,
      contact_id: crmResult.contact?.id || null,
      lead_id: crmResult.lead?.id || null,
      preferred_date: payload.preferred_date || null,
      preferred_time: payload.preferred_time || null,
      service_interest: payload.service_interest || null,
    },
  });

  return {
    landingPage,
    mapping,
    booking,
    contact: crmResult.contact,
    lead: crmResult.lead,
  };
}

module.exports = {
  createExternalLandingBooking,
};
