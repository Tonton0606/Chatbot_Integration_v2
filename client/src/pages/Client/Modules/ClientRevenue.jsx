import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../config/supabaseClient";

import {
  ClientRevenueHeader,
  ClientRevenueKPICards,
  ClientRevenueChartsGrid,
  ClientRevenueInsightsPanel,
  ClientRevenueFilterToolbar,
  ClientRevenueTable,
  ClientRevenueDetailDrawer,
  ClientRevenueLoadingState,
  ClientRevenueErrorState,
  ClientRevenueEmptyState,
} from "../../../components/client/layout/Client_Revenue_Components.jsx";

import {
  getClientRevenueData,
  filterClientRevenueRecords,
  getClientRevenueKPIs,
} from "../../../services/clientRevenue";

async function resolveWorkspaceId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = authData?.user?.id;
  if (!userId) throw new Error("User session not found.");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.workspace_id) throw new Error("No workspace assigned to this user.");

  return data.workspace_id;
}

export default function ClientRevenue() {
  const [workspaceId, setWorkspaceId] = useState(null);

  const [records, setRecords] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [revenueBySource, setRevenueBySource] = useState([]);
  const [revenueByOwner, setRevenueByOwner] = useState([]);
  const [insights, setInsights] = useState([]);
  const [owners, setOwners] = useState([]);

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

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());
      setWorkspaceId(activeWorkspaceId);

      const data = await getClientRevenueData(activeWorkspaceId);

      setRecords(data.records || []);
      setMonthlyRevenue(data.monthlyRevenue || []);
      setRevenueBySource(data.revenueBySource || []);
      setRevenueByOwner(data.revenueByOwner || []);
      setInsights(data.insights || []);
      setOwners(data.owners || []);
    } catch (err) {
      console.error("Client revenue load error:", err);
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
    return filterClientRevenueRecords(records, filters);
  }, [records, filters]);

  const kpis = useMemo(() => {
    return getClientRevenueKPIs(records);
  }, [records]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <ClientRevenueHeader onRefresh={loadRevenue} />

      {loading && <ClientRevenueLoadingState />}

      {!loading && error && (
        <ClientRevenueErrorState message={error} onRetry={loadRevenue} />
      )}

      {!loading && !error && (
        <>
          <ClientRevenueKPICards kpis={kpis} />

          <ClientRevenueChartsGrid
            monthlyRevenue={monthlyRevenue}
            revenueByOwner={revenueByOwner}
            revenueBySource={revenueBySource}
          />

          <ClientRevenueInsightsPanel insights={insights} />

          <ClientRevenueFilterToolbar
            filters={filters}
            onChange={updateFilter}
            onClear={clearFilters}
            owners={owners}
          />

          {filteredRecords.length === 0 ? (
            <ClientRevenueEmptyState />
          ) : (
            <ClientRevenueTable
              records={filteredRecords}
              onSelect={setSelectedRecord}
            />
          )}
        </>
      )}

      {selectedRecord && (
        <ClientRevenueDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
