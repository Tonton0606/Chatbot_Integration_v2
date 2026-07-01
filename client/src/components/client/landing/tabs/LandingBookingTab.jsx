import { useMemo } from "react";

import BookingSettings from "../BookingSettings";

function getBookingSection(sections = []) {
  return (sections || []).find((section) => section.section_type === "booking");
}

export default function LandingBookingTab({
  form,
  sections = [],
  saving,
  onChange,
  onSave,
  onUpdateSection,
  onPreviewSectionPayloadChange,
  onEditorFocus,
  previewMode,
  onPreviewModeChange,
}) {
  const bookingSection = useMemo(() => getBookingSection(sections), [sections]);

  return (
    <BookingSettings
      key={bookingSection?.id || "missing-booking-section"}
      form={form}
      section={bookingSection}
      saving={saving}
      previewMode={previewMode}
      onChange={onChange}
      onSave={onSave}
      onUpdateSection={onUpdateSection}
      onPreviewSectionPayloadChange={onPreviewSectionPayloadChange}
      onPreviewModeChange={onPreviewModeChange}
      onEditorFocus={onEditorFocus}
    />
  );
}
