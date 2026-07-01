const express = require("express");
const { safeError } = require('../utils/safeError');
const crypto = require("crypto");
const { supabase } = require("../config/supabase");
const logger = require("../config/logger");

const router = express.Router();

function buildExpectedToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(String(email).toLowerCase()).digest("hex").slice(0, 32);
}

async function recordUnsubscribe(email) {
  return supabase.from("email_unsubscribes").upsert(
    { email: String(email).toLowerCase(), unsubscribed_at: new Date().toISOString() },
    { onConflict: "email" }
  );
}

router.get("/unsubscribe", async (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) return res.status(400).send("Invalid unsubscribe link.");

  const expected = buildExpectedToken(email);
  if (!expected) {
    logger.error({ requestId: req.requestId }, "UNSUBSCRIBE_SECRET not configured");
    return res.status(500).send("Unsubscribe service unavailable.");
  }
  if (token !== expected) return res.status(403).send("Invalid or expired unsubscribe token.");

  try {
    await recordUnsubscribe(email);
    const safe = String(email).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>&#x2705; Unsubscribed</h2><p>${safe} has been removed from our mailing list.</p></body></html>`);
  } catch (err) {
    logger.error({ err: err.message, requestId: req.requestId }, "Unsubscribe GET failed");
    return res.status(500).send("Could not process unsubscribe. Please try again.");
  }
});

router.post("/unsubscribe", async (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) return res.status(400).json({ error: "Invalid" });

  const expected = buildExpectedToken(email);
  if (!expected) return res.status(500).json({ error: "Unsubscribe service unavailable" });
  if (token !== expected) return res.status(403).json({ error: "Invalid token" });

  try {
    await recordUnsubscribe(email);
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message, requestId: req.requestId }, "Unsubscribe POST failed");
    return res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;
