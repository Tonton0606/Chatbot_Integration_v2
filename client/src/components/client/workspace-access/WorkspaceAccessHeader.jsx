import { RefreshCw, ShieldCheck, Users } from "lucide-react";

export default function WorkspaceAccessHeader({
  workspace,
  workspaceRole,
  activeTab,
  onTabChange,
  onRefresh,
}) {
  const tabs = [
    {
      key: "invitations",
      label: "Member Invitations",
      description: "Invite employees into this workspace.",
      icon: Users,
    },
    {
      key: "access",
      label: "Member Access",
      description: "Control which modules each member can open.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-5 border-b border-[var(--border-color)] pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Client <span className="mx-1">›</span>{" "}
            <span className="text-[var(--brand-gold)]">Workspace Access</span>
          </p>

          <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
            Workspace Access
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Manage employee invitations and member-level module access for{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {workspace?.name || "this workspace"}
            </span>
            .
          </p>

          <div className="mt-3 inline-flex rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
            {workspaceRole || "member"} access
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-[var(--hover-bg)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={[
                "rounded-2xl border p-4 text-left transition-all",
                isActive
                  ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] shadow-sm"
                  : "border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--hover-bg)]",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-2xl border",
                    isActive
                      ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold)] text-white"
                      : "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">
                    {tab.label}
                  </h3>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {tab.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
