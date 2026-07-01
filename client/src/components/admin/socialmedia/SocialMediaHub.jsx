import { useState, useEffect, Suspense, lazy, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Inbox as InboxIcon,
  Bot,
  Megaphone,
  BookOpen,
  MessageSquare,
  Database,
  Sparkles,
  Globe,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import { HERMES_INTERNAL_WORKSPACE_ID } from "../../../services/workspaceResolver";
import { supabase } from "../../../config/supabaseClient";

const OmniChannelInbox = lazy(() => import("../omnichannel/OmniChannelInbox.jsx"));
const AdminAIChatbotTester = lazy(() => import("../../../pages/Admin/AdminAIChatbotTester.jsx"));
const SocialMediaAds = lazy(() => import("../../../pages/SocialMediaAds.jsx"));
const KnowledgePanel = lazy(() => import("./KnowledgePanel.jsx"));
const AdminInbox = lazy(() => import("../../../pages/Admin/AdminInbox.jsx"));
const AdminKnowledgeBase = lazy(() => import("../../../pages/Admin/AdminKnowledgeBase.jsx"));
const ChatbotBuilder = lazy(() => import("./ChatbotBuilder.jsx"));
const WebsiteConnectManager = lazy(() => import("../../marketing/WebsiteConnectManager.jsx"));
const FacebookConnectModule = lazy(() => import("./FacebookConnectModule.jsx"));

const NAV_GROUPS = [
  {
    group: "Engage",
    tabs: [
      { key: "inbox", label: "Unified Inbox", icon: InboxIcon, desc: "All channel conversations" },
      { key: "cs-inbox", label: "CS Inbox", icon: MessageSquare, desc: "Customer support tickets" },
      { key: "ads", label: "Ad Campaigns", icon: Megaphone, desc: "Facebook & Instagram ads" },
    ],
  },
  {
    group: "Build",
    tabs: [
      { key: "connections", label: "Channel Connections", icon: Facebook, desc: "Connect Facebook Messenger and other channels", statusKey: "fb" },
      { key: "builder", label: "Chatbot Builder", icon: Sparkles, desc: "AI, rules, broadcasts" },
      { key: "website-connect", label: "Website Connect", icon: Globe, desc: "Connect a website form to the CRM" },
      { key: "chatbot", label: "AI Chatbot Tester", icon: Bot, desc: "Test AI replies" },
    ],
  },
  {
    group: "Resource Center",
    tabs: [
      { key: "knowledge", label: "Resource Center", icon: BookOpen, desc: "Business knowledge base" },
      { key: "kb", label: "KB Articles", icon: Database, desc: "Article management" },
    ],
  },
];

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">
      <Clock className="mr-2 h-4 w-4 animate-spin" /> Loading...
    </div>
  );
}

function getWorkspaceId() {
  return (
    localStorage.getItem("exponify_active_client_workspace_id") ||
    localStorage.getItem("workspaceId") ||
    localStorage.getItem("workspace_id") ||
    HERMES_INTERNAL_WORKSPACE_ID
  );
}

function StatusDot({ connected }) {
  return (
    <span
      className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${
        connected ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
      }`}
      title={connected ? "Connected" : "Not connected"}
    />
  );
}

export default function SocialMediaHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "connections";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);
  
  const [workspaceId, setWorkspaceId] = useState(getWorkspaceId());
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const data = await facebookIntegrationService.getStatus();
        if (data && Array.isArray(data.connectedPages)) {
          const workspaceMap = new Map();
          data.connectedPages.forEach(page => {
            const wsId = page.connectedWorkspaceId || page.workspace_id || page.workspaceId;
            const wsName = page.workspaceName || page.company_name || page.workspace_name || `Workspace (${page.pageName || wsId?.substring(0,8)})`;
            
            if (wsId && wsId !== HERMES_INTERNAL_WORKSPACE_ID) {
              if (!workspaceMap.has(wsId)) {
                workspaceMap.set(wsId, { id: wsId, name: wsName });
              }
            }
          });
          setWorkspaces(Array.from(workspaceMap.values()));
        }
      } catch (err) {
        console.error("Failed to load workspaces:", err);
      }
    }
    loadWorkspaces();
  }, []);

  const handleWorkspaceChange = (e) => {
    const newId = e.target.value;
    setWorkspaceId(newId);
    if (newId) {
      localStorage.setItem("exponify_active_client_workspace_id", newId);
    } else {
      localStorage.removeItem("exponify_active_client_workspace_id");
    }
  };

  const checkFbStatus = useCallback(async () => {
    try {
      const data = await facebookIntegrationService.getStatus();
      const pages = Array.isArray(data?.connectedPages) ? data.connectedPages : [];
      setFbConnected(pages.length > 0);
    } catch {
      setFbConnected(false);
    }
  }, []);

  useEffect(() => {
    checkFbStatus();
  }, [checkFbStatus]);

  const setTab = (key, section = null) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    if (section) {
      next.set("section", section);
    } else {
      next.delete("section");
    }
    next.delete("workspace");
    setSearchParams(next, { replace: true });
  };

  const statusMap = { fb: fbConnected };

  const activeTabData = NAV_GROUPS
    .flatMap(g => g.tabs)
    .find(t => t.key === activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Hub Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--brand-gold)]">
            Social Media & Engagement
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
            Social Media Hub
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Unified inbox, AI chatbot, ad campaigns, channel connections, and engagement tools.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Workspace:</span>
            <select
              value={workspaceId}
              onChange={handleWorkspaceChange}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)]"
            >
              <option value={HERMES_INTERNAL_WORKSPACE_ID}>Hermes Internal</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.company_name || ws.name}
                </option>
              ))}
            </select>
          </div>
          {activeTabData && (
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 lg:flex">
              <activeTabData.icon className="h-4 w-4 text-[var(--brand-gold)]" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">{activeTabData.desc}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 gap-4">
        {/* Sidebar Nav */}
        <nav
          className={`shrink-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] transition-all duration-200 ${
            sidebarCollapsed ? "w-14" : "w-56"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-color)] p-3">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                Navigation
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="p-2">
            {NAV_GROUPS.map((group, groupIdx) => (
              <div key={group.group}>
                {groupIdx > 0 && (
                  <div className="my-2 h-px bg-[var(--border-color)]" />
                )}
                {!sidebarCollapsed && (
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    {group.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    const connected = tab.statusKey ? statusMap[tab.statusKey] : null;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setTab(tab.key)}
                        title={sidebarCollapsed ? tab.label : undefined}
                        className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[var(--brand-gold)] text-black"
                            : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                        } ${sidebarCollapsed ? "justify-center" : ""}`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-black" : "text-[var(--text-muted)]"}`} />
                        {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                        {connected !== null && !sidebarCollapsed && <StatusDot connected={connected} />}
                        {connected !== null && sidebarCollapsed && (
                          <span
                            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] ${
                              connected ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Connection status footer */}
          {!sidebarCollapsed && (
            <div className="border-t border-[var(--border-color)] p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${fbConnected ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  {fbConnected ? "Facebook Connected" : "No FB Page"}
                </span>
              </div>
            </div>
          )}
        </nav>

        {/* Tab Content */}
        <div className="min-w-0 flex-1">
          <Suspense fallback={<PageLoader />}>
            {activeTab === "inbox" && <OmniChannelInbox workspaceId={workspaceId} />}
            {activeTab === "chatbot" && <AdminAIChatbotTester workspaceId={workspaceId} />}
            {activeTab === "connections" && <FacebookConnectModule workspaceId={workspaceId} onRefresh={checkFbStatus} onNavigateTab={setTab} />}
            {activeTab === "builder" && <ChatbotBuilder workspaceId={workspaceId} onNavigateTab={setTab} onStatusChange={checkFbStatus} />}
            {activeTab === "website-connect" && <WebsiteConnectManager workspaceId={workspaceId} />}
            {activeTab === "knowledge" && <KnowledgePanel workspaceId={workspaceId} />}
            {activeTab === "ads" && <SocialMediaAds workspaceId={workspaceId} />}
            {activeTab === "cs-inbox" && <AdminInbox />}
            {activeTab === "kb" && <AdminKnowledgeBase />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
