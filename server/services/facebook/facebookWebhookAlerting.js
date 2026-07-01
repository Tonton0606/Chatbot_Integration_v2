/**
 * Facebook Webhook Alerting Service
 * Monitors webhook events and triggers alerts based on configured thresholds
 */

const logger = require("../../config/logger");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createFacebookWebhookAlertingService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookWebhookAlerting service.");
  }

  /**
   * Check if an alert should be triggered based on recent events
   */
  async function checkAndTriggerAlerts({
    workspaceId,
    pageId,
    eventType,
    status,
  }) {
    try {
      // Get alert configurations for this workspace/page
      const { data: alerts, error } = await supabaseClient
        .from("facebook_webhook_alerts")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .eq("enabled", true);

      if (error || !Array.isArray(alerts) || alerts.length === 0) {
        return;
      }

      for (const alert of alerts) {
        // Filter by page if specified
        if (alert.page_id && normalizeText(alert.page_id) !== normalizeText(pageId)) {
          continue;
        }

        // Filter by alert type
        if (alert.alert_type === "signature_failure" && status !== "signature_failed") {
          continue;
        }
        if (alert.alert_type === "rate_limit" && status !== "rate_limited") {
          continue;
        }

        // Check if threshold is exceeded within time window
        const shouldTrigger = await checkThreshold(alert, eventType, status);
        if (shouldTrigger) {
          await triggerAlert(alert, { eventType, status, pageId });
        }
      }
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to check alerts");
    }
  }

  /**
   * Check if the alert threshold is exceeded
   */
  async function checkThreshold(alert, eventType, status) {
    try {
      const windowMinutes = alert.window_minutes || 5;
      const threshold = alert.threshold || 5;
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

      // Count events matching the alert criteria
      let query = supabaseClient
        .from("facebook_webhook_monitoring")
        .select("id", { count: "exact", head: true })
        .gte("created_at", windowStart.toISOString());

      if (alert.page_id) {
        query = query.eq("page_id", normalizeText(alert.page_id));
      }

      if (alert.alert_type === "signature_failure") {
        query = query.eq("status", "signature_failed");
      } else if (alert.alert_type === "rate_limit") {
        query = query.eq("status", "rate_limited");
      } else if (alert.alert_type === "high_error_rate") {
        query = query.in("status", ["failure", "signature_failed", "rate_limited"]);
      }

      const { count, error } = await query;

      if (error) {
        logger.error({ error }, "[WebhookAlerting] Failed to check threshold");
        return false;
      }

      // Check if we've already triggered recently (within window)
      const lastTriggered = alert.last_triggered_at
        ? new Date(alert.last_triggered_at)
        : null;
      const cooldownEnd = lastTriggered
        ? new Date(lastTriggered.getTime() + windowMinutes * 60 * 1000)
        : null;

      if (cooldownEnd && new Date() < cooldownEnd) {
        return false; // Still in cooldown
      }

      return count >= threshold;
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Threshold check failed");
      return false;
    }
  }

  /**
   * Trigger an alert by updating last_triggered_at and sending notification
   */
  async function triggerAlert(alert, context) {
    try {
      // Update last_triggered_at
      const { error: updateError } = await supabaseClient
        .from("facebook_webhook_alerts")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);

      if (updateError) {
        logger.error({ error: updateError }, "[WebhookAlerting] Failed to update alert trigger time");
      }

      // Send notifications based on configured channels
      const channels = alert.notification_channels || ["email"];
      
      if (channels.includes("email")) {
        await sendEmailAlert(alert, context);
      }
      if (channels.includes("slack")) {
        await sendSlackAlert(alert, context);
      }

      logger.info({ alertId: alert.id, alertType: alert.alert_type }, "[WebhookAlerting] Alert triggered");
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to trigger alert");
    }
  }

  /**
   * Send email alert (placeholder - integrate with email service)
   */
  async function sendEmailAlert(alert, context) {
    try {
      // TODO: Integrate with email service
      logger.info({ alert, context }, "[WebhookAlerting] Email alert would be sent here");
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to send email alert");
    }
  }

  /**
   * Send Slack alert (placeholder - integrate with Slack webhook)
   */
  async function sendSlackAlert(alert, context) {
    try {
      // TODO: Integrate with Slack webhook
      logger.info({ alert, context }, "[WebhookAlerting] Slack alert would be sent here");
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to send Slack alert");
    }
  }

  /**
   * Create or update an alert configuration
   */
  async function upsertAlert({
    workspaceId,
    pageId,
    alertType,
    threshold,
    windowMinutes,
    enabled,
    notificationChannels,
  }) {
    try {
      const payload = {
        workspace_id: normalizeText(workspaceId),
        page_id: normalizeText(pageId) || null,
        alert_type: normalizeText(alertType),
        threshold: Number(threshold) || 5,
        window_minutes: Number(windowMinutes) || 5,
        enabled: enabled !== false,
        notification_channels: Array.isArray(notificationChannels)
          ? notificationChannels
          : ["email"],
        updated_at: new Date().toISOString(),
      };

      // Check if alert exists
      const { data: existing } = await supabaseClient
        .from("facebook_webhook_alerts")
        .select("id")
        .eq("workspace_id", payload.workspace_id)
        .eq("page_id", payload.page_id)
        .eq("alert_type", payload.alert_type)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabaseClient
          .from("facebook_webhook_alerts")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();
        result = data;
        if (error) throw error;
      } else {
        const { data, error } = await supabaseClient
          .from("facebook_webhook_alerts")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("*")
          .single();
        result = data;
        if (error) throw error;
      }

      return result;
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to upsert alert");
      throw err;
    }
  }

  /**
   * Get alert configurations for a workspace
   */
  async function getAlerts({ workspaceId, pageId }) {
    try {
      let query = supabaseClient
        .from("facebook_webhook_alerts")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId));

      if (pageId) {
        query = query.eq("page_id", normalizeText(pageId));
      }

      const { data, error } = await query;

      if (error) {
        logger.error({ error }, "[WebhookAlerting] Failed to fetch alerts");
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to fetch alerts");
      return [];
    }
  }

  /**
   * Delete an alert configuration
   */
  async function deleteAlert(alertId) {
    try {
      const { error } = await supabaseClient
        .from("facebook_webhook_alerts")
        .delete()
        .eq("id", alertId);

      if (error) {
        logger.error({ error }, "[WebhookAlerting] Failed to delete alert");
        throw error;
      }

      return true;
    } catch (err) {
      logger.error({ err }, "[WebhookAlerting] Failed to delete alert");
      throw err;
    }
  }

  return {
    checkAndTriggerAlerts,
    upsertAlert,
    getAlerts,
    deleteAlert,
  };
}

module.exports = {
  createFacebookWebhookAlertingService,
};
