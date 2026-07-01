import {
  resolveRuntimeBadgeStyle,
  resolveRuntimeTextStyle,
} from "../landingThemeRuntime";
import { getPreviewClass, stopPreviewClick, buildTextStyle } from "./HeroUtils";

function hasText(value) {
  return String(value || "").trim().length > 0;
}

export default function HeroBadge({
  landingPage,
  runtime,
  activePreviewId,
  onPreviewClick,
}) {
  const previewId = "hero-badge";
  const badgeText = String(landingPage?.hero_badge || "").trim();

  if (!hasText(badgeText)) {
    return null;
  }

  const savedBadgeStyle = resolveRuntimeBadgeStyle(runtime, "hero_badge");
  const rawTextStyle = resolveRuntimeTextStyle(runtime, "hero_badge");

  const {
    color: ignoredTextColor,
    backgroundColor: ignoredTextBackgroundColor,
    borderColor: ignoredTextBorderColor,
    borderRadius: ignoredTextBorderRadius,
    borderWidth: ignoredTextBorderWidth,
    borderStyle: ignoredTextBorderStyle,
    transform: ignoredTextTransform,
    ...textTypographyStyle
  } = rawTextStyle || {};

  const payload = landingPage?.payload || {};
  const badgeStyleControls = payload.styles?.text?.hero_badge || {};

  const badgeStyle = {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.72)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "999px",
    color: runtime.primaryColor,
    ...savedBadgeStyle,
  };

  const textColor = badgeStyle.color || runtime.primaryColor;
  const offsetStyle = buildTextStyle(badgeStyleControls);

  return (
    <div
      data-preview-id={previewId}
      className={getPreviewClass(
        activePreviewId,
        previewId,
        "mb-5 inline-flex w-fit items-center border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]"
      )}
      style={{
        ...badgeStyle,
        color: textColor,
        ...offsetStyle,
      }}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <span
        className="mr-2 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: runtime.primaryColor }}
      />

      <span
        className="leading-none inline-block"
        style={{
          ...textTypographyStyle,
          color: textColor,
        }}
      >
        {badgeText}
      </span>
    </div>
  );
}
