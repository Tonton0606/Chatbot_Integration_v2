# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

funcs_to_inject = '''
  const handleSaveResearch = () => {
    if (!marketResearch) return;
    const newSave = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      form: { ...form },
      marketResearch: { ...marketResearch },
      isFavorite: false
    };
    const updated = [newSave, ...savedResearches];
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    setShowSaveModal(true);
  };

  const sanitizeFilePart = (name) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const getReportDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const getMarketIndustry = (f) => f.industry === 'Others' ? f.customIndustry : f.industry;

  const handleExportDocx = (item = null) => {
    // Check if the parameter is an event (from standard onClick without arrow func)
    const researchObj = (item && item.id) ? item.marketResearch : marketResearch;
    const formObj = (item && item.id) ? item.form : form;
    if (!researchObj || !researchObj.reportData) return;
    
    const actualResearchObj = (item && item.nativeEvent) ? marketResearch : researchObj;
    const actualFormObj = (item && item.nativeEvent) ? form : formObj;
    
    const productName = actualFormObj.businessName || 'Product';
    const fileName = sanitizeFilePart(productName) + '_' + getReportDate() + '_Market_Research.doc';
    
    const htmlContent = 
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Market Research</title></head>
      <body style='font-family: Helvetica, Arial, sans-serif; color: #333;'>
      <h1 style='color: #0f172a;'>Market Research: </h1>
      <p><strong>Industry:</strong> </p>
      <p><strong>Date:</strong> </p>
      <hr/>
      <h2>Executive Summary</h2>
      <p></p>
      </body></html>
    ;
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
'''

if 'const handleSaveResearch = ' not in content:
    content = content.replace('  const marketAnalytics = marketResearch?.analytics || {};', funcs_to_inject + '\n  const marketAnalytics = marketResearch?.analytics || {};')

# Update the DOCX button click handler to actually use handleExportDocx
content = content.replace('onClick={() => { /* Need Docx function */ }}', 'onClick={() => handleExportDocx(item)}')

# Fix Export PDF button
content = content.replace('onClick={handleExportMarketResearch}', 'onClick={(e) => { e.preventDefault(); handleExportMarketResearch(item); }}')

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected functions!")
