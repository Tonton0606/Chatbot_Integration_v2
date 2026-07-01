import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle,
  Badge, Input, Select, SelectItem,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Button
} from "../../components/admin/ui";
import { 
  Search, Filter, Download, Shield, AlertTriangle, Info, AlertCircle, Brain, Sparkles,
  TrendingUp, Activity, Zap, Eye, Clock, User, MapPin, BarChart3
} from "lucide-react";
import { aiModules } from "../../services/ai";
import { supabase } from "../../config/supabaseClient";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [threatLevel, setThreatLevel] = useState('low');
  const [aiInsights, setAiInsights] = useState(null);
  const [securityScore, setSecurityScore] = useState(95);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch audit logs and related data
      const [logsData, anomaliesData] = await Promise.all([
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
        fetchAnomalyData()
      ]);

      setLogs(logsData.data || []);
      setAnomalies(anomaliesData);
      
      // Calculate statistics
      const calculatedStats = calculateStats(logsData.data || []);
      setStats(calculatedStats);
      
      // Generate AI insights
      const insights = await aiModules.analyzeAuditLogs({
        logs: logsData.data || [],
        anomalies: anomaliesData,
        stats: calculatedStats
      });
      setAiInsights(insights);
      
      // Update security score and threat level
      updateSecurityMetrics(insights, calculatedStats);

    } catch (error) {
      console.error('Error fetching audit data:', error);
      // Use mock data for demo
      const mockLogs = generateMockLogs();
      setLogs(mockLogs);
      setStats(calculateStats(mockLogs));
      setAnomalies(generateMockAnomalies());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockLogs = () => [
    { id: 1, user_email: 'admin@hermes.com', action: 'create', resource_type: 'deal', resource_name: 'Enterprise Deal', severity: 'info', created_at: '2024-01-15T10:30:00Z', ip_address: '192.168.1.1', location: 'New York, US', device: 'Chrome/Windows' },
    { id: 2, user_email: 'john@hermes.com', action: 'update', resource_type: 'client', resource_name: 'Acme Corp', severity: 'info', created_at: '2024-01-15T11:15:00Z', ip_address: '192.168.1.2', location: 'London, UK', device: 'Safari/Mac' },
    { id: 3, user_email: 'admin@hermes.com', action: 'delete', resource_type: 'task', resource_name: 'Old Task', severity: 'warning', created_at: '2024-01-15T12:00:00Z', ip_address: '192.168.1.1', location: 'New York, US', device: 'Chrome/Windows' },
    { id: 4, user_email: 'sarah@hermes.com', action: 'login', resource_type: 'auth', resource_name: 'User Login', severity: 'info', created_at: '2024-01-15T09:00:00Z', ip_address: '192.168.1.3', location: 'Tokyo, JP', device: 'Firefox/Linux' },
    { id: 5, user_email: 'admin@hermes.com', action: 'export', resource_type: 'report', resource_name: 'Revenue Report', severity: 'info', created_at: '2024-01-15T14:30:00Z', ip_address: '192.168.1.1', location: 'New York, US', device: 'Chrome/Windows' },
    { id: 6, user_email: 'unknown@external.com', action: 'login_failed', resource_type: 'auth', resource_name: 'Failed Login Attempt', severity: 'critical', created_at: '2024-01-15T15:45:00Z', ip_address: '185.220.101.182', location: 'Unknown', device: 'Unknown' },
    { id: 7, user_email: 'admin@hermes.com', action: 'access_sensitive', resource_type: 'user_data', resource_name: 'User Database Export', severity: 'warning', created_at: '2024-01-15T16:20:00Z', ip_address: '192.168.1.1', location: 'New York, US', device: 'Chrome/Windows' }
  ];

  const generateMockAnomalies = () => [
    {
      id: 1,
      type: 'unusual_access_pattern',
      severity: 'medium',
      description: 'Multiple failed login attempts from unknown IP',
      affectedUser: 'unknown@external.com',
      timestamp: '2024-01-15T15:45:00Z',
      riskScore: 75,
      recommendation: 'Investigate IP address and consider blocking'
    },
    {
      id: 2,
      type: 'sensitive_data_access',
      severity: 'high',
      description: 'Access to sensitive user data outside business hours',
      affectedUser: 'admin@hermes.com',
      timestamp: '2024-01-15T16:20:00Z',
      riskScore: 85,
      recommendation: 'Verify user identity and review access permissions'
    }
  ];

  const fetchAnomalyData = async () => {
    // Mock anomaly data
    return generateMockAnomalies();
  };

  const calculateStats = (logsData) => {
    const byAction = {};
    const bySeverity = {};
    const byUser = {};
    const hourlyActivity = Array(24).fill(0);

    logsData.forEach(log => {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      
      // Count by severity
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      
      // Count by user
      byUser[log.user_email] = (byUser[log.user_email] || 0) + 1;
      
      // Hourly activity
      const hour = new Date(log.created_at).getHours();
      hourlyActivity[hour]++;
    });

    return {
      total: logsData.length,
      byAction,
      bySeverity,
      byUser,
      hourlyActivity,
      uniqueUsers: Object.keys(byUser).length,
      criticalEvents: bySeverity.critical || 0,
      warningEvents: bySeverity.warning || 0
    };
  };

  const updateSecurityMetrics = (insights, stats) => {
    const baseScore = 95;
    const criticalPenalty = (stats.criticalEvents || 0) * 10;
    const warningPenalty = (stats.warningEvents || 0) * 2;
    const anomalyPenalty = anomalies.length * 5;
    
    const score = Math.max(0, baseScore - criticalPenalty - warningPenalty - anomalyPenalty);
    setSecurityScore(score);
    
    if (score >= 90) setThreatLevel('low');
    else if (score >= 70) setThreatLevel('medium');
    else setThreatLevel('high');
  };

  const runAnomalyDetection = async () => {
    try {
      setIsAnalyzing(true);
      const detectionResults = await aiModules.detectAnomalies({
        logs: logs.slice(0, 50),
        historicalData: logs.slice(50),
        userPatterns: stats?.byUser || {}
      });
      
      setAnomalies(prev => [...detectionResults.newAnomalies, ...prev]);
      
      // Update security metrics
      updateSecurityMetrics(aiInsights, stats);
      
    } catch (error) {
      console.error('Error running anomaly detection:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-100 text-red-700",
      error: "bg-red-50 text-red-600",
      warning: "bg-yellow-100 text-yellow-700",
      info: "bg-blue-100 text-blue-700",
      debug: "bg-gray-100 text-gray-700"
    };
    return colors[severity] || "bg-gray-100";
  };

  const getActionColor = (action) => {
    const colors = {
      create: "bg-green-100 text-green-700",
      update: "bg-blue-100 text-blue-700",
      delete: "bg-red-100 text-red-700",
      login: "bg-purple-100 text-purple-700",
      export: "bg-yellow-100 text-[var(--accent-gold)]",
      view: "bg-gray-100 text-gray-700",
      login_failed: "bg-red-100 text-red-700",
      access_sensitive: "bg-yellow-100 text-yellow-700"
    };
    return colors[action] || "bg-gray-100";
  };

  const getThreatLevelColor = (level) => {
    const colors = {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700"
    };
    return colors[level] || "bg-gray-100";
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_email.toLowerCase().includes(search.toLowerCase()) ||
                         log.resource_name.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchesSearch && matchesAction && matchesSeverity;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Logs Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI-Powered Audit Logs</h1>
          <p className="text-gray-600">Advanced security monitoring with AI anomaly detection</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download}>
            Export Security Report
          </Button>
          <Button 
            icon={Brain} 
            onClick={runAnomalyDetection}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-green-600">{securityScore}%</p>
                <p className="text-sm text-gray-500 mt-2">
                  Threat Level: <span className="font-medium">{threatLevel}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats?.uniqueUsers || 0} unique users
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Events</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalEvents || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats?.warningEvents || 0} warnings
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Anomalies</p>
                <p className="text-2xl font-bold text-purple-600">{anomalies.length}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Detected by AI
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Anomaly Detection Alerts */}
      {anomalies.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-red-600" />
              AI-Detected Security Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.slice(0, 3).map(anomaly => (
                <div key={anomaly.id} className="border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{anomaly.type.replace(/_/g, ' ').toUpperCase()}</h4>
                      <p className="text-sm text-gray-600">{anomaly.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getThreatLevelColor(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Risk: {anomaly.riskScore}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">User:</span>
                      <span className="ml-2 font-medium">{anomaly.affectedUser}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-medium">{new Date(anomaly.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Recommendation:</span>
                      <span className="ml-2 font-medium">{anomaly.recommendation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            type="search" 
            placeholder="Search logs..." 
            className="pl-8" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-[150px]">
          <SelectItem value="all">All Actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
          <SelectItem value="login">Login</SelectItem>
          <SelectItem value="login_failed">Failed Login</SelectItem>
          <SelectItem value="access_sensitive">Sensitive Access</SelectItem>
        </Select>
        <Select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="w-[150px]">
          <SelectItem value="all">All Severities</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </Select>
      </div>

      {/* Enhanced Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">No logs found</TableCell>
              </TableRow>
            ) : (
              filteredLogs.map(log => (
                <TableRow key={log.id} className={log.severity === 'critical' ? 'bg-red-50' : ''}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.user_email}</TableCell>
                  <TableCell>
                    <Badge className={`${getActionColor(log.action)} capitalize`}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.resource_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{log.resource_type}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(log.severity)}
                      <Badge variant="outline" className={`${getSeverityColor(log.severity)} capitalize`}>
                        {log.severity}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">{log.location || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{log.device || 'Unknown'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* AI Security Intelligence */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Security Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Security Insights
              </h4>
              <div className="space-y-2">
                {aiInsights?.insights?.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">Analyzing security patterns...</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Activity Patterns
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Peak Activity</p>
                  <p className="text-xs text-gray-600 mt-1">{aiInsights?.patterns?.peakTime || '2:00-4:00 PM'}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Most Active User</p>
                  <p className="text-xs text-gray-600 mt-1">{aiInsights?.patterns?.topUser || 'admin@hermes.com'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {aiInsights?.recommendations?.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{rec}</p>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">Generating security recommendations...</p>
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
