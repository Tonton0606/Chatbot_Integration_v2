# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getIndustryConfig right before the return statement
industry_config_code = '''
  const getIndustryConfig = (industry) => {
    const config = {
      "Technology & Software": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>, color: "#3498db", bg: "rgba(52,152,219,0.1)" },
      "Retail & E-commerce": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>, color: "#e74c3c", bg: "rgba(231,76,60,0.1)" },
      "Healthcare & Pharma": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>, color: "#2ecc71", bg: "rgba(46,204,113,0.1)" },
      "Finance & Banking": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: "#f1c40f", bg: "rgba(241,196,15,0.1)" },
      "Real Estate": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>, color: "#9b59b6", bg: "rgba(155,89,182,0.1)" },
      "Food & Beverage": { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>, color: "#e67e22", bg: "rgba(230,126,34,0.1)" }
    };
    return config[industry] || { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>, color: "var(--brand-cyan)", bg: "rgba(0, 242, 254, 0.1)" };
  };
'''

if 'const getIndustryConfig' not in content:
    content = content.replace('  const marketAnalytics = marketResearch?.analytics || {};', industry_config_code + '\n  const marketAnalytics = marketResearch?.analytics || {};')

old_card = '''                  return (
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
                  );'''

new_card = '''                  const indConfig = getIndustryConfig(item.form?.industry);
                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', gap: viewMode === 'grid' ? '16px' : '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', transition: 'all 0.2s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} className="intel-card-hover">
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: indConfig.bg, color: indConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {indConfig.icon}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--text-primary)', fontWeight: '700' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>{item.form?.industry || 'Unknown'}</span>
                              {item.form?.region && <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>{item.form?.region}</span>}
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>&bull; {new Date(item.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Star onClick={(e) => toggleFavorite(e, item.id)} size={22} color={item.isFavorite ? '#f1c40f' : 'var(--text-muted)'} fill={item.isFavorite ? '#f1c40f' : 'none'} style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="favorite-star" />
                        </div>
                        <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>{desc}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                          <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--brand-cyan)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}><Eye size={16} /> Open Report</button>
                          <button className="intel-btn" onClick={(e) => handleDeleteResearch(e, item.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e74c3c', background: 'rgba(231,76,60,0.1)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}><Trash2 size={16} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  );'''

content = content.replace(old_card, new_card)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored card design!")
