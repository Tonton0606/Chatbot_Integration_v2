import PublicBookingDatePicker, {
  isDateBlocked,
} from "./booking/PublicBookingDatePicker";
import PublicBookingTimePicker from "./booking/PublicBookingTimePicker";
import { asArray, isTimeField } from "./publicLandingUtils";
import {
  resolveRuntimeCardStyle,
  resolveRuntimePrimaryButtonStyle,
  resolveRuntimeSectionBackground,
  resolveRuntimeSectionStyle,
  resolveRuntimeTextStyle,
} from "./landingThemeRuntime";
import {
  getPreviewClass,
  stopPreviewClick,
} from "./services/serviceRendererUtils";

const DEFAULT_BOOKING_COPY = {
  eyebrow: "Appointment",
  title: "Book an Appointment",
  description:
    "Visitors can submit their preferred schedule from your public page.",
  schedule_title: "Select Schedule",
  submit_button_label: "Submit Booking Request",
  submitting_button_label: "Submitting...",
  success_message: "Booking submitted successfully.",
  date_unavailable_message:
    "This date is unavailable. Please choose another date.",
  time_booked_message:
    "This time is already booked. Please choose another time.",
  time_unavailable_message:
    "This time is unavailable. Please choose another time.",
  platform_display_mode: "dropdown",
};

const BOOKING_PLATFORM_OPTIONS = [
  { key: "google_meet", label: "Google Meet" },
  { key: "zoom", label: "Zoom" },
  { key: "teams", label: "Microsoft Teams" },
  { key: "phone", label: "Phone Call" },
  { key: "in_person", label: "In Person" },
];

function getPreviewElementClass(activePreviewId, previewId, baseClass = "") {
  return getPreviewClass(activePreviewId, previewId, baseClass);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanText(value) {
  return String(value || "").trim();
}

function pickEditableText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return "";
}

function normalizeDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return "";

  if (/^\d{2}:\d{2}/.test(value)) {
    return String(value).slice(0, 5);
  }

  const [rawTime, rawPeriod] = String(value).trim().split(/\s+/);
  const [rawHour, rawMinute = "00"] = String(rawTime || "").split(":");

  let hour = Number(rawHour);
  const minute = Number(rawMinute);
  const period = String(rawPeriod || "").toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(value);

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildSlotKey(date, time) {
  return `${normalizeDate(date)}|${normalizeTime(time)}`;
}

function isSlotBooked(bookings = [], date, time) {
  if (!date || !time) return false;
  const selectedSlot = buildSlotKey(date, time);

  return bookings.some(
    (booking) =>
      buildSlotKey(booking.preferred_date, booking.preferred_time) ===
      selectedSlot
  );
}

function isDateTimeInRange(selectedDate, timeValue, startsAt, endsAt) {
  if (!selectedDate || !timeValue) return false;

  const target = new Date(
    `${normalizeDate(selectedDate)}T${normalizeTime(timeValue)}:00`
  );
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    Number.isNaN(target.getTime()) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return false;
  }

  return target >= start && target <= end;
}

function isTimeBlocked(exceptions = [], selectedDate, timeValue) {
  if (!selectedDate || !timeValue) return false;

  return exceptions.some((exception) => {
    if (!exception || exception.archived_at) return false;
    if (exception.is_full_day || exception.recurrence_rule) return false;

    return isDateTimeInRange(
      selectedDate,
      timeValue,
      exception.starts_at,
      exception.ends_at
    );
  });
}

function isDateField(field) {
  return field.type === "date" || field.field_key === "preferred_date";
}

function isPlatformField(field) {
  return field.field_key === "booking_platform";
}

function isScheduleField(field) {
  return isDateField(field) || isTimeField(field);
}

function isFieldVisible(field, fieldVisibility = {}) {
  return fieldVisibility?.[field.field_key] !== false;
}

function isPlatformVisible(platformVisibility = {}, platformKey) {
  return platformVisibility?.[platformKey] !== false;
}

function getFieldValue(field, bookingForm = {}, fieldDefaults = {}) {
  const formValue = bookingForm[field.field_key];

  if (formValue !== undefined && formValue !== null && formValue !== "") {
    return formValue;
  }

  return fieldDefaults[field.field_key] || "";
}

function getDefaultPlatform(landingPage = {}, copy = {}) {
  return (
    copy.default_contact_method ||
    landingPage?.booking_platform ||
    "google_meet"
  );
}

function getPlatformLabel(platform = {}, platformLabels = {}) {
  return cleanText(platformLabels[platform.key]) || platform.label || "";
}

function getVisiblePlatforms(platformVisibility = {}) {
  return BOOKING_PLATFORM_OPTIONS.filter((platform) =>
    isPlatformVisible(platformVisibility, platform.key)
  );
}

function getContactMethods(copy = {}, platformVisibility = {}) {
  const configuredMethods = asArray(copy.contact_methods);

  if (!configuredMethods.length) {
    return getVisiblePlatforms(platformVisibility);
  }

  return configuredMethods
    .filter((method) => method.enabled !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((method) => ({
      key: method.key,
      label: method.label,
    }));
}

function getOrderedFields(fields = [], fieldOrder = []) {
  const order = asArray(fieldOrder);
  if (!order.length) return fields;

  const orderMap = new Map(order.map((key, index) => [key, index]));

  return [...fields].sort((a, b) => {
    const aOrder = orderMap.has(a.field_key)
      ? orderMap.get(a.field_key)
      : fields.length;
    const bOrder = orderMap.has(b.field_key)
      ? orderMap.get(b.field_key)
      : fields.length;

    return aOrder - bOrder;
  });
}

function buildPickerTheme(runtime) {
  return {
    primaryColor: runtime.primaryColor,
    headingColor: runtime.section.headingColor,
    bodyTextColor: runtime.section.bodyTextColor,
    cardBackground: runtime.isLight ? "#ffffff" : "rgba(255,255,255,0.08)",
    clockBackground: runtime.isLight ? "#0f172a" : "rgba(0,0,0,0.42)",
    clockTextColor: runtime.primaryColor,
    borderColor: runtime.isLight
      ? "rgba(15,23,42,0.12)"
      : "rgba(255,255,255,0.14)",
    blockedBackground: "rgba(239,68,68,0.12)",
    blockedColor: "#ef4444",
  };
}

function getBookingPayload(bookingSection = {}, landingPage = {}) {
  const payload = asObject(bookingSection?.payload);

  return {
    ...DEFAULT_BOOKING_COPY,
    ...payload,
    eyebrow: pickEditableText(
      payload.eyebrow,
      bookingSection?.subtitle,
      payload.subtitle,
      DEFAULT_BOOKING_COPY.eyebrow
    ),
    title: pickEditableText(
      payload.title,
      bookingSection?.title,
      landingPage?.booking_title,
      DEFAULT_BOOKING_COPY.title
    ),
    description: pickEditableText(
      payload.description,
      bookingSection?.description,
      payload.body,
      landingPage?.booking_description,
      DEFAULT_BOOKING_COPY.description
    ),
    labels: asObject(payload.labels),
    placeholders: asObject(payload.placeholders),
    styles: asObject(payload.styles),
    field_visibility: asObject(payload.field_visibility),
    field_defaults: asObject(payload.field_defaults),
    platform_display_mode:
      payload.platform_display_mode ||
      DEFAULT_BOOKING_COPY.platform_display_mode,
    default_contact_method:
      payload.default_contact_method ||
      payload.bookingSectionConfig?.defaultContactMethod ||
      "",
    platform_labels: asObject(payload.platform_labels),
    platform_visibility: asObject(payload.platform_visibility),
    field_order: asArray(payload.field_order),
    field_required: asObject(payload.field_required),
    field_widths: asObject(payload.field_widths),
    field_validation: asObject(payload.field_validation),
    contact_methods: asArray(payload.contact_methods),
    schedule_settings: asObject(payload.schedule_settings),
    advanced_settings: asObject(payload.advanced_settings),
  };
}

function getFieldLabel(field = {}, labels = {}) {
  return cleanText(labels[field.field_key]) || field.label || "";
}

function getFieldPlaceholder(field = {}, placeholders = {}, label = "") {
  return cleanText(placeholders[field.field_key]) || field.placeholder || label;
}

export default function RendererBooking({
  activePreviewId,
  onPreviewClick,
  landingPage,
  bookingSection,
  runtime,
  sectionIndex = 5,
  viewportMode,
  compact,
  bookingFields = [],
  bookingForm = {},
  bookingAvailability = {},
  submitting,
  submitted,
  onBookingChange,
  onBookingSubmit,
}) {
  const previewId = "booking";
  const copy = getBookingPayload(bookingSection, landingPage);
  const labels = asObject(copy.labels);
  const placeholders = asObject(copy.placeholders);
  const styles = asObject(copy.styles);
  const fieldVisibility = asObject(copy.field_visibility);
  const fieldDefaults = asObject(copy.field_defaults);
  const fieldRequired = asObject(copy.field_required);
  const fieldWidths = asObject(copy.field_widths);
  const platformLabels = asObject(copy.platform_labels);
  const platformVisibility = asObject(copy.platform_visibility);
  const platformDisplayMode = copy.platform_display_mode || "dropdown";
  const defaultPlatform = getDefaultPlatform(landingPage, copy);
  const selectedPlatform = bookingForm.booking_platform || defaultPlatform;
  const visiblePlatforms = getContactMethods(copy, platformVisibility);

  const orderedBookingFields = getOrderedFields(bookingFields, copy.field_order);

  const visibleBookingFields = orderedBookingFields.filter((field) =>
    isFieldVisible(field, fieldVisibility)
  );

  const hiddenBookingFields = orderedBookingFields.filter(
    (field) => !isFieldVisible(field, fieldVisibility)
  );

  const sectionStyles = asObject(styles.section);
  const cardStyles = asObject(styles.card);
  const eyebrowStyles = asObject(styles.eyebrow);
  const headingStyles = asObject(styles.heading);
  const descriptionStyles = asObject(styles.description);
  const labelStyles = asObject(styles.label);
  const buttonStyles = asObject(styles.button);
  const platformStyles = asObject(styles.platform);

  const sectionPadding =
    viewportMode === "mobile"
      ? "px-5 py-12"
      : viewportMode === "tablet"
        ? "px-7 py-16"
        : "px-10 py-24";

  const exceptions = asArray(bookingAvailability.exceptions);
  const bookings = asArray(bookingAvailability.bookings);

  const selectedDate =
    bookingForm.preferred_date || fieldDefaults.preferred_date || "";
  const selectedTime =
    bookingForm.preferred_time || fieldDefaults.preferred_time || "";

  const selectedDateBlocked = isDateBlocked(selectedDate, exceptions);
  const selectedSlotBooked = isSlotBooked(bookings, selectedDate, selectedTime);
  const selectedTimeBlocked = isTimeBlocked(
    exceptions,
    selectedDate,
    selectedTime
  );

  const scheduleUnavailable =
    selectedDateBlocked || selectedSlotBooked || selectedTimeBlocked;

  const normalFields = visibleBookingFields.filter(
    (field) => !isScheduleField(field) && !isPlatformField(field)
  );

  const scheduleFields = visibleBookingFields.filter(isScheduleField);

  const sectionBackground = resolveRuntimeSectionBackground(
    runtime,
    sectionIndex,
    "white"
  );

  const sectionStyle = resolveRuntimeSectionStyle(runtime, "booking", {
    backgroundColor: sectionBackground,
    ...sectionStyles,
  });

  const cardStyle = resolveRuntimeCardStyle(runtime, {
    ...cardStyles,
  });

  const submitButtonStyle = {
    ...resolveRuntimePrimaryButtonStyle(runtime),
    ...buttonStyles,
  };

  const pickerTheme = buildPickerTheme(runtime);

  const eyebrowStyle = resolveRuntimeTextStyle(runtime, "booking_eyebrow", {
    color: runtime.primaryColor,
    ...eyebrowStyles,
  });

  const headingStyle = resolveRuntimeTextStyle(runtime, "booking_heading", {
    color: runtime.section.headingColor,
    ...headingStyles,
  });

  const descriptionStyle = resolveRuntimeTextStyle(
    runtime,
    "booking_description",
    {
      color: runtime.section.bodyTextColor,
      ...descriptionStyles,
    }
  );

  const labelStyle = resolveRuntimeTextStyle(runtime, "booking_field_label", {
    color: runtime.section.headingColor,
    ...labelStyles,
  });

  const fieldClass = runtime.isLight
    ? "w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:border-slate-400"
    : "w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/30";

  function handleSubmit(event) {
    hiddenBookingFields.forEach((field) => {
      const defaultValue = fieldDefaults[field.field_key];

      if (defaultValue !== undefined && defaultValue !== null) {
        onBookingChange?.(field.field_key, defaultValue);
      }
    });

    if (platformDisplayMode === "hidden") {
      onBookingChange?.("booking_platform", defaultPlatform);
    }

    onBookingSubmit?.(event);
  }

  function renderHiddenField(field) {
    const value = fieldDefaults[field.field_key] || "";

    return (
      <input
        key={field.id || field.field_key}
        type="hidden"
        name={field.field_key}
        value={value}
        readOnly
      />
    );
  }

  function renderPlatformSelector() {
    if (platformDisplayMode === "hidden") {
      return (
        <input
          type="hidden"
          name="booking_platform"
          value={defaultPlatform}
          readOnly
        />
      );
    }

    if (!visiblePlatforms.length) return null;

    if (platformDisplayMode === "cards") {
      return (
        <div className="grid gap-2 md:col-span-2">
          <span className="text-sm font-bold" style={labelStyle}>
            Saan mo gustong makipag usap
          </span>

          <div className="grid gap-3 sm:grid-cols-2">
            {visiblePlatforms.map((platform) => {
              const label = getPlatformLabel(platform, platformLabels);
              const active = selectedPlatform === platform.key;

              return (
                <button
                  key={platform.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onBookingChange?.("booking_platform", platform.key);
                  }}
                  data-preview-id={`booking-contact-${platform.key}`}
                  className={getPreviewElementClass(
                    activePreviewId,
                    "booking-contact-methods",
                    "rounded-2xl border px-4 py-3 text-left text-sm font-black transition"
                  )}
                  style={
                    active
                      ? {
                          borderColor:
                            platformStyles.activeBorderColor ||
                            platformStyles.activeBackgroundColor ||
                            runtime.primaryColor,
                          backgroundColor:
                            platformStyles.activeBackgroundColor ||
                            runtime.primaryColor,
                          color:
                            platformStyles.activeTextColor ||
                            platformStyles.color ||
                            "#000000",
                        }
                      : {
                          borderColor:
                            platformStyles.borderColor ||
                            (runtime.isLight
                              ? "rgb(226, 232, 240)"
                              : "rgba(255,255,255,0.1)"),
                          backgroundColor:
                            platformStyles.backgroundColor ||
                            (runtime.isLight
                              ? "#ffffff"
                              : "rgba(255,255,255,0.1)"),
                          color:
                            platformStyles.color ||
                            (runtime.isLight ? "#0f172a" : "#ffffff"),
                        }
                  }
                >
                  {active ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-bold" style={labelStyle}>
          Saan mo gustong makipag usap
        </span>

        <select
          value={selectedPlatform}
          required
          onChange={(event) =>
            onBookingChange?.("booking_platform", event.target.value)
          }
          onClick={(event) => event.stopPropagation()}
          data-preview-id="booking-contact-methods"
          className={getPreviewElementClass(
            activePreviewId,
            "booking-contact-methods",
            `${fieldClass} h-12`
          )}
        >
          {visiblePlatforms.map((platform) => (
            <option key={platform.key} value={platform.key}>
              {getPlatformLabel(platform, platformLabels)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderField(field) {
    const value = getFieldValue(field, bookingForm, fieldDefaults);
    const isTextarea = field.type === "textarea";
    const label = getFieldLabel(field, labels);
    const placeholder = getFieldPlaceholder(field, placeholders, label);
    const required = fieldRequired[field.field_key] ?? field.required;
    const width = String(fieldWidths[field.field_key] || (isTextarea ? "100" : "50"));
    const previewId = `booking-field-${field.field_key}`;
    const fieldSpanClass =
      width === "100" || isTextarea ? "md:col-span-2" : "";

    return (
      <label
        key={field.id}
        data-preview-id={previewId}
        className={getPreviewElementClass(
          activePreviewId,
          previewId,
          `grid gap-2 ${fieldSpanClass}`
        )}
      >
        <span className="text-sm font-bold" style={labelStyle}>
          {label}
          {required ? " *" : ""}
        </span>

        {isTextarea ? (
          <textarea
            value={value}
            placeholder={placeholder}
            required={required}
            onChange={(event) =>
              onBookingChange?.(field.field_key, event.target.value)
            }
            onClick={(event) => event.stopPropagation()}
            className={`${fieldClass} min-h-[120px] py-3`}
          />
        ) : field.type === "select" ? (
          <select
            value={value}
            required={required}
            onChange={(event) =>
              onBookingChange?.(field.field_key, event.target.value)
            }
            onClick={(event) => event.stopPropagation()}
            className={`${fieldClass} h-12`}
          >
            <option value="">Select {label}</option>

            {asArray(field.options).map((option) => (
              <option
                key={option.value || option}
                value={option.value || option}
              >
                {option.label || option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type || "text"}
            value={value}
            placeholder={placeholder}
            required={required}
            onChange={(event) =>
              onBookingChange?.(field.field_key, event.target.value)
            }
            onClick={(event) => event.stopPropagation()}
            className={`${fieldClass} h-12`}
          />
        )}
      </label>
    );
  }

  function renderScheduleField(field) {
    const value = getFieldValue(field, bookingForm, fieldDefaults);
    const label = getFieldLabel(field, labels);
    const required = fieldRequired[field.field_key] ?? field.required;
    const previewId = `booking-field-${field.field_key}`;

    return (
      <label
        key={field.id}
        data-preview-id={previewId}
        className={getPreviewElementClass(activePreviewId, previewId, "grid gap-2")}
      >
        <span className="text-sm font-bold" style={labelStyle}>
          {label}
          {required ? " *" : ""}
        </span>

        {isDateField(field) ? (
          <PublicBookingDatePicker
            value={value}
            required={required}
            exceptions={exceptions}
            fieldClass={fieldClass}
            theme={pickerTheme}
            onChange={(nextValue) =>
              onBookingChange?.(field.field_key, nextValue)
            }
          />
        ) : (
          <PublicBookingTimePicker
            value={value}
            required={required}
            selectedDate={selectedDate}
            bookings={bookings}
            exceptions={exceptions}
            theme={pickerTheme}
            onChange={(nextValue) =>
              onBookingChange?.(field.field_key, nextValue)
            }
          />
        )}
      </label>
    );
  }

  return (
    <section
      id="booking"
      data-preview-id={previewId}
      className={getPreviewClass(activePreviewId, previewId, sectionPadding)}
      style={sectionStyle}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <div
        className={`mx-auto max-w-[980px] ${compact ? "p-5" : "p-8"}`}
        style={cardStyle}
      >
        {cleanText(copy.eyebrow) && (
          <p
            data-preview-id="booking-eyebrow"
            className={getPreviewElementClass(
              activePreviewId,
              "booking-eyebrow",
              "text-xs font-black uppercase tracking-[0.22em]"
            )}
            style={eyebrowStyle}
          >
            {copy.eyebrow}
          </p>
        )}

        {cleanText(copy.title) && (
          <h2
            data-preview-id="booking-heading"
            className={getPreviewElementClass(
              activePreviewId,
              "booking-heading",
              `mt-3 font-black ${compact ? "text-3xl" : "text-5xl"}`
            )}
            style={headingStyle}
          >
            {copy.title}
          </h2>
        )}

        {cleanText(copy.description) && (
          <p
            data-preview-id="booking-description"
            className={getPreviewElementClass(
              activePreviewId,
              "booking-description",
              "mt-4 max-w-2xl text-sm leading-7"
            )}
            style={descriptionStyle}
          >
            {copy.description}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          onClick={(event) => event.stopPropagation()}
          className={`mt-7 grid gap-4 ${
            compact ? "grid-cols-1" : "grid-cols-2"
          }`}
          data-preview-id="booking-form"
        >
          {hiddenBookingFields.map(renderHiddenField)}
          {normalFields.map(renderField)}
          {renderPlatformSelector()}

          {scheduleFields.length > 0 && (
            <div className="grid gap-4 md:col-span-2">
              <div
                data-preview-id="booking-schedule"
                className={getPreviewElementClass(
                  activePreviewId,
                  "booking-schedule",
                  "rounded-2xl border p-4"
                )}
                style={{
                  borderColor: pickerTheme.borderColor,
                  backgroundColor: runtime.isLight
                    ? "rgba(248,250,252,0.8)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-[0.22em]"
                  style={{ color: runtime.primaryColor }}
                >
                  {copy.schedule_title || DEFAULT_BOOKING_COPY.schedule_title}
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {scheduleFields.map(renderScheduleField)}
                </div>
              </div>
            </div>
          )}

          {selectedDateBlocked && (
            <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400 md:col-span-2">
              {copy.date_unavailable_message ||
                DEFAULT_BOOKING_COPY.date_unavailable_message}
            </p>
          )}

          {!selectedDateBlocked && selectedSlotBooked && (
            <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400 md:col-span-2">
              {copy.time_booked_message ||
                DEFAULT_BOOKING_COPY.time_booked_message}
            </p>
          )}

          {!selectedDateBlocked && !selectedSlotBooked && selectedTimeBlocked && (
            <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-400 md:col-span-2">
              {copy.time_unavailable_message ||
                DEFAULT_BOOKING_COPY.time_unavailable_message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || scheduleUnavailable}
            onClick={(event) => event.stopPropagation()}
            data-preview-id="booking-submit-button"
            className={getPreviewElementClass(
              activePreviewId,
              "booking-submit-button",
              "h-12 rounded-xl text-sm font-black disabled:opacity-60 md:col-span-2"
            )}
            style={submitButtonStyle}
          >
            {submitting
              ? copy.submitting_button_label ||
                DEFAULT_BOOKING_COPY.submitting_button_label
              : copy.submit_button_label ||
                DEFAULT_BOOKING_COPY.submit_button_label}
          </button>

          {submitted && (
            <p
              data-preview-id="booking-success-message"
              className={getPreviewElementClass(
                activePreviewId,
                "booking-success-message",
                "rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-400 md:col-span-2"
              )}
            >
              {copy.success_message || DEFAULT_BOOKING_COPY.success_message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
