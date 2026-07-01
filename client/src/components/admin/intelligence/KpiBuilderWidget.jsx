import React from "react";

const WIDGET_COLORS = {
  kpi: "var(--brand-cyan)",
  chart: "var(--brand-gold)",
  forecast: "var(--success)",
  gauge: "#9b59b6",
  insight: "var(--brand-cyan)",
};

export default function KpiBuilderWidget({
  widget,
  selected = false,
  onClick,
}) {
  const color =
    WIDGET_COLORS[widget?.type] || "var(--brand-cyan)";

  const trendColor =
    widget?.trend?.startsWith("+")
      ? "var(--success)"
      : "var(--danger)";

  return (
    <div
      className={`intel-builder-widget intel-card-hover ${
        selected ? "is-selected" : ""
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(widget)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onClick?.(widget);
        }
      }}
      style={{
        "--intel-color": color,
        "--intel-color-soft": `${color}14`,
        "--intel-color-bg": `${color}22`,
        "--intel-color-border": `${color}44`,
        "--intel-trend-color": trendColor,
      }}
    >
      <div className="intel-builder-widget-top">
        <span className="intel-badge intel-builder-widget-type">
          {widget?.type || "widget"}
        </span>

        {selected && (
          <span className="intel-builder-widget-selected">
            ✓
          </span>
        )}
      </div>

      <div className="intel-builder-widget-title">
        {widget?.title || "Untitled Widget"}
      </div>

      <div className="intel-builder-widget-metric">
        {widget?.metric || "No metric selected"}
      </div>

      {widget?.value && (
        <div className="intel-builder-widget-value">
          {widget.value}
        </div>
      )}

      {widget?.trend && (
        <div className="intel-builder-widget-trend">
          {widget.trend}
        </div>
      )}

      {widget?.confidence && (
        <div className="intel-builder-widget-confidence">
          Confidence: {widget.confidence}%
        </div>
      )}
    </div>
  );
}
