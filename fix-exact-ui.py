# -*- coding: utf-8 -*-
import sys

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we have the required icons
if 'Calendar,' not in content:
    content = content.replace('import { Star, Eye, Target, LayoutGrid, Trash2, List, ChevronDown, Sparkles } from "lucide-react";', 'import { Star, Eye, Target, LayoutGrid, Trash2, List, ChevronDown, Sparkles, Calendar, Tag, Hash, FileText } from "lucide-react";')

old_card_code = '''                  const indConfig = getIndustryConfig(item.form?.industry);
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

# The new exact layout
new_card_code = '''                  const indConfig = getIndustryConfig(item.form?.industry);
                  
                  // Use specific colors for the left block based on industry, fallback to blue gradient
                  let blockBg = "linear-gradient(135deg, #3498db, #2980b9)";
                  if (item.form?.industry?.includes("Food")) blockBg = "linear-gradient(135deg, #e67e22, #d35400)";
                  if (item.form?.industry?.includes("Health")) blockBg = "linear-gradient(135deg, #2ecc71, #27ae60)";
                  if (item.form?.industry?.includes("Finance")) blockBg = "linear-gradient(135deg, #f1c40f, #f39c12)";
                  if (item.form?.industry?.includes("Tech") || item.form?.industry?.includes("SaaS") || item.form?.industry?.includes("Technology")) blockBg = "linear-gradient(135deg, #3498db, #5dade2)";

                  const aiModelName = item.marketResearch?.model || "gemini-2.5-flash";

                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', gap: '24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', transition: 'all 0.2s', cursor: 'default' }}>
                      
                      {/* Left Big Icon Block */}
                      <div style={{ width: viewMode === 'grid' ? '100%' : '140px', height: viewMode === 'grid' ? '140px' : '140px', borderRadius: '12px', background: blockBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ color: '#fff', transform: 'scale(1.5)', marginBottom: '16px' }}>
                          {indConfig.icon}
                        </div>
                        <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(0,0,0,0.25)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.form?.industry || 'Unknown'}
                        </div>
                      </div>

                      {/* Right Content Block */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                          <Star onClick={(e) => toggleFavorite(e, item.id)} size={18} color={item.isFavorite ? '#f1c40f' : 'var(--text-muted)'} fill={item.isFavorite ? '#f1c40f' : 'none'} style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="favorite-star" />
                        </div>
                        
                        <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', flex: 1 }}>{desc}</p>
                        
                        {/* Footer row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
                          
                          {/* Metadata Left */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <Calendar size={14} />
                              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&bull;</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brand-cyan)' }}>
                              <Tag size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>{item.form?.industry || 'Unknown'}</span>
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&bull;</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                              <Hash size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>{aiModelName}</span>
                            </div>
                          </div>

                          {/* Action Buttons Right */}
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                              <Eye size={14} /> Open
                            </button>
                            <button className="intel-btn" onClick={() => handleExportMarketResearch(item)} disabled={marketExporting} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                              <FileText size={14} /> Export PDF
                            </button>
                            <button className="intel-btn" onClick={() => { /* Need Docx function */ }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(52,152,219,0.3)', color: '#3498db', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                              <FileText size={14} /> Export DOCX
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );'''

content = content.replace(old_card_code, new_card_code)

with open('c:/Users/tonton/Downloads/Intellegence-Market-DataAnalytics/INTEGRATION-HERMESV2.2.1-INTEGRATION-HERMESV2.2.1/client/src/pages/Admin/Intelligence/MarketResearch.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored exact UI!")
