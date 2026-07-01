const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/className="intel-input"/g, 'className="intel-input" style={{ width: "100%" }}');
content = content.replace(/className="intel-select"/g, 'className="intel-select" style={{ width: "100%" }}');

fs.writeFileSync(file, content);
