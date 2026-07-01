import { useState, useEffect, useCallback } from "react";
import {
  Facebook,
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Zap,
  Bot,
  Megaphone,
  Clock,
  MessageSquare,
  Settings,
  AlertCircle,
  RefreshCw,
  Instagram,
  Music2,
  ShoppingBag,
  Store,
  X,
  Link2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FacebookConnectCard } from "./ChatbotBuilder.jsx";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import { omniChannelService } from "../../../services/omnichannel";
import { HERMES_INTERNAL_WORKSPACE_ID } from "../../../services/workspaceResolver";

function getWorkspaceId() {
  return (
    localStorage.getItem("exponify_active_client_workspace_id") ||
    localStorage.getItem("workspaceId") ||
    localStorage.getItem("workspace_id") ||
    HERMES_INTERNAL_WORKSPACE_ID
  );
}

const SETUP_STEPS = [
  { id: "connect", label: "Connect a Facebook Page", icon: Facebook, desc: "Authenticate with Facebook and select a page to automate." },
  { id: "greeting", label: "Set up Welcome Message", icon: MessageSquare, desc: "Greet users automatically when they start a conversation." },
  { id: "ai", label: "Configure AI Personality", icon: Bot, desc: "Define how your chatbot talks — tone, language, knowledge." },
  { id: "rules", label: "Add Auto-Reply Rules", icon: Zap, desc: "Trigger instant replies on keywords like PRICE, ORDER, HOURS." },
  { id: "sequences", label: "Create Follow-up Sequences", icon: Clock, desc: "Send timed drip messages to re-engage leads over days." },
  { id: "broadcasts", label: "Launch Broadcast Campaigns", icon: Megaphone, desc: "Mass-message all conversations with promos and updates." },
];

const OMNI_CHANNELS = [
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    desc: "Auto-reply to Instagram DMs and comments",
    placeholder: "Instagram Business Account ID",
    docs: "https://developers.facebook.com/docs/instagram-platform",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: Music2,
    color: "#000000",
    desc: "Auto-reply to TikTok messages and comments",
    placeholder: "TikTok Business Account ID",
    docs: "https://business-api.tiktok.com/portal/docs",
  },
  {
    key: "shopee",
    label: "Shopee",
    icon: ShoppingBag,
    color: "#EE4D2D",
    desc: "Auto-reply to Shopee buyer chat messages",
    placeholder: "Shopee Shop ID",
    docs: "https://open.shopee.com/documents",
  },
  {
    key: "lazada",
    label: "Lazada",
    icon: Store,
    color: "#0F146D",
    desc: "Auto-reply to Lazada buyer chat messages",
    placeholder: "Lazada Seller ID",
    docs: "https://open.lazada.com",
  },
];

function OmniChannelConnectCard({ channel, workspaceId, connected, onRefresh }) {
  const { key, label, icon: Icon, color, desc, placeholder, docs } = channel;
  const [showForm, setShowForm] = useState(false);
  const [pageId, setPageId] = useState("");
  const [pageName, setPageName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleConnect = async () => {
    if (!pageId) return;
    setSaving(true);
    setMsg("");
    try {
      await omniChannelService.saveChannel({
        channel: key,
        pageId,
        pageName: pageName || label,
        accessToken,
        chatbotEnabled: true,
        commentAutoreplyEnabled: true,
      });
      setMsg("Connected successfully.");
      setShowForm(false);
      setPageId("");
      setPageName("");
      setAccessToken("");
      if (onRefresh) onRefresh();
    } catch (err) {
      setMsg(err.message || "Failed to connect.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!connected?.id) return;
    setSaving(true);
    setMsg("");
    try {
      await omniChannelService.disconnectChannel(connected.id);
      setMsg("Disconnected.");
      if (onRefresh) onRefresh();
    } catch (err) {
      setMsg(err.message || "Failed to disconnect.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div className={`rounded-2xl border bg-[var(--bg-card)] p-4 transition-colors ${connected ? "border-[var(--success)]/30" : "border-[var(--border-color)]"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-[var(--text-primary)]">{label}</h4>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--success)]">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="rounded-full bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--text-muted)]">Not Connected</span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{desc}</p>
          {connected && (
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {connected.page_name || connected.pageName || connected.page_id || connected.pageId}
              {connected.chatbot_enabled !== false && " · Bot Active"}
            </p>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${msg.includes("Failed") || msg.includes("error") ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>{msg}</div>
      )}

      {showForm && !connected && (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
          <input
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
          <input
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Access token (optional for some channels)"
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">Cancel</button>
            <button onClick={handleConnect} disabled={!pageId || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}Connect
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <a href={docs} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--brand-gold)] transition-colors">
          Setup Guide →
        </a>
        {connected ? (
          <button onClick={handleDisconnect} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-[var(--danger)]/30 px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}Disconnect
          </button>
        ) : (
          !showForm && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors">
              <Link2 className="h-3.5 w-3.5" />Connect
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function FacebookConnectModule({ workspaceId: propWorkspaceId, onRefresh, onNavigateTab }) {
  const workspaceId = propWorkspaceId || getWorkspaceId();
  const [status, setStatus] = useState(null);
  const [pageSettings, setPageSettings] = useState(null);
  const [counts, setCounts] = useState({ rules: 0, sequences: 0, broadcasts: 0 });
  const [loading, setLoading] = useState(true);
  const [omniChannels, setOmniChannels] = useState([]);
  const [viewingPage, setViewingPage] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalPage, setGlobalPage] = useState(1);
  const itemsPerPage = 3;

  const fetchStatus = useCallback(async () => {
    try {
      const data = await facebookIntegrationService.getStatus();
      setStatus(data);
      return data;
    } catch {
      setStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOmniChannels = useCallback(async () => {
    try {
      const data = await omniChannelService.getChannels();
      setOmniChannels(data.channels || []);
    } catch {
      setOmniChannels([]);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!workspaceId) return;
    const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const apiBase = base ? (base.endsWith("/api") ? base : `${base}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
    try {
      const token = (await import("../../../config/supabaseClient")).supabase.auth.getSession();
      const session = (await token).data?.session;
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const [rulesRes, seqRes, bcRes] = await Promise.all([
        fetch(`${apiBase}/webhooks/facebook/auto-reply-rules/${workspaceId}`, { headers }),
        fetch(`${apiBase}/webhooks/facebook/flow-sequences/${workspaceId}`, { headers }),
        fetch(`${apiBase}/webhooks/facebook/broadcasts/${workspaceId}`, { headers }),
      ]);
      const [rulesData, seqData, bcData] = await Promise.all([rulesRes.json(), seqRes.json(), bcRes.json()]);
      setCounts({
        rules: (rulesData.rules || []).length,
        sequences: (seqData.sequences || []).length,
        broadcasts: (bcData.campaigns || bcData.broadcasts || []).length,
      });
    } catch {
      // silent — checklist shows incomplete state
    }
  }, [workspaceId]);

  const fetchPageSettings = useCallback(async (pages) => {
    if (!workspaceId || !pages || pages.length === 0) return;
    const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const apiBase = base ? (base.endsWith("/api") ? base : `${base}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
    try {
      const token = (await import("../../../config/supabaseClient")).supabase.auth.getSession();
      const session = (await token).data?.session;
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      
      const firstPageId = pages[0].pageId || pages[0].page_id;
      const res = await fetch(`${apiBase}/webhooks/facebook/client/connect/settings?workspaceId=${workspaceId}&pageId=${firstPageId}`, { headers });
      const data = await res.json();
      setPageSettings(data.settings || {});
    } catch {
      setPageSettings(null);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStatus().then((d) => {
      const p = Array.isArray(d?.connectedPages) ? d.connectedPages.filter(x => (x.connectedWorkspaceId || x.workspace_id || x.workspaceId) === workspaceId) : [];
      fetchPageSettings(p);
    });
    fetchCounts();
    fetchOmniChannels();
  }, [fetchStatus, fetchCounts, fetchOmniChannels, fetchPageSettings, workspaceId]);

  const handleRefresh = () => {
    fetchStatus().then((d) => {
      const p = Array.isArray(d?.connectedPages) ? d.connectedPages.filter(x => (x.connectedWorkspaceId || x.workspace_id || x.workspaceId) === workspaceId) : [];
      fetchPageSettings(p);
    });
    fetchCounts();
    fetchOmniChannels();
    if (onRefresh) onRefresh();
  };

  const connectedPages = Array.isArray(status?.connectedPages)
    ? status.connectedPages.filter(p => {
        const wsId = p.connectedWorkspaceId || p.workspace_id || p.workspaceId || "";
        return wsId === workspaceId;
      })
    : [];
  const allPagesRaw = Array.isArray(status?.connectedPages) ? status.connectedPages : [];
  
  // Filter and paginate global pages
  const filteredGlobalPages = allPagesRaw.filter(p => {
    const q = globalSearch.toLowerCase();
    const name = (p.pageName || p.page_name || "").toLowerCase();
    const id = (p.pageId || p.page_id || "").toLowerCase();
    return name.includes(q) || id.includes(q);
  });
  const totalGlobalPages = Math.ceil(filteredGlobalPages.length / itemsPerPage);
  const paginatedGlobalPages = filteredGlobalPages.slice((globalPage - 1) * itemsPerPage, globalPage * itemsPerPage);

  const isConnected = connectedPages.length > 0;
  const activePages = connectedPages.filter(p => (p.accessMode || p.access_mode || "enable") === "enable");
  const pausedPages = connectedPages.filter(p => (p.accessMode || p.access_mode) === "disable");

  const completedSteps = {
    connect: isConnected,
    greeting: !!(pageSettings?.welcomeEnabled),
    ai: !!(pageSettings?.aiEnabled),
    rules: counts.rules > 0,
    sequences: counts.sequences > 0,
    broadcasts: counts.broadcasts > 0,
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPct = Math.round((completedCount / SETUP_STEPS.length) * 100);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-gold)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Loading Facebook Connect...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <Facebook className="h-5 w-5" style={{ color: "#1877F2" }} />
            Channel Connections
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Connect Facebook, Instagram, TikTok, Shopee, and Lazada to enable 24/7 AI chatbot auto-replies, comment automation, and unified inbox.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Status Dashboard */}
      {isConnected ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--success-soft)]">
                <Facebook className="h-4 w-4" style={{ color: "var(--success)" }} />
              </div>
              <div>
                <p className="text-2xl font-black text-[var(--text-primary)]">{connectedPages.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Page(s) Connected</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--success-soft)]">
                <Bot className="h-4 w-4" style={{ color: "var(--success)" }} />
              </div>
              <div>
                <p className="text-2xl font-black text-[var(--text-primary)]">{activePages.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Chatbot Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hover-bg)]">
                <Settings className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              </div>
              <div>
                <p className="text-2xl font-black text-[var(--text-primary)]">{pausedPages.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Paused</p>
              </div>
            </div>
          </div>
        </div>
      ) : allPagesRaw.length === 0 ? (
        <div className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-[var(--brand-gold)]" />
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">No Facebook Page connected yet</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Click "Connect with Facebook" below to link your Facebook account and select a page. Once connected, your AI chatbot will automatically reply to messages 24/7.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Global Database Pages */}
      {allPagesRaw.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-primary)]">All Connected Facebook Pages (Database)</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="text" 
                  value={globalSearch}
                  onChange={(e) => { setGlobalSearch(e.target.value); setGlobalPage(1); }}
                  placeholder="Search pages..." 
                  className="w-48 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setGlobalPage(p => Math.max(1, p - 1))} 
                  disabled={globalPage === 1}
                  className="rounded-lg border border-[var(--border-color)] p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  Page {globalPage} of {totalGlobalPages || 1}
                </span>
                <button 
                  onClick={() => setGlobalPage(p => Math.min(totalGlobalPages, p + 1))} 
                  disabled={globalPage >= totalGlobalPages}
                  className="rounded-lg border border-[var(--border-color)] p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {paginatedGlobalPages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedGlobalPages.map(p => {
                const pid = p.pageId || p.page_id;
                const pname = p.pageName || p.page_name || "Unknown Page";
                return (
                  <div key={pid} className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 h-[120px]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1877F215]">
                        <Facebook className="h-5 w-5 text-[#1877F2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{pname}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{pid}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingPage(p)} 
                      className="mt-3 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-white transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)]">
              No pages match your search.
            </div>
          )}
        </div>
      )}

      {/* Setup Progress */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-[var(--text-primary)]">Setup Progress</h3>
          <span className="text-xs font-bold text-[var(--text-muted)]">{completedCount}/{SETUP_STEPS.length} completed</span>
        </div>
        <div className="mb-4 h-2 rounded-full bg-[var(--hover-bg)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-gold)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SETUP_STEPS.map((step) => {
            const done = completedSteps[step.id];
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  done
                    ? "border-[var(--success)]/30 bg-[var(--success-soft)]"
                    : "border-[var(--border-color)] bg-[var(--bg-main)]"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
                )}
                <Icon className={`h-4 w-4 shrink-0 ${done ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${done ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{step.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{step.desc}</p>
                </div>
                {!done && step.id !== "connect" && onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab("builder", step.id)}
                    className="shrink-0 text-[var(--brand-gold)] hover:text-[var(--brand-gold-hover)] transition-colors"
                    title="Go to Chatbot Builder"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Facebook Connect Card */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <h3 className="mb-3 text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
          <Facebook className="h-4 w-4" style={{ color: "#1877F2" }} />
          Facebook Messenger
        </h3>
        <FacebookConnectCard workspaceId={workspaceId} onRefresh={handleRefresh} />
      </div>

      {/* Other Channel Connections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[var(--text-primary)]">Other Channels</h3>
          <span className="text-xs text-[var(--text-muted)]">Instagram · TikTok · Shopee · Lazada</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {OMNI_CHANNELS.map((ch) => {
            const connected = omniChannels.find((c) => c.channel === ch.key);
            return (
              <OmniChannelConnectCard
                key={ch.key}
                channel={ch}
                workspaceId={workspaceId}
                connected={connected}
                onRefresh={handleRefresh}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      {isConnected && onNavigateTab && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-black text-[var(--text-primary)] mb-3">Quick Actions</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => onNavigateTab("builder")}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-left hover:bg-[var(--hover-bg)] transition-colors"
            >
              <Bot className="h-4 w-4 text-[var(--brand-gold)]" />
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Chatbot Builder</p>
                <p className="text-[10px] text-[var(--text-muted)]">AI, rules, sequences</p>
              </div>
            </button>
            <button
              onClick={() => onNavigateTab("inbox")}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-left hover:bg-[var(--hover-bg)] transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-[var(--brand-gold)]" />
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Unified Inbox</p>
                <p className="text-[10px] text-[var(--text-muted)]">View conversations</p>
              </div>
            </button>
            <button
              onClick={() => onNavigateTab("ads")}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-left hover:bg-[var(--hover-bg)] transition-colors"
            >
              <Megaphone className="h-4 w-4 text-[var(--brand-gold)]" />
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Ad Campaigns</p>
                <p className="text-[10px] text-[var(--text-muted)]">Facebook & Instagram ads</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Page Details Modal */}
      {viewingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877F215]">
                  <Facebook className="h-4 w-4 text-[#1877F2]" />
                </div>
                <h2 className="text-base font-black text-[var(--text-primary)] truncate">{viewingPage.pageName || viewingPage.page_name || "Unknown Page"}</h2>
              </div>
              <button onClick={() => setViewingPage(null)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Page ID</label>
                  <p className="text-sm font-medium text-[var(--text-primary)] break-all">{viewingPage.pageId || viewingPage.page_id}</p>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Workspace ID</label>
                  <p className="text-sm font-medium text-[var(--text-primary)] break-all">{viewingPage.connectedWorkspaceId || viewingPage.workspace_id || "N/A"}</p>
                </div>
              </div>
              
              <div className="h-px bg-[var(--border-color)]" />
              
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Business Type</label>
                <p className="text-sm font-medium text-[var(--text-primary)]">{viewingPage.businessType || viewingPage.business_type || "Not specified"}</p>
              </div>
              
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Product / Services</label>
                <p className="text-sm font-medium text-[var(--text-primary)]">{viewingPage.productServices || viewingPage.product_services || "Not specified"}</p>
              </div>
              
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Price Range</label>
                <p className="text-sm font-medium text-[var(--text-primary)]">{viewingPage.productServicePriceRanges || viewingPage.product_service_price_ranges || "Not specified"}</p>
              </div>
              
              <div className="h-px bg-[var(--border-color)]" />

              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Knowledge Base</label>
                <div className="rounded-lg bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] max-h-24 overflow-y-auto whitespace-pre-wrap border border-[var(--border-color)]">
                  {viewingPage.knowledge || "No knowledge base configured"}
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">AI Custom Instruction</label>
                <div className="rounded-lg bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] max-h-24 overflow-y-auto whitespace-pre-wrap border border-[var(--border-color)]">
                  {viewingPage.aiInstruction || viewingPage.ai_instruction || "No custom instructions configured"}
                </div>
              </div>
              
              <div className="h-px bg-[var(--border-color)]" />
              
              <div>
                <label className="mb-3 block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">External Links</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-[var(--text-muted)]">Website:</span>
                    <a href={viewingPage.websiteLink} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-gold)] hover:underline truncate">
                      {viewingPage.websiteLink || "N/A"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-[var(--text-muted)]">Shopee:</span>
                    <a href={viewingPage.shoppeLink} target="_blank" rel="noopener noreferrer" className="text-[#EE4D2D] hover:underline truncate">
                      {viewingPage.shoppeLink || "N/A"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-[var(--text-muted)]">Lazada:</span>
                    <a href={viewingPage.lazadaLink} target="_blank" rel="noopener noreferrer" className="text-[#0F146D] hover:underline truncate">
                      {viewingPage.lazadaLink || "N/A"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-[var(--border-color)] bg-[var(--bg-main)] p-4 flex justify-between items-center">
              <button 
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to disconnect ${viewingPage.pageName || viewingPage.page_name}?`)) {
                    try {
                      await facebookIntegrationService.deletePage(viewingPage.pageId || viewingPage.page_id);
                      setViewingPage(null);
                      handleRefresh();
                    } catch (e) {
                      alert(e.message || "Failed to disconnect page.");
                    }
                  }
                }} 
                className="rounded-xl border border-[var(--danger)]/30 px-4 py-2 text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                Disconnect
              </button>
              <button 
                onClick={() => setViewingPage(null)} 
                className="rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
