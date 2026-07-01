import { CalendarDays, Mail, Phone, User } from "lucide-react";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ClientRecentEmployees({
  employees = [],
  limit = 5,
}) {
  const recentEmployees = [...employees]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0) -
        new Date(a.createdAt || a.created_at || 0)
    )
    .slice(0, limit);

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] px-5 py-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Recent Employees
        </h3>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Recently added employee records.
        </p>
      </div>

      {recentEmployees.length === 0 ? (
        <div className="p-10 text-center">
          <User className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

          <h4 className="mt-4 font-semibold text-[var(--text-primary)]">
            No employees yet
          </h4>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Employee records will appear here once created.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {recentEmployees.map((employee) => (
            <div
              key={employee.id}
              className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)]">
                  {employee.name}
                </div>

                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                  {employee.position || "No position assigned"}
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  {employee.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {employee.email}
                    </span>
                  )}

                  {employee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {employee.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(
                  employee.createdAt || employee.created_at
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
