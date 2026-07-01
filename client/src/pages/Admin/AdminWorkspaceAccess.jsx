import { useEffect, useMemo, useState } from "react";

import {
  Brain,
  FileText,
  Sparkles,
  Target,
  Workflow,
  Zap,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/admin/ui";

import { aiModules } from "../../services/ai";

import {
  DivisionAccessGrid,
  WorkspaceAccessErrorState,
  WorkspaceAccessHeader,
  WorkspaceAccessKPICards,
  WorkspaceAccessLoadingState,
  ModuleAccessTable,
  WorkspaceSelector,
} from "../../components/admin/layout/Admin_WorkspaceAccess_Components.jsx";

import {
  getWorkspaceAccessData,
  updateWorkspaceDivisionAccess,
  updateWorkspaceFeatureAccess,
} from "../../services/operations/workspace_access";

import { buildNavigationRegistry } from "../../services/operations/erp_registry";

export default function AdminWorkspaceAccess() {
  const [workspaces, setWorkspaces] = useState([]);
  const [modules, setModules] = useState([]);
  const [accessRows, setAccessRows] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [openDivisions, setOpenDivisions] = useState({});

  useEffect(() => {
    loadWorkspaceAccess();
  }, []);

  async function loadWorkspaceAccess() {
    try {
      setLoading(true);
      setError("");

      const data = await getWorkspaceAccessData();

      setWorkspaces(data.workspaces || []);
      setModules(data.modules || []);
      setAccessRows(data.accessRows || []);

      if (!selectedWorkspaceId) {
        setSelectedWorkspaceId(data.workspaces?.[0]?.id || "");
      }
    } catch (err) {
      console.error("Workspace Access load error:", err);
      setError(err.message || "Failed to load workspace access.");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeProcessAutomation() {
    setAiLoading(true);

    try {
      const analysis = await aiModules.analyzeProcessForAutomation({
        modules: modules.map((module) => module.key),
        workspaceCount: workspaces.length,
        accessPatterns: accessRows,
      });

      setAiInsights(analysis);
    } catch (err) {
      console.error("AI analysis error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateDocumentation() {
    setAiLoading(true);

    try {
      const docs = await aiModules.generateSystemDocumentation?.({
        title: "Workspace Access Management",
        modules,
        workspaces,
        accessRows,
      });

      setAiInsights(docs || null);
    } catch (err) {
      console.error("Documentation generation error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  const selectedWorkspace = useMemo(() => {
    return workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
  }, [workspaces, selectedWorkspaceId]);

  const workspaceAccess = useMemo(() => {
    return modules.map((module) => {
      const row = accessRows.find(
        (access) =>
          access.workspace_id === selectedWorkspaceId &&
          access.feature_key === module.key
      );

      return {
        ...module,
        is_enabled: row?.is_enabled || false,
        enabled_at: row?.enabled_at || null,
        enabled_by: row?.enabled_by || null,
        access_source: row?.access_source || null,
      };
    });
  }, [modules, accessRows, selectedWorkspaceId]);

  const divisionAccess = useMemo(() => {
    const divisionMap = new Map();

    workspaceAccess.forEach((module) => {
      if (!module?.division) return;

      divisionMap.set(module.division.id, {
        id: module.division.id,
        division_key: module.division.division_key || module.divisionKey,
        title: module.division.title || module.divisionTitle || module.type,
        icon: module.division.icon,
        description: module.division.description,
        order_index: module.division.order_index || 0,
        admin_visible: module.division.admin_visible ?? true,
        client_visible: module.division.client_visible ?? true,
        status: module.division.status || "active",
      });
    });

    const divisions = Array.from(divisionMap.values());

    const features = workspaceAccess.map((module) => ({
      id: module.id,
      division_id: module.division_id || module.division?.id,
      feature_key: module.key,
      label: module.label,
      icon: module.iconName || module.icon,
      description: module.description,
      admin_route: module.adminRoute || module.admin_route,
      client_route: module.clientRoute || module.client_route,
      admin_visible: module.adminVisible ?? module.admin_visible ?? true,
      client_visible: module.clientVisible ?? module.client_visible ?? true,
      status: module.status,
      status_note: module.statusNote || module.status_note,
      auto_enable_with_division:
        module.autoEnableWithDivision ??
        module.auto_enable_with_division ??
        false,
      order_index: module.order || module.order_index || 0,
      is_enabled: module.is_enabled,
      enabled_at: module.enabled_at,
      enabled_by: module.enabled_by,
      access_source: module.access_source,
      type: module.type,
      divisionKey: module.divisionKey,
      divisionTitle: module.divisionTitle,
    }));

    const enabledFeatureKeys = workspaceAccess
      .filter((module) => module.is_enabled)
      .map((module) => module.key);

    const navigation = buildNavigationRegistry({
      divisions,
      features,
      enabledFeatureKeys,
      mode: "admin",
    });

    return navigation.map((division) => ({
      ...division,
      items: workspaceAccess
        .filter((module) => module.divisionKey === division.key)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    }));
  }, [workspaceAccess]);

  function toggleDivisionOpen(divisionKey) {
    setOpenDivisions((prev) => ({
      ...prev,
      [divisionKey]: !prev[divisionKey],
    }));
  }

  async function handleToggle(featureKey, nextValue) {
    if (!selectedWorkspaceId) return;

    try {
      setSavingKey(featureKey);

      const result = await updateWorkspaceFeatureAccess({
        workspaceId: selectedWorkspaceId,
        featureKey,
        isEnabled: nextValue,
      });

      setAccessRows((prev) => {
        const exists = prev.some(
          (row) =>
            row.workspace_id === selectedWorkspaceId &&
            row.feature_key === featureKey
        );

        if (!exists) {
          return [
            ...prev,
            {
              id: result.id || `${selectedWorkspaceId}_${featureKey}`,
              workspace_id: selectedWorkspaceId,
              feature_key: featureKey,
              is_enabled: result.is_enabled,
              enabled_by: result.enabled_by,
              enabled_at: result.enabled_at,
              access_source: result.access_source,
            },
          ];
        }

        return prev.map((row) =>
          row.workspace_id === selectedWorkspaceId &&
          row.feature_key === featureKey
            ? {
                ...row,
                is_enabled: result.is_enabled,
                enabled_by: result.enabled_by,
                enabled_at: result.enabled_at,
                access_source: result.access_source,
              }
            : row
        );
      });
    } catch (err) {
      alert(err.message || "Failed to update feature access.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleToggleDivision(divisionKey, nextValue) {
    if (!selectedWorkspaceId) return;

    try {
      setSavingKey(divisionKey);

      const results = await updateWorkspaceDivisionAccess({
        workspaceId: selectedWorkspaceId,
        divisionKey,
        isEnabled: nextValue,
      });

      setAccessRows((prev) => {
        let nextRows = [...prev];

        for (const result of results) {
          const exists = nextRows.some(
            (row) =>
              row.workspace_id === selectedWorkspaceId &&
              row.feature_key === result.feature_key
          );

          if (!exists) {
            nextRows.push({
              id: result.id || `${selectedWorkspaceId}_${result.feature_key}`,
              workspace_id: selectedWorkspaceId,
              feature_key: result.feature_key,
              is_enabled: result.is_enabled,
              enabled_by: result.enabled_by,
              enabled_at: result.enabled_at,
              access_source: result.access_source,
            });
          } else {
            nextRows = nextRows.map((row) =>
              row.workspace_id === selectedWorkspaceId &&
              row.feature_key === result.feature_key
                ? {
                    ...row,
                    is_enabled: result.is_enabled,
                    enabled_by: result.enabled_by,
                    enabled_at: result.enabled_at,
                    access_source: result.access_source,
                  }
                : row
            );
          }
        }

        return nextRows;
      });
    } catch (err) {
      alert(err.message || "Failed to update division access.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="space-y-6">
      <WorkspaceAccessHeader onRefresh={loadWorkspaceAccess} />

      <Card className="border-[var(--brand-gold-border)] bg-gradient-to-r from-[var(--brand-gold-soft)] to-[var(--brand-cyan-soft)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--brand-gold)]" />
            AI Workspace Intelligence
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-[var(--bg-card)] p-4 dark:bg-[var(--bg-card)]/5">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--brand-gold)]" />
                <span className="text-sm font-medium">Automation Finder</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                AI identifies automation opportunities.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-card)] p-4 dark:bg-[var(--bg-card)]/5">
              <div className="mb-2 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-[var(--brand-cyan)]" />
                <span className="text-sm font-medium">Workflow Optimize</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                AI-suggested workspace access improvements.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-card)] p-4 dark:bg-[var(--bg-card)]/5">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--brand-cyan)]" />
                <span className="text-sm font-medium">Access Docs</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Generate access and rollout documentation.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--bg-card)] p-4 dark:bg-[var(--bg-card)]/5">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--brand-gold)]" />
                <span className="text-sm font-medium">Usage Analytics</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                AI-powered workspace usage insights.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={aiLoading}
              onClick={analyzeProcessAutomation}
            >
              <Zap className="mr-2 h-4 w-4" />
              Find Automations
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={aiLoading}
              onClick={generateDocumentation}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Docs
            </Button>
          </div>

          {aiInsights?.automationOpportunities?.length > 0 && (
            <div className="mt-4 rounded-lg bg-[var(--bg-card)] p-4 dark:bg-[var(--bg-card)]/5">
              <p className="mb-2 text-sm font-medium">AI Recommendations:</p>
              <ul className="space-y-1 text-sm">
                {aiInsights.automationOpportunities
                  .slice(0, 3)
                  .map((opp, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-[var(--brand-gold)]" />
                      {opp.task} - {opp.roiEstimate} ROI
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <WorkspaceAccessLoadingState />}

      {!loading && error && (
        <WorkspaceAccessErrorState
          message={error}
          onRetry={loadWorkspaceAccess}
        />
      )}

      {!loading && !error && (
        <>
          <WorkspaceAccessKPICards
            workspaces={workspaces}
            modules={modules}
            accessRows={accessRows}
            selectedWorkspaceId={selectedWorkspaceId}
          />

          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceChange={setSelectedWorkspaceId}
            view={view}
            onViewChange={setView}
          />

          {view === "grid" && (
            <DivisionAccessGrid
              divisions={divisionAccess}
              savingKey={savingKey}
              openDivisions={openDivisions}
              onToggleDivisionOpen={toggleDivisionOpen}
              onToggleDivision={handleToggleDivision}
              onToggleFeature={handleToggle}
            />
          )}

          {view === "table" && (
            <ModuleAccessTable
              modules={workspaceAccess}
              savingKey={savingKey}
              onToggle={handleToggle}
            />
          )}
        </>
      )}


    </div>
  );
}
