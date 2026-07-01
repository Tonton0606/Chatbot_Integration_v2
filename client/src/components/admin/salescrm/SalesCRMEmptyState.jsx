import { Users } from "lucide-react";

export default function SalesCRMEmptyState() {
  return (
    <div className="crm-empty">
      <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
      <h3 className="crm-empty-title">No CRM opportunities yet</h3>
      <p className="crm-empty-text">
        Create and manage opportunities from the Deals module.
      </p>
    </div>
  );
}
