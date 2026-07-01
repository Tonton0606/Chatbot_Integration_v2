import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Edit2, Check, Loader2 } from "lucide-react";

export default function TriggerManagerModal({ workspaceId, baseUrl, headers, onClose, onTriggersChange }) {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/sequence-triggers/${workspaceId}`, { headers });
      if (!res.ok) throw new Error("Failed to load triggers");
      const data = await res.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, baseUrl, headers]);

  useEffect(() => { load(); }, [load]);

  const addTrigger = async () => {
    const val = newTrigger.trim();
    if (!val) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/sequence-triggers`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: val })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add trigger");
      }
      setNewTrigger("");
      await load();
      if (onTriggersChange) onTriggersChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id) => {
    const val = editName.trim();
    if (!val) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/sequence-triggers/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: val })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update trigger");
      }
      setEditingId(null);
      await load();
      if (onTriggersChange) onTriggersChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const delTrigger = async (id) => {
    if (!confirm("Are you sure you want to delete this trigger? Sequences using it won't run until updated.")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/sequence-triggers/${id}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok) throw new Error("Failed to delete trigger");
      await load();
      if (onTriggersChange) onTriggersChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-main)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Manage Triggers</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-[var(--danger-soft)] p-3 text-xs font-bold text-[var(--danger)]">{error}</div>}

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTrigger}
            onChange={e => setNewTrigger(e.target.value.substring(0, 100))}
            placeholder="e.g. Consultation Booked"
            className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
            maxLength={100}
            onKeyDown={e => { if(e.key === 'Enter') addTrigger(); }}
          />
          <button onClick={addTrigger} disabled={saving || !newTrigger.trim()} className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-gold)] px-3 py-2 text-sm font-bold text-black disabled:opacity-50 hover:bg-[var(--brand-gold-hover)] transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" /></div>
          ) : triggers.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">No custom triggers yet.</p>
          ) : (
            triggers.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2">
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value.substring(0, 100))}
                    className="flex-1 rounded-lg border border-[var(--brand-gold-border)] bg-[var(--bg-main)] px-2 py-1 text-sm outline-none"
                    maxLength={100}
                    onKeyDown={e => { if(e.key === 'Enter') saveEdit(t.id); else if(e.key === 'Escape') setEditingId(null); }}
                  />
                ) : (
                  <span className="truncate px-2 text-sm font-bold text-[var(--text-primary)]">{t.name}</span>
                )}

                <div className="flex items-center gap-1">
                  {editingId === t.id ? (
                    <>
                      <button onClick={() => saveEdit(t.id)} disabled={saving || !editName.trim()} className="rounded-lg p-1.5 text-green-500 hover:bg-green-500/10 transition-colors">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => delTrigger(t.id)} className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
