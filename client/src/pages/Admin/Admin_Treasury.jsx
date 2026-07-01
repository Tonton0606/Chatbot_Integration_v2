import { useEffect, useState } from "react";
import {
  TreasurySection,
  FinanceTreasuryHeader,
  FinanceTreasuryLoadingState,
  FinanceTreasuryErrorState,
} from "../../components/admin/layout/Admin_FinanceTreasury_Components";
import { getTreasuryData } from "../../services/finance_treasury";

export default function AdminTreasury() {
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
      const result = await getTreasuryData();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load treasury data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <FinanceTreasuryHeader
        title="Treasury"
        subtitle="Cash management, liquidity forecasting, and treasury operations"
        showDateRange={false}
        showExport={false}
        showCreate={false}
      />

      {loading && <FinanceTreasuryLoadingState />}
      {!loading && error && <FinanceTreasuryErrorState message={error} onRetry={loadData} />}
      {!loading && !error && data && (
        <TreasurySection
          data={data}
          onForecastDetail={() => console.log("Forecast detail")}
          onSuggestHedge={() => console.log("Suggest hedge")}
        />
      )}
    </div>
  );
}
