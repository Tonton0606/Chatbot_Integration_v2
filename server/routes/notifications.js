'use strict';

const express = require('express');
const { safeError } = require('../utils/safeError');
const router  = express.Router();
const logger  = require('../config/logger');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function getWid(req) {
  return req.headers['x-workspace-id'] || req.query.workspaceId || req.user?.workspaceId;
}
function ok(res, data, meta = {})     { res.json({ success: true, data, ...meta }); }
function fail(res, msg, status = 500) {
  if (status >= 500) logger.error({ err: String(msg) }, '[notifications] error');
  res.status(status).json({ success: false, error: status >= 500 ? 'Internal server error' : String(msg) });
}

// ── GET /notifications ────────────────────────────────────────────────────────
// Returns in-app task notifications for the authenticated user.

router.get('/', async (req, res) => {
  try {
    const wid = getWid(req);
    if (!wid) return fail(res, 'workspaceId required', 400);

    const { unread_only = false, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Unauthorized', 401);

    let q = supabase
      .from('task_notifications')
      .select('*', { count: 'exact' })
      .eq('workspace_id', wid)
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (unread_only === 'true' || unread_only === true) {
      q = q.eq('is_read', false);
    }

    const { data, error, count } = await q;
    if (error) throw error;

    // Unread count
    const { count: unreadCount } = await supabase
      .from('task_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', wid)
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('dismissed', false);

    return ok(res, data || [], { total: count, unread: unreadCount || 0 });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── PATCH /notifications/:id/read ─────────────────────────────────────────────

router.patch('/:id/read', async (req, res) => {
  try {
    const wid    = getWid(req);
    const userId = req.user?.id;
    if (!wid || !userId) return fail(res, 'Unauthorized', 401);

    const { error } = await supabase
      .from('task_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', wid)
      .eq('user_id', userId);

    if (error) throw error;
    return ok(res, { id: req.params.id });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── POST /notifications/read-all ──────────────────────────────────────────────

router.post('/read-all', async (req, res) => {
  try {
    const wid    = getWid(req);
    const userId = req.user?.id;
    if (!wid || !userId) return fail(res, 'Unauthorized', 401);

    const { error } = await supabase
      .from('task_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('workspace_id', wid)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return ok(res, { marked: true });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── DELETE /notifications/:id ─────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const wid    = getWid(req);
    const userId = req.user?.id;
    if (!wid || !userId) return fail(res, 'Unauthorized', 401);

    const { error } = await supabase
      .from('task_notifications')
      .update({ dismissed: true })
      .eq('id', req.params.id)
      .eq('workspace_id', wid)
      .eq('user_id', userId);

    if (error) throw error;
    return ok(res, { id: req.params.id });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── DELETE /notifications (bulk dismiss all read) ─────────────────────────────

router.delete('/', async (req, res) => {
  try {
    const wid    = getWid(req);
    const userId = req.user?.id;
    if (!wid || !userId) return fail(res, 'Unauthorized', 401);

    const { error } = await supabase
      .from('task_notifications')
      .update({ dismissed: true })
      .eq('workspace_id', wid)
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) throw error;
    return ok(res, { cleared: true });
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── GET /notifications/config ─────────────────────────────────────────────────

router.get('/config', async (req, res) => {
  try {
    const wid = getWid(req);
    if (!wid) return fail(res, 'workspaceId required', 400);

    const { data, error } = await supabase
      .from('task_aging_config')
      .select('*')
      .eq('workspace_id', wid)
      .maybeSingle();

    if (error) throw error;
    return ok(res, data);
  } catch (err) {
    return fail(res, err.message);
  }
});

// ── PATCH /notifications/config ───────────────────────────────────────────────

router.patch('/config', async (req, res) => {
  try {
    const wid    = getWid(req);
    const userId = req.user?.id;
    if (!wid || !userId) return fail(res, 'Unauthorized', 401);

    const allowed = [
      'overdue_alert_days', 'stale_todo_days', 'stale_in_progress_days',
      'no_activity_days', 'notify_assignee', 'notify_manager',
      'notify_workspace_admin', 'channel_in_app', 'channel_email',
    ];

    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (!Object.keys(patch).length) return fail(res, 'Nothing to update', 400);
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('task_aging_config')
      .upsert({ workspace_id: wid, ...patch }, { onConflict: 'workspace_id' })
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (err) {
    return fail(res, err.message);
  }
});

module.exports = router;
