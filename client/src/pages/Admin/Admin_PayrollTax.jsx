import { useState, useEffect, useCallback } from 'react';
import { Users, Calculator, Plus, X, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  getPayrollRuns, createPayrollRun, getPayrollRun, addPayrollLines, updatePayrollRun,
  computeFullPayroll, computeSSS, computePhilHealth, computePagibig, computeWithholdingTax,
  PAYROLL_STATUS_COLORS,
} from '../../services/finance_treasury/payrollTax';

const formatPHP  = v => `₱${parseFloat(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thisYear   = new Date().getFullYear();
const thisMonth  = new Date().getMonth() + 1;
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TABS = [
  { id: 'calculator', label: 'WT Calculator' },
  { id: 'runs',       label: 'Payroll Runs' },
  { id: 'reference',  label: 'Rates Reference' },
];

function StatusBadge({ status }) {
  const cls = PAYROLL_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

// ── TRAIN Law Brackets Display ────────────────────────────────────────────────

const TRAIN_TABLE = [
  { range: '₱0 – ₱20,833',          rate: '0%',  base: '₱0',          note: 'Tax exempt' },
  { range: '₱20,834 – ₱33,332',     rate: '15%', base: '₱0',          note: 'Of excess over ₱20,833' },
  { range: '₱33,333 – ₱66,666',     rate: '20%', base: '₱1,875',      note: 'Of excess over ₱33,332' },
  { range: '₱66,667 – ₱166,666',    rate: '25%', base: '₱8,541.80',   note: 'Of excess over ₱66,666' },
  { range: '₱166,667 – ₱666,666',   rate: '30%', base: '₱33,541.80',  note: 'Of excess over ₱166,666' },
  { range: 'Over ₱666,667',          rate: '35%', base: '₱183,541.80', note: 'Of excess over ₱666,666' },
];

export default function Admin_PayrollTax() {
  const wsId = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  const [tab, setTab]         = useState('calculator');
  const [salary, setSalary]   = useState('');
  const [deMinis, setDeMinis] = useState('');
  const [otherTaxable, setOther] = useState('');
  const [calc, setCalc]       = useState(null);

  // Payroll Runs
  const [runs, setRuns]               = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runDetail, setRunDetail]     = useState(null);
  const [showNewRun, setShowNewRun]   = useState(false);
  const [showAddEmp, setShowAddEmp]   = useState(false);
  const [runForm, setRunForm]         = useState({ year: thisYear, month: thisMonth });
  const [employees, setEmployees]     = useState([{ employee_name: '', basic_salary: '', de_minimis: '', other_taxable: '' }]);
  const [loading, setLoading]         = useState(false);

  const doCalc = () => {
    if (!salary) return;
    setCalc(computeFullPayroll(salary, deMinis, otherTaxable));
  };

  const loadRuns = useCallback(async () => {
    if (!wsId) return;
    try { const d = await getPayrollRuns(wsId); setRuns(d || []); }
    catch (e) { console.error(e); }
  }, [wsId]);

  useEffect(() => { if (tab === 'runs') loadRuns(); }, [tab]);

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    try { const d = await getPayrollRun(wsId, run.id); setRunDetail(d); }
    catch (e) { console.error(e); }
  };

  const handleCreateRun = async (e) => {
    e.preventDefault();
    try {
      await createPayrollRun(wsId, runForm);
      setShowNewRun(false);
      setRunForm({ year: thisYear, month: thisMonth });
      await loadRuns();
    } catch (err) { alert(err.message); }
  };

  const handleAddEmployees = async (e) => {
    e.preventDefault();
    if (!selectedRun) return;
    setLoading(true);
    try {
      await addPayrollLines(wsId, selectedRun.id, employees.map(emp => ({
        ...emp, basic_salary: parseFloat(emp.basic_salary || 0),
        de_minimis: parseFloat(emp.de_minimis || 0),
        other_taxable: parseFloat(emp.other_taxable || 0),
      })));
      setShowAddEmp(false);
      setEmployees([{ employee_name: '', basic_salary: '', de_minimis: '', other_taxable: '' }]);
      await handleSelectRun(selectedRun);
      await loadRuns();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handlePost = async (run) => {
    if (!confirm('Post this payroll run? This will lock the run.')) return;
    try {
      await updatePayrollRun(wsId, run.id, { status: 'posted' });
      await loadRuns();
      if (selectedRun?.id === run.id) await handleSelectRun(run);
    } catch (err) { alert(err.message); }
  };

  const addEmpRow = () => setEmployees(p => [...p, { employee_name: '', basic_salary: '', de_minimis: '', other_taxable: '' }]);
  const removeEmpRow = (i) => setEmployees(p => p.filter((_, idx) => idx !== i));
  const updateEmpRow = (i, key, val) => setEmployees(p => p.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

  const years = Array.from({ length: 3 }, (_, i) => thisYear - i + 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Payroll Tax
          </h1>
          <p className="text-sm text-gray-500 mt-1">TRAIN Law WT, SSS 2024, PhilHealth 5%, Pag-IBIG — statutory deductions</p>
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

      {/* ── Calculator Tab ── */}
      {tab === 'calculator' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-500" /> Monthly Payroll Calculator</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (₱)</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 35000" value={salary} onChange={e => setSalary(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">De Minimis Benefits (₱)</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" value={deMinis} onChange={e => setDeMinis(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Other Taxable Income (₱)</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" value={otherTaxable} onChange={e => setOther(e.target.value)} />
              </div>
            </div>
            <button onClick={doCalc} className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 text-sm">
              Compute
            </button>
          </div>

          {calc && (
            <div className="bg-white border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Computation Result</h3>

              <div className="grid grid-cols-3 gap-3 text-sm">
                {/* SSS */}
                <div className="bg-blue-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-blue-700 uppercase">SSS</p>
                  <div className="flex justify-between"><span className="text-gray-600">EE Regular</span><span>{formatPHP(calc.sss.ee)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">EE MPF</span><span>{formatPHP(calc.sss.mpf_ee)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-medium"><span>EE Total</span><span>{formatPHP(calc.sss.total_ee)}</span></div>
                  <div className="flex justify-between text-gray-400 text-xs"><span>ER (cost)</span><span>{formatPHP(calc.sss.total_er)}</span></div>
                </div>

                {/* PhilHealth */}
                <div className="bg-green-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-green-700 uppercase">PhilHealth</p>
                  <div className="flex justify-between"><span className="text-gray-600">EE Share (2.5%)</span><span>{formatPHP(calc.philhealth.ee)}</span></div>
                  <div className="flex justify-between text-gray-400 text-xs"><span>ER Share (2.5%)</span><span>{formatPHP(calc.philhealth.er)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-medium"><span>Total Prem. (5%)</span><span>{formatPHP(calc.philhealth.total)}</span></div>
                </div>

                {/* Pag-IBIG */}
                <div className="bg-amber-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 uppercase">Pag-IBIG / HDMF</p>
                  <div className="flex justify-between"><span className="text-gray-600">EE</span><span>{formatPHP(calc.pagibig.ee)}</span></div>
                  <div className="flex justify-between text-gray-400 text-xs"><span>ER</span><span>{formatPHP(calc.pagibig.er)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-medium"><span>Total</span><span>{formatPHP(calc.pagibig.total)}</span></div>
                </div>
              </div>

              {/* WT Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Gross Salary</span><span>{formatPHP(calc.gross_salary)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mandatory EE Deductions</span><span className="text-red-600">({formatPHP(calc.mandatory_ee_deductions)})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">De Minimis</span><span className="text-red-600">({formatPHP(deMinis || 0)})</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-medium">Taxable Compensation</span><span className="font-bold">{formatPHP(calc.taxable_compensation)}</span></div>
                <div className="flex justify-between text-purple-700 font-semibold"><span>Withholding Tax (TRAIN)</span><span>{formatPHP(calc.withholding_tax)}</span></div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-green-700"><span>Net Pay</span><span>{formatPHP(calc.net_pay)}</span></div>
                <div className="flex justify-between text-xs text-gray-400 pt-1 border-t"><span>Total Employer Cost</span><span>{formatPHP(calc.total_employer_cost)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payroll Runs Tab ── */}
      {tab === 'runs' && (
        <div className="flex gap-4">
          {/* Runs list */}
          <div className="w-72 flex-shrink-0 space-y-3">
            <button onClick={() => setShowNewRun(true)} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:bg-gray-50">
              <Plus className="w-4 h-4" /> New Payroll Run
            </button>
            {runs.map(r => (
              <div key={r.id} onClick={() => handleSelectRun(r)}
                className={`border rounded-xl p-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedRun?.id === r.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{MONTHS[r.period_month - 1]} {r.period_year}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-gray-500">{r.employee_count || 0} employees</div>
                <div className="text-sm font-semibold text-gray-800 mt-1">{formatPHP(r.total_net_pay)} net</div>
              </div>
            ))}
            {!runs.length && <p className="text-xs text-gray-400 text-center py-4">No payroll runs yet.</p>}
          </div>

          {/* Run detail */}
          {runDetail && (
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {MONTHS[runDetail.period_month - 1]} {runDetail.period_year} — {runDetail.payroll_type}
                </h3>
                <div className="flex gap-2">
                  {runDetail.status !== 'posted' && (
                    <>
                      <button onClick={() => setShowAddEmp(true)} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50">
                        <Plus className="w-4 h-4" /> Add Employees
                      </button>
                      <button onClick={() => handlePost(runDetail)} className="flex items-center gap-2 text-sm bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Post Run
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { l: 'Gross', v: runDetail.total_gross },
                  { l: 'SSS (EE)', v: runDetail.total_sss_ee },
                  { l: 'PhilHealth (EE)', v: runDetail.total_philhealth_ee },
                  { l: 'Pag-IBIG (EE)', v: runDetail.total_pagibig_ee },
                  { l: 'WHT', v: runDetail.total_wt_compensation },
                  { l: 'Net Pay', v: runDetail.total_net_pay },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">{l}</div>
                    <div className="text-sm font-bold text-gray-800">{formatPHP(v)}</div>
                  </div>
                ))}
              </div>

              {/* Employee lines */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Employee','Gross','SSS EE','PhilHealth EE','Pag-IBIG EE','Taxable','WHT','Net Pay'].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(runDetail.lines || []).map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <div className="font-medium">{l.employee_name}</div>
                          <div className="text-gray-400">{l.position}</div>
                        </td>
                        <td className="px-2 py-2">{formatPHP(l.basic_salary)}</td>
                        <td className="px-2 py-2">{formatPHP(parseFloat(l.sss_ee || 0) + parseFloat(l.sss_mpf_ee || 0))}</td>
                        <td className="px-2 py-2">{formatPHP(l.philhealth_ee)}</td>
                        <td className="px-2 py-2">{formatPHP(l.pagibig_ee)}</td>
                        <td className="px-2 py-2">{formatPHP(l.taxable_compensation)}</td>
                        <td className="px-2 py-2 text-purple-700">{formatPHP(l.wt_compensation)}</td>
                        <td className="px-2 py-2 font-bold text-green-700">{formatPHP(l.net_pay)}</td>
                      </tr>
                    ))}
                    {!runDetail.lines?.length && (
                      <tr><td colSpan={8} className="px-2 py-6 text-center text-gray-400">No employees. Click "Add Employees" to build this payroll.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reference Tab ── */}
      {tab === 'reference' && (
        <div className="max-w-3xl space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">TRAIN Law (RA 10963) — Monthly Withholding Tax Brackets</h3>
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Taxable Compensation</th>
                  <th className="px-4 py-2 text-left">Base Tax</th>
                  <th className="px-4 py-2 text-left">Rate on Excess</th>
                  <th className="px-4 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {TRAIN_TABLE.map(r => (
                  <tr key={r.range} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.range}</td>
                    <td className="px-4 py-2">{r.base}</td>
                    <td className="px-4 py-2 font-semibold text-blue-700">{r.rate}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-sm text-blue-700 mb-2">SSS 2024 Rates</h4>
              <div className="text-xs space-y-1 text-gray-600">
                <div className="flex justify-between"><span>EE Regular</span><span className="font-medium">4.5%</span></div>
                <div className="flex justify-between"><span>ER Regular</span><span className="font-medium">9.5%</span></div>
                <div className="flex justify-between"><span>EE MPF</span><span className="font-medium">2.5% (over ₱20k)</span></div>
                <div className="flex justify-between"><span>ER MPF + EC</span><span className="font-medium">2.5% + ₱10-30</span></div>
                <div className="flex justify-between border-t pt-1"><span>MSC Floor</span><span>₱5,000</span></div>
                <div className="flex justify-between"><span>MSC Ceiling</span><span>₱35,000</span></div>
              </div>
            </div>
            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-sm text-green-700 mb-2">PhilHealth 2024</h4>
              <div className="text-xs space-y-1 text-gray-600">
                <div className="flex justify-between"><span>Total Premium</span><span className="font-medium">5% of MSB</span></div>
                <div className="flex justify-between"><span>EE Share</span><span className="font-medium">2.5%</span></div>
                <div className="flex justify-between"><span>ER Share</span><span className="font-medium">2.5%</span></div>
                <div className="flex justify-between border-t pt-1"><span>MSB Floor</span><span>₱10,000</span></div>
                <div className="flex justify-between"><span>MSB Ceiling</span><span>₱100,000</span></div>
                <div className="flex justify-between"><span>Min. Monthly</span><span>₱500</span></div>
              </div>
            </div>
            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-sm text-amber-700 mb-2">Pag-IBIG / HDMF</h4>
              <div className="text-xs space-y-1 text-gray-600">
                <div className="flex justify-between"><span>EE (salary ≤ ₱1,500)</span><span className="font-medium">1%</span></div>
                <div className="flex justify-between"><span>EE (salary &gt; ₱1,500)</span><span className="font-medium">2%</span></div>
                <div className="flex justify-between"><span>ER</span><span className="font-medium">2%</span></div>
                <div className="flex justify-between border-t pt-1"><span>EE Max</span><span>₱100/mo</span></div>
                <div className="flex justify-between"><span>ER Max</span><span>₱100/mo</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Run Modal */}
      {showNewRun && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Payroll Run</h2>
              <button onClick={() => setShowNewRun(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateRun} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runForm.year} onChange={e => setRunForm(p => ({ ...p, year: +e.target.value }))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runForm.month} onChange={e => setRunForm(p => ({ ...p, month: +e.target.value }))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runForm.payroll_type || 'regular'} onChange={e => setRunForm(p => ({ ...p, payroll_type: e.target.value }))}>
                  <option value="regular">Regular</option>
                  <option value="supplemental">Supplemental (13th Month / Bonus)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewRun(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Create Run</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employees Modal */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Employees to Payroll</h2>
              <button onClick={() => setShowAddEmp(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEmployees} className="space-y-3">
              {employees.map((emp, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">Employee Name *</label>}
                    <input required type="text" placeholder="Full name" className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      value={emp.employee_name} onChange={e => updateEmpRow(i, 'employee_name', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">Basic Salary *</label>}
                    <input required type="number" step="0.01" placeholder="0.00" className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      value={emp.basic_salary} onChange={e => updateEmpRow(i, 'basic_salary', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">De Minimis</label>}
                    <input type="number" step="0.01" placeholder="0" className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      value={emp.de_minimis} onChange={e => updateEmpRow(i, 'de_minimis', e.target.value)} />
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      {i === 0 && <label className="block text-xs text-gray-500 mb-1">Other Taxable</label>}
                      <input type="number" step="0.01" placeholder="0" className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        value={emp.other_taxable} onChange={e => updateEmpRow(i, 'other_taxable', e.target.value)} />
                    </div>
                    {employees.length > 1 && (
                      <button type="button" onClick={() => removeEmpRow(i)} className={`${i === 0 ? 'mt-5' : ''} text-red-400 hover:text-red-600`}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEmpRow} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Another
              </button>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddEmp(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Computing...' : 'Add to Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
