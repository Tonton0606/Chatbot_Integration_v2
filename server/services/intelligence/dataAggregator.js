/**
 * Intelligence Reports — Data Aggregator Service
 * Pulls live data from all ERP modules and normalises it
 * for AI summarisation and report generation.
 */

const { supabase } = require("../../config/supabase");

// ── helpers ─────────────────────────────────────────────────────────────────

function safe(arr) {
  return Array.isArray(arr) ? arr : [];
}

function dateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function pct(a, b) {
  if (!b) return 0;
  return Math.round(((a - b) / b) * 100);
}

// ── per-module aggregators ───────────────────────────────────────────────────

async function aggregateCRM(workspaceId, days = 30) {
  const { start, end } = dateRange(days);

  const [dealsRes, customersRes, contactsRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id,value,status,stage,created_at,closed_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("customers")
      .select("id,status,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("contacts")
      .select("id,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
  ]);

  const deals = safe(dealsRes.data);
  const customers = safe(customersRes.data);
  const contacts = safe(contactsRes.data);

  const won = deals.filter((d) => d.status === "closed_won");
  const lost = deals.filter((d) => d.status === "closed_lost");
  const pipeline = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.status));
  const totalValue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const pipelineValue = pipeline.reduce((s, d) => s + Number(d.value || 0), 0);
  const conversionRate = deals.length ? Math.round((won.length / deals.length) * 100) : 0;

  const byStage = deals.reduce((acc, d) => {
    acc[d.stage || "unknown"] = (acc[d.stage || "unknown"] || 0) + 1;
    return acc;
  }, {});

  return {
    module: "CRM",
    period_days: days,
    metrics: {
      total_deals: deals.length,
      won_deals: won.length,
      lost_deals: lost.length,
      pipeline_deals: pipeline.length,
      revenue_closed: totalValue,
      pipeline_value: pipelineValue,
      conversion_rate: conversionRate,
      new_customers: customers.length,
      new_contacts: contacts.length,
    },
    by_stage: byStage,
    top_deals: won
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 5)
      .map((d) => ({ id: d.id, value: Number(d.value || 0), closed_at: d.closed_at })),
  };
}

async function aggregateFinance(workspaceId, days = 30) {
  const { start, end } = dateRange(days);

  const [revenueRes, invoicesRes] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("id,amount,source,category,date,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("date", start.slice(0, 10))
      .lte("date", end.slice(0, 10)),
    supabase
      .from("invoices")
      .select("id,amount,status,due_date,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
  ]);

  const revenue = safe(revenueRes.data);
  const invoices = safe(invoicesRes.data);

  const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const overdueInvoices = invoices.filter(
    (i) => i.status !== "paid" && new Date(i.due_date) < new Date()
  );
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCollected = paidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);

  const bySource = revenue.reduce((acc, r) => {
    acc[r.source || "Other"] = (acc[r.source || "Other"] || 0) + Number(r.amount || 0);
    return acc;
  }, {});

  const byMonth = revenue.reduce((acc, r) => {
    const m = (r.date || "").slice(0, 7);
    if (m) acc[m] = (acc[m] || 0) + Number(r.amount || 0);
    return acc;
  }, {});

  return {
    module: "Finance",
    period_days: days,
    metrics: {
      total_revenue: totalRevenue,
      total_invoiced: totalInvoiced,
      total_collected: totalCollected,
      collection_rate: totalInvoiced ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
      overdue_invoices: overdueInvoices.length,
      overdue_amount: overdueInvoices.reduce((s, i) => s + Number(i.amount || 0), 0),
    },
    by_source: bySource,
    by_month: byMonth,
  };
}

async function aggregateHR(workspaceId, days = 30) {
  const { start, end } = dateRange(days);

  const [profilesRes, attendanceRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("id,role,status,created_at,workspace_id").eq("workspace_id", workspaceId).limit(200),
    supabase
      .from("attendance_records")
      .select("id,user_id,status,date,hours_worked,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("date", start.slice(0, 10))
      .lte("date", end.slice(0, 10))
      .limit(500),
    supabase
      .from("tasks")
      .select("id,status,assigned_to,created_at,completed_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
  ]);

  const profiles = safe(profilesRes.data);
  const attendance = safe(attendanceRes.data);
  const tasks = safe(tasksRes.data);

  const activeEmployees = profiles.filter((p) => p.status === "active");
  const presentDays = attendance.filter((a) => a.status === "present").length;
  const absentDays = attendance.filter((a) => a.status === "absent").length;
  const totalHours = attendance.reduce((s, a) => s + Number(a.hours_worked || 0), 0);
  const completedTasks = tasks.filter((t) => t.status === "done" || t.status === "completed");
  const taskCompletionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  return {
    module: "HR",
    period_days: days,
    metrics: {
      total_employees: profiles.length,
      active_employees: activeEmployees.length,
      attendance_days: presentDays,
      absent_days: absentDays,
      attendance_rate: presentDays + absentDays > 0
        ? Math.round((presentDays / (presentDays + absentDays)) * 100)
        : 0,
      total_hours_logged: Math.round(totalHours),
      total_tasks: tasks.length,
      completed_tasks: completedTasks.length,
      task_completion_rate: taskCompletionRate,
    },
  };
}

async function aggregateMarketing(workspaceId, days = 30) {
  const { start, end } = dateRange(days);

  const [campaignsRes, leadsRes] = await Promise.all([
    supabase
      .from("email_campaigns")
      .select("id,status,sent_count,open_count,click_count,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("leads")
      .select("id,status,source,created_at,workspace_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", start)
      .lte("created_at", end),
  ]);

  const campaigns = safe(campaignsRes.data);
  const leads = safe(leadsRes.data);

  const totalSent = campaigns.reduce((s, c) => s + Number(c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + Number(c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + Number(c.click_count || 0), 0);
  const qualifiedLeads = leads.filter((l) => l.status === "qualified");

  const bySource = leads.reduce((acc, l) => {
    acc[l.source || "Direct"] = (acc[l.source || "Direct"] || 0) + 1;
    return acc;
  }, {});

  return {
    module: "Marketing",
    period_days: days,
    metrics: {
      campaigns_sent: campaigns.filter((c) => c.status === "sent").length,
      total_emails_sent: totalSent,
      open_rate: totalSent ? Math.round((totalOpens / totalSent) * 100) : 0,
      click_rate: totalSent ? Math.round((totalClicks / totalSent) * 100) : 0,
      new_leads: leads.length,
      qualified_leads: qualifiedLeads.length,
      lead_conversion_rate: leads.length
        ? Math.round((qualifiedLeads.length / leads.length) * 100)
        : 0,
    },
    leads_by_source: bySource,
  };
}

// ── executive aggregator ─────────────────────────────────────────────────────

async function aggregateExecutive(workspaceId, days = 30) {
  const [crm, finance, hr, marketing] = await Promise.all([
    aggregateCRM(workspaceId, days).catch(() => ({ metrics: {} })),
    aggregateFinance(workspaceId, days).catch(() => ({ metrics: {} })),
    aggregateHR(workspaceId, days).catch(() => ({ metrics: {} })),
    aggregateMarketing(workspaceId, days).catch(() => ({ metrics: {} })),
  ]);

  return {
    module: "Executive",
    period_days: days,
    crm: crm.metrics,
    finance: finance.metrics,
    hr: hr.metrics,
    marketing: marketing.metrics,
    summary_metrics: {
      revenue: finance.metrics.total_revenue || 0,
      deals_won: crm.metrics.won_deals || 0,
      new_customers: crm.metrics.new_customers || 0,
      team_size: hr.metrics.active_employees || 0,
      task_completion: hr.metrics.task_completion_rate || 0,
      new_leads: marketing.metrics.new_leads || 0,
    },
  };
}

// ── public API ───────────────────────────────────────────────────────────────

const { observeFacebook } = require("./observers/facebookObserver");

async function aggregateFacebook(workspaceId, days = 7) {
  return observeFacebook(workspaceId, days);
}

const MODULE_AGGREGATORS = {
  executive: aggregateExecutive,
  crm:       aggregateCRM,
  finance:   aggregateFinance,
  hr:        aggregateHR,
  marketing: aggregateMarketing,
  facebook:  aggregateFacebook,
};

async function aggregate(module, workspaceId, days = 30) {
  const fn = MODULE_AGGREGATORS[module.toLowerCase()];
  if (!fn) throw new Error(`Unknown module: ${module}`);
  return fn(workspaceId, days);
}

module.exports = { aggregate, aggregateExecutive, aggregateCRM, aggregateFinance, aggregateHR, aggregateMarketing, aggregateFacebook };
