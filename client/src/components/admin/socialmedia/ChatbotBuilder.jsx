import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare, Zap, Clock, Bot, Sparkles, Save, Loader2, ArrowRight,
  Hand, Send, Settings, ChevronRight, Plus, X, AlertCircle, Phone,
  Globe, Calendar, User, BarChart3, Megaphone,
  TrendingUp, Flame, Snowflake, CheckCircle2,
  Trash2, Edit3, Facebook, Instagram, MessageCircle,
  Plug,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";
import facebookIntegrationService from "../../../services/marketing/facebook_connect";
import { getCurrentWorkspaceId } from "../../../services/workspaceResolver";
import { getWorkspaceAccessData } from "../../../services/operations/workspace_access";
import ErrorBoundary from "../../ui/ErrorBoundary.jsx";
import TriggerManagerModal from "./TriggerManagerModal";

export function getApiBase() {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return raw ? (raw.endsWith("/api") ? raw : `${raw}/api`) : import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
}

const AI_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Fast & Smart)" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Ultra Fast)" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B (Balanced)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (OpenRouter)" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
  { value: "tl", label: "Taglish" },
  { value: "ceb", label: "Cebuano" },
];

const WEEKDAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 7, label: "Sun" },
];

const FLOW_STEPS = [
  { label: "New User", icon: Hand, color: "var(--brand-cyan)" },
  { label: "Business Hours?", icon: Calendar, color: "var(--brand-gold)" },
  { label: "Welcome Message", icon: MessageSquare, color: "var(--success)" },
  { label: "Keyword Match?", icon: Zap, color: "#8b5cf6" },
  { label: "AI Response", icon: Bot, color: "#6366f1" },
  { label: "Human Handoff", icon: User, color: "var(--danger)" },
  { label: "Default Reply", icon: Send, color: "var(--text-muted)" },
  { label: "Follow-up Sequence", icon: Clock, color: "#14b8a6" },
];

const PLATFORMS = [
  { key: "facebook", label: "Facebook Messenger", icon: Facebook, color: "#1877F2", desc: "Connect Facebook Pages and automate Messenger replies" },
  { key: "instagram", label: "Instagram DM", icon: Instagram, color: "#E4405F", desc: "Auto-reply to Instagram direct messages" },
  { key: "whatsapp", label: "WhatsApp Business", icon: MessageCircle, color: "#25D366", desc: "WhatsApp Business API integration" },
  { key: "website", label: "Website Chat", icon: Globe, color: "var(--brand-cyan)", desc: "Embed live chat widget on your website" },
];

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!enabled)} disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        enabled ? "bg-[var(--brand-gold)]" : "bg-[var(--border-color)]"
      }`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

function Card({ icon: Icon, title, subtitle, iconColor, iconBg, children, footer }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-black text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      {children}
      {footer}
    </div>
  );
}

function SaveButton({ onSave, saving, label = "Save" }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
      <button onClick={onSave} disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{label}
      </button>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled, ...rest }) {
  return (
    <input type={type} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)] disabled:opacity-50 transition-all"
      {...rest} />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, disabled, ...rest }) {
  return (
    <textarea value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} rows={rows}
      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)] disabled:opacity-50 resize-none transition-all"
      {...rest} />
  );
}

function Select({ value, onChange, disabled, children, ...rest }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold-border)] focus:ring-2 focus:ring-[var(--brand-gold-soft)] disabled:opacity-50 transition-all"
      {...rest}>
      {children}
    </select>
  );
}

function PhonePreview({ settings }) {
  const welcomeOn = settings?.welcome_enabled ?? false;
  const welcomeMsg = settings?.welcome_message || "Hi! Welcome to our page. How can we help you today?";
  const starters = useMemo(() => {
    try { return Array.isArray(settings?.conversation_starters) ? settings.conversation_starters : JSON.parse(settings?.conversation_starters || "[]"); }
    catch { return []; }
  }, [settings]);
  const aiOn = settings?.ai_enabled ?? true;
  const awayMsg = settings?.away_message || "We're currently away. We'll get back to you during business hours!";
  const businessHoursOn = settings?.business_hours_enabled ?? false;
  const delay = settings?.response_delay_seconds ?? 0;
  const handoffOn = settings?.handoff_enabled ?? false;
  const handoffKw = settings?.handoff_keywords || [];

  return (
    <div className="sticky top-4">
      <div className="mx-auto w-[280px]">
        <div className="rounded-[2.5rem] border-[6px] border-[var(--border-color)] bg-[var(--bg-main)] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between bg-[var(--bg-card)] px-5 py-2 text-[10px] font-bold text-[var(--text-secondary)]">
            <span>9:41</span><span>5G 100%</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-card)] px-3 py-2.5 border-b border-[var(--border-color)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] border border-[var(--brand-gold-border)]">
              <Bot className="h-4 w-4 text-[var(--brand-gold)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-[var(--text-primary)] truncate">Your Page</p>
              <p className="text-[9px] text-[var(--success)] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                {businessHoursOn ? "Active now" : "Always online"}
              </p>
            </div>
            <Phone className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex flex-col gap-2 p-3 min-h-[320px] max-h-[400px] overflow-y-auto bg-[var(--bg-main)]">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--brand-gold)] px-3 py-2 text-xs font-medium text-black">Hi!</div>
            </div>
            {welcomeOn ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-primary)]">{welcomeMsg}</div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-muted)] italic">No welcome message set</div>
              </div>
            )}
            {starters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-2">
                {starters.slice(0, 4).map((s, i) => (
                  <span key={i} className="rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-cyan)]">{s}</span>
                ))}
              </div>
            )}
            {businessHoursOn && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--hover-bg)] border border-dashed border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  <Clock className="inline h-3 w-3 mr-1" />{awayMsg}
                </div>
              </div>
            )}
            {aiOn && (
              <div className="flex justify-start items-center gap-1.5 pl-2">
                <div className="flex items-center gap-1 rounded-full bg-[var(--hover-bg)] px-2 py-1">
                  <Sparkles className="h-2.5 w-2.5 text-[var(--brand-gold)]" />
                  <span className="text-[9px] font-bold text-[var(--text-muted)]">AI replies on</span>
                </div>
              </div>
            )}
            {handoffOn && (
              <div className="flex justify-start items-center gap-1.5 pl-2">
                <div className="flex items-center gap-1 rounded-full bg-[var(--hover-bg)] px-2 py-1">
                  <User className="h-2.5 w-2.5 text-[var(--brand-cyan)]" />
                  <span className="text-[9px] font-bold text-[var(--text-muted)]">Handoff on "{handoffKw[0] || "agent"}"</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2">
            <div className="flex-1 rounded-full bg-[var(--bg-main)] px-3 py-1.5 text-[10px] text-[var(--text-muted)]">Message...</div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-gold)]">
              <Send className="h-3 w-3 text-black" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <Clock className="h-3 w-3" />{delay}s typing delay before reply
        </div>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ workspaceId, baseUrl, headers }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`${baseUrl}/webhooks/facebook/analytics/${workspaceId}`, { headers })
      .then(r => r.json())
      .then(data => { setAnalytics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId, baseUrl, headers]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;
  if (!analytics) return <p className="text-sm text-[var(--text-muted)] text-center py-8">No analytics data yet.</p>;

  const stats = [
    { label: "Total Conversations", value: analytics.totalConversations || 0, icon: MessageSquare, bg: "var(--brand-cyan-soft)", color: "var(--brand-cyan)" },
    { label: "Hot Leads", value: analytics.hotLeads || 0, icon: Flame, bg: "rgba(239,68,68,0.12)", color: "var(--danger)" },
    { label: "Warm Leads", value: analytics.warmLeads || 0, icon: TrendingUp, bg: "var(--brand-gold-soft)", color: "var(--brand-gold)" },
    { label: "Cold Leads", value: analytics.coldLeads || 0, icon: Snowflake, bg: "var(--brand-cyan-soft)", color: "var(--brand-cyan)" },
    { label: "Human Handoffs", value: analytics.handoffs || 0, icon: User, bg: "rgba(139,92,246,0.12)", color: "#8b5cf6" },
    { label: "Active Rules", value: `${analytics.activeRules || 0}/${analytics.totalRules || 0}`, icon: Zap, bg: "var(--success-soft)", color: "var(--success)" },
    { label: "Rule Matches", value: analytics.totalRuleMatches || 0, icon: CheckCircle2, bg: "var(--success-soft)", color: "var(--success)" },
    { label: "Broadcasts Sent", value: `${analytics.sentBroadcasts || 0}/${analytics.totalBroadcasts || 0}`, icon: Megaphone, bg: "rgba(99,102,241,0.12)", color: "#6366f1" },
  ];

  const total = analytics.totalConversations || 0;
  const posPct = total ? (analytics.positiveSentiment / total) * 100 : 0;
  const neuPct = total ? (analytics.neutralSentiment / total) * 100 : 0;
  const negPct = total ? (analytics.negativeSentiment / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: stat.bg }}>
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
        <h4 className="mb-3 text-sm font-black text-[var(--text-primary)]">Sentiment Distribution</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex h-4 overflow-hidden rounded-full bg-[var(--hover-bg)]">
              <div className="bg-[var(--success)]" style={{ width: `${posPct}%` }} />
              <div className="bg-[var(--text-muted)]" style={{ width: `${neuPct}%`, opacity: 0.4 }} />
              <div className="bg-[var(--danger)]" style={{ width: `${negPct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--success)]" />{analytics.positiveSentiment || 0} Positive</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />{analytics.neutralSentiment || 0} Neutral</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--danger)]" />{analytics.negativeSentiment || 0} Negative</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutoReplyRulesManager({ workspaceId, baseUrl, headers }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleMsg, setRuleMsg] = useState("");
  const [form, setForm] = useState({ triggerKeyword: "", responseText: "", triggerMatchType: "contains", quickReplies: [], isActive: true, priority: 0 });

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`${baseUrl}/webhooks/facebook/auto-reply-rules/${workspaceId}`, { headers })
      .then(r => r.json())
      .then(data => { const r = data.rules || data || []; setRules(Array.isArray(r) ? r : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId, baseUrl, headers]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSavingRule(true);
    setRuleMsg("");
    try {
      const res = editing
        ? await fetch(`${baseUrl}/webhooks/facebook/auto-reply-rules/${editing}`, {
            method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(form),
          })
        : await fetch(`${baseUrl}/webhooks/facebook/auto-reply-rules`, {
            method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, ...form }),
          });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setRuleMsg(editing ? "Rule updated." : "Rule created.");
      setEditing(null);
      setForm({ triggerKeyword: "", responseText: "", triggerMatchType: "contains", quickReplies: [], isActive: true, priority: 0 });
      load();
    } catch (err) {
      setRuleMsg(err.message || "Failed to save rule.");
    } finally {
      setSavingRule(false);
      setTimeout(() => setRuleMsg(""), 3000);
    }
  };

  const del = async (id) => {
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/auto-reply-rules/${id}`, { method: "DELETE", headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      load();
    } catch (err) {
      setRuleMsg(err.message || "Failed to delete rule.");
      setTimeout(() => setRuleMsg(""), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--text-primary)]">Keyword Auto-Reply Rules</h3>
        <button onClick={() => { setEditing(null); setForm({ triggerKeyword: "", responseText: "", triggerMatchType: "contains", quickReplies: [], isActive: true, priority: 0 }); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors">
          <Plus className="h-3.5 w-3.5" />Add Rule
        </button>
      </div>
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input value={form.triggerKeyword} onChange={e => setForm(p => ({ ...p, triggerKeyword: e.target.value }))} placeholder="Trigger keyword (e.g. PRICE, ORDER)" />
          <Select value={form.triggerMatchType} onChange={e => setForm(p => ({ ...p, triggerMatchType: e.target.value }))}>
            <option value="contains">Contains</option>
            <option value="exact">Exact Match</option>
            <option value="starts_with">Starts With</option>
          </Select>
        </div>
        <TextArea value={form.responseText} onChange={e => setForm(p => ({ ...p, responseText: e.target.value }))} placeholder="Auto-reply message when keyword is matched" rows={2} />
        <Input value={(form.quickReplies || []).join(", ")} onChange={e => setForm(p => ({ ...p, quickReplies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="Quick replies (comma-separated, e.g. Yes, No, Maybe)" />
        <div className="flex items-center justify-between">
          <Toggle enabled={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
          <button onClick={save} disabled={!form.triggerKeyword || !form.responseText || savingRule}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
            {savingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editing ? "Update" : "Save"} Rule
          </button>
        </div>
        {ruleMsg && (
          <div className={`rounded-lg px-3 py-2 text-xs font-bold ${ruleMsg.includes("Failed") || ruleMsg.includes("error") ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>{ruleMsg}</div>
        )}
      </div>
      <div className="space-y-2">
        {rules.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No rules yet. Add one above to auto-reply when users type specific keywords.</p>}
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: rule.is_active ? "var(--success-soft)" : "var(--hover-bg)" }}>
              <Zap className="h-4 w-4" style={{ color: rule.is_active ? "var(--success)" : "var(--text-muted)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">"{rule.trigger_keyword}"</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{rule.response_text}</p>
            </div>
            <button onClick={() => { setEditing(rule.id); let qr = []; try { qr = Array.isArray(rule.quick_replies) ? rule.quick_replies : JSON.parse(rule.quick_replies || "[]"); } catch {} setForm({ triggerKeyword: rule.trigger_keyword, responseText: rule.response_text, triggerMatchType: rule.trigger_match_type, quickReplies: qr, isActive: rule.is_active, priority: rule.priority }); }}
              className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
            <button onClick={() => del(rule.id)} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BroadcastManager({ workspaceId, baseUrl, headers }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(null);
  const [bcMsg, setBcMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", messageText: "", targetSegment: "all" });

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetch(`${baseUrl}/webhooks/facebook/broadcasts/${workspaceId}`, { headers })
      .then(r => r.json())
      .then(data => { const b = data.campaigns || data.broadcasts || []; setBroadcasts(Array.isArray(b) ? b : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId, baseUrl, headers]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setCreating(true);
    setBcMsg("");
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${baseUrl}/webhooks/facebook/broadcasts/${editingId}` : `${baseUrl}/webhooks/facebook/broadcasts`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...form }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setBcMsg(isEdit ? "Campaign updated." : "Campaign created.");
      setForm({ name: "", messageText: "", targetSegment: "all" });
      setEditingId(null);
      load();
    } catch (err) {
      setBcMsg(err.message || (editingId ? "Failed to update campaign." : "Failed to create campaign."));
    } finally {
      setCreating(false);
      setTimeout(() => setBcMsg(""), 3000);
    }
  };

  const send = async (id) => {
    setSending(id);
    setBcMsg("");
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/broadcasts/${id}/send`, { method: "POST", headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setBcMsg("Broadcast sent successfully.");
      load();
    } catch (err) {
      setBcMsg(err.message || "Failed to send broadcast.");
    } finally {
      setSending(null);
      setTimeout(() => setBcMsg(""), 3000);
    }
  };

  const del = async (id) => {
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/broadcasts/${id}`, { method: "DELETE", headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setBcMsg("Campaign deleted.");
      load();
    } catch (err) {
      setBcMsg(err.message || "Failed to delete campaign.");
      setTimeout(() => setBcMsg(""), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--text-primary)]">Broadcast Campaigns</h3>
      </div>
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 space-y-3">
        <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Campaign name (e.g. Summer Promo)" />
        <TextArea value={form.messageText} onChange={e => setForm(p => ({ ...p, messageText: e.target.value }))} placeholder="Broadcast message to send to all matching conversations" rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Select value={form.targetSegment} onChange={e => setForm(p => ({ ...p, targetSegment: e.target.value }))}>
            <option value="all">All Conversations</option>
            <option value="hot">Hot Leads Only</option>
            <option value="warm">Warm Leads Only</option>
            <option value="cold">Cold Leads Only</option>
          </Select>
          <div className="flex gap-2">
            <button onClick={save} disabled={!form.name || !form.messageText || creating}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
              {editingId ? "Save Changes" : "Create Campaign"}
            </button>
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm({ name: "", messageText: "", targetSegment: "all" }); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-black text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
        {bcMsg && (
          <div className={`rounded-lg px-3 py-2 text-xs font-bold ${bcMsg.includes("Failed") || bcMsg.includes("error") ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>{bcMsg}</div>
        )}
      </div>
      <div className="space-y-2">
        {broadcasts.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No broadcast campaigns yet. Create one above to mass-message your conversations.</p>}
        {broadcasts.map(bc => (
          <div key={bc.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: bc.status === "sent" ? "var(--success-soft)" : "var(--brand-gold-soft)" }}>
              <Megaphone className="h-4 w-4" style={{ color: bc.status === "sent" ? "var(--success)" : "var(--brand-gold)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">{bc.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{bc.message_text || bc.messageText}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-muted)]">{bc.target_segment || "all"}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${bc.status === "sent" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"}`}>{bc.status || "draft"}</span>
              </div>
            </div>
            {bc.status !== "sent" && (
              <>
                <button onClick={() => { setEditingId(bc.id); setForm({ name: bc.name || "", messageText: bc.message_text || bc.messageText || "", targetSegment: bc.target_segment || "all" }); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => send(bc.id)} disabled={sending === bc.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
                  {sending === bc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send
                </button>
              </>
            )}
            <button onClick={() => del(bc.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--danger)]/30 px-2 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FacebookConnectCard({ workspaceId, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectedPages, setConnectedPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [oauthPages, setOauthPages] = useState([]);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [selectingPage, setSelectingPage] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [form, setForm] = useState({
    pageId: "",
    pageName: "",
    businessType: "",
    productServices: "",
    productServicePriceRanges: "",
    websiteLink: "",
    shoppeLink: "",
    lazadaLink: "",
    pageAccessToken: "",
    verifyToken: "",
    accessMode: "enable",
    connectWorkspaceId: workspaceId || "",
    knowledge: "",
    aiInstruction: ""
  });
  const [workspaces, setWorkspaces] = useState([]);

  const showMsg = (text, type = "success") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => { setMsg(""); setMsgType(""); }, 4000);
  };

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    
    // Load dynamic workspaces for the dropdown
    getWorkspaceAccessData()
      .then(res => {
        if (res?.workspaces) setWorkspaces(res.workspaces);
      })
      .catch(console.error);

    facebookIntegrationService.getStatus()
      .then(data => {
        const pages = Array.isArray(data?.connectedPages) ? data.connectedPages : [];
        setConnectedPages(pages.filter(p => {
          const wsId = p.connectedWorkspaceId || p.workspace_id || p.workspaceId || "";
          return wsId === workspaceId;
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("oauth_success") === "1") {
      setOauthLoading(true);
      const wsId = searchParams.get("workspace") || workspaceId;
      facebookIntegrationService.getOAuthPages(wsId)
        .then(data => {
          const pages = Array.isArray(data?.pages) ? data.pages : [];
          if (pages.length > 0) {
            setOauthPages(pages);
            showMsg(`Found ${pages.length} Facebook page(s). Select one to connect.`, "success");
          } else {
            showMsg("No Facebook pages found for your account. Make sure you manage at least one Facebook Page.", "error");
          }
          setOauthLoading(false);
        })
        .catch(() => {
          showMsg("Failed to load Facebook pages after OAuth. Please try again.", "error");
          setOauthLoading(false);
        });
      searchParams.delete("oauth_success");
      searchParams.delete("workspace");
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get("oauth_error")) {
      const errMsg = searchParams.get("oauth_message") || searchParams.get("oauth_error") || "Facebook OAuth failed.";
      showMsg(errMsg, "error");
      searchParams.delete("oauth_error");
      searchParams.delete("oauth_message");
      searchParams.delete("oauth_reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, workspaceId, setSearchParams]);

  const startOAuth = async () => {
    if (!workspaceId) return;
    setOauthLoading(true);
    showMsg("", "");

    if (window.FB && window.fbSdkReady) {
      let callbackFired = false;
      const timeoutId = setTimeout(() => {
        if (!callbackFired) {
          callbackFired = true;
          showMsg("Facebook popup timed out. Trying redirect method...", "error");
          fallbackRedirectOAuth();
        }
      }, 15000);

      window.FB.login(
        (response) => {
          if (callbackFired) return;
          callbackFired = true;
          clearTimeout(timeoutId);

          if (response.status === "connected" && response.authResponse?.accessToken) {
            const token = response.authResponse.accessToken;
            facebookIntegrationService.sdkTokenToPages(workspaceId, token)
              .then(data => {
                const pages = Array.isArray(data?.pages) ? data.pages : [];
                if (pages.length > 0) {
                  setOauthPages(pages);
                  showMsg(`Found ${pages.length} Facebook page(s). Select one to connect.`, "success");
                } else {
                  showMsg(data?.warning || "No Facebook pages found. Make sure you manage at least one Page.", "error");
                }
                setOauthLoading(false);
              })
              .catch(err => {
                showMsg(err.message || "Failed to fetch Facebook pages.", "error");
                setOauthLoading(false);
              });
          } else {
            showMsg("Facebook login was cancelled or failed.", "error");
            setOauthLoading(false);
          }
        },
        { scope: "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,pages_manage_posts,read_page_mailboxes" }
      );
    } else {
      fallbackRedirectOAuth();
    }
  };

  const fallbackRedirectOAuth = async () => {
    try {
      const { auth_url } = await facebookIntegrationService.getOAuthUrl(workspaceId, "admin");
      window.location.href = auth_url;
    } catch (err) {
      showMsg(err.message || "Failed to start Facebook OAuth. Check if FACEBOOK_APP_ID is configured.", "error");
      setOauthLoading(false);
    }
  };

  const selectPage = async (page) => {
    setSelectingPage(page.pageId);
    showMsg("", "");
    try {
      await facebookIntegrationService.selectOAuthPage({
        workspaceId,
        pageId: page.pageId,
        pageName: page.pageName,
        pageAccessToken: page.pageAccessToken,
      });
      showMsg(`"${page.pageName}" connected successfully.`, "success");
      setOauthPages([]);
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(err.message || "Failed to connect page.", "error");
    } finally {
      setSelectingPage(null);
    }
  };

  const connectManual = async () => {
    setSaving(true);
    showMsg("", "");
    try {
      const targetWorkspaceId = form.connectWorkspaceId || workspaceId;
      await facebookIntegrationService.connectPage({
        ...form,
        workspaceId: targetWorkspaceId,
        connectedWorkspaceId: targetWorkspaceId,
      });
      showMsg("Facebook page connected successfully.", "success");
      setForm({ 
        pageId: "", pageName: "", businessType: "", productServices: "", productServicePriceRanges: "", 
        websiteLink: "", shoppeLink: "", lazadaLink: "", pageAccessToken: "", verifyToken: "", accessMode: "enable",
        connectWorkspaceId: workspaceId || "", knowledge: "", aiInstruction: ""
      });
      setShowManualForm(false);
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(err.message || "Failed to connect page.", "error");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (pageId) => {
    setActionLoading(`del-${pageId}`);
    showMsg("", "");
    try {
      await facebookIntegrationService.deletePage(pageId);
      showMsg("Page disconnected.", "success");
      load();
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(err.message || "Failed to disconnect page.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const subscribe = async (pageId) => {
    setActionLoading(`sub-${pageId}`);
    showMsg("", "");
    try {
      await facebookIntegrationService.subscribePage(pageId);
      showMsg("Webhook subscribed successfully.", "success");
      load();
    } catch (err) {
      showMsg(err.message || "Failed to subscribe webhook.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAccessMode = async (pageId, currentMode) => {
    const nextMode = currentMode === "enable" ? "disable" : "enable";
    setActionLoading(`mode-${pageId}`);
    try {
      await facebookIntegrationService.updateAccessMode(pageId, nextMode);
      showMsg(`Chatbot ${nextMode === "enable" ? "enabled" : "disabled"} for this page.`, "success");
      load();
    } catch (err) {
      showMsg(err.message || "Failed to toggle access mode.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const fbConnected = connectedPages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#1877F215" }}>
            <Facebook className="h-5 w-5" style={{ color: "#1877F2" }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)]">Facebook Messenger</h3>
            <p className="text-xs text-[var(--text-muted)]">{fbConnected ? `${connectedPages.length} page(s) connected` : "Not connected"}</p>
          </div>
        </div>
        {oauthPages.length === 0 && !showManualForm && (
          <button onClick={startOAuth} disabled={!workspaceId || oauthLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-black text-white disabled:opacity-40 hover:bg-[#0e5fc2] transition-colors">
            {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
            {oauthLoading ? "Connecting..." : "Connect with Facebook"}
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-3 py-2 text-xs font-bold ${msgType === "error" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>{msg}</div>
      )}

      {oauthPages.length > 0 && (
        <div className="rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--brand-gold)]">Select a Facebook Page to Connect</h4>
            <button onClick={() => setOauthPages([])} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {oauthPages.map(page => (
              <div key={page.pageId} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden" style={{ background: "#1877F215" }}>
                  {page.pictureUrl ? (
                    <img src={page.pictureUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Facebook className="h-4 w-4" style={{ color: "#1877F2" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{page.pageName}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{page.category || "Facebook Page"}</p>
                </div>
                <button
                  onClick={() => selectPage(page)}
                  disabled={selectingPage === page.pageId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors"
                >
                  {selectingPage === page.pageId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {oauthLoading && oauthPages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-gold)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Connecting to Facebook...</p>
        </div>
      )}

      {!oauthLoading && oauthPages.length === 0 && showManualForm && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--text-muted)]">Manual Connect</h4>
            <button onClick={() => setShowManualForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Page ID</label>
              <Input value={form.pageId} onChange={e => setForm(p => ({ ...p, pageId: e.target.value }))} placeholder="e.g. 1234567890" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Page Name</label>
              <Input value={form.pageName} onChange={e => setForm(p => ({ ...p, pageName: e.target.value }))} placeholder="e.g. My Business Page" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Business Type</label>
              <Input value={form.businessType} onChange={e => setForm(p => ({ ...p, businessType: e.target.value }))} placeholder="Solar Energy, Retail, Real Estate" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Product/Services</label>
              <Input value={form.productServices} onChange={e => setForm(p => ({ ...p, productServices: e.target.value }))} placeholder="Solar Panel, Installation, Maintenance" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Price Range</label>
              <Select value={form.productServicePriceRanges} onChange={e => setForm(p => ({ ...p, productServicePriceRanges: e.target.value }))}>
                <option value="">Select price range</option>
                <option value="Below PHP 500">Below PHP 500</option>
                <option value="PHP 500 - 1,999">PHP 500 - 1,999</option>
                <option value="PHP 2,000 - 4,999">PHP 2,000 - 4,999</option>
                <option value="PHP 5,000 - 9,999">PHP 5,000 - 9,999</option>
                <option value="PHP 10,000 and above">PHP 10,000 and above</option>
                <option value="Custom / Varies">Custom / Varies</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Website Link</label>
              <Input value={form.websiteLink} onChange={e => setForm(p => ({ ...p, websiteLink: e.target.value }))} placeholder="https://yourwebsite.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Shopee Link</label>
              <Input value={form.shoppeLink} onChange={e => setForm(p => ({ ...p, shoppeLink: e.target.value }))} placeholder="https://shopee.ph/your-shop" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Lazada Link</label>
              <Input value={form.lazadaLink} onChange={e => setForm(p => ({ ...p, lazadaLink: e.target.value }))} placeholder="https://www.lazada.com.ph/shop/your-shop" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Connect to Workspace</label>
              <Select value={form.connectWorkspaceId} onChange={e => setForm(p => ({ ...p, connectWorkspaceId: e.target.value }))}>
                <option value="">Not linked</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Page Access Token</label>
              <Input type="password" value={form.pageAccessToken} onChange={e => setForm(p => ({ ...p, pageAccessToken: e.target.value }))} placeholder="From Meta Graph API Explorer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Verify Token</label>
              <Input value={form.verifyToken} onChange={e => setForm(p => ({ ...p, verifyToken: e.target.value }))} placeholder="Webhook verify token" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Chatbot Status</label>
              <Select value={form.accessMode} onChange={e => setForm(p => ({ ...p, accessMode: e.target.value }))}>
                <option value="enable">Enabled (auto-reply on)</option>
                <option value="disable">Disabled (manual only)</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-color)]">
            <button onClick={() => setShowManualForm(false)} className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors">Cancel</button>
            <button onClick={connectManual} disabled={!form.pageId || !form.pageAccessToken || !form.verifyToken || saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}Connect
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>
      ) : connectedPages.length === 0 && !oauthLoading && oauthPages.length === 0 && !showManualForm ? (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-6 text-center">
          <Facebook className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm font-bold text-[var(--text-secondary)]">No Facebook pages connected</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Click "Connect with Facebook" above to log in with your Facebook account and select a page to automate.</p>
          <button onClick={() => setShowManualForm(true)} className="mt-3 text-xs font-bold text-[var(--text-muted)] underline hover:text-[var(--text-secondary)]">Or connect manually with Page ID and Access Token</button>
        </div>
      ) : (
        <div className="space-y-2">
          {connectedPages.map(page => {
            const pid = page.pageId || page.page_id || "";
            const pname = page.pageName || page.page_name || pid;
            const accessMode = page.accessMode || page.access_mode || "enable";
            const isEnabled = accessMode === "enable";
            return (
              <div key={pid} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#1877F215" }}>
                    <Facebook className="h-4 w-4" style={{ color: "#1877F2" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{pname}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isEnabled ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>{isEnabled ? "Active" : "Paused"}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">ID: {pid}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-color)]">
                  <button onClick={() => toggleAccessMode(pid, accessMode)} disabled={actionLoading === `mode-${pid}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-40">
                    {actionLoading === `mode-${pid}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}{isEnabled ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => subscribe(pid)} disabled={actionLoading === `sub-${pid}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-40">
                    {actionLoading === `sub-${pid}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}Subscribe Webhook
                  </button>
                  <button onClick={() => disconnect(pid)} disabled={actionLoading === `del-${pid}`}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--danger)]/30 px-2.5 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors disabled:opacity-40">
                    {actionLoading === `del-${pid}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionTab({ id, icon: Icon, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all whitespace-nowrap ${
        active ? "bg-[var(--brand-gold)] text-black" : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
      }`}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}

function FlowDiagram() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <h4 className="mb-3 text-xs font-black uppercase text-[var(--text-muted)]">Automation Flow</h4>
      <div className="flex flex-wrap items-center gap-2">
        {FLOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-2.5 py-1.5">
                <Icon className="h-3.5 w-3.5" style={{ color: step.color }} />
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">{step.label}</span>
              </div>
              {i < FLOW_STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowSequenceManager({ workspaceId, baseUrl, headers }) {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seqMsg, setSeqMsg] = useState("");
  const [form, setForm] = useState({ name: "", triggerStage: "", isActive: true, steps: [{ messageText: "", delayMinutes: 60, quickReplies: [] }] });
  const [customTriggers, setCustomTriggers] = useState([]);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  const loadTriggers = useCallback(() => {
    if (!workspaceId) return;
    fetch(`${baseUrl}/webhooks/facebook/sequence-triggers/${workspaceId}`, { headers })
      .then(r => r.json())
      .then(data => setCustomTriggers(data.triggers || []))
      .catch(() => {});
  }, [workspaceId, baseUrl, headers]);

  const load = useCallback(() => {
    if (!workspaceId) { setLoading(false); return; }
    loadTriggers();
    fetch(`${baseUrl}/webhooks/facebook/flow-sequences/${workspaceId}`, { headers })
      .then(r => r.json())
      .then(data => { const s = data.sequences || []; setSequences(Array.isArray(s) ? s : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId, baseUrl, headers]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setSeqMsg("");
    try {
      const body = { workspaceId, name: form.name, triggerStage: form.triggerStage, steps: form.steps, isActive: form.isActive };
      const res = editing
        ? await fetch(`${baseUrl}/webhooks/facebook/flow-sequences/${editing}`, {
            method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body),
          })
        : await fetch(`${baseUrl}/webhooks/facebook/flow-sequences`, {
            method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      setSeqMsg(editing ? "Sequence updated." : "Sequence created.");
      setEditing(null);
      setForm({ name: "", triggerStage: "", isActive: true, steps: [{ messageText: "", delayMinutes: 60, quickReplies: [] }] });
      load();
    } catch (err) {
      setSeqMsg(err.message || "Failed to save sequence.");
    } finally {
      setSaving(false);
      setTimeout(() => setSeqMsg(""), 3000);
    }
  };

  const del = async (id) => {
    try {
      const res = await fetch(`${baseUrl}/webhooks/facebook/flow-sequences/${id}`, { method: "DELETE", headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      load();
    } catch (err) {
      setSeqMsg(err.message || "Failed to delete sequence.");
      setTimeout(() => setSeqMsg(""), 3000);
    }
  };

  const addStep = () => setForm(p => ({ ...p, steps: [...p.steps, { messageText: "", delayMinutes: 60, quickReplies: [] }] }));
  const removeStep = (idx) => setForm(p => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  const updateStep = (idx, field, val) => setForm(p => ({ ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, [field]: val } : s) }));

  const editSequence = (seq) => {
    let parsedSteps = seq.steps;
    if (typeof parsedSteps === "string") { try { parsedSteps = JSON.parse(parsedSteps); } catch { parsedSteps = []; } }
    setEditing(seq.id);
    setForm({
      name: seq.name || "",
      triggerStage: seq.trigger_stage || "",
      isActive: seq.is_active ?? true,
      steps: Array.isArray(parsedSteps) && parsedSteps.length > 0 ? parsedSteps : [{ messageText: "", delayMinutes: 60, quickReplies: [] }],
    });
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--text-primary)]">Flow Sequences</h3>
        <button onClick={() => { setEditing(null); setForm({ name: "", triggerStage: "", isActive: true, steps: [{ messageText: "", delayMinutes: 60, quickReplies: [] }] }); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors">
          <Plus className="h-3.5 w-3.5" />New Sequence
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sequence name (e.g. Welcome Drip)" />
          <Select 
            value={form.triggerStage} 
            onChange={e => {
              if (e.target.value === "__manage__") {
                setShowTriggerModal(true);
              } else {
                setForm(p => ({ ...p, triggerStage: e.target.value }));
              }
            }}
          >
            <option value="">Any Trigger</option>
            {customTriggers.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
            <option value="__manage__">Manage Triggers...</option>
          </Select>
        </div>

        {showTriggerModal && (
          <TriggerManagerModal
            workspaceId={workspaceId}
            baseUrl={baseUrl}
            headers={headers}
            onClose={() => setShowTriggerModal(false)}
            onTriggersChange={loadTriggers}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[var(--text-muted)]">Steps</span>
            <button onClick={addStep} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"><Plus className="h-3 w-3" />Add Step</button>
          </div>
          {form.steps.map((step, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--brand-gold)]">Step {idx + 1}</span>
                {form.steps.length > 1 && <button onClick={() => removeStep(idx)} className="text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded p-1"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <TextArea value={step.messageText} onChange={e => updateStep(idx, "messageText", e.target.value)} placeholder="Message to send at this step" rows={2} />
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--text-muted)]">Delay (min):</label>
                <input type="number" min="1" value={step.delayMinutes} onChange={e => updateStep(idx, "delayMinutes", parseInt(e.target.value) || 0)} className="w-24 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-2 py-1 text-xs text-[var(--text-primary)]" />
                <Input value={(step.quickReplies || []).join(", ")} onChange={e => updateStep(idx, "quickReplies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Quick replies (comma-separated)" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Toggle enabled={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
            <span className="text-xs font-bold text-[var(--text-muted)]">Active</span>
          </div>
          <button onClick={save} disabled={!form.name || !form.steps[0]?.messageText || saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black disabled:opacity-40 hover:bg-[var(--brand-gold-hover)] transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editing ? "Update" : "Create"} Sequence
          </button>
        </div>
        {seqMsg && (
          <div className={`rounded-lg px-3 py-2 text-xs font-bold ${seqMsg.includes("Failed") || seqMsg.includes("error") ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}>{seqMsg}</div>
        )}
      </div>

      <div className="space-y-2">
        {sequences.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No sequences yet. Create drip campaigns that automatically follow up with leads over time.</p>}
        {sequences.map(seq => {
          let stepCount = 0;
          try { stepCount = Array.isArray(seq.steps) ? seq.steps.length : JSON.parse(seq.steps || "[]").length; } catch {}
          return (
            <div key={seq.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: seq.is_active ? "var(--success-soft)" : "var(--hover-bg)" }}>
                <Clock className="h-4 w-4" style={{ color: seq.is_active ? "var(--success)" : "var(--text-muted)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{seq.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{stepCount} step(s) · {seq.trigger_stage || "Any stage"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${seq.is_active ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>{seq.is_active ? "Active" : "Paused"}</span>
              <button onClick={() => editSequence(seq)} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
              <button onClick={() => del(seq.id)} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "greeting", label: "Greeting", icon: MessageSquare },
  { id: "ai", label: "AI Personality", icon: Sparkles },
  { id: "hours", label: "Business Hours", icon: Clock },
  { id: "behavior", label: "Behavior", icon: Settings },
  { id: "starters", label: "Starters", icon: Zap },
  { id: "rules", label: "Auto-Reply Rules", icon: Bot },
  { id: "sequences", label: "Sequences", icon: Clock },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone },
];

export default function ChatbotBuilder({ workspaceId, onNavigateTab, onStatusChange }) {
  const baseUrl = getApiBase();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [authHeaders, setAuthHeaders] = useState({});
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get("section") || "overview";
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    const sec = searchParams.get("section");
    if (sec) {
      setActiveSection(sec);
    }
  }, [searchParams]);

  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [greeting, setGreeting] = useState({ welcome_enabled: false, welcome_message: "", away_message: "" });
  const [ai, setAi] = useState({ ai_enabled: true, ai_model: "llama-3.3-70b-versatile", ai_personality: "", knowledge_base: "", ai_language: "en", ai_temperature: 0.7 });
  const [hours, setHours] = useState({ business_hours_enabled: false, business_hours: {}, away_message: "" });
  const [behavior, setBehavior] = useState({ response_delay_seconds: 0, handoff_enabled: false, handoff_keywords: [], handoff_message: "", auto_tag_enabled: true, sentiment_analysis_enabled: true });
  const [starters, setStarters] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthHeaders(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {});
    });
  }, []);

  const fetchSettings = useCallback(async (pageIdToFetch, pageFallbackData = {}) => {
    if (!workspaceId || !pageIdToFetch) { setLoading(false); return; }
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${baseUrl}/webhooks/facebook/client/connect/settings?workspaceId=${workspaceId}&pageId=${pageIdToFetch}`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const s = data.settings || {};
      setSettings(s);
      setGreeting({ welcome_enabled: s.welcomeEnabled ?? false, welcome_message: s.welcomeMessage || "", away_message: s.awayMessage || "" });
      setAi({ ai_enabled: s.aiEnabled ?? true, ai_model: s.aiModel || "llama-3.3-70b-versatile", ai_personality: s.aiInstruction || pageFallbackData.ai_instruction || pageFallbackData.aiInstruction || "", knowledge_base: s.knowledgeBase || pageFallbackData.knowledge || "", ai_language: s.aiLanguage || "en", ai_temperature: s.aiTemperature ?? 0.7 });
      let parsedHours = s.businessHoursDays;
      if (typeof parsedHours === "string") { try { parsedHours = JSON.parse(parsedHours); } catch { parsedHours = {}; } }
      setHours({ business_hours_enabled: s.businessHoursEnabled ?? false, business_hours: parsedHours || {}, away_message: s.awayMessage || "" });
      setBehavior({
        response_delay_seconds: s.responseDelaySeconds ?? 0,
        handoff_enabled: s.handoffEnabled ?? false,
        handoff_keywords: Array.isArray(s.handoffKeywords) ? s.handoffKeywords : (typeof s.handoffKeywords === "string" ? (() => { try { return JSON.parse(s.handoffKeywords); } catch { return []; } })() : []),
        handoff_message: s.handoffMessage || "",
        auto_tag_enabled: s.autoTagConversations ?? true,
        sentiment_analysis_enabled: s.sentimentAnalysis ?? true,
      });
      let parsedStarters = s.conversationStarters;
      if (typeof parsedStarters === "string") { try { parsedStarters = JSON.parse(parsedStarters); } catch { parsedStarters = []; } }
      setStarters(Array.isArray(parsedStarters) ? parsedStarters : []);
    } catch (err) {
      setError(err.message || "Failed to load chatbot settings.");
    } finally {
      setLoading(false);
      if (onStatusChange) onStatusChange();
    }
  }, [workspaceId, baseUrl, authHeaders, onStatusChange]);

  useEffect(() => {
    if (workspaceId) {
      fetch(`${baseUrl}/webhooks/facebook/admin/status?workspaceId=${workspaceId}`, { headers: authHeaders })
        .then(r => r.json())
        .then(d => {
          const p = (d.connectedPages || []).filter(page => {
            const pageWsId = page.connectedWorkspaceId || page.workspace_id || page.workspaceId || "";
            return pageWsId === workspaceId;
          });
          setPages(p);
          if (p.length > 0) {
            const firstPage = p[0];
            const firstPageId = firstPage.pageId || firstPage.page_id;
            setSelectedPageId(firstPageId);
            fetchSettings(firstPageId, firstPage);
          } else {
            setSelectedPageId("");
            setSettings(null);
            setGreeting({ welcome_enabled: false, welcome_message: "", away_message: "" });
            setAi({ ai_enabled: true, ai_model: "llama-3.3-70b-versatile", ai_personality: "", knowledge_base: "", ai_language: "en", ai_temperature: 0.7 });
            setHours({ business_hours_enabled: false, business_hours: {}, away_message: "" });
            setBehavior({ response_delay_seconds: 0, handoff_enabled: false, handoff_keywords: [], handoff_message: "", auto_tag_enabled: true, sentiment_analysis_enabled: true });
            setStarters([]);
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    }
  }, [workspaceId, baseUrl, authHeaders, fetchSettings]);

  const handlePageSelect = (e) => {
    const pid = e.target.value;
    setSelectedPageId(pid);
    const selectedPage = pages.find(p => p.pageId === pid || p.page_id === pid) || {};
    fetchSettings(pid, selectedPage);
  };

  const saveSettings = async (partialPayload, sectionLabel) => {
    if (!workspaceId || !selectedPageId) {
      setError("Please select a Facebook page first.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      const isAi = sectionLabel === "AI Personality";
      const isGreeting = sectionLabel === "Greeting";
      const isHours = sectionLabel === "Business Hours";
      const isBehavior = sectionLabel === "Behavior";
      const isStarters = sectionLabel === "Starters";

      const mergedPayload = {
        workspaceId,
        pageId: selectedPageId,
        welcomeEnabled: isGreeting ? partialPayload.welcome_enabled : greeting.welcome_enabled,
        welcomeMessage: isGreeting ? partialPayload.welcome_message : greeting.welcome_message,
        awayMessage: isGreeting ? partialPayload.away_message : (isHours ? partialPayload.away_message : greeting.away_message),
        aiEnabled: isAi ? partialPayload.ai_enabled : ai.ai_enabled,
        aiModel: isAi ? partialPayload.ai_model : ai.ai_model,
        aiInstruction: isAi ? partialPayload.ai_personality : ai.ai_personality,
        knowledgeBase: isAi ? partialPayload.knowledge_base : ai.knowledge_base,
        aiLanguage: isAi ? partialPayload.ai_language : ai.ai_language,
        aiTemperature: isAi ? partialPayload.ai_temperature : ai.ai_temperature,
        businessHoursEnabled: isHours ? partialPayload.business_hours_enabled : hours.business_hours_enabled,
        businessHoursDays: isHours ? partialPayload.business_hours : hours.business_hours,
        responseDelaySeconds: isBehavior ? partialPayload.response_delay_seconds : behavior.response_delay_seconds,
        handoffEnabled: isBehavior ? partialPayload.handoff_enabled : behavior.handoff_enabled,
        handoffKeywords: isBehavior ? partialPayload.handoff_keywords : behavior.handoff_keywords,
        handoffMessage: isBehavior ? partialPayload.handoff_message : behavior.handoff_message,
        autoTagConversations: isBehavior ? partialPayload.auto_tag_enabled : behavior.auto_tag_enabled,
        sentimentAnalysis: isBehavior ? partialPayload.sentiment_analysis_enabled : behavior.sentiment_analysis_enabled,
        conversationStarters: isStarters ? JSON.parse(partialPayload.conversation_starters) : starters,
      };

      const res = await fetch(`${baseUrl}/webhooks/facebook/client/connect/settings?workspaceId=${workspaceId}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(mergedPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSaveMsg(`${sectionLabel || "Settings"} saved successfully.`);
      setTimeout(() => setSaveMsg(""), 3000);
      fetchSettings(selectedPageId);
      
      const sections = ["overview", "greeting", "ai", "hours", "behavior", "starters", "rules", "sequences", "broadcasts"];
      const currentIndex = sections.indexOf(activeSection);
      if (currentIndex !== -1 && currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1]);
      }
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const addStarter = () => setStarters(prev => [...prev, ""]);
  const removeStarter = (idx) => setStarters(prev => prev.filter((_, i) => i !== idx));
  const updateStarter = (idx, val) => setStarters(prev => prev.map((s, i) => i === idx ? val : s));
  const addKeyword = () => setBehavior(prev => ({ ...prev, handoff_keywords: [...prev.handoff_keywords, ""] }));
  const removeKeyword = (idx) => setBehavior(prev => ({ ...prev, handoff_keywords: prev.handoff_keywords.filter((_, i) => i !== idx) }));
  const updateKeyword = (idx, val) => setBehavior(prev => ({ ...prev, handoff_keywords: prev.handoff_keywords.map((k, i) => i === idx ? val : k) }));

  const previewSettings = useMemo(() => ({ ...greeting, ...ai, ...hours, ...behavior, conversation_starters: starters }), [greeting, ai, hours, behavior, starters]);

  if (loading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-gold)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Loading chatbot builder...</p>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-10 w-10 text-[var(--danger)]" />
        <h2 className="mt-4 text-lg font-black text-[var(--text-primary)]">No Workspace Selected</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Select a client workspace from the Connections tab.</p>
        {onNavigateTab && (
          <button onClick={() => onNavigateTab("connect")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors">
            Go to Connections <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-gold)]" />Chatbot Builder
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Design, automate, and optimize your conversational flows across all channels.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {pages.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-black tracking-wider uppercase text-[var(--text-muted)]">Editing Page:</label>
              <select
                value={selectedPageId}
                onChange={handlePageSelect}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-gold)] focus:outline-none"
              >
                {pages.map(p => (
                  <option key={p.pageId || p.page_id} value={p.pageId || p.page_id}>
                    {p.pageName || p.page_name || "Unknown Page"}
                  </option>
                ))}
              </select>
            </div>
          )}
          {saveMsg && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--success-soft)] px-3 py-2 text-xs font-bold text-[var(--success)]">
              <CheckCircle2 className="h-4 w-4" />{saveMsg}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <SectionTab key={s.id} id={s.id} icon={s.icon} label={s.label} active={activeSection === s.id} onClick={setActiveSection} />
        ))}
      </div>

      <FlowDiagram />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ErrorBoundary
            title="Chatbot Builder section error"
            fallback={(err, reset) => (
              <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-[var(--danger)]" />
                <h3 className="mt-3 text-sm font-black text-[var(--danger)]">Section crashed</h3>
                <p className="mt-2 break-all text-xs font-mono text-[var(--danger)]">{err.message}</p>
                <button
                  onClick={() => { setActiveSection("overview"); reset(); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-black text-black hover:bg-[var(--brand-gold-hover)] transition-colors"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />Back to Overview
                </button>
              </div>
            )}
          >
          {activeSection === "overview" && <AnalyticsDashboard workspaceId={workspaceId} baseUrl={baseUrl} headers={authHeaders} />}
          {activeSection === "greeting" && (
            <Card icon={MessageSquare} title="Welcome Message" subtitle="First message users see when they start a conversation" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Enable Welcome Message</span>
                  <Toggle enabled={greeting.welcome_enabled} onChange={v => setGreeting(p => ({ ...p, welcome_enabled: v }))} />
                </div>
                <TextArea value={greeting.welcome_message} onChange={e => setGreeting(p => ({ ...p, welcome_message: e.target.value }))} placeholder="Hi! Welcome to our page. How can we help you today?" rows={3} disabled={!greeting.welcome_enabled} />
                <span className="text-sm font-bold text-[var(--text-primary)]">Away Message (during off-hours)</span>
                <TextArea value={greeting.away_message} onChange={e => setGreeting(p => ({ ...p, away_message: e.target.value }))} placeholder="We're currently away. We'll get back to you during business hours!" rows={2} />
                <SaveButton onSave={() => saveSettings(greeting, "Greeting")} saving={saving} />
              </div>
            </Card>
          )}
          {activeSection === "ai" && (
            <Card icon={Sparkles} title="AI Personality" subtitle="Configure how the AI responds to user messages" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Enable AI Replies</span>
                  <Toggle enabled={ai.ai_enabled} onChange={v => setAi(p => ({ ...p, ai_enabled: v }))} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    Knowledge Base <span className="text-[10px] font-medium text-[var(--text-secondary)]">(Optional: Facts, FAQs, or context for the AI)</span>
                  </label>
                  <TextArea value={ai.knowledge_base || ""} onChange={e => setAi(p => ({ ...p, knowledge_base: e.target.value }))} placeholder="e.g. We are open from 9 AM to 5 PM. Our main product is solar panels." rows={3} disabled={!ai.ai_enabled} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    AI Custom Instruction <span className="text-[10px] font-medium text-[var(--text-secondary)]">(Optional: Specific behavioral rules)</span>
                  </label>
                  <TextArea value={ai.ai_personality} onChange={e => setAi(p => ({ ...p, ai_personality: e.target.value }))} placeholder="e.g. You are a helpful sales assistant. Always end your replies with a question." rows={4} disabled={!ai.ai_enabled} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Language</label>
                    <Select value={ai.ai_language} onChange={e => setAi(p => ({ ...p, ai_language: e.target.value }))} disabled={!ai.ai_enabled}>
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Temperature: {ai.ai_temperature.toFixed(1)}</label>
                    <input type="range" min="0" max="1" step="0.1" value={ai.ai_temperature} onChange={e => setAi(p => ({ ...p, ai_temperature: parseFloat(e.target.value) }))} disabled={!ai.ai_enabled} className="w-full accent-[var(--brand-gold)]" />
                  </div>
                </div>
                <SaveButton onSave={() => saveSettings(ai, "AI Personality")} saving={saving} />
              </div>
            </Card>
          )}
          {activeSection === "hours" && (
            <Card icon={Clock} title="Business Hours" subtitle="Set when your chatbot is actively responding" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Enable Business Hours</span>
                  <Toggle enabled={hours.business_hours_enabled} onChange={v => setHours(p => ({ ...p, business_hours_enabled: v }))} />
                </div>
                {hours.business_hours_enabled && (
                  <div className="space-y-2">
                    {WEEKDAYS.map(day => {
                      const dayData = hours.business_hours[day.value] || { open: "", close: "" };
                      return (
                        <div key={day.value} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5">
                          <span className="w-10 text-xs font-black text-[var(--text-primary)]">{day.label}</span>
                          <Input type="time" value={dayData.open || ""} onChange={e => setHours(p => ({ ...p, business_hours: { ...p.business_hours, [day.value]: { ...dayData, open: e.target.value } } }))} />
                          <span className="text-xs text-[var(--text-muted)]">to</span>
                          <Input type="time" value={dayData.close || ""} onChange={e => setHours(p => ({ ...p, business_hours: { ...p.business_hours, [day.value]: { ...dayData, close: e.target.value } } }))} />
                          <button onClick={() => setHours(p => ({ ...p, business_hours: { ...p.business_hours, [day.value]: { open: "", close: "" } } }))} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors"><X className="h-3 w-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <SaveButton onSave={() => saveSettings(hours, "Business Hours")} saving={saving} />
              </div>
            </Card>
          )}
          {activeSection === "behavior" && (
            <Card icon={Settings} title="Response Behavior" subtitle="Fine-tune how your chatbot responds" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">Response Delay (seconds): {behavior.response_delay_seconds}s</label>
                  <input type="range" min="0" max="10" step="1" value={behavior.response_delay_seconds} onChange={e => setBehavior(p => ({ ...p, response_delay_seconds: parseInt(e.target.value) }))} className="w-full accent-[var(--brand-gold)]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Enable Human Handoff</span>
                  <Toggle enabled={behavior.handoff_enabled} onChange={v => setBehavior(p => ({ ...p, handoff_enabled: v }))} />
                </div>
                {behavior.handoff_enabled && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-muted)]">Handoff Keywords (triggers human takeover)</label>
                    {behavior.handoff_keywords.map((kw, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={kw} onChange={e => updateKeyword(idx, e.target.value)} placeholder="e.g. agent, human, representative" />
                        <button onClick={() => removeKeyword(idx)} className="rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={addKeyword} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"><Plus className="h-3.5 w-3.5" />Add Keyword</button>
                    
                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Handoff Message (sent before human takeover)</label>
                      <textarea rows={3} value={behavior.handoff_message || ""} onChange={e => setBehavior(p => ({ ...p, handoff_message: e.target.value }))} placeholder="e.g. I'll connect you to our team. Please hold on..." className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:outline-none" />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Auto-Tag Conversations</span>
                  <Toggle enabled={behavior.auto_tag_enabled} onChange={v => setBehavior(p => ({ ...p, auto_tag_enabled: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--text-primary)]">Sentiment Analysis</span>
                  <Toggle enabled={behavior.sentiment_analysis_enabled} onChange={v => setBehavior(p => ({ ...p, sentiment_analysis_enabled: v }))} />
                </div>
                <SaveButton onSave={() => saveSettings(behavior, "Behavior")} saving={saving} />
              </div>
            </Card>
          )}
          {activeSection === "starters" && (
            <Card icon={Zap} title="Conversation Starters" subtitle="Quick-reply buttons shown to users starting a chat" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <div className="space-y-3">
                {starters.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No starters yet. Add quick-reply buttons to guide users.</p>}
                {starters.map((starter, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={starter} onChange={e => updateStarter(idx, e.target.value)} placeholder="e.g. What are your prices?" />
                    <button onClick={() => removeStarter(idx)} className="rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={addStarter} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"><Plus className="h-3.5 w-3.5" />Add Starter</button>
                <SaveButton onSave={() => saveSettings({ conversation_starters: JSON.stringify(starters) }, "Starters")} saving={saving} />
              </div>
            </Card>
          )}
          {activeSection === "rules" && (
            <Card icon={Bot} title="Auto-Reply Rules" subtitle="Keyword-based automatic responses" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <AutoReplyRulesManager workspaceId={workspaceId} baseUrl={baseUrl} headers={authHeaders} />
            </Card>
          )}
          {activeSection === "sequences" && (
            <Card icon={Clock} title="Flow Sequences" subtitle="Botcake-style multi-step drip campaigns" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <FlowSequenceManager workspaceId={workspaceId} baseUrl={baseUrl} headers={authHeaders} />
            </Card>
          )}
          {activeSection === "broadcasts" && (
            <Card icon={Megaphone} title="Broadcast Campaigns" subtitle="Mass-message your conversations with targeted campaigns" iconColor="text-[var(--brand-gold)]" iconBg="bg-[var(--brand-gold-soft)]">
              <BroadcastManager workspaceId={workspaceId} baseUrl={baseUrl} headers={authHeaders} />
            </Card>
          )}
          </ErrorBoundary>
        </div>
        <div className="hidden xl:block">
          <PhonePreview settings={previewSettings} />
        </div>
      </div>
    </div>
  );
}
