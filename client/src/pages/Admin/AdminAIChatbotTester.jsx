import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import facebookIntegrationService from "../../services/marketing/facebook_connect";
import { getCurrentWorkspaceId } from "../../services/workspaceResolver";

function getApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return raw ? (raw.endsWith("/api") ? raw : `${raw}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
}

const DEFAULT_CONTEXT = {
  pageName: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  welcomeEnabled: false,
  welcomeMessage: "",
  awayMessage: "",
  aiEnabled: true,
  aiModel: "llama-3.3-70b-versatile",
  aiInstruction: "",
  knowledgeBase: "",
  aiLanguage: "en",
  aiTemperature: 0.7,
  businessHoursEnabled: false,
  businessHoursStart: "09:00",
  businessHoursEnd: "18:00",
  businessHoursTimezone: "Asia/Manila",
  businessHoursDays: [],
  responseDelaySeconds: 0,
  handoffEnabled: false,
  handoffKeywords: [],
  handoffMessage: "",
  autoTagConversations: true,
  sentimentAnalysis: true,
  conversationStarters: [],
};

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === "object" && value !== null) return value;
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null)) ? parsed : fallback;
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeBuilderContext(settings = {}, fallbackPage = {}) {
  return {
    ...DEFAULT_CONTEXT,
    pageName: (settings.pageName || settings.page_name) !== "Facebook Page" && (settings.pageName || settings.page_name) 
      ? (settings.pageName || settings.page_name) 
      : (fallbackPage.fb_name || fallbackPage.name || fallbackPage.pageName || fallbackPage.page_name || "Facebook Page"),
    businessType: settings.businessType || fallbackPage.businessType || "",
    productServices:
      settings.productsServices ||
      settings.productServices ||
      fallbackPage.productServices ||
      fallbackPage.productsServices ||
      "",
    productServicePriceRanges:
      settings.productServicePriceRanges ||
      fallbackPage.productServicePriceRanges ||
      "",
    websiteLink: settings.websiteLink || fallbackPage.websiteLink || "",
    shoppeLink: settings.shoppeLink || fallbackPage.shoppeLink || "",
    lazadaLink: settings.lazadaLink || fallbackPage.lazadaLink || "",
    welcomeEnabled: settings.welcomeEnabled ?? fallbackPage.welcomeEnabled ?? false,
    welcomeMessage: settings.welcomeMessage || fallbackPage.welcomeMessage || "",
    awayMessage: settings.awayMessage || fallbackPage.awayMessage || "",
    aiEnabled: settings.aiEnabled ?? fallbackPage.aiEnabled ?? true,
    aiModel: settings.aiModel || fallbackPage.aiModel || DEFAULT_CONTEXT.aiModel,
    aiInstruction:
      settings.aiInstruction ||
      fallbackPage.aiInstruction ||
      fallbackPage.ai_instruction ||
      "",
    knowledgeBase:
      settings.knowledgeBase ||
      fallbackPage.knowledgeBase ||
      fallbackPage.knowledge ||
      "",
    aiLanguage: settings.aiLanguage || fallbackPage.aiLanguage || "en",
    aiTemperature: Number(settings.aiTemperature ?? fallbackPage.aiTemperature ?? 0.7),
    businessHoursEnabled:
      settings.businessHoursEnabled ?? fallbackPage.businessHoursEnabled ?? false,
    businessHoursStart: settings.businessHoursStart || fallbackPage.businessHoursStart || "09:00",
    businessHoursEnd: settings.businessHoursEnd || fallbackPage.businessHoursEnd || "18:00",
    businessHoursTimezone: settings.businessHoursTimezone || fallbackPage.businessHoursTimezone || "Asia/Manila",
    businessHoursDays: parseJsonArray(settings.businessHoursDays || fallbackPage.businessHoursDays, []),
    responseDelaySeconds: Number(settings.responseDelaySeconds ?? fallbackPage.responseDelaySeconds ?? 0),
    handoffEnabled: settings.handoffEnabled ?? fallbackPage.handoffEnabled ?? false,
    handoffKeywords: parseJsonArray(settings.handoffKeywords || fallbackPage.handoffKeywords, []),
    handoffMessage: settings.handoffMessage || fallbackPage.handoffMessage || "",
    autoTagConversations:
      settings.autoTagConversations ?? fallbackPage.autoTagConversations ?? true,
    sentimentAnalysis: settings.sentimentAnalysis ?? fallbackPage.sentimentAnalysis ?? true,
    conversationStarters: parseJsonArray(
      settings.conversationStarters || fallbackPage.conversationStarters,
      []
    ),
  };
}

function getPageWorkspaceId(page = {}, fallbackWorkspaceId = "") {
  return (
    page.connectedWorkspaceId ||
    page.workspaceId ||
    page.workspace_id ||
    page.connectWorkspaceId ||
    fallbackWorkspaceId ||
    ""
  );
}

function StatusPill({ active, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
      active
        ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
        : "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
      {children}
    </span>
  );
}

function FieldSummary({ icon: Icon, label, value, active = true }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
        <Icon className={`h-3.5 w-3.5 ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`} />
        {label}
      </div>
      <p className="mt-2 line-clamp-3 text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
        {value || "Not configured"}
      </p>
    </div>
  );
}

export default function AdminAIChatbotTester({ workspaceId: selectedWorkspaceId = "" }) {
  const baseUrl = getApiBase();
  const [workspaceId, setWorkspaceId] = useState(selectedWorkspaceId);
  const [authHeaders, setAuthHeaders] = useState({});
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [builderContext, setBuilderContext] = useState(DEFAULT_CONTEXT);
  const [localContext, setLocalContext] = useState(DEFAULT_CONTEXT);
  const [useLocalOverrides, setUseLocalOverrides] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastContextUsed, setLastContextUsed] = useState(null);
  const [viewMode, setViewMode] = useState("desktop");
  const [showDebug, setShowDebug] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const endRef = useRef(null);

  const selectedPage = useMemo(
    () => pages.find((page) => String(page.pageId || page.page_id) === String(selectedPageId)) || {},
    [pages, selectedPageId]
  );

  const activeContext = useLocalOverrides ? localContext : builderContext;
  const builderLinked = Boolean(selectedPageId && (builderContext.aiInstruction || builderContext.knowledgeBase || builderContext.welcomeMessage));
  const settingsWorkspaceId = getPageWorkspaceId(selectedPage, workspaceId);

  const loadBuilderSettings = useCallback(async (pageId, fallbackPage = selectedPage) => {
    const settingsWorkspaceId = getPageWorkspaceId(fallbackPage, workspaceId);
    if (!settingsWorkspaceId || !pageId) return;
    setSettingsLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ workspaceId: settingsWorkspaceId, pageId });
      const res = await fetch(`${baseUrl}/webhooks/facebook/client/connect/settings?${query.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const context = normalizeBuilderContext(data.settings || {}, fallbackPage);
      setBuilderContext(context);
      setLocalContext(context);
      setUseLocalOverrides(false);
      setMessages([]);
      setLastContextUsed(null);
      setHasStarted(false);
    } catch (err) {
      const context = normalizeBuilderContext({}, fallbackPage);
      setBuilderContext(context);
      setLocalContext(context);
      setHasStarted(false);
      setError(err.message || "Failed to load Chatbot Builder settings.");
    } finally {
      setSettingsLoading(false);
    }
  }, [authHeaders, baseUrl, selectedPage, workspaceId]);

  const handlePageSelect = useCallback((e) => {
    const pid = e.target.value;
    setSelectedPageId(pid);
    const p = pages.find((page) => String(page.pageId || page.page_id) === String(pid)) || {};
    loadBuilderSettings(pid, p);
  }, [pages, loadBuilderSettings]);

  const loadBroadcasts = useCallback(async () => {
    if (!workspaceId) return;
    setBroadcastsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/broadcasts/${workspaceId}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBroadcasts(data.campaigns || data.broadcasts || []);
    } catch (err) {
      console.error("Failed to load broadcasts:", err);
      setBroadcasts([]);
    } finally {
      setBroadcastsLoading(false);
    }
  }, [authHeaders, baseUrl, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const resolvedWorkspaceId = selectedWorkspaceId || await getCurrentWorkspaceId();
        if (cancelled) return;

        const headers = sessionData?.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {};
        setAuthHeaders(headers);
        setWorkspaceId(resolvedWorkspaceId);

        const status = await fetch(
          `${baseUrl}/webhooks/facebook/admin/status?workspaceId=${encodeURIComponent(resolvedWorkspaceId)}`,
          { headers }
        ).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          return data;
        });

        if (cancelled) return;
        const connectedPages = (Array.isArray(status.connectedPages) ? status.connectedPages : []).filter(page => {
          const pageWsId = page.connectedWorkspaceId || page.workspace_id || page.workspaceId || "";
          return pageWsId === resolvedWorkspaceId;
        });
        setPages(connectedPages);
        const first = connectedPages[0];
        const firstPageId = first?.pageId || first?.page_id || "";
        setSelectedPageId(firstPageId);
        if (firstPageId) {
          const settingsWorkspaceId = getPageWorkspaceId(first, resolvedWorkspaceId);
          const query = new URLSearchParams({ workspaceId: settingsWorkspaceId, pageId: firstPageId });
          const res = await fetch(`${baseUrl}/webhooks/facebook/client/connect/settings?${query.toString()}`, { headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          const context = normalizeBuilderContext(data.settings || {}, first);
          setBuilderContext(context);
          setLocalContext(context);
        } else {
          const emptyContext = normalizeBuilderContext({}, {});
          setBuilderContext(emptyContext);
          setLocalContext(emptyContext);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load Builder-backed chatbot tester.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, selectedWorkspaceId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const handleSelectPage = (event) => {
    const pageId = event.target.value;
    setSelectedPageId(pageId);
    const fallbackPage = pages.find((page) => String(page.pageId || page.page_id) === String(pageId)) || {};
    loadBuilderSettings(pageId, fallbackPage);
  };

  const handleGetStarted = () => {
    setHasStarted(true);
    if (activeContext.welcomeEnabled && activeContext.welcomeMessage) {
      setMessages([{ role: "bot", content: activeContext.welcomeMessage }]);
    }
  };

  const updateLocalContext = (field, value) => {
    setUseLocalOverrides(true);
    setLocalContext((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendMessage = async (eventOrText) => {
    if (eventOrText && eventOrText.preventDefault) {
      eventOrText.preventDefault();
    }
    const text = typeof eventOrText === "string" ? eventOrText.trim() : inputMessage.trim();
    if (!text || isTyping || !selectedPageId) return;

    setError("");
    if (typeof eventOrText !== "string") setInputMessage("");
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setIsTyping(true);

    try {
      const res = await facebookIntegrationService.testChatbotReply({
        pageId: selectedPageId,
        message: text,
        history: messages,
        customContext: {
          ...activeContext,
          workspaceId: settingsWorkspaceId || workspaceId,
          connectedWorkspaceId: settingsWorkspaceId || workspaceId,
          pageName: activeContext.pageName || selectedPage.pageName || selectedPage.page_name || "",
        },
      });

      if (!res?.success || !res?.data) {
        throw new Error(res?.error || "Invalid chatbot test response.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply || "No response received." },
      ]);
      setLastContextUsed(res.data.contextUsed || activeContext);
    } catch (err) {
      setError(err.message || "Failed to generate test reply.");
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-[var(--text-secondary)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--brand-gold)]" />
        Loading Builder-backed tester...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 text-[var(--text-primary)] sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Bot className="h-6 w-6 text-[var(--brand-gold)]" />
            AI Chatbot Tester
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Tests the same page configuration saved in Chatbot Builder.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill active={builderLinked}>
            {builderLinked ? "Builder linked" : "Waiting for Builder settings"}
          </StatusPill>
          <StatusPill active={activeContext.aiEnabled}>
            AI replies {activeContext.aiEnabled ? "enabled" : "disabled"}
          </StatusPill>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]">
            {pages.length} connected page{pages.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm flex flex-col" style={{maxHeight: '88vh'}}>
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] p-5 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand-gold)]">
                Chatbot Builder Source
              </p>
              {pages.length > 0 ? (
                <select
                  value={selectedPageId}
                  onChange={handlePageSelect}
                  className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-1.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-gold)] focus:outline-none"
                >
                  {pages.map(p => (
                    <option key={p.pageId || p.page_id} value={p.pageId || p.page_id}>
                      {p.pageName || p.page_name || "Unknown Page"}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="mt-1 text-lg font-black">
                  {activeContext.pageName || selectedPage.pageName || "Facebook Page"}
                </h2>
              )}
              {settingsWorkspaceId && settingsWorkspaceId !== workspaceId && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Linked workspace context
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => loadBuilderSettings(selectedPageId, selectedPage)}
              disabled={!selectedPageId || settingsLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] disabled:opacity-50"
              title="Refresh Builder settings"
            >
              {settingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 space-y-4 overflow-y-auto flex-1 p-5 pt-0" style={{scrollbarWidth:'thin'}}>
            <div className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--brand-gold)]">Local sandbox overrides</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Try temporary behavior without saving to Builder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseLocalOverrides((value) => !value)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    useLocalOverrides ? "bg-[var(--brand-gold)]" : "bg-[var(--border-color)]"
                  }`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    useLocalOverrides ? "left-6" : "left-1"
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {/* AI Personality */}
              <FieldSummary
                icon={Sparkles}
                label="AI Instruction"
                value={activeContext.aiInstruction}
                active={activeContext.aiEnabled}
              />
              <FieldSummary
                icon={ShieldCheck}
                label="Knowledge Base"
                value={activeContext.knowledgeBase}
                active={Boolean(activeContext.knowledgeBase)}
              />
              {/* Messaging */}
              <FieldSummary
                icon={MessageSquare}
                label="Welcome Message"
                value={activeContext.welcomeMessage}
                active={activeContext.welcomeEnabled}
              />
              {activeContext.awayMessage && (
                <FieldSummary
                  icon={MessageSquare}
                  label="Away Message"
                  value={activeContext.awayMessage}
                  active={activeContext.businessHoursEnabled}
                />
              )}
              {/* Business Hours */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-3.5 w-3.5 ${activeContext.businessHoursEnabled ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`} />
                    Business Hours
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${activeContext.businessHoursEnabled ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>
                    {activeContext.businessHoursEnabled ? "ACTIVE" : "OFF"}
                  </span>
                </div>
                {activeContext.businessHoursEnabled ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{activeContext.businessHoursStart || "09:00"} – {activeContext.businessHoursEnd || "18:00"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{activeContext.businessHoursTimezone || "Asia/Manila"}</p>
                    {(() => {
                      const days = activeContext.businessHoursDays;
                      // 0-based: 0=Sun…6=Sat | 1-based: 1=Mon…7=Sun (ChatbotBuilder uses 1-based)
                      const dayNames0 = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
                      const dayNames1 = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
                      let openDays = [];
                      if (days && typeof days === "object" && !Array.isArray(days)) {
                        const keys = Object.keys(days).map(k => parseInt(k, 10)).filter(n => !isNaN(n));
                        const dayNames = keys.some(k => k === 7) ? dayNames1 : dayNames0;
                        openDays = Object.entries(days)
                          .filter(([key, v]) => {
                            // Skip key "0" if it's just a boolean/number enabled-flag, not a day schedule
                            if (key === "0" && typeof v !== "object") return false;
                            return Boolean(v);
                          })
                          .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                          .map(([k, v]) => {
                            const n = parseInt(k, 10);
                            const name = !isNaN(n) ? (dayNames[n] || k) : (k.charAt(0).toUpperCase() + k.slice(1, 3));
                            if (typeof v === "object" && v.open && v.close) {
                              return `${name} ${v.open}-${v.close}`;
                            }
                            return name;
                          });
                      } else if (Array.isArray(days)) {
                        openDays = days.map(d => dayNames0[d] || String(d));
                      }
                      return openDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {openDays.map(d => (
                            <span key={d} className="rounded-md bg-[var(--brand-gold-soft)] px-1.5 py-0.5 text-[10px] font-black text-[var(--brand-gold)]">{d}</span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">Always available online</p>
                )}
              </div>
              {/* Behavior row */}
              <div className="grid grid-cols-2 gap-3">
                <FieldSummary icon={Clock} label="Response Delay" value={`${activeContext.responseDelaySeconds ?? 0}s`} />
                <FieldSummary icon={UserRound} label="Handoff" value={activeContext.handoffEnabled ? "Enabled" : "Disabled"} active={activeContext.handoffEnabled} />
              </div>
              {/* Handoff detail */}
              {activeContext.handoffEnabled && (activeContext.handoffMessage || activeContext.handoffKeywords?.length > 0) && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    <UserRound className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
                    Handoff Configuration
                  </div>
                  {activeContext.handoffMessage && (
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">"{activeContext.handoffMessage}"</p>
                  )}
                  {activeContext.handoffKeywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(activeContext.handoffKeywords) ? activeContext.handoffKeywords : [])
                        .flatMap(kw => typeof kw === 'string' ? kw.split(',').map(s => s.trim()) : kw)
                        .filter(Boolean)
                        .map((kw, i) => (
                        <span key={i} className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-black text-violet-400">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Conversation Starters */}
              {activeContext.conversationStarters?.length > 0 && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
                    Conversation Starters
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeContext.conversationStarters.map((s, i) => (
                      <span key={i} className="rounded-lg border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-gold)]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* AI Settings */}
              <div className="grid grid-cols-2 gap-3">
                <FieldSummary icon={Settings} label="AI Routing" value="Automatic (Fastest)" />
                <FieldSummary icon={Zap} label="Language" value={activeContext.aiLanguage || "en"} />
              </div>
              {/* Automation toggles */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-3">
                  <Settings className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
                  Automation
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Auto Tag Conversations</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${activeContext.autoTagConversations ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>
                      {activeContext.autoTagConversations ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Sentiment Analysis</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${activeContext.sentimentAnalysis ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>
                      {activeContext.sentimentAnalysis ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {useLocalOverrides && (
              <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                <label className="block text-xs font-black text-[var(--text-muted)]">AI Instruction Override</label>
                <textarea
                  value={localContext.aiInstruction}
                  onChange={(event) => updateLocalContext("aiInstruction", event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
                />
                <label className="block text-xs font-black text-[var(--text-muted)]">Knowledge Override</label>
                <textarea
                  value={localContext.knowledgeBase}
                  onChange={(event) => updateLocalContext("knowledgeBase", event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
                />
              </div>
            )}
          </div>
        </aside>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm" style={{minHeight:'680px'}}>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
            <div>
              <h2 className="text-base font-black">Interactive Sandbox Chat</h2>
              <p className="text-xs text-[var(--text-muted)]">Uses current Builder context. No Messenger logs or Facebook sends.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-0.5">
                <button type="button" onClick={() => setViewMode('desktop')} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${viewMode==='desktop' ? 'bg-[var(--brand-gold)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Desktop</button>
                <button type="button" onClick={() => setViewMode('phone')} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${viewMode==='phone' ? 'bg-[var(--brand-gold)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Phone</button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBroadcastModal(true);
                  loadBroadcasts();
                }}
                className="rounded-xl border border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] px-3 py-2 text-xs font-black text-[var(--brand-gold)] transition hover:bg-[var(--brand-gold)] hover:text-black"
                title="Select a broadcast message to test"
              >
                Select Broadcast
              </button>
              <button type="button" onClick={() => { setMessages([]); setLastContextUsed(null); setShowDebug(false); setHasStarted(false); }} disabled={messages.length===0 && !hasStarted} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] disabled:opacity-50">Clear Chat</button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[var(--bg-main)]/40 overflow-auto py-4">
            {viewMode === 'phone' ? (
              <div style={{width:'375px',height:'667px',borderRadius:'40px',border:'8px solid #1a1a2e',boxShadow:'0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.5)',overflow:'hidden',position:'relative',background:'var(--bg-main)',flexShrink:0}} className="flex flex-col">
                {/* Phone status bar */}
                <div style={{background:'#0a0a1a',padding:'8px 20px 6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'11px',fontWeight:700,color:'#fff'}}>9:41</span>
                  <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                    <span style={{fontSize:'10px',color:'#fff'}}>●●●</span>
                    <span style={{fontSize:'10px',color:'#fff'}}>WiFi</span>
                    <span style={{fontSize:'10px',color:'#fff'}}>🔋</span>
                  </div>
                </div>
                {/* FB Messenger header */}
                <div style={{background:'#0a0a1a',borderBottom:'1px solid #222',padding:'8px 16px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--brand-gold-soft)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Bot style={{width:'16px',height:'16px',color:'var(--brand-gold)'}} />
                  </div>
                  <div>
                    <p style={{fontSize:'13px',fontWeight:700,color:'#fff',margin:0}}>{activeContext.pageName || 'Chatbot'}</p>
                    <p style={{fontSize:'10px',color:'#aaa',margin:0}}>Typically replies instantly</p>
                  </div>
                </div>
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{background:'#111'}}>
                  {!hasStarted && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'var(--brand-gold-soft)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'8px'}}>
                        <Bot style={{width:'24px',height:'24px',color:'var(--brand-gold)'}} />
                      </div>
                      <p style={{fontSize:'13px',fontWeight:700,color:'#fff',margin:'0 0 4px'}}>Hi! I&apos;m {activeContext.pageName || 'your assistant'}</p>
                      <p style={{fontSize:'11px',color:'#aaa',margin:0}}>Typically replies instantly</p>
                      
                      <button type="button" onClick={handleGetStarted} style={{marginTop:'24px',background:'#0084ff',color:'#fff',border:'none',borderRadius:'20px',padding:'10px 24px',fontSize:'14px',fontWeight:'bold',cursor:'pointer',width:'100%'}}>
                        Get Started
                      </button>
                    </div>
                  )}
                  {hasStarted && messages.map((m,i) => (
                    <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                      <div style={{maxWidth:'80%',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'8px 12px',fontSize:'13px',background:m.role==='user'?'#0084ff':'#2a2a3e',color:'#fff',lineHeight:'1.4'}}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  
                  {hasStarted && messages.filter(m => m.role === 'user').length === 0 && activeContext.conversationStarters?.length > 0 && (
                    <div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'8px',width:'100%',paddingBottom:'10px'}}>
                      {activeContext.conversationStarters.slice(0,4).map((s,i) => (
                        <button key={i} type="button" onClick={() => { handleSendMessage(s); }} style={{background:'#1a1a2e',border:'1px solid #444',borderRadius:'20px',color:'#fff',fontSize:'12px',padding:'8px 14px',cursor:'pointer',textAlign:'left',lineHeight:'1.3'}}>
                          {['🔵','🟡','🟢','🔴'][i % 4]} {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {isTyping && <div style={{display:'flex',gap:'4px',padding:'8px 12px',background:'#2a2a3e',borderRadius:'18px 18px 18px 4px',width:'fit-content'}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#888',animation:'bounce 1s infinite'}} /><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#888',animation:'bounce 1s infinite 0.2s'}} /><span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#888',animation:'bounce 1s infinite 0.4s'}} /></div>}
                  <div ref={endRef} />
                </div>
                {/* Phone input */}
                <form onSubmit={handleSendMessage} style={{borderTop:'1px solid #222',padding:'8px',display:'flex',gap:'8px',background:'#0a0a1a'}}>
                  <input type="text" value={inputMessage} onChange={e=>setInputMessage(e.target.value)} disabled={!selectedPageId||isTyping} placeholder="Message..." style={{flex:1,background:'#1a1a2e',border:'1px solid #333',borderRadius:'20px',padding:'8px 14px',color:'#fff',fontSize:'13px',outline:'none'}} />
                  <button type="submit" disabled={!selectedPageId||isTyping||!inputMessage.trim()} style={{width:'36px',height:'36px',borderRadius:'50%',background:'#0084ff',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:(!selectedPageId||isTyping||!inputMessage.trim())?0.4:1}}>
                    <Send style={{width:'16px',height:'16px'}} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col" style={{minHeight:'600px'}}>
                <div style={{background:'#1a1a1a',borderBottom:'1px solid #333',padding:'10px 16px',display:'flex',alignItems:'center',gap:'8px',borderTopLeftRadius:'12px',borderTopRightRadius:'12px'}}>
                  <div style={{display:'flex',gap:'6px'}}>
                    <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#ff5f56'}} />
                    <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#ffbd2e'}} />
                    <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'#27c93f'}} />
                  </div>
                  <div style={{marginLeft:'auto',marginRight:'auto',background:'#333',padding:'4px 20px',borderRadius:'6px',fontSize:'12px',fontWeight:'bold',color:'#aaa',display:'flex',alignItems:'center',gap:'8px'}}>
                    <Bot size={14} /> {activeContext.pageName || 'Chatbot Tester'}
                  </div>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--bg-main)]/60 p-5">
                  {!hasStarted && (
                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] mb-4">
                        <Bot className="h-7 w-7" />
                      </div>
                      <h3 className="text-base font-black">Hi! I&apos;m {activeContext.pageName || 'your assistant'} 👋</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">To test your chatbot, click the button below.</p>
                      
                      <button type="button" onClick={handleGetStarted} className="mt-6 rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-6 py-2.5 text-sm font-bold text-[var(--brand-gold)] hover:bg-[var(--brand-gold)] hover:text-black transition shadow-sm">
                        Get Started
                      </button>
                    </div>
                  )}
                  {hasStarted && messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role==="user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role==="user"
                          ? "rounded-tr-md bg-[var(--brand-gold)] font-semibold text-black"
                          : "rounded-tl-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                      }`}>
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      </div>
                    </div>
                  ))}
                  
                  {hasStarted && messages.filter(m => m.role === 'user').length === 0 && activeContext.conversationStarters?.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2 pb-4 pt-2">
                      {activeContext.conversationStarters.slice(0,5).map((s,i) => (
                        <button key={i} type="button" onClick={() => handleSendMessage(s)} className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-3 py-1.5 text-xs font-bold text-[var(--brand-gold)] hover:bg-[var(--brand-gold)] hover:text-black transition">{s}</button>
                      ))}
                    </div>
                  )}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-gold)]" /> Bot is thinking
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
                <form onSubmit={handleSendMessage} className="border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <div className="flex gap-3">
                    <input type="text" value={inputMessage} onChange={(e)=>setInputMessage(e.target.value)} disabled={!selectedPageId||isTyping} placeholder={selectedPageId?"Type your message to test...":"Select a connected Facebook page first"} className="min-w-0 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] disabled:opacity-50" />
                    <button type="submit" disabled={!selectedPageId||isTyping||!inputMessage.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-3 text-sm font-black text-black transition hover:bg-[var(--brand-gold-hover)] disabled:opacity-50">Send <Send className="h-4 w-4" /></button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>

      {lastContextUsed && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
              <h3 className="text-sm font-black">Injected AI Context — Last Reply</h3>
            </div>
            <button type="button" onClick={() => setShowDebug(v => !v)} className="rounded-lg border border-[var(--border-color)] px-3 py-1 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition">
              {showDebug ? 'Hide Details' : 'Show Full Context'}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <FieldSummary icon={Settings} label="Model" value={lastContextUsed.aiModel || activeContext.aiModel} />
            <FieldSummary icon={Zap} label="Language" value={lastContextUsed.aiLanguage || activeContext.aiLanguage} />
            <FieldSummary icon={Clock} label="Business Hours" value={lastContextUsed.businessHoursEnabled ? `${lastContextUsed.businessHoursStart}–${lastContextUsed.businessHoursEnd}` : 'Off'} active={lastContextUsed.businessHoursEnabled} />
            <FieldSummary icon={UserRound} label="Handoff" value={lastContextUsed.handoffEnabled ? 'Enabled' : 'Off'} active={lastContextUsed.handoffEnabled} />
          </div>
          {showDebug && (
            <div className="mt-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-3">Full Injected Context</p>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldSummary icon={Sparkles} label="AI Instruction" value={lastContextUsed.aiInstruction} />
                <FieldSummary icon={ShieldCheck} label="Knowledge Base (first 200 chars)" value={(lastContextUsed.knowledgeBase || '').slice(0,200)} />
                <FieldSummary icon={MessageSquare} label="Welcome Message" value={lastContextUsed.welcomeEnabled ? lastContextUsed.welcomeMessage : 'Disabled'} active={lastContextUsed.welcomeEnabled} />
                <FieldSummary icon={MessageSquare} label="Away Message" value={lastContextUsed.awayMessage || 'Not set'} active={lastContextUsed.businessHoursEnabled} />
                <FieldSummary icon={Clock} label="Timezone" value={lastContextUsed.businessHoursTimezone || 'Asia/Manila'} />
                <FieldSummary icon={UserRound} label="Handoff Message" value={lastContextUsed.handoffMessage || 'Not set'} active={lastContextUsed.handoffEnabled} />
                <FieldSummary icon={Zap} label="Auto Tag" value={lastContextUsed.autoTagConversations ? 'ON' : 'OFF'} active={lastContextUsed.autoTagConversations} />
                <FieldSummary icon={Settings} label="Sentiment Analysis" value={lastContextUsed.sentimentAnalysis ? 'ON' : 'OFF'} active={lastContextUsed.sentimentAnalysis} />
              </div>
              {lastContextUsed.conversationStarters?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-2">Conversation Starters Injected</p>
                  <div className="flex flex-wrap gap-1">
                    {lastContextUsed.conversationStarters.map((s,i) => <span key={i} className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-0.5 text-xs font-bold text-[var(--brand-gold)]">{s}</span>)}
                  </div>
                </div>
              )}
              {lastContextUsed.handoffKeywords?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)] mb-2">Handoff Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(lastContextUsed.handoffKeywords)?lastContextUsed.handoffKeywords:[])
                      .flatMap(kw => typeof kw === 'string' ? kw.split(',').map(s => s.trim()) : kw)
                      .filter(Boolean)
                      .map((k,i) => <span key={i} className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-400">{k}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Broadcast Selection Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-main)] px-5 py-4">
              <h2 className="text-base font-black text-[var(--text-primary)]">Available Broadcasts</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              {broadcastsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <p className="text-xs">Loading broadcasts...</p>
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-color)] p-8 text-center">
                  <p className="text-sm font-bold text-[var(--text-primary)] mb-1">No broadcasts found</p>
                  <p className="text-xs text-[var(--text-muted)]">Create a broadcast campaign in the Chatbot Builder first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((bc) => (
                    <div key={bc.id || bc.campaign_id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">{bc.name || bc.campaign_name || "Unnamed Broadcast"}</h3>
                          <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${bc.status === 'draft' ? 'bg-[var(--hover-bg)] text-[var(--text-muted)]' : 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]'}`}>
                            {bc.status || "Draft"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHasStarted(true);
                            setMessages(prev => [...prev, {
                              id: Date.now(),
                              role: "assistant",
                              content: bc.message_text || bc.messageText || "Empty message",
                              timestamp: new Date().toISOString()
                            }]);
                            setShowBroadcastModal(false);
                          }}
                          className="rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors shrink-0"
                        >
                          Select Broadcast
                        </button>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-secondary)] max-h-24 overflow-y-auto whitespace-pre-wrap">
                        {bc.message_text || bc.messageText || "No message content"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
