import TextPropertiesEditor from "./TextPropertiesEditor";

import { inputClass } from "../../shared";

const CONTENT_MODE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "bullets", label: "Bulleted List" },
  { value: "numbered", label: "Numbered List" },
  { value: "checklist", label: "Checklist" },
  { value: "quote", label: "Quote" },
];

export default function ContentBlockPropertiesEditor({
  label = "Content",
  value = "",
  mode = "paragraph",
  placeholder = "",
  disabled = false,
  styles = {},
  modeOptions = CONTENT_MODE_OPTIONS,
  onChange,
  onModeChange,
  onStyleChange,
  onStyleReset,
}) {
  const itemMode =
    mode === "bullets" || mode === "numbered" || mode === "checklist";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          Type
        </span>

        <select
          className={`${inputClass} h-9 text-xs`}
          value={mode || "paragraph"}
          disabled={disabled}
          onChange={(event) => onModeChange?.(event.target.value)}
        >
          {modeOptions.map((option) => (
            <option key={`${label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <TextPropertiesEditor
        label={label}
        value={value}
        multiline
        placeholder={
          placeholder ||
          (itemMode
            ? "Add one item per line."
            : mode === "quote"
              ? "Add quote content."
              : "Add paragraph content.")
        }
        disabled={disabled}
        styles={styles}
        onChange={onChange}
        onStyleChange={onStyleChange}
        onStyleReset={onStyleReset}
      />
    </div>
  );
}
