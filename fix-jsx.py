import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the JSX formatting errors.
content = content.replace('{mainTab === "research" && (\\n        <div>\\n      <div className="intel-page-body"', '      <div className="intel-page-body"')

# Let's wrap the form properly
# The form wrapper is:
#       <div style={{
#         background: "var(--bg-card)",
#         border: "1px solid var(--border-color)",
#         borderRadius: 14,
#         padding: "24px 28px",
#         margin: "24px 24px 0",
#       }}>
if '<div style={{' in content:
    idx = content.find('<div style={{\n        background: "var(--bg-card)"')
    if idx != -1:
        content = content[:idx] + '{mainTab === "research" && (\n        <div>\n' + content[idx:]

# End the form wrapper before the SAVED RESEARCHES SECTION which I added.
content = content.replace('\\n        </div>\\n      )}\\n\\n      {/* SAVED RESEARCHES SECTION', '')

idx_saved = content.find('      {/* SAVED RESEARCHES SECTION')
if idx_saved != -1:
    content = content[:idx_saved] + '\\n        </div>\\n      )}\\n\\n' + content[idx_saved:]

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed JSX Wrapper!")
