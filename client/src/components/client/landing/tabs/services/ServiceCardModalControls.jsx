import TextStyleControls from "../../TextStyleControls";

import {
  Field,
  ImageUrlUploadField,
  inputClass,
  textareaClass,
} from "../../shared";

import {
  CheckboxRow,
  ColorRow,
  MODAL_SHADOW_OPTIONS,
  NumberRow,
  SelectRow,
} from "./serviceCardModalFields";

import {
  getStyleValue,
  SHAPE_OPTIONS,
  SHAPE_RADIUS,
} from "./servicesTabUtils";

import ServiceCardActionControls from "./ServiceCardActionControls";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export default function ServiceCardModalControls({
  modal,
  modalCta,
  saving,
  onUploadAsset,
  onUpdateModal,
  onUpdateModalCta,
}) {
  const normalizedModal = asObject(modal);
  const modalVisibility = {
    badge: true,
    title: true,
    subtitle: true,
    description: true,
    media: true,
    button: true,
    ...asObject(normalizedModal.visibility),
  };

  function updateModalValue(key, value) {
    onUpdateModal?.(key, value);
  }

  function updateModalVisibility(key) {
    updateModalValue("visibility", {
      ...modalVisibility,
      [key]: modalVisibility[key] === false,
    });
  }

  function updateModalStyleValue(target, property, value) {
    const currentStyles = asObject(normalizedModal.styles);
    const currentTarget = asObject(currentStyles[target]);

    updateModalValue("styles", {
      ...currentStyles,
      [target]: {
        ...currentTarget,
        [property]: value,
      },
    });
  }

  function updateModalShape(target, shape) {
    updateModalStyleValue(target, "shape", shape);
    updateModalStyleValue(
      target,
      "borderRadius",
      SHAPE_RADIUS[shape] || SHAPE_RADIUS.rounded_rectangle
    );
  }

  function updateModalTextStyle(target, styles) {
    const currentStyles = asObject(normalizedModal.styles);

    updateModalValue("styles", {
      ...currentStyles,
      [target]: styles,
    });
  }

  function resetModalTextStyle(target) {
    const nextStyles = { ...asObject(normalizedModal.styles) };
    delete nextStyles[target];

    updateModalValue("styles", nextStyles);
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
      <div className="grid gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Popup Content
        </p>

        <CheckboxRow
          label="Badge"
          checked={modalVisibility.badge !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("badge")}
        />

        <CheckboxRow
          label="Title"
          checked={modalVisibility.title !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("title")}
        />

        <CheckboxRow
          label="Subtitle"
          checked={modalVisibility.subtitle !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("subtitle")}
        />

        <CheckboxRow
          label="Description"
          checked={modalVisibility.description !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("description")}
        />

        <CheckboxRow
          label="Media"
          checked={modalVisibility.media !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("media")}
        />

        <CheckboxRow
          label="Button"
          checked={modalVisibility.button !== false}
          disabled={saving}
          onChange={() => updateModalVisibility("button")}
        />
      </div>

      {modalVisibility.badge !== false && (
        <Field label="Popup Badge">
          <input
            value={normalizedModal.badge || ""}
            onChange={(event) => updateModalValue("badge", event.target.value)}
            className={inputClass}
            placeholder=""
            disabled={saving}
          />
        </Field>
      )}

      {modalVisibility.title !== false && (
        <Field label="Popup Title">
          <input
            value={normalizedModal.title || ""}
            onChange={(event) => updateModalValue("title", event.target.value)}
            className={inputClass}
            placeholder=""
            disabled={saving}
          />
        </Field>
      )}

      {modalVisibility.subtitle !== false && (
        <Field label="Popup Subtitle">
          <input
            value={normalizedModal.subtitle || ""}
            onChange={(event) =>
              updateModalValue("subtitle", event.target.value)
            }
            className={inputClass}
            placeholder=""
            disabled={saving}
          />
        </Field>
      )}

      {modalVisibility.description !== false && (
        <Field label="Popup Description">
          <textarea
            value={normalizedModal.description || ""}
            onChange={(event) =>
              updateModalValue("description", event.target.value)
            }
            className={textareaClass}
            placeholder=""
            disabled={saving}
          />
        </Field>
      )}

      {modalVisibility.button !== false && (
        <ServiceCardActionControls
          label="Popup Button"
          cta={modalCta}
          disabled={saving}
          onChange={onUpdateModalCta}
        />
      )}

      {modalVisibility.media !== false && (
        <>
          <ImageUrlUploadField
            label="Popup Media"
            value={normalizedModal.media_url || ""}
            assetType="service"
            hideUrlInput
            onChange={(value) => updateModalValue("media_url", value)}
            onUploadAsset={onUploadAsset}
            showAutoPlayToggle={true}
            autoPlayValue={Boolean(normalizedModal.video_autoplay)}
            onAutoPlayChange={(value) => updateModalValue("video_autoplay", value)}
          />

          <SelectRow
            label="Media Type"
            value={normalizedModal.media_type || "image"}
            options={[
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
            onChange={(value) => updateModalValue("media_type", value)}
          />
        </>
      )}

      <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Popup Appearance
        </p>

        <ColorRow
          label="Background"
          value={getStyleValue(normalizedModal, "modal", "backgroundColor", "")}
          fallback="#ffffff"
          onChange={(value) =>
            updateModalStyleValue("modal", "backgroundColor", value)
          }
        />

        <ColorRow
          label="Text"
          value={getStyleValue(normalizedModal, "modal", "color", "")}
          fallback="#0f172a"
          onChange={(value) => updateModalStyleValue("modal", "color", value)}
        />

        <ColorRow
          label="Border"
          value={getStyleValue(normalizedModal, "modal", "borderColor", "")}
          fallback="#e2e8f0"
          onChange={(value) =>
            updateModalStyleValue("modal", "borderColor", value)
          }
        />

        <NumberRow
          label="Border Width"
          value={getStyleValue(normalizedModal, "modal", "borderWidth", "")}
          fallback="1px"
          min={0}
          max={8}
          onChange={(value) =>
            updateModalStyleValue("modal", "borderWidth", value)
          }
        />

        <NumberRow
          label="Radius"
          value={getStyleValue(normalizedModal, "modal", "borderRadius", "")}
          fallback="24px"
          min={0}
          max={64}
          onChange={(value) =>
            updateModalStyleValue("modal", "borderRadius", value)
          }
        />

        <NumberRow
          label="Padding"
          value={getStyleValue(normalizedModal, "modal", "padding", "")}
          fallback="20px"
          min={0}
          max={64}
          onChange={(value) => updateModalStyleValue("modal", "padding", value)}
        />

        <SelectRow
          label="Shape"
          value={getStyleValue(
            normalizedModal,
            "modal",
            "shape",
            "rounded_rectangle"
          )}
          options={SHAPE_OPTIONS}
          onChange={(value) => updateModalShape("modal", value)}
        />

        <SelectRow
          label="Shadow"
          value={getStyleValue(normalizedModal, "modal", "boxShadow", "")}
          options={MODAL_SHADOW_OPTIONS}
          onChange={(value) =>
            updateModalStyleValue("modal", "boxShadow", value)
          }
        />
      </div>

      {modalVisibility.title !== false && (
        <TextStyleControls
          label="Popup Title Style"
          styles={normalizedModal.styles?.title || {}}
          onChange={(styles) => updateModalTextStyle("title", styles)}
          onReset={() => resetModalTextStyle("title")}
        />
      )}

      {modalVisibility.subtitle !== false && (
        <TextStyleControls
          label="Popup Subtitle Style"
          styles={normalizedModal.styles?.subtitle || {}}
          onChange={(styles) => updateModalTextStyle("subtitle", styles)}
          onReset={() => resetModalTextStyle("subtitle")}
        />
      )}

      {modalVisibility.description !== false && (
        <TextStyleControls
          label="Popup Description Style"
          styles={normalizedModal.styles?.description || {}}
          onChange={(styles) => updateModalTextStyle("description", styles)}
          onReset={() => resetModalTextStyle("description")}
        />
      )}

      {modalVisibility.button !== false && (
        <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Popup Button Style
          </p>

          <ColorRow
            label="Background"
            value={getStyleValue(normalizedModal, "cta", "backgroundColor", "")}
            fallback="#2563eb"
            onChange={(value) =>
              updateModalStyleValue("cta", "backgroundColor", value)
            }
          />

          <ColorRow
            label="Text"
            value={getStyleValue(normalizedModal, "cta", "color", "")}
            fallback="#ffffff"
            onChange={(value) => updateModalStyleValue("cta", "color", value)}
          />

          <ColorRow
            label="Border"
            value={getStyleValue(normalizedModal, "cta", "borderColor", "")}
            fallback="#2563eb"
            onChange={(value) =>
              updateModalStyleValue("cta", "borderColor", value)
            }
          />

          <NumberRow
            label="Border Width"
            value={getStyleValue(normalizedModal, "cta", "borderWidth", "")}
            fallback="1px"
            min={0}
            max={8}
            onChange={(value) =>
              updateModalStyleValue("cta", "borderWidth", value)
            }
          />

          <NumberRow
            label="Radius"
            value={getStyleValue(normalizedModal, "cta", "borderRadius", "")}
            fallback="12px"
            min={0}
            max={48}
            onChange={(value) =>
              updateModalStyleValue("cta", "borderRadius", value)
            }
          />

          <SelectRow
            label="Shape"
            value={getStyleValue(
              normalizedModal,
              "cta",
              "shape",
              "rounded_rectangle"
            )}
            options={SHAPE_OPTIONS}
            onChange={(value) => updateModalShape("cta", value)}
          />

          <TextStyleControls
            label="Popup Button Text Style"
            styles={normalizedModal.styles?.cta || {}}
            onChange={(styles) => updateModalTextStyle("cta", styles)}
            onReset={() => resetModalTextStyle("cta")}
          />
        </div>
      )}

      {modalVisibility.media !== false && (
        <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Popup Media Style
          </p>

          <SelectRow
            label="Shape"
            value={getStyleValue(
              normalizedModal,
              "media",
              "shape",
              "rounded_rectangle"
            )}
            options={SHAPE_OPTIONS}
            onChange={(value) => updateModalShape("media", value)}
          />

          <NumberRow
            label="Radius"
            value={getStyleValue(normalizedModal, "media", "borderRadius", "")}
            fallback="18px"
            min={0}
            max={48}
            onChange={(value) =>
              updateModalStyleValue("media", "borderRadius", value)
            }
          />
        </div>
      )}
    </div>
  );
}
