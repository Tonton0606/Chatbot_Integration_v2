import { useEffect, useMemo, useState } from "react";

import {
  TEAM_STATUSES,
} from "@/constants/operations/teamConstants";

import {
  createTeam,
  updateTeam,
} from "@/services/operations/teams";

import {
  getTeamTypes,
} from "@/services/operations/teamTypes";

function getMemberEmployeeId(member) {
  return member?.employee_id || member?.member_id || "";
}

function getTeamMemberEmployeeIds(team) {
  return (team?.members || [])
    .map((member) => member.employee_id || member.member_id)
    .filter(Boolean);
}

export default function TeamFormModal({
  team,
  members = [],
  onSave,
  onClose,
}) {
  const isEdit = Boolean(team);

  const availableMembers = useMemo(() => {
    return (members || []).filter((member) => Boolean(getMemberEmployeeId(member)));
  }, [members]);

  const [teamTypes, setTeamTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");

  const initialLeadEmployeeId =
    team?.lead_employee_id ||
    team?.lead_member?.employee_id ||
    team?.members?.find((member) => member.id === team?.lead_member_id)?.employee_id ||
    availableMembers[0]?.employee_id ||
    "";

  const [form, setForm] = useState({
    name: team?.name || "",
    description: team?.description || "",
    type: team?.type || "custom",
    lead_employee_id: initialLeadEmployeeId,
    status: team?.status || "active",
    member_ids: getTeamMemberEmployeeIds(team),
    color: team?.color || null,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadTeamTypes() {
    try {
      setTypesLoading(true);
      setTypesError("");

      const data = await getTeamTypes();

      setTeamTypes(Array.isArray(data) ? data : []);

      if (!form.type && data?.[0]?.type_key) {
        setForm((current) => ({
          ...current,
          type: data[0].type_key,
        }));
      }
    } catch (err) {
      console.error("Team types load error:", err);

      setTypesError(err.message || "Failed to load team types.");
      setTeamTypes([]);
    } finally {
      setTypesLoading(false);
    }
  }

  useEffect(() => {
    loadTeamTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedType = useMemo(() => {
    return teamTypes.find((type) => type.type_key === form.type) || null;
  }, [teamTypes, form.type]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleMember = (employeeId) => {
    if (!employeeId) return;

    setForm((current) => ({
      ...current,
      member_ids: current.member_ids.includes(employeeId)
        ? current.member_ids.filter((id) => id !== employeeId)
        : [...current.member_ids, employeeId],
    }));
  };

  const selectAllMembers = () => {
    updateField(
      "member_ids",
      availableMembers.map((member) => getMemberEmployeeId(member)).filter(Boolean)
    );
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name || saving) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        name,
        description: form.description.trim(),
        type: form.type || "custom",
        status: form.status || "active",
        color: form.color || selectedType?.color || null,
        lead_employee_id: form.lead_employee_id || null,
        member_ids: form.member_ids,
      };

      if (isEdit) {
        await updateTeam(team.id, payload);
      } else {
        await createTeam(payload);
      }

      await onSave?.(payload);
    } catch (err) {
      console.error("Team save error:", err);
      setError(err.message || "Failed to save team.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal" onClick={(event) => event.stopPropagation()}>
        <div className="teams-modal-header">
          <div>
            <div className="teams-modal-title">
              {isEdit ? "Edit Team" : "Create New Team"}
            </div>

            <div className="teams-modal-subtitle">
              {isEdit
                ? "Update DB-backed team configuration"
                : "Define a DB-backed team, lead, and members"}
            </div>
          </div>

          <button
            type="button"
            className="teams-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="teams-modal-body">
          {error && (
            <div className="t-empty t-empty-compact">
              <div className="t-empty-icon">⚠️</div>
              <div className="t-empty-title">Unable to save team</div>
              <div className="t-empty-sub">{error}</div>
            </div>
          )}

          {typesError && (
            <div className="t-empty t-empty-compact">
              <div className="t-empty-icon">⚠️</div>
              <div className="t-empty-title">Failed to load team types</div>
              <div className="t-empty-sub">{typesError}</div>
            </div>
          )}

          <div className="t-form-group">
            <label className="t-label">Team Name *</label>

            <input
              className="t-input"
              placeholder="e.g. Alpha Sales Squad"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="t-form-group">
            <label className="t-label">Description</label>

            <textarea
              className="t-textarea"
              placeholder="Brief description of this team's purpose and scope..."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
            />
          </div>

          <div className="t-form-row">
            <div>
              <label className="t-label">Team Type</label>

              <select
                className="t-form-select"
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                disabled={typesLoading}
              >
                {typesLoading && (
                  <option value="custom">
                    Loading team types...
                  </option>
                )}

                {!typesLoading &&
                  teamTypes.map((type) => (
                    <option
                      key={type.id}
                      value={type.type_key}
                    >
                      {type.label}
                    </option>
                  ))}

                {!typesLoading && teamTypes.length === 0 && (
                  <option value="custom">
                    Custom
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="t-label">Status</label>

              <select
                className="t-form-select"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                {TEAM_STATUSES.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="t-form-group">
            <label className="t-label">Team Lead</label>

            <select
              className="t-form-select"
              value={form.lead_employee_id}
              onChange={(event) =>
                updateField("lead_employee_id", event.target.value)
              }
            >
              <option value="">
                Unassigned
              </option>

              {availableMembers.map((member) => {
                const employeeId = getMemberEmployeeId(member);

                return (
                  <option
                    key={member.id}
                    value={employeeId}
                  >
                    {member.name} — {member.department || "Unassigned"}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="t-form-group">
            <label className="t-label">Type Preview</label>

            <div className="teams-type-preview">
              <div
                className="teams-type-preview-color"
                style={{
                  background:
                    form.color ||
                    selectedType?.color ||
                    "var(--teams-blue)",
                }}
              />

              <span>
                Auto-classified as{" "}
                <strong>
                  {selectedType?.label || form.type || "Custom"}
                </strong>
              </span>
            </div>
          </div>

          <div className="teams-member-picker">
            <div className="teams-member-picker-head">
              <label className="t-label">
                Members ({form.member_ids.length} selected)
              </label>

              <button
                type="button"
                className="teams-link-button"
                onClick={selectAllMembers}
                disabled={availableMembers.length === 0}
              >
                Select All
              </button>
            </div>

            <div className="teams-member-picker-list">
              {availableMembers.length === 0 && (
                <div className="t-empty t-empty-compact">
                  <div className="t-empty-title">
                    No available employees
                  </div>

                  <div className="t-empty-sub">
                    Add employees first in HR, then return to Teams.
                  </div>
                </div>
              )}

              {availableMembers.map((member) => {
                const employeeId = getMemberEmployeeId(member);
                const selected = form.member_ids.includes(employeeId);

                return (
                  <label
                    key={member.id}
                    className={`teams-member-picker-row ${
                      selected ? "selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMember(employeeId)}
                    />

                    <div className="t-avatar t-avatar-sm">
                      {member.initials}
                    </div>

                    <div className="teams-member-picker-info">
                      <strong>{member.name}</strong>

                      <small>
                        {member.department || "Unassigned"} ·{" "}
                        {member.email || "No email"}
                      </small>
                    </div>

                    <span
                      className={`teams-member-load ${
                        member.workload >= 85 ? "high" : ""
                      }`}
                    >
                      {member.workload || 0}%
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="teams-modal-footer">
          <button
            type="button"
            className="t-btn t-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="t-btn t-btn-primary"
            disabled={!form.name.trim() || saving}
            onClick={handleSave}
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "✓ Save Changes"
                : "✓ Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
