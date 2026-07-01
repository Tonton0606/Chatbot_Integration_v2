import React from "react";

export default function ReportTemplateCard({
  report,
  onGenerate,
  onSchedule,
  onPreview,
}) {
  return (
    <div className="intel-card intel-card-hover">
      <div className="intel-report-card-top">
        <div className="intel-report-card-title">
          {report?.name || "Untitled Report"}
        </div>

        <span
          className="intel-badge intel-report-format-badge"
          data-format={report?.format || "PDF"}
        >
          {report?.format || "PDF"}
        </span>
      </div>

      <div className="intel-report-card-description">
        {report?.description || "No report description available."}
      </div>

      <div className="intel-report-card-tags">
        <span className="intel-badge">
          📦 {report?.module || "General"}
        </span>

        <span className="intel-badge">
          👤 {report?.owner || "System"}
        </span>

        <span
          className="intel-badge intel-report-schedule-badge"
          data-schedule={report?.schedule || "None"}
        >
          ⏱ {report?.schedule || "None"}
        </span>
      </div>

      <div className="intel-report-card-meta">
        Last generated: {report?.lastGenerated || "Never"}
      </div>

      <div className="intel-report-card-actions">
        <button
          className="intel-btn intel-btn-primary intel-report-generate-btn"
          onClick={() => onGenerate?.(report)}
          type="button"
        >
          Generate
        </button>

        <button
          className="intel-btn"
          onClick={() => onPreview?.(report)}
          type="button"
        >
          Preview
        </button>

        <button
          className="intel-btn"
          onClick={() => onSchedule?.(report)}
          type="button"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}
