import { useState } from "react";

import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  DollarSign,
  Download,
  Eye,
  FileText,
  Flag,
  Gauge,
  Globe,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Plus,
  Presentation,
  Rocket,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Users2,
  Video,
  X,
  Zap,
} from "lucide-react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "../ui";

const formatPercent = (value, signed = false) => {
  if (value === null || value === undefined) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(value >= 10 ? 0 : 1)}%`;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const STATUS_BADGE = {
  completed: "success",
  "on-track": "success",
  on_track: "success",
  "at-risk": "warning",
  at_risk: "warning",
  delayed: "danger",
  planning: "default",
  active: "info",
  paused: "warning",
};

const STATUS_LABEL = {
  "on-track": "On Track",
  on_track: "On Track",
  "at-risk": "At Risk",
  at_risk: "At Risk",
  completed: "Completed",
  delayed: "Delayed",
  planning: "Planning",
  active: "Active",
  paused: "Paused",
};

/* ============================================================
   HEADER
============================================================ */
export function StrategicPlanningHeader({ onExportStrategy, onCreateOKR, onSchedulePlanning, quarter, onQuarterChange }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span>Strategic & Capital</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--brand-gold)]">Strategic Planning</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Strategic Planning</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Vision, OKRs, initiatives, and the strategic operating system for the enterprise.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={quarter}
          onChange={(e) => onQuarterChange?.(e.target.value)}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
        >
          <option value="Q2-2026">Q2 2026 (current)</option>
          <option value="Q1-2026">Q1 2026</option>
          <option value="Q4-2025">Q4 2025</option>
          <option value="FY-2026">FY 2026 (annual)</option>
        </select>
        <Button variant="secondary" size="md" icon={Download} onClick={onExportStrategy}>
          Export Strategy Deck
        </Button>
        <Button variant="secondary" size="md" icon={Calendar} onClick={onSchedulePlanning}>
          Schedule Review
        </Button>
        <Button variant="primary" size="md" icon={Plus} onClick={onCreateOKR}>
          New Objective
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   VISION / MISSION / NORTH STAR
============================================================ */
export function VisionMissionBanner({ vision }) {
  return (
    <Card className="overflow-hidden border-[var(--brand-gold-border)] bg-gradient-to-br from-[var(--brand-gold-soft)] via-[var(--bg-card)] to-[var(--brand-cyan-soft)]">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-[var(--brand-gold)]">
              <Compass className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Vision</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">{vision.vision}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[var(--brand-cyan)]">
              <Flag className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Mission</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--text-secondary)]">{vision.mission}</p>
          </div>
          <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2 text-[var(--brand-gold)]">
              <Star className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">North Star Metric</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{vision.northStarValue}</p>
            <p className="text-xs font-medium text-[var(--text-muted)]">{vision.northStarLabel}</p>
            <div className="mt-2 flex items-center gap-1 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" />
              <span className="font-semibold text-[var(--success)]">{formatPercent(vision.northStarDelta, true)}</span>
              <span className="text-[var(--text-muted)]">vs target</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   STRATEGIC AI INSIGHTS BANNER
============================================================ */
export function StrategicInsightsBanner({ insights }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-cyan)]">Strategic AI</p>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{insights.theme}</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{insights.summary}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recommended Actions</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {insights.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-gold)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   KPI GRID
============================================================ */
const KPI_ICON_MAP = {
  gold: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]",
  cyan: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-red-500/20",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
};

function KPICard({ label, value, subline, icon: Icon, color = "gold", progress }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <h3 className="mt-3 truncate text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">{subline}</p>
          </div>
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${KPI_ICON_MAP[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof progress === "number" && (
          <div className="mt-4 h-1.5 rounded-full bg-[var(--hover-bg)]">
            <div className="h-1.5 rounded-full bg-[var(--brand-gold)]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StrategicKPIGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KPICard label="OKRs On Track" value={`${kpis.onTrackOKRs}/${kpis.totalOKRs}`} subline={`${formatPercent((kpis.onTrackOKRs / kpis.totalOKRs) * 100)} of objectives`} icon={Target} color="success" progress={(kpis.onTrackOKRs / kpis.totalOKRs) * 100} />
      <KPICard label="Initiative Progress" value={formatPercent(kpis.initiativeProgress)} subline={`${kpis.activeInitiatives} active initiatives`} icon={Rocket} color="cyan" progress={kpis.initiativeProgress} />
      <KPICard label="Strategic Alignment" value={`${kpis.alignmentScore}`} subline="Goals ↔ Initiatives" icon={Crosshair} color="gold" progress={kpis.alignmentScore} />
      <KPICard label="Market Position" value={`#${kpis.marketRank}`} subline={`${formatPercent(kpis.marketShare)} share`} icon={Award} color="gold" />
      <KPICard label="Risk Index" value={kpis.riskLevel} subline={`${kpis.openRisks} open risks`} icon={Shield} color={kpis.riskLevel === "Low" ? "success" : kpis.riskLevel === "Medium" ? "warning" : "danger"} />
      <KPICard label="Employee NPS" value={`${kpis.eNPS}`} subline={`${formatPercent(kpis.eNPSDelta, true)} QoQ`} icon={Users} color="cyan" />
    </div>
  );
}

/* ============================================================
   OKR TRACKER
============================================================ */
export function OKRTracker({ objectives, onSelectObjective }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>OKR Tracker · This Quarter</CardTitle>
        </div>
        <Badge variant="default">{objectives.length} objectives</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {objectives.map((obj) => {
          const krProgress = obj.keyResults.length
            ? obj.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / obj.keyResults.length
            : 0;
          return (
            <div
              key={obj.id}
              className="cursor-pointer rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]"
              onClick={() => onSelectObjective?.(obj)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="premium">{obj.theme}</Badge>
                    <Badge variant={STATUS_BADGE[obj.status]}>{STATUS_LABEL[obj.status] || obj.status}</Badge>
                  </div>
                  <h4 className="mt-2 text-base font-bold text-[var(--text-primary)]">{obj.title}</h4>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {obj.owner} · Due {formatDate(obj.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{krProgress.toFixed(0)}%</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Avg KR progress</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3">
                {obj.keyResults.map((kr) => (
                  <div key={kr.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-[var(--text-secondary)]">{kr.title}</span>
                      <span className="font-bold text-[var(--text-primary)]">{kr.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                      <div
                        className={`h-1.5 rounded-full ${
                          kr.progress >= 80
                            ? "bg-[var(--success)]"
                            : kr.progress >= 50
                            ? "bg-[var(--brand-gold)]"
                            : "bg-[var(--danger)]"
                        }`}
                        style={{ width: `${kr.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   STRATEGIC INITIATIVES (KANBAN)
============================================================ */
const COLUMN_META = {
  planning: { label: "Planning", color: "bg-slate-400" },
  active: { label: "In Progress", color: "bg-[var(--brand-cyan)]" },
  "at-risk": { label: "At Risk", color: "bg-[var(--danger)]" },
  completed: { label: "Completed", color: "bg-[var(--success)]" },
};

export function InitiativesBoard({ initiatives, onSelectInitiative }) {
  const columns = ["planning", "active", "at-risk", "completed"];
  const grouped = columns.reduce((acc, col) => {
    acc[col] = initiatives.filter((i) => i.status === col);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Strategic Initiatives</CardTitle>
        </div>
        <Badge variant="cyan">{initiatives.length} active</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="flex min-w-max gap-4 p-5">
          {columns.map((col) => {
            const meta = COLUMN_META[col];
            return (
              <div key={col} className="w-72 flex-shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{meta.label}</span>
                  <span className="ml-auto rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {grouped[col].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[col].length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-center text-xs text-[var(--text-muted)]">
                      No initiatives
                    </div>
                  ) : (
                    grouped[col].map((init) => (
                      <div
                        key={init.id}
                        onClick={() => onSelectInitiative?.(init)}
                        className="cursor-pointer rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-sm font-bold text-[var(--text-primary)]">{init.name}</h5>
                          <Badge variant={init.priority === "P0" ? "danger" : init.priority === "P1" ? "warning" : "default"}>
                            {init.priority}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{init.description}</p>
                        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-2 text-[10px] text-[var(--text-muted)]">
                          <span>{init.owner}</span>
                          <span>{formatCurrency(init.budget)}</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                            <span>Progress</span>
                            <span className="font-bold text-[var(--text-primary)]">{init.progress}%</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-[var(--hover-bg)]">
                            <div className="h-1 rounded-full bg-[var(--brand-cyan)]" style={{ width: `${init.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
   SWOT MATRIX
============================================================ */
const SWOT_META = {
  strengths: { label: "Strengths", color: "var(--success)", soft: "var(--success-soft)", icon: TrendingUp },
  weaknesses: { label: "Weaknesses", color: "var(--danger)", soft: "var(--danger-soft)", icon: TrendingDown },
  opportunities: { label: "Opportunities", color: "var(--brand-cyan)", soft: "var(--brand-cyan-soft)", icon: Lightbulb },
  threats: { label: "Threats", color: "var(--brand-gold)", soft: "var(--brand-gold-soft)", icon: AlertTriangle },
};

export function SWOTMatrix({ swot }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>SWOT Analysis</CardTitle>
        </div>
        <Badge variant="default">Updated quarterly</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Object.entries(SWOT_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const items = swot[key] || [];
            return (
              <div
                key={key}
                className="rounded-2xl border p-4"
                style={{ borderColor: meta.color, backgroundColor: meta.soft }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--bg-card)]" style={{ color: meta.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</h4>
                  <span className="ml-auto rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-bold" style={{ color: meta.color }}>
                    {items.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-[var(--bg-card)] p-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{item.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   ROADMAP TIMELINE
============================================================ */
export function RoadmapTimeline({ roadmap }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Annual Strategic Roadmap</CardTitle>
        </div>
        <Badge variant="cyan">FY 2026</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((q) => (
            <div key={q.quarter} className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[var(--text-primary)]">{q.quarter}</h4>
                <Badge variant={q.status === "completed" ? "success" : q.status === "active" ? "info" : "default"}>
                  {q.status === "completed" ? "Done" : q.status === "active" ? "In Flight" : "Planned"}
                </Badge>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">{q.theme}</p>
              <div className="mt-3 space-y-2">
                {q.milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {m.done ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--success)]" />
                    ) : (
                      <div className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-[var(--border-color)]" />
                    )}
                    <p className={`text-xs ${m.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"}`}>
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   COMPETITIVE LANDSCAPE
============================================================ */
export function CompetitiveLandscape({ competitors }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Competitive Landscape</CardTitle>
        </div>
        <Badge variant="gold">PH Enterprise SaaS</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                {["Competitor", "Position", "Share", "Strength", "Weakness", "Threat"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {competitors.map((c) => (
                <tr key={c.name} className="transition-colors hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-xs font-bold text-[var(--text-primary)]">
                        {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{c.hq}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.position === "Leader" ? "premium" : c.position === "Challenger" ? "info" : "default"}>
                      {c.position}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{formatPercent(c.share)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{c.strength}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{c.weakness}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.threat === "High" ? "danger" : c.threat === "Medium" ? "warning" : "success"}>
                      {c.threat}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   RISK REGISTER
============================================================ */
export function RiskRegister({ risks }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[var(--danger)]" />
          <CardTitle>Risk Register</CardTitle>
        </div>
        <Badge variant="danger">{risks.filter((r) => r.severity === "High").length} high severity</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                {["Risk", "Category", "Likelihood", "Impact", "Severity", "Owner", "Mitigation"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {risks.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{r.category}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{r.likelihood}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{r.impact}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.severity === "High" ? "danger" : r.severity === "Medium" ? "warning" : "default"}>
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{r.owner}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   MARKET OPPORTUNITIES
============================================================ */
export function MarketOpportunities({ opportunities }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Market Opportunities</CardTitle>
        </div>
        <Badge variant="cyan">{opportunities.length} identified</Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((o) => (
          <div key={o.area} className="rounded-2xl border border-[var(--border-color)] p-4">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{o.area}</h4>
              <Badge variant={o.fit === "Strong" ? "success" : o.fit === "Moderate" ? "warning" : "default"}>{o.fit} fit</Badge>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{o.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border-color)] pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">TAM</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(o.tam)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Window</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{o.timeline}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   STAKEHOLDER MAP
============================================================ */
export function StakeholderMap({ stakeholders }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Stakeholder Map</CardTitle>
        </div>
        <Badge variant="default">Power · Interest grid</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "high-high", label: "Manage Closely", subtitle: "High Power · High Interest", color: "var(--success)", soft: "var(--success-soft)" },
            { key: "high-low", label: "Keep Satisfied", subtitle: "High Power · Low Interest", color: "var(--brand-gold)", soft: "var(--brand-gold-soft)" },
            { key: "low-high", label: "Keep Informed", subtitle: "Low Power · High Interest", color: "var(--brand-cyan)", soft: "var(--brand-cyan-soft)" },
            { key: "low-low", label: "Monitor", subtitle: "Low Power · Low Interest", color: "var(--text-muted)", soft: "var(--hover-bg)" },
          ].map((quad) => {
            const list = stakeholders[quad.key] || [];
            return (
              <div key={quad.key} className="rounded-2xl border p-4" style={{ borderColor: quad.color, backgroundColor: quad.soft }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: quad.color }}>{quad.label}</h4>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: quad.color, opacity: 0.7 }}>{quad.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-bold" style={{ color: quad.color }}>
                    {list.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {list.map((s, i) => (
                    <li key={i} className="rounded-lg bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-primary)]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   OKR BURNDOWN CHART (SVG mockup)
============================================================ */
export function OKRBurndownChart({ data }) {
  const W = 600;
  const H = 220;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i) => PAD_L + (i / (data.length - 1)) * innerW;
  const y = (v) => PAD_T + (1 - v / 100) * innerH;

  const idealPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.ideal)}`).join(" ");
  const actualPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.actual)}`).join(" ");
  const actualArea = `${actualPath} L ${x(data.length - 1)} ${PAD_T + innerH} L ${x(0)} ${PAD_T + innerH} Z`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>OKR Burn-up · Quarterly Progress</CardTitle>
        </div>
        <Badge variant="cyan">Actual vs Ideal</Badge>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="okr-actual-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((p, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(p)} y2={y(p)} stroke="var(--border-color)" strokeDasharray="2 4" strokeWidth="1" />
              <text x={PAD_L - 8} y={y(p) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{p}%</text>
            </g>
          ))}

          {/* Ideal line */}
          <path d={idealPath} fill="none" stroke="var(--brand-cyan)" strokeDasharray="6 4" strokeWidth="1.5" />

          {/* Actual area + line */}
          <path d={actualArea} fill="url(#okr-actual-gradient)" />
          <path d={actualPath} fill="none" stroke="var(--brand-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.actual)} r="3.5" fill="var(--bg-card)" stroke="var(--brand-gold)" strokeWidth="2" />
              <text x={x(i)} y={H - PAD_B + 16} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{d.week}</text>
            </g>
          ))}
        </svg>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-[var(--brand-cyan)]" style={{ backgroundImage: "repeating-linear-gradient(to right, var(--brand-cyan) 0 4px, transparent 4px 7px)" }} />
            Ideal pace
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-[var(--brand-gold)]" />
            Actual progress
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   STRATEGIC METRICS HEALTH
============================================================ */
export function StrategicHealthDashboard({ pillars }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Strategic Pillar Health</CardTitle>
        </div>
        <Badge variant="cyan">Quarterly</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {pillars.map((p) => (
          <div key={p.name} className="rounded-2xl border border-[var(--border-color)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{p.name}</h4>
                <p className="text-xs text-[var(--text-muted)]">{p.metric}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.status === "healthy" ? "success" : p.status === "watch" ? "warning" : "danger"}>
                  {p.status === "healthy" ? "Healthy" : p.status === "watch" ? "Watch" : "Critical"}
                </Badge>
                <span className="text-base font-bold text-[var(--text-primary)]">{p.value}</span>
              </div>
            </div>
            <div className="mt-2">
              <Progress value={p.score} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   OBJECTIVE DETAIL DRAWER
============================================================ */
export function ObjectiveDetailDrawer({ objective, onClose }) {
  if (!objective) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-md flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="premium">{objective.theme}</Badge>
              <Badge variant={STATUS_BADGE[objective.status]}>{STATUS_LABEL[objective.status] || objective.status}</Badge>
            </div>
            <h2 className="mt-2 text-base font-bold text-[var(--text-primary)]">{objective.title}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {objective.owner} · Due {formatDate(objective.dueDate)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Why this matters</p>
            <p className="mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {objective.rationale}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Key Results ({objective.keyResults.length})</p>
            <div className="mt-2 space-y-2">
              {objective.keyResults.map((kr) => (
                <div key={kr.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--text-primary)]">{kr.title}</p>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{kr.progress}%</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Target: {kr.target} · Owner: {kr.owner}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--hover-bg)]">
                    <div
                      className={`h-1.5 rounded-full ${
                        kr.progress >= 80
                          ? "bg-[var(--success)]"
                          : kr.progress >= 50
                          ? "bg-[var(--brand-gold)]"
                          : "bg-[var(--danger)]"
                      }`}
                      style={{ width: `${kr.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Linked Initiatives</p>
            <div className="mt-2 space-y-1">
              {objective.linkedInitiatives.map((init, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2">
                  <Zap className="h-3.5 w-3.5 text-[var(--brand-cyan)]" />
                  <span className="text-xs text-[var(--text-primary)]">{init}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] px-5 py-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" icon={Eye} className="flex-1">View history</Button>
            <Button variant="primary" size="md" icon={Activity} className="flex-1">Update progress</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   TOAST
============================================================ */
export function ToastStack({ toasts, onDismiss }) {
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
   SHARED MODAL SHELL
============================================================ */
function ModalShell({ open, onClose, title, subtitle, icon: Icon, footer, children, maxWidth = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-[var(--border-color)] bg-[var(--hover-bg)] px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   NEW OBJECTIVE MODAL
============================================================ */
const OBJ_THEMES = [
  { id: "growth", label: "Growth", color: "text-[var(--success)]" },
  { id: "product", label: "Product", color: "text-[var(--brand-cyan)]" },
  { id: "market", label: "Market", color: "text-[var(--brand-gold)]" },
  { id: "people", label: "People", color: "text-purple-500" },
  { id: "operations", label: "Operations", color: "text-orange-500" },
  { id: "capital", label: "Capital", color: "text-[var(--brand-cyan)]" },
];

const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "FY 2026", "FY 2027"];

export function NewObjectiveModal({ open, onClose, onCreate, owners = [] }) {
  const [theme, setTheme] = useState("growth");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(owners[0] || "");
  const [quarter, setQuarter] = useState("Q2 2026");
  const [rationale, setRationale] = useState("");
  const [keyResults, setKeyResults] = useState([
    { id: 1, title: "", target: "", owner: "" },
    { id: 2, title: "", target: "", owner: "" },
    { id: 3, title: "", target: "", owner: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addKR = () => setKeyResults((arr) => [...arr, { id: Date.now(), title: "", target: "", owner: "" }]);
  const removeKR = (id) => setKeyResults((arr) => arr.filter((k) => k.id !== id));
  const updateKR = (id, field, value) =>
    setKeyResults((arr) => arr.map((k) => (k.id === id ? { ...k, [field]: value } : k)));

  const validKRs = keyResults.filter((k) => k.title.trim());
  const canSave = title.trim() && owner.trim() && validKRs.length >= 2;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1100));
    setIsSaving(false);
    onCreate?.({ theme, title, owner, quarter, rationale, keyResults: validKRs });
    onClose?.();
    setTitle("");
    setRationale("");
    setKeyResults([
      { id: 1, title: "", target: "", owner: "" },
      { id: 2, title: "", target: "", owner: "" },
      { id: 3, title: "", target: "", owner: "" },
    ]);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="New Objective"
      subtitle="OKR-style: one bold objective, 2–5 measurable key results"
      icon={Target}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {validKRs.length} key results · {quarter}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Save} onClick={onClose}>Save draft</Button>
            <Button variant="primary" icon={isSaving ? Loader2 : Target} loading={isSaving} onClick={handleSave} disabled={!canSave}>
              {isSaving ? "Saving…" : "Create objective"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme</p>
          <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
            {OBJ_THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`rounded-2xl border px-3 py-2 text-center transition-all ${
                    active
                      ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <span className={`text-xs font-semibold ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Objective title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Become the category leader in PH enterprise AI"
            className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g., Maya Reyes (COO)"
              list="owners-list"
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            {owners.length > 0 && (
              <datalist id="owners-list">
                {owners.map((o) => <option key={o} value={o} />)}
              </datalist>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Time horizon</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            >
              {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Why this matters (rationale)</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder="What strategic outcome does this objective unlock? Why now?"
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Key results</p>
            <button onClick={addKR} className="text-xs font-semibold text-[var(--brand-gold)] hover:underline">+ Add another</button>
          </div>
          <div className="mt-2 space-y-2">
            {keyResults.map((k, idx) => (
              <div key={k.id} className="rounded-2xl border border-[var(--border-color)] p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-[10px] font-bold text-[var(--brand-gold)]">
                    KR{idx + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
                    <input
                      type="text"
                      value={k.title}
                      onChange={(e) => updateKR(k.id, "title", e.target.value)}
                      placeholder="Key result title"
                      className="md:col-span-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
                    />
                    <input
                      type="text"
                      value={k.target}
                      onChange={(e) => updateKR(k.id, "target", e.target.value)}
                      placeholder="Target (e.g., ≥ 90%)"
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
                    />
                  </div>
                  {keyResults.length > 1 && (
                    <button onClick={() => removeKR(k.id)} className="mt-2 text-[var(--text-muted)] hover:text-[var(--danger)]">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">Minimum 2 measurable key results required.</p>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   SCHEDULE REVIEW MODAL
============================================================ */
const REVIEW_TYPES = [
  { id: "weekly", label: "Weekly Check-in", icon: Clock, duration: 30 },
  { id: "monthly", label: "Monthly Review", icon: Calendar, duration: 60 },
  { id: "quarterly", label: "Quarterly Review", icon: Target, duration: 120 },
  { id: "annual", label: "Annual Planning", icon: Compass, duration: 240 },
  { id: "retro", label: "OKR Retrospective", icon: Eye, duration: 90 },
];

const REVIEW_ATTENDEES = [
  "Executive Team",
  "Department Heads",
  "Board of Directors",
  "All Hands",
  "Strategic Planning Council",
  "OKR Champions",
];

export function ScheduleReviewModal({ open, onClose, onSchedule }) {
  const [reviewType, setReviewType] = useState("quarterly");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(120);
  const [attendees, setAttendees] = useState(["Executive Team"]);
  const [agenda, setAgenda] = useState([
    "Q2 OKR scorecard review",
    "Initiative status & roadblocks",
    "SWOT refresh",
    "Q3 priorities alignment",
  ]);
  const [agendaInput, setAgendaInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const toggleAttendee = (a) =>
    setAttendees((arr) => (arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]));

  const addAgendaItem = () => {
    const v = agendaInput.trim();
    if (!v) return;
    setAgenda((arr) => [...arr, v]);
    setAgendaInput("");
  };

  const removeAgendaItem = (i) => setAgenda((arr) => arr.filter((_, idx) => idx !== i));

  const handleSchedule = async () => {
    setIsScheduling(true);
    await new Promise((r) => setTimeout(r, 1100));
    setIsScheduling(false);
    onSchedule?.({ reviewType, title, date, time, duration, attendees, agenda, notes });
    onClose?.();
    setTitle("");
    setDate("");
    setTime("");
  };

  const canSchedule = title.trim() && date && time && attendees.length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Schedule Strategic Review"
      subtitle="Set the cadence for OKR check-ins and planning sessions"
      icon={Calendar}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {attendees.length} attendee groups · {agenda.length} agenda items
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={isScheduling ? Loader2 : Calendar} loading={isScheduling} onClick={handleSchedule} disabled={!canSchedule}>
              {isScheduling ? "Scheduling…" : "Schedule review"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Review type</p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
            {REVIEW_TYPES.map((m) => {
              const Icon = m.icon;
              const active = reviewType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setReviewType(m.id); setDuration(m.duration); }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-[11px] font-semibold text-center ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Review title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q2 2026 Strategic Review"
            className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]">
              {[30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Attendees</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEW_ATTENDEES.map((a) => {
              const active = attendees.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAttendee(a)}
                  className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border ${active ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]" : "border-[var(--border-color)]"}`}>
                    {active && <Check className="h-3 w-3 text-[#050816]" />}
                  </div>
                  <span className={`text-sm ${active ? "font-semibold text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>{a}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Agenda</p>
          <ul className="mt-2 space-y-1">
            {agenda.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold-soft)] text-[10px] font-bold text-[var(--brand-gold)]">{i + 1}</span>
                <span className="flex-1 text-[var(--text-primary)]">{a}</span>
                <button onClick={() => removeAgendaItem(i)} className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={agendaInput}
              onChange={(e) => setAgendaInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAgendaItem(); } }}
              placeholder="Add agenda item and press Enter"
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            <Button variant="secondary" size="md" icon={Plus} onClick={addAgendaItem}>Add</Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Pre-read / notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Materials to review beforehand…"
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   EXPORT STRATEGY DECK MODAL
============================================================ */
const STRATEGY_TEMPLATES = [
  { id: "quarterly", label: "Quarterly Review", desc: "OKR scorecard, initiative status, learnings", recommended: true },
  { id: "annual", label: "Annual Planning", desc: "Vision, themes, roadmap, north-star metrics" },
  { id: "board", label: "Board Strategy", desc: "Strategic posture, risks, market dynamics" },
  { id: "okr", label: "OKR Status Report", desc: "Just the OKR section, exec-ready" },
  { id: "custom", label: "Custom", desc: "Pick the exact sections you want" },
];

const STRATEGY_SECTIONS = [
  { id: "vision", label: "Vision & Mission", default: true },
  { id: "kpis", label: "Strategic KPIs", default: true },
  { id: "okrs", label: "OKR Scorecard", default: true },
  { id: "initiatives", label: "Initiatives Board", default: true },
  { id: "swot", label: "SWOT Analysis", default: true },
  { id: "roadmap", label: "Annual Roadmap", default: true },
  { id: "competitive", label: "Competitive Landscape", default: false },
  { id: "opportunities", label: "Market Opportunities", default: false },
  { id: "stakeholders", label: "Stakeholder Map", default: false },
  { id: "risks", label: "Risk Register", default: false },
  { id: "health", label: "Pillar Health", default: true },
];

export function ExportStrategyDeckModal({ open, onClose, onExport }) {
  const [template, setTemplate] = useState("quarterly");
  const [audience, setAudience] = useState("board");
  const [sections, setSections] = useState(() => Object.fromEntries(STRATEGY_SECTIONS.map((s) => [s.id, s.default])));
  const [isGenerating, setIsGenerating] = useState(false);

  const enabledCount = Object.values(sections).filter(Boolean).length;
  const toggleSection = (id) => setSections((s) => ({ ...s, [id]: !s[id] }));

  const handleExport = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setIsGenerating(false);
    const fileName = `Strategy_Deck_${template}_${new Date().toISOString().slice(0, 10)}.pdf`;
    onExport?.({ template, audience, sections, fileName, sectionCount: enabledCount });
    onClose?.();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Export Strategy Deck"
      subtitle="Polished PDF for the boardroom, the team, or the public"
      icon={Download}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {enabledCount} sections · {audience === "public" ? "Public-safe" : audience === "all" ? "All hands" : audience === "exec" ? "Executive team" : "Board-only"}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={isGenerating ? Loader2 : Download} loading={isGenerating} onClick={handleExport} disabled={enabledCount === 0}>
              {isGenerating ? "Generating…" : "Generate PDF"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Template</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STRATEGY_TEMPLATES.map((t) => {
              const active = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`flex items-start gap-2 rounded-2xl border p-3 text-left transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${active ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]" : "border-[var(--border-color)]"}`}>
                    {active && <Check className="h-3 w-3 text-[#050816]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</p>
                      {t.recommended && <Badge variant="premium">Recommended</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Audience</p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { id: "board", label: "Board-only", icon: Lock },
              { id: "exec", label: "Executive team", icon: Users2 },
              { id: "all", label: "All hands", icon: Users },
              { id: "public", label: "Public-safe", icon: Globe },
            ].map((a) => {
              const Icon = a.icon;
              const active = audience === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-xs font-semibold ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sections to include</p>
            <button onClick={() => setSections(Object.fromEntries(STRATEGY_SECTIONS.map((s) => [s.id, true])))} className="text-xs font-semibold text-[var(--brand-gold)] hover:underline">
              Select all
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STRATEGY_SECTIONS.map((s) => {
              const active = sections[s.id];
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                    active ? "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)]" : "border-[var(--border-color)]"
                  }`}
                >
                  <input type="checkbox" checked={active} onChange={() => toggleSection(s.id)} className="h-4 w-4 accent-[var(--brand-gold)]" />
                  <span className={`text-sm ${active ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{s.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   INITIATIVE DETAIL DRAWER
============================================================ */
const INITIATIVE_STATUS_BADGE = {
  active: "info",
  planning: "default",
  "at-risk": "warning",
  completed: "success",
};

const INITIATIVE_STATUS_LABEL = {
  active: "In Progress",
  planning: "Planning",
  "at-risk": "At Risk",
  completed: "Completed",
};

const DEFAULT_MILESTONES = [
  { label: "Discovery & scoping", threshold: 0 },
  { label: "Design & alignment", threshold: 25 },
  { label: "Build & integrate", threshold: 50 },
  { label: "Pilot & validate", threshold: 75 },
  { label: "Roll out & measure", threshold: 100 },
];

const ACTIVITY_TYPE_META = {
  update: { icon: FileText, bg: "bg-[var(--brand-cyan-soft)]", color: "text-[var(--brand-cyan)]", label: "Status update" },
  win:    { icon: CheckCircle2, bg: "bg-[var(--success-soft)]", color: "text-[var(--success)]", label: "Win" },
  risk:   { icon: AlertTriangle, bg: "bg-[var(--danger-soft)]", color: "text-[var(--danger)]", label: "Risk" },
  kickoff:{ icon: Rocket, bg: "bg-[var(--brand-gold-soft)]", color: "text-[var(--brand-gold)]", label: "Kickoff" },
  milestone: { icon: Target, bg: "bg-[var(--brand-gold-soft)]", color: "text-[var(--brand-gold)]", label: "Milestone" },
};

const STATUS_OPTIONS = [
  { id: "planning", label: "Planning", color: "bg-slate-400" },
  { id: "active", label: "In Progress", color: "bg-[var(--brand-cyan)]" },
  { id: "at-risk", label: "At Risk", color: "bg-[var(--danger)]" },
  { id: "completed", label: "Completed", color: "bg-[var(--success)]" },
];

const FILE_TYPE_META = {
  pdf:   { color: "text-red-500",   bg: "bg-red-500/10",    label: "PDF" },
  doc:   { color: "text-blue-500",  bg: "bg-blue-500/10",   label: "DOC" },
  xls:   { color: "text-green-500", bg: "bg-green-500/10",  label: "XLS" },
  ppt:   { color: "text-orange-500",bg: "bg-orange-500/10", label: "PPT" },
  png:   { color: "text-purple-500",bg: "bg-purple-500/10", label: "PNG" },
  fig:   { color: "text-pink-500",  bg: "bg-pink-500/10",   label: "FIG" },
  notion:{ color: "text-slate-400", bg: "bg-slate-400/10",  label: "DOC" },
};

const DEFAULT_INITIATIVE_FILES = [
  { id: 1, name: "Project Brief & Charter.pdf",      type: "pdf",   size: "2.4 MB", modified: "2026-05-08", author: "PM Lead",       category: "Planning" },
  { id: 2, name: "Stakeholder Map.xlsx",             type: "xls",   size: "184 KB", modified: "2026-04-30", author: "Chief of Staff",category: "Planning" },
  { id: 3, name: "Solution Architecture v2.fig",     type: "fig",   size: "8.1 MB", modified: "2026-05-14", author: "Design Lead",   category: "Design" },
  { id: 4, name: "Vendor Quotes (3 vendors).pdf",    type: "pdf",   size: "1.6 MB", modified: "2026-04-22", author: "Procurement",   category: "Vendors" },
  { id: 5, name: "Risk Register.xlsx",               type: "xls",   size: "92 KB",  modified: "2026-05-12", author: "PM Lead",       category: "Risk" },
  { id: 6, name: "Executive Update — Q2.pptx",       type: "ppt",   size: "5.7 MB", modified: "2026-05-15", author: "Owner",         category: "Comms" },
  { id: 7, name: "Customer Discovery Notes.notion",  type: "notion",size: "—",      modified: "2026-05-02", author: "PM Lead",       category: "Research" },
  { id: 8, name: "Pricing Tier Mockups.png",         type: "png",   size: "3.2 MB", modified: "2026-05-10", author: "Design Lead",   category: "Design" },
];

const DEFAULT_DEPENDENCIES = [
  { id: 1, name: "AI Command Bar v1",            status: "active",    blocking: false },
  { id: 2, name: "Vector Embedding Migration",   status: "active",    blocking: true  },
  { id: 3, name: "Internal Tools Refactor",      status: "completed", blocking: false },
];

const DEFAULT_TEAM = [
  { name: "Maya Reyes",      role: "Initiative Lead",    initials: "MR" },
  { name: "Karlo Estrella",  role: "Engineering Sponsor", initials: "KE" },
  { name: "Anika Reyes",     role: "Stakeholder Liaison", initials: "AR" },
  { name: "Camille Salvador",role: "GTM Partner",        initials: "CS" },
];

export function InitiativeDetailDrawer({ initiative, onClose, onUpdate }) {
  const [progress, setProgress] = useState(initiative?.progress ?? 0);
  const [status, setStatus] = useState(initiative?.status ?? "planning");
  const [milestones, setMilestones] = useState(() =>
    DEFAULT_MILESTONES.map((m) => ({ ...m, done: (initiative?.progress ?? 0) >= m.threshold && m.threshold > 0 ? true : m.threshold === 0 }))
  );
  const [activity, setActivity] = useState([
    { date: "2026-05-12", title: "Weekly status update posted", type: "update" },
    { date: "2026-05-04", title: "Milestone unblocked: vendor onboarding complete", type: "win" },
    { date: "2026-04-22", title: "Risk flagged: timeline compressed by 2 weeks", type: "risk" },
    { date: "2026-04-10", title: "Kickoff session with cross-functional team", type: "kickoff" },
  ]);

  const [postOpen, setPostOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [updateType, setUpdateType] = useState("update");
  const [updateText, setUpdateText] = useState("");
  const [draftProgress, setDraftProgress] = useState(progress);

  if (!initiative) return null;

  const isComplete = progress >= 100;
  const linkedOKRs = ["Cross $7M ARR with healthy unit economics", "Ship the AI-first command bar"];

  function toggleMilestone(i) {
    setMilestones((arr) => {
      const next = arr.map((m, idx) => (idx === i ? { ...m, done: !m.done } : m));
      const doneCount = next.filter((m) => m.done).length;
      const newProgress = Math.round((doneCount / next.length) * 100);
      setProgress(newProgress);
      onUpdate?.({ id: initiative.id, progress: newProgress });
      return next;
    });
  }

  function changeStatus(newStatus) {
    if (newStatus === status) return;
    setStatus(newStatus);
    const today = new Date().toISOString().slice(0, 10);
    const meta = STATUS_OPTIONS.find((s) => s.id === newStatus);
    setActivity((arr) => [
      { date: today, title: `Status changed to ${meta?.label || newStatus}`, type: "update" },
      ...arr,
    ]);
    onUpdate?.({ id: initiative.id, status: newStatus });
  }

  function submitUpdate() {
    if (!updateText.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    setActivity((arr) => [{ date: today, title: updateText.trim(), type: updateType }, ...arr]);
    setUpdateText("");
    setUpdateType("update");
    setPostOpen(false);
  }

  function submitProgress() {
    const clamped = Math.min(100, Math.max(0, Number(draftProgress) || 0));
    setProgress(clamped);
    setMilestones((arr) => arr.map((m) => ({ ...m, done: clamped >= m.threshold && (m.threshold > 0 || clamped > 0) })));
    const today = new Date().toISOString().slice(0, 10);
    setActivity((arr) => [
      { date: today, title: `Progress updated to ${clamped}%`, type: "milestone" },
      ...arr,
    ]);
    onUpdate?.({ id: initiative.id, progress: clamped });
    setEditOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Click-to-close edge (thin, just shows the dimmed app behind) */}
      <div className="hidden flex-1 bg-black/40 lg:block" onClick={onClose} />

      {/* Files & Resources Preview Panel (replaces the blurred backdrop) */}
      <section className="hidden h-full w-full max-w-xl flex-col border-l border-[var(--border-color)] bg-[var(--bg-app)] shadow-2xl lg:flex">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Initiative Workspace</p>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Files, Activity & Dependencies</h3>
          </div>
          <Badge variant="cyan" className="gap-1">
            <Eye className="h-3 w-3" />
            Preview
          </Badge>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Team */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Team</p>
              <span className="text-[10px] text-[var(--text-muted)]">{DEFAULT_TEAM.length} members</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_TEAM.map((t) => (
                <div key={t.name} className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-[10px] font-bold text-[#050816]">
                    {t.initials}
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)]">{t.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Files & Documents */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Files & Documents</p>
              <button className="flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-gold)] hover:underline">
                <Plus className="h-3 w-3" />
                Upload
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEFAULT_INITIATIVE_FILES.map((f) => {
                const meta = FILE_TYPE_META[f.type] || FILE_TYPE_META.pdf;
                return (
                  <div key={f.id} className="group flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[var(--text-primary)]">{f.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{f.category} · {f.size}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{f.author} · {new Date(f.modified).toLocaleDateString()}</p>
                    </div>
                    <button className="opacity-0 transition-opacity group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--brand-gold)]">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Dependencies</p>
            <div className="mt-2 space-y-2">
              {DEFAULT_DEPENDENCIES.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5">
                  <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${d.blocking ? "text-[var(--danger)]" : "text-[var(--brand-cyan)]"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{d.name}</p>
                    {d.blocking && <p className="text-[10px] font-bold text-[var(--danger)]">BLOCKING</p>}
                  </div>
                  <Badge variant={INITIATIVE_STATUS_BADGE[d.status]}>{INITIATIVE_STATUS_LABEL[d.status]}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Extended Activity Timeline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Activity Timeline</p>
            <div className="mt-2 relative pl-5">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[var(--border-color)]" />
              {activity.map((a, i) => {
                const meta = ACTIVITY_TYPE_META[a.type] || ACTIVITY_TYPE_META.update;
                const Icon = meta.icon;
                return (
                  <div key={i} className="relative mb-3">
                    <div className={`absolute -left-[18px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-[var(--bg-app)] ${meta.bg} ${meta.color}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{a.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{new Date(a.date).toLocaleDateString()} · {meta.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-only click-to-close dim layer (replaces the desktop content panel on small screens) */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />

      <aside className="flex w-full max-w-lg flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={initiative.priority === "P0" ? "danger" : initiative.priority === "P1" ? "warning" : "default"}>{initiative.priority}</Badge>
              <Badge variant={INITIATIVE_STATUS_BADGE[status]}>{INITIATIVE_STATUS_LABEL[status]}</Badge>
              {isComplete && (
                <Badge variant="success" className="gap-1">
                  <Check className="h-3 w-3" />
                  Complete
                </Badge>
              )}
            </div>
            <h2 className="mt-2 text-base font-bold text-[var(--text-primary)]">{initiative.name}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Owner: {initiative.owner}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {isComplete && (
            <div className="overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-[var(--success-soft)] via-[var(--bg-card)] to-[var(--brand-gold-soft)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--success)] text-white shadow-lg shadow-green-500/30">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--success)]">Initiative complete 🎉</p>
                  <p className="text-xs text-[var(--text-secondary)]">All milestones delivered. Time to capture learnings and close out.</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" icon={FileText} className="flex-1">Write retrospective</Button>
                <Button variant="primary" size="sm" icon={Check} className="flex-1" onClick={() => changeStatus("completed")}>Mark as Completed</Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Description</p>
            <p className="mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">{initiative.description}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Status</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_OPTIONS.map((s) => {
                const active = status === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => changeStatus(s.id)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                      active
                        ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]"
                        : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                    }`}
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${s.color}`} />
                    <span className={`truncate text-xs font-semibold ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Budget</p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold text-[var(--text-primary)]">
                <DollarSign className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
                {(initiative.budget / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Progress</p>
              <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{progress}%</p>
              <Progress value={progress} className="mt-1" />
            </div>
          </div>

          {editOpen && (
            <div className="rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-gold)]">Edit progress</p>
                <button onClick={() => setEditOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={draftProgress}
                    onChange={(e) => setDraftProgress(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-[var(--brand-gold)]"
                  />
                  <div className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={draftProgress}
                      onChange={(e) => setDraftProgress(Number(e.target.value))}
                      className="w-12 bg-transparent text-right text-sm font-bold text-[var(--text-primary)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-sm font-bold text-[var(--brand-gold)]">%</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" icon={Check} onClick={submitProgress}>Save</Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Milestones</p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">Click a milestone to toggle done.</p>
            <div className="mt-2 space-y-2">
              {milestones.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleMilestone(i)}
                  className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                    isComplete
                      ? "border-green-500/30 bg-[var(--success-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  {m.done ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  ) : (
                    <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-[var(--border-color)]" />
                  )}
                  <span className={`text-sm ${m.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Linked Objectives</p>
            <div className="mt-2 space-y-1">
              {linkedOKRs.map((o, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] p-2">
                  <Target className="h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)]" />
                  <span className="text-xs text-[var(--text-primary)]">{o}</span>
                </div>
              ))}
            </div>
          </div>

          {postOpen && (
            <div className="rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-cyan)]">Post an update</p>
                <button onClick={() => setPostOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(ACTIVITY_TYPE_META).map(([key, meta]) => {
                  const Icon = meta.icon;
                  const active = updateType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setUpdateType(key)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        active
                          ? `border-current ${meta.color} ${meta.bg}`
                          : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-border)]"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={3}
                placeholder="What happened? Be specific."
                className="mt-2 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan-soft)]"
              />
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setPostOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" className="flex-1" icon={MessageSquare} onClick={submitUpdate} disabled={!updateText.trim()}>Post</Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent activity</p>
            <div className="mt-2 space-y-2">
              {activity.map((a, i) => {
                const meta = ACTIVITY_TYPE_META[a.type] || ACTIVITY_TYPE_META.update;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] p-2">
                    <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)]">{a.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{new Date(a.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] px-5 py-4">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={MessageSquare}
              className="flex-1"
              onClick={() => { setPostOpen((v) => !v); setEditOpen(false); }}
            >
              {postOpen ? "Hide form" : "Post update"}
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Activity}
              className="flex-1"
              onClick={() => { setEditOpen((v) => !v); setPostOpen(false); setDraftProgress(progress); }}
            >
              {editOpen ? "Hide form" : "Edit progress"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
