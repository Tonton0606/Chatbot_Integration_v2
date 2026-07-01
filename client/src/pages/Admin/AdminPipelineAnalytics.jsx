import { useEffect, useState } from "react";

import {
  PipelineAnalyticsHeader,
  PipelineAnalyticsTabs,
  PipelineKPICards,
  PipelineOverviewSection,
  PipelineFunnelSection,
  PipelineStagesSection,
  PipelineForecastSection,
  PipelineSourcesSection,
  PipelineAnalyticsLoadingState,
  PipelineAnalyticsErrorState,
} from "../../components/admin/layout/Admin_PipelineAnalytics_Components";

import {
  getPipelineAnalyticsData,
} from "../../services/sales_crm/pipeline_analytics";

export default function AdminPipelineAnalytics() {
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
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const result = await getPipelineAnalyticsData();

      setData({
        kpis: result.kpis,
        stagePerformance: result.stagePerformance || [],
        funnelData: result.funnelData || [],
        forecasting: result.forecasting,
        sourceAnalytics: result.sourceAnalytics || [],
        insights: result.insights || [],
      });
    } catch (err) {
      console.error("Pipeline analytics load error:", err);
      setError(err.message || "Failed to load pipeline analytics.");
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

  return (
    <div className="space-y-6">
      <PipelineAnalyticsHeader
        filters={filters}
        onChange={updateFilter}
      />

      {loading && <PipelineAnalyticsLoadingState />}

      {!loading && error && (
        <PipelineAnalyticsErrorState
          message={error}
          onRetry={loadAnalytics}
        />
      )}

      {!loading && !error && data.kpis && (
        <>
          <PipelineKPICards kpis={data.kpis} />

          <PipelineAnalyticsTabs
            section={section}
            setSection={setSection}
          />

          {section === "overview" && (
            <PipelineOverviewSection
              funnelData={data.funnelData}
              sourceAnalytics={data.sourceAnalytics}
              forecasting={data.forecasting}
              insights={data.insights}
            />
          )}

          {section === "funnel" && (
            <PipelineFunnelSection
              funnelData={data.funnelData}
              stagePerformance={data.stagePerformance}
            />
          )}

          {section === "stages" && (
            <PipelineStagesSection
              stagePerformance={data.stagePerformance}
            />
          )}

          {section === "forecast" && (
            <PipelineForecastSection
              forecasting={data.forecasting}
            />
          )}

          {section === "sources" && (
            <PipelineSourcesSection
              sourceAnalytics={data.sourceAnalytics}
              insights={data.insights}
            />
          )}
        </>
      )}
    </div>
  );
}
