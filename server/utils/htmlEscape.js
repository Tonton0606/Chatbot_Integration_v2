/**
 * HTML Entity Encoding Utility
 * 
 * Prevents Cross-Site Scripting (XSS) by encoding user-controlled
 * values before they are rendered in HTML responses or email bodies.
 * Must be used wherever user input is interpolated into HTML strings.
 */

function escapeHtml(str) {
  if (typeof str !== 'string' && typeof str !== 'number' && typeof str !== 'boolean') {
    return '';
  }
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that a value is a string (not an object prototype).
 * Prevents Improper Type Validation / Prototype Pollution.
 */
function ensureString(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

/**
 * Validate that a value is an array (not an object prototype).
 */
function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * Validate that a value is a plain object (not null, not array).
 */
function ensureObject(value, fallback = {}) {
  return (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value : fallback;
}

module.exports = { escapeHtml, ensureString, ensureArray, ensureObject };
