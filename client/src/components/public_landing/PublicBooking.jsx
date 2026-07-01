import {
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function Field({
  field,
  value,
  onChange,
  isLight,
}) {
  const baseClass = `
    w-full
    min-h-[48px]
    rounded-2xl
    border
    px-4
    py-3
    text-[16px]
    sm:text-sm
    outline-none
    transition
  `;

  const themeClass = isLight
    ? "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
    : "border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={value || ""}
        onChange={(event) => onChange(field.field_key, event.target.value)}
        placeholder={field.placeholder || ""}
        className={`${baseClass} ${themeClass} resize-none`}
      />
    );
  }

  if (["select", "multiselect"].includes(field.type)) {
    return (
      <select
        value={value || ""}
        onChange={(event) => onChange(field.field_key, event.target.value)}
        className={`${baseClass} ${themeClass}`}
      >
        <option value="">Select {field.label}</option>

        {asArray(field.options).map((option, index) => (
          <option key={`${option}-${index}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type || "text"}
      value={value || ""}
      onChange={(event) => onChange(field.field_key, event.target.value)}
      placeholder={field.placeholder || ""}
      className={`${baseClass} ${themeClass}`}
    />
  );
}

export default function PublicBooking({
  page,
  bookingMappings = [],
  form,
  loading,
  success,
  colors,
  isLight,
  updateField,
  handleSubmit,
}) {
  if (!page.show_booking) {
    return null;
  }

  return (
    <section
      id="booking"
      className={`public-landing-section ${
        isLight ? "bg-white text-slate-950" : "bg-slate-950 text-white"
      }`}
    >
      <div className="public-landing-section-inner">
        <div
          className={`overflow-hidden rounded-[30px] border shadow-2xl ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-white/10 bg-white/[0.035]"
          }`}
        >
          <div
            className="p-5 sm:p-8 lg:p-10"
            style={{
              background: isLight
                ? "linear-gradient(135deg,#ffffff,#f8fafc)"
                : `linear-gradient(135deg, ${colors.secondary}, rgba(2,6,23,0.94))`,
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.24em] sm:text-xs"
                  style={{ color: colors.primary }}
                >
                  Appointment
                </p>

                <h2 className="mt-3 text-[30px] font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {page.booking_title || "Book an Appointment"}
                </h2>

                {page.booking_description && (
                  <p
                    className={`mt-4 text-sm leading-7 sm:text-base sm:leading-8 ${
                      isLight ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {page.booking_description}
                  </p>
                )}

                <form
                  onSubmit={handleSubmit}
                  className={`mt-6 rounded-[26px] border p-4 sm:p-6 ${
                    isLight
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-white/[0.05]"
                  }`}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {bookingMappings.map((field) => {
                      const isWide =
                        field.type === "textarea" ||
                        ["message", "service_interest"].includes(
                          field.field_key
                        );

                      return (
                        <div
                          key={field.id}
                          className={isWide ? "sm:col-span-2" : ""}
                        >
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide opacity-80">
                            {field.label}
                            {field.required ? " *" : ""}
                          </label>

                          <Field
                            field={field}
                            value={form[field.field_key]}
                            onChange={updateField}
                            isLight={isLight}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-full text-sm font-black text-black shadow-xl transition hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {loading ? "Submitting..." : "Submit Booking"}
                  </button>

                  {success && (
                    <div
                      className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
                        isLight
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5" />
                      Booking submitted successfully.
                    </div>
                  )}
                </form>
              </div>

              <aside
                className={`rounded-[26px] border p-5 ${
                  isLight
                    ? "border-slate-200 bg-slate-50"
                    : "border-white/10 bg-white/[0.045]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays
                    className="h-5 w-5"
                    style={{ color: colors.primary }}
                  />

                  <h3 className="font-black">What happens next?</h3>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    "Submit your preferred schedule",
                    "Receive confirmation",
                    "Meet through your selected platform",
                    "Get consultation or proposal",
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-black"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {index + 1}
                      </div>

                      <p
                        className={`text-sm leading-6 ${
                          isLight ? "text-slate-600" : "text-slate-300"
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-6 rounded-2xl border p-4 ${
                    isLight
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-white/10 bg-white/[0.05] text-slate-200"
                  }`}
                >
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                      <p className="text-sm font-black">Protected booking</p>
                      <p className="mt-1 text-xs leading-5 opacity-80">
                        Your information stays private and only goes to the
                        business owner.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
