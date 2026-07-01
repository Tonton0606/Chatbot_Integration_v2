import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { trackEvent } from "../../lib/metaPixel.js";

import PublicLandingRenderer from "../../components/public_landing/PublicLandingRenderer";
import { safelyTrackLandingEvent } from "../../services/landing/landingAnalytics";
import {
  buildBookedSlotSet,
  getPublicBookingAvailability,
  isBookedSlot,
} from "../../services/landing/publicBookingAvailability";
import { resolveLandingPage } from "../../services/landing/landingPublicResolver";

function normalizeApiBaseUrl(value) {
  const rawBaseUrl = String(value || "").replace(/\/+$/, "");

  if (rawBaseUrl.endsWith("/api")) {
    return rawBaseUrl;
  }

  return `${rawBaseUrl}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000/api"
);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildDefaultBookingFields(bookingPreset) {
  const presetFields = asArray(bookingPreset?.fields);

  if (presetFields.length > 0) {
    return presetFields
      .map((field, index) => ({
        id: field.id || field.key || field.field_key || `field-${index}`,
        field_key: field.key || field.field_key || field.id || `field_${index}`,
        label: field.label || field.name || "Field",
        type: field.type || "text",
        required: Boolean(field.required),
        placeholder: field.placeholder || "",
        options: asArray(field.options),
      }))
      .filter(
        (field) =>
          field.field_key !== "platform" &&
          field.field_key !== "booking_platform"
      );
  }

  return [
    {
      id: "first_name",
      field_key: "first_name",
      label: "First Name",
      type: "text",
      required: true,
      placeholder: "First name",
    },
    {
      id: "last_name",
      field_key: "last_name",
      label: "Last Name",
      type: "text",
      required: true,
      placeholder: "Last name",
    },
    {
      id: "email",
      field_key: "email",
      label: "Email",
      type: "email",
      required: false,
      placeholder: "you@example.com",
    },
    {
      id: "phone",
      field_key: "phone",
      label: "Phone",
      type: "phone",
      required: false,
      placeholder: "Your phone number",
    },
    {
      id: "preferred_date",
      field_key: "preferred_date",
      label: "Preferred Date",
      type: "date",
      required: true,
    },
    {
      id: "preferred_time",
      field_key: "preferred_time",
      label: "Preferred Time",
      type: "time",
      required: true,
    },
    {
      id: "service_interest",
      field_key: "service_interest",
      label: "Interested Service",
      type: "text",
      required: false,
      placeholder: "Which service are you interested in?",
    },
    {
      id: "message",
      field_key: "message",
      label: "Message",
      type: "textarea",
      required: false,
      placeholder: "Tell us what you need help with...",
    },
  ];
}

function buildFullName(bookingForm = {}) {
  const firstName = String(bookingForm.first_name || "").trim();
  const lastName = String(bookingForm.last_name || "").trim();
  const fullName = String(bookingForm.full_name || "").trim();

  return `${firstName} ${lastName}`.trim() || fullName || "Landing Page Visitor";
}

function getCurrentHostname() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hostname || "";
}

async function submitPublicBooking(payload) {
  const response = await fetch(`${API_BASE_URL}/landing/public/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error ||
        result?.message ||
        "Failed to submit booking request."
    );
  }

  return result;
}

export default function PublicLandingPage() {
  const { slug } = useParams();

  const [resolved, setResolved] = useState(null);
  const [availability, setAvailability] = useState({
    settings: null,
    exceptions: [],
    bookings: [],
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookingForm, setBookingForm] = useState({});

  const page = resolved?.landing || null;
  const sections = resolved?.sections || [];
  const serviceCards = resolved?.serviceCards || [];
  const serviceGroups = resolved?.serviceGroups || [];
  const bookingPreset = resolved?.bookingMappings?.[0]?.preset || null;

  const bookingFields = useMemo(
    () => buildDefaultBookingFields(bookingPreset),
    [bookingPreset]
  );

  const bookedSlots = useMemo(() => {
    return buildBookedSlotSet(availability.bookings);
  }, [availability.bookings]);

  useEffect(() => {
    loadLanding();
  }, [slug]);

  useEffect(() => {
    if (!submitted) return;

    const timer = setTimeout(() => {
      setSubmitted(false);
      setNotice("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [submitted]);

  async function loadLanding() {
    try {
      setLoading(true);
      setError("");

      const result = await resolveLandingPage({ slug });

      if (!result) {
        setResolved(null);
        return;
      }

      setResolved(result);

      const availabilityResult = await getPublicBookingAvailability(
        result.landing.workspace_id
      );

      setAvailability(availabilityResult);

      await safelyTrackLandingEvent({
        workspace_id: result.landing.workspace_id,
        landing_page_id: result.landing.id,
        event_type: "page_view",
        event_source: "public_landing",
        metadata: { slug },
      });

      document.title =
        result.landing.seo_title || result.landing.title || "Landing Page";
    } catch (err) {
      console.error("Public landing page load error:", err);
      setError(err.message || "Failed to load landing page.");
    } finally {
      setLoading(false);
    }
  }

  function updateBookingField(key, value) {
    setBookingForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function trackBookingClick() {
    if (!page) return;

    await safelyTrackLandingEvent({
      workspace_id: page.workspace_id,
      landing_page_id: page.id,
      event_type: "booking_click",
      event_source: "public_landing",
      metadata: { slug },
    });

    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  async function trackServiceClick(card) {
    if (!page) return;

    await safelyTrackLandingEvent({
      workspace_id: page.workspace_id,
      landing_page_id: page.id,
      event_type: "service_click",
      event_source: "public_landing",
      metadata: {
        service_card_id: card.id || null,
        service_key: card.service_key || null,
        section_id: card.section_id || null,
        title: card.title,
      },
    });

    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  async function refreshAvailability() {
    if (!page?.workspace_id) return;

    const availabilityResult = await getPublicBookingAvailability(
      page.workspace_id
    );

    setAvailability(availabilityResult);
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();

    if (!page) return;

    try {
      setSubmitting(true);
      setSubmitted(false);
      setError("");
      setNotice("");

      const preferredDate = bookingForm.preferred_date || null;
      const preferredTime = bookingForm.preferred_time || null;

      if (isBookedSlot(bookedSlots, preferredDate, preferredTime)) {
        throw new Error(
          "The selected schedule already has a booking request. Please choose another date or time."
        );
      }

      const fullName = buildFullName(bookingForm);
      const email = String(bookingForm.email || "").trim().toLowerCase();

      const platform =
        bookingForm.booking_platform ||
        bookingForm.platform ||
        page.booking_platform ||
        "google_meet";

      const result = await submitPublicBooking({
        ...bookingForm,
        landing_slug: page.slug || slug,
        source_domain: getCurrentHostname(),
        source_platform: "hermes_public_landing",
        full_name: fullName,
        email,
        platform,
        booking_platform: platform,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        service_interest: bookingForm.service_interest || null,
        message: bookingForm.message || null,
      });

      await refreshAvailability();

      setSubmitted(true);
      setNotice(
        result?.message ||
          "Booking request submitted successfully. The team will review and confirm your appointment."
      );
      setBookingForm({});
      trackEvent('Schedule', {
        content_name: 'Public Landing Booking',
        content_category: 'Booking',
      });
    } catch (err) {
      console.error("Public booking submit error:", err);
      setError(err.message || "Failed to submit booking.");
      setNotice("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/10 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-4xl font-black">Landing page unavailable</h1>

            <p className="mt-3 text-slate-300">
              This landing page may be disabled, unpublished, or under
              maintenance.
            </p>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-950">
      {(error || notice) && (
        <div className="fixed left-1/2 top-5 z-[10000] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-bold shadow-2xl backdrop-blur ${
              error
                ? "border-red-400/30 bg-red-950/90 text-red-100"
                : "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"
            }`}
          >
            {error || notice}
          </div>
        </div>
      )}

      <PublicLandingRenderer
        landingPage={page}
        sections={sections}
        serviceCards={serviceCards}
        serviceGroups={serviceGroups}
        bookingFields={bookingFields}
        bookingForm={bookingForm}
        bookingAvailability={availability}
        submitting={submitting}
        submitted={submitted}
        onBookingClick={trackBookingClick}
        onServiceClick={trackServiceClick}
        onBookingChange={updateBookingField}
        onBookingSubmit={handleBookingSubmit}
        previewMode="desktop"
        footer={resolved?.footer || null}
      />
    </main>
  );
}
