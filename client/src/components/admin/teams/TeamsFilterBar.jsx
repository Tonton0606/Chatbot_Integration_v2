export default function TeamsFilterBar({
  activeView,
  filters,
  cardView,
  teamTypes = [],
  hasActiveFilters,
  onFilterChange,
  onResetFilters,
  onCardViewChange,
}) {
  return (
    <div className="teams-filter-bar">
      <div className="teams-search">
        <span>🔍</span>

        <input
          placeholder="Search teams, members, assignments..."
          value={filters.search}
          onChange={(event) =>
            onFilterChange("search", event.target.value)
          }
        />
      </div>

      <select
        className="t-select"
        value={filters.status}
        onChange={(event) =>
          onFilterChange("status", event.target.value)
        }
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>

      <select
        className="t-select"
        value={filters.type}
        onChange={(event) =>
          onFilterChange("type", event.target.value)
        }
      >
        <option value="all">All Types</option>

        {teamTypes.map((type) => (
          <option
            key={type.id || type.type_key}
            value={type.type_key}
          >
            {type.label}
          </option>
        ))}
      </select>

      <select
        className="t-select"
        value={filters.workload}
        onChange={(event) =>
          onFilterChange("workload", event.target.value)
        }
      >
        <option value="all">All Workloads</option>
        <option value="light">Light (&lt;60%)</option>
        <option value="moderate">Moderate (60–74%)</option>
        <option value="heavy">Heavy (75–89%)</option>
        <option value="overloaded">Overloaded (90%+)</option>
      </select>

      {activeView === "teams" && (
        <div className="t-view-toggle teams-filter-spacer">
          <button
            type="button"
            className={`t-view-btn ${cardView === "card" ? "active" : ""}`}
            onClick={() => onCardViewChange("card")}
          >
            ⊞
          </button>

          <button
            type="button"
            className={`t-view-btn ${cardView === "table" ? "active" : ""}`}
            onClick={() => onCardViewChange("table")}
          >
            ☰
          </button>
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="teams-clear-filter"
        >
          Clear
        </button>
      )}
    </div>
  );
}
