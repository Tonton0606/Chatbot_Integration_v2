import { useState } from "react";

function getWorkloadColor(value = 0) {
  const workload = Number(value || 0);

  if (workload >= 90) return "#e74c3c";
  if (workload >= 75) return "#f5a623";
  return "#27ae60";
}

function getStatusClass(status = "active") {
  const value = String(status || "").toLowerCase();

  if (value === "archived") return "t-chip-archived";
  if (value === "inactive") return "t-chip-inactive";
  return "t-chip-active";
}

function safeInitials(value = "") {
  return String(value || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ClientTeamCard({ team, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const color = team.color || team.type_color || "#c9a84c";
  const members = team.members || [];
  const workload = Number(team.metrics?.workload || 0);
  const workloadColor = getWorkloadColor(workload);

  return (
    <div
      className="client-op-team-card"
      style={{ "--team-color": color }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(team)}
    >
      <div className="client-op-team-card-body">
        <div className="client-op-team-card-header">
          <div className="min-w-0">
            <div className="client-op-team-card-name">{team.name}</div>

            <div
              className="client-op-team-card-type"
              style={{
                background: `${color}18`,
                color,
                borderColor: `${color}33`,
              }}
            >
              {team.type_label || team.type_key || "Operations"}
            </div>
          </div>

          <div
            className="client-op-team-card-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={`client-op-chip ${getStatusClass(team.status)}`}>
              {team.status || "active"}
            </span>

            <div className="client-op-menu-wrap">
              <button
                type="button"
                className="client-op-menu-trigger"
                onClick={() => setMenuOpen((current) => !current)}
              >
                ⋮
              </button>

              {menuOpen && (
                <div className="client-op-menu">
                  <button
                    type="button"
                    className="client-op-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onSelect?.(team);
                    }}
                  >
                    👁 View
                  </button>

                  <button
                    type="button"
                    className="client-op-menu-item disabled"
                    disabled
                  >
                    ✏️ Edit soon
                  </button>

                  <button
                    type="button"
                    className="client-op-menu-item disabled"
                    disabled
                  >
                    🗄️ Archive soon
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="client-op-team-card-desc">
          {team.description || "No team description yet."}
        </div>

        <div className="client-op-team-card-metrics">
          <div className="client-op-team-metric">
            <div className="client-op-team-metric-value" style={{ color }}>
              {team.member_count || 0}
            </div>
            <div className="client-op-team-metric-label">Members</div>
          </div>

          <div className="client-op-team-metric">
            <div className="client-op-team-metric-value">
              {team.metrics?.assignments || 0}
            </div>
            <div className="client-op-team-metric-label">Assignments</div>
          </div>

          <div className="client-op-team-metric">
            <div className="client-op-team-metric-value">
              {team.metrics?.assignments_open || 0}
            </div>
            <div className="client-op-team-metric-label">Open</div>
          </div>
        </div>

        <div className="client-op-team-workload">
          <div className="client-op-team-workload-head">
            <span>Workload</span>
            <span style={{ color: workloadColor }}>{workload}%</span>
          </div>

          <div className="client-op-workload-track">
            <div
              className="client-op-workload-fill"
              style={{
                width: `${Math.min(workload, 100)}%`,
                background: workloadColor,
              }}
            />
          </div>
        </div>

        <div className="client-op-team-card-footer">
          <div className="client-op-member-avatars">
            {members.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className="client-op-member-avatar"
                title={member.name}
                style={{
                  background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
                }}
              >
                {member.initials || safeInitials(member.name)}
              </div>
            ))}

            {members.length > 4 && (
              <div className="client-op-member-avatar client-op-member-more">
                +{members.length - 4}
              </div>
            )}

            {members.length === 0 && (
              <span className="client-op-muted-small">No members</span>
            )}
          </div>

          <div className="client-op-team-lead">
            Lead: <span>{team.lead_name || "Unassigned"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientOperationsTeamCards({
  teams = [],
  onCreateTeam,
  onSelectTeam,
}) {
  if (teams.length === 0) {
    return (
      <div className="client-op-empty">
        <div className="client-op-empty-icon">👥</div>
        <div className="client-op-empty-title">No teams yet</div>
        <div className="client-op-empty-sub">
          Create your first client operations team to start assigning people and
          responsibilities.
        </div>

        <button type="button" className="client-op-btn primary" onClick={onCreateTeam}>
          + Create First Team
        </button>
      </div>
    );
  }

  return (
    <div className="client-op-team-grid">
      {teams.map((team) => (
        <ClientTeamCard key={team.id} team={team} onSelect={onSelectTeam} />
      ))}

      <button type="button" className="client-op-create-card" onClick={onCreateTeam}>
        <span>+</span>
        <strong>Create New Team</strong>
      </button>
    </div>
  );
}
