export default function TeamsHeaderActions({
  onNewAssignment,
  onCreateTeam,
  onManageTypes,
}) {
  return (
    <div className="teams-header-actions">
      <button
        type="button"
        onClick={onNewAssignment}
        className="t-btn t-btn-secondary"
      >
        📋 New Assignment
      </button>

      <button
        type="button"
        onClick={onManageTypes}
        className="t-btn t-btn-cyan"
      >
        🏷 Manage Team Types
      </button>

      <button
        type="button"
        onClick={onCreateTeam}
        className="t-btn t-btn-primary"
      >
        + Create Team
      </button>
    </div>
  );
}
