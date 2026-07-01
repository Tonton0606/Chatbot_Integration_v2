const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');
const { scopeQuery, tenantStamp } = require('../middleware/tenantScope');

const router = express.Router();

// Get audit logs with filters
router.get('/', async (req, res) => {
  try {
    const { 
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      severity,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;
    
    let query = scopeQuery(
      supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      req
    );

    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);
    if (resource_type) query = query.eq('resource_type', resource_type);
    if (resource_id) query = query.eq('resource_id', resource_id);
    if (severity) query = query.eq('severity', severity);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);
    
    const { data, count, error } = await query;
    
    if (error) throw error;
    res.json({ 
      success: true, 
      data,
      meta: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching audit logs:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get audit log statistics
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = scopeQuery(
      supabase
        .from('audit_logs')
        .select('action, resource_type, severity'),
      req
    );

    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      totalLogs: data.length,
      byAction: data.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      byResourceType: data.reduce((acc, log) => {
        acc[log.resource_type] = (acc[log.resource_type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: data.reduce((acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching audit stats:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create audit log entry
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      action,
      resource_type,
      resource_id,
      resource_name,
      old_values,
      new_values,
      metadata,
      severity
    } = req.body;
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([tenantStamp(req, {
        user_id,
        user_email,
        action,
        resource_type,
        resource_id,
        resource_name,
        old_values,
        new_values,
        metadata,
        severity,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error creating audit log:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get activity timeline for a specific resource
router.get('/timeline/:resource_type/:resource_id', async (req, res) => {
  try {
    const { resource_type, resource_id } = req.params;
    
    const { data, error } = await scopeQuery(
      supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resource_type)
        .eq('resource_id', resource_id)
        .order('created_at', { ascending: true }),
      req
    );
    
    if (error) throw error;
    
    // Build timeline with changes
    const timeline = data.map((log, index) => {
      const changes = [];
      
      if (log.old_values && log.new_values) {
        Object.keys(log.new_values).forEach(key => {
          if (log.old_values[key] !== log.new_values[key]) {
            changes.push({
              field: key,
              old: log.old_values[key],
              new: log.new_values[key]
            });
          }
        });
      }
      
      return {
        ...log,
        changes,
        isFirst: index === 0
      };
    });
    
    res.json({ success: true, data: timeline });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching timeline:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Export audit logs
router.post('/export', async (req, res) => {
  try {
    const { start_date, end_date, format = 'csv' } = req.body;
    
    let query = scopeQuery(
      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false }),
      req
    );

    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data, error } = await query;

    if (error) throw error;

    // Format data for export
    const exportData = data.map(log => ({
      timestamp: log.created_at,
      user_email: log.user_email,
      action: log.action,
      resource_type: log.resource_type,
      resource_name: log.resource_name,
      severity: log.severity,
      ip_address: log.ip_address
    }));
    
    res.json({
      success: true,
      data: exportData,
      meta: {
        total: exportData.length,
        format,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error exporting audit logs:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Middleware to automatically log actions
const auditMiddleware = (action, resourceType, getResourceId, getResourceName) => {
  return async (req, res, next) => {
    // Capture original json method
    const originalJson = res.json.bind(res);
    
    res.json = async (data) => {
      // Only log successful operations
      if (data.success) {
        try {
          await supabase.from('audit_logs').insert([tenantStamp(req, {
            user_id: req.user?.id,
            user_email: req.user?.email,
            action,
            resource_type: resourceType,
            resource_id: getResourceId ? getResourceId(req, data) : null,
            resource_name: getResourceName ? getResourceName(req, data) : null,
            metadata: {
              method: req.method,
              path: req.path,
              body: req.body
            },
            severity: 'info',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
          })]);
        } catch (err) {
          logger.error({ err: err }, 'Failed to create audit log:');
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = router;
module.exports.auditMiddleware = auditMiddleware;
