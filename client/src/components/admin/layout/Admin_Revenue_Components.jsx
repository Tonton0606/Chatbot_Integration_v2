import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import {
  PAYMENT_STATUSES,
  REVENUE_OWNERS,
  PAYMENT_STATUS_STYLES,
  formatCurrency,
} from "../../../services/sales_crm/revenue";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const subtlePanelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const secondaryButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]";

const goldButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-gold)] transition hover:bg-[var(--hover-bg)]";

export function RevenueHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales & CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Revenue
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Revenue from won deals, payment tracking, and financial performance.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </button>

        <button type="button" className={goldButtonClass}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Won Deals
        </button>
      </div>
    </div>
  );
}

export function RevenueKPICards({ kpis }) {
  const cards = [
    {
      title: "Total Revenue",
      value: kpis.total,
      helper: "All tracked won revenue",
      icon: DollarSign,
      tone: "text-[var(--brand-gold)]",
    },
    {
      title: "Won This Month",
      value: kpis.thisMonth,
      helper: "Closed revenue this month",
      icon: TrendingUp,
      tone: "text-[var(--success)]",
    },
    {
      title: "Recurring Revenue",
      value: kpis.recurring,
      helper: "Recurring and retainer revenue",
      icon: CreditCard,
      tone: "text-[var(--brand-gold)]",
    },
    {
      title: "Overdue Revenue",
      value: kpis.overdue,
      helper: "Needs finance follow-up",
      icon: AlertTriangle,
      tone: "text-[var(--danger)]",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.title} className={`${panelClass} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.title}
                </p>

                <h3 className={`mt-4 truncate text-2xl font-bold ${card.tone}`}>
                  {formatCurrency(card.value)}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {card.helper}
                </p>
              </div>

              <div className={iconBoxClass}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1 rounded-full bg-[var(--hover-bg)]">
              <div className="h-1 w-3/5 rounded-full bg-[var(--brand-gold)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RevenueChartsGrid({
  monthlyRevenue,
  revenueByOwner,
  revenueBySource,
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <RevenueListCard
        title="Monthly Revenue"
        items={monthlyRevenue}
        labelKey="month"
        valueKey="amount"
      />

      <RevenueListCard
        title="Revenue by Owner"
        items={revenueByOwner}
        labelKey="owner_name"
        valueKey="amount"
        subValueKey="deals_count"
        subValueSuffix="deals"
      />

      <RevenueListCard
        title="Revenue by Source"
        items={revenueBySource}
        labelKey="source"
        valueKey="amount"
      />
    </div>
  );
}

function RevenueListCard({
  title,
  items = [],
  labelKey,
  valueKey,
  subValueKey,
  subValueSuffix,
}) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className={`${panelClass} p-5`}>
      <h3 className="mb-4 border-b border-[var(--border-color)] pb-3 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No data yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const value = Number(item[valueKey] || 0);
            const width = Math.max((value / maxValue) * 100, 8);

            return (
              <div key={item[labelKey]}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item[labelKey]}
                    </p>

                    {subValueKey && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {item[subValueKey]} {subValueSuffix}
                      </p>
                    )}
                  </div>

                  <p className="flex-shrink-0 text-sm font-bold text-[var(--brand-gold)]">
                    {formatCurrency(value)}
                  </p>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand-gold)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RevenueInsightsPanel({ insights = [] }) {
  const toneClass = {
    warning:
      "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    positive:
      "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
    info: "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-primary)]",
  };

  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-[var(--text-primary)]">
            AI Revenue Intelligence
          </h3>

          <p className="text-xs text-[var(--text-muted)]">
            Requires finance and sales review before action
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-4 ${
              toneClass[item.type] || toneClass.info
            }`}
          >
            <h4 className="font-semibold">{item.title}</h4>

            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {item.description}
            </p>

            {item.confidence && (
              <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
                {item.confidence}% confidence
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueFilterToolbar({ filters, onChange, onClear }) {
  return (
    <div className={`${subtlePanelClass} p-3`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_96px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />

          <input
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search deal or customer..."
            className="input-base h-10 rounded-xl pl-10"
          />
        </div>

        <select
          value={filters.status}
          onChange={(event) => onChange("status", event.target.value)}
          className="input-base h-10 rounded-xl"
        >
          <option value="all">All Status</option>

          {PAYMENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          className="input-base h-10 rounded-xl"
        >
          <option value="all">All Owners</option>

          {REVENUE_OWNERS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function RevenueTable({ records, onSelect }) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-[var(--border-color)] px-5 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-[var(--text-primary)]">
            Revenue Records
          </h3>

          <p className="text-sm text-[var(--text-muted)]">
            {records.length} records
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr className="border-b border-[var(--border-color)]">
              {[
                "Deal",
                "Customer",
                "Owner",
                "Amount",
                "Type",
                "Status",
                "Close Date",
                "",
              ].map((header) => (
                <th
                  key={header}
                  className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--hover-bg)]"
              >
                <td className="px-5 py-3">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {record.deal_name}
                  </p>

                  <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--text-muted)]">
                    {record.id}
                  </p>
                </td>

                <td className="px-5 py-3 text-sm font-medium text-[var(--brand-gold)]">
                  {record.customer_name}
                </td>

                <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                  {record.owner_name}
                </td>

                <td className="px-5 py-3 font-bold text-[var(--brand-gold)]">
                  {formatCurrency(record.amount)}
                </td>

                <td className="px-5 py-3">
                  <span className="rounded-full border border-[var(--border-color)] bg-[var(--hover-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {record.revenue_type}
                  </span>
                </td>

                <td className="px-5 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${
                      PAYMENT_STATUS_STYLES[record.payment_status]
                    }`}
                  >
                    {record.payment_status}
                  </span>
                </td>

                <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                  {record.close_date}
                </td>

                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(record)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    <Eye className="h-4 w-4" />
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

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-[var(--text-primary)]">
        {value || "—"}
      </p>
    </div>
  );
}

export function RevenueLoadingState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand-gold)]" />

      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
        Loading revenue data...
      </p>
    </div>
  );
}

export function RevenueErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--danger)]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--danger)]">
            Failed to load revenue
          </h3>

          <p className="mt-1 text-sm text-[var(--danger)]">{message}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function RevenueEmptyState() {
  return (
    <div className={`${panelClass} p-10 text-center`}>
      <DollarSign className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No revenue records found
      </h3>

      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Revenue records will appear here once won deals are synced.
      </p>
    </div>
  );
}

export function RevenueByOwnerChart({ data = [] }) {
  const max = Math.max(...data.map((item) => item.amount), 1);

  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-5">
        <h3 className="font-bold text-[var(--text-primary)]">
          Revenue by Owner
        </h3>

        <p className="text-sm text-[var(--text-muted)]">
          Sales ownership contribution
        </p>
      </div>

      <div className="space-y-4">
        {data.map((owner) => {
          const width = (owner.amount / max) * 100;

          return (
            <div key={owner.owner}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {owner.owner}
                  </p>

                  <p className="text-xs text-[var(--text-muted)]">
                    {owner.deals} deals
                  </p>
                </div>

                <p className="font-bold text-[var(--brand-gold)]">
                  {formatCurrency(owner.amount)}
                </p>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--brand-gold)]"
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RevenueBySourceChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + Number(item.amount), 0) || 1;

  return (
    <div className={`${panelClass} p-5`}>
      <div className="mb-5">
        <h3 className="font-bold text-[var(--text-primary)]">
          Revenue Sources
        </h3>

        <p className="text-sm text-[var(--text-muted)]">
          Distribution by acquisition channel
        </p>
      </div>

      <div className="mb-6 flex h-2 overflow-hidden rounded-full bg-[var(--hover-bg)]">
        {data.map((item) => (
          <div
            key={item.source}
            style={{
              width: `${(item.amount / total) * 100}%`,
              background: item.color || "var(--brand-gold)",
            }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.source} className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-sm"
              style={{
                background: item.color || "var(--brand-gold)",
              }}
            />

            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {item.source}
              </p>
            </div>

            <p className="font-semibold text-[var(--brand-gold)]">
              {formatCurrency(item.amount)}
            </p>

            <p className="w-14 text-right text-xs text-[var(--text-muted)]">
              {((item.amount / total) * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueDetailDrawer({ record, onClose }) {
  if (!record) return null;

  const details = [
    ["Revenue ID", record.id],
    ["Deal", record.deal_name],
    ["Customer", record.customer_name],
    ["Owner", record.owner_name || record.owner],
    ["Close Date", record.close_date],
    ["Type", record.revenue_type || record.type],
    ["Source", record.source],
    ["Status", record.payment_status],
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Revenue Details
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {record.deal_name}
              </h2>

              <p className="mt-1 text-sm text-[var(--brand-gold)]">
                {record.customer_name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={`${panelClass} mb-6 p-5`}>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Amount
            </p>

            <h1 className="mt-3 text-4xl font-bold text-[var(--brand-gold)]">
              {formatCurrency(record.amount)}
            </h1>
          </div>

          <div className={`${panelClass} p-5`}>
            <div className="space-y-5">
              {details.map(([label, value]) => (
                <DetailItem key={label} label={label} value={value} />
              ))}
            </div>
          </div>

          {record.notes && (
            <div className={`${panelClass} mt-6 p-5`}>
              <h4 className="mb-3 font-semibold text-[var(--text-primary)]">
                Notes
              </h4>

              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {record.notes}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] py-3 font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">
              Edit
            </button>

            <button className="flex-1 rounded-xl border border-green-500/20 bg-[var(--success-soft)] py-3 font-semibold text-[var(--success)]">
              Mark Paid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
