import sys
import re

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'__html:\s+@keyframes modalSlideUp \{\s+from \{ opacity: 0; transform: translateY\(20px\) scale\(0.95\); \}\s+to \{ opacity: 1; transform: translateY\(0\) scale\(1\); \}\s+\}', '__html: "@keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }"', content)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax")
