const logger = require('../config/logger');
const { safeError } = require('../utils/safeError');
require('dotenv').config();

const { scoreTask } = require('../services/kpi/kpiScoring');

const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');
const { scopeQuery, tenantStamp } = require('../middleware/tenantScope');
const {
  getTaskAssignedEmail,
  getHighPriorityAlertEmail,
  getTaskDoneEmail,
  getAdminTaskAlertEmail,
} = require('../templates/taskEmailTemplate');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'];

const TASK_STATUS_LABELS = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  blocked:     'Blocked',
  done:        'Done',
  cancelled:   'Cancelled',
};

const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const TASK_PRIORITY_LABELS = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
};

// ─── NODEMAILER TRANSPORTER ───────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

function isPastDue(date) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

/**
 * Send task-related emails.
 * Fires assignee email + admin alert in parallel.
 * Never throws — logs errors instead so the API response is never blocked.
 */
async function sendTaskEmails({ type, assigneeEmail, assigneeName, adminEmail, taskData }) {
  const emailData = {
    assigneeName,
    assigneeEmail,
    taskTitle:   taskData.title,
    project:     taskData.project,
    priority:    taskData.priority,
    dueDate:     formatDate(taskData.dueDate),
    description: taskData.description,
    status:      TASK_STATUS_LABELS[taskData.status] || taskData.status,
  };

  const sends = [];

  // ── Assignee email ────────────────────────────────────────────────────────
  if (assigneeEmail) {
    const isUrgent     = ['critical', 'high'].includes(taskData.priority);
    const assigneeHtml = isUrgent
      ? getHighPriorityAlertEmail(emailData)
      : getTaskAssignedEmail(emailData);

    const subjectMap = {
      critical: `🚨 CRITICAL Task Assigned: ${taskData.title}`,
      high:     `⚠️ High Priority Task: ${taskData.title}`,
      medium:   `📋 New Task Assigned: ${taskData.title}`,
      low:      `📝 New Task Assigned: ${taskData.title}`,
    };

    sends.push(
      transporter.sendMail({
        from:    `"Hermes" <${process.env.SMTP_USER}>`,
        to:      assigneeEmail,
        subject: subjectMap[taskData.priority] || `New Task: ${taskData.title}`,
        html:    assigneeHtml,
      }).catch((err) => logger.error({ err: err }, '[tasks] Assignee email error:'))
    );
  }

  // ── Admin alert (critical/high only) ─────────────────────────────────────
  if (adminEmail && ['critical', 'high'].includes(taskData.priority)) {
    const adminHtml = getAdminTaskAlertEmail({
      ...emailData,
      adminNote: `This task was flagged as ${taskData.priority.toUpperCase()} priority and has been assigned to ${assigneeName || 'an unassigned member'}.`,
    });

    sends.push(
      transporter.sendMail({
        from:    `"Hermes" <${process.env.SMTP_USER}>`,
        to:      adminEmail,
        subject: `[Admin Alert] ${taskData.priority.toUpperCase()} Task Created: ${taskData.title}`,
        html:    adminHtml,
      }).catch((err) => logger.error({ err: err }, '[tasks] Admin email error:'))
    );
  }

  await Promise.allSettled(sends);
}

// ─── GET ALL TASKS ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { data: tasks, error } = await scopeQuery(
      supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          description,
          created_at,
          project:projects ( id, project_name ),
          assignee:users ( id, full_name, email )
        `)
        .order('created_at', { ascending: false }),
      req
    );

    if (error) throw error;

    const mapped = tasks.map((t) => ({
      id:         t.id,
      title:      t.title,
      status:     t.status,
      priority:   t.priority,
      dueDate:    t.due_date,
      notes:      t.description,
      created:    t.created_at,
      projectId:  t.project?.id              || null,
      project:    t.project?.project_name    || 'No Project',
      assigneeId: t.assignee?.id             || null,
      assignee:   t.assignee?.full_name || t.assignee?.email || 'Unassigned',
      activities: [],
      subtasks:   [],
    }));

    res.json({ tasks: mapped });
  } catch (err) {
    logger.error({ err: err }, '[tasks] GET / error:');
    res.status(500).json({ error: safeError(err, 'Failed to fetch tasks') });
  }
});

// ─── GET SINGLE TASK ──────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await scopeQuery(
      supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          description,
          created_at,
          project:projects ( id, project_name ),
          assignee:users ( id, full_name, email )
        `)
        .eq('id', id),
      req
    ).single();

    if (error) throw error;
    if (!task)  return res.status(404).json({ error: 'Task not found' });

    const { data: activities } = await supabase
      .from('task_activities')
      .select('id, type, note, user, created_at')
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    const { data: subtasks } = await supabase
      .from('task_subtasks')
      .select('id, title, done')
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    res.json({
      task: {
        id:         task.id,
        title:      task.title,
        status:     task.status,
        priority:   task.priority,
        dueDate:    task.due_date,
        notes:      task.description,
        created:    task.created_at,
        projectId:  task.project?.id           || null,
        project:    task.project?.project_name || 'No Project',
        assigneeId: task.assignee?.id          || null,
        assignee:   task.assignee?.full_name || task.assignee?.email || 'Unassigned',
        activities: (activities || []).map((a) => ({
          id:   a.id,
          type: a.type,
          note: a.note,
          user: a.user,
          date: a.created_at,
        })),
        subtasks: subtasks || [],
      },
    });
  } catch (err) {
    logger.error({ err: err }, '[tasks] GET /:id error:');
    res.status(500).json({ error: safeError(err, 'Failed to fetch task') });
  }
});

// ─── CREATE TASK ──────────────────────────────────────────────────────────────

router.post('/create', async (req, res) => {
  try {
    const {
      title,
      projectId,
      assignedTo,
      status      = 'todo',
      priority    = 'medium',
      dueDate,
      description = '',
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Task title is required.' });
    if (!projectId)     return res.status(400).json({ error: 'Project is required.' });

    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert(tenantStamp(req, {
        title:       title.trim(),
        project_id:  projectId,
        assigned_to: assignedTo || null,
        status,
        priority,
        due_date:    dueDate    || null,
        description: description.trim(),
      }))
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        description,
        created_at,
        project:projects ( id, project_name ),
        assignee:users ( id, full_name, email )
      `)
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('task_activities').insert({
      task_id: task.id,
      type:    'created',
      note:    `Task "${task.title}" was created.`,
      user:    'System',
    }).catch((err) => logger.error({ err: err }, '[tasks] Activity log error:'));

    // Send emails
    if (assignedTo) {
      await sendTaskEmails({
        type:          'task-assigned',
        assigneeEmail: task.assignee?.email     || null,
        assigneeName:  task.assignee?.full_name || task.assignee?.email || 'Team Member',
        adminEmail:    process.env.ADMIN_EMAIL  || null,
        taskData: {
          title:       task.title,
          project:     task.project?.project_name || 'No Project',
          priority:    task.priority,
          dueDate:     task.due_date,
          description: task.description,
          status:      task.status,
        },
      });
    }

    res.status(201).json({
      task: {
        id:         task.id,
        title:      task.title,
        status:     task.status,
        priority:   task.priority,
        dueDate:    task.due_date,
        notes:      task.description,
        created:    task.created_at,
        projectId:  task.project?.id           || null,
        project:    task.project?.project_name || 'No Project',
        assigneeId: task.assignee?.id          || null,
        assignee:   task.assignee?.full_name || task.assignee?.email || 'Unassigned',
        activities: [],
        subtasks:   [],
      },
    });
  } catch (err) {
    logger.error({ err: err }, '[tasks] POST /create error:');
    res.status(500).json({ error: safeError(err, 'Failed to create task') });
  }
});

// ─── UPDATE TASK ──────────────────────────────────────────────────────────────

router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      projectId,
      assignedTo,
      status,
      priority,
      dueDate,
      description,
    } = req.body;

    // Fetch existing to detect changes (scoped — 404 for other tenants' tasks)
    const { data: existing, error: fetchError } = await scopeQuery(
      supabase
        .from('tasks')
        .select('*, assignee:users ( id, full_name, email )')
        .eq('id', id),
      req
    ).single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Task not found' });

    const updates = {};
    if (title       !== undefined) updates.title       = title.trim();
    if (projectId   !== undefined) updates.project_id  = projectId;
    if (assignedTo  !== undefined) updates.assigned_to = assignedTo || null;
    if (status      !== undefined) updates.status      = status;
    if (priority    !== undefined) updates.priority    = priority;
    if (dueDate     !== undefined) updates.due_date    = dueDate    || null;
    if (description !== undefined) updates.description = description.trim();

    // KPI tracking: stamp timestamps and track reopens
    if (status === 'done' && existing.status !== 'done') {
      updates.completed_at = new Date().toISOString();
    }
    if (status === 'in_progress' && existing.status === 'todo') {
      updates.started_at = updates.started_at || new Date().toISOString();
    }
    // Reopen: task going back to todo/in_progress from done/in_review
    const reopenStatuses = new Set(['todo', 'in_progress']);
    const closedStatuses = new Set(['done', 'in_review']);
    if (status && reopenStatuses.has(status) && closedStatuses.has(existing.status)) {
      updates.reopen_count = (existing.reopen_count || 0) + 1;
    }

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        description,
        created_at,
        project:projects ( id, project_name ),
        assignee:users ( id, full_name, email )
      `)
      .single();

    if (updateError) throw updateError;

    // Log activity
    const changes = Object.keys(updates).map((k) => k.replace(/_/g, ' ')).join(', ');
    await supabase.from('task_activities').insert({
      task_id: id,
      type:    'updated',
      note:    `Task updated: ${changes}.`,
      user:    'System',
    }).catch((err) => logger.error({ err: err }, '[tasks] Activity log error:'));

    // KPI scoring on status → done (fire-and-forget)
    const wid = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (wid && status === 'done' && existing.status !== 'done') {
      scoreTask(id, wid).catch((err) => logger.error({ err }, '[tasks] KPI scoreTask error'));
    }

    // Send emails on reassignment or priority escalation
    const assigneeChanged = assignedTo !== undefined && assignedTo !== existing.assigned_to;
    const priorityChanged = priority   !== undefined && priority   !== existing.priority;
    const isUrgentNow     = ['critical', 'high'].includes(priority || existing.priority);

    if (assigneeChanged || (priorityChanged && isUrgentNow)) {
      await sendTaskEmails({
        type:          assigneeChanged ? 'task-assigned' : 'high-priority-alert',
        assigneeEmail: task.assignee?.email     || null,
        assigneeName:  task.assignee?.full_name || task.assignee?.email || 'Team Member',
        adminEmail:    process.env.ADMIN_EMAIL  || null,
        taskData: {
          title:       task.title,
          project:     task.project?.project_name || 'No Project',
          priority:    task.priority,
          dueDate:     task.due_date,
          description: task.description,
          status:      task.status,
        },
      });
    }

    res.json({
      task: {
        id:         task.id,
        title:      task.title,
        status:     task.status,
        priority:   task.priority,
        dueDate:    task.due_date,
        notes:      task.description,
        created:    task.created_at,
        projectId:  task.project?.id           || null,
        project:    task.project?.project_name || 'No Project',
        assigneeId: task.assignee?.id          || null,
        assignee:   task.assignee?.full_name || task.assignee?.email || 'Unassigned',
      },
    });
  } catch (err) {
    logger.error({ err: err }, '[tasks] PUT /update/:id error:');
    res.status(500).json({ error: safeError(err, 'Failed to update task') });
  }
});

// ─── MARK TASK DONE ───────────────────────────────────────────────────────────

router.patch('/done/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await scopeQuery(
      supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', id),
      req
    )
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        description,
        created_at,
        project:projects ( id, project_name ),
        assignee:users ( id, full_name, email )
      `)
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('task_activities').insert({
      task_id: id,
      type:    'completed',
      note:    `Task "${task.title}" was marked as done.`,
      user:    'System',
    }).catch((err) => logger.error({ err: err }, '[tasks] Activity log error:'));

    // KPI scoring — fire-and-forget (Tier 1 real-time)
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
    if (workspaceId) {
      // Stamp completed_at before scoring
      await supabase.from('tasks').update({ completed_at: new Date().toISOString() }).eq('id', id).catch(() => {});
      scoreTask(id, workspaceId).catch((err) => logger.error({ err }, '[tasks] KPI scoreTask error'));
    }

    // Completion email
    if (task.assignee?.email) {
      const doneHtml = getTaskDoneEmail({
        assigneeName:  task.assignee.full_name || task.assignee.email,
        assigneeEmail: task.assignee.email,
        taskTitle:     task.title,
        project:       task.project?.project_name || 'No Project',
        priority:      task.priority,
        dueDate:       formatDate(task.due_date),
        status:        'Done',
      });

      transporter.sendMail({
        from:    `"Hermes" <${process.env.SMTP_USER}>`,
        to:      task.assignee.email,
        subject: `✅ Task Completed: ${task.title}`,
        html:    doneHtml,
      }).catch((err) => logger.error({ err: err }, '[tasks] Done email error:'));
    }

    res.json({
      task: {
        id:         task.id,
        title:      task.title,
        status:     task.status,
        priority:   task.priority,
        dueDate:    task.due_date,
        notes:      task.description,
        created:    task.created_at,
        projectId:  task.project?.id           || null,
        project:    task.project?.project_name || 'No Project',
        assigneeId: task.assignee?.id          || null,
        assignee:   task.assignee?.full_name || task.assignee?.email || 'Unassigned',
      },
    });
  } catch (err) {
    logger.error({ err: err }, '[tasks] PATCH /done/:id error:');
    res.status(500).json({ error: safeError(err, 'Failed to mark task as done') });
  }
});

// ─── ADD NOTE / ACTIVITY ──────────────────────────────────────────────────────

router.post('/:id/notes', async (req, res) => {
  try {
    const { id }               = req.params;
    const { note, user = 'Admin' } = req.body;

    if (!note?.trim()) return res.status(400).json({ error: 'Note cannot be empty.' });

    // Verify the task belongs to this workspace before attaching activity to it
    const { data: owner } = await scopeQuery(
      supabase.from('tasks').select('id').eq('id', id),
      req
    ).maybeSingle();

    if (!owner) return res.status(404).json({ error: 'Task not found' });

    const { data: activity, error } = await supabase
      .from('task_activities')
      .insert({ task_id: id, type: 'note', note: note.trim(), user })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      activity: {
        id:   activity.id,
        type: activity.type,
        note: activity.note,
        user: activity.user,
        date: activity.created_at,
      },
    });
  } catch (err) {
    logger.error({ err: err }, '[tasks] POST /:id/notes error:');
    res.status(500).json({ error: safeError(err, 'Failed to add note') });
  }
});

// ─── DELETE TASK ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await scopeQuery(
      supabase.from('tasks').delete().eq('id', id),
      req
    );
    if (error) throw error;

    res.json({ success: true, id });
  } catch (err) {
    logger.error({ err: err }, '[tasks] DELETE /:id error:');
    res.status(500).json({ error: safeError(err, 'Failed to delete task') });
  }
});

// ─── GET FORM OPTIONS (projects + assignees) ──────────────────────────────────

router.get('/options/form', async (req, res) => {
  try {
    const wsId = req.workspaceId;

    // Assignees must be limited to members of the active workspace so one
    // tenant can't enumerate another tenant's users. Admins with no workspace
    // selected keep the full directory (platform-wide owner view).
    let assigneeQuery = supabase
      .from('users')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });

    if (wsId) {
      const { data: members, error: mErr } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', wsId);

      if (mErr) throw mErr;

      const memberIds = (members || []).map((m) => m.user_id).filter(Boolean);
      // No members → no assignees (never fall back to the global list).
      assigneeQuery = assigneeQuery.in('id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);
    }

    const [
      { data: projects, error: pErr },
      { data: assignees, error: aErr },
    ] = await Promise.all([
      scopeQuery(
        supabase.from('projects').select('id, project_name').order('project_name', { ascending: true }),
        req
      ),
      assigneeQuery,
    ]);

    if (pErr) throw pErr;
    if (aErr) throw aErr;

    res.json({ projects: projects || [], assignees: assignees || [] });
  } catch (err) {
    logger.error({ err: err }, '[tasks] GET /options/form error:');
    res.status(500).json({ error: safeError(err, 'Failed to fetch form options') });
  }
});

module.exports = router;