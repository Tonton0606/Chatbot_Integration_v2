/**
 * PayMongo Service — PH payment gateway
 * Supports: GCash, Maya, Credit/Debit Card, COD (Cash on Delivery)
 * Docs: https://developers.paymongo.com
 *
 * Graceful standby: all functions check isConfigured() first.
 * COD tracking works without a PayMongo key.
 */

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function isConfigured() {
  return !!process.env.PAYMONGO_SECRET_KEY;
}

function getAuth() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_NOT_CONFIGURED");
  return Buffer.from(`${key}:`).toString("base64");
}

async function pmFetch(path, options = {}) {
  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail || `PayMongo error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// ── Payment Links (GCash, Maya, Card via checkout) ────────────────────────────

async function createPaymentLink({ amount, description, remarks }) {
  if (!isConfigured()) throw new Error("PAYMONGO_NOT_CONFIGURED");
  if (!amount || amount < 100) throw new Error("amount must be ≥ ₱1 (100 centavos)");

  const data = await pmFetch("/links", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(amount),
          description: description || "Hermes Payment",
          remarks: remarks || "",
        },
      },
    }),
  });

  const a = data.data.attributes;
  return {
    id: data.data.id,
    checkout_url: a.checkout_url,
    reference_number: a.reference_number,
    status: a.status,
    amount: a.amount,
    currency: a.currency,
    description: a.description,
  };
}

async function getPaymentLink(linkId) {
  if (!isConfigured()) throw new Error("PAYMONGO_NOT_CONFIGURED");
  const data = await pmFetch(`/links/${linkId}`);
  const a = data.data.attributes;
  return {
    id: data.data.id,
    checkout_url: a.checkout_url,
    reference_number: a.reference_number,
    status: a.status,
    amount: a.amount,
    currency: a.currency,
    payments: a.payments || [],
  };
}

// ── GCash / Maya Payment Intents ──────────────────────────────────────────────

async function createEWalletPayment({ amount, type, currency = "PHP", description }) {
  if (!isConfigured()) throw new Error("PAYMONGO_NOT_CONFIGURED");
  if (!["gcash", "paymaya"].includes(type)) throw new Error("type must be gcash or paymaya");

  const intent = await pmFetch("/payment_intents", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(amount),
          payment_method_allowed: [type],
          payment_method_options: { card: { request_three_d_secure: "any" } },
          currency,
          description: description || "Hermes Payment",
          capture_type: "automatic",
        },
      },
    }),
  });

  const method = await pmFetch("/payment_methods", {
    method: "POST",
    body: JSON.stringify({ data: { attributes: { type } } }),
  });

  const attached = await pmFetch(`/payment_intents/${intent.data.id}/attach`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: method.data.id,
          return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/Client/Payments?status=success`,
        },
      },
    }),
  });

  const a = attached.data.attributes;
  return {
    payment_intent_id: attached.data.id,
    status: a.status,
    redirect_url: a.next_action?.redirect?.url || null,
    amount: a.amount,
    currency: a.currency,
  };
}

// ── Webhook signature verification ───────────────────────────────────────────

function verifyWebhookSignature(header, rawBody) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return true; // skip when not set
  const crypto = require("crypto");
  const parts = {};
  header.split(",").forEach((p) => {
    const [k, v] = p.split("=");
    parts[k] = v;
  });
  const payload = `${parts.t}.${rawBody.toString()}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return parts.te === expected || parts.li === expected;
}

// ── COD status labels (no PayMongo key needed) ────────────────────────────────

function codStatusLabel(status) {
  const map = {
    pending:    "Pending Confirmation",
    confirmed:  "Order Confirmed",
    packed:     "Packed",
    picked_up:  "Picked Up by Rider",
    in_transit: "In Transit",
    delivered:  "Delivered",
    failed:     "Delivery Failed",
    returned:   "Returned",
  };
  return map[status] || status;
}

module.exports = {
  isConfigured,
  createPaymentLink,
  getPaymentLink,
  createEWalletPayment,
  verifyWebhookSignature,
  codStatusLabel,
};
