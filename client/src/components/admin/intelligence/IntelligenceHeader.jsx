import React from "react";

import {
  INTEL_PERIODS,
  INTEL_WORKSPACES,
} from "../../../services/intelligence";

export default function IntelligenceHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  workspace,
  onWorkspaceChange,
  onRefresh,
  onAISummary,
  showAI = true,
  showControls = true,
  showFilters = true,
}) {
  return (
    <div className="intel-header">
      <div>
        <div className="intel-breadcrumb">
          <span>Intelligence</span>
          <span>&gt;</span>
          <span className="intel-breadcrumb-current">{title}</span>
        </div>

        <h1 className="intel-page-title">{title}</h1>

        <p className="intel-page-subtitle">{subtitle}</p>
      </div>

      <div className="intel-header-actions">
        {showFilters && (
          <>
            <select
              className="intel-select"
              value={workspace}
              onChange={(event) => onWorkspaceChange?.(event.target.value)}
            >
              {INTEL_WORKSPACES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              className="intel-select"
              value={period}
              onChange={(event) => onPeriodChange?.(event.target.value)}
            >
              {INTEL_PERIODS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </>
        )}

        {showControls && (
          <button className="intel-btn" onClick={onRefresh} type="button">
              Refresh
            </button>
        )}

        {showAI && (
          <button
            className="intel-btn intel-btn-ai"
            onClick={onAISummary}
            type="button"
          >
            Generate AI Summary
          </button>
        )}
      </div>
    </div>
  );
}
