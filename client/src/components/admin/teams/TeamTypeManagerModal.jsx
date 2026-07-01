import { useCallback, useEffect, useMemo, useState } from "react";

import TeamTypeForm, { DEFAULT_FORM } from "./TeamTypeForm";
import TeamTypeList from "./TeamTypeList";

import {
  archiveTeamType,
  createTeamType,
  getTeamTypes,
  updateTeamType,
} from "@/services/operations/teamTypes";

export default function TeamTypeManagerModal({
  onClose,
  onChanged,
}) {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingTypeId, setEditingTypeId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTeamTypes({ activeOnly: false });
      setTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load team types error:", err);
      setError(err.message || "Failed to load team types.");
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;

      return String(a.label || "").localeCompare(String(b.label || ""));
    });
  }, [types]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingTypeId(null);
  };

  const handleSave = async () => {
    if (saving) return;

    const label = form.label.trim();
    const typeKey = form.type_key.trim();

    if (!label || !typeKey) {
      setError("Team type label and key are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        label,
        type_key: typeKey,
        color: form.color || "#4a90d9",
      };

      if (editingTypeId) {
        await updateTeamType(editingTypeId, payload);
      } else {
        await createTeamType(payload);
      }

      await loadTypes();
      resetForm();
      await onChanged?.();
    } catch (err) {
      console.error("Save team type error:", err);
      setError(err.message || "Failed to save team type.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (type) => {
    if (!type?.id || type.is_system || !type.is_active) return;

    setError("");
    setEditingTypeId(type.id);
    setForm({
      label: type.label || "",
      type_key: type.type_key || "",
      color: type.color || "#4a90d9",
    });
  };

  const handleDelete = async (type) => {
    if (!type?.id || type.is_system || !type.is_active) return;

    const confirmed = window.confirm(
      `Archive "${type.label}" team type?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(type.id);
      setError("");

      await archiveTeamType(type.id);
      await loadTypes();

      if (editingTypeId === type.id) {
        resetForm();
      }

      await onChanged?.();
    } catch (err) {
      console.error("Archive type error:", err);
      setError(err.message || "Failed to archive team type.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="teams-modal-overlay" onClick={onClose}>
      <div className="teams-modal" onClick={(event) => event.stopPropagation()}>
        <div className="teams-modal-header">
          <div>
            <div className="teams-modal-title">Manage Team Types</div>

            <div className="teams-modal-subtitle">
              Create, edit, and archive workspace-specific team categories.
            </div>
          </div>

          <button type="button" className="teams-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="teams-modal-body">
          {error && (
            <div className="t-empty t-empty-compact">
              <div className="t-empty-icon">⚠️</div>
              <div className="t-empty-title">Team type action failed</div>
              <div className="t-empty-sub">{error}</div>
            </div>
          )}

          <TeamTypeForm
            form={form}
            editingTypeId={editingTypeId}
            saving={saving}
            onChange={setForm}
            onSave={handleSave}
            onCancelEdit={resetForm}
          />

          <div className="t-form-group">
            <label className="t-label">Search Team Types</label>

            <input
              className="t-input"
              placeholder="Search label or key..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <TeamTypeList
            types={sortedTypes}
            search={search}
            loading={loading}
            editingTypeId={editingTypeId}
            deletingId={deletingId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        <div className="teams-modal-footer">
          <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
