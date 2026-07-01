import {
  getButtonHref,
  getHeroButtons,
  handleLandingButtonClick,
} from "./landingButtonActions";
import HeroBadge from "./hero/HeroBadge";
import HeroBenefits from "./hero/HeroBenefits";
import HeroBrand from "./hero/HeroBrand";
import HeroMedia from "./hero/HeroMedia";
import HeroMetrics from "./hero/HeroMetrics";
import {
  HighlightedHeadline,
  StyledText,
  buildTextStyle,
  getPreviewClass,
  stopPreviewClick,
} from "./hero/HeroUtils";
import { asArray, inferMediaType } from "./publicLandingUtils";
import {
  resolveRuntimeHeroStyle,
  resolveRuntimePrimaryButtonStyle,
  resolveRuntimeSecondaryButtonStyle,
  resolveRuntimeTextStyle,
} from "./landingThemeRuntime";

function hasText(value) {
  return String(value || "").trim().length > 0;
}

export default function RendererHero({
  landingPage,
  runtime,
  viewportMode,
  onBookingClick,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  const payload = landingPage?.payload || {};
  const legacyHeroStyles = payload.styles || {};

  const headlineText = String(landingPage?.headline || "").trim();
  const subheadlineText = String(landingPage?.subheadline || "").trim();

  const heroMediaType = inferMediaType(landingPage?.hero_image_url);
  const hasHeroMedia = Boolean(landingPage?.hero_image_url);
  const hasHeroVideo = hasHeroMedia && heroMediaType === "video";

  const heroBenefits = asArray(payload.hero_benefits).filter(
    (item) => item?.title || item?.description
  );
  const heroMetrics = asArray(payload.hero_metrics).filter(
    (item) => item?.value || item?.label
  );
  const heroButtons = getHeroButtons(landingPage).filter((button) =>
    hasText(button?.label)
  );

  const heroHeightClass =
    viewportMode === "mobile"
      ? hasHeroVideo
        ? "min-h-[112svh]"
        : "min-h-[92svh]"
      : viewportMode === "tablet"
        ? "min-h-[860px]"
        : "min-h-[78vh] xl:min-h-[84vh] 2xl:min-h-[88vh]";

  const titleClass =
    viewportMode === "mobile"
      ? "text-[38px] leading-[0.96]"
      : viewportMode === "tablet"
        ? "text-[48px] leading-[0.94]"
        : "text-5xl leading-[0.92] xl:text-6xl 2xl:text-[72px] 2xl:leading-[0.92]";

  const contentPositionClass =
    viewportMode === "mobile"
      ? hasHeroVideo
        ? "w-full pt-[47svh]"
        : "w-full pt-[38svh]"
      : viewportMode === "tablet"
        ? "w-[56%]"
        : "w-[49%]";

  const heroPaddingClass =
    viewportMode === "mobile"
      ? "px-5 py-6"
      : viewportMode === "tablet"
        ? "px-8 py-10"
        : "px-10 py-12 xl:px-16 2xl:px-20";

  const logoClass =
    viewportMode === "mobile"
      ? "h-10 w-10"
      : viewportMode === "tablet"
        ? "h-11 w-11"
        : "h-12 w-12";

  const heroStyle = resolveRuntimeHeroStyle(runtime);
  const primaryButtonStyle = resolveRuntimePrimaryButtonStyle(runtime);
  const secondaryButtonStyle = resolveRuntimeSecondaryButtonStyle(runtime);

  const headlineStyle = {
    color: runtime.hero.textColor,
    ...runtime.hero.headlineStyle,
    ...resolveRuntimeTextStyle(runtime, "hero_headline"),
    ...buildTextStyle(payload.styles?.text?.hero_headline || legacyHeroStyles.headline),
  };

  const subheadlineStyle = {
    color: runtime.hero.mutedTextColor,
    ...runtime.hero.subheadlineStyle,
    ...resolveRuntimeTextStyle(runtime, "hero_subheadline"),
    ...buildTextStyle(payload.styles?.text?.hero_subheadline || legacyHeroStyles.subheadline),
  };

  const highlightStyle = resolveRuntimeTextStyle(runtime, "hero_highlight", {
    color: runtime.primaryColor,
  });

  function getHeroButtonStyle(button, index) {
    const baseStyle =
      button.visual_variant === "secondary" || index > 0
        ? secondaryButtonStyle
        : primaryButtonStyle;

    return {
      ...baseStyle,
      ...resolveRuntimeTextStyle(runtime, button.style_key),
    };
  }

  function getHeroButtonClass(index) {
    return `inline-flex min-h-[56px] items-center justify-center rounded-2xl px-7 text-sm font-black transition hover:-translate-y-0.5 hover:scale-[1.02] ${
      index === 0 ? "shadow-2xl shadow-black/25" : "border backdrop-blur-md"
    } ${viewportMode === "mobile" ? "w-full" : "min-w-[180px]"}`;
  }

  return (
    <section
      data-preview-id="hero"
      className={getPreviewClass(
        activePreviewId,
        "hero",
        `relative overflow-hidden ${heroHeightClass}`
      )}
      style={heroStyle}
      onClick={(event) => stopPreviewClick(event, "hero", onPreviewClick)}
    >
      {hasHeroMedia && (
        <HeroMedia
          landingPage={landingPage}
          mediaType={heroMediaType}
          runtime={runtime}
          viewportMode={viewportMode}
          onOpenMedia={onOpenMedia}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
        />
      )}

      <div
        className={`relative z-10 mx-auto flex h-full w-full max-w-[1440px] flex-col ${heroPaddingClass}`}
      >
        <div className={`flex h-full flex-col ${contentPositionClass}`}>
          <HeroBrand
            landingPage={landingPage}
            logoClass={logoClass}
            runtime={runtime}
            activePreviewId={activePreviewId}
            onPreviewClick={onPreviewClick}
          />

          <div className="flex flex-1 flex-col justify-center py-8 md:py-10">
            <div className="max-w-[680px]">
              <HeroBadge
                landingPage={landingPage}
                runtime={runtime}
                activePreviewId={activePreviewId}
                onPreviewClick={onPreviewClick}
              />

              {hasText(headlineText) && (
                <h1
                  data-preview-id="hero-headline"
                  className={getPreviewClass(
                    activePreviewId,
                    "hero-headline",
                    `max-w-[680px] font-black tracking-[-0.065em] ${titleClass}`
                  )}
                  style={headlineStyle}
                  onClick={(event) =>
                    stopPreviewClick(event, "hero-headline", onPreviewClick)
                  }
                >
                  <HighlightedHeadline
                    text={headlineText}
                    highlight={payload.hero_highlight_text}
                    highlightColor={
                      highlightStyle.color || runtime.primaryColor
                    }
                    highlightStyle={highlightStyle}
                  />
                </h1>
              )}

              {hasText(subheadlineText) && (
                <StyledText
                  as="p"
                  previewId="hero-subheadline"
                  activePreviewId={activePreviewId}
                  onPreviewClick={onPreviewClick}
                  text={subheadlineText}
                  className={`mt-6 max-w-[600px] ${
                    viewportMode === "mobile"
                      ? "text-base leading-7"
                      : "text-lg leading-8 xl:text-xl xl:leading-9"
                  }`}
                  style={subheadlineStyle}
                />
              )}

              {heroButtons.length > 0 && (
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                  {heroButtons.map((button, index) => {
                    const previewId = `hero-button-${index}`;
                    const shouldOpenNewTab = Boolean(button.open_in_new_tab);
                    const href = getButtonHref(button);
                    const commonProps = {
                      "data-preview-id": previewId,
                      className: getPreviewClass(
                        activePreviewId,
                        previewId,
                        getHeroButtonClass(index)
                      ),
                      style: getHeroButtonStyle(button, index),
                      onClick: (event) =>
                        handleLandingButtonClick({
                          event,
                          button,
                          onBookingClick,
                          onPreviewClick,
                          previewId,
                        }),
                    };

                    return (
                      <a
                        key={button.id || previewId}
                        href={href}
                        target={shouldOpenNewTab ? "_blank" : undefined}
                        rel={shouldOpenNewTab ? "noreferrer" : undefined}
                        {...commonProps}
                      >
                        <StyledText
                          text={String(button.label || "").trim()}
                          preserveLineBreaks={false}
                        />
                      </a>
                    );
                  })}
                </div>
              )}

              {heroBenefits.length > 0 && (
                <HeroBenefits
                  benefits={heroBenefits}
                  runtime={runtime}
                  viewportMode={viewportMode}
                  activePreviewId={activePreviewId}
                  onPreviewClick={onPreviewClick}
                />
              )}

              {heroMetrics.length > 0 && (
                <HeroMetrics
                  metrics={heroMetrics}
                  runtime={runtime}
                  viewportMode={viewportMode}
                  activePreviewId={activePreviewId}
                  onPreviewClick={onPreviewClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
