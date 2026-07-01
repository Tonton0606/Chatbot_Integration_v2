/**
 * Workflow Automation Routes
 * CRUD for workflow rules and execution history
 * Triggers → Actions pipeline
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const { supabase } = require('../config/supabase');
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────

function getWorkspaceId(req) {
  return req.headers['x-workspace-id'] || req.query.workspaceId;
}

function evaluateCondition(value, op, expected) {
  switch (op) {
    case 'eq': return value === expected;
    case 'neq': return value !== expected;
    case 'gt': return Number(value) > Number(expected);
    case 'lt': return Number(value) < Number(expected);
    case 'in': return Array.isArray(expected) && expected.includes(value);
    case 'contains': return String(value).toLowerCase().includes(String(expected).toLowerCase());
    default: return true;
  }
}

function matchesConditions(data, conditions) {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  for (const [field, cond] of Object.entries(conditions)) {
    const value = data[field];
    if (!evaluateCondition(value, cond.op || 'eq', cond.value)) return false;
  }
  return true;
}

// ── Execute a workflow action ───────────────────────────────

async function executeAction(rule, triggerData) {
  const config = rule.action_config;

  switch (rule.action_type) {
    case 'send_email': {
      const to = config.to || triggerData.email || triggerData.customer_email;
      if (!to) throw new Error('No email recipient');
      
      const subject = (config.subject || 'Workflow Notification')
        .replace(/\{\{(\w+)\}\}/g, (_, key) => triggerData[key] || '');
      const html = (config.body || 'No content')
        .replace(/\{\{(\w+)\}\}/g, (_, key) => triggerData[key] || '');
      
      return await sendEmail({ to, subject, html });
    }

    case 'send_notification': {
      // Store notification in workspace
      const { error } = await supabase.from('workflow_notifications').insert({
        workspace_id: rule.workspace_id,
        title: config.title || 'Workflow Alert',
        message: (config.message || 'Event occurred')
          .replace(/\{\{(\w+)\}\}/g, (_, key) => triggerData[key] || ''),
        is_read: false,
        trigger_event: rule.trigger_event,
        trigger_module: rule.trigger_module,
      });
      if (error) throw error;
      return { success: true };
    }

    case 'update_record': {
      const { table, record_field, record_value, updates } = config;
      if (!table || !updates) throw new Error('Invalid update_record config');
      const query = supabase.from(table).update(updates);
      if (record_field && record_value) {
        query.eq(record_field, record_value);
      }
      const { error } = await query;
      if (error) throw error;
      return { success: true };
    }

    case 'create_task': {
      const { data, error } = await supabase.from('tasks').insert({
        workspace_id: rule.workspace_id,
        title: (config.title || 'Workflow Task')
          .replace(/\{\{(\w+)\}\}/g, (_, key) => triggerData[key] || ''),
        description: (config.description || '')
          .replace(/\{\{(\w+)\}\}/g, (_, key) => triggerData[key] || ''),
        priority: config.priority || 'medium',
        status: 'pending',
        assigned_to: config.assigned_to || null,
        due_date: config.due_date || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return { data };
    }

    case 'webhook': {
      if (!config.url) throw new Error('No webhook URL');
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
        body: JSON.stringify({ event: rule.trigger_event, data: triggerData }),
      });
      return { status: response.status, ok: response.ok };
    }

    default:
      throw new Error(`Unknown action type: ${rule.action_type}`);
  }
}

// ── CRUD: Workflow Rules ────────────────────────────────────

// Specific GET routes MUST be declared before /:id to avoid being shadowed

// ── Execution History ───────────────────────────────────────

router.get('/executions', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabase
      .from('workflow_executions')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.json({ success: true, data, total: count });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Templates: Get available trigger/action definitions ─────

router.get('/templates', (_req, res) => {
  const templates = {
    triggers: [
      { module: 'invoicing', events: ['created', 'sent', 'paid', 'overdue', 'cancelled'] },
      { module: 'bookings', events: ['created', 'approved', 'rejected', 'rescheduled', 'cancelled'] },
      { module: 'deals', events: ['created', 'stage_changed', 'won', 'lost', 'closed'] },
      { module: 'contacts', events: ['created', 'updated'] },
      { module: 'tasks', events: ['created', 'completed', 'overdue', 'assigned'] },
      { module: 'payments', events: ['received', 'overdue', 'refunded', 'paid', 'cod_confirmed', 'cod_delivered', 'cod_failed'] },
      { module: 'expenses', events: ['created', 'approved', 'rejected'] },
      { module: 'quotes', events: ['created', 'sent', 'accepted', 'rejected', 'expired'] },
      // New triggers
      { module: 'leads', events: ['created', 'converted', 'scored', 'no_reply_24h', 'no_reply_48h'] },
      { module: 'inventory', events: ['low_stock', 'out_of_stock', 'restock', 'item_created', 'item_updated'] },
      { module: 'delivery', events: ['created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'] },
      { module: 'facebook', events: ['message_received', 'lead_captured', 'handoff_requested', 'conversation_resolved'] },
    ],
    actions: [
      { type: 'send_email', label: 'Send Email', config: { to: 'recipient email (or {{email}})', subject: 'Subject template (supports {{var}})', body: 'HTML body template' } },
      { type: 'send_notification', label: 'Send In-App Notification', config: { title: 'Notification title', message: 'Notification message' } },
      { type: 'update_record', label: 'Update Record', config: { table: 'table name', updates: { field: 'value' } } },
      { type: 'create_task', label: 'Create Task', config: { title: 'Task title', description: 'Task description', priority: 'low|medium|high', assigned_to: 'user id' } },
      { type: 'webhook', label: 'Webhook', config: { url: 'URL to POST to', method: 'POST|PUT|PATCH' } },
    ],
    conditions:
      'Used in trigger_conditions: { field: "status", op: "eq|neq|gt|lt|in|contains", value: "the_value" }',
  };
  return res.json({ success: true, data: templates });
});

// List all rules for workspace
router.get('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { data, error } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// Get single rule
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { data, error } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// Create workflow rule
router.post('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { name, description, is_active, trigger_module, trigger_event, trigger_conditions, action_type, action_config } = req.body;
    if (!name || !trigger_module || !trigger_event || !action_type || !action_config) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('workflow_rules')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        is_active: is_active !== false,
        trigger_module,
        trigger_event,
        trigger_conditions: trigger_conditions || {},
        action_type,
        action_config,
        created_by: req.user?.id || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// Update workflow rule
router.patch('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const updates = {};
    const allowed = ['name', 'description', 'is_active', 'trigger_module', 'trigger_event', 'trigger_conditions', 'action_type', 'action_config'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workflow_rules')
      .update(updates)
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// Delete workflow rule
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const { error } = await supabase
      .from('workflow_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

// ── Trigger: Fire a workflow event ─────────────────────────

router.post('/trigger', async (req, res) => {
  try {
    const { trigger_module, trigger_event, trigger_data } = req.body;
    if (!trigger_module || !trigger_event) {
      return res.status(400).json({ error: 'trigger_module and trigger_event required' });
    }

    const workspaceId = getWorkspaceId(req) || trigger_data?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    // Find active rules matching the trigger
    const { data: rules, error: rulesError } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('trigger_module', trigger_module)
      .eq('trigger_event', trigger_event)
      .eq('is_active', true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return res.json({ success: true, message: 'No matching rules', executed: 0 });
    }

    logger.info({ workspaceId, module: trigger_module, event: trigger_event, ruleCount: rules.length }, 'workflow trigger fired');

    // Evaluate conditions and execute actions
    const results = [];
    for (const rule of rules) {
      if (!matchesConditions(trigger_data, rule.trigger_conditions)) {
        results.push({ rule: rule.name, skipped: true, reason: 'condition not met' });
        continue;
      }

      try {
        const execResult = await executeAction(rule, trigger_data);
        logger.info({ ruleId: rule.id, ruleName: rule.name }, 'workflow action executed');
        
        // Update execution counter
        await supabase
          .from('workflow_rules')
          .update({
            execution_count: (rule.execution_count || 0) + 1,
            last_executed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', rule.id);

        // Log execution
        await supabase.from('workflow_executions').insert({
          rule_id: rule.id,
          workspace_id: workspaceId,
          trigger_event: `${trigger_module}.${trigger_event}`,
          trigger_record_id: trigger_data?.id || null,
          trigger_data,
          status: 'completed',
          result: execResult,
          completed_at: new Date().toISOString(),
        });

        results.push({ rule: rule.name, success: true, result: execResult });
      } catch (actionError) {
        // Log failure
        await supabase
          .from('workflow_rules')
          .update({ last_error: actionError.message })
          .eq('id', rule.id);

        await supabase.from('workflow_executions').insert({
          rule_id: rule.id,
          workspace_id: workspaceId,
          trigger_event: `${trigger_module}.${trigger_event}`,
          trigger_record_id: trigger_data?.id || null,
          trigger_data,
          status: 'failed',
          error_message: actionError.message,
          completed_at: new Date().toISOString(),
        });

        results.push({ rule: rule.name, success: false, error: actionError.message });
      }
    }

    return res.json({ success: true, executed: results.length, results });
  } catch (err) {
    return res.status(500).json({ error: safeError(err) });
  }
});

module.exports = router;