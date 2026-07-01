const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state hooks
content = content.replace(
  'const [marketExporting, setMarketExporting] = useState(false);',
  `const [marketExporting, setMarketExporting] = useState(false);
  const [mainTab, setMainTab] = useState('research');
  const [savedResearches, setSavedResearches] = useState(() => {
    try {
      const saved = localStorage.getItem('savedMarketResearches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  function handleSaveResearch() {
    if (!marketResearch) return;
    const newSave = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      form: { ...form },
      marketResearch: { ...marketResearch }
    };
    const updated = [newSave, ...savedResearches];
    setSavedResearches(updated);
    localStorage.setItem('savedMarketResearches', JSON.stringify(updated));
    alert('Research saved successfully!');
  }

  function handleExportDocx(item = null) {
    const researchObj = item && item.marketResearch ? item.marketResearch : marketResearch;
    const formObj = item && item.form ? item.form : form;
    if (!researchObj || !researchObj.reportData) return;
    
    const productName = formObj.businessName || 'Product';
    const fileName = \`\${sanitizeFilePart(productName)}_\${getReportDate()}_Market_Research.doc\`;
    
    const htmlContent = \`
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Market Research</title></head>
      <body style='font-family: Helvetica, Arial, sans-serif; color: #333;'>
      <h1 style='color: #0f172a;'>Market Research: \${productName}</h1>
      <p><strong>Industry:</strong> \${getMarketIndustry(formObj)}</p>
      <p><strong>Date:</strong> \${getReportDate()}</p>
      <hr/>
      <h2>Executive Summary</h2>
      <p>\${researchObj.reportData.executiveSummary?.summary || ''}</p>
      <h2>Market Overview</h2>
      <p><strong>Market Size:</strong> \${researchObj.reportData.marketOverview?.marketSize || 'N/A'}</p>
      <p><strong>CAGR:</strong> \${researchObj.reportData.marketOverview?.cagr || 'N/A'}</p>
      <h2>Recommendations</h2>
      <ul>
        \${(researchObj.reportData.recommendations || []).map(r => \`<li>\${r.recommendation || r}</li>\`).join('')}
      </ul>
      </body></html>
    \`;
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }`
);

// 2. Modify handleExportMarketResearch
content = content.replace(
  'async function handleExportMarketResearch() {\n    if (!marketResearch || marketExporting) return;\n\n    setMarketExporting(true);\n\n    try {\n      const { jsPDF } = await import("jspdf");\n      const doc = new jsPDF({ unit: "mm", format: "a4" });\n      const writer = createPdfWriter(doc);\n      const reportDate = getReportDate();\n      const productName = form.businessName || "Product";\n      const reportIndustry = getMarketIndustry(form);',
  `async function handleExportMarketResearch(item = null) {
    const researchObj = (item && item.id) ? item.marketResearch : marketResearch;
    const formObj = (item && item.id) ? item.form : form;
    if (!researchObj || marketExporting) return;
    
    // Check if the parameter is actually an event object from a click (which is the default when onClick={handleExportMarketResearch})
    const actualResearchObj = (item && item.nativeEvent) ? marketResearch : researchObj;
    const actualFormObj = (item && item.nativeEvent) ? form : formObj;
    
    setMarketExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const writer = createPdfWriter(doc);
      const reportDate = getReportDate();
      const productName = actualFormObj.businessName || "Product";
      const reportIndustry = getMarketIndustry(actualFormObj);`
);

// Replace marketResearch.reportData with actualResearchObj.reportData inside the function
// We only want to replace it within handleExportMarketResearch
const functionStartIndex = content.indexOf('async function handleExportMarketResearch');
const functionEndIndex = content.indexOf('function createPdfWriter');
if (functionStartIndex !== -1 && functionEndIndex !== -1) {
  let funcContent = content.substring(functionStartIndex, functionEndIndex);
  funcContent = funcContent.replace(/marketResearch\.reportData/g, 'actualResearchObj.reportData');
  content = content.substring(0, functionStartIndex) + funcContent + content.substring(functionEndIndex);
}

// 3. Add tabs at the top of intel-page-body
const startDivIndex = content.indexOf('<div className="intel-page-body" style={{ marginTop: 0 }}>');
if (startDivIndex !== -1) {
  content = content.slice(0, startDivIndex + 58) + 
`
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setMainTab('research')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'research' ? 'var(--brand-cyan)' : 'var(--text-muted)', fontWeight: mainTab === 'research' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}
        >
          Research
        </button>
        <button 
          onClick={() => setMainTab('saved')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '16px', cursor: 'pointer' }}
        >
          Saved Researches
        </button>
      </div>

      {mainTab === 'research' ? (
        <>
` + content.slice(startDivIndex + 58);
}

// 4. Add Save button next to Export PDF
content = content.replace(
  /<button\s+className="intel-btn"\s+onClick=\{handleExportMarketResearch\}\s+type="button"\s+disabled=\{!marketResearch \|\| marketExporting\}\s+>\s+\{marketExporting \? "Exporting\.\.\." : "Export PDF"\}\s+<\/button>/,
  `<button
                  className="intel-btn"
                  onClick={handleSaveResearch}
                  type="button"
                  disabled={!marketResearch}
                  style={{ marginRight: '8px' }}
                >
                  Save Research
                </button>
                <button
                  className="intel-btn"
                  onClick={handleExportMarketResearch}
                  type="button"
                  disabled={!marketResearch || marketExporting}
                >
                  {marketExporting ? "Exporting..." : "Export PDF"}
                </button>`
);

// 5. Close mainTab conditional and add Saved Researches UI
const closeIndex = content.lastIndexOf('<style>');
if (closeIndex !== -1) {
  content = content.slice(0, closeIndex) + 
`
        </>
      ) : (
        <div className="intel-panel">
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-primary)' }}>Saved Researches</h2>
          {savedResearches.length === 0 ? (
            <div className="intel-empty-state">No saved researches found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedResearches.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '16px' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(item.date).toLocaleString()} • {item.form?.industry}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }}>
                      Open
                    </button>
                    <button className="intel-btn" onClick={() => handleExportMarketResearch(item)} disabled={marketExporting}>
                      {marketExporting ? "Exporting..." : "Export PDF"}
                    </button>
                    <button className="intel-btn intel-btn-cyan" onClick={() => handleExportDocx(item)}>
                      Export DOCX
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
` + content.slice(closeIndex);
}

fs.writeFileSync(file, content);
console.log('Successfully updated MarketResearch.jsx');
