const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const { calculate } = require("./commissionCalculator");
const { recordCommissionAccrual, recordCommissionPayout } = require("./commissionLedgerSync");

/**
 * Triggered when a CRM deal is marked as won.
 * Looks up the rep's active commission plan and creates a commission_event.
 */
async function onDealWon({ dealId, repId, dealAmount, workspaceId }) {
  // Find rep's active plan assignment
  const { data: assignment, error: assignErr } = await supabase
    .from("commission_plan_assignments")
    .select("plan_id, commission_plans(type), commission_tiers(*)")
    .eq("rep_id", repId)
    .eq("workspace_id", workspaceId)
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .or("effective_to.is.null,effective_to.gte." + new Date().toISOString().slice(0, 10))
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignErr) {
    logger.warn({ err: assignErr, repId, dealId }, "commissions: failed to fetch plan assignment");
    return null;
  }

  if (!assignment) {
    logger.info({ repId, dealId }, "commissions: no active plan for rep — skipping event");
    return null;
  }

  const plan = assignment.commission_plans;
  const tiers = assignment.commission_tiers || [];
  const result = calculate(plan, tiers, dealAmount);

  if (!result) {
    logger.warn({ repId, dealId, planId: assignment.plan_id }, "commissions: calculation returned null — check tier config");
    return null;
  }

  const { data: event, error: insertErr } = await supabase
    .from("commission_events")
    .insert({
      workspace_id: workspaceId,
      deal_id: dealId,
      rep_id: repId,
      plan_id: assignment.plan_id,
      deal_amount: dealAmount,
      commission_amount: result.amount,
      rate_applied: result.rateApplied,
      status: "pending",
    })
    .select()
    .single();

  if (insertErr) {
    logger.error({ err: insertErr, repId, dealId }, "commissions: failed to insert event");
    return null;
  }

  logger.info({ eventId: event.id, repId, dealId, amount: result.amount }, "commissions: event created");
  return event;
}

async function approveEvent({ eventId, approvedBy, workspaceId }) {
  const { data, error } = await supabase
    .from("commission_events")
    .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) throw error;

  // Post accrual journal entry (non-blocking — ledger sync failure doesn't roll back approval)
  recordCommissionAccrual({ event: data, workspaceId }).catch(() => {});

  return data;
}

async function createPayout({ repId, periodStart, periodEnd, workspaceId, paymentRef }) {
  // Sum all approved events in the period for this rep
  const { data: events, error: eventsErr } = await supabase
    .from("commission_events")
    .select("id, commission_amount")
    .eq("rep_id", repId)
    .eq("workspace_id", workspaceId)
    .eq("status", "approved")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);

  if (eventsErr) throw eventsErr;
  if (!events.length) throw new Error("No approved events in period");

  const total = events.reduce((sum, e) => sum + Number(e.commission_amount), 0);

  const { data: payout, error: payoutErr } = await supabase
    .from("commission_payouts")
    .insert({ workspace_id: workspaceId, rep_id: repId, period_start: periodStart, period_end: periodEnd, total_amount: total, paid_at: new Date().toISOString(), payment_ref: paymentRef || null })
    .select()
    .single();

  if (payoutErr) throw payoutErr;

  // Mark events as paid
  await supabase
    .from("commission_events")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .in("id", events.map((e) => e.id));

  // Post cash settlement journal entry (non-blocking)
  recordCommissionPayout({ payout, workspaceId }).catch(() => {});

  return payout;
}

module.exports = { onDealWon, approveEvent, createPayout };
