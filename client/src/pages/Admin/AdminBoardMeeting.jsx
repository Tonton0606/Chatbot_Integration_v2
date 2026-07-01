import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { 
  Presentation, TrendingUp, TrendingDown, DollarSign, Users, Target, 
  Brain, Sparkles, Download, Calendar, AlertTriangle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Activity, BarChart3, PieChart
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";

export default function AdminBoardMeeting() {
  const [kpis, setKpis] = useState(null);
  const [boardMetrics, setBoardMetrics] = useState(null);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [strategicInitiatives, setStrategicInitiatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiPredictions, setAiPredictions] = useState(null);

  useEffect(() => {
    fetchBoardData();
  }, []);

  const fetchBoardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch comprehensive board metrics
      const [
        revenueData,
        dealsData,
        teamData,
        projectData,
        riskData
      ] = await Promise.all([
        supabase.from('revenue').select('*').order('date', { ascending: false }).limit(12),
        supabase.from('deals').select('*').eq('status', 'active'),
        supabase.from('team_members').select('*'),
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('risk_assessments').select('*').order('severity', { ascending: false })
      ]);

      // Calculate board-level KPIs
      const totalRevenue = revenueData.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const activeDeals = dealsData.data?.length || 0;
      const totalTeamSize = teamData.data?.length || 0;
      const activeProjects = projectData.data?.length || 0;
      const highRiskItems = riskData.data?.filter(item => item.severity === 'high').length || 0;

      setKpis({
        totalRevenue,
        revenueGrowth: calculateRevenueGrowth(revenueData.data || []),
        activeDeals,
        dealValue: dealsData.data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0,
        teamSize: totalTeamSize,
        teamGrowth: calculateTeamGrowth(teamData.data || []),
        activeProjects,
        projectCompletionRate: calculateProjectCompletion(projectData.data || []),
        highRiskItems,
        riskScore: calculateRiskScore(riskData.data || [])
      });

      setBoardMetrics({
        marketPerformance: generateMarketPerformance(),
        operationalEfficiency: generateOperationalEfficiency(),
        financialHealth: generateFinancialHealth(),
        innovationIndex: generateInnovationIndex()
      });

      setRiskAssessments(riskData.data || []);
      setStrategicInitiatives(generateStrategicInitiatives());

      // Generate AI insights
      const insights = await aiModules.generateBoardInsights({
        kpis: { totalRevenue, activeDeals, teamSize: totalTeamSize, activeProjects },
        risks: riskData.data || [],
        trends: revenueData.data || []
      });
      setAiInsights(insights);

      // Generate AI predictions
      const predictions = await aiModules.predictBoardOutcomes({
        currentMetrics: { totalRevenue, activeDeals, teamSize: totalTeamSize },
        marketData: generateMarketData(),
        historicalData: revenueData.data || []
      });
      setAiPredictions(predictions);

    } catch (error) {
      console.error('Error fetching board data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRevenueGrowth = (revenueData) => {
    if (revenueData.length < 2) return 0;
    const recent = revenueData.slice(0, 6).reduce((sum, item) => sum + (item.amount || 0), 0);
    const previous = revenueData.slice(6, 12).reduce((sum, item) => sum + (item.amount || 0), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  };

  const calculateTeamGrowth = (teamData) => {
    // Placeholder for team growth calculation
    return 12.5;
  };

  const calculateProjectCompletion = (projectData) => {
    if (!projectData.length) return 0;
    const completed = projectData.filter(p => p.status === 'completed').length;
    return (completed / projectData.length) * 100;
  };

  const calculateRiskScore = (riskData) => {
    if (!riskData.length) return 0;
    const weightedScore = riskData.reduce((sum, risk) => {
      const weight = risk.severity === 'high' ? 3 : risk.severity === 'medium' ? 2 : 1;
      return sum + weight;
    }, 0);
    return Math.min((weightedScore / (riskData.length * 3)) * 100, 100);
  };

  const generateMarketPerformance = () => ({
    marketShare: 18.5,
    competitorAnalysis: 'Leading position in enterprise segment',
    customerSatisfaction: 92,
    brandValue: 45000000
  });

  const generateOperationalEfficiency = () => ({
    productivityIndex: 87,
    costOptimization: 15.3,
    processAutomation: 68,
    resourceUtilization: 79
  });

  const generateFinancialHealth = () => ({
    profitability: 23.8,
    cashFlow: 'Positive',
    debtToEquity: 0.45,
    liquidityRatio: 2.1
  });

  const generateInnovationIndex = () => ({
    rdInvestment: 12.5,
    patentPortfolio: 24,
    productInnovation: 8,
    processInnovation: 6
  });

  const generateStrategicInitiatives = () => [
    {
      id: 1,
      title: "Digital Transformation Complete",
      status: "on-track",
      progress: 78,
      owner: "CTO Office",
      impact: "High",
      deadline: "2024-06-30"
    },
    {
      id: 2,
      title: "Market Expansion - APAC",
      status: "at-risk",
      progress: 45,
      owner: "Business Development",
      impact: "Critical",
      deadline: "2024-09-30"
    },
    {
      id: 3,
      title: "AI Integration Suite",
      status: "ahead",
      progress: 85,
      owner: "Innovation Lab",
      impact: "Transformative",
      deadline: "2024-05-15"
    }
  ];

  const generateMarketData = () => ({
    marketGrowth: 5.2,
    marketSize: 12500000000,
    competitivePosition: 2,
    marketTrends: ['Digital Transformation', 'AI Adoption', 'Sustainability Focus']
  });

  const generateAIInsights = async () => {
    return await aiModules.generateBoardInsights({
      kpis,
      risks: riskAssessments,
      trends: []
    });
  };

  const generateAIPredictions = async () => {
    return await aiModules.predictBoardOutcomes({
      currentMetrics: kpis,
      marketData: generateMarketData(),
      historicalData: []
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Meeting Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Board Meeting Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Executive KPIs and strategic overview for board presentations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download}>
            Export Report
          </Button>
          <Button icon={Presentation}>
            Start Presentation
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Revenue</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  ${(kpis?.totalRevenue || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {kpis?.revenueGrowth > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-[var(--danger)]" />
                  )}
                  <span className={`text-sm ${kpis?.revenueGrowth > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {kpis?.revenueGrowth?.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-cyan-soft)] rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--brand-cyan)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Active Deals</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis?.activeDeals || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  Value: ${(kpis?.dealValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--success-soft)] rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[var(--success)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Team Size</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis?.teamSize || 0}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-[var(--success)]" />
                  <span className="text-sm text-[var(--success)]">
                    +{kpis?.teamGrowth || 0}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-gold-soft)] rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[var(--brand-gold)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Risk Score</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{kpis?.riskScore || 0}%</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  {kpis?.highRiskItems || 0} high risks
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--danger-soft)] rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--danger)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Board Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Market Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Market Share</span>
                <span className="font-semibold">{boardMetrics?.marketPerformance?.marketShare}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Customer Satisfaction</span>
                <span className="font-semibold">{boardMetrics?.marketPerformance?.customerSatisfaction}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Brand Value</span>
                <span className="font-semibold">${(boardMetrics?.marketPerformance?.brandValue / 1000000).toFixed(0)}M</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Operational Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Productivity Index</span>
                <span className="font-semibold">{boardMetrics?.operationalEfficiency?.productivityIndex}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Cost Optimization</span>
                <span className="font-semibold">{boardMetrics?.operationalEfficiency?.costOptimization}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Automation Level</span>
                <span className="font-semibold">{boardMetrics?.operationalEfficiency?.processAutomation}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Strategic Initiatives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strategicInitiatives.map((initiative) => (
              <div key={initiative.id} className="border border-[var(--border-color)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[var(--text-primary)]">{initiative.title}</h4>
                  <Badge variant={initiative.status === 'on-track' ? 'success' : initiative.status === 'at-risk' ? 'warning' : 'info'}>
                    {initiative.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Progress:</span>
                    <span className="ml-2 font-medium">{initiative.progress}%</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Owner:</span>
                    <span className="ml-2 font-medium">{initiative.owner}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Impact:</span>
                    <span className="ml-2 font-medium">{initiative.impact}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Deadline:</span>
                    <span className="ml-2 font-medium">{initiative.deadline}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                    <div 
                      className="bg-[var(--brand-cyan)] h-2 rounded-full" 
                      style={{ width: `${initiative.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Intelligence Panel */}
      <Card className="bg-gradient-to-br from-[var(--brand-gold-soft)] via-[var(--bg-card)] to-[var(--brand-cyan-soft)] border border-[var(--brand-gold-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--brand-gold)]" />
            AI Board Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-gold)]" />
                Key Insights
              </h4>
              <div className="space-y-2">
                {aiInsights?.insights?.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{insight}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">AI insights loading...</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--brand-cyan)]" />
                Predictions & Recommendations
              </h4>
              <div className="space-y-2">
                {aiPredictions?.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-[var(--brand-cyan)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{rec}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">AI predictions loading...</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}

    </div>
  );
}
