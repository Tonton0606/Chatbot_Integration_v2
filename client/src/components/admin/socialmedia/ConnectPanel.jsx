import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Building2,
  Search,
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Plug,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";

function normalizeId(value) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function getPageId(page) {
  return normalizeId(page?.pageId) || normalizeId(page?.page_id);
}

function getPageName(page) {
  return (
    page?.pageName ||
    page?.fb_name ||
    page?.page_name ||
    getPageId(page) ||
    "Facebook Page"
  );
}

const Admin_FacebookConnect = lazy(() =>
  import("../../../pages/Admin/Admin_FacebookConnect.jsx")
);
const ClientFacebookConnect = lazy(() =>
  import("../../../pages/Client/Modules/ClientFacebookConnect.jsx")
);

export default function ConnectPanel({ overrideWorkspaceId = "" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState(overrideWorkspaceId ? "override" : "admin");
  const [workspaces, setWorkspaces] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(overrideWorkspaceId);
  const [search, setSearch] = useState("");
  const [onlyWithPages, setOnlyWithPages] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pagesByWorkspace = useMemo(() => {
    return pages.reduce((acc, page) => {
      const wsId = normalizeId(page?.workspace_id || page?.workspaceId);
      if (!wsId) return acc;
      acc[wsId] = acc[wsId] || [];
      acc[wsId].push(page);
      return acc;
    }, {});
  }, [pages]);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspaces.filter((workspace) => {
      const wsId = normalizeId(workspace.id);
      const pageCount = pagesByWorkspace[wsId]?.length || 0;
      if (onlyWithPages && pageCount === 0) return false;
      if (!query) return true;
      return [workspace.name, workspace.id, workspace.workspace_type, workspace.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [workspaces, search, onlyWithPages, pagesByWorkspace]);

  useEffect(() => {
    if (overrideWorkspaceId) {
      setMode("override");
      setSelectedWorkspaceId(overrideWorkspaceId);
      return;
    }
    setMode("admin");
  }, [overrideWorkspaceId]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const { data: workspaceRows, error: wsError } = await supabase
          .from("workspaces")
          .select("id, name, workspace_type, status, owner_user_id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (wsError) throw wsError;
        if (!mounted) return;

        const statusData = await facebookIntegrationService.getStatus();
        if (!mounted) return;

        const allPages = Array.isArray(statusData?.connectedPages)
          ? statusData.connectedPages
          : [];
        const nextPages = allPages
          .map((page) => {
            const wsId = normalizeId(
              page.connectedWorkspaceId || page.workspace_id || page.workspaceId
            );
            if (!wsId) return null;
            return { ...page, workspace_id: wsId, workspaceId: wsId };
          })
          .filter(Boolean);

        setWorkspaces(workspaceRows || []);
        setPages(nextPages);
      } catch (err) {
        setError(err.message || "Failed to load Facebook Connect data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (mode === "override") loadData();
    return () => { mounted = false; };
  }, [mode]);

  const openOverride = (wsId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "connect");
    next.set("workspace", wsId);
    setSearchParams(next, { replace: true });
    setMode("override");
    setSelectedWorkspaceId(wsId);
  };

  const backToList = () => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "connect");
    next.delete("workspace");
    setSearchParams(next, { replace: true });
    setMode("admin");
    setSelectedWorkspaceId("");
  };

  if (mode === "override" && selectedWorkspaceId) {
    return (
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm font-bold">
          <button
            onClick={backToList}
            className="text-[var(--text-secondary)] transition hover:text-[var(--brand-gold)]"
          >
            Connections
          </button>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--brand-gold)]">
            Workspace Override
          </span>
        </nav>
        <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-secondary)]">Loading...</div>}>
          <ClientFacebookConnect
            adminOverrideMode
            overrideWorkspaceId={selectedWorkspaceId}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Channel Connections
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage Facebook page connections, channel configs, and admin overrides.
          </p>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client workspace..."
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          />
          <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={onlyWithPages}
              onChange={(e) => setOnlyWithPages(e.target.checked)}
            />
            Show only clients with Facebook pages
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="border-b border-[var(--border-color)] p-5">
            <h3 className="font-black text-[var(--text-primary)]">
              Client Workspaces
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {filteredWorkspaces.length} workspace(s)
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {loading ? (
              <div className="p-4 text-sm text-[var(--text-secondary)]">
                Loading workspaces...
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="p-4 text-sm text-[var(--text-secondary)]">
                No matching client workspaces found.
              </div>
            ) : (
              filteredWorkspaces.map((workspace) => {
                const wsId = normalizeId(workspace.id);
                const isActive = wsId === selectedWorkspaceId;
                const pageCount = pagesByWorkspace[wsId]?.length || 0;
                return (
                  <button
                    key={wsId}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(wsId)}
                    className={`mb-2 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]"
                        : "border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--brand-gold-border)]"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--hover-bg)]">
                      <Building2 className="h-5 w-5 text-[var(--brand-gold)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-[var(--text-primary)]">
                        {workspace.name || "Unnamed Workspace"}
                      </h4>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                        {wsId}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                        {workspace.workspace_type || "workspace"} · {pageCount} page(s)
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border-color)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-black text-[var(--text-primary)]">
                {workspaces.find((w) => normalizeId(w.id) === selectedWorkspaceId)?.name || "Select a client"}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Facebook Connect pages and admin override.
              </p>
            </div>
            {selectedWorkspaceId && (
              <button
                onClick={() => openOverride(selectedWorkspaceId)}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-gold)] px-4 py-3 text-sm font-black text-black transition hover:bg-[var(--brand-gold-hover)]"
              >
                Open Override
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-5">
            {(pagesByWorkspace[selectedWorkspaceId] || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center">
                <Plug className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <h4 className="mt-4 font-black text-[var(--text-primary)]">
                  No Facebook pages assigned
                </h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Assign a Facebook page to this workspace from Admin Facebook Connect first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(pagesByWorkspace[selectedWorkspaceId] || []).map((page) => {
                  const pid = getPageId(page);
                  return (
                    <div
                      key={`${selectedWorkspaceId}-${pid}`}
                      className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-black text-[var(--text-primary)]">
                            {getPageName(page)}
                          </h4>
                          <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-black uppercase text-[var(--brand-gold)]">
                            Connected
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Page ID: {pid || "Missing"}
                        </p>
                      </div>
                      <button
                        onClick={() => openOverride(selectedWorkspaceId)}
                        className="inline-flex items-center rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)]"
                      >
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <h3 className="mb-4 font-black text-[var(--text-primary)]">
          Admin Facebook Connect — Page Setup
        </h3>
        <Suspense fallback={<div className="p-4 text-sm text-[var(--text-secondary)]">Loading...</div>}>
          <Admin_FacebookConnect />
        </Suspense>
      </div>
    </div>
  );
}
