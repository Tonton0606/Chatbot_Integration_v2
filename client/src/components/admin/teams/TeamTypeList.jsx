export default function TeamTypeList({
  types = [],
  search = "",
  loading = false,
  editingTypeId = null,
  deletingId = null,
  onEdit,
  onDelete,
}) {
  const query = search.trim().toLowerCase();

  const filteredTypes = (types || []).filter((type) => {
    if (!query) return true;

    return (
      type.label?.toLowerCase().includes(query) ||
      type.type_key?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-title">Loading team types...</div>
      </div>
    );
  }

  if (filteredTypes.length === 0) {
    return (
      <div className="t-empty t-empty-compact">
        <div className="t-empty-icon">🏷️</div>
        <div className="t-empty-title">No team types found</div>
        <div className="t-empty-sub">
          Create a new team type to organize operations teams.
        </div>
      </div>
    );
  }

  return (
    <div className="teams-member-picker-list">
      {filteredTypes.map((type) => {
        const isEditing = editingTypeId === type.id;
        const isDeleting = deletingId === type.id;

        return (
          <div
            key={type.id}
            className={`teams-member-picker-row ${
              isEditing ? "selected" : ""
            }`}
          >
            <div
              className="teams-type-preview-color"
              style={{
                background: type.color || "var(--teams-blue)",
                minWidth: 32,
                width: 32,
                height: 32,
                borderRadius: 10,
              }}
            />

            <div className="teams-member-picker-info">
              <strong>{type.label}</strong>

              <small>
                {type.type_key} ·{" "}
                {type.is_system ? "System Type" : "Workspace Type"} ·{" "}
                {type.is_active ? "Active" : "Archived"}
              </small>
            </div>

            {type.is_system ? (
              <span className="teams-soft-pill">
                System
              </span>
            ) : (
              <div className="teams-table-actions">
                <button
                  type="button"
                  className={`t-btn t-btn-sm ${
                    isEditing ? "t-btn-primary" : "t-btn-ghost"
                  }`}
                  onClick={() => onEdit?.(type)}
                  disabled={isDeleting}
                >
                  {isEditing ? "Editing..." : "Edit"}
                </button>

                <button
                  type="button"
                  className="t-btn t-btn-danger t-btn-sm"
                  onClick={() => onDelete?.(type)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Archiving..." : "Archive"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
