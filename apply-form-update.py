import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Icons
content = content.replace('List, \nChevronDown }', 'List, \nChevronDown, Trash2, Target, Eye, LayoutGrid, Star }')
content = content.replace('List,\nChevronDown }', 'List,\nChevronDown, Trash2, Target, Eye, LayoutGrid, Star }')
if 'Trash2' not in content:
    content = content.replace('} from "lucide-react"', ', Trash2, Target, Eye, LayoutGrid, Star } from "lucide-react"')

# 2. Add State and Helper
if 'const [viewMode, setViewMode]' not in content:
    content = content.replace('const [savedResearches, setSavedResearches] = useState([]);', 
        'const [savedResearches, setSavedResearches] = useState([]);\n  const [viewMode, setViewMode] = useState("list");\n  const [sortOrder, setSortOrder] = useState("newest");\n  const [showSaveModal, setShowSaveModal] = useState(false);\n  const [favoritesOnly, setFavoritesOnly] = useState(false);\n\n  const toggleFavorite = (e, id) => {\n    e.stopPropagation();\n    const updated = savedResearches.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item);\n    setSavedResearches(updated);\n    localStorage.setItem("saved_market_researches", JSON.stringify(updated));\n  };'
    )

# 3. Add Delete function
if 'const handleDeleteResearch' not in content:
    content = content.replace('const handleExportDocx = async (savedItem) => {', 
        'const handleDeleteResearch = (e, id) => {\n    e.stopPropagation();\n    if (window.confirm("Are you sure you want to delete this saved research?")) {\n      const updated = savedResearches.filter(item => item.id !== id);\n      setSavedResearches(updated);\n      localStorage.setItem("saved_market_researches", JSON.stringify(updated));\n    }\n  };\n\n  const handleExportDocx = async (savedItem) => {'
    )

# 4. Update save success alert
content = content.replace('alert("Research saved successfully.");', 'setShowSaveModal(true);\n      setTimeout(() => setShowSaveModal(false), 3000);')

# 5. Add Modal to Return
if 'modalSlideUp' not in content:
    content = content.replace('<div className="crm-page intelligence-page">', '''<div className="crm-page intelligence-page">
      <style dangerouslySetInnerHTML={{ __html: 
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      }} />
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(46,204,113,0.1)', color: '#2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={24} fill="currentColor" />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 'bold' }}>Research Saved!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>
              Your market research has been securely saved to your workspace. You can access it anytime from the <strong>Saved Researches</strong> tab.
            </p>
            <button onClick={() => setShowSaveModal(false)} style={{ marginTop: '8px', width: '100%', padding: '12px', background: 'var(--brand-cyan)', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Awesome
            </button>
          </div>
        </div>
      )}''')

# 6. Replace the Form Block EXACTLY
new_form = '''        <form onSubmit={handleSubmit}>
          {/* STEP 1 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>1</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Business Profile</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tell us about the business you want to research.</div>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business / Company Name *</label>
                <input className="intel-input" style={{ width: "100%" }} type="text" name="businessName" value={form.businessName} onChange={handleChange} placeholder="e.g. ExponifyPH" required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business Website (Optional)</label>
                <input className="intel-input" style={{ width: "100%" }} type="url" name="businessWebsite" value={form.businessWebsite} onChange={handleChange} placeholder="https://yourbusiness.com" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Industry *</label>
                <select className="intel-select" style={{ width: "100%" }} name="industry" value={form.industry} onChange={handleChange} required>
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Region</label>
                <select className="intel-select" style={{ width: "100%" }} name="region" value={form.region} onChange={handleChange}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business Type</label>
                <select className="intel-select" style={{ width: "100%" }} name="businessType" value={form.businessType} onChange={handleChange}>
                  {BUSINESS_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            
            {form.industry === "Others" && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Custom Industry</label>
                <input className="intel-input" style={{ width: "100%" }} type="text" name="customIndustry" value={form.customIndustry} onChange={handleChange} placeholder="e.g. Pet care, Esports" />
              </div>
            )}
          </div>

          {/* STEP 2 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>2</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Research Goals</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Define the focus and scope of your research.</div>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Target Audience</label>
                <select className="intel-select" style={{ width: "100%" }} name="targetAudience" value={form.targetAudience} onChange={handleChange}>
                  {TARGET_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Competitor Focus</label>
                <select className="intel-select" style={{ width: "100%" }} name="competitorFocus" value={form.competitorFocus} onChange={handleChange}>
                  <option value="">Select Focus</option>
                  {COMPETITOR_FOCUS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Research Objective</label>
                <select className="intel-select" style={{ width: "100%" }} name="researchObjective" value={form.researchObjective} onChange={handleChange}>
                  <option value="">Select Objective</option>
                  {RESEARCH_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Time Horizon</label>
                <select className="intel-select" style={{ width: "100%" }} name="timeHorizon" value={form.timeHorizon} onChange={handleChange}>
                  <option value="">Select Horizon</option>
                  {TIME_HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  AI Research Depth <Star size={10} fill="#f1c40f" color="#f1c40f" style={{ display: 'inline', marginLeft: 4 }} />
                </label>
                <select className="intel-select" style={{ width: "100%" }} name="aiResearchDepth" value={form.aiResearchDepth} onChange={handleChange}>
                  <option value="">Select Depth</option>
                  {AI_RESEARCH_DEPTHS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Additional Context (optional)</label>
              <textarea className="intel-input" style={{ width: "100%", padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }} name="additionalContext" value={form.additionalContext} onChange={handleChange} placeholder="e.g. We are launching a new product in Q3. Focus on pricing and distribution channels." rows={3} />
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{form.additionalContext?.length || 0}/2000</div>
            </div>
          </div>

          {/* STEP 3 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>3</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>AI Configuration</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Configure the depth and context of your research.</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { name: 'Quick Overview', desc: 'Get a high-level summary in 30-60 seconds.', icon: <Eye size={18} color="var(--text-muted)" /> },
                { name: 'Standard Analysis', desc: 'Balanced insights with detailed analysis.', icon: <Target size={18} color="#9b59b6" /> },
                { name: 'Deep Research', desc: 'In-depth, comprehensive market research.', icon: <Star size={18} fill="var(--brand-cyan)" color="var(--brand-cyan)" /> },
                { name: 'Executive Report', desc: 'Executive-ready report with recommendations.', icon: <LayoutGrid size={18} color="#e056fd" /> }
              ].map(opt => {
                const isSelected = form.aiResearchDepth === opt.name;
                return (
                  <div key={opt.name} onClick={() => setForm(f => ({ ...f, aiResearchDepth: opt.name }))} style={{ 
                    background: 'var(--bg-surface)', border: isSelected ? '1px solid var(--brand-cyan)' : '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' 
                  }} className="intel-card-hover">
                    {isSelected && (
                      <div style={{ position: 'absolute', top: -8, right: -8, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      {opt.icon}
                      <h4 style={{ margin: 0, fontSize: '14px', color: isSelected ? 'var(--brand-cyan)' : 'var(--text-primary)', fontWeight: '600' }}>{opt.name}</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ background: "#e74c3c18", border: "1px solid #e74c3c44", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
            <button className="intel-btn intel-btn-ai market-generate-btn" type="submit" disabled={loading} style={{ padding: "12px 32px", background: loading ? "var(--border-color)" : "linear-gradient(135deg, #1abc9c 0%, #2980b9 100%)", color: loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <Sparkles size={18} /> {loading ? "Generating..." : "Generate AI Research"}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>Estimated Time: 5-10 min</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                <Eye size={12} /> Deep Research <span style={{ color: 'var(--text-muted)' }}>(High Detail)</span>
              </div>
            </div>
          </div>
        </form>'''

idx1 = content.find('<div className="intel-row" style={{ marginBottom: 20 }}>')
idx2 = content.find('</form>', idx1)
if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + new_form + content[idx2+7:]
else:
    print("Could not find form block to replace.")

# 7. Add Favorites Tab and Logic
tabs_old = '''<button 
          onClick={() => setMainTab('saved')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'saved' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}
        >
          Saved Researches
        </button>
      </div>'''

tabs_new = '''<button 
          onClick={() => setMainTab('saved')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'saved' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}
        >
          Saved Researches
        </button>
        <button 
          onClick={() => setMainTab('favorites')}
          style={{ background: 'transparent', border: 'none', color: mainTab === 'favorites' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'favorites' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'favorites' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}
        >
          Favorites
        </button>
      </div>'''
content = content.replace(tabs_old, tabs_new)

saved_render_old = ''') : (
      <div className="intel-page-body" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '24px' }}>Saved Researches</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage and revisit your AI-generated market research</div>
          </div>
        </div>

        {savedResearches.length === 0 ? (
          <div className="intel-empty-state">No saved researches found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {savedResearches.map(item => {'''

saved_render_new = ''') : (mainTab === 'saved' || mainTab === 'favorites') ? (
      <div className="intel-page-body" style={{ marginTop: '24px' }}>
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
            }).map(item => {'''
content = content.replace(saved_render_old, saved_render_new)

card_old = '''              return (
                <div key={item.id} style={{ display: 'flex', gap: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', transition: 'all 0.2s', cursor: 'pointer' }} className="intel-card-hover">
                  {/* LEFT: Industry Icon Box */}
                  <div style={{ width: '160px', height: '160px', borderRadius: '12px', background: config.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', position: 'relative', flexShrink: 0 }}>
                    <Icon size={64} strokeWidth={1.5} />
                    <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '500', width: '85%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.form?.industry || 'General'}
                    </div>
                  </div>

                  {/* RIGHT: Content Box */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                      </div>'''

card_new = '''              return (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  flexDirection: viewMode === 'grid' ? 'column' : 'row',
                  gap: viewMode === 'grid' ? '16px' : '24px', 
                  background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', transition: 'all 0.2s', cursor: 'pointer' 
                }} className="intel-card-hover">
                  {/* LEFT: Industry Icon Box */}
                  <div style={{ 
                    width: viewMode === 'grid' ? '100%' : '160px', 
                    height: viewMode === 'grid' ? '140px' : '160px', 
                    borderRadius: '12px', background: config.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', position: 'relative', flexShrink: 0 
                  }}>
                    <Icon size={64} strokeWidth={1.5} />
                    <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '500', width: '85%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.form?.industry || 'General'}
                    </div>
                  </div>

                  {/* RIGHT: Content Box */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                        <Star onClick={(e) => toggleFavorite(e, item.id)} size={18} color={item.isFavorite ? '#f1c40f' : 'var(--text-muted)'} fill={item.isFavorite ? '#f1c40f' : 'none'} style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="intel-star-hover" />
                      </div>'''
content = content.replace(card_old, card_new)

desc_old = '''                    <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', flex: 1, maxWidth: '800px' }}>
                      {desc}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>'''

desc_new = '''                    <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', flex: 1, maxWidth: '800px', minHeight: viewMode === 'grid' ? '45px' : 'auto' }}>
                      {desc}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: viewMode === 'grid' ? 'flex-start' : 'flex-end', marginTop: '24px', flexWrap: 'wrap', gap: '16px', flexDirection: viewMode === 'grid' ? 'column' : 'row' }}>'''
content = content.replace(desc_old, desc_new)

actions_old = '''                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent' }}>
                          <Eye size={14} /> Open
                        </button>
                        <button className="intel-btn" onClick={(e) => { e.stopPropagation(); handleExportMarketResearch(item); }} disabled={marketExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', background: 'transparent' }}>
                          <FileText size={14} /> {marketExporting ? "Exporting..." : "Export PDF"}
                        </button>
                        <button className="intel-btn" onClick={(e) => { e.stopPropagation(); handleExportDocx(item); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3498db', borderColor: 'rgba(52,152,219,0.3)', background: 'transparent' }}>
                          <File size={14} /> Export DOCX
                        </button>
                      </div>'''

actions_new = '''                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px', width: viewMode === 'grid' ? '100%' : 'auto', flexWrap: viewMode === 'grid' ? 'wrap' : 'nowrap' }}>
                        <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', flex: viewMode === 'grid' ? 1 : 'none', justifyContent: 'center' }}>
                          <Eye size={14} /> Open
                        </button>
                        <button className="intel-btn" onClick={(e) => { e.stopPropagation(); handleExportMarketResearch(item); }} disabled={marketExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', background: 'transparent', flex: viewMode === 'grid' ? 1 : 'none', justifyContent: 'center' }}>
                          <FileText size={14} /> {marketExporting ? "Exporting..." : "Export PDF"}
                        </button>
                        <button className="intel-btn" onClick={(e) => { e.stopPropagation(); handleExportDocx(item); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3498db', borderColor: 'rgba(52,152,219,0.3)', background: 'transparent', flex: viewMode === 'grid' ? 1 : 'none', justifyContent: 'center' }}>
                          <File size={14} /> Export DOCX
                        </button>
                        <button className="intel-btn" onClick={(e) => handleDeleteResearch(e, item.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.3)', background: 'transparent', flex: viewMode === 'grid' ? 1 : 'none', justifyContent: 'center', padding: '8px', minWidth: '40px' }} title="Delete Research">
                          <Trash2 size={14} />
                        </button>
                      </div>'''
content = content.replace(actions_old, actions_new)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
