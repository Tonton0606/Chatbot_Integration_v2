import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../config/supabaseClient";
import "../../../styles/sales-crm/deals.css";

import {
  ClientDealsHeader,
  ClientDealsKPICards,
  ClientDealsViewTabs,
  ClientDealsFilterToolbar,
  ClientDealsPipelineBoard,
  ClientDealsListView,
  ClientDealsForecastView,
  ClientDealsLostView,
  ClientDealDetailDrawer,
  ClientDealsLoadingState,
  ClientDealsErrorState,
} from "../../../components/client/layout/Client_Deals_Components.jsx";

import ClientDealModal from "../../../components/client/modals/ClientDealModal.jsx";

import {
  getClientDealsData,
  getClientDealMeta,
  createClientDeal,
  updateClientDeal,
  updateClientDealStage,
  markClientDealWon,
  markClientDealLost,
  archiveClientDeal,
} from "../../../services/clientDeals";

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

export default function ClientDeals() {
  const [workspaceId, setWorkspaceId] = useState(null);

  const [activeView, setActiveView] = useState("pipeline");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  const [deals, setDeals] = useState([]);
  const [lookups, setLookups] = useState({
    contacts: [],
    employees: [],
    stages: [],
    stageLabels: {},
    stageColors: {},
    sources: [],
    assignmentTypes: [],
  });

  const [stages, setStages] = useState([]);
  const [rawStages, setRawStages] = useState([]);
  const [stageLabels, setStageLabels] = useState({});
  const [stageColors, setStageColors] = useState({});
  const [salespersons, setSalespersons] = useState([]);
  const [sources, setSources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    owner: "all",
    source: "all",
    status: "all",
    sort: "updated_desc",
  });

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());
      setWorkspaceId(activeWorkspaceId);

      const [data, meta] = await Promise.all([
        getClientDealsData(activeWorkspaceId),
        getClientDealMeta(activeWorkspaceId),
      ]);

      setDeals(data.deals || []);
      setStages(data.stages || []);
      setRawStages(data.rawStages || []);
      setStageLabels(data.stageLabels || {});
      setStageColors(data.stageColors || {});
      setSalespersons(data.salespersons || []);
      setSources(data.sources || []);
      setLookups(meta || {});
    } catch (err) {
      console.error("Client deals load error:", err);
      setError(err.message || "Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedDeal(null);
    setEditingDeal(null);
    setCreatingDeal(true);
  }

  function openEditModal(deal) {
    setSelectedDeal(null);
    setCreatingDeal(false);
    setEditingDeal(deal);
  }

  async function handleSaveDeal(payload) {
    try {
      setSaving(true);

      if (!workspaceId) throw new Error("Workspace ID is missing.");

      if (editingDeal?.id) {
        await updateClientDeal(editingDeal.id, workspaceId, payload);
      } else {
        await createClientDeal(workspaceId, payload);
      }

      setCreatingDeal(false);
      setEditingDeal(null);

      await loadDeals();
    } catch (err) {
      console.error("Save client deal error:", err);
      alert(err.message || "Failed to save deal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(deal, stageKey) {
    try {
      if (!workspaceId) throw new Error("Workspace ID is missing.");

      await updateClientDealStage(deal.id, workspaceId, stageKey);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to update deal stage.");
    }
  }

  async function handleMarkDealWon(deal) {
    try {
      if (!workspaceId) throw new Error("Workspace ID is missing.");

      await markClientDealWon(deal.id, workspaceId);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to mark deal as won.");
    }
  }

  async function handleMarkDealLost(deal) {
    try {
      if (!workspaceId) throw new Error("Workspace ID is missing.");

      await markClientDealLost(deal.id, workspaceId);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to mark deal as lost.");
    }
  }

  async function handleArchiveDeal(deal) {
    const confirmed = window.confirm(
      `Archive "${deal.title}"?\n\nArchived deals disappear from active CRM, dashboards, and analytics but remain recoverable.`
    );

    if (!confirmed) return;

    try {
      if (!workspaceId) throw new Error("Workspace ID is missing.");

      await archiveClientDeal(deal.id, workspaceId);
      setSelectedDeal(null);
      await loadDeals();
    } catch (err) {
      alert(err.message || "Failed to archive deal.");
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
      <ClientDealsHeader onAddDeal={openCreateModal} />

      {loading && <ClientDealsLoadingState />}

      {!loading && error && (
        <ClientDealsErrorState message={error} onRetry={loadDeals} />
      )}

      {!loading && !error && (
        <>
          <ClientDealsKPICards deals={deals} />

          <div className="min-w-0 space-y-4">
            <ClientDealsViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
            />

            <ClientDealsFilterToolbar
              filters={filters}
              onFilterChange={setFilters}
              stages={stages}
              stageLabels={stageLabels}
              salespersons={salespersons}
              sources={sources}
            />

            {activeView === "pipeline" && (
              <ClientDealsPipelineBoard
                deals={filteredDeals}
                stages={stages}
                stageLabels={stageLabels}
                stageColors={stageColors}
                onCardClick={setSelectedDeal}
              />
            )}

            {activeView === "list" && (
              <ClientDealsListView
                deals={filteredDeals}
                stageLabels={stageLabels}
                stageColors={stageColors}
                onRowClick={setSelectedDeal}
              />
            )}

            {activeView === "forecast" && (
              <ClientDealsForecastView
                deals={filteredDeals}
                stages={stages}
                stageLabels={stageLabels}
                stageColors={stageColors}
              />
            )}

            {activeView === "lost" && (
              <ClientDealsLostView
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
        <ClientDealDetailDrawer
          deal={selectedDeal}
          stageLabels={stageLabels}
          stageColors={stageColors}
          rawStages={rawStages}
          onClose={() => setSelectedDeal(null)}
          onEdit={openEditModal}
          onArchive={handleArchiveDeal}
          onStageChange={handleStageChange}
          onMarkWon={handleMarkDealWon}
          onMarkLost={handleMarkDealLost}
        />
      )}

      {creatingDeal && (
        <ClientDealModal
          lookups={lookups}
          saving={saving}
          onClose={() => setCreatingDeal(false)}
          onSubmit={handleSaveDeal}
        />
      )}

      {editingDeal && (
        <ClientDealModal
          deal={editingDeal}
          lookups={lookups}
          saving={saving}
          onClose={() => setEditingDeal(null)}
          onSubmit={handleSaveDeal}
        />
      )}
    </div>
  );
}
