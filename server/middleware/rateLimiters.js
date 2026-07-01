const rateLimit = require("express-rate-limit");

const IS_DEV = process.env.NODE_ENV !== "production";
const UNLIMITED = 1_000_000;

const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? UNLIMITED : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later.", retryAfter: 15 * 60 },
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? UNLIMITED : 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: "Too many login attempts, please try again later.", retryAfter: 15 * 60 },
});

const ai = rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? UNLIMITED : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "AI rate limit exceeded. Please wait a moment.", retryAfter: 60 },
});

const facebook = rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? UNLIMITED : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Webhook rate limit exceeded.", retryAfter: 60 },
});

const email = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? UNLIMITED : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Email rate limit exceeded. Please try again later.", retryAfter: 60 * 60 },
});

// Public, unauthenticated form endpoints (landing lead capture / booking).
// Tighter than `general` because these accept anonymous input and are a
// prime target for spam/DB-flooding bots.
const publicForm = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? UNLIMITED : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many submissions. Please try again later.", retryAfter: 60 * 60 },
});

module.exports = { general, auth, ai, facebook, email, publicForm };
