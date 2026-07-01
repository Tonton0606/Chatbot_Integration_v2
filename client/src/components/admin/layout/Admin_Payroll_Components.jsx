import {
  AlertCircle,
  Brain,
  CheckCircle2,
  CreditCard,
  Edit,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  PAYROLL_STATUS_LABELS,
} from "../../../services/human_resources/payroll";

function formatPhp(value = 0) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function labelStatus(status) {
  return PAYROLL_STATUS_LABELS[status] || status || "Unknown";
}

function statusClass(status) {
  const map = {
    draft:
      "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
    processing:
      "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
    pending_approval:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    approved:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    disbursed:
      "border-purple-500/20 bg-purple-500/10 text-purple-400",
  };

  return map[status] || map.draft;
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function PayrollHeader({ onRefresh, onCreateRun, onCreateItem }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Payroll
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Payroll runs, generated employee payroll items, approval, and disbursement tracking.
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
          onClick={onCreateRun}
          className="inline-flex items-center gap-2 rounded-3xl bg-[var(--brand-gold)] px-4 py-2.5 text-sm font-bold text-[#050816]"
        >
          <Plus className="h-4 w-4" />
          Payroll Run
        </button>

        <button
          type="button"
          onClick={onCreateItem}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-4 py-2.5 text-sm font-bold text-[var(--brand-cyan)]"
        >
          <Plus className="h-4 w-4" />
          Manual Item
        </button>
      </div>
    </div>
  );
}

export function PayrollKPICards({ payrollRuns = [], selectedRun = null }) {
  const activeRun = selectedRun || payrollRuns[0];

  const cards = [
    {
      label: "Gross Pay",
      value: activeRun ? formatPhp(activeRun.grossPay) : "₱0",
      icon: Wallet,
      color:
        "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Deductions",
      value: activeRun ? formatPhp(activeRun.deductions) : "₱0",
      icon: CreditCard,
      color:
        "text-[var(--danger)] bg-[var(--danger-soft)] border-red-500/20",
    },
    {
      label: "Net Pay",
      value: activeRun ? formatPhp(activeRun.netPay) : "₱0",
      icon: CheckCircle2,
      color:
        "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Runs",
      value: payrollRuns.length,
      icon: RefreshCw,
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

                <h3 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
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

export function PayrollAIInsights({ insights = [] }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-[var(--brand-cyan)]" />

        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)]">
            Payroll Intelligence
          </h3>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Payroll generation uses employee salary, attendance overtime, and unpaid approved leave. Manual validation is still required.
          </p>

          <div className="mt-4 space-y-3">
            {insights.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
              >
                <h4 className="font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h4>

                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PayrollRunsTable({
  payrollRuns = [],
  selectedRunId,
  saving,
  onSelect,
  onEdit,
  onDelete,
  onGenerate,
  onApprove,
  onDisburse,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Gross</th>
            <th className="px-4 py-3">Deductions</th>
            <th className="px-4 py-3">Net Pay</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {payrollRuns.length === 0 && (
            <tr>
              <td
                colSpan="8"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No payroll runs found.
              </td>
            </tr>
          )}

          {payrollRuns.map((run) => {
            const active = selectedRunId === run.id;

            return (
              <tr
                key={run.id}
                onClick={() => onSelect?.(run.id)}
                className={`cursor-pointer hover:bg-[var(--hover-bg)] ${
                  active ? "bg-[var(--hover-bg)]" : ""
                }`}
              >
                <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    {active && (
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-gold)]" />
                    )}
                    {run.payrollCode}
                  </div>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {run.period}
                </td>

                <td className="px-4 py-3 font-semibold text-[var(--brand-gold)]">
                  {formatPhp(run.grossPay)}
                </td>

                <td className="px-4 py-3 font-semibold text-[var(--danger)]">
                  {formatPhp(run.deductions)}
                </td>

                <td className="px-4 py-3 font-bold text-[var(--success)]">
                  {formatPhp(run.netPay)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                      run.status
                    )}`}
                  >
                    {labelStatus(run.status)}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {formatDate(run.periodStart)} → {formatDate(run.periodEnd)}
                </td>

                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    {["draft", "processing"].includes(run.status) && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onGenerate(run)}
                        className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-cyan)] disabled:opacity-60"
                      >
                        Generate
                      </button>
                    )}

                    {run.status === "pending_approval" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onApprove(run.id)}
                        className="rounded-full border border-green-500/20 bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success)] disabled:opacity-60"
                      >
                        Approve
                      </button>
                    )}

                    {run.status === "approved" && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDisburse(run.id)}
                        className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 disabled:opacity-60"
                      >
                        Disburse
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onEdit(run)}
                      className="rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-2 text-[var(--text-secondary)] disabled:opacity-60"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onDelete(run)}
                      className="rounded-full border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PayrollEmployeesTable({
  selectedRun,
  payrollEmployees = [],
  saving,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-color)] p-5">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          Employee Payroll Items
        </h3>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {selectedRun
            ? `Reviewing ${selectedRun.payrollCode} · ${selectedRun.period}`
            : "Select a payroll run to review employee payroll items."}
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Basic</th>
            <th className="px-4 py-3">Allowances</th>
            <th className="px-4 py-3">OT</th>
            <th className="px-4 py-3">Bonus</th>
            <th className="px-4 py-3">Deductions</th>
            <th className="px-4 py-3">Net Pay</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)]">
          {payrollEmployees.length === 0 && (
            <tr>
              <td
                colSpan="9"
                className="px-4 py-10 text-center text-[var(--text-muted)]"
              >
                No employee payroll items found for the selected payroll run.
              </td>
            </tr>
          )}

          {payrollEmployees.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
              <td className="px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">
                  {item.employee}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.employeeCode} · {item.position}
                </p>
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {item.department}
              </td>

              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {formatPhp(item.basicSalary)}
              </td>

              <td className="px-4 py-3 text-[var(--success)]">
                {formatPhp(item.allowances)}
              </td>

              <td className="px-4 py-3 text-[var(--brand-gold)]">
                {formatPhp(item.overtimePay)}
              </td>

              <td className="px-4 py-3 text-purple-400">
                {formatPhp(item.bonus)}
              </td>

              <td className="px-4 py-3 text-[var(--danger)]">
                {formatPhp(item.deductions)}
              </td>

              <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                {formatPhp(item.netPay)}
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

export function PayrollRunFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Payroll Run" : "Create Payroll Run"}
      subtitle="Workspace-scoped payroll run."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payroll Code">
            <input
              required
              value={form.payrollCode}
              onChange={(event) => update("payrollCode", event.target.value)}
              className="input-base"
              placeholder="PR-2026-06"
            />
          </Field>

          <Field label="Period Label">
            <input
              required
              value={form.periodLabel}
              onChange={(event) => update("periodLabel", event.target.value)}
              className="input-base"
              placeholder="June 2026"
            />
          </Field>

          <Field label="Period Start">
            <input
              required
              type="date"
              value={form.periodStart}
              onChange={(event) => update("periodStart", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Period End">
            <input
              required
              type="date"
              value={form.periodEnd}
              onChange={(event) => update("periodEnd", event.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Run"}
        />
      </form>
    </ModalShell>
  );
}

export function PayrollItemFormModal({
  mode = "create",
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  payrollRuns,
  employees,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange({ ...form, [key]: value });
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Payroll Item" : "Create Payroll Item"}
      subtitle="Employee payroll breakdown."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payroll Run">
            <select
              required
              value={form.payrollRunId}
              onChange={(event) => update("payrollRunId", event.target.value)}
              className="input-base"
            >
              <option value="">Select payroll run</option>
              {payrollRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.payrollCode} · {run.period}
                </option>
              ))}
            </select>
          </Field>

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

          <MoneyField
            label="Basic Salary"
            value={form.basicSalary}
            onChange={(value) => update("basicSalary", value)}
          />

          <MoneyField
            label="Allowances"
            value={form.allowances}
            onChange={(value) => update("allowances", value)}
          />

          <MoneyField
            label="Overtime Pay"
            value={form.overtimePay}
            onChange={(value) => update("overtimePay", value)}
          />

          <MoneyField
            label="Bonus"
            value={form.bonus}
            onChange={(value) => update("bonus", value)}
          />

          <MoneyField
            label="Deductions"
            value={form.deductions}
            onChange={(value) => update("deductions", value)}
          />

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input-base"
            >
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="approved">Approved</option>
            </select>
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          saving={saving}
          label={isEdit ? "Save Changes" : "Create Item"}
        />
      </form>
    </ModalShell>
  );
}

function MoneyField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-base"
      />
    </Field>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
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
              {title}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, saving, label }) {
  return (
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
        {saving ? "Saving..." : label}
      </button>
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

export function PayrollLoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Loading payroll...
      </p>
    </div>
  );
}

export function PayrollErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-[var(--danger-soft)] p-6">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
        <div>
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load payroll
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
