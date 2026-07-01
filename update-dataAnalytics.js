const fs = require('fs');
const file = 'client/src/services/intelligence/dataAnalyticsService.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
  const data = json.data || json;
  const report = data.report || {};

  const ensureArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      return val.split(/\\n|,/).map(s => s.trim()).filter(s => s.length > 0);
    }
    if (!val) return [];
    return [String(val)];
  };

  const getObj = (obj) => typeof obj === 'object' && obj !== null ? obj : {};
  
  const competitorsArr = ensureArray(report.competitors || report.competitorAnalysis);
  const trendsArr = ensureArray(report.trends || report.keyTrends);
  const opportunitiesArr = ensureArray(report.opportunities);
  const risksArr = ensureArray(report.risks);
  const recommendationsArr = ensureArray(report.recommendations);
  
  return {
    model: data.model || "AI",
    source: data.source,
    
    // Original Sections Format (keeping for fallback compatibility if needed)
    sections: {
      overview: [
        { title: "Executive Summary", detail: report.executiveSummary?.summary || report.executiveSummary || "No summary provided." }
      ],
      marketSize: [
        { title: "Market Size & Growth", detail: report.marketSize?.description || report.marketSize || "No data." }
      ],
      competitors: competitorsArr.map(c => ({
        title: c.name || "Competitor",
        detail: \`Positioning: \${c.positioning || "N/A"}. Threat Level: \${c.threatLevel || "Medium"}.\`,
        action: \`Strengths: \${ensureArray(c.strengths).join(', ')}. Weaknesses: \${ensureArray(c.weaknesses).join(', ')}\`
      })),
      trends: trendsArr.map(t => typeof t === 'object' ? { title: t.title || "Key Trend", detail: t.description || "Trend details" } : { title: "Key Trend", detail: t }),
      recommendations: recommendationsArr.map(r => typeof r === 'object' ? { title: r.title || r.recommendation || "Recommendation", detail: r.description || r.expectedImpact || "Recommendation details" } : { title: "Recommendation", detail: r })
    },
    
    // NEW STRUCTURE
    reportData: {
      executiveSummary: getObj(report.executiveSummary),
      marketOverview: getObj(report.marketOverview),
      marketSize: getObj(report.marketSize),
      competitors: competitorsArr.map(c => ({
        ...c,
        strengths: ensureArray(c.strengths),
        weaknesses: ensureArray(c.weaknesses)
      })),
      trends: trendsArr,
      opportunities: opportunitiesArr,
      risks: risksArr,
      recommendations: recommendationsArr,
      swot: getObj(report.swot),
      customerPersonas: ensureArray(report.customerPersonas),
      charts: ensureArray(report.charts)
    },
    
    analytics: {
      scores: [
        { label: "Market Viability", value: report.executiveSummary?.marketViabilityScore || 85, interpretation: "Strong potential based on market size." },
        { label: "Competitive Intensity", value: report.executiveSummary?.competitionScore || 65, interpretation: "Moderate competition." }
      ],
      competitorBenchmarks: competitorsArr.map(c => ({
        brand: c.name || "Unknown", positioning: c.positioning || "N/A", pricing: "Competitive", strengths: ensureArray(c.strengths).join(', '), weaknesses: ensureArray(c.weaknesses).join(', '), threat: c.threatLevel || "Medium"
      })),
      opportunityMap: opportunitiesArr,
      roadmap: report.roadmap || [],
      assumptions: ["Based on available public data", "Estimates subject to market volatility"]
    },
    risks: risksArr,
    nextSteps: recommendationsArr
  };
`;

const startIndex = content.indexOf('  const data = json.data || json;');
const endIndex = content.indexOf('}');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + replacement + '\n}';
  fs.writeFileSync(file, content);
  console.log("dataAnalyticsService updated successfully");
} else {
  console.log("Could not find start or end index in dataAnalyticsService");
}
