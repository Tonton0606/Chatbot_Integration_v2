import { supabase } from "../../config/supabaseClient";

export const PAYMENT_STATUSES = [
  "Pending",
  "Paid",
  "Partially Paid",
  "Overdue",
  "Cancelled",
];

export const REVENUE_TYPES = [
  "One-time",
  "Recurring",
  "Retainer",
  "Project-based",
];

export const REVENUE_OWNERS = ["Unassigned"];

export const PAYMENT_STATUS_STYLES = {
  Paid: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
  Pending:
    "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
  "Partially Paid":
    "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
  Overdue:
    "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
  Cancelled:
    "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
};

function normalizeRevenueRecord(row) {
  const contact = row.contact || {};
  const stage = row.stage || {};

  return {
    id: row.id,
    deal_id: row.id,
    contact_id: row.contact_id || null,
    owner_id: row.assigned_admin_id || null,

    deal_name: row.title || "Untitled Opportunity",
    customer_name:
      contact.company_name ||
      contact.full_name ||
      "Unassigned Customer",

    owner_name: "Unassigned",

    close_date:
      row.expected_close_date ||
      row.updated_at?.slice(0, 10) ||
      row.created_at?.slice(0, 10) ||
      "",

    amount: Number(row.expected_revenue || 0),

    revenue_type: "Project-based",
    payment_status: "Paid",

    source: row.source || "manual",

    stage_name: stage.name || row.status || "won",
    notes: row.description || "",

    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isWonOpportunity(row) {
  return row.status === "won" || row.stage?.is_won === true;
}

function monthLabel(dateValue) {
  if (!dateValue) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

function buildMonthlyRevenue(records) {
  const grouped = records.reduce((acc, record) => {
    const key = monthLabel(record.close_date || record.created_at);

    acc[key] = acc[key] || 0;
    acc[key] += Number(record.amount || 0);

    return acc;
  }, {});

  return Object.entries(grouped).map(([month, amount]) => ({
    month,
    amount,
  }));
}

function buildRevenueBySource(records) {
  const grouped = records.reduce((acc, record) => {
    const key = record.source || "manual";

    acc[key] = acc[key] || 0;
    acc[key] += Number(record.amount || 0);

    return acc;
  }, {});

  return Object.entries(grouped).map(([source, amount]) => ({
    source,
    amount,
  }));
}

function buildRevenueByOwner(records) {
  const grouped = records.reduce((acc, record) => {
    const key = record.owner_name || "Unassigned";

    acc[key] = acc[key] || {
      owner_name: key,
      amount: 0,
      deals_count: 0,
    };

    acc[key].amount += Number(record.amount || 0);
    acc[key].deals_count += 1;

    return acc;
  }, {});

  return Object.values(grouped);
}

function buildRevenueInsights(records) {
  const kpis = getRevenueKPIs(records);

  return [
    {
      id: "revenue_insight_total",
      type: kpis.total > 0 ? "positive" : "info",
      title: "Revenue Source",
      description:
        records.length > 0
          ? "Revenue is now derived from won CRM opportunities instead of mock records."
          : "No won CRM opportunities found yet. Revenue will populate once opportunities are marked as won.",
      confidence: 90,
    },
    {
      id: "revenue_insight_pipeline",
      type: "info",
      title: "Payment Tracking",
      description:
        "Payment status is currently treated as Paid for won opportunities. Add a dedicated revenue/payment table later for invoices, partial payments, and overdue tracking.",
      confidence: 82,
    },
    {
      id: "revenue_insight_recurring",
      type: "warning",
      title: "Revenue Model Gap",
      description:
        "Revenue type is currently inferred as Project-based. Add contract type or revenue type fields when finance tracking becomes a priority.",
      confidence: 78,
    },
  ];
}

export async function getRevenueData() {
  const { data, error } = await supabase
    .from("crm_opportunities")
    .select(`
      id,
      lead_id,
      contact_id,
      stage_id,
      title,
      expected_revenue,
      probability,
      status,
      expected_close_date,
      description,
      assigned_admin_id,
      source,
      created_at,
      updated_at,
      contact:contacts (
        id,
        full_name,
        email,
        phone,
        company_name,
        status
      ),
      stage:crm_stages (
        id,
        key,
        name,
        probability,
        is_won,
        is_lost
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const records = (data || [])
    .filter(isWonOpportunity)
    .map(normalizeRevenueRecord);

  return {
    records,
    monthlyRevenue: buildMonthlyRevenue(records),
    revenueBySource: buildRevenueBySource(records),
    revenueByOwner: buildRevenueByOwner(records),
    insights: buildRevenueInsights(records),
  };
}

export function filterRevenueRecords(records, filters) {
  return records.filter((record) => {
    const search = (filters.search || "").toLowerCase();

    const matchesSearch =
      !search ||
      record.deal_name.toLowerCase().includes(search) ||
      record.customer_name.toLowerCase().includes(search);

    const matchesStatus =
      filters.status === "all" ||
      record.payment_status === filters.status;

    const matchesType =
      filters.type === "all" ||
      record.revenue_type === filters.type;

    const matchesOwner =
      filters.owner === "all" ||
      record.owner_name === filters.owner;

    return matchesSearch && matchesStatus && matchesType && matchesOwner;
  });
}

export function getRevenueKPIs(records) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const total = records.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0
  );

  const thisMonth = records
    .filter((record) => record.close_date?.startsWith(currentMonth))
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const paid = records
    .filter((record) => record.payment_status === "Paid")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const overdue = records
    .filter((record) => record.payment_status === "Overdue")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const recurring = records
    .filter(
      (record) =>
        record.revenue_type === "Recurring" ||
        record.revenue_type === "Retainer"
    )
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const average =
    records.length > 0 ? Math.round(total / records.length) : 0;

  return {
    total,
    thisMonth,
    paid,
    overdue,
    recurring,
    average,
    recordsCount: records.length,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value || 0);
}
