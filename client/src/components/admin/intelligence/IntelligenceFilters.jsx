import React from "react";

const FIELD_DEFS = {
  dateRange: {
    label: "Date Range",
    options: [
      "Today",
      "Last 7 Days",
      "Last 30 Days",
      "This Quarter",
      "This Year",
      "Custom",
    ],
  },

  department: {
    label: "Department",
    options: [
      "All Departments",
      "Sales & CRM",
      "Marketing",
      "Operations",
      "HR",
      "Finance",
      "Legal",
      "Executive",
    ],
  },

  metric: {
    label: "Metric",
    options: [
      "All Metrics",
      "Revenue",
      "Conversion Rate",
      "Task Completion",
      "Attendance",
      "Budget Adherence",
      "Compliance",
    ],
  },

  severity: {
    label: "Severity",
    options: ["All", "Critical", "Warning", "Info", "Resolved"],
  },

  module: {
    label: "Module",
    options: [
      "All Modules",
      "CRM",
      "Marketing",
      "Operations",
      "HR",
      "Finance",
      "Legal",
      "Inventory",
      "Projects",
      "Intelligence",
    ],
  },

  format: {
    label: "Format",
    options: ["All Formats", "PDF", "Excel", "CSV", "JSON"],
  },

  category: {
    label: "Category",
    options: [
      "Executive",
      "CRM",
      "Marketing",
      "Operations",
      "HR",
      "Finance",
      "Legal",
      "AI",
      "Custom",
    ],
  },

  chartType: {
    label: "Chart Type",
    options: ["Line", "Bar", "Area", "Funnel", "Scatter"],
  },

  comparePeriod: {
    label: "Compare",
    options: [
      "No Comparison",
      "vs Previous Period",
      "vs Same Period Last Year",
      "vs Target",
    ],
  },
};

export default function IntelligenceFilters({
  filters = {},
  onChange,
  fields = [],
}) {
  const update = (key, value) => {
    onChange?.({
      ...filters,
      [key]: value,
    });
  };

  const activeFields = fields.length ? fields : Object.keys(filters);

  const clearFilters = () => {
    const reset = {};

    activeFields.forEach((key) => {
      reset[key] = Array.isArray(filters[key]) ? [] : "";
    });

    if (Object.prototype.hasOwnProperty.call(filters, "search")) {
      reset.search = "";
    }

    onChange?.(reset);
  };

  return (
    <div className="intel-filters">
      {activeFields.map((key) => {
        const def = FIELD_DEFS[key];

        if (!def) return null;

        return (
          <select
            key={key}
            className="intel-select"
            value={filters[key] || ""}
            onChange={(event) => update(key, event.target.value)}
          >
            {def.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        );
      })}

      {filters.search !== undefined && (
        <div className="intel-search-box">
          <span className="intel-search-icon">🔍</span>

          <input
            className="intel-search-input"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search..."
          />
        </div>
      )}

      <button className="intel-btn" onClick={clearFilters} type="button">
        Clear
      </button>
    </div>
  );
}
