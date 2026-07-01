import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, Target, Zap } from "lucide-react";

import "../../styles/sales-crm/contacts.css";
import "../../styles/sales-crm/deals.css";

import { Card, Button, Badge } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";

import {
  DealsHeader,
  DealsKPICards,
  DealsViewTabs,
  DealsFilterToolbar,
  DealsPipelineBoard,
  DealsListView,
  DealsForecastView,
  DealsLostView,
  DealDetailDrawer,
  DealsLoadingState,
  DealsErrorState,
} from "../../components/admin/layout/Admin_Deals_Components.jsx";

import {
  getDealsData,
  updateDeal,
  deleteDeal,
  markDealWon,
  markDealLost,
} from "../../services/sales_crm/deals";

import CreateDealModal from "../../components/admin/modals/CreateDealModal.jsx";

export default function AdminDeals() {
  const [activeView, setActiveView] = useState("pipeline");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [creatingDeal, setCreatingDeal] = useState(false);

  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [rawStages, setRawStages] = useState([]);
  const [stageLabels, setStageLabels] = useState({});
  const [stageColors, setStageColors] = useState({});
  const [salespersons, setSalespersons] = useState([]);
  const [sources, setSources] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    owner: "all",
    source: "all",
    status: "all",
    sort: "updated_desc",
  });

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dealPredictions, setDealPredictions] = useState({});

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    try {
      setLoading(true);
      setError("");

      const data = await getDealsData();

      setDeals(data.deals || []);
      setStages(data.stages || []);
      setRawStages(data.rawStages || []);
      setStageLabels(data.stageLabels || {});
      setStageColors(data.stageColors || {});
      setSalespersons(data.salespersons || []);
      setSources(data.sources || []);
      setAdmins(data.admins || []);
    } catch (err) {
      console.error("Deals load error:", err);
      setError(err.message || "Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAIInsights() {
    setAiLoading(true);

    try {
      const insights = await aiModules.generateBusinessInsights(
        {
          deals,
          stages,
          module: "deals",
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

  async function predictDealOutcomes() {
    setAiLoading(true);

    try {
      const predictions = {};

      for (const deal of deals.slice(0, 5)) {
        const prediction = await aiModules.predictDealClose(deal);
        predictions[deal.id] = prediction;
      }

      setDealPredictions(predictions);
    } catch (err) {
      console.error("Deal prediction error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function draftDealEmail(deal) {
    if (!deal) return;

    setAiLoading(true);

    try {
      const email = await aiModules.draftOutreachEmail(deal, "follow_up");
      alert(`AI Drafted Email:\n\nSubject: ${email.subject}\n\n${email.body}`);
    } catch (err) {
      console.error("Email drafting error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  function openCreateModal() {
    setCreatingDeal(true);
  }

  function openEditModal(deal) {
    setSelectedDeal(null);
    setEditingDeal(deal);
  }

  async function handleStageChange(deal, stageKey) {
    const nextStage = rawStages.find((stage) => stage.key === stageKey);
    if (!nextStage) return;

    try {
      await updateDeal(deal.id, {
        stage_id: nextStage.id,
        probability: nextStage.probability,
        status: nextStage.is_won ? "won" : nextStage.is_lost ? "lost" : "open",
        assigned_admin_id: deal.assigned_admin_id || null,
      });

      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to update deal stage.");
    }
  }

  async function handleOwnerChange(deal, assignedAdminId) {
    try {
      await updateDeal(deal.id, {
        assigned_admin_id: assignedAdminId || null,
      });

      await loadDeals();

      setSelectedDeal((prev) =>
        prev
          ? {
              ...prev,
              assigned_admin_id: assignedAdminId || null,
              owner:
                admins.find((admin) => admin.id === assignedAdminId)
                  ?.full_name || "Unassigned",
            }
          : prev
      );
    } catch (err) {
      alert(err.message || "Failed to update deal owner.");
    }
  }

  async function handleDeleteDeal(deal) {
    const confirmed = window.confirm(`Delete "${deal.title}"?`);
    if (!confirmed) return;

    try {
      await deleteDeal(deal.id);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to delete deal.");
    }
  }

  async function handleMarkDealWon(deal) {
    try {
      await markDealWon(deal.id);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to mark deal as won.");
    }
  }

  async function handleMarkDealLost(deal) {
    try {
      await markDealLost(deal.id);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to mark deal as lost.");
    }
  }

  const filteredDeals = useMemo(() => {
    return deals
      .filter((deal) => {
        const search = filters.search.trim().toLowerCase();

        const matchesSearch =
          !search ||
          (deal.title || "").toLowerCase().includes(search) ||
          (deal.company || "").toLowerCase().includes(search) ||
          (deal.contact_name || "").toLowerCase().includes(search) ||
          (deal.email || "").toLowerCase().includes(search);

        return (
          matchesSearch &&
          (filters.stage === "all" || deal.stage === filters.stage) &&
          (filters.owner === "all" || deal.owner === filters.owner) &&
          (filters.source === "all" || deal.source === filters.source) &&
          (filters.status === "all" || deal.status === filters.status)
        );
      })
      .sort((a, b) => {
        if (filters.sort === "value_desc") {
          return Number(b.value || 0) - Number(a.value || 0);
        }

        if (filters.sort === "value_asc") {
          return Number(a.value || 0) - Number(b.value || 0);
        }

        if (filters.sort === "close_date") {
          return (
            new Date(a.expected_close_date || 0) -
            new Date(b.expected_close_date || 0)
          );
        }

        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
  }, [deals, filters]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <DealsHeader onAddDeal={openCreateModal} />

      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] shadow-lg">
        {/* Animated top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-gold)] to-[var(--brand-cyan)] bg-[length:200%_100%]" style={{ animation: "gradientShift 3s linear infinite" }}></div>

        {/* AI Hub Header with Organic Blobs */}
        <div
          className="relative overflow-hidden px-5 py-4"
          style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))" }}
        >
          {/* Blob 1 — gold, top-right */}
          <div className="ai-blob-1 absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 2 — cyan, bottom-center */}
          <div className="ai-blob-2 absolute -bottom-4 left-1/3 h-16 w-16 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 3 — gold, bottom-left */}
          <div className="ai-blob-3 absolute -bottom-5 left-0 h-20 w-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 4 — cyan, top-center-left */}
          <div className="ai-blob-4 absolute -top-4 left-1/4 h-14 w-14 rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 5 — gold-cyan blend, center-right */}
          <div className="ai-blob-5 absolute top-1/2 right-1/4 h-10 w-10 -translate-y-1/2 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-gold), var(--brand-cyan), transparent)" }}></div>
          {/* Blob 6 — cyan, top-right-center */}
          <div className="ai-blob-6 absolute -top-2 right-1/3 h-12 w-12 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }}></div>
          {/* Blob 7 — gold, center-left */}
          <div className="ai-blob-7 absolute top-1/2 left-8 h-8 w-8 -translate-y-1/2 rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--brand-gold), transparent)" }}></div>
          {/* Blob 8 — cyan-gold, bottom-right */}
          <div className="ai-blob-8 absolute -bottom-3 right-8 h-14 w-14 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--brand-cyan), var(--brand-gold), transparent)" }}></div>

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
                style={{ background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))" }}
              >
                <Brain className="h-5 w-5 text-white animate-pulse" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }} />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  AI Deal Intelligence
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--brand-cyan)" }}></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--brand-cyan)" }}></span>
                  </span>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Powered by advanced machine learning</p>
                </div>
              </div>
            </div>
            <div
              className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:flex"
              style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}
            >
              <Sparkles className="h-3 w-3" />
              AI Ready
            </div>
          </div>
        </div>

        {/* Action Buttons — compact horizontal row */}
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              onClick={generateAIInsights}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-cyan-border)", background: "var(--brand-cyan-soft)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(8,145,178,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--brand-cyan-soft)"}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-cyan)" }}></div>
                : <Sparkles className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-cyan)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-cyan)" }}>Generate Insights</span>
            </button>

            <button
              onClick={predictDealOutcomes}
              disabled={aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--brand-gold-soft)"}
            >
              {aiLoading
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: "var(--brand-gold)" }}></div>
                : <Target className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-gold)" }} />
              }
              <span className="font-semibold" style={{ color: "var(--brand-gold)" }}>Predict Deals</span>
            </button>

            <button
              onClick={() => draftDealEmail(deals[0])}
              disabled={!deals.length || aiLoading}
              className="group flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "var(--border-color)", background: "var(--hover-bg)" }}
              onMouseEnter={e => { if (deals.length && !aiLoading) { e.currentTarget.style.borderColor = "var(--brand-gold-border)"; e.currentTarget.style.background = "var(--brand-gold-soft)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--hover-bg)"; }}
            >
              <Zap className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--text-secondary)" }} />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Draft AI Email</span>
            </button>
          </div>
        </div>

        {/* AI Insights Results */}
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
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                      style={{ borderColor: "var(--brand-gold-border)", background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}
                    >
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--brand-gold)" }}></div>
                      {finding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deal Predictions Results */}
        {Object.keys(dealPredictions).length > 0 && (
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--brand-gold-soft)", color: "var(--brand-gold)" }}>
                <Target className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Deal Predictions</h3>
              <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {Object.keys(dealPredictions).length} predicted
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(dealPredictions).map(([dealId, prediction]) => {
                const deal = deals.find((item) => item.id === dealId);
                const isHigh = prediction.probability > 70;
                const isMed = prediction.probability > 40;
                const dotColor = isHigh ? "var(--success)" : isMed ? "var(--brand-gold)" : "var(--text-muted)";
                
                const scoreGradient = isHigh
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : isMed
                    ? "linear-gradient(135deg, var(--brand-cyan), var(--brand-gold))"
                    : "linear-gradient(135deg, #475569, #94a3b8)";
                
                const tierBg = isHigh ? "var(--success-soft)" : isMed ? "var(--brand-gold-soft)" : "var(--hover-bg)";
                const tierColor = isHigh ? "var(--success)" : isMed ? "var(--brand-gold)" : "var(--text-muted)";
                
                const gradId = `dealGrad-${dealId}`;

                return (
                  <div
                    key={dealId}
                    className="group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = dotColor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
                  >
                    <div className="h-0.5 w-full" style={{ background: scoreGradient }}></div>
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{deal?.title || "Untitled Deal"}</p>
                          <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>Est. Close: {prediction.estimatedCloseDate}</p>
                        </div>
                        {/* Compact score ring */}
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--hover-bg)" }}>
                          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="17" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                            <circle
                              cx="22" cy="22" r="17" fill="none"
                              stroke={`url(#${gradId})`} strokeWidth="3"
                              strokeDasharray={`${(prediction.probability / 100) * 106.8} 106.8`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dasharray 1s ease-out" }}
                            />
                            <defs>
                              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={isHigh ? "#16a34a" : isMed ? "var(--brand-cyan)" : "#475569"} />
                                <stop offset="100%" stopColor={isHigh ? "#22c55e" : isMed ? "var(--brand-gold)" : "#94a3b8"} />
                              </linearGradient>
                            </defs>
                          </svg>
                          <span className="text-xs font-bold" style={{ color: dotColor }}>{prediction.probability}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: tierBg, color: tierColor }}>
                            {isHigh ? "HIGH" : isMed ? "WARM" : "LOW"}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: dotColor }}>{prediction.probability}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--border-color)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${prediction.probability}%`, background: scoreGradient, boxShadow: `0 0 6px ${dotColor}50` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!aiInsights && Object.keys(dealPredictions).length === 0 && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--brand-cyan-soft), var(--brand-gold-soft))", border: "1px solid var(--brand-gold-border)" }}
            >
              <Brain className="h-5 w-5 animate-pulse" style={{ color: "var(--brand-gold)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ready to Analyze</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the actions above to generate insights, predict deals, or draft outreach emails.</p>
            </div>
          </div>
        )}
      </div>

      {loading && <DealsLoadingState />}

      {!loading && error && (
        <DealsErrorState message={error} onRetry={loadDeals} />
      )}

      {!loading && !error && (
        <>
          <DealsKPICards deals={deals} />

          <div className="min-w-0 space-y-4">
            <DealsViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
            />

            <DealsFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              stages={stages}
              stageLabels={stageLabels}
              salespersons={salespersons}
              sources={sources}
            />

            {activeView === "pipeline" && (
              <DealsPipelineBoard
                deals={filteredDeals}
                stages={stages}
                stageLabels={stageLabels}
                stageColors={stageColors}
                onCardClick={setSelectedDeal}
              />
            )}

            {activeView === "list" && (
              <DealsListView
                deals={filteredDeals}
                stageLabels={stageLabels}
                stageColors={stageColors}
                onRowClick={setSelectedDeal}
              />
            )}

            {activeView === "forecast" && (
              <DealsForecastView
                deals={filteredDeals}
                stages={stages}
                stageLabels={stageLabels}
                stageColors={stageColors}
              />
            )}

            {activeView === "lost" && (
              <DealsLostView
                deals={filteredDeals}
                stageLabels={stageLabels}
                stageColors={stageColors}
                onRowClick={setSelectedDeal}
              />
            )}
          </div>
        </>
      )}

      {selectedDeal && (
        <DealDetailDrawer
          deal={selectedDeal}
          admins={admins}
          stageLabels={stageLabels}
          stageColors={stageColors}
          rawStages={rawStages}
          onClose={() => setSelectedDeal(null)}
          onEdit={openEditModal}
          onDelete={handleDeleteDeal}
          onStageChange={handleStageChange}
          onOwnerChange={handleOwnerChange}
          onMarkWon={handleMarkDealWon}
          onMarkLost={handleMarkDealLost}
        />
      )}

      {creatingDeal && (
        <CreateDealModal
          admins={admins}
          onClose={() => setCreatingDeal(false)}
          onSuccess={async () => {
            setCreatingDeal(false);
            await loadDeals();
          }}
        />
      )}

      {editingDeal && (
        <CreateDealModal
          deal={editingDeal}
          admins={admins}
          onClose={() => setEditingDeal(null)}
          onSuccess={async () => {
            setEditingDeal(null);
            await loadDeals();
          }}
        />
      )}


    </div>
  );
}
