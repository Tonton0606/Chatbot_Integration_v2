import { useEffect, useMemo, useState } from "react";

import {
  RECORD_TYPE_ICONS,
  TEAM_DETAIL_TABS,
  getAssignmentRoleLabel,
  getPriorityColor,
  getRecordTypeLabel,
  getTeamTypeLabel,
  getWorkloadColor,
} from "@/constants/operations/teamConstants";
import { getAssignments } from "@/services/operations/assignments";

import TeamActivityFeed from "./TeamActivityFeed.jsx";

function getStatusChipClass(status) {
  if (status === "active") return "t-chip-active";
  if (status === "inactive") return "t-chip-inactive";
  if (status === "archived") return "t-chip-archived";
  if (status === "completed") return "t-chip-completed";
  return "t-chip-medium";
}

function AssignmentRow({ assignment }) {
  const priorityColor = getPriorityColor(assignment.priority);

  return (
    <div className="t-assign-row">
      <div
        className="t-assign-dot"
        style={{
          background: priorityColor,
        }}
      />

      <span className="t-assign-icon">
        {RECORD_TYPE_ICONS[assignment.record_type] || "📌"}
      </span>

      <div className="t-assign-main">
        <div className="t-assign-target">{assignment.record_label}</div>
        <div className="t-assign-sub">
          {getRecordTypeLabel(assignment.record_type)} ·{" "}
          {getAssignmentRoleLabel(assignment.role)}
        </div>
      </div>

      <div className="t-assign-meta">
        <span
          className="t-chip"
          style={{
            color: priorityColor,
            borderColor: `${priorityColor}44`,
            background: `${priorityColor}18`,
          }}
        >
          {assignment.priority}
        </span>
        <span className="t-assign-date">{assignment.due_date || "—"}</span>
      </div>
    </div>
  );
}

export default function TeamDetailPanel({ team, onClose, onEdit, onAssign }) {
  const [tab, setTab] = useState("Overview");
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAssignments() {
      if (!team?.id) return;

      try {
        setAssignmentsLoading(true);
        setAssignmentsError("");

        const data = await getAssignments({ team_id: team.id });

        if (mounted) {
          setAssignments(data || []);
        }
      } catch (err) {
        console.error("Team detail assignments load error:", err);

        if (mounted) {
          setAssignmentsError(err.message || "Failed to load assignments.");
          setAssignments([]);
        }
      } finally {
        if (mounted) {
          setAssignmentsLoading(false);
        }
      }
    }

    loadAssignments();

    return () => {
      mounted = false;
    };
  }, [team?.id]);

  const groupedAssignments = useMemo(() => {
    return {
      tasks: assignments.filter((item) => item.record_type === "task"),
      projects: assignments.filter((item) => item.record_type === "project"),
      leads: assignments.filter((item) => item.record_type === "lead"),
      deals: assignments.filter((item) => item.record_type === "deal"),
    };
  }, [assignments]);

  const typeColor = team.color || "var(--teams-blue)";
  const workload = team.metrics?.workload || 0;
  const performance = team.metrics?.performance || 0;
  const workloadColor = getWorkloadColor(workload);
  const performanceColor = getWorkloadColor(performance);

  return (
    <div className="teams-panel-overlay" onClick={onClose}>
      <div className="teams-panel" onClick={(event) => event.stopPropagation()}>
        <div className="teams-panel-header">
          <div className="teams-panel-title-group">
            <div
              className="teams-panel-team-icon"
              style={{
                background: `linear-gradient(135deg, ${typeColor}aa, ${typeColor}44)`,
                borderColor: `${typeColor}33`,
              }}
            >
              👥
            </div>

            <div>
              <div className="teams-panel-title">{team.name}</div>

              <div className="teams-panel-badges">
                <span
                  className="teams-type-badge"
                  style={{
                    background: `${typeColor}18`,
                    color: typeColor,
                    borderColor: `${typeColor}33`,
                  }}
                >
                  {team.type_label || getTeamTypeLabel(team.type)}
                </span>

                <span className={`t-chip ${getStatusChipClass(team.status)}`}>
                  {team.status}
                </span>
              </div>
            </div>
          </div>

          <div className="teams-panel-actions">
            <button
              type="button"
              onClick={() => onAssign?.(team)}
              className="t-btn t-btn-cyan t-btn-sm"
            >
              + Assign
            </button>

            <button
              type="button"
              onClick={() => onEdit?.(team)}
              className="t-btn t-btn-secondary t-btn-sm"
            >
              ✏️ Edit
            </button>

            <button type="button" onClick={onClose} className="teams-panel-close">
              ✕
            </button>
          </div>
        </div>

        <div className="teams-panel-stats">
          <div>
            <strong>{team.member_count || team.members?.length || 0}</strong>
            <span>Members</span>
          </div>

          <div>
            <strong>{assignments.length}</strong>
            <span>Assignments</span>
          </div>

          <div>
            <strong>{groupedAssignments.tasks.length}</strong>
            <span>Open Tasks</span>
          </div>

          <div>
            <strong style={{ color: performanceColor }}>{performance}%</strong>
            <span>Perf</span>
          </div>
        </div>

        <div className="panel-tabs">
          {TEAM_DETAIL_TABS.map((item) => (
            <button
              key={item}
              type="button"
              className={`panel-tab ${tab === item ? "active" : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="teams-panel-body">
          {assignmentsLoading && (
            <div className="t-empty t-empty-compact">
              <div className="t-empty-title">Loading team assignments...</div>
            </div>
          )}

          {!assignmentsLoading && assignmentsError && (
            <div className="t-empty t-empty-compact">
              <div className="t-empty-icon">⚠️</div>
              <div className="t-empty-title">Failed to load assignments</div>
              <div className="t-empty-sub">{assignmentsError}</div>
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Overview" && (
            <div>
              <div className="t-section-label">Team Information</div>

              <div className="teams-info-list">
                <div>
                  <span>Lead</span>
                  <strong>{team.lead_name || "Unassigned"}</strong>
                </div>

                <div>
                  <span>Type</span>
                  <strong>{team.type_label || getTeamTypeLabel(team.type)}</strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>{team.created_at || "—"}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{team.status || "—"}</strong>
                </div>

                <div>
                  <span>Description</span>
                  <strong>{team.description || "—"}</strong>
                </div>
              </div>

              <div className="t-divider" />

              <div className="t-section-label">Workload</div>

              <div className="teams-utilization-head">
                <span>Current utilization</span>
                <strong style={{ color: workloadColor }}>{workload}%</strong>
              </div>

              <div className="workload-bar-track workload-bar-lg">
                <div
                  className="workload-bar-fill"
                  style={{
                    width: `${workload}%`,
                    background: workloadColor,
                  }}
                />
              </div>

              <div className="t-divider" />

              <div className="t-section-label">Quick Assignment Summary</div>

              <div className="teams-assignment-summary-list">
                {[
                  ["Tasks", groupedAssignments.tasks.length, "✅"],
                  ["Projects", groupedAssignments.projects.length, "🚀"],
                  ["Deals", groupedAssignments.deals.length, "💼"],
                  ["Leads", groupedAssignments.leads.length, "🎯"],
                ].map(([label, value, icon]) => (
                  <div key={label}>
                    <span>{icon}</span>
                    <strong>{label}</strong>
                    <em>{value}</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Members" && (
            <div>
              <div className="teams-panel-section-head">
                <div className="t-section-label">Team Members</div>
                <button type="button" className="t-btn t-btn-cyan t-btn-sm">
                  + Add Member
                </button>
              </div>

              {(team.members || []).map((member) => {
                const memberWorkloadColor = getWorkloadColor(member.workload || 0);

                return (
                  <div key={member.id} className="teams-member-row">
                    <div className="t-avatar t-avatar-md">{member.initials}</div>

                    <div className="teams-member-row-main">
                      <strong>{member.name}</strong>
                      <span>
                        {member.department} · {member.email}
                      </span>

                      <div className="teams-member-load-track">
                        <div
                          style={{
                            width: `${member.workload || 0}%`,
                            background: memberWorkloadColor,
                          }}
                        />
                      </div>
                    </div>

                    <strong
                      className="teams-member-load-value"
                      style={{ color: memberWorkloadColor }}
                    >
                      {member.workload || 0}%
                    </strong>

                    <div className="teams-member-actions">
                      <button type="button" className="t-btn t-btn-ghost t-btn-sm">
                        Promote
                      </button>
                      <button type="button" className="t-btn t-btn-danger t-btn-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              {(team.members || []).length === 0 && (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">👤</div>
                  <div className="t-empty-title">No members yet</div>
                </div>
              )}
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Assignments" && (
            <div>
              <div className="teams-panel-section-head">
                <div className="t-section-label">
                  All Assignments ({assignments.length})
                </div>
                <button
                  type="button"
                  onClick={() => onAssign?.(team)}
                  className="t-btn t-btn-cyan t-btn-sm"
                >
                  + New
                </button>
              </div>

              {assignments.length ? (
                assignments.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">📋</div>
                  <div className="t-empty-title">No assignments yet</div>
                </div>
              )}
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Projects" && (
            <div>
              <div className="t-section-label">
                Linked Projects ({groupedAssignments.projects.length})
              </div>

              {groupedAssignments.projects.length ? (
                groupedAssignments.projects.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">🚀</div>
                  <div className="t-empty-title">No projects assigned</div>
                </div>
              )}
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Tasks" && (
            <div>
              <div className="t-section-label">
                Linked Tasks ({groupedAssignments.tasks.length})
              </div>

              {groupedAssignments.tasks.length ? (
                groupedAssignments.tasks.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">✅</div>
                  <div className="t-empty-title">No tasks assigned</div>
                </div>
              )}
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Leads" && (
            <div>
              <div className="t-section-label">
                Linked Leads ({groupedAssignments.leads.length})
              </div>

              {groupedAssignments.leads.length ? (
                groupedAssignments.leads.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">🎯</div>
                  <div className="t-empty-title">No leads assigned</div>
                </div>
              )}
            </div>
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Deals" && (
            <div>
              <div className="t-section-label">
                Linked Deals ({groupedAssignments.deals.length})
              </div>

              {groupedAssignments.deals.length ? (
                groupedAssignments.deals.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))
              ) : (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-icon">💼</div>
                  <div className="t-empty-title">No deals assigned</div>
                </div>
              )}
            </div>
          )}

          {tab === "Activity" && (
            <TeamActivityFeed
              limit={10}
              filters={{
                target_id: team.id,
              }}
            />
          )}

          {!assignmentsLoading && !assignmentsError && tab === "Analytics" && (
            <div>
              <div className="t-section-label">Performance Metrics</div>

              {[
                ["Performance Score", performance, "%", performanceColor],
                ["Workload", workload, "%", workloadColor],
                ["Task Completion", 0, "%", "#4a90d9"],
                ["On-time Delivery", 0, "%", "#27ae60"],
              ].map(([label, value, unit, color]) => (
                <div key={label} className="teams-metric-progress">
                  <div>
                    <span>{label}</span>
                    <strong style={{ color }}>
                      {value}
                      {unit}
                    </strong>
                  </div>

                  <div className="workload-bar-track">
                    <div
                      className="workload-bar-fill"
                      style={{
                        width: `${value}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="teams-panel-footer">
          <button type="button" onClick={onClose} className="t-btn t-btn-ghost">
            Close
          </button>

          <button
            type="button"
            onClick={() => onEdit?.(team)}
            className="t-btn t-btn-secondary"
          >
            Edit Team
          </button>

          <button
            type="button"
            onClick={() => onAssign?.(team)}
            className="t-btn t-btn-primary"
          >
            + Create Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
