import { useCallback, useEffect, useState } from "react";
import "@/styles/operations/teams.css";

import {
  RECORD_TYPE_ICONS,
  TEAM_VIEW_TABS,
  getRecordTypeLabel,
  getTeamTypeLabel,
  getWorkloadColor,
} from "@/constants/operations/teamConstants";

import {
  getAssignments,
  removeAssignment,
} from "@/services/operations/assignments";
import {
  archiveTeam,
  getTeams,
} from "@/services/operations/teams";
import { getTeamTypes } from "@/services/operations/teamTypes";
import { getWorkload } from "@/services/operations/workload";
import { getEmployeesData } from "@/services/human_resources/employees";

import AssignmentTable from "@/components/admin/teams/AssignmentTable.jsx";
import BottleneckAlert from "@/components/admin/teams/BottleneckAlert.jsx";
import TeamActivityFeed from "@/components/admin/teams/TeamActivityFeed.jsx";
import TeamAssignmentPanel from "@/components/admin/teams/TeamAssignmentPanel.jsx";
import TeamCard from "@/components/admin/teams/TeamCard.jsx";
import TeamDetailPanel from "@/components/admin/teams/TeamDetailPanel.jsx";
import TeamFormModal from "@/components/admin/teams/TeamFormModal.jsx";
import TeamKPICards from "@/components/admin/teams/TeamKPICards.jsx";
import TeamTypeManagerModal from "@/components/admin/teams/TeamTypeManagerModal.jsx";
import TeamsFilterBar from "@/components/admin/teams/TeamsFilterBar.jsx";
import TeamsHeaderActions from "@/components/admin/teams/TeamsHeaderActions.jsx";
import TeamWorkloadSummary, {
  MemberWorkloadBars,
  WorkloadTrendChart,
} from "@/components/admin/teams/TeamWorkloadChart.jsx";

function getInitials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeAvailableEmployee(employee = {}) {
  const name =
    employee.name ||
    [employee.firstName, employee.lastName].filter(Boolean).join(" ");

  return {
    id: employee.id,
    employee_id: employee.id,
    member_id: employee.id,
    name,
    initials: getInitials(name),
    email: employee.email || "",
    department: employee.department || "Unassigned",
    position: employee.position || "Unassigned",
    workload: 0,
    status: employee.status || "active",
  };
}

function getRiskChipClass(riskLevel = "healthy") {
  if (riskLevel === "overloaded") return "t-chip-archived";
  if (riskLevel === "high") return "t-chip-inactive";
  if (riskLevel === "busy") return "t-chip-warning";
  return "t-chip-active";
}

export default function AdminTeams() {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [editAssignment, setEditAssignment] = useState(null);
  const [cardView, setCardView] = useState("card");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    workload: "all",
  });

  const [allTeams, setAllTeams] = useState([]);
  const [teamTypes, setTeamTypes] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");

  const [workloadRows, setWorkloadRows] = useState([]);
  const [workloadError, setWorkloadError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadTeamTypes = useCallback(async () => {
    try {
      const data = await getTeamTypes();
      setTeamTypes(data || []);
    } catch (err) {
      console.error("Team types load error:", err);
      setTeamTypes([]);
    }
  }, []);

  const loadAvailableEmployees = useCallback(async () => {
    try {
      const data = await getEmployeesData();
      setTeamMembers((data.employees || []).map(normalizeAvailableEmployee));
    } catch (err) {
      console.error("Available employees load error:", err);
      setTeamMembers([]);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      setTeamsError("");

      const data = await getTeams(filters);
      setAllTeams(data || []);
    } catch (err) {
      console.error("Teams load error:", err);
      setTeamsError(err.message || "Failed to load teams.");
      setAllTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [filters]);

  const loadAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      setAssignmentsError("");

      const data = await getAssignments({
        record_type: assignmentFilter,
      });

      setAssignments(data || []);
    } catch (err) {
      console.error("Assignments load error:", err);
      setAssignmentsError(err.message || "Failed to load assignments.");
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [assignmentFilter]);

  const loadWorkload = useCallback(async () => {
    try {
      setWorkloadError("");
      const data = await getWorkload();
      setWorkloadRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Workload table load error:", err);
      setWorkloadError(err.message || "Failed to load workload.");
      setWorkloadRows([]);
    }
  }, []);

  const refreshTeamsModule = useCallback(async () => {
    await Promise.all([
      loadTeams(),
      loadAssignments(),
      loadWorkload(),
      loadAvailableEmployees(),
      loadTeamTypes(),
    ]);
  }, [
    loadAssignments,
    loadAvailableEmployees,
    loadTeamTypes,
    loadTeams,
    loadWorkload,
  ]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadWorkload();
  }, [loadWorkload]);

  useEffect(() => {
    loadAvailableEmployees();
  }, [loadAvailableEmployees]);

  useEffect(() => {
    loadTeamTypes();
  }, [loadTeamTypes]);

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowDetail(true);
  };

  const handleEdit = (team) => {
    setEditTeam(team);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleAssign = (team) => {
    setAssignTarget(team);
    setEditAssignment(null);
    setShowDetail(false);
    setShowAssign(true);
  };

  const handleCreate = () => {
    setEditTeam(null);
    setShowForm(true);
  };

  const handleNewAssignment = () => {
    setShowAssign(true);
    setAssignTarget(null);
    setEditAssignment(null);
  };

  const handleReassignAssignment = (assignment) => {
    if (!assignment?.id) return;

    setEditAssignment(assignment);
    setAssignTarget(null);
    setShowDetail(false);
    setShowAssign(true);
  };

  const handleRemoveAssignment = async (assignment) => {
    if (!assignment?.id) return;

    const confirmed = window.confirm(
      `Remove assignment for "${assignment.record_label}"?`
    );

    if (!confirmed) return;

    try {
      setActionError("");
      await removeAssignment(assignment.id);
      await refreshTeamsModule();
    } catch (err) {
      console.error("Remove assignment error:", err);
      setActionError(err.message || "Failed to remove assignment.");
    }
  };

  const handleArchive = async (team) => {
    if (!team?.id) return;

    const confirmed = window.confirm(`Archive ${team.name}?`);
    if (!confirmed) return;

    try {
      setActionError("");
      await archiveTeam(team.id);

      if (selectedTeam?.id === team.id) {
        setSelectedTeam(null);
        setShowDetail(false);
      }

      await refreshTeamsModule();
    } catch (err) {
      console.error("Archive team error:", err);
      setActionError(err.message || "Failed to archive team.");
    }
  };

  const handleFormSaved = async () => {
    setShowForm(false);
    setEditTeam(null);
    await refreshTeamsModule();
  };

  const handleTypeManagerChanged = async () => {
    await refreshTeamsModule();
  };

  const handleAssignmentSaved = async () => {
    setShowAssign(false);
    setAssignTarget(null);
    setEditAssignment(null);
    await refreshTeamsModule();
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      workload: "all",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.workload !== "all";

  return (
    <div className="teams-page">
      <div className="teams-header">
        <div>
          <div className="teams-breadcrumb">
            Operations <span>›</span> <strong>Teams & Assignments</strong>
          </div>

          <h1 className="teams-title">Teams & Assignments</h1>

          <p className="teams-subtitle">
            Unified assignment backbone for CRM, Projects, HR, Tasks, Commerce
          </p>
        </div>

        <TeamsHeaderActions
          onNewAssignment={handleNewAssignment}
          onCreateTeam={handleCreate}
          onManageTypes={() => setShowTypeManager(true)}
        />
      </div>

      {actionError && (
        <div className="t-empty t-empty-compact">
          <div className="t-empty-icon">⚠️</div>
          <div className="t-empty-title">Action failed</div>
          <div className="t-empty-sub">{actionError}</div>
        </div>
      )}

      <TeamKPICards />

      <div className="teams-view-tabs">
        {TEAM_VIEW_TABS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`teams-view-tab ${activeView === view.id ? "active" : ""}`}
          >
            <span>{view.icon}</span>
            {view.label}

            {view.id === "assignments" && (
              <span className="tab-count">{assignments.length}</span>
            )}

            {view.id === "teams" && (
              <span className="tab-count">{allTeams.length}</span>
            )}
          </button>
        ))}
      </div>

      <TeamsFilterBar
        activeView={activeView}
        filters={filters}
        cardView={cardView}
        teamTypes={teamTypes}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
        onCardViewChange={setCardView}
      />

      <div className="teams-main">
        {teamsLoading && (
          <div className="t-empty">
            <div className="t-empty-title">Loading teams...</div>
          </div>
        )}

        {!teamsLoading && teamsError && (
          <div className="t-empty">
            <div className="t-empty-title">Failed to load teams</div>
            <div className="t-empty-sub">{teamsError}</div>
            <button type="button" className="t-btn t-btn-primary" onClick={loadTeams}>
              Retry
            </button>
          </div>
        )}

        {!teamsLoading && !teamsError && (
          <>
            {activeView === "dashboard" && (
              <div className="teams-stack">
                <div className="teams-ai-summary">
                  <div className="teams-ai-icon">✦</div>

                  <div className="teams-ai-copy">
                    <strong>Operations Intelligence · Teams Summary</strong>

                    <p>
                      Workload is now capacity-based: assignments create workload
                      points, team members provide capacity, and utilization shows
                      operational risk.
                    </p>
                  </div>

                  <button type="button" className="t-btn t-btn-cyan t-btn-sm">
                    Regenerate
                  </button>
                </div>

                <div>
                  <div className="teams-section-heading">Active Bottlenecks</div>
                  <BottleneckAlert />
                </div>

                <TeamWorkloadSummary />

                <div className="teams-dashboard-grid">
                  <div>
                    <div className="teams-section-row">
                      <div className="teams-section-heading">Teams at a Glance</div>
                      <button
                        type="button"
                        className="teams-link-button"
                        onClick={() => setActiveView("teams")}
                      >
                        View All →
                      </button>
                    </div>

                    <div className="teams-mini-grid">
                      {allTeams.slice(0, 4).map((team) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          onClick={handleTeamClick}
                          onEdit={handleEdit}
                          onArchive={handleArchive}
                        />
                      ))}

                      {allTeams.length === 0 && (
                        <div className="t-empty">
                          <div className="t-empty-title">No teams yet</div>
                          <div className="t-empty-sub">
                            Create a team or seed operation teams.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="teams-chart-card">
                    <div className="teams-chart-header">
                      <div>
                        <div className="teams-chart-title">Recent Activity</div>
                        <div className="teams-chart-subtitle">Team events & changes</div>
                      </div>
                    </div>

                    <div className="teams-chart-body teams-scroll-panel">
                      <TeamActivityFeed limit={8} />
                    </div>
                  </div>
                </div>

                <div className="teams-chart-card">
                  <div className="teams-chart-header">
                    <div>
                      <div className="teams-chart-title">Recent Assignments</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveView("assignments")}
                      className="teams-link-button"
                    >
                      View All
                    </button>
                  </div>

                  {assignmentsLoading && (
                    <div className="t-empty">
                      <div className="t-empty-title">Loading assignments...</div>
                    </div>
                  )}

                  {!assignmentsLoading && assignmentsError && (
                    <div className="t-empty">
                      <div className="t-empty-title">Failed to load assignments</div>
                      <div className="t-empty-sub">{assignmentsError}</div>
                    </div>
                  )}

                  {!assignmentsLoading && !assignmentsError && (
                    <AssignmentTable
                      assignments={assignments.slice(0, 6)}
                      onReassign={handleReassignAssignment}
                      onRemove={handleRemoveAssignment}
                    />
                  )}
                </div>
              </div>
            )}

            {activeView === "teams" && (
              <div>
                {cardView === "card" ? (
                  allTeams.length === 0 ? (
                    <div className="t-empty">
                      <div className="t-empty-icon">👥</div>
                      <div className="t-empty-title">No teams found</div>
                      <div className="t-empty-sub">
                        Try adjusting filters or create a new team.
                      </div>
                      <button
                        type="button"
                        onClick={handleCreate}
                        className="t-btn t-btn-primary"
                      >
                        + Create First Team
                      </button>
                    </div>
                  ) : (
                    <div className="teams-card-grid">
                      {allTeams.map((team) => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          onClick={handleTeamClick}
                          onEdit={handleEdit}
                          onArchive={handleArchive}
                        />
                      ))}

                      <button
                        type="button"
                        onClick={handleCreate}
                        className="teams-create-card"
                      >
                        <span>+</span>
                        <strong>Create New Team</strong>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="teams-table-wrap">
                    <table className="teams-table">
                      <thead>
                        <tr>
                          {[
                            "Team Name",
                            "Type",
                            "Members",
                            "Assignments",
                            "Lead",
                            "Workload",
                            "Perf",
                            "Status",
                            "Created",
                            "Actions",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className={heading !== "Actions" ? "sort" : ""}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {allTeams.map((team) => {
                          const color = team.color || "var(--teams-blue)";
                          const workload = team.metrics?.workload || 0;
                          const performance = team.metrics?.performance || 0;
                          const workloadColor = getWorkloadColor(workload);
                          const performanceColor = getWorkloadColor(performance);

                          return (
                            <tr
                              key={team.id}
                              className="t-row"
                              onClick={() => handleTeamClick(team)}
                            >
                              <td>
                                <div className="teams-table-team">
                                  <span style={{ background: color }} />
                                  <strong>{team.name}</strong>
                                </div>
                              </td>

                              <td>
                                <span
                                  className="teams-type-badge"
                                  style={{
                                    background: `${color}18`,
                                    color,
                                    borderColor: `${color}33`,
                                  }}
                                >
                                  {team.type_label || getTeamTypeLabel(team.type)}
                                </span>
                              </td>

                              <td>
                                <div className="team-member-avatars">
                                  {(team.members || []).slice(0, 3).map((member) => (
                                    <div
                                      key={member.id}
                                      className="t-avatar t-avatar-sm teams-overlap-avatar"
                                    >
                                      {member.initials}
                                    </div>
                                  ))}
                                  <span className="teams-member-count">
                                    {team.member_count}
                                  </span>
                                </div>
                              </td>

                              <td className="teams-gold-text">
                                {team.metrics?.assignments || 0}
                              </td>

                              <td>{team.lead_name}</td>

                              <td>
                                <div className="teams-table-workload">
                                  <div className="workload-bar-track">
                                    <div
                                      className="workload-bar-fill"
                                      style={{
                                        width: `${workload}%`,
                                        background: workloadColor,
                                      }}
                                    />
                                  </div>
                                  <strong style={{ color: workloadColor }}>
                                    {workload}%
                                  </strong>
                                </div>
                              </td>

                              <td style={{ color: performanceColor }}>
                                <strong>{performance}%</strong>
                              </td>

                              <td>
                                <span
                                  className={`t-chip ${
                                    team.status === "active"
                                      ? "t-chip-active"
                                      : team.status === "inactive"
                                        ? "t-chip-inactive"
                                        : "t-chip-archived"
                                  }`}
                                >
                                  {team.status}
                                </span>
                              </td>

                              <td className="teams-muted">{team.created_at}</td>

                              <td onClick={(event) => event.stopPropagation()}>
                                <div className="teams-table-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleTeamClick(team)}
                                    className="t-btn t-btn-ghost t-btn-sm"
                                  >
                                    👁
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(team)}
                                    className="t-btn t-btn-ghost t-btn-sm"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAssign(team)}
                                    className="t-btn t-btn-cyan t-btn-sm"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(team)}
                                    className="t-btn t-btn-danger t-btn-sm"
                                  >
                                    Archive
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeView === "assignments" && (
              <div className="teams-stack">
                <div className="teams-assignment-filter-row">
                  {["all", "task", "project", "deal", "lead", "campaign", "ticket"].map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        className={`teams-filter-chip ${
                          assignmentFilter === type ? "active" : ""
                        }`}
                        onClick={() => setAssignmentFilter(type)}
                      >
                        {type !== "all" && (
                          <span>{RECORD_TYPE_ICONS[type] || "📌"}</span>
                        )}
                        {type === "all" ? "All" : getRecordTypeLabel(type)}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={handleNewAssignment}
                    className="t-btn t-btn-primary t-btn-sm teams-filter-action"
                  >
                    + New Assignment
                  </button>
                </div>

                {assignmentsLoading && (
                  <div className="t-empty">
                    <div className="t-empty-title">Loading assignments...</div>
                  </div>
                )}

                {!assignmentsLoading && assignmentsError && (
                  <div className="t-empty">
                    <div className="t-empty-title">Failed to load assignments</div>
                    <div className="t-empty-sub">{assignmentsError}</div>
                  </div>
                )}

                {!assignmentsLoading && !assignmentsError && (
                  <AssignmentTable
                    assignments={assignments}
                    onReassign={handleReassignAssignment}
                    onRemove={handleRemoveAssignment}
                  />
                )}
              </div>
            )}

            {activeView === "workload" && (
              <div className="teams-stack">
                <BottleneckAlert />
                <TeamWorkloadSummary />

                <div className="teams-chart-card">
                  <div className="teams-chart-header">
                    <div>
                      <div className="teams-chart-title">Team Workload Details</div>
                      <div className="teams-chart-subtitle">
                        Load is weighted by priority. Utilization compares load
                        against available team capacity.
                      </div>
                    </div>
                  </div>

                  {workloadError && (
                    <div className="t-empty">
                      <div className="t-empty-title">Failed to load workload</div>
                      <div className="t-empty-sub">{workloadError}</div>
                    </div>
                  )}

                  {!workloadError && (
                    <div className="teams-table-wrap no-border">
                      <table className="teams-table">
                        <thead>
                          <tr>
                            {[
                              "Rank",
                              "Team",
                              "Tasks",
                              "Projects",
                              "Deals",
                              "Leads",
                              "Load",
                              "Capacity",
                              "Available",
                              "Utilization",
                              "Risk",
                            ].map((heading) => (
                              <th key={heading}>{heading}</th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {workloadRows.map((row) => {
                            const color = getWorkloadColor(row.utilization);

                            return (
                              <tr key={row.team_id} className="t-row">
                                <td>#{row.rank || "—"}</td>
                                <td className="teams-table-strong">{row.team_label}</td>
                                <td>{row.categories.task}</td>
                                <td>{row.categories.project}</td>
                                <td>{row.categories.deal}</td>
                                <td>{row.categories.lead}</td>
                                <td>
                                  <strong>
                                    {row.workload_points ?? row.total_points ?? 0}
                                  </strong>
                                </td>
                                <td>{row.capacity_points ?? row.capacity ?? 0}</td>
                                <td>{row.available_capacity ?? 0}</td>
                                <td>
                                  <div className="teams-table-workload">
                                    <div className="workload-bar-track">
                                      <div
                                        className="workload-bar-fill"
                                        style={{
                                          width: `${row.utilization}%`,
                                          background: color,
                                        }}
                                      />
                                    </div>
                                    <strong style={{ color }}>
                                      {row.utilization}%
                                    </strong>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={`t-chip ${getRiskChipClass(
                                      row.risk_level
                                    )}`}
                                  >
                                    {row.risk_label || "Healthy"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {workloadRows.length === 0 && (
                            <tr>
                              <td colSpan={11}>
                                <div className="t-empty">
                                  <div className="t-empty-title">No workload yet</div>
                                  <div className="t-empty-sub">
                                    Workload appears after assignments are created.
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="teams-chart-card">
                  <div className="teams-chart-header">
                    <div>
                      <div className="teams-chart-title">Member Workload</div>
                      <div className="teams-chart-subtitle">
                        Individual utilization across all teams
                      </div>
                    </div>
                  </div>

                  <div className="teams-chart-body">
                    <MemberWorkloadBars />
                  </div>
                </div>

                <div className="teams-chart-card">
                  <div className="teams-chart-header">
                    <div>
                      <div className="teams-chart-title">Workload Trend</div>
                      <div className="teams-chart-subtitle">
                        Current DB-derived utilization snapshot
                      </div>
                    </div>
                  </div>

                  <div className="teams-chart-body">
                    <WorkloadTrendChart />
                  </div>
                </div>
              </div>
            )}

            {activeView === "activity" && (
              <div className="teams-activity-page">
                <div className="teams-section-row">
                  <div className="teams-section-heading">Team Activity Log</div>
                  <button type="button" className="t-btn t-btn-ghost t-btn-sm">
                    Export
                  </button>
                </div>

                <div className="teams-chart-card">
                  <div className="teams-chart-body">
                    <TeamActivityFeed limit={20} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showDetail && selectedTeam && (
        <TeamDetailPanel
          team={selectedTeam}
          onClose={() => {
            setShowDetail(false);
            setSelectedTeam(null);
          }}
          onEdit={handleEdit}
          onAssign={handleAssign}
        />
      )}

      {showAssign && (
        <TeamAssignmentPanel
          team={assignTarget}
          assignment={editAssignment}
          onAssign={handleAssignmentSaved}
          onClose={() => {
            setShowAssign(false);
            setAssignTarget(null);
            setEditAssignment(null);
          }}
        />
      )}

      {showForm && (
        <TeamFormModal
          team={editTeam}
          members={teamMembers}
          onSave={handleFormSaved}
          onClose={() => {
            setShowForm(false);
            setEditTeam(null);
          }}
        />
      )}

      {showTypeManager && (
        <TeamTypeManagerModal
          onChanged={handleTypeManagerChanged}
          onClose={() => setShowTypeManager(false)}
        />
      )}
    </div>
  );
}
