import { Mail, Phone } from "lucide-react";

function formatLabel(value = "") {
  return String(value || "—").replaceAll("_", " ");
}

export default function ClientEmployeeTable({
  employees = [],
  onEdit,
  onArchive,
}) {
  if (!employees.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          No employees found
        </h3>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Create your first employee record to start building workspace teams.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-[var(--border-color)] bg-[var(--hover-bg)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Employee
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Department
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Position
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Manager
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--text-muted)]">
                Contact
              </th>
              <th className="px-4 py-3 text-right font-semibold text-[var(--text-muted)]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {employee.name || "Unnamed employee"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {employee.employeeCode || "No code"}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4 text-[var(--text-secondary)]">
                  {employee.department || "Unassigned"}
                </td>

                <td className="px-4 py-4 text-[var(--text-secondary)]">
                  {employee.position || "Unassigned"}
                </td>

                <td className="px-4 py-4 text-[var(--text-secondary)]">
                  {employee.manager || "—"}
                </td>

                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-1 text-xs font-semibold capitalize text-[var(--text-secondary)]">
                    {formatLabel(employee.status)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                    {employee.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {employee.email}
                      </div>
                    ) : null}

                    {employee.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {employee.phone}
                      </div>
                    ) : null}

                    {!employee.email && !employee.phone ? "—" : null}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(employee)}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onArchive?.(employee)}
                      className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--danger)]"
                    >
                      Archive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
