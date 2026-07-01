/**
 * Facebook Conversation Analytics Service
 * Aggregates conversation metrics for analytics dashboards
 */

const logger = require("../../config/logger");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createFacebookConversationAnalyticsService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookConversationAnalytics service.");
  }

  /**
   * Generate daily analytics summary for a workspace and page
   */
  async function generateDailyAnalytics({ workspaceId, pageId, date }) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startDate = new Date(targetDate);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get all conversations for the date
      const { data: conversations, error: convError } = await supabaseClient
        .from("facebook_conversations")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .eq("page_id", normalizeText(pageId))
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());

      if (convError) {
        logger.error({ error: convError }, "[ConversationAnalytics] Failed to fetch conversations");
        return null;
      }

      if (!Array.isArray(conversations) || conversations.length === 0) {
        return null;
      }

      // Get all messages for these conversations
      const conversationIds = conversations.map((c) => c.id);
      const { data: messages, error: msgError } = await supabaseClient
        .from("facebook_conversation_messages")
        .select("*")
        .in("conversation_id", conversationIds);

      if (msgError) {
        logger.error({ error: msgError }, "[ConversationAnalytics] Failed to fetch messages");
        return null;
      }

      // Calculate metrics
      const uniqueCustomers = new Set(conversations.map((c) => c.customer_psid)).size;
      const totalMessages = Array.isArray(messages) ? messages.length : 0;
      const aiMessages = Array.isArray(messages) ? messages.filter((m) => m.ai_generated).length : 0;
      const humanMessages = totalMessages - aiMessages;
      const leadsGenerated = conversations.filter((c) => c.lead_stage !== "new").length;
      const leadsQualified = conversations.filter((c) => c.lead_stage === "qualified" || c.lead_stage === "hot").length;
      const humanHandoffs = conversations.filter((c) => c.human_takeover).length;

      // Get comment replies for the date
      const { data: comments, error: commentError } = await supabaseClient
        .from("client_facebook_comments")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .eq("page_id", normalizeText(pageId))
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());

      const commentReplies = Array.isArray(comments) ? comments.length : 0;

      // Calculate top intents
      const intentCounts = {};
      conversations.forEach((c) => {
        if (c.intent) {
          intentCounts[c.intent] = (intentCounts[c.intent] || 0) + 1;
        }
      });
      const topIntents = Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((acc, [intent, count]) => ({ ...acc, [intent]: count }), {});

      // Calculate top lead stages
      const stageCounts = {};
      conversations.forEach((c) => {
        if (c.lead_stage) {
          stageCounts[c.lead_stage] = (stageCounts[c.lead_stage] || 0) + 1;
        }
      });
      const topLeadStages = Object.entries(stageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .reduce((acc, [stage, count]) => ({ ...acc, [stage]: count }), {});

      // Calculate average response time (simplified - time between customer message and AI response)
      let totalResponseTime = 0;
      let responseCount = 0;
      if (Array.isArray(messages)) {
        const customerMessages = messages.filter((m) => m.sender_type === "customer");
        customerMessages.forEach((cm) => {
          const nextAiMessage = messages.find(
            (m) => m.sender_type === "ai" && new Date(m.created_at) > new Date(cm.created_at)
          );
          if (nextAiMessage) {
            const responseTime = new Date(nextAiMessage.created_at) - new Date(cm.created_at);
            totalResponseTime += responseTime;
            responseCount++;
          }
        });
      }
      const avgResponseTimeSeconds = responseCount > 0 ? (totalResponseTime / responseCount) / 1000 : null;

      const analytics = {
        workspace_id: normalizeText(workspaceId),
        page_id: normalizeText(pageId),
        date: targetDate,
        total_conversations: conversations.length,
        new_conversations: conversations.filter((c) => c.current_state === "new").length,
        active_conversations: conversations.filter((c) => c.conversation_status === "active").length,
        total_messages,
        ai_messages: aiMessages,
        human_messages,
        avg_response_time_seconds,
        leads_generated: leadsGenerated,
        leads_qualified: leadsQualified,
        human_handoffs,
        comment_replies: commentReplies,
        unique_customers: uniqueCustomers,
        top_intents: topIntents,
        top_lead_stages: topLeadStages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert to analytics table
      const { data: upserted, error: upsertError } = await supabaseClient
        .from("facebook_conversation_analytics")
        .upsert(analytics, { onConflict: "workspace_id,page_id,date" })
        .select("*")
        .single();

      if (upsertError) {
        logger.error({ error: upsertError }, "[ConversationAnalytics] Failed to upsert analytics");
        return null;
      }

      return upserted;
    } catch (err) {
      logger.error({ err }, "[ConversationAnalytics] Failed to generate daily analytics");
      return null;
    }
  }

  /**
   * Get analytics for a date range
   */
  async function getAnalytics({ workspaceId, pageId, startDate, endDate }) {
    try {
      let query = supabaseClient
        .from("facebook_conversation_analytics")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .order("date", { ascending: false });

      if (pageId) {
        query = query.eq("page_id", normalizeText(pageId));
      }
      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error }, "[ConversationAnalytics] Failed to fetch analytics");
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      logger.error({ err }, "[ConversationAnalytics] Failed to fetch analytics");
      return [];
    }
  }

  /**
   * Get aggregated analytics summary for a date range
   */
  async function getAnalyticsSummary({ workspaceId, pageId, startDate, endDate }) {
    try {
      const analytics = await getAnalytics({ workspaceId, pageId, startDate, endDate });

      if (analytics.length === 0) {
        return null;
      }

      const summary = {
        total_conversations: 0,
        new_conversations: 0,
        active_conversations: 0,
        total_messages: 0,
        ai_messages: 0,
        human_messages: 0,
        leads_generated: 0,
        leads_qualified: 0,
        human_handoffs: 0,
        comment_replies: 0,
        unique_customers: 0,
        avg_response_time_seconds: 0,
        date_range: {
          start: analytics[analytics.length - 1]?.date,
          end: analytics[0]?.date,
        },
      };

      let totalResponseTime = 0;
      let responseCount = 0;

      analytics.forEach((a) => {
        summary.total_conversations += a.total_conversations || 0;
        summary.new_conversations += a.new_conversations || 0;
        summary.active_conversations += a.active_conversations || 0;
        summary.total_messages += a.total_messages || 0;
        summary.ai_messages += a.ai_messages || 0;
        summary.human_messages += a.human_messages || 0;
        summary.leads_generated += a.leads_generated || 0;
        summary.leads_qualified += a.leads_qualified || 0;
        summary.human_handoffs += a.human_handoffs || 0;
        summary.comment_replies += a.comment_replies || 0;
        summary.unique_customers += a.unique_customers || 0;
        
        if (a.avg_response_time_seconds) {
          totalResponseTime += a.avg_response_time_seconds;
          responseCount++;
        }
      });

      summary.avg_response_time_seconds = responseCount > 0 ? totalResponseTime / responseCount : null;

      return summary;
    } catch (err) {
      logger.error({ err }, "[ConversationAnalytics] Failed to generate summary");
      return null;
    }
  }

  /**
   * Regenerate analytics for a specific date (useful for backfilling)
   */
  async function regenerateAnalytics({ workspaceId, pageId, date }) {
    return await generateDailyAnalytics({ workspaceId, pageId, date });
  }

  return {
    generateDailyAnalytics,
    getAnalytics,
    getAnalyticsSummary,
    regenerateAnalytics,
  };
}

module.exports = {
  createFacebookConversationAnalyticsService,
};
