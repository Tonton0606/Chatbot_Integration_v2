import {
  RECORD_TYPE_ICONS,
  getPriorityColor,
  getRecordTypeLabel,
} from "@/constants/operations/teamConstants";

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "completed" || value === "done") return "t-chip-completed";
  if (value === "blocked" || value === "archived") return "t-chip-archived";
  if (value === "review") return "t-chip-inactive";

  return "t-chip-active";
}

function getActionLabel(assignment = {}) {
  const status = String(assignment.status || "").toLowerCase();

  if (status === "completed" || status === "done") {
    return "Review";
  }

  return "Edit";
}

export default function AssignmentTable({
  assignments = [],
  onReassign,
  onRemove,
}) {
  return (
    <div className="teams-table-wrap">
      <table className="teams-table">
        <thead>
          <tr>
            {[
              "Type",
              "Record Name",
              "Assignee",
              "Assignee Type",
              "Role",
              "Assigned By",
              "Priority",
              "Due Date",
              "Status",
              "Actions",
            ].map((heading) => (
              <th key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {assignments.map((assignment) => {
            const priorityColor = getPriorityColor(assignment.priority);
            const statusClass = getStatusClass(assignment.status);

            return (
              <tr key={assignment.id} className="t-row">
                <td>
                  <div className="teams-table-icon-cell">
                    <span>
                      {RECORD_TYPE_ICONS[assignment.record_type] || "📌"}
                    </span>

                    <small>
                      {getRecordTypeLabel(assignment.record_type)}
                    </small>
                  </div>
                </td>

                <td className="teams-table-strong">
                  {assignment.record_label}
                </td>

                <td>
                  <div className="teams-table-assignee">
                    <div className="t-avatar t-avatar-sm">
                      {assignment.assignee_label?.charAt(0) || "?"}
                    </div>

                    <span>{assignment.assignee_label}</span>
                  </div>
                </td>

                <td>
                  <span className="teams-soft-pill">
                    {assignment.assignee_type_label}
                  </span>
                </td>

                <td>{assignment.role_label}</td>

                <td className="teams-muted">
                  {assignment.assigned_by}
                </td>

                <td>
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
                </td>

                <td className="teams-muted">
                  {assignment.due_date || "—"}
                </td>

                <td>
                  <span className={`t-chip ${statusClass}`}>
                    {assignment.status || "active"}
                  </span>
                </td>

                <td>
                  <div className="teams-table-actions">
                    <button
                      type="button"
                      className="t-btn t-btn-ghost t-btn-sm"
                      onClick={() => onReassign?.(assignment)}
                      disabled={!onReassign}
                    >
                      {getActionLabel(assignment)}
                    </button>

                    <button
                      type="button"
                      className="t-btn t-btn-danger t-btn-sm"
                      onClick={() => onRemove?.(assignment)}
                      disabled={!onRemove}
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {assignments.length === 0 && (
            <tr>
              <td colSpan={10}>
                <div className="t-empty">
                  <div className="t-empty-title">No assignments yet</div>

                  <div className="t-empty-sub">
                    Assignments will appear here once projects, tasks, leads, or deals exist.
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
