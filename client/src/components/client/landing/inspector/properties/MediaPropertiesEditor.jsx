import { ImageUrlUploadField, inputClass } from "../../shared";

const MEDIA_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "background", label: "Background" },
];

const MEDIA_FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
];

const OBJECT_POSITION_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top left", label: "Top Left" },
  { value: "top right", label: "Top Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom right", label: "Bottom Right" },
];

const BACKGROUND_OVERLAY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "dark", label: "Dark Overlay" },
  { value: "light", label: "Light Overlay" },
  { value: "brand", label: "Brand Overlay" },
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function SelectRow({ label, value, options, disabled, onChange }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>

      <select
        className={`${inputClass} h-9 text-xs`}
        value={value || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberRow({
  label,
  value,
  fallback = "",
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  disabled,
  onChange,
}) {
  const normalizedValue = value == null ? "" : value;
  const numericValue = Number.parseFloat(
    String(normalizedValue || fallback || 0).replace(/[^\d.-]/g, "")
  );

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          {label}
        </span>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(numericValue) ? numericValue : 0}
          disabled={disabled}
          onChange={(event) => onChange(`${event.target.value}${suffix}`)}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
        <span />

        <input
          className={`${inputClass} h-9 text-xs`}
          value={normalizedValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
        />
      </div>
    </div>
  );
}

function CheckboxRow({ checked, disabled, label, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

export default function MediaPropertiesEditor({
  label = "",
  value = "",
  assetType = "landing",
  hideUrlInput = true,
  disabled = false,
  config = {},
  onChange,
  onConfigChange,
  onUploadAsset,
}) {
  const mediaConfig = {
    position: "top",
    fit: "cover",
    objectPosition: "center",
    width: "",
    maxWidth: "",
    height: "",
    backgroundOverlay: "none",
    backgroundBlur: false,
    overlayOpacity: "40",
    ...asObject(config),
  };

  const isBackground = mediaConfig.position === "background";

  function updateConfig(key, nextValue) {
    onConfigChange?.({
      ...mediaConfig,
      [key]: nextValue,
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
      <ImageUrlUploadField
        label={label}
        value={value || ""}
        assetType={assetType}
        hideUrlInput={hideUrlInput}
        onChange={onChange}
        onUploadAsset={onUploadAsset}
      />

      {value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.("")}
          className="rounded-xl border border-red-500/20 bg-[var(--danger-soft)] px-3 py-2 text-xs font-black text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove Media
        </button>
      )}

      <SelectRow
        label="Position"
        value={mediaConfig.position}
        options={MEDIA_POSITION_OPTIONS}
        disabled={disabled}
        onChange={(nextValue) => updateConfig("position", nextValue)}
      />

      <SelectRow
        label="Fit"
        value={mediaConfig.fit}
        options={MEDIA_FIT_OPTIONS}
        disabled={disabled}
        onChange={(nextValue) => updateConfig("fit", nextValue)}
      />

      <SelectRow
        label="Focus"
        value={mediaConfig.objectPosition}
        options={OBJECT_POSITION_OPTIONS}
        disabled={disabled}
        onChange={(nextValue) => updateConfig("objectPosition", nextValue)}
      />

      {!isBackground && (
        <>
          <NumberRow
            label="Width"
            value={mediaConfig.width}
            fallback="100%"
            min={80}
            max={900}
            suffix="px"
            disabled={disabled}
            onChange={(nextValue) => updateConfig("width", nextValue)}
          />

          <NumberRow
            label="Max Width"
            value={mediaConfig.maxWidth}
            fallback=""
            min={80}
            max={1200}
            suffix="px"
            disabled={disabled}
            onChange={(nextValue) => updateConfig("maxWidth", nextValue)}
          />

          <NumberRow
            label="Height"
            value={mediaConfig.height}
            fallback="180px"
            min={80}
            max={520}
            suffix="px"
            disabled={disabled}
            onChange={(nextValue) => updateConfig("height", nextValue)}
          />
        </>
      )}

      {isBackground && (
        <>
          <SelectRow
            label="Overlay"
            value={mediaConfig.backgroundOverlay}
            options={BACKGROUND_OVERLAY_OPTIONS}
            disabled={disabled}
            onChange={(nextValue) =>
              updateConfig("backgroundOverlay", nextValue)
            }
          />

          <NumberRow
            label="Opacity"
            value={mediaConfig.overlayOpacity}
            fallback="40"
            min={0}
            max={90}
            suffix=""
            disabled={disabled}
            onChange={(nextValue) => updateConfig("overlayOpacity", nextValue)}
          />

          <CheckboxRow
            label="Blur background"
            checked={mediaConfig.backgroundBlur === true}
            disabled={disabled}
            onChange={(event) =>
              updateConfig("backgroundBlur", event.target.checked)
            }
          />
        </>
      )}
    </div>
  );
}
