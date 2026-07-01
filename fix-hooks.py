import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

missing_state_hook = '''  const [marketExporting, setMarketExporting] = useState(false);
  const [mainTab, setMainTab] = useState("research");
  const [savedResearches, setSavedResearches] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showSaveModal, setShowSaveModal] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("saved_market_researches");
    if (saved) {
      try {
        setSavedResearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved researches", e);
      }
    }
  }, []);

  const handleDeleteResearch = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved research?")) {
      const updated = savedResearches.filter(item => item.id !== id);
      setSavedResearches(updated);
      localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    }
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    const updated = savedResearches.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
  };
'''

content = content.replace('  const [marketExporting, setMarketExporting] = useState(false);', missing_state_hook)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected state hooks!")
