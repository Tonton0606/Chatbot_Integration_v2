import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Eye,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import {
  CLIENT_PAYMENT_STATUSES,
  CLIENT_REVENUE_OWNERS,
  CLIENT_PAYMENT_STATUS_STYLES,
  formatCurrency,
} from "../../../services/clientRevenue";

const panelClass =
  "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm";

const iconBoxClass =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)]";

const secondaryButtonClass =
  "inline-flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]";

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ClientRevenueHeader({ onRefresh }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Sales &amp; CRM
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Revenue
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Workspace revenue from won deals, payment status, and sales
          performance.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className={secondaryButtonClass}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh Revenue
      </button>
    </div>
  );
}

const colorClasses = (color) => {
  const map = {
    blue: { icon: "text-[var(--brand-cyan)] bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]", bar: "bg-[var(--brand-cyan)]", text: "text-[var(--brand-cyan)]" },
    amber: { icon: "text-amber-500 bg-amber-500/10 border-amber-500/30", bar: "bg-amber-500", text: "text-amber-500" },
    green: { icon: "text-[var(--success)] bg-[var(--success-soft)] border-green-500/20", bar: "bg-[var(--success)]", text: "text-[var(--success)]" },
    gold: { icon: "text-[var(--brand-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]", bar: "bg-[var(--brand-gold)]", text: "text-[var(--brand-gold)]" },
  };
  return map[color] || map.blue;
};
export function ClientRevenueKPICards({ kpis }) {
  const cards = [
    {
      title: "Total Revenue",
      value: kpis.total,
      helper: "All tracked won revenue",
      icon: DollarSign,
      color: "gold",
      progress: 80,
    },
    {
      title: "Won This Month",
      value: kpis.thisMonth,
      helper: "Closed revenue this month",
      icon: TrendingUp,
      color: "gold",
      progress: 65,
    },
    {
      title: "Recurring Revenue",
      value: kpis.recurring,
      helper: "Recurring and retainer revenue",
      icon: CreditCard,
      color: "blue",
      progress: 50,
    },
    {
      title: "Average Deal",
      value: kpis.average,
      helper: `${kpis.recordsCount || 0} won revenue records`,
      icon: AlertTriangle,
      color: "gold",
      progress: 60,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses(card.color);

        return (
          <div key={card.title} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm flex flex-col p-5">
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="min-h-[32px] text-xs font-bold uppercase leading-snug tracking-wider text-[var(--text-muted)]">
                  {card.title}
                </p>

                <h3 className={`mt-2 text-xl 2xl:text-2xl font-bold ${colors.text}`}>
                  {formatCurrency(card.value)}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                  {card.helper}
                </p>
              </div>

              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1 w-full rounded-full bg-[var(--hover-bg)]">
              <div
                className={`h-1 rounded-full ${colors.bar}`}
                style={{ width: `${Math.min(card.progress, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClientRevenueChartsGrid({
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
        barColor="bg-[var(--success)]"
        textColor="text-[var(--success)]"
      />

      <RevenueListCard
        title="Revenue by Owner"
        items={revenueByOwner}
        labelKey="owner_name"
        valueKey="amount"
        subValueKey="deals_count"
        subValueSuffix="deals"
        barColor="bg-[var(--brand-cyan)]"
        textColor="text-[var(--brand-cyan)]"
      />

      <RevenueListCard
        title="Revenue by Source"
        items={revenueBySource}
        labelKey="source"
        valueKey="amount"
        barColor="bg-[var(--brand-gold)]"
        textColor="text-[var(--brand-gold)]"
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
  barColor = "bg-[var(--brand-gold)]",
  textColor = "text-[var(--brand-gold)]",
}) {
  const maxValue = Math.max(
    ...items.map((item) => Number(item[valueKey] || 0)),
    1
  );

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
                      {labelize(item[labelKey])}
                    </p>

                    {subValueKey && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {item[subValueKey]} {subValueSuffix}
                      </p>
                    )}
                  </div>

                  <p className={`flex-shrink-0 text-sm font-bold ${textColor}`}>
                    {formatCurrency(value)}
                  </p>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hover-bg)]">
                  <div
                    className={`h-full rounded-full ${barColor}`}
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

export function ClientRevenueInsightsPanel({ insights = [] }) {
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

export function ClientRevenueFilterToolbar({
  filters,
  onChange,
  onClear,
  owners = [],
}) {
  const ownerOptions = owners.length > 0 ? owners : CLIENT_REVENUE_OWNERS;

  return (
    <div className={`${panelClass} p-3`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_96px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />

          <input
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Search deal or customer..."
            className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gold)] focus:ring-2 focus:ring-[var(--brand-gold-soft)]"
          />
        </div>

        <select
          value={filters.status}
          onChange={(event) => onChange("status", event.target.value)}
          className="h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Status</option>

          {CLIENT_PAYMENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          className="h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Owners</option>

          {ownerOptions.map((item) => (
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

export function ClientRevenueTable({ records, onSelect }) {
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
                      CLIENT_PAYMENT_STATUS_STYLES[record.payment_status] ||
                      CLIENT_PAYMENT_STATUS_STYLES.Paid
                    }`}
                  >
                    {record.payment_status}
                  </span>
                </td>

                <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                  {record.close_date || "No date"}
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

export function ClientRevenueDetailDrawer({ record, onClose }) {
  if (!record) return null;

  const details = [
    ["Revenue ID", record.id],
    ["Deal", record.deal_name],
    ["Customer", record.customer_name],
    ["Contact", record.contact_name],
    ["Company", record.company_name],
    ["Email", record.email],
    ["Phone", record.phone],
    ["Owner", record.owner_name],
    ["Close Date", record.close_date],
    ["Type", record.revenue_type],
    ["Source", labelize(record.source)],
    ["Status", record.payment_status],
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
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
              type="button"
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
        </div>
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

export function ClientRevenueLoadingState() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Loading revenue data...
      </p>
    </div>
  );
}

export function ClientRevenueErrorState({ message, onRetry }) {
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
            className="mt-4 rounded-2xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientRevenueEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center">
      <DollarSign className="mx-auto h-10 w-10 text-[var(--text-muted)]" />

      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        No revenue records found
      </h3>

      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Revenue records will appear here once workspace deals are marked as won.
      </p>
    </div>
  );
}
