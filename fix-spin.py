import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_style = '''      <style>{
        @keyframes spin { to { transform: rotate(360deg); } }
        .intel-select {
          color-scheme: light dark;
        }
        .intel-select option {
          background-color: var(--bg-surface, #1e1e2f);
          color: var(--text-primary, #ffffff);
        }
      }</style>'''

good_style = '''      <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } } .intel-select { color-scheme: light dark; } .intel-select option { background-color: var(--bg-surface, #1e1e2f); color: var(--text-primary, #ffffff); }" }} />'''

content = content.replace(bad_style, good_style)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed spin keyframes syntax!")
