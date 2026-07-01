const express = require("express");
const { supabase } = require("../../config/supabase");
const { onDealWon, approveEvent, createPayout } = require("./commissionService");

const router = express.Router();

// ── Plans ─────────────────────────────────────────────────────────────────────

router.get("/plans", async (req, res) => {
  const { data, error } = await supabase
    .from("commission_plans")
    .select("*, commission_tiers(*)")
    .eq("workspace_id", req.workspaceId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, plans: data });
});

router.post("/plans", async (req, res) => {
  const { name, type, description, tiers } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: "name and type required" });
  if (!["flat", "percent", "tiered"].includes(type)) return res.status(400).json({ success: false, error: "type must be flat, percent, or tiered" });

  const { data: plan, error } = await supabase
    .from("commission_plans")
    .insert({ workspace_id: req.workspaceId, name, type, description })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });

  if (tiers?.length) {
    const tierRows = tiers.map((t) => ({ plan_id: plan.id, min_amount: t.min_amount ?? 0, max_amount: t.max_amount ?? null, rate: t.rate }));
    await supabase.from("commission_tiers").insert(tierRows);
  }

  res.status(201).json({ success: true, plan });
});

router.delete("/plans/:id", async (req, res) => {
  const { error } = await supabase.from("commission_plans").update({ is_active: false }).eq("id", req.params.id).eq("workspace_id", req.workspaceId);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

// ── Plan Assignments ──────────────────────────────────────────────────────────

router.post("/plans/:planId/assign", async (req, res) => {
  const { repId, effectiveFrom, effectiveTo } = req.body;
  if (!repId) return res.status(400).json({ success: false, error: "repId required" });
  const { data, error } = await supabase
    .from("commission_plan_assignments")
    .upsert({ workspace_id: req.workspaceId, rep_id: repId, plan_id: req.params.planId, effective_from: effectiveFrom || new Date().toISOString().slice(0, 10), effective_to: effectiveTo || null }, { onConflict: "rep_id,plan_id,effective_from" })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.status(201).json({ success: true, assignment: data });
});

// ── Events ────────────────────────────────────────────────────────────────────

router.get("/events", async (req, res) => {
  const { repId, status } = req.query;
  let query = supabase.from("commission_events").select("*, profiles!rep_id(full_name), crm_opportunities!deal_id(title,amount)").eq("workspace_id", req.workspaceId).order("created_at", { ascending: false });
  if (repId) query = query.eq("rep_id", repId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, events: data });
});

// Manual trigger (normally called internally on deal.won)
router.post("/events/calculate", async (req, res) => {
  const { dealId, repId, dealAmount } = req.body;
  if (!dealId || !repId || !dealAmount) return res.status(400).json({ success: false, error: "dealId, repId, dealAmount required" });
  try {
    const event = await onDealWon({ dealId, repId, dealAmount: Number(dealAmount), workspaceId: req.workspaceId });
    if (!event) return res.status(422).json({ success: false, error: "No active commission plan for this rep" });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/events/:id/approve", async (req, res) => {
  try {
    const event = await approveEvent({ eventId: req.params.id, approvedBy: req.user.id, workspaceId: req.workspaceId });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Payouts ───────────────────────────────────────────────────────────────────

router.get("/payouts", async (req, res) => {
  const { repId } = req.query;
  let query = supabase.from("commission_payouts").select("*, profiles!rep_id(full_name)").eq("workspace_id", req.workspaceId).order("period_start", { ascending: false });
  if (repId) query = query.eq("rep_id", repId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, payouts: data });
});

router.post("/payouts", async (req, res) => {
  const { repId, periodStart, periodEnd, paymentRef } = req.body;
  if (!repId || !periodStart || !periodEnd) return res.status(400).json({ success: false, error: "repId, periodStart, periodEnd required" });
  try {
    const payout = await createPayout({ repId, periodStart, periodEnd, workspaceId: req.workspaceId, paymentRef });
    res.status(201).json({ success: true, payout });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Deal Velocity ─────────────────────────────────────────────────────────────

router.get("/velocity", async (req, res) => {
  const { repId } = req.query;
  let query = supabase
    .from("deal_stage_history")
    .select("stage_id, duration_hours, opportunity_id, crm_stages!stage_id(name), crm_opportunities!opportunity_id(assigned_to)")
    .eq("workspace_id", req.workspaceId)
    .not("duration_hours", "is", null);
  if (repId) query = query.eq("crm_opportunities.assigned_to", repId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: error.message });

  // Group by stage and compute avg duration
  const byStage = {};
  for (const row of data) {
    const key = row.stage_id;
    if (!byStage[key]) byStage[key] = { stage_id: key, name: row.crm_stages?.name, durations: [] };
    byStage[key].durations.push(Number(row.duration_hours));
  }
  const velocity = Object.values(byStage).map((s) => ({
    stage_id: s.stage_id,
    name: s.name,
    avg_hours: s.durations.reduce((a, b) => a + b, 0) / s.durations.length,
    sample_size: s.durations.length,
  }));

  res.json({ success: true, velocity });
});

module.exports = router;
