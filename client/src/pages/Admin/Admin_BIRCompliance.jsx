import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, Plus, RefreshCw, Download, X,
} from 'lucide-react';
import {
  getBIRDashboard, getVATRecords, getEWTRecords, getTaxFilings,
  createVATRecord, createEWTRecord, updateTaxFiling, generateFilingCalendar,
  getATCCodes, PH_MONTHS, BIR_FORM_LABELS, FILING_STATUS_COLORS,
} from '../../services/finance_treasury/bir';

const formatPHP = v => `₱${parseFloat(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

function KPICard({ label, value, sub, color = 'blue', icon: Icon }) {
  const colors = { blue:'border-blue-500 bg-blue-50', green:'border-green-500 bg-green-50', red:'border-red-500 bg-red-50', amber:'border-amber-500 bg-amber-50' };
  return (
    <div className={`rounded-xl border-l-4 p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = FILING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'vat',       label: 'VAT Records' },
  { id: 'ewt',       label: 'EWT Records' },
  { id: 'calendar',  label: 'Filing Calendar' },
  { id: 'atc',       label: 'ATC Codes' },
];

export default function Admin_BIRCompliance() {
  const wsId = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  const [tab, setTab]           = useState('dashboard');
  const [year, setYear]         = useState(thisYear);
  const [month, setMonth]       = useState(thisMonth);
  const [dashboard, setDash]    = useState(null);
  const [vatData, setVatData]   = useState({ data: [], summary: {} });
  const [ewtData, setEwtData]   = useState({ data: [], summary: {} });
  const [filings, setFilings]   = useState([]);
  const [atcCodes, setAtcCodes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showVATForm, setShowVATForm] = useState(false);
  const [showEWTForm, setShowEWTForm] = useState(false);
  const [formData, setFormData] = useState({});

  const loadDashboard = useCallback(async () => {
    if (!wsId) return;
    try {
      setLoading(true);
      const d = await getBIRDashboard(wsId, { year, month });
      setDash(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [wsId, year, month]);

  const loadVAT = useCallback(async () => {
    if (!wsId) return;
    try { const d = await getVATRecords(wsId, { year, month }); setVatData(d); }
    catch (e) { console.error(e); }
  }, [wsId, year, month]);

  const loadEWT = useCallback(async () => {
    if (!wsId) return;
    try { const d = await getEWTRecords(wsId, { year, month }); setEwtData(d); }
    catch (e) { console.error(e); }
  }, [wsId, year, month]);

  const loadFilings = useCallback(async () => {
    if (!wsId) return;
    try { const d = await getTaxFilings(wsId, { year }); setFilings(d || []); }
    catch (e) { console.error(e); }
  }, [wsId, year]);

  const loadATC = useCallback(async () => {
    try { const d = await getATCCodes(); setAtcCodes(d || []); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'vat')       loadVAT();
    if (tab === 'ewt')       loadEWT();
    if (tab === 'calendar')  loadFilings();
    if (tab === 'atc')       loadATC();
  }, [tab, year, month]);

  const handleGenerateCalendar = async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      await generateFilingCalendar(wsId, year);
      await loadFilings();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleMarkFiled = async (id) => {
    try {
      await updateTaxFiling(wsId, id, { status: 'filed', filing_date: new Date().toISOString().split('T')[0] });
      await loadFilings();
    } catch (e) { console.error(e); }
  };

  const submitVATForm = async (e) => {
    e.preventDefault();
    try {
      await createVATRecord(wsId, { ...formData, period_month: month, period_year: year });
      setShowVATForm(false);
      setFormData({});
      await loadVAT();
      await loadDashboard();
    } catch (e) { alert(e.message); }
  };

  const submitEWTForm = async (e) => {
    e.preventDefault();
    try {
      await createEWTRecord(wsId, { ...formData, period_month: month, period_year: year });
      setShowEWTForm(false);
      setFormData({});
      await loadEWT();
    } catch (e) { alert(e.message); }
  };

  const years = Array.from({ length: 5 }, (_, i) => thisYear - i);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-blue-600" /> BIR Tax Compliance
          </h1>
          <p className="text-sm text-gray-500 mt-1">VAT, EWT, tax filings & BIR calendar — PH statutory compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            {PH_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Output VAT" value={formatPHP(dashboard.vat?.output_vat)} color="blue" icon={ChevronDown} />
            <KPICard label="Input VAT" value={formatPHP(dashboard.vat?.input_vat)} color="green" icon={ChevronDown} />
            <KPICard label="VAT Payable" value={formatPHP(dashboard.vat?.vat_payable)} color={dashboard.vat?.vat_payable > 0 ? 'red' : 'green'} />
            <KPICard label="EWT Pending" value={formatPHP(dashboard.ewt?.pending_remittance)} color="amber" icon={Clock} />
          </div>

          {dashboard.filings?.overdue_count > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">{dashboard.filings.overdue_count} Overdue BIR Filing{dashboard.filings.overdue_count > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600 mt-1">File immediately to avoid surcharge (25%) and compromise penalties.</p>
              </div>
            </div>
          )}

          {dashboard.filings?.upcoming_7d?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Due within 7 days</h3>
              <div className="space-y-2">
                {dashboard.filings.upcoming_7d.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{f.form_label || BIR_FORM_LABELS[f.form_type] || f.form_type}</span>
                      <span className="ml-2 text-xs text-gray-500">Due {f.due_date}</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-700">{formatPHP(f.tax_due)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VAT Tab ── */}
      {tab === 'vat' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Output VAT" value={formatPHP(vatData.summary?.total_output_vat)} color="blue" />
            <KPICard label="Input VAT" value={formatPHP(vatData.summary?.total_input_vat)} color="green" />
            <KPICard label="VAT Payable" value={formatPHP(vatData.summary?.vat_payable)} color="red" />
            <KPICard label="VAT Refundable" value={formatPHP(vatData.summary?.vat_refundable)} color="green" />
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowVATForm(true)} className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add VAT Record
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Date','Type','Supplier / Customer','OR #','Gross','VAT Rate','VAT Amount','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(vatData.data || []).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{r.transaction_date}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.record_type === 'output_vat' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {r.record_type === 'output_vat' ? 'Output' : 'Input'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{r.supplier_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{r.or_number || '—'}</td>
                    <td className="px-3 py-2">{formatPHP(r.gross_amount)}</td>
                    <td className="px-3 py-2">{r.vat_rate}%</td>
                    <td className="px-3 py-2 font-semibold">{formatPHP(r.vat_amount)}</td>
                    <td className="px-3 py-2">{r.filing_status || 'unfiled'}</td>
                  </tr>
                ))}
                {!vatData.data?.length && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No VAT records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* VAT Form Modal */}
          {showVATForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Add VAT Record</h2>
                  <button onClick={() => { setShowVATForm(false); setFormData({}); }}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={submitVATForm} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.record_type || ''} onChange={e => setFormData(p => ({ ...p, record_type: e.target.value }))}>
                        <option value="">Select...</option>
                        <option value="output_vat">Output VAT (Sales)</option>
                        <option value="input_vat">Input VAT (Purchase)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Date</label>
                      <input required type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.transaction_date || ''} onChange={e => setFormData(p => ({ ...p, transaction_date: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Supplier / Customer Name</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Business or individual name" value={formData.supplier_name || ''} onChange={e => setFormData(p => ({ ...p, supplier_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">TIN</label>
                      <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="000-000-000-000" value={formData.supplier_tin || ''} onChange={e => setFormData(p => ({ ...p, supplier_tin: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OR / Invoice #</label>
                      <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.or_number || ''} onChange={e => setFormData(p => ({ ...p, or_number: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gross Amount</label>
                      <input required type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.gross_amount || ''} onChange={e => setFormData(p => ({ ...p, gross_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">VAT Rate %</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.vat_rate ?? 12} onChange={e => setFormData(p => ({ ...p, vat_rate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">VAT Type</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.vat_type || 'standard'} onChange={e => setFormData(p => ({ ...p, vat_type: e.target.value }))}>
                        <option value="standard">Standard (12%)</option>
                        <option value="zero_rated">Zero-Rated (0%)</option>
                        <option value="exempt">VAT-Exempt</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setShowVATForm(false); setFormData({}); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save Record</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EWT Tab ── */}
      {tab === 'ewt' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KPICard label="Total EWT Withheld" value={formatPHP(ewtData.summary?.total_ewt_withheld)} color="blue" />
            <KPICard label="Remitted" value={formatPHP(ewtData.summary?.total_remitted)} color="green" />
            <KPICard label="Pending Remittance" value={formatPHP(ewtData.summary?.total_pending)} color="amber" />
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowEWTForm(true)} className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Record EWT
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Date','Payee','TIN','ATC','Income Payment','Rate','EWT','CWT Issued','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(ewtData.data || []).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{r.transaction_date}</td>
                    <td className="px-3 py-2 font-medium">{r.payee_name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.payee_tin || '—'}</td>
                    <td className="px-3 py-2"><span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">{r.atc_code}</span></td>
                    <td className="px-3 py-2">{formatPHP(r.income_payment)}</td>
                    <td className="px-3 py-2">{r.ewt_rate}%</td>
                    <td className="px-3 py-2 font-semibold">{formatPHP(r.ewt_amount)}</td>
                    <td className="px-3 py-2">{r.cwt_issued ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.remittance_status === 'remitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.remittance_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!ewtData.data?.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">No EWT records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* EWT Form Modal */}
          {showEWTForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Record EWT (Expanded Withholding Tax)</h2>
                  <button onClick={() => { setShowEWTForm(false); setFormData({}); }}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={submitEWTForm} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payee Name</label>
                      <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.payee_name || ''} onChange={e => setFormData(p => ({ ...p, payee_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payee TIN</label>
                      <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="000-000-000-000" value={formData.payee_tin || ''} onChange={e => setFormData(p => ({ ...p, payee_tin: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Date</label>
                      <input required type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.transaction_date || ''} onChange={e => setFormData(p => ({ ...p, transaction_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ATC Code</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.atc_code || ''} onChange={e => setFormData(p => ({ ...p, atc_code: e.target.value }))}>
                        <option value="">Select ATC...</option>
                        {atcCodes.map(a => <option key={a.atc_code} value={a.atc_code}>{a.atc_code} — {a.description} ({a.tax_rate}%)</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Income Payment</label>
                      <input required type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.income_payment || ''} onChange={e => setFormData(p => ({ ...p, income_payment: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">EWT Rate % (auto from ATC)</label>
                      <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.ewt_rate || ''} onChange={e => setFormData(p => ({ ...p, ewt_rate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setShowEWTForm(false); setFormData({}); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Save EWT</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filing Calendar Tab ── */}
      {tab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={handleGenerateCalendar} disabled={loading} className="flex items-center gap-2 text-sm border rounded-lg px-4 py-2 hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Generate {year} Calendar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Form','Description','Due Date','Tax Due','Status','Action'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filings.map(f => (
                  <tr key={f.id} className={`hover:bg-gray-50 ${f.due_date < today && f.status === 'upcoming' ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2"><span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{f.form_type}</span></td>
                    <td className="px-3 py-2">{f.form_label}</td>
                    <td className={`px-3 py-2 font-medium ${f.due_date < today && f.status === 'upcoming' ? 'text-red-700' : ''}`}>{f.due_date}</td>
                    <td className="px-3 py-2">{formatPHP(f.tax_due)}</td>
                    <td className="px-3 py-2"><StatusBadge status={f.due_date < today && f.status === 'upcoming' ? 'overdue' : f.status} /></td>
                    <td className="px-3 py-2">
                      {f.status === 'upcoming' && (
                        <button onClick={() => handleMarkFiled(f.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Mark Filed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filings.length && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No filings found. Click "Generate {year} Calendar" to create the full BIR schedule.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ATC Codes Tab ── */}
      {tab === 'atc' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['ATC Code','Description','Category','Tax Rate','Nature of Income Payment'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {atcCodes.map(a => (
                <tr key={a.atc_code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{a.atc_code}</td>
                  <td className="px-3 py-2">{a.description}</td>
                  <td className="px-3 py-2 text-gray-500">{a.category}</td>
                  <td className="px-3 py-2 font-semibold">{a.tax_rate}%</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{a.nature_of_income}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
