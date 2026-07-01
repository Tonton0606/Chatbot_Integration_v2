const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');
const { scopeQuery, tenantStamp } = require('../middleware/tenantScope');

const router = express.Router();

// Get all saved reports
router.get('/', async (req, res) => {
  try {
    const { created_by, is_public } = req.query;

    let query = scopeQuery(
      supabase
        .from('saved_reports')
        .select('*, created_by:auth.users(email)')
        .order('created_at', { ascending: false }),
      req
    );

    if (created_by) query = query.eq('created_by', created_by);
    if (is_public) query = query.eq('is_public', is_public === 'true');
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching reports:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create report
router.post('/', async (req, res) => {
  try {
    const { name, description, report_type, filters, schedule, created_by, is_public } = req.body;
    
    const { data, error } = await supabase
      .from('saved_reports')
      .insert([tenantStamp(req, { name, description, report_type, filters, schedule, created_by, is_public })])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error creating report:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Run report and get data
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
    
    // Get report configuration (scoped — can't run another tenant's report)
    const { data: report, error: reportError } = await scopeQuery(
      supabase.from('saved_reports').select('*').eq('id', id),
      req
    ).single();

    if (reportError) throw reportError;

    // Run the report based on type — generators are workspace-scoped via req
    let reportData = {};

    switch (report.report_type) {
      case 'sales':
        reportData = await generateSalesReport(req, start_date, end_date, report.filters);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(req, start_date, end_date, report.filters);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(req, start_date, end_date, report.filters);
        break;
      default:
        reportData = await generateCustomReport(req, start_date, end_date, report.filters);
    }

    // Update last run info (scoped)
    await scopeQuery(
      supabase
        .from('saved_reports')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_result: reportData
        })
        .eq('id', id),
      req
    );
    
    res.json({ success: true, data: reportData });
  } catch (error) {
    logger.error({ err: error }, 'Error running report:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Export report
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format, created_by } = req.body;
    
    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('report_exports')
      .insert([tenantStamp(req, { report_id: id, format, created_by, status: 'processing' })])
      .select()
      .single();

    if (exportError) throw exportError;

    // Run report to get data (scoped — can't export another tenant's report)
    const { data: report } = await scopeQuery(
      supabase.from('saved_reports').select('*').eq('id', id),
      req
    ).single();
    
    // Generate file based on format (simplified)
    const fileData = await generateExportFile(report, format);
    
    // Update export record
    const { data: updated, error: updateError } = await supabase
      .from('report_exports')
      .update({
        status: 'completed',
        file_url: fileData.url,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportRecord.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, 'Error exporting report:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await scopeQuery(
      supabase.from('saved_reports').delete().eq('id', id),
      req
    );

    if (error) throw error;
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting report:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Helper functions for report generation
async function generateExportFile(report, format) {
  // Simplified export - in production, this would generate actual files
  // For now, return a mock URL
  return {
    url: `/exports/report_${report.id}_${Date.now()}.${format}`
  };
}

async function generateSalesReport(req, startDate, endDate, filters) {
  const { data: deals, error } = await scopeQuery(
    supabase
      .from('deals')
      .select('*, client:clients(name), assigned_to:team_members(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    req
  );
  
  if (error) throw error;
  
  return {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
    wonDeals: deals.filter(d => d.status === 'closed_won').length,
    wonValue: deals.filter(d => d.status === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0),
    lostDeals: deals.filter(d => d.status === 'closed_lost').length,
    avgDealSize: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
    dealsByStage: deals.reduce((acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    }, {}),
    deals
  };
}

async function generateRevenueReport(req, startDate, endDate, filters) {
  const { data: revenue, error } = await scopeQuery(
    supabase
      .from('revenue_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate),
    req
  );
  
  if (error) throw error;
  
  return {
    totalRevenue: revenue.reduce((sum, r) => sum + Number(r.amount), 0),
    bySource: revenue.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + Number(r.amount);
      return acc;
    }, {}),
    byCategory: revenue.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + Number(r.amount);
      return acc;
    }, {}),
    byMonth: revenue.reduce((acc, r) => {
      const month = r.date.substring(0, 7);
      acc[month] = (acc[month] || 0) + Number(r.amount);
      return acc;
    }, {}),
    entries: revenue
  };
}

async function generatePerformanceReport(req, startDate, endDate, filters) {
  const { data: teamMembers, error } = await scopeQuery(
    supabase
      .from('team_members')
      .select('*, deals:deals!deals_assigned_to_fkey(*)'),
    req
  );
  
  if (error) throw error;
  
  return {
    teamPerformance: (teamMembers || []).map(member => {
      const deals = member.deals || [];
      return {
      id: member.id,
      name: member.name,
      totalDeals: deals.length,
      wonDeals: deals.filter(d => d.status === 'closed_won').length,
      totalRevenue: deals
        .filter(d => d.status === 'closed_won')
        .reduce((sum, d) => sum + (d.value || 0), 0),
      conversionRate: deals.length > 0
        ? (deals.filter(d => d.status === 'closed_won').length / deals.length) * 100
        : 0
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  };
}

async function generateCustomReport(req, startDate, endDate, filters) {
  // Generic report that combines multiple data sources (all workspace-scoped)
  const [deals, revenue, tasks] = await Promise.all([
    scopeQuery(supabase.from('deals').select('*').gte('created_at', startDate).lte('created_at', endDate), req),
    scopeQuery(supabase.from('revenue_entries').select('*').gte('date', startDate).lte('date', endDate), req),
    scopeQuery(supabase.from('tasks').select('*').gte('created_at', startDate).lte('created_at', endDate), req)
  ]);
  
  return {
    deals: deals.data || [],
    revenue: revenue.data || [],
    tasks: tasks.data || [],
    summary: {
      totalDeals: deals.data?.length || 0,
      totalRevenue: revenue.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      totalTasks: tasks.data?.length || 0,
      completedTasks: tasks.data?.filter(t => t.status === 'done').length || 0
    }
  };
}

module.exports = router;
