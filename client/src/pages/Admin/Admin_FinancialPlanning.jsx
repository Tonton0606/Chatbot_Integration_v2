import { useEffect, useState } from "react";
import {
  FinancialPlanningSection,
  FinanceTreasuryHeader,
  FinanceTreasuryLoadingState,
  FinanceTreasuryErrorState,
} from "../../components/admin/layout/Admin_FinanceTreasury_Components";
import { getFinancialPlanningData } from "../../services/finance_treasury";

export default function AdminFinancialPlanning() {
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
      const result = await getFinancialPlanningData();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load financial planning data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <FinanceTreasuryHeader
        title="Financial Planning"
        subtitle="Budget governance, forecasting, and variance management"
        showDateRange={false}
        showExport={false}
        showCreate={false}
      />

      {loading && <FinanceTreasuryLoadingState />}
      {!loading && error && <FinanceTreasuryErrorState message={error} onRetry={loadData} />}
      {!loading && !error && data && (
        <FinancialPlanningSection
          data={data}
          onApprove={(item) => console.log("Approve", item)}
          onReject={(item) => console.log("Reject", item)}
          onLock={() => console.log("Lock")}
        />
      )}
    </div>
  );
}
