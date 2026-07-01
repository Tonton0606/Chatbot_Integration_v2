const fs = require('fs');
const file = 'client/src/pages/Admin/Intelligence/MarketResearch.jsx';
let content = fs.readFileSync(file, 'utf8');

const newForm = 
        <form onSubmit={handleSubmit}>
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
        </form>
;

const formStartIdx = content.indexOf('<form onSubmit={handleSubmit}>');
const formEndIdx = content.indexOf('</form>', formStartIdx);

if (formStartIdx !== -1 && formEndIdx !== -1) {
  content = content.substring(0, formStartIdx) + newForm + content.substring(formEndIdx + 7);
}

const headerPattern = /<div className="intel-row" style=\{\{\s*marginBottom: 20\s*\}\}>[\s\S]*?Configure Research Parameters[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(headerPattern, '');

fs.writeFileSync(file, content);
console.log('Form updated');
