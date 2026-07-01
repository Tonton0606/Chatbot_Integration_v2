const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Import
if (!content.includes('import MarketResearchDashboard')) {
  content = content.replace('import { getMarketIndustry', 'import MarketResearchDashboard from "./MarketResearchDashboard";\nimport { getMarketIndustry');
}

// 2. Replace old UI render block
const renderStartStr = '{marketResearch?.kpis?.length > 0 && (';
const renderEndStr = '</div>\n                  )}\n\n                </div>\n              </>\n            )}';

const startIdx = content.indexOf(renderStartStr);
const endIdx = content.indexOf('</>\n            )}', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `
                {marketResearch && marketResearch.reportData ? (
                  <MarketResearchDashboard data={marketResearch.reportData} />
                ) : (
                  <div className="intel-empty-state">
                    No insights available. Please generate a new report.
                  </div>
                )}
              </>
            )}`;
  
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx + 17);
  fs.writeFileSync(file, content);
  console.log("MarketResearch.jsx updated successfully");
} else {
  console.log("Could not find start/end bounds for UI replacement in MarketResearch.jsx");
}
