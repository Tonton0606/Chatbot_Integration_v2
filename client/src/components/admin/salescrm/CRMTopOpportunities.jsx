import { Eye } from "lucide-react";
import { formatCurrency } from "./crmUtils.js";

export default function CRMTopOpportunities({ opportunities, onOpportunityClick }) {
  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Top Opportunities</h3>
        <p className="crm-card-subtitle">
          Highest-value open opportunities.
        </p>
      </div>
      <div className="crm-opportunity-list">
        {opportunities.length === 0 ? (
          <p className="crm-empty-mini">No open opportunities.</p>
        ) : (
          opportunities.map((opp) => (
            <button
              key={opp.id}
              type="button"
              onClick={() => onOpportunityClick(opp)}
              className="crm-opportunity-card"
            >
              <div className="crm-opportunity-card-top">
                <div className="crm-opportunity-card-info">
                  <p className="crm-opportunity-card-name">{opp.name}</p>
                  <p className="crm-opportunity-card-company">{opp.company}</p>
                </div>
                <Eye className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-60" />
              </div>
              <div className="crm-opportunity-card-bottom">
                <span className="crm-opportunity-card-revenue">
                  {formatCurrency(opp.revenue)}
                </span>
                <span className="crm-opportunity-card-probability">
                  {opp.probability}%
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
