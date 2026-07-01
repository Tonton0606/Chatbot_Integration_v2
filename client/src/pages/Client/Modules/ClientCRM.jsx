import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../config/supabaseClient";
import "../../../styles/sales-crm/contacts.css";

import {
  ClientCRMHeader,
  ClientCRMAIPanel,
  ClientCRMKPICards,
  ClientPipelineSnapshot,
  ClientTopOpportunities,
  ClientRecentActivities,
  ClientReportingSummary,
  ClientOpportunityPreviewDrawer,
  ClientCRMEmptyState,
  ClientCRMLoadingState,
  ClientCRMErrorState,
  buildClientCRMKPIs,
} from "../../../components/client/layout/Client_CRM_Components.jsx";

import { getClientCRMData } from "../../../services/clientCRM";

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

export default function ClientCRM() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const [stages, setStages] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCRMData();
  }, []);

  async function loadCRMData() {
    try {
      setLoading(true);
      setError("");

      const activeWorkspaceId = workspaceId || (await resolveWorkspaceId());

      setWorkspaceId(activeWorkspaceId);

      const data = await getClientCRMData(activeWorkspaceId);

      setStages(data.stages || []);
      setOpportunities(data.opportunities || []);
      setRecentActivities(data.recentActivities || []);
      setContacts(data.contacts || []);
      setLeads(data.leads || []);
      setDeals(data.deals || []);
    } catch (err) {
      console.error("Client CRM load error:", err);
      setError(err.message || "Failed to load CRM data.");
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    return buildClientCRMKPIs(opportunities, {
      contacts,
      leads,
      deals,
    });
  }, [opportunities, contacts, leads, deals]);

  const topOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => opp.status === "open" && !opp.archived_at)
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
      .slice(0, 5);
  }, [opportunities]);

  const hasCRMData =
    contacts.length > 0 || leads.length > 0 || opportunities.length > 0;

  return (
    <div className="min-w-0 space-y-6 text-[var(--text-primary)]">
      <ClientCRMHeader />

      {loading && <ClientCRMLoadingState />}

      {!loading && error && (
        <ClientCRMErrorState
          message={error}
          onRetry={loadCRMData}
        />
      )}

      {!loading && !error && !hasCRMData && <ClientCRMEmptyState />}

      {!loading && !error && hasCRMData && (
        <>
          <ClientCRMAIPanel />

          <ClientCRMKPICards kpis={kpis} />

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ClientPipelineSnapshot
              stages={stages}
              opportunities={opportunities}
              onOpportunityClick={setSelectedOpp}
            />

            <ClientTopOpportunities
              opportunities={topOpportunities}
              onOpportunityClick={setSelectedOpp}
            />
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <ClientRecentActivities activities={recentActivities} />

            <ClientReportingSummary opportunities={opportunities} />
          </div>
        </>
      )}

      {selectedOpp && (
        <ClientOpportunityPreviewDrawer
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
        />
      )}
    </div>
  );
}
