import { useState, useEffect, useMemo, useCallback } from "react";
import { Globe, Copy, Check, Send, Loader2, AlertCircle, ExternalLink, Save } from "lucide-react";
import {
  getSelectableWorkspaces,
  getConnectableLandingPages,
  getLandingActivity,
  buildEmbedSnippet,
  sendTestSubmission,
  saveLandingWebsite,
  websiteUrl,
  getCaptureApiBase,
} from "../../services/marketing/websiteConnect";
import {
  getStoredActiveClientWorkspaceId,
  setActiveClientWorkspaceId,
} from "../../services/workspaceResolver";

function getInitialWorkspaceId(prop) {
  return (
    prop ||
    getStoredActiveClientWorkspaceId() ||
    localStorage.getItem("workspaceId") ||
    localStorage.getItem("workspace_id") ||
    ""
  );
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

const SELECT_CLASS =
  "w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm px-3 py-2 text-gray-900 dark:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold,#f59e0b)]/40";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold px-4 py-2.5 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const BTN_PRIMARY =
  `${BTN_BASE} bg-[var(--brand-gold,#f59e0b)] text-white shadow-sm hover:brightness-105 focus-visible:ring-[var(--brand-gold,#f59e0b)]/50`;

const BTN_SUCCESS =
  `${BTN_BASE} bg-green-600 text-white shadow-sm focus-visible:ring-green-500/50`;

const BTN_SECONDARY =
  `${BTN_BASE} border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:ring-gray-300`;

export default function WebsiteConnectManager({ workspaceId: workspaceIdProp } = {}) {
  const apiBase = useMemo(() => getCaptureApiBase(), []);

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(() => getInitialWorkspaceId(workspaceIdProp));
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);
  const [activity, setActivity] = useState(null);
  const [website, setWebsite] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await getSelectableWorkspaces();
        setWorkspaces(list);
        setWorkspaceId((prev) =>
          prev && list.some((w) => w.id === prev) ? prev : list[0]?.id || prev || ""
        );
      } catch {
        /* selector stays on the active workspace */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId) { setPages([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getConnectableLandingPages(workspaceId);
      setPages(data);
      setSelectedId((prev) =>
        prev && data.some((p) => p.id === prev)
          ? prev
          : data.find((p) => p.is_live)?.id || data[0]?.id || ""
      );
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const selected = pages.find((p) => p.id === selectedId) || null;

  // Prefill the website field from the selected page's saved address.
  useEffect(() => {
    setWebsite(selected?.custom_domain || "");
  }, [selectedId, selected?.custom_domain]);

  const loadActivity = useCallback(async () => {
    if (!workspaceId || !selectedId) { setActivity(null); return; }
    try {
      setActivity(await getLandingActivity({ workspaceId, landingPageId: selectedId }));
    } catch {
      setActivity(null);
    }
  }, [workspaceId, selectedId]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const snippet = useMemo(
    () => buildEmbedSnippet({ slug: selected?.slug, apiBase }),
    [selected, apiBase]
  );

  const changeWorkspace = (id) => {
    setWorkspaceId(id);
    if (id) setActiveClientWorkspaceId(id);
    setPages([]);
    setSelectedId("");
    setActivity(null);
    setStatus(null);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus({ ok: false, message: "Copy failed — select the code and copy it manually." });
    }
  };

  const runTest = async () => {
    if (!selected?.slug) return;
    setTesting(true);
    setStatus(null);
    try {
      await sendTestSubmission({ slug: selected.slug, apiBase });
      setStatus({ ok: true, message: "Test lead received — your connection works." });
      loadActivity();
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const saveWebsite = async () => {
    if (!selected?.id) return;
    setSavingWebsite(true);
    setStatus(null);
    try {
      const saved = await saveLandingWebsite({ landingPageId: selected.id, website });
      setPages((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, custom_domain: saved.custom_domain } : p))
      );
      setWebsite(saved.custom_domain || "");
      setStatus({ ok: true, message: "Website saved." });
    } catch (err) {
      setStatus({ ok: false, message: err.message || "Could not save website." });
    } finally {
      setSavingWebsite(false);
    }
  };

  const openWebsite = () => {
    const url = websiteUrl(website);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const connected = Boolean(activity?.connected);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--brand-gold,#f59e0b)]/10 text-[var(--brand-gold,#f59e0b)] flex items-center justify-center flex-shrink-0">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Connect Your Website</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add one snippet to your site — every form submission becomes a lead in your CRM.
          </p>
        </div>
      </div>

      {/* Workspace — only when there's a choice */}
      {workspaces.length > 1 && (
        <select value={workspaceId} onChange={(e) => changeWorkspace(e.target.value)} className={SELECT_CLASS}>
          {!workspaceId && <option value="">Select a workspace…</option>}
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name || w.id}</option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : !workspaceId ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-white/15 p-8 text-center text-sm text-gray-500">
          Select a workspace to get your website code.
        </p>
      ) : pages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-white/15 p-8 text-center text-sm text-gray-500">
          Create and publish a landing page first, then come back to connect your website.
        </p>
      ) : (
        <>
          {/* Landing page — only when there's more than one */}
          {pages.length > 1 && (
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setStatus(null); }}
              className={SELECT_CLASS}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.title || p.slug || "Untitled"}</option>
              ))}
            </select>
          )}

          {/* Step 1 — website address */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-gold,#f59e0b)] text-white text-[11px] font-bold">1</span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your website address</h2>
                <p className="text-xs text-gray-500">The site where your fill-up form lives.</p>
              </div>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="flex flex-1 items-center rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3">
                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  inputMode="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveWebsite(); }}
                  placeholder="www.yourwebsite.com"
                  className="w-full bg-transparent text-sm px-2 py-2.5 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                onClick={openWebsite}
                disabled={!website.trim()}
                title="Open website"
                className={`${BTN_SECONDARY} px-3`}
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={saveWebsite}
                disabled={savingWebsite || !selected?.id || website.trim() === (selected?.custom_domain || "")}
                className={`${BTN_PRIMARY} px-4`}
              >
                {savingWebsite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>

          {/* Step 2 — copy the code */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-gold,#f59e0b)] text-white text-[11px] font-bold">2</span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Copy your website code</h2>
                <p className="text-xs text-gray-500">Paste it once before the closing &lt;/body&gt; tag. It auto-captures your fill-up form — no other setup needed.</p>
              </div>
            </div>
            <div className="relative">
              <pre className="text-[11px] leading-relaxed bg-gray-950 text-gray-100 rounded-lg p-4 pt-4 overflow-x-auto max-h-44">
                <code>{snippet}</code>
              </pre>
            </div>
            <button onClick={copyCode} className={`w-full ${copied ? BTN_SUCCESS : BTN_PRIMARY}`}>
              {copied ? <><Check className="w-4 h-4" /> Copied to clipboard</> : <><Copy className="w-4 h-4" /> Copy code</>}
            </button>
            <p className="text-[11px] text-gray-400">
              Capturing the wrong form? Add <code className="font-mono">data-hermes-form</code> to your fill-up form tag to target only that one.
            </p>
          </div>

          {/* Step 3 — verify */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-gold,#f59e0b)] text-white text-[11px] font-bold">3</span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Verify it works</h2>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`relative flex h-2.5 w-2.5 flex-shrink-0`}>
                  {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-gray-300 dark:bg-white/20"}`} />
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
                  {!selected?.is_live
                    ? "Publish your landing page to start capturing."
                    : connected
                      ? `Connected — last lead ${timeAgo(activity?.lastAt)}`
                      : "Not connected yet — submit your form once to activate."}
                </p>
              </div>
              <button onClick={runTest} disabled={testing || !selected?.is_live} className={`${BTN_SECONDARY} flex-shrink-0`}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send test
              </button>
            </div>
            {status && (
              <p className={`flex items-center gap-1.5 text-sm ${status.ok ? "text-green-600" : "text-red-600"}`}>
                {status.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {status.message}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
