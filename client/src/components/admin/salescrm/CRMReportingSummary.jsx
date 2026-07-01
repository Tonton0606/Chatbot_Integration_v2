import { formatCurrency } from "./crmUtils.js";

export default function CRMReportingSummary({ opportunities }) {
  const open = opportunities.filter((opp) => opp.status === "open");
  const won = opportunities.filter((opp) => opp.status === "won");
  const lost = opportunities.filter((opp) => opp.status === "lost");

  const totalRevenue = opportunities.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const openRevenue = open.reduce(
    (sum, opp) => sum + Number(opp.revenue || 0),
    0
  );

  const weightedRevenue = open.reduce(
    (sum, opp) =>
      sum + Number(opp.revenue || 0) * (Number(opp.probability || 0) / 100),
    0
  );

  const rows = [
    ["Total Revenue Tracked", formatCurrency(totalRevenue)],
    ["Open Pipeline Revenue", formatCurrency(openRevenue)],
    ["Weighted Forecast", formatCurrency(weightedRevenue)],
    ["Won Opportunities", won.length],
    ["Lost Opportunities", lost.length],
    ["Open Opportunities", open.length],
  ];

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Reporting Summary</h3>
        <p className="crm-card-subtitle">
          High-level sales reporting snapshot.
        </p>
      </div>
      <div className="crm-report-list">
        {rows.map(([label, value]) => (
          <div key={label} className="crm-report-row">
            <span className="crm-report-label">{label}</span>
            <span className="crm-report-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
