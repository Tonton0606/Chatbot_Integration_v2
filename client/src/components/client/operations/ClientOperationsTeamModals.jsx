import { Loader2, Save, X } from "lucide-react";

const inputClass =
  "w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textareaClass = `${inputClass} min-h-[110px] resize-y`;

function ModalShell({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function employeeLabel(employee) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ");
}

export function CreateTeamModal({
  setupOptions,
  employees,
  saving,
  form,
  setForm,
  onClose,
  onSubmit,
}) {
  return (
    <ModalShell
      title="Create Team"
      description="Create a lightweight client operations team."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Team Name
          </label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Example: Sales Operations Team"
            required
          />
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Team Type
          </label>
          <select
            className={inputClass}
            value={form.type_id}
            onChange={(event) => {
              const type = setupOptions.teamTypes.find(
                (item) => item.id === event.target.value
              );

              setForm((prev) => ({
                ...prev,
                type_id: event.target.value,
                type_key: type?.type_key || "operations",
                color: type?.color || prev.color,
              }));
            }}
          >
            <option value="">Select team type</option>
            {setupOptions.teamTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Describe this team responsibility."
          />
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Initial Member
          </label>
          <select
            className={inputClass}
            value={form.initial_employee_id}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                initial_employee_id: event.target.value,
              }))
            }
          >
            <option value="">No initial member</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employeeLabel(employee) ||
                  employee.email ||
                  employee.employee_code}
              </option>
            ))}
          </select>
        </div>

        {form.initial_employee_id && (
          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Initial Member Role
            </label>
            <select
              className={inputClass}
              value={form.initial_role_id}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  initial_role_id: event.target.value,
                }))
              }
            >
              <option value="">No role</option>
              {setupOptions.teamRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] px-5 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-black text-[#050816] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create Team
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function CreateAssignmentModal({
  teams,
  employees,
  setupOptions,
  saving,
  form,
  setForm,
  onClose,
  onSubmit,
  assigneeTypes,
  priorities,
}) {
  return (
    <ModalShell
      title="Create Assignment"
      description="Assign responsibility to a team or employee."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Assignment Title
          </label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Example: Follow up this week's bookings"
            required
          />
        </div>

        <div>
          <label className="text-sm font-bold text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Add assignment context."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Assignee Type
            </label>
            <select
              className={inputClass}
              value={form.assignee_type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  assignee_type: event.target.value,
                  assignee_id: "",
                }))
              }
            >
              {assigneeTypes
                .filter((type) => type.value !== "profile")
                .map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Assignee
            </label>
            <select
              className={inputClass}
              value={form.assignee_id}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  assignee_id: event.target.value,
                }))
              }
              required
            >
              <option value="">Select assignee</option>
              {form.assignee_type === "team" &&
                teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              {form.assignee_type === "employee" &&
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeLabel(employee) ||
                      employee.email ||
                      employee.employee_code}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Role
            </label>
            <select
              className={inputClass}
              value={form.role_id}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role_id: event.target.value,
                }))
              }
            >
              <option value="">No role</option>
              {setupOptions.teamRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Priority
            </label>
            <select
              className={inputClass}
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Due Date
            </label>
            <input
              type="date"
              className={inputClass}
              value={form.due_date}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  due_date: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] px-5 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-black text-[#050816] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create Assignment
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
