import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildPublicLandingUrl,
  disableClientLandingPage,
  enableClientLandingPage,
  getLandingSections,
  updateClientLandingPage,
  uploadLandingAsset,
} from "../../../../services/clientLandingPages";

import {
  createBookingMapping,
  getLandingBookingMappings,
  updateBookingMapping,
} from "../../../../services/landing/landingBooking";

import {
  DEFAULT_LANDING_MAP,
  saveLandingMapConfig,
} from "../../../../services/landing/landingMap";

import { saveWorkspaceFooter } from "./footerService";

import {
  buildInitialForm,
  buildInitialIntegrationMapping,
  DEFAULT_LANDING_TAB,
  getApiBase,
  selectPrimaryIntegrationMapping,
} from "./clientLandingPageState";

import { useLandingPageLoader } from "./useLandingPageLoader";
import { useLandingPageManagerActions } from "./useLandingPageManagerActions";
import { useLandingPreviewOverrides } from "./useLandingPreviewOverrides";
import { useLandingSectionActions } from "./useLandingSectionActions";
import { useLandingServiceCardActions } from "./useLandingServiceCardActions";

export function useClientLandingPageBuilder({
  adminOverrideMode = false,
  overrideWorkspaceId = "",
} = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState(DEFAULT_LANDING_TAB);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [selectedSectionType, setSelectedSectionType] = useState("custom");

  const [workspaceContext, setWorkspaceContext] = useState(null);
  const [landingPages, setLandingPages] = useState([]);
  const [selectedLandingPageId, setSelectedLandingPageId] = useState(null);
  const [landingPage, setLandingPage] = useState(null);
  const [form, setForm] = useState(buildInitialForm());

  const [templates, setTemplates] = useState([]);
  const [sectionTypes, setSectionTypes] = useState([]);
  const [sections, setSections] = useState([]);
  const [serviceCards, setServiceCards] = useState([]);
  const [landingMap, setLandingMap] = useState(null);
  const [footer, setFooter] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [integrationMapping, setIntegrationMapping] = useState(null);

  const [error, setError] = useState("");
  const [domainCheckResult, setDomainCheckResult] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [releasingDomain, setReleasingDomain] = useState(false);

  const {
    previewSections,
    previewServiceCards,
    updatePreviewSectionPayload,
    updatePreviewServiceCard,
    clearPreviewSectionOverride,
    clearPreviewServiceCardOverride,
    clearAllPreviewSectionOverrides,
    clearAllPreviewServiceCardOverrides,
    clearAllPreviewOverrides,
  } = useLandingPreviewOverrides({
    sections,
    serviceCards,
    landingMap,
  });

  const publicUrl = useMemo(() => {
    return buildPublicLandingUrl(
      landingPage?.slug,
      landingPage?.custom_domain_status === "verified"
        ? landingPage?.custom_domain
        : ""
    );
  }, [landingPage]);

  const previewLandingPage = useMemo(() => {
    return {
      ...(landingPage || {}),
      ...form,
    };
  }, [landingPage, form]);

  const previewSectionsWithMap = useMemo(() => {
    if (!landingMap) return previewSections;

    let hasMapSection = false;

    const mappedSections = previewSections.map((section) => {
      if (section.section_type !== "map") return section;

      hasMapSection = true;

      return {
        ...section,
        title: landingMap.section_title,
        subtitle: landingMap.section_subtitle,
        description: landingMap.full_address,
        enabled: landingMap.is_visible !== false,
        order_index: Number(landingMap.section_order ?? section.order_index),
        payload: {
          ...(section.payload || {}),
          title: landingMap.section_title,
          subtitle: landingMap.section_subtitle,
          description: landingMap.full_address,
          map_config: landingMap,
        },
      };
    });

    if (hasMapSection) {
      return mappedSections;
    }

    return [
      ...mappedSections,
      {
        id: "preview-map",
        landing_page_id: landingPage?.id,
        section_type: "map",
        title: landingMap.section_title,
        subtitle: landingMap.section_subtitle,
        description: landingMap.full_address,
        enabled: landingMap.is_visible !== false,
        order_index: Number(landingMap.section_order ?? mappedSections.length),
        payload: {
          title: landingMap.section_title,
          subtitle: landingMap.section_subtitle,
          description: landingMap.full_address,
          map_config: landingMap,
        },
      },
    ];
  }, [landingMap, landingPage?.id, previewSections]);

  const serviceCardActions = useLandingServiceCardActions({
    workspaceContext,
    landingPage,
    serviceCards,
    setSaving,
    setError,
    setServiceCards,
  });

  const sectionActions = useLandingSectionActions({
    landingPage,
    sections,
    sectionTypes,
    setSaving,
    setError,
    setSections,
    refreshServiceCards: serviceCardActions.refreshServiceCards,
  });

  const refreshIntegrationMapping = useCallback(
    async ({ workspaceId, landingPageId }) => {
      if (!workspaceId || !landingPageId) return null;

      try {
        const rows = await getLandingBookingMappings(landingPageId);
        const primaryMapping = selectPrimaryIntegrationMapping(rows || []);

        const nextMapping = buildInitialIntegrationMapping({
          mapping: primaryMapping,
          workspaceId,
          landingPageId,
        });

        setIntegrationMapping(nextMapping);

        return nextMapping;
      } catch (err) {
        console.error("Refresh integration mapping error:", err);
        setError(err.message || "Failed to refresh landing integrations.");
        return null;
      }
    },
    []
  );

  const pageManager = useLandingPageManagerActions({
    workspaceContext,
    landingPage,
    landingPages,
    selectedLandingPageId,
    setError,
    setSaving,
    setLandingPages,
    loadLandingResources: (...args) =>
      landingLoader.loadLandingResources(...args),
  });

  const landingLoader = useLandingPageLoader({
    adminOverrideMode,
    overrideWorkspaceId,
    setLoading,
    setError,
    setWorkspaceContext,
    setLandingPage,
    setSelectedLandingPageId,
    setForm,
    setDomainCheckResult,
    setTemplates,
    setSectionTypes,
    setSections,
    setServiceCards,
    setAnalytics,
    setIntegrationMapping,
    setLandingMap,
    setFooter,
    refreshLandingPages: pageManager.refreshLandingPages,
  });

  useEffect(() => {
    landingLoader.loadPage();
  }, [landingLoader.loadPage]);

  useEffect(() => {
    clearAllPreviewOverrides();
  }, [selectedLandingPageId, clearAllPreviewOverrides]);

  function updateFormField(key, value) {
    if (key === "custom_domain") {
      setDomainCheckResult(null);
    }

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateIntegrationField(key, value) {
    setIntegrationMapping((prev) => {
      const current = buildInitialIntegrationMapping({
        mapping: prev,
        workspaceId: workspaceContext?.workspaceId,
        landingPageId: landingPage?.id,
      });

      if (key.startsWith("metadata.")) {
        const metadataKey = key.replace("metadata.", "");

        return {
          ...current,
          metadata: {
            ...(current.metadata || {}),
            [metadataKey]: value,
          },
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function updateLandingMapPreview(nextMap) {
    setLandingMap((prev) => ({
      ...DEFAULT_LANDING_MAP,
      ...(prev || {}),
      ...(nextMap || {}),
      workspace_id: workspaceContext?.workspaceId || prev?.workspace_id || null,
      landing_page_id: landingPage?.id || prev?.landing_page_id || null,
    }));
  }

  async function saveLandingMap(nextMap = landingMap) {
    if (!workspaceContext?.workspaceId || !landingPage?.id) {
      setError("Workspace or landing page context is missing.");
      return null;
    }

    try {
      setSaving(true);
      setError("");

      const existingMapSection = sections.find(
        (section) => section.section_type === "map"
      );

      const saved = await saveLandingMapConfig({
        ...DEFAULT_LANDING_MAP,
        ...(landingMap || {}),
        ...(nextMap || {}),
        workspace_id: workspaceContext.workspaceId,
        landing_page_id: landingPage.id,
        section_order:
          existingMapSection?.order_index ??
          nextMap?.section_order ??
          landingMap?.section_order ??
          sections.length,
      });

      setLandingMap(saved);

      const refreshedSections = await getLandingSections(landingPage.id);
      setSections(refreshedSections || []);

      return saved;
    } catch (err) {
      console.error("Landing map save error:", err);
      setError(err.message || "Failed to save landing map.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveFooter(nextFooter = footer) {
    if (!workspaceContext?.workspaceId) {
      setError("Workspace context is missing.");
      return null;
    }

    try {
      setSaving(true);
      setError("");

      const saved = await saveWorkspaceFooter({
        ...(nextFooter || {}),
        workspace_id: workspaceContext.workspaceId,
      });

      setFooter(saved);
      return saved;
    } catch (err) {
      console.error("Footer save error:", err);
      setError(err.message || "Failed to save footer.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveLanding(nextPayload = form) {
    if (!landingPage?.id) return null;

    try {
      setSaving(true);
      setError("");

      const updated = await updateClientLandingPage(landingPage.id, nextPayload);

      setLandingPage(updated);
      setForm(buildInitialForm(updated));
      setLandingPages((prev) =>
        prev.map((page) => (page.id === updated.id ? updated : page))
      );

      return updated;
    } catch (err) {
      console.error("Landing page update error:", err);
      setError(err.message || "Failed to update landing page.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveIntegrations() {
    if (!workspaceContext?.workspaceId || !landingPage?.id) {
      setError("Workspace or landing page context is missing.");
      return null;
    }

    try {
      setSaving(true);
      setError("");

      const current = buildInitialIntegrationMapping({
        mapping: integrationMapping,
        workspaceId: workspaceContext.workspaceId,
        landingPageId: landingPage.id,
      });

      const payload = {
        workspace_id: workspaceContext.workspaceId,
        landing_page_id: landingPage.id,
        booking_preset_id: current.booking_preset_id || null,
        service_card_id: null,
        create_contact: current.create_contact !== false,
        create_lead: current.create_lead !== false,
        create_booking: current.create_booking !== false,
        create_calendar_event: Boolean(current.create_calendar_event),
        meeting_provider: current.meeting_provider || "google_meet",
        approval_mode: current.approval_mode || "manual",
        crm_pipeline_stage: current.crm_pipeline_stage || null,
        assigned_owner: current.assigned_owner || null,
        status: current.status || "active",
      };

      let savedMapping;

      if (current.id) {
        savedMapping = await updateBookingMapping(current.id, payload);
      } else {
        savedMapping = await createBookingMapping(payload);
      }

      const refreshed =
        (await refreshIntegrationMapping({
          workspaceId: workspaceContext.workspaceId,
          landingPageId: landingPage.id,
        })) ||
        buildInitialIntegrationMapping({
          mapping: savedMapping,
          workspaceId: workspaceContext.workspaceId,
          landingPageId: landingPage.id,
        });

      setIntegrationMapping({
        ...refreshed,
        metadata: current.metadata || {},
      });

      return savedMapping;
    } catch (err) {
      console.error("Landing integrations save error:", err);
      setError(err.message || "Failed to save landing integrations.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!landingPage?.id) return;

    try {
      setSaving(true);
      setError("");

      await saveLanding({
        ...form,
        published: false,
        status: "draft",
      });

      const updated = await enableClientLandingPage(landingPage.id);

      setLandingPage(updated);
      setForm(buildInitialForm(updated));
      setLandingPages((prev) =>
        prev.map((page) => (page.id === updated.id ? updated : page))
      );
    } catch (err) {
      console.error("Landing publish error:", err);
      setError(err.message || "Failed to publish landing page.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    if (!landingPage?.id) return;

    try {
      setSaving(true);
      setError("");

      const updated = await disableClientLandingPage(landingPage.id);

      setLandingPage(updated);
      setForm(buildInitialForm(updated));
      setLandingPages((prev) =>
        prev.map((page) => (page.id === updated.id ? updated : page))
      );
    } catch (err) {
      console.error("Landing unpublish error:", err);
      setError(err.message || "Failed to unpublish landing page.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadAsset({ file, assetType, onProgress }) {
    if (!workspaceContext?.workspaceId || !landingPage?.id) {
      throw new Error("Workspace or landing page context is missing.");
    }

    try {
      const result = await uploadLandingAsset({
        workspaceId: workspaceContext.workspaceId,
        landingPageId: landingPage.id,
        file,
        assetType,
        onProgress,
      });

      return result.fileUrl;
    } catch (err) {
      console.error("Landing asset upload error:", err);
      setError(err.message || "Failed to upload landing asset.");
      throw err;
    }
  }

  async function handleCheckDomain() {
    if (!landingPage?.id || !workspaceContext?.workspaceId) {
      setError("Landing page or workspace context is missing.");
      return;
    }

    const domain = String(form.custom_domain || "").trim();

    if (!domain) {
      setError("Enter a domain before checking.");
      return;
    }

    try {
      setCheckingDomain(true);
      setError("");
      setDomainCheckResult(null);

      const apiBase = getApiBase();

      const response = await fetch(`${apiBase}/api/landing/domains/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: workspaceContext.workspaceId,
          landingPageId: landingPage.id,
          domain,
        }),
      });

      const result = await response.json();

      setDomainCheckResult(result);

      const nextStatus = result.status || "pending";
      const nextDomain = result.domain || domain;

      setForm((prev) => ({
        ...prev,
        custom_domain: nextDomain,
        custom_domain_status: nextStatus,
      }));

      if (response.ok && result.success) {
        setLandingPage((prev) => ({
          ...(prev || {}),
          custom_domain: nextDomain,
          custom_domain_status: nextStatus,
          custom_domain_verified_at: result.record?.verified_at || null,
          custom_domain_error:
            result.record?.error_message || result.message || null,
        }));
      }

      if (!response.ok || !result.success) {
        setError(result.message || "Domain check failed.");
      }
    } catch (err) {
      console.error("Domain check error:", err);
      setError(err.message || "Failed to check domain.");
    } finally {
      setCheckingDomain(false);
    }
  }

  async function handleContinueDomain() {
    if (!domainCheckResult || !landingPage?.id) return;

    try {
      setSaving(true);
      setError("");

      const nextDomain = domainCheckResult.domain || form.custom_domain;
      const nextStatus = "pending";

      const updated = await saveLanding({
        ...form,
        custom_domain: nextDomain,
        custom_domain_status: nextStatus,
      });

      setLandingPage(updated);
      setForm(buildInitialForm(updated));

      setDomainCheckResult((prev) => ({
        ...(prev || {}),
        accepted: true,
        status: nextStatus,
        message:
          "Domain saved. Update DNS records, then click Check Domain again.",
        summary: {
          ...(prev?.summary || {}),
          action_required:
            "Update the website DNS record to the technical DNS target, then recheck.",
        },
      }));
    } catch (err) {
      console.error("Continue domain error:", err);
      setError(err.message || "Failed to save custom domain.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReleaseDomain() {
    if (!landingPage?.id || !workspaceContext?.workspaceId) {
      setError("Landing page or workspace context is missing.");
      return;
    }

    const domain =
      domainCheckResult?.domain ||
      form.custom_domain ||
      landingPage.custom_domain;

    if (!domain) {
      setError("No custom domain to release.");
      return;
    }

    try {
      setReleasingDomain(true);
      setError("");

      const apiBase = getApiBase();

      const response = await fetch(`${apiBase}/api/landing/domains/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: workspaceContext.workspaceId,
          landingPageId: landingPage.id,
          domain,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to release domain.");
      }

      setDomainCheckResult(null);

      setForm((prev) => ({
        ...prev,
        custom_domain: "",
        custom_domain_status: "not_configured",
      }));

      setLandingPage((prev) => ({
        ...(prev || {}),
        custom_domain: "",
        custom_domain_status: "not_configured",
        custom_domain_verified_at: null,
        custom_domain_error: null,
      }));
    } catch (err) {
      console.error("Release domain error:", err);
      setError(err.message || "Failed to release domain.");
    } finally {
      setReleasingDomain(false);
    }
  }

  async function handleCopyPublicUrl() {
    if (!publicUrl) return;

    await navigator.clipboard.writeText(publicUrl);
  }

  return {
    loading,
    saving,
    activeTab,
    setActiveTab,
    previewVisible,
    setPreviewVisible,
    previewMode,
    setPreviewMode,
    selectedSectionType,
    setSelectedSectionType,
    workspaceContext,
    landingPages,
    selectedLandingPageId,
    landingPage,
    form,
    templates,
    sectionTypes,
    sections,
    serviceCards,
    analytics,
    integrationMapping,
    footer,
    setFooter,
    error,
    domainCheckResult,
    checkingDomain,
    releasingDomain,
    publicUrl,
    previewLandingPage,
    previewSections: previewSectionsWithMap,
    previewServiceCards,
    managerModal: pageManager.managerModal,
    createPageName: pageManager.createPageName,
    setCreatePageName: pageManager.setCreatePageName,
    closeLandingPageManagerModal: pageManager.closeLandingPageManagerModal,
    submitCreateLandingPage: pageManager.submitCreateLandingPage,
    submitDuplicateLandingPage: pageManager.submitDuplicateLandingPage,
    submitArchiveLandingPage: pageManager.submitArchiveLandingPage,
    updateFormField,
    updateIntegrationField,
    updateLandingMapPreview,
    saveLanding,
    saveIntegrations,
    saveLandingMap,
    saveFooter,
    updatePreviewSectionPayload,
    updatePreviewServiceCard,
    clearPreviewSectionOverride,
    clearPreviewServiceCardOverride,
    clearAllPreviewSectionOverrides,
    clearAllPreviewServiceCardOverrides,
    clearAllPreviewOverrides,
    handleSelectLandingPage: pageManager.handleSelectLandingPage,
    handleCreateLandingPage: pageManager.openCreateLandingPageModal,
    handleDuplicateLandingPage: pageManager.openDuplicateLandingPageModal,
    handleArchiveLandingPage: pageManager.openArchiveLandingPageModal,
    handlePublish,
    handleUnpublish,
    handleAddTemplate: sectionActions.handleAddTemplate,
    handleAddSection: sectionActions.handleAddSection,
    handleUpdateSection: sectionActions.handleUpdateSection,
    handleDeleteSection: sectionActions.handleDeleteSection,
    handleMoveSection: sectionActions.handleMoveSection,
    handleAddServiceCard: serviceCardActions.handleAddServiceCard,
    handleUpdateServiceCard: serviceCardActions.handleUpdateServiceCard,
    handleDeleteServiceCard: serviceCardActions.handleDeleteServiceCard,
    handleToggleServiceCard: serviceCardActions.handleToggleServiceCard,
    handleReorderServiceCards: serviceCardActions.handleReorderServiceCards,
    handleUploadAsset,
    handleCheckDomain,
    handleContinueDomain,
    handleReleaseDomain,
    handleCopyPublicUrl,
  };
}
