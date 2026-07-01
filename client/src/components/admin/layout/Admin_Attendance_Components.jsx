import {
  AlertCircle,
  Brain,
  CalendarDays,
  Clock3,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  ATTENDANCE_SOURCE_LABELS,
  ATTENDANCE_STATUS_LABELS,
} from "../../../services/human_resources/attendance";

function statusLabel(status) {
  return ATTENDANCE_STATUS_LABELS[status] || status || "—";
}

function sourceLabel(source) {
  return ATTENDANCE_SOURCE_LABELS[source] || source || "Manual";
}

function statusClass(status) {
  const map = {
    present:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    late: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    absent: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    on_leave:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    half_day:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    remote:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    holiday:
      "border-purple-500/20 bg-purple-500/10 text-purple-400",
    training:
      "border-purple-500/20 bg-purple-500/10 text-purple-400",
    official_business:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
  };

  return map[status] || "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

export function AttendanceHeader({ onRefresh, onCreate }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Attendance
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Workforce attendance tracking, corrections, overtime, and operational intelligence.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
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
          Attendance Log
        </button>
      </div>
    </div>
  );
}

export function AttendanceKPICards({ attendance = [] }) {
  const total = attendance.length;
  const present = attendance.filter((item) => item.status === "present").length;
  const late = attendance.filter((item) => item.status === "late").length;
  const overtime = attendance.filter(
    (item) => Number(item.overtimeHours || 0) > 0
  ).length;

  const cards = [
    {
      label: "Logs",
      value: total,
      icon: Users,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Present",
      value: present,
      icon: CalendarDays,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Late",
      value: late,
      icon: Clock3,
      color:
        "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Overtime",
      value: overtime,
      icon: Timer,
      color:
        "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-3xl border ${card.color}`}
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

export function AttendanceToolbar({ search, onSearchChange }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] py-4 xl:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search employee, code, department, status, or source..."
          className="h-11 w-full rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
        />
      </div>
    </div>
  );
}

export function AttendanceTable({ attendance = [], saving, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Check In</th>
            <th className="px-4 py-3">Check Out</th>
            <th className="px-4 py-3">Hours</th>
            <th className="px-4 py-3">Overtime</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">AI Signal</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {attendance.length === 0 && (
            <tr>
              <td
                colSpan="11"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No attendance logs found.
              </td>
            </tr>
          )}

          {attendance.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">
                  {item.employee}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.employeeCode}
                  {item.isCorrected ? " · corrected" : ""}
                </p>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {item.department}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {item.date}
              </td>

              <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                {item.checkIn}
              </td>

              <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                {item.checkOut}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {item.workHours} hrs
              </td>

              <td className="px-4 py-3 font-semibold text-[var(--brand-gold)]">
                {item.overtimeHours} hrs
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    item.status
                  )}`}
                >
                  {statusLabel(item.status)}
                </span>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {sourceLabel(item.source)}
              </td>

              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-cyan)]">
                  <Brain className="h-3 w-3" />
                  {item.aiFlag}
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onEdit(item)}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDelete(item)}
                    className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees = [],
  statuses = [],
  sources = [],
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit Attendance Log" : "Create Attendance Log"}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Admin attendance source and correction workflow.
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
            <Field label="Employee">
              <select
                required
                value={form.employeeId}
                onChange={(event) => update("employeeId", event.target.value)}
                className="input-base"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeCode} · {employee.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Attendance Date">
              <input
                required
                type="date"
                value={form.attendanceDate}
                onChange={(event) =>
                  update("attendanceDate", event.target.value)
                }
                className="input-base"
              />
            </Field>

            <Field label="Check In">
              <input
                type="time"
                value={form.checkIn}
                onChange={(event) => update("checkIn", event.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="Check Out">
              <input
                type="time"
                value={form.checkOut}
                onChange={(event) => update("checkOut", event.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
                className="input-base"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Overtime Hours">
              <input
                type="number"
                min="0"
                step="0.25"
                value={form.overtimeHours}
                onChange={(event) =>
                  update("overtimeHours", event.target.value)
                }
                className="input-base"
              />
            </Field>

            <Field label="Source">
              <select
                value={form.source}
                onChange={(event) => update("source", event.target.value)}
                className="input-base"
              >
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {sourceLabel(source)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes">
              <input
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                className="input-base"
                placeholder="Manual correction, client visit, forgot checkout..."
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-4 text-sm text-[var(--text-secondary)]">
            Work hours and AI signal are generated automatically from check-in,
            check-out, overtime, and status.
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
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Log"}
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

export function AttendanceLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading attendance...
      </p>
    </div>
  );
}

export function AttendanceErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load attendance
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
