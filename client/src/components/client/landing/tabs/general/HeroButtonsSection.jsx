import { Link2, Plus, Trash2 } from "lucide-react";

import TextStyleControls from "../../TextStyleControls";
import { Field, inputClass, SectionHeader } from "../../shared";
import { editorClass } from "./generalTabUtils";

const DEFAULT_BUTTONS = [
  {
    id: "primary",
    label: "Book Appointment",
    action: "booking",
    destination_type: "booking",
    destination: "default",
    open_in_new_tab: false,
    style_key: "hero_button_primary",
  },
  {
    id: "secondary",
    label: "View Services",
    action: "navigate",
    destination_type: "section",
    destination: "services",
    open_in_new_tab: false,
    style_key: "hero_button_secondary",
  },
];

const DESTINATION_TYPES = [
  { value: "booking", label: "Booking Modal", action: "booking" },
  { value: "section", label: "Page Section", action: "navigate" },
  { value: "url", label: "External URL", action: "navigate" },
  { value: "phone", label: "Phone Call", action: "call" },
  { value: "email", label: "Email", action: "email" },
  { value: "messenger", label: "Messenger", action: "messenger" },
  { value: "whatsapp", label: "WhatsApp", action: "whatsapp" },
  { value: "download", label: "Download/File URL", action: "download" },
  { value: "lead_form", label: "Lead Form", action: "lead_form" },
  { value: "product", label: "Product", action: "product" },
  { value: "cart", label: "Cart", action: "cart" },
  { value: "custom", label: "Custom Target", action: "custom" },
];

const SECTION_TARGETS = [
  { value: "hero", label: "Hero" },
  { value: "about", label: "About" },
  { value: "services", label: "Services" },
  { value: "booking", label: "Booking" },
  { value: "contact", label: "Contact" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "gallery", label: "Gallery" },
  { value: "footer", label: "Footer" },
];

function createButtonId() {
  return `button_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getDestinationConfig(destinationType) {
  return (
    DESTINATION_TYPES.find((item) => item.value === destinationType) ||
    DESTINATION_TYPES[1]
  );
}

function getDefaultDestination(destinationType) {
  if (destinationType === "booking") return "default";
  if (destinationType === "section") return "services";
  if (destinationType === "lead_form") return "default";
  if (destinationType === "cart") return "default";
  return "";
}

function getDestinationPlaceholder(destinationType) {
  if (destinationType === "url") return "https://example.com";
  if (destinationType === "phone") return "+639171234567";
  if (destinationType === "email") return "name@example.com";
  if (destinationType === "messenger") return "https://m.me/page-name";
  if (destinationType === "whatsapp") return "639171234567";
  if (destinationType === "download") return "https://example.com/file.pdf";
  if (destinationType === "product") return "product-id";
  if (destinationType === "custom") return "custom-target";
  return "default";
}

function normalizeButton(button, index) {
  const destinationType =
    button.destination_type || button.type || (index === 0 ? "booking" : "section");

  const destinationConfig = getDestinationConfig(destinationType);

  return {
    id: button.id || createButtonId(),
    label: button.label || `Button ${index + 1}`,
    action: button.action || destinationConfig.action,
    destination_type: destinationType,
    destination:
      button.destination ||
      button.target ||
      getDefaultDestination(destinationType),
    open_in_new_tab: Boolean(button.open_in_new_tab),
    style_key:
      button.style_key ||
      button.styleKey ||
      (index === 0 ? "hero_button_primary" : "hero_button_secondary"),
  };
}

function normalizeButtons(payload) {
  const sourceButtons = Array.isArray(payload?.hero_buttons)
    ? payload.hero_buttons
    : [];

  const buttons = sourceButtons.length ? sourceButtons : DEFAULT_BUTTONS;

  return buttons.map(normalizeButton);
}

export default function HeroButtonsSection({
  payload = {},
  activePreviewId,
  onEditorFocus,
  updatePayload,
  updateTextStyle,
  resetTextStyle,
}) {
  const buttons = normalizeButtons(payload);

  function selectEditor(previewId) {
    onEditorFocus?.(previewId);
  }

  function saveButtons(nextButtons) {
    updatePayload("hero_buttons", nextButtons.map(normalizeButton));
  }

  function updateButton(index, key, value) {
    const nextButtons = buttons.map((button, buttonIndex) => {
      if (buttonIndex !== index) return button;

      const nextButton = {
        ...button,
        [key]: value,
      };

      if (key === "destination_type") {
        const destinationConfig = getDestinationConfig(value);

        nextButton.action = destinationConfig.action;
        nextButton.destination = getDefaultDestination(value);
        nextButton.open_in_new_tab = value === "url" || value === "download";
      }

      return nextButton;
    });

    saveButtons(nextButtons);
  }

  function addButton() {
    const buttonNumber = buttons.length + 1;

    saveButtons([
      ...buttons,
      {
        id: createButtonId(),
        label: "New Button",
        action: "navigate",
        destination_type: "section",
        destination: "services",
        open_in_new_tab: false,
        style_key: `hero_button_${buttonNumber}`,
      },
    ]);
  }

  function removeButton(index) {
    saveButtons(buttons.filter((_, buttonIndex) => buttonIndex !== index));
  }

  return (
    <section
      data-editor-id="editor-hero-buttons"
      className={editorClass(
        activePreviewId,
        "hero-buttons",
        "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
      )}
      onFocusCapture={() => selectEditor("hero-buttons")}
      onClick={() => selectEditor("hero-buttons")}
    >
      <SectionHeader
        icon={Link2}
        title="Hero Buttons"
        description="Add buttons and choose exactly where each button should go."
      />

      <div className="grid gap-4">
        {buttons.map((button, index) => {
          const previewId = `hero-button-${index}`;
          const textStyleKey = button.style_key || `hero_button_${index + 1}`;
          const destinationType = button.destination_type || "section";

          return (
            <div
              key={button.id || index}
              data-editor-id={`editor-${previewId}`}
              className={editorClass(
                activePreviewId,
                previewId,
                "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4"
              )}
              onFocusCapture={() => selectEditor(previewId)}
              onClick={() => selectEditor(previewId)}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)]">
                    Button {index + 1}
                  </h3>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Label, destination, behavior, and button text style.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeButton(index)}
                  className="inline-flex h-9 items-center rounded-xl border border-[var(--border-color)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)]"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Button Text">
                  <input
                    value={button.label || ""}
                    onFocus={() => selectEditor(previewId)}
                    onChange={(event) =>
                      updateButton(index, "label", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Example: View Services"
                  />
                </Field>

                <Field label="Destination Type">
                  <select
                    value={destinationType}
                    onFocus={() => selectEditor(previewId)}
                    onChange={(event) =>
                      updateButton(index, "destination_type", event.target.value)
                    }
                    className={inputClass}
                  >
                    {DESTINATION_TYPES.map((destination) => (
                      <option key={destination.value} value={destination.value}>
                        {destination.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {destinationType === "section" ? (
                  <Field label="Go To Section">
                    <select
                      value={button.destination || "services"}
                      onFocus={() => selectEditor(previewId)}
                      onChange={(event) =>
                        updateButton(index, "destination", event.target.value)
                      }
                      className={inputClass}
                    >
                      {SECTION_TARGETS.map((section) => (
                        <option key={section.value} value={section.value}>
                          {section.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Destination">
                    <input
                      value={button.destination || ""}
                      onFocus={() => selectEditor(previewId)}
                      onChange={(event) =>
                        updateButton(index, "destination", event.target.value)
                      }
                      className={inputClass}
                      placeholder={getDestinationPlaceholder(destinationType)}
                    />
                  </Field>
                )}

                <Field label="Open Behavior">
                  <select
                    value={button.open_in_new_tab ? "new_tab" : "same_tab"}
                    onFocus={() => selectEditor(previewId)}
                    onChange={(event) =>
                      updateButton(
                        index,
                        "open_in_new_tab",
                        event.target.value === "new_tab"
                      )
                    }
                    className={inputClass}
                    disabled={[
                      "booking",
                      "section",
                      "phone",
                      "email",
                      "lead_form",
                    ].includes(destinationType)}
                  >
                    <option value="same_tab">Same Tab</option>
                    <option value="new_tab">New Tab</option>
                  </select>
                </Field>

                <Field label="Style Key">
                  <input
                    value={button.style_key || ""}
                    onFocus={() => selectEditor(previewId)}
                    onChange={(event) =>
                      updateButton(index, "style_key", event.target.value)
                    }
                    className={inputClass}
                    placeholder="hero_button_primary"
                  />
                </Field>

                <Field label="Action">
                  <input
                    value={button.action || ""}
                    className={`${inputClass} opacity-70`}
                    readOnly
                  />
                </Field>
              </div>

              <div className="mt-4">
                <TextStyleControls
                  label={`Button ${index + 1} Text Style`}
                  styles={payload.styles?.text?.[textStyleKey] || {}}
                  onChange={(styles) => updateTextStyle(textStyleKey, styles)}
                  onReset={() => resetTextStyle(textStyleKey)}
                />
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addButton}
          className="inline-flex h-11 w-fit items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-gold)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Hero Button
        </button>
      </div>
    </section>
  );
}
