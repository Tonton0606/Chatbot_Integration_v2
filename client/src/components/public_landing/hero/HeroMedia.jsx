import { MediaPreview } from "../PublicLandingMedia";
import { resolveRuntimeMediaStyle } from "../landingThemeRuntime";
import { getPreviewClass, stopPreviewClick } from "./HeroUtils";

function hasText(value) {
  return String(value || "").trim().length > 0;
}

export default function HeroMedia({
  landingPage,
  mediaType,
  runtime,
  viewportMode,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  if (mediaType === "video") {
    return (
      <HeroVideoPanel
        landingPage={landingPage}
        runtime={runtime}
        viewportMode={viewportMode}
        onOpenMedia={onOpenMedia}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
      />
    );
  }

  return (
    <HeroImagePanel
      landingPage={landingPage}
      runtime={runtime}
      viewportMode={viewportMode}
      activePreviewId={activePreviewId}
      onPreviewClick={onPreviewClick}
    />
  );
}

function HeroImagePanel({
  landingPage,
  runtime,
  viewportMode,
  activePreviewId,
  onPreviewClick,
}) {
  const previewId = "hero-media";
  const fadeColor = runtime.hero.backgroundColor;
  const mediaStyle = resolveRuntimeMediaStyle(runtime, "hero_image");

  const mediaPositionClass =
    viewportMode === "mobile"
      ? "inset-x-0 top-0 h-[38%] w-full"
      : viewportMode === "tablet"
        ? "inset-y-0 right-0 h-full w-[48%]"
        : "inset-y-0 right-0 w-[50%]";

  return (
    <div
      data-preview-id={previewId}
      className={getPreviewClass(
        activePreviewId,
        previewId,
        `absolute ${mediaPositionClass}`
      )}
      style={mediaStyle}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <img
        src={landingPage.hero_image_url}
        alt=""
        className="h-full w-full object-cover object-center"
      />

      <div
        className={
          viewportMode === "mobile"
            ? "pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
            : "pointer-events-none absolute inset-y-0 left-0 w-[20%]"
        }
        style={{
          background:
            viewportMode === "mobile"
              ? `linear-gradient(0deg, ${fadeColor} 0%, ${fadeColor}E8 42%, ${fadeColor}00 100%)`
              : `linear-gradient(90deg, ${fadeColor} 0%, ${fadeColor}E8 30%, ${fadeColor}61 68%, ${fadeColor}00 100%)`,
        }}
      />
    </div>
  );
}

function HeroVideoPanel({
  landingPage,
  runtime,
  viewportMode,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  const previewId = "hero-media";
  const isMobile = viewportMode === "mobile";
  const mediaStyle = resolveRuntimeMediaStyle(runtime, "hero_video");

  const headline = String(landingPage?.headline || "").trim();
  const title = String(landingPage?.title || "").trim();
  const videoTitle = headline || title;

  function openVideo(event) {
    event.preventDefault();
    event.stopPropagation();

    onOpenMedia?.({
      url: landingPage.hero_image_url,
      type: "video",
      title: videoTitle,
    });
  }

  return (
    <div
      data-preview-id={previewId}
      className={getPreviewClass(
        activePreviewId,
        previewId,
        isMobile
          ? "absolute inset-x-5 top-24 z-[2]"
          : "absolute inset-y-12 right-10 z-[2] flex w-[48%] max-w-[680px] items-center xl:right-16"
      )}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <div
        className="w-full overflow-hidden rounded-[30px] border p-3 shadow-2xl backdrop-blur-md"
        style={{
          backgroundColor: "rgba(255,255,255,0.14)",
          borderColor: "rgba(255,255,255,0.36)",
          ...mediaStyle,
        }}
      >
        <MediaPreview
          url={landingPage.hero_image_url}
          title={videoTitle}
          mediaType="video"
          autoPlay={Boolean(landingPage?.payload?.hero_video_autoplay)}
          className={
            isMobile
              ? "h-[240px] w-full rounded-[24px]"
              : "h-[520px] w-full rounded-[24px]"
          }
          onClick={openVideo}
        />

        {hasText(videoTitle) && (
          <div className="px-2 py-4 text-center">
            <p
              className="text-sm font-black"
              style={{ color: runtime.hero.textColor }}
            >
              {videoTitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
