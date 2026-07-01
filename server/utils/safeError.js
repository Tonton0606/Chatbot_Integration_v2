'use strict';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Returns an error message safe to send to API clients.
 * In production, all 500-class errors collapse to a generic message to prevent
 * leaking database schema, column names, or constraint details.
 * In development, the raw message is returned so stack traces are useful.
 *
 * Usage in route catch blocks:
 *   res.status(500).json({ success: false, error: safeError(err) });
 */
function safeError(err, fallback = 'Internal server error') {
  if (IS_PROD) return fallback;
  return (err && err.message) ? err.message : fallback;
}

module.exports = { safeError };
