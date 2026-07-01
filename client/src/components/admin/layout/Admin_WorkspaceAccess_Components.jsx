import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  List,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

function formatDate(date) {
  if (!date) return "Not enabled";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function moduleTypeClass(type) {
  if (type === "Executive") return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (type === "Sales & CRM")
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (type === "Operations")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (type === "Advanced AI")
    return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function statusClass(status) {
  if (status === "active")
    return "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]";
  if (status === "beta")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (status === "planned")
    return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]";

  return "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]";
}

function accessSourceClass(source) {
  if (source === "division")
    return "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]";
  if (source === "subscription")
    return "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]";
  if (source === "system")
    return "border-slate-200 bg-slate-50 text-slate-700";

  return "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";
}

function isFeatureLocked(feature) {
  return feature.status === "planned" || feature.status === "disabled";
}

export function WorkspaceAccessHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Admin <span className="mx-1">›</span>{" "}
          <span className="text-[var(--brand-gold)]">Workspace Access</span>
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
          Workspace Access
        </h1>

        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage workspase division and feature access for tenant provisioning.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

export function WorkspaceAccessLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading workspace access...
      </p>
    </div>
  );
}

export function WorkspaceAccessErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)]" />

        <div className="flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load workspace access
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceAccessKPICards({
  workspaces = [],
  modules = [],
  accessRows = [],
  selectedWorkspaceId,
}) {
  const selectedRows = selectedWorkspaceId
    ? accessRows.filter((row) => row.workspace_id === selectedWorkspaceId)
    : accessRows;

  const enabledCount = selectedRows.filter((row) => row.is_enabled).length;

  const divisionCount = new Set(modules.map((module) => module.divisionKey))
    .size;

  const cards = [
    {
      label: "Client Workspaces",
      value: workspaces.length,
      icon: Users,
      color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
    {
      label: "Divisions",
      value: divisionCount,
      icon: Grid3X3,
      color: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]",
    },
    {
      label: "Enabled Features",
      value: enabledCount,
      icon: CheckCircle2,
      color: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20",
    },
    {
      label: "Access Rules",
      value: accessRows.length,
      icon: ShieldCheck,
      color: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>

                <h3 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </h3>

                <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
                  Workspace access control
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WorkspaceSelector({
  workspaces = [],
  selectedWorkspaceId,
  selectedWorkspace,
  onWorkspaceChange,
  view,
  onViewChange,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Selected Workspace
        </p>

        <select
          className="mt-2 h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          value={selectedWorkspaceId}
          onChange={(event) => onWorkspaceChange(event.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>

        {selectedWorkspace && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {selectedWorkspace.company_name || selectedWorkspace.name} · Owner:{" "}
            {selectedWorkspace.owner || "Unassigned"}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onViewChange("grid")}
          className={
            view === "grid"
              ? "inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white"
              : "inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          }
        >
          <Grid3X3 className="h-4 w-4" />
          Grid
        </button>

        <button
          type="button"
          onClick={() => onViewChange("table")}
          className={
            view === "table"
              ? "inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white"
              : "inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
          }
        >
          <List className="h-4 w-4" />
          Table
        </button>
      </div>
    </div>
  );
}

export function DivisionAccessGrid({
  divisions = [],
  savingKey,
  openDivisions = {},
  onToggleDivisionOpen,
  onToggleDivision,
  onToggleFeature,
}) {
  return (
    <div className="space-y-4">
      {divisions.map((division) => {
        const DivisionIcon = division.icon;
        const isOpen = !!openDivisions[division.key];

        const enabledFeatures = division.items.filter(
          (item) => item.is_enabled
        );

        const activeAutoFeatures = division.items.filter(
          (item) => item.status === "active" && item.autoEnableWithDivision
        );

        const isDivisionEnabled =
          activeAutoFeatures.length > 0 &&
          activeAutoFeatures.every((item) => item.is_enabled);

        return (
          <div
            key={division.key}
            className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] p-5">
              <button
                type="button"
                onClick={() => onToggleDivisionOpen(division.key)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]">
                  {DivisionIcon ? (
                    <DivisionIcon className="h-5 w-5" />
                  ) : (
                    <Grid3X3 className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-[var(--text-primary)]">{division.title}</h3>

                  <p className="text-sm text-[var(--text-muted)]">
                    {enabledFeatures.length} of {division.items.length} features
                    enabled
                  </p>
                </div>

                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                )}
              </button>

              <button
                type="button"
                disabled={savingKey === division.key}
                onClick={() =>
                  onToggleDivision(division.key, !isDivisionEnabled)
                }
                className={
                  isDivisionEnabled
                    ? "text-[var(--success)] disabled:opacity-50"
                    : "text-[var(--text-muted)] disabled:opacity-50"
                }
                title="This toggles only active auto-enabled features."
              >
                {isDivisionEnabled ? (
                  <ToggleRight className="h-8 w-8" />
                ) : (
                  <ToggleLeft className="h-8 w-8" />
                )}
              </button>
            </div>

            {isOpen && (
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {division.items.map((feature) => {
                  const locked = isFeatureLocked(feature);
                  const disabled = savingKey === feature.key || locked;

                  return (
                    <div
                      key={feature.key}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)]">
                            {feature.label}
                          </h4>

                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {feature.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            onToggleFeature(feature.key, !feature.is_enabled)
                          }
                          className={
                            feature.is_enabled
                              ? "text-[var(--success)] disabled:opacity-40"
                              : "text-[var(--text-muted)] disabled:opacity-40"
                          }
                          title={
                            locked
                              ? "Planned/disabled features cannot be enabled from Workspace Access."
                              : "Toggle feature access"
                          }
                        >
                          {feature.is_enabled ? (
                            <ToggleRight className="h-8 w-8" />
                          ) : (
                            <ToggleLeft className="h-8 w-8" />
                          )}
                        </button>
                      </div>

                      <FeatureBadges feature={feature} />

                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        Last enabled: {formatDate(feature.enabled_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ModuleAccessGrid({ modules = [], savingKey, onToggle }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((feature) => {
        const locked = isFeatureLocked(feature);

        return (
          <div
            key={feature.key}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{feature.label}</h3>

                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </div>

              <button
                type="button"
                disabled={savingKey === feature.key || locked}
                onClick={() => onToggle(feature.key, !feature.is_enabled)}
                className={
                  feature.is_enabled
                    ? "text-[var(--success)] disabled:opacity-40"
                    : "text-[var(--text-muted)] disabled:opacity-40"
                }
                title={
                  locked
                    ? "Planned/disabled features cannot be enabled from Workspace Access."
                    : "Toggle feature access"
                }
              >
                {feature.is_enabled ? (
                  <ToggleRight className="h-8 w-8" />
                ) : (
                  <ToggleLeft className="h-8 w-8" />
                )}
              </button>
            </div>

            <FeatureBadges feature={feature} />

            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Last enabled: {formatDate(feature.enabled_at)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ModuleAccessTable({ modules = [], savingKey, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover-bg)] text-xs uppercase text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Feature</th>
            <th className="px-4 py-3">Division</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Enabled At</th>
            <th className="px-4 py-3">Access</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {modules.map((feature) => {
            const locked = isFeatureLocked(feature);

            return (
              <tr key={feature.key} className="hover:bg-[var(--hover-bg)]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {feature.label}
                  </p>
                  <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
                    {feature.description}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${moduleTypeClass(
                      feature.type
                    )}`}
                  >
                    {feature.type}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
                      feature.status
                    )}`}
                  >
                    {feature.status}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${accessSourceClass(
                      feature.access_source
                    )}`}
                  >
                    {feature.access_source || "manual"}
                  </span>
                </td>

                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(feature.enabled_at)}
                </td>

                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={savingKey === feature.key || locked}
                    onClick={() => onToggle(feature.key, !feature.is_enabled)}
                    className={
                      feature.is_enabled
                        ? "inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-[var(--success-soft)] px-3 py-2 text-sm font-semibold text-[var(--success)] disabled:opacity-40"
                        : "inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-40"
                    }
                    title={
                      locked
                        ? "Planned/disabled features cannot be enabled from Workspace Access."
                        : "Toggle feature access"
                    }
                  >
                    {feature.is_enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FeatureBadges({ feature }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${moduleTypeClass(
          feature.type
        )}`}
      >
        {feature.type}
      </span>

      <span
        className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(
          feature.status
        )}`}
      >
        {feature.status}
      </span>

      <span
        className={
          feature.is_enabled
            ? "rounded-full border border-green-500/20 bg-[var(--success-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--success)]"
            : "rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs font-bold uppercase text-[var(--text-muted)]"
        }
      >
        {feature.is_enabled ? "Enabled" : "Disabled"}
      </span>

      {feature.access_source && (
        <span
          className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${accessSourceClass(
            feature.access_source
          )}`}
        >
          {feature.access_source}
        </span>
      )}
    </div>
  );
}
