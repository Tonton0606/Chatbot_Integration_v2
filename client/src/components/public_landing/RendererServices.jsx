import {
  resolveRuntimeSectionBackground,
  resolveRuntimeSectionStyle,
  resolveRuntimeTextStyle,
} from "./landingThemeRuntime";

import RendererServiceGroup from "./services/RendererServiceGroup";
import {
  getPreviewClass,
  hasText,
  stopPreviewClick,
} from "./services/serviceRendererUtils";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getGroupPreviewId(group, fallbackIndex) {
  if (group?.sectionId) return `section-${group.sectionId}`;
  if (group?.id) return `services-group-${group.id}`;
  return `services-group-${fallbackIndex}`;
}

function getGroupPayload(group = {}) {
  return asObject(group.payload);
}

function getGroupStyles(group = {}) {
  return asObject(getGroupPayload(group).styles);
}

function getGroupText(group = {}) {
  const payload = getGroupPayload(group);

  return {
    label: payload.eyebrow || group.subtitle || "",
    title: payload.heading || group.title || "",
    description: payload.description || group.description || "",
  };
}

function RendererServicesSection({
  group,
  runtime,
  sectionIndex,
  viewportMode,
  compact,
  showGroupHeaders,
  onServiceClick,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  const payload = getGroupPayload(group);
  const styles = getGroupStyles(group);
  const sectionStyles = asObject(styles.section);
  const eyebrowStyles = asObject(styles.eyebrow);
  const headingStyles = asObject(styles.heading);
  const descriptionStyles = asObject(styles.description);
  const sectionPreviewId = getGroupPreviewId(group, sectionIndex);
  const text = getGroupText(group);

  const sectionPadding =
    viewportMode === "mobile"
      ? "px-5 py-12"
      : viewportMode === "tablet"
        ? "px-7 py-16"
        : "px-10 py-24";

  const sectionBackground = resolveRuntimeSectionBackground(
    runtime,
    sectionIndex,
    "light_blue"
  );

  const sectionStyle = resolveRuntimeSectionStyle(runtime, "services", {
    backgroundColor: sectionBackground,
    ...sectionStyles,
  });

  const eyebrowStyle = resolveRuntimeTextStyle(runtime, "services_eyebrow", {
    color: runtime.primaryColor,
    ...eyebrowStyles,
  });

  const headingStyle = resolveRuntimeTextStyle(runtime, "services_heading", {
    color: runtime.section.headingColor,
    ...headingStyles,
  });

  const descriptionStyle = resolveRuntimeTextStyle(
    runtime,
    "services_description",
    {
      color: runtime.section.bodyTextColor,
      ...descriptionStyles,
    }
  );

  const visibility = {
    eyebrow: true,
    heading: true,
    description: true,
    ...asObject(payload.content_visibility),
  };

  const hasSectionHeader =
    (visibility.eyebrow !== false && hasText(text.label)) ||
    (visibility.heading !== false && hasText(text.title)) ||
    (visibility.description !== false && hasText(text.description));

  return (
    <section
      id={sectionIndex === 1 ? "services" : undefined}
      data-preview-id={sectionPreviewId}
      className={getPreviewClass(
        activePreviewId,
        sectionPreviewId,
        sectionPadding
      )}
      style={sectionStyle}
      onClick={(event) =>
        stopPreviewClick(event, sectionPreviewId, onPreviewClick)
      }
    >
      <div className="mx-auto max-w-[1280px]">
        {hasSectionHeader && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {visibility.eyebrow !== false && hasText(text.label) && (
                <p
                  className="text-xs font-black uppercase tracking-[0.22em]"
                  style={eyebrowStyle}
                >
                  {text.label}
                </p>
              )}

              {visibility.heading !== false && hasText(text.title) && (
                <h2
                  className={`mt-3 font-black tracking-[-0.03em] ${
                    compact ? "text-3xl" : "text-5xl"
                  }`}
                  style={headingStyle}
                >
                  {text.title}
                </h2>
              )}

              {visibility.description !== false &&
                hasText(text.description) && (
                  <p
                    className="mt-3 max-w-3xl text-sm leading-7"
                    style={descriptionStyle}
                  >
                    {text.description}
                  </p>
                )}
            </div>
          </div>
        )}

        <RendererServiceGroup
          group={group}
          runtime={runtime}
          viewportMode={viewportMode}
          compact={compact}
          showGroupHeaders={showGroupHeaders}
          eyebrowStyle={eyebrowStyle}
          headingStyle={headingStyle}
          descriptionStyle={descriptionStyle}
          onServiceClick={onServiceClick}
          onOpenMedia={onOpenMedia}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
        />
      </div>
    </section>
  );
}

export default function RendererServices({
  serviceGroups,
  runtime,
  sectionIndex = 1,
  viewportMode,
  compact,
  onServiceClick,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  if (!serviceGroups.length) return null;

  return (
    <>
      {serviceGroups.map((group, index) => (
        <RendererServicesSection
          key={group.id || group.sectionId || index}
          group={group}
          runtime={runtime}
          sectionIndex={sectionIndex + index}
          viewportMode={viewportMode}
          compact={compact}
          showGroupHeaders={false}
          onServiceClick={onServiceClick}
          onOpenMedia={onOpenMedia}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
        />
      ))}
    </>
  );
}
