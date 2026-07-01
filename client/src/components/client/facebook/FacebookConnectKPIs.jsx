export default function FacebookConnectKPIs({
  summary = {},
}) {
  const cards = [
    {
      label: "Conversations",
      value: summary.totalConversations || 0,
      hint: "Messenger conversations",
    },
    {
      label: "Qualified Leads",
      value: summary.qualifiedLeads || 0,
      hint: "Successfully qualified",
    },
    {
      label: "FAQ Hits",
      value: summary.faqHits || 0,
      hint: "Answered from FAQs",
    },
    {
      label: "Knowledge Hits",
      value: summary.knowledgeHits || 0,
      hint: "Answered from page knowledge",
    },
    {
      label: "Unanswered",
      value: summary.unansweredQuestions || 0,
      hint: "Needs review",
    },
    {
      label: "Human Handoff",
      value: summary.humanHandoffs || 0,
      hint: "Transferred to owner",
    },
    {
      label: "Booking CTA",
      value: summary.bookingCtaSent || 0,
      hint: "Meeting/demo invitations",
    },
    {
      label: "FAQs",
      value: summary.totalFaqs || 0,
      hint: "Knowledge entries",
    },
  ];

  return (
    <div className="facebook-connect-kpi-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className="facebook-connect-kpi"
        >
          <p className="facebook-connect-kpi-label">
            {card.label}
          </p>

          <p className="facebook-connect-kpi-value">
            {card.value}
          </p>

          <p className="facebook-connect-kpi-hint">
            {card.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
