'use strict';

/**
 * Sanitize a user-supplied search term before interpolating it into a PostgREST
 * `.or()` / `.ilike()` filter string.
 *
 * PostgREST builds filters from raw text, where these characters are structural:
 *   ,   separates OR/AND conditions
 *   ( ) group conditions
 *   .   separates column.operator.value
 *   :   used in some cast/type expressions
 *   *   maps to the SQL % wildcard
 *   %   SQL LIKE wildcard
 *
 * Leaving any of them in lets a caller inject extra filter conditions (e.g.
 * exfiltrate rows by appending `,id.gt.0`). We strip them all, collapse
 * whitespace, and cap the length. The result is safe to embed in an ilike term.
 *
 * Returns '' when nothing usable remains — callers should skip the filter then.
 */
function sanitizeSearch(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[,()*.%:\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

module.exports = { sanitizeSearch };
