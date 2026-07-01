/**
 * Central API router — mounts all domain routes under /api/v1.
 * Keep route registration here; keep business logic in domain services.
 */
const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("./middleware/auth");
const { requireWorkspace } = require("./middleware/tenantScope");
const { auth: authLimiter, ai: aiLimiter, facebook: facebookLimiter, email: emailLimiter, publicForm: publicFormLimiter } = require("./middleware/rateLimiters");
const { securityMiddleware } = require("./middleware/security");
const logger = require("./config/logger");

const router = express.Router();

// ── Request ID ────────────────────────────────────────────────────────────────
// Normally set at the app level (server.js); this is an idempotent fallback so
// the router still works if mounted standalone (e.g. in tests). Reuse any id
// already assigned rather than minting a second one.
router.use((req, res, next) => {
  const id = req.requestId || req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
});

// ── Core ─────────────────────────────────────────────────────────────────────
router.use("/", require("./routes/main"));
// securityMiddleware: IP block check, honeypot detection, suspicious-agent detection.
// Applied before rate limiting so bots are blocked before consuming rate-limit buckets.
router.use("/auth", securityMiddleware, authLimiter, require("./routes/auth"));

// ── Scheduling & Bookings ─────────────────────────────────────────────────────
router.use("/zoom", requireAuth, emailLimiter, require("./routes/zoom"));
router.use("/client-bookings", requireAuth, require("./routes/clientBookings"));

// ── Landing & Public ──────────────────────────────────────────────────────────
router.use("/landing/domains", require("./routes/landing/domains"));
router.use("/landing/public/domains", require("./routes/landing/domains"));
// Public lead/booking capture: anonymous input, so guard with the same bot
// detection (honeypot, IP block, attack-tool signatures) used on /auth, plus a
// tight per-IP submission limiter. Domain lookups above stay unthrottled.
router.use("/landing/public", securityMiddleware, publicFormLimiter, require("./routes/landing/publicSubmit"));
router.use("/landing/public", securityMiddleware, publicFormLimiter, require("./routes/landing/publicBooking"));

// ── Workspace ─────────────────────────────────────────────────────────────────
router.use("/workspace-integrations", require("./routes/workspaceIntegrations"));

// ── Storage / File Upload ─────────────────────────────────────────────────────
router.use("/storage", requireAuth, require("./routes/storage"));

// ── Tasks ────────────────────────────────────────────────────────────────────
// requireWorkspace fail-closes tenant-owned legacy tables (no silent global reads).
router.use("/tasks", requireAuth, requireWorkspace, require("./routes/tasks"));

// ── Finance ──────────────────────────────────────────────────────────────────
router.use("/invoicing",    requireAuth, require("./routes/invoicing"));
router.use("/accounting",   requireAuth, require("./routes/accounting"));
router.use("/finance",      requireAuth, require("./routes/finance"));
router.use("/revenue",      requireAuth, requireWorkspace, require("./routes/revenue"));
router.use("/fixed-assets", requireAuth, require("./routes/fixedAssets"));

// ── PH Tax Compliance ─────────────────────────────────────────────────────────
router.use("/bir",         requireAuth, require("./routes/bir"));
router.use("/payroll-tax", requireAuth, require("./routes/payrollTax"));

// ── Analytics & Reporting ────────────────────────────────────────────────────
router.use("/analytics",    requireAuth, requireWorkspace, require("./routes/analytics"));
router.use("/reports",      requireAuth, requireWorkspace, require("./routes/reports"));
router.use("/knowledge-base", requireAuth, require("./routes/knowledge-base"));
router.use("/audit-logs",   requireAuth, requireWorkspace, require("./routes/audit-logs"));

// ── Intelligence ─────────────────────────────────────────────────────────────
// /reports is mounted inside the intelligence router — no separate top-level mount needed.
router.use("/intelligence", requireAuth, require("./routes/intelligence"));

// ── Marketing ────────────────────────────────────────────────────────────────
const googleMapsLeadsRoutes = require("./routes/googleMapsLeads");
router.get("/marketing/google-maps-leads/health", googleMapsLeadsRoutes.healthHandler);
router.use("/marketing/google-maps-leads", requireAuth, googleMapsLeadsRoutes);
router.use("/campaigns",    requireAuth, require("./routes/campaigns"));
router.use("/workflows",    requireAuth, require("./routes/workflows"));
const { socialMediaAdsRoutes, socialMediaAdsAiRoutes } = require("./routes/socialMediaAds");
router.use("/social-media-ads/ai-suggestion", requireAuth, aiLimiter, socialMediaAdsAiRoutes);
router.use("/social-media-ads", requireAuth, socialMediaAdsRoutes);

// ── CRM ──────────────────────────────────────────────────────────────────────
router.use("/crm", requireAuth, require("./domains/crm/routes"));

// ── Sales Commissions ────────────────────────────────────────────────────────
router.use("/commissions", requireAuth, require("./domains/commissions/routes"));

// ── Unified Leads ────────────────────────────────────────────────────────────
router.use("/leads", requireAuth, require("./domains/leads/routes"));

// ── Subscriptions ─────────────────────────────────────────────────────────────
// Stripe webhook must be mounted BEFORE requireAuth — Stripe sends requests
// without a Bearer token. Signature verification is handled inside the route.
router.use("/subscriptions/webhook", require("./routes/subscription"));
router.use("/subscriptions", requireAuth, require("./routes/subscription"));

// ── AI & Security Services ───────────────────────────────────────────────────
// Landing chatbot must be PUBLIC — it is called from the marketing landing page
// by anonymous visitors. Mount the single handler before the protected /ai router.
router.post("/ai/landing-chat/ask", aiLimiter, require("./routes/services/ai").handleLandingChat);
router.use("/ai",         requireAuth, aiLimiter,       require("./routes/services/ai"));
router.use("/security",   requireAuth,                  require("./routes/services/security"));
router.use("/openclaude", requireAuth, aiLimiter,       require("./routes/services/openClaude"));

// ── Integrations (public webhooks — authenticated by signature) ───────────────
router.use("/webhooks/facebook", facebookLimiter, require("./routes/integrations/facebook"));
router.use("/webhooks/omnichannel", facebookLimiter, require("./routes/integrations/omnichannel"));

// ── Omni-Channel Inbox (auth + workspace scoped) ─────────────────────────────
router.use("/omnichannel", requireAuth, requireWorkspace, require("./routes/omnichannel"));

// ── Payments ─────────────────────────────────────────────────────────────────
router.use("/payments", require("./routes/payments"));

// ── Operations ───────────────────────────────────────────────────────────────
// requireAuth is applied at the router level here so even future routes added
// inside these files can't accidentally become public.
router.use("/delivery",      requireAuth, require("./routes/delivery"));
router.use("/inventory",     requireAuth, require("./routes/inventory"));
router.use("/kpi",           requireAuth, require("./routes/kpi"));
router.use("/notifications", requireAuth, require("./routes/notifications"));

// ── Email Unsubscribe ─────────────────────────────────────────────────────────
router.use("/email", require("./routes/emailUnsubscribe"));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

module.exports = router;
