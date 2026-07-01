import React, { useState, useEffect, useCallback } from 'react';

// Global Context
const AppContext = React.createContext();

// Mock Data
const mockSalesData = {
  pipeline: [
    { id: 1, name: "Enterprise Deal A", value: 125000, owner: "Sarah Chen", stage: "proposal", probability: 75, company: "TechCorp Inc" },
    { id: 2, name: "Mid-Market Solution", value: 45000, owner: "Mike Johnson", stage: "qualified", probability: 60, company: "Global Systems" },
    { id: 3, name: "Startup Package", value: 15000, owner: "Alex Rivera", stage: "prospect", probability: 25, company: "InnovateLab" },
    { id: 4, name: "Strategic Partnership", value: 250000, owner: "Sarah Chen", stage: "negotiation", probability: 90, company: "Fortune 500 Co" },
    { id: 5, name: "SMB Quick Start", value: 8000, owner: "Mike Johnson", stage: "closed", probability: 100, company: "Local Business" }
  ],
  campaigns: [
    { id: 1, name: "Q4 Product Launch", channel: "Email", status: "Active", reach: 45000, ctr: 3.2, conversions: 1440, spend: 5000, roi: 188 },
    { id: 2, name: "LinkedIn Lead Gen", channel: "Social", status: "Active", reach: 12000, ctr: 1.8, conversions: 216, spend: 3000, roi: 72 },
    { id: 3, name: "Google Ads Campaign", channel: "Paid", status: "Paused", reach: 25000, ctr: 2.1, conversions: 525, spend: 8000, roi: 66 },
    { id: 4, name: "Content Marketing", channel: "SEO", status: "Active", reach: 35000, ctr: 4.5, conversions: 1575, spend: 2000, roi: 788 }
  ],
  performers: [
    { name: "Sarah Chen", dealsClosed: 12, quotaPercent: 118, revenue: 485000, trend: "up" },
    { name: "Mike Johnson", dealsClosed: 8, quotaPercent: 95, revenue: 320000, trend: "up" },
    { name: "Alex Rivera", dealsClosed: 6, quotaPercent: 88, revenue: 275000, trend: "down" }
  ],
  revenue: [85000, 92000, 78000, 105000, 112000, 98000, 125000, 118000, 135000, 142000, 128000, 155000]
};

const mockCRMData = {
  contacts: [
    { id: 1, name: "John Davidson", company: "TechCorp Inc", email: "john@techcorp.com", phone: "+1-555-0101", segment: "VIP", lastInteraction: "2024-01-15", healthScore: 92, owner: "Sarah Chen" },
    { id: 2, name: "Emily Rodriguez", company: "Global Systems", email: "emily@global.com", phone: "+1-555-0102", segment: "Customer", lastInteraction: "2024-01-14", healthScore: 78, owner: "Mike Johnson" },
    { id: 3, name: "Michael Chen", company: "InnovateLab", email: "michael@innovate.com", phone: "+1-555-0103", segment: "Lead", lastInteraction: "2024-01-13", healthScore: 65, owner: "Alex Rivera" },
    { id: 4, name: "Sarah Williams", company: "Fortune 500 Co", email: "sarah@f500.com", phone: "+1-555-0104", segment: "Prospect", lastInteraction: "2024-01-12", healthScore: 71, owner: "Sarah Chen" },
    { id: 5, name: "David Kim", company: "Local Business", email: "david@local.com", phone: "+1-555-0105", segment: "Customer", lastInteraction: "2024-01-11", healthScore: 84, owner: "Mike Johnson" }
  ],
  interactions: [
    { type: "email", contact: "John Davidson", summary: "Discussed Q4 expansion plans", timestamp: "2024-01-15 10:30" },
    { type: "call", contact: "Emily Rodriguez", summary: "Product demo and pricing review", timestamp: "2024-01-14 14:15" },
    { type: "meeting", contact: "Michael Chen", summary: "Requirements gathering session", timestamp: "2024-01-13 11:00" },
    { type: "deal", contact: "Sarah Williams", summary: "Closed enterprise deal", timestamp: "2024-01-12 16:45" },
    { type: "note", contact: "David Kim", summary: "Follow up required for renewal", timestamp: "2024-01-11 09:20" }
  ]
};

const mockERPData = {
  inventory: [
    { sku: "PRD-001", name: "Premium Software License", category: "Software", quantity: 150, reorderPoint: 50, unitCost: 500, totalValue: 75000, warehouse: "Digital", status: "In Stock" },
    { sku: "PRD-002", name: "Support Package", category: "Services", quantity: 25, reorderPoint: 30, unitCost: 200, totalValue: 5000, warehouse: "Service", status: "Low Stock" },
    { sku: "PRD-003", name: "Training Credits", category: "Education", quantity: 0, reorderPoint: 20, unitCost: 150, totalValue: 0, warehouse: "Digital", status: "Out of Stock" },
    { sku: "PRD-004", name: "Hardware Bundle", category: "Hardware", quantity: 75, reorderPoint: 25, unitCost: 1200, totalValue: 90000, warehouse: "Physical", status: "In Stock" }
  ],
  orders: [
    { id: "ORD-001", customer: "TechCorp Inc", items: 3, total: 15000, status: "Processing", date: "2024-01-15", carrier: "FedEx" },
    { id: "ORD-002", customer: "Global Systems", items: 5, total: 8500, status: "Shipped", date: "2024-01-14", carrier: "UPS" },
    { id: "ORD-003", customer: "InnovateLab", items: 2, total: 3200, status: "Delivered", date: "2024-01-13", carrier: "DHL" },
    { id: "ORD-004", customer: "Fortune 500 Co", items: 10, total: 25000, status: "Pending", date: "2024-01-12", carrier: "FedEx" }
  ],
  suppliers: [
    { name: "CloudTech Solutions", category: "Infrastructure", contact: "Jane Smith", rating: 4.8, activePOs: 3, avgLeadTime: 7, lastOrder: "2024-01-10" },
    { name: "DataCorp Analytics", category: "Data Services", contact: "Bob Johnson", rating: 4.5, activePOs: 2, avgLeadTime: 14, lastOrder: "2024-01-08" },
    { name: "SecureNet Systems", category: "Security", contact: "Alice Brown", rating: 4.9, activePOs: 1, avgLeadTime: 5, lastOrder: "2024-01-12" }
  ]
};

const mockAnalyticsData = {
  kpis: [
    { name: "DAU", value: 12450, change: 12.5, sparkline: [10000, 10500, 11000, 10800, 11500, 12000, 12450] },
    { name: "MAU", value: 156000, change: 8.3, sparkline: [140000, 142000, 145000, 148000, 150000, 152000, 156000] },
    { name: "Retention Rate", value: 87.2, change: 2.1, sparkline: [85, 85.5, 86, 86.2, 86.8, 87, 87.2] },
    { name: "Avg Session Duration", value: 18.5, change: -5.2, sparkline: [20, 19.5, 19, 19.2, 18.8, 18.6, 18.5] },
    { name: "Bounce Rate", value: 32.1, change: -8.7, sparkline: [35, 34.5, 34, 33.8, 33.2, 32.5, 32.1] },
    { name: "NPS Score", value: 72, change: 4.2, sparkline: [68, 69, 69.5, 70, 70.5, 71, 72] },
    { name: "MRR", value: 485000, change: 15.8, sparkline: [400000, 410000, 420000, 430000, 440000, 450000, 485000] },
    { name: "Churn Rate", value: 3.2, change: -12.5, sparkline: [4.5, 4.3, 4.1, 3.9, 3.7, 3.5, 3.2] }
  ],
  insights: [
    { icon: "📈", metric: "Revenue", change: "+15.8%", description: "MRR growth driven by enterprise upgrades" },
    { icon: "👥", metric: "Engagement", change: "+12.5%", description: "DAU increase from new feature adoption" },
    { icon: "⚠️", metric: "Sessions", change: "-5.2%", description: "Session duration needs optimization" },
    { icon: "✅", metric: "Retention", change: "+2.1%", description: "Customer retention at quarterly high" },
    { icon: "💰", metric: "Churn", change: "-12.5%", description: "Churn reduction from support improvements" }
  ]
};

// Main App Component
const NexusOS = () => {
  const [apiKey, setApiKey] = useState('');
  const [activeModule, setActiveModule] = useState('sales');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiResponses, setAiResponses] = useState({});
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [botConfig, setBotConfig] = useState({
    name: "NexusBot",
    persona: "Professional",
    language: "English",
    escalationKeywords: ["human", "agent", "representative"],
    maxResponseLength: 300
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [intents, setIntents] = useState([
    { id: 1, name: "Product Inquiry", triggerPhrases: ["product", "features", "pricing"], response: "I'd be happy to help you learn about our products...", confidence: 0.85, active: true },
    { id: 2, name: "Support Request", triggerPhrases: ["help", "issue", "problem"], response: "I understand you need assistance. Let me help you...", confidence: 0.90, active: true }
  ]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const addNotification = useCallback((type, message) => {
    const notification = { id: Date.now(), type, message, timestamp: new Date() };
    setNotifications(prev => [...prev.slice(-3), notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 4000);
  }, []);

  const callGroqAPI = async (prompt, module) => {
    if (!apiKey) {
      addNotification('error', 'Please configure Groq API key in Settings');
      return null;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      addNotification('success', `${module} AI analysis complete`);
      return data.choices[0].message.content;
    } catch (error) {
      addNotification('error', `AI Error: ${error.message}`);
      return null;
    }
  };

  const handleAIAction = async (actionType, data) => {
    const actionKey = `${actionType}_${Date.now()}`;
    setAiResponses(prev => ({ ...prev, [actionKey]: '' }));

    let prompt = '';
    switch (actionType) {
      case 'forecast_revenue':
        prompt = `Analyze this sales pipeline data and provide a 90-day revenue forecast with confidence intervals and risk factors: ${JSON.stringify(data)}`;
        break;
      case 'optimize_campaigns':
        prompt = `Analyze this campaign data and provide budget reallocation recommendations: ${JSON.stringify(data)}`;
        break;
      case 'generate_copy':
        prompt = `Generate marketing campaign copy for: ${data.goal} targeting: ${data.audience}`;
        break;
      case 'score_contacts':
        prompt = `Analyze these CRM contacts and provide churn risk scores and upsell opportunities: ${JSON.stringify(data)}`;
        break;
      case 'draft_outreach':
        prompt = `Generate a personalized outreach email for this contact: ${JSON.stringify(data)}`;
        break;
      case 'inventory_optimizer':
        prompt = `Analyze this inventory data and provide reorder recommendations: ${JSON.stringify(data)}`;
        break;
      case 'supply_chain_risk':
        prompt = `Analyze this supply chain data and identify risks: ${JSON.stringify(data)}`;
        break;
      case 'ai_analyst':
        prompt = `Provide an executive analysis of these business metrics: ${JSON.stringify(data)}`;
        break;
      default:
        prompt = data;
    }

    const response = await callGroqAPI(prompt, actionType);
    if (response) {
      setAiResponses(prev => ({ ...prev, [actionKey]: response }));
    }
  };

  const handleChatMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user', content: currentMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);

    const systemPrompt = `You are ${botConfig.name}, a ${botConfig.persona} customer service bot. 
    Intents: ${JSON.stringify(intents.filter(i => i.active))}. 
    Respond in ${botConfig.language}. Keep responses under ${botConfig.maxResponseLength} characters.`;

    const response = await callGroqAPI(`${systemPrompt}\n\nUser: ${currentMessage}`, 'Chatbot');
    
    if (response) {
      const botMessage = { role: 'assistant', content: response, timestamp: new Date() };
      setChatMessages(prev => [...prev, botMessage]);
    }

    setCurrentMessage('');
  };

  const exportToCSV = (data, filename) => {
    const csv = Object.keys(data[0]).join(',') + '\n' + 
      data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('success', 'Data exported successfully');
  };

  // UI Components
  const StatusBadge = ({ status, type = 'default' }) => {
    const getStatusClasses = () => {
      switch (type) {
        case 'campaign':
          return status === 'Active' ? 'bg-emerald-600' :
                 status === 'Paused' ? 'bg-yellow-600' : 'bg-gray-600';
        case 'inventory':
          return status === 'In Stock' ? 'bg-emerald-600' :
                 status === 'Low Stock' ? 'bg-yellow-600' : 'bg-rose-600';
        case 'order':
          return status === 'Delivered' ? 'bg-emerald-600' :
                 status === 'Shipped' ? 'bg-blue-600' :
                 status === 'Processing' ? 'bg-yellow-600' :
                 status === 'Pending' ? 'bg-gray-600' : 'bg-rose-600';
        case 'segment':
          return status === 'VIP' ? 'bg-yellow-600' :
                 status === 'Customer' ? 'bg-emerald-600' :
                 status === 'Prospect' ? 'bg-blue-600' : 'bg-gray-600';
        default:
          return status === 'Active' ? 'bg-emerald-600' : 'bg-gray-600';
      }
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${getStatusClasses()}`}>
        {status}
      </span>
    );
  };

  const AIResponseDisplay = ({ responseKeys }) => {
    const filteredResponses = Object.entries(aiResponses).filter(([key]) => 
      responseKeys.some(filterKey => key.includes(filterKey))
    );
    
    if (filteredResponses.length === 0) return null;
    
    return filteredResponses.map(([key, response]) => (
      <div key={key} className="bg-gray-900 border border-violet-600 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-violet-400 mb-3">AI Analysis</h4>
        <div className="text-gray-300 font-mono text-sm whitespace-pre-wrap">{response}</div>
      </div>
    ));
  };

  const NotificationToast = ({ notification }) => (
    <div className={`p-4 rounded-lg shadow-lg mb-2 flex items-center space-x-3 ${
      notification.type === 'success' ? 'bg-emerald-600' :
      notification.type === 'error' ? 'bg-rose-600' : 'bg-violet-600'
    } text-white`}>
      <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '✗' : 'ℹ'}</span>
      <span className="flex-1">{notification.message}</span>
    </div>
  );

  const AnimatedCounter = ({ value, prefix = '', suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }, [value]);
    
    return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
  };

  const SparklineChart = ({ data, width = 60, height = 20 }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={data[data.length - 1] > data[0] ? '#10B981' : '#F43F5E'}
          strokeWidth="2"
        />
      </svg>
    );
  };

  const SalesMarketingModule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Sales & Marketing</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => handleAIAction('forecast_revenue', mockSalesData)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>Forecast Revenue</span>
          </button>
          <button
            onClick={() => handleAIAction('optimize_campaigns', mockSalesData.campaigns)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>Campaign Optimizer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Total Revenue</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={1250000} prefix="$" />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Deals Won</div>
          <div className="text-2xl font-bold text-emerald-500">
            <AnimatedCounter value={47} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Deals Lost</div>
          <div className="text-2xl font-bold text-rose-500">
            <AnimatedCounter value={12} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Avg Deal Size</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={26595} prefix="$" />
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Sales Pipeline</h3>
        <div className="grid grid-cols-5 gap-4">
          {['prospect', 'qualified', 'proposal', 'negotiation', 'closed'].map(stage => (
            <div key={stage} className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-400 mb-3 capitalize">{stage}</div>
              <div className="space-y-2">
                {mockSalesData.pipeline
                  .filter(deal => deal.stage === stage)
                  .map(deal => (
                    <div
                      key={deal.id}
                      className="bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      <div className="text-white font-medium text-sm">{deal.name}</div>
                      <div className="text-emerald-500 text-sm">${deal.value.toLocaleString()}</div>
                      <div className="text-gray-400 text-xs">{deal.owner}</div>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-violet-600 text-white text-xs rounded">
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Tracker */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Campaign Tracker</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Campaign</th>
                <th className="text-left py-3 px-4">Channel</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Reach</th>
                <th className="text-left py-3 px-4">CTR</th>
                <th className="text-left py-3 px-4">Conversions</th>
                <th className="text-left py-3 px-4">Spend</th>
                <th className="text-left py-3 px-4">ROI</th>
              </tr>
            </thead>
            <tbody>
              {mockSalesData.campaigns.map(campaign => (
                <tr key={campaign.id} className="border-b border-gray-700">
                  <td className="py-3 px-4">{campaign.name}</td>
                  <td className="py-3 px-4">{campaign.channel}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={campaign.status} type="campaign" />
                  </td>
                  <td className="py-3 px-4">{campaign.reach.toLocaleString()}</td>
                  <td className="py-3 px-4">{campaign.ctr}%</td>
                  <td className="py-3 px-4">{campaign.conversions.toLocaleString()}</td>
                  <td className="py-3 px-4">${campaign.spend.toLocaleString()}</td>
                  <td className="py-3 px-4 text-emerald-500">{campaign.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Monthly Revenue</h3>
        <div className="h-64">
          <svg viewBox="0 0 800 250" className="w-full h-full">
            {mockSalesData.revenue.map((value, index) => {
              const barWidth = 60;
              const barSpacing = 10;
              const maxValue = Math.max(...mockSalesData.revenue);
              const barHeight = (value / maxValue) * 200;
              const x = index * (barWidth + barSpacing) + 50;
              const y = 220 - barHeight;
              
              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="#7C3AED"
                    className="animate-grow"
                    style={{ animationDelay: `${index * 100}ms` }}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={240}
                    fill="#9CA3AF"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    fill="white"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    ${(value / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <AIResponseDisplay responseKeys={['forecast_revenue', 'optimize_campaigns']} />
    </div>
  );

  const CRMModule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Customer Relationship Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => handleAIAction('score_contacts', mockCRMData.contacts)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>Score Contacts</span>
          </button>
          <button
            onClick={() => setShowAddContactModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Add Contact
          </button>
        </div>
      </div>

      {/* Contact Directory */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Contact Directory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Company</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Segment</th>
                <th className="text-left py-3 px-4">Health Score</th>
                <th className="text-left py-3 px-4">Last Interaction</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockCRMData.contacts.map(contact => (
                <tr key={contact.id} className="border-b border-gray-700">
                  <td className="py-3 px-4 font-medium">{contact.name}</td>
                  <td className="py-3 px-4">{contact.company}</td>
                  <td className="py-3 px-4">{contact.email}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={contact.segment} type="segment" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            contact.healthScore >= 80 ? 'bg-emerald-500' :
                            contact.healthScore >= 60 ? 'bg-yellow-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${contact.healthScore}%` }}
                        />
                      </div>
                      <span className="text-sm">{contact.healthScore}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{contact.lastInteraction}</td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedContact(contact)}
                        className="text-violet-400 hover:text-violet-300"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleAIAction('draft_outreach', contact)}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Email
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Profile Drawer */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto z-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Contact Profile</h3>
            <button
              onClick={() => setSelectedContact(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-medium text-white">{selectedContact.name}</h4>
              <p className="text-gray-400">{selectedContact.company}</p>
            </div>
            <div>
              <div className="text-sm text-gray-400">Email</div>
              <div className="text-white">{selectedContact.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Phone</div>
              <div className="text-white">{selectedContact.phone}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Owner</div>
              <div className="text-white">{selectedContact.owner}</div>
            </div>
            <div>
              <h5 className="text-white font-medium mb-2">Recent Interactions</h5>
              <div className="space-y-2">
                {mockCRMData.interactions
                  .filter(interaction => interaction.contact === selectedContact.name)
                  .map((interaction, index) => (
                    <div key={index} className="bg-gray-900 p-3 rounded">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-violet-400">{interaction.type}</span>
                        <span className="text-gray-500 text-sm">{interaction.timestamp}</span>
                      </div>
                      <div className="text-gray-300 text-sm">{interaction.summary}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AIResponseDisplay responseKeys={['score_contacts', 'draft_outreach']} />
    </div>
  );

  const ERPModule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Enterprise Resource Planning</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => handleAIAction('inventory_optimizer', mockERPData.inventory)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>Inventory Optimizer</span>
          </button>
          <button
            onClick={() => handleAIAction('supply_chain_risk', mockERPData.suppliers)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>Supply Chain Risk</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Total Orders</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={1247} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Inventory Items</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={486} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Active Suppliers</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={23} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Open POs</div>
          <div className="text-2xl font-bold text-white">
            <AnimatedCounter value={18} />
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Fulfillment Rate</div>
          <div className="text-2xl font-bold text-emerald-500">
            <AnimatedCounter value={94.7} suffix="%" />
          </div>
        </div>
      </div>

      {/* Inventory Manager */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Inventory Manager</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">SKU</th>
                <th className="text-left py-3 px-4">Product Name</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Quantity</th>
                <th className="text-left py-3 px-4">Reorder Point</th>
                <th className="text-left py-3 px-4">Unit Cost</th>
                <th className="text-left py-3 px-4">Total Value</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockERPData.inventory.map(item => (
                <tr key={item.sku} className="border-b border-gray-700">
                  <td className="py-3 px-4 font-mono text-sm">{item.sku}</td>
                  <td className="py-3 px-4">{item.name}</td>
                  <td className="py-3 px-4">{item.category}</td>
                  <td className="py-3 px-4">{item.quantity}</td>
                  <td className="py-3 px-4">{item.reorderPoint}</td>
                  <td className="py-3 px-4">${item.unitCost}</td>
                  <td className="py-3 px-4">${item.totalValue.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} type="inventory" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Management */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Order Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Order ID</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Items</th>
                <th className="text-left py-3 px-4">Total</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Carrier</th>
              </tr>
            </thead>
            <tbody>
              {mockERPData.orders.map(order => (
                <tr key={order.id} className="border-b border-gray-700">
                  <td className="py-3 px-4 font-mono text-sm">{order.id}</td>
                  <td className="py-3 px-4">{order.customer}</td>
                  <td className="py-3 px-4">{order.items}</td>
                  <td className="py-3 px-4">${order.total.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} type="order" />
                  </td>
                  <td className="py-3 px-4">{order.date}</td>
                  <td className="py-3 px-4">{order.carrier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AIResponseDisplay responseKeys={['inventory', 'supply_chain']} />
    </div>
  );

  const ChatbotModule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Autoreply Chatbot Builder</h2>
        <button
          onClick={() => handleAIAction('audit_bot_quality', intents)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
        >
          <span>⚡</span>
          <span>Audit Bot Quality</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Configuration */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Bot Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bot Name</label>
              <input
                type="text"
                value={botConfig.name}
                onChange={(e) => setBotConfig({...botConfig, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Persona/Tone</label>
              <select
                value={botConfig.persona}
                onChange={(e) => setBotConfig({...botConfig, persona: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              >
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Concise">Concise</option>
                <option value="Empathetic">Empathetic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Response Language</label>
              <select
                value={botConfig.language}
                onChange={(e) => setBotConfig({...botConfig, language: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Response Length</label>
              <input
                type="range"
                min="100"
                max="500"
                value={botConfig.maxResponseLength}
                onChange={(e) => setBotConfig({...botConfig, maxResponseLength: e.target.value})}
                className="w-full"
              />
              <div className="text-gray-400 text-sm">{botConfig.maxResponseLength} characters</div>
            </div>
          </div>
        </div>

        {/* Intent Manager */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Intent Manager</h3>
          <div className="space-y-3">
            {intents.map(intent => (
              <div key={intent.id} className="bg-gray-900 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-medium">{intent.name}</h4>
                  <button
                    onClick={() => setIntents(intents.filter(i => i.id !== intent.id))}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Triggers: {intent.triggerPhrases.join(', ')}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Confidence: {intent.confidence}</span>
                  <button
                    onClick={() => setIntents(intents.map(i => 
                      i.id === intent.id ? {...i, active: !i.active} : i
                    ))}
                    className={`px-2 py-1 rounded text-xs ${
                      intent.active ? 'bg-emerald-600' : 'bg-gray-600'
                    }`}
                  >
                    {intent.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => handleAIAction('generate_intent', 'Create a new intent for handling refund requests')}
              className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <span>⚡</span>
              <span>Generate Intent</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Chat Preview */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Live Conversation Preview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-gray-400 mb-3">Chat Simulator</h4>
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto mb-4">
              {chatMessages.map((message, index) => (
                <div key={index} className={`mb-3 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2 rounded-lg ${
                    message.role === 'user' ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
              />
              <button
                onClick={handleChatMessage}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-gray-400 mb-3">Bot Analysis</h4>
            <div className="bg-gray-900 rounded-lg p-4 h-96">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Matched Intent:</span>
                  <span className="text-white">
                    {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' ? 'Product Inquiry' : 'Waiting...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="text-emerald-400">
                    {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' ? '85%' : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Response Time:</span>
                  <span className="text-white">
                    {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' ? '0.8s' : '0s'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fallback Used:</span>
                  <span className="text-rose-400">
                    {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' ? 'No' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Conversations</div>
          <div className="text-xl font-bold text-white">1,247</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Resolved by Bot</div>
          <div className="text-xl font-bold text-emerald-500">78%</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Avg Response Time</div>
          <div className="text-xl font-bold text-white">1.2s</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Escalation Rate</div>
          <div className="text-xl font-bold text-rose-500">22%</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Satisfaction Score</div>
          <div className="text-xl font-bold text-emerald-500">4.6/5</div>
        </div>
      </div>
    </div>
  );

  const AnalyticsModule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Data Analytics</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => handleAIAction('ai_analyst', mockAnalyticsData.kpis)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚡</span>
            <span>AI Analyst</span>
          </button>
          <button
            onClick={() => exportToCSV(mockAnalyticsData.kpis, 'analytics_data.csv')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Command Bar */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <select className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white">
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>Last Year</option>
            <option>Custom Range</option>
          </select>
          <select className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white">
            <option>All Segments</option>
            <option>B2B</option>
            <option>B2C</option>
            <option>Enterprise</option>
          </select>
          <select className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white">
            <option>All Metrics</option>
            <option>Revenue</option>
            <option>Engagement</option>
            <option>Operations</option>
            <option>Marketing</option>
          </select>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {mockAnalyticsData.kpis.map((kpi, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-violet-600 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="text-gray-400 text-sm">{kpi.name}</div>
              <SparklineChart data={kpi.sparkline} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              <AnimatedCounter value={kpi.value} prefix={kpi.name === 'MRR' ? '$' : ''} suffix={kpi.name.includes('Rate') || kpi.name === 'NPS Score' ? '' : kpi.name === 'Avg Session Duration' ? 'm' : ''} />
            </div>
            <div className={`text-sm ${kpi.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex space-x-4 mb-4">
          <button className="px-4 py-2 bg-violet-600 text-white rounded-lg">Trend Analysis</button>
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cohort Retention</button>
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Funnel Analysis</button>
          <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Geographic</button>
        </div>
        <div className="h-64">
          <svg viewBox="0 0 800 250" className="w-full h-full">
            {/* Grid lines */}
            {[...Array(6)].map((_, i) => (
              <line
                key={i}
                x1="50"
                y1={i * 40 + 10}
                x2="750"
                y2={i * 40 + 10}
                stroke="#374151"
                strokeWidth="1"
              />
            ))}
            {/* Sample trend lines */}
            <polyline
              points="50,180 150,160 250,140 350,120 450,100 550,80 650,60 750,40"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="3"
            />
            <polyline
              points="50,200 150,180 250,170 350,150 450,140 550,120 650,110 750,90"
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
            />
            <polyline
              points="50,220 150,210 250,200 350,190 450,180 550,170 650,160 750,150"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>

      {/* Insight Feed */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Insight Feed</h3>
        <div className="space-y-3">
          {mockAnalyticsData.insights.map((insight, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{insight.icon}</span>
                <div>
                  <div className="text-white font-medium">{insight.metric}</div>
                  <div className="text-gray-400 text-sm">{insight.description}</div>
                </div>
              </div>
              <div className={`text-lg font-semibold ${insight.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                {insight.change}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AIResponseDisplay responseKeys={['ai_analyst']} />
    </div>
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold text-violet-600 mb-4">NexusOS</div>
          <div className="text-gray-400">Loading enterprise intelligence...</div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ apiKey, setApiKey, addNotification }}>
      <div className="min-h-screen bg-gray-900 text-white">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Outfit', sans-serif;
            background: #080B10;
          }
          
          h1, h2, h3 {
            font-family: 'Playfair Display', serif;
          }
          
          .animate-grow {
            animation: grow 1s ease-out forwards;
            transform-origin: bottom;
          }
          
          @keyframes grow {
            from { transform: scaleY(0); }
            to { transform: scaleY(1); }
          }
          
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #1F2937;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #4B5563;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #6B7280;
          }
        `}</style>

        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-2xl font-bold text-violet-600">NexusOS</div>
            <div className="text-gray-400">/ {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}</div>
          </div>
          
          <div className="flex-1 max-w-xl mx-6">
            <input
              type="text"
              placeholder="Search contacts, deals, orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-white">
              <span>🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white"
              >
                <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">A</div>
                <span>Admin</span>
              </button>
              
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => { setShowUserDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowUserDropdown(false); setShowSettingsModal(true); }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { setShowUserDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-800 border-r border-gray-700 min-h-screen transition-all duration-300`}>
            <div className="p-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-gray-400 hover:text-white mb-6"
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
              
              <nav className="space-y-2">
                {[
                  { id: 'sales', label: 'Sales & Marketing', icon: '💰', color: 'bg-emerald-500' },
                  { id: 'crm', label: 'CRM', icon: '👥', color: 'bg-blue-500' },
                  { id: 'erp', label: 'ERP', icon: '📦', color: 'bg-yellow-500' },
                  { id: 'chatbot', label: 'Chatbot Builder', icon: '🤖', color: 'bg-violet-500' },
                  { id: 'analytics', label: 'Data Analytics', icon: '📊', color: 'bg-rose-500' },
                  { id: 'settings', label: 'Settings', icon: '⚙️', color: 'bg-gray-500' }
                ].map(module => (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      activeModule === module.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{module.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="w-2 h-2 rounded-full {module.color}"></span>
                        <span>{module.label}</span>
                      </>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {activeModule === 'sales' && <SalesMarketingModule />}
            {activeModule === 'crm' && <CRMModule />}
            {activeModule === 'erp' && <ERPModule />}
            {activeModule === 'chatbot' && <ChatbotModule />}
            {activeModule === 'analytics' && <AnalyticsModule />}
          </main>
        </div>

        {/* Notifications */}
        <div className="fixed top-20 right-6 z-50 space-y-2">
          {notifications.map(notification => (
            <NotificationToast key={notification.id} notification={notification} />
          ))}
        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-lg border border-gray-600 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Groq AI Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Groq API key"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div className="text-sm text-gray-400">
                      Get your API key from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">console.groq.com</a>
                    </div>
                    <button
                      onClick={() => {
                        if (apiKey) {
                          addNotification('success', 'API key saved successfully');
                          setShowSettingsModal(false);
                        } else {
                          addNotification('error', 'Please enter a valid API key');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-600 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">Enable Notifications</div>
                        <div className="text-gray-400 text-sm">Receive desktop notifications</div>
                      </div>
                      <button className="w-12 h-6 bg-violet-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">Auto-save</div>
                        <div className="text-gray-400 text-sm">Automatically save changes</div>
                      </div>
                      <button className="w-12 h-6 bg-violet-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">Dark Mode</div>
                        <div className="text-gray-400 text-sm">Use dark theme</div>
                      </div>
                      <button className="w-12 h-6 bg-violet-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddContactModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Add Contact</h3>
                <button
                  onClick={() => setShowAddContactModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
                <input
                  type="text"
                  placeholder="Company"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
                <select className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white">
                  <option>Lead</option>
                  <option>Prospect</option>
                  <option>Customer</option>
                  <option>VIP</option>
                </select>
                <button
                  onClick={() => {
                    addNotification('success', 'Contact added successfully');
                    setShowAddContactModal(false);
                  }}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default NexusOS;
