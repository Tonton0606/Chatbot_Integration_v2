import TextStyleControls from "../../TextStyleControls";

import { Field, inputClass, textareaClass } from "../../shared";

export default function TextPropertiesEditor({
  label = "Text",
  value = "",
  multiline = false,
  placeholder = "",
  disabled = false,
  styles = {},
  onChange,
  onStyleChange,
  onStyleReset,
}) {
  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="grid gap-4">
      <Field label={`${label} Content`}>
        <InputComponent
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          className={multiline ? textareaClass : inputClass}
          placeholder={placeholder}
          disabled={disabled}
        />
      </Field>

      <TextStyleControls
        label={`${label} Style`}
        styles={styles || {}}
        onChange={(nextStyles) => onStyleChange?.(nextStyles)}
        onReset={() => onStyleReset?.()}
      />
    </div>
  );
}
