/**
 * Facebook Webhook IP Allowlist Service
 * Verifies that webhook requests come from allowed IP ranges (Meta's IP ranges)
 */

const logger = require("../../config/logger");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convert a dotted-quad IPv4 string to an unsigned 32-bit integer.
 * Returns null for anything that is not a valid IPv4 address.
 */
function ipv4ToLong(addr) {
  const parts = String(addr).split(".");
  if (parts.length !== 4) return null;
  let long = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    long = long * 256 + n;
  }
  return long >>> 0;
}

function createFacebookWebhookIpAllowlistService({ supabaseClient }) {
  if (!supabaseClient) {
    throw new Error("supabaseClient is required for facebookWebhookIpAllowlist service.");
  }

  /**
   * Check if an IP address is in a CIDR range
   */
  function isIpInCidr(ipAddress, cidr) {
    try {
      // Normalize IPv4-mapped IPv6 (e.g. "::ffff:31.13.64.1") to plain IPv4.
      let addr = String(ipAddress).trim();
      const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
      if (mapped) addr = mapped[1];

      const [range, prefixStr] = String(cidr).trim().split("/");
      const prefix = prefixStr === undefined ? 32 : Number(prefixStr);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`invalid CIDR prefix: ${cidr}`);
      }

      const ipLong = ipv4ToLong(addr);
      const rangeLong = ipv4ToLong(range);
      if (rangeLong === null) throw new Error(`invalid CIDR range: ${cidr}`);
      if (ipLong === null) return false; // non-IPv4 address never matches an IPv4 range
      if (prefix === 0) return true;

      const mask = (0xffffffff << (32 - prefix)) >>> 0;
      return (ipLong & mask) === (rangeLong & mask);
    } catch (err) {
      logger.warn({ err, cidr }, "[IPAllowlist] Invalid CIDR range");
      return false;
    }
  }

  /**
   * Check if an IP address is allowed based on the allowlist
   */
  async function isIpAllowed({ workspaceId, ipAddress }) {
    try {
      if (!ipAddress) {
        logger.warn("[IPAllowlist] No IP address provided");
        return true; // Allow if no IP (shouldn't happen in production)
      }

      // Get IP allowlist for workspace
      const { data: allowlist, error } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .eq("enabled", true);

      if (error) {
        logger.error({ error }, "[IPAllowlist] Failed to fetch IP allowlist");
        return true; // Allow on error (fail-open)
      }

      if (!Array.isArray(allowlist) || allowlist.length === 0) {
        // No allowlist configured - allow all
        return true;
      }

      // Check if IP matches any CIDR range
      for (const entry of allowlist) {
        if (isIpInCidr(ipAddress, entry.ip_address)) {
          logger.info({ ipAddress, cidr: entry.ip_address }, "[IPAllowlist] IP allowed");
          return true;
        }
      }

      logger.warn({ ipAddress, workspaceId }, "[IPAllowlist] IP not in allowlist");
      return false;
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] IP check failed");
      return true; // Allow on error (fail-open)
    }
  }

  /**
   * Add an IP range to the allowlist
   */
  async function addIpRange({ workspaceId, ipAddress, description, enabled = true }) {
    try {
      const { data, error } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .insert({
          workspace_id: normalizeText(workspaceId),
          ip_address: normalizeText(ipAddress),
          description: normalizeText(description) || null,
          enabled: Boolean(enabled),
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        logger.error({ error }, "[IPAllowlist] Failed to add IP range");
        throw error;
      }

      return data;
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] Failed to add IP range");
      throw err;
    }
  }

  /**
   * Remove an IP range from the allowlist
   */
  async function removeIpRange(allowlistId) {
    try {
      const { error } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .delete()
        .eq("id", allowlistId);

      if (error) {
        logger.error({ error }, "[IPAllowlist] Failed to remove IP range");
        throw error;
      }

      return true;
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] Failed to remove IP range");
      throw err;
    }
  }

  /**
   * Get all IP ranges for a workspace
   */
  async function getIpRanges({ workspaceId }) {
    try {
      const { data, error } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .select("*")
        .eq("workspace_id", normalizeText(workspaceId))
        .order("created_at", { ascending: false });

      if (error) {
        logger.error({ error }, "[IPAllowlist] Failed to fetch IP ranges");
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] Failed to fetch IP ranges");
      return [];
    }
  }

  /**
   * Enable/disable an IP range
   */
  async function toggleIpRange(allowlistId, enabled) {
    try {
      const { data, error } = await supabaseClient
        .from("facebook_webhook_ip_allowlist")
        .update({ enabled: Boolean(enabled) })
        .eq("id", allowlistId)
        .select("*")
        .single();

      if (error) {
        logger.error({ error }, "[IPAllowlist] Failed to toggle IP range");
        throw error;
      }

      return data;
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] Failed to toggle IP range");
      throw err;
    }
  }

  /**
   * Get Meta's official IP ranges (Facebook/Messenger webhooks)
   * These are Meta's published IP ranges for their webhooks
   */
  function getMetaIpRanges() {
    // Meta's IP ranges as of 2024 (may need periodic updates)
    // Source: https://developers.facebook.com/docs/graph-api/webhooks
    return [
      // Facebook/Messenger webhook IPs
      "31.13.64.0/18",
      "31.13.64.0/18",
      "66.220.144.0/20",
      "69.63.176.0/20",
      "69.63.184.0/20",
      "69.63.176.0/20",
      "69.171.224.0/19",
      "69.171.239.0/24",
      "74.119.0.0/17",
      "103.4.96.0/22",
      "157.240.0.0/16",
      "173.252.64.0/18",
      "173.252.70.0/24",
      "179.60.192.0/22",
      "185.60.216.0/22",
      "204.15.20.0/22",
      "240.0.0.0/4",
    ];
  }

  /**
   * Initialize Meta's IP ranges for a workspace
   */
  async function initializeMetaIpRanges({ workspaceId }) {
    try {
      const metaRanges = getMetaIpRanges();
      const results = [];

      for (const cidr of metaRanges) {
        try {
          const result = await addIpRange({
            workspaceId,
            ipAddress: cidr,
            description: "Meta (Facebook/Messenger) webhook IP range",
            enabled: true,
          });
          results.push(result);
        } catch (err) {
          logger.warn({ err, cidr }, "[IPAllowlist] Failed to add Meta IP range");
        }
      }

      return results;
    } catch (err) {
      logger.error({ err }, "[IPAllowlist] Failed to initialize Meta IP ranges");
      throw err;
    }
  }

  return {
    isIpAllowed,
    addIpRange,
    removeIpRange,
    getIpRanges,
    toggleIpRange,
    getMetaIpRanges,
    initializeMetaIpRanges,
  };
}

module.exports = {
  createFacebookWebhookIpAllowlistService,
};
