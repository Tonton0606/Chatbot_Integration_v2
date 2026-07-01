const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

// Sentry must init before any other require
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "2.2.1",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

const logger = require("./config/logger");
const { supabase } = require("./config/supabase");

// ── Env validation ────────────────────────────────────────────────────────────
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PORT"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`[startup] Missing required env vars: ${missing.join(", ")}`);
  logger.error("[startup] Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

const OPTIONAL_WARN = ["GROQ_API_KEY", "CEREBRAS_API_KEY_FB", "SMTP_USER", "FB_PAGE_ACCESS_TOKEN", "REDIS_URL", "SENTRY_DSN", "SUPABASE_ANON_KEY"];
const missingOptional = OPTIONAL_WARN.filter((k) => !process.env[k]);
if (missingOptional.length) {
  logger.warn(`[startup] Optional env vars not set (some features disabled): ${missingOptional.join(", ")}`);
}

// ── App ───────────────────────────────────────────────────────────────────────
const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { corsDelegate, isAllowedOrigin } = require("./middleware/cors");
const { general: generalLimiter } = require("./middleware/rateLimiters");
const apiRouter = require("./router");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Request ID — set at the app level so EVERY response carries x-request-id,
// including top-level routes (/health, /livez, /) that bypass the /api router.
app.use((req, res, next) => {
  const id = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
});

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.originalUrl, requestId: req.requestId, ip: req.ip }, "incoming request");
  next();
});

app.use(cors(corsDelegate));
app.options("*", cors(corsDelegate));

// CSRF second-layer defence (Bearer token auth means standard CSRF isn't applicable,
// but we block cross-origin state-changing requests without allowed origin anyway)
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const isWebhook = req.path.startsWith("/api/webhooks/") || req.path.startsWith("/api/landing/public");
  if (isWebhook) return next();
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, error: "CSRF: origin not allowed" });
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // 'wasm-unsafe-eval' enables WebAssembly (on-device Whisper STT). It only
      // permits WASM compilation — NOT JS eval() — so it is the safe, scoped
      // directive for the in-browser speech model.
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:3000", "http://localhost:5173", "http://localhost:5000",
        "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5000",
        "http://192.168.8.160:3000", "http://192.168.8.160:5000",
        "http://192.168.100.19:3000", "http://192.168.100.19:5173", "http://192.168.100.19:5000",
        "https://zktcypraugqiddqhntsp.supabase.co", "https://*.supabase.co",
        "https://exponify.ph", "https://www.exponify.ph",
        "https://hermesbackend-j1w5.onrender.com", "https://*.onrender.com",
        // On-device Whisper STT: model weights from the HF CDN + ONNX-runtime WASM.
        "https://huggingface.co", "https://*.hf.co", "https://cdn.jsdelivr.net",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use("/api/", generalLimiter);
// Limit raised to 10 MB to accommodate base64-encoded avatar uploads (5 MB image ≈ 6.7 MB base64).
// The /storage/avatar route enforces its own 5 MB decoded-size guard as a second layer.
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// ── Health & root ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ success: true, message: "Hermes API is running", timestamp: new Date().toISOString() }));

app.get("/health", async (_req, res) => {
  const start = Date.now();
  const checks = { db: "ok", memory: "ok" };
  try {
    const { error } = await supabase.from("workspaces").select("id").limit(1);
    if (error) checks.db = "degraded";
  } catch { checks.db = "degraded"; }
  const heapMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  if (heapMb > 512) checks.memory = "degraded";
  const status = Object.values(checks).every((v) => v === "ok") ? "ok" : "degraded";
  res.status(status === "ok" ? 200 : 503).json({ status, checks, uptime: Math.floor(process.uptime()), heap_mb: heapMb, latency_ms: Date.now() - start, timestamp: new Date().toISOString(), version: process.env.npm_package_version || "2.2.1" });
});

// Set true by the graceful-shutdown handler so liveness can report draining.
let isShuttingDown = false;

// Liveness: process-only, no external deps. Container HEALTHCHECK / Render /
// healthcheck.sh restart probes use this, so a transient Supabase blip can't
// trigger a restart storm. /health stays the DB-aware readiness check.
app.get("/livez", (_req, res) => {
  if (isShuttingDown) return res.status(503).json({ status: "shutting_down" });
  res.status(200).json({ status: "ok", uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error({ err, method: req.method, url: req.originalUrl }, "unhandled error");
  } else {
    logger.warn({ err: { message: err.message, status }, method: req.method, url: req.originalUrl }, "request error");
  }
  if (process.env.SENTRY_DSN && (!err.status || err.status >= 500)) {
    Sentry.withScope((scope) => {
      scope.setTag("method", req.method);
      scope.setTag("path", req.originalUrl);
      scope.setExtra("workspaceId", req.workspaceId || null);
      scope.setUser(req.user ? { id: req.user.id } : null);
      Sentry.captureException(err);
    });
  }
  const isProd = process.env.NODE_ENV === "production";
  const message = status < 500 ? (err.message || "Request error") : (isProd ? "An unexpected error occurred." : err.message || "Server error");
  res.status(status).json({ success: false, error: message, path: req.originalUrl });
});

// ── Process lifecycle ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

function startServer(retries = 5) {
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "Server started");
  });

  // Behind proxies/load balancers (Render, ALB), keep-alive must outlive the
  // upstream idle timeout to avoid races that surface as 502s.
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && retries > 0) {
      logger.warn(`[startup] Port ${PORT} busy — retrying in 1s (${retries} left)`);
      setTimeout(() => startServer(retries - 1), 1000);
    } else {
      logger.error({ err }, "[startup] Failed to bind port — giving up");
      process.exit(1);
    }
  });

  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    isShuttingDown = true; // flips /livez to 503 so the LB stops new traffic
    logger.info({ signal }, "[shutdown] Draining connections");
    server.close((err) => {
      if (err) { logger.error({ err }, "[shutdown] Error closing server"); process.exit(1); }
      logger.info("[shutdown] Clean exit");
      process.exit(0);
    });
    setTimeout(() => { logger.error("[shutdown] Drain timeout — forcing exit"); process.exit(1); }, 15_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  // PM2 graceful shutdown (shutdown_with_message: true) sends an IPC message,
  // not SIGINT — without this the drain never runs under PM2.
  process.on("message", (msg) => { if (msg === "shutdown") shutdown("pm2:shutdown"); });
  process.on("unhandledRejection", (reason) => logger.error({ reason }, "[process] Unhandled rejection"));
  process.on("uncaughtException",  (err)    => { logger.error({ err }, "[process] Uncaught exception"); process.exit(1); });

  return server;
}

if (require.main === module) {
  startServer();

  // Leader election for background jobs. Under PM2 cluster mode (pm2-runtime)
  // every instance would otherwise run these timers — duplicating emails, aging
  // scans and loop hydration, and racing on shared rows. Only instance 0 (or a
  // single non-clustered process) runs them. NODE_APP_INSTANCE is set by PM2.
  const instanceId = process.env.NODE_APP_INSTANCE ?? process.env.pm_id;
  const isSchedulerLeader = instanceId === undefined || String(instanceId) === "0";

  if (!isSchedulerLeader) {
    logger.info({ instanceId }, "[startup] Not scheduler leader — background jobs skipped on this instance");
  }

  if (isSchedulerLeader) {
  supabase.rpc("purge_expired_security_rows").then(({ error }) => {
    if (error) logger.warn({ error }, "[startup] purge_expired_security_rows failed (non-fatal)");
    else logger.info("[startup] Expired security rows purged");
  }).catch(() => {});

  try {
    const { runAgingScan } = require("./services/taskAgingService");
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setTimeout(() => runAgingScan().catch((err) => logger.warn({ err }, "[aging] Initial scan error")), 120_000);
    setInterval(() => runAgingScan().catch((err) => logger.warn({ err }, "[aging] Scheduled scan error")), SIX_HOURS);
    logger.info("[startup] Task aging scheduler registered");
  } catch (err) {
    logger.warn({ err }, "[startup] Task aging scheduler failed (non-fatal)");
  }

  try {
    const { startFollowUpScheduler } = require("./services/facebook/facebookFollowUpScheduler");
    const { processPendingSequenceSteps } = require("./services/facebook/sequenceScheduler");
    const { createFacebookGraphApi } = require("./services/facebook/facebookGraphApi");
    const { createFacebookConfigService } = require("./services/facebook/facebookConfig");
    const { getFacebookConfig } = createFacebookConfigService({
      supabaseClient: supabase,
      runtimeConfig: {
        pageId: "",
        pageName: "",
        pageAccessToken: "",
        businessType: "",
        productServices: "",
        productServicePriceRanges: "",
        websiteLink: "",
        shoppeLink: "",
        lazadaLink: "",
        knowledge: "",
        connectedWorkspaceId: "",
        verifyToken: "",
        appSecret: "",
      },
      env: process.env,
    });
    const fbGraphApi = createFacebookGraphApi({ getFacebookConfig });
    startFollowUpScheduler({ supabase, sendFacebookMessage: fbGraphApi.sendFacebookMessage, getFacebookConfig });

    setInterval(() => {
      processPendingSequenceSteps({
        supabaseClient: supabase,
        sendFacebookMessage: fbGraphApi.sendFacebookMessage,
        getFacebookConfig,
      }).catch((err) => logger.warn({ err }, "[sequences] Scheduler execution failed"));
    }, 60 * 1000);
    logger.info("[startup] Facebook sequence scheduler registered (1 min interval)");

  } catch (err) {
    logger.warn({ err }, "[startup] Facebook schedulers failed (non-fatal)");
  }

  try {
    const { startOmniChannelFollowUpScheduler } = require("./services/omnichannel/followUpScheduler");
    startOmniChannelFollowUpScheduler();
  } catch (err) {
    logger.warn({ err }, "[startup] Omni-channel follow-up scheduler failed (non-fatal)");
  }

  // Resume intelligence loops that were running before the last restart.
  // Delay 5 s to let the DB connection pool warm up before querying loop_configs.
  setTimeout(() => {
    try {
      const { hydrateLoops } = require("./services/intelligence/loopEngine");
      hydrateLoops().catch((err) => logger.warn({ err }, "[startup] loop hydration failed (non-fatal)"));
    } catch (err) {
      logger.warn({ err }, "[startup] loop engine not available (non-fatal)");
    }
  }, 5_000);
  }
}

module.exports = app;
