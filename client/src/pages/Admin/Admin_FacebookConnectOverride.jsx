import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  MessageSquare,
  Search,
} from "lucide-react";

import { supabase } from "../../config/supabaseClient";
import facebookIntegrationService from "../../services/marketing/facebook_connect";
import ClientFacebookConnect from "../Client/Modules/ClientFacebookConnect";

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

function AdminOverrideBreadcrumb({ currentLabel = "Selected Workspace" }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold"
    >
      <span className="text-[var(--text-secondary)]">Social Media Hub</span>

      <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />

      <Link
        to="/Admin/FacebookConnectOverride"
        className="text-[var(--text-secondary)] transition hover:text-[var(--brand-gold)]"
      >
        Facebook Override
      </Link>

      <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />

      <span className="text-[var(--brand-gold)]">
        {currentLabel || "Selected Workspace"}
      </span>
    </nav>
  );
}

function AdminFacebookConnectDetail({ workspaceId }) {
  const [workspaceName, setWorkspaceName] = useState(workspaceId);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspaceName() {
      try {
        const { data, error } = await supabase
          .from("workspaces")
          .select("name")
          .eq("id", workspaceId)
          .maybeSingle();

        if (!mounted) return;

        if (!error && data?.name) {
          setWorkspaceName(data.name);
        }
      } catch (err) {
        console.error("Admin Facebook override workspace name error:", err);
      }
    }

    if (workspaceId) {
      loadWorkspaceName();
    }

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  return (
    <div className="erp-page-container">
      <AdminOverrideBreadcrumb currentLabel={workspaceName} />

      <ClientFacebookConnect
        adminOverrideMode
        overrideWorkspaceId={workspaceId}
      />
    </div>
  );
}

export default function Admin_FacebookConnectOverride() {
  const { workspaceId } = useParams();

  if (workspaceId) {
    return <AdminFacebookConnectDetail workspaceId={workspaceId} />;
  }

  return <AdminFacebookConnectSelector />;
}

function AdminFacebookConnectSelector() {
  const [workspaces, setWorkspaces] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [search, setSearch] = useState("");
  const [onlyWithPages, setOnlyWithPages] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pagesByWorkspace = useMemo(() => {
    return pages.reduce((acc, page) => {
      const workspaceId = normalizeId(page?.workspace_id || page?.workspaceId);
      if (!workspaceId) return acc;

      acc[workspaceId] = acc[workspaceId] || [];
      acc[workspaceId].push(page);

      return acc;
    }, {});
  }, [pages]);

  const selectedWorkspace = useMemo(() => {
    return (
      workspaces.find(
        (workspace) => normalizeId(workspace.id) === selectedWorkspaceId
      ) || null
    );
  }, [workspaces, selectedWorkspaceId]);

  const selectedPages = useMemo(() => {
    return pagesByWorkspace[selectedWorkspaceId] || [];
  }, [pagesByWorkspace, selectedWorkspaceId]);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const workspaceId = normalizeId(workspace.id);
      const pageCount = pagesByWorkspace[workspaceId]?.length || 0;

      if (onlyWithPages && pageCount === 0) return false;
      if (!query) return true;

      return [
        workspace.name,
        workspace.id,
        workspace.workspace_type,
        workspace.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [workspaces, search, onlyWithPages, pagesByWorkspace]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const { data: workspaceRows, error: workspaceError } = await supabase
          .from("workspaces")
          .select("id, name, workspace_type, status, owner_user_id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (workspaceError) throw workspaceError;
        if (!mounted) return;

        const nextWorkspaces = workspaceRows || [];

        const statusData = await facebookIntegrationService.getStatus();
        
        if (!mounted) return;

        const allPages = Array.isArray(statusData?.connectedPages) 
          ? statusData.connectedPages 
          : [];

        const nextPages = allPages
          .map((page) => {
            const workspaceId = normalizeId(page.connectedWorkspaceId || page.workspace_id || page.workspaceId);
            if (!workspaceId) return null;
            return {
              ...page,
              workspace_id: workspaceId,
              workspaceId: workspaceId,
            };
          })
          .filter(Boolean);

        const workspaceIdsWithPages = new Set(
          nextPages
            .map((page) => normalizeId(page.workspace_id || page.workspaceId))
            .filter(Boolean)
        );

        const firstWorkspaceWithPages = nextWorkspaces.find((workspace) =>
          workspaceIdsWithPages.has(normalizeId(workspace.id))
        );

        setWorkspaces(nextWorkspaces);
        setPages(nextPages);
        setSelectedWorkspaceId(
          normalizeId(firstWorkspaceWithPages?.id) ||
            normalizeId(nextWorkspaces[0]?.id) ||
            ""
        );
      } catch (err) {
        console.error("Admin Facebook override load error:", err);
        setError(err.message || "Failed to load Facebook Connect clients.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="erp-page-container">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--brand-gold)]">
            Admin Override
          </p>
          <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            Facebook Connect Override
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Select a client workspace, then open the same Facebook Connect page
            the client uses.
          </p>
        </div>

        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search client workspace..."
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
          />

          <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={onlyWithPages}
              onChange={(event) => setOnlyWithPages(event.target.checked)}
            />
            Show only clients with Facebook pages
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="border-b border-[var(--border-color)] p-5">
            <h2 className="font-black text-[var(--text-primary)]">
              Client Workspaces
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {filteredWorkspaces.length} workspace(s)
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
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
                const workspaceId = normalizeId(workspace.id);
                const isActive = workspaceId === selectedWorkspaceId;
                const pageCount = pagesByWorkspace[workspaceId]?.length || 0;

                return (
                  <button
                    key={workspaceId}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(workspaceId)}
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
                      <h3 className="truncate font-bold text-[var(--text-primary)]">
                        {workspace.name || "Unnamed Workspace"}
                      </h3>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                        {workspaceId}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                        {workspace.workspace_type || "workspace"} ·{" "}
                        {workspace.status || "unknown"} · {pageCount} page(s)
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
              <h2 className="font-black text-[var(--text-primary)]">
                {selectedWorkspace?.name || "Select a client"}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Facebook Connect pages owned by this workspace.
              </p>
            </div>

            {selectedWorkspaceId && (
              <Link
                to={`/Admin/FacebookConnectOverride/${selectedWorkspaceId}`}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-gold)] px-4 py-3 text-sm font-black text-black transition hover:bg-[var(--brand-gold-hover)]"
              >
                Open Facebook Connect
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="p-5">
            {selectedPages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <h3 className="mt-4 font-black text-[var(--text-primary)]">
                  No Facebook pages assigned
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Assign a Facebook page to this workspace from Admin Facebook
                  Connect first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPages.map((page) => {
                  const pageId = getPageId(page);

                  return (
                    <div
                      key={`${selectedWorkspaceId}-${pageId}`}
                      className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-black text-[var(--text-primary)]">
                            {getPageName(page)}
                          </h3>
                          <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-black uppercase text-[var(--brand-gold)]">
                            Connected
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Page ID: {pageId || "Missing"}
                        </p>
                      </div>

                      <Link
                        to={`/Admin/FacebookConnectOverride/${selectedWorkspaceId}`}
                        className="inline-flex items-center rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)]"
                      >
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
