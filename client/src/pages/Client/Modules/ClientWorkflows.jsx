/**
 * ClientWorkflows — Client-facing Workflow Automation
 * Wired to /api/workflows backend via authFetch
 * Uses CSS variable theming consistent with admin UI
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../config/supabaseClient";
import {
  Plus, Play, Trash2, Zap, CheckCircle, XCircle, Clock,
  Edit3, ArrowRight, AlertTriangle, Sparkles,
} from "lucide-react";

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id");
  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
    ...opts.headers,
  };
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const MODULE_TRIGGERS = [
  { label: "Lead created", value: "leads.created" },
  { label: "Lead no reply 24h", value: "leads.no_reply_24h" },
  { label: "Lead no reply 48h", value: "leads.no_reply_48h" },
  { label: "Facebook message received", value: "facebook.message_received" },
  { label: "Facebook lead captured", value: "facebook.lead_captured" },
  { label: "Inventory low stock", value: "inventory.low_stock" },
  { label: "Inventory out of stock", value: "inventory.out_of_stock" },
  { label: "Delivery created", value: "delivery.created" },
  { label: "Delivery delivered", value: "delivery.delivered" },
  { label: "Payment paid", value: "payments.paid" },
  { label: "COD confirmed", value: "payments.cod_confirmed" },
];

const ACTION_TYPES = [
  { label: "Send email", value: "send_email" },
  { label: "Send notification", value: "send_notification" },
  { label: "Webhook POST", value: "webhook" },
];

const CONDITION_OPS = [
  { label: "equals", value: "eq" },
  { label: "not equals", value: "neq" },
  { label: "greater than", value: "gt" },
  { label: "less than", value: "lt" },
  { label: "in list", value: "in" },
  { label: "contains", value: "contains" },
];

function StatusBadge({ status }) {
  const map = {
    active: { bg: "var(--brand-gold-soft)", color: "var(--brand-gold)", label: "Active" },
    inactive: { bg: "var(--hover-bg)", color: "var(--text-muted)", label: "Inactive" },
    completed: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Success" },
    failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
    pending: { bg: "rgba(8,145,178,0.12)", color: "var(--brand-cyan)", label: "Pending" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function WorkflowModal({ open, onClose, onSaved, editing }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("leads.created");
  const [actionType, setActionType] = useState("send_notification");
  const [actionConfig, setActionConfig] = useState({});
  const [conditions, setConditions] = useState({});
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name || "");
      setDescription(editing.description || "");
      setTrigger(`${editing.trigger_module}.${editing.trigger_event}`);
      setActionType(editing.action_type || "send_notification");
      setActionConfig(editing.action_config || {});
      setConditions(editing.trigger_conditions || {});
      setIsActive(editing.is_active !== false);
    } else {
      setName("");
      setDescription("");
      setTrigger("leads.created");
      setActionType("send_notification");
      setActionConfig({});
      setConditions({});
      setIsActive(true);
    }
    setErr("");
  }, [editing, open]);

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true);
    setErr("");
    try {
      const [mod, evt] = trigger.split(".");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        trigger_module: mod,
        trigger_event: evt,
        trigger_conditions: conditions,
        action_type: actionType,
        action_config: actionConfig,
        is_active: isActive,
      };
      if (editing) {
        await authFetch(`/api/workflows/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await authFetch("/api/workflows", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const updateActionConfig = (key, val) => setActionConfig(prev => ({ ...prev, [key]: val }));
  const updateCondition = (field, val) => setConditions(prev => ({ ...prev, [field]: val }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {editing ? "Edit Workflow" : "New Workflow"}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
            <AlertTriangle size={16} /> {err}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Workflow Name</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alert on new lead"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Description (optional)</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this workflow do?"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Trigger Event</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
          >
            {MODULE_TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Action</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
            value={actionType}
            onChange={e => setActionType(e.target.value)}
          >
            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {actionType === "send_email" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Recipient</label>
              <input className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
                value={actionConfig.to || ""} onChange={e => updateActionConfig("to", e.target.value)} placeholder="{{email}}" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Subject</label>
              <input className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
                value={actionConfig.subject || ""} onChange={e => updateActionConfig("subject", e.target.value)} placeholder="New lead assigned" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Body (HTML, supports {`{{var}}`})</label>
              <textarea className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
                value={actionConfig.body || ""} onChange={e => updateActionConfig("body", e.target.value)} rows={4} />
            </div>
          </>
        )}
        {actionType === "send_notification" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Title</label>
              <input className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
                value={actionConfig.title || ""} onChange={e => updateActionConfig("title", e.target.value)} placeholder="New lead!" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Message</label>
              <textarea className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
                value={actionConfig.message || ""} onChange={e => updateActionConfig("message", e.target.value)} rows={3} />
            </div>
          </>
        )}
        {actionType === "webhook" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Webhook URL</label>
            <input className="w-full px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
              value={actionConfig.url || ""} onChange={e => updateActionConfig("url", e.target.value)} placeholder="https://example.com/hook" />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Conditions (optional)</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
              value={Object.keys(conditions)[0] || ""} onChange={e => { const oldVal = conditions[Object.keys(conditions)[0]]; const newCond = {}; newCond[e.target.value] = oldVal || { op: "eq", value: "" }; setConditions(newCond); }} placeholder="field name" />
            <select className="px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
              value={conditions[Object.keys(conditions)[0]]?.op || "eq"} onChange={e => { const key = Object.keys(conditions)[0]; if (key) updateCondition(key, { ...conditions[key], op: e.target.value }); }}>
              {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-gold)]"
              value={conditions[Object.keys(conditions)[0]]?.value || ""} onChange={e => { const key = Object.keys(conditions)[0]; if (key) updateCondition(key, { ...conditions[key], value: e.target.value }); }} placeholder="value" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <div className="w-9 h-5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-full peer peer-checked:bg-[var(--brand-gold)] transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </label>
          <span className="text-sm text-[var(--text-secondary)]">Active</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 text-sm font-medium bg-[var(--brand-gold)] text-white rounded-lg hover:bg-[var(--brand-gold-hover)] transition-colors disabled:opacity-50" onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [templates, setTemplates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("workflows");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [triggering, setTriggering] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wf, ex, tpl] = await Promise.all([
        authFetch("/api/workflows"),
        authFetch("/api/workflows/executions"),
        authFetch("/api/workflows/templates"),
      ]);
      setWorkflows(Array.isArray(wf) ? wf : wf.data || []);
      setExecutions(Array.isArray(ex) ? ex : ex.data || []);
      setTemplates(tpl?.data || null);
    } catch {
      setWorkflows([]);
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(wf) {
    try {
      await authFetch(`/api/workflows/${wf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !wf.is_active }),
      });
      load();
    } catch {}
  }

  async function deleteWorkflow(id) {
    if (!confirm("Delete this workflow?")) return;
    try {
      await authFetch(`/api/workflows/${id}`, { method: "DELETE" });
      load();
    } catch {}
  }

  async function runWorkflow(wf) {
    setTriggering(wf.id);
    try {
      await authFetch("/api/workflows/trigger", {
        method: "POST",
        body: JSON.stringify({
          trigger_module: wf.trigger_module,
          trigger_event: wf.trigger_event,
          trigger_data: { id: wf.id, name: wf.name, workspace_id: wf.workspace_id },
        }),
      });
      load();
    } catch {
    } finally {
      setTriggering(null);
    }
  }

  const activeCount = workflows.filter(w => w.is_active).length;
  const successCount = executions.filter(e => e.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={24} className="text-[var(--brand-gold)]" />
            Workflow Automation
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Automate actions when business events happen
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--brand-gold)] text-white rounded-lg hover:bg-[var(--brand-gold-hover)] transition-colors"
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          <Plus size={16} /> New Workflow
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: workflows.length, icon: Zap, color: "var(--brand-gold)" },
          { label: "Active", value: activeCount, icon: CheckCircle, color: "#22c55e" },
          { label: "Executed", value: executions.length, icon: Play, color: "var(--brand-cyan)" },
          { label: "Success Rate", value: executions.length ? `${Math.round(successCount / executions.length * 100)}%` : "—", icon: Sparkles, color: "var(--brand-gold)" },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-3">
            <s.icon size={22} style={{ color: s.color }} />
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-0 border-b border-[var(--border-color)]">
        {["workflows", "history"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "workflows" ? "All Workflows" : "Run History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--text-muted)]">Loading…</div>
      ) : tab === "workflows" ? (
        workflows.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-16 text-center">
            <Zap size={40} className="mx-auto mb-3 text-[var(--brand-gold)] opacity-40" />
            <p className="text-[var(--text-muted)]">No workflows yet. Create one to automate your business.</p>
            <button
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--brand-gold)] text-white rounded-lg hover:bg-[var(--brand-gold-hover)] transition-colors mx-auto"
              onClick={() => { setEditing(null); setModalOpen(true); }}
            >
              <Plus size={16} /> Create Workflow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{wf.name}</span>
                    <StatusBadge status={wf.is_active ? "active" : "inactive"} />
                  </div>
                  {wf.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">{wf.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-muted)]">
                    <span className="px-2 py-0.5 rounded bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] font-medium">
                      {wf.trigger_module}.{wf.trigger_event}
                    </span>
                    <ArrowRight size={14} />
                    <span className="px-2 py-0.5 rounded bg-[var(--hover-bg)] text-[var(--text-primary)] font-medium">
                      {wf.action_type}
                    </span>
                    {wf.execution_count > 0 && (
                      <span className="text-xs text-[var(--text-muted)]">· {wf.execution_count} runs</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors disabled:opacity-50"
                    onClick={() => runWorkflow(wf)}
                    disabled={triggering === wf.id}
                  >
                    <Play size={14} /> {triggering === wf.id ? "…" : "Run"}
                  </button>
                  <button
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    onClick={() => { setEditing(wf); setModalOpen(true); }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={wf.is_active} onChange={() => toggleActive(wf)} />
                    <div className="w-9 h-5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-full peer peer-checked:bg-[var(--brand-gold)] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </label>
                  <button
                    onClick={() => deleteWorkflow(wf.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        executions.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-16 text-center">
            <Clock size={40} className="mx-auto mb-3 text-[var(--brand-cyan)] opacity-40" />
            <p className="text-[var(--text-muted)]">No workflow runs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map(ex => (
              <div key={ex.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center gap-4">
                {ex.status === "completed" ? (
                  <CheckCircle size={18} className="text-green-500" />
                ) : ex.status === "failed" ? (
                  <XCircle size={18} className="text-red-500" />
                ) : (
                  <Clock size={18} className="text-[var(--brand-cyan)]" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[var(--text-primary)]">{ex.trigger_event}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {new Date(ex.executed_at).toLocaleString("en-PH")}
                    {ex.error_message && <span className="text-red-500 ml-2">· {ex.error_message}</span>}
                  </div>
                </div>
                <StatusBadge status={ex.status} />
              </div>
            ))}
          </div>
        )
      )}

      {templates && tab === "workflows" && workflows.length === 0 && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Available Triggers & Actions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                <Sparkles size={14} className="text-[var(--brand-gold)]" /> Triggers
              </h4>
              <div className="space-y-1">
                {templates.triggers.map(t => (
                  <div key={t.module} className="text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-primary)]">{t.module}</span>: {t.events.join(", ")}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                <Zap size={14} className="text-[var(--brand-gold)]" /> Actions
              </h4>
              <div className="space-y-1">
                {templates.actions.map(a => (
                  <div key={a.type} className="text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-primary)]">{a.label}</span> ({a.type})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <WorkflowModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={load}
        editing={editing}
      />
    </div>
  );
}
