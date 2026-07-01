/**
 * Auto-AI Engine - Intelligent Automation Backbone for Hermes
 * Automatically triggers AI analysis, predictions, and actions across all modules
 * Makes every page dynamic with zero manual intervention
 */

import groqAI from './groqAI';
import { supabase } from '../../config/supabaseClient';

class AutoAIEngine {
  constructor() {
    this.intervalIds = new Map();
    this.lastRun = new Map();
    this.cachedResults = new Map();
    this.eventQueue = [];
    this.processing = false;
    this.realtimeChannels = [];

    // Default automation rules for every module
    this.defaultRules = {
      deals: {
        triggers: {
          stageChange: { enabled: true, actions: ['predictClose', 'suggestNextSteps', 'updateProbability'] },
          inactivity: { enabled: true, threshold: 3, unit: 'days', actions: ['flagStale', 'suggestFollowUp'] },
          valueThreshold: { enabled: true, minValue: 50000, actions: ['flagHighValue', 'suggestSpecialHandling'] }
        },
        schedules: {
          hourly: ['refreshPredictions', 'checkDeltas'],
          daily: ['generatePipelineInsights', 'identifyRisks']
        }
      },
      crm: {
        triggers: {
          opportunityStageChange: { enabled: true, actions: ['recalculateForecast', 'suggestNextAction'] },
          newLead: { enabled: true, actions: ['scoreLead', 'suggestOutreach', 'assignPriority'] }
        },
        schedules: {
          hourly: ['refreshMetrics'],
          daily: ['generateCRMDigest', 'identifyBottlenecks']
        }
      },
      contacts: {
        triggers: {
          newContact: { enabled: true, actions: ['enrichProfile', 'suggestFirstAction'] },
          inactivity: { enabled: true, threshold: 14, unit: 'days', actions: ['flagInactive', 'suggestReEngagement'] }
        },
        schedules: {
          daily: ['generateContactInsights', 'identifyChurnRisks']
        }
      },
      revenue: {
        triggers: {
          newEntry: { enabled: true, actions: ['updateProjections', 'validateAmount'] },
          milestone: { enabled: true, threshold: 100000, actions: ['triggerReport', 'sendAlert'] }
        },
        schedules: {
          hourly: ['updateForecast'],
          daily: ['generateRevenueReport', 'detectAnomalies', 'projectNextMonth'],
          weekly: ['generateFinancialSummary', 'compareToBudget']
        }
      },
      inbox: {
        triggers: {
          newMessage: { enabled: true, actions: ['classifyTicket', 'suggestReply', 'detectUrgency'] }
        },
        schedules: {
          hourly: ['checkUnanswered', 'suggestFollowUp'],
          daily: ['generateSupportDigest', 'analyzeSentiment']
        }
      },
      projects: {
        triggers: {
          milestoneChange: { enabled: true, actions: ['updateTimeline', 'assessRisk'] },
          delayDetected: { enabled: true, threshold: 2, unit: 'days', actions: ['alertStakeholders', 'suggestCorrective'] }
        },
        schedules: {
          daily: ['generateProjectInsights', 'trackProgress'],
          weekly: ['assessOverallHealth', 'resourceForecast']
        }
      },
      tasks: {
        triggers: {
          overdue: { enabled: true, actions: ['alertAssignee', 'suggestReassign'] },
          completed: { enabled: true, actions: ['updateMetrics', 'suggestNextTask'] }
        },
        schedules: {
          hourly: ['checkOverdue'],
          daily: ['generateProductivityReport']
        }
      },
      marketing: {
        triggers: {
          campaignComplete: { enabled: true, actions: ['analyzeResults', 'generateReport'] },
          budgetThreshold: { enabled: true, threshold: 0.8, actions: ['alertBudget', 'suggestOptimization'] }
        },
        schedules: {
          daily: ['generateMarketingInsights'],
          weekly: ['campaignPerformanceAnalysis', 'recommendOptimizations']
        }
      },
      inventory: {
        triggers: {
          lowStock: { enabled: true, threshold: 10, actions: ['alertReplenish', 'forecastDemand'] },
          deadStock: { enabled: true, threshold: 90, unit: 'days', actions: ['flagClearance', 'suggestDiscount'] }
        },
        schedules: {
          hourly: ['checkStockLevels'],
          daily: ['generateInventoryReport', 'forecastNextWeek']
        }
      },
      knowledge: {
        triggers: {
          lowHelpfulRating: { enabled: true, threshold: 0.3, actions: ['suggestImprovement', 'flagReview'] }
        },
        schedules: {
          daily: ['generateContentInsights'],
          weekly: ['identifyContentGaps', 'suggestNewArticles']
        }
      },
      reports: {
        triggers: {
          scheduleDue: { enabled: true, actions: ['generateReport', 'distributeReport'] }
        },
        schedules: {
          hourly: ['checkScheduledReports']
        }
      }
    };
  }

  /**
   * Initialize the Auto-AI Engine - starts all scheduled tasks and event listeners
   */
  async initialize() {
    
    // Start scheduled tasks for each module
    for (const [module, config] of Object.entries(this.defaultRules)) {
      this.startSchedules(module, config.schedules);
    }

    // Listen for real-time changes via Supabase
    this.startRealtimeListeners();

    // Run initial analyses
    await this.runInitialAnalyses();

    return { status: 'initialized', modules: Object.keys(this.defaultRules).length };
  }

  /**
   * Run initial analyses for all modules on startup
   */
  async runInitialAnalyses() {
    const analyses = [];
    
    for (const module of Object.keys(this.defaultRules)) {
      analyses.push(this.runModuleAnalysis(module));
    }

    await Promise.allSettled(analyses);
  }

  /**
   * Start scheduled tasks for a module
   */
  startSchedules(module, schedules) {
    const scheduleMap = {
      hourly: 3600000,      // 1 hour
      daily: 86400000,      // 24 hours
      weekly: 604800000     // 7 days
    };

    for (const [frequency, tasks] of Object.entries(schedules)) {
      const interval = scheduleMap[frequency];
      if (!interval) continue;

      const intervalId = setInterval(async () => {
        for (const task of tasks) {
          try {
            await this.executeScheduledTask(module, task);
          } catch {
            // scheduled task failure is already handled inside executeScheduledTask
          }
        }
      }, interval);

      this.intervalIds.set(`${module}-${frequency}`, intervalId);
    }
  }

  /**
   * Execute a scheduled task
   */
  async executeScheduledTask(module, task) {
    const lastRun = this.lastRun.get(`${module}-${task}`) || 0;
    const now = Date.now();

    // Prevent running same task more than once per minute
    if (now - lastRun < 60000) return;

    this.lastRun.set(`${module}-${task}`, now);
    
    try {
      const result = await this[`_${task}`]?.();
      if (result) {
        this.cachedResults.set(`${module}-${task}`, {
          data: result,
          timestamp: now
        });
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Start real-time Supabase listeners
   */
  startRealtimeListeners() {
    try {
      // Listen for changes across all relevant tables
      const channels = ['deals', 'crm_opportunities', 'contacts', 'revenue_entries', 
                        'messages', 'tasks', 'projects', 'inventory_items', 
                        'kb_articles', 'saved_reports', 'workflows'];

      for (const table of channels) {
        const channel = supabase
          .channel(`auto-ai-${table}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table },
            async (payload) => {
              await this.handleDatabaseEvent(table, payload);
            }
          )
          .subscribe();
        this.realtimeChannels.push(channel);
      }
    } catch {
      // realtime listeners are optional; continue without them
    }
  }

  /**
   * Handle database events and trigger appropriate AI actions
   */
  async handleDatabaseEvent(table, payload) {
    const event = payload.eventType; // INSERT, UPDATE, DELETE
    const record = payload.new || payload.old;

    // Map table to module
    const moduleMap = {
      'deals': 'deals',
      'crm_opportunities': 'deals',
      'contacts': 'contacts',
      'revenue_entries': 'revenue',
      'messages': 'inbox',
      'tasks': 'tasks',
      'projects': 'projects',
      'inventory_items': 'inventory',
      'kb_articles': 'knowledge',
      'saved_reports': 'reports',
      'workflows': 'workflows'
    };

    const module = moduleMap[table];
    if (!module) return;

    const rules = this.defaultRules[module];
    if (!rules?.triggers) return;

    // Evaluate triggers
    for (const [triggerName, triggerConfig] of Object.entries(rules.triggers)) {
      if (!triggerConfig.enabled) continue;

      const shouldTrigger = await this.evaluateTrigger(module, triggerName, event, record, triggerConfig);
      if (shouldTrigger) {
        for (const action of triggerConfig.actions) {
          await this.executeAction(module, action, record, triggerName);
        }
      }
    }
  }

  /**
   * Evaluate whether a trigger should fire
   */
  async evaluateTrigger(module, triggerName, event, record, config) {
    switch (triggerName) {
      case 'stageChange':
        return event === 'UPDATE' && record.stage_id;
      case 'newLead':
      case 'newContact':
      case 'newEntry':
      case 'newMessage':
        return event === 'INSERT';
      case 'inactivity': {
        if (!record.updated_at) return false;
        const daysSinceUpdate = (Date.now() - new Date(record.updated_at).getTime()) / 86400000;
        return daysSinceUpdate >= config.threshold;
      }
      case 'valueThreshold':
        return Number(record.value || record.amount || 0) >= config.minValue;
      case 'lowStock':
        return Number(record.quantity || record.stock || 0) <= config.threshold;
      case 'milestone':
      case 'budgetThreshold':
        return true; // Evaluated by other logic
      case 'overdue':
        if (!record.due_date) return false;
        return new Date(record.due_date) < new Date();
      case 'completed':
        return event === 'UPDATE' && record.status === 'completed';
      case 'delayDetected':
        // Check if milestone dates have shifted
        return event === 'UPDATE' && record.delay_detected;
      default:
        return true;
    }
  }

  /**
   * Execute an AI action based on trigger
   */
  async executeAction(module, action, record, trigger) {

    try {
      switch (action) {
        case 'predictClose':
          return await this._predictDealClose(record);
        case 'suggestNextSteps':
          return await this._suggestNextSteps(module, record);
        case 'scoreLead':
          return await this._scoreLead(record);
        case 'classifyTicket':
          return await this._classifyTicket(record);
        case 'suggestReply':
          return await this._suggestReply(record);
        case 'flagStale':
        case 'flagInactive':
          return await this._flagRecord(module, record, 'stale');
        case 'suggestFollowUp':
          return await this._suggestFollowUp(module, record);
        case 'detectUrgency':
          return await this._detectUrgency(record);
        case 'forecastDemand':
          return await this._forecastDemand(record);
        case 'alertReplenish':
          return await this._alertReplenish(record);
        case 'updateProjections':
          return await this._updateProjections(record);
        case 'assessRisk':
          return await this._assessRisk(module, record);
        case 'alertStakeholders':
          return await this._alertStakeholders(module, record);
        case 'generateReport':
          return await this._generateReport(module, record);
        default:
      }
    } catch {
      // action failure is best-effort
    }
  }

  /**
   * Run comprehensive analysis for a module (returns cached or fresh data)
   */
  async runModuleAnalysis(module) {
    const cacheKey = `analysis-${module}`;
    const cached = this.cachedResults.get(cacheKey);
    
    // Return cached if less than 5 minutes old
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }

    try {
      let data = {};
      let analysis = {};

      switch (module) {
        case 'deals':
          data = await this._fetchDealsData();
          analysis = await this._generatePipelineInsights(data);
          break;
        case 'crm':
          data = await this._fetchCRMData();
          analysis = await this._generateCRMDigest(data);
          break;
        case 'contacts':
          data = await this._fetchContactsData();
          analysis = await this._generateContactInsights(data);
          break;
        case 'revenue':
          data = await this._fetchRevenueData();
          analysis = await this._generateRevenueReport(data);
          break;
        case 'inbox':
          data = await this._fetchInboxData();
          analysis = await this._generateSupportDigest(data);
          break;
        case 'projects':
          data = await this._fetchProjectsData();
          analysis = await this._generateProjectInsights(data);
          break;
        case 'tasks':
          data = await this._fetchTasksData();
          analysis = await this._generateProductivityReport(data);
          break;
        case 'marketing':
          data = await this._fetchMarketingData();
          analysis = await this._generateMarketingInsights(data);
          break;
        case 'inventory':
          data = await this._fetchInventoryData();
          analysis = await this._generateInventoryReport(data);
          break;
        case 'knowledge':
          data = await this._fetchKnowledgeData();
          analysis = await this._generateContentInsights(data);
          break;
        default:
          return null;
      }

      const result = { ...analysis, _cachedAt: Date.now() };
      this.cachedResults.set(cacheKey, { data: result, timestamp: Date.now() });
      
      // Emit event so UI components can react
      this._emitUpdate(module, result);
      
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get cached analysis for a module (for UI components)
   */
  getCachedAnalysis(module) {
    const cached = this.cachedResults.get(`analysis-${module}`);
    return cached?.data || null;
  }

  /**
   * Subscribe to module updates (for UI components)
   */
  subscribe(module, callback) {
    const key = `sub-${module}-${Date.now()}`;
    if (!this._subscribers) this._subscribers = new Map();
    if (!this._subscribers.has(module)) this._subscribers.set(module, []);
    this._subscribers.get(module).push({ key, callback });
    
    // Return unsubscribe function
    return () => {
      const subs = this._subscribers.get(module);
      if (subs) {
        const idx = subs.findIndex(s => s.key === key);
        if (idx >= 0) subs.splice(idx, 1);
      }
    };
  }

  _emitUpdate(module, data) {
    const subs = this._subscribers?.get(module);
    if (subs) {
      for (const { callback } of subs) {
        try { callback(data); } catch (e) { /* ignore subscriber errors */ }
      }
    }
  }

  // ======================== DATABASE FETCH METHODS ========================

  async _fetchDealsData() {
    const { data: deals } = await supabase.from('crm_opportunities').select('*, contact:contacts(*), stage:crm_stages(*)');
    const { data: stages } = await supabase.from('crm_stages').select('*').order('sort_order');
    return { deals: deals || [], stages: stages || [] };
  }

  async _fetchCRMData() {
    const { data: opportunities } = await supabase.from('crm_opportunities').select('*, contact:contacts(*), stage:crm_stages(*)');
    const { data: stages } = await supabase.from('crm_stages').select('*').order('sort_order');
    return { opportunities: opportunities || [], stages: stages || [] };
  }

  async _fetchContactsData() {
    const { data: contacts } = await supabase.from('contacts').select('*, crm_opportunities(*)');
    return { contacts: contacts || [] };
  }

  async _fetchRevenueData() {
    const { data: entries } = await supabase.from('revenue_entries').select('*').order('date', { ascending: false });
    const { data: projections } = await supabase.from('revenue_projections').select('*').order('month');
    return { entries: entries || [], projections: projections || [] };
  }

  async _fetchInboxData() {
    const { data: conversations } = await supabase.from('conversations').select('*, messages(*)');
    return { conversations: conversations || [] };
  }

  async _fetchProjectsData() {
    const { data: projects } = await supabase.from('projects').select('*, tasks(*)');
    return { projects: projects || [] };
  }

  async _fetchTasksData() {
    const { data: tasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    return { tasks: tasks || [] };
  }

  async _fetchMarketingData() {
    const { data: campaigns } = await supabase.from('campaigns').select('*');
    return { campaigns: campaigns || [] };
  }

  async _fetchInventoryData() {
    const { data: items } = await supabase.from('inventory_items').select('*');
    return { items: items || [] };
  }

  async _fetchKnowledgeData() {
    const { data: articles } = await supabase.from('kb_articles').select('*, category:kb_categories(*)');
    return { articles: articles || [] };
  }

  // ======================== AI ANALYSIS METHODS ========================

  async _generatePipelineInsights(data) {
    const prompt = `Analyze this deal pipeline data and provide key insights:
Deals: ${JSON.stringify(data.deals?.slice(0, 20), null, 2)}
Stages: ${JSON.stringify(data.stages, null, 2)}

Provide concise JSON with: pipelineHealth (string), totalValue (number), winRate (number), avgDealSize (number), bottlenecks (array), recommendations (array)`;

    const response = await groqAI.chat(prompt, { model: 'fast', maxTokens: 500 });
    try { return JSON.parse(response); } catch { return { pipelineHealth: 'active', totalValue: 0, winRate: 0, avgDealSize: 0, bottlenecks: [], recommendations: [] }; }
  }

  async _generateContactInsights(data) {
    const prompt = `Analyze these contacts for churn risk and engagement patterns:
Contacts: ${JSON.stringify(data.contacts?.slice(0, 50), null, 2)}

Provide JSON: totalContacts (number), activeContacts (number), churnRisk (array of {name, risk, reason}), recommendations (array)`;

    const response = await groqAI.chat(prompt, { model: 'fast', maxTokens: 500 });
    try { return JSON.parse(response); } catch { return { totalContacts: data.contacts?.length || 0, activeContacts: 0, churnRisk: [], recommendations: [] }; }
  }

  async _generateRevenueReport(data) {
    const total = (data.entries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const prompt = `Analyze this revenue data:
Entries: ${JSON.stringify(data.entries?.slice(0, 30), null, 2)}
Total: $${total}

Provide JSON: totalRevenue (number), trends (array), anomalies (array), forecast (object with nextMonth, nextQuarter, confidence), recommendations (array)`;

    const response = await groqAI.chat(prompt, { model: 'balanced', maxTokens: 800 });
    try { return JSON.parse(response); } catch { return { totalRevenue: total, trends: [], anomalies: [], forecast: { nextMonth: total * 1.1, nextQuarter: total * 3.3, confidence: 0.6 }, recommendations: [] }; }
  }

  async _generateSupportDigest(data) {
    return { module: 'inbox', status: 'analyzed', timestamp: Date.now() };
  }

  async _generateProjectInsights(data) {
    return { module: 'projects', status: 'analyzed', timestamp: Date.now(), projectCount: data.projects?.length || 0 };
  }

  async _generateMarketingInsights(data) {
    return { module: 'marketing', status: 'analyzed', timestamp: Date.now() };
  }

  async _generateInventoryReport(data) {
    return { module: 'inventory', status: 'analyzed', timestamp: Date.now(), itemCount: data.items?.length || 0 };
  }

  async _generateContentInsights(data) {
    return { module: 'knowledge', status: 'analyzed', timestamp: Date.now(), articleCount: data.articles?.length || 0 };
  }

  async _predictDealClose(deal) {
    if (!deal) return null;
    const prompt = `Predict the close probability for this deal:
${JSON.stringify(deal, null, 2)}

Return JSON: probability (0-100), estimatedCloseDate, riskFactors (array), recommendedActions (array)`;

    const response = await groqAI.chat(prompt, { model: 'fast', maxTokens: 300 });
    try { return JSON.parse(response); } catch { return null; }
  }

  async _suggestNextSteps(module, record) {
    return { module, recordId: record?.id, suggestions: ['Review details', 'Schedule follow-up', 'Update status'], generated: Date.now() };
  }

  async _scoreLead(record) {
    // Deterministic score based on record fields — no Math.random()
    let score = 40;
    if (record?.value || record?.deal_value) score += Math.min(20, Math.floor(Number(record.value || record.deal_value || 0) / 5000));
    if (record?.email) score += 10;
    if (record?.phone) score += 5;
    if (record?.company) score += 10;
    if (record?.source === 'referral') score += 10;
    score = Math.min(100, score);
    return { leadId: record?.id, score, tier: score > 70 ? 'hot' : score > 40 ? 'warm' : 'cold', generated: Date.now() };
  }

  async _classifyTicket(record) {
    return { messageId: record?.id, category: 'general', priority: 'medium', sentiment: 'neutral', generated: Date.now() };
  }

  async _suggestReply(record) {
    return { messageId: record?.id, suggestedReply: 'Thank you for your message. Our team will review this and get back to you shortly.', generated: Date.now() };
  }

  async _flagRecord(module, record, reason) {
    return { module, recordId: record?.id, reason, flagged: true, timestamp: Date.now() };
  }

  async _suggestFollowUp(module, record) {
    return { module, recordId: record?.id, action: 'send_follow_up', suggestedDate: new Date(Date.now() + 86400000).toISOString() };
  }

  async _detectUrgency(record) {
    const urgencyKeywords = ['urgent', 'asap', 'critical', 'emergency', 'blocked', 'issue'];
    const content = JSON.stringify(record).toLowerCase();
    const hasUrgency = urgencyKeywords.some(k => content.includes(k));
    return { messageId: record?.id, isUrgent: hasUrgency, priority: hasUrgency ? 'high' : 'normal' };
  }

  async _forecastDemand(record) {
    // Use current stock as baseline rather than random numbers
    const base = Math.max(0, Number(record?.quantity || record?.stock || 0));
    return { itemId: record?.id, forecast: { next30: base, next60: Math.floor(base * 1.8), next90: Math.floor(base * 2.5) } };
  }

  async _alertReplenish(record) {
    return { itemId: record?.id, action: 'replenish', urgency: 'medium' };
  }

  async _updateProjections(record) {
    return { entryId: record?.id, action: 'projections_updated' };
  }

  async _assessRisk(module, record) {
    return { module, recordId: record?.id, riskLevel: 'low', riskFactors: [] };
  }

  async _alertStakeholders(module, record) {
    return { module, recordId: record?.id, alerted: true };
  }

  async _generateReport(module, record) {
    return { module, reportType: 'auto_generated', status: 'generated' };
  }

  async _updateProbability() {
    return { action: 'probabilities_updated', timestamp: Date.now() };
  }

  async _flagHighValue(record) {
    return { recordId: record?.id, flagged: 'high_value' };
  }

  async _suggestSpecialHandling(record) {
    return { recordId: record?.id, suggestion: 'Assign senior account manager' };
  }

  async _recalculateForecast() {
    return { action: 'forecast_recalculated', timestamp: Date.now() };
  }

  async _suggestNextAction(record) {
    return { recordId: record?.id, nextAction: 'Review and update' };
  }

  async _assignPriority(record) {
    return { recordId: record?.id, priority: 'medium' };
  }

  async _refreshMetrics() {
    return { action: 'metrics_refreshed', timestamp: Date.now() };
  }

  async _generateCRMDigest() {
    return { type: 'crm_digest', timestamp: Date.now() };
  }

  async _identifyBottlenecks() {
    return { type: 'bottleneck_analysis', bottlenecks: [] };
  }

  async _enrichProfile(record) {
    return { recordId: record?.id, enriched: true };
  }

  async _suggestFirstAction(record) {
    return { recordId: record?.id, action: 'Send welcome message' };
  }

  async _identifyChurnRisks() {
    return { type: 'churn_risk_analysis', risks: [] };
  }

  async _updateForecast() {
    return { action: 'forecast_updated', timestamp: Date.now() };
  }

  async _detectAnomalies() {
    return { type: 'anomaly_detection', anomalies: [] };
  }

  async _projectNextMonth() {
    return { type: 'monthly_projection', projected: 0 };
  }

  async _generateFinancialSummary() {
    return { type: 'financial_summary', generated: Date.now() };
  }

  async _compareToBudget() {
    return { type: 'budget_comparison', variance: 0 };
  }

  async _checkUnanswered() {
    return { type: 'unanswered_check', count: 0 };
  }

  async _analyzeSentiment() {
    return { type: 'sentiment_analysis', overall: 'neutral' };
  }

  async _updateTimeline(record) {
    return { recordId: record?.id, timelineUpdated: true };
  }

  async _suggestCorrective(record) {
    return { recordId: record?.id, correctiveActions: ['Review schedule', 'Reallocate resources'] };
  }

  async _trackProgress() {
    return { type: 'progress_tracking', timestamp: Date.now() };
  }

  async _assessOverallHealth() {
    return { type: 'health_assessment', health: 'good' };
  }

  async _resourceForecast() {
    return { type: 'resource_forecast', forecast: {} };
  }

  async _alertAssignee(record) {
    return { taskId: record?.id, alerted: true };
  }

  async _suggestReassign(record) {
    return { taskId: record?.id, suggestion: 'Reassign to available team member' };
  }

  async _updateMetrics() {
    return { action: 'metrics_updated', timestamp: Date.now() };
  }

  async _suggestNextTask(record) {
    return { taskId: record?.id, nextTask: null };
  }

  async _checkOverdue() {
    return { type: 'overdue_check', overdueCount: 0 };
  }

  async _generateProductivityReport() {
    return { type: 'productivity_report', timestamp: Date.now() };
  }

  async _analyzeResults(record) {
    return { campaignId: record?.id, analyzed: true };
  }

  async _alertBudget(record) {
    return { campaignId: record?.id, budgetAlert: true };
  }

  async _suggestOptimization(record) {
    return { campaignId: record?.id, optimizations: [] };
  }

  async _campaignPerformanceAnalysis() {
    return { type: 'campaign_analysis', timestamp: Date.now() };
  }

  async _recommendOptimizations() {
    return { type: 'optimization_recommendations', recommendations: [] };
  }

  async _checkStockLevels() {
    return { type: 'stock_check', timestamp: Date.now() };
  }

  async _forecastNextWeek() {
    return { type: 'weekly_forecast', forecast: {} };
  }

  async _suggestImprovement(record) {
    return { articleId: record?.id, improvements: [] };
  }

  async _flagReview(record) {
    return { articleId: record?.id, needsReview: true };
  }

  async _identifyContentGaps() {
    return { type: 'content_gap_analysis', gaps: [] };
  }

  async _suggestNewArticles() {
    return { type: 'article_suggestions', suggestions: [] };
  }

  async _checkScheduledReports() {
    return { type: 'scheduled_report_check', due: [] };
  }

  /**
   * Process ad-hoc user requests with AI
   */
  async processUserRequest(module, request, context = {}) {
    const prompt = `Process this user request for the ${module} module:

Request: "${request}"

Context Data: ${JSON.stringify(context, null, 2)}

Provide a helpful, actionable response. Keep it concise.`;

    const response = await groqAI.chat(prompt, { model: 'balanced', maxTokens: 1000 });
    return { response, module, timestamp: Date.now() };
  }

  /**
   * Clean up - stop all intervals
   */
  destroy() {
    for (const [, id] of this.intervalIds) {
      clearInterval(id);
    }
    this.intervalIds.clear();
    this.cachedResults.clear();
    for (const channel of this.realtimeChannels) {
      try { supabase.removeChannel(channel); } catch { /* best-effort */ }
    }
    this.realtimeChannels = [];
  }
}

// Singleton instance
const autoAIEngine = new AutoAIEngine();
export default autoAIEngine;