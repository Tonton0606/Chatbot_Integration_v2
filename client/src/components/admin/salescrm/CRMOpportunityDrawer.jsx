import { X } from "lucide-react";
import { formatCurrency, formatDate, labelize } from "./crmUtils.js";

export default function CRMOpportunityDrawer({ opportunity, onClose }) {
  return (
    <div className="crm-drawer-overlay" onClick={onClose}>
      <div className="crm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="crm-drawer-header">
          <div>
            <h3 className="crm-drawer-title">{opportunity.name}</h3>
            <p className="crm-drawer-subtitle">{opportunity.company}</p>
          </div>
          <button type="button" onClick={onClose} className="crm-drawer-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="crm-drawer-body">
          <Info label="Contact" value={opportunity.contact} />
          <Info label="Email" value={opportunity.email || "No email"} />
          <Info label="Phone" value={opportunity.phone || "No phone"} />
          <Info label="Stage" value={opportunity.stageName} />
          <Info label="Revenue" value={formatCurrency(opportunity.revenue)} />
          <Info label="Probability" value={`${opportunity.probability}%`} />
          <Info label="Source" value={labelize(opportunity.source)} />
          <Info label="Status" value={labelize(opportunity.status)} />
          <Info
            label="Expected Close Date"
            value={formatDate(opportunity.expectedCloseDate)}
          />
          <Info
            label="Description"
            value={opportunity.description || "No description"}
          />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="crm-drawer-field">
      <p className="crm-drawer-field-label">{label}</p>
      <p className="crm-drawer-field-value">{value || "—"}</p>
    </div>
  );
}
