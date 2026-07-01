'use strict';

const logger = require('../config/logger');
const { supabase } = require('../config/supabase');

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function dedupKey(taskId, type) {
  return `${taskId}:${type}:${isoWeek()}`;
}

function daysSince(isoString) {
  if (!isoString) return null;
  return (Date.now() - new Date(isoString).getTime()) / 86400000;
}

function daysPastDue(dueDateIso) {
  if (!dueDateIso) return null;
  const diff = (Date.now() - new Date(dueDateIso).getTime()) / 86400000;
  return diff > 0 ? diff : null;
}

// ── Notification builder ──────────────────────────────────────────────────────

function buildNotification(workspaceId, userId, task, type, priority, extra = {}) {
  const taskPath = `/Admin/Tasks?task=${task.id}`;
  const messages = {
    task_overdue: {
      title: `Overdue: "${task.title}"`,
      body: `This task was due on ${task.due_date?.split('T')[0] || 'unknown'} and is still not completed.`,
    },
    task_stale_todo: {
      title: `Task stuck in To-Do: "${task.title}"`,
      body: `This task has been in "To Do" status for ${Math.floor(extra.days || 0)} days without any update.`,
    },
    task_stale_in_progress: {
      title: `No progress on: "${task.title}"`,
      body: `This task has been "In Progress" for ${Math.floor(extra.days || 0)} days with no recent activity.`,
    },
    task_no_activity: {
      title: `No activity on: "${task.title}"`,
      body: `This task has had no updates for ${Math.floor(extra.days || 0)} days.`,
    },
    task_due_soon: {
      title: `Due soon: "${task.title}"`,
      body: `This task is due in ${Math.ceil(extra.daysUntil || 1)} day(s).`,
    },
  };

  const { title, body } = messages[type] || { title: type, body: '' };

  return {
    workspace_id: workspaceId,
    user_id:      userId,
    type,
    priority,
    title,
    body,
    link:         taskPath,
    task_id:      task.id,
    task_title:   task.title,
    assignee_id:  task.assigned_to || task.primary_assignee_id || null,
    dedup_key:    dedupKey(task.id, type),
  };
}

// ── Core scan ─────────────────────────────────────────────────────────────────

async function scanWorkspace(workspaceId, config) {
  const {
    overdue_alert_days      = 0,
    stale_todo_days         = 3,
    stale_in_progress_days  = 5,
    no_activity_days        = 7,
    notify_assignee         = true,
    notify_manager          = true,
  } = config;

  // Fetch non-done tasks for this workspace
  const { data: tasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, updated_at, created_at, assigned_to, primary_assignee_id, workspace_id, project_id')
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("done","cancelled","archived")')
    .order('updated_at', { ascending: true });

  if (tasksErr) throw tasksErr;
  if (!tasks?.length) return 0;

  const notifications = [];

  for (const task of tasks) {
    const sinceUpdate  = daysSince(task.updated_at || task.created_at);
    const sinceCreated = daysSince(task.created_at);
    const pastDue      = daysPastDue(task.due_date);
    const assigneeId   = task.primary_assignee_id || task.assigned_to;

    if (!assigneeId && !notify_manager) continue;

    // Determine notification recipients
    const recipients = new Set();
    if (notify_assignee && assigneeId) recipients.add(assigneeId);

    // Manager lookup — get workspace admin/manager role members
    if (notify_manager) {
      const { data: managers } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .in('role', ['admin', 'manager', 'owner'])
        .limit(5);
      (managers || []).forEach(m => recipients.add(m.user_id));
    }

    if (!recipients.size) continue;

    // ── Rule 1: Overdue ───────────────────────────────────────────────────────
    if (overdue_alert_days >= 0 && pastDue !== null && pastDue >= overdue_alert_days) {
      const priority = pastDue >= 7 ? 'critical' : pastDue >= 3 ? 'high' : 'medium';
      for (const uid of recipients) {
        notifications.push(buildNotification(workspaceId, uid, task, 'task_overdue', priority));
      }
    }

    // ── Rule 2: Stale todo ────────────────────────────────────────────────────
    if (stale_todo_days > 0 && task.status === 'todo' && sinceCreated >= stale_todo_days) {
      const priority = sinceCreated >= stale_todo_days * 3 ? 'high' : 'medium';
      for (const uid of recipients) {
        notifications.push(buildNotification(workspaceId, uid, task, 'task_stale_todo', priority, { days: sinceCreated }));
      }
    }

    // ── Rule 3: Stale in_progress ─────────────────────────────────────────────
    if (stale_in_progress_days > 0 && task.status === 'in_progress' && sinceUpdate >= stale_in_progress_days) {
      const priority = sinceUpdate >= stale_in_progress_days * 2 ? 'high' : 'medium';
      for (const uid of recipients) {
        notifications.push(buildNotification(workspaceId, uid, task, 'task_stale_in_progress', priority, { days: sinceUpdate }));
      }
    }

    // ── Rule 4: General no-activity ───────────────────────────────────────────
    if (no_activity_days > 0 && sinceUpdate >= no_activity_days &&
        task.status !== 'todo'   /* todo has its own rule */) {
      for (const uid of recipients) {
        notifications.push(buildNotification(workspaceId, uid, task, 'task_no_activity', 'medium', { days: sinceUpdate }));
      }
    }

    // ── Rule 5: Due soon (within 1 day, only if not yet overdue) ─────────────
    if (task.due_date && pastDue === null) {
      const daysUntil = (new Date(task.due_date).getTime() - Date.now()) / 86400000;
      if (daysUntil <= 1) {
        for (const uid of recipients) {
          notifications.push(buildNotification(workspaceId, uid, task, 'task_due_soon', 'high', { daysUntil }));
        }
      }
    }
  }

  if (!notifications.length) return 0;

  // Bulk upsert — dedup_key UNIQUE constraint silently skips duplicates
  const { error: insertErr } = await supabase
    .from('task_notifications')
    .upsert(notifications, { onConflict: 'dedup_key', ignoreDuplicates: true });

  if (insertErr) throw insertErr;
  return notifications.length;
}

// ── Full workspace scan (called by cron) ─────────────────────────────────────

async function runAgingScan() {
  const startTime = Date.now();
  logger.info('[aging] Starting task aging scan');

  // Get all workspaces with their config
  const { data: configs, error: cfgErr } = await supabase
    .from('task_aging_config')
    .select('*');

  if (cfgErr) {
    logger.error({ err: cfgErr }, '[aging] Failed to fetch aging configs');
    return;
  }

  let totalCreated = 0;
  let totalScanned = 0;

  for (const cfg of (configs || [])) {
    const t0 = Date.now();
    try {
      // Count tasks for scan log
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', cfg.workspace_id)
        .not('status', 'in', '("done","cancelled","archived")');

      const created = await scanWorkspace(cfg.workspace_id, cfg);
      totalScanned += count || 0;
      totalCreated += created;

      await supabase.from('task_aging_scan_log').insert({
        workspace_id:          cfg.workspace_id,
        tasks_scanned:         count || 0,
        notifications_created: created,
        duration_ms:           Date.now() - t0,
      });
    } catch (err) {
      logger.error({ err, workspaceId: cfg.workspace_id }, '[aging] Scan error for workspace');
      await supabase.from('task_aging_scan_log').insert({
        workspace_id: cfg.workspace_id,
        error:        String(err.message),
        duration_ms:  Date.now() - t0,
      }).catch(() => {});
    }
  }

  logger.info({ totalScanned, totalCreated, ms: Date.now() - startTime }, '[aging] Scan complete');
}

module.exports = { runAgingScan, scanWorkspace };
