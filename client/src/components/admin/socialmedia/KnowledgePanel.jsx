import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  BarChart3,
  Settings,
  Bot,
  Inbox,
} from "lucide-react";
import clientFacebookConnectService from "../../../services/client/facebookConnect";
import handoffService from "../../../services/handoffService";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import { HERMES_INTERNAL_WORKSPACE_ID } from "../../../services/workspaceResolver";
import { supabase } from "../../../config/supabaseClient";

import ChatbotBuilder, { AutoReplyRulesManager, getApiBase } from "./ChatbotBuilder";
import PageKnowledgeSummary from "./PageKnowledgeSummary";

const Client_FacebookInbox = lazy(() =>
  import("../../../pages/Client/Modules/Client_FacebookInbox.jsx")
);
const FacebookAnalyticsTable = lazy(() =>
  import("../../../components/client/facebook/FacebookAnalyticsTable.jsx")
);
const HumanHandoffs = lazy(() =>
  import("../../../pages/Client/Modules/HumanHandoffs.jsx")
);

const SUB_TABS = [
  { key: "rules", label: "Auto-Reply Rules", icon: Bot },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "handoffs", label: "Human Handoff", icon: BookOpen },
  { key: "knowledge", label: "Page Knowledge", icon: Settings },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

function normalizeWorkspaceId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getFacebookPageId(page) {
  return (
    String(page?.pageId || "").trim() ||
    String(page?.page_id || "").trim() ||
    String(page?.id || "").trim()
  );
}

function getFacebookPageName(page) {
  return (
    page?.pageName ||
    page?.page_name ||
    page?.fb_name ||
    getFacebookPageId(page) ||
    "Facebook Page"
  );
}

function normalizeFacebookPage(page) {
  const pageId = getFacebookPageId(page);
  return {
    ...page,
    pageId,
    page_id: page?.page_id || pageId,
    pageName: getFacebookPageName(page),
  };
}

function parseKeywords(value = "") {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFaqPayload(payload = {}, fallback = {}) {
  return {
    question: payload.question ?? fallback.question ?? "",
    answer: payload.answer ?? fallback.answer ?? "",
    category: payload.category ?? fallback.category ?? "General",
    keywords: parseKeywords(payload.keywords ?? fallback.keywords ?? []),
    status: payload.status ?? fallback.status ?? "active",
    language: payload.language ?? fallback.language ?? "auto",
  };
}

export default function KnowledgePanel() {
  const context = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceId = normalizeWorkspaceId(
    localStorage.getItem("exponify_active_client_workspace_id") ||
    localStorage.getItem("workspaceId") ||
    localStorage.getItem("workspace_id") ||
    HERMES_INTERNAL_WORKSPACE_ID
  );

  const [activeSubTab, setActiveSubTab] = useState("rules");
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [handoffBadgeCount, setHandoffBadgeCount] = useState(0);
  const [dashboard, setDashboard] = useState({
    summary: {},
    analytics: [],
    conversations: [],
    pageSettings: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authHeaders, setAuthHeaders] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthHeaders(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {});
    });
  }, []);

  const selectedPage = pages.find(
    (page) => getFacebookPageId(page) === selectedPageId
  ) || pages[0] || null;

  const loadDashboard = useCallback(async (nextPageId = selectedPageId) => {
    if (!workspaceId) {
      setPages([]);
      setSelectedPageId("");
      setDashboard({ summary: {}, faqs: [], suggestions: [], analytics: [], conversations: [], pageSettings: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const pageResult = await facebookIntegrationService.getClientPagesByWorkspaceId(workspaceId);
      const nextPages = Array.isArray(pageResult?.pages)
        ? pageResult.pages.map(normalizeFacebookPage).filter((page) => page.pageId)
        : [];

      const requestedPageId = String(nextPageId || selectedPageId || "").trim();
      const requestedPageExists = nextPages.some(
        (page) => getFacebookPageId(page) === requestedPageId
      );
      const resolvedPageId = requestedPageExists
        ? requestedPageId
        : getFacebookPageId(nextPages[0]);

      let dashboardResult = null;
      let dashboardError = null;

      if (resolvedPageId) {
        try {
          dashboardResult = await clientFacebookConnectService.getDashboard({
            workspaceId,
            pageId: resolvedPageId,
          });
        } catch (err) {
          dashboardError = err;
        }
      }

      setPages(nextPages);
      setSelectedPageId(resolvedPageId);
      setDashboard({
        summary: dashboardResult?.summary || {},
        analytics: Array.isArray(dashboardResult?.analytics) ? dashboardResult.analytics : [],
        conversations: Array.isArray(dashboardResult?.conversations) ? dashboardResult.conversations : [],
        pageSettings: dashboardResult?.pageSettings || null,
      });

      if (resolvedPageId) {
        try {
          const badgeRes = await handoffService.getBadgeCount({
            workspaceId,
            pageId: resolvedPageId,
          });
          setHandoffBadgeCount(badgeRes.count || 0);
        } catch {
          setHandoffBadgeCount(0);
        }
      }

      if (dashboardError) {
        setError(dashboardError?.message || "Dashboard data could not be loaded.");
      }
    } catch (err) {
      setError(err?.message || "Failed to load knowledge base data.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedPageId]);

  useEffect(() => {
    loadDashboard("");
  }, [workspaceId]);


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Resource Center
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage auto-reply rules, inbox, human handoffs, page knowledge, and analytics.
          </p>
        </div>
        <select
          value={selectedPageId}
          disabled={loading || pages.length === 0}
          onChange={(e) => {
            setSelectedPageId(e.target.value);
            loadDashboard(e.target.value);
          }}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {pages.length === 0 && <option value="">No connected pages</option>}
          {pages.map((page) => (
            <option key={getFacebookPageId(page)} value={getFacebookPageId(page)}>
              {getFacebookPageName(page)}
            </option>
          ))}
        </select>
      </div>

      {!workspaceId && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-secondary)]">
          Workspace ID is not available. Select a workspace first.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1.5 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[var(--brand-gold)] text-black"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.key === "handoffs" && handoffBadgeCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  {handoffBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-secondary)]">Loading...</div>}>
          {activeSubTab === "rules" && (
            <AutoReplyRulesManager
              workspaceId={workspaceId}
              baseUrl={getApiBase()}
              headers={authHeaders}
            />
          )}
          {activeSubTab === "inbox" && (
            <Client_FacebookInbox
              workspaceId={workspaceId}
            />
          )}
          {activeSubTab === "handoffs" && (
            <HumanHandoffs
              workspaceId={workspaceId}
              pageId={selectedPageId}
              pages={pages}
            />
          )}
          {activeSubTab === "knowledge" && (
            <PageKnowledgeSummary
              settings={dashboard.pageSettings}
              onEdit={() => setSearchParams({ tab: "builder", section: "overview" })}
            />
          )}
          {activeSubTab === "analytics" && (
            <FacebookAnalyticsTable
              analytics={dashboard.analytics}
              loading={loading}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
