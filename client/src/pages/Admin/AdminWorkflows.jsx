/**
 * AdminWorkflows — Fully Dynamic Workflow Automation Builder
 * Wired to real /api/workflows backend (workflow_rules + workflow_executions tables)
 * Uses admin UI primitives with CSS variable theming
 */

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Zap, Play, CheckCircle, XCircle, Clock,
  Edit3, Save, X, AlertTriangle, Sparkles, ArrowRight,
} from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Input, Select, TextArea, Switch, Modal,
} from "../../components/admin/ui";
import { supabase } from "../../config/supabaseClient";

// ── API helper ──────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const workspaceId = localStorage.getItem("workspace_id") || sessionStorage.getItem("workspace_id") || "";
  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
    ...opts.headers,
  };
  const res = await fetch(path, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── Constants ───────────────────────────────────────────────

const MODULE_TRIGGERS = [
  { label: "Invoice created", value: "invoicing.created" },
  { label: "Invoice paid", value: "invoicing.paid" },
  { label: "Invoice overdue", value: "invoicing.overdue" },
  { label: "Booking created", value: "bookings.created" },
  { label: "Booking approved", value: "bookings.approved" },
  { label: "Deal created", value: "deals.created" },
  { label: "Deal stage changed", value: "deals.stage_changed" },
  { label: "Deal won", value: "deals.won" },
  { label: "Deal lost", value: "deals.lost" },
  { label: "Contact created", value: "contacts.created" },
  { label: "Task created", value: "tasks.created" },
  { label: "Task overdue", value: "tasks.overdue" },
  { label: "Payment received", value: "payments.received" },
  { label: "Payment paid", value: "payments.paid" },
  { label: "COD confirmed", value: "payments.cod_confirmed" },
  { label: "COD delivered", value: "payments.cod_delivered" },
  { label: "Lead created", value: "leads.created" },
  { label: "Lead converted", value: "leads.converted" },
  { label: "Lead no reply 24h", value: "leads.no_reply_24h" },
  { label: "Lead no reply 48h", value: "leads.no_reply_48h" },
  { label: "Inventory low stock", value: "inventory.low_stock" },
  { label: "Inventory out of stock", value: "inventory.out_of_stock" },
  { label: "Delivery created", value: "delivery.created" },
  { label: "Delivery delivered", value: "delivery.delivered" },
  { label: "Facebook message received", value: "facebook.message_received" },
  { label: "Facebook lead captured", value: "facebook.lead_captured" },
];

const ACTION_TYPES = [
  { label: "Send Email", value: "send_email" },
  { label: "Send Notification", value: "send_notification" },
  { label: "Create Task", value: "create_task" },
  { label: "Update Record", value: "update_record" },
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
    active: { variant: "gold", label: "Active" },
    inactive: { variant: "default", label: "Inactive" },
    completed: { variant: "gold", label: "Success" },
    failed: { variant: "danger", label: "Failed" },
    pending: { variant: "info", label: "Pending" },
    running: { variant: "info", label: "Running" },
  };
  const s = map[status] || map.pending;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ── Create/Edit Modal ───────────────────────────────────────

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
        await apiFetch(`/api/workflows/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/workflows", { method: "POST", body: JSON.stringify(payload) });
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

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Workflow" : "New Workflow"}>
      <div className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
            <AlertTriangle size={16} /> {err}
          </div>
        )}

        <Input
          label="Workflow Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Alert on new lead"
        />

        <TextArea
          label="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What does this workflow do?"
        />

        <Select label="Trigger Event" value={trigger} onChange={e => setTrigger(e.target.value)}>
          {MODULE_TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>

        <Select label="Action" value={actionType} onChange={e => setActionType(e.target.value)}>
          {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </Select>

        {/* Action-specific config fields */}
        {actionType === "send_email" && (
          <>
            <Input label="Recipient (use {{email}} for dynamic)" value={actionConfig.to || ""} onChange={e => updateActionConfig("to", e.target.value)} placeholder="{{email}}" />
            <Input label="Subject" value={actionConfig.subject || ""} onChange={e => updateActionConfig("subject", e.target.value)} placeholder="New lead assigned" />
            <TextArea label="Body (HTML, supports {{var}})" value={actionConfig.body || ""} onChange={e => updateActionConfig("body", e.target.value)} rows={4} />
          </>
        )}
        {actionType === "send_notification" && (
          <>
            <Input label="Title" value={actionConfig.title || ""} onChange={e => updateActionConfig("title", e.target.value)} placeholder="New lead!" />
            <TextArea label="Message (supports {{var}})" value={actionConfig.message || ""} onChange={e => updateActionConfig("message", e.target.value)} rows={3} />
          </>
        )}
        {actionType === "create_task" && (
          <>
            <Input label="Task Title" value={actionConfig.title || ""} onChange={e => updateActionConfig("title", e.target.value)} placeholder="Follow up with lead" />
            <TextArea label="Description" value={actionConfig.description || ""} onChange={e => updateActionConfig("description", e.target.value)} rows={2} />
            <Select label="Priority" value={actionConfig.priority || "medium"} onChange={e => updateActionConfig("priority", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </>
        )}
        {actionType === "update_record" && (
          <>
            <Input label="Table name" value={actionConfig.table || ""} onChange={e => updateActionConfig("table", e.target.value)} placeholder="deals" />
            <Input label="Record field" value={actionConfig.record_field || ""} onChange={e => updateActionConfig("record_field", e.target.value)} placeholder="id" />
            <Input label="Record value (use {{id}})" value={actionConfig.record_value || ""} onChange={e => updateActionConfig("record_value", e.target.value)} placeholder="{{id}}" />
            <TextArea label="Updates (JSON)" value={JSON.stringify(actionConfig.updates || {})} onChange={e => { try { updateActionConfig("updates", JSON.parse(e.target.value)); } catch {} }} rows={3} />
          </>
        )}
        {actionType === "webhook" && (
          <>
            <Input label="Webhook URL" value={actionConfig.url || ""} onChange={e => updateActionConfig("url", e.target.value)} placeholder="https://example.com/hook" />
            <Select label="Method" value={actionConfig.method || "POST"} onChange={e => updateActionConfig("method", e.target.value)}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </Select>
          </>
        )}

        {/* Condition builder */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">Conditions (optional)</label>
          <div className="flex gap-2">
            <Input value={Object.keys(conditions)[0] || ""} onChange={e => { const oldVal = conditions[Object.keys(conditions)[0]]; const newCond = {}; newCond[e.target.value] = oldVal || { op: "eq", value: "" }; setConditions(newCond); }} placeholder="field name" />
            <Select value={conditions[Object.keys(conditions)[0]]?.op || "eq"} onChange={e => { const key = Object.keys(conditions)[0]; if (key) updateCondition(key, { ...conditions[key], op: e.target.value }); }}>
              {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input value={conditions[Object.keys(conditions)[0]]?.value || ""} onChange={e => { const key = Object.keys(conditions)[0]; if (key) updateCondition(key, { ...conditions[key], value: e.target.value }); }} placeholder="value" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          <span className="text-sm text-[var(--text-secondary)]">Active</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function AdminWorkflows() {
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
      const [wfRes, exRes, tplRes] = await Promise.all([
        apiFetch("/api/workflows"),
        apiFetch("/api/workflows/executions"),
        apiFetch("/api/workflows/templates"),
      ]);
      setWorkflows(wfRes.data || []);
      setExecutions(exRes.data || []);
      setTemplates(tplRes.data || null);
    } catch {
      // silent — UI shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(wf) {
    try {
      await apiFetch(`/api/workflows/${wf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !wf.is_active }),
      });
      load();
    } catch {}
  }

  async function deleteWorkflow(id) {
    if (!confirm("Delete this workflow?")) return;
    try {
      await apiFetch(`/api/workflows/${id}`, { method: "DELETE" });
      load();
    } catch {}
  }

  async function runWorkflow(wf) {
    setTriggering(wf.id);
    try {
      await apiFetch("/api/workflows/trigger", {
        method: "POST",
        body: JSON.stringify({
          trigger_module: wf.trigger_module,
          trigger_event: wf.trigger_event,
          trigger_data: { id: wf.id, name: wf.name, workspace_id: wf.workspace_id },
        }),
      });
      load();
    } catch {
      // silent — user can retry
    } finally {
      setTriggering(null);
    }
  }

  const activeCount = workflows.filter(w => w.is_active).length;
  const successCount = executions.filter(e => e.status === "completed").length;
  const failedCount = executions.filter(e => e.status === "failed").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: workflows.length, icon: Zap, color: "var(--brand-gold)" },
          { label: "Active", value: activeCount, icon: CheckCircle, color: "#22c55e" },
          { label: "Executed", value: executions.length, icon: Play, color: "var(--brand-cyan)" },
          { label: "Success Rate", value: executions.length ? `${Math.round(successCount / executions.length * 100)}%` : "—", icon: TrendingUp, color: "var(--brand-gold)" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3">
              <s.icon size={22} style={{ color: s.color }} />
              <div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
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

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-muted)]">Loading…</div>
      ) : tab === "workflows" ? (
        workflows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Zap size={40} className="mx-auto mb-3 text-[var(--brand-gold)] opacity-40" />
              <p className="text-[var(--text-muted)]">No workflows yet. Create one to automate your business.</p>
              <Button variant="primary" className="mt-4" onClick={() => { setEditing(null); setModalOpen(true); }}>
                <Plus size={16} /> Create Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => (
              <Card key={wf.id}>
                <CardContent className="flex items-center gap-4">
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
                        <span className="text-xs text-[var(--text-muted)]">
                          · {wf.execution_count} runs
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runWorkflow(wf)}
                      disabled={triggering === wf.id}
                    >
                      <Play size={14} /> {triggering === wf.id ? "…" : "Run"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditing(wf); setModalOpen(true); }}
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Switch checked={wf.is_active} onChange={() => toggleActive(wf)} />
                    <button
                      onClick={() => deleteWorkflow(wf.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        executions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Clock size={40} className="mx-auto mb-3 text-[var(--brand-cyan)] opacity-40" />
              <p className="text-[var(--text-muted)]">No workflow runs yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {executions.map(ex => (
              <Card key={ex.id}>
                <CardContent className="flex items-center gap-4">
                  {ex.status === "completed" ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : ex.status === "failed" ? (
                    <XCircle size={18} className="text-red-500" />
                  ) : (
                    <Clock size={18} className="text-[var(--brand-cyan)]" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      {ex.trigger_event}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {new Date(ex.executed_at).toLocaleString("en-PH")}
                      {ex.error_message && (
                        <span className="text-red-500 ml-2">· {ex.error_message}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={ex.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Templates preview */}
      {templates && tab === "workflows" && workflows.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Available Triggers & Actions</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
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
