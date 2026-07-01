/**
 * Facebook Webhook Monitoring Service
 * Logs webhook events for debugging, alerting, and analytics
 */

const logger = require("../../config/logger");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createFacebookWebhookMonitoringService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookWebhookMonitoring service.");
  }

  /**
   * Log a webhook event to the monitoring table
   */
  async function logWebhookEvent({
    workspaceId,
    pageId,
    eventType,
    status,
    errorMessage = null,
    processingTimeMs = null,
    payloadSize = null,
    senderId = null,
    metadata = {},
  }) {
    try {
      const payload = {
        workspace_id: normalizeText(workspaceId) || null,
        page_id: normalizeText(pageId) || null,
        event_type: normalizeText(eventType) || "unknown",
        status: normalizeText(status) || "unknown",
        error_message: normalizeText(errorMessage) || null,
        processing_time_ms: processingTimeMs ? Number(processingTimeMs) : null,
        payload_size: payloadSize ? Number(payloadSize) : null,
        sender_id: normalizeText(senderId) || null,
        metadata: metadata && typeof metadata === "object" ? metadata : {},
        created_at: new Date().toISOString(),
      };

      const { error } = await supabaseClient
        .from("facebook_webhook_monitoring")
        .insert(payload);

      if (error) {
        logger.error({ error, payload }, "[WebhookMonitoring] Failed to log webhook event");
      }
    } catch (err) {
      logger.error({ err }, "[WebhookMonitoring] Exception while logging webhook event");
    }
  }

  /**
   * Get recent webhook events for monitoring
   */
  async function getRecentWebhookEvents({
    workspaceId,
    pageId,
    status = null,
    eventType = null,
    limit = 50,
  }) {
    try {
      let query = supabaseClient
        .from("facebook_webhook_monitoring")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(Math.min(100, Math.max(1, Number(limit) || 50)));

      if (workspaceId) {
        query = query.eq("workspace_id", normalizeText(workspaceId));
      }
      if (pageId) {
        query = query.eq("page_id", normalizeText(pageId));
      }
      if (status) {
        query = query.eq("status", normalizeText(status));
      }
      if (eventType) {
        query = query.eq("event_type", normalizeText(eventType));
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error }, "[WebhookMonitoring] Failed to fetch webhook events");
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      logger.error({ err }, "[WebhookMonitoring] Exception while fetching webhook events");
      return [];
    }
  }

  /**
   * Get webhook event statistics for a time period
   */
  async function getWebhookEventStats({
    workspaceId,
    pageId,
    startDate = null,
    endDate = null,
  }) {
    try {
      let query = supabaseClient
        .from("facebook_webhook_monitoring")
        .select("status, event_type, created_at");

      if (workspaceId) {
        query = query.eq("workspace_id", normalizeText(workspaceId));
      }
      if (pageId) {
        query = query.eq("page_id", normalizeText(pageId));
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error }, "[WebhookMonitoring] Failed to fetch webhook stats");
        return null;
      }

      if (!Array.isArray(data) || data.length === 0) {
        return {
          total: 0,
          byStatus: {},
          byEventType: {},
          successRate: 0,
        };
      }

      const stats = {
        total: data.length,
        byStatus: {},
        byEventType: {},
        successRate: 0,
      };

      data.forEach((event) => {
        const status = event.status || "unknown";
        const eventType = event.event_type || "unknown";

        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        stats.byEventType[eventType] = (stats.byEventType[eventType] || 0) + 1;
      });

      const successCount = stats.byStatus["success"] || 0;
      stats.successRate = stats.total > 0 ? (successCount / stats.total) * 100 : 0;

      return stats;
    } catch (err) {
      logger.error({ err }, "[WebhookMonitoring] Exception while fetching webhook stats");
      return null;
    }
  }

  /**
   * Clean up old webhook monitoring records (older than 30 days)
   */
  async function cleanupOldWebhookEvents() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabaseClient
        .from("facebook_webhook_monitoring")
        .delete()
        .lt("created_at", thirtyDaysAgo.toISOString());

      if (error) {
        logger.error({ error }, "[WebhookMonitoring] Failed to cleanup old webhook events");
      } else {
        logger.info("[WebhookMonitoring] Cleaned up old webhook events (older than 30 days)");
      }
    } catch (err) {
      logger.error({ err }, "[WebhookMonitoring] Exception while cleaning up old webhook events");
    }
  }

  return {
    logWebhookEvent,
    getRecentWebhookEvents,
    getWebhookEventStats,
    cleanupOldWebhookEvents,
  };
}

module.exports = {
  createFacebookWebhookMonitoringService,
};
