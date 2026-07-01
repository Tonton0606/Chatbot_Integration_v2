import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  ToggleRight,
  ToggleLeft,
  Zap,
  X,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Sparkles,
  Clock,
  Tag,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Send,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";

const MATCH_TYPES = [
  { value: "contains", label: "Contains", desc: "Keyword found anywhere in message", icon: Search },
  { value: "exact", label: "Message Is", desc: "Exact match only", icon: Tag },
  { value: "starts_with", label: "Starts With", desc: "Message begins with keyword", icon: ChevronRight },
];

const TEMPLATE_RULES = [
  { trigger: "price", matchType: "contains", response: "Our pricing starts at ₱X. Would you like to see our full price list?", quickReplies: ["View Pricelist", "Book Demo", "Talk to Agent"] },
  { trigger: "hours", matchType: "contains", response: "We're open Monday to Friday, 9 AM to 6 PM. Visit us or message us anytime!", quickReplies: ["Get Directions", "Book Appointment"] },
  { trigger: "location", matchType: "contains", response: "We're located at [your address here]. You can also check our website for a map.", quickReplies: ["Open Map", "Visit Website"] },
  { trigger: "shipping", matchType: "contains", response: "We offer nationwide shipping! Delivery takes 2-3 business days for Metro Manila, 3-5 for provinces.", quickReplies: ["Track Order", "Shipping Rates"] },
];

function getApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return raw ? (raw.endsWith("/api") ? raw : `${raw}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-cyan-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-red-400 transition-colors">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function MatchTypeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = MATCH_TYPES.find((m) => m.value === value) || MATCH_TYPES[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--brand-gold-border)] transition-colors"
      >
        <CurrentIcon className="h-4 w-4 text-[var(--brand-gold)]" />
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-xl">
            {MATCH_TYPES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    onChange(m.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                    value === m.value ? "bg-[var(--brand-gold-soft)]" : "hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-gold)]" />
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{m.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function QuickReplyChips({ value, onChange }) {
  const [input, setInput] = useState("");
  const chips = Array.isArray(value) ? value : [];

  const addChip = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (chips.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...chips, trimmed]);
    setInput("");
  };

  const removeChip = (idx) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, idx) => (
          <Chip key={idx} label={chip} onRemove={() => removeChip(idx)} />
        ))}
        {chips.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">No quick replies added yet</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder="Type a quick reply button label and press Enter..."
          className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
        />
        <button
          type="button"
          onClick={addChip}
          disabled={!input.trim()}
          className="rounded-xl bg-[var(--brand-cyan-soft)] px-3 py-2 text-sm font-bold text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] disabled:opacity-40 hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KeywordChips({ value, onChange }) {
  const [input, setInput] = useState("");
  const chips = Array.isArray(value) ? value : [];

  const addChip = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;
    if (chips.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...chips, trimmed]);
    setInput("");
  };

  const removeChip = (idx) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, idx) => (
          <Chip key={idx} label={chip} onRemove={() => removeChip(idx)} />
        ))}
        {chips.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">Add keywords that trigger this rule (e.g. "price", "pricing", "how much")</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder="Type a keyword and press Enter or comma..."
          className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
        />
        <button
          type="button"
          onClick={addChip}
          disabled={!input.trim()}
          className="rounded-xl bg-[var(--brand-gold-soft)] px-3 py-2 text-sm font-bold text-[var(--brand-gold)] border border-[var(--brand-gold-border)] disabled:opacity-40 hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RuleCard({ rule, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const keywords = Array.isArray(rule.trigger_keywords)
    ? rule.trigger_keywords
    : [rule.trigger_keyword || rule.trigger || ""].filter(Boolean);

  const quickReplies = Array.isArray(rule.quick_replies)
    ? rule.quick_replies
    : (() => {
        try { return JSON.parse(rule.quick_replies || "[]"); } catch { return []; }
      })();

  const matchType = MATCH_TYPES.find((m) => m.value === (rule.trigger_match_type || "contains")) || MATCH_TYPES[0];

  return (
    <div
      className={`rounded-2xl border bg-[var(--bg-card)] transition-all ${
        rule.is_active
          ? "border-[var(--border-color)]"
          : "border-[var(--border-color)] opacity-50"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Status dot */}
        <div
          className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            rule.is_active ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
          }`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {keywords.map((kw, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-[var(--brand-cyan-soft)] px-2.5 py-1 text-xs font-mono font-bold text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]"
              >
                "{kw}"
              </span>
            ))}
            <span className="rounded-lg bg-[var(--hover-bg)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
              {matchType.label}
            </span>
            {rule.priority > 0 && (
              <span className="rounded-lg bg-[var(--brand-gold-soft)] px-2 py-0.5 text-xs font-bold text-[var(--brand-gold)] border border-[var(--brand-gold-border)]">
                P{rule.priority}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Zap className="h-3 w-3" />
              {rule.match_count || 0} matches
            </span>
          </div>

          <p
            className={`text-sm text-[var(--text-secondary)] ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {rule.response_text}
          </p>

          {expanded && quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickReplies.map((qr, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  <MessageSquare className="h-3 w-3 text-[var(--text-muted)]" />
                  {typeof qr === "string" ? qr : qr.title || qr}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--brand-gold)] transition-colors"
          >
            {expanded ? "Show less" : "Show more"}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(rule)}
            className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            title={rule.is_active ? "Disable" : "Enable"}
          >
            {rule.is_active ? (
              <ToggleRight className="h-5 w-5 text-[var(--success)]" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-[var(--text-muted)]" />
            )}
          </button>
          <div className="flex gap-0.5">
            <button
              onClick={() => onMoveUp(rule)}
              disabled={index === 0}
              className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] disabled:opacity-30 transition-colors"
              title="Move up (higher priority)"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMoveDown(rule)}
              disabled={index === total - 1}
              className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] disabled:opacity-30 transition-colors"
              title="Move down (lower priority)"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
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

function RuleEditor({ form, setForm, onSave, onCancel, isEdit }) {
  const triggerKeywords = Array.isArray(form.triggerKeywords) ? form.triggerKeywords : [];
  const quickReplies = Array.isArray(form.quickReplies) ? form.quickReplies : [];

  return (
    <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[var(--brand-gold)]" />
        <h3 className="font-black text-[var(--text-primary)]">
          {isEdit ? "Edit Auto-Reply Rule" : "New Auto-Reply Rule"}
        </h3>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Trigger Keywords
        </label>
        <KeywordChips
          value={triggerKeywords}
          onChange={(chips) => setForm((p) => ({ ...p, triggerKeywords: chips }))}
        />
      </div>

      {/* Match Type + Priority */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Match Type
          </label>
          <MatchTypeSelector
            value={form.matchType}
            onChange={(val) => setForm((p) => ({ ...p, matchType: val }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Priority
          </label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value, 10) || 0 }))}
            className="w-20 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          Active
        </label>
      </div>

      {/* Response */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Auto-Reply Message
        </label>
        <textarea
          value={form.response}
          onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
          placeholder="Enter the message to send when a keyword is matched..."
          rows={4}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)] resize-none"
        />
        <p className="text-xs text-[var(--text-muted)]">
          {form.response.length} characters · Facebook Messenger limit: 1000
        </p>
      </div>

      {/* Quick Replies */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Quick Reply Buttons (Optional)
        </label>
        <QuickReplyChips
          value={quickReplies}
          onChange={(chips) => setForm((p) => ({ ...p, quickReplies: chips }))}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
        <button
          onClick={onCancel}
          className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!form.response.trim() || triggerKeywords.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:brightness-110 transition-all"
        >
          <Save className="h-4 w-4" />
          {isEdit ? "Update Rule" : "Save Rule"}
        </button>
      </div>
    </div>
  );
}

export default function AutoReplyRules({ workspaceId: propWorkspaceId, pageId: propPageId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState({
    triggerKeywords: [],
    matchType: "contains",
    response: "",
    quickReplies: [],
    active: true,
    priority: 0,
  });

  const baseUrl = getApiBase();

  const fetchRules = useCallback(async () => {
    if (!propWorkspaceId) {
      setLoading(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const pageQuery = propPageId ? `/${propPageId}` : "";
      const res = await fetch(
        `${baseUrl}/integrations/facebook/auto-reply-rules/${propWorkspaceId}${pageQuery}`,
        { headers }
      );
      const json = await res.json();
      if (json.rules) setRules(json.rules);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [propWorkspaceId, propPageId, baseUrl]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const resetForm = () => {
    setForm({ triggerKeywords: [], matchType: "contains", response: "", quickReplies: [], active: true, priority: 0 });
    setEditRule(null);
    setShowForm(false);
  };

  const save = async () => {
    const triggerKeyword = form.triggerKeywords.join(", ");
    if (!triggerKeyword.trim() || !form.response.trim()) return;

    const quickRepliesArr = form.quickReplies.map((title) => ({
      title,
      payload: title.toLowerCase().replace(/\s+/g, "_"),
    }));

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token || ""}`,
        "Content-Type": "application/json",
      };

      if (editRule) {
        await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${editRule.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            triggerKeyword,
            triggerMatchType: form.matchType,
            responseText: form.response,
            quickReplies: quickRepliesArr,
            isActive: form.active,
            priority: form.priority,
          }),
        });
      } else {
        await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            workspaceId: propWorkspaceId,
            pageId: propPageId || null,
            triggerKeyword,
            triggerMatchType: form.matchType,
            responseText: form.response,
            quickReplies: quickRepliesArr,
            isActive: form.active,
            priority: form.priority,
          }),
        });
      }
      await fetchRules();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
    resetForm();
  };

  const startEdit = (rule) => {
    const keywords = Array.isArray(rule.trigger_keywords)
      ? rule.trigger_keywords
      : (rule.trigger_keyword || rule.trigger || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

    const qr = Array.isArray(rule.quick_replies)
      ? rule.quick_replies.map((r) => (typeof r === "string" ? r : r.title || r))
      : (() => {
          try {
            const parsed = JSON.parse(rule.quick_replies || "[]");
            return parsed.map((r) => (typeof r === "string" ? r : r.title || r));
          } catch {
            return [];
          }
        })();

    setForm({
      triggerKeywords: keywords,
      matchType: rule.trigger_match_type || "contains",
      response: rule.response_text || rule.response || "",
      quickReplies: qr,
      active: rule.is_active ?? rule.active ?? true,
      priority: rule.priority || 0,
    });
    setEditRule(rule);
    setShowForm(true);
  };

  const deleteRule = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      setRules((p) => p.filter((r) => r.id !== id));
    } catch {
      // error
    }
  };

  const toggleRule = async (rule) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${rule.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !rule.is_active }),
      });
      setRules((p) =>
        p.map((r) => (r.id === rule.id ? { ...r, is_active: !rule.is_active } : r))
      );
    } catch {
      // error
    }
  };

  const moveRule = async (rule, direction) => {
    const newPriority = (rule.priority || 0) + direction;
    if (newPriority < 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${baseUrl}/integrations/facebook/auto-reply-rules/${rule.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      setRules((p) =>
        p.map((r) => (r.id === rule.id ? { ...r, priority: newPriority } : r))
      );
    } catch {
      // error
    }
  };

  const applyTemplate = (template) => {
    setForm({
      triggerKeywords: [template.trigger],
      matchType: template.matchType,
      response: template.response,
      quickReplies: template.quickReplies,
      active: true,
      priority: 0,
    });
    setEditRule(null);
    setShowForm(true);
    setShowTemplates(false);
  };

  const filteredRules = rules.filter((rule) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const keyword = (rule.trigger_keyword || "").toLowerCase();
    const response = (rule.response_text || "").toLowerCase();
    return keyword.includes(q) || response.includes(q);
  });

  const sortedRules = [...filteredRules].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  const activeCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Auto-Reply Rules
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Keyword-triggered instant replies. Higher priority rules are checked first. If no rule matches, the AI chatbot responds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 px-3 py-2 text-xs font-bold text-[var(--success)]">
            <Zap className="h-3.5 w-3.5" />
            {activeCount} active
          </span>
          <button
            onClick={() => setShowTemplates((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <Sparkles className="h-4 w-4 text-[var(--brand-gold)]" />
            Templates
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Template suggestions */}
      {showTemplates && (
        <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--brand-gold)]">
            <Sparkles className="h-4 w-4" />
            Quick Start Templates
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATE_RULES.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => applyTemplate(tpl)}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-left hover:border-[var(--brand-gold-border)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-lg bg-[var(--brand-cyan-soft)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
                    "{tpl.trigger}"
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{tpl.matchType}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{tpl.response}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tpl.quickReplies.map((qr, i) => (
                    <span key={i} className="rounded-md bg-[var(--hover-bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      {qr}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor form */}
      {showForm && (
        <RuleEditor
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={resetForm}
          isEdit={!!editRule}
        />
      )}

      {/* Search bar */}
      {rules.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules by keyword or response..."
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)]"
          />
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center py-12 text-[var(--text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading auto-reply rules...</p>
          </div>
        ) : sortedRules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] py-12 text-center">
            <Zap className="mx-auto h-12 w-12 text-[var(--text-muted)] opacity-30 mb-4" />
            <h3 className="font-black text-[var(--text-primary)]">No auto-reply rules yet</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create keyword-triggered rules for instant replies, or start with a template.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand-gold-border)] px-3 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-[var(--brand-gold-soft)] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Browse Templates
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-3 py-2 text-sm font-black text-black hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Rule
              </button>
            </div>
          </div>
        ) : (
          sortedRules.map((rule, idx) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              index={idx}
              total={sortedRules.length}
              onEdit={startEdit}
              onDelete={deleteRule}
              onToggle={toggleRule}
              onMoveUp={(r) => moveRule(r, 1)}
              onMoveDown={(r) => moveRule(r, -1)}
            />
          ))
        )}
      </div>

      {/* Info footer */}
      {rules.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
          <p className="flex items-center gap-2">
            <Send className="h-3.5 w-3.5 flex-shrink-0" />
            Rules are checked in priority order (highest first). The first match wins. If no rule matches, the AI chatbot generates a response. If the AI also can't respond, the Default Reply is sent.
          </p>
        </div>
      )}
    </div>
  );
}
