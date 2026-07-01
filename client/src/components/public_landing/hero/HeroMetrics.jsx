import {
  resolveRuntimeCardStyle,
  resolveRuntimeTextStyle,
} from "../landingThemeRuntime";
import { StyledText } from "./HeroUtils";

function getMetricStyleKeys(index) {
  return {
    card: `hero_metric_card_${index}`,
    value: `hero_metric_value_${index}`,
    label: `hero_metric_label_${index}`,
  };
}

export default function HeroMetrics({
  metrics,
  runtime,
  viewportMode,
  activePreviewId,
  onPreviewClick,
}) {
  return (
    <div
      data-preview-id="hero-metrics"
      className={`mt-6 grid gap-3 ${
        viewportMode === "mobile" ? "grid-cols-1" : "grid-cols-3"
      }`}
    >
      {metrics.slice(0, 3).map((metric, index) => {
        const previewId = `hero-metric-${index}`;
        const styleKeys = getMetricStyleKeys(index);

        const cardStyle = {
          backgroundColor: runtime.card.backgroundColor,
          borderColor: runtime.card.borderColor,
          borderStyle: "solid",
          borderWidth: "1px",
          borderRadius: runtime.card.borderRadius,
          ...resolveRuntimeCardStyle(runtime, styleKeys.card),
        };

        const valueStyle = {
          color: runtime.primaryColor,
          ...resolveRuntimeTextStyle(runtime, styleKeys.value),
        };

        const labelStyle = {
          color: runtime.hero.mutedTextColor,
          ...resolveRuntimeTextStyle(runtime, styleKeys.label),
        };

        return (
          <div
            key={`${metric.value || "metric"}-${index}`}
            data-preview-id={previewId}
            className="cursor-pointer p-4"
            style={cardStyle}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewClick?.(previewId);
            }}
          >
            <StyledText
              as="p"
              previewId={`${previewId}-value`}
              activePreviewId={activePreviewId}
              onPreviewClick={onPreviewClick}
              text={metric.value || "100%"}
              className="text-xl font-black"
              style={valueStyle}
            />

            <StyledText
              as="p"
              previewId={`${previewId}-label`}
              activePreviewId={activePreviewId}
              onPreviewClick={onPreviewClick}
              text={metric.label || "Trusted"}
              className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={labelStyle}
            />
          </div>
        );
      })}
    </div>
  );
}
