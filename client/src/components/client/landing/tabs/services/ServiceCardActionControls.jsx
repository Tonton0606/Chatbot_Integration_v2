import { Field, inputClass, textareaClass } from "../../shared";

const ACTION_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "booking", label: "Booking" },
  { value: "external_link", label: "External Link" },
  { value: "internal_section", label: "Scroll To Section" },
  { value: "phone", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "Whatsapp" },
  { value: "messenger", label: "Messenger" },
  { value: "download", label: "Download" },
  { value: "popup", label: "Popup" },
];

function cleanValue(value) {
  return String(value || "").trim();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getActionValue(action, key) {
  return cleanValue(action?.[key]);
}

function getActionType(action) {
  return cleanValue(action?.type) || "none";
}

function buildNextAction(action, key, value) {
  return {
    ...asObject(action),
    [key]: value,
  };
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

export default function ServiceCardActionControls({
  label = "Button",
  cta,
  disabled,
  onChange,
}) {
  const normalizedCta = asObject(cta);
  const action = asObject(normalizedCta.action);
  const actionType = getActionType(action);

  function updateCtaValue(key, value) {
    onChange?.({
      ...normalizedCta,
      [key]: value,
    });
  }

  function updateAction(nextAction) {
    onChange?.({
      ...normalizedCta,
      action: nextAction,
    });
  }

  function updateActionType(type) {
    updateAction({
      type,
    });
  }

  function updateActionValue(key, value) {
    updateAction(buildNextAction(action, key, value));
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
      <Field label={`${label} Text`}>
        <input
          value={normalizedCta.label || ""}
          onChange={(event) => updateCtaValue("label", event.target.value)}
          className={inputClass}
          placeholder="Example: Book Consultation"
          disabled={disabled}
        />
      </Field>

      <SelectRow
        label="Action"
        value={actionType}
        options={ACTION_TYPE_OPTIONS}
        disabled={disabled}
        onChange={updateActionType}
      />

      {actionType === "booking" && (
        <Field label="Booking Preset ID">
          <input
            value={getActionValue(action, "booking_preset_id")}
            onChange={(event) =>
              updateActionValue("booking_preset_id", event.target.value)
            }
            className={inputClass}
            placeholder="Optional. Example: insurance_consultation"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "external_link" && (
        <Field label="URL">
          <input
            value={getActionValue(action, "url")}
            onChange={(event) => updateActionValue("url", event.target.value)}
            className={inputClass}
            placeholder="https://example.com"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "internal_section" && (
        <Field label="Section ID">
          <input
            value={getActionValue(action, "section_id")}
            onChange={(event) =>
              updateActionValue("section_id", event.target.value)
            }
            className={inputClass}
            placeholder="Example: services, faq, booking"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "phone" && (
        <Field label="Phone Number">
          <input
            value={getActionValue(action, "phone")}
            onChange={(event) => updateActionValue("phone", event.target.value)}
            className={inputClass}
            placeholder="+639123456789"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "email" && (
        <>
          <Field label="Email Address">
            <input
              value={getActionValue(action, "email")}
              onChange={(event) =>
                updateActionValue("email", event.target.value)
              }
              className={inputClass}
              placeholder="hello@example.com"
              disabled={disabled}
            />
          </Field>

          <Field label="Message">
            <textarea
              value={getActionValue(action, "message")}
              onChange={(event) =>
                updateActionValue("message", event.target.value)
              }
              className={textareaClass}
              placeholder="Optional email body."
              disabled={disabled}
            />
          </Field>
        </>
      )}

      {actionType === "whatsapp" && (
        <>
          <Field label="Whatsapp Phone">
            <input
              value={getActionValue(action, "phone")}
              onChange={(event) =>
                updateActionValue("phone", event.target.value)
              }
              className={inputClass}
              placeholder="+639123456789"
              disabled={disabled}
            />
          </Field>

          <Field label="Message">
            <textarea
              value={getActionValue(action, "message")}
              onChange={(event) =>
                updateActionValue("message", event.target.value)
              }
              className={textareaClass}
              placeholder="Hi, I want to inquire."
              disabled={disabled}
            />
          </Field>
        </>
      )}

      {actionType === "messenger" && (
        <Field label="Messenger URL">
          <input
            value={getActionValue(action, "url")}
            onChange={(event) => updateActionValue("url", event.target.value)}
            className={inputClass}
            placeholder="https://m.me/page-name"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "download" && (
        <Field label="Download URL">
          <input
            value={getActionValue(action, "url")}
            onChange={(event) => updateActionValue("url", event.target.value)}
            className={inputClass}
            placeholder="https://example.com/file.pdf"
            disabled={disabled}
          />
        </Field>
      )}

      {actionType === "popup" && (
        <Field label="Popup Target">
          <input
            value={getActionValue(action, "target")}
            onChange={(event) => updateActionValue("target", event.target.value)}
            className={inputClass}
            placeholder="Example: service-details"
            disabled={disabled}
          />
        </Field>
      )}

      <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={normalizedCta.open_in_new_tab === true}
          disabled={disabled}
          onChange={(event) =>
            updateCtaValue("open_in_new_tab", event.target.checked)
          }
        />
        <span>Open in new tab</span>
      </label>
    </div>
  );
}
