import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Strip the exact rogue blocks we know we added.
content = content.replace('{mainTab === "research" && (\\n        <div>\\n  <div style={{', '<div style={{')
content = content.replace('{mainTab === "research" && (\\n          <div>\\n  <div style={{', '<div style={{')
content = content.replace('{mainTab === "research" && (\\n          <div>\\n        <div className="intel-page-body"', '      <div className="intel-page-body"')
content = content.replace('{mainTab === "research" && (\\n        <div>\\n      <div className="intel-page-body"', '      <div className="intel-page-body"')

# Strip the ending blocks that we added:
# '\\n        </div>\\n      )}\\n\\n      {/* SAVED RESEARCHES SECTION'
content = content.replace('\\n        </div>\\n      )}\\n\\n      {/* SAVED RESEARCHES SECTION', '\\n      {/* SAVED RESEARCHES SECTION')

# Strip the original form_wrapper_start if it was injected
content = content.replace('{mainTab === "research" && (\\n        <div>\\n', '')
content = content.replace('\\n        </div>\\n      )}\\n', '\\n')

# 2. Now add it correctly ONCE.
idx_start = content.find('      <IntelligenceHeader')
idx_end = content.find('      {/* SAVED RESEARCHES SECTION')

if idx_start != -1 and idx_end != -1:
    before = content[:idx_start]
    middle = content[idx_start:idx_end]
    after = content[idx_end:]
    
    # Wrap middle
    middle = '      {mainTab === "research" && (\\n        <div>\\n' + middle + '        </div>\\n      )}\\n\\n'
    content = before + middle + after

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed formatting!")
