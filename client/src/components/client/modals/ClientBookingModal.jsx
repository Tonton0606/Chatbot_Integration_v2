import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Trash2, User, Users, Video, X } from "lucide-react";

import {
  CLIENT_BOOKING_MODES,
  CLIENT_BOOKING_PARTY_TYPES,
  CLIENT_BOOKING_PLATFORMS,
} from "../../../services/clientBookings";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textAreaClass =
  "min-h-[96px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const emptyRecipient = {
  type: "contact",
  id: "",
  name: "",
  email: "",
};

function buildInitialForm({ booking, currentUser }) {
  return {
    title: booking?.title || "",

    creator_type: booking?.creator_type || "self",
    creator_name: booking?.creator_name || currentUser?.full_name || "",
    creator_email: booking?.creator_email || currentUser?.email || "",
    creator_contact_id: booking?.creator_contact_id || null,
    creator_employee_id: booking?.creator_employee_id || null,

    booking_mode: booking?.booking_mode || "one_on_one",

    recipient_type: booking?.recipient_type || "contact",
    recipient_user_id: booking?.recipient_user_id || null,
    recipient_contact_id: booking?.recipient_contact_id || null,
    recipient_name: booking?.recipient_name || "",
    recipient_email: booking?.recipient_email || "",

    recipients:
      Array.isArray(booking?.recipients) && booking.recipients.length > 0
        ? booking.recipients
        : [],

    preferred_date: booking?.preferred_date || "",
    preferred_time: booking?.preferred_time || "",

    platform: booking?.platform || "zoom",
    message: booking?.message || "",
    source: booking?.source || "manual",
  };
}

function getOptionLabel(option) {
  return option.company_name
    ? `${option.full_name} — ${option.company_name}`
    : option.full_name || option.email;
}

function findPersonById(list, id) {
  return list.find((item) => String(item.id) === String(id));
}

export default function ClientBookingModal({
  isOpen,
  booking,
  currentUser,
  contacts = [],
  employees = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() =>
    buildInitialForm({
      booking,
      currentUser,
    })
  );

  const [draftRecipient, setDraftRecipient] = useState(emptyRecipient);

  useEffect(() => {
    setForm(
      buildInitialForm({
        booking,
        currentUser,
      })
    );
  }, [booking, currentUser]);

  const contactOptions = useMemo(() => {
    return contacts.filter((contact) => Boolean(contact.email));
  }, [contacts]);

  const employeeOptions = useMemo(() => {
    return employees.filter((employee) => Boolean(employee.email));
  }, [employees]);

  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetRecipientFields(nextType) {
    setForm((prev) => ({
      ...prev,
      recipient_type: nextType,
      recipient_user_id: null,
      recipient_contact_id: null,
      recipient_name: "",
      recipient_email: "",
    }));
  }

  function handleCreatorTypeChange(nextType) {
    if (nextType === "self") {
      setForm((prev) => ({
        ...prev,
        creator_type: "self",
        creator_name: currentUser?.full_name || "",
        creator_email: currentUser?.email || "",
        creator_contact_id: null,
        creator_employee_id: null,
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      creator_type: nextType,
      creator_name: "",
      creator_email: "",
      creator_contact_id: null,
      creator_employee_id: null,
    }));
  }

  function handleCreatorContactChange(contactId) {
    const contact = findPersonById(contactOptions, contactId);

    setForm((prev) => ({
      ...prev,
      creator_contact_id: contact?.id || null,
      creator_employee_id: null,
      creator_name: contact?.full_name || "",
      creator_email: contact?.email || "",
    }));
  }

  function handleCreatorEmployeeChange(employeeId) {
    const employee = findPersonById(employeeOptions, employeeId);

    setForm((prev) => ({
      ...prev,
      creator_employee_id: employee?.id || null,
      creator_contact_id: null,
      creator_name: employee?.full_name || "",
      creator_email: employee?.email || "",
    }));
  }

  function handleSingleRecipientSelect(value) {
    if (form.recipient_type === "contact") {
      const contact = findPersonById(contactOptions, value);

      setForm((prev) => ({
        ...prev,
        recipient_contact_id: contact?.id || null,
        recipient_user_id: null,
        recipient_name: contact?.full_name || "",
        recipient_email: contact?.email || "",
      }));

      return;
    }

    if (form.recipient_type === "employee") {
      const employee = findPersonById(employeeOptions, value);

      setForm((prev) => ({
        ...prev,
        recipient_user_id: employee?.id || null,
        recipient_contact_id: null,
        recipient_name: employee?.full_name || "",
        recipient_email: employee?.email || "",
      }));
    }
  }

  function updateDraftRecipient(key, value) {
    setDraftRecipient((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "type") {
        return {
          ...emptyRecipient,
          type: value,
        };
      }

      return next;
    });
  }

  function handleDraftSelection(id) {
    if (draftRecipient.type === "contact") {
      const contact = findPersonById(contactOptions, id);

      setDraftRecipient({
        type: "contact",
        id: contact?.id || "",
        name: contact?.full_name || "",
        email: contact?.email || "",
      });

      return;
    }

    if (draftRecipient.type === "employee") {
      const employee = findPersonById(employeeOptions, id);

      setDraftRecipient({
        type: "employee",
        id: employee?.id || "",
        name: employee?.full_name || "",
        email: employee?.email || "",
      });
    }
  }

  function addRecipient() {
    if (!draftRecipient.email) {
      alert("Recipient email is required.");
      return;
    }

    const recipient = {
      id: draftRecipient.id || null,
      type: draftRecipient.type || "other",
      name: draftRecipient.name || draftRecipient.email,
      email: draftRecipient.email,
    };

    setForm((prev) => ({
      ...prev,
      recipients: [...(prev.recipients || []), recipient],
    }));

    setDraftRecipient(emptyRecipient);
  }

  function removeRecipient(index) {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    await onSubmit(form);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Workspace Booking
            </p>

            <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
              {booking ? "Edit Booking" : "Create Booking"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Schedule Zoom or Google Meet sessions for yourself, contacts, or
              employees.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-6">
          <div className="grid gap-6">
            <Section
              icon={Video}
              title="Meeting Details"
              description="Basic schedule and platform information."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Meeting Title">
                  <input
                    required
                    value={form.title}
                    onChange={(event) => update("title", event.target.value)}
                    className={inputClass}
                    placeholder="Product demo / consultation"
                  />
                </Field>

                <Field label="Platform">
                  <select
                    required
                    value={form.platform}
                    onChange={(event) => update("platform", event.target.value)}
                    className={inputClass}
                  >
                    {CLIENT_BOOKING_PLATFORMS.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={form.preferred_date}
                    onChange={(event) =>
                      update("preferred_date", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Time">
                  <input
                    required
                    type="time"
                    value={form.preferred_time}
                    onChange={(event) =>
                      update("preferred_time", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={User}
              title="Meeting Owner"
              description="Choose who owns or creates this meeting."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Owner Type">
                  <select
                    required
                    value={form.creator_type}
                    onChange={(event) =>
                      handleCreatorTypeChange(event.target.value)
                    }
                    className={inputClass}
                  >
                    {CLIENT_BOOKING_PARTY_TYPES.filter(
                      (type) => type.value !== "other"
                    ).map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {form.creator_type === "contact" && (
                  <Field label="Select Contact">
                    <select
                      required
                      value={form.creator_contact_id || ""}
                      onChange={(event) =>
                        handleCreatorContactChange(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Select contact</option>

                      {contactOptions.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {getOptionLabel(contact)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {form.creator_type === "employee" && (
                  <Field label="Select Employee">
                    <select
                      required
                      value={form.creator_employee_id || ""}
                      onChange={(event) =>
                        handleCreatorEmployeeChange(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Select employee</option>

                      {employeeOptions.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {getOptionLabel(employee)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Owner Name">
                  <input
                    required
                    value={form.creator_name}
                    onChange={(event) =>
                      update("creator_name", event.target.value)
                    }
                    className={inputClass}
                    readOnly={form.creator_type !== "self" ? false : true}
                  />
                </Field>

                <Field label="Owner Email">
                  <input
                    required
                    type="email"
                    value={form.creator_email}
                    onChange={(event) =>
                      update("creator_email", event.target.value)
                    }
                    className={inputClass}
                    readOnly={form.creator_type === "self"}
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={Users}
              title="Recipients"
              description="Choose one-on-one or multiple meeting recipients."
            >
              <div className="grid gap-4">
                <Field label="Booking Mode">
                  <select
                    required
                    value={form.booking_mode}
                    onChange={(event) =>
                      update("booking_mode", event.target.value)
                    }
                    className={inputClass}
                  >
                    {CLIENT_BOOKING_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {form.booking_mode === "one_on_one" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Recipient Type">
                      <select
                        required
                        value={form.recipient_type}
                        onChange={(event) =>
                          resetRecipientFields(event.target.value)
                        }
                        className={inputClass}
                      >
                        {CLIENT_BOOKING_PARTY_TYPES.filter(
                          (type) => type.value !== "self"
                        ).map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {form.recipient_type === "contact" && (
                      <Field label="Select Contact">
                        <select
                          required
                          value={form.recipient_contact_id || ""}
                          onChange={(event) =>
                            handleSingleRecipientSelect(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select contact</option>

                          {contactOptions.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {getOptionLabel(contact)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    {form.recipient_type === "employee" && (
                      <Field label="Select Employee">
                        <select
                          required
                          value={form.recipient_user_id || ""}
                          onChange={(event) =>
                            handleSingleRecipientSelect(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select employee</option>

                          {employeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {getOptionLabel(employee)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    <Field label="Recipient Name">
                      <input
                        required
                        value={form.recipient_name}
                        onChange={(event) =>
                          update("recipient_name", event.target.value)
                        }
                        className={inputClass}
                        placeholder="Recipient name"
                      />
                    </Field>

                    <Field label="Recipient Email">
                      <input
                        required
                        type="email"
                        value={form.recipient_email}
                        onChange={(event) =>
                          update("recipient_email", event.target.value)
                        }
                        className={inputClass}
                        placeholder="recipient@email.com"
                      />
                    </Field>
                  </div>
                )}

                {form.booking_mode === "multiple" && (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
                    <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <select
                        value={draftRecipient.type}
                        onChange={(event) =>
                          updateDraftRecipient("type", event.target.value)
                        }
                        className={inputClass}
                      >
                        {CLIENT_BOOKING_PARTY_TYPES.filter(
                          (type) => type.value !== "self"
                        ).map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {draftRecipient.type === "contact" && (
                        <select
                          value={draftRecipient.id}
                          onChange={(event) =>
                            handleDraftSelection(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select contact</option>

                          {contactOptions.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {getOptionLabel(contact)}
                            </option>
                          ))}
                        </select>
                      )}

                      {draftRecipient.type === "employee" && (
                        <select
                          value={draftRecipient.id}
                          onChange={(event) =>
                            handleDraftSelection(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select employee</option>

                          {employeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {getOptionLabel(employee)}
                            </option>
                          ))}
                        </select>
                      )}

                      {draftRecipient.type === "other" && (
                        <input
                          value={draftRecipient.name}
                          onChange={(event) =>
                            updateDraftRecipient("name", event.target.value)
                          }
                          className={inputClass}
                          placeholder="Recipient name"
                        />
                      )}

                      <input
                        value={draftRecipient.email}
                        onChange={(event) =>
                          updateDraftRecipient("email", event.target.value)
                        }
                        className={inputClass}
                        placeholder="recipient@email.com"
                        type="email"
                      />

                      <button
                        type="button"
                        onClick={addRecipient}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 text-sm font-bold text-black hover:opacity-90"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {form.recipients.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-center text-sm text-[var(--text-muted)]">
                          No recipients added yet.
                        </p>
                      ) : (
                        form.recipients.map((recipient, index) => (
                          <div
                            key={`${recipient.email}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                {recipient.name}
                              </p>

                              <p className="truncate text-xs text-[var(--text-muted)]">
                                {recipient.type} · {recipient.email}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeRecipient(index)}
                              className="rounded-lg p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section
              icon={Mail}
              title="Message"
              description="Optional context for the meeting."
            >
              <textarea
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                className={textAreaClass}
                placeholder="Add meeting agenda or notes..."
              />
            </Section>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : booking ? "Save Booking" : "Create Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="mb-4 flex items-start gap-3 border-b border-[var(--border-color)] pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--brand-gold)]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h4 className="font-bold text-[var(--text-primary)]">{title}</h4>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>

      {children}
    </label>
  );
}
