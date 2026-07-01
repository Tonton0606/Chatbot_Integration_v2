/**
 * Security Middleware
 *
 * Provides IP blocking, brute-force detection, honeypot, and device fingerprinting.
 *
 * State storage strategy:
 *   - Production (REDIS_URL set): all security state stored in Redis with TTLs.
 *     Shared across all instances — blocks applied on one node affect all nodes.
 *   - Development / no Redis: in-memory Maps with periodic GC (single-process only).
 *     Acceptable for local dev; NOT safe for multi-instance production.
 */

const logger = require('../config/logger');
const crypto  = require('crypto');
const rateLimit = require('express-rate-limit');

const IS_DEV = process.env.NODE_ENV !== 'production';

// ── Redis-backed store with in-memory fallback ────────────────────────────────

let redis = null;
try {
  if (process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableReadyCheck: false });
    redis.on('error', (err) => logger.warn({ err: err.message }, '[security] Redis error — using in-memory fallback'));
    logger.info('[security] Redis connected for security state');
  }
} catch {
  logger.warn('[security] ioredis not available — using in-memory fallback');
}

// In-memory fallback (single-process only)
const _mem = {
  blockedIPs:     new Map(),
  failedAttempts: new Map(),
  suspiciousIPs:  new Map(),
  userLockouts:   new Map(),
};

// ── Redis helpers — async wrappers so callers don't branch on redis ───────────

// Sentinel thrown by _rGet so callers can distinguish "key absent" (null) from
// "store unreachable" — security checks must NOT treat an outage as "all clear".
const REDIS_UNAVAILABLE = Symbol('REDIS_UNAVAILABLE');

async function _rGet(key) {
  if (!redis) return null;
  try { return await redis.get(key); } catch { return REDIS_UNAVAILABLE; }
}

async function _rSet(key, value, ttlSeconds) {
  if (!redis) return;
  try { await redis.set(key, value, 'EX', ttlSeconds); } catch { /* no-op */ }
}

async function _rDel(key) {
  if (!redis) return;
  try { await redis.del(key); } catch { /* no-op */ }
}

async function _rIncr(key, ttlSeconds) {
  if (!redis) return null;
  try {
    const val = await redis.incr(key);
    if (val === 1) await redis.expire(key, ttlSeconds);
    return val;
  } catch { return null; }
}

// ── IP blocking ───────────────────────────────────────────────────────────────

async function isIPBlocked(ip) {
  if (redis) {
    const val = await _rGet(`sec:blocked:${ip}`);
    // Fail closed: if the store is unreachable we cannot prove the IP is safe,
    // so fall back to the in-memory record rather than allowing the request.
    if (val === REDIS_UNAVAILABLE) {
      const entry = _mem.blockedIPs.get(ip);
      return !!(entry && Date.now() <= entry.expiresAt);
    }
    return !!val;
  }
  const entry = _mem.blockedIPs.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { _mem.blockedIPs.delete(ip); return false; }
  return true;
}

async function blockIP(ip, durationMs = 3_600_000) {
  const ttlSeconds = Math.ceil(durationMs / 1000);
  if (redis) {
    await _rSet(`sec:blocked:${ip}`, '1', ttlSeconds);
  }
  // Always mirror to the in-memory store as well so isIPBlocked can fail closed
  // if Redis becomes unreachable between the block and the next request.
  _mem.blockedIPs.set(ip, { expiresAt: Date.now() + durationMs });
  logger.warn({ ip, durationMs }, '[security] IP blocked');
}

// ── Failed-attempt tracking ───────────────────────────────────────────────────

async function recordFailedAttempt(identifier, type = 'ip') {
  const key = `sec:failed:${type}:${identifier}`;
  const WINDOW = 30 * 60; // 30-minute rolling window in seconds

  if (redis) {
    const count = await _rIncr(key, WINDOW);
    return count || 1;
  }

  const memKey = key;
  const existing = _mem.failedAttempts.get(memKey) || { count: 0, firstAttempt: Date.now() };
  existing.count++;
  _mem.failedAttempts.set(memKey, existing);
  return existing.count;
}

async function getFailedAttemptCount(identifier, type = 'ip') {
  const key = `sec:failed:${type}:${identifier}`;
  if (redis) {
    const val = await _rGet(key);
    return parseInt(val || '0', 10);
  }
  return _mem.failedAttempts.get(key)?.count || 0;
}

// ── Account lockout ───────────────────────────────────────────────────────────

async function lockAccount(email, durationMinutes = 30, reason = 'too_many_attempts') {
  const ttlSeconds = durationMinutes * 60;
  const payload = JSON.stringify({ reason, lockedAt: Date.now() });
  const normalizedEmail = String(email || '').toLowerCase();

  if (redis) {
    await _rSet(`sec:lockout:${normalizedEmail}`, payload, ttlSeconds);
  }
  // Mirror to memory so lockouts survive a Redis outage (fail closed).
  _mem.userLockouts.set(normalizedEmail, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    reason,
  });
}

async function getAccountLockout(email) {
  const normalizedEmail = String(email || '').toLowerCase();

  if (redis) {
    const raw = await _rGet(`sec:lockout:${normalizedEmail}`);
    // Store unreachable — fall through to the in-memory lockout record.
    if (raw && raw !== REDIS_UNAVAILABLE) {
      try { return JSON.parse(raw); } catch { return { reason: 'unknown' }; }
    }
    if (raw !== REDIS_UNAVAILABLE) return null;
  }

  const entry = _mem.userLockouts.get(normalizedEmail);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _mem.userLockouts.delete(normalizedEmail); return null; }
  return entry;
}

// ── Device fingerprinting ─────────────────────────────────────────────────────

function generateFingerprint(req) {
  const data = [
    req.ip,
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.headers['dnt'] || '',
    req.headers['upgrade-insecure-requests'] || '',
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// ── Rapid-request detector (in-memory only — per-process is acceptable here) ──

async function checkRapidRequests(fingerprint) {
  if (redis) {
    const key = `sec:rapid:${fingerprint}`;
    const last = await _rGet(key);
    await _rSet(key, String(Date.now()), 5); // 5-second TTL
    return last && (Date.now() - parseInt(last, 10)) < 100;
  }
  const last = _mem.suspiciousIPs.get(fingerprint);
  _mem.suspiciousIPs.set(fingerprint, Date.now());
  return last && (Date.now() - last) < 100;
}

// ── Honeypot check ────────────────────────────────────────────────────────────

function checkHoneypot(req) {
  const honeypotFields = ['website', 'phone_confirm', 'address_2'];
  for (const field of honeypotFields) {
    if (req.body[field] && String(req.body[field]).length > 0) {
      return { isBot: true, reason: 'Honeypot triggered' };
    }
  }
  const formStartTime = req.body._form_start_time;
  if (formStartTime) {
    const timeTaken = Date.now() - parseInt(formStartTime, 10);
    if (timeTaken < 2000) {
      return { isBot: true, reason: 'Form submitted too quickly' };
    }
  }
  return { isBot: false };
}

// ── Suspicious-pattern detection ──────────────────────────────────────────────

const TOOL_SIGNATURES = ['burp', 'hydra', 'medusa', 'nikto', 'sqlmap', 'nmap', 'metasploit', 'nessus', 'openvas', 'acunetix', 'wapiti'];

async function detectSuspiciousPatterns(req) {
  const patterns = [];
  const userAgent = req.headers['user-agent'] || '';
  const lowerUA = userAgent.toLowerCase();

  for (const sig of TOOL_SIGNATURES) {
    if (lowerUA.includes(sig)) {
      patterns.push(`tool_detected:${sig}`);
    }
  }

  // Short UA check — only flag in production to avoid dev-tool false positives
  if (!IS_DEV && userAgent.length < 20) {
    patterns.push('suspicious_user_agent');
  }

  const fingerprint = generateFingerprint(req);
  if (await checkRapidRequests(fingerprint)) {
    patterns.push('rapid_requests');
  }

  return patterns;
}

// ── Account lockout middleware ─────────────────────────────────────────────────

async function accountLockoutMiddleware(req, res, next) {
  const { email } = req.body || {};
  if (!email) return next();

  const lockout = await getAccountLockout(email);
  if (lockout) {
    return res.status(423).json({
      success: false,
      error: `Account temporarily locked: ${lockout.reason}. Please try again later or contact support.`,
      locked: true,
    });
  }

  next();
}

// ── Main security middleware ──────────────────────────────────────────────────

async function securityMiddleware(req, res, next) {
  const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';

  try {
    // 1. IP block check
    if (await isIPBlocked(clientIP)) {
      return res.status(403).json({ success: false, error: 'Access denied due to suspicious activity.' });
    }

    // 2. Honeypot (synchronous — no I/O)
    const honeypot = checkHoneypot(req);
    if (honeypot.isBot) {
      await blockIP(clientIP, 24 * 60 * 60 * 1000);
      return res.status(403).json({ success: false, error: 'Security check failed.' });
    }

    // 3. Suspicious-pattern detection (async — may hit Redis)
    const patterns = await detectSuspiciousPatterns(req);
    if (patterns.some((p) => p.startsWith('tool_detected'))) {
      await blockIP(clientIP, 7 * 24 * 60 * 60 * 1000); // 7-day block for known attack tools
      logger.warn({ ip: clientIP, patterns }, '[security] Attack tool detected — IP blocked 7d');
      return res.status(403).json({ success: false, error: 'Security violation detected.' });
    }

    if (patterns.length > 0) {
      logger.warn({ ip: clientIP, patterns }, '[security] Suspicious patterns detected');
    }

    // Attach security helpers to req for route-level use
    req.security = {
      fingerprint:           generateFingerprint(req),
      recordFailed:          () => recordFailedAttempt(clientIP, 'ip'),
      recordFailedForEmail:  (email) => recordFailedAttempt(email, 'email'),
      lockAccount:           (email, mins, reason) => lockAccount(email, mins, reason),
      getFailedCount:        () => getFailedAttemptCount(clientIP, 'ip'),
    };

    return next();
  } catch (err) {
    logger.warn({ err: err.message }, '[security] Middleware error — allowing request through');
    return next(); // Fail open — security middleware should never block valid traffic on error
  }
}

// ── Advanced rate limiter ─────────────────────────────────────────────────────

const advancedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 1_000_000 : 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const fp = generateFingerprint(req);
    return `${req.ip}_${fp}`;
  },
  handler: async (req, res) => {
    await blockIP(req.ip, 24 * 60 * 60 * 1000).catch(() => {});
    res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again in 15 minutes.',
      retryAfter: 15 * 60,
    });
  },
});

// ── Progressive delay ────────────────────────────────────────────────────────

function getProgressiveDelay(attemptCount) {
  if (attemptCount <= 3)  return 0;
  if (attemptCount <= 5)  return 2_000;
  if (attemptCount <= 7)  return 5_000;
  if (attemptCount <= 10) return 10_000;
  return 30_000;
}

// ── Password strength validation ──────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  'password123', '123456789', 'qwerty123', 'admin123', 'letmein123',
  'welcome123', 'monkey123', 'dragon123', 'master123', 'shadow123',
  'iloveyou1', 'sunshine1', 'princess1', 'football1', 'superman1',
  'batman123', 'trustno1!', 'passw0rd1', 'abc123456', 'login1234',
  'secure123', 'manager1!', 'company1!', 'hello1234', 'dragon456',
  'test12345', 'change123', 'default12', 'system123', 'support12',
  // Extend this list from a curated breach dataset in production
]);

function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

function validatePasswordStrength(password) {
  const minLength = 12;
  const maxLength = 128;

  if (!password || password.length < minLength) {
    return { valid: false, reason: `Password must be at least ${minLength} characters` };
  }

  if (password.length > maxLength) {
    return { valid: false, reason: `Password must not exceed ${maxLength} characters` };
  }

  const checks = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers:   /[0-9]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon:  !isCommonPassword(password),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failedChecks.length > 0) {
    const reasons = {
      uppercase: 'one uppercase letter',
      lowercase: 'one lowercase letter',
      numbers:   'one number',
      special:   'one special character (!@#$%^&* etc.)',
      noCommon:  'not be a commonly used password',
    };
    return {
      valid: false,
      reason: `Password must contain ${failedChecks.map((f) => reasons[f]).join(', ')}`,
    };
  }

  return { valid: true };
}

// ── Periodic in-memory GC (no-op when Redis is active) ───────────────────────

if (!redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of _mem.blockedIPs.entries()) {
      if (now > data.expiresAt) _mem.blockedIPs.delete(ip);
    }
    const thirtyMin = now - 30 * 60 * 1000;
    for (const [key, data] of _mem.failedAttempts.entries()) {
      if (data.firstAttempt < thirtyMin) _mem.failedAttempts.delete(key);
    }
    for (const [email, data] of _mem.userLockouts.entries()) {
      if (now > data.expiresAt) _mem.userLockouts.delete(email);
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  securityMiddleware,
  advancedAuthLimiter,
  accountLockoutMiddleware,
  validatePasswordStrength,
  generateFingerprint,
  blockIP,
  isIPBlocked,
  lockAccount,
  recordFailedAttempt,
  getProgressiveDelay,
  checkHoneypot,
};
