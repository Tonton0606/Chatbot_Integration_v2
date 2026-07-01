import { X } from "lucide-react";

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

function cleanValue(value) {
  return String(value || "").trim();
}

function hasText(value) {
  return cleanValue(value).length > 0;
}

function isVisible(value) {
  return value !== false;
}

function getLegacyModalAction(modal = {}) {
  if (!cleanValue(modal.cta_label)) {
    return {
      type: "none",
    };
  }

  return {
    type: "booking",
  };
}

function getModalCta(modal = {}) {
  const rawCta = modal.cta || {};
  const label = cleanValue(rawCta.label || rawCta.cta_label || modal.cta_label);
  const action = rawCta.action || getLegacyModalAction(modal);

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

export default function ServiceCardDetailModal({
  card,
  runtime,
  onClose,
  onServiceClick,
}) {
  if (!card) return null;

  const modal = card.payload?.modal || {};
  const modalStyles = modal.styles || {};
  const cta = getModalCta(modal);
  const ctaHref = getLandingActionHref(cta.action) || "#";
  const shouldOpenNewTab = Boolean(modal.cta?.open_in_new_tab);

  const badge = modal.badge || "";
  const title = modal.title || "";
  const subtitle = modal.subtitle || "";
  const description = modal.description || "";
  const mediaUrl = modal.media_url || "";
  const mediaType = modal.media_type || inferMediaType(mediaUrl);

  const showBadge = isVisible(modal.show_badge) && hasText(badge);
  const showTitle = isVisible(modal.show_title) && hasText(title);
  const showSubtitle = isVisible(modal.show_subtitle) && hasText(subtitle);
  const showDescription =
    isVisible(modal.show_description) && hasText(description);
  const showMedia = isVisible(modal.show_media) && hasText(mediaUrl);
  const showButton = isVisible(modal.show_button) && cta.enabled;

  const hasBodyContent =
    showBadge ||
    showTitle ||
    showSubtitle ||
    showDescription ||
    showMedia ||
    showButton;

  function handleBackdropClick(event) {
    if (event.target !== event.currentTarget) return;
    onClose?.();
  }

  function handleCtaClick(event) {
    event.stopPropagation();

    executeLandingAction({
      event,
      action: cta.action,
      context: {
        onBookingClick: () => {
          onServiceClick?.(card);
          onClose?.();
        },
      },
    });
  }

  if (!hasBodyContent) {
    return null;
  }

  const cardStyle = resolveRuntimeCardStyle(runtime, "service_card", {
    ...modalStyles.card,
  });

  const badgeStyle = {
    ...resolveRuntimeTextStyle(runtime, "service_card_badge"),
    ...modalStyles.badge,
    color: modalStyles.badge?.color || runtime?.primaryColor,
  };

  const titleStyle = {
    ...resolveRuntimeTextStyle(runtime, "service_card_title"),
    ...modalStyles.title,
  };

  const subtitleStyle = {
    ...resolveRuntimeTextStyle(runtime, "service_card_subtitle"),
    ...modalStyles.subtitle,
  };

  const descriptionStyle = {
    ...resolveRuntimeTextStyle(runtime, "service_card_description"),
    ...modalStyles.description,
  };

  const mediaStyle = resolveRuntimeMediaStyle(runtime, "service_card_media", {
    ...modalStyles.media,
  });

  const buttonStyle = {
    ...resolveRuntimePrimaryButtonStyle(runtime),
    ...modalStyles.cta,
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 px-3 py-5 backdrop-blur-sm sm:px-5"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Details"}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl sm:p-5 lg:p-6"
        style={cardStyle}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition hover:bg-slate-100"
          aria-label="Close details"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto pr-1">
          {showMedia && (
            <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-2">
              <MediaPreview
                url={mediaUrl}
                title={title || ""}
                mediaType={mediaType}
                autoPlay={Boolean(modal.video_autoplay)}
                className={
                  mediaType === "video"
                    ? "h-[62vh] max-h-[560px] min-h-[300px] w-full rounded-2xl"
                    : "max-h-[66vh] w-full rounded-2xl bg-slate-50 object-contain"
                }
                style={{
                  ...mediaStyle,
                  width: "100%",
                  height: mediaType === "video" ? undefined : "auto",
                  maxHeight: mediaType === "video" ? undefined : "66vh",
                  objectFit: "contain",
                  objectPosition: "center",
                }}
              />
            </div>
          )}

          <div className="px-1 pb-1 pr-12 sm:px-2 lg:px-3">
            {showBadge && (
              <p
                className="mb-3 text-xs font-black uppercase tracking-[0.22em]"
                style={badgeStyle}
              >
                {badge}
              </p>
            )}

            {showTitle && (
              <h2
                className="text-2xl font-black tracking-[-0.03em] sm:text-3xl lg:text-4xl"
                style={titleStyle}
              >
                {title}
              </h2>
            )}

            {showSubtitle && (
              <p
                className="mt-3 text-base font-bold leading-7 sm:text-lg"
                style={subtitleStyle}
              >
                {subtitle}
              </p>
            )}

            {showDescription && (
              <p
                style={descriptionStyle}
                className="mt-4 whitespace-pre-line text-sm leading-7 sm:text-base sm:leading-8"
              >
                {description}
              </p>
            )}

            {showButton && (
              <a
                href={ctaHref}
                target={shouldOpenNewTab ? "_blank" : undefined}
                rel={shouldOpenNewTab ? "noreferrer" : undefined}
                onClick={handleCtaClick}
                style={buttonStyle}
                className="mt-6 inline-flex rounded-xl px-5 py-3 text-xs font-black transition hover:-translate-y-0.5"
              >
                {cta.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
