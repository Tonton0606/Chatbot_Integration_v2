import { useState, useEffect } from "react";
import { 
  Shield, Lock, Key, Users, Mail, Brain, Sparkles, AlertTriangle, CheckCircle, 
  Activity, Zap, Eye, TrendingUp, Clock, Globe, Smartphone, Fingerprint, ShieldCheck
} from "lucide-react";
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Progress
} from "../../components/admin/ui";
import { aiModules } from "../../services/ai";

export default function AdminSecurity() {
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [threats, setThreats] = useState([]);
  const [securityScore, setSecurityScore] = useState(92);
  const [aiInsights, setAiInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch security data
      const [metricsData, threatsData, usersData, eventsData] = await Promise.all([
        fetchSecurityMetrics(),
        fetchThreatData(),
        fetchActiveUsers(),
        fetchSecurityEvents()
      ]);

      setSecurityMetrics(metricsData);
      setThreats(threatsData);
      setActiveUsers(usersData);
      setSecurityEvents(eventsData);
      
      // Generate AI insights
      const insights = await aiModules.analyzeSecurityMetrics({
        metrics: metricsData,
        threats: threatsData,
        users: usersData,
        events: eventsData
      });
      setAiInsights(insights);
      
      // Calculate security score
      calculateSecurityScore(metricsData, threatsData);

    } catch (error) {
      console.error('Error fetching security data:', error);
      // Use mock data for demo
      const mockMetrics = generateMockMetrics();
      setSecurityMetrics(mockMetrics);
      setThreats(generateMockThreats());
      setActiveUsers(generateMockUsers());
      setSecurityEvents(generateMockEvents());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockMetrics = () => ({
    emailVerified: 100,
    activeSessions: 8,
    apiKeys: 3,
    twoFactorEnabled: 75,
    passwordStrength: 92,
    failedLogins: 2,
    suspiciousIPs: 1,
    dataBreaches: 0,
    encryptionStatus: 'active',
    lastSecurityScan: '2024-01-15T14:30:00Z',
    vulnerabilities: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 7
    }
  });

  const generateMockThreats = () => [
    {
      id: 1,
      type: 'suspicious_login',
      severity: 'medium',
      description: 'Multiple failed login attempts from unknown IP',
      source: '185.220.101.182',
      timestamp: '2024-01-15T15:45:00Z',
      status: 'investigating'
    },
    {
      id: 2,
      type: 'unusual_access',
      severity: 'low',
      description: 'Access from unusual geographic location',
      source: 'admin@hermes.com',
      timestamp: '2024-01-15T12:20:00Z',
      status: 'monitored'
    }
  ];

  const generateMockUsers = () => [
    { email: 'admin@hermes.com', role: 'admin', lastLogin: '2024-01-15T16:30:00Z', status: 'active', riskScore: 5 },
    { email: 'john@hermes.com', role: 'user', lastLogin: '2024-01-15T14:15:00Z', status: 'active', riskScore: 12 },
    { email: 'sarah@hermes.com', role: 'user', lastLogin: '2024-01-15T11:45:00Z', status: 'active', riskScore: 8 }
  ];

  const generateMockEvents = () => [
    { type: 'password_change', user: 'admin@hermes.com', timestamp: '2024-01-15T10:30:00Z', severity: 'info' },
    { type: 'failed_login', user: 'unknown', timestamp: '2024-01-15T15:45:00Z', severity: 'warning' },
    { type: 'api_key_created', user: 'john@hermes.com', timestamp: '2024-01-15T13:20:00Z', severity: 'info' }
  ];

  const fetchSecurityMetrics = async () => generateMockMetrics();
  const fetchThreatData = async () => generateMockThreats();
  const fetchActiveUsers = async () => generateMockUsers();
  const fetchSecurityEvents = async () => generateMockEvents();

  const calculateSecurityScore = (metrics, threats) => {
    let score = 100;
    
    // Deduct points for threats
    threats.forEach(threat => {
      switch (threat.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });
    
    // Deduct points for vulnerabilities
    if (metrics?.vulnerabilities) {
      score -= metrics.vulnerabilities.critical * 15;
      score -= metrics.vulnerabilities.high * 10;
      score -= metrics.vulnerabilities.medium * 5;
      score -= metrics.vulnerabilities.low * 2;
    }
    
    // Deduct points for failed logins
    score -= (metrics?.failedLogins || 0) * 3;
    
    setSecurityScore(Math.max(0, score));
  };

  const runSecurityScan = async () => {
    try {
      setIsScanning(true);
      const scanResults = await aiModules.performSecurityScan({
        currentMetrics: securityMetrics,
        activeUsers: activeUsers,
        recentEvents: securityEvents
      });
      
      // Update threats and metrics
      setThreats(prev => [...scanResults.newThreats, ...prev]);
      setSecurityMetrics(prev => ({
        ...prev,
        ...scanResults.updatedMetrics,
        lastSecurityScan: new Date().toISOString()
      }));
      
      // Recalculate security score
      calculateSecurityScore(
        { ...securityMetrics, ...scanResults.updatedMetrics },
        [...scanResults.newThreats, ...threats]
      );

    } catch (error) {
      console.error('Error running security scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const getSecurityLevelColor = (score) => {
    if (score >= 90) return 'text-[var(--success)]';
    if (score >= 70) return 'text-[var(--brand-gold)]';
    return 'text-[var(--danger)]';
  };

  const getSecurityLevelText = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-[var(--danger-soft)] text-[var(--danger)]',
      high: 'bg-[var(--danger-soft)] text-[var(--danger)]',
      medium: 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]',
      low: 'bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]'
    };
    return colors[severity] || 'bg-[var(--hover-bg)]';
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
      {/* Security Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI-Powered Security</h1>
          <p className="text-[var(--text-secondary)]">Advanced security monitoring with AI threat detection</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Eye}>
            View Security Report
          </Button>
          <Button 
            icon={Brain} 
            onClick={runSecurityScan}
            disabled={isScanning}
          >
            {isScanning ? 'Scanning...' : 'Run AI Security Scan'}
          </Button>
        </div>
      </div>

      {/* Security Score Overview */}
      <Card className="bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--success-soft)] border border-[var(--brand-cyan-border)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[var(--brand-cyan-soft)] rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[var(--brand-cyan)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Security Score</h3>
                <p className={`text-3xl font-bold ${getSecurityLevelColor(securityScore)}`}>
                  {securityScore}%
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {getSecurityLevelText(securityScore)} Security Posture
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-secondary)]">Last Scan</p>
              <p className="text-sm font-medium">
                {securityMetrics?.lastSecurityScan ? 
                  new Date(securityMetrics.lastSecurityScan).toLocaleString() : 
                  'Never'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Email Verified</p>
                <p className="text-2xl font-bold text-[var(--success)]">{securityMetrics?.emailVerified || 0}%</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  All users verified
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--success-soft)] rounded-2xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-[var(--success)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Active Sessions</p>
                <p className="text-2xl font-bold text-[var(--brand-cyan)]">{securityMetrics?.activeSessions || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  Currently active
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-cyan-soft)] rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[var(--brand-cyan)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">2FA Enabled</p>
                <p className="text-2xl font-bold text-[var(--brand-gold)]">{securityMetrics?.twoFactorEnabled || 0}%</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  Users with 2FA
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-gold-soft)] rounded-2xl flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-[var(--brand-gold)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Failed Logins</p>
                <p className="text-2xl font-bold text-[var(--danger)]">{securityMetrics?.failedLogins || 0}</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  Last 24 hours
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--danger-soft)] rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--danger)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Threat Detection */}
      {threats.length > 0 && (
        <Card className="bg-[var(--bg-card)] border border-[var(--danger)]/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--danger)]" />
              AI-Detected Security Threats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {threats.slice(0, 3).map(threat => (
                <div key={threat.id} className="border border-[var(--danger)]/20 bg-[var(--danger-soft)] rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">{threat.type.replace(/_/g, ' ').toUpperCase()}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{threat.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity}
                      </Badge>
                      <Badge variant="outline">
                        {threat.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Source:</span>
                      <span className="ml-2 font-medium">{threat.source}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Time:</span>
                      <span className="ml-2 font-medium">{new Date(threat.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Action:</span>
                      <span className="ml-2 font-medium text-[var(--brand-cyan)] cursor-pointer">Investigate</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authentication Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--brand-cyan)]" />
              Authentication Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Email Verification</span>
                <div className="flex items-center gap-2">
                  <Progress value={securityMetrics?.emailVerified || 0} className="w-20" />
                  <span className="text-sm font-medium">{securityMetrics?.emailVerified || 0}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Password Strength</span>
                <div className="flex items-center gap-2">
                  <Progress value={securityMetrics?.passwordStrength || 0} className="w-20" />
                  <span className="text-sm font-medium">{securityMetrics?.passwordStrength || 0}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">2FA Enabled</span>
                <div className="flex items-center gap-2">
                  <Progress value={securityMetrics?.twoFactorEnabled || 0} className="w-20" />
                  <span className="text-sm font-medium">{securityMetrics?.twoFactorEnabled || 0}%</span>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Session Timeout</span>
                <span className="text-sm font-medium">30 minutes</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Encryption Status</span>
                <Badge className="bg-[var(--success-soft)] text-[var(--success)]">
                  {securityMetrics?.encryptionStatus || 'Active'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--brand-gold)]" />
              Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Admin Users</span>
                <span className="text-sm font-medium">{activeUsers.filter(u => u.role === 'admin').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Client Users</span>
                <span className="text-sm font-medium">{activeUsers.filter(u => u.role === 'user').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">API Keys</span>
                <span className="text-sm font-medium">{securityMetrics?.apiKeys || 0}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Role-Based Access</span>
                <Badge className="bg-[var(--success-soft)] text-[var(--success)]">Active</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Suspicious IPs</span>
                <span className="text-sm font-medium text-[var(--danger)]">{securityMetrics?.suspiciousIPs || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Security Intelligence */}
      <Card className="bg-gradient-to-br from-[var(--brand-cyan-soft)] via-[var(--bg-card)] to-[var(--success-soft)] border border-[var(--brand-cyan-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--brand-cyan)]" />
            AI Security Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-cyan)]" />
                Security Insights
              </h4>
              <div className="space-y-2">
                {aiInsights?.insights?.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{insight}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">Analyzing security patterns...</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                Risk Assessment
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-[var(--bg-card)] rounded-2xl">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Overall Risk</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{aiInsights?.riskLevel || 'Low'}</p>
                </div>
                <div className="p-3 bg-[var(--bg-card)] rounded-2xl">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Vulnerabilities</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Critical: {securityMetrics?.vulnerabilities?.critical || 0}, 
                    High: {securityMetrics?.vulnerabilities?.high || 0}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--brand-gold)]" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {aiInsights?.recommendations?.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-[var(--brand-gold)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--text-secondary)]">{rec}</p>
                  </div>
                )) || (
                  <p className="text-sm text-[var(--text-muted)]">Generating security recommendations...</p>
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
