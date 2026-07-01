import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Activity, RefreshCw, AlertCircle
} from "lucide-react";
import { getFinanceKPIs, getPnLReport } from "../../../services/finance_treasury/index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWorkspaceId() {
  return localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id");
}

function formatPHP(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPct(value) {
  return (value >= 0 ? "+" : "") + (value || 0).toFixed(1) + "%";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, trend, color = "blue", note }) {
  const colors = {
    blue:   "bg-blue-500/10 text-blue-500",
    green:  "bg-green-500/10 text-green-500",
    red:    "bg-red-500/10 text-red-500",
    amber:  "bg-amber-500/10 text-amber-500",
    purple: "bg-purple-500/10 text-purple-500",
  };
  const trendPositive = trend !== undefined && trend >= 0;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 ${trendPositive ? "text-green-500" : "text-red-500"}`}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPct(trend)}
          </span>
        )}
        {note && <span className="text-xs text-gray-400">{note}</span>}
      </div>
    </div>
  );
}

function SectionBar({ label, value, total, color = "bg-blue-500" }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{formatPHP(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientAccounting() {
  const [kpis, setKpis] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  const workspaceId = getWorkspaceId();

  // Rolling 30-day window
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const load = useCallback(async () => {
    if (!workspaceId) { setError("No workspace found."); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [k, p] = await Promise.all([
        getFinanceKPIs(workspaceId),
        getPnLReport(workspaceId, { dateFrom, dateTo }).catch(() => null),
      ]);
      setKpis(k);
      setPnl(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const margin = kpis && kpis.totalRevenue > 0
    ? ((kpis.netIncome / kpis.totalRevenue) * 100).toFixed(1)
    : "0.0";

  const budgetUsedPct = kpis && kpis.totalBudgetAllocated > 0
    ? ((kpis.totalBudgetSpent / kpis.totalBudgetAllocated) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Financial Overview</h1>
          <p className="text-sm text-gray-500">Month-to-date financial summary — read-only view</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={TrendingUp} label="Total Revenue" value={formatPHP(kpis?.totalRevenue)} color="green" />
            <KPICard icon={TrendingDown} label="Total Expenses" value={formatPHP(kpis?.totalExpenses)} color="red" />
            <KPICard
              icon={DollarSign}
              label="Net Income"
              value={formatPHP(kpis?.netIncome)}
              color={kpis?.netIncome >= 0 ? "blue" : "red"}
              note={`${margin}% margin`}
            />
            <KPICard icon={Activity} label="Cash Position" value={formatPHP(kpis?.netCashPosition)} color="purple" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
            {["overview", "p&l", "budget"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium uppercase border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? "border-[var(--brand-gold,#f59e0b)] text-[var(--brand-gold,#f59e0b)]"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue vs Expenses */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue vs Expenses</h3>
                <div className="space-y-4">
                  <SectionBar label="Revenue" value={kpis?.totalRevenue} total={kpis?.totalRevenue} color="bg-green-500" />
                  <SectionBar label="Expenses" value={kpis?.totalExpenses} total={kpis?.totalRevenue} color="bg-red-400" />
                  <div className="border-t border-gray-100 dark:border-white/10 pt-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-700 dark:text-gray-300">Net Income</span>
                      <span className={kpis?.netIncome >= 0 ? "text-green-600" : "text-red-500"}>
                        {formatPHP(kpis?.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget utilization */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Budget Utilization</h3>
                <div className="space-y-4">
                  <SectionBar label="Spent" value={kpis?.totalBudgetSpent} total={kpis?.totalBudgetAllocated} color="bg-amber-400" />
                  <SectionBar label="Remaining" value={(kpis?.totalBudgetAllocated || 0) - (kpis?.totalBudgetSpent || 0)} total={kpis?.totalBudgetAllocated} color="bg-blue-400" />
                  <div className="border-t border-gray-100 dark:border-white/10 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Allocated</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPHP(kpis?.totalBudgetAllocated)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Utilization</span>
                      <span className={`font-medium ${parseFloat(budgetUsedPct) > 90 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                        {budgetUsedPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Approvals */}
              {kpis?.pendingApprovals > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-amber-800 dark:text-amber-400">
                      {kpis.pendingApprovals} transaction{kpis.pendingApprovals !== 1 ? "s" : ""} pending approval
                    </span>
                    <span className="text-amber-600 dark:text-amber-500 ml-2">
                      — {formatPHP(kpis.pendingApprovalValue)} total value
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* P&L Tab */}
          {tab === "p&l" && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Profit & Loss Statement</h3>
                <span className="text-xs text-gray-400">
                  {dateFrom} — {dateTo}
                </span>
              </div>

              {pnl ? (
                <div className="space-y-3 text-sm">
                  {/* Revenue */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Revenue</p>
                    {(pnl.revenue_items || []).map((item, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-gray-50 dark:border-white/5">
                        <span className="text-gray-600 dark:text-gray-400">{item.account_name}</span>
                        <span className="font-medium text-green-600">{formatPHP(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-semibold">
                      <span>Total Revenue</span>
                      <span className="text-green-600">{formatPHP(pnl.total_revenue)}</span>
                    </div>
                  </div>

                  {/* COGS */}
                  {(pnl.cogs_items || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cost of Goods Sold</p>
                      {pnl.cogs_items.map((item, i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-gray-50 dark:border-white/5">
                          <span className="text-gray-600 dark:text-gray-400">{item.account_name}</span>
                          <span className="text-gray-900 dark:text-white">{formatPHP(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2">
                        <span className="font-medium">Gross Profit</span>
                        <span className="font-semibold">{formatPHP(pnl.gross_profit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Expenses */}
                  {(pnl.expense_items || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Operating Expenses</p>
                      {pnl.expense_items.map((item, i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-gray-50 dark:border-white/5">
                          <span className="text-gray-600 dark:text-gray-400">{item.account_name}</span>
                          <span className="text-red-500">{formatPHP(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Net Income */}
                  <div className="border-t-2 border-gray-200 dark:border-white/20 pt-3">
                    <div className="flex justify-between font-bold text-base">
                      <span>Net Income</span>
                      <span className={pnl.net_income >= 0 ? "text-green-600" : "text-red-500"}>
                        {formatPHP(pnl.net_income)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No P&L data available for this period.</p>
                </div>
              )}
            </div>
          )}

          {/* Budget Tab */}
          {tab === "budget" && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Budget Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {[
                  { label: "Total Allocated", value: formatPHP(kpis?.totalBudgetAllocated), cls: "" },
                  { label: "Total Spent", value: formatPHP(kpis?.totalBudgetSpent), cls: "text-red-500" },
                  { label: "Remaining", value: formatPHP((kpis?.totalBudgetAllocated || 0) - (kpis?.totalBudgetSpent || 0)), cls: "text-green-600" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-lg bg-gray-50 dark:bg-white/5 p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">{label}</p>
                    <p className={`font-bold text-lg ${cls || "text-gray-900 dark:text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Budget Utilized</span>
                  <span>{budgetUsedPct}%</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${parseFloat(budgetUsedPct) > 90 ? "bg-red-500" : parseFloat(budgetUsedPct) > 70 ? "bg-amber-400" : "bg-green-500"}`}
                    style={{ width: `${Math.min(parseFloat(budgetUsedPct), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
