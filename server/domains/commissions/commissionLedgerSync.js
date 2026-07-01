/**
 * Syncs commission events and payouts to the double-entry accounting ledger.
 *
 * Chart of accounts used:
 *   6350 — Commission Expense (expense)
 *   2300 — Commissions Payable (liability)
 *   1000 — Cash & Cash Equivalents (asset)
 *
 * On commission_event approved:   DR 6350 / CR 2300 (accrual)
 * On commission_payout created:   DR 2300 / CR 1000 (settlement)
 */

const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");

async function nextJeNumber(workspaceId) {
  const { data, error } = await supabase.rpc("next_je_number", { p_workspace_id: workspaceId });
  if (error || !data) {
    // Fallback: manual sequence if RPC unavailable
    const { data: last } = await supabase
      .from("journal_entries")
      .select("je_number")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastNum = last ? parseInt(last.je_number.replace(/^JE-/, ""), 10) || 0 : 0;
    return `JE-${String(lastNum + 1).padStart(6, "0")}`;
  }
  return data;
}

async function ensureCommissionAccounts(workspaceId) {
  const needed = [
    { account_code: "2350", name: "Commissions Payable", account_type: "liability" },
    { account_code: "6350", name: "Commission Expense",  account_type: "expense" },
  ];
  for (const acct of needed) {
    const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("account_code", acct.account_code)
      .maybeSingle();
    if (!existing) {
      await supabase.from("chart_of_accounts").insert({ workspace_id: workspaceId, ...acct });
    }
  }
}

/**
 * Called when a commission event is approved.
 * Records the accrual: DR Commission Expense / CR Commissions Payable
 */
async function recordCommissionAccrual({ event, workspaceId }) {
  try {
    await ensureCommissionAccounts(workspaceId);
    const jeNumber = await nextJeNumber(workspaceId);

    const { data: je, error: jeErr } = await supabase
      .from("journal_entries")
      .insert({
        workspace_id: workspaceId,
        je_number: jeNumber,
        entry_date: new Date().toISOString().slice(0, 10),
        memo: `Commission accrual — event ${event.id.slice(0, 8)}`,
        reference: `COMM-${event.id.slice(0, 8)}`,
        status: "posted",
      })
      .select("id")
      .single();

    if (jeErr) throw jeErr;

    await supabase.from("journal_entry_lines").insert([
      { journal_entry_id: je.id, account_code: "6350", description: "Commission expense accrual", debit: event.commission_amount, credit: 0,                       line_order: 1 },
      { journal_entry_id: je.id, account_code: "2350", description: "Commissions payable",        debit: 0,                      credit: event.commission_amount, line_order: 2 },
    ]);

    logger.info({ jeNumber, eventId: event.id, amount: event.commission_amount }, "commissions: accrual JE posted");
    return jeNumber;
  } catch (err) {
    logger.error({ err, eventId: event.id }, "commissions: failed to post accrual JE (non-fatal)");
    return null;
  }
}

/**
 * Called when a commission payout is created (cash settlement).
 * Records: DR Commissions Payable / CR Cash
 */
async function recordCommissionPayout({ payout, workspaceId }) {
  try {
    await ensureCommissionAccounts(workspaceId);
    const jeNumber = await nextJeNumber(workspaceId);

    const { data: je, error: jeErr } = await supabase
      .from("journal_entries")
      .insert({
        workspace_id: workspaceId,
        je_number: jeNumber,
        entry_date: new Date().toISOString().slice(0, 10),
        memo: `Commission payout ${payout.period_start} to ${payout.period_end}`,
        reference: `PAYOUT-${payout.id.slice(0, 8)}`,
        status: "posted",
      })
      .select("id")
      .single();

    if (jeErr) throw jeErr;

    await supabase.from("journal_entry_lines").insert([
      { journal_entry_id: je.id, account_code: "2350", description: "Commissions payable settled", debit: payout.total_amount, credit: 0,                   line_order: 1 },
      { journal_entry_id: je.id, account_code: "1000", description: "Cash paid for commissions",   debit: 0,                   credit: payout.total_amount, line_order: 2 },
    ]);

    logger.info({ jeNumber, payoutId: payout.id, amount: payout.total_amount }, "commissions: payout JE posted");
    return jeNumber;
  } catch (err) {
    logger.error({ err, payoutId: payout.id }, "commissions: failed to post payout JE (non-fatal)");
    return null;
  }
}

module.exports = { recordCommissionAccrual, recordCommissionPayout };
