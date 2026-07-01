const express = require("express");
const logger = require("../../config/logger");
const { requireAuth } = require("../../middleware/auth");
const decisionEngine = require("../../services/intelligence/decisionEngine");
const realtimeHub = require("../../services/intelligence/realtimeHub");
const { supabase } = require("../../config/supabase");

const router = express.Router();

// Sub-routers — mounted here so they share the parent requireAuth and any
// future per-module middleware without needing a separate top-level mount.
router.use("/loop",    require("./loop"));
router.use("/ph",      require("./phModules"));
router.use("/reports", require("./reports"));

function canWrite(req) {
  return ["admin", "super_admin", "manager"].includes(String(req.workspaceRole || req.profile?.role || "").toLowerCase());
}

function requireWorkspace(req, res) {
  if (req.workspaceId) return true;
  res.status(400).json({ success: false, error: "workspace_id or x-workspace-id is required." });
  return false;
}

router.get("/modules", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const modules = await decisionEngine.listModules(req.workspaceId);
    res.json({ success: true, data: modules });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence modules list failed");
    next(err);
  }
});

router.post("/modules", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions to create intelligence modules." });

  try {
    const module = await decisionEngine.createModule(req.workspaceId, req.user.id, req.body);
    res.status(201).json({ success: true, data: module });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence module create failed");
    next(err);
  }
});

router.get("/data-sources", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const sources = await decisionEngine.listDataSources(req.workspaceId);
    res.json({ success: true, data: sources });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence data sources list failed");
    next(err);
  }
});

router.post("/data-sources", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions to create data sources." });

  try {
    if (!req.body.name || !req.body.type) {
      return res.status(400).json({ success: false, error: "name and type are required." });
    }
    const source = await decisionEngine.createDataSource(req.workspaceId, req.user.id, req.body);
    res.status(201).json({ success: true, data: source });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence data source create failed");
    next(err);
  }
});

router.post("/run", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const result = await decisionEngine.runDecisionEngine({
      workspaceId: req.workspaceId,
      moduleIdOrSlug: req.body.module_id || req.body.module || req.body.slug || "default",
      days: req.body.days || req.body.period_days || 30,
      persist: req.body.persist !== false,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence run failed");
    next(err);
  }
});

router.get("/insights", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const insights = await decisionEngine.listInsights(req.workspaceId, req.query.module_id, req.query.limit);
    res.json({ success: true, data: insights });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence insights list failed");
    next(err);
  }
});

router.post("/automations", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions to create automations." });

  try {
    if (!req.body.name || !req.body.rule) {
      return res.status(400).json({ success: false, error: "name and rule are required." });
    }
    const automation = await decisionEngine.createAutomation(req.workspaceId, req.user.id, req.body);
    res.status(201).json({ success: true, data: automation });
  } catch (err) {
    logger.error({ err, requestId: req.requestId, workspaceId: req.workspaceId }, "intelligence automation create failed");
    next(err);
  }
});

router.get("/stream", requireAuth, (req, res) => {
  if (!requireWorkspace(req, res)) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ workspace_id: req.workspaceId })}\n\n`);
  realtimeHub.addClient(req.workspaceId, res);
});

// ── Insight Actions ───────────────────────────────────────────────────────────
// POST /api/intelligence/insights/:id/action
router.post("/insights/:id/action", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { action, notes } = req.body;
    if (!action) return res.status(400).json({ success: false, error: "action is required." });

    const allowedActions = ["mark_reviewed", "create_task", "dismiss", "escalate", "mark_done"];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ success: false, error: "Invalid action." });
    }

    const { data: insight, error: fetchErr } = await supabase
      .from("intelligence_insights")
      .select("id, title, module, summary, workspace_id")
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .single();

    if (fetchErr || !insight) {
      return res.status(404).json({ success: false, error: "Insight not found." });
    }

    if (action === "mark_reviewed" || action === "mark_done" || action === "dismiss") {
      await supabase
        .from("intelligence_insights")
        .update({ status: action === "mark_done" ? "done" : action === "dismiss" ? "dismissed" : "reviewed", updated_at: new Date().toISOString() })
        .eq("id", insight.id);
    }

    if (action === "create_task") {
      await supabase.from("tasks").insert({
        workspace_id: req.workspaceId,
        title: `AI Insight: ${insight.title}`,
        description: insight.summary || notes || "",
        status: "todo",
        priority: "high",
        created_by: req.user.id,
        source: "intelligence",
        source_id: insight.id,
      });
    }

    res.json({ success: true, data: { insightId: req.params.id, action, done: true } });
  } catch (err) {
    logger.error({ err }, "intelligence insight action failed");
    next(err);
  }
});

// GET /api/intelligence/insights/timeline
router.get("/insights/timeline", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const { data, error } = await supabase
      .from("intelligence_insights")
      .select("id, title, severity, created_at, module, status")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err }, "intelligence insights timeline failed");
    next(err);
  }
});

// ── Alert Rules CRUD ─────────────────────────────────────────────────────────
// GET /api/intelligence/alert-rules
router.get("/alert-rules", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("intelligence_automations")
      .select("id, name, config, status, trigger_count, updated_at, created_at")
      .eq("workspace_id", req.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rules = (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      module: r.config?.module || "Intelligence",
      condition: r.config?.condition || r.config?.description || "Custom rule",
      status: r.status || "active",
      triggers: r.trigger_count || 0,
      config: r.config || {},
    }));

    res.json({ success: true, data: rules });
  } catch (err) {
    logger.error({ err }, "alert rules list failed");
    next(err);
  }
});

// POST /api/intelligence/alert-rules
router.post("/alert-rules", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions." });
  try {
    const { name, module: mod, metric, operator, threshold, severity, actions } = req.body;
    if (!name || !metric) return res.status(400).json({ success: false, error: "name and metric are required." });

    const config = {
      module: String(mod || "").slice(0, 60),
      metric: String(metric).slice(0, 100),
      operator: String(operator || ">").slice(0, 20),
      threshold: Number(threshold) || 0,
      severity: String(severity || "warning").slice(0, 20),
      condition: `${metric} ${operator || ">"} ${threshold}`,
      actions: Array.isArray(actions) ? actions.slice(0, 10) : ["send_alert"],
    };

    const { data, error } = await supabase.from("intelligence_automations").insert({
      workspace_id: req.workspaceId,
      created_by: req.user.id,
      name: String(name).slice(0, 120),
      rule: config,
      config,
      status: "active",
    }).select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "alert rule create failed");
    next(err);
  }
});

// PUT /api/intelligence/alert-rules/:id
router.put("/alert-rules/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions." });
  try {
    const { name, status, config } = req.body;
    const patch = {};
    if (name) patch.name = String(name).slice(0, 120);
    if (status) patch.status = String(status).slice(0, 20);
    if (config) patch.config = config;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("intelligence_automations")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "alert rule update failed");
    next(err);
  }
});

// DELETE /api/intelligence/alert-rules/:id
router.delete("/alert-rules/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  if (!canWrite(req)) return res.status(403).json({ success: false, error: "Insufficient permissions." });
  try {
    const { error } = await supabase
      .from("intelligence_automations")
      .delete()
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "alert rule delete failed");
    next(err);
  }
});

// ── KPI Dashboards ─────────────────────────────────────────────────────────
// GET /api/intelligence/kpi-dashboards
router.get("/kpi-dashboards", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { data, error } = await supabase
      .from("intelligence_modules")
      .select("id, name, slug, config, updated_at, created_by")
      .eq("workspace_id", req.workspaceId)
      .eq("type", "kpi_dashboard")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err }, "kpi dashboards list failed");
    next(err);
  }
});

// POST /api/intelligence/kpi-dashboards
router.post("/kpi-dashboards", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { name, widgets } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "name is required." });

    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
    const { data, error } = await supabase.from("intelligence_modules").insert({
      workspace_id: req.workspaceId,
      created_by: req.user.id,
      name: String(name).slice(0, 120),
      slug: `kpi_${slug}_${Date.now()}`,
      type: "kpi_dashboard",
      config: { widgets: Array.isArray(widgets) ? widgets : [] },
      status: "active",
    }).select().single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "kpi dashboard save failed");
    next(err);
  }
});

// PUT /api/intelligence/kpi-dashboards/:id
router.put("/kpi-dashboards/:id", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { name, widgets } = req.body;
    const patch = { updated_at: new Date().toISOString() };
    if (name) patch.name = String(name).slice(0, 120);
    if (widgets !== undefined) patch.config = { widgets };

    const { data, error } = await supabase
      .from("intelligence_modules")
      .update(patch)
      .eq("id", req.params.id)
      .eq("workspace_id", req.workspaceId)
      .select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "kpi dashboard update failed");
    next(err);
  }
});

// ── Data Export ───────────────────────────────────────────────────────────────
// POST /api/intelligence/export
router.post("/export", requireAuth, async (req, res, next) => {
  if (!requireWorkspace(req, res)) return;
  try {
    const { format = "json", modules = [], scope = "Full Report", dateRange = "Last 30 Days", includeAI = false } = req.body;

    const days = dateRange === "Last 7 Days" ? 7 : dateRange === "This Quarter" ? 90 : dateRange === "This Year" ? 365 : 30;
    const { aggregate } = require("../../services/intelligence/dataAggregator");

    const targetModules = (modules.length ? modules : ["crm", "finance", "hr", "marketing"])
      .map((m) => m.toLowerCase())
      .filter((m) => ["crm", "finance", "hr", "marketing", "executive", "facebook"].includes(m));

    const results = await Promise.allSettled(
      targetModules.map((mod) => aggregate(mod, req.workspaceId, days).then((data) => ({ mod, data })))
    );

    const exportPayload = {};
    for (const r of results) {
      if (r.status === "fulfilled") exportPayload[r.value.mod] = r.value.data;
    }

    const meta = { generated_at: new Date().toISOString(), workspace_id: req.workspaceId, scope, period_days: days, format };

    if (format === "json") {
      return res.json({ success: true, data: { ...exportPayload, _meta: meta } });
    }

    if (format === "csv") {
      const rows = [];
      rows.push(["module", "metric", "value"]);
      for (const [mod, data] of Object.entries(exportPayload)) {
        const metrics = data?.metrics || {};
        for (const [key, val] of Object.entries(metrics)) {
          rows.push([mod, key, val]);
        }
      }
      const csv = rows.map((r) => r.map(String).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="intelligence_export_${Date.now()}.csv"`);
      return res.send(csv);
    }

    // Default: return JSON with export record saved
    const { data: saved } = await supabase.from("intelligence_reports").insert({
      workspace_id: req.workspaceId,
      name: `Export — ${scope} — ${new Date().toLocaleDateString()}`,
      type: "export",
      format: format.toUpperCase(),
      config: { modules: targetModules, scope, days, includeAI },
      data: exportPayload,
      generated_by: req.user.id,
      status: "completed",
    }).select("id, name, created_at").single();

    res.json({ success: true, data: { ...exportPayload, _meta: meta, reportId: saved?.id } });
  } catch (err) {
    logger.error({ err }, "intelligence export failed");
    next(err);
  }
});

module.exports = router;
