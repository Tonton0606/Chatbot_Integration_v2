import { supabase } from "../../config/supabaseClient";

export const CLIENT_PAYMENT_STATUSES = [
  "Pending",
  "Paid",
  "Partially Paid",
  "Overdue",
  "Cancelled",
];

export const CLIENT_REVENUE_TYPES = [
  "One-time",
  "Recurring",
  "Retainer",
  "Project-based",
];

export const CLIENT_PAYMENT_STATUS_STYLES = {
  Paid: "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]",
  Pending:
    "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
  "Partially Paid":
    "border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]",
  Overdue: "border-red-500/20 bg-[var(--danger-soft)] text-[var(--danger)]",
  Cancelled:
    "border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)]",
};

export const CLIENT_REVENUE_OWNERS = ["Unassigned"];

function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function getAssignmentLabel(row) {
  if (row.assignment_type === "self") return "Self";

  if (row.assignment_type === "employee") {
    return row.assigned_user?.full_name || row.assigned_user?.email || "Employee";
  }

  if (row.assignment_type === "contact") {
    return row.assigned_contact?.full_name || "Contact";
  }

  if (row.assignment_type === "other") {
    return row.assigned_name || "Other";
  }

  return "Unassigned";
}

function normalizeClientRevenueRecord(row) {
  const contact = row.contact || {};

  return {
    id: row.id,
    deal_id: row.id,
    workspace_id: row.workspace_id,
    contact_id: row.contact_id || null,
    owner_id: row.assigned_user_id || row.assigned_contact_id || null,

    deal_name: row.title || "Untitled Deal",
    customer_name:
      contact.company_name || contact.full_name || "Unassigned Customer",

    contact_name: contact.full_name || "",
    company_name: contact.company_name || "",
    email: contact.email || "",
    phone: contact.phone || "",

    owner_name: getAssignmentLabel(row),

    close_date:
      row.expected_close_date ||
      row.updated_at?.slice(0, 10) ||
      row.created_at?.slice(0, 10) ||
      "",

    amount: Number(row.expected_revenue || 0),

    revenue_type: "Project-based",
    payment_status: "Paid",

    source: row.source || "manual",
    stage_name: row.stage || row.status || "won",
    notes: row.description || "",

    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
  const kpis = getClientRevenueKPIs(records);

  return [
    {
      id: "client_revenue_insight_total",
      type: kpis.total > 0 ? "positive" : "info",
      title: "Revenue Source",
      description:
        records.length > 0
          ? "Revenue is derived from won client deals in this workspace."
          : "No won client deals found yet. Revenue will populate once deals are marked as won.",
      confidence: 90,
    },
    {
      id: "client_revenue_insight_payment",
      type: "info",
      title: "Payment Tracking",
      description:
        "Payment status is currently treated as Paid for won deals. Add a dedicated invoice/payment table later for partial payments and overdue tracking.",
      confidence: 82,
    },
    {
      id: "client_revenue_insight_model",
      type: "warning",
      title: "Revenue Model Gap",
      description:
        "Revenue type is currently inferred as Project-based. Add contract type or revenue type fields when finance tracking becomes a priority.",
      confidence: 78,
    },
  ];
}

export async function getClientRevenueData(workspaceId) {
  requireWorkspaceId(workspaceId);

  const { data, error } = await supabase
    .from("client_deals")
    .select(`
      id,
      workspace_id,
      lead_id,
      contact_id,
      title,
      stage,
      expected_revenue,
      probability,
      status,
      expected_close_date,
      description,
      source,
      created_by,
      created_at,
      updated_at,
      archived_at,
      assignment_type,
      assigned_user_id,
      assigned_contact_id,
      assigned_name,
      contact:client_contacts!client_deals_contact_id_fkey (
        id,
        full_name,
        email,
        phone,
        company_name,
        status
      ),
      assigned_contact:client_contacts!client_deals_assigned_contact_id_fkey (
        id,
        full_name,
        email,
        phone,
        company_name
      ),
      assigned_user:profiles!client_deals_assigned_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("workspace_id", workspaceId)
    .eq("status", "won")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const records = (data || []).map(normalizeClientRevenueRecord);

  return {
    records,
    monthlyRevenue: buildMonthlyRevenue(records),
    revenueBySource: buildRevenueBySource(records),
    revenueByOwner: buildRevenueByOwner(records),
    insights: buildRevenueInsights(records),
    owners: [
      ...new Set(records.map((record) => record.owner_name).filter(Boolean)),
    ],
  };
}

export function filterClientRevenueRecords(records, filters) {
  return records.filter((record) => {
    const search = (filters.search || "").toLowerCase();

    const matchesSearch =
      !search ||
      record.deal_name.toLowerCase().includes(search) ||
      record.customer_name.toLowerCase().includes(search);

    const matchesStatus =
      filters.status === "all" || record.payment_status === filters.status;

    const matchesType =
      filters.type === "all" || record.revenue_type === filters.type;

    const matchesOwner =
      filters.owner === "all" || record.owner_name === filters.owner;

    return matchesSearch && matchesStatus && matchesType && matchesOwner;
  });
}

export function getClientRevenueKPIs(records) {
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

  const average = records.length > 0 ? Math.round(total / records.length) : 0;

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
