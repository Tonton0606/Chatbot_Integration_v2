import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ToggleRight,
  ToggleLeft,
  Clock,
  X,
  Save,
  Loader2,
  ArrowDown,
  MessageSquare,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";

function getApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return raw ? (raw.endsWith("/api") ? raw : `${raw}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
}

function formatDelay(minutes) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
  return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? "s" : ""}`;
}

function StepCard({ step, index, total, onRemove, onUpdate }) {
  return (
    <div className="relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      {/* Connector line */}
      {index < total - 1 && (
        <div className="absolute left-7 -bottom-3 h-3 w-0.5 bg-[var(--border-color)]" />
      )}

      <div className="flex items-start gap-3">
        {/* Step number */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-sm font-black text-[var(--brand-gold)] border border-[var(--brand-gold-border)]">
          {index + 1}
        </div>

        <div className="flex-1 space-y-3">
          {/* Delay */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-bold text-[var(--text-muted)]">Send after</span>
            <input
              type="number"
              value={step.delayMinutes}
              onChange={(e) => onUpdate(index, "delayMinutes", e.target.value)}
              className="w-20 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
            />
            <span className="text-xs text-[var(--text-muted)]">minutes</span>
            <span className="ml-2 rounded-lg bg-[var(--hover-bg)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
              {formatDelay(parseInt(step.delayMinutes, 10) || 30)}
            </span>
          </div>

          {/* Message */}
          <textarea
            value={step.messageText}
            onChange={(e) => onUpdate(index, "messageText", e.target.value)}
            placeholder="Message to send to the customer..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)] resize-none"
          />

          {/* Quick replies */}
          <input
            value={step.quickReplies}
            onChange={(e) => onUpdate(index, "quickReplies", e.target.value)}
            placeholder="Quick replies (comma-separated, optional)"
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
        </div>

        {/* Remove */}
        {total > 1 && (
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 flex-shrink-0 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SequenceEditor({ form, setForm, onSave, onCancel, isEdit }) {
  const addStep = () => {
    setForm((p) => ({
      ...p,
      steps: [...p.steps, { delayMinutes: 30, messageText: "", quickReplies: "" }],
    }));
  };

  const removeStep = (idx) => {
    setForm((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  };

  const updateStep = (idx, field, value) => {
    setForm((p) => ({
      ...p,
      steps: p.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  return (
    <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-[var(--brand-gold)]" />
        <h3 className="font-black text-[var(--text-primary)]">
          {isEdit ? "Edit Flow Sequence" : "New Flow Sequence"}
        </h3>
      </div>

      {/* Name + Trigger */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Sequence Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Abandoned cart follow-up"
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Trigger
          </label>
          <select
            value={form.triggerType}
            onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value }))}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          >
            <option value="any">Any Trigger (default)</option>
            <option value="custom">Custom Trigger</option>
          </select>
        </div>
      </div>
      {form.triggerType === "custom" && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Trigger Name
          </label>
          <input
            value={form.triggerName}
            onChange={(e) => setForm((p) => ({ ...p, triggerName: e.target.value.substring(0, 100) }))}
            placeholder="e.g. Consultation Booked"
            maxLength={100}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
        </div>
      )}
      
      {/* Steps */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Sequence Steps
        </label>
        <div className="space-y-3">
          {form.steps.map((step, idx) => (
            <StepCard
              key={idx}
              step={step}
              index={idx}
              total={form.steps.length}
              onRemove={removeStep}
              onUpdate={updateStep}
            />
          ))}
        </div>
        <button
          onClick={addStep}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-color)] py-2.5 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Step
        </button>
      </div>

      {/* Active toggle + Actions */}
      <div className="flex items-center gap-3 border-t border-[var(--border-color)] pt-3">
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          Active
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.name.trim() || (form.triggerType === "custom" && !form.triggerName.trim())}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:brightness-110 transition-all"
          >
            <Save className="h-4 w-4" />
            {isEdit ? "Update Sequence" : "Save Sequence"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SequenceCard({ seq, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  let steps = [];
  try {
    steps = Array.isArray(seq.steps) ? seq.steps : JSON.parse(seq.steps || "[]");
  } catch {
    steps = [];
  }

  return (
    <div
      className={`rounded-2xl border bg-[var(--bg-card)] transition-all ${
        seq.is_active ? "border-[var(--border-color)]" : "border-[var(--border-color)] opacity-50"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            seq.is_active ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-black text-[var(--text-primary)]">{seq.name}</span>
            <span className="rounded-lg bg-[var(--brand-cyan-soft)] px-2 py-0.5 text-xs font-bold text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
              {steps.length} steps
            </span>
            {seq.trigger_stage ? (
              <span className="rounded-lg bg-[var(--brand-gold-soft)] px-2 py-0.5 text-xs font-bold text-[var(--brand-gold)] border border-[var(--brand-gold-border)]">
                {seq.trigger_stage}
              </span>
            ) : (
              <span className="rounded-lg bg-[var(--hover-bg)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
                Any Trigger
              </span>
            )}
          </div>

          {expanded && steps.length > 0 && (
            <div className="mt-3 space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-xs font-black text-[var(--brand-gold)] border border-[var(--brand-gold-border)]">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      After {formatDelay(step.delayMinutes || 30)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                      {step.messageText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--brand-gold)] transition-colors"
          >
            {expanded ? "Hide steps" : `View ${steps.length} steps`}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(seq)}
            className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            title={seq.is_active ? "Disable" : "Enable"}
          >
            {seq.is_active ? (
              <ToggleRight className="h-5 w-5 text-[var(--success)]" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-[var(--text-muted)]" />
            )}
          </button>
          <button
            onClick={() => onEdit(seq)}
            className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(seq.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FlowSequences({ workspaceId: propWorkspaceId, pageId: propPageId }) {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSeq, setEditSeq] = useState(null);
  const [form, setForm] = useState({
    name: "",
    triggerType: "any",
    triggerName: "",
    steps: [{ delayMinutes: 30, messageText: "", quickReplies: "" }],
    isActive: true,
  });

  const baseUrl = getApiBase();

  const fetchSequences = useCallback(async () => {
    if (!propWorkspaceId) {
      setLoading(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${propWorkspaceId}`, { headers });
      const json = await res.json();
      if (json.sequences) setSequences(json.sequences);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [propWorkspaceId, baseUrl]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const resetForm = () => {
    setForm({ name: "", triggerType: "any", triggerName: "", steps: [{ delayMinutes: 30, messageText: "", quickReplies: "" }], isActive: true });
    setEditSeq(null);
    setShowForm(false);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const stepsData = form.steps
      .filter((s) => s.messageText.trim())
      .map((s) => ({
        delayMinutes: parseInt(s.delayMinutes, 10) || 30,
        messageText: s.messageText.trim(),
        quickReplies: s.quickReplies
          ? s.quickReplies
              .split(",")
              .map((t) => ({ title: t.trim(), payload: t.trim().toLowerCase().replace(/\s+/g, "_") }))
              .filter((q) => q.title)
          : [],
      }));

    if (!stepsData.length) return;
    
    const finalTriggerStage = form.triggerType === "custom" ? form.triggerName.trim().substring(0, 100) : null;
    if (form.triggerType === "custom" && !finalTriggerStage) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token || ""}`,
        "Content-Type": "application/json",
      };

      if (editSeq) {
        await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${editSeq.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            name: form.name,
            triggerStage: finalTriggerStage,
            steps: stepsData,
            isActive: form.isActive,
          }),
        });
      } else {
        await fetch(`${baseUrl}/integrations/facebook/flow-sequences`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            workspaceId: propWorkspaceId,
            pageId: propPageId || null,
            name: form.name,
            triggerStage: finalTriggerStage,
            steps: stepsData,
            isActive: form.isActive,
          }),
        });
      }
      await fetchSequences();
    } catch {
      // error
    }
    resetForm();
  };

  const startEdit = (seq) => {
    let steps = [];
    try {
      steps = Array.isArray(seq.steps) ? seq.steps : JSON.parse(seq.steps || "[]");
    } catch {
      steps = [];
    }
    setForm({
      name: seq.name || "",
      triggerType: seq.trigger_stage ? "custom" : "any",
      triggerName: seq.trigger_stage || "",
      steps: steps.length
        ? steps.map((s) => ({
            delayMinutes: s.delayMinutes || 30,
            messageText: s.messageText || "",
            quickReplies: Array.isArray(s.quickReplies)
              ? s.quickReplies.map((q) => q.title || q).join(", ")
              : "",
          }))
        : [{ delayMinutes: 30, messageText: "", quickReplies: "" }],
      isActive: seq.is_active ?? true,
    });
    setEditSeq(seq);
    setShowForm(true);
  };

  const deleteSeq = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      setSequences((p) => p.filter((s) => s.id !== id));
    } catch {
      // error
    }
  };

  const toggleSeq = async (seq) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/flow-sequences/${seq.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !seq.is_active }),
      });
      setSequences((p) =>
        p.map((s) => (s.id === seq.id ? { ...s, is_active: !seq.is_active } : s))
      );
    } catch {
      // error
    }
  };

  const activeCount = sequences.filter((s) => s.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Flow Sequences
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Automated multi-step follow-up messages sent to customers who don't reply. Botcake-style drip campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sequences.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 px-3 py-2 text-xs font-bold text-[var(--success)]">
              <Clock className="h-3.5 w-3.5" />
              {activeCount} active
            </span>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Sequence
          </button>
        </div>
      </div>

      {/* Editor */}
      {showForm && (
        <SequenceEditor
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={resetForm}
          isEdit={!!editSeq}
        />
      )}

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center py-12 text-[var(--text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading flow sequences...</p>
          </div>
        ) : sequences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] py-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
            <h3 className="font-black text-[var(--text-primary)]">No flow sequences yet</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create automated follow-up sequences to re-engage customers who stop replying.
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Sequence
            </button>
          </div>
        ) : (
          sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              seq={seq}
              onEdit={startEdit}
              onDelete={deleteSeq}
              onToggle={toggleSeq}
            />
          ))
        )}
      </div>

      {/* Info footer */}
      {sequences.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            Sequences send follow-up messages automatically when a customer doesn't reply within the configured delay. Each step waits the specified minutes before sending the next message.
          </p>
        </div>
      )}
    </div>
  );
}
