/**
 * Intelligence Reports API — Production-grade
 * Routes: /api/intelligence/reports
 *
 * Features:
 *  - CRUD for report definitions
 *  - Real-time data aggregation across all ERP modules
 *  - AI summary generation (Groq via existing openClaude service)
 *  - Report runs with status tracking
 *  - Scheduling (cron expressions stored in DB, polled by scheduler)
 *  - Excel / CSV export (streamed)
 *  - RBAC: Admin/Manager can create; Viewer can read
 *  - Audit logging
 */

const express = require("express");
const { safeError } = require('../../utils/safeError');
const router = express.Router();
const { supabase } = require("../../config/supabase");
const { requireAuth } = require("../../middleware/auth");
const logger = require("../../config/logger");
const { aggregate } = require("../../services/intelligence/dataAggregator");
const { callOpenClaude } = require("../services/openClaude");

// ── RBAC helpers ─────────────────────────────────────────────────────────────

function canWrite(req) {
  const role = (req.profile?.role || "").toLowerCase();
  return ["admin", "super_admin", "manager"].includes(role);
}

function forbiddenWrite(res) {
  return res.status(403).json({ success: false, error: "Insufficient permissions to modify reports." });
}

// ── AI summary ───────────────────────────────────────────────────────────────

async function generateAISummary(aggregatedData, reportType) {
  const typeLabels = {
    executive: "executive leadership board",
    crm:       "sales and CRM team",
    finance:   "finance and accounting team",
    hr:        "HR department",
    marketing: "marketing team",
  };

  const audience = typeLabels[reportType] || "management team";
  const dataStr = JSON.stringify(aggregatedData, null, 2);

  const messages = [
    {
      role: "system",
      content: `You are an enterprise business intelligence analyst. Generate a concise, professional report summary for the ${audience}.
Format your response as JSON with this exact shape:
{
  "executive_summary": "2-3 sentence overview",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "health_score": 75
}
health_score is 0-100 reflecting overall business health based on the data.
Be specific, use the actual numbers from the data provided. Keep each bullet under 20 words.`,
    },
    {
      role: "user",
      content: `Generate a business intelligence summary for this ${reportType} data:\n${dataStr}`,
    },
  ];

  try {
    const result = await callOpenClaude({
      messages,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      options: { maxTokens: 800, temperature: 0.3 },
    });

    const raw = result?.content?.[0]?.text || result?.reply || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { executive_summary: raw, highlights: [], risks: [], recommendations: [], health_score: 50 };
  } catch (err) {
    logger.warn({ err }, "[IntelReports] AI summary failed — returning fallback");
    return {
      executive_summary: "AI summary temporarily unavailable. Report data is complete.",
      highlights: [],
      risks: [],
      recommendations: [],
      health_score: null,
    };
  }
}

// ── audit log helper ─────────────────────────────────────────────────────────

async function auditLog(userId, action, resourceId, metadata = {}) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: "intelligence_report",
      resource_id: resourceId,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    // Non-critical — never block the main request
  }
}

// ── GET /api/intelligence/reports ───────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const { type, workspace_id, limit = 50 } = req.query;

    let query = supabase
      .from("saved_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (type)         query = query.eq("report_type", type);
    if (workspace_id) query = query.eq("workspace_id", workspace_id);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error({ err }, "[IntelReports] GET / failed");
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── POST /api/intelligence/reports — create definition ──────────────────────

router.post("/", requireAuth, async (req, res) => {
  if (!canWrite(req)) return forbiddenWrite(res);

  try {
    const {
      name,
      description,
      report_type = "executive",
      module,
      filters = {},
      schedule,
      is_public = false,
      workspace_id,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "name is required" });

    const payload = {
      name,
      description,
      report_type: report_type || module?.toLowerCase() || "executive",
      filters,
      schedule: schedule || null,
      created_by: req.user.id,
      is_public,
      workspace_id: workspace_id || req.workspaceId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("saved_reports")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await auditLog(req.user.id, "create", data.id, { name });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "[IntelReports] POST / failed");
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET /api/intelligence/reports/templates — built-in templates ─────────────

router.get("/templates", requireAuth, async (req, res) => {
  const templates = [
    {
      id: "tpl_executive",
      name: "Executive Summary Report",
      description: "Full company health across all modules with AI-generated insights.",
      module: "executive",
      report_type: "executive",
      schedule_options: ["Daily", "Weekly", "Monthly"],
      formats: ["PDF", "Excel", "CSV"],
      tags: ["Executive", "Board", "KPI"],
      estimated_time: "~15s",
    },
    {
      id: "tpl_crm",
      name: "Sales Pipeline Report",
      description: "Pipeline health, deal stages, win rates, and conversion metrics.",
      module: "crm",
      report_type: "crm",
      schedule_options: ["Daily", "Weekly"],
      formats: ["Excel", "CSV", "PDF"],
      tags: ["CRM", "Sales", "Pipeline"],
      estimated_time: "~8s",
    },
    {
      id: "tpl_finance",
      name: "Financial Performance Report",
      description: "Revenue breakdown, invoice collection, and cash flow overview.",
      module: "finance",
      report_type: "finance",
      schedule_options: ["Weekly", "Monthly"],
      formats: ["PDF", "Excel"],
      tags: ["Finance", "Revenue", "CFO"],
      estimated_time: "~10s",
    },
    {
      id: "tpl_hr",
      name: "HR & Workforce Report",
      description: "Headcount, attendance rates, task completion, and productivity.",
      module: "hr",
      report_type: "hr",
      schedule_options: ["Weekly", "Monthly"],
      formats: ["Excel", "PDF"],
      tags: ["HR", "Attendance", "Workforce"],
      estimated_time: "~8s",
    },
    {
      id: "tpl_marketing",
      name: "Marketing Performance Report",
      description: "Campaign metrics, email open/click rates, and lead funnel analysis.",
      module: "marketing",
      report_type: "marketing",
      schedule_options: ["Weekly", "Monthly"],
      formats: ["PDF", "CSV"],
      tags: ["Marketing", "Campaigns", "Leads"],
      estimated_time: "~8s",
    },
    {
      id: "tpl_ai",
      name: "AI Intelligence Digest",
      description: "AI-generated business insights, anomalies, risks, and recommendations.",
      module: "executive",
      report_type: "ai",
      schedule_options: ["Weekly"],
      formats: ["PDF"],
      tags: ["AI", "Insights", "Intelligence"],
      estimated_time: "~20s",
    },
  ];

  return res.json({ success: true, data: templates });
});

// ── POST /api/intelligence/reports/generate — on-demand generation ───────────

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const {
      module = "executive",
      report_type,
      days = 30,
      workspace_id,
      include_ai = true,
      name,
      save = false,
    } = req.body;

    const resolvedModule = (report_type || module || "executive").toLowerCase();
    const resolvedDays = Math.min(Math.max(Number(days) || 30, 7), 365);

    logger.info({ module: resolvedModule, days: resolvedDays }, "[IntelReports] Generating report");

    // 1. Aggregate data from all relevant modules
    const aggregated = await aggregate(resolvedModule, workspace_id || req.workspaceId, resolvedDays);

    // 2. AI summary (optional, non-blocking)
    let aiSummary = null;
    if (include_ai !== false && include_ai !== "false") {
      aiSummary = await generateAISummary(aggregated, resolvedModule);
    }

    const reportData = {
      module: resolvedModule,
      period_days: resolvedDays,
      generated_at: new Date().toISOString(),
      generated_by: req.user?.email || req.user?.id,
      data: aggregated,
      ai_summary: aiSummary,
    };

    // 3. Optionally persist the run
    if (save) {
      const reportName = name || `${resolvedModule} Report — ${new Date().toLocaleDateString()}`;

      const { data: saved } = await supabase
        .from("saved_reports")
        .insert({
          name: reportName,
          report_type: resolvedModule,
          created_by: req.user.id,
          workspace_id: workspace_id || req.workspaceId || null,
          filters: { days: resolvedDays },
          last_run_at: new Date().toISOString(),
          last_run_result: reportData,
          is_public: false,
        })
        .select()
        .single();

      if (saved) reportData.report_id = saved.id;
      await auditLog(req.user.id, "generate", saved?.id || "unsaved", { module: resolvedModule });
    }

    return res.json({ success: true, data: reportData });
  } catch (err) {
    logger.error({ err }, "[IntelReports] POST /generate failed");
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET /api/intelligence/reports/:id ──────────────────────────────────────

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("saved_reports")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Report not found" });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── POST /api/intelligence/reports/:id/run — re-run a saved report ──────────

router.post("/:id/run", requireAuth, async (req, res) => {
  try {
    const { data: report, error } = await supabase
      .from("saved_reports")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !report) return res.status(404).json({ success: false, error: "Report not found" });

    const days = report.filters?.days || 30;
    const aggregated = await aggregate(report.report_type, report.workspace_id, days);
    const aiSummary = await generateAISummary(aggregated, report.report_type);

    const runResult = {
      module: report.report_type,
      period_days: days,
      generated_at: new Date().toISOString(),
      data: aggregated,
      ai_summary: aiSummary,
    };

    await supabase
      .from("saved_reports")
      .update({ last_run_at: new Date().toISOString(), last_run_result: runResult })
      .eq("id", req.params.id);

    await auditLog(req.user.id, "run", req.params.id, { report_type: report.report_type });

    return res.json({ success: true, data: runResult });
  } catch (err) {
    logger.error({ err }, "[IntelReports] POST /:id/run failed");
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── POST /api/intelligence/reports/:id/schedule ────────────────────────────

router.post("/:id/schedule", requireAuth, async (req, res) => {
  if (!canWrite(req)) return forbiddenWrite(res);

  try {
    const { frequency, time, recipients = [], webhook_url } = req.body;

    const CRON_MAP = {
      Daily:     "0 8 * * *",
      Weekly:    "0 8 * * 1",
      Monthly:   "0 8 1 * *",
      Quarterly: "0 8 1 1,4,7,10 *",
    };

    const schedule = {
      frequency,
      cron: CRON_MAP[frequency] || "0 8 * * 1",
      time: time || "08:00",
      recipients,
      webhook_url: webhook_url || null,
      enabled: true,
      next_run: getNextRun(frequency),
    };

    const { data, error } = await supabase
      .from("saved_reports")
      .update({ schedule, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    await auditLog(req.user.id, "schedule", req.params.id, schedule);

    return res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "[IntelReports] POST /:id/schedule failed");
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

function getNextRun(frequency) {
  const d = new Date();
  if (frequency === "Daily")     d.setDate(d.getDate() + 1);
  if (frequency === "Weekly")    d.setDate(d.getDate() + 7);
  if (frequency === "Monthly")   d.setMonth(d.getMonth() + 1);
  if (frequency === "Quarterly") d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

// ── GET /api/intelligence/reports/:id/export — CSV data export ──────────────
// (PDF is generated client-side with jsPDF; server provides structured data)

router.get("/:id/export", requireAuth, async (req, res) => {
  try {
    const { format = "json" } = req.query;

    const { data: report } = await supabase
      .from("saved_reports")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (!report) return res.status(404).json({ success: false, error: "Report not found" });

    const result = report.last_run_result || {};

    if (format === "csv") {
      const metrics = result.data?.metrics || {};
      const rows = [
        ["Metric", "Value"],
        ...Object.entries(metrics).map(([k, v]) => [k.replace(/_/g, " "), v]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${report.name}.csv"`);
      return res.send(csv);
    }

    await auditLog(req.user.id, "export", req.params.id, { format });

    return res.json({ success: true, data: { report, result } });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── DELETE /api/intelligence/reports/:id ───────────────────────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  if (!canWrite(req)) return forbiddenWrite(res);

  try {
    const { error } = await supabase.from("saved_reports").delete().eq("id", req.params.id);
    if (error) throw error;
    await auditLog(req.user.id, "delete", req.params.id, {});
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ── GET /api/intelligence/reports/stats/overview ─────────────────────────────

router.get("/stats/overview", requireAuth, async (req, res) => {
  try {
    const { data: reports } = await supabase
      .from("saved_reports")
      .select("id,report_type,schedule,last_run_at,created_at");

    const all = reports || [];
    const scheduled = all.filter((r) => r.schedule?.enabled);

    return res.json({
      success: true,
      data: {
        total_reports: all.length,
        scheduled_reports: scheduled.length,
        types: all.reduce((acc, r) => {
          acc[r.report_type] = (acc[r.report_type] || 0) + 1;
          return acc;
        }, {}),
        last_generated: all
          .filter((r) => r.last_run_at)
          .sort((a, b) => new Date(b.last_run_at) - new Date(a.last_run_at))[0]?.last_run_at || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
