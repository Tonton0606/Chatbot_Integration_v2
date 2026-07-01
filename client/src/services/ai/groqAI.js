/**
 * Groq AI Service - Backbone AI for Hermes Admin Panel
 *
 * ⚠️  ARCHITECTURE NOTE (fixed):
 * All AI calls are proxied through the Express backend (/api/ai/*).
 * VITE_GROQ_API_KEY is NOT used client-side — the key lives only in server/.env.
 * The backend applies auth, rate-limiting, and logging before forwarding to Groq.
 */
import { supabase } from '../../config/supabaseClient';

const RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);
const API_BASE = RAW.endsWith('/api')
  ? RAW
  : RAW
    ? `${RAW}/api`
    : import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : '/api';

async function getBearerToken() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || '';
  } catch {
    return '';
  }
}

async function backendPost(path, body) {
  const token = await getBearerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `AI backend error ${res.status}`);
  }
  return json;
}

async function backendGet(path) {
  const token = await getBearerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `AI backend error ${res.status}`);
  return json;
}

class GroqAIService {
  constructor() {
    // Models are now selected server-side — kept here for display/reference only.
    this.models = {
      fast: 'llama-3.1-8b-instant',
      balanced: 'llama-3.3-70b-versatile',
      analytical: 'llama-3.3-70b-versatile',
      creative: 'llama-3.3-70b-versatile',
    };

    this.temperatures = {
      analytical: 0.1,
      balanced: 0.3,
      creative: 0.7,
      conversational: 0.5,
    };
  }

  /** Health check — hits the backend /api/ai/health endpoint. */
  async healthCheck() {
    try {
      return await backendGet('/ai/health');
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Core chat completion — proxied through the backend (/api/ai/chat).
   * The backend holds the GROQ_API_KEY; the browser never exposes it.
   */
  async chat(prompt, options = {}) {
    const {
      model = 'balanced',
      temperature = 0.3,
      maxTokens = 2000,
      systemPrompt = null,
    } = options;

    try {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const json = await backendPost('/ai/chat', {
        messages,
        model: this.models[model] || model,
        temperature,
        maxTokens,
      });

      return json.content || json.answer || JSON.stringify(json);
    } catch (error) {
      throw new Error(`AI backend error: ${error.message}`);
    }
  }

  /**
   * Structured JSON response method
   */
  async structuredChat(prompt, options = {}) {
    const response = await this.chat(prompt, options);

    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct JSON parse
      return JSON.parse(response);
    } catch {
      return { rawResponse: response };
    }
  }

  // ========================================== DEALS AI ==========================================

  async analyzeDeals(data) {
    const prompt = `Analyze deals data and provide comprehensive insights.

Deals Data: ${JSON.stringify(data.deals?.slice(0, 10), null, 2)}
Pipeline Stages: ${JSON.stringify(data.pipelineStages, null, 2)}
Metrics: ${JSON.stringify(data.metrics, null, 2)}

Return JSON in this format:
{
  "insights": [
    "Key insight about deal performance",
    "Pipeline bottleneck observation",
    "Revenue trend analysis"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Strategy improvement suggestion",
    "Resource allocation tip"
  ],
  "predictions": {
    "winRate": number,
    "revenueForecast": number,
    "dealVelocity": number
  },
  "risks": [
    {
      "type": "pipeline|competition|pricing",
      "level": "low|medium|high",
      "description": "Risk description"
    }
  ],
  "opportunities": [
    "Growth opportunity 1",
    "Market expansion possibility",
    "Cross-sell potential"
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.2,
    });
  }

  async generateDealInsights(deal) {
    const prompt = `Provide AI-powered insights for this specific deal.

Deal Data: ${JSON.stringify(deal, null, 2)}

Return JSON:
{
  "nextSteps": [
    "Specific next action 1",
    "Follow-up task 2",
    "Critical milestone 3"
  ],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["Risk factor 1", "Risk factor 2"],
    "mitigation": "Mitigation strategy"
  },
  "pricingSuggestion": {
    "recommended": number,
    "range": {"min": number, "max": number},
    "rationale": "Pricing rationale"
  },
  "competitivePosition": {
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1"],
    "differentiators": ["Unique value 1"]
  },
  "winProbability": number,
  "estimatedCloseDate": "YYYY-MM-DD"
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.3,
    });
  }

  // ========================================== CONTACTS AI ==========================================

  async analyzeContacts(data) {
    const prompt = `Analyze contacts data and provide relationship insights.

Contacts Data: ${JSON.stringify(data.contacts?.slice(0, 10), null, 2)}
Interactions: ${JSON.stringify(data.interactions, null, 2)}
Engagement Metrics: ${JSON.stringify(data.metrics, null, 2)}

Return JSON:
{
  "insights": [
    "Contact engagement pattern",
    "Relationship strength observation",
    "Communication preference insight"
  ],
  "recommendations": [
    "Relationship building action 1",
    "Engagement improvement tip",
    "Communication strategy suggestion"
  ],
  "segments": [
    {
      "name": "Segment Name",
      "criteria": "Segment criteria",
      "size": number,
      "characteristics": ["Characteristic 1", "Characteristic 2"]
    }
  ],
  "opportunities": [
    "Upsell opportunity 1",
    "Referral potential 2",
    "Partnership possibility 3"
  ],
  "riskFactors": [
    "Churn risk indicator 1",
    "Engagement decline concern 2"
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.3,
    });
  }

  // ========================================== TEAM AI ==========================================

  async analyzeTeamPerformance(data) {
    const prompt = `Analyze team performance and provide optimization insights.

Team Data: ${JSON.stringify(data.teamMembers, null, 2)}
Performance Metrics: ${JSON.stringify(data.metrics, null, 2)}
Projects Data: ${JSON.stringify(data.projects?.slice(0, 5), null, 2)}

Return JSON:
{
  "insights": [
    "Team performance observation 1",
    "Collaboration pattern insight",
    "Productivity trend analysis"
  ],
  "recommendations": [
    "Team optimization suggestion 1",
    "Skill development recommendation",
    "Process improvement idea"
  ],
  "strengths": [
    "Team strength 1",
    "Competitive advantage 2"
  ],
  "improvements": [
    {
      "area": "Specific area",
      "current": "Current state",
      "target": "Target state",
      "actions": ["Action 1", "Action 2"]
    }
  ],
  "predictions": {
    "performanceTrend": "improving|stable|declining",
    "capacityUtilization": number,
    "burnoutRisk": "low|medium|high"
  }
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.2,
    });
  }

  // ========================================== REVENUE AI ==========================================

  async analyzeRevenue(data) {
    const prompt = `Analyze revenue data and provide financial insights.

Revenue Data: ${JSON.stringify(data.revenue?.slice(0, 12), null, 2)}
Forecast Data: ${JSON.stringify(data.forecast, null, 2)}
Market Metrics: ${JSON.stringify(data.marketMetrics, null, 2)}

Return JSON:
{
  "insights": [
    "Revenue trend observation 1",
    "Growth driver analysis",
    "Seasonal pattern insight"
  ],
  "forecast": {
    "nextMonth": number,
    "nextQuarter": number,
    "nextYear": number,
    "confidence": number
  },
  "recommendations": [
    "Revenue optimization strategy 1",
    "Growth initiative suggestion",
    "Cost optimization tip"
  ],
  "risks": [
    {
      "type": "market|competition|economic",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "description": "Risk description"
    }
  ],
  "opportunities": [
    "Market expansion opportunity 1",
    "Product upsell potential 2",
    "New revenue stream 3"
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.1,
    });
  }

  // ========================================== PROJECTS AI ==========================================

  async analyzeProjects(data) {
    const prompt = `Analyze project data and provide management insights.

Projects Data: ${JSON.stringify(data.projects?.slice(0, 10), null, 2)}
Resources: ${JSON.stringify(data.resources, null, 2)}
Timeline: ${JSON.stringify(data.timeline, null, 2)}

Return JSON:
{
  "insights": [
    "Project performance observation 1",
    "Resource utilization insight",
    "Timeline risk analysis"
  ],
  "recommendations": [
    "Project optimization suggestion 1",
    "Resource reallocation tip",
    "Risk mitigation strategy"
  ],
  "predictions": {
    "onTimeDelivery": number,
    "budgetAdherence": number,
    "qualityScore": number
  },
  "risks": [
    {
      "project": "Project Name",
      "risk": "Risk description",
      "probability": "low|medium|high",
      "mitigation": "Mitigation strategy"
    }
  ],
  "optimizations": [
    {
      "area": "Resource|Timeline|Budget",
      "suggestion": "Optimization suggestion",
      "impact": "low|medium|high"
    }
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.2,
    });
  }

  // ========================================== TASKS AI ==========================================

  async analyzeTasks(data) {
    const prompt = `Analyze task data and provide productivity insights.

Tasks Data: ${JSON.stringify(data.tasks?.slice(0, 15), null, 2)}
Productivity Metrics: ${JSON.stringify(data.metrics, null, 2)}
Workload Distribution: ${JSON.stringify(data.workload, null, 2)}

Return JSON:
{
  "insights": [
    "Productivity pattern observation 1",
    "Workload balance insight",
    "Task completion trend analysis"
  ],
  "recommendations": [
    "Productivity improvement suggestion 1",
    "Task prioritization tip",
    "Workload optimization idea"
  ],
  "predictions": {
    "completionRate": number,
    "avgCompletionTime": number,
    "bottlenecks": ["Bottleneck 1", "Bottleneck 2"]
  ],
  "optimizations": [
    {
      "area": "Prioritization|Delegation|Automation",
      "suggestion": "Optimization suggestion",
      "potentialGain": "Time or efficiency gain"
    }
  ],
  "workloadBalance": {
    "status": "balanced|overloaded|underutilized",
    "recommendations": ["Balance recommendation 1", "Balance recommendation 2"]
  }
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.3,
    });
  }

  // ========================================== KNOWLEDGE BASE AI ==========================================

  async generateKnowledgeContent(data) {
    const prompt = `Generate AI-powered content for knowledge base.

Topic: ${data.topic}
Target Audience: ${data.audience}
Content Type: ${data.contentType}
Keywords: ${data.keywords?.join(', ')}

Return JSON:
{
  "title": "SEO-optimized title",
  "content": "Comprehensive article content with headings and structure",
  "summary": "Brief summary for meta description",
  "keywords": ["SEO keyword 1", "SEO keyword 2", "SEO keyword 3"],
  "readabilityScore": number,
  "seoScore": number,
  "suggestions": [
    "Content improvement suggestion 1",
    "SEO optimization tip 2",
    "Engagement enhancement idea 3"
  ],
  "relatedTopics": [
    "Related topic 1",
    "Related topic 2",
    "Related topic 3"
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'creative',
      temperature: 0.7,
    });
  }

  // ========================================== REPORTS AI ==========================================

  async analyzeReportingData(data) {
    const prompt = `Analyze reporting data and generate insights.

Reports Data: ${JSON.stringify(data.reports?.slice(0, 10), null, 2)}
Metrics: ${JSON.stringify(data.metrics, null, 2)}
Usage Data: ${JSON.stringify(data.usage, null, 2)}

Return JSON:
{
  "insights": [
    "Data insight 1",
    "Performance observation 2",
    "Trend analysis 3"
  ],
  "patterns": {
    "usage": ["Usage pattern 1", "Usage pattern 2"],
    "performance": ["Performance pattern 1"],
    "anomalies": ["Anomaly 1"]
  },
  "recommendations": [
    "Report optimization suggestion 1",
    "Data visualization improvement 2",
    "Metric enhancement idea 3"
  ],
  "forecasts": {
    "usage": number,
    "performance": number,
    "growth": number
  }
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.2,
    });
  }

  // ========================================== AUDIT LOGS AI ==========================================

  async analyzeAuditLogs(data) {
    const prompt = `Analyze audit logs for security insights.

Audit Logs: ${JSON.stringify(data.logs?.slice(0, 20), null, 2)}
Anomalies: ${JSON.stringify(data.anomalies, null, 2)}
Statistics: ${JSON.stringify(data.stats, null, 2)}

Return JSON:
{
  "insights": [
    "Security pattern observation 1",
    "User behavior insight",
    "Access pattern analysis"
  ],
  "patterns": {
    "peakTime": "Peak activity time",
    "topUser": "Most active user",
    "frequentActions": ["Action 1", "Action 2"],
    "unusualLocations": ["Location 1"]
  },
  "risks": [
    {
      "type": "Risk type",
      "level": "low|medium|high|critical",
      "description": "Risk description",
      "affectedUsers": ["User 1", "User 2"]
    }
  ],
  "recommendations": [
    "Security improvement suggestion 1",
    "Access control recommendation",
    "Monitoring enhancement tip"
  ],
  "securityScore": number,
  "threatLevel": "low|medium|high"
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.1,
    });
  }

  // ========================================== SECURITY AI ==========================================

  async analyzeSecurityMetrics(data) {
    const prompt = `Analyze security metrics and provide insights.

Security Metrics: ${JSON.stringify(data.metrics, null, 2)}
Threats: ${JSON.stringify(data.threats, null, 2)}
Users: ${JSON.stringify(data.users, null, 2)}
Events: ${JSON.stringify(data.events, null, 2)}

Return JSON:
{
  "insights": [
    "Security strength observation 1",
    "Vulnerability assessment",
    "Access pattern analysis"
  ],
  "riskLevel": "low|medium|high|critical",
  "vulnerabilities": [
    {
      "type": "Vulnerability type",
      "severity": "low|medium|high|critical",
      "description": "Description",
      "affectedSystems": ["System 1"],
      "remediation": "Remediation steps"
    }
  ],
  "recommendations": [
    "Security improvement suggestion 1",
    "Access control enhancement",
    "Monitoring upgrade recommendation"
  ],
  "threatAnalysis": {
    "currentThreats": number,
    "threatTrends": ["Trend 1"],
    "highRiskAreas": ["Area 1"],
    "mitigationStrategies": ["Strategy 1"]
  }
}`;

    return await this.structuredChat(prompt, {
      model: 'analytical',
      temperature: 0.1,
    });
  }

  // ========================================== SETTINGS AI ==========================================

  async analyzeSettings(data) {
    const prompt = `Analyze user settings and provide optimization insights.

Profile Settings: ${JSON.stringify(data.profile, null, 2)}
Company Settings: ${JSON.stringify(data.company, null, 2)}
Notification Settings: ${JSON.stringify(data.notifications, null, 2)}

Return JSON:
{
  "insights": [
    "Settings optimization insight 1",
    "Productivity enhancement suggestion",
    "Security improvement observation"
  ],
  "recommendations": [
    {
      "id": "1",
      "category": "security|productivity|integration|collaboration",
      "priority": "high|medium|low",
      "title": "Recommendation title",
      "description": "Detailed description",
      "impact": "Expected impact",
      "effort": "low|medium|high"
    }
  ],
  "optimizationScore": number,
  "patterns": {
    "peakTime": "Peak usage time",
    "topFeatures": ["Feature 1", "Feature 2"],
    "usageFrequency": "Frequency",
    "preferredCommunication": "Communication preference"
  },
  "suggestions": [
    "Personalized suggestion 1",
    "Settings improvement tip",
    "Feature optimization idea"
  ]
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.4,
    });
  }

  // ========================================== UNIVERSAL AI METHODS ==========================================

  async generateQuickInsights(data, context) {
    const prompt = `Generate quick insights for ${context}.

Data: ${JSON.stringify(data, null, 2)}

Provide 3-5 key insights in JSON format:
{
  "insights": [
    "Quick insight 1",
    "Quick insight 2",
    "Quick insight 3"
  ],
  "score": number,
  "trend": "up|down|stable"
}`;

    return await this.structuredChat(prompt, {
      model: 'fast',
      temperature: 0.3,
      maxTokens: 500,
    });
  }

  async generateSummary(content, maxLength = 200) {
    const prompt = `Summarize this content in ${maxLength} words or less:

${content}

Provide a concise summary that captures the key points.`;

    return await this.chat(prompt, {
      model: 'fast',
      temperature: 0.2,
      maxTokens: 300,
    });
  }

  async generateRecommendations(situation, options = {}) {
    const prompt = `Generate actionable recommendations for: ${situation}

Context: ${JSON.stringify(options.context || {}, null, 2)}

Return JSON:
{
  "recommendations": [
    {
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "impact": "Expected impact",
      "effort": "Required effort",
      "timeline": "Expected timeline"
    }
  ],
  "nextSteps": ["Immediate next step 1", "Immediate next step 2"]
}`;

    return await this.structuredChat(prompt, {
      model: 'balanced',
      temperature: 0.3,
    });
  }

  // ========================================== LEGACY HEALTH CHECK (overridden above) ==========================================
  // The primary healthCheck() defined at the top of the class hits the backend /api/ai/health.
  // This stub is kept so any old code referencing the old 'healthy/unhealthy' shape still works.
}

export default new GroqAIService();
