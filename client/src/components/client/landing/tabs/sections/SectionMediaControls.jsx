import { Image, RotateCcw, Trash2 } from "lucide-react";

import {
  Field,
  ImageUrlUploadField,
  inputClass,
} from "../../shared";

const MEDIA_POSITION_OPTIONS = [
  { value: "top", label: "Above Content" },
  { value: "bottom", label: "Below Content" },
  { value: "left", label: "Left Side" },
  { value: "right", label: "Right Side" },
  { value: "background", label: "Background" },
];

const MEDIA_FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
];

const MEDIA_FOCUS_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

function updatePayloadValue(payload, key, value) {
  return {
    ...(payload || {}),
    [key]: value,
  };
}

function removeSectionMedia(payload) {
  const nextPayload = { ...(payload || {}) };

  delete nextPayload.media_url;
  delete nextPayload.media_type;
  delete nextPayload.media_position;
  delete nextPayload.media_fit;
  delete nextPayload.media_focus;
  delete nextPayload.media_width;
  delete nextPayload.media_max_width;
  delete nextPayload.media_height;
  delete nextPayload.media_overlay_color;
  delete nextPayload.media_overlay_opacity;

  return nextPayload;
}

function SelectField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function SectionMediaControls({
  payload,
  saving,
  onUpdatePayload,
  onUploadAsset,
}) {
  const mediaUrl = payload?.media_url || "";
  const mediaPosition = payload?.media_position || "top";
  const isBackgroundMedia = mediaPosition === "background";

  function update(key, value) {
    onUpdatePayload(updatePayloadValue(payload, key, value));
  }

  function resetMedia() {
    onUpdatePayload(removeSectionMedia(payload));
  }

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
              <Image className="h-4 w-4" />
            </span>

            <div>
              <h4 className="font-black text-[var(--text-primary)]">
                Section Media
              </h4>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Add an image for the whole section and control where it appears.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={saving || !mediaUrl}
          onClick={resetMedia}
          className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
        <ImageUrlUploadField
          label="Section Image / Media"
          value={mediaUrl}
          assetType="section"
          onChange={(value) => update("media_url", value)}
          onUploadAsset={onUploadAsset}
          showAutoPlayToggle={true}
          autoPlayValue={Boolean(payload?.video_autoplay)}
          onAutoPlayChange={(value) => update("video_autoplay", value)}
        />

        {mediaUrl && (
          <button
            type="button"
            disabled={saving}
            onClick={resetMedia}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)] disabled:opacity-60"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Media
          </button>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Position"
            value={mediaPosition}
            options={MEDIA_POSITION_OPTIONS}
            onChange={(value) => update("media_position", value)}
          />

          <SelectField
            label="Fit"
            value={payload?.media_fit || "cover"}
            options={MEDIA_FIT_OPTIONS}
            onChange={(value) => update("media_fit", value)}
          />

          <SelectField
            label="Focus"
            value={payload?.media_focus || "center"}
            options={MEDIA_FOCUS_OPTIONS}
            onChange={(value) => update("media_focus", value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Width">
            <input
              value={payload?.media_width || ""}
              onChange={(event) => update("media_width", event.target.value)}
              className={inputClass}
              placeholder="42% or 420px"
            />
          </Field>

          <Field label="Max Width">
            <input
              value={payload?.media_max_width || ""}
              onChange={(event) =>
                update("media_max_width", event.target.value)
              }
              className={inputClass}
              placeholder="560px"
            />
          </Field>

          <Field label="Height">
            <input
              value={payload?.media_height || ""}
              onChange={(event) => update("media_height", event.target.value)}
              className={inputClass}
              placeholder="320px"
            />
          </Field>
        </div>

        {isBackgroundMedia && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Overlay Color">
              <input
                value={payload?.media_overlay_color || ""}
                onChange={(event) =>
                  update("media_overlay_color", event.target.value)
                }
                className={inputClass}
                placeholder="#000000"
              />
            </Field>

            <Field label="Overlay Opacity">
              <input
                value={payload?.media_overlay_opacity || ""}
                onChange={(event) =>
                  update("media_overlay_opacity", event.target.value)
                }
                className={inputClass}
                placeholder="0.25"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
