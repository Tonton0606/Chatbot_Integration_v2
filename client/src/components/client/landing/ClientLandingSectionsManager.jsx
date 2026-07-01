import { useState } from "react";
import {
  Layers,
  Plus,
  Trash2,
} from "lucide-react";

import {
  cardClass,
  Field,
  ImageUrlUploadField,
  inputClass,
  SaveButton,
  SectionHeader,
  textareaClass,
} from "./shared";

export function ClientLandingSectionsManager({
  sections,
  sectionTypes,
  saving,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onUploadAsset,
}) {
  const [selectedType, setSelectedType] = useState("custom");

  return (
    <section className={`${cardClass} p-5`}>
      <SectionHeader
        icon={Layers}
        title="Page Sections"
        description="Build the landing page using enabled/disabled sections. Add custom sections or industry-specific formats."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4 md:flex-row md:items-end">
        <Field label="Section Type">
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className={inputClass}
          >
            {(sectionTypes || []).map((type) => (
              <option key={type.section_key} value={type.section_key}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="button"
          onClick={() => onAddSection(selectedType)}
          disabled={saving || !selectedType}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </button>
      </div>

      <div className="grid gap-4">
        {(sections || []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--hover-bg)] p-8 text-center text-sm text-[var(--text-secondary)]">
            No custom sections yet. Add a business format or a custom section.
          </div>
        )}

        {(sections || []).map((section, index) => (
          <LandingSectionEditor
            key={section.id}
            section={section}
            index={index}
            saving={saving}
            onSave={(payload) => onUpdateSection(section.id, payload)}
            onDelete={() => onDeleteSection(section.id)}
            onUploadAsset={onUploadAsset}
          />
        ))}
      </div>
    </section>
  );
}

function LandingSectionEditor({
  section,
  index,
  saving,
  onSave,
  onDelete,
  onUploadAsset,
}) {
  const [form, setForm] = useState(() => ({
    title: section.title || "",
    subtitle: section.subtitle || "",
    description: section.description || "",
    image_url: section.image_url || "",
    enabled: section.enabled !== false,
    order_index: section.order_index ?? index,
    payloadText: JSON.stringify(section.payload || {}, null, 2),
  }));

  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    let parsedPayload = {};

    try {
      parsedPayload = form.payloadText
        ? JSON.parse(form.payloadText)
        : {};
    } catch {
      alert("Payload must be valid JSON.");
      return;
    }

    onSave({
      title: form.title,
      subtitle: form.subtitle,
      description: form.description,
      image_url: form.image_url,
      enabled: form.enabled,
      order_index: Number(form.order_index || 0),
      payload: parsedPayload,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-color)] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-[var(--text-primary)]">
              {section.title || "Untitled Section"}
            </h4>

            <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-xs font-bold uppercase text-[var(--text-muted)]">
              {section.section_type}
            </span>

            {section.template_key && (
              <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--brand-gold)]">
                {section.template_key}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Order #{form.order_index}
          </p>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="inline-flex h-9 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </button>
      </div>

      <div className="grid gap-4">
        <label className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Section enabled
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Subtitle / Category">
            <input
              value={form.subtitle}
              onChange={(event) => update("subtitle", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={textareaClass}
          />
        </Field>

        <ImageUrlUploadField
          label="Section Image"
          value={form.image_url}
          assetType="section"
          onChange={(value) => update("image_url", value)}
          onUploadAsset={onUploadAsset}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Order">
            <input
              type="number"
              value={form.order_index}
              onChange={(event) => update("order_index", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Advanced Payload JSON">
          <textarea
            value={form.payloadText}
            onChange={(event) => update("payloadText", event.target.value)}
            className="min-h-[150px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </Field>

        <div className="flex justify-end">
          <SaveButton saving={saving} />
        </div>
      </div>
    </form>
  );
}
