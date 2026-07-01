import { useEffect, useMemo, useState } from "react";

import {
  LeadsHeader,
  LeadsKPICards,
  LeadsFilterToolbar,
  LeadsViewTabs,
  LeadsKanbanBoard,
  LeadsTable,
  LeadDetailDrawer,
  LeadsLoadingState,
  LeadsErrorState,
  LeadsEmptyState,
} from "../../components/admin/layout/Admin_LeadsPipeline_Components";

import {
  getLeadsPipelineData,
  getAssignableAdmins,
  filterLeads,
  updateLeadStage,
  updateLeadOwner,
  convertLeadToOpportunity,
} from "../../services/sales_crm/leads";

export default function AdminLeadsPipeline() {
  const [leads, setLeads] = useState([]);
  const [adminOptions, setAdminOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedLead, setSelectedLead] = useState(null);
  const [view, setView] = useState("pipeline");

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

      const [leadsData, adminsData] = await Promise.all([
        getLeadsPipelineData(),
        getAssignableAdmins(),
      ]);

      setLeads(leadsData || []);
      setAdminOptions(adminsData || []);
    } catch (err) {
      console.error("Leads load error:", err);
      setError(err.message || "Failed to load leads pipeline.");
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

  function syncUpdatedLead(updatedLead) {
    setLeads((prev) =>
      prev.map((item) => (item.id === updatedLead.id ? updatedLead : item))
    );

    setSelectedLead(updatedLead);
  }

  async function handleStageChange(lead, stage) {
    try {
      setActionLoading(true);
      const updatedLead = await updateLeadStage(lead.id, stage);
      syncUpdatedLead(updatedLead);
    } catch (err) {
      console.error("Lead stage update error:", err);
      alert(err.message || "Failed to update lead stage.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOwnerChange(lead, assignedAdminId) {
    try {
      setActionLoading(true);
      const updatedLead = await updateLeadOwner(lead.id, assignedAdminId);
      syncUpdatedLead(updatedLead);
    } catch (err) {
      console.error("Lead owner update error:", err);
      alert(err.message || "Failed to update lead owner.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConvertLead(lead, payload) {
    try {
      setActionLoading(true);

      const result = await convertLeadToOpportunity(lead.id, payload);

      setLeads((prev) =>
        prev.map((item) => (item.id === result.lead.id ? result.lead : item))
      );

      setSelectedLead(result.lead);

      alert("Lead converted to opportunity. Check Deals Pipeline.");
    } catch (err) {
      console.error("Lead conversion error:", err);
      alert(err.message || "Failed to convert lead.");
    } finally {
      setActionLoading(false);
    }
  }

  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters);
  }, [leads, filters]);

  return (
    <div className="space-y-6">
      <LeadsHeader />

      {loading && <LeadsLoadingState />}

      {!loading && error && (
        <LeadsErrorState message={error} onRetry={loadLeads} />
      )}

      {!loading && !error && leads.length > 0 && (
        <>
          <LeadsKPICards leads={leads} />

          <LeadsViewTabs view={view} setView={setView} />

          <LeadsFilterToolbar
            filters={filters}
            onChange={updateFilter}
            onClear={clearFilters}
          />

          {filteredLeads.length === 0 ? (
            <LeadsEmptyState />
          ) : (
            <>
              {view === "pipeline" && (
                <LeadsKanbanBoard
                  leads={filteredLeads}
                  onSelect={setSelectedLead}
                />
              )}

              {view === "list" && (
                <LeadsTable leads={filteredLeads} onSelect={setSelectedLead} />
              )}
            </>
          )}
        </>
      )}

      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          adminOptions={adminOptions}
          loading={actionLoading}
          onClose={() => setSelectedLead(null)}
          onStageChange={handleStageChange}
          onOwnerChange={handleOwnerChange}
          onConvert={handleConvertLead}
        />
      )}
    </div>
  );
}
