/**
 * Delivery Tracker Route — /api/delivery
 * Tracks shipments: packed → picked_up → in_transit → delivered
 * Supports local couriers: LBC, JRS, J&T, Lalamove, Grab Express, Moto-rider, Own Delivery
 */

const express = require("express");
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { supabase } = require("../config/supabase");

const DELIVERY_STATUSES = ["pending","packed","picked_up","in_transit","out_for_delivery","delivered","failed","returned"];

const COURIERS = ["LBC","JRS Express","J&T Express","Lalamove","Grab Express","Moto-rider","Own Delivery","2GO","Flash Express","Ninja Van","Other"];

// req.workspaceId is set by requireAuth from the validated x-workspace-id header.
function getWorkspaceId(req) {
  return req.workspaceId || null;
}

// Fetch a delivery and assert it belongs to the requester's workspace.
async function fetchOwnedDelivery(req, res) {
  const workspace_id = getWorkspaceId(req);
  if (!workspace_id) {
    res.status(400).json({ success: false, error: "Workspace context is required." });
    return null;
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", req.params.id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return null;
  }

  if (!data) {
    res.status(404).json({ success: false, error: "Delivery not found." });
    return null;
  }

  return data;
}

// ── Create shipment ───────────────────────────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const {
      order_id,
      customer_name,
      customer_address,
      courier,
      tracking_number,
      items,
      notes,
      estimated_delivery,
      payment_id,
    } = req.body;

    const { data, error } = await supabase
      .from("deliveries")
      .insert({
        workspace_id,
        order_id: order_id || null,
        payment_id: payment_id || null,
        customer_name,
        customer_address,
        courier: courier || "Other",
        tracking_number: tracking_number || null,
        items: items || [],
        notes: notes || null,
        estimated_delivery: estimated_delivery || null,
        status: "pending",
        created_by: req.user?.id,
        timeline: [{ status: "pending", timestamp: new Date().toISOString(), note: "Shipment created" }],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, delivery: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── List shipments ────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const workspace_id = getWorkspaceId(req);
    if (!workspace_id) return res.status(400).json({ success: false, error: "Workspace context is required." });

    const { status, courier, search, limit = 50, offset = 0 } = req.query;

    let q = supabase
      .from("deliveries")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) q = q.eq("status", status);
    if (courier) q = q.eq("courier", courier);
    if (search) q = q.ilike("customer_name", `%${search}%`);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    res.json({ success: true, deliveries: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Get single shipment ───────────────────────────────────────────────────────

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const delivery = await fetchOwnedDelivery(req, res);
    if (!delivery) return;
    res.json({ success: true, delivery });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Update status ─────────────────────────────────────────────────────────────

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedDelivery(req, res);
    if (!existing) return;

    const { status, note, tracking_number } = req.body;
    if (!DELIVERY_STATUSES.includes(status))
      return res.status(400).json({ success: false, error: `status must be one of: ${DELIVERY_STATUSES.join(", ")}` });

    const timeline = [...(existing.timeline || []), {
      status,
      timestamp: new Date().toISOString(),
      note: note || null,
      updated_by: req.user?.id,
    }];

    const updates = {
      status,
      timeline,
      updated_at: new Date().toISOString(),
    };
    if (tracking_number) updates.tracking_number = tracking_number;
    if (status === "delivered") updates.delivered_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("deliveries")
      .update(updates)
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, delivery: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Update tracking info ──────────────────────────────────────────────────────

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedDelivery(req, res);
    if (!existing) return;

    const allowed = ["tracking_number", "courier", "estimated_delivery", "notes", "customer_address"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("deliveries")
      .update(updates)
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, delivery: data });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await fetchOwnedDelivery(req, res);
    if (!existing) return;

    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", req.params.id)
      .eq("workspace_id", existing.workspace_id);

    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── Meta ──────────────────────────────────────────────────────────────────────

router.get("/meta/options", requireAuth, (req, res) => {
  res.json({ statuses: DELIVERY_STATUSES, couriers: COURIERS });
});

module.exports = router;
