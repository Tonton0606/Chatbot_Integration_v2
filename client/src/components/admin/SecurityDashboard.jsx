import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from './ui';
import { Shield, AlertTriangle, CheckCircle, Eye, Lock, Database, Activity, Settings, Brain } from 'lucide-react';
import { aiModules } from '../../services/ai';

export default function SecurityDashboard() {
  const [securityStatus, setSecurityStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sensitivityReport, setSensitivityReport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load security status
      const health = await aiModules.healthCheck();
      setSecurityStatus(health);

      // Load audit logs
      const logs = await aiModules.getSecurityAuditLogs(20);
      setAuditLogs(logs);

      // Generate sensitivity report
      const report = await generateSensitivityReport();
      setSensitivityReport(report);
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const generateSensitivityReport = async () => {
    // Mock data for sensitivity analysis
    const testData = {
      recentOperations: [
        { module: 'deals', operation: 'analysis', dataPoints: 150 },
        { module: 'contacts', operation: 'analysis', dataPoints: 200 },
        { module: 'revenue', operation: 'forecasting', dataPoints: 50 }
      ],
      sensitiveFields: ['email', 'phone', 'clientName', 'financialData'],
      dataClassifications: {
        high: 25,    // Contains PII or client data
        medium: 45,  // Business data requiring masking
        low: 130     // Internal operational data
      }
    };

    return await aiModules.getDataSensitivityReport(testData, {
      module: 'security',
      operation: 'compliance-check'
    });
  };

  const runSecurityScan = async () => {
    setIsScanning(true);
    try {
      const scanResults = await performSecurityScan();
      setSecurityStatus(prev => ({
        ...prev,
        lastScan: scanResults,
        scanTime: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const performSecurityScan = async () => {
    // Simulate security scan results
    return {
      vulnerabilities: [
        {
          id: 1,
          severity: 'medium',
          category: 'data-exposure',
          description: 'Potential client data exposure in external AI calls',
          recommendation: 'Enable strict data protection mode',
          affectedModules: ['deals', 'contacts']
        },
        {
          id: 2,
          severity: 'low',
          category: 'audit-trail',
          description: 'Incomplete audit logging for some operations',
          recommendation: 'Review audit configuration',
          affectedModules: ['reports']
        }
      ],
      complianceScore: 85,
      threatsBlocked: 12,
      dataProtection: 'enabled'
    };
  };

  const clearAuditLogs = async () => {
    try {
      await aiModules.clearSecurityAuditLogs();
      setAuditLogs([]);
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/20',
      high: 'text-[var(--accent-gold)] bg-[var(--brand-gold-soft)] border-[var(--brand-gold-border)]',
      medium: 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]',
      low: 'bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]'
    };
    return colors[severity] || 'bg-[var(--hover-bg)] text-[var(--text-secondary)]';
  };

  const getOverallStatus = () => {
    if (!securityStatus) return 'checking';
    if (securityStatus.overall === 'healthy') return 'secure';
    if (securityStatus.overall === 'degraded') return 'warning';
    return 'error';
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    const colors = {
      secure: 'text-[var(--success)]',
      warning: 'text-[var(--brand-gold)]',
      error: 'text-[var(--danger)]',
      checking: 'text-[var(--brand-cyan)]'
    };
    return colors[status] || 'text-[var(--text-secondary)]';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Security Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Monitor and manage AI data protection and compliance</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={runSecurityScan}
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Security Scan
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadSecurityData}>
            <Settings className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Status */}
      <Card className={`border-2 ${getOverallStatus() === 'secure' ? 'border-[var(--success)]/20 bg-[var(--success-soft)]' : getOverallStatus() === 'warning' ? 'border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]' : 'border-[var(--danger)]/20 bg-[var(--danger-soft)]'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${getOverallStatus() === 'secure' ? 'bg-[var(--success-soft)]0' : getOverallStatus() === 'warning' ? 'bg-[var(--brand-gold-soft)]0' : 'bg-[var(--danger-soft)]0'}`} />
              <div>
                <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getOverallStatus().charAt(0).toUpperCase() + getOverallStatus().slice(1)}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {securityStatus?.security?.dataProtection ? 'Data Protection: Enabled' : 'Data Protection: Disabled'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={getOverallStatus() === 'secure' ? 'bg-[var(--success-soft)] text-[var(--success)]' : getOverallStatus() === 'warning' ? 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}>
                {securityStatus?.security?.routing === 'secure' ? 'Secure Routing' : 'Standard Routing'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sensitivity Analysis */}
      {sensitivityReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--brand-gold)]" />
              Data Sensitivity Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Data Classification */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3">Data Classification</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">High Sensitivity</span>
                    <Badge className="bg-[var(--danger-soft)] text-[var(--danger)]">
                      {sensitivityReport.sensitivity?.dataClassifications?.high || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Medium Sensitivity</span>
                    <Badge className="bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
                      {sensitivityReport.sensitivity?.dataClassifications?.medium || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Low Sensitivity</span>
                    <Badge className="bg-[var(--success-soft)] text-[var(--success)]">
                      {sensitivityReport.sensitivity?.dataClassifications?.low || 0}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* AI Provider Usage */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3">AI Provider Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Groq (External)</span>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Local AI</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm text-[var(--text-secondary)] mb-1">Data Protection</div>
                  <Progress value={85} className="h-2" />
                </div>
              </div>

              {/* Compliance Status */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3">Compliance Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">GDPR</span>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Data Residency</span>
                    <span className="text-sm font-medium">Internal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Audit Trail</span>
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[var(--brand-cyan)]" />
              Recent AI Activity Logs
            </div>
            <Button variant="outline" size="sm" onClick={clearAuditLogs}>
              Clear Logs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((log, index) => (
                <div key={index} className="border border-[var(--border-color)] rounded-2xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className={`w-4 h-4 ${log.aiProvider === 'groq' ? 'text-[var(--brand-gold)]' : 'text-[var(--brand-cyan)]'}`} />
                      <span className="font-medium text-sm">{log.module}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        log.sensitivityLevel === 'high' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' :
                        log.sensitivityLevel === 'medium' ? 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]' :
                        'bg-[var(--success-soft)] text-[var(--success)]'
                      }>
                        {log.sensitivityLevel}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Operation:</span> {log.operation}
                    {log.reason && (
                      <span className="ml-2">
                        <span className="font-medium">Reason:</span> {log.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Eye className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" />
              <p>No AI activity logs available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {sensitivityReport?.recommendations && (
        <Card className="bg-[var(--brand-cyan-soft)] border-[var(--brand-cyan-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--brand-cyan)]" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sensitivityReport.recommendations.map((rec, index) => (
                <div key={index} className={`border rounded-2xl p-4 ${getSeverityColor(rec.priority)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{rec.action}</h4>
                    <Badge className={
                      rec.priority === 'critical' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' :
                      rec.priority === 'high' ? 'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]' :
                      'bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
