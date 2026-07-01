import { useEffect, useMemo, useState } from "react";

import {
  getClientLeadsData,
  getClientLeadLookups,
  createClientLead,
  updateClientLead,
  archiveClientLead,
  updateClientLeadStage,
  convertClientLeadToDeal,
  filterClientLeads,
} from "../../../services/clientLeads";

import {
  ClientLeadsHeader,
  ClientLeadsKPICards,
  ClientLeadsViewTabs,
  ClientLeadsFilterToolbar,
  ClientLeadsKanbanBoard,
  ClientLeadsTable,
  ClientLeadDetailDrawer,
  ClientLeadsLoadingState,
  ClientLeadsErrorState,
  ClientLeadsEmptyState,
} from "../../../components/client/layout/Client_Leads_Components";

import ClientLeadModal from "../../../components/client/modals/ClientLeadModal.jsx";

export default function ClientLeads() {
  const [workspaceId, setWorkspaceId] = useState(null);

  const [leads, setLeads] = useState([]);
  const [lookups, setLookups] = useState({
    contacts: [],
    employees: [],
    sources: [],
    stages: [],
    assignmentTypes: [],
    contactModes: [],
  });

  const [view, setView] = useState("pipeline");
  const [selectedLead, setSelectedLead] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    source: "all",
    owner: "all",
  });

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      setError("");

      const [leadsResult, lookupResult] = await Promise.all([
        getClientLeadsData(workspaceId),
        getClientLeadLookups(workspaceId),
      ]);

      setWorkspaceId(lookupResult.workspaceId);
      setLeads(leadsResult.leads || []);
      setLookups(lookupResult || {});
    } catch (err) {
      console.error("Client leads load error:", err);
      setError(err.message || "Failed to load client leads.");
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
      stage: "all",
      source: "all",
      owner: "all",
    });
  }

  function openCreateModal() {
    setSelectedLead(null);
    setEditingLead(null);
    setCreatingLead(true);
  }

  function openEditModal(lead) {
    setSelectedLead(null);
    setCreatingLead(false);
    setEditingLead(lead);
  }

  async function handleSaveLead(payload) {
    try {
      setSaving(true);

      if (!workspaceId) {
        throw new Error("Workspace ID is missing.");
      }

      if (editingLead?.id) {
        await updateClientLead(editingLead.id, workspaceId, payload);
      } else {
        await createClientLead(workspaceId, payload);
      }

      setCreatingLead(false);
      setEditingLead(null);

      await loadLeads();
    } catch (err) {
      console.error("Save client lead error:", err);
      alert(err.message || "Failed to save lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveLead(lead) {
    const confirmed = window.confirm(
      `Archive "${lead.title}"?\n\nArchived leads disappear from active CRM, dashboards, and analytics but remain recoverable.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      if (!workspaceId) {
        throw new Error("Workspace ID is missing.");
      }

      await archiveClientLead(lead.id, workspaceId);

      setSelectedLead(null);
      await loadLeads();
    } catch (err) {
      console.error("Archive client lead error:", err);
      alert(err.message || "Failed to archive lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(lead, status) {
    try {
      setSaving(true);

      if (!workspaceId) {
        throw new Error("Workspace ID is missing.");
      }

      const updatedLead = await updateClientLeadStage(
        lead.id,
        workspaceId,
        status
      );

      setLeads((prev) =>
        prev.map((item) => (item.id === updatedLead.id ? updatedLead : item))
      );

      setSelectedLead(updatedLead);
    } catch (err) {
      console.error("Client lead stage update error:", err);
      alert(err.message || "Failed to update lead stage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertLead(lead) {
    const expectedRevenue = window.prompt(
      "Expected revenue",
      String(lead.estimated_value || 0)
    );

    if (expectedRevenue === null) return;

    try {
      setSaving(true);

      if (!workspaceId) {
        throw new Error("Workspace ID is missing.");
      }

      const result = await convertClientLeadToDeal(lead.id, workspaceId, {
        expected_revenue: Number(expectedRevenue || 0),
        probability: 60,
        stage: "qualified",
        description: lead.notes || null,
        assignment_type: lead.assignment_type,
        assigned_user_id: lead.assigned_user_id,
        assigned_contact_id: lead.assigned_contact_id,
        assigned_name: lead.assigned_name,
      });

      setLeads((prev) =>
        prev.map((item) => (item.id === result.lead.id ? result.lead : item))
      );

      setSelectedLead(result.lead);

      alert("Lead converted to deal.");
    } catch (err) {
      console.error("Client lead conversion error:", err);
      alert(err.message || "Failed to convert lead.");
    } finally {
      setSaving(false);
    }
  }

  const ownerOptions = useMemo(() => {
    return [
      ...new Set(
        leads
          .map((lead) => lead.owner)
          .filter(Boolean)
      ),
    ];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return filterClientLeads(leads, filters);
  }, [leads, filters]);

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <ClientLeadsHeader onAddLead={openCreateModal} />

      {loading && <ClientLeadsLoadingState />}

      {!loading && error && (
        <ClientLeadsErrorState message={error} onRetry={loadLeads} />
      )}

      {!loading && !error && (
        <>
          <ClientLeadsKPICards leads={leads} />

          <div className="min-w-0 space-y-4">
            <ClientLeadsViewTabs view={view} setView={setView} />

            <ClientLeadsFilterToolbar
              filters={filters}
              onChange={updateFilter}
              onClear={clearFilters}
              owners={ownerOptions}
            />

            {filteredLeads.length === 0 ? (
              <ClientLeadsEmptyState />
            ) : (
              <>
                {view === "pipeline" && (
                  <ClientLeadsKanbanBoard
                    leads={filteredLeads}
                    onSelect={setSelectedLead}
                  />
                )}

                {view === "list" && (
                  <ClientLeadsTable
                    leads={filteredLeads}
                    onSelect={setSelectedLead}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {selectedLead && (
        <ClientLeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={openEditModal}
          onArchive={handleArchiveLead}
          onStageChange={handleStageChange}
          onConvert={handleConvertLead}
        />
      )}

      {creatingLead && (
        <ClientLeadModal
          lookups={lookups}
          saving={saving}
          onClose={() => setCreatingLead(false)}
          onSubmit={handleSaveLead}
        />
      )}

      {editingLead && (
        <ClientLeadModal
          lead={editingLead}
          lookups={lookups}
          saving={saving}
          onClose={() => setEditingLead(null)}
          onSubmit={handleSaveLead}
        />
      )}
    </div>
  );
}
