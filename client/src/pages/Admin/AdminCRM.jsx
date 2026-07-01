import { useEffect, useMemo, useState } from "react";
import { Sparkles, Target, TrendingUp, Mail, Brain } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from "../../components/admin/ui";
import { aiModules } from "../../services/ai";

import {
  CRMHeader,
  CRMKPICards,
  PipelineSnapshot,
  TopOpportunities,
  RecentActivities,
  ReportingSummary,
  OpportunityPreviewDrawer,
  CRMEmptyState,
  CRMLoadingState,
  CRMErrorState,
  buildCRMKPIs,
} from "../../components/admin/layout/Admin_CRM_Components.jsx";

import { getCRMData } from "../../services/sales_crm/crm";

export default function AdminCRM() {
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [stages, setStages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadCRMData();
  }, []);

  async function loadCRMData() {
    try {
      setLoading(true);
      setError("");

      const data = await getCRMData();

      setStages(data.stages || []);
      setOpportunities(data.opportunities || []);
      setRecentActivities(data.recentActivities || []);
    } catch (err) {
      console.error("CRM load error:", err);
      setError(err.message || "Failed to load CRM data.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAIInsights() {
    setAiLoading(true);

    try {
      const insights = await aiModules.generateBusinessInsights(
        {
          opportunities,
          stages,
          recentActivities,
          module: "crm",
        },
        "current_month"
      );

      setAiInsights(insights);
    } catch (err) {
      console.error("AI insights error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function scoreAllLeads() {
    setAiLoading(true);

    try {
      await Promise.all(
        opportunities.slice(0, 5).map(async (opp) => {
          await aiModules.scoreLead(opp);
        })
      );
    } catch (err) {
      console.error("Lead scoring error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  const kpis = useMemo(() => buildCRMKPIs(opportunities), [opportunities]);

  const topOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => opp.status === "open")
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
      .slice(0, 5);
  }, [opportunities]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <CRMHeader />

      <Card className="min-w-0 border-[#c9a84c]/30 bg-gradient-to-r from-[#c9a84c]/10 to-[#ea580c]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#c9a84c]" />
            AI Sales Intelligence
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="mb-4 grid gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              loading={aiLoading}
              onClick={generateAIInsights}
              className="w-full sm:w-auto"
            >
              Generate Insights
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Target}
              loading={aiLoading}
              onClick={scoreAllLeads}
              className="w-full sm:w-auto"
            >
              Score Leads
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={TrendingUp}
              onClick={() => {}}
              className="w-full sm:w-auto"
            >
              Predict Deals
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Mail}
              onClick={() => {}}
              className="w-full sm:w-auto"
            >
              Draft Emails
            </Button>
          </div>

          {aiInsights && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {aiInsights.executiveSummary}
              </p>

              <div className="flex flex-wrap gap-2">
                {aiInsights.keyFindings?.slice(0, 3).map((finding, index) => (
                  <Badge key={index} variant="info" className="text-xs">
                    {finding}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <CRMLoadingState />}

      {!loading && error && (
        <CRMErrorState message={error} onRetry={loadCRMData} />
      )}

      {!loading && !error && opportunities.length === 0 && <CRMEmptyState />}

      {!loading && !error && opportunities.length > 0 && (
        <>
          <CRMKPICards kpis={kpis} />

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <PipelineSnapshot
              stages={stages}
              opportunities={opportunities}
              onOpportunityClick={setSelectedOpp}
            />

            <TopOpportunities
              opportunities={topOpportunities}
              onOpportunityClick={setSelectedOpp}
            />
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <RecentActivities activities={recentActivities} />
            <ReportingSummary opportunities={opportunities} />
          </div>
        </>
      )}

      {selectedOpp && (
        <OpportunityPreviewDrawer
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
        />
      )}


    </div>
  );
}
