const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<IntelligenceHeader\s+title="AI Market Research"\s+subtitle="Provide details about your business and research goals\. AI will generate market insights in seconds\."\s+icon="🔍"\s*\/>/g,
  '<IntelligenceHeader\n        title="AI Market Research"\n        subtitle="Provide details about your business and research goals. AI will generate market insights in seconds."\n        icon="🔍"\n        showFilters={false}\n        showAI={false}\n      />'
);

// We also need to fix the dropdown select options to use the standard styles or explicitly style the options for dark mode adaptive behavior.
// We can use the class "intel-select" instead of just inline style with background
// Actually the inline style sets `background: "var(--bg-surface)"`. This is correct, but `<option>` tags inherit it.
// To force them to take adaptive colors properly, adding the "intel-select" class usually works if the css defines option styling, or we can just add `color: "var(--text-primary)"` to options.
// Wait, the selects already have `background: "var(--bg-surface)", color: "var(--text-primary)"`. The problem is that the <option> itself might need `background: "var(--bg-surface)"`.
// But wait, the standard way in ExponifyPH is to use `className="intel-select"`. I will just change all inline-styled selects to use `className="intel-select"` and inputs to `className="intel-input"` without inline styling! Let's do that cleanly.
// Wait, the inputs are inside a grid, so removing `width: "100%"` might mess them up, so I'll keep inline styles but add the class too.

content = content.replace(/<select\s+name="/g, '<select className="intel-select" name="');
content = content.replace(/<input\s+type="text"\s+name="/g, '<input className="intel-input" type="text" name="');
content = content.replace(/<input\s+type="url"\s+name="/g, '<input className="intel-input" type="url" name="');
content = content.replace(/<textarea\s+name="/g, '<textarea className="intel-input" name="');

fs.writeFileSync(file, content);
