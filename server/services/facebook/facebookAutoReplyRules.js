const logger = require("../../config/logger");

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getTriggerKeywords(rule) {
  const rawKeyword = typeof rule?.trigger_keyword === "string" ? rule.trigger_keyword : "";
  return rawKeyword
    .split(/[\n,]+/)
    .map((keyword) => normalizeText(keyword))
    .filter(Boolean);
}

function keywordMatches(message, keyword, matchType) {
  switch (matchType) {
    case "exact":
      return message === keyword;

    case "starts_with":
      return message.startsWith(keyword);

    case "contains":
    default:
      return message.includes(keyword);
  }
}

function matchRule(text, rule) {
  const message = normalizeText(text);
  const keywords = getTriggerKeywords(rule);

  if (!message || !keywords.length) return false;

  return keywords.some((keyword) =>
    keywordMatches(message, keyword, rule.trigger_match_type)
  );
}

async function getActiveAutoReplyRules({ supabaseClient, workspaceId, pageId }) {
  if (!supabaseClient) return [];

  let query = supabaseClient
    .from("fb_auto_reply_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  if (workspaceId && pageId) {
    query = query.or(`page_id.eq.${pageId},page_id.is.null`);
  } else if (pageId) {
    query = query.eq("page_id", pageId);
  }

  const { data, error } = await query;

  if (error) {
    logger.warn({ err: error.message }, "Failed to fetch auto-reply rules");
    return [];
  }

  return data || [];
}

async function matchAutoReplyRule({ text, supabaseClient, workspaceId, pageId }) {
  const rules = await getActiveAutoReplyRules({ supabaseClient, workspaceId, pageId });

  if (!rules.length) return null;

  for (const rule of rules) {
    if (matchRule(text, rule)) {
      let quickReplies = [];
      try {
        quickReplies = Array.isArray(rule.quick_replies)
          ? rule.quick_replies
          : JSON.parse(rule.quick_replies || "[]");
      } catch {
        quickReplies = [];
      }

      incrementMatchCount(supabaseClient, rule.id);

      return {
        handled: true,
        reply: rule.response_text,
        quickReplies,
        source: "auto_reply_rule",
        ruleId: rule.id,
        confidence: 1.0,
      };
    }
  }

  return null;
}

function incrementMatchCount(supabaseClient, ruleId) {
  if (!supabaseClient || !ruleId) return;
  supabaseClient
    .rpc("increment_auto_reply_match_count", { rule_id: ruleId })
    .then(({ error }) => {
      if (error) {
        logger.debug({ err: error.message }, "Failed to increment match count");
      }
    })
    .catch(() => {});
}

module.exports = {
  matchAutoReplyRule,
  getActiveAutoReplyRules,
  matchRule,
  getTriggerKeywords,
};
