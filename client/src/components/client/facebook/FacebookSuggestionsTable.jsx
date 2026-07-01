export default function FacebookSuggestionsTable({
  suggestions = [],
  loading = false,
  onApprove,
  onReject,
  onArchive,
}) {
  return (
    <div className="facebook-connect-panel">
      <div className="facebook-connect-panel-header">
        <div>
          <h2 className="facebook-connect-panel-title">
            AI Suggested FAQs
          </h2>

          <p className="facebook-connect-panel-description">
            Questions the AI could not answer. Approve them to become official FAQs.
          </p>
        </div>
      </div>

      {loading && (
        <div className="facebook-connect-empty">
          Loading suggestions...
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="facebook-connect-empty">
          No pending FAQ suggestions.
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="facebook-connect-table-wrap">
          <table className="facebook-connect-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Suggested Answer</th>
                <th>Frequency</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {suggestions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.question}</strong>
                  </td>

                  <td>
                    {item.suggestedAnswer || "No suggested answer yet"}
                  </td>

                  <td>{item.frequency || 0}</td>

                  <td>
                    {item.confidence
                      ? `${Math.round(Number(item.confidence) * 100)}%`
                      : "0%"}
                  </td>

                  <td>
                    <span className="facebook-connect-badge">
                      {item.status || "pending"}
                    </span>
                  </td>

                  <td>
                    <div className="facebook-connect-inline-actions">
                      <button
                        type="button"
                        className="facebook-connect-action-link"
                        onClick={() => onApprove?.(item)}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        className="facebook-connect-action-link"
                        onClick={() => onReject?.(item)}
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        className="facebook-connect-action-link facebook-connect-action-danger"
                        onClick={() => onArchive?.(item)}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
