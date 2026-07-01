const fs = require('fs');

const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
content = content.replace(
  /const \[marketExporting, setMarketExporting\] = useState\(false\);/,
  `const [marketExporting, setMarketExporting] = useState(false);\n  const [mainTab, setMainTab] = useState("research");\n  const [savedResearches, setSavedResearches] = useState([]);\n\n  useEffect(() => {\n    const saved = localStorage.getItem("saved_market_researches");\n    if (saved) {\n      try { setSavedResearches(JSON.parse(saved)); } catch(e) {}\n    }\n  }, []);\n\n  const handleSaveResearch = () => {\n    if (!marketResearch) return;\n    const newItem = {\n      id: Date.now().toString(),\n      date: new Date().toISOString(),\n      form: { ...form },\n      marketResearch: { ...marketResearch }\n    };\n    const updated = [newItem, ...savedResearches];\n    setSavedResearches(updated);\n    localStorage.setItem("saved_market_researches", JSON.stringify(updated));\n    alert("Research saved successfully.");\n  };\n\n  const handleExportDocx = async (savedItem) => {\n    const isEvent = savedItem && savedItem.nativeEvent;\n    const actualSavedItem = isEvent ? null : savedItem;\n    const researchToExport = actualSavedItem ? actualSavedItem.marketResearch : marketResearch;\n    const formToExport = actualSavedItem ? actualSavedItem.form : form;\n    if (!researchToExport) return;\n\n    try {\n      setMarketExporting(true);\n      const content = \`\n        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>\n        <head><meta charset='utf-8'><title>Market Research</title></head><body>\n        <h1>Market Research Report: \${formToExport.businessName || 'Business'}</h1>\n        <h2>Executive Summary</h2>\n        <p>\${researchToExport.reportData?.executiveSummary?.summary || ''}</p>\n        <h2>Market Overview</h2>\n        <p>Market Size: \${researchToExport.reportData?.marketOverview?.marketSize || 'N/A'}</p>\n        <p>CAGR: \${researchToExport.reportData?.marketOverview?.cagr || 'N/A'}</p>\n        <p>Growth Outlook: \${researchToExport.reportData?.marketOverview?.growthOutlook || 'N/A'}</p>\n        </body></html>\n      \`;\n      const blob = new Blob(['\\ufeff', content], { type: 'application/msword' });\n      const url = URL.createObjectURL(blob);\n      const link = document.createElement('a');\n      link.href = url;\n      link.download = \`Market_Research_\${(formToExport.businessName || 'Report').replace(/\\s+/g, '_')}.doc\`;\n      document.body.appendChild(link);\n      link.click();\n      document.body.removeChild(link);\n    } catch (err) {\n      setError("Failed to export DOCX.");\n    } finally {\n      setMarketExporting(false);\n    }\n  };`
);

// 2. Fix JSON PESO
content = content.replace(
  /const parsedReport = JSON\.parse\(jsonStr\);/,
  `jsonStr = jsonStr.replace(/₱/g, "PESOS");\n        const parsedReport = JSON.parse(jsonStr);`
);

// 3. Update handleExportMarketResearch
content = content.replace(
  /async function handleExportMarketResearch\(\) \{[\s\S]*?executiveSummary = \{\},/,
  `async function handleExportMarketResearch(savedItem) {
    const isEvent = savedItem && savedItem.nativeEvent;
    const actualSavedItem = isEvent ? null : savedItem;
    const researchToExport = actualSavedItem ? actualSavedItem.marketResearch : marketResearch;
    const formToExport = actualSavedItem ? actualSavedItem.form : form;

    if (!researchToExport || !researchToExport.reportData || marketExporting) return;

    setMarketExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const writer = createPdfWriter(doc);
      const reportDate = getReportDate();
      const productName = formToExport.businessName || "Product";
      const reportIndustry = getMarketIndustry(formToExport);
      const fileName = \`\${sanitizeFilePart(productName)}_\${reportDate}_Market_Research.pdf\`;

      const {
        executiveSummary = {},`
);

content = content.replace(
  /\} = marketResearch\.reportData;/,
  `} = researchToExport.reportData;`
);

// 4. Update UI
// Find IntelligenceHeader closing
let headerCloseStr = `        showFilters={false}\n        showAI={false}\n      />`;
if(!content.includes(headerCloseStr)) {
  headerCloseStr = `        showAI={false}\r\n      />`;
  if (!content.includes(headerCloseStr)) {
    headerCloseStr = `        showAI={false}\n      />`;
  }
}

content = content.replace(
  headerCloseStr,
  headerCloseStr + `

      <div style={{ display: 'flex', gap: '32px', margin: '24px 24px 0', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setMainTab('research')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'research' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'research' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'research' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}
        >
          Research
        </button>
        <button 
          onClick={() => setMainTab('saved')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'saved' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}
        >
          Saved Researches
        </button>
      </div>

      {mainTab === 'research' ? (
        <>`
);

// Find the save button insertion in the header
content = content.replace(
  /<button\s+className="intel-btn"\s+onClick=\{handleExportMarketResearch\}/,
  `<button className="intel-btn" onClick={handleSaveResearch} type="button" disabled={!marketResearch}>Save Research</button>\n                  <button className="intel-btn" onClick={handleExportMarketResearch}`
);

// Find the end of the results block to close the tab
content = content.replace(
  /(<\/div>\s*\) : null\}\s*<\/div>\s*<style>\{`)/,
  `</div>\n        </>\n      ) : (\n        <div className="intel-page-body" style={{ marginTop: '24px' }}>\n          <div className="intel-panel">\n            <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-primary)' }}>Saved Researches</h2>\n            {savedResearches.length === 0 ? (\n              <div className="intel-empty-state">No saved researches found.</div>\n            ) : (\n              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>\n                {savedResearches.map(item => (\n                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>\n                    <div>\n                      <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '16px' }}>{item.form?.businessName || 'Unnamed Research'}</h3>\n                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>\n                        {new Date(item.date).toLocaleString()} • {item.form?.industry}\n                      </div>\n                    </div>\n                    <div style={{ display: 'flex', gap: '8px' }}>\n                      <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }}>\n                        Open\n                      </button>\n                      <button className="intel-btn" onClick={() => handleExportMarketResearch(item)} disabled={marketExporting}>\n                        {marketExporting ? "Exporting..." : "Export PDF"}\n                      </button>\n                      <button className="intel-btn intel-btn-cyan" onClick={() => handleExportDocx(item)}>\n                        Export DOCX\n                      </button>\n                    </div>\n                  </div>\n                ))}\n              </div>\n            )}\n          </div>\n        </div>\n      )}\n\n      $1`
);

fs.writeFileSync(file, content);
console.log("Done");
