import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, X, ChevronRight, RefreshCw, TrendingDown } from 'lucide-react';
import {
  getAssets, createAsset, updateAsset, getDepreciationLines, previewDepreciation,
  runDepreciation, disposeAsset,
  BIR_ASSET_CLASSES, BIR_USEFUL_LIFE, DEP_METHODS, ASSET_STATUS_COLORS, formatBookValue,
} from '../../services/finance_treasury/fixedAssets';

const formatPHP = v => `₱${parseFloat(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

const TABS = [
  { id: 'register',     label: 'Asset Register' },
  { id: 'depreciation', label: 'Run Depreciation' },
  { id: 'disposals',    label: 'Disposals' },
];

function StatusBadge({ status }) {
  const cls = ASSET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

export default function Admin_FixedAssets() {
  const wsId = localStorage.getItem('workspaceId') || localStorage.getItem('workspace_id') || '';

  const [tab, setTab]             = useState('register');
  const [assetsData, setAssetsData] = useState({ data: [], summary: {} });
  const [selected, setSelected]   = useState(null);
  const [depLines, setDepLines]   = useState([]);
  const [depPreview, setDepPreview] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [showDispose, setShowDispose] = useState(false);
  const [formData, setFormData]   = useState({});
  const [runPeriod, setRunPeriod] = useState({ year: thisYear, month: thisMonth });
  const [runResult, setRunResult] = useState(null);
  const [searchQ, setSearchQ]     = useState('');

  const loadAssets = useCallback(async () => {
    if (!wsId) return;
    try {
      setLoading(true);
      const d = await getAssets(wsId, searchQ ? { search: searchQ } : {});
      setAssetsData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [wsId, searchQ]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleSelectAsset = async (asset) => {
    setSelected(asset);
    try {
      const lines = await getDepreciationLines(wsId, asset.id);
      setDepLines(lines);
    } catch (e) { console.error(e); }
  };

  const handlePreview = async () => {
    if (!selected) return;
    try {
      const d = await previewDepreciation(wsId, selected.id);
      setDepPreview(d);
    } catch (e) { alert(e.message); }
  };

  const handleRunDep = async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const result = await runDepreciation(wsId, {
        period_year: runPeriod.year, period_month: runPeriod.month,
      });
      setRunResult(result);
      await loadAssets();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await updateAsset(wsId, formData.id, formData);
      } else {
        await createAsset(wsId, formData);
      }
      setShowForm(false);
      setFormData({});
      await loadAssets();
    } catch (err) { alert(err.message); }
  };

  const handleDispose = async (e) => {
    e.preventDefault();
    try {
      const result = await disposeAsset(wsId, selected.id, formData);
      alert(result.message);
      setShowDispose(false);
      setFormData({});
      setSelected(null);
      await loadAssets();
    } catch (err) { alert(err.message); }
  };

  const handleBirClassChange = (val) => {
    const life = BIR_USEFUL_LIFE[val];
    setFormData(p => ({ ...p, bir_asset_class: val, ...(life !== undefined ? { useful_life_years: life } : {}) }));
  };

  const years = Array.from({ length: 3 }, (_, i) => thisYear - i + 1);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" /> Fixed Assets & Depreciation
          </h1>
          <p className="text-sm text-gray-500 mt-1">BIR-aligned asset register, SL/DDB/SYD depreciation, disposals</p>
        </div>
        <button onClick={() => { setFormData({}); setShowForm(true); }} className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Assets</div>
          <div className="text-xl font-bold text-gray-800">{assetsData.summary?.total_assets || 0}</div>
        </div>
        <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Cost</div>
          <div className="text-xl font-bold text-gray-800">{formatPHP(assetsData.summary?.total_cost)}</div>
        </div>
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Accumulated Dep.</div>
          <div className="text-xl font-bold text-gray-800">{formatPHP(assetsData.summary?.total_acc_dep)}</div>
        </div>
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Net Book Value</div>
          <div className="text-xl font-bold text-gray-800">{formatPHP(assetsData.summary?.total_book_value)}</div>
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

      {/* ── Register Tab ── */}
      {tab === 'register' && (
        <div className="flex gap-4">
          {/* Asset list */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <input type="text" placeholder="Search assets..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Asset','Class','Acquired','Cost','Acc. Dep.','Book Value','Method','Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(assetsData.data || []).map(a => (
                    <tr key={a.id} onClick={() => handleSelectAsset(a)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === a.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{a.asset_name}</div>
                        <div className="text-xs text-gray-400">{a.asset_code || '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{BIR_ASSET_CLASSES.find(c => c.value === a.bir_asset_class)?.label || a.bir_asset_class}</td>
                      <td className="px-3 py-2 text-gray-500">{a.acquisition_date}</td>
                      <td className="px-3 py-2">{formatPHP(a.acquisition_cost)}</td>
                      <td className="px-3 py-2 text-amber-700">{formatPHP(a.accumulated_depreciation)}</td>
                      <td className="px-3 py-2 font-semibold text-blue-700">{formatPHP(formatBookValue(a))}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{DEP_METHODS.find(m => m.value === a.depreciation_method)?.label || a.depreciation_method}</td>
                      <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                  {!assetsData.data?.length && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No assets found. Add your first fixed asset.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asset detail panel */}
          {selected && (
            <div className="w-80 border-l pl-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{selected.asset_name}</h3>
                <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Cost</span><span className="font-medium">{formatPHP(selected.acquisition_cost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Salvage</span><span>{formatPHP(selected.salvage_value)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Useful Life</span><span>{selected.useful_life_years} yrs</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Acc. Dep.</span><span className="text-amber-700">{formatPHP(selected.accumulated_depreciation)}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-gray-700 font-medium">Book Value</span><span className="font-bold text-blue-700">{formatPHP(formatBookValue(selected))}</span></div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setFormData({ ...selected }); setShowForm(true); }}
                  className="flex-1 text-xs border rounded-lg py-1.5 hover:bg-gray-50">Edit</button>
                <button onClick={() => { setFormData({}); setShowDispose(true); }}
                  className="flex-1 text-xs border border-red-300 text-red-600 rounded-lg py-1.5 hover:bg-red-50">Dispose</button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Depreciation Lines ({depLines.length})</span>
                  <button onClick={handlePreview} className="text-xs text-blue-600 hover:underline">Preview Full Schedule</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {depLines.slice(-6).map(l => (
                    <div key={`${l.period_year}-${l.period_month}`} className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1">
                      <span>{months[l.period_month - 1]} {l.period_year}</span>
                      <span className="text-amber-700">{formatPHP(l.depreciation_amount)}</span>
                      <span className="text-gray-500">{formatPHP(l.book_value_end)}</span>
                    </div>
                  ))}
                  {!depLines.length && <p className="text-xs text-gray-400 text-center py-2">No depreciation run yet.</p>}
                </div>
              </div>

              {/* Preview Modal */}
              {depPreview && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Full Depreciation Schedule — {selected.asset_name}</h2>
                      <button onClick={() => setDepPreview(null)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="bg-gray-50">
                            {['Period','Dep. Amount','Accumulated Dep.','Book Value'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(depPreview.data || []).map(l => (
                            <tr key={`${l.period_year}-${l.period_month}`} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5">{months[l.period_month - 1]} {l.period_year}</td>
                              <td className="px-3 py-1.5 text-amber-700">{formatPHP(l.depreciation_amount)}</td>
                              <td className="px-3 py-1.5">{formatPHP(l.accumulated_dep_end)}</td>
                              <td className="px-3 py-1.5 font-medium text-blue-700">{formatPHP(l.book_value_end)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Run Depreciation Tab ── */}
      {tab === 'depreciation' && (
        <div className="max-w-lg space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">Runs monthly depreciation for all <strong>active</strong> assets using their configured method (SL/DDB/SYD). Only runs once per period per asset — re-running is idempotent.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runPeriod.year} onChange={e => setRunPeriod(p => ({ ...p, year: +e.target.value }))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runPeriod.month} onChange={e => setRunPeriod(p => ({ ...p, month: +e.target.value }))}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleRunDep} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50">
            <TrendingDown className="w-5 h-5" />
            {loading ? 'Running...' : `Run Depreciation for ${months[runPeriod.month - 1]} ${runPeriod.year}`}
          </button>

          {runResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-green-800">Depreciation Run Complete</p>
              <p className="text-xs text-green-700">Processed: {runResult.processed} assets | Skipped: {runResult.skipped}</p>
              {(runResult.data || []).map(r => (
                <div key={r.id} className="flex justify-between text-xs bg-white border border-green-100 rounded px-3 py-1.5">
                  <span>{r.asset_name}</span>
                  <span className="text-amber-700">{formatPHP(r.depreciation_amount)}</span>
                  <span className="text-gray-500">BV: {formatPHP(r.new_book_value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Disposals Tab ── */}
      {tab === 'disposals' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Select an asset from the Register tab and click "Dispose" to record a disposal.</p>
          <p className="text-xs text-gray-400">Disposals show gain/loss computed as: Proceeds − Book Value at Disposal</p>
        </div>
      )}

      {/* ── Asset Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{formData.id ? 'Edit Asset' : 'Add Fixed Asset'}</h2>
              <button onClick={() => { setShowForm(false); setFormData({}); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asset Name *</label>
                  <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.asset_name || ''} onChange={e => setFormData(p => ({ ...p, asset_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asset Code</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="FA-2024-001" value={formData.asset_code || ''} onChange={e => setFormData(p => ({ ...p, asset_code: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">BIR Asset Class</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.bir_asset_class || ''} onChange={e => handleBirClassChange(e.target.value)}>
                    <option value="">Select class...</option>
                    {BIR_ASSET_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Depreciation Method</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.depreciation_method || 'straight_line'} onChange={e => setFormData(p => ({ ...p, depreciation_method: e.target.value }))}>
                    {DEP_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Acquisition Date *</label>
                  <input required type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.acquisition_date || ''} onChange={e => setFormData(p => ({ ...p, acquisition_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cost *</label>
                  <input required type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.acquisition_cost || ''} onChange={e => setFormData(p => ({ ...p, acquisition_cost: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Salvage Value</label>
                  <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.salvage_value ?? 0} onChange={e => setFormData(p => ({ ...p, salvage_value: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Useful Life (Years) *</label>
                  <input required type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.useful_life_years || ''} onChange={e => setFormData(p => ({ ...p, useful_life_years: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.location || ''} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setFormData({}); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  {formData.id ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Disposal Modal ── */}
      {showDispose && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Dispose Asset</h2>
              <button onClick={() => { setShowDispose(false); setFormData({}); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Asset</span><span className="font-medium">{selected.asset_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Book Value</span><span className="font-bold text-blue-700">{formatPHP(formatBookValue(selected))}</span></div>
            </div>
            <form onSubmit={handleDispose} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Disposal Date *</label>
                <input required type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.disposal_date || ''} onChange={e => setFormData(p => ({ ...p, disposal_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Disposal Type *</label>
                <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.disposal_type || ''} onChange={e => setFormData(p => ({ ...p, disposal_type: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="sale">Sale</option>
                  <option value="donation">Donation</option>
                  <option value="retirement">Retirement / Write-off</option>
                  <option value="trade_in">Trade-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proceeds / Sale Price</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.proceeds || 0} onChange={e => setFormData(p => ({ ...p, proceeds: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowDispose(false); setFormData({}); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Record Disposal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
