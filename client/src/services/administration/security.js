/**
 * Security Service - Web & Code Security Scanning
 * Replaces: openfang, pentagi
 * Tools: Nuclei (web), Trivy (code/containers)
 * Cost: $0 (open source)
 */

import { supabase } from '../../config/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class SecurityService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // ═══════════════════════════════════════════════════════════
  // NUCLEI - Web Application Security Scanning
  // ═══════════════════════════════════════════════════════════

  /**
   * Quick vulnerability scan with Nuclei
   * Fast CVE and misconfiguration detection
   */
  async nucleiScan(target, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/security/nuclei/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          severity: options.severity || 'critical,high,medium', // Filter by severity
          templates: options.templates || 'cves,vulnerabilities,misconfiguration',
          timeout: options.timeout || 300, // 5 minutes max
        }),
      });

      if (!response.ok) throw new Error(`Scan failed: ${response.status}`);
      
      const results = await response.json();
      
      // Store in Supabase for history
      await this.logScan('nuclei', target, results);
      
      return results;
    } catch (error) {
      console.error('Nuclei scan error:', error);
      throw error;
    }
  }

  /**
   * Fast CVE check for specific technology
   */
  async checkCVEs(technology, version) {
    return this.nucleiScan(`${technology}:${version}`, {
      templates: 'cves',
      severity: 'critical,high',
    });
  }

  /**
   * Infrastructure security audit
   */
  async infrastructureAudit(hosts) {
    const results = [];
    
    for (const host of hosts) {
      try {
        const scan = await this.nucleiScan(host, {
          templates: 'network,misconfiguration',
          severity: 'critical,high,medium',
        });
        results.push({ host, scan, timestamp: new Date().toISOString() });
      } catch (error) {
        results.push({ host, error: error.message, timestamp: new Date().toISOString() });
      }
    }

    // Store audit report
    await supabase.from('infrastructure_audits').insert({
      hosts_scanned: hosts.length,
      results,
      created_at: new Date().toISOString(),
    });

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // TRIVY - Code & Container Security Scanning
  // ═══════════════════════════════════════════════════════════

  /**
   * Scan container image for vulnerabilities
   */
  async trivyImageScan(imageName, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/security/trivy/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageName,
          severity: options.severity || 'HIGH,CRITICAL',
          scanners: options.scanners || 'vuln,secret,config',
        }),
      });

      if (!response.ok) throw new Error(`Image scan failed: ${response.status}`);
      
      const results = await response.json();
      await this.logScan('trivy-image', imageName, results);
      
      return results;
    } catch (error) {
      console.error('Trivy image scan error:', error);
      throw error;
    }
  }

  /**
   * Scan codebase for secrets and vulnerabilities
   */
  async trivyCodeScan(repoPath, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/security/trivy/filesystem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: repoPath,
          scanners: options.scanners || 'secret,config,vuln',
          severity: options.severity || 'HIGH,CRITICAL',
          skipDirs: options.skipDirs || ['node_modules', '.git', 'dist'],
        }),
      });

      if (!response.ok) throw new Error(`Code scan failed: ${response.status}`);
      
      const results = await response.json();
      await this.logScan('trivy-code', repoPath, results);
      
      return results;
    } catch (error) {
      console.error('Trivy code scan error:', error);
      throw error;
    }
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  async scanDependencies(projectPath) {
    return this.trivyCodeScan(projectPath, {
      scanners: 'vuln',
      severity: 'HIGH,CRITICAL',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UNIFIED SECURITY REPORTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate comprehensive security report
   */
  async generateReport(target) {
    const [webResults, codeResults] = await Promise.allSettled([
      this.nucleiScan(target),
      this.trivyCodeScan('.'), // Scan current project
    ]);

    const report = {
      target,
      timestamp: new Date().toISOString(),
      webSecurity: webResults.status === 'fulfilled' ? webResults.value : { error: webResults.reason },
      codeSecurity: codeResults.status === 'fulfilled' ? codeResults.value : { error: codeResults.reason },
      summary: {
        totalVulnerabilities: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    // Calculate summary
    if (webResults.status === 'fulfilled') {
      webResults.value.forEach(v => {
        report.summary.totalVulnerabilities++;
        report.summary[v.severity?.toLowerCase() || 'low']++;
      });
    }

    // Store report in Supabase
    await supabase.from('security_reports').insert(report);

    return report;
  }

  /**
   * Get security dashboard data
   */
  async getDashboardData(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: scans } = await supabase
      .from('security_scans')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    const { data: reports } = await supabase
      .from('security_reports')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    return {
      recentScans: scans || [],
      recentReports: reports || [],
      totalScans: scans?.length || 0,
      totalVulnerabilities: reports?.reduce((acc, r) => acc + (r.summary?.totalVulnerabilities || 0), 0) || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Log scan to Supabase
   */
  async logScan(tool, target, results) {
    try {
      await supabase.from('security_scans').insert({
        tool,
        target,
        results,
        vulnerability_count: Array.isArray(results) ? results.length : 0,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log scan:', error);
    }
  }

  /**
   * Check all service health
   */
  async health() {
    const checks = await Promise.allSettled([
      fetch(`${this.baseUrl}/security/nuclei/health`),
      fetch(`${this.baseUrl}/security/trivy/health`),
    ]);

    return {
      nuclei: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      trivy: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    };
  }
}

export default new SecurityService();
