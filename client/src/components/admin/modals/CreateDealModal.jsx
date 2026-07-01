import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  createDeal,
  updateDeal,
  getDealMeta,
} from "../../../services/sales_crm/deals";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const textAreaClass =
  "min-h-28 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]";

const ownerRequiredStageKeys = ["qualified", "proposal", "negotiation", "won"];

export default function CreateDealModal({
  contact = null,
  deal = null,
  admins: passedAdmins = [],
  onClose,
  onSuccess,
}) {
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [sources, setSources] = useState([]);
  const [admins, setAdmins] = useState(passedAdmins || []);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    contact_id: "",
    value: "",
    probability: 0,
    stage_id: "",
    assigned_admin_id: "",
    status: "open",
    source: "manual",
    expected_close_date: "",
    description: "",
  });

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (passedAdmins?.length) {
      setAdmins(passedAdmins);
    }
  }, [passedAdmins]);

  useEffect(() => {
    if (deal) {
      setForm({
        title: deal.title || "",
        contact_id: deal.contact_id || "",
        value: deal.value || "",
        probability: deal.probability || 0,
        stage_id: deal.stage_id || "",
        assigned_admin_id: deal.assigned_admin_id || "",
        status: deal.status || "open",
        source: deal.source || "manual",
        expected_close_date: deal.expected_close_date || "",
        description: deal.description || "",
      });
      return;
    }

    if (contact) {
      setForm((prev) => ({
        ...prev,
        title: `New Opportunity - ${contact.company || contact.name}`,
        contact_id: contact.id,
        source: contact.source || "manual",
      }));
    }
  }, [contact, deal]);

  const selectedStage = useMemo(() => {
    return stages.find((stage) => stage.id === form.stage_id);
  }, [form.stage_id, stages]);

  const ownerRequired = useMemo(() => {
    return (
      ownerRequiredStageKeys.includes(selectedStage?.key) ||
      form.status === "won"
    );
  }, [selectedStage, form.status]);

  async function loadMeta() {
    try {
      const meta = await getDealMeta();

      setStages(meta.stages || []);
      setContacts(meta.contacts || []);
      setSources(meta.sources || []);
      setAdmins(meta.admins || passedAdmins || []);

      const firstStage = meta.stages?.[0];

      if (!deal && firstStage) {
        setForm((prev) => ({
          ...prev,
          stage_id: prev.stage_id || firstStage.id,
          probability: prev.probability || firstStage.probability || 0,
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to load deal form data.");
    }
  }

  function updateForm(key, value) {
    setError("");
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (ownerRequired && !form.assigned_admin_id) {
      setError(
        "Assign an owner before moving this deal to Qualified, Proposal, Negotiation, or Won."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        assigned_admin_id: form.assigned_admin_id || null,
        value: Number(form.value || 0),
        probability: Number(form.probability || 0),
      };

      if (deal?.id) {
        await updateDeal(deal.id, payload);
      } else {
        await createDeal(payload);
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to save deal.");
    } finally {
      setSaving(false);
    }
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
              {deal ? "Edit Deal" : "Create Deal"}
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage opportunity information before saving it to the pipeline.
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
            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className={inputClass}
                placeholder="ERP Implementation - Client Name"
              />
            </Field>

            <Field label="Contact">
              <select
                required
                value={form.contact_id}
                onChange={(event) => updateForm("contact_id", event.target.value)}
                className={inputClass}
              >
                <option value="">Select contact</option>
                {contacts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}{" "}
                    {item.company_name ? `- ${item.company_name}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assigned Admin">
              <select
                value={form.assigned_admin_id}
                onChange={(event) =>
                  updateForm("assigned_admin_id", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name || admin.email}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Required for Qualified, Proposal, Negotiation, and Won.
              </p>
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

            <Field label="Stage">
              <select
                value={form.stage_id}
                onChange={(event) => {
                  const stage = stages.find(
                    (item) => item.id === event.target.value
                  );

                  setForm((prev) => ({
                    ...prev,
                    stage_id: event.target.value,
                    probability: stage?.probability ?? prev.probability,
                    status: stage?.is_won
                      ? "won"
                      : stage?.is_lost
                        ? "lost"
                        : "open",
                  }));
                }}
                className={inputClass}
              >
                <option value="">No stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Probability">
              <input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(event) =>
                  updateForm("probability", Number(event.target.value))
                }
                className={inputClass}
              />
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

            <Field label="Source">
              <select
                value={form.source}
                onChange={(event) => updateForm("source", event.target.value)}
                className={inputClass}
              >
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Expected Close Date">
              <input
                type="date"
                value={form.expected_close_date || ""}
                onChange={(event) =>
                  updateForm("expected_close_date", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  className={textAreaClass}
                  placeholder="Add internal notes or deal context..."
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
