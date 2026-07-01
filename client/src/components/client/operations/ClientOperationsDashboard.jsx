import { useMemo, useState } from "react";

import ClientOperationsActivityFeed from "./ClientOperationsActivityFeed";
import ClientOperationsAssignmentsTable from "./ClientOperationsAssignmentsTable";
import ClientOperationsTeamCards from "./ClientOperationsTeamCards";

const TABS = [
  { id: "overview", label: "Overview", icon: "⬡" },
  { id: "teams", label: "Teams", icon: "👥" },
  { id: "assignments", label: "Assignments", icon: "📋" },
  { id: "activity", label: "Activity", icon: "⏱" },
];

const KPI_DEFS = [
  {
    key: "teams",
    label: "Teams",
    icon: "👥",
    accent: "#00bcd4",
    sub: "workspace teams",
  },
  {
    key: "members",
    label: "Members",
    icon: "🧑‍💼",
    accent: "#4a90d9",
    sub: "assigned employees",
  },
  {
    key: "activeAssignments",
    label: "Open Assignments",
    icon: "📋",
    accent: "#c9a84c",
    sub: "pending or active",
  },
  {
    key: "roles",
    label: "Roles",
    icon: "🎖️",
    accent: "#27ae60",
    sub: "custom member roles",
  },
];

function ClientOperationsKPICards({ kpis }) {
  return (
    <div className="client-op-kpi-grid">
      {KPI_DEFS.map((def) => {
        const value = kpis?.[def.key] ?? 0;
        const progress = Math.max(8, Math.min(100, Number(value || 0) * 12));

        return (
          <div
            key={def.key}
            className="client-op-kpi-card"
            style={{ "--accent-color": def.accent }}
          >
            <div className="client-op-kpi-icon">{def.icon}</div>
            <div className="client-op-kpi-label">{def.label}</div>
            <div className="client-op-kpi-value">{value}</div>

            <div className="client-op-kpi-change pos">
              <span>▲</span>
              {def.sub}
            </div>

            <div className="client-op-kpi-bar">
              <div
                className="client-op-kpi-bar-fill"
                style={{
                  width: `${progress}%`,
                  background: def.accent,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientOperationsTabs({
  activeTab,
  setActiveTab,
  teamsCount,
  assignmentsCount,
}) {
  return (
    <div className="client-op-view-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`client-op-view-tab ${activeTab === tab.id ? "active" : ""}`}
        >
          <span>{tab.icon}</span>
          {tab.label}

          {tab.id === "teams" && (
            <span className="tab-count">{teamsCount}</span>
          )}

          {tab.id === "assignments" && (
            <span className="tab-count">{assignmentsCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ClientOperationsFilterBar({
  filters,
  teamTypes,
  cardView,
  activeTab,
  hasActiveFilters,
  onFilterChange,
  onResetFilters,
  onCardViewChange,
}) {
  return (
    <div className="client-op-filter-bar">
      <div className="client-op-search">
        <span>🔍</span>

        <input
          placeholder="Search teams, members, assignments..."
          value={filters.search}
          onChange={(event) => onFilterChange("search", event.target.value)}
        />
      </div>

      <select
        className="client-op-select"
        value={filters.status}
        onChange={(event) => onFilterChange("status", event.target.value)}
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>

      <select
        className="client-op-select"
        value={filters.type}
        onChange={(event) => onFilterChange("type", event.target.value)}
      >
        <option value="all">All Types</option>
        {teamTypes.map((type) => (
          <option key={type.id || type.type_key} value={type.type_key}>
            {type.label}
          </option>
        ))}
      </select>

      {activeTab === "teams" && (
        <div className="client-op-view-toggle">
          <button
            type="button"
            className={`client-op-view-btn ${cardView === "card" ? "active" : ""}`}
            onClick={() => onCardViewChange("card")}
          >
            ⊞
          </button>

          <button
            type="button"
            className={`client-op-view-btn ${cardView === "table" ? "active" : ""}`}
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
          className="client-op-clear-filter"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ClientOperationsTeamsTable({ teams = [] }) {
  return (
    <div className="client-op-table-wrap">
      <table className="client-op-table">
        <thead>
          <tr>
            {[
              "Team",
              "Type",
              "Members",
              "Assignments",
              "Lead",
              "Status",
            ].map((heading) => (
              <th key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {teams.map((team) => {
            const color = team.color || team.type_color || "#c9a84c";

            return (
              <tr key={team.id} className="client-op-row">
                <td>
                  <div className="client-op-table-team">
                    <span style={{ background: color }} />
                    <strong>{team.name}</strong>
                  </div>
                </td>

                <td>
                  <span
                    className="client-op-type-badge"
                    style={{
                      background: `${color}18`,
                      color,
                      borderColor: `${color}33`,
                    }}
                  >
                    {team.type_label || team.type_key || "Operations"}
                  </span>
                </td>

                <td>{team.member_count || 0}</td>
                <td>{team.metrics?.assignments || 0}</td>
                <td className="client-op-muted">{team.lead_name || "—"}</td>

                <td>
                  <span className="client-op-chip t-chip-active">
                    {team.status || "active"}
                  </span>
                </td>
              </tr>
            );
          })}

          {teams.length === 0 && (
            <tr>
              <td colSpan={6}>
                <div className="client-op-empty compact">
                  <div className="client-op-empty-title">No teams found</div>
                  <div className="client-op-empty-sub">
                    Try adjusting filters or create a new team.
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function filterTeams(teams = [], filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();

  return teams.filter((team) => {
    const matchesSearch =
      !search ||
      team.name?.toLowerCase().includes(search) ||
      team.type_label?.toLowerCase().includes(search) ||
      team.lead_name?.toLowerCase().includes(search) ||
      (team.members || []).some((member) =>
        member.name?.toLowerCase().includes(search)
      );

    const matchesStatus =
      filters.status === "all" || team.status === filters.status;

    const matchesType =
      filters.type === "all" ||
      team.type_key === filters.type ||
      team.type_label === filters.type;

    return matchesSearch && matchesStatus && matchesType;
  });
}

function filterAssignments(assignments = [], filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();

  return assignments.filter((assignment) => {
    const matchesSearch =
      !search ||
      assignment.title?.toLowerCase().includes(search) ||
      assignment.record_label?.toLowerCase().includes(search) ||
      assignment.assignee_label?.toLowerCase().includes(search);

    const matchesStatus =
      filters.status === "all" || assignment.status === filters.status;

    return matchesSearch && matchesStatus;
  });
}

export default function ClientOperationsDashboard({
  kpis,
  teams,
  assignments,
  teamTypes,
  onCreateTeam,
  onCreateAssignment,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [cardView, setCardView] = useState("card");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
  });

  const filteredTeams = useMemo(
    () => filterTeams(teams, filters),
    [filters, teams]
  );

  const filteredAssignments = useMemo(
    () => filterAssignments(assignments, filters),
    [assignments, filters]
  );

  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.type !== "all";

  function onFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function onResetFilters() {
    setFilters({
      search: "",
      status: "all",
      type: "all",
    });
  }

  return (
    <div className="client-op-stack">
      <ClientOperationsKPICards kpis={kpis} />

      <ClientOperationsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        teamsCount={teams.length}
        assignmentsCount={assignments.length}
      />

      <ClientOperationsFilterBar
        activeTab={activeTab}
        filters={filters}
        cardView={cardView}
        teamTypes={teamTypes}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        onCardViewChange={setCardView}
      />

      <div className="client-op-main">
        {activeTab === "overview" && (
          <div className="client-op-stack">
            <div className="client-op-dashboard-grid">
              <div>
                <div className="client-op-section-row">
                  <div className="client-op-section-heading">Teams at a Glance</div>
                  <button
                    type="button"
                    className="client-op-link-button"
                    onClick={() => setActiveTab("teams")}
                  >
                    View All →
                  </button>
                </div>

                <ClientOperationsTeamCards
                  teams={teams.slice(0, 4)}
                  onCreateTeam={onCreateTeam}
                />
              </div>

              <div className="client-op-chart-card">
                <div className="client-op-chart-header">
                  <div>
                    <div className="client-op-chart-title">Recent Activity</div>
                    <div className="client-op-chart-subtitle">
                      Team events & changes
                    </div>
                  </div>
                </div>

                <div className="client-op-chart-body client-op-scroll-panel">
                  <ClientOperationsActivityFeed limit={8} />
                </div>
              </div>
            </div>

            <div className="client-op-chart-card">
              <div className="client-op-chart-header">
                <div>
                  <div className="client-op-chart-title">Recent Assignments</div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("assignments")}
                  className="client-op-link-button"
                >
                  View All
                </button>
              </div>

              <ClientOperationsAssignmentsTable
                assignments={assignments.slice(0, 6)}
                onCreateAssignment={onCreateAssignment}
              />
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <>
            {cardView === "card" ? (
              <ClientOperationsTeamCards
                teams={filteredTeams}
                onCreateTeam={onCreateTeam}
              />
            ) : (
              <ClientOperationsTeamsTable teams={filteredTeams} />
            )}
          </>
        )}

        {activeTab === "assignments" && (
          <ClientOperationsAssignmentsTable
            assignments={filteredAssignments}
            onCreateAssignment={onCreateAssignment}
          />
        )}

        {activeTab === "activity" && (
          <div className="client-op-activity-page">
            <div className="client-op-section-row">
              <div className="client-op-section-heading">Team Activity Log</div>
            </div>

            <div className="client-op-chart-card">
              <div className="client-op-chart-body">
                <ClientOperationsActivityFeed limit={20} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
