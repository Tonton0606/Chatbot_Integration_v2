import { X } from "lucide-react";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

export default function ClientEmployeeFormModal({
  mode = "create",
  form,
  formOptions,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  const isEdit = mode === "edit";

  function update(key, value) {
    onChange?.({
      ...form,
      [key]: value,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Human Resources
            </p>

            <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit Employee" : "Create Employee"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add basic employee records. Team leaders and assignment owners are
              configured later in Teams and Assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employee Code">
              <input
                required
                value={form.employeeCode}
                onChange={(event) =>
                  update("employeeCode", event.target.value)
                }
                className={inputClass}
                placeholder="EMP-001"
              />
            </Field>

            <Field label="Hire Date">
              <input
                type="date"
                value={form.hireDate || ""}
                onChange={(event) => update("hireDate", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="First Name">
              <input
                required
                value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)}
                className={inputClass}
                placeholder="Juan"
              />
            </Field>

            <Field label="Last Name">
              <input
                required
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
                className={inputClass}
                placeholder="Dela Cruz"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className={inputClass}
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                className={inputClass}
                placeholder="+63 912 345 6789"
              />
            </Field>

            <Field label="Department">
              <select
                value={form.departmentId || ""}
                onChange={(event) =>
                  update("departmentId", event.target.value)
                }
                className={inputClass}
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
                onChange={(event) => update("positionId", event.target.value)}
                className={inputClass}
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
                value={form.employmentType}
                onChange={(event) =>
                  update("employmentType", event.target.value)
                }
                className={inputClass}
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
                onChange={(event) => update("status", event.target.value)}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
