import React, { useState } from "react";

const SEV_STYLE = {
  critical: {
    dot: "var(--danger)",
    badgeClass: "intel-badge-danger",
    label: "🔴 Critical",
  },
  warning: {
    dot: "#f5a623",
    badgeClass: "intel-badge-warning",
    label: "🟡 Warning",
  },
  info: {
    dot: "var(--brand-cyan)",
    badgeClass: "intel-badge-cyan",
    label: "ℹ️ Info",
  },
};

const STATUS_STYLE = {
  active: {
    color: "var(--danger)",
    label: "Active",
  },
  investigating: {
    color: "#f5a623",
    label: "Investigating",
  },
  resolved: {
    color: "var(--success)",
    label: "Resolved",
  },
};

export default function IntelligenceAlertCard({
  alert,
  compact = false,
  onAction,
}) {
  const [expanded, setExpanded] = useState(false);

  const severityStyle = SEV_STYLE[alert?.severity] || SEV_STYLE.info;
  const statusStyle = STATUS_STYLE[alert?.status] || STATUS_STYLE.active;

  if (compact) {
    return (
      <div className="intel-alert-compact">
        <span
          className="intel-alert-dot"
          style={{ "--intel-color": severityStyle.dot }}
        />

        <div className="intel-flex-1">
          <div className="intel-alert-title">{alert?.title}</div>
          <div className="intel-alert-meta">
            {alert?.module} · {alert?.detected}
          </div>
        </div>

        <span
          className="intel-badge"
          style={{ "--intel-color": statusStyle.color }}
        >
          {statusStyle.label}
        </span>
      </div>
    );
  }

  return (
    <div className="intel-alert">
      <div
        className="intel-alert-row"
        onClick={() => setExpanded((current) => !current)}
      >
        <span
          className="intel-alert-dot"
          style={{ "--intel-color": severityStyle.dot }}
        />

        <div className="intel-alert-main">
          <div className="intel-alert-top">
            <div className="intel-alert-title">{alert?.title}</div>

            <div className="intel-alert-tags">
              <span className={`intel-badge ${severityStyle.badgeClass}`}>
                {severityStyle.label}
              </span>

              <span
                className="intel-badge"
                style={{ "--intel-color": statusStyle.color }}
              >
                {statusStyle.label}
              </span>

              <span className="intel-alert-meta">
                {expanded ? "▲" : "▼"}
              </span>
            </div>
          </div>

          <div className="intel-alert-tags">
            <span className="intel-alert-meta">📦 {alert?.module}</span>
            <span className="intel-alert-meta">🕐 {alert?.detected}</span>
            <span className="intel-alert-meta">
              Impact:{" "}
              <strong className="intel-highlight-text">{alert?.impact}</strong>
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="intel-alert-detail">
          <div className="intel-alert-description">{alert?.detail}</div>

          <div className="intel-alert-action-box">✦ {alert?.action}</div>

          <div className="intel-inline-actions">
            <button
              className="intel-btn intel-btn-ai"
              onClick={(event) => {
                event.stopPropagation();
                onAction?.("investigate", alert);
              }}
              type="button"
            >
              Investigate
            </button>

            <button
              className="intel-btn"
              onClick={(event) => {
                event.stopPropagation();
                onAction?.("mark_resolved", alert);
              }}
              type="button"
            >
              Mark Resolved
            </button>

            <button
              className="intel-btn"
              onClick={(event) => {
                event.stopPropagation();
                onAction?.("create_task", alert);
              }}
              type="button"
            >
              Create Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
