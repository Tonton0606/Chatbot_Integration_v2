import { useState } from "react";
import { Eye, EyeOff, Save, Trash2 } from "lucide-react";

import TextStyleControls from "../../TextStyleControls";

import {
  Field,
  ImageUrlUploadField,
  inputClass,
  textareaClass,
} from "../../shared";

import ServiceCardStyleControls from "./ServiceCardStyleControls";

import { asObject } from "./servicesTabUtils";

export default function ServiceCardEditor({
  card,
  saving,
  onUpdate,
  onDelete,
  onToggle,
  onUploadAsset,
}) {
  const [form, setForm] = useState({
    title: card.title || "",
    description: card.description || "",
    image_url: card.image_url || "",
    cta_label: card.cta_label || "Book Consultation",
    booking_category: card.booking_category || "",
    payload: card.payload || {},
  });

  function update(key, value) {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);

    onUpdate({
      ...nextForm,
      client_modified: true,
    });
  }

  function updateTextStyle(target, styles) {
    update("payload", {
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

    update("payload", {
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
    const nextStyles = {
      ...(form.payload?.styles || {}),
    };

    delete nextStyles[target];

    update("payload", {
      ...(form.payload || {}),
      styles: nextStyles,
    });
  }

  const payload = asObject(form.payload);

  return (
    <div
      data-editor-id={`editor-card-${card.id}`}
      className={`rounded-3xl border p-4 ${
        card.enabled === false
          ? "border-[var(--border-color)] bg-[var(--hover-bg)] opacity-60"
          : "border-[var(--border-color)] bg-[var(--bg-card)]"
      }`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words font-black text-[var(--text-primary)]">
            {form.title || "Untitled Service"}
          </h3>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {card.template_service_id ? "Template Card" : "Custom Card"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onToggle}
            className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 text-xs font-bold text-[var(--text-primary)] disabled:opacity-60"
          >
            {card.enabled === false ? (
              <Eye className="mr-1 h-4 w-4" />
            ) : (
              <EyeOff className="mr-1 h-4 w-4" />
            )}
            {card.enabled === false ? "Show" : "Hide"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="inline-flex h-9 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)] disabled:opacity-60"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <ServiceCardStyleControls
          payload={payload}
          onUpdateStyleValue={updateStyleValue}
        />

        <Field label="Service Title">
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            className={inputClass}
          />
        </Field>

        <TextStyleControls
          label="Title Style"
          styles={form.payload?.styles?.title || {}}
          onChange={(styles) => updateTextStyle("title", styles)}
          onReset={() => resetTextStyle("title")}
        />

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={textareaClass}
          />
        </Field>

        <TextStyleControls
          label="Description Style"
          styles={form.payload?.styles?.description || {}}
          onChange={(styles) => updateTextStyle("description", styles)}
          onReset={() => resetTextStyle("description")}
        />

        <Field label="Button Text">
          <input
            value={form.cta_label}
            onChange={(event) => update("cta_label", event.target.value)}
            className={inputClass}
          />
        </Field>

        <TextStyleControls
          label="Button Text Style"
          styles={form.payload?.styles?.cta || {}}
          onChange={(styles) => updateTextStyle("cta", styles)}
          onReset={() => resetTextStyle("cta")}
        />

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">
            Service Image
          </p>

          <ImageUrlUploadField
            label=""
            value={form.image_url}
            assetType="service"
            hideUrlInput
            onChange={(value) => update("image_url", value)}
            onUploadAsset={onUploadAsset}
            showAutoPlayToggle={true}
            autoPlayValue={Boolean(payload.video_autoplay)}
            onAutoPlayChange={(val) => update("payload", { ...payload, video_autoplay: val })}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onUpdate({
                ...form,
                client_modified: true,
              })
            }
            className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Card
          </button>
        </div>
      </div>
    </div>
  );
}
