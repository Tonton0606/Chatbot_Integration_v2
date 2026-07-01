import React from "react";

export default function ExportOptionCard({
  format,
  description,
  icon,
  color = "var(--brand-cyan)",
  selected = false,
  onClick,
}) {
  return (
    <div
      className={`intel-export-option ${selected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onClick?.();
        }
      }}
      style={{
        "--intel-color": color,
        "--intel-color-soft": `${color}14`,
      }}
    >
      <div className="intel-export-option-icon">{icon || "📦"}</div>

      <div className="intel-export-option-title">{format || "Export"}</div>

      <div className="intel-export-option-description">
        {description || "Export option"}
      </div>

      {selected && (
        <div className="intel-badge intel-export-selected-badge">
          Selected
        </div>
      )}
    </div>
  );
}
