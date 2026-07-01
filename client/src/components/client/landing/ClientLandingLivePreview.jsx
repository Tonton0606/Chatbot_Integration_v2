import { useState } from "react";

import PublicLandingRenderer from "../../public_landing/PublicLandingRenderer";

const deviceFrames = {
  desktop: {
    label: "Desktop",
    width: 1280,
    frameClass: "rounded-md",
  },
  tablet: {
    label: "Tablet",
    width: 768,
    frameClass: "rounded-xl",
  },
  mobile: {
    label: "Mobile",
    width: 390,
    frameClass: "rounded-[34px]",
  },
};

const PREVIEW_BOOKING_FIELDS = [
  {
    id: "preview-first-name",
    field_key: "first_name",
    type: "text",
    label: "First Name",
    placeholder: "First name",
    required: true,
  },
  {
    id: "preview-last-name",
    field_key: "last_name",
    type: "text",
    label: "Last Name",
    placeholder: "Last name",
    required: true,
  },
  {
    id: "preview-email",
    field_key: "email",
    type: "email",
    label: "Email",
    placeholder: "you@example.com",
    required: true,
  },
  {
    id: "preview-phone",
    field_key: "phone",
    type: "tel",
    label: "Phone",
    placeholder: "Your phone number",
    required: false,
  },
  {
    id: "preview-booking-platform",
    field_key: "booking_platform",
    type: "select",
    label: "Booking Platform",
    placeholder: "Select Booking Platform",
    required: true,
    options: [
      { value: "google_meet", label: "Google Meet" },
      { value: "zoom", label: "Zoom" },
      { value: "teams", label: "Microsoft Teams" },
      { value: "phone", label: "Phone Call" },
      { value: "in_person", label: "In Person" },
    ],
  },
  {
    id: "preview-service-interest",
    field_key: "service_interest",
    type: "text",
    label: "Interested Service",
    placeholder: "Which service are you interested in?",
    required: false,
  },
  {
    id: "preview-message",
    field_key: "message",
    type: "textarea",
    label: "Message",
    placeholder: "Tell us what you need help with...",
    required: false,
  },
  {
    id: "preview-preferred-date",
    field_key: "preferred_date",
    type: "date",
    label: "Preferred Date",
    placeholder: "",
    required: true,
  },
  {
    id: "preview-preferred-time",
    field_key: "preferred_time",
    type: "time",
    label: "Preferred Time",
    placeholder: "",
    required: true,
  },
];

export function ClientLandingLivePreview({
  landingPage,
  sections,
  serviceCards,
  serviceGroups = [],
  publicUrl,
  previewMode = "desktop",
  footer,
  activePreviewId: controlledActivePreviewId,
  onPreviewClick,
}) {
  const frame = deviceFrames[previewMode] || deviceFrames.desktop;

  const [localActivePreviewId, setLocalActivePreviewId] = useState(null);
  const [bookingForm, setBookingForm] = useState({});

  const activePreviewId =
    controlledActivePreviewId === undefined
      ? localActivePreviewId
      : controlledActivePreviewId;

  function handlePreviewClick(previewId) {
    if (controlledActivePreviewId === undefined) {
      setLocalActivePreviewId(previewId);
    }

    onPreviewClick?.(previewId);
  }

  function handleBookingChange(fieldKey, value) {
    setBookingForm((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function handleBookingSubmit(event) {
    event?.preventDefault?.();
  }

  const scale =
    previewMode === "desktop"
      ? 0.42
      : previewMode === "tablet"
        ? 0.62
        : 0.85;

  const scaledWidth = frame.width * scale;

  return (
    <div className="flex justify-center p-4">
      <div
        aria-label={`${frame.label} landing page preview`}
        style={{
          width: `${scaledWidth}px`,
        }}
      >
        <div
          className={`overflow-hidden border border-[var(--border-color)] bg-white shadow-2xl dark:bg-slate-950 ${frame.frameClass}`}
          style={{
            width: `${scaledWidth}px`,
          }}
        >
          <div
            style={{
              width: `${frame.width}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              height: "auto",
            }}
          >
            <PublicLandingRenderer
              activePreviewId={activePreviewId}
              onPreviewClick={handlePreviewClick}
              landingPage={landingPage}
              sections={sections}
              serviceCards={serviceCards}
              serviceGroups={serviceGroups}
              publicUrl={publicUrl}
              previewMode={previewMode}
              footer={footer}
              bookingFields={PREVIEW_BOOKING_FIELDS}
              bookingForm={bookingForm}
              bookingAvailability={{
                exceptions: [],
                bookings: [],
              }}
              submitting={false}
              submitted={false}
              onBookingChange={handleBookingChange}
              onBookingSubmit={handleBookingSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
