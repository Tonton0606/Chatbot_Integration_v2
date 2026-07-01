import { useMemo, useState } from "react";

import RendererBooking from "./RendererBooking";
import RendererHero from "./RendererHero";
import RendererMap from "./RendererMap";
import RendererFooter from "./RendererFooter";
import { MediaModal } from "./PublicLandingMedia";
import RendererSections from "./RendererSections";
import RendererServices from "./RendererServices";
import {
  getLandingThemeRuntime,
  resolveRuntimePageStyle,
} from "./landingThemeRuntime";
import {
  getViewportMode,
  groupCardsByServicesSection,
} from "./publicLandingUtils";

function sortSections(sections = []) {
  return [...sections].sort(
    (a, b) => Number(a.order_index ?? 999) - Number(b.order_index ?? 999)
  );
}

function getGroupsForSection(groups = [], sectionId) {
  return groups.filter((group) => String(group.sectionId) === String(sectionId));
}

function getLegacyGroups(groups = []) {
  return groups.filter((group) => !group.sectionId);
}

export default function PublicLandingRenderer({
  activePreviewId,
  onPreviewClick,
  landingPage,
  sections = [],
  serviceCards = [],
  serviceGroups = [],
  bookingFields = [],
  bookingForm = {},
  bookingAvailability = {},
  submitting = false,
  submitted = false,
  onBookingClick,
  onServiceClick,
  onBookingChange,
  onBookingSubmit,
  previewMode = "desktop",
  footer,
}) {
  const [activeMedia, setActiveMedia] = useState(null);

  const enabledSections = sortSections(
    sections.filter((section) => section.enabled !== false)
  );
  const enabledCards = serviceCards.filter((card) => card.enabled !== false);

  const runtime = useMemo(
    () => getLandingThemeRuntime(landingPage),
    [landingPage]
  );

  const pageStyle = useMemo(() => resolveRuntimePageStyle(runtime), [runtime]);

  const viewportMode = getViewportMode(previewMode);
  const compact = viewportMode !== "desktop";

  const groups = groupCardsByServicesSection(
    enabledSections,
    enabledCards,
    serviceGroups
  );

  const bookingSection = enabledSections.find(
    (section) => section.section_type === "booking"
  );

  const hasBookingSection = Boolean(bookingSection);

  function openMedia(media) {
    if (!media?.url) return;
    setActiveMedia(media);
  }

  function closeMedia() {
    setActiveMedia(null);
  }

  function renderBooking(sectionIndex, section = bookingSection || null) {
    if (landingPage?.show_booking === false) return null;

    return (
      <RendererBooking
        key={section?.id || "booking"}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
        landingPage={landingPage}
        bookingSection={section}
        runtime={runtime}
        sectionIndex={sectionIndex}
        viewportMode={viewportMode}
        compact={compact}
        bookingFields={bookingFields}
        bookingForm={bookingForm}
        bookingAvailability={bookingAvailability}
        submitting={submitting}
        submitted={submitted}
        onBookingChange={onBookingChange}
        onBookingSubmit={onBookingSubmit}
      />
    );
  }

  function renderOrderedSection(section, index) {
    const sectionIndex = index + 1;

    if (section.section_type === "hero") return null;

    if (section.section_type === "services") {
      const sectionGroups = getGroupsForSection(groups, section.id);

      if (!sectionGroups.length) return null;

      return (
        <RendererServices
          key={section.id}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
          serviceGroups={sectionGroups}
          runtime={runtime}
          sectionIndex={sectionIndex}
          viewportMode={viewportMode}
          compact={compact}
          onServiceClick={onServiceClick}
          onOpenMedia={openMedia}
        />
      );
    }

    if (section.section_type === "booking") {
      return renderBooking(sectionIndex, section);
    }

    if (section.section_type === "map") {
      return (
        <RendererMap
          key={section.id}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
          section={section}
          runtime={runtime}
          sectionIndex={sectionIndex}
          viewportMode={viewportMode}
          compact={compact}
        />
      );
    }

    return (
      <RendererSections
        key={section.id}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
        sections={[section]}
        runtime={runtime}
        startIndex={sectionIndex}
        viewportMode={viewportMode}
        compact={compact}
      />
    );
  }

  const legacyGroups = getLegacyGroups(groups);

  return (
    <div
      className={`overflow-x-hidden ${
        runtime.isLight
          ? "min-h-screen text-slate-950"
          : "min-h-screen text-white"
      }`}
      style={pageStyle}
    >
      <RendererHero
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
        landingPage={landingPage}
        runtime={runtime}
        viewportMode={viewportMode}
        compact={compact}
        onBookingClick={onBookingClick}
        onOpenMedia={openMedia}
      />

      {legacyGroups.length > 0 && (
        <RendererServices
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
          serviceGroups={legacyGroups}
          runtime={runtime}
          sectionIndex={1}
          viewportMode={viewportMode}
          compact={compact}
          onServiceClick={onServiceClick}
          onOpenMedia={openMedia}
        />
      )}

      {enabledSections.map(renderOrderedSection)}

      {!hasBookingSection && renderBooking(enabledSections.length + 1, null)}

      <RendererFooter footer={footer} landingPage={landingPage} />

      <MediaModal media={activeMedia} onClose={closeMedia} />
    </div>
  );
}
