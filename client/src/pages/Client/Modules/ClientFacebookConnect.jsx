import { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";

import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import clientFacebookConnectService from "../../../services/client/facebookConnect";

import FacebookConnectKPIs from "../../../components/client/facebook/FacebookConnectKPIs";
import FacebookFAQTable from "../../../components/client/facebook/FacebookFAQTable";
import FacebookSuggestionsTable from "../../../components/client/facebook/FacebookSuggestionsTable";
import FacebookAnalyticsTable from "../../../components/client/facebook/FacebookAnalyticsTable";
import FacebookPageSettingsForm from "../../../components/client/facebook/FacebookPageSettingsForm";
import Client_FacebookInbox from "./Client_FacebookInbox";
import HumanHandoffs from "./HumanHandoffs";
import handoffService from "../../../services/handoffService";

import "../../../styles/client/facebook-connect.css";
import "../../../styles/client/facebook-handoff.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "inbox", label: "Inbox" },
  { key: "handoffs", label: "Human Handoff" },
  { key: "faqs", label: "FAQs" },
  { key: "suggestions", label: "Suggestions" },
  { key: "knowledge", label: "Knowledge" },
  { key: "analytics", label: "Analytics" },
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

export default function ClientFacebookConnect({
  adminOverrideMode = false,
  overrideWorkspaceId = "",
}) {
  const context = useOutletContext() || {};
  const workspaceId = normalizeWorkspaceId(
    overrideWorkspaceId || context?.workspace?.id || context?.workspaceId
  );

  const [activeTab, setActiveTab] = useState("overview");
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [handoffBadgeCount, setHandoffBadgeCount] = useState(0);

  const [dashboard, setDashboard] = useState({
    summary: {},
    faqs: [],
    suggestions: [],
    analytics: [],
    conversations: [],
    pageSettings: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPage = useMemo(
    () =>
      pages.find((page) => getFacebookPageId(page) === selectedPageId) ||
      pages[0] ||
      null,
    [pages, selectedPageId]
  );

  const loadClientFacebookConnect = async (nextPageId = selectedPageId) => {
    if (!workspaceId) {
      setPages([]);
      setSelectedPageId("");
      setDashboard({
        summary: {},
        faqs: [],
        suggestions: [],
        analytics: [],
        conversations: [],
        pageSettings: null,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const pageResult =
        await facebookIntegrationService.getClientPagesByWorkspaceId(
          workspaceId
        );

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
        faqs: Array.isArray(dashboardResult?.faqs) ? dashboardResult.faqs : [],
        suggestions: Array.isArray(dashboardResult?.suggestions)
          ? dashboardResult.suggestions
          : [],
        analytics: Array.isArray(dashboardResult?.analytics)
          ? dashboardResult.analytics
          : [],
        conversations: Array.isArray(dashboardResult?.conversations)
          ? dashboardResult.conversations
          : [],
        pageSettings: dashboardResult?.pageSettings || null,
      });

      if (resolvedPageId) {
        try {
          const badgeRes = await handoffService.getBadgeCount({
            workspaceId,
            pageId: resolvedPageId,
          });
          setHandoffBadgeCount(badgeRes.count || 0);
        } catch (badgeErr) {
          console.error("Failed to load initial badge count:", badgeErr);
        }
      }

      if (dashboardError) {
        setError(
          dashboardError?.message ||
            "Connected pages loaded, but dashboard data could not be loaded."
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to load Facebook Connect.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBadgeCount = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const result = await handoffService.getBadgeCount({
        workspaceId,
        pageId: selectedPageId || "",
      });
      setHandoffBadgeCount(result.count || 0);
    } catch (err) {
      console.error("Error loading handoff badge count:", err);
    }
  }, [workspaceId, selectedPageId]);

  useEffect(() => {
    loadClientFacebookConnect("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    fetchBadgeCount();
  }, [fetchBadgeCount]);



  const handleCreateFaq = async (payload = null) => {
    let finalPayload = payload;

    if (!finalPayload) {
      const question = window.prompt("FAQ question:");
      if (!question) return;

      const answer = window.prompt("Approved answer:");
      if (!answer) return;

      const category = window.prompt("Category:", "General") || "General";
      const keywords = window.prompt("Keywords, comma separated:", "") || "";

      finalPayload = {
        question,
        answer,
        category,
        keywords,
        status: "active",
        language: "auto",
      };
    }

    const faqPayload = buildFaqPayload(finalPayload);

    if (!faqPayload.question.trim()) {
      setError("FAQ question is required.");
      return;
    }

    if (!faqPayload.answer.trim()) {
      setError("FAQ answer is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.createFaq({
        workspaceId,
        payload: faqPayload,
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to create FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditFaq = async (faq, payload = null) => {
    let finalPayload = payload;

    if (!finalPayload) {
      const question = window.prompt("FAQ question:", faq.question || "");
      if (!question) return;

      const answer = window.prompt("Approved answer:", faq.answer || "");
      if (!answer) return;

      const category =
        window.prompt("Category:", faq.category || "General") || "General";

      const keywords =
        window.prompt(
          "Keywords, comma separated:",
          Array.isArray(faq.keywords) ? faq.keywords.join(", ") : ""
        ) || "";

      finalPayload = {
        question,
        answer,
        category,
        keywords,
        status: faq.status || "active",
        language: faq.language || "auto",
      };
    }

    const faqPayload = buildFaqPayload(finalPayload, faq);

    if (!faqPayload.question.trim()) {
      setError("FAQ question is required.");
      return;
    }

    if (!faqPayload.answer.trim()) {
      setError("FAQ answer is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.updateFaq({
        workspaceId,
        faqId: faq.id,
        payload: faqPayload,
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to update FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveFaq = async (faq) => {
    if (!window.confirm(`Archive FAQ: "${faq.question}"?`)) return;

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.archiveFaq({
        workspaceId,
        faqId: faq.id,
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to archive FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSuggestion = async (suggestion) => {
    const answer = window.prompt(
      "Approved answer:",
      suggestion.suggestedAnswer || ""
    );

    if (!answer) return;

    const category =
      window.prompt("Category:", "Suggested FAQ") || "Suggested FAQ";
    const keywords = window.prompt("Keywords, comma separated:", "") || "";

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.approveSuggestion({
        workspaceId,
        suggestionId: suggestion.id,
        answer,
        category,
        keywords: parseKeywords(keywords),
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to approve suggestion.");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSuggestion = async (suggestion) => {
    if (!window.confirm(`Reject suggestion: "${suggestion.question}"?`)) return;

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.rejectSuggestion({
        workspaceId,
        suggestionId: suggestion.id,
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to reject suggestion.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveSuggestion = async (suggestion) => {
    if (!window.confirm(`Archive suggestion: "${suggestion.question}"?`)) return;

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.archiveSuggestion({
        workspaceId,
        suggestionId: suggestion.id,
      });

      await loadClientFacebookConnect(selectedPageId);
    } catch (err) {
      setError(err?.message || "Failed to archive suggestion.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (payload) => {
    const pageId = getFacebookPageId(selectedPage);

    if (!pageId) {
      setError("Select a connected Facebook page before saving knowledge.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await clientFacebookConnectService.updateSettings({
        workspaceId,
        pageId,
        payload: {
          ...payload,
          pageId,
        },
      });

      await loadClientFacebookConnect(pageId);
    } catch (err) {
      setError(err?.message || "Failed to save page settings.");
    } finally {
      setSaving(false);
    }
  };

  const renderTab = () => {
    if (activeTab === "inbox") {
      return <Client_FacebookInbox workspaceId={workspaceId} />;
    }

    if (activeTab === "handoffs") {
      return (
        <HumanHandoffs
          workspaceId={workspaceId}
          pageId={selectedPageId}
          pages={pages}
        />
      );
    }

    if (activeTab === "faqs") {
      return (
        <FacebookFAQTable
          faqs={dashboard.faqs}
          loading={loading}
          saving={saving}
          onCreate={handleCreateFaq}
          onEdit={handleEditFaq}
          onArchive={handleArchiveFaq}
        />
      );
    }

    if (activeTab === "suggestions") {
      return (
        <FacebookSuggestionsTable
          suggestions={dashboard.suggestions}
          loading={loading}
          onApprove={handleApproveSuggestion}
          onReject={handleRejectSuggestion}
          onArchive={handleArchiveSuggestion}
        />
      );
    }

    if (activeTab === "knowledge") {
      return (
        <FacebookPageSettingsForm
          settings={dashboard.pageSettings}
          selectedPage={selectedPage}
          loading={loading}
          saving={saving}
          onSave={handleSaveSettings}
        />
      );
    }

    if (activeTab === "analytics") {
      return (
        <FacebookAnalyticsTable
          analytics={dashboard.analytics}
          loading={loading}
        />
      );
    }

    return (
      <div className="facebook-connect-overview-grid">
        <FacebookConnectKPIs summary={dashboard.summary} />

        {selectedPage && (
          <>
            <div className="facebook-connect-overview-card">
              <strong>Connected Page</strong>
              <br />
              {getFacebookPageName(selectedPage)}
            </div>

            <div className="facebook-connect-overview-card">
              <strong>Approved FAQs</strong>
              <br />
              {dashboard.summary?.activeFaqs || 0} active /{" "}
              {dashboard.summary?.draftFaqs || 0} draft
            </div>

            <div className="facebook-connect-overview-card">
              <strong>Pending Suggestions</strong>
              <br />
              {dashboard.summary?.pendingSuggestions || 0} waiting for review
            </div>

            <div className="facebook-connect-overview-card">
              <strong>Fallback Mode</strong>
              <br />
              {dashboard.pageSettings?.fallbackMode || "booking_and_handoff"}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="facebook-connect-page space-y-6">
      <div className="facebook-connect-header">
        <div className="facebook-connect-title-block">
          <p className="facebook-connect-eyebrow">Social Media</p>
          <h1 className="facebook-connect-title">
            {adminOverrideMode ? "Facebook Connect Override" : "Facebook Connect"}
          </h1>
          <p className="facebook-connect-subtitle">
            Manage the client Facebook AI inbox, approved FAQs, page knowledge,
            unanswered question suggestions, and analytics.
          </p>
        </div>

        <div className="facebook-connect-actions">
          <select
            className="facebook-connect-select"
            value={selectedPageId}
            disabled={loading || pages.length === 0}
            onChange={(event) => {
              const nextPageId = event.target.value;
              setSelectedPageId(nextPageId);
              loadClientFacebookConnect(nextPageId);
            }}
          >
            {pages.length === 0 && <option value="">No connected pages</option>}

            {pages.map((page) => {
              const pageId = getFacebookPageId(page);

              return (
                <option key={pageId} value={pageId}>
                  {getFacebookPageName(page)}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="facebook-connect-button facebook-connect-button-primary"
            onClick={() => loadClientFacebookConnect(selectedPageId)}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {!workspaceId && (
        <div className="facebook-connect-alert">
          Workspace ID is not available yet. Contact your workspace owner or
          admin.
        </div>
      )}

      {error && <div className="facebook-connect-alert">{error}</div>}

      <div className="facebook-connect-tabs-wrap">
        <div className="facebook-connect-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`facebook-connect-tab ${
                activeTab === tab.key ? "facebook-connect-tab-active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === "handoffs" && handoffBadgeCount > 0 && (
                <span className="handoff-tab-badge">{handoffBadgeCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="facebook-connect-content">{renderTab()}</div>


    </div>
  );
}
