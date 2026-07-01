import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find <IntelligenceHeader and replace EVERYTHING after it with my clean structure.
idx = content.find('      <IntelligenceHeader')
if idx != -1:
    header_end_idx = content.find('/>', idx) + 2
    before = content[:header_end_idx]
    
    clean_bottom = '''

      {/* SAVED RESEARCHES TABS */}
      <div className="intel-page-body" style={{ marginTop: '24px' }}>
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

        {mainTab === 'research' && (
          <div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: "24px 28px", margin: "24px 0 0" }}>
              <form onSubmit={handleSubmit}>
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
              </form>
            </div>

            {/* Results Logic migrating from DataAnalytics.jsx */}
            {marketResearch || loading ? (
              <div className="intel-panel market-research-results" style={{ marginTop: 24 }}>
                <div className="market-research-results-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="intel-row">
                      <span className="intel-text-cyan">AI</span>
                      <div className="intel-section-title">AI Generated Insights</div>
                    </div>
                    <div className="intel-section-subtitle">
                      Comprehensive market research based on your input.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {marketResearch?.model && (
                      <span className="intel-badge intel-badge-cyan">{marketResearch.model}</span>
                    )}
                    <button
                      className="intel-btn"
                      onClick={handleExportMarketResearch}
                      type="button"
                      disabled={!marketResearch || marketExporting}
                    >
                      {marketExporting ? "Exporting..." : "Export PDF"}
                    </button>
                  </div>
                </div>

                {loading ? (
                  <MarketResearchMotionState isGenerating />
                ) : (
                  <>
                    {marketResearch && marketResearch.reportData ? (
                      <MarketResearchDashboard data={marketResearch.reportData} />
                    ) : (
                      <div className="intel-empty-state">
                        No insights available. Please generate a new report.
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}

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

      <style>{
        @keyframes spin { to { transform: rotate(360deg); } }
        .intel-select {
          color-scheme: light dark;
        }
        .intel-select option {
          background-color: var(--bg-surface, #1e1e2f);
          color: var(--text-primary, #ffffff);
        }
      }</style>
    </div>
  );
}
'''
    
    with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
        f.write(before + clean_bottom)

print("Massive wipe and fix completed!")
