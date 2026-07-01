import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

export default function MarketResearchDashboard({ data }) {
  const [activeTab, setActiveTab] = useState("all");

  if (!data) return null;

  const {
    executiveSummary = {},
    marketOverview = {},
    competitors = [],
    trends = [],
    opportunities = [],
    risks = [],
    recommendations = [],
    swot = {},
    charts = []
  } = data;

  const ensureArray = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(/\\n|,/).map(s=>s.trim()).filter(Boolean) : []);

  const TABS = [
    { id: "all", label: "All Insights" },
    { id: "summary", label: "Executive Summary" },
    { id: "overview", label: "Market Overview" },
    { id: "swot", label: "SWOT Analysis" },
    { id: "competitors", label: "Competitor Analysis" },
    { id: "trends", label: "Market Trends" },
    { id: "opportunities", label: "Opportunity Matrix" },
    { id: "risks", label: "Risk Dashboard" },
    { id: "recommendations", label: "Recommendations" },
    { id: "references", label: "References & Citations" }
  ];

  return (
    <div className="market-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* INTERNAL TABS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              background: activeTab === tab.id ? 'var(--brand-cyan)' : 'var(--bg-surface)',
              color: activeTab === tab.id ? '#1a1f36' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      {(activeTab === "all" || activeTab === "summary") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Executive Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {[
            { label: 'Confidence Score', value: executiveSummary.confidenceScore || 0 },
            { label: 'Market Viability', value: executiveSummary.marketViabilityScore || 0 },
            { label: 'Competition Score', value: executiveSummary.competitionScore || 0 },
            { label: 'Growth Potential', value: executiveSummary.growthPotentialScore || 0 }
          ].map((score, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{score.label}</span>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--brand-cyan)', marginTop: '8px' }}>{score.value} <span style={{fontSize:'16px', color:'var(--text-muted)'}}>/ 100</span></span>
            </div>
          ))}
        </div>
        {executiveSummary.summary && (
          <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {executiveSummary.summary}
          </div>
        )}
      </section>
      )}

      {/* SECTION 2: MARKET OVERVIEW */}
      {(activeTab === "all" || activeTab === "overview") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Market Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Market Size', value: marketOverview.marketSize || 'N/A' },
            { label: 'CAGR', value: marketOverview.cagr || 'N/A' },
            { label: 'Growth Outlook', value: marketOverview.growthOutlook || 'N/A' },
            { label: 'Market Maturity', value: marketOverview.marketMaturity || 'N/A' },
            { label: 'Industry Stage', value: marketOverview.industryStage || 'N/A' }
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 4: SWOT MATRIX */}
      {(activeTab === "all" || activeTab === "swot") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>SWOT Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { title: 'Strengths', data: ensureArray(swot.strengths), color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.1)' },
            { title: 'Weaknesses', data: ensureArray(swot.weaknesses), color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)' },
            { title: 'Opportunities', data: ensureArray(swot.opportunities), color: '#3498db', bg: 'rgba(52, 152, 219, 0.1)' },
            { title: 'Threats', data: ensureArray(swot.threats), color: '#f39c12', bg: 'rgba(243, 156, 18, 0.1)' }
          ].map((quadrant, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', border: `1px solid ${quadrant.color}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: quadrant.bg, color: quadrant.color, padding: '12px 16px', fontWeight: 'bold', borderBottom: `1px solid ${quadrant.color}` }}>
                {quadrant.title}
              </div>
              <ul style={{ padding: '16px 16px 16px 32px', margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                {quadrant.data.length > 0 ? quadrant.data.map((item, i) => <li key={i} style={{ marginBottom: '8px' }}>{item}</li>) : <li>No data</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 3: COMPETITOR ANALYSIS */}
      {(activeTab === "all" || activeTab === "competitors") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Competitor Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {competitors.map((comp, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{comp.name || "Unknown Competitor"}</h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{comp.positioning}</div>
                </div>
                <span style={{ 
                  background: comp.threatLevel?.toLowerCase() === 'high' ? 'rgba(231,76,60,0.1)' : comp.threatLevel?.toLowerCase() === 'medium' ? 'rgba(243,156,18,0.1)' : 'rgba(46,204,113,0.1)',
                  color: comp.threatLevel?.toLowerCase() === 'high' ? '#e74c3c' : comp.threatLevel?.toLowerCase() === 'medium' ? '#f39c12' : '#2ecc71',
                  padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold' 
                }}>
                  {comp.threatLevel || "Medium"} Threat
                </span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Strengths:</strong>
                <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {ensureArray(comp.strengths).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Weaknesses:</strong>
                <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {ensureArray(comp.weaknesses).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 5: MARKET TRENDS */}
      {(activeTab === "all" || activeTab === "trends") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Market Trends</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {trends.map((trend, idx) => {
            const isObj = typeof trend === 'object' && trend !== null;
            return (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #9b59b6' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '15px' }}>{isObj ? trend.title : 'Trend'}</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{isObj ? trend.description : trend}</p>
                {isObj && (
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--brand-cyan)' }}>↗ {trend.growthIndicator || "Growth"}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Impact: {trend.impactLevel || "Medium"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 6: OPPORTUNITY MATRIX */}
      {(activeTab === "all" || activeTab === "opportunities") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Opportunity Matrix</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {opportunities.map((opp, idx) => {
            const isObj = typeof opp === 'object' && opp !== null;
            const roiColor = opp.roi?.toLowerCase() === 'high' ? '#2ecc71' : opp.roi?.toLowerCase() === 'medium' ? '#f39c12' : '#95a5a6';
            return (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '15px' }}>{isObj ? opp.opportunity : opp}</h4>
                {isObj && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    <span style={{ background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Impact: {opp.impact}</span>
                    <span style={{ background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Difficulty: {opp.difficulty || opp.effort}</span>
                    <span style={{ background: `${roiColor}22`, color: roiColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>ROI: {opp.roi || 'Medium'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 7: RISK DASHBOARD */}
      {(activeTab === "all" || activeTab === "risks") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Risk Dashboard</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {risks.map((risk, idx) => {
            const isObj = typeof risk === 'object' && risk !== null;
            const sevColor = risk.severity?.toLowerCase() === 'high' ? '#e74c3c' : risk.severity?.toLowerCase() === 'medium' ? '#f39c12' : '#f1c40f';
            return (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px' }}>{isObj ? risk.title || risk.risk : risk}</h4>
                  {isObj && <span style={{ background: `${sevColor}22`, color: sevColor, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{risk.severity}</span>}
                </div>
                {isObj && (
                  <>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Probability: {risk.probability}</div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 8: AI RECOMMENDATIONS */}
      {(activeTab === "all" || activeTab === "recommendations") && (
      <section>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Actionable Recommendations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendations.map((rec, idx) => {
            const isObj = typeof rec === 'object' && rec !== null;
            const priColor = rec.priority?.toLowerCase() === 'high' ? '#e74c3c' : rec.priority?.toLowerCase() === 'medium' ? '#3498db' : '#2ecc71';
            return (
              <div key={idx} style={{ display: 'flex', gap: '16px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '15px' }}>{isObj ? rec.recommendation || rec.title : rec}</h4>
                  {isObj && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Impact: {rec.impact} | Effort: {rec.effort}</div>}
                </div>
                {isObj && (
                  <span style={{ background: `${priColor}22`, color: priColor, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold' }}>
                    {rec.priority} Priority
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* CHARTS (If AI provides numerical data, fallback to dummy render if not provided correctly) */}
      {(activeTab === "all" || activeTab === "overview" || activeTab === "competitors") && (
      <section id="market-research-visual-analytics">
        <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Visual Analytics</h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          These charts provide a quantitative breakdown of the competitive landscape. The Pie Chart illustrates the estimated market share distribution among key competitors, highlighting dominant players. The Bar Chart quantifies the perceived threat level of each competitor based on their strengths, market positioning, and growth trajectory.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', height: '350px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'center' }}>Market Share Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={competitors.map((c, i) => ({ name: c.name || `Comp ${i}`, value: Number(c.marketShare) || 100/(competitors.length||1) }))} 
                  cx="50%" cy="45%" outerRadius={80} 
                  fill="#8884d8" dataKey="value" 
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {competitors.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E74C3C', '#2ECC71', '#9B59B6', '#F1C40F', '#34495E'][index % 10]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(1).replace(/\\.0$/, '')}%`} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', height: '350px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'center' }}>Competitor Threat Analysis</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competitors.map(c => ({ name: c.name || 'Comp', Threat: c.threatLevel?.toLowerCase()==='high'?90 : c.threatLevel?.toLowerCase()==='medium'?60 : 30 }))} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}/>
                <Bar dataKey="Threat" fill="#3498db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      )}

      {/* REFERENCES (APA FORMAT) */}
      {(activeTab === "all" || activeTab === "references") && data.references && data.references.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--brand-cyan)' }}>📚</span> References & Citations
            </h3>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              The insights in this report are supported by the following simulated or real-world data sources (APA format):
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.references.map((ref, idx) => (
                <li key={idx} style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
                  {ref}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </div>
  );
}
