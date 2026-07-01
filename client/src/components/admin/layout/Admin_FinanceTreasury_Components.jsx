import { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Shield,
  Wallet,
  CreditCard,
  BarChart3,
  Activity,
  Package,
  Receipt,
  Users,
  Building2,
  Briefcase,
  Ban,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Calendar,
  Mail,
  Printer,
  Eye,
  Edit3,
  Trash2,
  Send,
  Banknote,
  Landmark,
  Percent,
  PiggyBank,
  Sparkles,
  Bell,
  Info,
  AlertOctagon,
  Loader2,
} from "lucide-react";

// ── Helper: status badge color map ──
function statusBadgeClass(status) {
  switch (status) {
    case "approved":
    case "on_track":
    case "matched":
    case "completed":
    case "reimbursed":
      return "bg-green-100 text-green-700 border-green-200";
    case "pending":
    case "pending_approval":
    case "pending_review":
    case "in_review":
    case "open":
    case "scheduled":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "rejected":
    case "over_budget":
    case "unmatched":
      return "bg-red-100 text-red-700 border-red-200";
    case "warning":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "partially_received":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function statusLabel(status) {
  const map = {
    pending_approval: "Pending",
    in_review: "In Review",
    on_track: "On Track",
    over_budget: "Over Budget",
    three_way_pass: "3-Way Pass",
    qty_discrepancy: "Qty Issue",
  };
  return map[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function fmtCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtCompact(value) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

// ═══════════════════════════════════════════════════════════
// 1. HEADER
// ═══════════════════════════════════════════════════════════
export function FinanceTreasuryHeader({ title = "Finance Control", subtitle = "Budget governance, purchase-to-pay, and financial compliance", dateRange, onExport, onCreate, showDateRange = true, showExport = true, showCreate = true }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {showDateRange && dateRange && (
          <span className="text-sm text-[var(--text-muted)] hidden md:inline">{dateRange}</span>
        )}
        {showExport && onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
        {showCreate && onCreate && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. KPI CARDS
// ═══════════════════════════════════════════════════════════
export function FinanceTreasuryKPICards({ kpis }) {
  const cards = useMemo(
    () => [
      {
        label: "Total revenue",
        value: fmtCompact(kpis?.totalRevenue || 0),
        trend: kpis?.revenueTrend || 0,
        trendLabel: "vs last month",
        icon: DollarSign,
        color: "green",
      },
      {
        label: "Operating expenses",
        value: fmtCompact(kpis?.operatingExpenses || 0),
        trend: kpis?.expenseTrend || 0,
        trendLabel: "over budget",
        icon: CreditCard,
        color: "red",
        inverseTrend: true,
      },
      {
        label: "Net cash position",
        value: fmtCompact(kpis?.netCashPosition || 0),
        trendLabel: kpis?.cashHealth || "",
        icon: Wallet,
        color: "emerald",
        isTextTrend: true,
      },
      {
        label: "Pending approvals",
        value: String(kpis?.pendingApprovals || 0),
        trendLabel: `${kpis?.urgentApprovals || 0} urgent  ${fmtCompact(kpis?.urgentApprovalValue || 0)} total`,
        icon: Clock,
        color: "amber",
        isTextTrend: true,
      },
    ],
    [kpis]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              <div className="flex items-center gap-1.5 text-xs">
                {!card.isTextTrend && card.trend !== undefined && (
                  <>
                    {card.trend > 0 ? (
                      <ArrowUpRight className={`w-3.5 h-3.5 ${card.inverseTrend ? "text-red-500" : "text-green-500"}`} />
                    ) : (
                      <ArrowDownRight className={`w-3.5 h-3.5 ${card.inverseTrend ? "text-green-500" : "text-red-500"}`} />
                    )}
                    <span
                      className={
                        card.trend > 0
                          ? card.inverseTrend
                            ? "text-red-500"
                            : "text-green-500"
                          : card.inverseTrend
                            ? "text-green-500"
                            : "text-red-500"
                      }
                    >
                      {card.trend > 0 ? "+" : ""}
                      {card.trend}%
                    </span>
                  </>
                )}
                {card.isTextTrend && (
                  <span className="text-[var(--text-muted)]">{card.trendLabel}</span>
                )}
                {!card.isTextTrend && <span className="text-[var(--text-muted)]">{card.trendLabel}</span>}
              </div>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                card.color === "green"
                  ? "bg-green-500/10"
                  : card.color === "red"
                    ? "bg-red-500/10"
                    : card.color === "emerald"
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10"
              }`}
            >
              <card.icon
                className={`w-5 h-5 ${
                  card.color === "green"
                    ? "text-green-500"
                    : card.color === "red"
                      ? "text-red-500"
                      : card.color === "emerald"
                        ? "text-emerald-500"
                        : "text-amber-500"
                }`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. MODULE TABS
// ═══════════════════════════════════════════════════════════
const MODULE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "budgeting", label: "Budgeting" },
  { key: "p2p", label: "Purchase-to-Pay" },
  { key: "expenses", label: "Expenses" },
  { key: "vendors", label: "Vendors" },
  { key: "capex", label: "CapEx" },
  { key: "opex", label: "OpEx" },
  { key: "reports", label: "Reports" },
];

export function FinanceTreasuryModuleTabs({ activeTab, onChange }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-1.5 inline-flex flex-wrap gap-1">
      {MODULE_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.key
              ? "bg-[var(--brand-gold)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. OVERVIEW DASHBOARD
// ═══════════════════════════════════════════════════════════
export function OverviewDashboard({
  budgets,
  approvalQueue,
  recentTransactions,
  cashFlow,
  alerts,
  onApprove,
  onReject,
  onViewTransaction,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetUtilizationWidget budgets={budgets} />
        <ApprovalWorkflowWidget queue={approvalQueue} onApprove={onApprove} onReject={onReject} />
      </div>

      <RecentTransactionsTable transactions={recentTransactions} onView={onViewTransaction} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowSummaryWidget data={cashFlow} />
        <AlertsControlsWidget alerts={alerts} />
      </div>
    </div>
  );
}

// ── Budget Utilization Widget ──
function BudgetUtilizationWidget({ budgets = [] }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Budget utilization</h3>
        <span className="text-xs text-[var(--text-muted)]">by department</span>
      </div>
      <div className="space-y-4">
        {budgets.map((b) => {
          const isOver = b.percentUsed > 100;
          const isWarn = b.percentUsed >= 85 && b.percentUsed <= 100;
          const barColor = isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500";
          const labelColor = isOver ? "text-red-600" : isWarn ? "text-amber-600" : "text-emerald-600";
          return (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">{b.costCenter}</span>
                <span className="text-[var(--text-muted)]">
                  {fmtCompact(b.used)} / {fmtCompact(b.budget)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={labelColor}>
                  {b.percentUsed}% used {b.remaining < 0 ? `Over budget by ${fmtCompact(Math.abs(b.remaining))}` : `${fmtCompact(b.remaining)} remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Approval Workflow Widget ──
function ApprovalWorkflowWidget({ queue = [], onApprove, onReject }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Approval workflow</h3>
      </div>
      <div className="space-y-4">
        {queue.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              {item.status === "pending" ? (
                <Clock className="w-4 h-4 text-amber-500" />
              ) : item.status === "rejected" ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.title} — {fmtCompact(item.amount)}
                </p>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-2">
                  {new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.note}</p>
              {item.status === "pending" && onApprove && onReject && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onApprove(item)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--brand-gold)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(item)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Transactions Table ──
function RecentTransactionsTable({ transactions = [], onView }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent transactions</h3>
        <span className="text-xs text-[var(--text-muted)]">last 7 days</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 font-medium">Department</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium text-right">Amount</th>
              <th className="pb-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {transactions.map((t) => (
              <tr key={t.id} className="group cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onView?.(t)}>
                <td className="py-3 text-[var(--text-primary)]">{t.date}</td>
                <td className="py-3 text-[var(--text-primary)]">{t.description}</td>
                <td className="py-3 text-[var(--text-muted)]">{t.department}</td>
                <td className="py-3 text-[var(--text-muted)]">{t.category}</td>
                <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(t.amount)}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Cash Flow Summary Widget ──
function CashFlowSummaryWidget({ data }) {
  if (!data) return null;
  const rows = [
    { label: "Operating balance", value: data.operatingBalance },
    { label: "Revenue collected", value: data.revenueCollected, income: true },
    { label: "Payroll disbursed", value: data.payrollDisbursed },
    { label: "Vendor payments", value: data.vendorPayments },
    { label: "Operating costs", value: data.operatingCosts },
    { label: "Closing balance", value: data.closingBalance, total: true },
  ];
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">Cash flow summary</h3>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between text-sm ${row.total ? "pt-3 border-t border-[var(--border-color)]" : ""}`}
          >
            <span className={row.total ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
              {row.label}
            </span>
            <span
              className={`font-medium ${
                row.total
                  ? "text-emerald-600 text-base"
                  : row.income
                    ? "text-emerald-600"
                    : row.value < 0
                      ? "text-red-500"
                      : "text-[var(--text-primary)]"
              }`}
            >
              {fmtCompact(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts & Controls Widget ──
function AlertsControlsWidget({ alerts = [] }) {
  const severityIcon = {
    critical: <AlertOctagon className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    medium: <Bell className="w-4 h-4 text-blue-500" />,
    info: <Info className="w-4 h-4 text-gray-500" />,
  };
  const severityBg = {
    critical: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    medium: "bg-blue-50 border-blue-200",
    info: "bg-gray-50 border-gray-200",
  };
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">Alerts & controls</h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${severityBg[alert.severity] || severityBg.info}`}
          >
            <div className="mt-0.5 flex-shrink-0">{severityIcon[alert.severity] || severityIcon.info}</div>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 5. BUDGETING SECTION
// ═══════════════════════════════════════════════════════════
export function BudgetingSection({ budgets = [], filters, onFilterChange, onSelectBudget, onTransfer }) {
  const filtered = useMemo(() => {
    if (!filters?.status || filters.status === "all") return budgets;
    return budgets.filter((b) => b.status === filters.status);
  }, [budgets, filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
            value={filters?.status || "all"}
            onChange={(e) => onFilterChange?.("status", e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="on_track">On Track</option>
            <option value="warning">Warning</option>
            <option value="over_budget">Over Budget</option>
          </select>
        </div>
        <button
          onClick={onTransfer}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-hover)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors ml-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Budget Transfer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Cost Center</th>
              <th className="pb-3 font-medium">Owner</th>
              <th className="pb-3 font-medium text-right">Budget</th>
              <th className="pb-3 font-medium text-right">Used</th>
              <th className="pb-3 font-medium text-right">Remaining</th>
              <th className="pb-3 font-medium">% Used</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectBudget?.(b)}>
                <td className="py-3 font-medium text-[var(--text-primary)]">{b.costCenter}</td>
                <td className="py-3 text-[var(--text-muted)]">{b.owner}</td>
                <td className="py-3 text-right text-[var(--text-primary)]">{fmtCompact(b.budget)}</td>
                <td className="py-3 text-right text-[var(--text-primary)]">{fmtCompact(b.used)}</td>
                <td className={`py-3 text-right font-medium ${b.remaining < 0 ? "text-red-500" : "text-[var(--text-primary)]"}`}>
                  {fmtCompact(b.remaining)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.percentUsed > 100 ? "bg-red-500" : b.percentUsed >= 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{b.percentUsed}%</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. P2P SECTION
// ═══════════════════════════════════════════════════════════
const P2P_SUB_TABS = [
  { key: "requisitions", label: "Requisitions" },
  { key: "orders", label: "Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
];

export function P2PSection({ data, activeSubTab, onSubTabChange, onSelectItem, filters, onFilterChange }) {
  const currentData = data?.[activeSubTab] || [];
  const filtered = useMemo(() => {
    if (!filters?.search) return currentData;
    const q = filters.search.toLowerCase();
    return currentData.filter((item) =>
      Object.values(item).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [currentData, filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-1 gap-1">
          {P2P_SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSubTabChange(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeSubTab === tab.key
                  ? "bg-[var(--brand-gold)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-[var(--text-primary)] outline-none w-40"
              value={filters?.search || ""}
              onChange={(e) => onFilterChange?.("search", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {activeSubTab === "requisitions" && (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Requester</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Budget Line</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Priority</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectItem?.(item, "requisition")}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{item.title}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.requester}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.department}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.budgetLine}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(item.amount)}</td>
                  <td className="py-3">
                    <span className={`text-xs font-medium capitalize ${item.priority === "critical" ? "text-red-500" : item.priority === "high" ? "text-amber-500" : "text-[var(--text-muted)]"}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === "orders" && (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Title</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Expected Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectItem?.(item, "order")}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{item.title}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.vendor}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(item.amount)}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{item.date}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.expectedDelivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === "invoices" && (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Invoice #</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Match</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectItem?.(item, "invoice")}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{item.number}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.vendor}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(item.amount)}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.matchStatus)}`}>
                      {statusLabel(item.matchStatus)}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{item.date}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === "payments" && (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Reference</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Method</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectItem?.(item, "payment")}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{item.reference}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.vendor}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(item.amount)}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.method}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 7. EXPENSE SECTION
// ═══════════════════════════════════════════════════════════
export function ExpenseSection({ data, filters, onFilterChange, onSelectExpense, onApprove, onReject }) {
  const expensesList = data?.expenses || [];
  const summary = data?.summary || {};

  const filtered = useMemo(() => {
    let result = expensesList;
    if (filters?.status && filters.status !== "all") {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((e) =>
        e.employee.toLowerCase().includes(q) || e.reportTitle.toLowerCase().includes(q)
      );
    }
    return result;
  }, [expensesList, filters]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total YTD", value: fmtCompact(summary.totalYTD), icon: DollarSign, color: "blue" },
            { label: "Pending", value: fmtCompact(summary.totalPending), icon: Clock, color: "amber" },
            { label: "Reports Submitted", value: summary.reportsSubmitted?.toString(), icon: FileText, color: "purple" },
            { label: "Receipt Compliance", value: `${summary.receiptCompliance}%`, icon: CheckCircle, color: "green" },
          ].map((c, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${c.color}-500/10`}>
                  <c.icon className={`w-5 h-5 text-${c.color}-500`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select className="bg-transparent text-sm text-[var(--text-primary)] outline-none" value={filters?.status || "all"} onChange={(e) => onFilterChange?.("status", e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="reimbursed">Reimbursed</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search employee or report..." className="bg-transparent text-sm text-[var(--text-primary)] outline-none w-48" value={filters?.search || ""} onChange={(e) => onFilterChange?.("search", e.target.value)} />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Expense Reports</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Report</th>
                <th className="pb-3 font-medium">Employee</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 font-medium">Receipt</th>
                <th className="pb-3 font-medium">Flags</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectExpense?.(item)}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{item.reportTitle}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.employee}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.department}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.category}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">${item.amount.toFixed(2)}</td>
                  <td className="py-3 text-[var(--text-muted)]">{item.merchant}</td>
                  <td className="py-3">
                    {item.receipt ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.policyFlags.map((flag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-medium border border-red-100">{flag.replace(/_/g, " ")}</span>
                      ))}
                      {item.policyFlags.length === 0 && <span className="text-xs text-[var(--text-muted)]">None</span>}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td className="py-3 text-right">
                    {item.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onApprove?.(item); }} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onReject?.(item); }} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column grid for breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Spend by Category</h3>
          <div className="space-y-3">
            {(data?.byCategory || []).map((c) => (
              <div key={c.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{c.category}</span>
                  <span className="text-[var(--text-muted)]">{fmtCompact(c.amount)} ({c.count})</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--brand-gold)]" style={{ width: `${Math.min(c.pctOfTotal, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Department */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Spend by Department</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Budget</th>
                  <th className="pb-3 font-medium text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {(data?.byDepartment || []).map((d) => (
                  <tr key={d.department} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3 font-medium text-[var(--text-primary)]">{d.department}</td>
                    <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(d.amount)}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(d.budget)}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium ${d.variance > 0 ? "text-red-500" : "text-emerald-500"}`}>{d.variance > 0 ? "+" : ""}{fmtCompact(d.variance)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Monthly Trend</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Month</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">Reports</th>
                <th className="pb-3 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(data?.monthlyTrend || []).map((m) => (
                <tr key={m.month} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 font-medium text-[var(--text-primary)]">{m.month}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(m.amount)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{m.count}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((m.amount / 35000) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Violations */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Top Policy Violations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Rule</th>
                <th className="pb-3 font-medium text-right">Incidents</th>
                <th className="pb-3 font-medium text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(data?.topViolations || []).map((v) => (
                <tr key={v.rule} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 font-medium text-[var(--text-primary)]">{v.rule}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{v.count}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(v.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 8. VENDOR SECTION
// ═══════════════════════════════════════════════════════════
export function VendorSection({ vendors = [], filters, onFilterChange, onSelectVendor }) {
  const filtered = useMemo(() => {
    let result = vendors;
    if (filters?.status && filters.status !== "all") {
      result = result.filter((v) => v.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((v) => v.name.toLowerCase().includes(q));
    }
    return result;
  }, [vendors, filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
            value={filters?.status || "all"}
            onChange={(e) => onFilterChange?.("status", e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending_review">Pending Review</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search vendor..."
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none w-40"
            value={filters?.search || ""}
            onChange={(e) => onFilterChange?.("search", e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Vendor</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Country</th>
              <th className="pb-3 font-medium text-right">Spend YTD</th>
              <th className="pb-3 font-medium text-right">Open POs</th>
              <th className="pb-3 font-medium">Risk Score</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Onboarded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectVendor?.(v)}>
                <td className="py-3 font-medium text-[var(--text-primary)]">{v.name}</td>
                <td className="py-3 text-[var(--text-muted)]">{v.category}</td>
                <td className="py-3 text-[var(--text-muted)]">{v.country}</td>
                <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(v.spendYTD)}</td>
                <td className="py-3 text-right text-[var(--text-muted)]">{v.openPOs}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${v.riskScore > 40 ? "bg-red-500" : v.riskScore > 20 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(v.riskScore, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{v.riskScore}</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(v.status)}`}>
                    {statusLabel(v.status)}
                  </span>
                </td>
                <td className="py-3 text-[var(--text-muted)]">{v.onboardingDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 9. CAPEX SECTION
// ═══════════════════════════════════════════════════════════
export function CapExSection({ data, filters, onFilterChange, onSelectRequest, onSelectProject, onSelectAsset }) {
  const filteredRequests = useMemo(() => {
    let result = data?.investmentRequests || [];
    if (filters?.status && filters.status !== "all") {
      result = result.filter((r) => r.status === filters.status);
    }
    return result;
  }, [data?.investmentRequests, filters]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "CapEx Budget", value: fmtCompact(data.summary.totalBudget), icon: Landmark, color: "blue" },
            { label: "Committed", value: fmtCompact(data.summary.committed), icon: FileText, color: "amber" },
            { label: "Actual Spent", value: fmtCompact(data.summary.actual), icon: DollarSign, color: "green" },
            { label: "Forecast", value: fmtCompact(data.summary.forecast), icon: TrendingUp, color: "purple" },
          ].map((c, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${c.color}-500/10`}>
                  <c.icon className={`w-5 h-5 text-${c.color}-500`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investment Requests */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Investment Requests</h3>
          <div className="inline-flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <select className="bg-transparent text-sm text-[var(--text-primary)] outline-none" value={filters?.status || "all"} onChange={(e) => onFilterChange?.("status", e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_approval">Pending</option>
              <option value="in_review">In Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Request</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Budget Line</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">NPV</th>
                <th className="pb-3 font-medium text-right">IRR</th>
                <th className="pb-3 font-medium">Payback</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredRequests.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectRequest?.(r)}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{r.title}</td>
                  <td className="py-3 text-[var(--text-muted)]">{r.department}</td>
                  <td className="py-3 text-[var(--text-muted)]">{r.budgetLine}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(r.amount)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{r.npv != null ? fmtCompact(r.npv) : "—"}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{r.irr != null ? `${r.irr}%` : "—"}</td>
                  <td className="py-3 text-[var(--text-muted)]">{r.paybackMonths != null ? `${r.paybackMonths} mo` : "—"}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capital Projects */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Capital Projects</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Manager</th>
                <th className="pb-3 font-medium text-right">Budget</th>
                <th className="pb-3 font-medium text-right">CIP</th>
                <th className="pb-3 font-medium text-right">Actual</th>
                <th className="pb-3 font-medium text-right">Forecast</th>
                <th className="pb-3 font-medium">Completion</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(data?.capitalProjects || []).map((p) => (
                <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectProject?.(p)}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{p.name}</td>
                  <td className="py-3 text-[var(--text-muted)]">{p.manager}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(p.budget)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(p.cipBalance)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(p.actual)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(p.forecast)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${p.completionPct >= 80 ? "bg-emerald-500" : p.completionPct >= 50 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${p.completionPct}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{p.completionPct}%</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed Assets */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Fixed Asset Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium text-right">Cost</th>
                <th className="pb-3 font-medium text-right">Accum. Dep.</th>
                <th className="pb-3 font-medium text-right">Book Value</th>
                <th className="pb-3 font-medium">Method</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(data?.fixedAssets || []).map((a) => (
                <tr key={a.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectAsset?.(a)}>
                  <td className="py-3 font-medium text-[var(--text-primary)]">{a.name}</td>
                  <td className="py-3 text-[var(--text-muted)]">{a.category}</td>
                  <td className="py-3 text-[var(--text-muted)]">{a.location}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(a.cost)}</td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(a.accumulatedDepreciation)}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(a.bookValue)}</td>
                  <td className="py-3 text-[var(--text-muted)]">{a.method}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(a.status)}`}>{statusLabel(a.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 10. OPEX SECTION
// ═══════════════════════════════════════════════════════════
export function OpExSection({ data, filters, onFilterChange, onSelectLine }) {
  const filteredLines = useMemo(() => {
    let result = data?.budgetLines || [];
    if (filters?.department && filters.department !== "all") {
      result = result.filter((l) => l.department === filters.department);
    }
    return result;
  }, [data?.budgetLines, filters]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "OpEx Budget", value: fmtCompact(data.summary.totalBudget), icon: PiggyBank, color: "blue" },
            { label: "Committed", value: fmtCompact(data.summary.committed), icon: FileText, color: "amber" },
            { label: "Actual YTD", value: fmtCompact(data.summary.actualYTD), icon: DollarSign, color: "green" },
            { label: "Monthly Run Rate", value: fmtCompact(data.summary.runRateMonthly), icon: Activity, color: "purple" },
          ].map((c, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{c.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${c.color}-500/10`}>
                  <c.icon className={`w-5 h-5 text-${c.color}-500`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget Lines */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Operating Budget Lines</h3>
          <div className="inline-flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <select className="bg-transparent text-sm text-[var(--text-primary)] outline-none" value={filters?.department || "all"} onChange={(e) => onFilterChange?.("department", e.target.value)}>
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="HR">HR</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium text-right">Budget</th>
                <th className="pb-3 font-medium text-right">Committed</th>
                <th className="pb-3 font-medium text-right">Actual</th>
                <th className="pb-3 font-medium text-right">Forecast</th>
                <th className="pb-3 font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredLines.map((l) => {
                const isOver = l.percentUsed > 100;
                const isWarn = l.percentUsed >= 85;
                return (
                  <tr key={l.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => onSelectLine?.(l)}>
                    <td className="py-3 font-medium text-[var(--text-primary)]">{l.account}</td>
                    <td className="py-3 text-[var(--text-muted)]">{l.department}</td>
                    <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(l.budget)}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(l.committed)}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(l.actual)}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(l.forecast)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(l.percentUsed, 100)}%` }} />
                        </div>
                        <span className={`text-xs ${isOver ? "text-red-500" : isWarn ? "text-amber-500" : "text-emerald-500"}`}>{l.percentUsed}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Burn */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Monthly Burn Rate</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
                <th className="pb-3 font-medium">Month</th>
                <th className="pb-3 font-medium text-right">Budget</th>
                <th className="pb-3 font-medium text-right">Actual</th>
                <th className="pb-3 font-medium text-right">Committed</th>
                <th className="pb-3 font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {(data?.monthlyBurn || []).map((m) => {
                const variance = m.actual - m.budget;
                return (
                  <tr key={m.month} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3 font-medium text-[var(--text-primary)]">{m.month}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(m.budget)}</td>
                    <td className="py-3 text-right font-medium text-[var(--text-primary)]">{fmtCompact(m.actual)}</td>
                    <td className="py-3 text-right text-[var(--text-muted)]">{fmtCompact(m.committed)}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium ${variance > 0 ? "text-red-500" : "text-emerald-500"}`}>{variance > 0 ? "+" : ""}{fmtCompact(variance)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Expense Breakdown by Category</h3>
        <div className="space-y-3">
          {(data?.topCategories || []).map((c) => (
            <div key={c.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">{c.category}</span>
                <span className="text-[var(--text-muted)]">{fmtCompact(c.amount)} ({c.pctOfTotal}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--brand-gold)]" style={{ width: `${Math.min(c.pctOfTotal, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 11. TREASURY SECTION
// ═══════════════════════════════════════════════════════════
export function TreasurySection({ data, onForecastDetail, onSuggestHedge }) {
  const s = data?.summary || {};
  const pipeline = data?.pipeline || [];
  const forecast = data?.liquidityForecast || [];
  const alerts = data?.alerts || [];

  const statusDot = (st) => {
    const map = {
      active: "bg-emerald-500",
      running: "bg-blue-500",
      flag: "bg-amber-500",
      pending: "bg-orange-500",
      idle: "bg-gray-300",
      learning: "bg-purple-500",
    };
    return map[st] || "bg-gray-300";
  };

  const statusBadge = (st) => {
    const map = {
      active: "bg-emerald-50 text-emerald-600 border-emerald-100",
      running: "bg-blue-50 text-blue-600 border-blue-100",
      flag: "bg-amber-50 text-amber-600 border-amber-100",
      pending: "bg-orange-50 text-orange-600 border-orange-100",
      idle: "bg-gray-50 text-gray-400 border-gray-100",
      learning: "bg-purple-50 text-purple-600 border-purple-100",
    };
    return map[st] || "bg-gray-50 text-gray-400 border-gray-100";
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Total cash</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtCompact(s.totalCash)}</p>
              <p className="text-xs text-emerald-500">↑ {s.cashChangePct}% vs yesterday</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10"><Landmark className="w-5 h-5 text-blue-500" /></div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Liquidity (7d)</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtCompact(s.liquidity7d)}</p>
              <p className="text-xs text-amber-500">Moderate shortage ahead</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10"><Activity className="w-5 h-5 text-amber-500" /></div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Risk score</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{s.riskScore}</p>
              <p className="text-xs text-emerald-500">{s.riskLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10"><Shield className="w-5 h-5 text-green-500" /></div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Pending approvals</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{s.pendingApprovals}</p>
              <p className="text-xs text-red-500">{s.cfoRequired} needs CFO sign-off</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10"><Clock className="w-5 h-5 text-red-500" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Liquidity Forecast */}
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Liquidity forecast — 30 days</h3>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">Shortage day 12</span>
          </div>
          <div className="space-y-4">
            {forecast.map((f) => (
              <div key={f.currency} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{f.currency}</span>
                  <span className="text-[var(--text-muted)]">{f.currency === "PHP" ? "₱" : f.currency === "JPY" ? "¥" : f.currency === "EUR" ? "€" : "$"}{fmtCompact(f.amount)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onForecastDetail} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">Forecast detail ↗</button>
            <button onClick={onSuggestHedge} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">Suggest hedge ↗</button>
          </div>
        </div>

        {/* Pipeline + Alerts */}
        <div className="space-y-6">
          {/* Pipeline */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Pipeline status</h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">All running</span>
            </div>
            <div className="space-y-3">
              {pipeline.map((p) => (
                <div key={p.step} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-4">{p.step}</span>
                    <div className={`w-2 h-2 rounded-full ${statusDot(p.status)}`} />
                    <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${statusBadge(p.status)}`}>
                    {p.count ? `${p.count} pending` : p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Alerts</h3>
            {alerts.map((a) => (
              <div key={a.id} className={`p-3 rounded-xl border ${a.severity === "critical" ? "bg-red-50 border-red-100" : a.severity === "warning" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
                <p className={`text-xs font-medium ${a.severity === "critical" ? "text-red-600" : a.severity === "warning" ? "text-amber-600" : "text-blue-600"}`}>{a.type.toUpperCase()}</p>
                <p className="text-sm text-[var(--text-primary)] mt-0.5">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events, Approvals, AI Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Events</h3>
          <div className="space-y-3">
            {(data?.recentEvents || []).map((e) => {
              const typeColor = e.type === "incoming" ? "text-emerald-500" : e.type === "outgoing" ? "text-red-500" : e.type === "flag" ? "text-amber-500" : e.type === "action" ? "text-blue-500" : "text-[var(--text-muted)]";
              const typeLabel = e.type === "incoming" ? "In" : e.type === "outgoing" ? "Out" : e.type === "flag" ? "Flag" : e.type === "action" ? "Act" : "Upd";
              return (
                <div key={e.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 ${typeColor}`}>{typeLabel}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{e.stage}</span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mt-1">{e.description}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(e.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {e.entity}</p>
                  </div>
                  {e.amount > 0 && <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">{e.currency === "JPY" ? "¥" : e.currency === "PHP" ? "₱" : "$"}{fmtCompact(e.amount)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Approvals Queue */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Approvals Queue</h3>
            <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">{data?.approvalsQueue?.length || 0} pending</span>
          </div>
          <div className="space-y-3">
            {(data?.approvalsQueue || []).map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{a.title}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${a.priority === "critical" ? "bg-red-50 text-red-600 border-red-100" : a.priority === "high" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>{a.priority}</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">{a.workflowStep}</p>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{a.approverTier} · {a.requester}</span>
                  <span className="font-medium text-[var(--text-primary)]">{a.type === "fx_hedge" ? "¥" : "$"}{fmtCompact(a.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">AI Insights</h3>
          </div>
          <div className="space-y-3">
            {(data?.aiInsights || []).map((ins) => (
              <div key={ins.id} className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{ins.category}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{ins.confidence}% confidence</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{ins.stage}</p>
                <p className="text-sm text-[var(--text-primary)]">{ins.insight}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{ins.action}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{ins.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 12. FINANCIAL PLANNING SECTION
// ═══════════════════════════════════════════════════════════
export function FinancialPlanningSection({ data, filters, onFilterChange, onApprove, onReject, onLock }) {
  const kpis = data?.kpis || {};

  const statusBadge = (status) => {
    const map = {
      approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
      escalated: "bg-red-50 text-red-600 border-red-100",
      pending: "bg-amber-50 text-amber-600 border-amber-100",
      in_review: "bg-blue-50 text-blue-600 border-blue-100",
      draft: "bg-gray-50 text-gray-400 border-gray-100",
    };
    return map[status] || "bg-gray-50 text-gray-400 border-gray-100";
  };

  const riskBadge = (risk) => {
    const map = {
      high: "bg-red-50 text-red-600 border-red-100",
      medium: "bg-amber-50 text-amber-600 border-amber-100",
      low: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
    return map[risk] || "bg-gray-50 text-gray-400 border-gray-100";
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Revenue forecast</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{fmtCompact(kpis.revenueForecast?.value)}</p>
          <p className="text-xs text-red-500">↓ {Math.abs(kpis.revenueForecast?.change)}% {kpis.revenueForecast?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Budget utilized</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{kpis.budgetUtilized?.value}%</p>
          <p className="text-xs text-[var(--text-muted)]">{fmtCompact(kpis.budgetUtilized?.used)} of {fmtCompact(kpis.budgetUtilized?.total)}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Forecast accuracy</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{kpis.forecastAccuracy?.value}%</p>
          <p className="text-xs text-emerald-500">↑ {kpis.forecastAccuracy?.change} {kpis.forecastAccuracy?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Cash flow proj.</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{fmtCompact(kpis.cashFlowProjection?.value)}</p>
          <p className="text-xs text-amber-500">{kpis.cashFlowProjection?.note}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Variance</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{kpis.variance?.value}%</p>
          <p className="text-xs text-[var(--text-muted)]">{kpis.variance?.note}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Risk score</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{kpis.riskScore?.value}/{kpis.riskScore?.max}</p>
          <p className="text-xs text-emerald-500">{kpis.riskScore?.label}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold)]"
          />
        </div>
        <select className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]">
          <option>Departments</option>
          <option>Operations</option>
          <option>Engineering</option>
          <option>Marketing</option>
          <option>Sales</option>
        </select>
        <select className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]">
          <option>Q2 2026</option>
          <option>Q1 2026</option>
          <option>Q3 2026</option>
          <option>Q4 2026</option>
        </select>
        <button onClick={() => {}} className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Approve</button>
        <button onClick={onLock} className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Lock</button>
        <button onClick={() => {}} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"><Download className="w-4 h-4" />Export</button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column — Tables */}
        <div className="xl:col-span-2 space-y-6">
          {/* Budget Planning */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Budget planning</h3>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">3 over plan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-3">Department</th>
                    <th className="pb-2 pr-3">Period</th>
                    <th className="pb-2 pr-3 text-right">Allocated</th>
                    <th className="pb-2 pr-3 text-right">Used</th>
                    <th className="pb-2 pr-3 text-right">Variance</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {(data?.budgetPlanning || []).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{row.department}</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.period}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{fmtCompact(row.allocated)}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{fmtCompact(row.used)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${row.variance < 0 ? "text-red-500" : "text-emerald-500"}`}>{row.variance > 0 ? "+" : ""}{row.variance}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadge(row.status)}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forecast Versions */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Forecast versions</h3>
              <button className="px-2 py-1 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">New</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Department</th>
                    <th className="pb-2 pr-3">Ver.</th>
                    <th className="pb-2 pr-3 text-right">Revenue</th>
                    <th className="pb-2 pr-3 text-right">Variance</th>
                    <th className="pb-2 pr-3">Conf.</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {(data?.forecastVersions || []).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{row.name}</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.department}</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.version}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{fmtCompact(row.revenue)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${row.variance < 0 ? "text-red-500" : "text-emerald-500"}`}>{row.variance > 0 ? "+" : ""}{row.variance}%</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.confidence}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadge(row.status)}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Variance Analysis */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Variance analysis</h3>
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium border border-red-100">3 flagged</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-3">Department</th>
                    <th className="pb-2 pr-3 text-right">Planned</th>
                    <th className="pb-2 pr-3 text-right">Actual</th>
                    <th className="pb-2 pr-3 text-right">Variance</th>
                    <th className="pb-2 pr-3">Risk</th>
                    <th className="pb-2">AI note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {(data?.varianceAnalysis || []).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{row.department}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-muted)]">{fmtCompact(row.planned)}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{fmtCompact(row.actual)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${row.variance < 0 ? "text-red-500" : "text-emerald-500"}`}>{row.variance > 0 ? "+" : ""}{row.variance}%</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${riskBadge(row.risk)}`}>{row.risk}</span>
                      </td>
                      <td className="py-2 text-[var(--text-muted)]">{row.aiNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-6">
          {/* Approval Queue */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Approval queue</h3>
              <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">{(data?.approvalQueue || []).length}</span>
            </div>
            <div className="space-y-3">
              {(data?.approvalQueue || []).map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.approver === "CFO" ? "bg-red-50 text-red-600 border-red-100" : item.approver === "Mgr" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>{item.approver}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{fmtCompact(item.amount)} · {item.department} · {item.priority}</p>
                  <div className="flex gap-2">
                    <button onClick={() => onApprove?.(item)} className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:opacity-90">Approve</button>
                    <button onClick={() => onReject?.(item)} className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">AI insights</h3>
            <div className="space-y-3">
              {(data?.aiInsights || []).map((ins) => (
                <div key={ins.id} className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{ins.category}</p>
                  <p className="text-sm text-[var(--text-primary)]">{ins.insight}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{ins.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Indicators */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Risk indicators</h3>
            <div className="space-y-3">
              {(data?.riskIndicators || []).map((ri) => (
                <div key={ri.id} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-primary)]">{ri.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${riskBadge(ri.status)}`}>{ri.status} — {ri.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 13. FRAUD DETECTION SECTION
// ═══════════════════════════════════════════════════════════
export function FraudDetectionSection({ data, filters, onFilterChange, onSelectCase, onFreeze, onEscalate, onMarkSafe }) {
  const [alertFilter, setAlertFilter] = useState("all");
  const kpis = data?.kpis || {};
  const alerts = data?.alerts || [];
  const caseDetail = data?.selectedCase || null;
  const board = data?.investigationBoard || { detected: [], underReview: [], escalated: [], resolved: [] };
  const aiInsights = data?.aiInsights || [];
  const liveFeed = data?.liveFeed || [];

  const filteredAlerts = useMemo(() => {
    if (alertFilter === "all") return alerts;
    if (alertFilter === "30d") return alerts; // static data already recent
    return alerts.filter((a) => a.type.toLowerCase() === alertFilter.toLowerCase());
  }, [alerts, alertFilter]);

  const severityBadge = (s) => {
    const map = {
      critical: "bg-red-50 text-red-600 border-red-100",
      high: "bg-orange-50 text-orange-600 border-orange-100",
      medium: "bg-amber-50 text-amber-600 border-amber-100",
    };
    return map[s] || "bg-gray-50 text-gray-400 border-gray-100";
  };

  const scoreColor = (score) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-emerald-500";
  };

  const feedDot = (type) => {
    const map = { critical: "bg-red-500", warning: "bg-orange-500", success: "bg-emerald-500" };
    return map[type] || "bg-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fraud alerts</p>
          <p className="text-2xl font-bold text-red-600">{kpis.fraudAlerts?.value || 0}</p>
          <p className="text-xs text-red-500">↑ {kpis.fraudAlerts?.change} {kpis.fraudAlerts?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">High-risk txns</p>
          <p className="text-2xl font-bold text-orange-600">{kpis.highRiskTxns?.value || 0}</p>
          <p className="text-xs text-orange-500">↑ {kpis.highRiskTxns?.change} {kpis.highRiskTxns?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Blocked payments</p>
          <p className="text-2xl font-bold text-red-600">{kpis.blockedPayments?.value || 0}</p>
          <p className="text-xs text-red-500">↑ {kpis.blockedPayments?.change} {kpis.blockedPayments?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Open cases</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis.openCases?.value || 0}</p>
          <p className="text-xs text-red-500">↑ {kpis.openCases?.change} {kpis.openCases?.label}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Fraud exposure</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtCompact(kpis.fraudExposure?.value || 0)}</p>
          <p className="text-xs text-red-500">↑ {fmtCompact(kpis.fraudExposure?.change)}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">AI accuracy</p>
          <p className="text-2xl font-bold text-emerald-600">{kpis.aiAccuracy?.value || 0}%</p>
          <p className="text-xs text-emerald-500">↑ {kpis.aiAccuracy?.change}%</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Fraud Alerts Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Fraud alerts</h3>
              <div className="flex flex-wrap gap-2">
                {["all", "Payment", "Vendor", "Payroll", "30d"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAlertFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      alertFilter === f
                        ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {f === "all" ? "All" : f === "30d" ? "30d" : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border-color)]">
                    <th className="pb-2 pr-3">Alert ID</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3 text-right">Score</th>
                    <th className="pb-2 pr-3">Severity</th>
                    <th className="pb-2 pr-3">Entity</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredAlerts.map((row) => (
                    <tr key={row.id} className="cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => onSelectCase?.(row)}>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{row.id}</td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.type}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${scoreColor(row.score)}`} style={{ width: `${row.score}%` }} />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-primary)] w-5 text-right">{row.score}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${severityBadge(row.severity)}`}>{row.severity}</span>
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">{row.entity}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-primary)]">{row.amount ? fmtCompact(row.amount) : "—"}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadgeClass(row.status)}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Investigation Board */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Investigation board</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "detected", label: "Detected", count: board.detected.length, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                { key: "underReview", label: "Under review", count: board.underReview.length, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                { key: "escalated", label: "Escalated", count: board.escalated.length, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                { key: "resolved", label: "Resolved", count: board.resolved.length, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              ].map((col) => (
                <div key={col.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{col.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${col.bg} ${col.color} border ${col.border}`}>{col.count}</span>
                  </div>
                  <div className="space-y-2">
                    {(board[col.key] || []).map((card) => (
                      <div key={card.id} className="p-2.5 rounded-xl border border-[var(--border-color)] space-y-1 cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => onSelectCase?.(card)}>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{card.id}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{card.title}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-medium ${card.score >= 80 ? "text-red-500" : card.score >= 60 ? "text-orange-500" : "text-emerald-500"}`}>Score {card.score}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{card.sla}</span>
                        </div>
                        {card.assignee && <p className="text-[10px] text-[var(--text-muted)]">{card.assignee}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Case Detail */}
          {caseDetail && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Case {caseDetail.id}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{caseDetail.type}</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadgeClass(caseDetail.status.toLowerCase())}`}>{caseDetail.status}</span>
              </div>

              {/* Risk Score */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-red-600">{caseDetail.riskScore}</span>
                  <span className="text-xs font-medium text-red-500">Critical</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">AI confidence: {caseDetail.aiConfidence}%</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Rule-based", score: caseDetail.ruleScore },
                    { label: "AI model", score: caseDetail.aiModelScore },
                    { label: "Behavioral", score: caseDetail.behavioralScore },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)] w-16">{r.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreColor(r.score)}`} style={{ width: `${r.score}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-[var(--text-primary)] w-5 text-right">{r.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">AI insight</p>
                <p className="text-xs text-[var(--text-primary)]">{caseDetail.explanation}</p>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Event timeline</p>
                <div className="space-y-2">
                  {caseDetail.timeline.map((evt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${evt.type === "payment" ? "bg-red-500" : evt.type === "ai" ? "bg-orange-500" : evt.type === "case" ? "bg-blue-500" : "bg-red-600"}`} />
                      <div>
                        <p className="text-xs text-[var(--text-primary)]">{evt.event}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{evt.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onFreeze?.(caseDetail)} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Freeze payment</button>
                  <button onClick={() => onEscalate?.(caseDetail)} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Escalate</button>
                  <button onClick={() => onMarkSafe?.(caseDetail)} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Mark safe</button>
                  <button className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Request review</button>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">AI insights</h3>
            <div className="space-y-3">
              {aiInsights.map((ins) => (
                <div key={ins.id} className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{ins.title}</p>
                  <p className="text-xs text-[var(--text-primary)]">{ins.detail}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{ins.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Feed */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Live feed</h3>
            <div className="space-y-3">
              {liveFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${feedDot(item.type)}`} />
                  <div>
                    <p className="text-xs text-[var(--text-primary)]">{item.text}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 14. REPORTS SECTION
// ═══════════════════════════════════════════════════════════
export function ReportsSection({ reports = [], filters, onFilterChange, onDownload }) {
  const filtered = useMemo(() => {
    if (!filters?.category || filters.category === "all") return reports;
    return reports.filter((r) => r.category === filters.category);
  }, [reports, filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
            value={filters?.category || "all"}
            onChange={(e) => onFilterChange?.("category", e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Budgeting">Budgeting</option>
            <option value="Treasury">Treasury</option>
            <option value="Accounts Payable">Accounts Payable</option>
            <option value="Expense">Expense</option>
            <option value="Vendor">Vendor</option>
            <option value="Compliance">Compliance</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Report Name</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Format</th>
              <th className="pb-3 font-medium text-right">Size</th>
              <th className="pb-3 font-medium">Last Run</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="py-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                <td className="py-3 text-[var(--text-muted)]">{r.category}</td>
                <td className="py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                    {r.format}
                  </span>
                </td>
                <td className="py-3 text-right text-[var(--text-muted)]">{r.size}</td>
                <td className="py-3 text-[var(--text-muted)]">
                  {new Date(r.lastRun).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => onDownload?.(r)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 10. DRAWERS
// ═══════════════════════════════════════════════════════════
export function BudgetDetailDrawer({ budget, onClose }) {
  if (!budget) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] h-full shadow-2xl overflow-y-auto border-l border-[var(--border-color)]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{budget.costCenter} Budget</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-hover)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-muted)]">Total Budget</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{fmtCompact(budget.budget)}</p>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-muted)]">Remaining</p>
              <p className={`text-xl font-bold ${budget.remaining < 0 ? "text-red-500" : "text-[var(--text-primary)]"}`}>
                {fmtCompact(budget.remaining)}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Budget Lines</h3>
            {budget.lines?.map((line) => (
              <div key={line.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{line.account}</p>
                  <p className="text-xs text-[var(--text-muted)]">{fmtCompact(line.actual)} of {fmtCompact(line.budget)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{fmtCompact(line.committed)}</p>
                  <p className="text-xs text-[var(--text-muted)]">committed</p>
                </div>
              </div>
            )) || <p className="text-sm text-[var(--text-muted)]">No line items.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionDetailDrawer({ item, type, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] h-full shadow-2xl overflow-y-auto border-l border-[var(--border-color)]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{item.title || item.number || item.reference || "Transaction Detail"}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
              <span className="text-sm text-[var(--text-muted)]">Amount</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{fmtCompact(item.amount)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
              <span className="text-sm text-[var(--text-muted)]">Status</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            {item.requester && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)]">Requester</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.requester}</span>
              </div>
            )}
            {item.department && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)]">Department</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.department}</span>
              </div>
            )}
            {item.vendor && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)]">Vendor</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.vendor}</span>
              </div>
            )}
            {item.date && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)]">Date</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.date}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VendorDetailDrawer({ vendor, onClose }) {
  if (!vendor) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] h-full shadow-2xl overflow-y-auto border-l border-[var(--border-color)]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{vendor.name}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusBadgeClass(vendor.status)}`}>
              {statusLabel(vendor.status)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Tax ID: {vendor.taxId}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-hover)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-muted)]">Spend YTD</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{fmtCompact(vendor.spendYTD)}</p>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-muted)]">Risk Score</p>
              <p className={`text-xl font-bold ${vendor.riskScore > 40 ? "text-red-500" : "text-[var(--text-primary)]"}`}>{vendor.riskScore}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
            {[
              { label: "Category", value: vendor.category },
              { label: "Country", value: vendor.country },
              { label: "Onboarded", value: vendor.onboardingDate },
              { label: "Open POs", value: vendor.openPOs },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)]">{row.label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 11. MODALS
// ═══════════════════════════════════════════════════════════
export function CreatePRModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden border border-[var(--border-color)]">
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Create Purchase Requisition</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">Title</label>
            <input className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/20" placeholder="e.g. AWS Reserved Instances" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Amount</label>
              <input type="number" className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/20" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Department</label>
              <select className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none">
                <option>Engineering</option>
                <option>Sales</option>
                <option>Marketing</option>
                <option>Operations</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">Budget Line</label>
            <select className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none">
              <option>Cloud Infrastructure</option>
              <option>Software Tools</option>
              <option>Travel & Entertainment</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">Priority</label>
            <div className="flex gap-2">
              {["low", "medium", "high", "critical"].map((p) => (
                <button key={p} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] capitalize">
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">Cancel</button>
          <button onClick={onSubmit} className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-white text-sm font-medium hover:opacity-90">Submit PR</button>
        </div>
      </div>
    </div>
  );
}

export function BudgetTransferModal({ isOpen, onClose, onSubmit, budgets = [] }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-[var(--border-color)]">
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Budget Transfer</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">From Cost Center</label>
            <select className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none">
              {budgets?.map((b) => (
                <option key={b.id} value={b.id}>{b.costCenter} ({fmtCompact(b.remaining)} remaining)</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">To Cost Center</label>
            <select className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none">
              {budgets?.map((b) => (
                <option key={b.id} value={b.id}>{b.costCenter}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">Amount</label>
            <input type="number" className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--text-primary)]">Reason</label>
            <textarea className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent text-sm text-[var(--text-primary)] outline-none resize-none" rows={3} placeholder="Explain the reason for this transfer..." />
          </div>
        </div>
        <div className="p-6 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">Cancel</button>
          <button onClick={onSubmit} className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-white text-sm font-medium hover:opacity-90">Request Transfer</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 12. STATES
// ═══════════════════════════════════════════════════════════
export function FinanceTreasuryLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="w-8 h-8 text-[var(--brand-gold)] animate-spin" />
      <p className="text-sm text-[var(--text-muted)]">Loading finance control data...</p>
    </div>
  );
}

export function FinanceTreasuryErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <AlertTriangle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-red-500 font-medium">{message || "Failed to load finance data."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-[var(--bg-hover)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function FinanceTreasuryEmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-3">
      <FileText className="w-10 h-10 text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)]">{message || "No records found."}</p>
    </div>
  );
}
