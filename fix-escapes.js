const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearchDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(file, content);
console.log('Fixed escape characters in MarketResearchDashboard.jsx');
