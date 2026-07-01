import { useEffect, useMemo, useState } from "react";

import {
  RevenueHeader,
  RevenueKPICards,
  RevenueChartsGrid,
  RevenueInsightsPanel,
  RevenueFilterToolbar,
  RevenueTable,
  RevenueDetailDrawer,
  RevenueLoadingState,
  RevenueErrorState,
  RevenueEmptyState,
} from "../../components/admin/layout/Admin_Revenue_Components";

import {
  getRevenueData,
  filterRevenueRecords,
  getRevenueKPIs,
} from "../../services/sales_crm/revenue";

export default function AdminRevenue() {
  const [records, setRecords] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [revenueBySource, setRevenueBySource] = useState([]);
  const [revenueByOwner, setRevenueByOwner] = useState([]);
  const [insights, setInsights] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    owner: "all",
  });

  useEffect(() => {
    loadRevenue();
  }, []);

  async function loadRevenue() {
    try {
      setLoading(true);
      setError("");

      const data = await getRevenueData();

      setRecords(data.records || []);
      setMonthlyRevenue(data.monthlyRevenue || []);
      setRevenueBySource(data.revenueBySource || []);
      setRevenueByOwner(data.revenueByOwner || []);
      setInsights(data.insights || []);
    } catch (err) {
      console.error("Revenue load error:", err);
      setError(err.message || "Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      owner: "all",
    });
  }

  const filteredRecords = useMemo(() => {
    return filterRevenueRecords(records, filters);
  }, [records, filters]);

  const kpis = useMemo(() => {
    return getRevenueKPIs(records);
  }, [records]);

  return (
    <div className="space-y-6">
      <RevenueHeader />

      {loading && <RevenueLoadingState />}

      {!loading && error && (
        <RevenueErrorState
          message={error}
          onRetry={loadRevenue}
        />
      )}

      {!loading && !error && (
        <>
          <RevenueKPICards kpis={kpis} />

          <RevenueChartsGrid
            monthlyRevenue={monthlyRevenue}
            revenueByOwner={revenueByOwner}
            revenueBySource={revenueBySource}
          />

          <RevenueInsightsPanel insights={insights} />

          <RevenueFilterToolbar
            filters={filters}
            onChange={updateFilter}
            onClear={clearFilters}
          />

          {filteredRecords.length === 0 ? (
            <RevenueEmptyState />
          ) : (
            <RevenueTable
              records={filteredRecords}
              onSelect={setSelectedRecord}
            />
          )}
        </>
      )}

      {selectedRecord && (
        <RevenueDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
