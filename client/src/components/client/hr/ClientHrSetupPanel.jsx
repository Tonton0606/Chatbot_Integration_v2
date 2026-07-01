import { useState } from "react";
import { Briefcase, Building2, Plus, Trash2, UserCog } from "lucide-react";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const emptyDepartmentForm = {
  name: "",
  description: "",
  managerEmployeeId: "",
};

const emptyPositionForm = {
  title: "",
  departmentId: "",
  employmentType: "full_time",
  description: "",
};

function slugify(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getManagerName(managerId, employees = []) {
  if (!managerId) return "No manager assigned";

  const manager = employees.find((employee) => employee.id === managerId);

  return manager?.name || "Unknown manager";
}

export default function ClientHrSetupPanel({
  departments = [],
  positions = [],
  employees = [],
  saving = false,
  onCreateDepartment,
  onArchiveDepartment,
  onCreatePosition,
  onArchivePosition,
}) {
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [positionForm, setPositionForm] = useState(emptyPositionForm);

  const activeEmployees = employees.filter(
    (employee) => !employee.archivedAt && employee.status !== "archived"
  );

  async function handleCreateDepartment(event) {
    event.preventDefault();

    const name = departmentForm.name.trim();

    if (!name) {
      alert("Department name is required.");
      return;
    }

    await onCreateDepartment?.({
      departmentKey: slugify(name),
      name,
      description: departmentForm.description.trim(),
      managerEmployeeId: departmentForm.managerEmployeeId || null,
    });

    setDepartmentForm(emptyDepartmentForm);
  }

  async function handleCreatePosition(event) {
    event.preventDefault();

    const title = positionForm.title.trim();

    if (!title) {
      alert("Position title is required.");
      return;
    }

    await onCreatePosition?.({
      positionKey: slugify(title),
      title,
      departmentId: positionForm.departmentId || null,
      employmentType: positionForm.employmentType || "full_time",
      description: positionForm.description.trim(),
    });

    setPositionForm(emptyPositionForm);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-color)] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-2 text-[var(--brand-gold)]">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Departments
              </h3>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Create workspace departments and assign department managers.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateDepartment} className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Department Name">
              <input
                value={departmentForm.name}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Sales"
              />
            </Field>

            <Field label="Department Manager">
              <select
                value={departmentForm.managerEmployeeId}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    managerEmployeeId: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">No manager yet</option>

                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <input
                  value={departmentForm.description}
                  onChange={(event) =>
                    setDepartmentForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </div>

          {activeEmployees.length === 0 && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm text-[var(--text-secondary)]">
              Create at least one employee before assigning department managers.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </button>
          </div>
        </form>

        <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {departments.length === 0 ? (
            <EmptyState message="No departments created yet." />
          ) : (
            departments.map((department) => (
              <div
                key={department.id}
                className="flex items-start justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {department.name}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <UserCog className="h-4 w-4 text-[var(--text-muted)]" />
                    {getManagerName(department.manager_employee_id, employees)}
                  </div>

                  {department.description && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {department.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onArchiveDepartment?.(department)}
                  className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                  title="Archive department"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-color)] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-2 text-[var(--brand-gold)]">
              <Briefcase className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Positions
              </h3>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Define job positions assignable to employee records.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreatePosition} className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Position Title">
              <input
                value={positionForm.title}
                onChange={(event) =>
                  setPositionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Software Engineer"
              />
            </Field>

            <Field label="Department">
              <select
                value={positionForm.departmentId}
                onChange={(event) =>
                  setPositionForm((current) => ({
                    ...current,
                    departmentId: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Unassigned</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Employment Type">
              <select
                value={positionForm.employmentType}
                onChange={(event) =>
                  setPositionForm((current) => ({
                    ...current,
                    employmentType: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </Field>

            <Field label="Description">
              <input
                value={positionForm.description}
                onChange={(event) =>
                  setPositionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Optional"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Position
            </button>
          </div>
        </form>

        <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
          {positions.length === 0 ? (
            <EmptyState message="No positions created yet." />
          ) : (
            positions.map((position) => {
              const department = departments.find(
                (item) => item.id === position.department_id
              );

              return (
                <div
                  key={position.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {position.title}
                    </p>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {department?.name || "Unassigned department"}
                    </p>

                    {position.description && (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {position.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onArchivePosition?.(position)}
                    className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] p-2 text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Archive position"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
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

function EmptyState({ message }) {
  return (
    <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
      {message}
    </div>
  );
}
