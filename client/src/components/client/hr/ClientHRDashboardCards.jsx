import { Briefcase, Building2, UserCheck, Users } from "lucide-react";

function DashboardCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </p>

          <h3 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </h3>

          {helper && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {helper}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--brand-gold)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ClientHRDashboardCards({
  employees = [],
  departments = [],
  positions = [],
}) {
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active"
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        icon={Users}
        label="Employees"
        value={employees.length}
        helper="Workspace employee records"
      />

      <DashboardCard
        icon={UserCheck}
        label="Active"
        value={activeEmployees}
        helper="Available team members"
      />

      <DashboardCard
        icon={Building2}
        label="Departments"
        value={departments.length}
        helper="Workspace departments"
      />

      <DashboardCard
        icon={Briefcase}
        label="Positions"
        value={positions.length}
        helper="Defined job positions"
      />
    </div>
  );
}
