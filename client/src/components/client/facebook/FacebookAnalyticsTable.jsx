function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function FacebookAnalyticsTable({
  analytics = [],
  loading = false,
}) {
  return (
    <div className="facebook-connect-panel">
      <div className="facebook-connect-panel-header">
        <div>
          <h2 className="facebook-connect-panel-title">
            Facebook AI Analytics
          </h2>

          <p className="facebook-connect-panel-description">
            Daily performance of FAQ usage, knowledge responses, handoffs and lead qualification.
          </p>
        </div>
      </div>

      {loading && (
        <div className="facebook-connect-empty">
          Loading analytics...
        </div>
      )}

      {!loading && analytics.length === 0 && (
        <div className="facebook-connect-empty">
          No analytics available yet.
        </div>
      )}

      {!loading && analytics.length > 0 && (
        <div className="facebook-connect-table-wrap">
          <table className="facebook-connect-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Conversations</th>
                <th>Qualified Leads</th>
                <th>Auto-Reply Matches</th>
                <th>AI Responses</th>
                <th>Unanswered</th>
                <th>Handoffs</th>
                <th>Booking CTA</th>
              </tr>
            </thead>

            <tbody>
              {analytics.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.snapshotDate)}</td>

                  <td>{row.totalConversations || 0}</td>

                  <td>{row.qualifiedLeads || 0}</td>

                  <td>{row.faqHits || 0}</td>

                  <td>{row.knowledgeHits || 0}</td>

                  <td>{row.unansweredQuestions || 0}</td>

                  <td>{row.humanHandoffs || 0}</td>

                  <td>{row.bookingCtaSent || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
