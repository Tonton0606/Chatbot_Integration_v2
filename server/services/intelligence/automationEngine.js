const { toNumber } = require("./dataNormalizer");

const NON_DESTRUCTIVE_ACTIONS = new Set(["send_alert", "create_task", "create_recommendation", "notify_owner", "webhook"]);

function parseRule(rule = {}) {
  if (rule.metric && rule.operator) return rule;

  const raw = String(rule.if || "").trim();
  const match = raw.match(/^([a-zA-Z0-9_.-]+)\s*(<=|>=|===|==|<|>)\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  return {
    metric: match[1],
    operator: match[2],
    value: Number(match[3]),
  };
}

function evaluateRule(rule, metrics = {}) {
  const parsed = parseRule(rule);
  if (!parsed) return { matched: false, reason: "unsupported_rule" };

  const actual = toNumber(metrics[parsed.metric]);
  const expected = toNumber(parsed.value);
  const matched = {
    "<": actual < expected,
    "<=": actual <= expected,
    ">": actual > expected,
    ">=": actual >= expected,
    "==": actual === expected,
    "===": actual === expected,
  }[parsed.operator] || false;

  return {
    matched,
    metric: parsed.metric,
    operator: parsed.operator,
    expected,
    actual,
  };
}

function planActions(actions = [], context = {}) {
  return actions.map((action) => {
    const type = typeof action === "string" ? action : action.type;
    const payload = typeof action === "string" ? {} : { ...action };
    const governed = !NON_DESTRUCTIVE_ACTIONS.has(type);

    return {
      type,
      status: governed ? "approval_required" : "executed",
      payload,
      context: {
        module: context.module?.slug,
        generated_at: new Date().toISOString(),
      },
    };
  });
}

module.exports = {
  evaluateRule,
  planActions,
};
