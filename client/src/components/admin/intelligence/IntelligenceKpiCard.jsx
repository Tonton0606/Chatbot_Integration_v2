import React from "react";

const ICON_MAP = {
  peso: "₱",
  forecast: "📈",
  brain: "🧠",
  alert: "🔔",
  report: "📄",
  source: "🔗",
};

export default function IntelligenceKpiCard({
  label,
  value,
  change,
  positive,
  sub,
  icon,
  accent = "var(--brand-cyan)",
}) {
  return (
    <div
      className="intel-kpi intel-card-hover"
      style={{
        "--intel-kpi-accent": accent,
      }}
    >
      <div className="intel-kpi-accent-bar" />

      <div className="intel-kpi-top">
        <div className="intel-kpi-label">{label}</div>
        <div className="intel-kpi-icon">{ICON_MAP[icon] || icon}</div>
      </div>

      <div className="intel-kpi-value">{value}</div>

      <div className="intel-kpi-footer">
        {change && (
          <span
            className={`intel-kpi-change ${
              positive ? "is-positive" : "is-negative"
            }`}
          >
            {positive ? "▲" : "▼"} {change}
          </span>
        )}

        <span className="intel-kpi-sub">{sub}</span>
      </div>
    </div>
  );
}
