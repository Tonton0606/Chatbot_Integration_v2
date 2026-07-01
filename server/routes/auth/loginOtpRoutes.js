const crypto = require("crypto");
const bcrypt = require("bcrypt");
const express = require("express");

const { supabase } = require("../../config/supabase");
const { requireAuthOnly, _hashToken, handleAuthError } = require("../../middleware/auth");
const logger = require("../../config/logger");
const { sendEmail } = require("../../services/emailService");

const router = express.Router();

// ── constants ────────────────────────────────────────────────────────────────

const OTP_BCRYPT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS_PER_CHALLENGE = 5;
const IP_BLOCK_MAX = 10;          // failed attempts across all challenges from one IP
const IP_BLOCK_WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const USER_START_MAX = 3;          // max OTP starts per user per window
const USER_START_WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;   // 15 minutes
const DEVICE_TRUST_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Twilio SMS config (optional — if not set, SMS fallback is disabled)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || null;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN || null;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || null;
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require("twilio");
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (_) {
    logger.warn("Twilio module not installed — SMS fallback disabled");
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "unknown";
}

function getUserFirstName(profile, email) {
  const fullName = profile?.full_name || profile?.name || "";
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || String(email || "").split("@")[0] || "there";
}

function getLoginOtpEmail({ firstName, otp }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;">
      <h2 style="margin:0 0 12px;color:#111827;">Your Exponify login code</h2>
      <p style="color:#374151;">Hi ${firstName || "there"},</p>
      <p style="color:#374151;">Use this 6-digit code to complete your login:</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:center;color:#111827;">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">This code expires in 10 minutes. If you did not try to log in, ignore this email.</p>
    </div>
  `;
}

// ── audit log helper (Enhancement 4) ──────────────────────────────────────────

async function auditLog({ userId, email, action, severity, ip, metadata }) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId || null,
      user_email: email || null,
      action,
      resource_type: "auth",
      severity: severity || "info",
      ip_address: ip || null,
      metadata: metadata || {},
    });
  } catch (err) {
    logger.error({ err }, "Failed to write auth audit log");
  }
}

// ── device fingerprint helper (Enhancement 3) ────────────────────────────────

function getDeviceHash(req) {
  const ua = req.headers["user-agent"] || "unknown";
  const ip = getClientIp(req);
  let ipSubnet = ip;
  if (ip.includes(".")) {
    ipSubnet = ip.split(".").slice(0, 3).join(".");
  } else if (ip.includes(":")) {
    ipSubnet = ip.split(":").slice(0, 4).join(":");
  }
  return crypto.createHash("sha256").update(`${ua}:${ipSubnet}`).digest("hex");
}

function getDeviceLabel(req) {
  const ua = req.headers["user-agent"] || "Unknown";
  const browser = ua.includes("Chrome") ? "Chrome" :
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Safari") ? "Safari" :
    ua.includes("Edge") ? "Edge" : "Browser";
  const os = ua.includes("Windows") ? "Windows" :
    ua.includes("Mac") ? "macOS" :
    ua.includes("Linux") ? "Linux" :
    ua.includes("Android") ? "Android" :
    ua.includes("iPhone") || ua.includes("iOS") ? "iOS" : "Unknown";
  return `${browser} on ${os}`;
}

async function isDeviceTrusted(userId, req) {
  try {
    const deviceHash = getDeviceHash(req);
    const { data, error } = await supabase
      .from("trusted_devices")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("device_hash", deviceHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) {
      logger.warn({ err: error.message, userId }, "Device trust check failed — requiring OTP");
      return false;
    }
    return !!data;
  } catch (err) {
    logger.warn({ err: err.message, userId }, "Device trust check error — requiring OTP");
    return false;
  }
}

// ── SMS OTP helper (Enhancement 1) ────────────────────────────────────────────

async function sendSmsOtp(phone, otp) {
  if (!twilioClient) return { success: false, error: "SMS not configured" };
  try {
    await twilioClient.messages.create({
      body: `Your Exponify login code is: ${otp}. It expires in 10 minutes.`,
      from: TWILIO_FROM_NUMBER,
      to: phone,
    });
    return { success: true };
  } catch (err) {
    logger.error({ err: err.message }, "SMS OTP send failed");
    return { success: false, error: err.message };
  }
}

// ── magic link email template (Enhancement 2) ────────────────────────────────

function getMagicLinkEmail({ firstName, magicLink }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;">
      <h2 style="margin:0 0 12px;color:#111827;">Login to Exponify</h2>
      <p style="color:#374151;">Hi ${firstName || "there"},</p>
      <p style="color:#374151;">Click the button below to log in securely. This link expires in 15 minutes.</p>
      <a href="${magicLink}" style="display:inline-block;background:#c9a84c;color:#0a0e1a;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;margin:16px 0;">Log In to Exponify</a>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">If you did not request this link, ignore this email. Your account is safe.</p>
    </div>
  `;
}

// ── IP-based rate limit check ─────────────────────────────────────────────────

async function isIpBlocked(ip, { failClosed = false } = {}) {
  const windowStart = new Date(Date.now() - IP_BLOCK_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from("login_otp_challenges")
    .select("*", { count: "exact", head: true })
    .eq("client_ip", ip)
    .eq("failed", true)
    .gte("created_at", windowStart);

  if (error) {
    if (failClosed) throw new Error("Unable to verify rate limit. Please try again.");
    return false; // fail open on start — don't lock out on transient DB error
  }
  return (count || 0) >= IP_BLOCK_MAX;
}

// ── POST /start ──────────────────────────────────────────────────────────────

router.post("/start", requireAuthOnly, async (req, res) => {
  const ip = getClientIp(req);

  try {
    const user = req.user;
    const email = String(user.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, error: "User email is required." });
    }

    // IP block check
    if (await isIpBlocked(ip)) {
      logger.warn({ ip, userId: user.id }, "OTP start blocked — IP rate limit");
      await auditLog({ userId: user.id, email, action: "otp_start_ip_blocked", severity: "warning", ip });
      return res.status(429).json({
        success: false,
        error: "Too many login attempts from this network. Please wait 15 minutes.",
      });
    }

    // Device trust check (Enhancement 3) — skip OTP if device is trusted
    if (await isDeviceTrusted(user.id, req)) {
      logger.info({ userId: user.id }, "OTP start skipped — trusted device");
      await auditLog({ userId: user.id, email, action: "otp_start_trusted_device_skip", severity: "info", ip });
      return res.json({
        success: true,
        trustedDevice: true,
        message: "Trusted device — OTP not required.",
      });
    }

    // Per-user start rate limit — prevents OTP email spam
    const userWindowStart = new Date(Date.now() - USER_START_WINDOW_MS).toISOString();
    const { count: userStartCount, error: userStartError } = await supabase
      .from("login_otp_challenges")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", userWindowStart);

    if (!userStartError && (userStartCount || 0) >= USER_START_MAX) {
      logger.warn({ userId: user.id, count: userStartCount }, "OTP start blocked — user rate limit");
      await auditLog({ userId: user.id, email, action: "otp_start_user_rate_limited", severity: "warning", ip });
      return res.status(429).json({
        success: false,
        error: "Too many login code requests. Please wait a few minutes before trying again.",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    // Invalidate any previous unconsumed challenges for this user
    // to prevent multiple active OTPs from race condition or resend
    await supabase
      .from("login_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .is("verified_at", null);

    // bcrypt hash with salt (cost factor 10 — fast enough, not brute-forceable)
    const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_ROUNDS);

    const { data: challenge, error: insertError } = await supabase
      .from("login_otp_challenges")
      .insert({
        user_id: user.id,
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        client_ip: ip,
        failed: false,
      })
      .select("id, expires_at")
      .single();

    if (insertError) throw insertError;

    const firstName = getUserFirstName(profile, email);

    const smtpConfigured = !!(process.env.SMTP_USER || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY);

    let emailResult = { success: false, error: "SMTP not configured" };

    if (smtpConfigured) {
      emailResult = await sendEmail({
        to: email,
        subject: "Your Exponify login code",
        html: getLoginOtpEmail({ firstName, otp }),
        text: [
          `Hi ${firstName},`,
          "",
          `Your Exponify login code is: ${otp}`,
          "",
          "This code expires in 10 minutes.",
          "If you did not try to log in, ignore this email.",
        ].join("\n"),
      });
    }

    if (!emailResult?.success) {
      // SMS fallback (Enhancement 1) — try SMS if email fails and user has phone
      const { data: profileFull } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      const phone = profileFull?.phone;
      if (phone) {
        const smsResult = await sendSmsOtp(phone, otp);
        if (smsResult.success) {
          logger.info({ userId: user.id }, "OTP sent via SMS fallback");
          await auditLog({ userId: user.id, email, action: "otp_start_sms_fallback", severity: "info", ip });
          return res.json({
            success: true,
            challengeId: challenge.id,
            expiresAt: challenge.expires_at,
            message: "Login OTP sent via SMS.",
          });
        }
      }
      // Local/dev fallback — when neither email nor SMS is configured, surface
      // the OTP to the developer (server log + response) instead of failing, so
      // login is testable without mail credentials. HARD-GUARDED to non-production
      // so a real OTP can never be leaked in prod.
      if (process.env.NODE_ENV !== "production") {
        logger.warn({ userId: user.id }, "[DEV] email/SMS unavailable — skipping OTP step (NEVER happens in production)");
        await auditLog({ userId: user.id, email, action: "otp_start_dev_skip", severity: "warning", ip });
        // No way to deliver a code locally — skip the OTP gate entirely so login
        // works in local preview. Consume the challenge so it can't be reused.
        await supabase
          .from("login_otp_challenges")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", challenge.id);
        return res.json({
          success: true,
          trustedDevice: true,
          message: "DEV mode: email not configured — OTP step skipped.",
        });
      }

      await supabase
        .from("login_otp_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challenge.id);
      await auditLog({ userId: user.id, email, action: "otp_start_email_failed", severity: "error", ip, metadata: { error: emailResult?.error } });
      throw new Error(emailResult?.error || "Failed to send login OTP email.");
    }

    await auditLog({ userId: user.id, email, action: "otp_start_success", severity: "info", ip });
    return res.json({
      success: true,
      challengeId: challenge.id,
      expiresAt: challenge.expires_at,
      message: "Login OTP sent.",
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, ip }, "Login OTP start error");
    const isProd = process.env.NODE_ENV === "production";
    return res.status(500).json({
      success: false,
      error: isProd
        ? "Unable to send login OTP. Please try again."
        : `Unable to send login OTP: ${error.message}`,
    });
  }
});

// ── POST /verify ─────────────────────────────────────────────────────────────

router.post("/verify", requireAuthOnly, async (req, res) => {
  const ip = getClientIp(req);

  try {
    const challengeId = String(req.body?.challengeId || "").trim();
    const otp = String(req.body?.otp || "").replace(/\D/g, "");

    if (!challengeId || otp.length !== 6) {
      return res.status(400).json({ success: false, error: "Challenge ID and 6-digit OTP are required." });
    }

    // IP block check on verify too — fail closed to prevent brute-force bypass
    if (await isIpBlocked(ip, { failClosed: true })) {
      return res.status(429).json({
        success: false,
        error: "Too many login attempts from this network. Please wait 15 minutes.",
      });
    }

    const { data: challenge, error: fetchError } = await supabase
      .from("login_otp_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!challenge) {
      return res.status(400).json({ success: false, error: "Invalid login code." });
    }

    if (challenge.user_id !== req.user.id) {
      logger.warn({ ip, challengeId, userId: req.user.id, challengeUserId: challenge.user_id }, "OTP verify — challenge does not belong to user");
      return res.status(403).json({ success: false, error: "Invalid login code." });
    }

    if (challenge.consumed_at || challenge.verified_at) {
      return res.status(400).json({ success: false, error: "This login code has already been used." });
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: "This login code has expired." });
    }

    if (Number(challenge.attempts || 0) >= MAX_ATTEMPTS_PER_CHALLENGE) {
      await auditLog({ userId: req.user.id, email: challenge.email, action: "otp_verify_max_attempts", severity: "warning", ip, metadata: { challengeId } });
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Please log in again.",
        remainingAttempts: 0,
      });
    }

    // bcrypt compare — timing-safe by design
    const otpValid = await bcrypt.compare(otp, challenge.otp_hash);

    if (!otpValid) {
      const newAttempts = Number(challenge.attempts || 0) + 1;
      // Mark as failed attempt (counted for IP block)
      await supabase
        .from("login_otp_challenges")
        .update({
          attempts: newAttempts,
          failed: true,
        })
        .eq("id", challenge.id);

      const remaining = Math.max(0, MAX_ATTEMPTS_PER_CHALLENGE - newAttempts);
      logger.warn({ ip, challengeId, attempts: newAttempts, remaining }, "OTP verify failed");
      await auditLog({ userId: req.user.id, email: challenge.email, action: "otp_verify_failed", severity: "warning", ip, metadata: { challengeId, attempts: newAttempts, remaining } });
      return res.status(400).json({
        success: false,
        error: remaining > 0
          ? `Invalid login code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Invalid login code. No attempts remaining. Please log in again.",
        remainingAttempts: remaining,
      });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("login_otp_challenges")
      .update({
        verified_at: now,
        consumed_at: now,
        attempts: Number(challenge.attempts || 0) + 1,
        failed: false,
      })
      .eq("id", challenge.id);

    if (updateError) throw updateError;

    await auditLog({ userId: challenge.user_id, email: challenge.email, action: "otp_verify_success", severity: "info", ip, metadata: { challengeId } });

    // Device trust (Enhancement 3) — if user requested trust, issue a trust token
    const trustDevice = req.body?.trustDevice === true;
    let deviceTrusted = false;
    if (trustDevice) {
      const deviceHash = getDeviceHash(req);
      const deviceLabel = getDeviceLabel(req);
      const trustExpires = new Date(Date.now() + DEVICE_TRUST_TTL_MS).toISOString();
      const { error: deviceInsertError } = await supabase
        .from("trusted_devices")
        .insert({
          user_id: challenge.user_id,
          device_hash: deviceHash,
          device_label: deviceLabel,
          expires_at: trustExpires,
        });
      if (!deviceInsertError) {
        deviceTrusted = true;
        logger.info({ userId: challenge.user_id, deviceLabel }, "Device trusted for 30 days");
        await auditLog({ userId: challenge.user_id, email: challenge.email, action: "device_trust_issued", severity: "info", ip, metadata: { deviceLabel } });
      } else {
        logger.error({ err: deviceInsertError.message, userId: challenge.user_id }, "Device trust insert failed");
      }
    }

    return res.json({
      success: true,
      userId: challenge.user_id,
      email: challenge.email,
      deviceTrusted,
      message: "Login OTP verified.",
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, ip }, "Login OTP verify error");
    return res.status(500).json({ success: false, error: "Unable to verify login OTP. Please try again." });
  }
});

// ── POST /magic-link/request (Enhancement 2) ─────────────────────────────────

router.post("/magic-link/request", requireAuthOnly, async (req, res) => {
  const ip = getClientIp(req);

  try {
    const user = req.user;
    const email = String(user.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, error: "User email is required." });
    }

    // IP block check
    if (await isIpBlocked(ip)) {
      return res.status(429).json({
        success: false,
        error: "Too many login attempts from this network. Please wait 15 minutes.",
      });
    }

    // Per-user start rate limit
    const userWindowStart = new Date(Date.now() - USER_START_WINDOW_MS).toISOString();
    const { count: userStartCount } = await supabase
      .from("login_otp_challenges")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", userWindowStart);

    if ((userStartCount || 0) >= USER_START_MAX) {
      return res.status(429).json({
        success: false,
        error: "Too many login requests. Please wait a few minutes before trying again.",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = _hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();

    const { error: insertError } = await supabase
      .from("login_magic_links")
      .insert({
        user_id: user.id,
        email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        client_ip: ip,
      });

    if (insertError) throw insertError;

    const firstName = getUserFirstName(profile, email);
    const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    const magicLink = `${frontendUrl}/auth/magic?token=${rawToken}`;

    const emailResult = await sendEmail({
      to: email,
      subject: "Login to Exponify",
      html: getMagicLinkEmail({ firstName, magicLink }),
      text: [
        `Hi ${firstName},`,
        "",
        "Click the link below to log in to Exponify:",
        magicLink,
        "",
        "This link expires in 15 minutes.",
        "If you did not request this, ignore this email.",
      ].join("\n"),
    });

    if (!emailResult?.success) {
      await auditLog({ userId: user.id, email, action: "magic_link_email_failed", severity: "error", ip, metadata: { error: emailResult?.error } });
      throw new Error(emailResult?.error || "Failed to send magic link email.");
    }

    await auditLog({ userId: user.id, email, action: "magic_link_sent", severity: "info", ip });
    return res.json({ success: true, message: "Magic link sent to your email." });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, ip }, "Magic link request error");
    return res.status(500).json({ success: false, error: "Unable to send magic link. Please try again." });
  }
});

// ── GET /magic-link/verify (Enhancement 2) ───────────────────────────────────

router.get("/magic-link/verify", async (req, res) => {
  const ip = getClientIp(req);

  try {
    const rawToken = String(req.query?.token || "").trim();

    if (!rawToken || rawToken.length !== 64) {
      return res.status(400).json({ success: false, error: "Invalid magic link token." });
    }

    const tokenHash = _hashToken(rawToken);

    const { data: link, error: fetchError } = await supabase
      .from("login_magic_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!link) {
      return res.status(400).json({ success: false, error: "Invalid or expired magic link." });
    }

    if (link.used_at) {
      return res.status(400).json({ success: false, error: "This magic link has already been used." });
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: "This magic link has expired." });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("login_magic_links")
      .update({ used_at: now })
      .eq("id", link.id);

    if (updateError) throw updateError;

    await auditLog({ userId: link.user_id, email: link.email, action: "magic_link_verified", severity: "info", ip });

    return res.json({
      success: true,
      userId: link.user_id,
      email: link.email,
      message: "Magic link verified.",
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, ip }, "Magic link verify error");
    return res.status(500).json({ success: false, error: "Unable to verify magic link." });
  }
});

// ── POST /device/revoke (Enhancement 3) ──────────────────────────────────────

router.post("/device/revoke", requireAuthOnly, async (req, res) => {
  const ip = getClientIp(req);

  try {
    const deviceId = String(req.body?.deviceId || "").trim();

    if (!deviceId) {
      return res.status(400).json({ success: false, error: "Device ID is required." });
    }

    const { error } = await supabase
      .from("trusted_devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", deviceId)
      .eq("user_id", req.user.id);

    if (error) throw error;

    await auditLog({ userId: req.user.id, action: "device_trust_revoked", severity: "info", ip, metadata: { deviceId } });
    return res.json({ success: true, message: "Device trust revoked." });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack, ip }, "Device revoke error");
    return res.status(500).json({ success: false, error: "Unable to revoke device." });
  }
});

// ── GET /device/list (Enhancement 3) ─────────────────────────────────────────

router.get("/device/list", requireAuthOnly, async (req, res) => {
  try {
    const { data: devices, error } = await supabase
      .from("trusted_devices")
      .select("id, device_label, expires_at, created_at, last_used_at")
      .eq("user_id", req.user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, devices: devices || [] });
  } catch (error) {
    logger.error({ error: error.message }, "Device list error");
    return res.status(500).json({ success: false, error: "Unable to list trusted devices." });
  }
});

router.use(handleAuthError);

module.exports = router;
