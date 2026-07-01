import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  Search,
} from "lucide-react";

import { supabase } from "../../config/supabaseClient";
import ClientLandingPages from "../Client/Modules/ClientLandingPages";

export default function AdminClientLandingPages() {
  const { workspaceId } = useParams();

  if (workspaceId) {
    return (
      <ClientLandingPages
        adminOverrideMode
        overrideWorkspaceId={workspaceId}
      />
    );
  }

  return <AdminClientLandingPageSelector />;
}

function AdminClientLandingPageSelector() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [allLandingPages, setAllLandingPages] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyWithPages, setOnlyWithPages] = useState(true);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState("");

  const selectedWorkspace = useMemo(() => {
    return (
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ||
      null
    );
  }, [workspaces, selectedWorkspaceId]);

  const landingPagesByWorkspace = useMemo(() => {
    return allLandingPages.reduce((acc, page) => {
      if (!page.workspace_id) return acc;

      acc[page.workspace_id] = acc[page.workspace_id] || [];
      acc[page.workspace_id].push(page);

      return acc;
    }, {});
  }, [allLandingPages]);

  const landingPages = useMemo(() => {
    return landingPagesByWorkspace[selectedWorkspaceId] || [];
  }, [landingPagesByWorkspace, selectedWorkspaceId]);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const pageCount = landingPagesByWorkspace[workspace.id]?.length || 0;

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
  }, [workspaces, search, onlyWithPages, landingPagesByWorkspace]);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);
        setError("");

        const [{ data, error: workspaceError }, { data: pageRows, error: pagesError }] =
          await Promise.all([
            supabase
              .from("workspaces")
              .select("id, name, workspace_type, status, owner_user_id, created_at")
              .eq("status", "active")
              .order("created_at", { ascending: false }),
            supabase
              .from("workspace_landing_pages")
              .select("id, workspace_id, title, slug, status, published, created_at")
              .neq("status", "archived")
              .order("created_at", { ascending: false }),
          ]);

        if (workspaceError) throw workspaceError;
        if (pagesError) throw pagesError;
        if (!mounted) return;

        const rows = data || [];
        const pages = pageRows || [];
        const workspaceIdsWithPages = new Set(pages.map((page) => page.workspace_id));
        const firstWorkspaceWithPages = rows.find((workspace) =>
          workspaceIdsWithPages.has(workspace.id)
        );

        setWorkspaces(rows);
        setAllLandingPages(pages);

        if (firstWorkspaceWithPages?.id || rows[0]?.id) {
          setSelectedWorkspaceId(firstWorkspaceWithPages?.id || rows[0].id);
        }
      } catch (err) {
        console.error("Admin landing workspace load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load client workspaces.");
        }
      } finally {
        if (mounted) {
          setLoadingWorkspaces(false);
        }
      }
    }

    loadWorkspaces();

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
            Client Landing Pages
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Select a client workspace, choose a landing page, then edit it using
            the same client builder.
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
            Show only clients with landing pages
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
            {loadingWorkspaces ? (
              <div className="p-4 text-sm text-[var(--text-secondary)]">
                Loading workspaces...
              </div>
            ) : (
              filteredWorkspaces.map((workspace) => {
                const isActive = workspace.id === selectedWorkspaceId;

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
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
                        {workspace.id}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase text-[var(--text-muted)]">
                        {workspace.workspace_type || "workspace"} ·{" "}
                        {workspace.status || "unknown"} ·{" "}
                        {landingPagesByWorkspace[workspace.id]?.length || 0} page(s)
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
                Landing pages owned by this workspace.
              </p>
            </div>

            {selectedWorkspaceId && (
              <Link
                to={`/Admin/ClientLandingPages/${selectedWorkspaceId}`}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--brand-gold)] px-4 py-3 text-sm font-black text-black transition hover:bg-[var(--brand-gold-hover)]"
              >
                Open Builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="p-5">
            {loadingPages ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-6 text-sm text-[var(--text-secondary)]">
                Loading landing pages...
              </div>
            ) : landingPages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                <h3 className="mt-4 font-black text-[var(--text-primary)]">
                  No landing pages yet
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Open the builder to create the first landing page for this
                  client.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {landingPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-[var(--text-primary)]">
                          {page.title || "Untitled Landing Page"}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
                            page.published
                              ? "border-green-500/20 bg-green-500/10 text-green-500"
                              : "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                          }`}
                        >
                          {page.published ? "Published" : "Draft"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        /l/{page.slug || "no-slug"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {page.slug && (
                        <a
                          href={`/l/${page.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                        >
                          Preview
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      )}

                      <Link
                        to={`/Admin/ClientLandingPages/${selectedWorkspaceId}`}
                        className="inline-flex items-center rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)]"
                      >
                        Edit
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
