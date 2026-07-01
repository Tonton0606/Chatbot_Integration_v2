import { AlertCircle } from "lucide-react";

export default function SalesCRMErrorState({ message, onRetry }) {
  return (
    <div className="crm-error">
      <AlertCircle className="h-5 w-5 shrink-0 text-[var(--danger)]" />
      <div className="crm-error-body">
        <h3 className="crm-error-title">Failed to load CRM</h3>
        <p className="crm-error-text">{message}</p>
        <button type="button" onClick={onRetry} className="crm-error-retry">
          Retry
        </button>
      </div>
    </div>
  );
}
