import { useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Brain,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  Globe,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  PieChart,
  Plus,
  Presentation,
  Save,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Progress } from "../ui";

const formatCurrency = (value, opts = {}) => {
  const { compact = true, maximumFractionDigits = 1 } = opts;
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(maximumFractionDigits)}B`;
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(maximumFractionDigits)}M`;
    if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(maximumFractionDigits)}K`;
    return `$${num.toFixed(0)}`;
  }
  return `$${num.toLocaleString()}`;
};

const formatPercent = (value, signed = true) => {
  if (value === null || value === undefined) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(1)}%`;
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateShort = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const STATUS_BADGE_VARIANT = {
  active: "success",
  engaged: "success",
  warm: "info",
  cold: "default",
  dormant: "warning",
  exited: "default",
};

const TYPE_BADGE_VARIANT = {
  VC: "cyan",
  PE: "premium",
  Angel: "gold",
  Strategic: "info",
  ESOP: "default",
  Founders: "premium",
  Family: "info",
};

const COMM_TYPE_META = {
  email: { icon: Mail, label: "Email", color: "text-[var(--brand-cyan)]" },
  meeting: { icon: Video, label: "Meeting", color: "text-[var(--brand-gold)]" },
  call: { icon: Phone, label: "Call", color: "text-[var(--success)]" },
  update: { icon: FileText, label: "Update", color: "text-[var(--text-secondary)]" },
  report: { icon: BarChart3, label: "Report", color: "text-[var(--brand-cyan)]" },
};

/* ============================================================
   HEADER
============================================================ */
export function InvestorRelationsHeader({ onScheduleMeeting, onExportDeck, onSendUpdate }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span>Strategic & Capital</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--brand-gold)]">Investor Relations</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Investor Relations</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Capital structure, investor communications, financial transparency, and stakeholder reporting.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" icon={Download} onClick={onExportDeck}>
          Export Investor Deck
        </Button>
        <Button variant="secondary" size="md" icon={Send} onClick={onSendUpdate}>
          Send Update
        </Button>
        <Button variant="primary" size="md" icon={Presentation} onClick={onScheduleMeeting}>
          Schedule Meeting
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   AI INTELLIGENCE BANNER
============================================================ */
export function InvestorIntelligenceBanner({ insights }) {
  return (
    <Card className="overflow-hidden border-[var(--brand-cyan-border)] bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--brand-gold-soft)]">
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-cyan)]">Investor Intelligence</p>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Quarterly Pulse · Confidence {insights.confidence}%</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{insights.summary}</p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            {insights.highlights.map((highlight, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm"
              >
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-gold)]" />
                <p className="text-xs font-medium text-[var(--text-secondary)]">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   KPI CARDS
============================================================ */
const KPI_ICON_MAP = {
  gold: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]",
  cyan: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-red-500/20",
};

function KPICard({ label, value, delta, deltaLabel, subline, icon: Icon, color = "gold", progress }) {
  const isPositive = typeof delta === "number" && delta >= 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <h3 className="mt-3 truncate text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
            {typeof delta === "number" && (
              <div className="mt-2 flex items-center gap-1">
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4 text-[var(--success)]" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-[var(--danger)]" />
                )}
                <span className={`text-xs font-semibold ${isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                  {formatPercent(delta)}
                </span>
                {deltaLabel && <span className="text-xs text-[var(--text-muted)]">{deltaLabel}</span>}
              </div>
            )}
            {subline && !Number.isFinite(delta) && (
              <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">{subline}</p>
            )}
          </div>
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${KPI_ICON_MAP[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof progress === "number" && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-[var(--hover-bg)]">
              <div
                className="h-1.5 rounded-full bg-[var(--brand-gold)]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InvestorKPIGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KPICard label="Valuation" value={formatCurrency(kpis.valuation)} delta={kpis.valuationDelta} deltaLabel="YoY" icon={TrendingUp} color="success" />
      <KPICard label="Total Raised" value={formatCurrency(kpis.totalRaised)} subline={`${kpis.fundingRounds} rounds completed`} icon={Award} color="gold" />
      <KPICard label="Active Investors" value={`${kpis.activeInvestors}`} subline={`of ${kpis.totalInvestors} total`} icon={Users} color="cyan" progress={(kpis.activeInvestors / kpis.totalInvestors) * 100} />
      <KPICard label="MRR" value={formatCurrency(kpis.mrr, { maximumFractionDigits: 0 })} delta={kpis.mrrDelta} deltaLabel="MoM" icon={Activity} color="cyan" />
      <KPICard label="ARR" value={formatCurrency(kpis.arr)} delta={kpis.arrDelta} deltaLabel="YoY" icon={BarChart3} color="success" />
      <KPICard label="Runway" value={`${kpis.runwayMonths} mo`} subline={`Burn ${formatCurrency(kpis.monthlyBurn, { maximumFractionDigits: 0 })}/mo`} icon={Wallet} color={kpis.runwayMonths >= 18 ? "success" : kpis.runwayMonths >= 12 ? "gold" : "danger"} />
    </div>
  );
}

/* ============================================================
   CAPITAL STRUCTURE (donut + breakdown)
============================================================ */
export function CapitalStructure({ shareholders }) {
  const total = shareholders.reduce((sum, s) => sum + s.percentage, 0);
  let cumulative = 0;
  const segments = shareholders.map((s) => {
    const start = (cumulative / total) * 360;
    cumulative += s.percentage;
    const end = (cumulative / total) * 360;
    return { ...s, start, end };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Capital Structure</CardTitle>
        </div>
        <Badge variant="gold">Cap Table</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center">
            <div
              className="relative h-44 w-44 rounded-full"
              style={{
                background: `conic-gradient(${segments
                  .map((s, i) => {
                    const colors = [
                      "var(--brand-gold)",
                      "var(--brand-cyan)",
                      "var(--success)",
                      "#a855f7",
                      "#f97316",
                      "#64748b",
                      "#ec4899",
                    ];
                    return `${colors[i % colors.length]} ${s.start}deg ${s.end}deg`;
                  })
                  .join(", ")})`,
              }}
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-[var(--bg-card)] shadow-inner">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Fully Diluted</span>
                <span className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{total.toFixed(0)}%</span>
                <span className="text-xs text-[var(--text-muted)]">{shareholders.length} stakeholders</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {shareholders.map((s, i) => {
              const colors = ["bg-[var(--brand-gold)]", "bg-[var(--brand-cyan)]", "bg-[var(--success)]", "bg-purple-500", "bg-orange-500", "bg-slate-400", "bg-pink-500"];
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2">
                  <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${colors[i % colors.length]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{s.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{s.percentage.toFixed(1)}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{formatCurrency(s.investment)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   FUNDING TIMELINE
============================================================ */
export function FundingTimeline({ rounds }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Funding History</CardTitle>
        </div>
        <Badge variant="premium">{rounds.length} rounds</Badge>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-[var(--brand-gold)] via-[var(--border-color)] to-transparent" />
          <div className="space-y-4">
            {rounds.map((r) => (
              <div key={r.id} className="relative flex items-start gap-4 pl-1">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--brand-gold)] bg-[var(--bg-card)] text-xs font-bold text-[var(--brand-gold)]">
                  {r.stage.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{r.stage}</h4>
                        <Badge variant="gold">{r.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">Led by {r.leadInvestor} · {formatDateShort(r.closedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(r.amount)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Valuation: {formatCurrency(r.postMoney)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.participants.map((p, i) => (
                      <Badge key={i} variant="default" className="font-normal">
                        {p}
                      </Badge>
                    ))}
                  </div>
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
   FINANCIAL SNAPSHOT — SVG area + bar chart
============================================================ */
export function FinancialSnapshot({ revenueSeries, metrics }) {
  const points = revenueSeries;
  const max = Math.max(...points.map((p) => p.revenue));
  const min = Math.min(...points.map((p) => p.revenue));
  const range = max - min || 1;
  const avg = points.reduce((s, p) => s + p.revenue, 0) / points.length;

  // SVG dimensions
  const W = 600;
  const H = 220;
  const PAD_L = 48;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i) => PAD_L + (i / (points.length - 1)) * innerW;
  const y = (v) => PAD_T + (1 - (v - min) / range) * innerH;
  const yAxisTicks = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.revenue)}`).join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD_T + innerH} L ${x(0)} ${PAD_T + innerH} Z`;
  const avgY = y(avg);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Financial Snapshot · Revenue Trend</CardTitle>
        </div>
        <Badge variant="cyan">Trailing 12 Months</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="relative w-full">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ir-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--brand-cyan)" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="ir-line-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--brand-gold)" />
                    <stop offset="100%" stopColor="var(--brand-cyan)" />
                  </linearGradient>
                </defs>

                {/* horizontal grid lines */}
                {yAxisTicks.map((t, i) => (
                  <g key={i}>
                    <line
                      x1={PAD_L}
                      x2={W - PAD_R}
                      y1={y(t)}
                      y2={y(t)}
                      stroke="var(--border-color)"
                      strokeDasharray="2 4"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD_L - 8}
                      y={y(t) + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      ${(t / 1000).toFixed(0)}K
                    </text>
                  </g>
                ))}

                {/* average line */}
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={avgY}
                  y2={avgY}
                  stroke="var(--brand-gold)"
                  strokeDasharray="6 3"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                <text
                  x={W - PAD_R - 4}
                  y={avgY - 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--brand-gold)"
                  fontWeight="bold"
                >
                  AVG ${(avg / 1000).toFixed(0)}K
                </text>

                {/* area */}
                <path d={areaPath} fill="url(#ir-area-gradient)" />

                {/* line */}
                <path d={linePath} fill="none" stroke="url(#ir-line-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={x(i)} cy={y(p.revenue)} r="3.5" fill="var(--bg-card)" stroke="var(--brand-cyan)" strokeWidth="2" />
                    <text
                      x={x(i)}
                      y={H - PAD_B + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {p.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-cyan)]" />
                Monthly revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded bg-[var(--brand-gold)]" style={{ backgroundImage: "repeating-linear-gradient(to right, var(--brand-gold) 0 4px, transparent 4px 7px)" }} />
                12-month average
              </span>
              <span>
                Min <span className="font-bold text-[var(--text-secondary)]">{formatCurrency(min, { maximumFractionDigits: 0 })}</span>
                {" · "}
                Max <span className="font-bold text-[var(--text-secondary)]">{formatCurrency(max, { maximumFractionDigits: 0 })}</span>
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{m.label}</span>
                  {m.delta !== undefined && (
                    <span className={`text-[10px] font-bold ${m.delta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {formatPercent(m.delta)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   ARR / MRR GROWTH CHART (additional visual mockup)
============================================================ */
export function GrowthChart({ data, title = "ARR Growth", subtitle = "Quarter-over-quarter trajectory" }) {
  const max = Math.max(...data.map((d) => d.value));
  const W = 600;
  const H = 200;
  const PAD_L = 56;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = (innerW / data.length) * 0.55;
  const gap = (innerW / data.length) * 0.45;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--success)]" />
          <CardTitle>{title}</CardTitle>
        </div>
        <Badge variant="success">{subtitle}</Badge>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="growth-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-cyan-bright)" />
              <stop offset="100%" stopColor="var(--brand-cyan)" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const v = max * p;
            const yPos = PAD_T + (1 - p) * innerH;
            return (
              <g key={i}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yPos} y2={yPos} stroke="var(--border-color)" strokeDasharray="2 4" strokeWidth="1" />
                <text x={PAD_L - 8} y={yPos + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                  ${(v / 1_000_000).toFixed(1)}M
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const barH = (d.value / max) * innerH;
            const xPos = PAD_L + (i * innerW) / data.length + gap / 2;
            const yPos = PAD_T + innerH - barH;
            return (
              <g key={i}>
                <rect x={xPos} y={yPos} width={barW} height={barH} rx="6" fill="url(#growth-bar)" />
                <text x={xPos + barW / 2} y={yPos - 6} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--text-primary)">
                  ${(d.value / 1_000_000).toFixed(1)}M
                </text>
                <text x={xPos + barW / 2} y={H - PAD_B + 16} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   INVESTOR DIRECTORY (search + filter + table)
============================================================ */
export function InvestorDirectory({ investors, search, onSearchChange, typeFilter, onTypeFilterChange, onSelectInvestor }) {
  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Investor Directory</CardTitle>
          <Badge variant="default">{investors.length}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search investors…"
            icon={Search}
            className="w-full md:w-60"
          />
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          >
            <option value="all">All types</option>
            <option value="VC">VC</option>
            <option value="PE">PE</option>
            <option value="Angel">Angel</option>
            <option value="Strategic">Strategic</option>
            <option value="Family">Family Office</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--hover-bg)]">
              <tr>
                {["Investor", "Type", "Investment", "Ownership", "Last Contact", "Sentiment", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {investors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    No investors match your filters.
                  </td>
                </tr>
              ) : (
                investors.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer transition-colors hover:bg-[var(--hover-bg)]" onClick={() => onSelectInvestor(inv)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-xs font-bold text-[#050816]">
                          {inv.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{inv.name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">{inv.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_BADGE_VARIANT[inv.type] || "default"}>{inv.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)]">{formatCurrency(inv.investment)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{inv.percentage.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(inv.lastContact)}</td>
                    <td className="px-4 py-3">
                      <SentimentBadge score={inv.sentiment} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[inv.status] || "default"}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SentimentBadge({ score }) {
  if (score >= 80) return <Badge variant="success">Strong</Badge>;
  if (score >= 60) return <Badge variant="info">Positive</Badge>;
  if (score >= 40) return <Badge variant="warning">Neutral</Badge>;
  return <Badge variant="danger">Concerned</Badge>;
}

/* ============================================================
   INVESTOR DETAIL DRAWER
============================================================ */
export function InvestorDetailDrawer({ investor, onClose, onLogActivity }) {
  if (!investor) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-md flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-sm font-bold text-[#050816]">
                {investor.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-[var(--text-primary)]">{investor.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={TYPE_BADGE_VARIANT[investor.type] || "default"}>{investor.type}</Badge>
                  <Badge variant={STATUS_BADGE_VARIANT[investor.status] || "default"}>{investor.status}</Badge>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Investment</p>
              <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{formatCurrency(investor.investment)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ownership</p>
              <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{investor.percentage.toFixed(2)}%</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Round</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{investor.round}</p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Joined</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatDateShort(investor.joinedAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Contact</p>
            <div className="mt-2 space-y-2 rounded-xl border border-[var(--border-color)] p-3">
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="truncate">{investor.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>{investor.contactPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Building className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="truncate">{investor.contactPerson} · {investor.contactRole}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sentiment</p>
              <span className="text-sm font-bold text-[var(--text-primary)]">{investor.sentiment}/100</span>
            </div>
            <Progress value={investor.sentiment} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent Activity</p>
            <div className="mt-2 space-y-2">
              {investor.recentActivity.map((a, i) => {
                const meta = COMM_TYPE_META[a.type] || COMM_TYPE_META.update;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] p-3">
                    <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(a.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Notes</p>
            <p className="mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {investor.notes}
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] px-5 py-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="md" icon={Mail} className="flex-1">Email</Button>
            <Button variant="primary" size="md" icon={Plus} className="flex-1" onClick={() => onLogActivity?.(investor)}>Log activity</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   TOAST (lightweight, stack-friendly)
============================================================ */
export function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Sparkles;
        const Icon = icon;
        const color = t.kind === "success" ? "text-[var(--success)]" : t.kind === "error" ? "text-[var(--danger)]" : "text-[var(--brand-gold)]";
        const border = t.kind === "success" ? "border-green-500/30" : t.kind === "error" ? "border-red-500/30" : "border-[var(--brand-gold-border)]";
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-2xl border ${border} bg-[var(--bg-card)] p-3 shadow-2xl`}
          >
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
   EXPORT DECK MODAL
============================================================ */
const DECK_TEMPLATES = [
  { id: "quarterly", label: "Quarterly Update", desc: "KPIs · Highlights · Asks · Financial snapshot", recommended: true },
  { id: "annual", label: "Annual Review", desc: "Full-year financials, audited statements, strategy review" },
  { id: "seriesC", label: "Series C Pitch", desc: "Market · Product · Traction · Team · Ask" },
  { id: "board", label: "Board Pack", desc: "Operating metrics, cohort analyses, risk register" },
  { id: "custom", label: "Custom", desc: "Hand-pick the sections you want included" },
];

const DECK_SECTIONS = [
  { id: "kpis", label: "KPI Snapshot", default: true },
  { id: "capTable", label: "Capital Structure", default: true },
  { id: "funding", label: "Funding History", default: true },
  { id: "financials", label: "Financial Snapshot", default: true },
  { id: "investors", label: "Investor Directory", default: false },
  { id: "comms", label: "Recent Communications", default: false },
  { id: "events", label: "Upcoming Events", default: false },
  { id: "projections", label: "Financial Projections", default: true },
  { id: "documents", label: "Documents Index", default: false },
  { id: "esg", label: "ESG Scorecard", default: false },
];

export function ExportDeckModal({ open, onClose, onExport }) {
  const [template, setTemplate] = useState("quarterly");
  const [audience, setAudience] = useState("investors");
  const [sections, setSections] = useState(() => Object.fromEntries(DECK_SECTIONS.map((s) => [s.id, s.default])));
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [includeConfidential, setIncludeConfidential] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const enabledCount = useMemo(() => Object.values(sections).filter(Boolean).length, [sections]);
  const toggleSection = (id) => setSections((s) => ({ ...s, [id]: !s[id] }));

  const handleExport = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setIsGenerating(false);
    const fileName = `Investor_Deck_${template}_${new Date().toISOString().slice(0, 10)}.pdf`;
    onExport?.({ template, audience, sections, fileName, sectionCount: enabledCount });
    onClose?.();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Export Investor Deck"
      subtitle="Generate a polished PDF tailored to your audience"
      icon={Download}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {enabledCount} sections · {audience === "public" ? "Public-safe" : audience === "board" ? "Board-only" : "Investor-only"}
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
            {DECK_TEMPLATES.map((t) => {
              const active = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`flex items-start gap-2 rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]"
                      : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
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
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { id: "public", label: "Public-safe", icon: Globe },
              { id: "investors", label: "Investor-only", icon: Users },
              { id: "board", label: "Board-only", icon: Lock },
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
            <button
              onClick={() => setSections(Object.fromEntries(DECK_SECTIONS.map((s) => [s.id, true])))}
              className="text-xs font-semibold text-[var(--brand-gold)] hover:underline"
            >
              Select all
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DECK_SECTIONS.map((s) => {
              const active = sections[s.id];
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                    active ? "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)]" : "border-[var(--border-color)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSection(s.id)}
                    className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--brand-gold)]"
                  />
                  <span className={`text-sm ${active ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{s.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Options</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center justify-between text-sm text-[var(--text-primary)]">
              <span>Watermark with recipient name</span>
              <input type="checkbox" checked={includeWatermark} onChange={(e) => setIncludeWatermark(e.target.checked)} className="h-4 w-4 accent-[var(--brand-gold)]" />
            </label>
            <label className="flex items-center justify-between text-sm text-[var(--text-primary)]">
              <span>Stamp “Confidential” on every page</span>
              <input type="checkbox" checked={includeConfidential} onChange={(e) => setIncludeConfidential(e.target.checked)} className="h-4 w-4 accent-[var(--brand-gold)]" />
            </label>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   SEND UPDATE MODAL
============================================================ */
const UPDATE_TEMPLATES = [
  { id: "quarterly", label: "Quarterly Letter", subject: "Q2 2026 Investor Letter — Hermes" },
  { id: "milestone", label: "Milestone Announcement", subject: "Hermes hit $5M ARR — quick note" },
  { id: "funding", label: "Funding News", subject: "Closing Series B — your role mattered" },
  { id: "ask", label: "Specific Ask", subject: "A quick favor: warm intros to enterprise prospects" },
  { id: "custom", label: "Blank", subject: "" },
];

const AUDIENCE_PRESETS = [
  { id: "all", label: "All Active Investors", count: 89 },
  { id: "lead", label: "Lead Investors Only", count: 5 },
  { id: "engaged", label: "Highly Engaged (sentiment > 80)", count: 23 },
  { id: "board", label: "Board Members", count: 5 },
  { id: "dormant", label: "Dormant — Re-engagement", count: 12 },
];

export function SendUpdateModal({ open, onClose, onSend }) {
  const [audience, setAudience] = useState("all");
  const [template, setTemplate] = useState("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSending, setIsSending] = useState(false);

  const audienceMeta = AUDIENCE_PRESETS.find((a) => a.id === audience);

  const applyTemplate = (id) => {
    setTemplate(id);
    const t = UPDATE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    if (id === "quarterly") {
      setBody(
        "Hi team,\n\nA quick Q2 2026 update.\n\nHighlights:\n• ARR run-rate at $5.84M, +41.7% YoY\n• Net retention 118%, gross margin 76%\n• Series C anchor LP momentum building\n\nAsk:\n• 3 warm intros to PH enterprise CFOs\n• Feedback on the Q2 pricing changes\n\nDetailed metrics attached.\n\n— Founder"
      );
    } else if (id === "milestone") {
      setBody(
        "Thrilled to share — Hermes crossed $5M ARR last week. Two new logos closed in the same period. Full details next week in the quarterly letter.\n\nThank you for your continued support."
      );
    } else if (id === "funding") {
      setBody(
        "We officially closed our Series B at $85M post-money. Pacific Bridge led, with strong follow-on from Kalakal and a new strategic from Heritage Asia.\n\nYou were a part of the journey — appreciate it.\n\nDetailed close memo attached."
      );
    } else if (id === "ask") {
      setBody(
        "Quick favor: we’re in active sales conversations with 6 PH enterprises (manufacturing, BPO, financial services). If any of your network maps to that ICP, we’d love a warm intro.\n\nHere’s the public one-pager you can share."
      );
    } else {
      setBody("");
    }
  };

  const handleAddAttachment = () => {
    const name = prompt("Mock attachment name (e.g., Q2_Metrics.pdf)");
    if (!name) return;
    setAttachments((arr) => [...arr, { id: Date.now(), name, size: `${(Math.random() * 8 + 0.4).toFixed(1)} MB` }]);
  };

  const handleSend = async () => {
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSending(false);
    onSend?.({ audience, audienceMeta, subject, body, attachments, scheduledAt });
    onClose?.();
    // reset
    setTemplate("custom");
    setSubject("");
    setBody("");
    setAttachments([]);
    setScheduledAt("");
  };

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Send Investor Update"
      subtitle="Compose, schedule, and track investor communications"
      icon={Send}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Users className="h-3.5 w-3.5" />
            Sending to <span className="font-semibold text-[var(--text-primary)]">{audienceMeta?.count}</span> recipients
            {scheduledAt && (
              <>
                <span className="mx-1">·</span>
                <Clock className="h-3.5 w-3.5" />
                Scheduled
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Save} onClick={onClose}>Save draft</Button>
            <Button variant="primary" icon={isSending ? Loader2 : Send} loading={isSending} onClick={handleSend} disabled={!canSend}>
              {isSending ? "Sending…" : scheduledAt ? "Schedule send" : "Send now"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Audience</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCE_PRESETS.map((a) => {
              const active = audience === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <span className={`text-sm font-semibold ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-primary)]"}`}>{a.label}</span>
                  <span className="text-xs font-bold text-[var(--text-muted)]">{a.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Quick template</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {UPDATE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  template === t.id ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]" : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold-border)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Q2 2026 Investor Letter — Hermes"
            className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Write your update. Markdown-style is fine."
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Attachments</p>
            <button
              type="button"
              onClick={handleAddAttachment}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-color)] py-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-gold-border)] hover:text-[var(--brand-gold)]"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add attachment
            </button>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 truncate text-[var(--text-primary)]">
                      <FileText className="h-3.5 w-3.5 text-[var(--brand-cyan)]" />
                      {a.name}
                    </span>
                    <span className="flex items-center gap-2 text-[var(--text-muted)]">
                      {a.size}
                      <button onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Schedule (optional)</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">Leave blank to send immediately.</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   SCHEDULE MEETING MODAL
============================================================ */
const MEETING_TYPES = [
  { id: "1to1", label: "1:1 Investor", icon: Phone, color: "cyan" },
  { id: "board", label: "Board Meeting", icon: Users, color: "gold" },
  { id: "townhall", label: "Investor Townhall", icon: Presentation, color: "cyan" },
  { id: "earnings", label: "Earnings Call", icon: BarChart3, color: "gold" },
  { id: "strategy", label: "Strategic Review", icon: Target, color: "cyan" },
];

const LOCATIONS = [
  { id: "zoom", label: "Zoom (link auto-generated)", icon: Video },
  { id: "office", label: "Office — BGC HQ", icon: MapPin },
  { id: "hybrid", label: "Hybrid", icon: Layers },
];

export function ScheduleMeetingModal({ open, onClose, onSchedule, investors }) {
  const [meetingType, setMeetingType] = useState("1to1");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(45);
  const [location, setLocation] = useState("zoom");
  const [invitees, setInvitees] = useState([]);
  const [agenda, setAgenda] = useState([
    "Quarterly performance review",
    "Pipeline & GTM update",
    "Series C readiness check",
    "Q&A",
  ]);
  const [agendaInput, setAgendaInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const toggleInvitee = (id) => {
    setInvitees((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  const addAgendaItem = () => {
    const v = agendaInput.trim();
    if (!v) return;
    setAgenda((arr) => [...arr, v]);
    setAgendaInput("");
  };

  const removeAgendaItem = (i) => setAgenda((arr) => arr.filter((_, idx) => idx !== i));

  const handleSchedule = async () => {
    setIsScheduling(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsScheduling(false);
    onSchedule?.({ meetingType, title, date, time, duration, location, invitees, agenda, notes });
    onClose?.();
    // reset
    setTitle("");
    setDate("");
    setTime("");
    setInvitees([]);
  };

  const canSchedule = title.trim() && date && time && invitees.length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Schedule Investor Meeting"
      subtitle="Set the agenda, invite stakeholders, and lock the calendar"
      icon={Calendar}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)]">
            {invitees.length} invitees · {agenda.length} agenda items
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={isScheduling ? Loader2 : Calendar} loading={isScheduling} onClick={handleSchedule} disabled={!canSchedule}>
              {isScheduling ? "Scheduling…" : "Schedule meeting"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Meeting type</p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
            {MEETING_TYPES.map((m) => {
              const Icon = m.icon;
              const active = meetingType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMeetingType(m.id)}
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
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Meeting title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q2 2026 Investor Review"
            className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            >
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Location</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LOCATIONS.map((l) => {
              const Icon = l.icon;
              const active = location === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocation(l.id)}
                  className={`flex items-center gap-2 rounded-2xl border p-3 transition-all ${
                    active ? "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)]" : "border-[var(--border-color)] hover:border-[var(--brand-gold-border)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-muted)]"}`} />
                  <span className={`text-xs font-semibold ${active ? "text-[var(--brand-gold)]" : "text-[var(--text-secondary)]"}`}>{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Invite investors</p>
            <span className="text-xs text-[var(--text-muted)]">{invitees.length} selected</span>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-[var(--border-color)] p-2">
            {(investors || []).map((inv) => {
              const active = invitees.includes(inv.id);
              return (
                <label
                  key={inv.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors ${
                    active ? "bg-[var(--brand-gold-soft)]" : "hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleInvitee(inv.id)}
                    className="h-4 w-4 accent-[var(--brand-gold)]"
                  />
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-[10px] font-bold text-[#050816]">
                    {inv.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{inv.name}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{inv.contactPerson} · {inv.type}</p>
                  </div>
                </label>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAgendaItem();
                }
              }}
              placeholder="Add agenda item and press Enter"
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
            />
            <Button variant="secondary" size="md" icon={Plus} onClick={addAgendaItem}>Add</Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Pre-read / notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Materials to review beforehand, links, context…"
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-gold-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   COMMUNICATIONS FEED
============================================================ */
export function CommunicationsFeed({ items, onComposeUpdate }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Recent Communications</CardTitle>
        </div>
        <Button variant="ghost" size="sm" icon={Plus} onClick={onComposeUpdate}>
          Compose
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const meta = COMM_TYPE_META[item.type] || COMM_TYPE_META.update;
          const Icon = meta.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 transition-colors hover:bg-[var(--hover-bg)]">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--hover-bg)] ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <Badge variant="default" className="font-normal">{meta.label}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {item.recipient} · {formatDate(item.date)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{item.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.read ? (
                  <Badge variant="success" className="font-normal">Opened</Badge>
                ) : (
                  <Badge variant="warning" className="font-normal">Pending</Badge>
                )}
                <span className="text-[10px] text-[var(--text-muted)]">{item.recipientsCount} recipients</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   UPCOMING EVENTS
============================================================ */
export function UpcomingEvents({ events }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Upcoming Investor Events</CardTitle>
        </div>
        <Badge variant="gold">{events.length} scheduled</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="flex items-start gap-4 rounded-2xl border border-[var(--border-color)] p-3">
            <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="text-lg font-bold leading-none">{new Date(e.date).getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{e.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{e.time} · {e.location}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={e.priority === "high" ? "gold" : "default"}>{e.kind}</Badge>
                <span className="text-[10px] text-[var(--text-muted)]">{e.attendees} attendees</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon={Eye}>
              Brief
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   DOCUMENTS LIBRARY
============================================================ */
export function DocumentsLibrary({ documents }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--brand-cyan)]" />
          <CardTitle>Investor Documents</CardTitle>
        </div>
        <Button variant="ghost" size="sm" icon={Filter}>
          Filter
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((d) => (
            <div key={d.id} className="group rounded-2xl border border-[var(--border-color)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]">
                  <FileText className="h-5 w-5" />
                </div>
                <Badge variant={d.confidential ? "danger" : "default"}>
                  {d.confidential ? "Confidential" : "Public"}
                </Badge>
              </div>
              <h4 className="mt-3 truncate text-sm font-bold text-[var(--text-primary)]">{d.title}</h4>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{d.category} · {d.pages} pages · {d.size}</p>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-3">
                <span className="text-[10px] text-[var(--text-muted)]">Updated {formatDate(d.updatedAt)}</span>
                <button className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-gold)] opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="h-3 w-3" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   FINANCIAL PROJECTIONS
============================================================ */
export function FinancialProjections({ projections }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--brand-gold)]" />
          <CardTitle>Financial Projections</CardTitle>
        </div>
        <Badge variant="gold">AI-Generated</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {projections.map((p) => (
            <div key={p.period} className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{p.period}</h4>
                <Badge variant={p.scenario === "Base" ? "info" : p.scenario === "Bull" ? "success" : "warning"}>
                  {p.scenario} case
                </Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Revenue</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(p.revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">EBITDA</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(p.ebitda)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Growth Rate</p>
                  <p className="text-sm font-semibold text-[var(--success)]">{formatPercent(p.growth)}</p>
                </div>
                <div className="border-t border-[var(--border-color)] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Confidence</span>
                    <span className="text-[10px] font-bold text-[var(--text-primary)]">{p.confidence}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-[var(--hover-bg)]">
                    <div className="h-1 rounded-full bg-[var(--brand-gold)]" style={{ width: `${p.confidence}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   ESG / SUSTAINABILITY SCORECARD
============================================================ */
export function ESGScorecard({ esg }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[var(--success)]" />
          <CardTitle>ESG Scorecard</CardTitle>
        </div>
        <Badge variant="success">Tier {esg.tier}</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {esg.pillars.map((p) => (
            <div key={p.name} className="rounded-2xl border border-[var(--border-color)] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{p.name}</h4>
                <span className="text-lg font-bold text-[var(--text-primary)]">{p.score}</span>
              </div>
              <Progress value={p.score} className="mt-2" />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{p.summary}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
