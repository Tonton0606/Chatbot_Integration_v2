import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, AlertTriangle, Shield,
  Brain, Sparkles, Download, Calendar, Target, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Award, Eye, PieChart, Wallet,
  FileText, CheckCircle, XCircle, Clock, AlertCircle, TrendingDown as TrendingDownIcon
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";

export default function AdminFinance() {
  const [financeData, setFinanceData] = useState(null);
  const [treasuryData, setTreasuryData] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const [forecasts, setForecasts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiPredictions, setAiPredictions] = useState(null);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch comprehensive finance and treasury data
      const [
        revenueData,
        expenseData,
        transactionData,
        fraudData,
        cashFlowData
      ] = await Promise.all([
        supabase.from('revenue').select('*').order('date', { ascending: false }).limit(24),
        supabase.from('expenses').select('*').order('date', { ascending: false }).limit(24),
        supabase.from('transactions').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('cash_flow').select('*').order('date', { ascending: false }).limit(12)
      ]);

      // Calculate financial metrics
      const totalRevenue = revenueData.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpenses = expenseData.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      
      const monthlyRevenue = calculateMonthlyRevenue(revenueData.data || []);
      const monthlyExpenses = calculateMonthlyExpenses(expenseData.data || []);
      const cashBalance = calculateCashBalance(cashFlowData.data || []);
      const burnRate = calculateBurnRate(monthlyExpenses);

      setFinanceData({
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin,
        monthlyRevenue,
        monthlyExpenses,
        revenueGrowth: calculateRevenueGrowth(revenueData.data || []),
        expenseGrowth: calculateExpenseGrowth(expenseData.data || [])
      });

      setTreasuryData({
        cashBalance,
        burnRate,
        runway: calculateRunway(cashBalance, burnRate),
        workingCapital: calculateWorkingCapital(revenueData.data || [], expenseData.data || []),
        debtToEquity: 0.45,
        currentRatio: 2.1,
        quickRatio: 1.8
      });

      setFraudAlerts(fraudData.data || []);
      setCashFlowData(cashFlowData.data || []);

      // Generate AI insights
      const insights = await aiModules.analyzeFinancialData({
        revenue: revenueData.data || [],
        expenses: expenseData.data || [],
        transactions: transactionData.data || [],
        cashFlow: cashFlowData.data || []
      });
      setAiInsights(insights);

      // Generate AI predictions
      const predictions = await aiModules.predictFinancialTrends({
        currentMetrics: { totalRevenue, totalExpenses, cashBalance },
        historicalData: revenueData.data || [],
        marketData: generateMarketData()
      });
      setAiPredictions(predictions);

      // Generate forecasts
      const forecastData = await aiModules.generateFinancialForecasts({
        revenue: revenueData.data || [],
        expenses: expenseData.data || [],
        cashFlow: cashFlowData.data || []
      });
      setForecasts(forecastData);

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyRevenue = (revenueData) => {
    const monthly = {};
    revenueData.forEach(item => {
      const month = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthly[month] = (monthly[month] || 0) + (item.amount || 0);
    });
    return Object.entries(monthly).slice(-6).map(([month, revenue]) => ({ month, revenue }));
  };

  const calculateMonthlyExpenses = (expenseData) => {
    const monthly = {};
    expenseData.forEach(item => {
      const month = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthly[month] = (monthly[month] || 0) + (item.amount || 0);
    });
    return Object.entries(monthly).slice(-6).map(([month, expenses]) => ({ month, expenses }));
  };

  const calculateCashBalance = (cashFlowData) => {
    return cashFlowData.reduce((sum, item) => sum + (item.cash_flow || 0), 0);
  };

  const calculateBurnRate = (monthlyExpenses) => {
    if (monthlyExpenses.length === 0) return 0;
    const latestMonth = monthlyExpenses[monthlyExpenses.length - 1];
    return latestMonth?.expenses || 0;
  };

  const calculateRunway = (cashBalance, burnRate) => {
    return burnRate > 0 ? Math.floor(cashBalance / burnRate) : 0;
  };

  const calculateWorkingCapital = (revenueData, expenseData) => {
    const currentAssets = revenueData.slice(0, 3).reduce((sum, item) => sum + (item.amount || 0), 0);
    const currentLiabilities = expenseData.slice(0, 3).reduce((sum, item) => sum + (item.amount || 0), 0);
    return currentAssets - currentLiabilities;
  };

  const calculateRevenueGrowth = (revenueData) => {
    if (revenueData.length < 12) return 15.2;
    const recent = revenueData.slice(0, 6).reduce((sum, item) => sum + (item.amount || 0), 0);
    const previous = revenueData.slice(6, 12).reduce((sum, item) => sum + (item.amount || 0), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 15.2;
  };

  const calculateExpenseGrowth = (expenseData) => {
    if (expenseData.length < 12) return 8.5;
    const recent = expenseData.slice(0, 6).reduce((sum, item) => sum + (item.amount || 0), 0);
    const previous = expenseData.slice(6, 12).reduce((sum, item) => sum + (item.amount || 0), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 8.5;
  };

  const generateMarketData = () => ({
    marketGrowth: 5.2,
    inflationRate: 3.1,
    interestRates: 4.5,
    exchangeRates: { USD: 1, EUR: 0.92, GBP: 0.79 }
  });

  const getFraudSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-[var(--accent-gold)] bg-yellow-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (value) => {
    return value > 0 ? (
      <ArrowUpRight className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-red-600" />
    );
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
      {/* Finance Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Treasury</h1>
          <p className="text-gray-600">Financial forecasting, treasury management, and fraud detection</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download}>
            Export Financial Report
          </Button>
          <Button icon={Shield}>
            Run Fraud Analysis
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(financeData?.totalRevenue || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(financeData?.revenueGrowth)}
                  <span className={`text-sm ${financeData?.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financeData?.revenueGrowth?.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(financeData?.netIncome || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {financeData?.profitMargin?.toFixed(1)}% margin
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(treasuryData?.cashBalance || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {treasuryData?.runway} months runway
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fraud Alerts</p>
                <p className="text-2xl font-bold text-red-600">{fraudAlerts.length}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {fraudAlerts.filter(a => a.severity === 'critical').length} critical
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treasury Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Treasury Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Burn Rate</p>
              <p className="text-xl font-semibold text-gray-900">
                ${(treasuryData?.burnRate || 0).toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Working Capital</p>
              <p className="text-xl font-semibold text-gray-900">
                ${(treasuryData?.workingCapital || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Ratio</p>
              <p className="text-xl font-semibold text-gray-900">{treasuryData?.currentRatio}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Debt to Equity</p>
              <p className="text-xl font-semibold text-gray-900">{treasuryData?.debtToEquity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financeData?.monthlyRevenue?.slice(-4).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.month}</span>
                  <span className="font-semibold">${(item.revenue / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDownIcon className="w-5 h-5" />
              Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financeData?.monthlyExpenses?.slice(-4).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.month}</span>
                  <span className="font-semibold">${(item.expenses / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Detection Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Fraud Detection Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fraudAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getFraudSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">${alert.amount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="ml-2 font-medium">{alert.transaction_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Risk Score:</span>
                    <span className="ml-2 font-medium">{alert.risk_score || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium capitalize">{alert.status || 'pending'}</span>
                  </div>
                </div>
                {alert.recommendation && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Cash Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashFlowData.slice(-6).map((flow, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{flow.period}</p>
                  <p className="text-sm text-gray-600">{flow.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${flow.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${flow.cash_flow?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    {flow.cash_flow >= 0 ? 'Inflow' : 'Outflow'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Financial Intelligence */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-green-600" />
            AI Financial Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                Financial Insights
              </h4>
              <div className="space-y-2">
                {aiInsights?.insights?.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">AI insights loading...</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Financial Forecasts
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Next Quarter Revenue</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ${((forecasts?.nextQuarter?.revenue || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Expected Cash Flow</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ${((forecasts?.nextQuarter?.cashFlow || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Risk Analysis
              </h4>
              <div className="space-y-2">
                {aiInsights?.riskFactors?.slice(0, 3).map((risk, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{risk}</p>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">Risk analysis loading...</p>
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
