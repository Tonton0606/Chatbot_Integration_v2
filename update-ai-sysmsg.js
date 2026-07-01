const fs = require('fs');
const file = 'server/routes/services/ai.js';
let content = fs.readFileSync(file, 'utf8');

const replacementSysMsg = `    const sysMsg = \\\`You are a senior McKinsey-level market research consultant. Return ONLY valid JSON structured exactly as follows:
{
  "executiveSummary": {
    "confidenceScore": 90,
    "marketViabilityScore": 85,
    "competitionScore": 75,
    "growthPotentialScore": 88,
    "summary": "..."
  },
  "marketOverview": {
    "marketSize": "...",
    "cagr": "...",
    "growthOutlook": "...",
    "marketMaturity": "...",
    "industryStage": "..."
  },
  "marketSize": {
    "description": "..."
  },
  "competitors": [
    {
      "name": "...",
      "positioning": "...",
      "threatLevel": "High|Medium|Low",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."]
    }
  ],
  "trends": [
    {
      "title": "...",
      "description": "...",
      "growthIndicator": "...",
      "impactLevel": "High|Medium|Low"
    }
  ],
  "opportunities": [
    {
      "opportunity": "...",
      "impact": "High|Medium|Low",
      "difficulty": "High|Medium|Low",
      "roi": "High|Medium|Low"
    }
  ],
  "risks": [
    {
      "title": "...",
      "severity": "High|Medium|Low",
      "probability": "High|Medium|Low",
      "mitigation": "..."
    }
  ],
  "recommendations": [
    {
      "recommendation": "...",
      "impact": "High|Medium|Low",
      "effort": "High|Medium|Low",
      "priority": "High|Medium|Low"
    }
  ],
  "swot": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  "customerPersonas": [],
  "charts": []
}\\\`;`;

// Replace from 'const sysMsg = `You are a senior market research analyst...' to '}`;'
const startMarker = 'const sysMsg = `You are a senior market research analyst';
const endMarker = '}`}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf('}`;', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + replacementSysMsg + content.slice(endIndex + 3);
  fs.writeFileSync(file, content);
  console.log("ai.js sysMsg updated successfully");
} else {
  console.log("Could not find sysMsg in ai.js");
}
