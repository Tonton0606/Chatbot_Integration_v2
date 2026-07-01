import { labelize, formatShortCurrency, stageColor } from "./crmUtils.js";

export default function CRMPipelineSnapshot({
  stages,
  opportunities,
  onOpportunityClick,
}) {
  const openOpportunities = opportunities.filter((opp) => opp.status === "open");

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Pipeline Snapshot</h3>
        <p className="crm-card-subtitle">
          Summary by stage. Full pipeline management belongs in Deals.
        </p>
      </div>
      <div className="crm-pipeline-list">
        {stages.map((stage) => {
          const stageItems = openOpportunities.filter(
            (opp) => opp.stage === stage.key
          );
          const total = stageItems.reduce(
            (sum, opp) => sum + Number(opp.revenue || 0),
            0
          );

          return (
            <div key={stage.id || stage.key} className="crm-pipeline-stage">
              <div className="crm-pipeline-stage-header">
                <div className="crm-pipeline-stage-meta">
                  <span
                    className="crm-pipeline-dot"
                    style={{ background: stageColor(stage.key) }}
                  />
                  <span className="crm-pipeline-stage-name">
                    {stage.name || labelize(stage.key)}
                  </span>
                  <span className="crm-pipeline-stage-count">
                    {stageItems.length}
                  </span>
                </div>
                <span className="crm-pipeline-stage-total">
                  {formatShortCurrency(total)}
                </span>
              </div>
              {stageItems.length > 0 && (
                <div className="crm-pipeline-items">
                  {stageItems.slice(0, 2).map((opp) => (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => onOpportunityClick(opp)}
                      className="crm-pipeline-item"
                    >
                      <span className="crm-pipeline-item-name">{opp.name}</span>
                      <span className="crm-pipeline-item-value">
                        {formatShortCurrency(opp.revenue)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
