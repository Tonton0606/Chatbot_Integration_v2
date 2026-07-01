import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, Target, TrendingUp, Mail } from "lucide-react";
import { aiModules } from "../../../services/ai";

import {
  getCrmData,
} from "../../../services/CRM/crm.service";

import {
  CRMHeader,
  CRMKPICards,
  CRMFilterToolbar,
  CRMOpportunitiesTable,
  CRMPipelineSnapshot,
  CRMTopOpportunities,
  CRMRecentActivities,
  CRMReportingSummary,
  CRMOpportunityDrawer,
  CRMLoadingState,
  CRMErrorState,
  CRMEmptyState,
} from "../../../components/admin/CRM/Admin_CRM_Components";

import "../../../styles/CRM/crm.css";

export default function Admin_CRM() {
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [stages, setStages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [sources, setSources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    status: "all",
    source: "all",
    sort: "revenue_desc",
  });

  useEffect(() => {
    loadCRMData();
  }, []);

  async function loadCRMData() {
    try {
      setLoading(true);
      setError("");

      const data = await getCrmData();

      setStages(data.stages || []);
      setOpportunities(data.opportunities || []);
      setRecentActivities(data.recentActivities || []);

      const uniqueSources = [...new Set((data.opportunities || []).map((o) => o.source).filter(Boolean))];
      setSources(uniqueSources);
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
        { opportunities, stages, recentActivities, module: "crm" },
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
      const scored = await Promise.all(
        opportunities.slice(0, 5).map(async (opp) => {
          const score = await aiModules.scoreLead(opp);
          return { ...opp, aiScore: score };
        })
      );
    } catch (err) {
      console.error("Lead scoring error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => {
        const search = filters.search.trim().toLowerCase();
        const matchesSearch =
          !search ||
          (opp.name || "").toLowerCase().includes(search) ||
          (opp.company || "").toLowerCase().includes(search) ||
          (opp.contact || "").toLowerCase().includes(search) ||
          (opp.email || "").toLowerCase().includes(search);

        const matchesStage = filters.stage === "all" || opp.stage === filters.stage;
        const matchesStatus = filters.status === "all" || opp.status === filters.status;
        const matchesSource = filters.source === "all" || opp.source === filters.source;

        return matchesSearch && matchesStage && matchesStatus && matchesSource;
      })
      .sort((a, b) => {
        if (filters.sort === "revenue_desc") return Number(b.revenue || 0) - Number(a.revenue || 0);
        if (filters.sort === "revenue_asc") return Number(a.revenue || 0) - Number(b.revenue || 0);
        if (filters.sort === "probability_desc") return Number(b.probability || 0) - Number(a.probability || 0);
        if (filters.sort === "recent") return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        if (filters.sort === "close_date") return new Date(a.expectedCloseDate || 0) - new Date(b.expectedCloseDate || 0);
        return 0;
      });
  }, [opportunities, filters]);

  const topOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => opp.status === "open")
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
      .slice(0, 5);
  }, [opportunities]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <CRMHeader onAddOpportunity={() => alert("Add Opportunity modal coming soon.")} />

      {/* AI Sales Intelligence */}
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] shadow-lg">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-gold)] to-[var(--brand-cyan)] bg-[length:200%_100%]" style={{ animation: "gradientShift 3s linear infinite" }}></div>

        <div className="relative overflow-hidden px-5 py-4" style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))" }}>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md" style={{ background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))" }}>
                <Brain className="h-5 w-5 text-white animate-pulse" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>AI Sales Intelligence</h2>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--brand-cyan)" }}></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--brand-cyan)" }}></span>
                  </span>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Powered by advanced machine learning</p>
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:flex" style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>
              <Sparkles className="h-3 w-3" />
              AI Ready
            </div>
          </div>
        </div>

        <div className="border-b px-5 py-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={generateAIInsights}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-cyan-border)", background: "var(--brand-cyan-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand-cyan-soft)")}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-cyan)" }}></div>
                : <Sparkles className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-cyan)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-cyan)" }}>Generate Insights</span>
            </button>

            <button
              type="button"
              onClick={scoreAllLeads}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,168,76,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand-gold-soft)")}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-gold)" }}></div>
                : <Target className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-gold)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-gold)" }}>Score Leads</span>
            </button>

            <button
              type="button"
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", background: "var(--hover-bg)" }}
              onMouseEnter={(e) => { if (!aiLoading) { e.currentTarget.style.borderColor = "var(--brand-gold-border)"; e.currentTarget.style.background = "var(--brand-gold-soft)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--hover-bg)"; }}
            >
              <TrendingUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--text-secondary)" }} />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Predict Deals</span>
            </button>

            <button
              type="button"
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", background: "var(--hover-bg)" }}
              onMouseEnter={(e) => { if (!aiLoading) { e.currentTarget.style.borderColor = "var(--brand-cyan-border)"; e.currentTarget.style.background = "var(--brand-cyan-soft)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--hover-bg)"; }}
            >
              <Mail className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--text-secondary)" }} />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Draft Emails</span>
            </button>
          </div>
        </div>

        {aiInsights && (
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-color)", background: "linear-gradient(to bottom, var(--brand-cyan-soft), transparent)" }}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--brand-cyan-soft)", color: "var(--brand-cyan)" }}>
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Strategic Summary</h3>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: "var(--brand-cyan-border)", color: "var(--brand-cyan)", background: "var(--brand-cyan-soft)" }}>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--brand-cyan)" }}></div>
                Live
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiInsights.executiveSummary}</p>
              {aiInsights.keyFindings?.slice(0, 3).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiInsights.keyFindings.slice(0, 3).map((finding, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105" style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--brand-gold)" }}></div>
                      {finding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!aiInsights && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))", border: "1px solid var(--brand-gold-border)" }}>
              <Brain className="h-5 w-5 animate-pulse" style={{ color: "var(--brand-gold)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ready to Analyze</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the actions above to generate insights, score leads, predict deals, or draft outreach emails.</p>
            </div>
          </div>
        )}
      </div>

      {/* States */}
      {loading && <CRMLoadingState />}

      {!loading && error && <CRMErrorState message={error} onRetry={loadCRMData} />}

      {!loading && !error && opportunities.length === 0 && <CRMEmptyState />}

      {/* Data views */}
      {!loading && !error && opportunities.length > 0 && (
        <>
          <CRMKPICards opportunities={opportunities} />

          <div className="space-y-4">
            <CRMFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              stages={stages}
              sources={sources}
            />

            <CRMOpportunitiesTable
              opportunities={filteredOpportunities}
              onRowClick={setSelectedOpp}
            />
          </div>

          <div className="crm-grid-two">
            <CRMPipelineSnapshot
              stages={stages}
              opportunities={opportunities}
              onOpportunityClick={setSelectedOpp}
            />
            <CRMTopOpportunities
              opportunities={topOpportunities}
              onOpportunityClick={setSelectedOpp}
            />
          </div>

          <div className="crm-grid-split">
            <CRMRecentActivities activities={recentActivities} />
            <CRMReportingSummary opportunities={opportunities} />
          </div>
        </>
      )}

      {selectedOpp && (
        <CRMOpportunityDrawer
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
        />
      )}


    </div>
  );
}
