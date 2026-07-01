import { useEffect, useState } from "react";

import ContentBlockPropertiesEditor from "../../inspector/properties/ContentBlockPropertiesEditor";
import TextPropertiesEditor from "../../inspector/properties/TextPropertiesEditor";

import {
  BACKGROUND_PRESETS,
  CARD_SIZE_OPTIONS,
  CheckboxRow,
  ColorControl,
  COLUMN_OPTIONS,
  INTERACTION_OPTIONS,
  LAYOUT_OPTIONS,
  MEDIA_OPTIONS,
  SECTION_DESCRIPTION_MODE_OPTIONS,
  SelectRow,
} from "./servicesPresentationFields";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getPresentationValue(payload, snakeKey, camelKey, fallback) {
  return payload?.[snakeKey] || payload?.[camelKey] || fallback;
}

function getStyleValue(payload, groupKey, property, fallback = "") {
  const styles = asObject(payload?.styles);
  const group = asObject(styles[groupKey]);

  return group[property] || fallback;
}

function buildVisibility(payload) {
  const visibility = asObject(payload.content_visibility);

  return {
    eyebrow: visibility.eyebrow !== false,
    heading: visibility.heading !== false,
    description: visibility.description !== false,
  };
}

export default function ServicesPresentationControls({
  selectedGroup,
  saving,
  onUpdateSection,
  onPreviewPayloadChange,
}) {
  const sectionId = selectedGroup?.sectionId;
  const originalPayload = asObject(selectedGroup?.payload);
  const isDefaultGroup = sectionId === null || sectionId === undefined;
  const disabled = saving || isDefaultGroup;

  const [draftPayload, setDraftPayload] = useState(originalPayload);
  const [contentVisibility, setContentVisibility] = useState(() =>
    buildVisibility(originalPayload)
  );

  useEffect(() => {
    setDraftPayload(originalPayload);
    setContentVisibility(buildVisibility(originalPayload));
    onPreviewPayloadChange?.(originalPayload);
  }, [selectedGroup?.id, sectionId]);

  function commitDraft(nextPayload) {
    setDraftPayload(nextPayload);
    setContentVisibility(buildVisibility(nextPayload));
    onPreviewPayloadChange?.(nextPayload);
  }

  function updateDraft(key, value) {
    commitDraft({
      ...draftPayload,
      [key]: value,
    });
  }

  function updateStyleGroup(groupKey, nextStyles) {
    const currentStyles = asObject(draftPayload.styles);

    commitDraft({
      ...draftPayload,
      styles: {
        ...currentStyles,
        [groupKey]: nextStyles,
      },
    });
  }

  function updateStyleValue(groupKey, property, value) {
    const currentStyles = asObject(draftPayload.styles);
    const currentGroup = asObject(currentStyles[groupKey]);

    updateStyleGroup(groupKey, {
      ...currentGroup,
      [property]: value,
    });
  }

  function clearStyleGroup(groupKey) {
    const currentStyles = asObject(draftPayload.styles);
    const nextStyles = { ...currentStyles };

    delete nextStyles[groupKey];

    commitDraft({
      ...draftPayload,
      styles: nextStyles,
    });
  }

  function toggleVisibility(block) {
    const nextVisibility = {
      ...contentVisibility,
      [block]: !contentVisibility[block],
    };

    commitDraft({
      ...draftPayload,
      content_visibility: nextVisibility,
    });
  }

  async function handleSave() {
    if (!sectionId || !onUpdateSection) return;

    await onUpdateSection(sectionId, {
      title: draftPayload.heading || "",
      subtitle: draftPayload.eyebrow || "",
      description: draftPayload.description || "",
      payload: draftPayload,
    });
  }

  const sectionBackgroundColor = getStyleValue(
    draftPayload,
    "section",
    "backgroundColor",
    ""
  );

  const descriptionMode =
    draftPayload.description_mode ||
    draftPayload.descriptionMode ||
    "paragraph";

  return (
    <section
      data-editor-id="editor-services-section"
      className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
    >
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Services Presentation
        </p>

        <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">
          Layout, Size, Media, Interaction & Section Text
        </h3>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Edit the services section header, background, layout, card sizing,
          media mode, and interaction behavior.
        </p>
      </div>

      {isDefaultGroup && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700">
          Default services need a services section record before section
          settings can be saved.
        </div>
      )}

      <div className="mb-4 grid gap-4 border-b border-[var(--border-color)] pb-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Section Background
              </p>

              <h4 className="mt-1 font-black text-[var(--text-primary)]">
                Background Color
              </h4>

              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Override the theme background for this services section only.
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => clearStyleGroup("section")}
              className="shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-primary)] hover:border-[var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3">
            <SelectRow
              label="Preset"
              disabled={disabled}
              value={sectionBackgroundColor}
              options={BACKGROUND_PRESETS}
              onChange={(value) =>
                updateStyleValue("section", "backgroundColor", value)
              }
            />

            <ColorControl
              label="Custom Color"
              value={sectionBackgroundColor}
              disabled={disabled}
              placeholder="Example: #eff6ff"
              onChange={(value) =>
                updateStyleValue("section", "backgroundColor", value)
              }
            />
          </div>
        </div>

        <CheckboxRow
          label="Eyebrow Text"
          checked={contentVisibility.eyebrow}
          disabled={disabled}
          onChange={() => toggleVisibility("eyebrow")}
        />

        {contentVisibility.eyebrow && (
          <TextPropertiesEditor
            label="Eyebrow"
            value={draftPayload.eyebrow || ""}
            placeholder="Choose the service that fits your needs."
            disabled={disabled}
            styles={asObject(draftPayload.styles?.eyebrow)}
            onChange={(value) => updateDraft("eyebrow", value)}
            onStyleChange={(styles) => updateStyleGroup("eyebrow", styles)}
            onStyleReset={() => clearStyleGroup("eyebrow")}
          />
        )}

        <CheckboxRow
          label="Heading Text"
          checked={contentVisibility.heading}
          disabled={disabled}
          onChange={() => toggleVisibility("heading")}
        />

        {contentVisibility.heading && (
          <TextPropertiesEditor
            label="Heading"
            value={draftPayload.heading || ""}
            placeholder="Our Services"
            disabled={disabled}
            styles={asObject(draftPayload.styles?.heading)}
            onChange={(value) => updateDraft("heading", value)}
            onStyleChange={(styles) => updateStyleGroup("heading", styles)}
            onStyleReset={() => clearStyleGroup("heading")}
          />
        )}

        <CheckboxRow
          label="Section Description"
          checked={contentVisibility.description}
          disabled={disabled}
          onChange={() => toggleVisibility("description")}
        />

        {contentVisibility.description && (
          <ContentBlockPropertiesEditor
            label="Description"
            value={draftPayload.description || ""}
            mode={descriptionMode}
            disabled={disabled}
            styles={asObject(draftPayload.styles?.description)}
            modeOptions={SECTION_DESCRIPTION_MODE_OPTIONS}
            onChange={(value) => updateDraft("description", value)}
            onModeChange={(value) => updateDraft("description_mode", value)}
            onStyleChange={(styles) => updateStyleGroup("description", styles)}
            onStyleReset={() => clearStyleGroup("description")}
          />
        )}
      </div>

      <div className="grid gap-3">
        <SelectRow
          label="Layout"
          disabled={disabled}
          value={getPresentationValue(
            draftPayload,
            "layout_mode",
            "layoutMode",
            "grid"
          )}
          options={LAYOUT_OPTIONS}
          onChange={(value) => updateDraft("layout_mode", value)}
        />

        <SelectRow
          label="Desktop Cards"
          disabled={disabled}
          value={String(
            getPresentationValue(
              draftPayload,
              "layout_columns_desktop",
              "layoutColumnsDesktop",
              "3"
            )
          )}
          options={COLUMN_OPTIONS}
          onChange={(value) =>
            updateDraft("layout_columns_desktop", Number(value))
          }
        />

        <SelectRow
          label="Tablet Cards"
          disabled={disabled}
          value={String(
            getPresentationValue(
              draftPayload,
              "layout_columns_tablet",
              "layoutColumnsTablet",
              "2"
            )
          )}
          options={COLUMN_OPTIONS}
          onChange={(value) =>
            updateDraft("layout_columns_tablet", Number(value))
          }
        />

        <SelectRow
          label="Mobile Cards"
          disabled={disabled}
          value={String(
            getPresentationValue(
              draftPayload,
              "layout_columns_mobile",
              "layoutColumnsMobile",
              "1"
            )
          )}
          options={COLUMN_OPTIONS}
          onChange={(value) =>
            updateDraft("layout_columns_mobile", Number(value))
          }
        />

        <SelectRow
          label="Card Size"
          disabled={disabled}
          value={getPresentationValue(
            draftPayload,
            "card_size_mode",
            "cardSizeMode",
            "auto"
          )}
          options={CARD_SIZE_OPTIONS}
          onChange={(value) => updateDraft("card_size_mode", value)}
        />

        <SelectRow
          label="Media"
          disabled={disabled}
          value={getPresentationValue(
            draftPayload,
            "media_mode",
            "mediaMode",
            "image"
          )}
          options={MEDIA_OPTIONS}
          onChange={(value) => updateDraft("media_mode", value)}
        />

        <SelectRow
          label="Interaction"
          disabled={disabled}
          value={getPresentationValue(
            draftPayload,
            "interaction_mode",
            "interactionMode",
            "direct"
          )}
          options={INTERACTION_OPTIONS}
          onChange={(value) => updateDraft("interaction_mode", value)}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          className="w-full rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-xs font-black text-black hover:opacity-90 disabled:opacity-60"
          disabled={disabled || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Section"}
        </button>
      </div>
    </section>
  );
}
