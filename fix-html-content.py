# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken htmlContent definition by replacing the broken JSX-looking block with a proper template string
broken_start = "const htmlContent = \n      <html"
broken_end = "</body></html>\n    ;"

start_idx = content.find(broken_start)
end_idx = content.find(broken_end, start_idx) + len(broken_end)

if start_idx != -1 and end_idx != -1:
    fixed_html_content = '''const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Market Research</title></head>
      <body style='font-family: Helvetica, Arial, sans-serif; color: #333;'>
      <h1 style='color: #0f172a;'>Market Research: ${productName}</h1>
      <p><strong>Industry:</strong> ${getMarketIndustry(actualFormObj)}</p>
      <p><strong>Date:</strong> ${getReportDate()}</p>
      <hr/>
      <h2>Executive Summary</h2>
      <p>${actualResearchObj.reportData.executive_summary?.summary || actualResearchObj.reportData.executive_summary || ''}</p>
      </body></html>
    `;'''
    content = content[:start_idx] + fixed_html_content + content[end_idx:]
    
    with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed htmlContent template string!")
else:
    print("Could not find broken htmlContent.")
