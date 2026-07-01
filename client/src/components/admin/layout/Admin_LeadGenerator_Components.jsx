
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Brain,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crosshair,
  Download,
  ExternalLink,
  Eye,
  Facebook,
  FileSearch,
  Filter,
  Flame,
  Globe,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "../ui";

/* ============================================================
   UTILITIES
============================================================ */
const TIER_BADGE_VARIANT = {
  hot: "danger",
  warm: "premium",
  cold: "default",
};

const TIER_META = {
  hot:  { label: "Hot",  emoji: "🔥", color: "text-[var(--danger)]" },
  warm: { label: "Warm", emoji: "🌡",  color: "text-[var(--brand-gold)]" },
  cold: { label: "Cold", emoji: "❄",  color: "text-[var(--brand-cyan)]" },
};

const STATUS_BADGE = {
  new: "default",
  in_pipeline: "info",
  contacted: "warning",
  replied: "premium",
  converted: "success",
};

const STATUS_LABEL = {
  new: "New",
  in_pipeline: "In Pipeline",
  contacted: "Contacted",
  replied: "Replied",
  converted: "Converted",
};

export const GAP_META = {
  no_website:  { label: "No website",   color: "text-[var(--danger)]",     bg: "bg-[var(--danger-soft)]",     icon: Globe,         description: "Business has no website. Prime target for web dev." },
  no_phone:    { label: "No phone",     color: "text-[var(--brand-gold)]", bg: "bg-[var(--brand-gold-soft)]", icon: Phone,         description: "Missing phone number on listing." },
  no_email:    { label: "No email",     color: "text-[var(--brand-gold)]", bg: "bg-[var(--brand-gold-soft)]", icon: Mail,          description: "Email not found via enrichment." },
  no_hours:    { label: "No hours",     color: "text-[var(--brand-gold)]", bg: "bg-[var(--brand-gold-soft)]", icon: Clock,         description: "Opening hours missing — signals poor profile management." },
  low_reviews: { label: "Low reviews",  color: "text-[var(--brand-cyan)]", bg: "bg-[var(--brand-cyan-soft)]", icon: Star,          description: "Fewer than 10 reviews. Reputation management opportunity." },
  poor_rating: { label: "Poor rating",  color: "text-[var(--danger)]",     bg: "bg-[var(--danger-soft)]",     icon: AlertTriangle, description: "Rating below 3.5. Needs reputation rescue." },
  no_social:   { label: "No social",    color: "text-[var(--brand-cyan)]", bg: "bg-[var(--brand-cyan-soft)]", icon: Facebook,      description: "No Facebook or Instagram presence." },
};

function classifyTier(score) {
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return "cold";
}

/* ============================================================
   HEADER + AI INTELLIGENCE BANNER
============================================================ */
export function LeadGenIntelligenceBanner({ insights }) {
  return (
    <Card className="overflow-hidden border-[var(--brand-cyan-border)] bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--brand-gold-soft)]">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-cyan)]">Lead Intelligence</p>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{insights.theme}</h3>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{insights.summary}</p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            {insights.suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={s.onApply}
                className="group flex items-start gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]"
              >
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-gold)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{s.query}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{s.reason}</p>
                </div>
                <ArrowUpRight className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--brand-gold)]" />
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   SEARCH BUILDER
============================================================ */
export function LeadGenSearchBuilder({
  industry,
  setIndustry,
  city,
  setCity,
  minRating,
  setMinRating,
  hasWebsiteFilter,
  setHasWebsiteFilter,
  radius,
  setRadius,
  onSearch,
  isSearching,
  industries,
  cities,
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Search Builder · Google Maps Lead Discovery</CardTitle>
        </div>
        <Badge variant="premium">Serper Maps API</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Industry / Keyword</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Roofing contractors"
              list="leadgen-industry-list"
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            <datalist id="leadgen-industry-list">
              {industries.map((i) => <option key={i} value={i} />)}
            </datalist>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Quezon City"
              list="leadgen-city-list"
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            <datalist id="leadgen-city-list">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            >
              {[2, 5, 10, 25, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Min rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            >
              <option value={0}>Any rating</option>
              <option value={2}>★ 2.0+ (rescue targets)</option>
              <option value={3}>★ 3.0+ (mid-tier)</option>
              <option value={4}>★ 4.0+ (premium)</option>
              <option value={4.5}>★ 4.5+ (top-tier)</option>
            </select>
          </div>

          <div className="md:col-span-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Filter by digital gaps</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { id: "all",         label: "All businesses" },
                { id: "no_website",  label: "❌ No website (high-value)" },
                { id: "has_website", label: "✓ Has website" },
                { id: "low_reviews", label: "⭐ Low reviews" },
                { id: "no_phone",    label: "📞 Missing phone" },
              ].map((opt) => {
                const active = hasWebsiteFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHasWebsiteFilter(opt.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]"
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold-border)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3">
            <p className="text-[11px] text-[var(--text-muted)]">
              💡 Pro tip: more gaps = warmer outreach. Filter on “No website” for the highest-value prospects.
            </p>
            <Button
              variant="primary"
              icon={isSearching ? Loader2 : Search}
              loading={isSearching}
              onClick={onSearch}
              disabled={!industry.trim() || !city.trim()}
            >
              {isSearching ? "Scraping Google Maps…" : "Run Search"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   SAVED / RECENT SEARCHES
============================================================ */
export function SavedSearches({ presets, onApply }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Saved Search Presets</CardTitle>
        </div>
        <Badge variant="default">{presets.length} presets</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onApply(p)}
              className="group flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]"
            >
              <Crosshair className="h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)]" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)]">{p.industry}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{p.city} · ~{p.estimatedLeads} leads</p>
              </div>
              <ArrowUpRight className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--brand-gold)]" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   KPI CARDS
============================================================ */
const KPI_ICON_MAP = {
  gold:    "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]",
  cyan:    "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20",
  danger:  "bg-[var(--danger-soft)] text-[var(--danger)] border-red-500/20",
};

function KPICard({ label, value, subline, icon: Icon, color = "gold" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <h3 className="mt-3 truncate text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
            {subline && <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">{subline}</p>}
          </div>
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${KPI_ICON_MAP[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadGenKPIGrid({ leads }) {
  const total = leads.length;
  const hot = leads.filter((l) => l.tier === "hot").length;
  const inPipeline = leads.filter((l) => l.status !== "new").length;
  const withEmail = leads.filter((l) => l.email).length;
  const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total) : 0;
  const replied = leads.filter((l) => l.status === "replied" || l.status === "converted").length;
  const replyRate = inPipeline > 0 ? Math.round((replied / inPipeline) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KPICard label="Total Discovered" value={total} subline="Across all searches" icon={Building2} color="gold" />
      <KPICard label="Hot Leads" value={hot} subline={`${total > 0 ? Math.round((hot / total) * 100) : 0}% of discovered`} icon={Flame} color="danger" />
      <KPICard label="Avg Gap Score" value={avgScore} subline="Higher = more opportunity" icon={Crosshair} color="gold" />
      <KPICard label="In Pipeline" value={inPipeline} subline={`${total > 0 ? Math.round((inPipeline / total) * 100) : 0}% pushed`} icon={Send} color="cyan" />
      <KPICard label="Email Enriched" value={withEmail} subline={`${total > 0 ? Math.round((withEmail / total) * 100) : 0}% coverage`} icon={Mail} color="success" />
      <KPICard label="Reply Rate" value={`${replyRate}%`} subline={`${replied} replies of ${inPipeline}`} icon={MessageSquare} color={replyRate >= 20 ? "success" : "gold"} />
    </div>
  );
}

/* ============================================================
   BULK ACTION BAR (appears when leads selected)
============================================================ */
export function LeadGenBulkActionBar({ selectedCount, onPush, onExport, onAddCampaign, onClear }) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[var(--brand-gold)]" />
        <span className="text-sm font-bold text-[var(--brand-gold)]">{selectedCount} selected</span>
        <button onClick={onClear} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
          Export to Excel
        </Button>
        <Button variant="secondary" size="sm" icon={Mail} onClick={onAddCampaign} disabled>
          Add to Campaign
          <span className="ml-1 rounded bg-[var(--hover-bg)] px-1 text-[9px] font-bold text-[var(--text-muted)]">soon</span>
        </Button>
        <Button variant="primary" size="sm" icon={Send} onClick={onPush}>
          Push to Pipeline
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   RESULTS TABLE
============================================================ */
export function LeadGenResultsTable({
  leads,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectLead,
  search,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
}) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.includes(l.id));

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Discovered Businesses</CardTitle>
          <Badge variant="default">{leads.length} of {totalCount}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, category, city…"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] md:w-60"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => onTierFilterChange(e.target.value)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          >
            <option value="all">All tiers</option>
            <option value="hot">🔥 Hot only</option>
            <option value="warm">🌡 Warm only</option>
            <option value="cold">❄ Cold only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          >
            <option value="all">All statuses</option>
            <option value="new">New (not pushed)</option>
            <option value="in_pipeline">In Pipeline</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleSelectAll(!allSelected)}
                    className="h-4 w-4 accent-[var(--brand-gold)]"
                  />
                </th>
                {["Business", "Category · City", "Phone", "Website", "Rating", "Gaps", "Score", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">
                    No leads match your filters. Try a different search or relax the filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-[var(--brand-gold-soft)]" : "hover:bg-[var(--hover-bg)]"}`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(lead.id)}
                          className="h-4 w-4 accent-[var(--brand-gold)]"
                        />
                      </td>
                      <td className="px-3 py-3" onClick={() => onSelectLead(lead)}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-[10px] font-bold text-[#050816]">
                            {lead.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{lead.name}</p>
                            <p className="truncate text-[10px] text-[var(--text-muted)]">{lead.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]" onClick={() => onSelectLead(lead)}>
                        <p className="font-semibold">{lead.category}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{lead.city}</p>
                      </td>
                      <td className="px-3 py-3 text-xs" onClick={() => onSelectLead(lead)}>
                        {lead.phone ? (
                          <span className="text-[var(--text-primary)]">{lead.phone}</span>
                        ) : (
                          <span className="font-bold text-[var(--danger)]">— missing</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs" onClick={() => onSelectLead(lead)}>
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[var(--brand-cyan)] hover:underline">
                            <Globe className="h-3 w-3" /> visit
                          </a>
                        ) : (
                          <span className="font-bold text-[var(--danger)]">— no website</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs" onClick={() => onSelectLead(lead)}>
                        {lead.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current text-yellow-500" />
                            <span className="font-bold text-[var(--text-primary)]">{lead.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">({lead.reviews})</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={() => onSelectLead(lead)}>
                        <div className="flex flex-wrap gap-1">
                          {lead.gaps.length === 0 ? (
                            <Badge variant="success" className="text-[10px]">Clean profile</Badge>
                          ) : (
                            lead.gaps.slice(0, 3).map((g) => {
                              const meta = GAP_META[g];
                              return (
                                <span key={g} className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                                  {meta.label}
                                </span>
                              );
                            })
                          )}
                          {lead.gaps.length > 3 && (
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">+{lead.gaps.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3" onClick={() => onSelectLead(lead)}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{lead.score}</span>
                          <Badge variant={TIER_BADGE_VARIANT[lead.tier]} className="text-[10px]">
                            {TIER_META[lead.tier].emoji} {TIER_META[lead.tier].label}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3" onClick={() => onSelectLead(lead)}>
                        <Badge variant={STATUS_BADGE[lead.status]} className="text-[10px]">{STATUS_LABEL[lead.status]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right" onClick={() => onSelectLead(lead)}>
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   LEAD DETAIL DRAWER
============================================================ */
export function LeadGenDetailDrawer({ lead, onClose, onPush, onMarkContacted }) {
  if (!lead) return null;

  const reviews = [
    { author: "Maricel L.", rating: 5, text: "Very professional team, fast and reliable service. Highly recommended!", date: "2026-04-12" },
    { author: "Joseph T.",  rating: 3, text: "Service was OK but communication could be better. Took 2 weeks to respond.", date: "2026-03-28" },
    { author: "Ana B.",     rating: 4, text: "Good value for money. Will use again.", date: "2026-02-19" },
  ];

  const outreachHistory = lead.status === "new" ? [] : [
    { date: "2026-05-10", channel: "Email", subject: "Quick question about your website", sent: true, opened: lead.status !== "in_pipeline", replied: lead.status === "replied" || lead.status === "converted" },
    { date: "2026-05-15", channel: "Follow-up", subject: "Bumping this up — quick chat?", sent: lead.status !== "in_pipeline", opened: false, replied: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-lg flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={TIER_BADGE_VARIANT[lead.tier]}>
                {TIER_META[lead.tier].emoji} {TIER_META[lead.tier].label} · score {lead.score}
              </Badge>
              <Badge variant={STATUS_BADGE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
            </div>
            <h2 className="mt-2 text-base font-bold text-[var(--text-primary)]">{lead.name}</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{lead.category} · {lead.city}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Rating</p>
              {lead.rating ? (
                <div className="mt-1 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                  <span className="text-base font-bold text-[var(--text-primary)]">{lead.rating.toFixed(1)}</span>
                </div>
              ) : (
                <span className="text-base font-bold text-[var(--text-muted)]">—</span>
              )}
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Reviews</p>
              <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{lead.reviews || 0}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Gap Score</p>
              <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{lead.score}/100</p>
            </div>
          </div>

          {/* Gap analysis */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Gap Analysis</p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">Higher gap score = more opportunity for outreach.</p>
            <div className="mt-2 space-y-2">
              {lead.gaps.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  No major gaps — this lead is well-established. Pitch a higher-touch service.
                </div>
              ) : (
                lead.gaps.map((g) => {
                  const meta = GAP_META[g];
                  const Icon = meta.icon;
                  return (
                    <div key={g} className={`flex items-start gap-3 rounded-2xl border border-[var(--border-color)] p-3 ${meta.bg}`}>
                      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.color}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${meta.color}`}>{meta.label}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{meta.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Contact</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-primary)]">{lead.address}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                {lead.phone ? (
                  <span className="text-xs text-[var(--text-primary)]">{lead.phone}</span>
                ) : (
                  <span className="text-xs font-bold text-[var(--danger)]">Missing — high-friction outreach</span>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2.5">
                <Globe className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                {lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--brand-cyan)] hover:underline">
                    {lead.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs font-bold text-[var(--danger)]">No website — pitch web dev</span>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                {lead.email ? (
                  <span className="text-xs text-[var(--text-primary)]">{lead.email}</span>
                ) : (
                  <span className="text-xs italic text-[var(--text-muted)]">Email not enriched yet — click “Enrich” to scrape website</span>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-2.5">
                {lead.socials?.facebook && <a href={lead.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-cyan)]"><Facebook className="h-4 w-4" /></a>}
                {lead.socials?.instagram && <a href={lead.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-500"><Instagram className="h-4 w-4" /></a>}
                {!lead.socials?.facebook && !lead.socials?.instagram && (
                  <span className="text-xs italic text-[var(--text-muted)]">No social profiles found</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent reviews */}
          {lead.reviews > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent Reviews (mock)</p>
              <div className="mt-2 space-y-2">
                {reviews.map((r, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border-color)] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{r.author}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} className={`h-3 w-3 ${idx < r.rating ? "fill-current text-yellow-500" : "text-[var(--border-color)]"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{r.text}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outreach history */}
          {outreachHistory.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Outreach History</p>
              <div className="mt-2 space-y-2">
                {outreachHistory.map((o, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border-color)] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{o.subject}</p>
                      <Badge variant="default">{o.channel}</Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{new Date(o.date).toLocaleDateString()}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${o.sent ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                        <Check className="h-3 w-3" /> Sent
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${o.opened ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                        <Eye className="h-3 w-3" /> Opened
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${o.replied ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                        <MessageSquare className="h-3 w-3" /> Replied
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-color)] px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" icon={Phone} onClick={() => onMarkContacted?.(lead)} disabled={lead.status !== "new" && lead.status !== "in_pipeline"}>
              Mark Contacted
            </Button>
            <Button variant="primary" size="md" icon={Send} onClick={() => onPush?.(lead)} disabled={lead.status !== "new"}>
              {lead.status === "new" ? "Push to Pipeline" : "Already pushed"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   LEAD SCORE DISTRIBUTION (donut)
============================================================ */
export function LeadScoreDistribution({ leads }) {
  const counts = leads.reduce(
    (acc, l) => {
      acc[l.tier] = (acc[l.tier] || 0) + 1;
      return acc;
    },
    { hot: 0, warm: 0, cold: 0 }
  );

  const total = leads.length || 1;
  const segments = [
    { tier: "hot",  label: "Hot",  count: counts.hot,  color: "var(--danger)" },
    { tier: "warm", label: "Warm", count: counts.warm, color: "var(--brand-gold)" },
    { tier: "cold", label: "Cold", count: counts.cold, color: "var(--brand-cyan)" },
  ];

  let cumulative = 0;
  const arcs = segments.map((s) => {
    const start = (cumulative / total) * 360;
    cumulative += s.count;
    const end = (cumulative / total) * 360;
    return { ...s, start, end };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Score Distribution</CardTitle>
        </div>
        <Badge variant="default">{leads.length} leads</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center">
            <div
              className="relative h-40 w-40 rounded-full"
              style={{
                background: leads.length === 0
                  ? "var(--hover-bg)"
                  : `conic-gradient(${arcs.map((a) => `${a.color} ${a.start}deg ${a.end}deg`).join(", ")})`,
              }}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-[var(--bg-card)]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Total</span>
                <span className="text-2xl font-bold text-[var(--text-primary)]">{leads.length}</span>
                <span className="text-[10px] text-[var(--text-muted)]">leads</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.tier} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{TIER_META[s.tier].emoji} {s.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{TIER_META[s.tier === "hot" ? "hot" : s.tier === "warm" ? "warm" : "cold"].label} prospects</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-[var(--text-primary)]">{s.count}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{total > 0 ? Math.round((s.count / total) * 100) : 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   OUTREACH FUNNEL
============================================================ */
export function OutreachFunnel({ leads }) {
  const total = leads.length;
  const pipelined = leads.filter((l) => l.status !== "new").length;
  const contacted = leads.filter((l) => ["contacted", "replied", "converted"].includes(l.status)).length;
  const replied   = leads.filter((l) => ["replied", "converted"].includes(l.status)).length;
  const converted = leads.filter((l) => l.status === "converted").length;

  const stages = [
    { label: "Discovered",  value: total,     color: "var(--brand-cyan)" },
    { label: "In Pipeline", value: pipelined, color: "var(--brand-gold)" },
    { label: "Contacted",   value: contacted, color: "var(--brand-gold)" },
    { label: "Replied",     value: replied,   color: "var(--success)" },
    { label: "Converted",   value: converted, color: "var(--success)" },
  ];

  const max = total || 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Outreach Funnel</CardTitle>
        </div>
        <Badge variant="cyan">{total > 0 ? Math.round((converted / total) * 100) : 0}% conversion</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((s, i) => {
            const pct = (s.value / max) * 100;
            const dropoff = i > 0 ? stages[i - 1].value - s.value : 0;
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{s.value}</span>
                    {i > 0 && dropoff > 0 && (
                      <span className="text-[10px] font-bold text-[var(--danger)]">−{dropoff}</span>
                    )}
                  </div>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-lg bg-[var(--hover-bg)]">
                  <div
                    className="h-3 rounded-lg transition-all"
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   TOAST STACK
============================================================ */
export function LeadGenToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Sparkles;
        const color = t.kind === "success" ? "text-[var(--success)]" : t.kind === "error" ? "text-[var(--danger)]" : "text-[var(--brand-gold)]";
        const border = t.kind === "success" ? "border-green-500/30" : t.kind === "error" ? "border-red-500/30" : "border-[var(--brand-gold-border)]";
        return (
          <div key={t.id} className={`flex items-start gap-3 rounded-2xl border ${border} bg-[var(--bg-card)] p-3 shadow-2xl`}>
            <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{t.description}</p>}
            </div>
            <button onClick={() => onDismiss?.(t.id)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */
export function LeadGenEmptyState({ onSwitchToDiscovery }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
          <Search className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">No leads yet in your pipeline</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Use the Lead Generator to discover local businesses from Google Maps with digital gaps you can solve.
        </p>
        <div className="mt-4">
          <Button variant="primary" icon={Search} onClick={onSwitchToDiscovery}>
            Open Lead Generator
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
