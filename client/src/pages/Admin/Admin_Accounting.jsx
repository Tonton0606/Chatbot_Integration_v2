import { useEffect, useState, useCallback } from "react";
import {
  BookOpen, PlusCircle, RefreshCw, Search, ChevronDown,
  CheckCircle, XCircle, ArrowLeftRight, FileText, Scale,
  TrendingUp, AlertCircle, Eye, RotateCcw, Layers, DollarSign,
  BarChart3, Clock, Sparkles, Brain, Building2, ShieldCheck,
} from "lucide-react";
import {
  getAccounts, createAccount, updateAccount, deleteAccount, seedDefaultAccounts,
  getJournalEntries, createJournalEntry, postJournalEntry, reverseJournalEntry,
  getTrialBalance, getLedger,
  getIncomeStatement, getBalanceSheet, getArAging,
} from "../../services/accounting";
import { withAuthHeaders } from "../../services/apiAuth";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Philippine Peso formatter — used throughout the PH accounting module
const fmt = (v) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(v || 0);
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
};
const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "cogs", "expense"];
const TYPE_COLOR = {
  asset: "text-blue-400 bg-blue-900/30",
  liability: "text-red-400 bg-red-900/30",
  equity: "text-purple-400 bg-purple-900/30",
  revenue: "text-emerald-400 bg-emerald-900/30",
  cogs: "text-amber-400 bg-amber-900/30",
  expense: "text-orange-400 bg-orange-900/30",
};

function StatusBadge({ status }) {
  const map = {
    posted: "bg-emerald-900/40 text-emerald-400",
    draft: "bg-zinc-700 text-zinc-300",
    rejected: "bg-red-900/40 text-red-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
        active ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={15} />
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-white/10"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Chart of Accounts Tab ──────────────────────────────────────────────────────

function ChartOfAccounts({ workspaceId }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ accountCode: "", name: "", accountType: "asset", description: "" });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setAccounts(await getAccounts(workspaceId, filterType !== "all" ? { type: filterType } : {})); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [workspaceId, filterType]);

  useEffect(() => { load(); }, [load]);

  async function handleSeed() {
    setSeeding(true);
    try { await seedDefaultAccounts(workspaceId); await load(); }
    catch (e) { setError(e.message); }
    finally { setSeeding(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAccount(workspaceId, form);
      setShowForm(false);
      setForm({ accountCode: "", name: "", accountType: "asset", description: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(acct) {
    try { await updateAccount(acct.id, { is_active: !acct.is_active }); await load(); }
    catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this account? This cannot be undone.")) return;
    try { await deleteAccount(id); await load(); }
    catch (e) { setError(e.message); }
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name?.toLowerCase().includes(q) || a.account_code?.toLowerCase().includes(q);
  });

  const grouped = ACCOUNT_TYPES.reduce((acc, t) => {
    acc[t] = filtered.filter(a => a.account_type === t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="all">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <button onClick={handleSeed} disabled={seeding}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors disabled:opacity-50">
          <Layers size={14} /> {seeding ? "Seeding…" : "Seed Defaults"}
        </button>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 rounded-lg text-sm text-white transition-opacity">
          <PlusCircle size={14} /> New Account
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Account</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Account Code *</label>
              <input required value={form.accountCode} onChange={e => setForm(f => ({ ...f, accountCode: e.target.value }))}
                placeholder="e.g. 1000"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cash & Equivalents"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Type *</label>
              <select required value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? "Saving…" : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Loading accounts…</div>
      ) : (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map(type => {
            const items = grouped[type];
            if (!items?.length) return null;
            return (
              <div key={type} className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_COLOR[type]}`}>
                    {type}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{items.length} accounts</span>
                </div>
                <div className="divide-y divide-white/5">
                  {items.map(acct => (
                    <div key={acct.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/3 transition-colors">
                      <span className="text-xs font-mono text-[var(--text-muted)] w-16">{acct.account_code}</span>
                      <div className="flex-1">
                        <span className="text-sm text-white">{acct.name}</span>
                        {acct.description && <p className="text-xs text-[var(--text-muted)]">{acct.description}</p>}
                      </div>
                      <span className="text-sm font-mono text-white">{fmt(acct.balance)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${acct.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
                        {acct.is_active ? "Active" : "Inactive"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggle(acct)} title="Toggle active"
                          className="p-1 text-[var(--text-muted)] hover:text-white transition-colors">
                          {acct.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        </button>
                        <button onClick={() => handleDelete(acct.id)} title="Delete"
                          className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                          <XCircle size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p>No accounts found. Use "Seed Defaults" to add a standard Chart of Accounts.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Journal Entries Tab ────────────────────────────────────────────────────────

function JournalEntries({ workspaceId }) {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedJE, setSelectedJE] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [jeDate, setJeDate] = useState(new Date().toISOString().split("T")[0]);
  const [jeMemo, setJeMemo] = useState("");
  const [jeLines, setJeLines] = useState([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jes, accts] = await Promise.all([
        getJournalEntries(workspaceId, filterStatus !== "all" ? { status: filterStatus } : {}),
        getAccounts(workspaceId),
      ]);
      setEntries(jes);
      setAccounts(accts);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [workspaceId, filterStatus]);

  useEffect(() => { load(); }, [load]);

  function addLine() {
    setJeLines(l => [...l, { accountId: "", debit: "", credit: "", description: "" }]);
  }

  function removeLine(i) {
    if (jeLines.length <= 2) return;
    setJeLines(l => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i, field, value) {
    setJeLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  }

  const totalDebits = jeLines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
  const totalCredits = jeLines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  async function handleCreate(e) {
    e.preventDefault();
    if (!isBalanced) { setError("Journal entry does not balance: debits must equal credits"); return; }
    setSaving(true);
    setError("");
    try {
      await createJournalEntry(workspaceId, {
        entryDate: jeDate,
        memo: jeMemo,
        lines: jeLines.filter(l => l.accountId).map(l => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit || 0),
          credit: parseFloat(l.credit || 0),
          description: l.description,
        })),
      });
      setShowForm(false);
      setJeMemo("");
      setJeLines([
        { accountId: "", debit: "", credit: "", description: "" },
        { accountId: "", debit: "", credit: "", description: "" },
      ]);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handlePost(id) {
    try { await postJournalEntry(id); await load(); }
    catch (e) { setError(e.message); }
  }

  async function handleReverse(id) {
    if (!confirm("Create a reversal entry for this journal entry?")) return;
    try { await reverseJournalEntry(id, { reversalDate: new Date().toISOString().split("T")[0] }); await load(); }
    catch (e) { setError(e.message); }
  }

  const filtered = entries.filter(je => {
    const q = search.toLowerCase();
    return !q || je.memo?.toLowerCase().includes(q) || je.je_number?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search journal entries…"
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
        </select>
        <button onClick={() => load()} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
          <RefreshCw size={15} />
        </button>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 rounded-lg text-sm text-white transition-opacity">
          <PlusCircle size={14} /> New Journal Entry
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileText size={15} /> New Journal Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Date *</label>
              <input type="date" required value={jeDate} onChange={e => setJeDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Memo</label>
              <input value={jeMemo} onChange={e => setJeMemo(e.target.value)} placeholder="Description"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-[var(--text-muted)] px-2">
              <span className="col-span-4">Account</span>
              <span className="col-span-2">Debit</span>
              <span className="col-span-2">Credit</span>
              <span className="col-span-3">Description</span>
            </div>
            {jeLines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select value={line.accountId} onChange={e => updateLine(i, "accountId", e.target.value)}
                  className="col-span-4 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
                  <option value="">Select account…</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_code} — {a.name}</option>
                  ))}
                </select>
                <input type="number" min="0" step="0.01" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)}
                  placeholder="0.00"
                  className="col-span-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none" />
                <input type="number" min="0" step="0.01" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)}
                  placeholder="0.00"
                  className="col-span-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none" />
                <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)}
                  placeholder="Note"
                  className="col-span-3 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none" />
                <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-[var(--text-muted)] hover:text-red-400">
                  <XCircle size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addLine}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity mt-1">
              <PlusCircle size={12} /> Add line
            </button>
          </div>

          {/* Balance check */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isBalanced ? "bg-emerald-900/20 text-emerald-400" : "bg-red-900/20 text-red-400"}`}>
            {isBalanced ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            Debits: {fmt(totalDebits)} / Credits: {fmt(totalCredits)}
            {!isBalanced && " — Entry does not balance"}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white">Cancel</button>
            <button type="submit" disabled={saving || !isBalanced}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-40">
              {saving ? "Saving…" : "Create Draft"}
            </button>
          </div>
        </form>
      )}

      {/* JE List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Loading…</div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">JE #</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Memo</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(je => (
                <tr key={je.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--accent)]">{je.je_number}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{je.entry_date}</td>
                  <td className="px-4 py-3 text-white max-w-xs truncate">{je.memo || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{fmt(je.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={je.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => setSelectedJE(je)} title="View" className="p-1 text-[var(--text-muted)] hover:text-white"><Eye size={13} /></button>
                      {je.status === "draft" && (
                        <button onClick={() => handlePost(je.id)} title="Post" className="p-1 text-[var(--text-muted)] hover:text-emerald-400"><CheckCircle size={13} /></button>
                      )}
                      {je.status === "posted" && !je.reversed_by_je_id && (
                        <button onClick={() => handleReverse(je.id)} title="Reverse" className="p-1 text-[var(--text-muted)] hover:text-amber-400"><RotateCcw size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No journal entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selectedJE && (
        <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={() => setSelectedJE(null)}>
          <div className="bg-[var(--bg-card)] border-l border-white/10 h-full w-full max-w-lg p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">{selectedJE.je_number}</h3>
              <button onClick={() => setSelectedJE(null)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={16} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[var(--text-muted)]">Date</span><p className="text-white">{selectedJE.entry_date}</p></div>
                <div><span className="text-[var(--text-muted)]">Status</span><p><StatusBadge status={selectedJE.status} /></p></div>
                <div className="col-span-2"><span className="text-[var(--text-muted)]">Memo</span><p className="text-white">{selectedJE.memo || "—"}</p></div>
              </div>
              {selectedJE.lines?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Lines</p>
                  <div className="space-y-1">
                    {selectedJE.lines.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-white/5 rounded p-2">
                        <span className="text-[var(--text-muted)] flex-1">{l.account?.account_code} {l.account?.name}</span>
                        {l.debit > 0 && <span className="text-blue-400">Dr {fmt(l.debit)}</span>}
                        {l.credit > 0 && <span className="text-emerald-400">Cr {fmt(l.credit)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trial Balance Tab ──────────────────────────────────────────────────────────

function TrialBalance({ workspaceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setData(await getTrialBalance(workspaceId)); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [workspaceId]);

  if (loading) return <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /></div>;
  if (error) return <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${data.isBalanced ? "bg-emerald-900/20 text-emerald-400 border border-emerald-500/20" : "bg-red-900/20 text-red-400 border border-red-500/20"}`}>
        {data.isBalanced ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        Trial Balance is {data.isBalanced ? "balanced ✓" : "NOT balanced — investigate journal entries"}
        <span className="ml-auto text-xs">Total Debits: {fmt(data.totalDebits)} | Total Credits: {fmt(data.totalCredits)}</span>
      </div>

      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-xs text-[var(--text-muted)]">
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Account</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Debit</th>
              <th className="text-right px-4 py-3">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data.accounts || []).map(acct => {
              const isDebitNormal = ['asset', 'expense', 'cogs'].includes(acct.account_type);
              const debit = isDebitNormal && acct.balance > 0 ? acct.balance : 0;
              const credit = !isDebitNormal && acct.balance > 0 ? acct.balance : 0;
              if (acct.balance === 0) return null;
              return (
                <tr key={acct.account_code} className="hover:bg-white/3">
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{acct.account_code}</td>
                  <td className="px-4 py-2.5 text-white">{acct.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLOR[acct.account_type]}`}>
                      {acct.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{debit > 0 ? fmt(debit) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{credit > 0 ? fmt(credit) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-white/10 bg-white/3">
            <tr className="text-sm font-semibold text-white">
              <td colSpan={3} className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-right font-mono text-blue-400">{fmt(data.totalDebits)}</td>
              <td className="px-4 py-3 text-right font-mono text-emerald-400">{fmt(data.totalCredits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Income Statement Tab ──────────────────────────────────────────────────────

function IncomeStatement({ workspaceId }) {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const result = await getIncomeStatement(workspaceId);
      if (result) setData(result);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const getAiInsights = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/ai/accounting/financial-insights`, {
        method: "POST",
        headers: await withAuthHeaders({ "Content-Type": "application/json" }, workspaceId),
        body: JSON.stringify({ incomeStatement: data }),
      });
      const json = await res.json();
      if (json.success) setInsights(json.data);
    } catch { /* ignore */ } finally { setAiLoading(false); }
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading Income Statement…</div>;
  if (!data) return null;

  const Row = ({ label, value, sub, bold, color }) => (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${bold ? "bg-white/5 font-semibold" : "hover:bg-white/5"}`}>
      <span className={`text-sm ${sub ? "pl-4 text-[var(--text-muted)]" : "text-white"}`}>{label}</span>
      <span className={`text-sm font-mono ${color || (bold ? "text-white" : "text-[var(--text-muted)]")}`}>{fmt(value)}</span>
    </div>
  );

  const healthColor = data.netIncome >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="space-y-4">
      {/* AI Insights Banner */}
      {insights ? (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm"><Brain size={16} />{insights.headline}</div>
          {insights.tax_notes && <p className="text-xs text-amber-300 bg-amber-900/20 rounded-lg p-2 border border-amber-500/20">🇵🇭 BIR Note: {insights.tax_notes}</p>}
          <ul className="space-y-1">{(insights.insights || []).map((i, idx) => <li key={idx} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400">✓</span>{i}</li>)}</ul>
        </div>
      ) : (
        <button onClick={getAiInsights} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm hover:bg-indigo-600/30 transition-all">
          {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {aiLoading ? "Generating AI Insights…" : "Get AI Financial Insights (PH CPA-level)"}
        </button>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: data.revenue?.total, color: "text-emerald-400", icon: TrendingUp },
          { label: "Gross Profit", value: data.grossProfit, sub: `${data.grossMarginPct}% margin`, color: "text-blue-400", icon: BarChart3 },
          { label: "Total Expenses", value: data.expenses?.total, color: "text-red-400", icon: DollarSign },
          { label: "Net Income", value: data.netIncome, sub: `${data.netMarginPct}% net margin`, color: healthColor, icon: Scale },
        ].map(k => (
          <div key={k.label} className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><k.icon size={14} className={k.color} /><span className="text-xs text-[var(--text-muted)]">{k.label}</span></div>
            <div className={`text-lg font-bold ${k.color}`}>{fmtShort(k.value)}</div>
            {k.sub && <div className="text-xs text-[var(--text-muted)] mt-0.5">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* IS Detail */}
      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold text-white text-sm flex items-center gap-2"><FileText size={15} />Income Statement — As of {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
          <button onClick={load} className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
        </div>
        <div className="p-4 space-y-1">
          <Row label="REVENUE" value="" bold />
          {(data.revenue?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
          <Row label="Total Revenue" value={data.revenue?.total} bold color="text-emerald-400" />
          <div className="h-3" />
          <Row label="COST OF GOODS SOLD" value="" bold />
          {(data.cogs?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
          <Row label="Total COGS" value={data.cogs?.total} bold color="text-amber-400" />
          <Row label="GROSS PROFIT" value={data.grossProfit} bold color={data.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"} />
          <div className="h-3" />
          <Row label="OPERATING EXPENSES" value="" bold />
          {(data.expenses?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
          <Row label="Total Expenses" value={data.expenses?.total} bold color="text-red-400" />
          <div className="h-1 border-t border-white/10 my-2" />
          <Row label="NET INCOME / (LOSS)" value={data.netIncome} bold color={healthColor} />
        </div>
      </div>
    </div>
  );
}

// ── Balance Sheet Tab ─────────────────────────────────────────────────────────

function BalanceSheet({ workspaceId }) {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [bs, is] = await Promise.all([
        getBalanceSheet(workspaceId),
        getIncomeStatement(workspaceId),
      ]);
      if (bs) setData({ balanceSheet: bs, incomeStatement: is });
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const getAiInsights = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/ai/accounting/financial-insights`, {
        method: "POST",
        headers: await withAuthHeaders({ "Content-Type": "application/json" }, workspaceId),
        body: JSON.stringify({ balanceSheet: data.balanceSheet, incomeStatement: data.incomeStatement }),
      });
      const json = await res.json();
      if (json.success) setInsights(json.data);
    } catch { /* ignore */ } finally { setAiLoading(false); }
  };

  if (loading) return <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading Balance Sheet…</div>;
  if (!data?.balanceSheet) return null;

  const bs = data.balanceSheet;
  const Row = ({ label, value, sub, bold, color }) => (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${bold ? "bg-white/5 font-semibold" : "hover:bg-white/5"}`}>
      <span className={`text-sm ${sub ? "pl-4 text-[var(--text-muted)]" : "text-white"}`}>{label}</span>
      <span className={`text-sm font-mono ${color || (bold ? "text-white" : "text-[var(--text-muted)]")}`}>{value !== "" ? fmt(value) : ""}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {insights ? (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm"><Brain size={16} />{insights.headline}</div>
          {insights.tax_notes && <p className="text-xs text-amber-300 bg-amber-900/20 rounded-lg p-2 border border-amber-500/20">🇵🇭 BIR Note: {insights.tax_notes}</p>}
          {(insights.recommended_actions || []).map((a, i) => <p key={i} className="text-xs text-slate-300">→ {a}</p>)}
        </div>
      ) : (
        <button onClick={getAiInsights} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm hover:bg-indigo-600/30 transition-all">
          {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {aiLoading ? "Analyzing Balance Sheet…" : "AI Balance Sheet Analysis (PH CPA-level)"}
        </button>
      )}

      {/* Balance Check */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${bs.isBalanced ? "bg-emerald-900/20 border border-emerald-500/20 text-emerald-400" : "bg-red-900/20 border border-red-500/20 text-red-400"}`}>
        {bs.isBalanced ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
        {bs.isBalanced ? "Balance Sheet is balanced — Assets = Liabilities + Equity ✓" : "⚠ IMBALANCE DETECTED — Please review journal entries"}
        <span className="ml-auto text-xs opacity-70">As of {bs.asOf}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Assets */}
        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-white/10 bg-blue-900/10"><span className="text-blue-400 font-semibold text-sm flex items-center gap-2"><Building2 size={14} />ASSETS</span></div>
          <div className="p-3 space-y-1">
            {(bs.assets?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
            <Row label="TOTAL ASSETS" value={bs.assets?.total} bold color="text-blue-400" />
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-red-900/10"><span className="text-red-400 font-semibold text-sm">LIABILITIES</span></div>
            <div className="p-3 space-y-1">
              {(bs.liabilities?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
              <Row label="TOTAL LIABILITIES" value={bs.liabilities?.total} bold color="text-red-400" />
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-purple-900/10"><span className="text-purple-400 font-semibold text-sm">EQUITY</span></div>
            <div className="p-3 space-y-1">
              {(bs.equity?.accounts || []).map(a => <Row key={a.account_code} label={`${a.account_code} — ${a.name}`} value={a.balance} sub />)}
              <Row label="Retained Earnings (Current Period)" value={bs.equity?.retainedEarnings} sub />
              <Row label="TOTAL EQUITY" value={bs.equity?.total} bold color="text-purple-400" />
              <Row label="TOTAL LIABILITIES + EQUITY" value={bs.totalLiabilitiesAndEquity} bold color={bs.isBalanced ? "text-emerald-400" : "text-red-400"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AR Aging Tab ──────────────────────────────────────────────────────────────

function ARAgingReport({ workspaceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const result = await getArAging(workspaceId);
      if (result) setData(result);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading AR Aging…</div>;
  if (!data) return null;

  const BUCKETS = [
    { key: "current",   label: "Current",    color: "text-emerald-400", bg: "bg-emerald-900/20" },
    { key: "days1_30",  label: "1–30 Days",  color: "text-yellow-400",  bg: "bg-yellow-900/20" },
    { key: "days31_60", label: "31–60 Days", color: "text-orange-400",  bg: "bg-orange-900/20" },
    { key: "days61_90", label: "61–90 Days", color: "text-red-400",     bg: "bg-red-900/20" },
    { key: "over90",    label: "Over 90",    color: "text-red-600",     bg: "bg-red-950/30" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><Clock size={16} className="text-amber-400" />Accounts Receivable Aging</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">As of {data.asOf} · Total Outstanding: <span className="text-red-400 font-semibold">{fmt(data.totalOutstanding)}</span></p>
        </div>
        <button onClick={load} className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
      </div>

      {/* Bucket summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {BUCKETS.map(b => (
          <div key={b.key} className={`${b.bg} border border-white/10 rounded-xl p-3`}>
            <div className={`text-xs font-medium mb-1 ${b.color}`}>{b.label}</div>
            <div className={`text-lg font-bold ${b.color}`}>{fmtShort(data.buckets[b.key]?.total)}</div>
            <div className="text-xs text-[var(--text-muted)]">{data.buckets[b.key]?.invoices?.length || 0} invoice{data.buckets[b.key]?.invoices?.length !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      {/* Invoice detail per bucket */}
      {BUCKETS.filter(b => (data.buckets[b.key]?.invoices?.length || 0) > 0).map(b => (
        <div key={b.key} className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
          <div className={`p-3 border-b border-white/10 ${b.bg} flex items-center justify-between`}>
            <span className={`text-sm font-semibold ${b.color}`}>{b.label} — {data.buckets[b.key].invoices.length} Invoice(s)</span>
            <span className={`text-sm font-mono font-bold ${b.color}`}>{fmt(data.buckets[b.key].total)}</span>
          </div>
          <div className="divide-y divide-white/5">
            {data.buckets[b.key].invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5">
                <div>
                  <span className="text-white font-medium">{inv.invoice_number}</span>
                  <span className="text-[var(--text-muted)] ml-3 text-xs">Due: {new Date(inv.due_date).toLocaleDateString("en-PH")}</span>
                  {inv.daysOverdue > 0 && <span className={`ml-2 text-xs ${b.color}`}>{inv.daysOverdue}d overdue</span>}
                </div>
                <span className={`font-mono font-semibold ${b.color}`}>{fmt(inv.balance_due)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {data.totalOutstanding === 0 && (
        <div className="text-center py-8 text-emerald-400"><CheckCircle size={32} className="mx-auto mb-2" /><p className="font-semibold">No outstanding receivables</p><p className="text-xs text-[var(--text-muted)] mt-1">All invoices are current or paid.</p></div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "coa", label: "Chart of Accounts", icon: BookOpen },
  { id: "je",  label: "Journal Entries",   icon: FileText },
  { id: "tb",  label: "Trial Balance",     icon: Scale },
  { id: "is",  label: "Income Statement",  icon: TrendingUp },
  { id: "bs",  label: "Balance Sheet",     icon: BarChart3 },
  { id: "ar",  label: "AR Aging",          icon: Clock },
];

export default function AdminAccounting() {
  const [tab, setTab] = useState("coa");
  const workspaceId = localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id") || "";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-[var(--accent)]" />
            Accounting
            <span className="text-xs font-normal bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">🇵🇭 BIR-Compliant</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Double-Entry · Chart of Accounts · Financial Statements · AR Aging · AI Insights
          </p>
        </div>
      </div>

      {!workspaceId && (
        <div className="text-amber-400 text-sm bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle size={16} /> Workspace ID not detected. Please sign in to load live accounting data.
        </div>
      )}

      {/* Tabs — scrollable on mobile */}
      <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-white/10 rounded-xl p-1 overflow-x-auto w-full">
        {TABS.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {tab === "coa" && <ChartOfAccounts workspaceId={workspaceId} />}
      {tab === "je"  && <JournalEntries  workspaceId={workspaceId} />}
      {tab === "tb"  && <TrialBalance    workspaceId={workspaceId} />}
      {tab === "is"  && <IncomeStatement workspaceId={workspaceId} />}
      {tab === "bs"  && <BalanceSheet    workspaceId={workspaceId} />}
      {tab === "ar"  && <ARAgingReport   workspaceId={workspaceId} />}
    </div>
  );
}
