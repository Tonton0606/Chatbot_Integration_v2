import React, { useState } from "react";

const SEV_STYLE = {
  critical: {
    bg: "var(--danger-soft)",
    color: "var(--danger)",
    border: "var(--danger-soft)",
    dot: "var(--danger)",
    label: "Critical",
  },
  warning: {
    bg: "rgba(245,166,35,0.1)",
    color: "#f5a623",
    border: "rgba(245,166,35,0.3)",
    dot: "#f5a623",
    label: "Warning",
  },
  positive: {
    bg: "var(--success-soft)",
    color: "var(--success)",
    border: "var(--success-soft)",
    dot: "var(--success)",
    label: "Positive",
  },
  info: {
    bg: "var(--brand-cyan-soft)",
    color: "var(--brand-cyan)",
    border: "var(--brand-cyan-border)",
    dot: "var(--brand-cyan)",
    label: "Info",
  },
};

export default function IntelligenceInsightCard({ insight, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const severityStyle = SEV_STYLE[insight?.severity] || SEV_STYLE.info;

  return (
    <div
      className="intel-insight intel-card-hover"
      style={{
        "--intel-border-color": expanded
          ? severityStyle.border
          : "var(--border-color)",
        "--intel-accent-color": severityStyle.dot,
      }}
    >
      <div className="intel-insight-body">
        <div className="intel-insight-top">
          <div className="intel-insight-tags">
            <span
              className="intel-badge intel-insight-severity-badge"
              style={{
                "--intel-bg": severityStyle.bg,
                "--intel-color": severityStyle.color,
                "--intel-border": severityStyle.border,
              }}
            >
              {severityStyle.label}
            </span>

            <span className="intel-badge intel-badge-cyan">
              {insight?.module}
            </span>
          </div>

          <div className="intel-insight-actions">
            <span className="intel-alert-meta">
              Confidence:{" "}
              <strong className="intel-highlight-text">
                {insight?.confidence}%
              </strong>
            </span>

            <button
              className="intel-btn"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? "▲" : "▼"}
            </button>
          </div>
        </div>

        <div className="intel-insight-title">{insight?.title}</div>

        <div className="intel-insight-text">{insight?.explanation}</div>

        {expanded && (
          <div className="intel-insight-root">
            <strong>Root Causes</strong>

            {insight?.causes?.map((cause, index) => (
              <div key={`${cause}-${index}`}>• {cause}</div>
            ))}
          </div>
        )}

        <div className="intel-insight-footer">
          <div className="intel-insight-recommendation">
            ✦ <strong>Recommended:</strong> {insight?.action}
          </div>

          <div className="intel-insight-actions">
            <button
              className="intel-btn"
              onClick={() => onAction?.("create_task", insight)}
              type="button"
            >
              Create Task
            </button>

            <button
              className="intel-btn"
              onClick={() => onAction?.("mark_reviewed", insight)}
              type="button"
            >
              Mark Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
