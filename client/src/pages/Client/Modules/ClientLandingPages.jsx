import { useCallback, useState } from "react";

import LandingBuilderShell from "../../../components/client/landing/LandingBuilderShell";
import { ClientLandingLivePreview } from "../../../components/client/landing/ClientLandingLivePreview";

import LandingBookingTab from "../../../components/client/landing/tabs/LandingBookingTab";
import LandingGeneralTab from "../../../components/client/landing/tabs/LandingGeneralTab";
import LandingIntegrationsTab from "../../../components/client/landing/tabs/LandingIntegrationsTab";
import LandingMapTab from "../../../components/client/landing/tabs/LandingMapTab";
import LandingPublishTab from "../../../components/client/landing/tabs/LandingPublishTab";
import LandingSectionsTab from "../../../components/client/landing/tabs/LandingSectionsTab";
import LandingServicesTab from "../../../components/client/landing/tabs/LandingServicesTab";
import LandingThemeTab from "../../../components/client/landing/tabs/LandingThemeTab";
import LandingFooterTab from "../../../components/client/landing/tabs/LandingFooterTab";

import LandingPageSelector from "./landing/LandingPageSelector";
import {
  ArchiveLandingPageModal,
  CreateLandingPageModal,
  DuplicateLandingPageModal,
} from "./landing/LandingPageManagerModals";
import { useClientLandingPageBuilder } from "./landing/useClientLandingPageBuilder";

function getGeneralEditorId(id) {
  if (!id) return "";

  if (id.startsWith("hero-button-")) {
    return `editor-${id}`;
  }

  if (id.startsWith("hero-benefit-")) {
    const match = id.match(/^hero-benefit-(\d+)/);
    return match ? `editor-hero-benefit-${match[1]}` : "editor-hero-benefits";
  }

  if (id.startsWith("hero-metric-")) {
    const match = id.match(/^hero-metric-(\d+)/);
    return match ? `editor-hero-metric-${match[1]}` : "editor-hero-metrics";
  }

  if (id.startsWith("hero-logo")) return "editor-hero-logo";
  if (id.startsWith("hero-brand-title")) return "editor-hero-brand-title-style";
  if (id.startsWith("hero-badge")) return "editor-hero-badge";
  if (id.startsWith("hero-headline")) return "editor-hero-headline";
  if (id.startsWith("hero-subheadline")) return "editor-hero-subheadline";
  if (id.startsWith("hero-media")) return "editor-hero-media";
  if (id.startsWith("hero-buttons")) return "editor-hero-buttons";
  if (id.startsWith("hero-benefits")) return "editor-hero-benefits";
  if (id.startsWith("hero-metrics")) return "editor-hero-metrics";

  return `editor-${id}`;
}

function getEditorTargetFromPreviewId(previewId) {
  const id = String(previewId || "");

  if (!id) {
    return {
      tab: "",
      editorId: "",
    };
  }

  if (id === "booking" || id.startsWith("booking-")) {
    return {
      tab: "booking",
      editorId: `editor-${id}`,
    };
  }

  if (id === "map" || id.startsWith("section-preview-map")) {
    return {
      tab: "map",
      editorId: "editor-map-location",
    };
  }

  if (
    id === "services-section" ||
    id === "services-group-default" ||
    id.startsWith("card-")
  ) {
    return {
      tab: "services",
      editorId: `editor-${id}`,
    };
  }

  if (id.startsWith("section-") || id.startsWith("item-")) {
    return {
      tab: "sections",
      editorId: `editor-${id}`,
    };
  }

  if (
    id === "hero" ||
    id === "hero-brand" ||
    id === "hero-logo" ||
    id === "hero-brand-title" ||
    id === "hero-brand-eyebrow" ||
    id === "hero-media" ||
    id === "hero-badge" ||
    id === "hero-headline" ||
    id === "hero-subheadline" ||
    id === "hero-primary-cta" ||
    id === "hero-secondary-cta" ||
    id.startsWith("hero-")
  ) {
    return {
      tab: "general",
      editorId: getGeneralEditorId(id),
    };
  }

  return {
    tab: "general",
    editorId: `editor-${id}`,
  };
}

function scrollToEditorTarget(editorId) {
  if (!editorId || typeof document === "undefined") return;

  window.setTimeout(() => {
    const target = document.querySelector(`[data-editor-id="${editorId}"]`);

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    target.classList.add("landing-editor-focus-ring");

    window.setTimeout(() => {
      target.classList.remove("landing-editor-focus-ring");
    }, 1600);
  }, 120);
}

export default function ClientLandingPages({
  adminOverrideMode = false,
  overrideWorkspaceId = "",
} = {}) {
  const builder = useClientLandingPageBuilder({
    adminOverrideMode,
    overrideWorkspaceId,
  });
  const [activePreviewId, setActivePreviewId] = useState(null);

  const selectPreviewElement = useCallback(
    (previewId) => {
      const nextPreviewId = previewId || null;

      setActivePreviewId(nextPreviewId);

      if (!nextPreviewId) return;

      const target = getEditorTargetFromPreviewId(nextPreviewId);

      if (target.tab && builder.activeTab !== target.tab) {
        builder.setActiveTab(target.tab);
      }

      scrollToEditorTarget(target.editorId);
    },
    [builder]
  );

  const focusPreviewElement = useCallback((previewId) => {
    if (!previewId) return;
    setActivePreviewId(previewId);
  }, []);

  function renderActiveTab() {
    const sharedPreviewProps = {
      activePreviewId,
      onEditorFocus: focusPreviewElement,
      onPreviewSelect: selectPreviewElement,
    };

    if (builder.activeTab === "general") {
      return (
        <LandingGeneralTab
          {...sharedPreviewProps}
          form={builder.form}
          saving={builder.saving}
          onChange={builder.updateFormField}
          onSave={() => builder.saveLanding()}
          onUploadAsset={builder.handleUploadAsset}
        />
      );
    }

    if (builder.activeTab === "sections") {
      return (
        <LandingSectionsTab
          {...sharedPreviewProps}
          sections={builder.sections}
          sectionTypes={builder.sectionTypes}
          saving={builder.saving}
          selectedType={builder.selectedSectionType}
          onSelectType={builder.setSelectedSectionType}
          onAddSection={builder.handleAddSection}
          onUpdateSection={builder.handleUpdateSection}
          onDeleteSection={builder.handleDeleteSection}
          onMoveSection={builder.handleMoveSection}
          onUploadAsset={builder.handleUploadAsset}
        />
      );
    }

    if (builder.activeTab === "services") {
      return (
        <LandingServicesTab
          {...sharedPreviewProps}
          cards={builder.serviceCards}
          sections={builder.sections}
          saving={builder.saving}
          onAddCard={builder.handleAddServiceCard}
          onUpdateCard={builder.handleUpdateServiceCard}
          onDeleteCard={builder.handleDeleteServiceCard}
          onToggleCard={builder.handleToggleServiceCard}
          onUpdateSection={builder.handleUpdateSection}
          onPreviewSectionPayloadChange={builder.updatePreviewSectionPayload}
          onPreviewServiceCardChange={builder.updatePreviewServiceCard}
          onClearPreviewServiceCard={builder.clearPreviewServiceCardOverride}
          onReorderCards={builder.handleReorderServiceCards}
          onUploadAsset={builder.handleUploadAsset}
        />
      );
    }

    if (builder.activeTab === "map") {
      return (
        <LandingMapTab
          mapConfig={builder.landingMap}
          saving={builder.saving}
          onChange={builder.updateLandingMapPreview}
          onSave={builder.saveLandingMap}
        />
      );
    }

    if (builder.activeTab === "booking") {
      return (
        <LandingBookingTab
          {...sharedPreviewProps}
          form={builder.form}
          sections={builder.sections}
          saving={builder.saving}
          onChange={builder.updateFormField}
          onSave={() => builder.saveLanding()}
          onUpdateSection={builder.handleUpdateSection}
          onPreviewSectionPayloadChange={builder.updatePreviewSectionPayload}
          previewMode={builder.previewMode}
          onPreviewModeChange={builder.setPreviewMode}
        />
      );
    }

    if (builder.activeTab === "integrations") {
      return (
        <LandingIntegrationsTab
          mapping={builder.integrationMapping}
          saving={builder.saving}
          onChange={builder.updateIntegrationField}
          onSave={builder.saveIntegrations}
        />
      );
    }

    if (builder.activeTab === "theme") {
      return (
        <LandingThemeTab
          form={builder.form}
          saving={builder.saving}
          onChange={builder.updateFormField}
          onSave={() => builder.saveLanding()}
        />
      );
    }

    if (builder.activeTab === "footer") {
      return (
        <LandingFooterTab
          footer={builder.footer}
          saving={builder.saving}
          onChange={builder.setFooter}
          onSave={() => builder.saveFooter()}
          onUploadAsset={builder.handleUploadAsset}
        />
      );
    }

    if (builder.activeTab === "publish") {
      return (
        <LandingPublishTab
          form={builder.form}
          saving={builder.saving}
          publicUrl={builder.publicUrl}
          domainStatus={builder.form.custom_domain_status}
          domainCheckResult={builder.domainCheckResult}
          checkingDomain={builder.checkingDomain}
          releasingDomain={builder.releasingDomain}
          onChange={builder.updateFormField}
          onSave={() => builder.saveLanding()}
          onPublish={builder.handlePublish}
          onUnpublish={builder.handleUnpublish}
          onCopyUrl={builder.handleCopyPublicUrl}
          onCheckDomain={builder.handleCheckDomain}
          onContinueDomain={builder.handleContinueDomain}
          onReleaseDomain={builder.handleReleaseDomain}
        />
      );
    }

    return null;
  }

  function renderManagerModal() {
    if (builder.managerModal === "create") {
      return (
        <CreateLandingPageModal
          value={builder.createPageName}
          saving={builder.saving}
          onChange={builder.setCreatePageName}
          onClose={builder.closeLandingPageManagerModal}
          onSubmit={builder.submitCreateLandingPage}
        />
      );
    }

    if (builder.managerModal === "duplicate") {
      return (
        <DuplicateLandingPageModal
          page={builder.landingPage}
          saving={builder.saving}
          onClose={builder.closeLandingPageManagerModal}
          onConfirm={builder.submitDuplicateLandingPage}
        />
      );
    }

    if (builder.managerModal === "archive") {
      return (
        <ArchiveLandingPageModal
          page={builder.landingPage}
          saving={builder.saving}
          onClose={builder.closeLandingPageManagerModal}
          onConfirm={builder.submitArchiveLandingPage}
        />
      );
    }

    return null;
  }

  if (builder.loading) {
    return (
      <div className="erp-page-container">
        <div className="erp-loading-card">Loading landing builder...</div>
      </div>
    );
  }

  return (
    <div className="erp-page-container !p-0">
      {builder.error && (
        <div className="mx-auto mt-4 max-w-[1600px] rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
          {builder.error}
        </div>
      )}

      <LandingBuilderShell
        workspace={builder.workspaceContext?.workspace}
        landingPage={builder.previewLandingPage}
        activeTab={builder.activeTab}
        onChangeTab={builder.setActiveTab}
        previewMode={builder.previewMode}
        onChangePreviewMode={builder.setPreviewMode}
        previewVisible={builder.previewVisible}
        onTogglePreview={() => builder.setPreviewVisible((value) => !value)}
        saving={builder.saving}
        publicUrl={builder.publicUrl}
        pageControls={
          <LandingPageSelector
            pages={builder.landingPages}
            selectedPageId={builder.selectedLandingPageId}
            disabled={builder.saving}
            onSelectPage={builder.handleSelectLandingPage}
            onCreatePage={builder.handleCreateLandingPage}
            onDuplicatePage={builder.handleDuplicateLandingPage}
            onArchivePage={builder.handleArchiveLandingPage}
          />
        }
        preview={
          <ClientLandingLivePreview
            activePreviewId={activePreviewId}
            onPreviewClick={selectPreviewElement}
            landingPage={builder.previewLandingPage}
            sections={builder.previewSections}
            serviceCards={builder.previewServiceCards}
            publicUrl={builder.publicUrl}
            previewMode={builder.previewMode}
            footer={builder.footer}
          />
        }
      >
        {renderActiveTab()}

        {builder.activeTab === "sections" && builder.templates.length > 0 && (
          <div className="mt-5 rounded-3xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-5">
            <h3 className="font-black text-[var(--text-primary)]">
              Add Business Format
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add multiple business formats to the same landing page.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {builder.templates.map((template) => (
                <button
                  key={template.template_key || template.id}
                  type="button"
                  disabled={builder.saving}
                  onClick={() => builder.handleAddTemplate(template)}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left hover:border-[var(--brand-gold)] disabled:opacity-60"
                >
                  <h4 className="font-bold text-[var(--text-primary)]">
                    {template.name || "Business Format"}
                  </h4>

                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {template.description ||
                      "Add this format to your public page."}
                  </p>

                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--brand-gold)]">
                    {template.industry_category || "General"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </LandingBuilderShell>

      {renderManagerModal()}
    </div>
  );
}
