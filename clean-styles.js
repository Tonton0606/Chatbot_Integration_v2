const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all occurrences of style={{ ... }} on the inputs/selects.
content = content.replace(/\s*style=\{\{\s*width: "100%", padding: "9px 12px",\s*background: "var\(--bg-surface\)", border: "1px solid var\(--border-color\)",\s*borderRadius: 8, color: "var\(--text-primary\)", fontSize: 14,\s*outline: "none",?[^}]*\}\}/g, '');

fs.writeFileSync(file, content);
