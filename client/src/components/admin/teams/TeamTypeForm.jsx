const DEFAULT_FORM = {
  label: "",
  type_key: "",
  color: "#4a90d9",
};

function normalizeTypeKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export { DEFAULT_FORM, normalizeTypeKey };

export default function TeamTypeForm({
  form = DEFAULT_FORM,
  editingTypeId = null,
  saving = false,
  onChange,
  onSave,
  onCancelEdit,
}) {
  const updateField = (key, value) => {
    const next = {
      ...form,
      [key]: value,
    };

    if (key === "label" && !editingTypeId) {
      next.type_key = normalizeTypeKey(value);
    }

    if (key === "type_key") {
      next.type_key = normalizeTypeKey(value);
    }

    onChange?.(next);
  };

  const canSave =
    Boolean(form.label?.trim()) &&
    Boolean(form.type_key?.trim()) &&
    !saving;

  return (
    <div className="teams-member-picker">
      <div className="teams-member-picker-head">
        <label className="t-label">
          {editingTypeId ? "Edit Team Type" : "Create Team Type"}
        </label>

        {editingTypeId && (
          <button
            type="button"
            className="teams-link-button"
            onClick={onCancelEdit}
            disabled={saving}
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="t-form-row">
        <div>
          <label className="t-label">Label *</label>
          <input
            className="t-input"
            placeholder="e.g. Warehouse"
            value={form.label}
            onChange={(event) => updateField("label", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="t-label">Key *</label>
          <input
            className="t-input"
            placeholder="e.g. warehouse"
            value={form.type_key}
            onChange={(event) => updateField("type_key", event.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="t-form-row">
        <div>
          <label className="t-label">Color</label>
          <input
            className="t-input"
            type="color"
            value={form.color || DEFAULT_FORM.color}
            onChange={(event) => updateField("color", event.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="t-label">Action</label>
          <button
            type="button"
            className={`t-btn ${canSave ? "t-btn-primary" : "t-btn-ghost"}`}
            onClick={onSave}
            disabled={!canSave}
          >
            {saving
              ? "Saving..."
              : editingTypeId
                ? "✓ Save Type"
                : "+ Add Type"}
          </button>
        </div>
      </div>
    </div>
  );
}
