/**
 * Payments Route — /api/payments
 * Table: client_payments
 *
 * PayMongo-dependent routes (links, ewallet) return 503 when key is missing.
 * COD tracking works without a PayMongo account.
 */

const express = require("express");
const { safeError } = require('../utils/safeError');
const router = express.Router();
const logger = require("../config/logger");
const { requireAuth, getWorkspaceId } = require("../middleware/auth");
const {
  isConfigured,
  createPaymentLink,
  getPaymentLink,
  createEWalletPayment,
  verifyWebhookSignature,
  codStatusLabel,
} = require("../services/payMongo");
const { supabase } = require("../config/supabase");

const TABLE = "client_payments";

// Use the canonical, membership-validated workspace id set by requireAuth.
// (Previously this read raw headers/body/query — attacker-controlled and an
// IDOR risk across tenants.)

// Middleware: reject PayMongo-dependent calls when key is absent
function requirePayMongo(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({
      error: "PayMongo not configured",
      hint: "Add PAYMONGO_SECRET_KEY to server/.env to enable GCash, Maya, and card payments.",
      configured: false,
    });
  }
  next();
}

// ── Health / config check (no auth needed) ────────────────────────────────────

router.get("/health", (req, res) => {
  res.json({
    configured: isConfigured(),
    cod_available: true,
    env: process.env.NODE_ENV || "development",
  });
});

// ── Payment Links ─────────────────────────────────────────────────────────────

router.post("/links", requireAuth, requirePayMongo, async (req, res) => {
  try {
    const { amount, description, remarks, customer_name, customer_email, customer_phone } = req.body;
    if (!amount) return res.status(400).json({ error: "amount is required (in centavos)" });

    const workspace_id = getWorkspaceId(req);
    const link = await createPaymentLink({ amount, description, remarks });

    const { data, error } = await supabase.from(TABLE).insert({
      workspace_id,
      payment_type: "link",
      paymongo_id: link.id,
      reference_no: link.reference_number,
      amount: link.amount,
      description: link.description,
      status: link.status,
      checkout_url: link.checkout_url,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      remarks: remarks || null,
    }).select().single();

    if (error) logger.error({ err: error, requestId: req.requestId }, "payments DB insert error");

    res.json({ success: true, payment: { ...link, id: data?.id || link.id } });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.get("/links/:linkId", requireAuth, requirePayMongo, async (req, res) => {
  try {
    const link = await getPaymentLink(req.params.linkId);

    await supabase
      .from(TABLE)
      .update({ status: link.status, updated_at: new Date().toISOString() })
      .eq("paymongo_id", req.params.linkId);

    res.json({ success: true, payment: link });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ── GCash / Maya ──────────────────────────────────────────────────────────────

router.post("/ewallet", requireAuth, requirePayMongo, async (req, res) => {
  try {
    const { amount, type, description, customer_name, customer_email, customer_phone } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });
    if (!["gcash", "paymaya"].includes(type))
      return res.status(400).json({ error: "type must be gcash or paymaya" });

    const workspace_id = getWorkspaceId(req);
    const result = await createEWalletPayment({ amount, type, description });

    const { data } = await supabase.from(TABLE).insert({
      workspace_id,
      payment_type: type,
      paymongo_id: result.payment_intent_id,
      amount: result.amount,
      description,
      status: result.status,
      checkout_url: result.redirect_url || null,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
    }).select().single();

    res.json({ success: true, payment: { ...result, id: data?.id } });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ── COD (works without PayMongo key) ─────────────────────────────────────────

router.post("/cod", requireAuth, async (req, res) => {
  try {
    const { amount, description, customer_name, customer_email, customer_phone, remarks } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const workspace_id = getWorkspaceId(req);

    const { data, error } = await supabase.from(TABLE).insert({
      workspace_id,
      payment_type: "cod",
      amount: Math.round(amount),
      description: description || "Cash on Delivery",
      status: "pending",
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      remarks: remarks || null,
    }).select().single();

    if (error) throw new Error(error.message);
    res.json({ success: true, payment: { ...data, status_label: codStatusLabel(data.status) } });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

router.patch("/cod/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ["pending","confirmed","packed","picked_up","in_transit","delivered","failed","returned"];
    if (!VALID.includes(status)) return res.status(400).json({ error: "invalid status" });

    const { data, error } = await supabase
      .from(TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select().single();

    if (error) throw new Error(error.message);
    res.json({ success: true, payment: { ...data, status_label: codStatusLabel(status) } });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ── List payments ─────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    const { payment_type, status, limit = 50, offset = 0 } = req.query;

    let q = supabase
      .from(TABLE)
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (payment_type) q = q.eq("payment_type", payment_type);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    res.json({
      success: true,
      configured: isConfigured(),
      payments: (data || []).map((p) => ({
        ...p,
        status_label: codStatusLabel(p.status),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

// ── PayMongo Webhook ──────────────────────────────────────────────────────────

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // Reject missing OR invalid signatures. A falsy `sig` must never skip
    // verification — that would allow forged payment-confirmation webhooks.
    const sig = req.headers["paymongo-signature"];
    if (!sig || !verifyWebhookSignature(sig, req.body)) {
      return res.status(401).json({ error: "invalid signature" });
    }

    const event = JSON.parse(req.body.toString());
    const type = event?.data?.attributes?.type;
    const resource = event?.data?.attributes?.data;

    if (type === "payment.paid") {
      const linkId = resource?.attributes?.source?.id;
      if (linkId) {
        await supabase
          .from(TABLE)
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("paymongo_id", linkId);
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;
