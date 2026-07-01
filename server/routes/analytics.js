const logger = require('../config/logger');
const express = require('express');
const { supabase } = require('../config/supabase.js');
const { scopeQuery, tenantStamp } = require('../middleware/tenantScope');

const router = express.Router();

// Track analytics event
router.post('/events', async (req, res) => {
  try {
    const { event_type, event_name, user_id, session_id, metadata, page_url, referrer_url } = req.body;
    
    const { data, error } = await supabase
      .from('analytics_events')
      .insert([tenantStamp(req, {
        event_type,
        event_name,
        user_id,
        session_id,
        metadata,
        page_url,
        referrer_url,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error tracking event:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get events in date range
    const { data: events, error } = await scopeQuery(
      supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false }),
      req
    );
    
    if (error) throw error;
    
    // Calculate metrics
    const metrics = {
      totalEvents: events.length,
      uniqueSessions: new Set(events.map(e => e.session_id)).size,
      uniqueUsers: new Set(events.filter(e => e.user_id).map(e => e.user_id)).size,
      eventsByType: {},
      eventsByDay: {},
      topPages: {}
    };
    
    events.forEach(event => {
      // Events by type
      metrics.eventsByType[event.event_type] = (metrics.eventsByType[event.event_type] || 0) + 1;
      
      // Events by day
      const day = event.timestamp.substring(0, 10);
      metrics.eventsByDay[day] = (metrics.eventsByDay[day] || 0) + 1;
      
      // Top pages
      if (event.page_url) {
        metrics.topPages[event.page_url] = (metrics.topPages[event.page_url] || 0) + 1;
      }
    });
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching analytics:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get pipeline analytics
router.get('/pipeline', async (req, res) => {
  try {
    // Get all deals with their stages
    const { data: deals, error: dealsError } = await scopeQuery(
      supabase.from('deals').select('*, stage:pipeline_stages(*)'),
      req
    );

    if (dealsError) throw dealsError;

    // Get pipeline stages
    const { data: stages, error: stagesError } = await scopeQuery(
      supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true }),
      req
    );
    
    if (stagesError) throw stagesError;
    
    // Calculate pipeline metrics
    const pipelineData = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage_id === stage.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      
      return {
        stage: stage.name,
        color: stage.color,
        probability: stage.probability,
        dealCount: stageDeals.length,
        totalValue: totalValue,
        weightedValue: totalValue * (stage.probability / 100),
        deals: stageDeals
      };
    });
    
    const totals = {
      totalDeals: deals.length,
      totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
      weightedValue: pipelineData.reduce((sum, s) => sum + s.weightedValue, 0),
      avgDealSize: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0
    };
    
    res.json({
      success: true,
      data: {
        stages: pipelineData,
        totals
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching pipeline analytics:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get conversion funnel data
router.get('/funnel', async (req, res) => {
  try {
    const { data: stages, error } = await scopeQuery(
      supabase
        .from('pipeline_stages')
        .select('*, deals:deal_pipeline_history(count)')
        .order('order_index', { ascending: true }),
      req
    );
    
    if (error) throw error;
    
    const funnelData = stages.map((stage, index) => {
      const previousCount = index > 0 ? stages[index - 1].deals.count : stage.deals.count;
      const conversionRate = previousCount > 0 ? (stage.deals.count / previousCount) * 100 : 100;
      
      return {
        name: stage.name,
        count: stage.deals.count,
        conversionRate: conversionRate,
        color: stage.color
      };
    });
    
    res.json({ success: true, data: funnelData });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching funnel data:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get predictive analytics (simple trend projection)
router.get('/predictive', async (req, res) => {
  try {
    const { months = 3 } = req.query;
    
    // Get historical revenue data
    const { data: revenue, error } = await scopeQuery(
      supabase
        .from('revenue_entries')
        .select('amount, date')
        .order('date', { ascending: true }),
      req
    );
    
    if (error) throw error;
    
    // Group by month
    const monthlyRevenue = {};
    revenue.forEach(entry => {
      const month = entry.date.substring(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(entry.amount);
    });
    
    const months_list = Object.keys(monthlyRevenue).sort();
    const values = months_list.map(m => monthlyRevenue[m]);
    
    // Simple linear regression for projection
    const n = values.length;
    const sumX = months_list.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumXX = months_list.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Project future months
    const projections = [];
    const lastMonth = new Date(months_list[months_list.length - 1] + '-01');
    
    for (let i = 1; i <= months; i++) {
      const nextMonth = new Date(lastMonth);
      nextMonth.setMonth(nextMonth.getMonth() + i);
      const monthStr = nextMonth.toISOString().substring(0, 7);
      
      const projectedValue = slope * (n + i - 1) + intercept;
      
      projections.push({
        month: monthStr,
        projected: Math.max(0, projectedValue),
        confidence: Math.max(0, 100 - (i * 15)) // Confidence decreases with time
      });
    }
    
    res.json({
      success: true,
      data: {
        historical: months_list.map((m, i) => ({ month: m, value: values[i] })),
        projections,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
        growthRate: values.length > 1 ? (slope / (sumY / n)) * 100 : 0
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in predictive analytics:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get leaderboard data
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const startDate = new Date();
    if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    
    // Get team members with their deals
    const { data: teamMembers, error } = await scopeQuery(
      supabase
        .from('team_members')
        .select('*, deals:deals!deals_assigned_to_fkey(*)')
        .gte('deals.created_at', startDate.toISOString()),
      req
    );
    
    if (error) throw error;
    
    const leaderboard = teamMembers.map(member => {
      const closedDeals = member.deals.filter(d => d.status === 'closed_won');
      const totalValue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      
      return {
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        department: member.department,
        dealsClosed: closedDeals.length,
        totalRevenue: totalValue,
        conversionRate: member.deals.length > 0 
          ? (closedDeals.length / member.deals.length) * 100 
          : 0
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching leaderboard:');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
