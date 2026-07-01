import { useEffect, useState } from "react";
import {
  FraudDetectionSection,
  FinanceTreasuryHeader,
  FinanceTreasuryLoadingState,
  FinanceTreasuryErrorState,
} from "../../components/admin/layout/Admin_FinanceTreasury_Components";
import { getFraudDetectionData } from "../../services/finance_treasury";

export default function AdminFraudDetection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const result = await getFraudDetectionData();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load fraud detection data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <FinanceTreasuryHeader
        title="Fraud Detection"
        subtitle="Risk intelligence workspace for real-time fraud monitoring"
        showDateRange={false}
        showExport={false}
        showCreate={false}
      />

      {loading && <FinanceTreasuryLoadingState />}
      {!loading && error && <FinanceTreasuryErrorState message={error} onRetry={loadData} />}
      {!loading && !error && data && (
        <FraudDetectionSection
          data={data}
          onSelectCase={(c) => console.log("View case", c)}
          onFreeze={(c) => console.log("Freeze", c)}
          onEscalate={(c) => console.log("Escalate", c)}
          onMarkSafe={(c) => console.log("Mark safe", c)}
        />
      )}
    </div>
  );
}
