import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useEffect for local storage
if 'useEffect(() => {' not in content:
    hook_str = '''  const [viewMode, setViewMode] = useState("list");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
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
  };'''
    content = content.replace('  const [favoritesOnly, setFavoritesOnly] = useState(false);', hook_str)

# Modify tabs at the top if they don't exist
# Actually, the user's mockup shows NO tabs for Configure Research. It just has "AI Market Research" header.
# And at the bottom or below, it should have the saved researches.

# Wait, let's just append the Saved Researches section right before the final </div>
saved_researches_jsx = '''
      {/* SAVED RESEARCHES SECTION */}
      <div className="intel-page-body" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <button onClick={() => setMainTab('research')} style={{ background: 'transparent', border: 'none', color: mainTab === 'research' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'research' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'research' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Current Research
          </button>
          <button onClick={() => setMainTab('saved')} style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'saved' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Saved Researches
          </button>
          <button onClick={() => setMainTab('favorites')} style={{ background: 'transparent', border: 'none', color: mainTab === 'favorites' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'favorites' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'favorites' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Favorites
          </button>
        </div>

        {(mainTab === 'saved' || mainTab === 'favorites') && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '24px' }}>{mainTab === 'favorites' ? 'Favorite Researches' : 'Saved Researches'}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{mainTab === 'favorites' ? 'Your pinned market intelligence reports' : 'Manage and revisit your AI-generated market research'}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button type="button" onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><LayoutGrid size={16} /></button>
                  <button type="button" onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><List size={16} /></button>
                </div>
                <button type="button" onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'} <ChevronDown size={14} style={{ transform: sortOrder === 'newest' ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                </button>
              </div>
            </div>

            {savedResearches.filter(item => mainTab === 'favorites' ? item.isFavorite : true).length === 0 ? (
              <div className="intel-empty-state">No {mainTab === 'favorites' ? 'favorite' : 'saved'} researches found.</div>
            ) : (
              <div style={{ 
                display: viewMode === 'grid' ? 'grid' : 'flex', 
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(360px, 1fr))' : undefined,
                gap: '16px' 
              }}>
                {[...savedResearches].filter(item => mainTab === 'favorites' ? item.isFavorite : true).sort((a, b) => {
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                }).map(item => {
                  let desc = "No summary available.";
                  if (item.marketResearch?.reportData?.executive_summary) {
                    desc = item.marketResearch.reportData.executive_summary;
                    if (typeof desc === 'object') desc = Object.values(desc).join(" ");
                    if (desc.length > 150) desc = desc.substring(0, 150) + "...";
                  }
                  
                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', gap: viewMode === 'grid' ? '16px' : '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', transition: 'all 0.2s', cursor: 'pointer' }} className="intel-card-hover">
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                            <Star onClick={(e) => toggleFavorite(e, item.id)} size={18} color={item.isFavorite ? '#f1c40f' : 'var(--text-muted)'} fill={item.isFavorite ? '#f1c40f' : 'none'} style={{ cursor: 'pointer', transition: 'all 0.2s' }} />
                          </div>
                        </div>
                        <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>{desc}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                          <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent' }}><Eye size={14} /> Open</button>
                          <button className="intel-btn" onClick={(e) => handleDeleteResearch(e, item.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', background: 'transparent' }}><Trash2 size={14} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
'''

if 'SAVED RESEARCHES SECTION' not in content:
    content = content.replace('      <style>{\n        @keyframes spin', saved_researches_jsx + '\n      <style>{\n        @keyframes spin')

# Also we need to wrap the whole Configure Parameters inside if (mainTab === 'research')
form_wrapper_start = '{mainTab === "research" && (\n        <div>\n'
form_wrapper_end = '\n        </div>\n      )}\n\n      {/* SAVED RESEARCHES SECTION'

if '{mainTab === "research" && (' not in content:
    content = content.replace('      <div className="intel-page-body" style={{ marginTop: 0 }}>', form_wrapper_start + '      <div className="intel-page-body" style={{ marginTop: 0 }}>')
    content = content.replace('      {/* SAVED RESEARCHES SECTION', form_wrapper_end)


with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied full saved researches logic!")
