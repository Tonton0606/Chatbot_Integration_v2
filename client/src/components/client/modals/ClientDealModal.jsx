import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import {
  CLIENT_DEAL_STAGES,
  CLIENT_DEAL_STAGE_LABELS,
  CLIENT_DEAL_STAGE_PROBABILITIES,
  CLIENT_DEAL_SOURCES,
  CLIENT_ASSIGNMENT_TYPES,
} from "../../../services/clientDeals";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textAreaClass =
  "min-h-28 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClientDealModal({
  deal = null,
  lookups = {},
  saving = false,
  onClose,
  onSubmit,
}) {
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    contact_id: "",
    value: "",
    stage: "new",
    probability: 10,
    status: "open",
    source: "manual",
    expected_close_date: "",
    description: "",
    assignment_type: "self",
    assigned_user_id: "",
    assigned_contact_id: "",
    assigned_name: "",
  });

  useEffect(() => {
    if (!deal) return;

    setForm({
      title: deal.title || "",
      contact_id: deal.contact_id || "",
      value: deal.value || "",
      stage: deal.stage || "new",
      probability: deal.probability || 0,
      status: deal.status === "archived" ? "open" : deal.status || "open",
      source: deal.source || "manual",
      expected_close_date: deal.expected_close_date || "",
      description: deal.description || "",
      assignment_type: deal.assignment_type || "self",
      assigned_user_id: deal.assigned_user_id || "",
      assigned_contact_id: deal.assigned_contact_id || "",
      assigned_name: deal.assigned_name || "",
    });
  }, [deal]);

  const isEdit = Boolean(deal?.id);

  const selectedStage = useMemo(() => form.stage || "new", [form.stage]);

  function updateForm(key, value) {
    setError("");

    if (key === "stage") {
      setForm((prev) => ({
        ...prev,
        stage: value,
        probability: CLIENT_DEAL_STAGE_PROBABILITIES[value] ?? prev.probability,
        status: value === "won" ? "won" : value === "lost" ? "lost" : "open",
      }));
      return;
    }

    if (key === "status") {
      setForm((prev) => ({
        ...prev,
        status: value,
        stage: value === "won" ? "won" : value === "lost" ? "lost" : prev.stage,
        probability:
          value === "won"
            ? 100
            : value === "lost"
              ? 0
              : prev.probability,
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

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Deal title is required.");
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
      value: Number(form.value || 0),
      expected_revenue: Number(form.value || 0),
      probability: Number(form.probability || 0),
      contact_id: form.contact_id || null,
      expected_close_date: form.expected_close_date || null,
      status: form.status === "archived" ? "open" : form.status,
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
              {isEdit ? "Edit Deal" : "Create Deal"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage workspace deal and revenue information.
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
            <Field label="Deal Title">
              <input
                required
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className={inputClass}
                placeholder="ERP Implementation Deal"
              />
            </Field>

            <Field label="Contact">
              <select
                value={form.contact_id}
                onChange={(event) => updateForm("contact_id", event.target.value)}
                className={inputClass}
              >
                <option value="">No contact</option>
                {(lookups.contacts || []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                    {contact.company_name ? ` — ${contact.company_name}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Stage">
              <select
                value={selectedStage}
                onChange={(event) => updateForm("stage", event.target.value)}
                className={inputClass}
              >
                {CLIENT_DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {CLIENT_DEAL_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
                className={inputClass}
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </Field>

            <Field label="Expected Revenue">
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(event) => updateForm("value", event.target.value)}
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
                {CLIENT_DEAL_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {labelize(source)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Expected Close Date">
              <input
                type="date"
                value={form.expected_close_date}
                onChange={(event) =>
                  updateForm("expected_close_date", event.target.value)
                }
                className={inputClass}
              />
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
                  {(lookups.employees || []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name || employee.email}
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
                  {(lookups.contacts || []).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.full_name}
                      {contact.company_name ? ` — ${contact.company_name}` : ""}
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
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  className={textAreaClass}
                  placeholder="Deal notes..."
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
            {saving ? "Saving..." : "Save Deal"}
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
