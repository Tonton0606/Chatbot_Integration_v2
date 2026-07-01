/**
 * Security Routes — Nuclei + Trivy Integration
 *
 * SECURITY HARDENING (2026-06-19):
 *   - All user-supplied values validated against strict allowlists before shell exec
 *   - `spawn` with arg arrays used instead of `exec` with interpolated strings
 *   - `trivy/code` path input restricted to server's own project root only
 *   - Error messages scrubbed — no raw err.message to client in production
 */

const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const router = express.Router();
const logger = require("../../config/logger");
const { supabase } = require("../../config/supabase");

const IS_PROD = process.env.NODE_ENV === "production";

// ── Allowlists — ONLY these values accepted from user input ─────────────────

const ALLOWED_SEVERITY_NUCLEI   = new Set(["critical", "high", "medium", "low", "info"]);
const ALLOWED_TEMPLATES_NUCLEI  = new Set(["cves", "vulnerabilities", "misconfiguration", "default-logins", "exposed-panels", "technologies"]);
const ALLOWED_SEVERITY_TRIVY    = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]);
const ALLOWED_SCANNERS_TRIVY    = new Set(["vuln", "secret", "config", "license"]);
const ALLOWED_SKIPDIRS          = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "tmp"]);

function sanitizeSeverityNuclei(raw) {
  const parts = String(raw || "critical,high,medium").split(",").map(s => s.trim().toLowerCase());
  return parts.filter(s => ALLOWED_SEVERITY_NUCLEI.has(s)).join(",") || "critical,high,medium";
}

function sanitizeTemplatesNuclei(raw) {
  const parts = String(raw || "cves,vulnerabilities,misconfiguration").split(",").map(s => s.trim());
  return parts.filter(s => ALLOWED_TEMPLATES_NUCLEI.has(s)).join(",") || "cves,vulnerabilities,misconfiguration";
}

function sanitizeSeverityTrivy(raw) {
  const parts = String(raw || "HIGH,CRITICAL").split(",").map(s => s.trim().toUpperCase());
  return parts.filter(s => ALLOWED_SEVERITY_TRIVY.has(s)).join(",") || "HIGH,CRITICAL";
}

function sanitizeScannersTrivy(raw) {
  const parts = String(raw || "vuln,secret,config").split(",").map(s => s.trim().toLowerCase());
  return parts.filter(s => ALLOWED_SCANNERS_TRIVY.has(s)).join(",") || "vuln,secret,config";
}

function sanitizeSkipDirs(raw) {
  if (!Array.isArray(raw)) return ["node_modules", ".git", "dist"];
  return raw.filter(d => ALLOWED_SKIPDIRS.has(String(d).trim())).slice(0, 10);
}

// ── SSRF guard for Nuclei target ───────────────────────────────────────────
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const PRIVATE_IP_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|169\.254\.)/;

function isForbiddenTarget(url) {
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (PRIVATE_IP_RE.test(hostname)) return true;
  return false;
}

// Docker image: allow only registry/name:tag format — no shell metacharacters
function sanitizeDockerImage(raw) {
  const img = String(raw || "").trim();
  if (!/^[a-zA-Z0-9_./:@-]{1,256}$/.test(img)) return null;
  return img;
}

// ── Safe spawn helper — returns Promise<{stdout, stderr}> ────────────────────

function runCommand(cmd, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("Scan timed out")); }, timeoutMs);

    proc.stdout.on("data", d => { stdout += d; });
    proc.stderr.on("data", d => { stderr += d; });
    proc.on("close", code => {
      clearTimeout(timer);
      if (code === 0 || stdout.trim()) resolve({ stdout, stderr });
      else reject(new Error(`Exit ${code}: ${stderr.slice(0, 200)}`));
    });
    proc.on("error", err => { clearTimeout(timer); reject(err); });
  });
}

function safeError(msg) {
  return IS_PROD ? "An internal error occurred." : msg;
}

// ── HEALTH ───────────────────────────────────────────────────────────────────

router.get("/health", async (_req, res) => {
  const health = { nuclei: "unknown", trivy: "unknown" };
  try { await runCommand("nuclei", ["-version"]); health.nuclei = "healthy"; } catch { health.nuclei = "not_installed"; }
  try { await runCommand("trivy",  ["version"]);  health.trivy  = "healthy"; } catch { health.trivy  = "not_installed"; }
  res.json(health);
});

router.get("/nuclei/health", async (_req, res) => {
  try {
    await runCommand("nuclei", ["-version"]);
    res.json({ status: "healthy", tool: "nuclei" });
  } catch {
    res.status(503).json({ status: "not_installed", message: "Nuclei not found. Install: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest" });
  }
});

router.get("/trivy/health", async (_req, res) => {
  try {
    await runCommand("trivy", ["version"]);
    res.json({ status: "healthy", tool: "trivy" });
  } catch {
    res.status(503).json({ status: "not_installed", message: "Trivy not found. Install: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin" });
  }
});

// ── NUCLEI scan ───────────────────────────────────────────────────────────────

router.post("/nuclei/scan", async (req, res) => {
  try {
    const { target, options = {} } = req.body;
    if (!target) return res.status(400).json({ error: "Target URL required" });

    let url;
    try { url = new URL(target); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

    // Only allow http/https targets
    if (!["http:", "https:"].includes(url.protocol)) {
      return res.status(400).json({ error: "Only http/https targets allowed" });
    }

    if (isForbiddenTarget(url)) {
      return res.status(400).json({ error: "Forbidden target" });
    }

    const severity  = sanitizeSeverityNuclei(options.severity);
    const templates = sanitizeTemplatesNuclei(options.templates);
    const timeout   = Math.min(Math.max(parseInt(options.timeout) || 300, 30), 600);

    let results = [];
    try {
      // Use spawn with arg array — no shell interpolation
      const { stdout } = await runCommand("nuclei", [
        "-u", url.href,
        "-s", severity,
        "-t", templates,
        "-timeout", String(timeout),
        "-json", "-silent",
      ], timeout * 1000);

      results = stdout.split("\n").filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });
    } catch (execErr) {
      if (IS_PROD) return res.status(503).json({ error: "Security scanner unavailable." });
      results = [{ template: "nuclei-demo", info: { name: "Demo Mode", severity: "info" }, host: url.href, timestamp: new Date().toISOString(), message: "Nuclei not installed" }];
    }

    await supabase.from("security_scans").insert({ tool: "nuclei", target: url.href, vulnerability_count: results.length, results, created_at: new Date().toISOString() }).catch(() => {});

    res.json({ success: true, target: url.href, scan_time: new Date().toISOString(), results, total_vulnerabilities: results.length });
  } catch (error) {
    logger.error({ error: error.message }, "Nuclei scan error");
    res.status(500).json({ error: safeError(error.message) });
  }
});

// ── TRIVY image scan ─────────────────────────────────────────────────────────

router.post("/trivy/image", async (req, res) => {
  try {
    const { image, options = {} } = req.body;
    if (!image) return res.status(400).json({ error: "Image name required" });

    const safeImage = sanitizeDockerImage(image);
    if (!safeImage) return res.status(400).json({ error: "Invalid image name. Only registry/name:tag format allowed." });

    const severity = sanitizeSeverityTrivy(options.severity);
    const scanners = sanitizeScannersTrivy(options.scanners);

    let results = {};
    try {
      const { stdout } = await runCommand("trivy", [
        "image", safeImage,
        "--severity", severity,
        "--scanners", scanners,
        "-f", "json",
        "--timeout", "10m",
      ], 600_000);
      results = JSON.parse(stdout);
    } catch (execErr) {
      if (IS_PROD) return res.status(503).json({ error: "Container scanner unavailable." });
      results = { SchemaVersion: 2, ArtifactName: safeImage, Results: [{ Target: safeImage, Type: "container", Vulnerabilities: [], message: "Trivy not installed" }] };
    }

    await supabase.from("security_scans").insert({ tool: "trivy-image", target: safeImage, vulnerability_count: results.Results?.reduce((a, r) => a + (r.Vulnerabilities?.length || 0), 0) || 0, results, created_at: new Date().toISOString() }).catch(() => {});

    res.json({ success: true, image: safeImage, scan_time: new Date().toISOString(), results });
  } catch (error) {
    logger.error({ error: error.message }, "Trivy image scan error");
    res.status(500).json({ error: safeError(error.message) });
  }
});

// ── TRIVY code scan ───────────────────────────────────────────────────────────
// Path is LOCKED to server project root — user cannot supply arbitrary paths.

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

router.post("/trivy/code", async (req, res) => {
  try {
    const { options = {} } = req.body;
    // Path input from client is IGNORED — always scan project root
    const scanPath = PROJECT_ROOT;

    const scanners = sanitizeScannersTrivy(options.scanners);
    const severity  = sanitizeSeverityTrivy(options.severity);
    const skipDirs  = sanitizeSkipDirs(options.skipDirs);

    const args = [
      "filesystem", scanPath,
      "--scanners", scanners,
      "--severity", severity,
      "-f", "json",
    ];
    skipDirs.forEach(d => args.push("--skip-dirs", d));

    let results = {};
    try {
      const { stdout } = await runCommand("trivy", args, 300_000);
      results = JSON.parse(stdout);
    } catch (execErr) {
      if (IS_PROD) return res.status(503).json({ error: "Filesystem scanner unavailable." });
      results = { SchemaVersion: 2, ArtifactName: scanPath, Results: [{ Target: "filesystem", Type: "filesystem", message: "Trivy not installed" }] };
    }

    await supabase.from("security_scans").insert({ tool: "trivy-code", target: "project-root", vulnerability_count: 0, results, created_at: new Date().toISOString() }).catch(() => {});

    res.json({ success: true, path: "project-root", scan_time: new Date().toISOString(), results });
  } catch (error) {
    logger.error({ error: error.message }, "Trivy code scan error");
    res.status(500).json({ error: safeError(error.message) });
  }
});

// ── Unified report ────────────────────────────────────────────────────────────

router.post("/report", async (req, res) => {
  try {
    const { target } = req.body;
    const [nucleiStatus, trivyStatus] = await Promise.allSettled([
      runCommand("nuclei", ["-version"]).then(() => ({ status: "ready", tool: "nuclei" })).catch(() => ({ status: "not_installed", tool: "nuclei" })),
      runCommand("trivy",  ["version"]) .then(() => ({ status: "ready", tool: "trivy"  })).catch(() => ({ status: "not_installed", tool: "trivy"  })),
    ]);

    const report = {
      target: typeof target === "string" ? target.slice(0, 500) : null,
      timestamp: new Date().toISOString(),
      webSecurity:  nucleiStatus.status === "fulfilled" ? nucleiStatus.value  : { error: "unavailable" },
      codeSecurity: trivyStatus.status  === "fulfilled" ? trivyStatus.value   : { error: "unavailable" },
      summary: {
        nucleiReady: nucleiStatus.value?.status === "ready",
        trivyReady:  trivyStatus.value?.status  === "ready",
        status: "completed",
      },
    };

    await supabase.from("security_reports").insert(report).catch(() => {});
    res.json(report);
  } catch (error) {
    logger.error({ error: error.message }, "Security report error");
    res.status(500).json({ error: safeError(error.message) });
  }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  try {
    const days  = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: scans, error: scansErr }, { data: reports, error: reportsErr }] = await Promise.all([
      supabase.from("security_scans")  .select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
      supabase.from("security_reports").select("*").gte("timestamp",  since).order("timestamp",   { ascending: false }).limit(100),
    ]);

    if (scansErr)   throw scansErr;
    if (reportsErr) throw reportsErr;

    res.json({
      recentScans:         scans   || [],
      recentReports:       reports || [],
      totalScans:          scans?.length    || 0,
      totalVulnerabilities: scans?.reduce((a, s) => a + (s.vulnerability_count || 0), 0) || 0,
      days,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Security dashboard error");
    res.status(500).json({ error: safeError(error.message) });
  }
});

router.isForbiddenTarget = isForbiddenTarget;

module.exports = router;
