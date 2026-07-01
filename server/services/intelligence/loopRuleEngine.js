/**
 * Loop Rule Engine — Config-Driven JSON Logic
 *
 * Rules are pure JSON — no hardcoding.
 * Example rule:
 * {
 *   "name": "Low ROAS Alert",
 *   "metric": "roas",
 *   "operator": "<",
 *   "threshold": 1.5,
 *   "severity": "critical",
 *   "actions": ["pause_campaign", "notify_admin"],
 *   "cooldown_minutes": 60
 * }
 */

const { toNumber } = require("./dataNormalizer");

const OPERATORS = {
  "<":   (a, b) => a < b,
  "<=":  (a, b) => a <= b,
  ">":   (a, b) => a > b,
  ">=":  (a, b) => a >= b,
  "==":  (a, b) => a === b,
  "!=":  (a, b) => a !== b,
  "between": (a, [lo, hi]) => a >= lo && a <= hi,
  "outside": (a, [lo, hi]) => a < lo || a > hi,
  "pct_drop": (a, [baseline, pct]) => baseline > 0 && ((baseline - a) / baseline) * 100 >= pct,
  "pct_rise": (a, [baseline, pct]) => baseline > 0 && ((a - baseline) / baseline) * 100 >= pct,
};

const NON_DESTRUCTIVE = new Set([
  "notify_admin", "send_alert", "create_task",
  "create_recommendation", "log_insight", "webhook",
  "send_email", "send_slack",
]);

const DESTRUCTIVE = new Set([
  "pause_campaign", "reduce_budget", "update_crm",
  "suspend_user", "block_transaction", "escalate",
]);

function evaluateRule(rule, metrics = {}, previousMetrics = {}) {
  if (!rule || !rule.metric || !rule.operator) {
    return { triggered: false, reason: "invalid_rule" };
  }

  const actual = toNumber(metrics[rule.metric] ?? metrics[rule.metric.replace(/\./g, "_")]);
  const operator = OPERATORS[rule.operator];

  if (!operator) {
    return { triggered: false, reason: `unknown_operator:${rule.operator}` };
  }

  let threshold = rule.threshold;
  if (["pct_drop", "pct_rise"].includes(rule.operator)) {
    const baseline = toNumber(previousMetrics[rule.metric] || rule.baseline || actual);
    threshold = [baseline, toNumber(rule.threshold)];
  } else if (Array.isArray(threshold)) {
    threshold = threshold.map(toNumber);
  } else {
    threshold = toNumber(threshold);
  }

  const triggered = operator(actual, threshold);
  const confidence = computeConfidence(rule, actual, threshold, previousMetrics);

  return {
    triggered,
    rule_name: rule.name || rule.metric,
    metric: rule.metric,
    metric_value: actual,
    threshold: rule.threshold,
    operator: rule.operator,
    severity: rule.severity || "info",
    confidence,
    reason: triggered ? "rule_matched" : "rule_not_matched",
  };
}

function computeConfidence(rule, actual, threshold, previousMetrics) {
  let base = 85;
  // More confidence if we have historical data
  if (previousMetrics && Object.keys(previousMetrics).length > 0) base += 5;
  // Less confidence on boundary cases (within 5% of threshold)
  const t = Array.isArray(threshold) ? threshold[0] : threshold;
  if (t && actual && Math.abs((actual - t) / t) < 0.05) base -= 15;
  return Math.min(98, Math.max(40, base));
}

function classifyAction(actionType) {
  if (NON_DESTRUCTIVE.has(actionType)) return "immediate";
  if (DESTRUCTIVE.has(actionType)) return "approval_required";
  return "approval_required"; // default safe
}

function evaluateAllRules(rules = [], metrics = {}, previousMetrics = {}) {
  return rules.map(rule => {
    const result = evaluateRule(rule, metrics, previousMetrics);
    const actions = result.triggered
      ? (rule.actions || []).map(a => {
          const type = typeof a === "string" ? a : a.type;
          const payload = typeof a === "object" ? { ...a } : {};
          return {
            type,
            payload: { ...payload, rule_name: rule.name, metric: rule.metric, value: result.metric_value },
            execution: classifyAction(type),
            severity: rule.severity || "info",
          };
        })
      : [];

    return { ...result, actions_planned: actions, rule_config: rule };
  });
}

module.exports = { evaluateRule, evaluateAllRules, classifyAction };
