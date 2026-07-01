import { createElement, useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import {
  Archive, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleDollarSign, Copy, Download, Edit3, Eye, FileImage,
  ImagePlus, Instagram, Link2, Loader2, Megaphone, MessageCircle,
  MoreHorizontal, Pause, Play, Plus, RefreshCw, Search, Send,
  Sparkles, Target, Trash2, TrendingUp, Upload, Users, X,
} from "lucide-react";

import {
  createSocialAdCampaign,
  deleteSocialAdCampaign,
  generateSocialAdSuggestion,
  getSocialAdAnalytics,
  getSocialAdConnections,
  listSocialAdCampaigns,
  listSocialAdWorkspaces,
  removeSocialAdConnection,
  runSocialAdAction,
  saveSocialAdConnection,
  testSocialAdConnection,
  updateSocialAdCampaign,
  uploadSocialAdCreative,
} from "../services/marketing/socialMediaAds";

import "../styles/social-media-ads.css";

const PLATFORMS = ["facebook", "instagram", "tiktok", "messenger", "shopee", "lazada", "website"];
const OBJECTIVES = [
  "get_messages", "get_bookings", "get_website_visits", "promote_product",
  "promote_shopee_link", "promote_lazada_link", "generate_leads", "brand_awareness",
];
const STATUSES = [
  "draft", "pending_approval", "approved", "rejected", "ready_to_publish",
  "active", "paused", "completed", "archived", "failed", "needs_connection",
];
const CTA_OPTIONS = ["send_message", "book_now", "shop_now", "learn_more", "contact_us", "view_products", "get_quote"];
const CUSTOMER_TYPES = ["Homeowners", "Business Owners", "Office Owners", "Store Owners", "Solar Customers", "CCTV Customers", "WiFi / Networking Customers"];
const STEPS = ["Campaign Details", "Ad Creative", "Audience", "Budget & Schedule", "Review & Preview"];
const EMPTY_SUMMARY = {
  totalCampaigns: 0, activeAds: 0, draftAds: 0, pendingApproval: 0,
  totalBudget: 0, totalSpend: 0, leadsGenerated: 0, bookingsGenerated: 0,
  messagesReceived: 0, bestPerformingCampaign: "None yet",
};
const EMPTY_FORM = {
  campaignName: "", platforms: ["facebook"], objective: "get_messages",
  campaignType: "standard", productServiceName: "", destinationType: "messenger",
  destinationUrl: "", internalNotes: "", pageName: "Your Business",
  headline: "", primaryText: "", description: "", callToAction: "send_message",
  imageUrl: "", audienceLocations: [], audienceAgeMin: 18, audienceAgeMax: 65,
  audienceGender: "all", audienceInterests: [], customerType: "Business Owners",
  language: "English", audienceNotes: "", dailyBudget: 0, totalBudget: 0,
  budgetType: "daily", bidStrategy: "lowest_cost", scheduleType: "continuous",
  startDate: "", endDate: "", aiSuggestion: {},
};
const CAMPAIGN_TEMPLATES = {
  messages: { objective: "get_messages", destinationType: "messenger", callToAction: "send_message", headline: "Talk to our team today", primaryText: "Have questions? Send us a message and our team will help you choose the right option.", description: "Fast, helpful assistance." },
  booking: { objective: "get_bookings", destinationType: "booking_page", callToAction: "book_now", headline: "Book your consultation", primaryText: "Choose a convenient schedule and speak with our team about the solution that fits your needs.", description: "Reserve your preferred time." },
  product: { objective: "promote_product", destinationType: "website_page", callToAction: "view_products", headline: "Discover the right solution", primaryText: "Explore our products and services, compare your options, and find the best fit for your goals.", description: "View available options." },
};

function label(value = "") {
  return String(value).split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat("en-PH", { notation: Number(value || 0) > 9999 ? "compact" : "standard" }).format(Number(value || 0));
}

function date(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function getStoredWorkspaceId() {
  try {
    return localStorage.getItem("exponify_active_client_workspace_id") || localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id") || "";
  } catch {
    return "";
  }
}

function splitList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function mergeForm(campaign = {}) {
  return {
    ...EMPTY_FORM,
    ...campaign,
    metrics: undefined,
    audienceLocationsText: (campaign.audienceLocations || []).join(", "),
    audienceInterestsText: (campaign.audienceInterests || []).join(", "),
  };
}

function campaignPayload(form) {
  return {
    ...form,
    audienceLocations: splitList(form.audienceLocationsText),
    audienceInterests: splitList(form.audienceInterestsText),
  };
}

function MetricCard({ icon: Icon, label: title, value, tone = "gold" }) {
  return (
    <div className={`social-ads-metric social-ads-metric-${tone}`}>
      <div className="social-ads-metric-icon">{createElement(Icon, { size: 18 })}</div>
      <div><span>{title}</span><strong title={String(value)}>{value}</strong></div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`social-ads-status social-ads-status-${status}`}>{label(status)}</span>;
}

function PlatformBadge({ platform }) {
  return <span className={`social-ads-platform social-ads-platform-${platform}`}>{label(platform)}</span>;
}

function Modal({ title, description, children, onClose, footer, busy }) {
  return (
    <div className="social-ads-modal-backdrop" role="presentation">
      <section className="social-ads-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" onClick={onClose} disabled={busy} title="Close"><X size={18} /></button></header>
        <div className="social-ads-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

function AdPreview({ form, mode, setMode }) {
  const platform = mode === "mobile" || mode === "desktop" ? form.platforms?.[0] || "facebook" : mode;
  return (
    <aside className="social-ads-preview-pane">
      <div className="social-ads-preview-toolbar">
        <span>Live Preview</span>
        <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Preview mode">
          <option value="facebook">Facebook Feed</option><option value="instagram">Instagram Feed</option>
          <option value="messenger">Messenger</option><option value="tiktok">TikTok Style</option>
          <option value="mobile">Mobile Preview</option><option value="desktop">Desktop Preview</option>
        </select>
      </div>
      <div className={`social-ad-preview social-ad-preview-${mode}`}>
        <div className="social-ad-preview-head"><div className="social-ad-avatar">{(form.pageName || "Y").charAt(0)}</div><div><strong>{form.pageName || "Your Business"}</strong><span>Sponsored</span></div><PlatformBadge platform={platform} /></div>
        <p>{form.primaryText || "Your primary ad text will appear here."}</p>
        <div className="social-ad-preview-media">
          {form.imageUrl ? <img src={form.imageUrl} alt="Ad creative preview" /> : <div><FileImage size={34} /><span>Ad creative preview</span></div>}
        </div>
        <div className="social-ad-preview-copy"><div><small>{form.destinationUrl || "YOUR DESTINATION"}</small><h3>{form.headline || "Your campaign headline"}</h3><p>{form.description || "A short supporting description."}</p></div><button type="button">{label(form.callToAction)}</button></div>
      </div>
    </aside>
  );
}

export default function SocialMediaAds() {
  const outlet = useOutletContext() || {};
  const location = useLocation();
  const isAdmin = location.pathname.toLowerCase().startsWith("/admin");
  const contextWorkspaceId = outlet.workspace?.id || outlet.workspaceId || "";
  const [workspaceId, setWorkspaceId] = useState(contextWorkspaceId || getStoredWorkspaceId());
  const [workspaces, setWorkspaces] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [connections, setConnections] = useState({});
  const [connectionDetails, setConnectionDetails] = useState({});
  const [facebookPages, setFacebookPages] = useState([]);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [objectiveFilter, setObjectiveFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [openMenu, setOpenMenu] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(mergeForm());
  const [savedForm, setSavedForm] = useState(mergeForm());
  const [step, setStep] = useState(0);
  const [previewMode, setPreviewMode] = useState("facebook");
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [connectionForm, setConnectionForm] = useState({});
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  const isDirty = builderOpen && JSON.stringify(form) !== JSON.stringify(savedForm);

  useEffect(() => {
    if (!isAdmin) return;
    listSocialAdWorkspaces().then((items) => {
      setWorkspaces(items || []);
      if (!workspaceId && items?.[0]?.id) setWorkspaceId(items[0].id);
    }).catch(() => setWorkspaces([]));
  }, [isAdmin, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;

    async function loadWorkspaceCampaigns() {
      setLoading(true);
      setError("");
      try {
        const [campaignRows, analytics, connectionRows] = await Promise.all([
          listSocialAdCampaigns(workspaceId),
          getSocialAdAnalytics(workspaceId),
          getSocialAdConnections(workspaceId),
        ]);
        if (!active) return;
        setCampaigns(campaignRows || []);
        setSummary(analytics?.summary || EMPTY_SUMMARY);
        setDailyMetrics(analytics?.daily || []);
        applyConnectionPayload(connectionRows || {});
      } catch (err) {
        if (active) setError(err.message || "Could not load social ad campaigns.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWorkspaceCampaigns();
    return () => { active = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const visibleCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = campaigns.filter((campaign) => {
      if (platformFilter !== "all" && !campaign.platforms.includes(platformFilter)) return false;
      if (statusFilter !== "all" && campaign.status !== statusFilter) return false;
      if (objectiveFilter !== "all" && campaign.objective !== objectiveFilter) return false;
      const createdDate = String(campaign.createdAt || "").slice(0, 10);
      if (dateFrom && createdDate < dateFrom) return false;
      if (dateTo && createdDate > dateTo) return false;
      return !query || [campaign.campaignName, campaign.headline, campaign.productServiceName].some((value) => String(value || "").toLowerCase().includes(query));
    });
    return [...rows].sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "budget") return b.totalBudget - a.totalBudget;
      if (sort === "spend") return b.metrics.spend - a.metrics.spend;
      if (sort === "leads") return b.metrics.leads - a.metrics.leads;
      if (sort === "clicks") return b.metrics.clicks - a.metrics.clicks;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [campaigns, search, platformFilter, statusFilter, objectiveFilter, dateFrom, dateTo, sort]);

  async function refresh() {
    if (!workspaceId) return;
    setLoading(true); setError("");
    try {
      const [rows, analytics, connectionRows] = await Promise.all([listSocialAdCampaigns(workspaceId), getSocialAdAnalytics(workspaceId), getSocialAdConnections(workspaceId)]);
      setCampaigns(rows || []); setSummary(analytics?.summary || EMPTY_SUMMARY); setDailyMetrics(analytics?.daily || []); applyConnectionPayload(connectionRows || {});
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function notify(message) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  }

  function applyConnectionPayload(payload = {}) {
    setConnections(payload.statuses || payload || {});
    setConnectionDetails(payload.details || {});
    setFacebookPages(payload.facebookPages || []);
  }

  function openBuilder(campaign = null, viewOnly = false) {
    const next = mergeForm(campaign || {});
    setForm(next); setSavedForm(next); setEditingId(campaign?.id || ""); setStep(viewOnly ? 4 : 0); setBuilderOpen(true); setFormError(""); setOpenMenu("");
  }

  function closeBuilder() {
    if (isDirty && !window.confirm("Discard unsaved campaign changes?")) return;
    setBuilderOpen(false); setEditingId(""); setFormError("");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePlatform(platform) {
    setForm((current) => ({ ...current, platforms: current.platforms.includes(platform) ? current.platforms.filter((item) => item !== platform) : [...current.platforms, platform] }));
  }

  function applyTemplate(templateKey) {
    const template = CAMPAIGN_TEMPLATES[templateKey];
    if (!template) return;
    setForm((current) => ({ ...current, ...template }));
    notify("Campaign template applied.");
  }

  function validateStep(targetStep = step) {
    if (targetStep === 0 && (!form.campaignName.trim() || form.platforms.length === 0)) return "Campaign name and at least one platform are required.";
    if (targetStep === 0 && form.destinationUrl && !/^https?:\/\//i.test(form.destinationUrl)) return "Destination URL must start with http:// or https://.";
    if (targetStep === 1 && (!form.headline.trim() || !form.primaryText.trim())) return "Headline and primary text are required.";
    if (targetStep === 2 && Number(form.audienceAgeMin) > Number(form.audienceAgeMax)) return "Minimum age cannot exceed maximum age.";
    if (targetStep === 3 && Number(form.dailyBudget) < 0) return "Budget cannot be negative.";
    if (targetStep === 3 && form.startDate && form.endDate && form.endDate < form.startDate) return "End date cannot be before start date.";
    return "";
  }

  function nextStep() {
    const issue = validateStep();
    if (issue) { setFormError(issue); return; }
    setFormError(""); setStep((current) => Math.min(4, current + 1));
  }

  async function saveCampaign(nextAction = "draft") {
    for (let index = 0; index < 4; index += 1) {
      const issue = validateStep(index);
      if (issue) { setStep(index); setFormError(issue); return; }
    }
    setSaving(true); setFormError("");
    try {
      const saved = editingId ? await updateSocialAdCampaign(workspaceId, editingId, campaignPayload(form)) : await createSocialAdCampaign(workspaceId, campaignPayload(form));
      if (nextAction === "submit") await runSocialAdAction(workspaceId, saved.id, "submit");
      setSavedForm(mergeForm(saved)); setBuilderOpen(false); setEditingId("");
      await refresh(); notify(nextAction === "submit" ? "Campaign submitted for approval." : "Campaign saved as draft.");
    } catch (err) { setFormError(err.message || "Campaign could not be saved."); } finally { setSaving(false); }
  }

  async function uploadImage(file) {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 2097152) { setFormError("Use a JPG, PNG, or WebP image up to 2 MB."); return; }
    setUploading(true); setFormError("");
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await uploadSocialAdCreative(workspaceId, dataUrl);
      updateField("imageUrl", result.imageUrl); notify("Creative image uploaded.");
    } catch (err) { setFormError(err.message || "Image upload failed."); } finally { setUploading(false); }
  }

  async function generateSuggestion() {
    setAiLoading(true); setFormError("");
    try {
      const suggestion = await generateSocialAdSuggestion(workspaceId, form);
      updateField("aiSuggestion", suggestion); notify("AI suggestion generated. Review before applying.");
    } catch (err) { setFormError(err.configured === false ? "AI connection not configured." : err.message); } finally { setAiLoading(false); }
  }

  function applySuggestion() {
    const suggestion = form.aiSuggestion || {};
    setForm((current) => ({ ...current, headline: suggestion.headline || current.headline, primaryText: suggestion.caption || current.primaryText, callToAction: suggestion.cta || current.callToAction, audienceNotes: suggestion.audienceSuggestion || current.audienceNotes }));
    notify("AI suggestion applied to the draft.");
  }

  async function executeAction(campaign, action, payload = {}) {
    setSaving(true); setError(""); setOpenMenu("");
    try {
      if (action === "delete") await deleteSocialAdCampaign(workspaceId, campaign.id);
      else await runSocialAdAction(workspaceId, campaign.id, action, payload);
      await refresh(); notify(`Campaign ${action.replace("_", " ")} completed.`); setModal(null); setRejectionReason("");
    } catch (err) { setError(err.message || "Campaign action failed."); } finally { setSaving(false); }
  }

  function openConnectionModal(platform) {
    const current = connectionDetails[platform] || {};
    const fallbackPage = facebookPages[0] || {};
    setConnectionError("");
    setConnectionForm({
      platform,
      facebookPageId: current.facebookPageId || fallbackPage.pageId || "",
      facebookPageName: current.facebookPageName || fallbackPage.pageName || "",
      adAccountId: current.adAccountId || "",
      adAccountName: current.adAccountName || "",
      externalBusinessId: current.externalBusinessId || "",
      notes: current.notes || "",
    });
    setModal({ type: "connection", platform });
  }

  function updateConnectionField(key, value) {
    setConnectionForm((current) => ({ ...current, [key]: value }));
    if (key === "facebookPageId") {
      const selected = facebookPages.find((page) => String(page.pageId) === String(value));
      if (selected) setConnectionForm((current) => ({ ...current, facebookPageName: selected.pageName }));
    }
  }

  async function saveConnection() {
    const platform = connectionForm.platform;
    if (["facebook", "instagram", "messenger"].includes(platform) && !connectionForm.facebookPageId) {
      setConnectionError("Select a Facebook page connected in Facebook Connect.");
      return;
    }
    if (["facebook", "instagram", "messenger"].includes(platform) && !connectionForm.adAccountId.trim()) {
      setConnectionError("Enter the Meta Ad Account ID before saving.");
      return;
    }
    setConnectionBusy(true);
    setConnectionError("");
    try {
      await saveSocialAdConnection(workspaceId, platform, connectionForm);
      const payload = await getSocialAdConnections(workspaceId);
      applyConnectionPayload(payload || {});
      setModal(null);
      notify(`${label(platform)} publishing connection saved.`);
    } catch (err) {
      setConnectionError(err.message || "Connection could not be saved.");
    } finally {
      setConnectionBusy(false);
    }
  }

  async function disconnectPlatform(platform) {
    if (!window.confirm(`Remove the saved ${label(platform)} publishing connection?`)) return;
    setConnectionBusy(true);
    setError("");
    try {
      await removeSocialAdConnection(workspaceId, platform);
      const payload = await getSocialAdConnections(workspaceId);
      applyConnectionPayload(payload || {});
      notify(`${label(platform)} publishing connection removed.`);
    } catch (err) {
      setError(err.message || "Connection could not be removed.");
    } finally {
      setConnectionBusy(false);
    }
  }

  function exportCampaigns() {
    const headers = ["Campaign", "Platforms", "Objective", "Status", "Budget", "Spend", "Leads", "Clicks", "Created"];
    const rows = visibleCampaigns.map((item) => [item.campaignName, item.platforms.join(" | "), label(item.objective), label(item.status), item.totalBudget, item.metrics.spend, item.metrics.leads, item.metrics.clicks, item.createdAt]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "social-media-ads.csv"; link.click(); URL.revokeObjectURL(url);
  }

  function renderBuilderStep() {
    if (step === 0) return <div className="social-ads-form-grid">
      <label className="social-ads-field social-ads-span-2"><span>Campaign Name *</span><input value={form.campaignName} onChange={(e) => updateField("campaignName", e.target.value)} maxLength={160} /></label>
      <fieldset className="social-ads-field social-ads-span-2"><legend>Platforms *</legend><div className="social-ads-platform-picker">{PLATFORMS.map((item) => <button type="button" key={item} className={form.platforms.includes(item) ? "selected" : ""} onClick={() => togglePlatform(item)}>{form.platforms.includes(item) && <Check size={14} />}{label(item)}</button>)}</div></fieldset>
      <label className="social-ads-field"><span>Objective</span><select value={form.objective} onChange={(e) => updateField("objective", e.target.value)}>{OBJECTIVES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label className="social-ads-field"><span>Campaign Type</span><select value={form.campaignType} onChange={(e) => updateField("campaignType", e.target.value)}><option value="standard">Standard</option><option value="product">Product Promotion</option><option value="retargeting">Retargeting</option></select></label>
      <label className="social-ads-field"><span>Product or Service</span><input value={form.productServiceName} onChange={(e) => updateField("productServiceName", e.target.value)} /></label>
      <label className="social-ads-field"><span>Destination Type</span><select value={form.destinationType} onChange={(e) => updateField("destinationType", e.target.value)}><option value="website_page">Website Page</option><option value="booking_page">Booking Page</option><option value="messenger">Messenger</option><option value="shopee_product_link">Shopee Product Link</option><option value="lazada_product_link">Lazada Product Link</option><option value="custom_url">Custom URL</option></select></label>
      <label className="social-ads-field social-ads-span-2"><span>Destination URL</span><div className="social-ads-input-icon"><Link2 size={16} /><input value={form.destinationUrl} onChange={(e) => updateField("destinationUrl", e.target.value)} placeholder="https://" /></div></label>
      <label className="social-ads-field social-ads-span-2"><span>Internal Notes</span><textarea value={form.internalNotes} onChange={(e) => updateField("internalNotes", e.target.value)} rows={3} /></label>
    </div>;

    if (step === 1) return <div className="social-ads-form-grid">
      <label className="social-ads-field"><span>Page Name</span><input value={form.pageName} onChange={(e) => updateField("pageName", e.target.value)} /></label>
      <label className="social-ads-field"><span>Call-to-Action</span><select value={form.callToAction} onChange={(e) => updateField("callToAction", e.target.value)}>{CTA_OPTIONS.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label className="social-ads-field social-ads-span-2"><span>Ad Headline <em>{form.headline.length}/40</em></span><input value={form.headline} onChange={(e) => updateField("headline", e.target.value)} maxLength={80} className={form.headline.length > 40 ? "warning" : ""} /></label>
      <label className="social-ads-field social-ads-span-2"><span>Primary Text <em>{form.primaryText.length}/125</em></span><textarea value={form.primaryText} onChange={(e) => updateField("primaryText", e.target.value)} rows={5} maxLength={500} className={form.primaryText.length > 125 ? "warning" : ""} /></label>
      <label className="social-ads-field social-ads-span-2"><span>Short Description <em>{form.description.length}/30</em></span><input value={form.description} onChange={(e) => updateField("description", e.target.value)} maxLength={80} className={form.description.length > 30 ? "warning" : ""} /></label>
      <div className="social-ads-upload social-ads-span-2">{form.imageUrl ? <><img src={form.imageUrl} alt="Uploaded ad creative" /><div><label className="social-ads-button"><Upload size={15} />Replace Image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} hidden /></label><button type="button" className="social-ads-button danger" onClick={() => updateField("imageUrl", "")}><Trash2 size={15} />Remove</button></div></> : <label><ImagePlus size={28} /><strong>{uploading ? "Uploading..." : "Upload ad image"}</strong><span>JPG, PNG, or WebP up to 2 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} hidden /></label>}</div>
      <section className="social-ads-ai social-ads-span-2"><div><Sparkles size={18} /><div><strong>AI Ad Suggestion</strong><p>{connections.ai === "connected" ? "Generate editable copy and audience guidance." : "AI connection not configured."}</p></div><button type="button" className="social-ads-button" onClick={generateSuggestion} disabled={aiLoading}>{aiLoading ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}Generate Suggestion</button></div>{Object.keys(form.aiSuggestion || {}).length > 0 && <article><h4>{form.aiSuggestion.headline}</h4><p>{form.aiSuggestion.caption}</p><small>{(form.aiSuggestion.hashtags || []).join(" ")}</small><div><button type="button" className="social-ads-button primary" onClick={applySuggestion}>Apply Suggestion</button><button type="button" className="social-ads-button" onClick={() => updateField("aiSuggestion", {})}>Reject Suggestion</button></div></article>}</section>
    </div>;

    if (step === 2) return <div className="social-ads-form-grid">
      <label className="social-ads-field social-ads-span-2"><span>Target Locations</span><input value={form.audienceLocationsText} onChange={(e) => updateField("audienceLocationsText", e.target.value)} placeholder="Manila, Cavite, Tagaytay" /><small>Separate locations with commas.</small></label>
      <label className="social-ads-field"><span>Minimum Age</span><input type="number" min="13" max="65" value={form.audienceAgeMin} onChange={(e) => updateField("audienceAgeMin", Number(e.target.value))} /></label>
      <label className="social-ads-field"><span>Maximum Age</span><input type="number" min="13" max="65" value={form.audienceAgeMax} onChange={(e) => updateField("audienceAgeMax", Number(e.target.value))} /></label>
      <label className="social-ads-field"><span>Gender</span><select value={form.audienceGender} onChange={(e) => updateField("audienceGender", e.target.value)}><option value="all">All</option><option value="female">Female</option><option value="male">Male</option></select></label>
      <label className="social-ads-field"><span>Customer Type</span><select value={form.customerType} onChange={(e) => updateField("customerType", e.target.value)}>{CUSTOMER_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="social-ads-field"><span>Language</span><select value={form.language} onChange={(e) => updateField("language", e.target.value)}><option>English</option><option>Tagalog</option><option>Taglish</option><option value="all">All Languages</option></select></label>
      <label className="social-ads-field"><span>Interests</span><input value={form.audienceInterestsText} onChange={(e) => updateField("audienceInterestsText", e.target.value)} placeholder="Solar energy, Home improvement" /></label>
      <label className="social-ads-field social-ads-span-2"><span>Custom Audience Notes</span><textarea value={form.audienceNotes} onChange={(e) => updateField("audienceNotes", e.target.value)} rows={4} /></label>
    </div>;

    if (step === 3) return <div className="social-ads-form-grid">
      <label className="social-ads-field"><span>Budget Type</span><select value={form.budgetType} onChange={(e) => updateField("budgetType", e.target.value)}><option value="daily">Daily</option><option value="lifetime">Lifetime</option></select></label>
      <label className="social-ads-field"><span>Daily Budget (PHP)</span><input type="number" min="0" step="100" value={form.dailyBudget} onChange={(e) => updateField("dailyBudget", Number(e.target.value))} /></label>
      <label className="social-ads-field"><span>Total Budget (PHP)</span><input type="number" min="0" step="100" value={form.totalBudget} onChange={(e) => updateField("totalBudget", Number(e.target.value))} /></label>
      <label className="social-ads-field"><span>Bid Strategy</span><select value={form.bidStrategy} onChange={(e) => updateField("bidStrategy", e.target.value)}><option value="lowest_cost">Lowest Cost</option><option value="bid_cap">Bid Cap</option><option value="cost_cap">Cost Cap</option><option value="target_roas">Target ROAS</option></select></label>
      <label className="social-ads-field"><span>Start Date</span><input type="date" value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} /></label>
      <label className="social-ads-field"><span>End Date</span><input type="date" value={form.endDate} onChange={(e) => updateField("endDate", e.target.value)} /></label>
      <label className="social-ads-field social-ads-span-2"><span>Schedule Type</span><select value={form.scheduleType} onChange={(e) => updateField("scheduleType", e.target.value)}><option value="continuous">Run Continuously</option><option value="date_range">Date Range</option><option value="manual">Manual Start</option></select></label>
      <div className="social-ads-budget-note social-ads-span-2"><CircleDollarSign size={19} /><div><strong>Budget check</strong><p>{form.startDate && form.endDate ? `Estimated duration: ${Math.max(1, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)} days.` : "Set dates to see the estimated duration."} {Number(form.totalBudget) > 0 && Number(form.dailyBudget) > Number(form.totalBudget) ? "Daily budget is higher than total budget." : "Review platform minimums before publishing."}</p></div></div>
    </div>;

    return <div className="social-ads-review"><section><h3>Campaign</h3><dl><div><dt>Name</dt><dd>{form.campaignName}</dd></div><div><dt>Objective</dt><dd>{label(form.objective)}</dd></div><div><dt>Platforms</dt><dd>{form.platforms.map(label).join(", ")}</dd></div><div><dt>Destination</dt><dd>{form.destinationUrl || label(form.destinationType)}</dd></div></dl></section><section><h3>Audience & Budget</h3><dl><div><dt>Audience</dt><dd>{form.customerType}, ages {form.audienceAgeMin}-{form.audienceAgeMax}</dd></div><div><dt>Locations</dt><dd>{form.audienceLocationsText || "All configured locations"}</dd></div><div><dt>Budget</dt><dd>{money(form.totalBudget || form.dailyBudget)} {form.budgetType}</dd></div><div><dt>Schedule</dt><dd>{date(form.startDate)} - {date(form.endDate)}</dd></div></dl></section>{form.activityLog?.length > 0 && <section className="social-ads-span-2"><h3>Activity History</h3><dl>{[...form.activityLog].reverse().slice(0, 8).map((item, index) => <div key={`${item.at}-${index}`}><dt>{item.at ? new Date(item.at).toLocaleString("en-PH") : label(item.type)}</dt><dd>{item.message || label(item.type)}</dd></div>)}</dl></section>}</div>;
  }

  const metrics = [
    [Megaphone, "Total Campaigns", number(summary.totalCampaigns), "gold"], [Play, "Active Ads", number(summary.activeAds), "green"],
    [Edit3, "Draft Ads", number(summary.draftAds), "blue"], [Target, "Pending Approval", number(summary.pendingApproval), "purple"],
    [CircleDollarSign, "Total Budget", money(summary.totalBudget), "gold"], [TrendingUp, "Total Spend", money(summary.totalSpend), "red"],
    [Users, "Leads Generated", number(summary.leadsGenerated), "green"], [CalendarDays, "Bookings", number(summary.bookingsGenerated), "blue"],
    [MessageCircle, "Messages", number(summary.messagesReceived), "purple"], [BarChart3, "Best Campaign", summary.bestPerformingCampaign, "gold"],
  ];

  return (
    <div className="social-ads-page">
      {success && <div className="social-ads-toast"><Check size={16} />{success}</div>}
      <header className="social-ads-header"><div><span>Marketing</span><h1>Social Media Ads</h1><p>Create, approve, preview, and track workspace ad campaigns.</p></div><div>{isAdmin && <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} aria-label="Workspace"><option value="">Select workspace</option>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" className="social-ads-button" onClick={refresh} disabled={loading || !workspaceId} title="Refresh"><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button><button type="button" className="social-ads-button primary" onClick={() => openBuilder()} disabled={!workspaceId}><Plus size={16} />New Campaign</button></div></header>

      {!workspaceId && <div className="social-ads-alert">Select a workspace before managing social media ads.</div>}
      {error && <div className="social-ads-alert error">{error}</div>}

      <nav className="social-ads-tabs"><button className={activeTab === "campaigns" ? "active" : ""} onClick={() => setActiveTab("campaigns")}><Megaphone size={16} />Campaigns</button><button className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}><BarChart3 size={16} />Analytics</button><button className={activeTab === "connections" ? "active" : ""} onClick={() => setActiveTab("connections")}><Link2 size={16} />Connections</button></nav>

      {activeTab === "campaigns" && <>
        <section className="social-ads-metrics">{metrics.map(([icon, title, value, tone]) => <MetricCard key={title} icon={icon} label={title} value={value} tone={tone} />)}</section>
        <section className="social-ads-panel"><div className="social-ads-toolbar"><div className="social-ads-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." /></div><select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}><option value="all">All platforms</option>{PLATFORMS.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)}><option value="all">All objectives</option>{OBJECTIVES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Created from" title="Created from" /><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Created to" title="Created to" /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="budget">Budget</option><option value="spend">Spend</option><option value="leads">Leads</option><option value="clicks">Clicks</option></select><button type="button" className="social-ads-icon-button" onClick={exportCampaigns} title="Export CSV"><Download size={17} /></button></div>
          <div className="social-ads-table-wrap"><table><thead><tr><th>Campaign</th><th>Platform</th><th>Objective</th><th>Status</th><th>Budget</th><th>Schedule</th><th>Leads</th><th>Clicks</th><th>Spend</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{loading ? <tr><td colSpan="11"><div className="social-ads-empty"><Loader2 className="spin" />Loading campaigns...</div></td></tr> : visibleCampaigns.length === 0 ? <tr><td colSpan="11"><div className="social-ads-empty"><Megaphone size={32} /><strong>No campaigns found</strong><span>Create a campaign or adjust the filters.</span></div></td></tr> : visibleCampaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.campaignName}</strong><small>{campaign.productServiceName || "General promotion"}</small></td><td><div className="social-ads-platforms">{campaign.platforms.slice(0, 2).map((item) => <PlatformBadge key={item} platform={item} />)}{campaign.platforms.length > 2 && <span>+{campaign.platforms.length - 2}</span>}</div></td><td>{label(campaign.objective)}</td><td><StatusBadge status={campaign.status} /></td><td>{money(campaign.totalBudget || campaign.dailyBudget)}</td><td><span>{date(campaign.startDate)}</span><small>{campaign.endDate ? `to ${date(campaign.endDate)}` : "No end date"}</small></td><td>{number(campaign.metrics.leads)}</td><td>{number(campaign.metrics.clicks)}</td><td>{money(campaign.metrics.spend)}</td><td>{date(campaign.createdAt?.slice(0, 10))}</td><td><div className="social-ads-row-actions"><button type="button" title="Preview" onClick={() => openBuilder(campaign, true)}><Eye size={16} /></button><button type="button" title="Edit" onClick={() => openBuilder(campaign)}><Edit3 size={16} /></button><button type="button" title="More actions" onClick={() => setOpenMenu(openMenu === campaign.id ? "" : campaign.id)}><MoreHorizontal size={17} /></button>{openMenu === campaign.id && <div className="social-ads-action-menu"><button onClick={() => executeAction(campaign, "duplicate")}><Copy size={15} />Duplicate</button>{campaign.status === "draft" && <button onClick={() => executeAction(campaign, "submit")}><Send size={15} />Submit</button>}{campaign.status === "pending_approval" && <><button onClick={() => setModal({ type: "approve", campaign })}><Check size={15} />Approve</button><button onClick={() => { setRejectionReason(""); setModal({ type: "reject", campaign }); }}><X size={15} />Reject</button></>}{campaign.status === "approved" && <button onClick={() => executeAction(campaign, "publish")}><Upload size={15} />Prepare Publish</button>}{campaign.status === "active" && <button onClick={() => executeAction(campaign, "pause")}><Pause size={15} />Pause</button>}{campaign.status === "paused" && <button onClick={() => executeAction(campaign, "resume")}><Play size={15} />Resume</button>}<button onClick={() => setModal({ type: "archive", campaign })}><Archive size={15} />Archive</button>{["draft", "rejected", "archived"].includes(campaign.status) && <button className="danger" onClick={() => setModal({ type: "delete", campaign })}><Trash2 size={15} />Delete</button>}</div>}</div></td></tr>)}</tbody></table></div>
        </section>
      </>}

      {activeTab === "analytics" && <section className="social-ads-panel social-ads-analytics"><header><div><h2>Campaign Performance</h2><p>Recorded workspace metrics by day.</p></div></header><div className="social-ads-chart">{dailyMetrics.length === 0 ? <div className="social-ads-empty"><BarChart3 size={32} /><strong>No performance data yet</strong><span>Metrics appear after they are synchronized or recorded.</span></div> : dailyMetrics.slice(-30).map((item) => { const max = Math.max(...dailyMetrics.map((row) => Number(row.impressions || 0)), 1); return <div key={item.metric_date} title={`${item.metric_date}: ${number(item.impressions)} impressions`}><span style={{ height: `${Math.max(4, (Number(item.impressions || 0) / max) * 100)}%` }} /><small>{item.metric_date.slice(5)}</small></div>; })}</div></section>}

      {activeTab === "connections" && <section className="social-ads-panel social-ads-connections"><header><div><h2>Publishing Connections</h2><p>Reuse Facebook Connect pages, then attach the Meta Ad Account needed for ads publishing.</p></div><button type="button" className="social-ads-button primary" onClick={() => openConnectionModal("facebook")} disabled={!workspaceId}><Plus size={15} />Add Connection</button></header>{facebookPages.length === 0 && <div className="social-ads-alert">No Facebook Connect page was found for this workspace yet. Connect a page in Facebook Connect first, then come back here to add the Meta Ad Account.</div>}<div>{PLATFORMS.map((platform) => { const details = connectionDetails[platform] || {}; const status = connections[platform] || "not_connected"; const isComingSoon = ["shopee", "lazada"].includes(platform); return <article key={platform}><div className="social-ads-connection-icon">{platform === "instagram" ? <Instagram size={19} /> : platform === "messenger" ? <MessageCircle size={19} /> : <Megaphone size={19} />}</div><div><strong>{label(platform)}</strong><span>{status === "connected" ? details.adAccountId ? `Ad account ${details.adAccountId}` : "Connected" : status === "needs_review" ? "Facebook page found. Add Meta Ad Account." : label(status)}</span>{details.facebookPageName && <small>Page: {details.facebookPageName}</small>}</div><StatusBadge status={status === "connected" ? "active" : status === "coming_soon" ? "paused" : "needs_connection"} /><div className="social-ads-connection-actions"><button type="button" className="social-ads-button" disabled={isComingSoon || platform === "website" || connectionBusy} onClick={() => openConnectionModal(platform)}>{status === "connected" ? "Edit" : "Connect"}</button><button type="button" className="social-ads-button" disabled={isComingSoon || platform === "website" || connectionBusy} onClick={async () => { try { const result = await testSocialAdConnection(workspaceId, platform); setConnections((current) => ({ ...current, [platform]: result.status })); notify(`${label(platform)} connection checked.`); } catch (err) { setError(err.message); } }}>Test</button>{status === "connected" && <button type="button" className="social-ads-button danger" disabled={connectionBusy} onClick={() => disconnectPlatform(platform)}>Disconnect</button>}</div></article>; })}</div><p className="social-ads-connection-note">Saving a connection does not publish ads automatically. It only confirms Hermes has the Facebook page and Meta Ad Account information needed before a final publish flow is added.</p></section>}

      {builderOpen && <div className="social-ads-builder"><header><div><button type="button" onClick={closeBuilder} title="Close builder"><ChevronLeft size={18} /></button><div><span>{editingId ? "Edit Campaign" : "New Campaign"}</span><h2>{form.campaignName || "Untitled campaign"}</h2></div></div><div><select defaultValue="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = ""; }} aria-label="Campaign template"><option value="">Use template</option><option value="messages">Message campaign</option><option value="booking">Booking campaign</option><option value="product">Product campaign</option></select><span className={isDirty ? "unsaved" : "saved"}>{isDirty ? "Unsaved changes" : "Saved"}</span><button type="button" className="social-ads-button" onClick={() => saveCampaign("draft")} disabled={saving}>Save Draft</button><button type="button" className="social-ads-button primary" onClick={() => saveCampaign("submit")} disabled={saving}>{saving ? <Loader2 className="spin" size={15} /> : <Send size={15} />}Submit for Approval</button></div></header><div className="social-ads-stepper">{STEPS.map((item, index) => <button type="button" key={item} className={index === step ? "active" : index < step ? "complete" : ""} onClick={() => setStep(index)}><span>{index < step ? <Check size={14} /> : index + 1}</span>{item}</button>)}</div>{formError && <div className="social-ads-alert error">{formError}</div>}<div className="social-ads-builder-grid"><main><div className="social-ads-builder-title"><span>Step {step + 1} of 5</span><h3>{STEPS[step]}</h3></div>{renderBuilderStep()}<div className="social-ads-builder-nav"><button type="button" className="social-ads-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft size={15} />Back</button>{step < 4 ? <button type="button" className="social-ads-button primary" onClick={nextStep}>Continue<ChevronRight size={15} /></button> : <button type="button" className="social-ads-button primary" onClick={() => saveCampaign("draft")} disabled={saving}>Save Campaign</button>}</div></main><AdPreview form={form} mode={previewMode} setMode={setPreviewMode} /></div></div>}

      {modal?.type === "connection" && <Modal title={`${label(modal.platform)} Publishing Connection`} description="Connect this workspace to a Meta Ad Account for ad publishing readiness." onClose={() => setModal(null)} busy={connectionBusy} footer={<><button className="social-ads-button" onClick={() => setModal(null)} disabled={connectionBusy}>Cancel</button><button className="social-ads-button primary" disabled={connectionBusy} onClick={saveConnection}>{connectionBusy ? "Saving..." : "Save Connection"}</button></>}><div className="social-ads-form-grid">{connectionError && <div className="social-ads-alert error social-ads-span-2">{connectionError}</div>}<label className="social-ads-field social-ads-span-2"><span>Facebook Page *</span><select value={connectionForm.facebookPageId || ""} onChange={(e) => updateConnectionField("facebookPageId", e.target.value)} disabled={facebookPages.length === 0}><option value="">Select connected Facebook page</option>{facebookPages.map((page) => <option key={page.pageId || page.id} value={page.pageId}>{page.pageName}</option>)}</select><small>Pages come from your existing Facebook Connect module.</small></label><label className="social-ads-field"><span>Meta Ad Account ID *</span><input value={connectionForm.adAccountId || ""} onChange={(e) => updateConnectionField("adAccountId", e.target.value)} placeholder="act_1234567890" /></label><label className="social-ads-field"><span>Ad Account Name</span><input value={connectionForm.adAccountName || ""} onChange={(e) => updateConnectionField("adAccountName", e.target.value)} placeholder="Business Ad Account" /></label><label className="social-ads-field"><span>Business Manager ID</span><input value={connectionForm.externalBusinessId || ""} onChange={(e) => updateConnectionField("externalBusinessId", e.target.value)} placeholder="Optional" /></label><label className="social-ads-field"><span>Provider</span><input value="Facebook Connect + Manual Ads Account" readOnly /></label><label className="social-ads-field social-ads-span-2"><span>Internal Notes</span><textarea rows={4} value={connectionForm.notes || ""} onChange={(e) => updateConnectionField("notes", e.target.value)} placeholder="Add any billing, account owner, or publish approval notes." /></label></div></Modal>}
      {modal?.type === "reject" && <Modal title="Reject Campaign" description={modal.campaign.campaignName} onClose={() => setModal(null)} busy={saving} footer={<><button className="social-ads-button" onClick={() => setModal(null)}>Cancel</button><button className="social-ads-button danger" disabled={saving || !rejectionReason.trim()} onClick={() => executeAction(modal.campaign, "reject", { reason: rejectionReason })}>Confirm Rejection</button></>}><label className="social-ads-field"><span>Rejection Reason *</span><textarea rows={5} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain what must be corrected before approval." /></label></Modal>}
      {modal && !["reject", "connection"].includes(modal.type) && <Modal title={`${label(modal.type)} Campaign`} description={modal.campaign.campaignName} onClose={() => setModal(null)} busy={saving} footer={<><button className="social-ads-button" onClick={() => setModal(null)}>Cancel</button><button className={`social-ads-button ${modal.type === "delete" ? "danger" : "primary"}`} disabled={saving} onClick={() => executeAction(modal.campaign, modal.type)}>{saving ? "Saving..." : `Confirm ${label(modal.type)}`}</button></>}><p className="social-ads-confirm-copy">{modal.type === "approve" ? "This confirms the campaign content and makes it eligible for publishing preparation." : modal.type === "archive" ? "The campaign will leave the active queue but remain available for historical reporting." : "This permanently removes the campaign. This action cannot be undone."}</p></Modal>}
    </div>
  );
}
