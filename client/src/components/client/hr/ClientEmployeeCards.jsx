import { Mail, Phone } from "lucide-react";

function formatLabel(value = "") {
  return String(value || "—").replaceAll("_", " ");
}

export default function ClientEmployeeCards({
  employees = [],
  onEdit,
  onArchive,
}) {
  if (!employees.length) {
    return null;
  }

  return (
    <div className="space-y-4 lg:hidden">
      {employees.map((employee) => (
        <div
          key={employee.id}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                {employee.name || "Unnamed employee"}
              </h3>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {employee.employeeCode || "No code"}
              </p>
            </div>

            <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs font-semibold capitalize text-[var(--text-secondary)]">
              {formatLabel(employee.status)}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Department:
              </span>{" "}
              {employee.department || "Unassigned"}
            </p>

            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Position:
              </span>{" "}
              {employee.position || "Unassigned"}
            </p>

            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Manager:
              </span>{" "}
              {employee.manager || "—"}
            </p>
          </div>

          <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
            {employee.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                {employee.email}
              </div>
            )}

            {employee.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {employee.phone}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(employee)}
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => onArchive?.(employee)}
              className="flex-1 rounded-xl border border-red-500/20 bg-[var(--danger-soft)] py-2 text-sm font-semibold text-[var(--danger)]"
            >
              Archive
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
