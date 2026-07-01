/**
 * Philippine ERP Intelligence Modules
 *
 * GET  /api/intelligence/ph/bir
 * POST /api/intelligence/ph/bir
 * PUT  /api/intelligence/ph/bir/:id
 * GET  /api/intelligence/ph/bir/summary
 *
 * GET  /api/intelligence/ph/cashflow
 * POST /api/intelligence/ph/cashflow/compute
 *
 * GET  /api/intelligence/ph/channels
 * POST /api/intelligence/ph/channels
 * GET  /api/intelligence/ph/channels/summary
 *
 * GET  /api/intelligence/ph/labor
 * POST /api/intelligence/ph/labor/compute
 *
 * GET  /api/intelligence/ph/suppliers
 * POST /api/intelligence/ph/suppliers
 * PUT  /api/intelligence/ph/suppliers/:id
 * DELETE /api/intelligence/ph/suppliers/:id
 *
 * GET  /api/intelligence/ph/sales-coach
 * POST /api/intelligence/ph/sales-coach/analyze
 *
 * GET  /api/intelligence/ph/benchmarks
 * GET  /api/intelligence/ph/benchmarks/compare
 *
 * GET  /api/intelligence/ph/board-reports
 * POST /api/intelligence/ph/board-reports/generate
 * GET  /api/intelligence/ph/board-reports/:id
 *
 * GET  /api/intelligence/ph/anomalies
 * POST /api/intelligence/ph/anomalies/scan
 * PUT  /api/intelligence/ph/anomalies/:id
 *
 * GET  /api/intelligence/ph/okr
 * POST /api/intelligence/ph/okr
 * PUT  /api/intelligence/ph/okr/:id
 * DELETE /api/intelligence/ph/okr/:id
 * POST /api/intelligence/ph/okr/:id/key-results
 * PUT  /api/intelligence/ph/okr/kr/:krId
 * POST /api/intelligence/ph/okr/sync
 */

"use strict";

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../../middleware/auth");
const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireWorkspace(req, res) {
  if (req.workspaceId) return true;
  res.status(400).json({ success: false, error: "workspace_id or x-workspace-id is required." });
  return false;
}

function safeDate(val) {
  try {
    return new Date(val).toISOString();
  } catch (_) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BIR Compliance
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/bir
router.get("/bir", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("bir_compliance_items")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("due_date", { ascending: true });

    if (req.query.status) query = query.eq("status", String(req.query.status).slice(0, 50));
    if (req.query.year) query = query.ilike("due_date", `${String(req.query.year).slice(0, 4)}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/bir list failed");
    next(err);
  }
});

// GET /api/intelligence/ph/bir/summary  — must be before /:id
router.get("/bir/summary", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("bir_compliance_items")
      .select("status, due_date, penalty_amount")
      .eq("workspace_id", req.workspaceId);

    if (error) throw error;

    const items = data || [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const byStatus = {};
    let overdueCount = 0;
    let upcomingCount = 0;
    let penaltyTotal = 0;

    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      penaltyTotal += Number(item.penalty_amount) || 0;
      const due = new Date(item.due_date);
      if (item.status !== "filed" && due < now) overdueCount++;
      if (item.status !== "filed" && due >= now && due <= in30) upcomingCount++;
    }

    res.json({
      success: true,
      data: {
        by_status: byStatus,
        overdue_count: overdueCount,
        upcoming_30_days: upcomingCount,
        penalty_total: penaltyTotal,
        total: items.length,
      },
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/bir summary failed");
    next(err);
  }
});

// POST /api/intelligence/ph/bir
router.post("/bir", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { form_code, description, category, due_date, frequency, workspace_tax_type } = req.body;
    if (!form_code) return res.status(400).json({ success: false, error: "form_code is required." });

    const parsedDue = safeDate(due_date);
    if (!parsedDue) return res.status(400).json({ success: false, error: "due_date is required and must be a valid date." });

    const { data, error } = await supabase
      .from("bir_compliance_items")
      .insert({
        workspace_id: req.workspaceId,
        form_code: String(form_code).slice(0, 20),
        description: String(description || "").slice(0, 500),
        category: String(category || "").slice(0, 100),
        due_date: parsedDue,
        frequency: String(frequency || "monthly").slice(0, 50),
        workspace_tax_type: String(workspace_tax_type || "").slice(0, 100),
        status: "pending",
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/bir create failed");
    next(err);
  }
});

// PUT /api/intelligence/ph/bir/:id
router.put("/bir/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.status !== undefined) patch.status = String(req.body.status).slice(0, 50);
    if (req.body.filed_at !== undefined) patch.filed_at = safeDate(req.body.filed_at);
    if (req.body.notes !== undefined) patch.notes = String(req.body.notes).slice(0, 1000);
    if (req.body.penalty_amount !== undefined) patch.penalty_amount = Number(req.body.penalty_amount) || 0;

    const { data, error } = await supabase
      .from("bir_compliance_items")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/bir update failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Cash Flow
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/cashflow
router.get("/cashflow", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const horizon = [30, 60, 90].includes(Number(req.query.horizon)) ? Number(req.query.horizon) : 30;
    const { data, error } = await supabase
      .from("cashflow_projections")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .eq("horizon_days", horizon)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json({ success: true, data: data || null });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/cashflow get failed");
    next(err);
  }
});

// POST /api/intelligence/ph/cashflow/compute
router.post("/cashflow/compute", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const now = new Date();

    // Pull invoices for this workspace
    const { data: invoices, error: invErr } = await supabase
      .from("invoices")
      .select("id, status, amount, due_date")
      .eq("workspace_id", req.workspaceId);

    if (invErr) throw invErr;

    const unpaid = (invoices || []).filter((inv) => inv.status !== "paid");

    // AR aging buckets
    const arAging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };
    let totalAR = 0;
    for (const inv of unpaid) {
      const amt = Number(inv.amount) || 0;
      totalAR += amt;
      const due = new Date(inv.due_date);
      const daysOverdue = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) arAging.current += amt;
      else if (daysOverdue <= 30) arAging.days_1_30 += amt;
      else if (daysOverdue <= 60) arAging.days_31_60 += amt;
      else if (daysOverdue <= 90) arAging.days_61_90 += amt;
      else arAging.over_90 += amt;
    }

    const totalAP = totalAR * 0.6;

    // 30/60/90 day projections
    const buildProjection = (days) => {
      const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const expectedAR = (invoices || [])
        .filter((inv) => inv.status !== "paid" && new Date(inv.due_date) <= cutoff)
        .reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
      const expectedAP = expectedAR * 0.6;
      return {
        horizon_days: days,
        expected_ar: expectedAR,
        expected_ap: expectedAP,
        net_cashflow: expectedAR - expectedAP,
      };
    };

    const projections = [30, 60, 90].map(buildProjection);

    // Upsert projections
    for (const proj of projections) {
      await supabase.from("cashflow_projections").upsert({
        workspace_id: req.workspaceId,
        horizon_days: proj.horizon_days,
        expected_ar: proj.expected_ar,
        expected_ap: proj.expected_ap,
        net_cashflow: proj.net_cashflow,
        ar_aging: arAging,
        total_ar: totalAR,
        total_ap: totalAP,
        computed_at: now.toISOString(),
      }, { onConflict: "workspace_id,horizon_days" });
    }

    res.json({
      success: true,
      data: {
        projections,
        ar_aging: arAging,
        total_ar: totalAR,
        total_ap: totalAP,
        computed_at: now.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/cashflow compute failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Multi-Channel Revenue
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/channels
router.get("/channels", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("channel_revenue_entries")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .gte("entry_date", since)
      .order("entry_date", { ascending: false });

    if (req.query.channel) query = query.eq("channel", String(req.query.channel).slice(0, 100));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/channels list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/channels
router.post("/channels", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { channel, gross_revenue, net_revenue, orders, roas, entry_date } = req.body;
    if (!channel) return res.status(400).json({ success: false, error: "channel is required." });

    const parsedDate = safeDate(entry_date) || new Date().toISOString();

    const { data, error } = await supabase
      .from("channel_revenue_entries")
      .insert({
        workspace_id: req.workspaceId,
        channel: String(channel).slice(0, 100),
        gross_revenue: Number(gross_revenue) || 0,
        net_revenue: Number(net_revenue) || 0,
        orders: Number(orders) || 0,
        roas: Number(roas) || 0,
        entry_date: parsedDate,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/channels create failed");
    next(err);
  }
});

// GET /api/intelligence/ph/channels/summary
router.get("/channels/summary", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("channel_revenue_entries")
      .select("channel, gross_revenue, net_revenue, orders, roas")
      .eq("workspace_id", req.workspaceId);

    if (error) throw error;

    const grouped = {};
    for (const row of data || []) {
      if (!grouped[row.channel]) {
        grouped[row.channel] = { channel: row.channel, gross_revenue: 0, net_revenue: 0, orders: 0, roas_sum: 0, count: 0 };
      }
      grouped[row.channel].gross_revenue += Number(row.gross_revenue) || 0;
      grouped[row.channel].net_revenue += Number(row.net_revenue) || 0;
      grouped[row.channel].orders += Number(row.orders) || 0;
      grouped[row.channel].roas_sum += Number(row.roas) || 0;
      grouped[row.channel].count += 1;
    }

    const summary = Object.values(grouped).map((g) => ({
      channel: g.channel,
      gross_revenue: g.gross_revenue,
      net_revenue: g.net_revenue,
      orders: g.orders,
      avg_roas: g.count > 0 ? parseFloat((g.roas_sum / g.count).toFixed(4)) : 0,
    }));

    const rankings = [...summary].sort((a, b) => b.net_revenue - a.net_revenue);

    res.json({ success: true, data: { summary, rankings } });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/channels summary failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Labor Cost
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/labor
router.get("/labor", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("labor_cost_analytics")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("period_month", { ascending: false });

    if (req.query.period_month) query = query.eq("period_month", String(req.query.period_month).slice(0, 7));
    if (req.query.department) query = query.eq("department", String(req.query.department).slice(0, 100));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/labor list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/labor/compute
router.post("/labor/compute", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const periodMonth = req.body.period_month
      ? String(req.body.period_month).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    // Pull headcount by department from profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("department")
      .eq("workspace_id", req.workspaceId);

    if (profErr) throw profErr;

    // Pull attendance hours by department for the period
    const periodStart = `${periodMonth}-01`;
    const periodEndDate = new Date(periodMonth + "-01");
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);
    const periodEnd = periodEndDate.toISOString().slice(0, 10);

    const { data: attendance, error: attErr } = await supabase
      .from("attendance_records")
      .select("department, hours_worked")
      .eq("workspace_id", req.workspaceId)
      .gte("date", periodStart)
      .lt("date", periodEnd);

    if (attErr) throw attErr;

    // Group by department
    const deptMap = {};
    for (const p of profiles || []) {
      const dept = String(p.department || "General").slice(0, 100);
      if (!deptMap[dept]) deptMap[dept] = { headcount: 0, hours_worked: 0 };
      deptMap[dept].headcount += 1;
    }
    for (const a of attendance || []) {
      const dept = String(a.department || "General").slice(0, 100);
      if (!deptMap[dept]) deptMap[dept] = { headcount: 0, hours_worked: 0 };
      deptMap[dept].hours_worked += Number(a.hours_worked) || 0;
    }

    const computed = [];
    for (const [dept, info] of Object.entries(deptMap)) {
      const headcount = info.headcount;
      const basic_pay = headcount * 18000;
      const sss_employer = headcount * 1125;
      const philhealth_employer = headcount * 450;
      const pagibig_employer = headcount * 100;
      const thirteenth_month_accrual = basic_pay / 12;
      const total_labor_cost = basic_pay + sss_employer + philhealth_employer + pagibig_employer + thirteenth_month_accrual;

      const row = {
        workspace_id: req.workspaceId,
        period_month: periodMonth,
        department: dept,
        headcount,
        hours_worked: info.hours_worked,
        basic_pay,
        sss_employer,
        philhealth_employer,
        pagibig_employer,
        thirteenth_month_accrual,
        total_labor_cost,
        computed_at: new Date().toISOString(),
      };

      await supabase
        .from("labor_cost_analytics")
        .upsert(row, { onConflict: "workspace_id,period_month,department" });

      computed.push(row);
    }

    res.json({ success: true, data: computed });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/labor compute failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Supplier Risk
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/suppliers
router.get("/suppliers", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("supplier_scorecards")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/suppliers list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/suppliers
router.post("/suppliers", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { supplier_name, supplier_id, delivery_score, quality_score, price_score, risk_level, notes } = req.body;
    if (!supplier_name) return res.status(400).json({ success: false, error: "supplier_name is required." });

    const { data, error } = await supabase
      .from("supplier_scorecards")
      .insert({
        workspace_id: req.workspaceId,
        supplier_name: String(supplier_name).slice(0, 200),
        supplier_id: supplier_id ? String(supplier_id).slice(0, 100) : null,
        delivery_score: Number(delivery_score) || 0,
        quality_score: Number(quality_score) || 0,
        price_score: Number(price_score) || 0,
        risk_level: String(risk_level || "medium").slice(0, 50),
        notes: String(notes || "").slice(0, 1000),
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/suppliers create failed");
    next(err);
  }
});

// PUT /api/intelligence/ph/suppliers/:id
router.put("/suppliers/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.supplier_name !== undefined) patch.supplier_name = String(req.body.supplier_name).slice(0, 200);
    if (req.body.delivery_score !== undefined) patch.delivery_score = Number(req.body.delivery_score) || 0;
    if (req.body.quality_score !== undefined) patch.quality_score = Number(req.body.quality_score) || 0;
    if (req.body.price_score !== undefined) patch.price_score = Number(req.body.price_score) || 0;
    if (req.body.risk_level !== undefined) patch.risk_level = String(req.body.risk_level).slice(0, 50);
    if (req.body.notes !== undefined) patch.notes = String(req.body.notes).slice(0, 1000);

    const { data, error } = await supabase
      .from("supplier_scorecards")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/suppliers update failed");
    next(err);
  }
});

// DELETE /api/intelligence/ph/suppliers/:id
router.delete("/suppliers/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { error } = await supabase
      .from("supplier_scorecards")
      .delete()
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/suppliers delete failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AI Sales Coach
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/sales-coach
router.get("/sales-coach", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("sales_coach_insights")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false });

    if (req.query.rep_id) query = query.eq("rep_id", String(req.query.rep_id).slice(0, 100));
    if (req.query.priority) query = query.eq("priority", String(req.query.priority).slice(0, 50));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/sales-coach list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/sales-coach/analyze
router.post("/sales-coach/analyze", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data: deals, error: dealsErr } = await supabase
      .from("deals")
      .select("id, title, value, stage, assigned_to, created_at, updated_at")
      .eq("workspace_id", req.workspaceId);

    if (dealsErr) throw dealsErr;

    const now = new Date();
    const stageWinProb = {
      negotiation: 70,
      proposal: 45,
      qualified: 30,
      prospect: 15,
    };

    const insights = [];
    for (const deal of deals || []) {
      const updatedAt = new Date(deal.updated_at || deal.created_at);
      const daysInStage = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
      const stage = String(deal.stage || "").toLowerCase();
      const winProbability = stageWinProb[stage] || 10;
      const isStuck = daysInStage > 14;

      const insight = {
        workspace_id: req.workspaceId,
        deal_id: String(deal.id),
        deal_title: String(deal.title || "").slice(0, 200),
        rep_id: deal.assigned_to ? String(deal.assigned_to).slice(0, 100) : null,
        stage: String(deal.stage || "").slice(0, 100),
        deal_value: Number(deal.value) || 0,
        days_in_stage: daysInStage,
        win_probability: winProbability,
        is_stuck: isStuck,
        priority: isStuck ? "high" : daysInStage > 7 ? "medium" : "low",
        recommendation: isStuck
          ? `Deal stuck for ${daysInStage} days in "${deal.stage}" stage. Recommend immediate follow-up or re-qualification.`
          : `Deal progressing normally. Win probability at ${winProbability}%.`,
        analyzed_at: now.toISOString(),
      };

      await supabase.from("sales_coach_insights").upsert(insight, { onConflict: "workspace_id,deal_id" });
      insights.push(insight);
    }

    res.json({ success: true, data: insights });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/sales-coach analyze failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Industry Benchmarks
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/benchmarks
router.get("/benchmarks", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("industry_benchmarks")
      .select("*")
      .order("metric_key", { ascending: true });

    if (req.query.industry) query = query.eq("industry", String(req.query.industry).slice(0, 100));
    if (req.query.segment) query = query.eq("segment", String(req.query.segment).slice(0, 50));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/benchmarks list failed");
    next(err);
  }
});

// GET /api/intelligence/ph/benchmarks/compare
router.get("/benchmarks/compare", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { aggregate } = require("../../services/intelligence/dataAggregator");

    const [crmData, financeData] = await Promise.allSettled([
      aggregate("crm", req.workspaceId, 30),
      aggregate("finance", req.workspaceId, 30),
    ]);

    const ourMetrics = {
      ...(crmData.status === "fulfilled" ? crmData.value?.metrics || {} : {}),
      ...(financeData.status === "fulfilled" ? financeData.value?.metrics || {} : {}),
    };

    let benchmarkQuery = supabase.from("industry_benchmarks").select("metric_key, benchmark_value, industry, segment");
    if (req.query.industry) benchmarkQuery = benchmarkQuery.eq("industry", String(req.query.industry).slice(0, 100));
    if (req.query.segment) benchmarkQuery = benchmarkQuery.eq("segment", String(req.query.segment).slice(0, 50));

    const { data: benchmarks, error: benchErr } = await benchmarkQuery;
    if (benchErr) throw benchErr;

    const comparison = (benchmarks || []).map((b) => {
      const ourValue = Number(ourMetrics[b.metric_key]) || 0;
      const benchValue = Number(b.benchmark_value) || 0;
      const gap = ourValue - benchValue;
      const gapPct = benchValue !== 0 ? parseFloat(((gap / benchValue) * 100).toFixed(2)) : 0;
      const status = Math.abs(gapPct) <= 5 ? "on_par" : gap > 0 ? "above" : "below";

      return {
        metric_key: b.metric_key,
        our_value: ourValue,
        benchmark_value: benchValue,
        gap,
        gap_pct: gapPct,
        status,
      };
    });

    res.json({ success: true, data: comparison });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/benchmarks compare failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Board Reports
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/board-reports
router.get("/board-reports", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("board_reports")
      .select("id, title, status, period, kpis, narrative_summary, generated_at, created_at")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/board-reports list failed");
    next(err);
  }
});

// GET /api/intelligence/ph/board-reports/:id  — before /generate to avoid conflict
router.get("/board-reports/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("board_reports")
      .select("*")
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "Report not found." });
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/board-reports get failed");
    next(err);
  }
});

// POST /api/intelligence/ph/board-reports/generate
router.post("/board-reports/generate", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { aggregate } = require("../../services/intelligence/dataAggregator");

    const period = req.body.period
      ? String(req.body.period).slice(0, 50)
      : new Date().toISOString().slice(0, 7);

    // Aggregate data for executive view
    const [crmResult, financeResult, hrResult, marketingResult] = await Promise.allSettled([
      aggregate("crm", req.workspaceId, 30),
      aggregate("finance", req.workspaceId, 30),
      aggregate("hr", req.workspaceId, 30),
      aggregate("marketing", req.workspaceId, 30),
    ]);

    const crm = crmResult.status === "fulfilled" ? crmResult.value : {};
    const finance = financeResult.status === "fulfilled" ? financeResult.value : {};
    const hr = hrResult.status === "fulfilled" ? hrResult.value : {};
    const marketing = marketingResult.status === "fulfilled" ? marketingResult.value : {};

    const kpis = {
      revenue: finance?.metrics?.total_revenue || 0,
      expenses: finance?.metrics?.total_expenses || 0,
      net_income: (finance?.metrics?.total_revenue || 0) - (finance?.metrics?.total_expenses || 0),
      deals_closed: crm?.metrics?.deals_closed || 0,
      pipeline_value: crm?.metrics?.pipeline_value || 0,
      headcount: hr?.metrics?.headcount || 0,
      marketing_spend: marketing?.metrics?.total_spend || 0,
      period,
    };

    // Insert placeholder report with status=generating
    const { data: report, error: insertErr } = await supabase
      .from("board_reports")
      .insert({
        workspace_id: req.workspaceId,
        title: `Board Report — ${period}`,
        period,
        kpis,
        status: "generating",
        generated_by: req.user.id,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Build AI narrative summary from KPIs
    const narrativeSummary =
      `Executive Summary for ${period}: ` +
      `Revenue ₱${Number(kpis.revenue).toLocaleString()}, ` +
      `Net Income ₱${Number(kpis.net_income).toLocaleString()}, ` +
      `${kpis.deals_closed} deals closed with pipeline valued at ₱${Number(kpis.pipeline_value).toLocaleString()}. ` +
      `Headcount: ${kpis.headcount}. Marketing spend: ₱${Number(kpis.marketing_spend).toLocaleString()}.`;

    // Update report to ready
    const { data: finalReport, error: updateErr } = await supabase
      .from("board_reports")
      .update({
        status: "ready",
        narrative_summary: narrativeSummary,
        raw_data: { crm: crm?.metrics, finance: finance?.metrics, hr: hr?.metrics, marketing: marketing?.metrics },
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    res.json({ success: true, data: finalReport });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/board-reports generate failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Anomaly Detection
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/intelligence/ph/anomalies
router.get("/anomalies", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("anomaly_flags")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false });

    if (req.query.status) query = query.eq("status", String(req.query.status).slice(0, 50));
    if (req.query.module) query = query.eq("module", String(req.query.module).slice(0, 100));
    if (req.query.severity) query = query.eq("severity", String(req.query.severity).slice(0, 50));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/anomalies list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/anomalies/scan
router.post("/anomalies/scan", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const now = new Date().toISOString();
    const flagsToInsert = [];

    // (1) Round-number invoices (amount % 1000 === 0 and amount > 10000)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, amount, status")
      .eq("workspace_id", req.workspaceId)
      .gt("amount", 10000);

    for (const inv of invoices || []) {
      if (Number(inv.amount) % 1000 === 0) {
        flagsToInsert.push({
          workspace_id: req.workspaceId,
          module: "finance",
          entity_type: "invoice",
          entity_id: String(inv.id),
          anomaly_type: "round_number",
          severity: "medium",
          description: `Invoice amount ₱${inv.amount} is a suspiciously round number above ₱10,000.`,
          status: "open",
          detected_at: now,
        });
      }
    }

    // (2) Revenue entries > 3× average
    const { data: revenues } = await supabase
      .from("revenue_entries")
      .select("id, amount")
      .eq("workspace_id", req.workspaceId);

    if (revenues && revenues.length > 0) {
      const avg = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0) / revenues.length;
      const threshold = avg * 3;
      for (const rev of revenues) {
        if (Number(rev.amount) > threshold) {
          flagsToInsert.push({
            workspace_id: req.workspaceId,
            module: "finance",
            entity_type: "revenue_entry",
            entity_id: String(rev.id),
            anomaly_type: "unusual_high_value",
            severity: "high",
            description: `Revenue entry ₱${rev.amount} is more than 3× the workspace average of ₱${avg.toFixed(2)}.`,
            status: "open",
            detected_at: now,
          });
        }
      }
    }

    // (3) Attendance records with anomalous hours (hours_worked > 12)
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("id, hours_worked, employee_id")
      .eq("workspace_id", req.workspaceId)
      .gt("hours_worked", 12);

    for (const att of attendance || []) {
      flagsToInsert.push({
        workspace_id: req.workspaceId,
        module: "hr",
        entity_type: "attendance_record",
        entity_id: String(att.id),
        anomaly_type: "excessive_hours",
        severity: "low",
        description: `Attendance record shows ${att.hours_worked} hours worked — exceeds 12-hour threshold.`,
        status: "open",
        detected_at: now,
      });
    }

    if (flagsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("anomaly_flags").insert(flagsToInsert);
      if (insertErr) throw insertErr;
    }

    res.json({
      success: true,
      data: {
        scanned_at: now,
        total_flags: flagsToInsert.length,
        by_module: {
          finance: flagsToInsert.filter((f) => f.module === "finance").length,
          hr: flagsToInsert.filter((f) => f.module === "hr").length,
        },
      },
    });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/anomalies scan failed");
    next(err);
  }
});

// PUT /api/intelligence/ph/anomalies/:id
router.put("/anomalies/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.status !== undefined) patch.status = String(req.body.status).slice(0, 50);
    if (req.body.review_notes !== undefined) patch.review_notes = String(req.body.review_notes).slice(0, 1000);

    const { data, error } = await supabase
      .from("anomaly_flags")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/anomalies update failed");
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// OKR Intelligence
// ══════════════════════════════════════════════════════════════════════════════

function computeOkrStatus(progress) {
  if (progress >= 80) return "on_track";
  if (progress >= 50) return "at_risk";
  return "off_track";
}

// GET /api/intelligence/ph/okr
router.get("/okr", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    let query = supabase
      .from("okr_objectives")
      .select("*, okr_key_results(*)")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false });

    if (req.query.quarter) query = query.eq("quarter", String(req.query.quarter).slice(0, 10));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr list failed");
    next(err);
  }
});

// POST /api/intelligence/ph/okr
router.post("/okr", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { title, department, owner_name, quarter } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "title is required." });

    const { data, error } = await supabase
      .from("okr_objectives")
      .insert({
        workspace_id: req.workspaceId,
        title: String(title).slice(0, 300),
        department: String(department || "").slice(0, 100),
        owner_name: String(owner_name || "").slice(0, 200),
        quarter: String(quarter || "").slice(0, 10),
        status: "on_track",
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr create failed");
    next(err);
  }
});

// PUT /api/intelligence/ph/okr/:id
router.put("/okr/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.title !== undefined) patch.title = String(req.body.title).slice(0, 300);
    if (req.body.department !== undefined) patch.department = String(req.body.department).slice(0, 100);
    if (req.body.owner_name !== undefined) patch.owner_name = String(req.body.owner_name).slice(0, 200);
    if (req.body.quarter !== undefined) patch.quarter = String(req.body.quarter).slice(0, 10);
    if (req.body.status !== undefined) patch.status = String(req.body.status).slice(0, 50);

    const { data, error } = await supabase
      .from("okr_objectives")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr update failed");
    next(err);
  }
});

// DELETE /api/intelligence/ph/okr/:id
router.delete("/okr/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { error } = await supabase
      .from("okr_objectives")
      .delete()
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr delete failed");
    next(err);
  }
});

// POST /api/intelligence/ph/okr/:id/key-results
router.post("/okr/:id/key-results", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { title, target_value, current_value, unit, metric_key } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "title is required." });

    const tv = Number(target_value) || 0;
    const cv = Number(current_value) || 0;
    const progress = tv > 0 ? parseFloat(((cv / tv) * 100).toFixed(2)) : 0;
    const status = computeOkrStatus(progress);

    const { data, error } = await supabase
      .from("okr_key_results")
      .insert({
        objective_id: req.params.id,
        workspace_id: req.workspaceId,
        title: String(title).slice(0, 300),
        target_value: tv,
        current_value: cv,
        unit: String(unit || "").slice(0, 50),
        metric_key: metric_key ? String(metric_key).slice(0, 100) : null,
        progress,
        status,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr key-result create failed");
    next(err);
  }
});

// PUT /api/intelligence/ph/okr/kr/:krId
router.put("/okr/kr/:krId", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    // Fetch existing KR to get target_value if not supplied
    const { data: existing, error: fetchErr } = await supabase
      .from("okr_key_results")
      .select("target_value, current_value")
      .eq("id", req.params.krId)
      .eq("workspace_id", req.workspaceId)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ success: false, error: "Key result not found." });

    const patch = { updated_at: new Date().toISOString() };
    if (req.body.notes !== undefined) patch.notes = String(req.body.notes).slice(0, 1000);

    const cv = req.body.current_value !== undefined ? Number(req.body.current_value) || 0 : Number(existing.current_value) || 0;
    const tv = Number(existing.target_value) || 0;
    patch.current_value = cv;
    patch.progress = tv > 0 ? parseFloat(((cv / tv) * 100).toFixed(2)) : 0;
    patch.status = computeOkrStatus(patch.progress);

    const { data, error } = await supabase
      .from("okr_key_results")
      .update(patch)
      .eq("id", req.params.krId)
      .eq("workspace_id", req.workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr kr update failed");
    next(err);
  }
});

// POST /api/intelligence/ph/okr/sync
router.post("/okr/sync", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data: krs, error: krsErr } = await supabase
      .from("okr_key_results")
      .select("id, metric_key, target_value, objective_id")
      .eq("workspace_id", req.workspaceId)
      .not("metric_key", "is", null);

    if (krsErr) throw krsErr;

    const { data: insights } = await supabase
      .from("intelligence_insights")
      .select("metric_key, metric_value")
      .eq("workspace_id", req.workspaceId)
      .not("metric_key", "is", null);

    const metricMap = {};
    for (const ins of insights || []) {
      if (ins.metric_key) metricMap[ins.metric_key] = Number(ins.metric_value) || 0;
    }

    const synced = [];
    for (const kr of krs || []) {
      if (!kr.metric_key || !(kr.metric_key in metricMap)) continue;

      const cv = metricMap[kr.metric_key];
      const tv = Number(kr.target_value) || 0;
      const progress = tv > 0 ? parseFloat(((cv / tv) * 100).toFixed(2)) : 0;
      const status = computeOkrStatus(progress);

      const { data: updated } = await supabase
        .from("okr_key_results")
        .update({ current_value: cv, progress, status, updated_at: new Date().toISOString() })
        .eq("id", kr.id)
        .eq("workspace_id", req.workspaceId)
        .select()
        .single();

      if (updated) synced.push(updated);
    }

    res.json({ success: true, data: { synced_count: synced.length, synced } });
  } catch (err) {
    logger.error({ err, workspaceId: req.workspaceId }, "ph/okr sync failed");
    next(err);
  }
});

module.exports = router;
