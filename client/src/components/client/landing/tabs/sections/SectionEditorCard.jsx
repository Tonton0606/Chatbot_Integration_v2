import { useEffect, useState } from "react";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Save,
  Trash2,
} from "lucide-react";

import TextStyleControls from "../../TextStyleControls";
import { Field, inputClass, textareaClass } from "../../shared";
import BookingIntegrationCard from "./BookingIntegrationCard";
import SectionDesignControls from "./SectionDesignControls";
import SectionItemsEditor from "./SectionItemsEditor";
import SectionMediaControls from "./SectionMediaControls";

import {
  buildSectionForm,
  buildSectionSavePayload,
  canEditSectionItems,
  createItem,
  getSectionLabel,
  isDefaultSection,
} from "./sectionsTabUtils";

const SECTION_MEDIA_SUPPORTED_TYPES = new Set([
  "about",
  "custom",
  "faq",
  "contact",
  "gallery",
  "testimonials",
  "pricing",
  "team",
  "portfolio",
  "products",
  "stats",
  "timeline",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function updateContentVisibility(payload, block, visible) {
  return {
    ...payload,
    content_visibility: {
      ...(payload?.content_visibility || {}),
      [block]: visible,
    },
  };
}

function VisibilityToggle({ label, checked, disabled, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export default function SectionEditorCard({
  section,
  index,
  total,
  saving,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUploadAsset,
}) {
  const payload = section.payload || {};
  const defaultSection = isDefaultSection(section);
  const canEditItems = canEditSectionItems(section.section_type);
  const canEditSectionMedia = SECTION_MEDIA_SUPPORTED_TYPES.has(
    section.section_type
  );
  const sectionLabel = getSectionLabel(section.section_type);
  const visibility = payload.content_visibility || {};

  const [form, setForm] = useState(() => buildSectionForm(section));
  const [localPayload, setLocalPayload] = useState(payload);

  useEffect(() => {
    setForm(buildSectionForm(section));
    setLocalPayload(section.payload || {});
  }, [section]);

  function updateLocalField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateLocalPayload(nextPayload) {
    setLocalPayload(nextPayload);
  }

  function updateVisibility(block, visible) {
    updateLocalPayload(updateContentVisibility(localPayload, block, visible));
  }

  function updateStyleValue(target, property, value) {
    const currentStyles = asObject(localPayload.styles);
    const currentTarget = asObject(currentStyles[target]);

    updateLocalPayload({
      ...localPayload,
      styles: {
        ...currentStyles,
        [target]: {
          ...currentTarget,
          [property]: value,
        },
      },
    });
  }

  function updateTextStyle(target, styles) {
    const currentStyles = asObject(localPayload.styles);

    updateLocalPayload({
      ...localPayload,
      styles: {
        ...currentStyles,
        [target]: styles,
      },
    });
  }

  function resetTextStyle(target) {
    const currentStyles = { ...asObject(localPayload.styles) };
    delete currentStyles[target];

    updateLocalPayload({
      ...localPayload,
      styles: currentStyles,
    });
  }

  function addItem(itemType = "item") {
    updateLocalField("items", [
      ...form.items,
      createItem(section.section_type, itemType),
    ]);
  }

  function updateItem(itemIndex, key, value) {
    updateLocalField(
      "items",
      form.items.map((item, itemMapIndex) =>
        itemMapIndex === itemIndex
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );
  }

  function deleteItem(itemIndex) {
    updateLocalField(
      "items",
      form.items.filter((_, itemMapIndex) => itemMapIndex !== itemIndex)
    );
  }

  /*function saveChanges() {
    onSave(
      buildSectionSavePayload(
        {
          ...section,
          payload: localPayload,
        },
        form
      )
    );
  }*/

function saveChanges() {
  onSave(
    buildSectionSavePayload(
      {
        ...section,
        payload: localPayload,
      },
      form
    )
  );
}

  const currentVisibility = localPayload.content_visibility || visibility || {};
  const currentStyles = asObject(localPayload.styles);
  const displayTitle = form.title || sectionLabel;
  const displayDescription =
    form.description || "Customize this section content.";

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-main)]/35 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--brand-gold-soft)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--brand-gold)]">
                {sectionLabel}
              </span>

              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">
                #{index + 1}
              </span>

              {form.enabled === false && (
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-bold uppercase text-[var(--text-muted)]">
                  Hidden
                </span>
              )}

              {defaultSection && (
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-bold uppercase text-[var(--text-muted)]">
                  Default
                </span>
              )}
            </div>

            <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {displayTitle}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
              {displayDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || index === 0}
              onClick={onMoveUp}
              className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="mr-1 h-4 w-4" />
              Up
            </button>

            <button
              type="button"
              disabled={saving || index === total - 1}
              onClick={onMoveDown}
              className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDown className="mr-1 h-4 w-4" />
              Down
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                updateLocalField("enabled", form.enabled === false)
              }
              className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] disabled:opacity-60"
            >
              {form.enabled === false ? (
                <Eye className="mr-1 h-4 w-4" />
              ) : (
                <EyeOff className="mr-1 h-4 w-4" />
              )}
              {form.enabled === false ? "Show" : "Hide"}
            </button>

            {!defaultSection && (
              <button
                type="button"
                disabled={saving}
                onClick={onDelete}
                className="inline-flex h-9 items-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 text-xs font-bold text-[var(--danger)] disabled:opacity-60"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
          <div className="mb-4">
            <h4 className="font-black text-[var(--text-primary)]">
              Section Header
            </h4>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Edit the visible text blocks for this landing section.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <VisibilityToggle
              label="Show Small Label"
              checked={currentVisibility.eyebrow !== false}
              disabled={saving}
              onChange={(checked) => updateVisibility("eyebrow", checked)}
            />

            <VisibilityToggle
              label="Show Title"
              checked={currentVisibility.heading !== false}
              disabled={saving}
              onChange={(checked) => updateVisibility("heading", checked)}
            />

            <VisibilityToggle
              label="Show Description"
              checked={currentVisibility.description !== false}
              disabled={saving}
              onChange={(checked) => updateVisibility("description", checked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Section Title">
              <input
                value={form.title}
                onChange={(event) =>
                  updateLocalField("title", event.target.value)
                }
                className={inputClass}
                placeholder="Example: Our Services"
              />
            </Field>

            <Field label="Small Label">
              <input
                value={form.subtitle}
                onChange={(event) =>
                  updateLocalField("subtitle", event.target.value)
                }
                className={inputClass}
                placeholder="Example: Choose the service that fits your needs."
              />
            </Field>
          </div>

          {!["faq", "contact"].includes(section.section_type) && (
            <div className="mt-4">
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateLocalField("description", event.target.value)
                  }
                  className={textareaClass}
                  placeholder="Write a simple description for this section."
                />
              </Field>
            </div>
          )}

          <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Header Typography
            </p>

            <TextStyleControls
              label="Small Label Style"
              styles={currentStyles.eyebrow || {}}
              onChange={(styles) => updateTextStyle("eyebrow", styles)}
              onReset={() => resetTextStyle("eyebrow")}
            />

            <TextStyleControls
              label="Title Style"
              styles={currentStyles.heading || {}}
              onChange={(styles) => updateTextStyle("heading", styles)}
              onReset={() => resetTextStyle("heading")}
            />

            <TextStyleControls
              label="Description Style"
              styles={currentStyles.description || {}}
              onChange={(styles) => updateTextStyle("description", styles)}
              onReset={() => resetTextStyle("description")}
            />
          </div>
        </div>

        {canEditSectionMedia && (
          <SectionMediaControls
            payload={localPayload}
            saving={saving}
            onUpdatePayload={updateLocalPayload}
            onUploadAsset={onUploadAsset}
          />
        )}

        <SectionDesignControls
          payload={localPayload}
          saving={saving}
          onUpdateStyleValue={updateStyleValue}
        />

        {section.section_type === "map" && (
          <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Marker Popup Typography
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Style the label and popup text shown inside the map marker card.
              </p>
            </div>

            <TextStyleControls
              label="Marker Label Style"
              styles={currentStyles.marker_label || {}}
              onChange={(styles) => updateTextStyle("marker_label", styles)}
              onReset={() => resetTextStyle("marker_label")}
            />

            <TextStyleControls
              label="Marker Popup Style"
              styles={currentStyles.marker_popup || {}}
              onChange={(styles) => updateTextStyle("marker_popup", styles)}
              onReset={() => resetTextStyle("marker_popup")}
            />
          </div>
        )}

        {canEditItems && (
          <SectionItemsEditor
            sectionType={section.section_type}
            items={form.items}
            onAddItem={() => addItem("item")}
            onAddTextbox={() => addItem("textbox")}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onUploadAsset={onUploadAsset}
          />
        )}

        {section.section_type === "booking" && <BookingIntegrationCard />}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={saveChanges}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-5 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
