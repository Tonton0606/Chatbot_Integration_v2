import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  LEAVE_STATUS_LABELS,
} from "../../../services/human_resources/leave_management";

function labelStatus(status) {
  return LEAVE_STATUS_LABELS[status] || status || "Unknown";
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusClass(status) {
  const map = {
    pending:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    approved:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    rejected:
      "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    cancelled:
      "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
  };

  return map[status] || map.pending;
}

export function LeaveHeader({ onRefresh, onCreate }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Leave Management
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Leave requests, approvals, and workforce availability tracking.
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
          File Leave
        </button>
      </div>
    </div>
  );
}

export function LeaveKPICards({ requests = [] }) {
  const cards = [
    {
      label: "Pending",
      value: requests.filter((item) => item.status === "pending").length,
      icon: Clock,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Approved",
      value: requests.filter((item) => item.status === "approved").length,
      icon: CheckCircle2,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Rejected",
      value: requests.filter((item) => item.status === "rejected").length,
      icon: XCircle,
      color:
        "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Total Days",
      value: requests.reduce(
        (sum, item) => sum + Number(item.totalDays || 0),
        0
      ),
      icon: CalendarDays,
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

export function LeaveRequestsTable({
  requests = [],
  saving,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Days</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {requests.length === 0 && (
            <tr>
              <td
                colSpan="8"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No leave requests found.
              </td>
            </tr>
          )}

          {requests.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">
                  {item.employee}
                </p>

                <p className="text-xs text-[var(--text-muted)]">
                  {item.employeeCode}
                </p>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {item.department}
              </td>

              <td className="px-4 py-3 font-semibold text-[var(--brand-gold)]">
                {item.leaveType}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {formatDate(item.startDate)} → {formatDate(item.endDate)}
              </td>

              <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                {item.totalDays}
              </td>

              <td className="max-w-xs truncate px-4 py-3 text-[var(--text-secondary)]">
                {item.reason}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                    item.status
                  )}`}
                >
                  {labelStatus(item.status)}
                </span>
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onApprove(item.id)}
                        className="rounded-full border border-green-500/20 bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success)] disabled:opacity-60"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onReject(item.id)}
                        className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] px-3 py-1 text-xs font-bold text-[var(--danger)] disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}

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

export function LeaveFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  employees = [],
  leaveTypes = [],
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
        className="w-full max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit Leave Request" : "File Leave Request"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isEdit
                ? "Update leave request details."
                : "Create a leave request using employee entitlements."}
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
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeCode} · {employee.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Leave Type">
              <select
                required
                value={form.leaveTypeId}
                onChange={(event) => update("leaveTypeId", event.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Start Date">
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) => update("startDate", event.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="End Date">
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(event) => update("endDate", event.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Total Days">
              <input
                required
                type="number"
                min="0.5"
                step="0.5"
                value={form.totalDays}
                onChange={(event) => update("totalDays", event.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </Field>

            <Field label="Reason">
              <input
                value={form.reason}
                onChange={(event) => update("reason", event.target.value)}
                className="h-11 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
                placeholder="Optional reason"
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-4 text-sm text-[var(--text-secondary)]">
            Leave entitlement values are controlled inside the Employees module.
            This page only files and processes requests.
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
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Request"}
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

export function LeaveLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading leave management...
      </p>
    </div>
  );
}

export function LeaveErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load leave management
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
