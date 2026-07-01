import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import {
  CLIENT_LEAD_STAGES,
  CLIENT_LEAD_STAGE_LABELS,
  CLIENT_LEAD_STAGE_PROBABILITIES,
  CLIENT_LEAD_SOURCES,
  CLIENT_ASSIGNMENT_TYPES,
  CLIENT_LEAD_CONTACT_MODES,
} from "../../../services/clientLeads";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textAreaClass =
  "min-h-28 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClientLeadModal({
  lead = null,
  lookups = {},
  saving = false,
  onClose,
  onSubmit,
}) {
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    contact_mode: "existing",
    contact_id: "",
    contact: {
      full_name: "",
      email: "",
      phone: "",
      company_name: "",
    },
    title: "",
    source: "manual",
    status: "new",
    estimated_value: "",
    probability: 10,
    assignment_type: "self",
    assigned_user_id: "",
    assigned_contact_id: "",
    assigned_name: "",
    notes: "",
  });

  useEffect(() => {
    if (!lead) return;

    setForm({
      contact_mode: "existing",
      contact_id: lead.contact_id || "",
      contact: {
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
      },
      title: lead.title || "",
      source: lead.source || "manual",
      status: lead.status || "new",
      estimated_value: lead.estimated_value || "",
      probability: lead.probability || 0,
      assignment_type: lead.assignment_type || "self",
      assigned_user_id: lead.assigned_user_id || "",
      assigned_contact_id: lead.assigned_contact_id || "",
      assigned_name: lead.assigned_name || "",
      notes: lead.notes || "",
    });
  }, [lead]);

  const isEdit = Boolean(lead?.id);

  const selectedStatus = useMemo(() => form.status || "new", [form.status]);

  function updateForm(key, value) {
    setError("");

    if (key === "status") {
      setForm((prev) => ({
        ...prev,
        status: value,
        probability: CLIENT_LEAD_STAGE_PROBABILITIES[value] ?? prev.probability,
      }));
      return;
    }

    if (key === "assignment_type") {
      setForm((prev) => ({
        ...prev,
        assignment_type: value,
        assigned_user_id: "",
        assigned_contact_id: "",
        assigned_name: "",
      }));
      return;
    }

    if (key === "contact_mode") {
      setForm((prev) => ({
        ...prev,
        contact_mode: value,
        contact_id: "",
        contact: {
          full_name: "",
          email: "",
          phone: "",
          company_name: "",
        },
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateManualContact(key, value) {
    setError("");

    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [key]: value,
      },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (form.contact_mode === "existing" && !form.contact_id) {
      setError("Select an existing contact.");
      return;
    }

    if (form.contact_mode === "manual" && !form.contact.full_name.trim()) {
      setError("Contact full name is required.");
      return;
    }

    if (!form.title.trim()) {
      setError("Lead title is required.");
      return;
    }

    if (form.assignment_type === "employee" && !form.assigned_user_id) {
      setError("Select an employee for this assignment.");
      return;
    }

    if (form.assignment_type === "contact" && !form.assigned_contact_id) {
      setError("Select a contact for this assignment.");
      return;
    }

    if (form.assignment_type === "other" && !form.assigned_name.trim()) {
      setError("Enter the assignee name.");
      return;
    }

    onSubmit?.({
      ...form,
      estimated_value: Number(form.estimated_value || 0),
      probability: Number(form.probability || 0),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--border-color)] bg-[var(--hover-bg)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Sales & CRM
            </p>

            <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit Lead" : "Create Lead"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage lead information before saving it to the pipeline.
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

        <div className="max-h-[calc(92vh-154px)] overflow-y-auto">
          {error && (
            <div className="mx-6 mt-6 rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

                <p className="text-sm font-medium text-[var(--danger)]">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Contact Source">
              <select
                value={form.contact_mode}
                disabled={isEdit}
                onChange={(event) => updateForm("contact_mode", event.target.value)}
                className={inputClass}
              >
                {CLIENT_LEAD_CONTACT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "existing"
                      ? "Existing Contact"
                      : "Other / Manual Contact"}
                  </option>
                ))}
              </select>
            </Field>

            {form.contact_mode === "existing" && (
              <Field label="Contact">
                <select
                  required
                  value={form.contact_id}
                  onChange={(event) => updateForm("contact_id", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select contact</option>
                  {(lookups.contacts || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name}
                      {item.company_name ? ` - ${item.company_name}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.contact_mode === "manual" && (
              <>
                <Field label="Contact Full Name">
                  <input
                    value={form.contact.full_name}
                    onChange={(event) =>
                      updateManualContact("full_name", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Juan Dela Cruz"
                  />
                </Field>

                <Field label="Contact Email">
                  <input
                    type="email"
                    value={form.contact.email}
                    onChange={(event) =>
                      updateManualContact("email", event.target.value)
                    }
                    className={inputClass}
                    placeholder="client@email.com"
                  />
                </Field>

                <Field label="Contact Phone">
                  <input
                    value={form.contact.phone}
                    onChange={(event) =>
                      updateManualContact("phone", event.target.value)
                    }
                    className={inputClass}
                    placeholder="+63..."
                  />
                </Field>

                <Field label="Company">
                  <input
                    value={form.contact.company_name}
                    onChange={(event) =>
                      updateManualContact("company_name", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Company name"
                  />
                </Field>
              </>
            )}

            <Field label="Lead Title">
              <input
                required
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className={inputClass}
                placeholder="Website Inquiry - Client Name"
              />
            </Field>

            <Field label="Stage">
              <select
                value={selectedStatus}
                onChange={(event) => updateForm("status", event.target.value)}
                className={inputClass}
              >
                {CLIENT_LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {CLIENT_LEAD_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Estimated Value">
              <input
                type="number"
                min="0"
                value={form.estimated_value}
                onChange={(event) =>
                  updateForm("estimated_value", event.target.value)
                }
                className={inputClass}
                placeholder="50000"
              />
            </Field>

            <Field label="Probability">
              <input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(event) =>
                  updateForm("probability", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Source">
              <select
                value={form.source}
                onChange={(event) => updateForm("source", event.target.value)}
                className={inputClass}
              >
                {CLIENT_LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {labelize(source)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignment Type">
              <select
                value={form.assignment_type}
                onChange={(event) =>
                  updateForm("assignment_type", event.target.value)
                }
                className={inputClass}
              >
                {CLIENT_ASSIGNMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </Field>

            {form.assignment_type === "employee" && (
              <Field label="Assigned Employee">
                <select
                  value={form.assigned_user_id}
                  onChange={(event) =>
                    updateForm("assigned_user_id", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select employee</option>
                  {(lookups.employees || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name || item.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.assignment_type === "contact" && (
              <Field label="Assigned Contact">
                <select
                  value={form.assigned_contact_id}
                  onChange={(event) =>
                    updateForm("assigned_contact_id", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select contact</option>
                  {(lookups.contacts || []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name}
                      {item.company_name ? ` - ${item.company_name}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.assignment_type === "other" && (
              <Field label="Assigned Name">
                <input
                  value={form.assigned_name}
                  onChange={(event) =>
                    updateForm("assigned_name", event.target.value)
                  }
                  className={inputClass}
                  placeholder="External assignee"
                />
              </Field>
            )}

            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  className={textAreaClass}
                  placeholder="Lead notes..."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-gold-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>

      {children}
    </label>
  );
}
