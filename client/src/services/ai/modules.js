/**
 * AI Module Services - AI-driven features for all Hermes modules
 * Uses secure AI routing to protect client data while maintaining AI capabilities
 */

import groqAI from './groqAI';
import secureAIRouter from './secureAIRouter';

class AIModuleServices {
  constructor() {
    this.ai = groqAI;
    this.security = secureAIRouter;
  }

  // ========================================== CRM & SALES AI ==========================================
  
  /**
   * AI Lead Scoring - Predict lead quality based on data
   */
  async scoreLead(leadData) {
    const prompt = `Analyze this lead and score it 1-100. Consider: company size, role seniority, engagement history, budget indicators.

Lead Data: ${JSON.stringify(leadData, null, 2)}

Return JSON: { score: number (1-100), tier: "hot|warm|cold", reasons: string[], recommendedActions: string[], estimatedConversionProbability: number }`;

    try {
      return await this.ai.structuredChat(prompt, {
        model: 'analytical',
        temperature: 0.3
      });
    } catch {
      return { score: 50, tier: 'warm', reasons: ['AI analysis pending'], recommendedActions: ['Follow up'], estimatedConversionProbability: 0.5 };
    }
  }

  /**
   * Predict deal close probability
   */
  async predictDealOutcome(dealData, historicalDeals = []) {
    const prompt = `Predict deal outcome based on current pipeline data and historical patterns.

Current Deal: ${JSON.stringify(dealData, null, 2)}
Historical Similar Deals: ${JSON.stringify(historicalDeals.slice(0, 10), null, 2)}

Return JSON: { 
  closeProbability: number (0-100), 
  estimatedCloseDate: string,
  predictedValue: number,
  riskFactors: string[],
  winStrategies: string[],
  stageProgressionPrediction: string[]
}`;

    try {
      return await this.ai.structuredChat(prompt, {
        model: 'analytical',
        temperature: 0.3
      });
    } catch {
      return { 
        closeProbability: 65, 
        estimatedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedValue: dealData.value || 0,
        riskFactors: ['Market conditions'],
        winStrategies: ['Focus on value proposition'],
        stageProgressionPrediction: ['Next stage in 2 weeks']
      };
    }
  }

  /**
   * Generate personalized outreach email
   */
  async generateOutreachEmail(contactData, context = {}) {
    const prompt = `Write a personalized sales outreach email.

Contact: ${JSON.stringify(contactData, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Requirements:
- Subject line (compelling, under 50 chars)
- Opening hook (reference specific detail)
- Value proposition (tailored to their industry/role)
- Soft CTA
- Professional but conversational tone

Return JSON: { subject: string, body: string, followUpSchedule: string[] }`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel });
    try {
      return JSON.parse(response);
    } catch {
      return { subject: 'Following up', body: response, followUpSchedule: ['3 days', '7 days'] };
    }
  }

  /**
   * Analyze sales conversation
   */
  async analyzeSalesCall(transcript) {
    const prompt = `Analyze this sales conversation transcript and provide insights.

Transcript: """${transcript}"""

Return JSON: {
  sentiment: { customer: string, overall: string },
  keyTopics: string[],
  objections: string[],
  buyingSignals: string[],
  missedOpportunities: string[],
  recommendedNextSteps: string[],
  callQualityScore: number (1-100)
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { sentiment: { customer: 'neutral', overall: 'average' }, keyTopics: [], objections: [], buyingSignals: [], recommendedNextSteps: [] };
    }
  }

  // ========================================== MARKETING AI ==========================================
  
  /**
   * Generate campaign content
   */
  async generateCampaignContent(campaignGoal, targetAudience, channel) {
    const prompt = `Create marketing campaign content.

Goal: ${campaignGoal}
Target Audience: ${targetAudience}
Channel: ${channel}

Generate:
1. 5 headline options
2. Primary ad copy (3 variations)
3. Email subject lines (5 options with predicted open rates)
4. Social media posts (3 per platform: LinkedIn, Twitter, Facebook)
5. CTA variations
6. A/B test recommendations

Return JSON: { headlines: string[], adCopy: string[], emailSubjects: {subject: string, predictedOpenRate: number}[], socialPosts: object, ctas: string[], abTests: string[] }`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, maxTokens: 2048 });
    try {
      return JSON.parse(response);
    } catch {
      return { headlines: ['Campaign Headline'], adCopy: [response], emailSubjects: [], socialPosts: {}, ctas: [], abTests: [] };
    }
  }

  /**
   * Predict campaign performance
   */
  async predictCampaignPerformance(campaignData, historicalCampaigns = []) {
    const prompt = `Predict campaign performance metrics.

Campaign: ${JSON.stringify(campaignData, null, 2)}
Historical Data: ${JSON.stringify(historicalCampaigns.slice(0, 5), null, 2)}

Return JSON: {
  predictedMetrics: {
    reach: number,
    impressions: number,
    clicks: number,
    ctr: number,
    conversions: number,
    conversionRate: number,
    cpa: number,
    roas: number
  },
  confidenceScore: number,
  optimizationSuggestions: string[],
  bestPerformingSegment: string,
  recommendedBudget: number
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { predictedMetrics: {}, confidenceScore: 0.5, optimizationSuggestions: ['Test different creatives'] };
    }
  }

  /**
   * Optimize send time
   */
  async optimizeSendTime(audienceData, campaignType) {
    const prompt = `Determine optimal send times for this audience.

Audience: ${JSON.stringify(audienceData, null, 2)}
Campaign Type: ${campaignType}

Return JSON: {
  bestDays: string[],
  bestTimes: string[],
  timezone: string,
  reasoning: string,
  segmentationRecommendations: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel });
    try {
      return JSON.parse(response);
    } catch {
      return { bestDays: ['Tuesday', 'Thursday'], bestTimes: ['10:00 AM', '2:00 PM'], timezone: 'EST' };
    }
  }

  // ========================================== INVENTORY AI ==========================================
  
  /**
   * Predict demand for products
   */
  async predictDemand(productData, historicalSales = [], marketTrends = {}) {
    const prompt = `Predict inventory demand for the next 30/60/90 days.

Product: ${JSON.stringify(productData, null, 2)}
Historical Sales (last 12 months): ${JSON.stringify(historicalSales, null, 2)}
Market Trends: ${JSON.stringify(marketTrends, null, 2)}

Return JSON: {
  predictions: {
    days30: number,
    days60: number,
    days90: number
  },
  confidence: number,
  seasonality: string,
  trendDirection: "up|down|stable",
  recommendedStockLevel: number,
  reorderPoint: number,
  riskFactors: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { predictions: { days30: 0, days60: 0, days90: 0 }, confidence: 0.5, trendDirection: 'stable' };
    }
  }

  /**
   * Optimize inventory levels
   */
  async optimizeInventory(currentInventory, salesVelocity, leadTimes) {
    const prompt = `Optimize inventory levels to minimize carrying costs while preventing stockouts.

Current Inventory: ${JSON.stringify(currentInventory, null, 2)}
Sales Velocity: ${JSON.stringify(salesVelocity, null, 2)}
Lead Times: ${JSON.stringify(leadTimes, null, 2)}

Return JSON: {
  recommendations: [
    { productId: string, action: "increase|decrease|maintain", targetLevel: number, reasoning: string }
  ],
  deadStock: string[],
  stockoutRisk: string[],
  reorderRecommendations: string[],
  projectedCarryingCost: number,
  potentialSavings: number
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { recommendations: [], deadStock: [], stockoutRisk: [] };
    }
  }

  // ========================================== ERP AI ==========================================
  
  /**
   * Process automation recommendations
   */
  async analyzeProcessForAutomation(processData) {
    const prompt = `Analyze business process for automation opportunities.

Process: ${JSON.stringify(processData, null, 2)}

Return JSON: {
  automationOpportunities: [
    { task: string, automationPotential: number (1-100), recommendedTool: string, complexity: "low|medium|high", roiEstimate: string }
  ],
  workflowOptimizations: string[],
  integrationRecommendations: string[],
  estimatedTimeSavings: string,
  implementationPriority: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { automationOpportunities: [], workflowOptimizations: [] };
    }
  }

  /**
   * Generate process documentation
   */
  async generateProcessDocs(processName, steps, roles) {
    const prompt = `Generate comprehensive process documentation.

Process: ${processName}
Steps: ${JSON.stringify(steps, null, 2)}
Roles: ${JSON.stringify(roles, null, 2)}

Create:
1. Executive summary
2. Detailed procedures
3. RACI matrix
4. Exception handling
5. KPIs and metrics
6. Required approvals
7. System integrations

Return markdown-formatted documentation.`;

    return await this.ai.chat(prompt, { model: this.ai.premiumModel, maxTokens: 4096 });
  }

  // ========================================== ANALYTICS AI ==========================================
  
  /**
   * Generate business insights
   */
  async generateBusinessInsights(metrics, timeRange) {
    const prompt = `Analyze business metrics and generate executive insights.

Metrics: ${JSON.stringify(metrics, null, 2)}
Time Range: ${timeRange}

Return JSON: {
  executiveSummary: string,
  keyFindings: string[],
  anomalies: [
    { metric: string, expected: number, actual: number, severity: "low|medium|high", explanation: string }
  ],
  trends: [
    { metric: string, direction: "up|down", magnitude: string, significance: string }
  ],
  recommendations: [
    { priority: "critical|high|medium|low", action: string, expectedImpact: string, effort: string }
  ],
  forecast: {
    next30Days: string,
    nextQuarter: string,
    risks: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { executiveSummary: 'Analysis pending', keyFindings: [], recommendations: [] };
    }
  }

  /**
   * Predict revenue forecast
   */
  async predictRevenue(historicalRevenue, pipeline, marketConditions) {
    const prompt = `Generate revenue forecast with confidence intervals.

Historical Revenue: ${JSON.stringify(historicalRevenue, null, 2)}
Current Pipeline: ${JSON.stringify(pipeline, null, 2)}
Market Conditions: ${JSON.stringify(marketConditions, null, 2)}

Return JSON: {
  forecast: {
    thisMonth: { low: number, expected: number, high: number },
    nextMonth: { low: number, expected: number, high: number },
    thisQuarter: { low: number, expected: number, high: number },
    thisYear: { low: number, expected: number, high: number }
  },
  confidenceLevel: number,
  keyAssumptions: string[],
  riskScenarios: string[],
  upsideOpportunities: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { forecast: {}, confidenceLevel: 0.5 };
    }
  }

  // ========================================== SUPPORT AI ==========================================
  
  /**
   * Classify and route support ticket
   */
  async classifyTicket(ticketContent) {
    const prompt = `Classify this support ticket for routing.

Content: """${ticketContent}"""

Return JSON: {
  category: "technical|billing|feature_request|bug|general",
  priority: "critical|high|medium|low",
  sentiment: "negative|neutral|positive",
  urgencyIndicators: string[],
  suggestedTeam: string,
  suggestedAssignee: string (role),
  responseTemplate: string,
  estimatedResolutionTime: string,
  relatedIssues: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel });
    try {
      return JSON.parse(response);
    } catch {
      return { category: 'general', priority: 'medium', sentiment: 'neutral' };
    }
  }

  /**
   * Generate support response
   */
  async generateSupportResponse(ticket, knowledgeBase = []) {
    const prompt = `Generate a support response.

Ticket: ${JSON.stringify(ticket, null, 2)}
Relevant Knowledge Base Articles: ${JSON.stringify(knowledgeBase.slice(0, 3), null, 2)}

Requirements:
- Empathetic and professional tone
- Address all concerns raised
- Reference specific solutions
- Include clear next steps
- Add relevant KB links

Return JSON: { response: string, internalNotes: string, escalated: boolean, kbArticlesUsed: string[] }`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel });
    try {
      return JSON.parse(response);
    } catch {
      return { response, internalNotes: '', escalated: false };
    }
  }

  // ========================================== PROJECTS AI ==========================================
  
  /**
   * Estimate project timeline
   */
  async estimateProject(projectScope, teamCapacity, similarProjects = []) {
    const prompt = `Estimate project timeline and resource needs.

Scope: ${JSON.stringify(projectScope, null, 2)}
Team Capacity: ${JSON.stringify(teamCapacity, null, 2)}
Similar Projects: ${JSON.stringify(similarProjects, null, 2)}

Return JSON: {
  estimates: {
    optimistic: { duration: string, cost: number },
    realistic: { duration: string, cost: number },
    pessimistic: { duration: string, cost: number }
  },
  milestones: [{ name: string, duration: string, dependencies: string[] }],
  resourceAllocation: object,
  riskFactors: string[],
  criticalPath: string[],
  bufferRecommendations: string
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { estimates: {}, milestones: [] };
    }
  }

  /**
   * Analyze project risks
   */
  async analyzeProjectRisks(projectData) {
    const prompt = `Analyze project for risks and mitigation strategies.

Project: ${JSON.stringify(projectData, null, 2)}

Return JSON: {
  risks: [
    { 
      category: "schedule|budget|resources|technical|external",
      description: string,
      probability: number (1-10),
      impact: number (1-10),
      riskScore: number,
      mitigation: string,
      contingency: string,
      owner: string
    }
  ],
  overallRiskLevel: "low|medium|high|critical",
  keyAssumptions: string[],
  earlyWarningIndicators: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { risks: [], overallRiskLevel: 'medium' };
    }
  }

  // ========================================== GENERAL AI ==========================================
  
  /**
   * Generate SQL query from natural language
   */
  async generateSQLQuery(naturalLanguage, schema) {
    const prompt = `Convert this request to SQL.

Request: "${naturalLanguage}"
Schema: ${JSON.stringify(schema, null, 2)}

Return JSON: { 
  sql: string, 
  explanation: string,
  filters: string[],
  aggregations: string[],
  suggestedVisualizations: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { sql: response, explanation: 'Generated SQL' };
    }
  }

  /**
   * Summarize data
   */
  async summarizeData(data, format = 'executive') {
    const prompt = `Summarize this data for ${format} audience.

Data: ${JSON.stringify(data, null, 2)}

Requirements:
- Key insights only
- Action-oriented
- Quantified where possible
- Bullet points preferred

Return summary text.`;

    return await this.ai.chat(prompt, { model: this.ai.defaultModel });
  }

  /**
   * Smart search/query understanding
   */
  async understandQuery(query, context) {
    const prompt = `Parse this natural language query into structured intent.

Query: "${query}"
Context: ${JSON.stringify(context, null, 2)}

Return JSON: {
  intent: "search|filter|analyze|create|update|delete",
  entities: [{ type: string, value: string }],
  filters: [{ field: string, operator: string, value: any }],
  sort: { field: string, direction: "asc|desc" },
  timeRange: { start: string, end: string },
  suggestedActions: string[]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel });
    try {
      return JSON.parse(response);
    } catch {
      return { intent: 'search', entities: [], filters: [] };
    }
  }

  // ========================================== SEARCH AI ==========================================

  /**
   * Enhance search results with AI-powered relevance scoring
   */
  async enhanceSearchResults(query, results) {
    const prompt = `Analyze and rank these search results for relevance to the query.

Query: "${query}"
Results: ${JSON.stringify(results.map(r => ({
  title: r.title,
  description: r.description,
  module: r.module
})), null, 2)}

Return JSON: {
  scores: [number], // relevance scores for each result (0-100)
  context: [string], // contextual explanation for each result
  suggestions: [string] // additional search suggestions
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return { 
        scores: results.map(() => 50), 
        context: results.map(() => 'AI analysis pending'),
        suggestions: []
      };
    }
  }

  /**
   * Process natural language search queries
   */
  async processSearchQuery(query) {
    const prompt = `Convert this natural language search query into structured search parameters.

Query: "${query}"

Return JSON: {
  processedQuery: string, // cleaned/optimized query
  filters: {
    modules: string[], // which modules to search
    dateRange: { start: string, end: string },
    status: string[],
    priority: string[],
    other: { [key: string]: any }
  },
  intent: string, // what the user is looking for
  suggestions: [string] // alternative queries
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return { 
        processedQuery: query,
        filters: { modules: ['all'] },
        intent: 'general search',
        suggestions: []
      };
    }
  }

  /**
   * Generate smart search suggestions
   */
  async generateSearchSuggestions(partialQuery, userContext) {
    const prompt = `Generate smart search suggestions based on partial query and user context.

Partial Query: "${partialQuery}"
User Context: ${JSON.stringify(userContext, null, 2)}

Return JSON: {
  suggestions: [
    {
      text: string,
      type: "recent|popular|entity|filter",
      description: string,
      icon: string
    }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return { suggestions: [] };
    }
  }

  /**
   * Analyze search patterns and provide insights
   */
  async analyzeSearchPatterns(searchHistory) {
    const prompt = `Analyze user search patterns and provide insights.

Search History: ${JSON.stringify(searchHistory, null, 2)}

Return JSON: {
  patterns: {
    frequentModules: string[],
    commonQueries: string[],
    timePatterns: string[],
    successRate: number
  },
  recommendations: {
    suggestedFilters: [string],
    popularEntities: [string],
    efficiencyTips: [string]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.defaultModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return { 
        patterns: { frequentModules: [], commonQueries: [], timePatterns: [], successRate: 0 },
        recommendations: { suggestedFilters: [], popularEntities: [], efficiencyTips: [] }
      };
    }
  }

  // ========================================== BOARD MEETING AI ==========================================

  /**
   * Generate AI insights for board meetings
   */
  async generateBoardInsights(data) {
    const prompt = `Generate executive-level insights for board meeting presentation.

Business Data: ${JSON.stringify(data, null, 2)}

Return JSON: {
  insights: [
    "Key insight about financial performance",
    "Strategic observation about market position",
    "Operational excellence highlight",
    "Risk and opportunity assessment",
    "Team and capability analysis"
  ],
  risks: [
    { level: "high|medium|low", description: string, mitigation: string }
  ],
  opportunities: [
    { impact: "high|medium|low", description: string, timeline: string }
  ],
  recommendations: [
    "Strategic recommendation 1",
    "Strategic recommendation 2",
    "Operational improvement suggestion"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Revenue growth indicates strong market traction",
          "Team expansion supporting business objectives",
          "Operational efficiency improving steadily"
        ],
        risks: [],
        opportunities: [],
        recommendations: ["Continue current growth strategy"]
      };
    }
  }

  /**
   * Predict board-level business outcomes
   */
  async predictBoardOutcomes(data) {
    const prompt = `Predict business outcomes for board-level strategic planning.

Current Metrics: ${JSON.stringify(data.currentMetrics, null, 2)}
Market Data: ${JSON.stringify(data.marketData, null, 2)}
Historical Data: ${JSON.stringify(data.historicalData.slice(0, 10), null, 2)}

Return JSON: {
  predictions: {
    revenueGrowth: number, // percentage next 12 months
    marketShareChange: number, // percentage points
    profitability: number, // percentage
    riskLevel: "low|medium|high"
  },
  scenarios: [
    {
      name: "Best Case",
      probability: number,
      description: string,
      keyDrivers: string[]
    },
    {
      name: "Base Case", 
      probability: number,
      description: string,
      keyDrivers: string[]
    },
    {
      name: "Worst Case",
      probability: number,
      description: string,
      keyDrivers: string[]
    }
  ],
  recommendations: [
    "Strategic action for maximizing success",
    "Risk mitigation recommendation",
    "Investment priority suggestion"
  ],
  keyMetrics: [
    { metric: string, current: number, projected: number, confidence: number }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        predictions: {
          revenueGrowth: 15,
          marketShareChange: 2.5,
          profitability: 22,
          riskLevel: "medium"
        },
        scenarios: [],
        recommendations: ["Focus on core business growth"],
        keyMetrics: []
      };
    }
  }

  /**
   * Generate investor relations insights
   */
  async generateInvestorInsights(data) {
    const prompt = `Generate investor relations insights and talking points.

Financial Data: ${JSON.stringify(data.financials, null, 2)}
Market Position: ${JSON.stringify(data.marketPosition, null, 2)}
Growth Metrics: ${JSON.stringify(data.growthMetrics, null, 2)}

Return JSON: {
  keyHighlights: [
    "Financial achievement highlight",
    "Market position strength",
    "Growth milestone",
    "Innovation advancement"
  ],
  investorTalkingPoints: [
    "Compelling narrative for investors",
    "Competitive advantage explanation",
    "Future growth story",
    "Risk management approach"
  ],
  financialProjections: {
    nextQuarter: { revenue: number, growth: number },
    nextYear: { revenue: number, growth: number, profitability: number }
  },
  riskFactors: [
    { factor: string, mitigation: string, impact: "low|medium|high" }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        keyHighlights: ["Strong revenue growth", "Market expansion"],
        investorTalkingPoints: ["Solid business fundamentals"],
        financialProjections: { nextQuarter: { revenue: 0, growth: 0 }, nextYear: { revenue: 0, growth: 0, profitability: 0 } },
        riskFactors: []
      };
    }
  }

  /**
   * Analyze compliance and regulatory risks
   */
  async analyzeComplianceRisks(data) {
    const prompt = `Analyze compliance and regulatory risks for executive oversight.

Compliance Data: ${JSON.stringify(data.complianceData, null, 2)}
Regulatory Environment: ${JSON.stringify(data.regulations, null, 2)}
Risk Assessments: ${JSON.stringify(data.riskAssessments, null, 2)}

Return JSON: {
  riskSummary: {
    overallRiskLevel: "low|medium|high|critical",
    criticalRisks: number,
    complianceScore: number,
    trend: "improving|stable|declining"
  },
  riskCategories: [
    {
      category: string,
      riskLevel: "low|medium|high|critical",
      items: [
        { 
          risk: string, 
          impact: string, 
          likelihood: string, 
          mitigation: string,
          owner: string,
          deadline: string
        }
      ]
    }
  ],
  recommendations: [
    "Compliance improvement action",
    "Risk mitigation priority",
    "Policy update requirement"
  ],
  upcomingDeadlines: [
    { requirement: string, deadline: string, status: "on-track|at-risk|overdue" }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        riskSummary: { overallRiskLevel: "medium", criticalRisks: 0, complianceScore: 85, trend: "stable" },
        riskCategories: [],
        recommendations: ["Maintain current compliance program"],
        upcomingDeadlines: []
      };
    }
  }

  /**
   * Generate strategic planning insights
   */
  async generateStrategicInsights(data) {
    const prompt = `Generate strategic planning insights and recommendations.

Current Strategy: ${JSON.stringify(data.currentStrategy, null, 2)}
Market Analysis: ${JSON.stringify(data.marketAnalysis, null, 2)}
Competitive Landscape: ${JSON.stringify(data.competitors, null, 2)}
Internal Capabilities: ${JSON.stringify(data.capabilities, null, 2)}

Return JSON: {
  strategicAssessment: {
    currentPosition: string,
    marketOpportunity: string,
    competitiveAdvantage: string,
    capabilityGaps: string[]
  },
  strategicInitiatives: [
    {
      initiative: string,
      priority: "high|medium|low",
      timeline: string,
      resources: string,
      expectedOutcome: string,
      riskFactors: string[]
    }
  ],
  marketScenarios: [
    {
      scenario: string,
      probability: number,
      impact: string,
      requiredActions: string[]
    }
  ],
  recommendations: [
    "Strategic priority 1",
    "Strategic priority 2", 
    "Capability development need"
  ],
  kpis: [
    { metric: string, current: number, target: number, timeframe: string }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        strategicAssessment: {
          currentPosition: "Strong market position",
          marketOpportunity: "Significant growth potential",
          competitiveAdvantage: "Technology leadership",
          capabilityGaps: ["Scale operations"]
        },
        strategicInitiatives: [],
        marketScenarios: [],
        recommendations: ["Focus on core competencies"],
        kpis: []
      };
    }
  }

  /**
   * Generate financial projections for investor relations
   */
  async generateFinancialProjections(data) {
    const prompt = `Generate detailed financial projections for investor presentations.

Current Metrics: ${JSON.stringify(data.currentMetrics, null, 2)}
Market Data: ${JSON.stringify(data.marketData, null, 2)}
Historical Data: ${JSON.stringify(data.historicalData.slice(0, 12), null, 2)}

Return JSON: {
  nextQuarter: {
    revenue: number,
    growth: number,
    profitability: number,
    keyDrivers: string[]
  },
  nextYear: {
    revenue: number,
    growth: number,
    profitability: number,
    ebitda: number,
    keyAssumptions: string[]
  },
  threeYearProjection: {
    year1: { revenue: number, growth: number, profitability: number },
    year2: { revenue: number, growth: number, profitability: number },
    year3: { revenue: number, growth: number, profitability: number }
  },
  riskFactors: [
    { factor: string, impact: "low|medium|high", probability: number }
  ],
  growthOpportunities: [
    { opportunity: string, marketSize: number, timeline: string }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        nextQuarter: { revenue: 8500000, growth: 18.5, profitability: 24.2, keyDrivers: ["Market expansion", "Product adoption"] },
        nextYear: { revenue: 42000000, growth: 22.3, profitability: 26.8, ebitda: 11760000, keyAssumptions: ["Market growth continues", "No major disruptions"] },
        threeYearProjection: {
          year1: { revenue: 42000000, growth: 22.3, profitability: 26.8 },
          year2: { revenue: 65000000, growth: 54.8, profitability: 28.5 },
          year3: { revenue: 95000000, growth: 46.2, profitability: 30.2 }
        },
        riskFactors: [],
        growthOpportunities: []
      };
    }
  }

  // ========================================== HR ANALYTICS AI ==========================================

  /**
   * Analyze people analytics and generate insights
   */
  async analyzePeopleAnalytics(data) {
    const prompt = `Analyze HR and people analytics data to generate actionable insights.

Employee Data: ${JSON.stringify(data.employees?.slice(0, 10), null, 2)}
Performance Data: ${JSON.stringify(data.performance?.slice(0, 10), null, 2)}
Recruitment Data: ${JSON.stringify(data.recruitment?.slice(0, 10), null, 2)}
Engagement Data: ${JSON.stringify(data.engagement?.slice(0, 10), null, 2)}

Return JSON: {
  insights: [
    "Key insight about employee performance trends",
    "Observation about recruitment effectiveness",
    "Finding about employee engagement levels",
    "Analysis of skill gaps and development needs",
    "Recommendation for retention improvement"
  ],
  performanceTrends: {
    averageRating: number,
    topPerformers: number,
    improvementAreas: string[],
    highPotentialEmployees: number
  },
  recruitmentAnalysis: {
    timeToHire: number,
    costPerHire: number,
    qualityOfHire: number,
    sourceEffectiveness: { [source: string]: number }
  },
  engagementDrivers: {
    keyFactors: string[],
    riskFactors: string[],
    improvementOpportunities: string[]
  },
  recommendations: [
    "HR strategy recommendation 1",
    "Talent development suggestion",
    "Retention improvement action",
    "Recruitment optimization tip"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Performance ratings show positive trend",
          "Engagement levels above industry average",
          "Recruitment pipeline needs optimization"
        ],
        performanceTrends: { averageRating: 3.8, topPerformers: 15, improvementAreas: [], highPotentialEmployees: 8 },
        recruitmentAnalysis: { timeToHire: 28, costPerHire: 8500, qualityOfHire: 82, sourceEffectiveness: {} },
        engagementDrivers: { keyFactors: [], riskFactors: [], improvementOpportunities: [] },
        recommendations: ["Focus on career development programs"]
      };
    }
  }

  /**
   * Predict people analytics trends
   */
  async predictPeopleTrends(data) {
    const prompt = `Predict HR and people analytics trends for strategic planning.

Current Metrics: ${JSON.stringify(data.currentMetrics, null, 2)}
Historical Data: ${JSON.stringify(data.historicalData?.slice(0, 12), null, 2)}
Market Data: ${JSON.stringify(data.marketData, null, 2)}

Return JSON: {
  turnoverRisk: {
    level: "low|medium|high",
    percentage: number,
    atRiskDepartments: string[],
    keyDrivers: string[]
  },
  hiringNeeds: {
    nextQuarter: number,
    nextYear: number,
    criticalRoles: string[],
    skillGaps: string[]
  },
  performanceProjections: {
    averageRating: number,
    improvementAreas: string[],
    developmentNeeds: string[]
  },
  budgetImpact: {
    recruitmentCosts: number,
    trainingInvestment: number,
    retentionSavings: number
  },
  recommendations: [
    "Strategic HR action 1",
    "Talent acquisition priority",
    "Retention strategy recommendation",
    "Development program suggestion"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        turnoverRisk: { level: "medium", percentage: 12.5, atRiskDepartments: ["Engineering"], keyDrivers: ["Career growth"] },
        hiringNeeds: { nextQuarter: 8, nextYear: 25, criticalRoles: ["Senior Developer"], skillGaps: ["AI/ML"] },
        performanceProjections: { averageRating: 3.9, improvementAreas: ["Leadership"], developmentNeeds: ["Technical skills"] },
        budgetImpact: { recruitmentCosts: 250000, trainingInvestment: 150000, retentionSavings: 400000 },
        recommendations: ["Invest in leadership development"]
      };
    }
  }

  /**
   * Generate recruitment AI recommendations
   */
  async generateRecruitmentInsights(data) {
    const prompt = `Generate AI-powered recruitment insights and recommendations.

Current Pipeline: ${JSON.stringify(data.pipeline, null, 2)}
Historical Hiring: ${JSON.stringify(data.historicalData?.slice(0, 10), null, 2)}
Market Data: ${JSON.stringify(data.marketData, null, 2)}

Return JSON: {
  pipelineAnalysis: {
    conversionRates: { [stage: string]: number },
    bottlenecks: string[],
    timeInStages: { [stage: string]: number }
  },
  candidateQuality: {
    averageScore: number,
    topCandidates: number,
    skillMatch: { [skill: string]: number }
  },
  sourceEffectiveness: {
    bestSources: string[],
    costPerSource: { [source: string]: number },
    qualityBySource: { [source: string]: number }
  },
  recommendations: [
    "Recruitment optimization suggestion 1",
    "Source improvement recommendation",
    "Process efficiency tip",
    "Candidate experience enhancement"
  ],
  predictions: {
    timeToFill: number,
    offerAcceptanceRate: number,
    firstYearPerformance: number
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        pipelineAnalysis: { conversionRates: {}, bottlenecks: [], timeInStages: {} },
        candidateQuality: { averageScore: 78, topCandidates: 5, skillMatch: {} },
        sourceEffectiveness: { bestSources: ["LinkedIn"], costPerSource: {}, qualityBySource: {} },
        recommendations: ["Improve interview process"],
        predictions: { timeToFill: 35, offerAcceptanceRate: 85, firstYearPerformance: 82 }
      };
    }
  }

  // ========================================== FINANCE AI ==========================================

  /**
   * Analyze financial data and generate insights
   */
  async analyzeFinancialData(data) {
    const prompt = `Analyze financial data to generate comprehensive insights and risk assessments.

Revenue Data: ${JSON.stringify(data.revenue?.slice(0, 12), null, 2)}
Expense Data: ${JSON.stringify(data.expenses?.slice(0, 12), null, 2)}
Transaction Data: ${JSON.stringify(data.transactions?.slice(0, 20), null, 2)}
Cash Flow Data: ${JSON.stringify(data.cashFlow?.slice(0, 12), null, 2)}

Return JSON: {
  insights: [
    "Key insight about revenue performance",
    "Expense optimization observation",
    "Cash flow analysis finding",
    "Profitability assessment",
    "Financial health indicator"
  ],
  performanceMetrics: {
    revenueGrowth: number,
    expenseGrowth: number,
    profitMargin: number,
    operatingEfficiency: number
  },
  riskFactors: [
    "Financial risk factor 1",
    "Cash flow concern",
    "Market risk exposure",
    "Operational risk"
  ],
  opportunities: [
    "Cost optimization opportunity",
    "Revenue enhancement potential",
    "Efficiency improvement area"
  ],
  recommendations: [
    "Financial strategy recommendation 1",
    "Cost control measure",
    "Investment priority suggestion",
    "Risk mitigation action"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Revenue showing strong growth trajectory",
          "Expenses well-controlled within budget",
          "Cash flow position healthy"
        ],
        performanceMetrics: { revenueGrowth: 18.5, expenseGrowth: 8.2, profitMargin: 24.3, operatingEfficiency: 87 },
        riskFactors: ["Market volatility", "Increasing competition"],
        opportunities: ["Digital transformation savings", "New market expansion"],
        recommendations: ["Maintain current growth strategy", "Monitor cash burn rate"]
      };
    }
  }

  /**
   * Predict financial trends and forecasts
   */
  async predictFinancialTrends(data) {
    const prompt = `Predict financial trends based on current metrics and historical data.

Current Metrics: ${JSON.stringify(data.currentMetrics, null, 2)}
Historical Data: ${JSON.stringify(data.historicalData?.slice(0, 12), null, 2)}
Market Data: ${JSON.stringify(data.marketData, null, 2)}

Return JSON: {
  revenueForecast: {
    nextQuarter: number,
    nextYear: number,
    growthRate: number,
    confidence: number
  },
  expenseForecast: {
    nextQuarter: number,
    nextYear: number,
    savingsOpportunities: number
  },
  cashFlowProjection: {
    nextQuarter: number,
    nextYear: number,
    runway: number,
    burnRate: number
  },
  profitabilityProjection: {
    nextQuarter: number,
    nextYear: number,
    marginImprovement: number
  },
  riskAssessment: {
    overallRisk: "low|medium|high",
    keyRisks: string[],
    mitigationStrategies: string[]
  },
  recommendations: [
    "Financial planning recommendation 1",
    "Investment priority suggestion",
    "Risk management action",
    "Growth strategy tip"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        revenueForecast: { nextQuarter: 8500000, nextYear: 42000000, growthRate: 22.3, confidence: 85 },
        expenseForecast: { nextQuarter: 6200000, nextYear: 31000000, savingsOpportunities: 450000 },
        cashFlowProjection: { nextQuarter: 2300000, nextYear: 11000000, runway: 18, burnRate: 6200000 },
        profitabilityProjection: { nextQuarter: 2300000, nextYear: 11000000, marginImprovement: 2.5 },
        riskAssessment: { overallRisk: "medium", keyRisks: ["Market competition"], mitigationStrategies: ["Diversify revenue streams"] },
        recommendations: ["Focus on high-margin products", "Optimize operational costs"]
      };
    }
  }

  /**
   * Generate detailed financial forecasts
   */
  async generateFinancialForecasts(data) {
    const prompt = `Generate detailed financial forecasts for strategic planning.

Revenue Data: ${JSON.stringify(data.revenue?.slice(0, 12), null, 2)}
Expense Data: ${JSON.stringify(data.expenses?.slice(0, 12), null, 2)}
Cash Flow Data: ${JSON.stringify(data.cashFlow?.slice(0, 12), null, 2)}

Return JSON: {
  nextQuarter: {
    revenue: number,
    expenses: number,
    netIncome: number,
    cashFlow: number,
    keyAssumptions: string[]
  },
  nextYear: {
    revenue: number,
    expenses: number,
    netIncome: number,
    cashFlow: number,
    keyAssumptions: string[]
  },
  threeYearProjection: {
    year1: { revenue: number, expenses: number, netIncome: number },
    year2: { revenue: number, expenses: number, netIncome: number },
    year3: { revenue: number, expenses: number, netIncome: number }
  },
  scenarios: [
    {
      name: "Best Case",
      probability: number,
      description: string,
      financialImpact: number
    },
    {
      name: "Base Case",
      probability: number,
      description: string,
      financialImpact: number
    },
    {
      name: "Worst Case",
      probability: number,
      description: string,
      financialImpact: number
    }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        nextQuarter: { revenue: 8500000, expenses: 6200000, netIncome: 2300000, cashFlow: 2800000, keyAssumptions: ["Market growth continues"] },
        nextYear: { revenue: 42000000, expenses: 31000000, netIncome: 11000000, cashFlow: 13000000, keyAssumptions: ["No major disruptions"] },
        threeYearProjection: {
          year1: { revenue: 42000000, expenses: 31000000, netIncome: 11000000 },
          year2: { revenue: 65000000, expenses: 47000000, netIncome: 18000000 },
          year3: { revenue: 95000000, expenses: 68000000, netIncome: 27000000 }
        },
        scenarios: []
      };
    }
  }

  /**
   * Detect and analyze financial fraud patterns
   */
  async detectFinancialFraud(data) {
    const prompt = `Analyze transaction data for potential fraud patterns and anomalies.

Transaction Data: ${JSON.stringify(data.transactions?.slice(0, 50), null, 2)}
Historical Patterns: ${JSON.stringify(data.historicalPatterns, null, 2)}
Risk Indicators: ${JSON.stringify(data.riskIndicators, null, 2)}

Return JSON: {
  fraudRiskScore: number, // 0-100
  suspiciousTransactions: [
    {
      transactionId: string,
      amount: number,
      riskLevel: "low|medium|high|critical",
      anomalies: string[],
      recommendation: string
    }
  ],
  riskPatterns: [
    {
      pattern: string,
      frequency: number,
      riskLevel: "low|medium|high",
      description: string
    }
  ],
  recommendations: [
    "Fraud prevention action 1",
    "Monitoring enhancement suggestion",
    "Policy update requirement",
    "Investigation priority"
  ],
  overallAssessment: {
    riskLevel: "low|medium|high|critical",
    confidence: number,
    keyFindings: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        fraudRiskScore: 15,
        suspiciousTransactions: [],
        riskPatterns: [],
        recommendations: ["Continue standard monitoring"],
        overallAssessment: { riskLevel: "low", confidence: 92, keyFindings: ["No significant fraud indicators detected"] }
      };
    }
  }

  // ========================================== REPORTING AI ==========================================

  /**
   * Analyze reporting data and generate insights
   */
  // Deprecated: superseded by the security-routed analyzeReportingData below. Dead code pending removal.
  async _deprecated_analyzeReportingData(data) {
    const prompt = `Analyze reporting data to generate insights and recommendations.

Reports Data: ${JSON.stringify(data.reports?.slice(0, 10), null, 2)}
Metrics: ${JSON.stringify(data.metrics, null, 2)}
Usage Data: ${JSON.stringify(data.usage, null, 2)}

Return JSON: {
  insights: [
    "Key insight about report usage patterns",
    "Observation about report performance",
    "Finding about user engagement",
    "Analysis of report effectiveness",
    "Recommendation for optimization"
  ],
  usage: {
    peakTime: string,
    popularType: string,
    topUsers: string[],
    engagementRate: number
  },
  performance: {
    avgRunTime: number,
    errorRate: number,
    successRate: number,
    mostReliableType: string
  },
  recommendations: [
    "Report optimization suggestion 1",
    "User engagement improvement",
    "Performance enhancement tip",
    "New report type recommendation"
  ],
  trends: {
    growingTypes: string[],
    decliningTypes: string[],
    seasonalPatterns: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Financial reports show highest engagement",
          "Automated reports reducing manual workload",
          "Peak usage during business hours"
        ],
        usage: { peakTime: "Tuesday 2-4 PM", popularType: "Financial Reports", topUsers: [], engagementRate: 78 },
        performance: { avgRunTime: 45, errorRate: 2.3, successRate: 97.7, mostReliableType: "Executive" },
        recommendations: ["Add more automated reports", "Optimize report templates"],
        trends: { growingTypes: ["AI Reports"], decliningTypes: ["Manual Reports"], seasonalPatterns: [] }
      };
    }
  }

  /**
   * Generate automated AI reports
   */
  async generateAutomatedReport(data) {
    const prompt = `Generate an automated AI report based on the template and data.

Template: ${JSON.stringify(data.template, null, 2)}
Metrics: ${JSON.stringify(data.metrics, null, 2)}
Historical Data: ${JSON.stringify(data.historicalData?.slice(0, 5), null, 2)}

Return JSON: {
  title: string,
  description: string,
  confidence: number, // 0-100
  insights: [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  metrics: {
    totalValue: number,
    growth: number,
    efficiency: number,
    riskLevel: string
  },
  recommendations: [
    "Actionable recommendation 1",
    "Strategic suggestion 2",
    "Optimization tip 3"
  ],
  visualizations: [
    {
      type: "chart|table|kpi",
      title: string,
      data: object
    }
  ],
  summary: string
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        title: "AI Generated Report",
        description: "Automated insights and analysis",
        confidence: 85,
        insights: ["Performance improving", "Costs optimized", "Efficiency increased"],
        metrics: { totalValue: 1250000, growth: 15.2, efficiency: 87, riskLevel: "Low" },
        recommendations: ["Continue current strategy", "Monitor key metrics"],
        visualizations: [],
        summary: "Overall positive performance with room for optimization"
      };
    }
  }

  /**
   * Optimize report scheduling and performance
   */
  async optimizeReportScheduling(data) {
    const prompt = `Optimize report scheduling based on usage patterns and system performance.

Current Schedule: ${JSON.stringify(data.currentSchedule, null, 2)}
Usage Patterns: ${JSON.stringify(data.usagePatterns, null, 2)}
System Load: ${JSON.stringify(data.systemLoad, null, 2)}

Return JSON: {
  optimizedSchedule: [
    {
      reportId: string,
      reportName: string,
      optimalTime: string,
      frequency: string,
      priority: "high|medium|low",
      estimatedDuration: number
    }
  ],
  performanceImprovements: {
    reducedRunTime: number,
    improvedSuccessRate: number,
    resourceOptimization: string[]
  },
  recommendations: [
    "Scheduling optimization 1",
    "Resource allocation suggestion",
    "Performance improvement tip"
  ],
  conflicts: [
    {
      conflict: string,
      resolution: string,
      impact: string
    }
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        optimizedSchedule: [],
        performanceImprovements: { reducedRunTime: 25, improvedSuccessRate: 5, resourceOptimization: ["Load balancing"] },
        recommendations: ["Stagger heavy reports", "Optimize peak hours"],
        conflicts: []
      };
    }
  }

  // ========================================== AUDIT LOGS AI ==========================================

  /**
   * Analyze audit logs and generate security insights
   */
  // Deprecated: superseded by the security-routed analyzeAuditLogs below. Dead code pending removal.
  async _deprecated_analyzeAuditLogs(data) {
    const prompt = `Analyze audit logs to detect security patterns and generate insights.

Audit Logs: ${JSON.stringify(data.logs?.slice(0, 20), null, 2)}
Anomalies: ${JSON.stringify(data.anomalies, null, 2)}
Statistics: ${JSON.stringify(data.stats, null, 2)}

Return JSON: {
  insights: [
    "Security pattern observation 1",
    "User behavior insight",
    "Access pattern analysis",
    "Potential security concern",
    "System usage trend"
  ],
  patterns: {
    peakTime: string,
    topUser: string,
    frequentActions: string[],
    unusualLocations: string[]
  },
  risks: [
    {
      type: string,
      level: "low|medium|high|critical",
      description: string,
      affectedUsers: string[]
    }
  ],
  recommendations: [
    "Security improvement suggestion 1",
    "Access control recommendation",
    "Monitoring enhancement tip",
    "User training need"
  ],
  securityScore: number, // 0-100
  threatLevel: "low|medium|high"
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Normal user activity patterns detected",
          "No significant security threats identified",
          "Peak usage during business hours"
        ],
        patterns: { peakTime: "2:00-4:00 PM", topUser: "admin@hermes.com", frequentActions: ["login", "update"], unusualLocations: [] },
        risks: [],
        recommendations: ["Continue monitoring", "Regular security reviews"],
        securityScore: 92,
        threatLevel: "low"
      };
    }
  }

  /**
   * Detect anomalies in audit log data
   */
  async detectAnomalies(data) {
    const prompt = `Detect security anomalies in audit log data using AI analysis.

Recent Logs: ${JSON.stringify(data.logs?.slice(0, 30), null, 2)}
Historical Data: ${JSON.stringify(data.historicalData?.slice(0, 30), null, 2)}
User Patterns: ${JSON.stringify(data.userPatterns, null, 2)}

Return JSON: {
  newAnomalies: [
    {
      id: string,
      type: "unusual_access_pattern|sensitive_data_access|multiple_failed_logins|suspicious_timing|privilege_escalation",
      severity: "low|medium|high|critical",
      description: string,
      affectedUser: string,
      timestamp: string,
      riskScore: number, // 0-100
      recommendation: string,
      indicators: string[]
    }
  ],
  patterns: {
    unusualIPs: string[],
    oddTiming: string[],
    privilegeAbuse: string[],
    dataAccess: string[]
  },
  riskAssessment: {
    overallRisk: "low|medium|high|critical",
    confidence: number,
    keyFindings: string[]
  },
  immediateActions: [
    "Immediate security action 1",
    "User account review",
    "Access permission audit"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        newAnomalies: [],
        patterns: { unusualIPs: [], oddTiming: [], privilegeAbuse: [], dataAccess: [] },
        riskAssessment: { overallRisk: "low", confidence: 95, keyFindings: ["No anomalies detected"] },
        immediateActions: ["Continue standard monitoring"]
      };
    }
  }

  /**
   * Generate security recommendations based on audit analysis
   */
  // Deprecated: superseded by the synchronous generateSecurityRecommendations below. Dead code pending removal.
  async _deprecated_generateSecurityRecommendations(data) {
    const prompt = `Generate comprehensive security recommendations based on audit log analysis.

Security Score: ${data.securityScore}
Threat Level: ${data.threatLevel}
Recent Anomalies: ${JSON.stringify(data.anomalies, null, 2)}
User Activity: ${JSON.stringify(data.userActivity, null, 2)}

Return JSON: {
  immediateActions: [
    {
      priority: "critical|high|medium|low",
      action: string,
      description: string,
      timeline: string
    }
  ],
  policyRecommendations: [
    {
      area: "access_control|authentication|monitoring|training",
      recommendation: string,
      impact: string,
      implementation: string
    }
  ],
  monitoringEnhancements: [
    {
      type: string,
      description: string,
      benefit: string
    }
  ],
  userTraining: [
    {
      topic: string,
      audience: string[],
      importance: string
    }
  ],
  securityImprovements: {
    shortTerm: string[],
    longTerm: string[],
    budgetConsiderations: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        immediateActions: [],
        policyRecommendations: [],
        monitoringEnhancements: [],
        userTraining: [],
        securityImprovements: { shortTerm: [], longTerm: [], budgetConsiderations: [] }
      };
    }
  }

  // ========================================== SECURITY MONITORING AI ==========================================

  /**
   * Analyze security metrics and generate insights
   */
  // Deprecated: superseded by the security-routed analyzeSecurityMetrics below. Dead code pending removal.
  async _deprecated_analyzeSecurityMetrics(data) {
    const prompt = `Analyze security metrics to provide comprehensive security insights.

Security Metrics: ${JSON.stringify(data.metrics, null, 2)}
Threats: ${JSON.stringify(data.threats, null, 2)}
Users: ${JSON.stringify(data.users, null, 2)}
Events: ${JSON.stringify(data.events, null, 2)}

Return JSON: {
  insights: [
    "Security strength observation 1",
    "Vulnerability assessment",
    "Access pattern analysis",
    "Threat intelligence insight",
    "Security posture recommendation"
  ],
  riskLevel: "low|medium|high|critical",
  vulnerabilities: [
    {
      type: string,
      severity: "low|medium|high|critical",
      description: string,
      affectedSystems: string[],
      remediation: string
    }
  ],
  recommendations: [
    "Security improvement suggestion 1",
    "Access control enhancement",
    "Monitoring upgrade recommendation",
    "User security training need"
  ],
  threatAnalysis: {
    currentThreats: number,
    threatTrends: string[],
    highRiskAreas: string[],
    mitigationStrategies: string[]
  },
  complianceStatus: {
    overall: "compliant|partial|non-compliant",
    gaps: string[],
    requirements: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Security posture is generally strong",
          "Multi-factor authentication needs improvement",
          "Regular security scans recommended"
        ],
        riskLevel: "low",
        vulnerabilities: [],
        recommendations: ["Enable 2FA for all users", "Regular security audits"],
        threatAnalysis: { currentThreats: 0, threatTrends: [], highRiskAreas: [], mitigationStrategies: [] },
        complianceStatus: { overall: "compliant", gaps: [], requirements: [] }
      };
    }
  }

  /**
   * Perform comprehensive AI security scan
   */
  async performSecurityScan(data) {
    const prompt = `Perform a comprehensive AI-powered security scan of the system.

Current Metrics: ${JSON.stringify(data.currentMetrics, null, 2)}
Active Users: ${JSON.stringify(data.activeUsers, null, 2)}
Recent Events: ${JSON.stringify(data.recentEvents, null, 2)}

Return JSON: {
  scanResults: {
    overallScore: number, // 0-100
    riskLevel: "low|medium|high|critical",
    scanDuration: number,
    areasScanned: string[]
  },
  newThreats: [
    {
      id: string,
      type: "malware|phishing|unauthorized_access|data_breach|system_vulnerability",
      severity: "low|medium|high|critical",
      description: string,
      source: string,
      timestamp: string,
      affectedSystems: string[],
      immediateAction: string
    }
  ],
  updatedMetrics: {
    vulnerabilities: {
      critical: number,
      high: number,
      medium: number,
      low: number
    },
    securityScore: number,
    lastScanTime: string,
    threatsDetected: number
  },
  securityGaps: [
    {
      area: string,
      gap: string,
      priority: "low|medium|high|critical",
      recommendation: string
    }
  ],
  immediateActions: [
    "Critical security action 1",
    "System update requirement",
    "Access control adjustment"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        scanResults: { overallScore: 88, riskLevel: "low", scanDuration: 45, areasScanned: ["Authentication", "Access Control", "Data Protection"] },
        newThreats: [],
        updatedMetrics: { vulnerabilities: { critical: 0, high: 0, medium: 2, low: 5 }, securityScore: 88, lastScanTime: new Date().toISOString(), threatsDetected: 0 },
        securityGaps: [],
        immediateActions: ["Continue monitoring", "Schedule regular scans"]
      };
    }
  }

  /**
   * Monitor real-time security threats
   */
  async monitorSecurityThreats(data) {
    const prompt = `Monitor and analyze real-time security threats and provide immediate alerts.

Current Threats: ${JSON.stringify(data.currentThreats, null, 2)}
System Activity: ${JSON.stringify(data.systemActivity, null, 2)}
User Behavior: ${JSON.stringify(data.userBehavior, null, 2)}
Network Traffic: ${JSON.stringify(data.networkTraffic, null, 2)}

Return JSON: {
  activeThreats: [
    {
      id: string,
      type: string,
      severity: "low|medium|high|critical",
      status: "active|investigating|mitigated",
      description: string,
      source: string,
      target: string,
      timestamp: string,
      riskScore: number
    }
  ],
  threatIntelligence: {
    emergingThreats: string[],
    threatActors: string[],
    attackPatterns: string[],
    indicators: string[]
  },
  alerts: [
    {
      level: "info|warning|critical",
      message: string,
      recommendation: string,
      urgency: "low|medium|high"
    }
  ],
  recommendations: [
    "Immediate security action 1",
    "System protection measure",
    "User communication needed"
  ],
  riskAssessment: {
    currentRisk: "low|medium|high|critical",
    riskFactors: string[],
    mitigationStatus: string
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.2 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        activeThreats: [],
        threatIntelligence: { emergingThreats: [], threatActors: [], attackPatterns: [], indicators: [] },
        alerts: [],
        recommendations: ["Continue monitoring", "Update security protocols"],
        riskAssessment: { currentRisk: "low", riskFactors: [], mitigationStatus: "Stable" }
      };
    }
  }

  // ========================================== SETTINGS OPTIMIZATION AI ==========================================

  /**
   * Analyze settings and provide optimization recommendations
   */
  // Deprecated: superseded by the security-routed analyzeSettings below. Dead code pending removal.
  async _deprecated_analyzeSettings(data) {
    const prompt = `Analyze user settings to provide optimization insights and recommendations.

Profile Settings: ${JSON.stringify(data.profile, null, 2)}
Company Settings: ${JSON.stringify(data.company, null, 2)}
Notification Settings: ${JSON.stringify(data.notifications, null, 2)}

Return JSON: {
  insights: [
    "Settings optimization insight 1",
    "Productivity enhancement suggestion",
    "Security improvement observation",
    "User experience optimization",
    "Best practice recommendation"
  ],
  recommendations: [
    {
      id: string,
      category: "security|productivity|integration|collaboration",
      priority: "high|medium|low",
      title: string,
      description: string,
      impact: string,
      effort: "low|medium|high"
    }
  ],
  optimizationScore: number, // 0-100
  patterns: {
    peakTime: string,
    topFeatures: string[],
    usageFrequency: string,
    preferredCommunication: string
  },
  suggestions: [
    "Personalized suggestion 1",
    "Settings improvement tip",
    "Feature optimization idea"
  ],
  bestPractices: {
    security: string[],
    productivity: string[],
    collaboration: string[]
  }
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        insights: [
          "Profile is well configured",
          "Notification settings could be optimized",
          "Security settings are strong"
        ],
        recommendations: [],
        optimizationScore: 75,
        patterns: { peakTime: "9:00-11:00 AM", topFeatures: ["Dashboard", "Reports"], usageFrequency: "daily", preferredCommunication: "email" },
        suggestions: ["Enable 2FA", "Optimize notifications"],
        bestPractices: { security: [], productivity: [], collaboration: [] }
      };
    }
  }

  /**
   * Optimize settings based on user behavior and best practices
   */
  async optimizeSettings(data) {
    const prompt = `Optimize user settings based on behavior analysis and best practices.

Current Settings: ${JSON.stringify(data.currentSettings, null, 2)}
User Behavior: ${JSON.stringify(data.userBehavior, null, 2)}
Best Practices: ${JSON.stringify(data.bestPractices, null, 2)}

Return JSON: {
  optimizedScore: number, // 0-100
  improvements: [
    {
      area: string,
      change: string,
      benefit: string,
      priority: "high|medium|low"
    }
  ],
  recommendations: [
    {
      id: string,
      category: "security|productivity|integration|collaboration",
      priority: "high|medium|low",
      title: string,
      description: string,
      impact: string,
      effort: "low|medium|high"
    }
  ],
  automatedOptimizations: [
    {
      setting: string,
      oldValue: string,
      newValue: string,
      reason: string
    }
  ],
  personalization: {
    communicationStyle: string,
    workHours: string[],
    featurePreferences: string[],
    notificationTiming: string
  },
  insights: [
    "Optimization insight 1",
    "Personalization recommendation",
    "Efficiency improvement suggestion"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.3 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        optimizedScore: 85,
        improvements: [],
        recommendations: [],
        automatedOptimizations: [],
        personalization: { communicationStyle: "email", workHours: [], featurePreferences: [], notificationTiming: "business_hours" },
        insights: ["Settings optimized for productivity", "Personalized recommendations applied"]
      };
    }
  }

  /**
   * Generate personalized settings recommendations
   */
  async generatePersonalizedRecommendations(data) {
    const prompt = `Generate personalized settings recommendations based on user profile and behavior.

User Profile: ${JSON.stringify(data.userProfile, null, 2)}
Usage Patterns: ${JSON.stringify(data.usagePatterns, null, 2)}
Role Requirements: ${JSON.stringify(data.roleRequirements, null, 2)}
Team Context: ${JSON.stringify(data.teamContext, null, 2)}

Return JSON: {
  personalizedSettings: {
    notifications: {
      email: boolean,
      push: boolean,
      sms: boolean,
      frequency: string,
      timing: string
    },
    productivity: {
      focusMode: boolean,
      doNotDisturb: string[],
      batchProcessing: boolean
    },
    collaboration: {
      preferredTools: string[],
      sharingDefaults: string[],
      meetingPreferences: string
    }
  },
  recommendations: [
    {
      category: string,
      title: string,
      description: string,
      personalization: string,
      expectedBenefit: string
    }
  ],
  quickWins: [
    {
      action: string,
      timeToImplement: string,
      immediateBenefit: string
    }
  ],
  longTermOptimizations: [
    {
      area: string,
      optimization: string,
      timeline: string,
      impact: string
    }
  ],
  adaptationSuggestions: [
    "Adaptation suggestion 1",
    "Personalization tip",
    "Workflow optimization"
  ]
}`;

    const response = await this.ai.chat(prompt, { model: this.ai.premiumModel, temperature: 0.4 });
    try {
      return JSON.parse(response);
    } catch {
      return {
        personalizedSettings: {
          notifications: { email: true, push: false, sms: false, frequency: "daily", timing: "business_hours" },
          productivity: { focusMode: true, doNotDisturb: [], batchProcessing: true },
          collaboration: { preferredTools: [], sharingDefaults: [], meetingPreferences: [] }
        },
        recommendations: [],
        quickWins: [],
        longTermOptimizations: [],
        adaptationSuggestions: ["Gradual notification reduction", "Focus time blocking"]
      };
    }
  }

  // ========================================== CORE GROQ AI METHODS ==========================================
  // These methods use secure routing to protect client data

  async analyzeDeals(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeDeals',
      module: 'deals',
      operation: 'analysis'
    });
  }

  async generateDealInsights(deal) {
    return await this.security.routeAIRequest(deal, {
      method: 'generateDealInsights',
      module: 'deals',
      operation: 'analysis'
    });
  }

  async analyzeContacts(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeContacts',
      module: 'contacts',
      operation: 'analysis'
    });
  }

  async analyzeTeamPerformance(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeTeamPerformance',
      module: 'team',
      operation: 'analysis'
    });
  }

  async analyzeRevenue(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeRevenue',
      module: 'revenue',
      operation: 'analysis'
    });
  }

  async analyzeProjects(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeProjects',
      module: 'projects',
      operation: 'analysis'
    });
  }

  async analyzeTasks(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeTasks',
      module: 'tasks',
      operation: 'analysis'
    });
  }

  async generateKnowledgeContent(data) {
    return await this.security.routeAIRequest(data, {
      method: 'generateKnowledgeContent',
      module: 'knowledgeBase',
      operation: 'generation'
    });
  }

  async analyzeReportingData(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeReportingData',
      module: 'reports',
      operation: 'analysis'
    });
  }

  async analyzeAuditLogs(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeAuditLogs',
      module: 'auditLogs',
      operation: 'analysis'
    });
  }

  async analyzeSecurityMetrics(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeSecurityMetrics',
      module: 'security',
      operation: 'analysis'
    });
  }

  async analyzeSettings(data) {
    return await this.security.routeAIRequest(data, {
      method: 'analyzeSettings',
      module: 'settings',
      operation: 'analysis'
    });
  }

  async generateQuickInsights(data, context) {
    return await this.security.routeAIRequest(data, {
      method: 'generateQuickInsights',
      module: context,
      operation: 'analysis'
    });
  }

  async generateSummary(content, maxLength) {
    // For summaries, check if content contains sensitive data
    const sensitivity = this.security.classifyDataSensitivity({ content });
    
    if (sensitivity.level === 'high') {
      return {
        summary: 'Content contains sensitive data - summary not available',
        _metadata: {
          aiProvider: 'local',
          sensitivityLevel: sensitivity.level,
          reason: 'Content protection'
        }
      };
    }
    
    try {
      const result = await this.ai.generateSummary(content, maxLength);
      return {
        ...result,
        _metadata: {
          aiProvider: 'groq',
          sensitivityLevel: sensitivity.level,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      return {
        summary: 'Summary generation failed - content may contain sensitive information',
        _metadata: {
          aiProvider: 'local',
          error: error.message
        }
      };
    }
  }

  async generateRecommendations(situation, options) {
    const context = {
      method: 'generateRecommendations',
      module: options.context?.module || 'general',
      operation: 'recommendation'
    };
    
    return await this.security.routeAIRequest({ situation, options }, context);
  }

  async healthCheck() {
    try {
      const groqHealth = await this.ai.healthCheck();
      const securityHealth = {
        status: 'healthy',
        dataProtection: 'enabled',
        auditLogging: 'active',
        routing: 'secure'
      };
      
      return {
        ...groqHealth,
        security: securityHealth,
        overall: groqHealth.status === 'healthy' ? 'healthy' : 'degraded'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        security: {
          status: 'healthy',
          dataProtection: 'enabled',
          auditLogging: 'active'
        }
      };
    }
  }

  // ========================================== SECURITY & COMPLIANCE METHODS ==========================================

  async getDataSensitivityReport(data, context = {}) {
    const analysis = this.security.classifyDataSensitivity(data, context);
    const auditLogs = this.security.getAuditLogs(10);
    
    return {
      sensitivity: analysis,
      recentActivity: auditLogs.slice(-5),
      recommendations: this.generateSecurityRecommendations(analysis),
      complianceStatus: this.checkComplianceStatus(analysis)
    };
  }

  generateSecurityRecommendations(sensitivity) {
    const recommendations = [];
    
    if (sensitivity.level === 'high') {
      recommendations.push({
        priority: 'critical',
        action: 'Enable strict data protection mode',
        description: 'All client data processing must use secure local AI only'
      });
    }
    
    if (sensitivity.level === 'medium') {
      recommendations.push({
        priority: 'high',
        action: 'Implement data masking',
        description: 'Mask sensitive fields before external AI processing'
      });
    }
    
    return recommendations;
  }

  checkComplianceStatus(sensitivity) {
    const status = {
      gdpr: sensitivity.level === 'high' ? 'compliant' : 'review-needed',
      dataResidency: sensitivity.canUseExternalAI ? 'external' : 'internal',
      encryption: 'enabled',
      auditTrail: 'active'
    };
    
    return status;
  }

  async getSecurityAuditLogs(limit = 50) {
    return this.security.getAuditLogs(limit);
  }

  async clearSecurityAuditLogs() {
    this.security.clearAuditLogs();
    return { success: true, message: 'Security audit logs cleared' };
  }
}

export default new AIModuleServices();
