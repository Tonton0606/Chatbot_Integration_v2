import React, { useState } from "react";

import {
  getTeamTypeLabel,
  getWorkloadColor,
} from "@/constants/operations/teamConstants";

export default function TeamCard({
  team,
  members,
  onClick,
  onEdit,
  onArchive,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const color = team.color || "var(--teams-blue)";
  const teamMembers = members || team.members || [];
  const workload = team.metrics?.workload || 0;
  const performance = team.metrics?.performance || 0;
  const workloadColor = getWorkloadColor(workload);
  const performanceColor = getWorkloadColor(performance);

  const handleMenuAction = (event, action) => {
    event.stopPropagation();
    setMenuOpen(false);
    action?.(team);
  };

  return (
    <div
      className="team-card"
      style={{ "--team-color": color }}
      onClick={() => onClick?.(team)}
      role="button"
      tabIndex={0}
    >
      <div className="team-card-body">
        <div className="team-card-header">
          <div>
            <div className="team-card-name">{team.name}</div>
            <div
              className="team-card-type"
              style={{
                background: `${color}18`,
                color,
              }}
            >
              {team.type_label || getTeamTypeLabel(team.type)}
            </div>
          </div>

          <div className="team-card-actions" onClick={(event) => event.stopPropagation()}>
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

            <div className="team-card-menu-wrap">
              <button
                type="button"
                className="team-card-menu-trigger"
                onClick={() => setMenuOpen((open) => !open)}
              >
                ⋮
              </button>

              {menuOpen && (
                <div className="team-card-menu">
                  <button
                    type="button"
                    className="team-card-menu-item"
                    onClick={(event) => handleMenuAction(event, onEdit)}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    className="team-card-menu-item"
                    onClick={(event) => handleMenuAction(event, onClick)}
                  >
                    📊 Workload
                  </button>

                  <button
                    type="button"
                    className="team-card-menu-item danger"
                    onClick={(event) => handleMenuAction(event, onArchive)}
                  >
                    🗄️ Archive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="team-card-desc">{team.description}</div>

        <div className="team-card-metrics">
          <div className="team-metric">
            <div className="team-metric-val" style={{ color }}>
              {team.metrics?.assignments || 0}
            </div>
            <div className="team-metric-lbl">Assignments</div>
          </div>

          <div className="team-metric">
            <div className="team-metric-val">
              {team.metrics?.open_tasks || 0}
            </div>
            <div className="team-metric-lbl">Tasks</div>
          </div>

          <div className="team-metric">
            <div
              className="team-metric-val"
              style={{ color: performanceColor }}
            >
              {performance}%
            </div>
            <div className="team-metric-lbl">Perf</div>
          </div>
        </div>

        <div className="team-card-workload">
          <div className="team-card-workload-head">
            <span>Workload</span>
            <span style={{ color: workloadColor }}>{workload}%</span>
          </div>

          <div className="workload-bar-track">
            <div
              className="workload-bar-fill"
              style={{
                width: `${workload}%`,
                background: workloadColor,
              }}
            />
          </div>
        </div>

        <div className="team-card-footer">
          <div className="team-member-avatars">
            {teamMembers.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className="team-member-avatar"
                title={member.name}
                style={{
                  background: `linear-gradient(135deg, ${color}aa, ${color}66)`,
                }}
              >
                {member.initials}
              </div>
            ))}

            {teamMembers.length > 4 && (
              <div className="team-member-avatar team-member-more">
                +{teamMembers.length - 4}
              </div>
            )}
          </div>

          <div className="team-card-lead">
            Lead:{" "}
            <span>
              {team.lead_member?.name?.split(" ")[0] || team.lead_name || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
