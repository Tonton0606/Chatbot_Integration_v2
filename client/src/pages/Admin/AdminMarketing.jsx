import { useState, useEffect } from "react";
import { Plus, Mail, Send, BarChart3, Sparkles, Target, Clock, Brain, Zap, TrendingUp, Users, MessageSquare, X, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, StatCard, Badge, Modal, Input, TextArea } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { supabase } from "../../config/supabaseClient";

function getWorkspaceId() {
  return localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id");
}

export default function AdminMarketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiOptimized, setAiOptimized] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    goal: '',
    targetAudience: '',
    channel: 'email'
  });

  function showNotification(type, message) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }

  const stats = {
    totalCampaigns: campaigns.length,
    emailsSent: campaigns.reduce((sum, c) => sum + (c.emails_sent || 0), 0),
    avgOpenRate: campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length).toFixed(1) + '%'
      : '0%',
    avgClickRate: campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + (c.click_rate || 0), 0) / campaigns.length).toFixed(1) + '%'
      : '0%'
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const workspaceId = getWorkspaceId();
      if (!workspaceId) { setCampaigns([]); return; }
      const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      setCampaigns(data || []);
    } catch {
      showNotification('error', 'Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function generateAICampaign() {
    if (!campaignForm.goal || !campaignForm.targetAudience) return;

    setAiGenerating(true);
    try {
      const content = await aiModules.generateCampaignContent(
        campaignForm.goal,
        campaignForm.targetAudience,
        campaignForm.channel
      );
      setGeneratedContent(content);
    } catch {
      showNotification('error', 'AI content generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  }

  async function optimizeCampaign(campaign) {
    setAiOptimized(true);
    try {
      const optimization = await aiModules.optimizeSendTime(
        { segment: campaign.target_audience, historicalEngagement: [] },
        campaign.channel
      );
      setAiResult({ type: 'optimization', campaign: campaign.name, data: optimization });
    } catch {
      showNotification('error', 'AI optimization failed. Please try again.');
    } finally {
      setAiOptimized(false);
    }
  }

  async function predictCampaign(campaign) {
    try {
      const prediction = await aiModules.predictCampaignPerformance(campaign, campaigns);
      setAiResult({ type: 'prediction', campaign: campaign.name, data: prediction });
    } catch {
      showNotification('error', 'AI prediction failed. Please try again.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Inline notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          notification.type === 'error'
            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{notification.message}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* AI Result Panel */}
      {aiResult && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
              <Brain className="w-4 h-4" />
              {aiResult.type === 'optimization' ? 'AI Send-Time Optimization' : 'AI Performance Prediction'} — {aiResult.campaign}
            </span>
            <button onClick={() => setAiResult(null)} className="text-purple-300 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
          {aiResult.type === 'optimization' && aiResult.data?.bestTime && (
            <p className="text-sm text-gray-300">Best send time: <span className="text-purple-300 font-medium">{aiResult.data.bestTime}</span>
              {aiResult.data.expectedLift && <span className="ml-2 text-emerald-400">+{aiResult.data.expectedLift}% expected lift</span>}
            </p>
          )}
          {aiResult.type === 'prediction' && aiResult.data && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              {aiResult.data.openRate && <div className="text-center"><div className="text-purple-300 font-bold text-lg">{aiResult.data.openRate}%</div><div className="text-gray-500 text-xs">Predicted Open Rate</div></div>}
              {aiResult.data.clickRate && <div className="text-center"><div className="text-blue-300 font-bold text-lg">{aiResult.data.clickRate}%</div><div className="text-gray-500 text-xs">Predicted CTR</div></div>}
              {aiResult.data.conversionRate && <div className="text-center"><div className="text-emerald-300 font-bold text-lg">{aiResult.data.conversionRate}%</div><div className="text-gray-500 text-xs">Predicted Conversion</div></div>}
            </div>
          )}
          {aiResult.data?.recommendation && (
            <p className="text-xs text-gray-400 mt-1">{aiResult.data.recommendation}</p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Marketing</h1>
          <p className="text-sm text-gray-500">AI-powered campaign creation and optimization</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>Create AI Campaign</Button>
      </div>

      {/* AI Features Panel */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Marketing Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-sm">AI Content Gen</span>
              </div>
              <p className="text-xs text-gray-500">Generate headlines, copy, and CTAs with AI</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Smart Scheduling</span>
              </div>
              <p className="text-xs text-gray-500">AI-optimized send times for max engagement</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm">Performance Prediction</span>
              </div>
              <p className="text-xs text-gray-500">Predict open rates, CTR, and conversions</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--accent-gold)]" />
                <span className="font-medium text-sm">Audience Insights</span>
              </div>
              <p className="text-xs text-gray-500">AI-powered segmentation recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Campaigns" value={stats.totalCampaigns} icon={Mail} color="bg-blue-500" />
        <StatCard title="Emails Sent" value={stats.emailsSent.toLocaleString()} icon={Send} color="bg-green-500" />
        <StatCard title="Avg Open Rate" value={stats.avgOpenRate} icon={BarChart3} color="bg-amber-500" />
        <StatCard title="Avg Click Rate" value={stats.avgClickRate} icon={BarChart3} color="bg-purple-500" />
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No AI campaigns yet. Create your first AI-powered campaign!</p>
              <Button icon={Sparkles} onClick={() => setShowCreateModal(true)}>Generate with AI</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={campaign.status === 'active' ? 'success' : 'default'} size="sm">
                          {campaign.status}
                        </Badge>
                        {campaign.ai_generated && (
                          <Badge variant="purple" size="sm" className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={TrendingUp}
                      onClick={() => predictCampaign(campaign)}
                    >
                      Predict
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={Zap}
                      loading={aiOptimized}
                      onClick={() => optimizeCampaign(campaign)}
                    >
                      Optimize
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <Modal 
          open={showCreateModal} 
          onClose={() => { setShowCreateModal(false); setGeneratedContent(null); }}
          title="Create AI-Powered Campaign"
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <Input
              label="Campaign Name"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
              placeholder="e.g., Summer Sale 2025"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Campaign Goal</label>
                <select
                  value={campaignForm.goal}
                  onChange={(e) => setCampaignForm({...campaignForm, goal: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5"
                >
                  <option value="">Select goal...</option>
                  <option value="lead_generation">Lead Generation</option>
                  <option value="product_launch">Product Launch</option>
                  <option value="customer_retention">Customer Retention</option>
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="sales_promotion">Sales Promotion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Audience</label>
                <select
                  value={campaignForm.targetAudience}
                  onChange={(e) => setCampaignForm({...campaignForm, targetAudience: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5"
                >
                  <option value="">Select audience...</option>
                  <option value="new_prospects">New Prospects</option>
                  <option value="existing_customers">Existing Customers</option>
                  <option value="vip_clients">VIP Clients</option>
                  <option value="churned_users">Churned Users</option>
                </select>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              icon={Sparkles}
              loading={aiGenerating}
              onClick={generateAICampaign}
              disabled={!campaignForm.goal || !campaignForm.targetAudience}
            >
              {aiGenerating ? 'AI is generating content...' : 'Generate AI Content'}
            </Button>

            {generatedContent && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI-Generated Content
                </h3>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Headlines:</p>
                  <ul className="text-sm space-y-1">
                    {generatedContent.headlines?.slice(0, 3).map((h, i) => (
                      <li key={i} className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded">{h}</li>
                    ))}
                  </ul>
                </div>
                {generatedContent.emailSubjects && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subject Lines:</p>
                    {generatedContent.emailSubjects.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded text-sm">
                        <span>{s.subject}</span>
                        <Badge variant="success" size="sm">{s.predictedOpenRate}% open</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* AI Assistant Widget */}

    </div>
  );
}

