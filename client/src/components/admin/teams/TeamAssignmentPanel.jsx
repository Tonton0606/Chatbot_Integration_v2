import { useState } from "react";

import AssignmentManager from "./AssignmentManager.jsx";

export default function TeamAssignmentPanel({
  team,
  assignment,
  onClose,
  onAssign,
}) {
  const isEdit = Boolean(assignment?.id);
  const [savedAssignment, setSavedAssignment] = useState(null);

  const prefillAssignee =
    !isEdit && team
      ? {
          id: team.id,
          assignee_type: "team",
          name: team.name,
          type_label: team.type_label,
          metrics: team.metrics,
        }
      : null;

  const handleAssign = (nextAssignment) => {
    setSavedAssignment(nextAssignment);
    onAssign?.(nextAssignment);
  };

  return (
    <div className="teams-panel-overlay" onClick={onClose}>
      <div
        className="teams-panel teams-assignment-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="teams-panel-header">
          <div>
            <div className="teams-panel-title">
              {isEdit ? "Reassign / Update Assignment" : "Create Assignment"}
            </div>

            <div className="teams-panel-subtitle">
              {isEdit
                ? `Editing assignment: ${assignment.record_label}`
                : team
                  ? `Prefilled assignee: ${team.name}`
                  : "Multi-step assignment builder"}
            </div>
          </div>

          <button type="button" className="teams-panel-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="teams-panel-body">
          {savedAssignment ? (
            <div className="teams-assignment-success">
              <div className="teams-assignment-success-icon">✅</div>

              <div className="teams-assignment-success-title">
                {isEdit ? "Assignment Updated" : "Assignment Created"}
              </div>

              <div className="teams-assignment-success-copy">
                <strong>{savedAssignment.record_label}</strong>{" "}
                {isEdit ? "is now assigned to" : "was assigned to"}{" "}
                <strong>{savedAssignment.assignee_label}</strong> as{" "}
                <strong>{savedAssignment.role_label}</strong>.
              </div>

              <div className="teams-assignment-success-actions">
                {!isEdit && (
                  <button
                    type="button"
                    className="t-btn t-btn-cyan"
                    onClick={() => setSavedAssignment(null)}
                  >
                    + New Assignment
                  </button>
                )}

                <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <AssignmentManager
              assignment={assignment}
              prefillAssignee={prefillAssignee}
              onAssign={handleAssign}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
