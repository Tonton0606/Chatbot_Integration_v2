import {
  Briefcase,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  Layers,
  MapPin,
  Monitor,
  Palette,
  PanelBottom,
  Plug,
  Save,
  Search,
  Send,
  Settings,
  Smartphone,
  Tablet,
} from "lucide-react";

const tabs = [
  { id: "general", label: "General", description: "Basic details & SEO", icon: Settings, group: "Page" },
  { id: "sections", label: "Sections", description: "Manage page sections", icon: Layers, group: "Content" },
  { id: "map", label: "Map / Location", description: "Location, marker, and contact details", icon: MapPin, group: "Content" },
  { id: "services", label: "Services", description: "Configure service cards", icon: Briefcase, group: "Content" },
  { id: "booking", label: "Booking", description: "Booking form and inquiry settings", icon: Calendar, group: "Conversion" },
  { id: "integrations", label: "Integrations", description: "CRM, booking, and automation mapping", icon: Plug, group: "Conversion" },
  { id: "theme", label: "Theme", description: "Colors & layout styles", icon: Palette, group: "Design" },
  { id: "footer", label: "Footer", description: "Configure workspace footer", icon: PanelBottom, group: "Design" },
  { id: "publish", label: "Publish", description: "Custom domain & launch", icon: Send, group: "Launch" },
];

const previewModes = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

const groupedTabs = tabs.reduce((groups, tab) => {
  if (!groups[tab.group]) groups[tab.group] = [];
  groups[tab.group].push(tab);
  return groups;
}, {});

export default function LandingBuilderShell({
  workspace,
  landingPage,
  activeTab,
  onChangeTab,
  previewMode,
  onChangePreviewMode,
  previewVisible,
  onTogglePreview,
  saving,
  publicUrl,
  pageControls = null,
  children,
  preview,
}) {
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
  const activeLabel = activeTabConfig?.label || "Builder";
  const activeDescription =
    activeTabConfig?.description || "Edit content and settings.";

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--brand-gold)]">
                Marketing / Visual Landing Builder
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="truncate text-xl font-black tracking-tight text-[var(--text-primary)] md:text-2xl">
                  {landingPage?.title || "Landing Page Builder"}
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                    landingPage?.published
                      ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
                      : "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                  }`}
                >
                  {landingPage?.published ? "Published" : "Draft"}
                </span>
              </div>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Workspace:{" "}
                <span className="font-bold text-[var(--text-primary)]">
                  {workspace?.name || workspace?.title || "Current Workspace"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1">
                {previewModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = previewMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onChangePreviewMode(mode.id)}
                      className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold transition ${
                        isActive
                          ? "bg-[var(--brand-gold)] text-black"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                      }`}
                      title={mode.label}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onTogglePreview}
                className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-card)]"
              >
                {previewVisible ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {previewVisible ? "Hide Canvas" : "Show Canvas"}
              </button>

              {publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-card)]"
                >
                  <Globe2 className="mr-2 h-4 w-4" />
                  Live View
                </a>
              )}

              <button
                type="button"
                disabled={saving}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black transition hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Auto-save"}
              </button>
            </div>
          </div>

          {pageControls && (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
              {pageControls}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1920px] gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)_520px]">
        <aside className="min-h-[calc(100vh-180px)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] p-4">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <Search className="h-4 w-4" />
              <span>Builder Tree</span>
            </div>
          </div>

          <nav className="space-y-5 p-4">
            {Object.entries(groupedTabs).map(([group, groupTabs]) => (
              <div key={group}>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {group}
                </p>

                <div className="space-y-1">
                  {groupTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChangeTab(tab.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] text-[var(--text-primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-[var(--brand-gold)] text-black"
                              : "bg-[var(--bg-main)]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black">
                            {tab.label}
                          </span>
                          <span className="block truncate text-xs opacity-75">
                            {tab.description}
                          </span>
                        </span>

                        {isActive && (
                          <ChevronRight className="h-4 w-4 text-[var(--brand-gold)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>

              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                {previewMode === "desktop"
                  ? "Desktop Canvas"
                  : previewMode === "tablet"
                    ? "Tablet Canvas"
                    : "Mobile Canvas"}
              </div>
            </div>

            <p className="hidden text-xs font-bold text-[var(--text-secondary)] md:block">
              Visual preview only — editing logic unchanged
            </p>
          </div>

          <div className="min-h-[calc(100vh-235px)] overflow-auto bg-[var(--bg-main)]">
            {previewVisible ? (
              preview
            ) : (
              <div className="flex min-h-[520px] items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
                  <EyeOff className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
                  <h3 className="mt-3 font-black text-[var(--text-primary)]">
                    Canvas hidden
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Show the canvas to preview the current landing page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-[calc(100vh-180px)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold-soft)]">
                <FileText className="h-5 w-5 text-[var(--brand-gold)]" />
              </div>

              <div>
                <h2 className="font-black text-[var(--text-primary)]">
                  {activeLabel} Inspector
                </h2>

                <p className="text-sm text-[var(--text-secondary)]">
                  {activeDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-4">
            {children}
          </div>
        </aside>
      </main>
    </div>
  );
}
