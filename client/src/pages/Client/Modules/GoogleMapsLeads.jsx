import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, MapPin, Building2, Globe, Mail, Phone, Star,
  ExternalLink, Trash2, RefreshCw, Download, Loader2,
  AlertCircle, CheckCircle2, X, Zap, Users, TrendingUp,
  ChevronRight, MoreVertical, Clock, BarChart2, Target,
  ArrowLeft, Facebook, Instagram, Linkedin, Twitter, Link,
  Brain, Sparkles, MessageSquare, Copy, ChevronDown, ChevronUp,
} from 'lucide-react';
import * as gmapsService from '../../../services/marketing/googleMapsLeads';
import { getCurrentWorkspaceId } from '../../../services/workspaceResolver';
import { supabase } from '../../../config/supabaseClient';

// ── AI helper — proxies through /api/ai/chat (no key in browser) ──────────────
async function callAI(prompt) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
  const res = await fetch(`${apiBase}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || data.content || data.reply || '';
}

// ── Status maps ────────────────────────────────────────────────────────────────
const LEAD_STATUS = {
  new:         { label: 'New',         dot: 'bg-blue-500' },
  contacted:   { label: 'Contacted',   dot: 'bg-yellow-500' },
  qualified:   { label: 'Qualified',   dot: 'bg-green-500' },
  unqualified: { label: 'Unqualified', dot: 'bg-red-500' },
  converted:   { label: 'Converted',   dot: 'bg-emerald-500' },
  archived:    { label: 'Archived',    dot: 'bg-gray-400' },
};

const ENRICHMENT_STATUS = {
  pending:    { label: 'Pending' },
  processing: { label: 'Processing' },
  enriched:   { label: 'Enriched' },
  failed:     { label: 'Failed' },
  skipped:    { label: 'Skipped' },
};

// ── Philippines — all cities & major municipalities by region ─────────────────
const PH_CITIES = [
  // NCR — National Capital Region
  'Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong',
  'Paranaque', 'Caloocan', 'Pasay', 'Las Pinas', 'Muntinlupa', 'Marikina',
  'Malabon', 'Navotas', 'Valenzuela', 'San Juan', 'Pateros',

  // Region I — Ilocos
  'Laoag City', 'Vigan City', 'San Fernando City La Union', 'Dagupan City',
  'Urdaneta City', 'Alaminos City', 'Batac City', 'Candon City',

  // Region II — Cagayan Valley
  'Tuguegarao City', 'Ilagan City', 'Santiago City', 'Cauayan City',

  // Region III — Central Luzon
  'San Fernando City Pampanga', 'Angeles City', 'Olongapo City',
  'Balanga City', 'Cabanatuan City', 'Gapan City', 'Malolos City',
  'Meycauayan City', 'San Jose del Monte City', 'Tarlac City',
  'Palayan City', 'Mabalacat City', 'Science City of Munoz',

  // Region IV-A — CALABARZON
  'Antipolo City', 'Calamba City', 'San Pablo City', 'Lucena City',
  'Lipa City', 'Batangas City', 'Tanauan City', 'Santa Rosa City',
  'Binan City', 'San Pedro City', 'Cavite City', 'Bacoor City',
  'Imus City', 'Dasmariñas City', 'General Trias City', 'Trece Martires City',
  'Tagaytay City',

  // Region IV-B — MIMAROPA
  'Calapan City', 'Puerto Princesa City', 'Roxas City Palawan',

  // Region V — Bicol
  'Legazpi City', 'Naga City', 'Iriga City', 'Ligao City',
  'Tabaco City', 'Sorsogon City', 'Masbate City',

  // Region VI — Western Visayas
  'Iloilo City', 'Bacolod City', 'Roxas City', 'San Carlos City Negros',
  'Silay City', 'Cadiz City', 'Escalante City', 'Sagay City',
  'Talisay City Negros', 'Bago City', 'La Carlota City', 'Kabankalan City',
  'Victorias City', 'Passi City', 'Guimaras',

  // Region VII — Central Visayas
  'Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Talisay City Cebu',
  'Naga City Cebu', 'Carcar City', 'Danao City', 'Bogo City',
  'Toledo City', 'Tagbilaran City', 'Dumaguete City', 'Bais City',
  'Canlaon City', 'Guihulngan City', 'Tanjay City', 'Bayawan City',
  'Sibulan', 'Valencia Negros Oriental',

  // Region VIII — Eastern Visayas
  'Tacloban City', 'Ormoc City', 'Baybay City', 'Maasin City',
  'Calbayog City', 'Catbalogan City', 'Borongan City',

  // Region IX — Zamboanga Peninsula
  'Zamboanga City', 'Pagadian City', 'Dipolog City', 'Dapitan City',
  'Isabela City Basilan',

  // Region X — Northern Mindanao
  'Cagayan de Oro City', 'Iligan City', 'Valencia City', 'Malaybalay City',
  'Ozamiz City', 'Oroquieta City', 'Gingoog City', 'Tangub City',
  'El Salvador City', 'Initao', 'Jasaan', 'Opol',

  // Region XI — Davao
  'Davao City', 'Tagum City', 'Panabo City', 'Samal City',
  'Mati City', 'Digos City', 'Kidapawan City',

  // Region XII — SOCCSKSARGEN
  'General Santos City', 'Koronadal City', 'Tacurong City',
  'Cotabato City', 'Kidapawan City',

  // Region XIII — Caraga
  'Butuan City', 'Surigao City', 'Bislig City', 'Tandag City',
  'Bayugan City', 'Cabadbaran City',

  // BARMM — Bangsamoro
  'Cotabato City', 'Marawi City', 'Lamitan City',

  // CAR — Cordillera
  'Baguio City', 'Tabuk City', 'La Trinidad Benguet',

  // Popular search area formats
  'Metro Manila', 'Metro Cebu', 'Metro Davao', 'Calabarzon',
  'Central Luzon', 'Western Visayas', 'Central Visayas',
  'Northern Mindanao', 'Davao Region',
];

const QUERY_PRESETS = [
  'Dentists', 'Restaurants', 'Realtors', 'Law Firms', 'Auto Repair',
  'Beauty Salons', 'Gyms', 'Pharmacies', 'Accounting Firms', 'IT Services',
  'Roofing Contractors', 'Plumbers', 'Hotels', 'Clinics', 'Schools',
];

const SEARCH_STEPS = ['Initializing', 'Searching Maps', 'Processing Results', 'AI Enrichment', 'Saving Leads'];

// ── Shared input class using system tokens ─────────────────────────────────────
const INPUT_CLS =
  'h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm ' +
  'text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] ' +
  'focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)] transition-colors';

const SELECT_CLS =
  'h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-2.5 text-xs ' +
  'text-[var(--text-primary)] outline-none focus:border-[var(--brand-gold)] ' +
  'focus:ring-1 focus:ring-[var(--brand-gold-soft)] transition-colors';

// ── Sub-components ─────────────────────────────────────────────────────────────
function LeadStatusBadge({ status }) {
  const cfg = LEAD_STATUS[status] || { label: status, dot: 'bg-gray-400' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
      border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        accent
          ? 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]'
          : 'bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  );
}

function Toast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm text-white max-w-xs
          ${t.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}>
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DeleteModal({ target, onConfirm, onCancel }) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--danger-soft)] flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Delete Search</h3>
              <p className="text-xs text-[var(--text-muted)]">All associated leads will be removed.</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] bg-[var(--hover-bg)] rounded-xl px-3 py-2 mb-4 font-medium border border-[var(--border-color)]">
          {target.search_label}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]
              text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors font-medium">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm rounded-xl bg-[var(--danger)] text-white
              hover:opacity-90 transition-opacity font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Lead Panel ─────────────────────────────────────────────────────────────
function AILeadPanel({ lead, onClose }) {
  const [tab, setTab]         = useState('score');   // 'score' | 'outreach' | 'tips'
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState('');
  const [copied, setCopied]   = useState(false);

  const run = useCallback(async (activeTab) => {
    setLoading(true);
    setResult('');
    try {
      let prompt = '';
      if (activeTab === 'score') {
        prompt = `You are a Philippine B2B sales analyst. Score this lead 1-10 and explain why in 3 bullet points.
Business: ${lead.business_name}
Category: ${lead.category || 'unknown'}
Rating: ${lead.rating || 'N/A'} (${lead.reviews || 0} reviews)
Website: ${lead.website ? 'Yes' : 'No'}
Email: ${lead.email ? 'Yes' : 'No'}
Social presence: ${[lead.facebook, lead.instagram, lead.linkedin].filter(Boolean).length} channels
Location: ${lead.address || 'Philippines'}

Respond with: Score: X/10 then 3 bullet points. Be concise.`;
      } else if (activeTab === 'outreach') {
        prompt = `Write a short cold outreach email (under 120 words) for a Philippine SMB sales rep reaching out to this business.
Business: ${lead.business_name}
Category: ${lead.category || 'local business'}
Location: ${lead.address || 'Philippines'}
Goal: Introduce our business management software (Hermes — accounting, invoicing, CRM, payroll for Philippine SMBs).
Tone: friendly, professional, Filipino business culture.
Include subject line. Do not use placeholders like [Your Name] — use "Hermes Team" as sender.`;
      } else {
        prompt = `Give 3 quick sales tips for approaching this type of Philippine business.
Business type: ${lead.category || lead.business_name}
Rating: ${lead.rating || 'N/A'}
Has website: ${lead.website ? 'Yes' : 'No'}
Has email: ${lead.email ? 'Yes' : 'No'}
Tips should be specific to Philippine business culture and SMB context. Keep each tip under 2 sentences.`;
      }
      const text = await callAI(prompt);
      setResult(text);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [lead]);

  useEffect(() => { run(tab); }, [tab, run]);

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--hover-bg)] rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Brain className="w-4 h-4 text-[var(--brand-gold)]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">AI Assistant</p>
            </div>
            <h3 className="font-bold text-[var(--text-primary)] truncate max-w-[280px]">{lead.business_name}</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-0">
          {[
            { key: 'score',    label: 'Lead Score',  icon: Target },
            { key: 'outreach', label: 'Outreach',    icon: MessageSquare },
            { key: 'tips',     label: 'Sales Tips',  icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === key
                  ? 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border border-[var(--brand-gold-border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 min-h-[180px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-36 gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold-soft)] flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[var(--brand-gold)] animate-spin" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">AI is thinking…</p>
            </div>
          ) : (
            <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
              {result}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-[var(--border-color)] bg-[var(--hover-bg)] rounded-b-2xl">
          <button onClick={() => run(tab)} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Regenerate
          </button>
          <button onClick={copy} disabled={!result || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl
              bg-[var(--brand-gold)] text-white hover:bg-[var(--brand-gold-hover)]
              disabled:opacity-40 transition-colors">
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Search Suggestions Panel ────────────────────────────────────────────────
function AIQuerySuggest({ location, industry, onSelect }) {
  const [loading, setLoading]       = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);

  const generate = async () => {
    if (!location && !industry) return;
    setLoading(true);
    setOpen(true);
    setSuggestions([]);
    try {
      const prompt = `List 8 high-value business types to search on Google Maps in ${location || 'Philippines'} for B2B lead generation${industry ? `, especially in the ${industry} sector` : ''}.
Return ONLY a plain numbered list (1. Business Type) — no explanations, no extra text.`;
      const text = await callAI(prompt);
      const lines = text.split('\n').filter(l => /^\d+\./.test(l.trim()));
      setSuggestions(lines.map(l => l.replace(/^\d+\.\s*/, '').trim()));
    } catch {
      setSuggestions(['Could not generate suggestions. Try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={generate}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl
          border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]
          text-[var(--brand-gold)] hover:opacity-80 transition-opacity">
        <Brain className="w-3.5 h-3.5" />
        {loading ? 'Thinking…' : 'AI Suggest'}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 w-60 rounded-xl border border-[var(--border-color)]
          bg-[var(--bg-card)] shadow-xl py-1">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-color)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">AI Suggestions</p>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…
            </div>
          ) : suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => { onSelect(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)]
                hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialLinks({ lead }) {
  const links = [
    { key: 'facebook',     Icon: Facebook,  label: 'Facebook' },
    { key: 'instagram',    Icon: Instagram, label: 'Instagram' },
    { key: 'linkedin',     Icon: Linkedin,  label: 'LinkedIn' },
    { key: 'twitter',      Icon: Twitter,   label: 'Twitter/X' },
    { key: 'contact_page', Icon: Link,      label: 'Contact' },
  ].filter(s => lead[s.key]);

  if (!links.length) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {links.map(({ key, Icon, label }) => (
        <a key={key} href={lead[key]} target="_blank" rel="noopener noreferrer" title={label}
          className="text-[var(--text-muted)] hover:text-[var(--brand-cyan)] transition-colors">
          <Icon className="w-3.5 h-3.5" />
        </a>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function GoogleMapsLeads() {
  const outletContext = useOutletContext() || {};
  const [workspaceId, setWorkspaceId] = useState(
    outletContext?.workspaceId || outletContext?.workspace?.id || ''
  );

  useEffect(() => {
    const fromContext = outletContext?.workspaceId || outletContext?.workspace?.id;
    if (fromContext) {
      gmapsService.setWorkspaceContext(fromContext);
      setWorkspaceId(fromContext);
      return;
    }
    getCurrentWorkspaceId().then(id => {
      if (id) { gmapsService.setWorkspaceContext(id); setWorkspaceId(id); }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletContext?.workspaceId, outletContext?.workspace?.id]);

  const [tab, setTab]                       = useState('searches');
  const [configs, setConfigs]               = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [leads, setLeads]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [searchRunning, setSearchRunning]   = useState(false);
  const [searchStep, setSearchStep]         = useState(0);
  const [serviceHealth, setServiceHealth]   = useState(null);
  const [toasts, setToasts]                 = useState([]);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [openActionRow, setOpenActionRow]   = useState(null);
  const [leadFilters, setLeadFilters]       = useState({ enrichment_status: '', lead_status: '' });
  const [aiLead, setAiLead]                 = useState(null);
  const stepTimer = useRef(null);

  const [searchForm, setSearchForm] = useState({
    location: '', search_query: '', num_pages: 1, search_label: '', enrichment_enabled: true,
  });

  // ── Toasts ──────────────────────────────────────────────────────
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = id => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Loaders ─────────────────────────────────────────────────────
  const loadConfigs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await gmapsService.getSearchConfigs();
      setConfigs(data || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadLeads = useCallback(async (configId, filters = {}) => {
    setLoading(true);
    try {
      const data = await gmapsService.getLeads(configId, filters);
      setLeads(data || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!workspaceId) return;
    loadConfigs();
    gmapsService.checkHealth().then(setServiceHealth).catch(() => {});
  }, [workspaceId, loadConfigs]);

  // ── Search with progress steps ───────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchRunning(true);
    setSearchStep(0);
    let step = 0;
    stepTimer.current = setInterval(() => {
      step = Math.min(step + 1, SEARCH_STEPS.length - 1);
      setSearchStep(step);
    }, 8000);
    try {
      const result = await gmapsService.startSearch(searchForm);
      clearInterval(stepTimer.current);
      if (result.success) {
        toast(`Search complete — ${result.data?.total_found || 0} leads found!`);
        await loadConfigs(true);
        setTab('searches');
        setSearchForm({ location: '', search_query: '', num_pages: 1, search_label: '', enrichment_enabled: true });
      } else {
        toast(result.error || 'Search failed', 'error');
      }
    } catch (err) {
      clearInterval(stepTimer.current);
      toast(err.message, 'error');
    } finally {
      setSearchRunning(false);
      setSearchStep(0);
    }
  };

  const handleViewLeads = async (config) => {
    setSelectedConfig(config);
    setLeads([]);
    await loadLeads(config.id, leadFilters);
  };

  const handleCloseLeads = () => {
    setSelectedConfig(null);
    setLeads([]);
    setLeadFilters({ enrichment_status: '', lead_status: '' });
    setOpenActionRow(null);
  };

  const handleDeleteConfirm = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    setLoading(true);
    try {
      await gmapsService.deleteSearchConfig(target.id);
      toast('Search deleted');
      if (selectedConfig?.id === target.id) handleCloseLeads();
      await loadConfigs(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunEnrichment = async (configId) => {
    setLoading(true);
    try {
      await gmapsService.runEnrichment(configId);
      toast('Enrichment complete');
      await loadConfigs(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    setOpenActionRow(null);
    try {
      await gmapsService.updateLead(leadId, { lead_status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: newStatus } : l));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...leadFilters, [field]: value };
    setLeadFilters(newFilters);
    if (selectedConfig) loadLeads(selectedConfig.id, newFilters);
  };

  const handleExport = () => {
    if (!leads.length) return;
    const csv = [
      ['Business Name','Address','Website','Phone','Email','Facebook','Twitter','Instagram','LinkedIn','Rating','Reviews','Category','Status'].join(','),
      ...leads.map(l => [
        `"${(l.business_name||'').replace(/"/g,'""')}"`,
        `"${(l.address||'').replace(/"/g,'""')}"`,
        `"${(l.website||'').replace(/"/g,'""')}"`,
        `"${(l.phone||'').replace(/"/g,'""')}"`,
        `"${(l.email||'').replace(/"/g,'""')}"`,
        `"${(l.facebook||'').replace(/"/g,'""')}"`,
        `"${(l.twitter||'').replace(/"/g,'""')}"`,
        `"${(l.instagram||'').replace(/"/g,'""')}"`,
        `"${(l.linkedin||'').replace(/"/g,'""')}"`,
        l.rating||'', l.reviews||'',
        `"${(l.category||'').replace(/"/g,'""')}"`,
        l.lead_status||'new',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmaps_leads_${selectedConfig?.search_label?.replace(/\s+/g,'_')||'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  };

  // ── Derived ──────────────────────────────────────────────────────
  const totalLeads    = configs.reduce((s, c) => s + (c.total_found || 0), 0);
  const totalEnriched = configs.reduce((s, c) => s + (c.total_enriched || 0), 0);
  const enrichRate    = totalLeads ? Math.round((totalEnriched / totalLeads) * 100) : 0;
  const doneCount     = configs.filter(c => c.status === 'completed').length;
  const healthOk      = serviceHealth?.service_available && serviceHealth?.serper_configured;

  // ══════════════════════════════════════════════════════════════════
  // VIEW: Searches list
  // ══════════════════════════════════════════════════════════════════
  const renderSearches = () => (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Target}    label="Total Leads"    value={totalLeads}    />
        <StatCard icon={Zap}       label="Enriched"       value={totalEnriched} sub={`${enrichRate}% rate`} accent />
        <StatCard icon={BarChart2} label="Searches Done"  value={doneCount}     />
        <StatCard icon={Users}     label="Total Searches" value={configs.length} accent />
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">Saved Searches</h2>
        <button onClick={() => loadConfigs()} disabled={loading}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {configs.length === 0 && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
          <p className="font-semibold text-[var(--text-primary)] mb-1">No searches yet</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">Find business leads anywhere in the Philippines and beyond.</p>
          <button onClick={() => setTab('new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              bg-[var(--brand-gold)] text-white hover:bg-[var(--brand-gold-hover)] transition-colors">
            <Search className="w-4 h-4" />Start Your First Search
          </button>
        </div>
      )}

      <div className="space-y-3">
        {configs.map(config => {
          const enrichPct = config.total_found
            ? Math.round((config.total_enriched / config.total_found) * 100) : 0;
          return (
            <div key={config.id}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4
                hover:border-[var(--brand-gold-border)] hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-cyan-soft)] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[var(--brand-cyan)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{config.search_label}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      config.status === 'completed' ? 'bg-[var(--success-soft)] text-[var(--success)]' :
                      config.status === 'running'   ? 'bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]' :
                      config.status === 'failed'    ? 'bg-[var(--danger-soft)] text-[var(--danger)]' :
                      'bg-[var(--hover-bg)] text-[var(--text-muted)]'
                    }`}>
                      {config.status === 'running' && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
                      {config.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mb-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{config.location}</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{config.search_query}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(config.created_at).toLocaleDateString()}</span>
                  </div>

                  {config.total_found > 0 && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">{config.total_found} leads</span>
                      <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-[var(--hover-bg)]">
                        <div className="h-1.5 rounded-full bg-[var(--brand-gold)] transition-all"
                          style={{ width: `${enrichPct}%` }} />
                      </div>
                      <span>{config.total_enriched} enriched ({enrichPct}%)</span>
                    </div>
                  )}

                  {config.error_message && (
                    <p className="mt-1 text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-2 py-1">
                      {config.error_message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => handleViewLeads(config)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl
                      bg-[var(--brand-gold)] text-white hover:bg-[var(--brand-gold-hover)] transition-colors">
                    View Leads <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {config.status === 'completed' && config.total_enriched < config.total_found && (
                    <button onClick={() => handleRunEnrichment(config.id)} disabled={loading}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl
                        border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)]
                        text-[var(--brand-cyan)] hover:opacity-80 transition-opacity">
                      <Zap className="w-3.5 h-3.5" />Enrich
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(config)}
                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--danger-soft)]
                      hover:text-[var(--danger)] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // VIEW: New Search form
  // ══════════════════════════════════════════════════════════════════
  const renderNewSearch = () => (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--border-color)] bg-[var(--hover-bg)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Lead Generation</p>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Search className="w-5 h-5 text-[var(--brand-gold)]" />
              New Google Maps Search
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Find local businesses with AI-powered data enrichment</p>
          </div>
          <button onClick={() => setTab('searches')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-card)]
              hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress during search */}
        {searchRunning && (
          <div className="px-6 py-10 text-center border-b border-[var(--border-color)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-gold-soft)] flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 text-[var(--brand-gold)] animate-spin" />
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">{SEARCH_STEPS[searchStep]}…</p>
            <p className="text-sm text-[var(--text-muted)] mb-5">This may take 2–5 minutes for large searches</p>
            <div className="flex items-center justify-center gap-1.5">
              {SEARCH_STEPS.map((s, i) => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  i < searchStep  ? 'bg-[var(--brand-gold)] w-6' :
                  i === searchStep ? 'bg-[var(--brand-gold)] opacity-60 w-8' :
                  'bg-[var(--border-color)] w-4'
                }`} />
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {!searchRunning && (
          <form onSubmit={handleSearch} className="p-6 space-y-5">

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                Search Label
              </label>
              <input type="text" value={searchForm.search_label}
                onChange={e => setSearchForm({ ...searchForm, search_label: e.target.value })}
                placeholder="e.g., Manila Dentists Q3 2025"
                className={INPUT_CLS} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  Location <span className="text-[var(--danger)] normal-case tracking-normal font-normal">*</span>
                </label>
                <input type="text" list="ph-cities" required value={searchForm.location}
                  onChange={e => setSearchForm({ ...searchForm, location: e.target.value })}
                  placeholder="e.g., Makati City"
                  className={INPUT_CLS} />
                <datalist id="ph-cities">
                  {PH_CITIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Business Type <span className="text-[var(--danger)] normal-case tracking-normal font-normal">*</span>
                  </label>
                  <AIQuerySuggest
                    location={searchForm.location}
                    industry={searchForm.search_query}
                    onSelect={q => setSearchForm(f => ({ ...f, search_query: q }))}
                  />
                </div>
                <input type="text" list="query-presets" required value={searchForm.search_query}
                  onChange={e => setSearchForm({ ...searchForm, search_query: e.target.value })}
                  placeholder="e.g., Dentists"
                  className={INPUT_CLS} />
                <datalist id="query-presets">
                  {QUERY_PRESETS.map(q => <option key={q} value={q} />)}
                </datalist>
              </div>
            </div>

            {/* Preset chips */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">Quick picks:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUERY_PRESETS.slice(0, 9).map(q => (
                  <button key={q} type="button"
                    onClick={() => setSearchForm(f => ({ ...f, search_query: q }))}
                    className={`px-2.5 py-1 text-xs rounded-xl border transition-colors font-medium ${
                      searchForm.search_query === q
                        ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-white'
                        : 'border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:border-[var(--brand-gold-border)] hover:text-[var(--text-primary)]'
                    }`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  Pages <span className="normal-case font-normal text-[var(--text-muted)]">(~20 results each)</span>
                </label>
                <input type="number" min="1" max="10" value={searchForm.num_pages}
                  onChange={e => setSearchForm({ ...searchForm, num_pages: parseInt(e.target.value) || 1 })}
                  className={INPUT_CLS} />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Est. {searchForm.num_pages * 20} results · max 200
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  AI Enrichment
                </label>
                <button type="button"
                  onClick={() => setSearchForm(f => ({ ...f, enrichment_enabled: !f.enrichment_enabled }))}
                  className="flex items-center gap-3 w-fit">
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${
                    searchForm.enrichment_enabled ? 'bg-[var(--brand-gold)]' : 'bg-[var(--border-color)]'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      searchForm.enrichment_enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {searchForm.enrichment_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Email, social, contact</p>
                  </div>
                </button>
              </div>
            </div>

            {!healthOk && serviceHealth && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-[var(--brand-gold-border)]
                bg-[var(--brand-gold-soft)] text-sm text-[var(--text-secondary)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--brand-gold)]" />
                <span>Service not ready — check that <code className="font-mono text-xs bg-[var(--hover-bg)] px-1 rounded">SERPER_API_KEY</code> is set and the server is restarted.</span>
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t border-[var(--border-color)]">
              <button type="button" onClick={() => setTab('searches')}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--border-color)]
                  bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]
                  hover:text-[var(--text-primary)] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!healthOk || searchRunning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl
                  bg-[var(--brand-gold)] text-white hover:bg-[var(--brand-gold-hover)]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Search className="w-4 h-4" />
                Start Search
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // VIEW: Leads table
  // ══════════════════════════════════════════════════════════════════
  const renderLeads = () => {
    const enrichedCount = leads.filter(l => l.enrichment_status === 'enriched').length;
    const enrichPct = leads.length ? Math.round((enrichedCount / leads.length) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Leads header with X close */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button onClick={handleCloseLeads}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--brand-gold)] mb-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />Saved Searches
            </button>
            <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedConfig?.search_label}</h2>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5 flex-wrap">
              <span>{leads.length} leads</span>
              <span>·</span>
              <span>{enrichedCount} enriched ({enrichPct}%)</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedConfig?.location}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={leadFilters.lead_status}
              onChange={e => handleFilterChange('lead_status', e.target.value)}
              className={SELECT_CLS}>
              <option value="">All Statuses</option>
              {Object.entries(LEAD_STATUS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select value={leadFilters.enrichment_status}
              onChange={e => handleFilterChange('enrichment_status', e.target.value)}
              className={SELECT_CLS}>
              <option value="">All Enrichment</option>
              {Object.entries(ENRICHMENT_STATUS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <button onClick={handleExport} disabled={!leads.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl
                bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-soft)]
                hover:opacity-80 disabled:opacity-40 transition-opacity">
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
            {/* X close button */}
            <button onClick={handleCloseLeads}
              className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)]
                hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger-soft)]
                transition-colors" title="Close leads">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Empty */}
        {leads.length === 0 && !loading && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
            <p className="font-semibold text-[var(--text-primary)] mb-1">No leads found</p>
            <p className="text-sm text-[var(--text-muted)]">Try adjusting filters or run a new search.</p>
          </div>
        )}

        {leads.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--hover-bg)]
                    text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="text-left px-4 py-3">Business</th>
                    <th className="text-left px-4 py-3">Contact</th>
                    <th className="text-left px-4 py-3">Social</th>
                    <th className="text-center px-4 py-3">Rating</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {leads.map(lead => (
                    <tr key={lead.id}
                      className="hover:bg-[var(--hover-bg)] transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{lead.business_name}</p>
                        {lead.address && (
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{lead.address}</p>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-cyan)] hover:opacity-70 mt-1 transition-opacity">
                            <Globe className="w-3 h-3" />Website<ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Phone className="w-3 h-3 text-[var(--text-muted)]" />{lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1 text-xs text-[var(--brand-cyan)] mt-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{lead.email}</span>
                          </div>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <SocialLinks lead={lead} />
                        <span className="inline-block mt-1 text-xs text-[var(--text-muted)]">
                          {ENRICHMENT_STATUS[lead.enrichment_status]?.label || lead.enrichment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lead.rating ? (
                          <>
                            <div className="flex items-center justify-center gap-0.5">
                              <Star className="w-3.5 h-3.5 text-[var(--brand-gold)] fill-[var(--brand-gold)]" />
                              <span className="font-semibold text-[var(--text-primary)]">{lead.rating}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">{lead.reviews || 0} rev.</p>
                          </>
                        ) : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <LeadStatusBadge status={lead.lead_status} />
                      </td>
                      <td className="px-4 py-3 text-center relative">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setAiLead(lead); }}
                            className="p-1.5 rounded-lg text-[var(--brand-gold)] hover:bg-[var(--brand-gold-soft)] transition-colors"
                            title="AI: Score, Outreach & Tips">
                            <Brain className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenActionRow(openActionRow === lead.id ? null : lead.id); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)]
                              hover:text-[var(--text-primary)] transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        {openActionRow === lead.id && (
                          <div className="absolute right-4 top-10 z-20 rounded-xl border border-[var(--border-color)]
                            bg-[var(--bg-card)] shadow-xl py-1 min-w-[150px]">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-color)]">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Set Status</p>
                              <button onClick={() => setOpenActionRow(null)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {Object.entries(LEAD_STATUS).map(([v, { label, dot }]) => (
                              <button key={v} onClick={() => handleUpdateLeadStatus(lead.id, v)}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2
                                  hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-secondary)]
                                  ${lead.lead_status === v ? 'font-semibold text-[var(--text-primary)]' : ''}`}>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--hover-bg)]
              flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{leads.length} leads · {enrichedCount} enriched</span>
              <button onClick={handleExport} disabled={!leads.length}
                className="flex items-center gap-1 text-[var(--success)] hover:opacity-70 font-semibold transition-opacity">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // MAIN
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-7xl mx-auto" onClick={() => setOpenActionRow(null)}>

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">Marketing</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-gold-soft)] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[var(--brand-gold)]" />
            </div>
            Leads Generator
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
              <Brain className="w-3 h-3" />AI
            </span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 ml-11">
            Find, enrich, score, and draft outreach for local businesses — AI-powered, nationwide.
          </p>
        </div>

        {/* Health badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          serviceHealth === null
            ? 'border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]'
            : healthOk
              ? 'border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]'
              : 'border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            serviceHealth === null ? 'bg-current animate-pulse' :
            healthOk ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
          }`} />
          {serviceHealth === null ? 'Checking…' : healthOk ? 'Service Online' : 'Service Offline'}
        </div>
      </div>

      {/* Workspace resolving */}
      {!workspaceId && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-[var(--brand-gold-border)]
          bg-[var(--brand-gold-soft)] text-sm text-[var(--text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-[var(--brand-gold)]" />
          Resolving workspace…
        </div>
      )}

      {/* Tab bar — hidden when viewing leads */}
      {!selectedConfig && (
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-[var(--hover-bg)] w-fit border border-[var(--border-color)]">
          {[
            { key: 'searches', label: 'Saved Searches', icon: TrendingUp },
            { key: 'new',      label: 'New Search',     icon: Search },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === key
                  ? 'bg-[var(--bg-card)] text-[var(--brand-gold)] shadow-sm border border-[var(--border-color)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      )}

      {/* Loading bar */}
      {loading && !searchRunning && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-[var(--brand-cyan-border)]
          bg-[var(--brand-cyan-soft)] text-sm text-[var(--brand-cyan)]">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />Loading…
        </div>
      )}

      {/* Views */}
      {selectedConfig
        ? renderLeads()
        : tab === 'searches'
          ? renderSearches()
          : renderNewSearch()
      }

      <DeleteModal
        target={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      {aiLead && <AILeadPanel lead={aiLead} onClose={() => setAiLead(null)} />}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
