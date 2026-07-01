# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update summary extraction logic
old_desc = '''                    let desc = "No summary available.";
                    if (item.marketResearch?.reportData?.executive_summary) {
                      desc = item.marketResearch.reportData.executive_summary;
                      if (typeof desc === 'object') desc = Object.values(desc).join(" ");
                      if (desc.length > 150) desc = desc.substring(0, 150) + "...";
                    }'''
new_desc = '''                    let desc = "No summary available.";
                    const summarySource = item.marketResearch?.reportData?.executive_summary || item.marketResearch?.reportData?.executiveSummary;
                    if (summarySource) {
                      desc = typeof summarySource === 'object' ? (summarySource.summary || Object.values(summarySource).join(" ")) : summarySource;
                      if (typeof desc === 'string' && desc.length > 150) desc = desc.substring(0, 150) + "...";
                    }'''
content = content.replace(old_desc, new_desc)

# 2. Update AI Model Name and Icon
old_footer = '''                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                              <Hash size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>{aiModelName}</span>
                            </div>'''
new_footer = '''                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                              <Sparkles size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>AI Driven Research</span>
                            </div>'''
content = content.replace(old_footer, new_footer)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated description logic and AI tag!")
