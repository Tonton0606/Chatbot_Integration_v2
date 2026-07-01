import { useState } from "react";

import {
  executeLandingAction,
  getLandingActionHref,
  isActionConfigured,
} from "../../../services/landing/landingActionResolver";
import { MediaPreview } from "../PublicLandingMedia";
import { inferMediaType } from "../publicLandingUtils";
import {
  resolveRuntimeCardStyle,
  resolveRuntimeMediaStyle,
  resolveRuntimePrimaryButtonStyle,
  resolveRuntimeTextStyle,
} from "../landingThemeRuntime";

import ServiceCardDetailModal from "./ServiceCardDetailModal";

import {
  buildTextStyle,
  buildVisualStyle,
  getCardTextStyles,
  getPreviewClass,
  getServiceCardMediaSizeClass,
  getServiceCardSizeClass,
  hasText,
  stopPreviewClick,
} from "./serviceRendererUtils";

function cleanValue(value) {
  return String(value || "").trim();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getContentVisibility(card) {
  const visibility = card?.payload?.content_visibility || {};

  return {
    media: visibility.media !== false,
    title: visibility.title !== false,
    description: visibility.description !== false,
    cta: visibility.cta !== false,
  };
}

function getDescriptionMode(card) {
  return card?.payload?.description_mode || "paragraph";
}

function getContentDisplayMode(card) {
  const mode = card?.payload?.content_display_mode || "upfront";

  if (mode === "collapse" || mode === "collapsible") return "collapse";
  if (mode === "modal" || mode === "popup") return "modal";

  return "upfront";
}

function getMediaConfig(card) {
  return {
    position: "top",
    fit: "cover",
    objectPosition: "center",
    width: "",
    maxWidth: "",
    height: "",
    backgroundOverlay: "none",
    backgroundBlur: false,
    overlayOpacity: "40",
    ...asObject(card?.payload?.media),
  };
}

function getShortDescription(card) {
  return (
    card?.payload?.short_description ||
    card?.payload?.summary ||
    card?.description ||
    ""
  );
}

function getDescriptionItems(description) {
  return String(description || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLegacyServiceAction(card = {}) {
  if (!cleanValue(card.cta_label)) {
    return {
      type: "none",
    };
  }

  return {
    type: "booking",
    booking_preset_id: card.booking_category || null,
  };
}

function getServiceCardCta(card = {}) {
  const payload = card?.payload || {};
  const rawCta = payload.cta || {};

  const label = cleanValue(rawCta.label || rawCta.cta_label || card.cta_label);
  const action = rawCta.action || getLegacyServiceAction(card);

  if (!label || !isActionConfigured(action)) {
    return {
      enabled: false,
      label: "",
      action: {
        type: "none",
      },
    };
  }

  return {
    enabled: rawCta.enabled !== false,
    label,
    action,
  };
}

function getObjectFit(value) {
  if (value === "contain") return "contain";
  if (value === "fill") return "fill";

  return "cover";
}

function getOverlayStyle(mediaConfig, runtime) {
  const opacity = Math.min(
    Math.max(Number.parseFloat(mediaConfig.overlayOpacity || 40), 0),
    90
  );

  const alpha = opacity / 100;

  if (mediaConfig.backgroundOverlay === "dark") {
    return { backgroundColor: `rgba(15, 23, 42, ${alpha})` };
  }

  if (mediaConfig.backgroundOverlay === "light") {
    return { backgroundColor: `rgba(255, 255, 255, ${alpha})` };
  }

  if (mediaConfig.backgroundOverlay === "brand") {
    return {
      backgroundColor: runtime.primaryColor,
      opacity: alpha,
    };
  }

  return null;
}

function getMediaWrapperStyle(mediaConfig, baseMediaStyle = {}) {
  const style = {
    ...baseMediaStyle,
    objectFit: getObjectFit(mediaConfig.fit),
    objectPosition: mediaConfig.objectPosition || "center",
  };

  if (mediaConfig.width) style.width = mediaConfig.width;
  if (mediaConfig.maxWidth) style.maxWidth = mediaConfig.maxWidth;
  if (mediaConfig.height) style.height = mediaConfig.height;

  return style;
}

function RendererCardDescription({ description, mode, compact, style }) {
  if (!hasText(description)) return null;

  if (mode === "bullets") {
    const items = getDescriptionItems(description);

    if (!items.length) return null;

    return (
      <ul
        className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6"
        style={style}
      >
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  if (mode === "numbered") {
    const items = getDescriptionItems(description);

    if (!items.length) return null;

    return (
      <ol
        className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6"
        style={style}
      >
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ol>
    );
  }

  if (mode === "checklist") {
    const items = getDescriptionItems(description);

    if (!items.length) return null;

    return (
      <ul className="mt-3 space-y-2 text-sm leading-6" style={style}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-[1px] shrink-0 font-black">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (mode === "quote") {
    return (
      <blockquote
        className="mt-3 border-l-4 pl-4 text-sm italic leading-7"
        style={style}
      >
        {description}
      </blockquote>
    );
  }

  return (
    <p
      className={compact ? "mt-3 text-sm leading-6" : "mt-3 text-sm leading-7"}
      style={style}
    >
      {description}
    </p>
  );
}

function getElementPreviewId(cardPreviewId, target) {
  return `${cardPreviewId}-${target}`;
}

function isCardTargetActive(activePreviewId, cardPreviewId) {
  const activeId = String(activePreviewId || "");

  return activeId === cardPreviewId || activeId.startsWith(`${cardPreviewId}-`);
}

function getElementPreviewClass(activePreviewId, previewId, baseClass = "") {
  return getPreviewClass(activePreviewId, previewId, baseClass);
}

export default function RendererServiceCard({
  card,
  runtime,
  onClick,
  onOpenMedia,
  compact,
  cardSizeMode = "auto",
  activePreviewId,
  onPreviewClick,
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const isBuilderPreview = typeof onPreviewClick === "function";

  const textStyles = getCardTextStyles(card);
  const visibility = getContentVisibility(card);
  const descriptionMode = getDescriptionMode(card);
  const contentDisplayMode = getContentDisplayMode(card);
  const mediaConfig = getMediaConfig(card);
  const mediaPosition = mediaConfig.position || "top";
  const isSideMedia = mediaPosition === "left" || mediaPosition === "right";
  const isBackgroundMedia = mediaPosition === "background";
  const mediaType = inferMediaType(card.image_url);

  const previewId = `card-${card.id}`;
  const mediaPreviewId = getElementPreviewId(previewId, "media");
  const titlePreviewId = getElementPreviewId(previewId, "title");
  const descriptionPreviewId = getElementPreviewId(previewId, "description");
  const buttonPreviewId = getElementPreviewId(previewId, "button");

  const cta = getServiceCardCta(card);
  const ctaHref = getLandingActionHref(cta.action) || "#";
  const shouldOpenNewTab = Boolean(card?.payload?.cta?.open_in_new_tab);

  const cardSizeStyles = card?.payload?.styles?.card || {};
  const cardActive = isCardTargetActive(activePreviewId, previewId);

  const cardStyle = resolveRuntimeCardStyle(runtime, "service_card", {
    ...buildVisualStyle(textStyles.card),
    width: cardSizeStyles.width || undefined,
    maxWidth: cardSizeStyles.maxWidth || undefined,
    minHeight: cardSizeStyles.minHeight || undefined,
    height: cardSizeStyles.height || undefined,
    padding: cardSizeStyles.padding || undefined,
    alignSelf: "start",
    position: isBackgroundMedia ? "relative" : undefined,
    overflow: isBackgroundMedia ? "hidden" : undefined,
  });

  const titleStyle = {
    color: runtime.section.headingColor,
    ...resolveRuntimeTextStyle(runtime, "service_card_title"),
    ...buildTextStyle(textStyles.title),
  };

  const descriptionStyle = {
    color: runtime.section.bodyTextColor,
    ...resolveRuntimeTextStyle(runtime, "service_card_description"),
    ...buildTextStyle(textStyles.description),
  };

  const baseMediaStyle = resolveRuntimeMediaStyle(
    runtime,
    "service_card_media",
    {
      ...buildVisualStyle(textStyles.media),
    }
  );

  const mediaStyle = getMediaWrapperStyle(mediaConfig, baseMediaStyle);

  const buttonStyle = {
    ...resolveRuntimePrimaryButtonStyle(runtime),
    ...buildVisualStyle(textStyles.cta),
    ...buildTextStyle(textStyles.cta),
  };

  const upfrontDescription =
    contentDisplayMode === "upfront"
      ? card.description
      : getShortDescription(card);

  function handleTargetPreviewClick(event, targetPreviewId) {
    if (!isBuilderPreview) return;

    event.preventDefault();
    event.stopPropagation();
    onPreviewClick(targetPreviewId);
  }

  function handleCardClick(event) {
    stopPreviewClick(event, previewId, onPreviewClick);

    if (isBuilderPreview) return;
    if (contentDisplayMode !== "modal") return;
    if (event.defaultPrevented) return;

    setDetailModalOpen(true);
  }

  function handleCtaClick(event) {
    event.stopPropagation();

    if (isBuilderPreview) {
      event.preventDefault();
      onPreviewClick(buttonPreviewId);
      return;
    }

    executeLandingAction({
      event,
      action: cta.action,
      context: {
        onBookingClick: () => onClick?.(card),
        onPopupOpen: () => setDetailModalOpen(true),
      },
    });
  }

  function handleCollapseToggle(event) {
    event.stopPropagation();

    if (isBuilderPreview) {
      event.preventDefault();
      onPreviewClick(descriptionPreviewId);
      return;
    }

    setExpanded((value) => !value);
  }

  function handleMediaClick(event) {
    if (isBuilderPreview) {
      event.preventDefault();
      event.stopPropagation();
      onPreviewClick(mediaPreviewId);
      return;
    }

    if (mediaType !== "video") return;

    event.preventDefault();
    event.stopPropagation();

    onOpenMedia?.({
      url: card.image_url,
      type: "video",
      title: card.title || "Service Video",
    });
  }

  function renderMediaBlock(extraClassName = "") {
    if (!visibility.media || !hasText(card.image_url) || isBackgroundMedia) {
      return null;
    }

    const defaultMediaClass = isSideMedia
      ? "h-full min-h-[180px] w-full"
      : getServiceCardMediaSizeClass(cardSizeMode, compact);

    return (
      <div
        data-preview-id={mediaPreviewId}
        className={getElementPreviewClass(
          activePreviewId,
          mediaPreviewId,
          extraClassName
        )}
        onClick={(event) => handleTargetPreviewClick(event, mediaPreviewId)}
      >
        <MediaPreview
          url={card.image_url}
          title={card.title || ""}
          mediaType={mediaType}
          autoPlay={Boolean(card.payload?.video_autoplay)}
          className={defaultMediaClass}
          style={mediaStyle}
          onClick={handleMediaClick}
        />
      </div>
    );
  }

  function renderBackgroundMedia() {
    if (!visibility.media || !hasText(card.image_url) || !isBackgroundMedia) {
      return null;
    }

    const overlayStyle = getOverlayStyle(mediaConfig, runtime);

    return (
      <>
        <div
          data-preview-id={mediaPreviewId}
          className={getElementPreviewClass(
            activePreviewId,
            mediaPreviewId,
            "absolute inset-0 z-0"
          )}
          onClick={(event) => handleTargetPreviewClick(event, mediaPreviewId)}
        >
          <MediaPreview
            url={card.image_url}
            title={card.title || ""}
            mediaType={mediaType}
            autoPlay={Boolean(card.payload?.video_autoplay)}
            className="h-full w-full"
            style={{
              ...mediaStyle,
              width: "100%",
              height: "100%",
              objectFit: getObjectFit(mediaConfig.fit),
              objectPosition: mediaConfig.objectPosition || "center",
              filter: mediaConfig.backgroundBlur ? "blur(12px)" : undefined,
              transform: mediaConfig.backgroundBlur ? "scale(1.06)" : undefined,
            }}
            onClick={handleMediaClick}
          />
        </div>

        {overlayStyle && (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={overlayStyle}
          />
        )}
      </>
    );
  }

  function renderTextContent() {
    return (
      <>
        {visibility.title && hasText(card.title) && (
          <h3
            data-preview-id={titlePreviewId}
            className={getElementPreviewClass(
              activePreviewId,
              titlePreviewId,
              compact ? "text-lg font-black" : "text-xl font-black"
            )}
            style={titleStyle}
            onClick={(event) => handleTargetPreviewClick(event, titlePreviewId)}
          >
            {card.title}
          </h3>
        )}

        {visibility.description && contentDisplayMode === "upfront" && (
          <div
            data-preview-id={descriptionPreviewId}
            className={getElementPreviewClass(
              activePreviewId,
              descriptionPreviewId
            )}
            onClick={(event) =>
              handleTargetPreviewClick(event, descriptionPreviewId)
            }
          >
            <RendererCardDescription
              description={upfrontDescription}
              mode={descriptionMode}
              compact={compact}
              style={descriptionStyle}
            />
          </div>
        )}

        {visibility.description && contentDisplayMode === "collapse" && (
          <div
            data-preview-id={descriptionPreviewId}
            className={getElementPreviewClass(
              activePreviewId,
              descriptionPreviewId
            )}
            onClick={(event) =>
              handleTargetPreviewClick(event, descriptionPreviewId)
            }
          >
            {hasText(card.payload?.short_description) && (
              <RendererCardDescription
                description={card.payload.short_description}
                mode="paragraph"
                compact={compact}
                style={descriptionStyle}
              />
            )}

            {expanded && (
              <RendererCardDescription
                description={card.description}
                mode={descriptionMode}
                compact={compact}
                style={descriptionStyle}
              />
            )}

            <button
              type="button"
              onClick={handleCollapseToggle}
              className="mt-4 text-xs font-black uppercase tracking-wide"
              style={{
                color: runtime.primaryColor,
              }}
            >
              {expanded ? "Show Less" : "Read More"}
            </button>
          </div>
        )}

        {visibility.description && contentDisplayMode === "modal" && (
          <div
            data-preview-id={descriptionPreviewId}
            className={getElementPreviewClass(
              activePreviewId,
              descriptionPreviewId
            )}
            onClick={(event) =>
              handleTargetPreviewClick(event, descriptionPreviewId)
            }
          >
            <RendererCardDescription
              description={upfrontDescription}
              mode="paragraph"
              compact={compact}
              style={descriptionStyle}
            />
          </div>
        )}

        {visibility.cta && cta.enabled && (
          <a
            data-preview-id={buttonPreviewId}
            href={ctaHref}
            target={shouldOpenNewTab && !isBuilderPreview ? "_blank" : undefined}
            rel={
              shouldOpenNewTab && !isBuilderPreview ? "noreferrer" : undefined
            }
            onClick={handleCtaClick}
            className={getElementPreviewClass(
              activePreviewId,
              buttonPreviewId,
              "mt-5 inline-flex px-4 py-3 text-xs font-black transition hover:-translate-y-0.5"
            )}
            style={buttonStyle}
          >
            {cta.label}
          </a>
        )}
      </>
    );
  }

  function renderCardInner() {
    if (isSideMedia) {
      return (
        <div
          className={`relative z-[2] flex gap-5 ${
            compact
              ? "flex-col"
              : mediaPosition === "right"
                ? "flex-row-reverse"
                : "flex-row"
          } ${compact ? "items-start" : "items-stretch"}`}
        >
          <div
            className="min-w-0 shrink-0 w-full"
            style={{ width: compact ? "100%" : (mediaConfig.width || "42%") }}
          >
            {renderMediaBlock("h-full")}
          </div>

          <div className="min-w-0 flex-1 w-full">{renderTextContent()}</div>
        </div>
      );
    }

    if (mediaPosition === "bottom") {
      return (
        <div className="relative z-[2]">
          {renderTextContent()}
          {renderMediaBlock("mt-5")}
        </div>
      );
    }

    return (
      <div className="relative z-[2]">
        {renderMediaBlock()}
        {renderTextContent()}
      </div>
    );
  }

  return (
    <>
      <article
        data-preview-id={previewId}
        className={`${getPreviewClass(
          cardActive ? previewId : activePreviewId,
          previewId,
          `group text-left transition hover:-translate-y-0.5 ${
            contentDisplayMode === "modal" && !isBuilderPreview
              ? "cursor-pointer"
              : ""
          } ${getServiceCardSizeClass(cardSizeMode, compact)}`
        )}`}
        style={cardStyle}
        onClick={handleCardClick}
      >
        {renderBackgroundMedia()}
        {renderCardInner()}
      </article>

      {detailModalOpen && !isBuilderPreview && (
        <ServiceCardDetailModal
          card={card}
          runtime={runtime}
          onClose={() => setDetailModalOpen(false)}
          onServiceClick={onClick}
        />
      )}
    </>
  );
}
