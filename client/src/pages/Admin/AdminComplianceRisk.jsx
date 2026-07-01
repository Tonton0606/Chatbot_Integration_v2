import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { 
  AlertTriangle, Shield, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown,
  Brain, Sparkles, Download, FileText, Eye, Calendar, Users, Target,
  Activity, BarChart3, Scale, AlertCircle, Info
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";

export default function AdminComplianceRisk() {
  const [riskData, setRiskData] = useState(null);
  const [complianceScore, setComplianceScore] = useState(null);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [regulatoryUpdates, setRegulatoryUpdates] = useState([]);
  const [auditResults, setAuditResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch comprehensive compliance and risk data
      const [
        riskAssessmentsData,
        complianceData,
        auditData,
        regulatoryData
      ] = await Promise.all([
        supabase.from('risk_assessments').select('*').order('severity', { ascending: false }),
        supabase.from('compliance_checks').select('*').order('date', { ascending: false }).limit(20),
        supabase.from('audit_results').select('*').order('date', { ascending: false }).limit(10),
        supabase.from('regulatory_updates').select('*').order('date', { ascending: false }).limit(15)
      ]);

      // Calculate risk metrics
      const totalRisks = riskAssessmentsData.data?.length || 0;
      const criticalRisks = riskAssessmentsData.data?.filter(r => r.severity === 'critical').length || 0;
      const highRisks = riskAssessmentsData.data?.filter(r => r.severity === 'high').length || 0;
      const mediumRisks = riskAssessmentsData.data?.filter(r => r.severity === 'medium').length || 0;
      const lowRisks = riskAssessmentsData.data?.filter(r => r.severity === 'low').length || 0;

      // Calculate compliance score
      const complianceChecks = complianceData.data || [];
      const passedChecks = complianceChecks.filter(c => c.status === 'passed').length;
      const totalChecks = complianceChecks.length;
      const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 85;

      setRiskData({
        totalRisks,
        criticalRisks,
        highRisks,
        mediumRisks,
        lowRisks,
        riskTrend: calculateRiskTrend(riskAssessmentsData.data || []),
        openRiskItems: riskAssessmentsData.data?.filter(r => r.status === 'open').length || 0,
        mitigatedRisks: riskAssessmentsData.data?.filter(r => r.status === 'mitigated').length || 0
      });

      setComplianceScore({
        overall: score,
        dataPrivacy: calculateDomainScore(complianceChecks, 'data_privacy'),
        financial: calculateDomainScore(complianceChecks, 'financial'),
        operational: calculateDomainScore(complianceChecks, 'operational'),
        security: calculateDomainScore(complianceChecks, 'security'),
        trend: calculateComplianceTrend(complianceChecks)
      });

      setRiskAssessments(riskAssessmentsData.data || []);
      setRegulatoryUpdates(regulatoryData.data || []);
      setAuditResults(auditData.data || []);

      // Generate AI insights
      const insights = await aiModules.analyzeComplianceRisks({
        complianceData: complianceChecks,
        regulations: regulatoryData.data || [],
        riskAssessments: riskAssessmentsData.data || []
      });
      setAiInsights(insights);

    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRiskTrend = (riskData) => {
    // Simple trend calculation - in real implementation would compare with previous periods
    const recentRisks = riskData.slice(0, 10);
    const criticalCount = recentRisks.filter(r => r.severity === 'critical').length;
    return criticalCount > 2 ? 'increasing' : criticalCount > 0 ? 'stable' : 'decreasing';
  };

  const calculateDomainScore = (complianceChecks, domain) => {
    const domainChecks = complianceChecks.filter(c => c.domain === domain);
    if (domainChecks.length === 0) return 85;
    const passed = domainChecks.filter(c => c.status === 'passed').length;
    return (passed / domainChecks.length) * 100;
  };

  const calculateComplianceTrend = (complianceChecks) => {
    const recentChecks = complianceChecks.slice(0, 10);
    const passedCount = recentChecks.filter(c => c.status === 'passed').length;
    return passedCount >= 8 ? 'improving' : passedCount >= 6 ? 'stable' : 'declining';
  };

  const getRiskColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-[var(--danger)] bg-[var(--danger-soft)]';
      case 'high': return 'text-[var(--accent-gold)] bg-[var(--brand-gold-soft)]';
      case 'medium': return 'text-[var(--brand-gold)] bg-[var(--brand-gold-soft)]';
      case 'low': return 'text-[var(--success)] bg-[var(--success-soft)]';
      default: return 'text-[var(--text-secondary)] bg-[var(--hover-bg)]';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-[var(--danger)]" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-[var(--success)]" />;
      case 'improving': return <TrendingUp className="w-4 h-4 text-[var(--success)]" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-[var(--danger)]" />;
      default: return <Activity className="w-4 h-4 text-[var(--brand-cyan)]" />;
    }
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
      {/* Compliance & Risk Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Compliance & Risk Management</h1>
          <p className="text-[var(--text-secondary)]">Regulatory compliance monitoring and risk assessment</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download}>
            Export Compliance Report
          </Button>
          <Button icon={Shield}>
            Run Compliance Audit
          </Button>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Risks</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{riskData?.totalRisks || 0}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(riskData?.riskTrend)}
                  <span className="text-sm text-[var(--text-muted)] capitalize">{riskData?.riskTrend}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--danger-soft)] rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--danger)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Critical Risks</p>
                <p className="text-2xl font-bold text-[var(--danger)]">{riskData?.criticalRisks || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">Immediate action</p>
              </div>
              <div className="w-12 h-12 bg-[var(--danger-soft)] rounded-2xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-[var(--danger)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">High Risks</p>
                <p className="text-2xl font-bold text-[var(--brand-gold)]">{riskData?.highRisks || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">Monitor closely</p>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-gold-soft)] rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[var(--brand-gold)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Open Items</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{riskData?.openRiskItems || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">Pending action</p>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-cyan-soft)] rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--brand-cyan)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Compliance Score</p>
                <p className="text-2xl font-bold text-[var(--success)]">{complianceScore?.overall?.toFixed(0) || 0}%</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(complianceScore?.trend)}
                  <span className="text-sm text-[var(--text-muted)] capitalize">{complianceScore?.trend}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-[var(--success-soft)] rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-[var(--success)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Compliance by Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Data Privacy</span>
                <span className="text-sm font-semibold">{complianceScore?.dataPrivacy?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                <div 
                  className="bg-[var(--brand-cyan)] h-2 rounded-full" 
                  style={{ width: `${complianceScore?.dataPrivacy || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Financial</span>
                <span className="text-sm font-semibold">{complianceScore?.financial?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                <div 
                  className="bg-[var(--success)] h-2 rounded-full" 
                  style={{ width: `${complianceScore?.financial || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Operational</span>
                <span className="text-sm font-semibold">{complianceScore?.operational?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                <div 
                  className="bg-[var(--brand-gold)] h-2 rounded-full" 
                  style={{ width: `${complianceScore?.operational || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Security</span>
                <span className="text-sm font-semibold">{complianceScore?.security?.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                <div 
                  className="bg-[var(--danger)] h-2 rounded-full" 
                  style={{ width: `${complianceScore?.security || 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Risk Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskAssessments.slice(0, 5).map((risk) => (
              <div key={risk.id} className="border border-[var(--border-color)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[var(--text-primary)]">{risk.title}</h4>
                  <Badge className={getRiskColor(risk.severity)}>
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">{risk.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Category:</span>
                    <span className="ml-2 font-medium">{risk.category || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Owner:</span>
                    <span className="ml-2 font-medium">{risk.owner || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Status:</span>
                    <span className="ml-2 font-medium capitalize">{risk.status || 'open'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Deadline:</span>
                    <span className="ml-2 font-medium">{risk.deadline || 'Not set'}</span>
                  </div>
                </div>
                {risk.mitigation && (
                  <div className="mt-3 p-3 bg-[var(--brand-cyan-soft)] rounded-2xl">
                    <p className="text-sm text-[var(--brand-cyan)]">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Regulatory Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regulatoryUpdates.slice(0, 4).map((update) => (
                <div key={update.id} className="flex items-start gap-3 p-3 border border-[var(--border-color)] rounded-2xl">
                  <div className="w-8 h-8 bg-[var(--brand-cyan-soft)] rounded-full flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-[var(--brand-cyan)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-primary)] text-sm">{update.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{update.description}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {new Date(update.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Recent Audit Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditResults.slice(0, 4).map((audit) => (
                <div key={audit.id} className="flex items-start gap-3 p-3 border border-[var(--border-color)] rounded-2xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    audit.status === 'passed' ? 'bg-[var(--success-soft)]' : audit.status === 'failed' ? 'bg-[var(--danger-soft)]' : 'bg-[var(--brand-gold-soft)]'
                  }`}>
                    {audit.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    ) : audit.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-[var(--danger)]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[var(--brand-gold)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-primary)] text-sm">{audit.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{audit.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={audit.status === 'passed' ? 'success' : audit.status === 'failed' ? 'error' : 'warning'} className="text-xs">
                        {audit.status}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(audit.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Compliance Intelligence */}
      <Card className="bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--success-soft)] border border-[var(--brand-cyan-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--brand-cyan)]" />
            AI Compliance Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-cyan)]" />
                Risk Assessment Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Overall Risk Level</span>
                  <Badge variant={aiInsights?.riskSummary?.overallRiskLevel === 'high' ? 'error' : 
                                 aiInsights?.riskSummary?.overallRiskLevel === 'medium' ? 'warning' : 'success'}>
                    {aiInsights?.riskSummary?.overallRiskLevel || 'Medium'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Compliance Score</span>
                  <span className="font-semibold">{aiInsights?.riskSummary?.complianceScore || 85}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Critical Items</span>
                  <span className="font-semibold text-[var(--danger)]">{aiInsights?.riskSummary?.criticalRisks || 0}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--success)]" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {aiInsights?.recommendations?.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{rec}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">AI recommendations loading...</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Compliance Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiInsights?.upcomingDeadlines?.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-2xl">
                <div>
                  <h4 className="font-medium text-[var(--text-primary)]">{deadline.requirement}</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Due: {deadline.deadline}</p>
                </div>
                <Badge variant={deadline.status === 'on-track' ? 'success' : 
                               deadline.status === 'at-risk' ? 'warning' : 'error'}>
                  {deadline.status}
                </Badge>
              </div>
            )) || (
              <p className="text-sm text-[var(--text-muted)]">No upcoming deadlines</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}

    </div>
  );
}
