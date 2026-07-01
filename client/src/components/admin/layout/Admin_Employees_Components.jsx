import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Grid2X2,
  List,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_TYPE_LABELS,
} from "../../../services/human_resources/employees";

function labelStatus(status) {
  return EMPLOYEE_STATUS_LABELS[status] || status || "Unknown";
}

function labelType(type) {
  return EMPLOYEE_TYPE_LABELS[type] || type || "Unknown";
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPhp(value = 0) {
  const amount = Number(value || 0);

  if (!amount) return "—";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Avatar({ name, size = "h-10 w-10" }) {
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-xs font-bold text-[var(--brand-gold)]`}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "active"
      ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
      : status === "on_leave"
        ? "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]"
        : status === "terminated"
          ? "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]"
          : "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${cls}`}
    >
      {labelStatus(status)}
    </span>
  );
}

function PolicyBadge({ balance }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${
          balance.isPaid
            ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
            : "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]"
        }`}
      >
        {balance.isPaid ? "Paid" : "Unpaid"}
      </span>

      {balance.isUnlimited && (
        <span className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-cyan)]">
          Unlimited
        </span>
      )}
    </div>
  );
}

function RatingValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-[var(--text-muted)]">—</span>;
  }

  return <span className="font-bold text-[var(--brand-gold)]">★ {value}</span>;
}

export function EmployeesHeader({ onRefresh, onCreate }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Employees
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Centralized employee records, compensation, entitlements, and
          workforce management.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-3xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-bold text-[#050816]"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>
    </div>
  );
}

export function EmployeesKPICards({ employees = [] }) {
  const totalMonthlySalary = employees.reduce(
    (sum, employee) => sum + Number(employee.salary || 0),
    0
  );

  const cards = [
    {
      label: "Total Employees",
      value: employees.length,
      icon: Users,
      sub: "Current filtered records",
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Active",
      value: employees.filter((e) => e.status === "active").length,
      icon: CheckCircle2,
      sub: "Available workforce",
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Monthly Payroll Base",
      value: formatPhp(totalMonthlySalary),
      icon: ShieldCheck,
      sub: "From employee salary",
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Leave Entitlements",
      value: employees.reduce(
        (sum, employee) => sum + (employee.leaveBalances?.length || 0),
        0
      ),
      icon: ShieldCheck,
      sub: "Employee-level policies",
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "AI Review",
      value: employees.filter((e) => e.aiRisk === "Pending").length,
      icon: AlertCircle,
      sub: "Needs HR validation",
      color: "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <h3 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {card.sub}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-3xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EmployeesViewTabs({
  activeView,
  onViewChange,
  recordScope = "active",
  onScopeChange,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-4">
        {[
          { key: "list", label: "List", icon: List },
          { key: "directory", label: "Directory", icon: Grid2X2 },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold ${
                active
                  ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                  : "border-transparent text-[var(--text-muted)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
        {[
          { key: "active", label: "Active" },
          { key: "archived", label: "Archived" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onScopeChange?.(item.key)}
            className={`rounded-3xl px-4 py-2 text-sm font-semibold ${
              recordScope === item.key
                ? "bg-[var(--brand-gold)] text-[#050816]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmployeesFilterToolbar({
  filters,
  onFilterChange,
  departments,
  statuses,
  types,
}) {
  function update(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
        <input
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search employees, positions, email..."
          className="h-12 w-full rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.department}
          onChange={(event) => update("department", event.target.value)}
          className="h-12 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => update("status", event.target.value)}
          className="h-12 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {labelStatus(status)}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(event) => update("type", event.target.value)}
          className="h-12 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {labelType(type)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function EmployeesListView({ employees = [], onRowClick }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Position</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Salary</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Entitlements</th>
            <th className="px-4 py-3">Attendance</th>
            <th className="px-4 py-3">Rating</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {employees.map((employee) => (
            <tr
              key={employee.id}
              onClick={() => onRowClick(employee)}
              className="cursor-pointer hover:bg-[var(--hover-bg)]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={employee.name} />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {employee.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {employee.employeeCode} · {employee.email || "No email"}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {employee.department}
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {employee.position}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {labelType(employee.type)}
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--brand-gold)]">
                {formatPhp(employee.salary)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={employee.status} />
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--brand-gold)]">
                {employee.leaveBalances?.length || 0}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {employee.attendanceStatus}
              </td>
              <td className="px-4 py-3">
                <RatingValue value={employee.performanceRating} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeesDirectoryView({ employees = [], onCardClick }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee) => (
        <button
          key={employee.id}
          type="button"
          onClick={() => onCardClick(employee)}
          className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-left hover:bg-[var(--hover-bg)]"
        >
          <div className="flex items-center gap-3">
            <Avatar name={employee.name} size="h-12 w-12" />
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">
                {employee.name}
              </h3>
              <p className="text-sm text-[var(--brand-gold)]">
                {employee.position}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>{employee.department}</p>
            <p>{employee.email || "No email"}</p>
            <p>Salary: {formatPhp(employee.salary)}</p>
            <p>{employee.leaveBalances?.length || 0} leave entitlement(s)</p>
            <StatusBadge status={employee.status} />
          </div>
        </button>
      ))}
    </div>
  );
}

export function EmployeeDetailDrawer({
  employee,
  onClose,
  onEdit,
  onArchive,
  onRestore,
  onEditLeaveBalance,
  saving,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={employee.name} size="h-12 w-12" />
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {employee.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--brand-gold)]">
                  {employee.position}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-5">
              <h4 className="mb-4 font-bold text-[var(--text-primary)]">
                Employee Profile
              </h4>

              <div className="grid gap-4 text-sm md:grid-cols-2">
                <Info label="Employee Code" value={employee.employeeCode} />
                <Info label="Email" value={employee.email} />
                <Info label="Phone" value={employee.phone} />
                <Info label="Department" value={employee.department} />
                <Info label="Position" value={employee.position} />
                <Info label="Manager" value={employee.manager} />
                <Info label="Employment Type" value={labelType(employee.type)} />
                <Info label="Salary" value={formatPhp(employee.salary)} />
                <Info label="Hire Date" value={formatDate(employee.hireDate)} />
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] p-5">
              <div className="mb-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--brand-cyan)]" />
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">
                    Leave Entitlements
                  </h4>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Employee-specific paid, unpaid, limited, and unlimited leave control.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {(employee.leaveBalances || []).length === 0 && (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                    No leave entitlements found for this employee.
                  </div>
                )}

                {(employee.leaveBalances || []).map((balance) => (
                  <div
                    key={balance.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="font-bold text-[var(--text-primary)]">
                          {balance.leaveType}
                        </h5>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Year {balance.year}
                        </p>
                      </div>

                      <PolicyBadge balance={balance} />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                      <MiniStat label="Allocated" value={balance.allocatedDays} />
                      <MiniStat label="Used" value={balance.usedDays} />
                      <MiniStat label="Pending" value={balance.pendingDays} />
                      <MiniStat
                        label="Remaining"
                        value={
                          balance.isUnlimited ? "Unlimited" : balance.remainingDays
                        }
                      />
                    </div>

                    {balance.notes && (
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        {balance.notes}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onEditLeaveBalance?.(balance, employee)}
                        className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-60"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit Entitlement
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
              <h4 className="font-bold text-[var(--text-primary)]">
                HR Intelligence
              </h4>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {employee.aiRisk} — HR review required before action.
              </p>
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          {employee.status === "active" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => onArchive?.(employee)}
              className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] disabled:opacity-60"
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => onRestore?.(employee)}
              className="rounded-3xl border border-green-500/20 bg-[var(--success-soft)] px-4 py-2 text-sm font-semibold text-[var(--success)] disabled:opacity-60"
            >
              Restore
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => onEdit?.(employee)}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-60"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">
        {value || "—"}
      </p>
    </div>
  );
}

export function EmployeeLeaveBalanceModal({
  employee,
  balance,
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
}) {
  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Edit Leave Entitlement
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {employee?.name} · {balance?.leaveType}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Allocated Days">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.allocatedDays}
                onChange={(event) =>
                  update("allocatedDays", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Policy Year">
              <input
                disabled
                value={balance?.year || ""}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-sm text-[var(--text-muted)] outline-none"
              />
            </Field>

            <Field label="Paid Leave">
              <label className="flex h-11 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={form.isPaid}
                  onChange={(event) => update("isPaid", event.target.checked)}
                />
                Paid by company
              </label>
            </Field>

            <Field label="Unlimited Leave">
              <label className="flex h-11 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={form.isUnlimited}
                  onChange={(event) =>
                    update("isUnlimited", event.target.checked)
                  }
                />
                No balance limit
              </label>
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
                  placeholder="Special contract, executive package, probation policy..."
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-4 text-sm text-[var(--text-secondary)]">
            Used and pending days are controlled by leave requests. HR should
            only adjust allocation and policy rules here.
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-3xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-bold text-[#050816] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Entitlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EmployeeFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  formOptions,
}) {
  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  const isEdit = mode === "edit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isEdit
                ? "Update employee profile details."
                : "Create a workspace-scoped employee record."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employee Code">
              <input
                required
                value={form.employeeCode}
                onChange={(e) => update("employeeCode", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Hire Date">
              <input
                type="date"
                value={form.hireDate || ""}
                onChange={(e) => update("hireDate", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="First Name">
              <input
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Last Name">
              <input
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => update("email", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Monthly Salary (PHP)">
              <input
                type="number"
                min="0"
                value={form.salary || ""}
                onChange={(e) => update("salary", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
                placeholder="30000"
              />
            </Field>

            <Field label="Department">
              <select
                value={form.departmentId || ""}
                onChange={(e) => update("departmentId", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">Unassigned</option>
                {(formOptions.departments || []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Position">
              <select
                value={form.positionId || ""}
                onChange={(e) => update("positionId", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">Unassigned</option>
                {(formOptions.positions || []).map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Employment Type">
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-3xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-bold text-[#050816] disabled:opacity-60"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmployeesLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading employees...
      </p>
    </div>
  );
}

export function EmployeesErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load employees
          </h3>
          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-3xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
