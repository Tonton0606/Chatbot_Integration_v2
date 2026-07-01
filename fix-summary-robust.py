# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getSummaryText helper right after getIndustryConfig definition
summary_helper = '''
  const getSummaryText = (item) => {
    const mr = item.marketResearch;
    if (!mr) return "No summary available.";

    // 1. Check sections.overview
    if (mr.sections?.overview?.[0]?.detail) {
      const detail = mr.sections.overview[0].detail;
      if (detail && detail !== "No summary provided." && detail !== "No data.") {
        return detail;
      }
    }

    // 2. Check reportData.executiveSummary.summary
    if (mr.reportData?.executiveSummary?.summary) {
      return mr.reportData.executiveSummary.summary;
    }

    // 3. Check reportData.executiveSummary if it's a string
    if (typeof mr.reportData?.executiveSummary === 'string' && mr.reportData.executiveSummary) {
      return mr.reportData.executiveSummary;
    }

    // 4. Check reportData.executive_summary
    if (mr.reportData?.executive_summary) {
      const es = mr.reportData.executive_summary;
      if (typeof es === 'string') return es;
      if (typeof es === 'object' && es.summary) return es.summary;
    }

    // 5. Try stringifying any executiveSummary object values
    if (mr.reportData?.executiveSummary && typeof mr.reportData.executiveSummary === 'object') {
      const vals = Object.values(mr.reportData.executiveSummary).filter(v => typeof v === 'string' && v.length > 20);
      if (vals.length > 0) return vals[0];
    }

    return "No summary available.";
  };
'''

if 'const getSummaryText' not in content:
    content = content.replace('  const getIndustryConfig = (industry) => {', summary_helper + '\n  const getIndustryConfig = (industry) => {')

# Now update the map loop where desc is assigned
old_loop_desc = '''                  let desc = "No summary available.";
                    const summarySource = item.marketResearch?.reportData?.executive_summary || item.marketResearch?.reportData?.executiveSummary;
                    if (summarySource) {
                      desc = typeof summarySource === 'object' ? (summarySource.summary || Object.values(summarySource).join(" ")) : summarySource;
                      if (typeof desc === 'string' && desc.length > 150) desc = desc.substring(0, 150) + "...";
                    }'''

new_loop_desc = '''                  let desc = getSummaryText(item);
                    if (desc.length > 150) {
                      desc = desc.substring(0, 150) + "...";
                    }'''

content = content.replace(old_loop_desc, new_loop_desc)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected robust summary extractor!")
