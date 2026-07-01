import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Upload, Search, Filter, ChevronDown, ChevronUp, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, MoreVertical
} from 'lucide-react';
import * as unifiedLeadsService from '../../services/leads/unifiedLeads';

const SOURCES = ['all', 'facebook', 'google_maps', 'web_form', 'manual', 'csv_import'];
const STATUSES = ['all', 'new', 'contacted', 'qualified', 'converted', 'lost', 'archived'];

export default function AdminUnifiedLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  async function loadLeads() {
    try {
      setError(null);
      const filters = {};
      if (sourceFilter !== 'all') filters.source = sourceFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (search) filters.search = search;
      filters.limit = 200;

      const res = await unifiedLeadsService.getUnifiedLeads(filters);
      setLeads(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadLeads(); }, [sourceFilter, statusFilter, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadLeads();
  }

  async function handleStatusChange(leadId, newStatus) {
    try {
      const res = await unifiedLeadsService.updateUnifiedLead(leadId, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? res.data : l));
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleCSVImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const res = await unifiedLeadsService.importLeadsCSV(file);
      setImportResult(res);
      await loadLeads();
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const kpiCards = useMemo(() => {
    const total = leads.length;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newThisWeek = leads.filter(l => l.created_at && l.created_at >= oneWeekAgo).length;
    const sourceCounts = unifiedLeadsService.groupBySource(leads);
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, newThisWeek, topSource: topSource ? { source: topSource[0], count: topSource[1] } : null };
  }, [leads]);

  if (loading) return (
    <div className="flex items-center justify-center py-28">
      <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-sm text-gray-500 mb-1">Failed to load leads</p>
      <p className="text-xs text-red-400">{error}</p>
      <button onClick={loadLeads} className="mt-4 text-sm text-blue-500 hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Unified Leads</h1>
          <p className="text-sm text-gray-500">All leads from Facebook, Google Maps, Web Forms, and manual entry</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--brand-gold,#f59e0b)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
          <p className="text-xs font-medium text-gray-500">Total Leads</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{kpiCards.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
          <p className="text-xs font-medium text-gray-500">New This Week</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{kpiCards.newThisWeek}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 col-span-2">
          <p className="text-xs font-medium text-gray-500">Top Source</p>
          {kpiCards.topSource ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-gray-900 dark:text-white capitalize">{kpiCards.topSource.source.replace(/_/g, ' ')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">{kpiCards.topSource.count} leads</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No data yet</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone, company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {SOURCES.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Sources' : unifiedLeadsService.SOURCE_LABELS[s] || s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">CSV Import Complete</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Imported: <strong>{importResult.imported}</strong> · Updated: <strong>{importResult.updated}</strong>
                {importResult.errors?.length ? ` · Errors: <strong>${importResult.errors.length}</strong>` : ''}
              </p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i}>Row {err.row}: {err.reason}</div>
                  ))}
                  {importResult.errors.length > 10 && <div>…and {importResult.errors.length - 10} more errors</div>}
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-green-600 hover:text-green-800">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {importError && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{importError}</p>
            <button onClick={() => setImportError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-white/10">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-sm text-gray-400">
                    No leads found. Import a CSV or wait for web form submissions.
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className="group hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                      {lead.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                      {lead.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {lead.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                      {lead.company_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        {unifiedLeadsService.SOURCE_LABELS[lead.source] || lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || 'new'}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        className="text-xs border border-gray-200 dark:border-white/10 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        style={{ color: unifiedLeadsService.STATUS_COLORS[lead.status] || 'inherit' }}
                      >
                        {STATUSES.filter(s => s !== 'all').map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${lead.score ?? 0}%`,
                              backgroundColor: (lead.score ?? 0) >= 70 ? 'var(--success)' : (lead.score ?? 0) >= 60 ? 'var(--brand-gold,#f59e0b)' : 'var(--danger)',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-8">{Math.round(lead.score ?? 0)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}