import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestore,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Code2,
  Copy,
  FormInput,
  GripVertical,
  HelpCircle,
  History,
  Link,
  Monitor,
  Palette,
  Plus,
  Redo2,
  Save,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";

import { inputClass, textareaClass } from "./shared";

const BOOKING_FIELD_DEFINITIONS = [
  { key: "first_name", label: "First Name", placeholder: "Juan", type: "text" },
  { key: "last_name", label: "Last Name", placeholder: "Dela Cruz", type: "text" },
  { key: "email", label: "Email", placeholder: "juan@email.com", type: "email" },
  { key: "phone", label: "Phone", placeholder: "09XXXXXXXXX", type: "tel" },
  { key: "company", label: "Company", placeholder: "Company or organization", type: "text" },
  {
    key: "service_interest",
    label: "Interested Service",
    placeholder: "Which service are you interested in?",
    type: "text",
  },
  {
    key: "message",
    label: "Message",
    placeholder: "Tell us what you need help with.",
    type: "textarea",
    width: "100",
  },
  { key: "preferred_date", label: "Preferred Date", placeholder: "", type: "date" },
  { key: "preferred_time", label: "Preferred Time", placeholder: "", type: "time" },
];

const CONTACT_METHODS = [
  { key: "google_meet", label: "Google Meet", icon: "video" },
  { key: "zoom", label: "Zoom", icon: "camera" },
  { key: "teams", label: "Microsoft Teams", icon: "users" },
  { key: "phone", label: "Phone Call", icon: "phone" },
  { key: "in_person", label: "In Person", icon: "map-pin" },
];

const DEFAULT_BOOKING_SECTION_CONFIG = {
  enabled: true,
  content: {
    eyebrow: "Appointment",
    title: "Book an Appointment",
    description:
      "Visitors can submit their preferred schedule from your public page.",
    ctaButtonText: "Submit Booking Request",
    submittingButtonText: "Submitting...",
    successMessage: "Booking submitted successfully.",
    confirmationModalTitle: "Confirm your booking request",
    confirmationModalBody:
      "Review your details before sending the booking request.",
    emptyStateMessage: "No schedule options are available yet.",
    thankYouTitle: "Thank you for booking",
    thankYouBody: "We received your request and will contact you shortly.",
    dateUnavailableMessage:
      "This date is unavailable. Please choose another date.",
    timeBookedMessage:
      "This time is already booked. Please choose another time.",
    timeUnavailableMessage:
      "This time is unavailable. Please choose another time.",
  },
  fields: BOOKING_FIELD_DEFINITIONS.map((field, index) => ({
    key: field.key,
    visible: true,
    required: ["first_name", "last_name", "email", "preferred_date", "preferred_time"].includes(field.key),
    label: field.label,
    placeholder: field.placeholder,
    defaultValue: "",
    width: field.width || "50",
    order: index,
    validation: "",
  })),
  schedule: {
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    timeSlots: "09:00-17:00",
    timeInterval: 30,
    bufferTime: 15,
    blackoutDates: "",
    holidaysEnabled: true,
    timezone: "Asia/Manila",
    maxBookingsPerDay: 8,
  },
  contactMethods: CONTACT_METHODS.map((method, index) => ({
    ...method,
    enabled: true,
    order: index,
  })),
  defaultContactMethod: "google_meet",
  platformDisplayMode: "dropdown",
  design: {
    sectionBackgroundColor: "",
    backgroundImage: "",
    cardBackgroundColor: "",
    cardStyle: "elevated",
    borderRadius: 24,
    shadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
    headingFontSize: 48,
    bodyFontSize: 14,
    labelFontSize: 14,
    spacing: 32,
    buttonBackgroundColor: "",
    buttonTextColor: "",
    buttonRadius: 12,
    hoverEffect: "lift",
  },
  advanced: {
    conditionalFields: "",
    autoFillData: "",
    utmTracking: true,
    hiddenFields: "",
    redirectUrl: "",
    customWebhooks: "",
    crmIntegration: "",
  },
};

const SETTING_GROUPS = [
  {
    id: "general",
    title: "General Settings",
    icon: Settings,
    previewId: "booking",
    keywords: "enable visibility draft publish reset preview",
  },
  {
    id: "content",
    title: "Content & Text",
    icon: ClipboardCheck,
    previewId: "booking-heading",
    keywords: "eyebrow heading description button success confirmation empty thank you",
  },
  {
    id: "fields",
    title: "Form Fields",
    icon: FormInput,
    previewId: "booking-form",
    keywords: "fields labels placeholders required validation position width",
  },
  {
    id: "schedule",
    title: "Schedule Settings",
    icon: CalendarDays,
    previewId: "booking-schedule",
    keywords: "days time interval buffer blackout holiday timezone max bookings",
  },
  {
    id: "contact",
    title: "Contact Methods",
    icon: Link,
    previewId: "booking-contact-methods",
    keywords: "platform contact method icon sort default",
  },
  {
    id: "design",
    title: "Styling & Design",
    icon: Palette,
    previewId: "booking",
    keywords: "background image card radius shadow typography spacing button hover",
  },
  {
    id: "advanced",
    title: "Advanced Settings",
    icon: Code2,
    previewId: "booking-form",
    keywords: "conditional auto-fill utm hidden redirect webhook crm",
  },
];

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

const PREVIEW_MODES = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickEditableText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return "";
}

function sortByOrder(items = []) {
  return [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function normalizeBookingSectionConfig(section, form) {
  const payload = asObject(section?.payload);
  const existingConfig = asObject(payload.bookingSectionConfig);
  const legacyLabels = asObject(payload.labels);
  const legacyPlaceholders = asObject(payload.placeholders);
  const legacyVisibility = asObject(payload.field_visibility);
  const legacyDefaults = asObject(payload.field_defaults);
  const legacyRequired = asObject(payload.field_required);
  const legacyWidths = asObject(payload.field_widths);
  const legacyValidation = asObject(payload.field_validation);
  const legacyOrder = asArray(payload.field_order);
  const legacyPlatformLabels = asObject(payload.platform_labels);
  const legacyPlatformVisibility = asObject(payload.platform_visibility);
  const legacyStyles = asObject(payload.styles);
  const configFields = asArray(existingConfig.fields);
  const configMethods = asArray(existingConfig.contactMethods);

  const fields = BOOKING_FIELD_DEFINITIONS.map((field, index) => {
    const existing = configFields.find((item) => item.key === field.key) || {};
    const orderIndex = legacyOrder.indexOf(field.key);

    return {
      key: field.key,
      visible: existing.visible ?? legacyVisibility[field.key] !== false,
      required: existing.required ?? legacyRequired[field.key] ?? ["first_name", "last_name", "email", "preferred_date", "preferred_time"].includes(field.key),
      label: pickEditableText(existing.label, legacyLabels[field.key], field.label),
      placeholder: pickEditableText(
        existing.placeholder,
        legacyPlaceholders[field.key],
        field.placeholder
      ),
      defaultValue: pickEditableText(
        existing.defaultValue,
        legacyDefaults[field.key],
        ""
      ),
      width: String(existing.width || legacyWidths[field.key] || field.width || "50"),
      order: Number.isFinite(Number(existing.order))
        ? Number(existing.order)
        : orderIndex >= 0
          ? orderIndex
          : index,
      validation: pickEditableText(
        existing.validation,
        legacyValidation[field.key],
        ""
      ),
    };
  });

  const contactMethods = CONTACT_METHODS.map((method, index) => {
    const existing =
      configMethods.find((item) => item.key === method.key) || {};

    return {
      key: method.key,
      label: pickEditableText(
        existing.label,
        legacyPlatformLabels[method.key],
        method.label
      ),
      icon: pickEditableText(existing.icon, method.icon),
      enabled: existing.enabled ?? legacyPlatformVisibility[method.key] !== false,
      order: Number.isFinite(Number(existing.order)) ? Number(existing.order) : index,
    };
  });

  return {
    ...DEFAULT_BOOKING_SECTION_CONFIG,
    ...existingConfig,
    enabled: form?.show_booking !== false,
    content: {
      ...DEFAULT_BOOKING_SECTION_CONFIG.content,
      ...asObject(existingConfig.content),
      eyebrow: pickEditableText(
        existingConfig.content?.eyebrow,
        payload.eyebrow,
        section?.subtitle,
        payload.subtitle,
        DEFAULT_BOOKING_SECTION_CONFIG.content.eyebrow
      ),
      title: pickEditableText(
        existingConfig.content?.title,
        payload.title,
        section?.title,
        form?.booking_title,
        DEFAULT_BOOKING_SECTION_CONFIG.content.title
      ),
      description: pickEditableText(
        existingConfig.content?.description,
        payload.description,
        section?.description,
        payload.body,
        form?.booking_description,
        DEFAULT_BOOKING_SECTION_CONFIG.content.description
      ),
      ctaButtonText: pickEditableText(
        existingConfig.content?.ctaButtonText,
        payload.submit_button_label,
        DEFAULT_BOOKING_SECTION_CONFIG.content.ctaButtonText
      ),
      submittingButtonText: pickEditableText(
        existingConfig.content?.submittingButtonText,
        payload.submitting_button_label,
        DEFAULT_BOOKING_SECTION_CONFIG.content.submittingButtonText
      ),
      successMessage: pickEditableText(
        existingConfig.content?.successMessage,
        payload.success_message,
        DEFAULT_BOOKING_SECTION_CONFIG.content.successMessage
      ),
      dateUnavailableMessage: pickEditableText(
        existingConfig.content?.dateUnavailableMessage,
        payload.date_unavailable_message,
        DEFAULT_BOOKING_SECTION_CONFIG.content.dateUnavailableMessage
      ),
      timeBookedMessage: pickEditableText(
        existingConfig.content?.timeBookedMessage,
        payload.time_booked_message,
        DEFAULT_BOOKING_SECTION_CONFIG.content.timeBookedMessage
      ),
      timeUnavailableMessage: pickEditableText(
        existingConfig.content?.timeUnavailableMessage,
        payload.time_unavailable_message,
        DEFAULT_BOOKING_SECTION_CONFIG.content.timeUnavailableMessage
      ),
    },
    fields: sortByOrder(fields),
    schedule: {
      ...DEFAULT_BOOKING_SECTION_CONFIG.schedule,
      ...asObject(existingConfig.schedule),
    },
    contactMethods: sortByOrder(contactMethods),
    defaultContactMethod:
      existingConfig.defaultContactMethod ||
      form?.booking_platform ||
      DEFAULT_BOOKING_SECTION_CONFIG.defaultContactMethod,
    platformDisplayMode:
      existingConfig.platformDisplayMode ||
      payload.platform_display_mode ||
      DEFAULT_BOOKING_SECTION_CONFIG.platformDisplayMode,
    design: {
      ...DEFAULT_BOOKING_SECTION_CONFIG.design,
      ...asObject(existingConfig.design),
      sectionBackgroundColor:
        existingConfig.design?.sectionBackgroundColor ||
        legacyStyles.section?.backgroundColor ||
        "",
      backgroundImage:
        existingConfig.design?.backgroundImage ||
        legacyStyles.section?.backgroundImage ||
        "",
      cardBackgroundColor:
        existingConfig.design?.cardBackgroundColor ||
        legacyStyles.card?.backgroundColor ||
        "",
      borderRadius:
        existingConfig.design?.borderRadius ||
        parseInt(legacyStyles.card?.borderRadius, 10) ||
        DEFAULT_BOOKING_SECTION_CONFIG.design.borderRadius,
      shadow:
        existingConfig.design?.shadow ||
        legacyStyles.card?.boxShadow ||
        DEFAULT_BOOKING_SECTION_CONFIG.design.shadow,
      headingFontSize:
        existingConfig.design?.headingFontSize ||
        parseInt(legacyStyles.heading?.fontSize, 10) ||
        DEFAULT_BOOKING_SECTION_CONFIG.design.headingFontSize,
      bodyFontSize:
        existingConfig.design?.bodyFontSize ||
        parseInt(legacyStyles.description?.fontSize, 10) ||
        DEFAULT_BOOKING_SECTION_CONFIG.design.bodyFontSize,
      buttonBackgroundColor:
        existingConfig.design?.buttonBackgroundColor ||
        legacyStyles.button?.backgroundColor ||
        "",
      buttonTextColor:
        existingConfig.design?.buttonTextColor ||
        legacyStyles.button?.color ||
        "",
      buttonRadius:
        existingConfig.design?.buttonRadius ||
        parseInt(legacyStyles.button?.borderRadius, 10) ||
        DEFAULT_BOOKING_SECTION_CONFIG.design.buttonRadius,
    },
    advanced: {
      ...DEFAULT_BOOKING_SECTION_CONFIG.advanced,
      ...asObject(existingConfig.advanced),
    },
  };
}

function buildPayloadFromConfig(config) {
  const fields = sortByOrder(config.fields);
  const methods = sortByOrder(config.contactMethods);
  const labels = {};
  const placeholders = {};
  const fieldVisibility = {};
  const fieldDefaults = {};
  const fieldRequired = {};
  const fieldWidths = {};
  const fieldValidation = {};
  const platformLabels = {};
  const platformVisibility = {};

  fields.forEach((field) => {
    labels[field.key] = field.label;
    placeholders[field.key] = field.placeholder;
    fieldVisibility[field.key] = field.visible !== false;
    fieldDefaults[field.key] = field.defaultValue || "";
    fieldRequired[field.key] = field.required === true;
    fieldWidths[field.key] = field.width || "50";
    fieldValidation[field.key] = field.validation || "";
  });

  methods.forEach((method) => {
    platformLabels[method.key] = method.label;
    platformVisibility[method.key] = method.enabled !== false;
  });

  return {
    bookingSectionConfig: config,
    eyebrow: config.content.eyebrow,
    subtitle: config.content.eyebrow,
    title: config.content.title,
    description: config.content.description,
    body: config.content.description,
    schedule_title: "Select Schedule",
    submit_button_label: config.content.ctaButtonText,
    submitting_button_label: config.content.submittingButtonText,
    success_message: config.content.successMessage,
    date_unavailable_message: config.content.dateUnavailableMessage,
    time_booked_message: config.content.timeBookedMessage,
    time_unavailable_message: config.content.timeUnavailableMessage,
    platform_display_mode: config.platformDisplayMode,
    default_contact_method: config.defaultContactMethod,
    platform_labels: platformLabels,
    platform_visibility: platformVisibility,
    labels,
    placeholders,
    field_visibility: fieldVisibility,
    field_defaults: fieldDefaults,
    field_required: fieldRequired,
    field_widths: fieldWidths,
    field_validation: fieldValidation,
    field_order: fields.map((field) => field.key),
    schedule_settings: config.schedule,
    contact_methods: methods,
    advanced_settings: config.advanced,
    styles: {
      section: {
        backgroundColor: config.design.sectionBackgroundColor || undefined,
        backgroundImage: config.design.backgroundImage
          ? `url(${config.design.backgroundImage})`
          : undefined,
        paddingTop: config.design.spacing
          ? `${Number(config.design.spacing) * 2}px`
          : undefined,
        paddingBottom: config.design.spacing
          ? `${Number(config.design.spacing) * 2}px`
          : undefined,
      },
      card: {
        backgroundColor: config.design.cardBackgroundColor || undefined,
        borderRadius: `${config.design.borderRadius}px`,
        boxShadow: config.design.shadow || undefined,
      },
      heading: {
        fontSize: `${config.design.headingFontSize}px`,
      },
      description: {
        fontSize: `${config.design.bodyFontSize}px`,
      },
      label: {
        fontSize: `${config.design.labelFontSize}px`,
      },
      button: {
        backgroundColor: config.design.buttonBackgroundColor || undefined,
        color: config.design.buttonTextColor || undefined,
        borderRadius: `${config.design.buttonRadius}px`,
      },
    },
  };
}

function ButtonIcon({ icon: Icon, label, disabled, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {Icon ? createElement(Icon, { className: "h-4 w-4" }) : null}
    </button>
  );
}

function Tooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-xs normal-case tracking-normal text-[var(--text-secondary)] opacity-0 shadow-xl transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function ControlLabel({ label, help }) {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
      {label}
      <Tooltip text={help || label} />
    </span>
  );
}

function TextControl({ label, help, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <ControlLabel label={label} help={help} />
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextareaControl({ label, help, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <ControlLabel label={label} help={help} />
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={textareaClass}
        placeholder={placeholder}
      />
    </label>
  );
}

function ToggleControl({ label, help, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-black text-[var(--text-primary)]">
          {label}
          <Tooltip text={help || label} />
        </span>
      </span>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}

function SelectControl({ label, help, value, onChange, options }) {
  return (
    <label className="block">
      <ControlLabel label={label} help={help} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorControl({ label, help, value, onChange, placeholder }) {
  return (
    <label className="block">
      <ControlLabel label={label} help={help} />
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={value || placeholder || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-11 cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-1"
        />
        <input
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}

function NumberControl({ label, help, value, onChange, min, max, step = 1 }) {
  return (
    <label className="block">
      <ControlLabel label={label} help={help} />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </label>
  );
}

function CollapsibleGroup({
  group,
  open,
  matchesSearch,
  children,
  onToggle,
  onFocus,
}) {
  const Icon = group.icon;

  if (!matchesSearch) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <button
        type="button"
        onClick={() => {
          onToggle(group.id);
          onFocus(group.previewId);
        }}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-black text-[var(--text-primary)]">
              {group.title}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Click to edit and highlight this area in preview.
            </span>
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--border-color)] p-4">
          {children}
        </div>
      )}
    </section>
  );
}

export default function BookingSettings({
  form,
  section,
  saving,
  previewMode = "desktop",
  onChange,
  onSave,
  onUpdateSection,
  onPreviewSectionPayloadChange,
  onPreviewModeChange,
  onEditorFocus,
}) {
  const initialConfig = useMemo(
    () => normalizeBookingSectionConfig(section, form),
    [section, form]
  );
  const [bookingSectionConfig, setBookingSectionConfig] = useState(initialConfig);
  const [openGroups, setOpenGroups] = useState({
    general: true,
    content: true,
    fields: true,
  });
  const [search, setSearch] = useState("");
  const historyRef = useRef([initialConfig]);
  const historyIndexRef = useRef(0);
  const customMethodIdRef = useRef(0);

  useEffect(() => {
    if (!section?.id) return;
    onPreviewSectionPayloadChange?.(section.id, buildPayloadFromConfig(bookingSectionConfig));
  }, [bookingSectionConfig, section?.id, onPreviewSectionPayloadChange]);

  function pushConfig(nextConfig, previewId) {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(nextConfig);
    historyRef.current = nextHistory.slice(-30);
    historyIndexRef.current = historyRef.current.length - 1;
    setBookingSectionConfig(nextConfig);
    if (previewId) onEditorFocus?.(previewId);
  }

  function patchConfig(updater, previewId) {
    const nextConfig =
      typeof updater === "function" ? updater(bookingSectionConfig) : updater;
    pushConfig(nextConfig, previewId);
  }

  function patchGroup(groupKey, values, previewId) {
    patchConfig(
      {
        ...bookingSectionConfig,
        [groupKey]: {
          ...asObject(bookingSectionConfig[groupKey]),
          ...values,
        },
      },
      previewId
    );
  }

  function updateContent(key, value, previewId = "booking-heading") {
    patchGroup("content", { [key]: value }, previewId);
  }

  function updateDesign(key, value, previewId = "booking") {
    patchGroup("design", { [key]: value }, previewId);
  }

  function updateSchedule(key, value) {
    patchGroup("schedule", { [key]: value }, "booking-schedule");
  }

  function updateAdvanced(key, value) {
    patchGroup("advanced", { [key]: value }, "booking-form");
  }

  function updateField(fieldKey, values) {
    patchConfig(
      {
        ...bookingSectionConfig,
        fields: bookingSectionConfig.fields.map((field) =>
          field.key === fieldKey ? { ...field, ...values } : field
        ),
      },
      `booking-field-${fieldKey}`
    );
  }

  function moveField(fieldKey, direction) {
    const fields = sortByOrder(bookingSectionConfig.fields);
    const index = fields.findIndex((field) => field.key === fieldKey);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= fields.length) return;

    const nextFields = [...fields];
    const [moved] = nextFields.splice(index, 1);
    nextFields.splice(targetIndex, 0, moved);

    patchConfig(
      {
        ...bookingSectionConfig,
        fields: nextFields.map((field, order) => ({ ...field, order })),
      },
      `booking-field-${fieldKey}`
    );
  }

  function updateContactMethod(methodKey, values) {
    patchConfig(
      {
        ...bookingSectionConfig,
        contactMethods: bookingSectionConfig.contactMethods.map((method) =>
          method.key === methodKey ? { ...method, ...values } : method
        ),
      },
      "booking-contact-methods"
    );
  }

  function moveContactMethod(methodKey, direction) {
    const methods = sortByOrder(bookingSectionConfig.contactMethods);
    const index = methods.findIndex((method) => method.key === methodKey);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= methods.length) return;

    const nextMethods = [...methods];
    const [moved] = nextMethods.splice(index, 1);
    nextMethods.splice(targetIndex, 0, moved);

    patchConfig(
      {
        ...bookingSectionConfig,
        contactMethods: nextMethods.map((method, order) => ({
          ...method,
          order,
        })),
      },
      "booking-contact-methods"
    );
  }

  function addContactMethod() {
    customMethodIdRef.current += 1;
    const key = `custom_${customMethodIdRef.current}`;
    patchConfig(
      {
        ...bookingSectionConfig,
        contactMethods: [
          ...bookingSectionConfig.contactMethods,
          {
            key,
            label: "Custom Method",
            icon: "link",
            enabled: true,
            order: bookingSectionConfig.contactMethods.length,
          },
        ],
      },
      "booking-contact-methods"
    );
  }

  function removeContactMethod(methodKey) {
    patchConfig(
      {
        ...bookingSectionConfig,
        contactMethods: bookingSectionConfig.contactMethods
          .filter((method) => method.key !== methodKey)
          .map((method, order) => ({ ...method, order })),
      },
      "booking-contact-methods"
    );
  }

  function undo() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setBookingSectionConfig(historyRef.current[historyIndexRef.current]);
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setBookingSectionConfig(historyRef.current[historyIndexRef.current]);
  }

  function resetSection() {
    pushConfig(
      {
        ...DEFAULT_BOOKING_SECTION_CONFIG,
        enabled: bookingSectionConfig.enabled,
      },
      "booking"
    );
  }

  function exportConfiguration() {
    const json = JSON.stringify(bookingSectionConfig, null, 2);
    navigator.clipboard?.writeText(json);
  }

  function importConfiguration(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        pushConfig(
          normalizeBookingSectionConfig(
            { ...section, payload: { bookingSectionConfig: imported } },
            form
          ),
          "booking"
        );
      } catch {
        /* Invalid imports are ignored to avoid replacing a working draft. */
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    const payload = buildPayloadFromConfig(bookingSectionConfig);

    onChange?.("show_booking", bookingSectionConfig.enabled);
    onChange?.("booking_platform", bookingSectionConfig.defaultContactMethod);
    await onSave?.();

    if (!section?.id || !onUpdateSection) return;

    await onUpdateSection(section.id, {
      title: bookingSectionConfig.content.title || "",
      subtitle: bookingSectionConfig.content.eyebrow || "",
      description: bookingSectionConfig.content.description || "",
      payload,
    });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleGroups = SETTING_GROUPS.filter((group) => {
    if (!normalizedSearch) return true;
    return `${group.title} ${group.keywords}`.toLowerCase().includes(normalizedSearch);
  });

  const sortedFields = sortByOrder(bookingSectionConfig.fields);
  const sortedMethods = sortByOrder(bookingSectionConfig.contactMethods);

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              Booking Section CMS
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Configure content, fields, schedule, design, integrations, and publishing from one structured config.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PREVIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = previewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  title={`${mode.label} preview`}
                  onClick={() => onPreviewModeChange?.(mode.id)}
                  className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-black transition ${
                    active
                      ? "border-[var(--brand-gold)] bg-[var(--brand-gold)] text-black"
                      : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="Search settings"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <ButtonIcon icon={Undo2} label="Undo" onClick={undo} />
            <ButtonIcon icon={Redo2} label="Redo" onClick={redo} />
            <ButtonIcon icon={ArchiveRestore} label="Reset section" onClick={resetSection} />
            <ButtonIcon icon={Copy} label="Export configuration" onClick={exportConfiguration} />
            <label
              title="Import configuration"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
            >
              <Upload className="h-4 w-4" />
              <input type="file" accept="application/json" className="hidden" onChange={importConfiguration} />
            </label>
          </div>
        </div>
      </div>

      {!section?.id && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700">
          No booking section record found. Add or restore a Booking section before editing section-level settings.
        </div>
      )}

      {SETTING_GROUPS.map((group) => (
        <CollapsibleGroup
          key={group.id}
          group={group}
          open={!!openGroups[group.id]}
          matchesSearch={visibleGroups.includes(group)}
          onToggle={(groupId) =>
            setOpenGroups((current) => ({
              ...current,
              [groupId]: !current[groupId],
            }))
          }
          onFocus={onEditorFocus}
        >
          {group.id === "general" && (
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleControl
                label="Show booking form"
                help="Controls whether this booking section appears on the public landing page."
                checked={bookingSectionConfig.enabled}
                onChange={(enabled) => {
                  onChange?.("show_booking", enabled);
                  patchConfig({ ...bookingSectionConfig, enabled }, "booking");
                }}
              />
              <SelectControl
                label="Platform display"
                help="Choose how contact methods appear in the public form."
                value={bookingSectionConfig.platformDisplayMode}
                onChange={(platformDisplayMode) =>
                  patchConfig(
                    { ...bookingSectionConfig, platformDisplayMode },
                    "booking-contact-methods"
                  )
                }
                options={[
                  { value: "dropdown", label: "Dropdown" },
                  { value: "cards", label: "Button Cards" },
                  { value: "hidden", label: "Hidden / Auto-selected" },
                ]}
              />
            </div>
          )}

          {group.id === "content" && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextControl label="Eyebrow Text" value={bookingSectionConfig.content.eyebrow} onChange={(value) => updateContent("eyebrow", value, "booking-eyebrow")} />
                <TextControl label="Heading" value={bookingSectionConfig.content.title} onChange={(value) => updateContent("title", value, "booking-heading")} />
              </div>
              <TextareaControl label="Description" value={bookingSectionConfig.content.description} onChange={(value) => updateContent("description", value, "booking-description")} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextControl label="CTA Button Text" value={bookingSectionConfig.content.ctaButtonText} onChange={(value) => updateContent("ctaButtonText", value, "booking-submit-button")} />
                <TextControl label="Success Message" value={bookingSectionConfig.content.successMessage} onChange={(value) => updateContent("successMessage", value, "booking-success-message")} />
                <TextControl label="Confirmation Modal Content" value={bookingSectionConfig.content.confirmationModalTitle} onChange={(value) => updateContent("confirmationModalTitle", value)} />
                <TextControl label="Empty State Messages" value={bookingSectionConfig.content.emptyStateMessage} onChange={(value) => updateContent("emptyStateMessage", value)} />
                <TextControl label="Thank You Page Title" value={bookingSectionConfig.content.thankYouTitle} onChange={(value) => updateContent("thankYouTitle", value)} />
                <TextControl label="Thank You Page Content" value={bookingSectionConfig.content.thankYouBody} onChange={(value) => updateContent("thankYouBody", value)} />
              </div>
            </div>
          )}

          {group.id === "fields" && (
            <div className="grid gap-3">
              {sortedFields.map((field, index) => (
                <div key={field.key} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-[var(--text-muted)]" />
                      <div>
                        <h4 className="font-black text-[var(--text-primary)]">{field.label || field.key}</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Position {index + 1} in the public form</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ButtonIcon icon={ChevronUp} label="Move field up" disabled={index === 0} onClick={() => moveField(field.key, -1)} />
                      <ButtonIcon icon={ChevronDown} label="Move field down" disabled={index === sortedFields.length - 1} onClick={() => moveField(field.key, 1)} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleControl label="Show field" checked={field.visible} onChange={(visible) => updateField(field.key, { visible })} />
                    <ToggleControl label="Required" checked={field.required} onChange={(required) => updateField(field.key, { required })} />
                    <TextControl label="Editable Label" value={field.label} onChange={(label) => updateField(field.key, { label })} />
                    <TextControl label="Editable Placeholder" value={field.placeholder} onChange={(placeholder) => updateField(field.key, { placeholder })} />
                    <TextControl label="Default Value" value={field.defaultValue} onChange={(defaultValue) => updateField(field.key, { defaultValue })} />
                    <SelectControl
                      label="Width"
                      value={field.width}
                      onChange={(width) => updateField(field.key, { width })}
                      options={[
                        { value: "50", label: "50%" },
                        { value: "100", label: "100%" },
                      ]}
                    />
                    <div className="md:col-span-2">
                      <TextControl label="Custom Validation Rules" value={field.validation} onChange={(validation) => updateField(field.key, { validation })} placeholder="Example: min:3, pattern:^09" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {group.id === "schedule" && (
            <div className="grid gap-4">
              <div>
                <ControlLabel label="Working Days Selector" help="Choose which days visitors can request bookings." />
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(([day, label]) => {
                    const active = bookingSectionConfig.schedule.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const workingDays = active
                            ? bookingSectionConfig.schedule.workingDays.filter((item) => item !== day)
                            : [...bookingSectionConfig.schedule.workingDays, day];
                          updateSchedule("workingDays", workingDays);
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          active
                            ? "border-[var(--brand-gold)] bg-[var(--brand-gold)] text-black"
                            : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextControl label="Available Time Slots" value={bookingSectionConfig.schedule.timeSlots} onChange={(value) => updateSchedule("timeSlots", value)} placeholder="09:00-17:00" />
                <SelectControl
                  label="Time Interval"
                  value={String(bookingSectionConfig.schedule.timeInterval)}
                  onChange={(value) => updateSchedule("timeInterval", Number(value))}
                  options={[
                    { value: "15", label: "15 minutes" },
                    { value: "30", label: "30 minutes" },
                    { value: "60", label: "60 minutes" },
                  ]}
                />
                <NumberControl label="Buffer Time" value={bookingSectionConfig.schedule.bufferTime} min={0} max={240} onChange={(value) => updateSchedule("bufferTime", value)} />
                <NumberControl label="Max Bookings Per Day" value={bookingSectionConfig.schedule.maxBookingsPerDay} min={1} max={500} onChange={(value) => updateSchedule("maxBookingsPerDay", value)} />
                <TextControl label="Blackout Dates" value={bookingSectionConfig.schedule.blackoutDates} onChange={(value) => updateSchedule("blackoutDates", value)} placeholder="2026-12-24, 2026-12-25" />
                <TextControl label="Timezone Selection" value={bookingSectionConfig.schedule.timezone} onChange={(value) => updateSchedule("timezone", value)} />
                <ToggleControl label="Holiday Settings" checked={bookingSectionConfig.schedule.holidaysEnabled} onChange={(value) => updateSchedule("holidaysEnabled", value)} />
              </div>
            </div>
          )}

          {group.id === "contact" && (
            <div className="grid gap-4">
              <div className="flex justify-end">
                <button type="button" onClick={addContactMethod} className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-4 text-sm font-bold text-[var(--text-primary)]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Method
                </button>
              </div>
              {sortedMethods.map((method, index) => (
                <div key={method.key} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-black text-[var(--text-primary)]">{method.label}</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Sort order {index + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ButtonIcon icon={ChevronUp} label="Move method up" disabled={index === 0} onClick={() => moveContactMethod(method.key, -1)} />
                      <ButtonIcon icon={ChevronDown} label="Move method down" disabled={index === sortedMethods.length - 1} onClick={() => moveContactMethod(method.key, 1)} />
                      {method.key.startsWith("custom_") && <ButtonIcon icon={Trash2} label="Remove method" onClick={() => removeContactMethod(method.key)} />}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleControl label="Enable / Disable" checked={method.enabled} onChange={(enabled) => updateContactMethod(method.key, { enabled })} />
                    <label className="block">
                      <ControlLabel label="Default Selected Method" />
                      <input
                        type="radio"
                        checked={bookingSectionConfig.defaultContactMethod === method.key}
                        onChange={() => {
                          onChange?.("booking_platform", method.key);
                          patchConfig({ ...bookingSectionConfig, defaultContactMethod: method.key }, "booking-contact-methods");
                        }}
                        className="h-4 w-4"
                      />
                    </label>
                    <TextControl label="Display Label" value={method.label} onChange={(label) => updateContactMethod(method.key, { label })} />
                    <TextControl label="Custom Icon" value={method.icon} onChange={(icon) => updateContactMethod(method.key, { icon })} placeholder="phone, video, users" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {group.id === "design" && (
            <div className="grid gap-4 md:grid-cols-2">
              <ColorControl label="Section Background Color" value={bookingSectionConfig.design.sectionBackgroundColor} onChange={(value) => updateDesign("sectionBackgroundColor", value)} placeholder="#ffffff" />
              <TextControl label="Background Image" value={bookingSectionConfig.design.backgroundImage} onChange={(value) => updateDesign("backgroundImage", value)} placeholder="https://..." />
              <ColorControl label="Card Background Color" value={bookingSectionConfig.design.cardBackgroundColor} onChange={(value) => updateDesign("cardBackgroundColor", value)} placeholder="#ffffff" />
              <SelectControl
                label="Card Style"
                value={bookingSectionConfig.design.cardStyle}
                onChange={(value) => updateDesign("cardStyle", value)}
                options={[
                  { value: "flat", label: "Flat" },
                  { value: "elevated", label: "Elevated" },
                  { value: "outlined", label: "Outlined" },
                  { value: "glass", label: "Glass" },
                ]}
              />
              <NumberControl label="Border Radius" value={bookingSectionConfig.design.borderRadius} min={0} max={64} onChange={(value) => updateDesign("borderRadius", value)} />
              <TextControl label="Shadow" value={bookingSectionConfig.design.shadow} onChange={(value) => updateDesign("shadow", value)} />
              <NumberControl label="Heading Typography" value={bookingSectionConfig.design.headingFontSize} min={20} max={84} onChange={(value) => updateDesign("headingFontSize", value)} />
              <NumberControl label="Body Typography" value={bookingSectionConfig.design.bodyFontSize} min={12} max={28} onChange={(value) => updateDesign("bodyFontSize", value)} />
              <NumberControl label="Spacing Controls" value={bookingSectionConfig.design.spacing} min={12} max={80} onChange={(value) => updateDesign("spacing", value)} />
              <ColorControl label="Button Background" value={bookingSectionConfig.design.buttonBackgroundColor} onChange={(value) => updateDesign("buttonBackgroundColor", value)} placeholder="#e0b92f" />
              <ColorControl label="Button Text" value={bookingSectionConfig.design.buttonTextColor} onChange={(value) => updateDesign("buttonTextColor", value)} placeholder="#000000" />
              <SelectControl
                label="Hover Effects"
                value={bookingSectionConfig.design.hoverEffect}
                onChange={(value) => updateDesign("hoverEffect", value)}
                options={[
                  { value: "none", label: "None" },
                  { value: "lift", label: "Lift" },
                  { value: "glow", label: "Glow" },
                  { value: "scale", label: "Scale" },
                ]}
              />
            </div>
          )}

          {group.id === "advanced" && (
            <div className="grid gap-4 md:grid-cols-2">
              <TextareaControl label="Conditional Fields" value={bookingSectionConfig.advanced.conditionalFields} onChange={(value) => updateAdvanced("conditionalFields", value)} />
              <TextareaControl label="Auto-fill Data" value={bookingSectionConfig.advanced.autoFillData} onChange={(value) => updateAdvanced("autoFillData", value)} />
              <ToggleControl label="UTM Tracking" checked={bookingSectionConfig.advanced.utmTracking} onChange={(value) => updateAdvanced("utmTracking", value)} />
              <TextareaControl label="Hidden Fields" value={bookingSectionConfig.advanced.hiddenFields} onChange={(value) => updateAdvanced("hiddenFields", value)} />
              <TextControl label="Redirect URL After Submit" value={bookingSectionConfig.advanced.redirectUrl} onChange={(value) => updateAdvanced("redirectUrl", value)} />
              <TextareaControl label="Custom Webhooks" value={bookingSectionConfig.advanced.customWebhooks} onChange={(value) => updateAdvanced("customWebhooks", value)} />
              <TextareaControl label="CRM Integration Settings" value={bookingSectionConfig.advanced.crmIntegration} onChange={(value) => updateAdvanced("crmIntegration", value)} />
            </div>
          )}
        </CollapsibleGroup>
      ))}

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 p-3 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={exportConfiguration}
          className="inline-flex h-10 items-center rounded-xl border border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-primary)]"
        >
          <History className="mr-2 h-4 w-4" />
          Save Draft
        </button>
        <button
          type="submit"
          disabled={saving || !section?.id}
          className="inline-flex h-10 items-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-black text-black transition hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Publishing..." : "Publish Changes"}
        </button>
      </div>
    </form>
  );
}
