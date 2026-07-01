const express = require("express");
const { supabase } = require("../../config/supabase");
const { onDealStatusChanged } = require("./dealHooks");

const router = express.Router();

// ── Stages ────────────────────────────────────────────────────────────────────

router.get("/stages", async (req, res) => {
  const { data, error } = await supabase
    .from("crm_stages")
    .select("*")
    .eq("workspace_id", req.workspaceId)
    .order("position");
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, stages: data });
});

router.post("/stages", async (req, res) => {
  const { name, position, color, probability } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "name required" });
  const { data, error } = await supabase
    .from("crm_stages")
    .insert({ workspace_id: req.workspaceId, name, position: position ?? 0, color, probability })
    .select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.status(201).json({ success: true, stage: data });
});

// ── Opportunities (Deals) ─────────────────────────────────────────────────────

router.get("/deals", async (req, res) => {
  const { stageId, assignedTo, status, search } = req.query;
  let q = supabase
    .from("crm_opportunities")
    .select("*, crm_stages!stage_id(name,color,position), profiles!assigned_to(full_name)")
    .eq("workspace_id", req.workspaceId)
    .order("created_at", { ascending: false });

  if (stageId)    q = q.eq("stage_id", stageId);
  if (assignedTo) q = q.eq("assigned_to", assignedTo);
  if (status)     q = q.eq("status", status);
  if (search)     q = q.ilike("title", `%${search}%`);

  const { data, error } = await q;
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, deals: data });
});

router.post("/deals", async (req, res) => {
  const { title, value, stageId, assignedTo, contactEmail, contactName, contactId, expectedCloseDate, notes } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "title required" });

  const { data, error } = await supabase
    .from("crm_opportunities")
    .insert({
      workspace_id: req.workspaceId,
      title,
      value: value ?? 0,
      stage_id: stageId || null,
      assigned_to: assignedTo || null,
      contact_email: contactEmail || null,
      contact_name: contactName || null,
      contact_id: contactId || null,
      expected_close_date: expectedCloseDate || null,
      notes: notes || null,
      status: "open",
    })
    .select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.status(201).json({ success: true, deal: data });
});

router.patch("/deals/:id", async (req, res) => {
  const { title, value, stageId, assignedTo, status, contactEmail, contactName, notes, expectedCloseDate } = req.body;

  // Fetch current deal to detect status transition
  const { data: current, error: fetchErr } = await supabase
    .from("crm_opportunities")
    .select("*")
    .eq("id", req.params.id)
    .eq("workspace_id", req.workspaceId)
    .single();
  if (fetchErr) return res.status(404).json({ success: false, error: "Deal not found" });

  const updates = {};
  if (title !== undefined)             updates.title               = title;
  if (value !== undefined)             updates.value               = value;
  if (stageId !== undefined)           updates.stage_id            = stageId;
  if (assignedTo !== undefined)        updates.assigned_to         = assignedTo;
  if (status !== undefined)            updates.status              = status;
  if (contactEmail !== undefined)      updates.contact_email       = contactEmail;
  if (contactName !== undefined)       updates.contact_name        = contactName;
  if (notes !== undefined)             updates.notes               = notes;
  if (expectedCloseDate !== undefined) updates.expected_close_date = expectedCloseDate;

  const { data, error } = await supabase
    .from("crm_opportunities")
    .update(updates)
    .eq("id", req.params.id)
    .eq("workspace_id", req.workspaceId)
    .select().single();
  if (error) return res.status(500).json({ success: false, error: error.message });

  // Fire lifecycle hooks (non-blocking)
  if (status && status !== current.status) {
    onDealStatusChanged({ deal: data, previousStatus: current.status, workspaceId: req.workspaceId }).catch(() => {});
  }

  res.json({ success: true, deal: data });
});

router.delete("/deals/:id", async (req, res) => {
  const { error } = await supabase
    .from("crm_opportunities")
    .delete()
    .eq("id", req.params.id)
    .eq("workspace_id", req.workspaceId);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

// ── Pipeline summary ──────────────────────────────────────────────────────────

router.get("/pipeline", async (req, res) => {
  const { data: deals, error } = await supabase
    .from("crm_opportunities")
    .select("stage_id, status, value, crm_stages!stage_id(name,position,color)")
    .eq("workspace_id", req.workspaceId);
  if (error) return res.status(500).json({ success: false, error: error.message });

  // Group by stage
  const byStage = {};
  for (const d of deals) {
    const key = d.stage_id || "unassigned";
    if (!byStage[key]) byStage[key] = { stage_id: key, name: d.crm_stages?.name || "Unassigned", position: d.crm_stages?.position ?? 99, count: 0, value: 0 };
    byStage[key].count++;
    byStage[key].value += Number(d.value || 0);
  }

  const open   = deals.filter((d) => d.status === "open").length;
  const won    = deals.filter((d) => d.status === "closed_won").length;
  const lost   = deals.filter((d) => d.status === "closed_lost").length;
  const wonVal = deals.filter((d) => d.status === "closed_won").reduce((s, d) => s + Number(d.value || 0), 0);

  res.json({
    success: true,
    summary: { open, won, lost, won_value: wonVal, win_rate: deals.length ? Math.round((won / deals.length) * 100) : 0 },
    stages: Object.values(byStage).sort((a, b) => a.position - b.position),
  });
});

module.exports = router;
