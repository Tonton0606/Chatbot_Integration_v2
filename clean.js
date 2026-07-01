const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/DataAnalytics.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import \{\n  generateMarketResearch,\n  getDataAnalyticsDashboard,\n\} from "\.\.\/\.\.\/\.\.\/services\/intelligence";/,
  'import { getDataAnalyticsDashboard } from "../../../services/intelligence";'
);

content = content.replace(
  /const VIEWS = \["Dashboard", "Charts", "Table", "Comparison", "Market Research"\];/,
  'const VIEWS = ["Dashboard", "Charts", "Table", "Comparison"];'
);

content = content.replace(
  /const MARKET_RESULT_TABS = \[\s*\{ id: "overview"[\s\S]*?return form\.industry;\n\}\n/,
  ''
);

content = content.replace(
  /function MarketAiAnimation\(\{ isGenerating = false \}\) \{[\s\S]*?function createPdfWriter\(doc\) \{[\s\S]*?  \};\n\}\n/,
  ''
);

content = content.replace(
  /  const \[marketForm, setMarketForm\] = useState\(\{[\s\S]*?const \[marketExporting, setMarketExporting\] = useState\(false\);\n/,
  ''
);

content = content.replace(
  /  const activeMarketSection =[\s\S]*?const assumptions = marketAnalytics\.assumptions \|\| \[\];\n/,
  ''
);

content = content.replace(
  /  function updateMarketForm\(field, value\) \{[\s\S]*?    \} finally \{\n      setMarketExporting\(false\);\n    \}\n  \}\n/,
  ''
);

content = content.replace(
  /        \{view === "Market Research" && \([\s\S]*?        \)\}\n      <\/div>\n    <\/div>/,
  '      </div>\n    </div>'
);

fs.writeFileSync(file, content);
