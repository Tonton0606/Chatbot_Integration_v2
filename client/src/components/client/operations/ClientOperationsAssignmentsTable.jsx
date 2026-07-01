function getPriorityColor(priority = "medium") {
  const value = String(priority || "").toLowerCase();

  if (value === "critical" || value === "urgent") return "#e74c3c";
  if (value === "high") return "#f5a623";
  if (value === "low") return "#27ae60";

  return "#4a90d9";
}

function getStatusClass(status = "pending") {
  const value = String(status || "").toLowerCase();

  if (value === "completed" || value === "done") return "t-chip-completed";
  if (value === "blocked" || value === "archived") return "t-chip-archived";
  if (value === "in_progress" || value === "review") return "t-chip-inactive";

  return "t-chip-active";
}

function getInitial(value = "") {
  return String(value || "?").charAt(0).toUpperCase();
}

export default function ClientOperationsAssignmentsTable({
  assignments = [],
  onCreateAssignment,
}) {
  return (
    <div className="client-op-table-wrap">
      <table className="client-op-table">
        <thead>
          <tr>
            {[
              "Assignment",
              "Assignee",
              "Assignee Type",
              "Role",
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
              <tr key={assignment.id} className="client-op-row">
                <td className="client-op-table-strong">
                  <div className="client-op-record-cell">
                    <span className="client-op-record-icon">📌</span>
                    <div className="min-w-0">
                      <strong>{assignment.title || assignment.record_label}</strong>
                      <small>{assignment.record_label || "Standalone assignment"}</small>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="client-op-assignee-cell">
                    <div className="client-op-avatar client-op-avatar-sm">
                      {getInitial(assignment.assignee_label)}
                    </div>

                    <span>{assignment.assignee_label || "Unassigned"}</span>
                  </div>
                </td>

                <td>
                  <span className="client-op-soft-pill">
                    {assignment.assignee_type_label || assignment.assignee_type}
                  </span>
                </td>

                <td>{assignment.role_label || "—"}</td>

                <td>
                  <span
                    className="client-op-chip"
                    style={{
                      color: priorityColor,
                      borderColor: `${priorityColor}44`,
                      background: `${priorityColor}18`,
                    }}
                  >
                    {assignment.priority_label || assignment.priority || "medium"}
                  </span>
                </td>

                <td className="client-op-muted">{assignment.due_date || "—"}</td>

                <td>
                  <span className={`client-op-chip ${statusClass}`}>
                    {assignment.status_label || assignment.status || "pending"}
                  </span>
                </td>

                <td>
                  <div className="client-op-table-actions">
                    <button type="button" className="client-op-btn ghost sm" disabled>
                      Edit soon
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {assignments.length === 0 && (
            <tr>
              <td colSpan={8}>
                <div className="client-op-empty">
                  <div className="client-op-empty-icon">📋</div>
                  <div className="client-op-empty-title">No assignments yet</div>
                  <div className="client-op-empty-sub">
                    Assignments will appear here once responsibilities are created.
                  </div>

                  <button
                    type="button"
                    className="client-op-btn primary"
                    onClick={onCreateAssignment}
                  >
                    + Create Assignment
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
