import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";

import ButtonPropertiesEditor from "../../inspector/properties/ButtonPropertiesEditor";
import CardPropertiesEditor from "../../inspector/properties/CardPropertiesEditor";
import ContentBlockPropertiesEditor from "../../inspector/properties/ContentBlockPropertiesEditor";
import MediaPropertiesEditor from "../../inspector/properties/MediaPropertiesEditor";
import TextPropertiesEditor from "../../inspector/properties/TextPropertiesEditor";

import { Field, textareaClass } from "../../shared";

import { asObject } from "./servicesTabUtils";

import ServiceCardModalControls from "./ServiceCardModalControls";
import {
  CheckboxRow,
  CONTENT_DISPLAY_MODE_OPTIONS,
  DESCRIPTION_MODE_OPTIONS,
  InspectorGroup,
  SelectRow,
  TARGET_LABELS,
  cleanValue,
} from "./serviceCardInspectorFields";
import ServiceStylePropagationControls from "./ServiceStylePropagationControls";

function getCardCta(form) {
  const payload = asObject(form.payload);
  const currentCta = asObject(payload.cta);
  const currentAction = asObject(currentCta.action);

  const fallbackLabel = form.cta_label || "";
  const resolvedLabel = cleanValue(currentCta.label)
    ? currentCta.label
    : fallbackLabel;

  const resolvedAction =
    Object.keys(currentAction).length > 0
      ? currentAction
      : cleanValue(resolvedLabel)
        ? { type: "booking", booking_preset_id: form.booking_category || null }
        : { type: "none" };

  return {
    ...currentCta,
    label: resolvedLabel,
    action: resolvedAction,
  };
}

function getModalCta(modal) {
  const currentCta = asObject(modal.cta);

  if (Object.keys(currentCta).length > 0) return currentCta;

  return {
    label: modal.cta_label || "",
    action: cleanValue(modal.cta_label) ? { type: "booking" } : { type: "none" },
  };
}

export default function ServiceCardInspector({
  card,
  selectedTarget = "card",
  saving,
  hasUnsavedChanges = false,
  onUpdate,
  onSave,
  onDiscard,
  onDelete,
  onToggle,
  onUploadAsset,
  onApplyToSection,
}) {
  const [form, setForm] = useState({
    title: card.title || "",
    description: card.description || "",
    image_url: card.image_url || "",
    cta_label: card.cta_label || "",
    booking_category: card.booking_category || "",
    payload: card.payload || {},
  });

  useEffect(() => {
    setForm({
      title: card.title || "",
      description: card.description || "",
      image_url: card.image_url || "",
      cta_label: card.cta_label || "",
      booking_category: card.booking_category || "",
      payload: card.payload || {},
    });
  }, [card]);

  function update(key, value) {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    onUpdate?.({ ...nextForm, id: card.id, client_modified: true });
  }

  function updatePayload(nextPayload) {
    update("payload", nextPayload);
  }

  function updatePayloadValue(key, value) {
    updatePayload({
      ...(form.payload || {}),
      [key]: value,
    });
  }

  function updateModalValue(key, value) {
    const currentPayload = asObject(form.payload);
    const currentModal = asObject(currentPayload.modal);

    updatePayload({
      ...currentPayload,
      modal: {
        ...currentModal,
        [key]: value,
      },
    });
  }

  function updateCardCta(nextCta) {
    const currentPayload = asObject(form.payload);

    updatePayload({
      ...currentPayload,
      cta: nextCta,
    });
  }

  function updateModalCta(nextCta) {
    const currentPayload = asObject(form.payload);
    const currentModal = asObject(currentPayload.modal);

    updatePayload({
      ...currentPayload,
      modal: {
        ...currentModal,
        cta: nextCta,
      },
    });
  }

  function updateMediaConfig(nextMediaConfig) {
    const currentPayload = asObject(form.payload);

    updatePayload({
      ...currentPayload,
      media: nextMediaConfig,
    });
  }

  function updateTextStyle(target, styles) {
    updatePayload({
      ...(form.payload || {}),
      styles: {
        ...(form.payload?.styles || {}),
        [target]: styles,
      },
    });
  }

  function updateStyleValue(target, property, value) {
    const currentPayload = asObject(form.payload);
    const currentStyles = asObject(currentPayload.styles);
    const currentTarget = asObject(currentStyles[target]);

    updatePayload({
      ...currentPayload,
      styles: {
        ...currentStyles,
        [target]: {
          ...currentTarget,
          [property]: value,
        },
      },
    });
  }

  function resetTextStyle(target) {
    const nextStyles = { ...(form.payload?.styles || {}) };
    delete nextStyles[target];
    updatePayload({ ...(form.payload || {}), styles: nextStyles });
  }

  function handleSave() {
    onSave?.({ ...form, id: card.id, client_modified: true });
  }

  function handleDiscard() {
    onDiscard?.();
  }

  const payload = asObject(form.payload);
  const modal = asObject(payload.modal);
  const mediaConfig = asObject(payload.media);
  const cardCta = getCardCta(form);
  const modalCta = getModalCta(modal);
  const normalizedTarget = TARGET_LABELS[selectedTarget]
    ? selectedTarget
    : "card";

  const contentVisibility = {
    title: true,
    description: true,
    cta: true,
    media: true,
    ...asObject(payload.content_visibility),
  };

  const descriptionMode = payload.description_mode || "paragraph";
  const contentDisplayMode = payload.content_display_mode || "upfront";
  const showFullCardControls = normalizedTarget === "card";

  function toggleVisibility(block) {
    updatePayload({
      ...(form.payload || {}),
      content_visibility: {
        ...contentVisibility,
        [block]: contentVisibility[block] === false,
      },
    });
  }

  function setDescriptionMode(mode) {
    updatePayload({
      ...(form.payload || {}),
      description_mode: mode,
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-gold)]">
            {TARGET_LABELS[normalizedTarget]}
          </p>

          <h4 className="mt-1 break-words font-black text-[var(--text-primary)]">
            {form.title || "Untitled Service"}
          </h4>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {card.template_service_id ? "Template Card" : "Custom Card"}
          </p>

          {hasUnsavedChanges && (
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-[var(--brand-gold)]">
              Unsaved changes
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onToggle}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-primary)] disabled:opacity-60"
            title={card.enabled === false ? "Show" : "Hide"}
          >
            {card.enabled === false ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)] disabled:opacity-60"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <button
          type="button"
          disabled={saving || !hasUnsavedChanges}
          onClick={handleSave}
          className="rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-xs font-black text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Card"}
        </button>

        <button
          type="button"
          disabled={saving || !hasUnsavedChanges}
          onClick={handleDiscard}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-xs font-black text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard Changes
        </button>
      </div>

      {showFullCardControls && (
        <>
          <InspectorGroup
            title="Content Blocks"
            selectedTarget={normalizedTarget}
            groupKey="card"
            defaultOpen
          >
            <CheckboxRow
              label="Title"
              checked={contentVisibility.title !== false}
              disabled={saving}
              onChange={() => toggleVisibility("title")}
            />

            <CheckboxRow
              label="Description"
              checked={contentVisibility.description !== false}
              disabled={saving}
              onChange={() => toggleVisibility("description")}
            />

            {contentVisibility.description !== false && (
              <SelectRow
                label="Text Mode"
                value={descriptionMode}
                options={DESCRIPTION_MODE_OPTIONS}
                onChange={setDescriptionMode}
              />
            )}

            <CheckboxRow
              label="Button"
              checked={contentVisibility.cta !== false}
              disabled={saving}
              onChange={() => toggleVisibility("cta")}
            />

            <CheckboxRow
              label="Media"
              checked={contentVisibility.media !== false}
              disabled={saving}
              onChange={() => toggleVisibility("media")}
            />
          </InspectorGroup>

          <InspectorGroup
            title="Interaction"
            selectedTarget={normalizedTarget}
            groupKey="card"
            defaultOpen
          >
            <SelectRow
              label="Display"
              value={contentDisplayMode}
              options={CONTENT_DISPLAY_MODE_OPTIONS}
              onChange={(value) =>
                updatePayloadValue("content_display_mode", value)
              }
            />

            {(contentDisplayMode === "collapse" ||
              contentDisplayMode === "modal") && (
              <Field label="Short Card Description">
                <textarea
                  value={payload.short_description || ""}
                  onChange={(event) =>
                    updatePayloadValue("short_description", event.target.value)
                  }
                  className={textareaClass}
                  placeholder="Short text shown on the card before expanding or opening the popup."
                  disabled={saving}
                />
              </Field>
            )}

            {contentDisplayMode === "modal" && (
              <ServiceCardModalControls
                modal={modal}
                modalCta={modalCta}
                saving={saving}
                onUploadAsset={onUploadAsset}
                onUpdateModal={updateModalValue}
                onUpdateModalCta={updateModalCta}
              />
            )}
          </InspectorGroup>
        </>
      )}

      {contentVisibility.title !== false && (
        <InspectorGroup
          title="Title"
          selectedTarget={normalizedTarget}
          groupKey="title"
          defaultOpen={showFullCardControls}
        >
          <TextPropertiesEditor
            label="Title"
            value={form.title}
            placeholder="Example: Life Insurance"
            disabled={saving}
            styles={form.payload?.styles?.title || {}}
            onChange={(value) => update("title", value)}
            onStyleChange={(styles) => updateTextStyle("title", styles)}
            onStyleReset={() => resetTextStyle("title")}
          />
        </InspectorGroup>
      )}

      {contentVisibility.description !== false && (
        <InspectorGroup
          title="Description"
          selectedTarget={normalizedTarget}
          groupKey="description"
          defaultOpen={showFullCardControls}
        >
          <ContentBlockPropertiesEditor
            label="Description"
            value={form.description}
            mode={descriptionMode}
            disabled={saving}
            styles={form.payload?.styles?.description || {}}
            modeOptions={DESCRIPTION_MODE_OPTIONS}
            onChange={(value) => update("description", value)}
            onModeChange={setDescriptionMode}
            onStyleChange={(styles) => updateTextStyle("description", styles)}
            onStyleReset={() => resetTextStyle("description")}
          />
        </InspectorGroup>
      )}

      {contentVisibility.cta !== false && (
        <InspectorGroup
          title="Button"
          selectedTarget={normalizedTarget}
          groupKey="button"
          defaultOpen={showFullCardControls}
        >
          <ButtonPropertiesEditor
            label="Button"
            cta={cardCta}
            disabled={saving}
            onChange={updateCardCta}
          />
        </InspectorGroup>
      )}

      {contentVisibility.media !== false && (
        <InspectorGroup
          title="Media"
          selectedTarget={normalizedTarget}
          groupKey="media"
          defaultOpen={showFullCardControls}
        >
          <MediaPropertiesEditor
            value={form.image_url}
            assetType="service"
            hideUrlInput
            disabled={saving}
            config={mediaConfig}
            onChange={(value) => update("image_url", value)}
            onConfigChange={updateMediaConfig}
            onUploadAsset={onUploadAsset}
          />
        </InspectorGroup>
      )}

      {showFullCardControls && (
        <>
          <InspectorGroup
            title="Design"
            selectedTarget={normalizedTarget}
            groupKey="card"
            defaultOpen
          >
            <CardPropertiesEditor
              payload={payload}
              saving={saving}
              onUpdateStyleValue={updateStyleValue}
              onUpdateTextStyle={updateTextStyle}
              onResetTextStyle={resetTextStyle}
            />
          </InspectorGroup>

          <ServiceStylePropagationControls
            styles={form.payload?.styles || {}}
            config={{ media: form.payload?.media || {} }}
            saving={saving}
            onApplyToSection={(styleSubset) => onApplyToSection?.(styleSubset)}
          />
        </>
      )}
    </div>
  );
}
