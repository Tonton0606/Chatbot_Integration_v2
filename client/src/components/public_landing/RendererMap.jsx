import {
  MapPin,
  Mail,
  Navigation,
  Phone,
  Clock3,
} from "lucide-react";

import {
  resolveRuntimeCardStyle,
  resolveRuntimePrimaryButtonStyle,
  resolveRuntimeSectionBackground,
  resolveRuntimeSectionStyle,
  resolveRuntimeTextStyle,
} from "./landingThemeRuntime";
import { normalizeExternalUrl } from "./publicLandingUtils";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeHexColor(value, fallback = "#c9930c") {
  const rawValue = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(rawValue)) return rawValue;
  if (/^[0-9a-f]{6}$/i.test(rawValue)) return `#${rawValue}`;

  return fallback;
}

function normalizeEditorTextStyle(style = {}) {
  const source = asObject(style);
  const normalized = { ...source };
  const translateX = Number(source.translateX || source.translate_x || 0);
  const translateY = Number(source.translateY || source.translate_y || 0);

  if (source.fontSize !== undefined && source.fontSize !== "") {
    normalized.fontSize =
      typeof source.fontSize === "number"
        ? `${source.fontSize}px`
        : source.fontSize;
  }

  if ("bold" in source) {
    normalized.fontWeight = source.bold ? 800 : 400;
    delete normalized.bold;
  }

  if ("italic" in source) {
    normalized.fontStyle = source.italic ? "italic" : "normal";
    delete normalized.italic;
  }

  if ("underline" in source) {
    normalized.textDecoration = source.underline ? "underline" : "none";
    delete normalized.underline;
  }

  if (source.textAlign || source.text_align) {
    normalized.textAlign = source.textAlign || source.text_align;
  }

  if (translateX || translateY) {
    normalized.transform = `translate(${translateX}px, ${translateY}px)`;
  } else {
    delete normalized.transform;
  }

  if (!normalized.fontFamily) {
    delete normalized.fontFamily;
  }

  delete normalized.translateX;
  delete normalized.translateY;
  delete normalized.translate_x;
  delete normalized.translate_y;
  delete normalized.text_align;

  return normalized;
}

function getPreviewClass(activePreviewId, previewId, baseClass = "") {
  return `${baseClass} ${
    activePreviewId === previewId ? "landing-preview-highlight" : ""
  }`.trim();
}

function stopPreviewClick(event, previewId, onPreviewClick) {
  event.stopPropagation();
  onPreviewClick?.(previewId);
}

export function hasMapCoordinates(mapConfig = {}) {
  return (
    Number.isFinite(Number(mapConfig.latitude)) &&
    Number.isFinite(Number(mapConfig.longitude))
  );
}

function getMapEmbedUrl(mapConfig = {}) {
  const lat = Number(mapConfig.latitude);
  const lng = Number(mapConfig.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";

  const query = encodeURIComponent(
    mapConfig.full_address ||
      mapConfig.location_name ||
      `${lat},${lng}`
  );

  const zoom = Number(mapConfig.map_zoom || 15);

  return `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
}

function getDirectionsUrl(mapConfig = {}) {
  const customUrl = normalizeExternalUrl(mapConfig.cta_link);

  if (customUrl) return customUrl;
  if (!hasMapCoordinates(mapConfig)) return "";

  const query = encodeURIComponent(
    mapConfig.full_address ||
      mapConfig.location_name ||
      `${mapConfig.latitude},${mapConfig.longitude}`
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getThemeFilter(theme) {
  if (theme === "custom") {
    return "grayscale(0.95) contrast(1.14) brightness(0.82)";
  }

  if (theme === "mono") {
    return "grayscale(1) contrast(1.05)";
  }

  if (theme === "midnight") {
    return "grayscale(0.85) invert(0.88) hue-rotate(180deg) brightness(0.72) contrast(1.1)";
  }

  if (theme === "dark_blue") {
    return "grayscale(0.95) sepia(0.55) saturate(2.4) hue-rotate(175deg) brightness(0.58) contrast(1.25)";
  }

  if (theme === "warm") {
    return "sepia(0.22) saturate(1.12) hue-rotate(345deg)";
  }

  return "none";
}

function getThemeOverlay(mapConfig = {}) {
  if (mapConfig.map_theme === "custom") {
    return {
      backgroundColor: normalizeHexColor(mapConfig.custom_color, "#0f2a44"),
      opacity: 0.42,
      mixBlendMode: "color",
    };
  }

  if (mapConfig.map_theme === "dark_blue") {
    return {
      backgroundColor: "#0f2a44",
      opacity: 0.28,
      mixBlendMode: "multiply",
    };
  }

  return null;
}

function ContactRow({ icon: Icon, children }) {
  if (!children) return null;

  return (
    <div className="flex items-start gap-3 text-sm leading-6">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function MapCanvas({
  mapConfig = {},
  compact = false,
  markerLabelStyle = {},
  markerPopupStyle = {},
}) {
  const embedUrl = getMapEmbedUrl(mapConfig);
  const accentColor = normalizeHexColor(mapConfig.custom_color, "#c9930c");
  const themeOverlay = getThemeOverlay(mapConfig);

  if (!embedUrl) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-slate-100/70 p-8 text-center text-slate-600">
        <div>
          <MapPin className="mx-auto h-10 w-10" style={{ color: accentColor }} />
          <p className="mt-3 text-sm font-black uppercase tracking-[0.18em]">
            Add a location
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6">
            Enter latitude and longitude to show the live map preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-slate-100">
      <iframe
        title={mapConfig.location_name || "Location map"}
        src={embedUrl}
        className="h-full min-h-[320px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{
          filter: getThemeFilter(mapConfig.map_theme),
        }}
      />

      {themeOverlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={themeOverlay}
        />
      )}

      {cleanText(mapConfig.marker_label) && (
        <div className="absolute bottom-4 left-4 max-w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-white/40 bg-white/95 p-4 text-slate-950 shadow-xl backdrop-blur">
          <p
            className="text-sm font-black"
            style={normalizeEditorTextStyle(markerLabelStyle)}
          >
            {mapConfig.marker_label}
          </p>
          {cleanText(mapConfig.marker_popup) && (
            <p
              className="mt-1 text-xs leading-5 text-slate-600"
              style={normalizeEditorTextStyle(markerPopupStyle)}
            >
              {mapConfig.marker_popup}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RendererMap({
  section,
  runtime,
  sectionIndex,
  viewportMode,
  compact,
  activePreviewId,
  onPreviewClick,
}) {
  const payload = asObject(section?.payload);
  const styles = asObject(payload.styles);
  const mapConfig = asObject(payload.map_config);
  const previewId = `section-${section?.id || "map"}`;
  const title =
    section?.title || mapConfig.section_title || payload.title || "Find Us";
  const subtitle =
    section?.subtitle ||
    mapConfig.section_subtitle ||
    payload.subtitle ||
    "Visit our location or contact us for directions.";
  const description =
    section?.description || mapConfig.full_address || payload.description || "";

  const sectionPadding =
    viewportMode === "mobile"
      ? "px-5 py-12"
      : viewportMode === "tablet"
        ? "px-7 py-16"
        : "px-10 py-20";

  const sectionBackground = resolveRuntimeSectionBackground(
    runtime,
    sectionIndex,
    "white"
  );

  const sectionStyle = resolveRuntimeSectionStyle(runtime, "map", {
    backgroundColor: sectionBackground,
  });

  const cardStyle = resolveRuntimeCardStyle(runtime, {
    overflow: "hidden",
  });

  const eyebrowStyle = resolveRuntimeTextStyle(runtime, "map_eyebrow", {
    color: runtime.primaryColor,
    ...normalizeEditorTextStyle(styles.eyebrow),
  });

  const headingStyle = resolveRuntimeTextStyle(runtime, "map_heading", {
    color: runtime.section.headingColor,
    ...normalizeEditorTextStyle(styles.heading),
  });

  const bodyStyle = resolveRuntimeTextStyle(runtime, "map_description", {
    color: runtime.section.bodyTextColor,
    ...normalizeEditorTextStyle(styles.description),
  });

  const markerLabelStyle = normalizeEditorTextStyle(styles.marker_label);
  const markerPopupStyle = normalizeEditorTextStyle(styles.marker_popup);

  const directionsUrl = getDirectionsUrl(mapConfig);
  const ctaLabel = cleanText(mapConfig.cta_text) || "Get Directions";

  return (
    <section
      data-preview-id={previewId}
      className={getPreviewClass(activePreviewId, previewId, sectionPadding)}
      style={sectionStyle}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <div className="mx-auto max-w-[1280px]">
        <div className={`${compact ? "p-5" : "p-7"}`} style={cardStyle}>
          <div
            className={`grid gap-7 ${
              viewportMode === "desktop" ? "grid-cols-[0.92fr_1.08fr]" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="uppercase tracking-[0.22em]" style={eyebrowStyle}>
                {subtitle || "Map"}
              </p>

              <h3 className="mt-3" style={headingStyle}>
                {title}
              </h3>

              {description && (
                <p className="mt-3 whitespace-pre-line leading-7" style={bodyStyle}>
                  {description}
                </p>
              )}

              <div className="mt-6 grid gap-3" style={bodyStyle}>
                <ContactRow icon={MapPin}>
                  {mapConfig.location_name || mapConfig.full_address}
                </ContactRow>
                <ContactRow icon={Phone}>{mapConfig.phone}</ContactRow>
                <ContactRow icon={Mail}>{mapConfig.email}</ContactRow>
                <ContactRow icon={Clock3}>{mapConfig.business_hours}</ContactRow>
              </div>

              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-6 inline-flex w-fit items-center rounded-xl px-4 py-3 text-xs font-black transition hover:-translate-y-0.5"
                  style={resolveRuntimePrimaryButtonStyle(runtime)}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  {ctaLabel}
                </a>
              )}
            </div>

            <MapCanvas
              mapConfig={mapConfig}
              compact={compact}
              markerLabelStyle={markerLabelStyle}
              markerPopupStyle={markerPopupStyle}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
