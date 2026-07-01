import {
  resolveRuntimeCardStyle,
  resolveRuntimeTextStyle,
} from "../landingThemeRuntime";
import { StyledText } from "./HeroUtils";

function getBenefitStyleKeys(index) {
  return {
    card: `hero_benefit_card_${index}`,
    title: `hero_benefit_title_${index}`,
    description: `hero_benefit_description_${index}`,
  };
}

export default function HeroBenefits({
  benefits,
  runtime,
  viewportMode,
  activePreviewId,
  onPreviewClick,
}) {
  return (
    <div
      data-preview-id="hero-benefits"
      className={`mt-8 grid gap-3 ${
        viewportMode === "mobile" ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"
      }`}
    >
      {benefits.slice(0, 3).map((benefit, index) => {
        const previewId = `hero-benefit-${index}`;
        const styleKeys = getBenefitStyleKeys(index);

        const cardStyle = {
          backgroundColor: runtime.card.backgroundColor,
          borderColor: runtime.card.borderColor,
          borderStyle: "solid",
          borderWidth: "1px",
          borderRadius: runtime.card.borderRadius,
          ...resolveRuntimeCardStyle(runtime, styleKeys.card),
        };

        const titleStyle = {
          color: runtime.hero.textColor,
          ...resolveRuntimeTextStyle(runtime, styleKeys.title),
        };

        const descriptionStyle = {
          color: runtime.hero.mutedTextColor,
          ...resolveRuntimeTextStyle(runtime, styleKeys.description),
        };

        return (
          <div
            key={`${benefit.title || "benefit"}-${index}`}
            data-preview-id={previewId}
            className="border p-4 backdrop-blur-md"
            style={cardStyle}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewClick?.(previewId);
            }}
          >
            <StyledText
              as="h3"
              previewId={`${previewId}-title`}
              activePreviewId={activePreviewId}
              onPreviewClick={onPreviewClick}
              text={benefit.title || `Benefit ${index + 1}`}
              className="text-sm font-black"
              style={titleStyle}
            />

            {benefit.description && (
              <StyledText
                as="p"
                previewId={`${previewId}-description`}
                activePreviewId={activePreviewId}
                onPreviewClick={onPreviewClick}
                text={benefit.description}
                className="mt-2 text-xs leading-5"
                style={descriptionStyle}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
