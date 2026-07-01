import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit3, Loader2, Plus, Save, Trash2, X } from "lucide-react";

import {
  archiveClientOperationTeamType,
  createClientOperationTeamType,
  getClientOperationTeamTypes,
  updateClientOperationTeamType,
} from "../../../services/client/operations/teamTypes";

import {
  archiveClientOperationTeamRole,
  createClientOperationTeamRole,
  getClientOperationTeamRoles,
  updateClientOperationTeamRole,
} from "../../../services/client/operations/teamRoles";

const inputClass =
  "w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textareaClass = `${inputClass} min-h-[90px] resize-y`;

function ModalShell({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
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

function ConfigError({ message }) {
  if (!message) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function EmptyConfig({ label }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-color)] p-8 text-center">
      <p className="font-bold text-[var(--text-primary)]">No {label} yet</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Add one to personalize this workspace.
      </p>
    </div>
  );
}

export function ClientOperationsTeamTypesModal({ onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teamTypes, setTeamTypes] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    label: "",
    type_key: "",
    color: "#c9a84c",
  });

  async function loadTeamTypes() {
    try {
      setLoading(true);
      setError("");

      const data = await getClientOperationTeamTypes({ activeOnly: false });
      setTeamTypes(data || []);
    } catch (err) {
      console.error("Load team types error:", err);
      setError(err.message || "Failed to load team types.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeamTypes();
  }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      label: "",
      type_key: "",
      color: "#c9a84c",
    });
  }

  function handleEdit(type) {
    setEditingId(type.id);
    setForm({
      label: type.label || "",
      type_key: type.type_key || "",
      color: type.color || "#c9a84c",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.label.trim()) {
        throw new Error("Team type label is required.");
      }

      if (editingId) {
        await updateClientOperationTeamType(editingId, form);
      } else {
        await createClientOperationTeamType(form);
      }

      resetForm();
      await loadTeamTypes();
      await onChanged?.();
    } catch (err) {
      console.error("Save team type error:", err);
      setError(err.message || "Failed to save team type.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(type) {
    try {
      setSaving(true);
      setError("");

      await archiveClientOperationTeamType(type.id);
      await loadTeamTypes();
      await onChanged?.();
    } catch (err) {
      console.error("Archive team type error:", err);
      setError(err.message || "Failed to archive team type.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Manage Team Types"
      description="Create workspace-specific team categories clients can reuse when creating teams."
      onClose={onClose}
    >
      <ConfigError message={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5"
        >
          <h3 className="font-black text-[var(--text-primary)]">
            {editingId ? "Edit Team Type" : "Add Team Type"}
          </h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Label
              </label>
              <input
                className={inputClass}
                value={form.label}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Example: Support Team"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Key
              </label>
              <input
                className={inputClass}
                value={form.type_key}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type_key: event.target.value }))
                }
                placeholder="Auto-generated if empty"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Used internally. Example: customer_success.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Color
              </label>
              <input
                type="color"
                className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1"
                value={form.color}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, color: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-black text-[#050816] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Save Type" : "Add Type"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-[var(--border-color)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : teamTypes.length === 0 ? (
            <EmptyConfig label="team types" />
          ) : (
            teamTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: type.color || "#c9a84c" }}
                    />
                    <p className="truncate font-black text-[var(--text-primary)]">
                      {type.label}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {type.type_key}
                  </p>
                </div>

                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(type)}
                    className="rounded-2xl border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(type)}
                    disabled={saving}
                    className="rounded-2xl border border-red-500/30 p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}

export function ClientOperationsTeamRolesModal({ onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    label: "",
    role_key: "",
    description: "",
    level: 100,
    sort_order: 100,
    reports_to_role_id: "",
    is_leadership: false,
    can_manage_team: false,
    can_manage_assignments: false,
  });

  const parentRoleOptions = useMemo(() => {
    return roles.filter((role) => role.id !== editingId);
  }, [editingId, roles]);

  async function loadRoles() {
    try {
      setLoading(true);
      setError("");

      const data = await getClientOperationTeamRoles({ activeOnly: false });
      setRoles(data || []);
    } catch (err) {
      console.error("Load team roles error:", err);
      setError(err.message || "Failed to load member roles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  function resetForm() {
    setEditingId("");
    setForm({
      label: "",
      role_key: "",
      description: "",
      level: 100,
      sort_order: 100,
      reports_to_role_id: "",
      is_leadership: false,
      can_manage_team: false,
      can_manage_assignments: false,
    });
  }

  function handleEdit(role) {
    setEditingId(role.id);
    setForm({
      label: role.label || "",
      role_key: role.role_key || "",
      description: role.description || "",
      level: role.level ?? 100,
      sort_order: role.sort_order ?? 100,
      reports_to_role_id: role.reports_to_role_id || "",
      is_leadership: !!role.is_leadership,
      can_manage_team: !!role.can_manage_team,
      can_manage_assignments: !!role.can_manage_assignments,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.label.trim()) {
        throw new Error("Member role label is required.");
      }

      const payload = {
        ...form,
        level: Number(form.level || 100),
        sort_order: Number(form.sort_order || form.level || 100),
        reports_to_role_id: form.reports_to_role_id || null,
        permissions: {
          manage_team: !!form.can_manage_team,
          manage_assignments: !!form.can_manage_assignments,
          view_workload: !!form.is_leadership,
        },
      };

      if (editingId) {
        await updateClientOperationTeamRole(editingId, payload);
      } else {
        await createClientOperationTeamRole(payload);
      }

      resetForm();
      await loadRoles();
      await onChanged?.();
    } catch (err) {
      console.error("Save team role error:", err);
      setError(err.message || "Failed to save member role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(role) {
    try {
      setSaving(true);
      setError("");

      await archiveClientOperationTeamRole(role.id);
      await loadRoles();
      await onChanged?.();
    } catch (err) {
      console.error("Archive team role error:", err);
      setError(err.message || "Failed to archive member role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Manage Member Roles"
      description="Create workspace-specific team hierarchy roles clients can reuse when assigning members."
      onClose={onClose}
    >
      <ConfigError message={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5"
        >
          <h3 className="font-black text-[var(--text-primary)]">
            {editingId ? "Edit Member Role" : "Add Member Role"}
          </h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Label
              </label>
              <input
                className={inputClass}
                value={form.label}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Example: Area Supervisor"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Key
              </label>
              <input
                className={inputClass}
                value={form.role_key}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role_key: event.target.value }))
                }
                placeholder="Auto-generated if empty"
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
                placeholder="Describe this role."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-[var(--text-primary)]">
                  Level
                </label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.level}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, level: event.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Lower number means higher hierarchy.
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-[var(--text-primary)]">
                  Sort Order
                </label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--text-primary)]">
                Reports To Role
              </label>
              <select
                className={inputClass}
                value={form.reports_to_role_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reports_to_role_id: event.target.value,
                  }))
                }
              >
                <option value="">No parent role</option>
                {parentRoleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-sm font-bold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.is_leadership}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_leadership: event.target.checked,
                  }))
                }
              />
              Leadership role
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-sm font-bold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.can_manage_team}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    can_manage_team: event.target.checked,
                  }))
                }
              />
              Can manage team
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-sm font-bold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.can_manage_assignments}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    can_manage_assignments: event.target.checked,
                  }))
                }
              />
              Can manage assignments
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-gold)] px-5 py-2 text-sm font-black text-[#050816] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Save Role" : "Add Role"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-[var(--border-color)]">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : roles.length === 0 ? (
            <EmptyConfig label="member roles" />
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--text-primary)]">
                    {role.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {role.role_key} · Level {role.level}
                  </p>
                  {role.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {role.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(role)}
                    className="rounded-2xl border border-[var(--border-color)] p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(role)}
                    disabled={saving}
                    className="rounded-2xl border border-red-500/30 p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}
