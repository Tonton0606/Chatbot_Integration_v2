import RendererServiceCard from "./RendererServiceCard";

import {
  getPreviewClass,
  getServiceCardGapClass,
  getServicesGridStyle,
  hasText,
  stopPreviewClick,
} from "./serviceRendererUtils";

export default function RendererServiceGroup({
  group,
  runtime,
  viewportMode,
  compact,
  showGroupHeaders,
  eyebrowStyle,
  headingStyle,
  descriptionStyle,
  onServiceClick,
  onOpenMedia,
  activePreviewId,
  onPreviewClick,
}) {
  const payload = group?.payload || {};
  const cardSizeMode = payload.card_size_mode || "auto";

  const groupPreviewId =
    group.sectionId === null ? "services-group-default" : `section-${group.sectionId}`;

  return (
    <div
      data-preview-id={groupPreviewId}
      className={getPreviewClass(activePreviewId, groupPreviewId)}
      onClick={(event) => stopPreviewClick(event, groupPreviewId, onPreviewClick)}
    >
      {showGroupHeaders && (
        <div className="mb-5">
          {hasText(payload?.eyebrow || group.subtitle) && (
            <p
              className="text-[10px] font-black uppercase tracking-[0.22em]"
              style={eyebrowStyle}
            >
              {payload?.eyebrow || group.subtitle}
            </p>
          )}

          {hasText(payload?.heading || group.title) && (
            <h3
              className={`mt-2 font-black ${compact ? "text-xl" : "text-2xl"}`}
              style={headingStyle}
            >
              {payload?.heading || group.title}
            </h3>
          )}

          {hasText(payload?.description || group.description) && (
            <p className="mt-2 max-w-2xl text-sm leading-6" style={descriptionStyle}>
              {payload?.description || group.description}
            </p>
          )}
        </div>
      )}

      {group.cards?.length > 0 && (
        <div
          className={`grid ${getServiceCardGapClass(cardSizeMode, compact)}`}
          style={getServicesGridStyle(payload, viewportMode)}
        >
          {group.cards.map((card) => (
            <RendererServiceCard
              key={card.id}
              card={card}
              runtime={runtime}
              onClick={onServiceClick}
              onOpenMedia={onOpenMedia}
              compact={compact}
              cardSizeMode={cardSizeMode}
              activePreviewId={activePreviewId}
              onPreviewClick={onPreviewClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
