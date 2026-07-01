import { useEffect, useState } from "react";
import { supabase } from "../../../config/supabaseClient";

import {
  ClientPipelineAnalyticsHeader,
  ClientPipelineAnalyticsTabs,
  ClientPipelineKPICards,
  ClientPipelineOverviewSection,
  ClientPipelineFunnelSection,
  ClientPipelineStagesSection,
  ClientPipelineForecastSection,
  ClientPipelineSourcesSection,
  ClientPipelineAnalyticsLoadingState,
  ClientPipelineAnalyticsErrorState,
} from "../../../components/client/layout/Client_PipelineAnalytics_Components.jsx";

import { getClientPipelineAnalyticsData } from "../../../services/clientPipelineAnalytics";

async function resolveWorkspaceId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User session not found.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error("No workspace assigned to this user.");
  }

  return data.workspace_id;
}

export default function ClientPipelineAnalytics() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [section, setSection] = useState("overview");

  const [filters, setFilters] = useState({
    owner: "all",
    source: "all",
    dateRange: "30d",
  });

  const [data, setData] = useState({
    kpis: null,
    stagePerformance: [],
    funnelData: [],
    forecasting: null,
    sourceAnalytics: [],
    insights: [],
    owners: [],
    sources: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnalytics(filters);
  }, []);

  async function loadAnalytics(activeFilters = filters) {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());

      setWorkspaceId(activeWorkspaceId);

      const result = await getClientPipelineAnalyticsData(
        activeWorkspaceId,
        activeFilters
      );

      setData({
        kpis: result.kpis,
        stagePerformance: result.stagePerformance || [],
        funnelData: result.funnelData || [],
        forecasting: result.forecasting,
        sourceAnalytics: result.sourceAnalytics || [],
        insights: result.insights || [],
        owners: result.owners || [],
        sources: result.sources || [],
      });
    } catch (err) {
      console.error("Client pipeline analytics load error:", err);
      setError(err.message || "Failed to load pipeline analytics.");
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    const nextFilters = {
      ...filters,
      [key]: value,
    };

    setFilters(nextFilters);
    loadAnalytics(nextFilters);
  }

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <ClientPipelineAnalyticsHeader
        filters={filters}
        owners={data.owners}
        sources={data.sources}
        onChange={updateFilter}
      />

      {loading && <ClientPipelineAnalyticsLoadingState />}

      {!loading && error && (
        <ClientPipelineAnalyticsErrorState
          message={error}
          onRetry={() => loadAnalytics(filters)}
        />
      )}

      {!loading && !error && data.kpis && (
        <>
          <ClientPipelineKPICards kpis={data.kpis} />

          <ClientPipelineAnalyticsTabs
            section={section}
            setSection={setSection}
          />

          {section === "overview" && (
            <ClientPipelineOverviewSection
              funnelData={data.funnelData}
              sourceAnalytics={data.sourceAnalytics}
              forecasting={data.forecasting}
              insights={data.insights}
            />
          )}

          {section === "funnel" && (
            <ClientPipelineFunnelSection
              funnelData={data.funnelData}
              stagePerformance={data.stagePerformance}
            />
          )}

          {section === "stages" && (
            <ClientPipelineStagesSection
              stagePerformance={data.stagePerformance}
            />
          )}

          {section === "forecast" && (
            <ClientPipelineForecastSection
              forecasting={data.forecasting}
            />
          )}

          {section === "sources" && (
            <ClientPipelineSourcesSection
              sourceAnalytics={data.sourceAnalytics}
              insights={data.insights}
            />
          )}
        </>
      )}
    </div>
  );
}
