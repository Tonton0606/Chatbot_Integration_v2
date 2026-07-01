/**
 * Calculates commission amount for a deal given a plan.
 * Supports flat, percent, and tiered plan types.
 */

function calculateFlat(plan, tiers) {
  // Flat: single tier, rate is the fixed dollar amount
  const tier = tiers[0];
  return tier ? { amount: tier.rate, rateApplied: tier.rate } : null;
}

function calculatePercent(plan, tiers, dealAmount) {
  const tier = tiers[0];
  if (!tier) return null;
  const amount = (dealAmount * tier.rate) / 100;
  return { amount, rateApplied: tier.rate };
}

function calculateTiered(plan, tiers, dealAmount) {
  // Find the matching tier bracket for dealAmount
  const sorted = [...tiers].sort((a, b) => a.min_amount - b.min_amount);
  const tier = sorted.findLast((t) => dealAmount >= t.min_amount && (t.max_amount == null || dealAmount <= t.max_amount));
  if (!tier) return null;
  const amount = (dealAmount * tier.rate) / 100;
  return { amount, rateApplied: tier.rate };
}

/**
 * @param {{ type: string }} plan
 * @param {Array<{ min_amount: number, max_amount: number|null, rate: number }>} tiers
 * @param {number} dealAmount
 * @returns {{ amount: number, rateApplied: number } | null}
 */
function calculate(plan, tiers, dealAmount) {
  switch (plan.type) {
    case "flat":    return calculateFlat(plan, tiers);
    case "percent": return calculatePercent(plan, tiers, dealAmount);
    case "tiered":  return calculateTiered(plan, tiers, dealAmount);
    default:        return null;
  }
}

module.exports = { calculate };
