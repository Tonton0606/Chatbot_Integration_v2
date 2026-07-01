import React from "react";

export default function ForecastScenarioCard({ scenario, onClick }) {
  const color = scenario?.color || "var(--brand-cyan)";

  return (
    <div
      className={`intel-scenario intel-card-hover ${
        onClick ? "is-clickable" : ""
      }`}
      onClick={() => onClick?.(scenario)}
      style={{
        "--intel-color": color,
        "--intel-color-border": `${color}44`,
      }}
    >
      <div className="intel-scenario-accent" />

      <div className="intel-scenario-label is-dynamic">
        {scenario?.label || "Scenario"}
      </div>

      <div className="intel-scenario-amount">{scenario?.amount || "—"}</div>

      <div className="intel-scenario-metrics">
        <div className="intel-scenario-metric">
          <div className="intel-scenario-metric-label">Probability</div>
          <div className="intel-scenario-metric-value is-dynamic">
            {scenario?.probability ?? 0}%
          </div>
        </div>

        <div className="intel-scenario-metric">
          <div className="intel-scenario-metric-label">Confidence</div>
          <div className="intel-scenario-metric-value">
            {scenario?.confidence ?? 0}%
          </div>
        </div>
      </div>

      <div className="intel-scenario-drivers-title">Key Drivers</div>

      {scenario?.drivers?.map((driver, index) => (
        <div key={`${driver}-${index}`} className="intel-scenario-driver">
          <div className="intel-scenario-driver-dot" />
          {driver}
        </div>
      ))}
    </div>
  );
}
