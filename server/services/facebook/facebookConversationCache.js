/**
 * Facebook Conversation Cache
 *
 * Write-through cache for conversation history.
 * - Reads: synchronous from in-memory Map (fast path for webhook handler)
 * - Writes: synchronous to Map + async fire-and-forget to Supabase
 * - On startup / cache miss: hydrates from Supabase transparently
 *
 * This keeps the existing sync API in facebook.js unchanged while
 * surviving server restarts and working across multiple instances.
 *
 * Supabase column required: client_facebook_conversations.conversation_history (jsonb)
 * If the column is absent the Supabase calls fail silently — in-memory cache still works.
 */

const logger = require("../../config/logger");

const TTL_MS = 30 * 60 * 1000;      // 30 min — matches CONVERSATION_TTL_MS in facebook.js
const MAX_MESSAGES = 8;              // matches CONVERSATION_MAX_MESSAGES

// in-memory layer: key → { messages, updatedAt }
const _store = new Map();

let _supabase = null;

/**
 * Call once at startup to enable Supabase persistence.
 * @param {object} supabaseClient
 */
function initConversationCache(supabaseClient) {
  _supabase = supabaseClient;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _isExpired(entry) {
  return Date.now() - entry.updatedAt > TTL_MS;
}

function _normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content)
    .slice(-MAX_MESSAGES);
}

async function _loadFromSupabase(psid, workspaceId) {
  if (!_supabase || !psid || !workspaceId) return null;
  try {
    const { data, error } = await _supabase
      .from("client_facebook_conversations")
      .select("conversation_history, updated_at")
      .eq("customer_psid", psid)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data?.conversation_history) return null;

    const messages = _normalizeMessages(data.conversation_history);
    const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
    return { messages, updatedAt };
  } catch (err) {
    logger.debug({ err, psid }, "[ConvCache] Supabase load failed (non-fatal)");
    return null;
  }
}

function _persistToSupabase(psid, workspaceId, messages) {
  if (!_supabase || !psid || !workspaceId) return;
  _supabase
    .from("client_facebook_conversations")
    .update({ conversation_history: messages, updated_at: new Date().toISOString() })
    .eq("customer_psid", psid)
    .eq("workspace_id", workspaceId)
    .then(({ error }) => {
      if (error) logger.debug({ error, psid }, "[ConvCache] Supabase persist failed (non-fatal)");
    })
    .catch(() => {});
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get conversation history synchronously from memory.
 * If not in memory, kicks off an async hydration (next call will hit memory).
 */
function getConversationHistory(key, psid, workspaceId) {
  const entry = _store.get(key);

  if (entry && !_isExpired(entry)) {
    return entry.messages;
  }

  // Evict stale entry
  if (entry) _store.delete(key);

  // Async hydrate from Supabase for next call
  if (psid && workspaceId) {
    _loadFromSupabase(psid, workspaceId).then((remote) => {
      if (remote && !_isExpired(remote)) {
        _store.set(key, remote);
      }
    });
  }

  return [];
}

/**
 * Set conversation history — sync to memory, async to Supabase.
 */
function setConversationHistory(key, psid, workspaceId, messages) {
  const normalized = _normalizeMessages(messages);
  _store.set(key, { messages: normalized, updatedAt: Date.now() });
  _persistToSupabase(psid, workspaceId, normalized);
}

/**
 * Delete a conversation entry from memory (Supabase row stays, just clears history field).
 */
function deleteConversationHistory(key, psid, workspaceId) {
  _store.delete(key);
  if (_supabase && psid && workspaceId) {
    _supabase
      .from("client_facebook_conversations")
      .update({ conversation_history: [] })
      .eq("customer_psid", psid)
      .eq("workspace_id", workspaceId)
      .catch(() => {});
  }
}

/**
 * Cleanup expired entries from memory (mirrors the existing interval in facebook.js).
 */
function cleanupExpiredConversations() {
  for (const [key, entry] of _store) {
    if (_isExpired(entry)) _store.delete(key);
  }
}

module.exports = {
  initConversationCache,
  getConversationHistory,
  setConversationHistory,
  deleteConversationHistory,
  cleanupExpiredConversations,
};
