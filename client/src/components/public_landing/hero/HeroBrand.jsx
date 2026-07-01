import {
  resolveRuntimeIconStyle,
  resolveRuntimeTextStyle,
} from "../landingThemeRuntime";
import { getPreviewClass, stopPreviewClick, buildTextStyle } from "./HeroUtils";

function hasText(value) {
  return String(value || "").trim().length > 0;
}

export default function HeroBrand({
  landingPage,
  logoClass,
  runtime,
  activePreviewId,
  onPreviewClick,
}) {
  const brandPreviewId = "hero-brand";
  const logoPreviewId = "hero-logo";
  const titlePreviewId = "hero-brand-title";

  const logoUrl = String(landingPage?.logo_url || "").trim();
  const brandTitle = String(landingPage?.title || "").trim();

  const hasLogo = hasText(logoUrl);
  const hasBrandTitle = hasText(brandTitle);

  if (!hasLogo && !hasBrandTitle) {
    return null;
  }

  const savedIconStyle = resolveRuntimeIconStyle(runtime, "hero_logo");
  const brandTitleStyle = {
    color: runtime.hero.textColor,
    ...resolveRuntimeTextStyle(runtime, "hero_brand_title"),
    ...buildTextStyle(landingPage?.payload?.styles?.text?.hero_brand_title),
  };

  const iconStyle = {
    backgroundColor: runtime.primaryColor,
    color: runtime.button.primaryTextColor,
    borderRadius: "16px",
    ...savedIconStyle,
  };

  function selectPreview(event, previewId) {
    stopPreviewClick(event, previewId, onPreviewClick);
  }

  return (
    <div
      data-preview-id={brandPreviewId}
      className={getPreviewClass(
        activePreviewId,
        brandPreviewId,
        "flex items-center gap-3"
      )}
      onClick={(event) => selectPreview(event, brandPreviewId)}
    >
      {hasLogo && (
        <img
          data-preview-id={logoPreviewId}
          src={logoUrl}
          alt={brandTitle || ""}
          className={getPreviewClass(
            activePreviewId,
            logoPreviewId,
            `${logoClass} object-cover ring-1 ring-white/15`
          )}
          style={iconStyle}
          onClick={(event) => selectPreview(event, logoPreviewId)}
        />
      )}

      {hasBrandTitle && (
        <div className="min-w-0">
          <p
            data-preview-id={titlePreviewId}
            className={getPreviewClass(
              activePreviewId,
              titlePreviewId,
              "truncate text-sm font-black md:text-base"
            )}
            style={brandTitleStyle}
            onClick={(event) => selectPreview(event, titlePreviewId)}
          >
            {brandTitle}
          </p>
        </div>
      )}
    </div>
  );
}
