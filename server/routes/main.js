const express = require("express");
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { supabase } = require("../config/supabase");
const { sendEmail } = require("../services/emailService");

router.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

// Per-lead email send used by EmailCampaign.jsx batch sender
router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, body, from_name, campaign_id, email_type } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "to, subject, and body are required" });
    }
    await sendEmail({
      to,
      subject,
      html: email_type === "html" ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`,
      text: email_type === "html" ? undefined : body,
      from: from_name ? `${from_name} <noreply@exponify.ph>` : undefined,
      isMarketing: true,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;
