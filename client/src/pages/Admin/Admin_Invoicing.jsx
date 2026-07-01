import { useEffect, useState, useCallback } from "react";
import { withAuthHeaders } from "../../services/apiAuth";
import {
  FileText, PlusCircle, RefreshCw, Search, CheckCircle, XCircle,
  Send, DollarSign, Eye, AlertCircle, Clock, TrendingUp,
  CreditCard, Receipt, Package, Sparkles, Brain,
  ShieldCheck, Trash2, Plus,
} from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(await withAuthHeaders(options.headers)), ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
  return json;
}

const fmt = (v) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";

const PH_PAYMENT_METHODS = {
  gcash:         { label: "GCash",         icon: "📱", color: "text-blue-400" },
  maya:          { label: "Maya",          icon: "💙", color: "text-cyan-400" },
  bank_transfer: { label: "Bank Transfer", icon: "🏦", color: "text-emerald-400" },
  cash:          { label: "Cash",          icon: "💵", color: "text-yellow-400" },
  check:         { label: "Check",         icon: "📄", color: "text-slate-400" },
  credit_card:   { label: "Credit Card",   icon: "💳", color: "text-purple-400" },
  other:         { label: "Other",         icon: "🔁", color: "text-zinc-400" },
};

function PaymentMethodBadge({ method }) {
  const pm = PH_PAYMENT_METHODS[method] || PH_PAYMENT_METHODS.other;
  return (
    <span className={`text-xs flex items-center gap-1 ${pm.color}`}>
      <span>{pm.icon}</span>{pm.label}
    </span>
  );
}

const STATUS_PIPELINE = ["draft", "sent", "viewed", "partial", "paid"];
function InvoiceStatusPipeline({ status }) {
  const idx = STATUS_PIPELINE.indexOf(status);
  if (status === "overdue") return <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />Overdue</span>;
  if (status === "cancelled" || status === "void") return <span className="text-xs text-zinc-500">{status}</span>;
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_PIPELINE.map((s, i) => (
        <div key={s} title={s} className={`h-1.5 w-5 rounded-full transition-all ${i <= idx ? "bg-[var(--accent)]" : "bg-white/10"}`} />
      ))}
      <span className="ml-1.5 text-xs text-[var(--text-muted)] capitalize">{status}</span>
    </div>
  );
}

const STATUS_COLOR = {
  draft:     "bg-zinc-700 text-zinc-300",
  sent:      "bg-blue-900/40 text-blue-400",
  viewed:    "bg-purple-900/40 text-purple-400",
  paid:      "bg-emerald-900/40 text-emerald-400",
  partial:   "bg-amber-900/40 text-amber-400",
  overdue:   "bg-red-900/40 text-red-400",
  cancelled: "bg-zinc-700/60 text-zinc-500",
  accepted:  "bg-emerald-900/40 text-emerald-400",
  declined:  "bg-red-900/40 text-red-400",
  expired:   "bg-orange-900/40 text-orange-400",
};

function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] || "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function KPICard({ icon: Icon, label, value, sub, color = "text-[var(--accent)]" }) {
  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={color} />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-[var(--accent)] text-black" : "text-[var(--text-muted)] hover:text-white"}`}>
      <Icon size={14} />{label}
    </button>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`bg-[var(--bg-card)] border border-white/10 rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[var(--bg-card)] z-10">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white"><XCircle size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function InputRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-[var(--bg-secondary,#0f172a)] border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]";
const selectCls = `${inputCls} cursor-pointer`;

const EWT_RATES = [
  { value: 0,  label: "None (0%)" },
  { value: 1,  label: "1% — Goods/Services (small supplier)" },
  { value: 2,  label: "2% — Goods/Services" },
  { value: 5,  label: "5% — Professional fees" },
  { value: 10, label: "10% — Professional fees (VAT-registered)" },
  { value: 15, label: "15% — Rentals" },
  { value: 20, label: "20% — Bank interest" },
  { value: 25, label: "25% — Non-residents" },
];

// ── Create Invoice Modal ──────────────────────────────────────────────────────
function CreateInvoiceModal({ workspaceId, onClose, onCreated }) {
  const today = new Date().toISOString().split("T")[0];
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    client_name: "", client_email: "", client_tin: "", client_address: "",
    issue_date: today, due_date: due30,
    vat_type: "exclusive", ewt_rate: 0,
    bir_or_number: "", notes: "",
  });
  const [lines, setLines] = useState([{ description: "", qty: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
  const vatAmount = form.vat_type === "exclusive" ? subtotal * 0.12
    : form.vat_type === "inclusive" ? subtotal - subtotal / 1.12 : 0;
  const netAmount = form.vat_type === "exclusive" ? subtotal : subtotal / 1.12;
  const ewtAmount = netAmount * (form.ewt_rate / 100);
  const grossPlusVat = form.vat_type === "exclusive" ? subtotal + vatAmount : subtotal;
  const total = grossPlusVat - ewtAmount;

  const addLine = () => setLines(p => [...p, { description: "", qty: 1, unit_price: 0 }]);
  const removeLine = (i) => setLines(p => p.filter((_, idx) => idx !== i));
  const updateLine = (i, k, v) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  async function submit() {
    if (!form.client_name) return setError("Client name is required.");
    if (lines.every(l => !l.description)) return setError("Add at least one line item.");
    setSaving(true); setError("");
    try {
      await apiFetch("/invoicing/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...form, workspaceId,
          subtotal, vat_amount: vatAmount, ewt_amount: ewtAmount, total_amount: total,
          line_items: lines.filter(l => l.description),
        }),
      });
      onCreated(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="New BIR-Compliant Invoice 🇵🇭" onClose={onClose} wide>
      <div className="space-y-5">
        {/* Client */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Client Information</p>
          <div className="grid grid-cols-2 gap-3">
            <InputRow label="Client Name *">
              <input value={form.client_name} onChange={e => f("client_name", e.target.value)} placeholder="Juan dela Cruz / ABC Corp" className={inputCls} />
            </InputRow>
            <InputRow label="Client Email">
              <input value={form.client_email} onChange={e => f("client_email", e.target.value)} placeholder="client@example.com" className={inputCls} />
            </InputRow>
            <InputRow label="Client TIN (BIR)">
              <input value={form.client_tin} onChange={e => f("client_tin", e.target.value)} placeholder="000-000-000-000" className={inputCls} />
            </InputRow>
            <InputRow label="BIR OR / SI Number">
              <input value={form.bir_or_number} onChange={e => f("bir_or_number", e.target.value)} placeholder="SI-2024-0001" className={inputCls} />
            </InputRow>
          </div>
          <div className="mt-3">
            <InputRow label="Client Address">
              <input value={form.client_address} onChange={e => f("client_address", e.target.value)} placeholder="Makati City, Metro Manila" className={inputCls} />
            </InputRow>
          </div>
        </div>

        {/* Dates & Tax */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dates & Tax Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <InputRow label="Issue Date">
              <input type="date" value={form.issue_date} onChange={e => f("issue_date", e.target.value)} className={inputCls} />
            </InputRow>
            <InputRow label="Due Date">
              <input type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} className={inputCls} />
            </InputRow>
            <InputRow label="VAT Type">
              <select value={form.vat_type} onChange={e => f("vat_type", e.target.value)} className={selectCls}>
                <option value="exclusive">VAT-Exclusive (+12% on top)</option>
                <option value="inclusive">VAT-Inclusive (12% already in price)</option>
                <option value="zero_rated">Zero-Rated (0%)</option>
                <option value="exempt">VAT-Exempt</option>
              </select>
            </InputRow>
            <InputRow label="EWT Rate (BIR RR 2-98)">
              <select value={form.ewt_rate} onChange={e => f("ewt_rate", Number(e.target.value))} className={selectCls}>
                {EWT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </InputRow>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Line Items</p>
            <button onClick={addLine} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80">
              <Plus size={12} /> Add Line
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-[var(--text-muted)] px-1">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-3 text-right">Unit Price (₱)</span>
              <span className="col-span-1" />
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={l.description} onChange={e => updateLine(i, "description", e.target.value)}
                  placeholder="Service or product description" className={`${inputCls} col-span-6`} />
                <input type="number" value={l.qty} onChange={e => updateLine(i, "qty", Number(e.target.value))}
                  min={1} className={`${inputCls} col-span-2 text-right`} />
                <input type="number" value={l.unit_price} onChange={e => updateLine(i, "unit_price", Number(e.target.value))}
                  min={0} step="0.01" className={`${inputCls} col-span-3 text-right`} />
                <button onClick={() => removeLine(i)} disabled={lines.length === 1}
                  className="col-span-1 flex justify-center text-zinc-600 hover:text-red-400 disabled:opacity-20">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tax summary */}
        <div className="bg-[var(--bg-secondary,#0f172a)] border border-white/5 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-[var(--text-muted)]"><span>Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>
          {form.vat_type !== "exempt" && form.vat_type !== "zero_rated" && (
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>VAT 12% ({form.vat_type})</span>
              <span className="font-mono">{fmt(vatAmount)}</span>
            </div>
          )}
          {ewtAmount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>EWT {form.ewt_rate}% (to be withheld)</span>
              <span className="font-mono">-{fmt(ewtAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2">
            <span>Total Due</span>
            <span className="font-mono text-[var(--accent)]">{fmt(total)}</span>
          </div>
        </div>

        <InputRow label="Notes / Payment Terms">
          <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2}
            placeholder="e.g. Payment due within 30 days. Please pay via GCash 0917-XXX-XXXX."
            className={`${inputCls} resize-none`} />
        </InputRow>

        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg text-[var(--text-muted)] hover:text-white">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 px-4 py-2 text-sm bg-[var(--accent)] text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
function RecordPaymentModal({ invoice, workspaceId, onClose, onRecorded }) {
  const outstanding = invoice.total_amount - (invoice.amount_paid || 0);
  const [form, setForm] = useState({
    amount: outstanding,
    payment_method: "gcash",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const refPlaceholder = {
    gcash: "GCash transaction ID (e.g. 4289xxxxxxxx)",
    maya: "Maya reference number",
    bank_transfer: "Bank transfer reference / trace number",
    check: "Check number",
    credit_card: "Approval code",
    cash: "OR number",
    other: "Reference number",
  }[form.payment_method] || "Reference number";

  async function submit() {
    if (!form.amount || form.amount <= 0) return setError("Enter a valid amount.");
    setSaving(true); setError("");
    try {
      await apiFetch(`/invoicing/invoices/${invoice.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ ...form, workspaceId }),
      });
      onRecorded(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Record Payment — ${invoice.invoice_number}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Outstanding Balance</p>
            <p className="text-xl font-bold text-amber-400">{fmt(outstanding)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Invoice Total</p>
            <p className="text-sm text-white">{fmt(invoice.total_amount)}</p>
          </div>
        </div>

        <InputRow label="Payment Method">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PH_PAYMENT_METHODS).map(([key, pm]) => (
              <button key={key} onClick={() => f("payment_method", key)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${form.payment_method === key ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white" : "border-white/10 text-[var(--text-muted)] hover:border-white/30"}`}>
                <span className="text-lg">{pm.icon}</span>
                <span>{pm.label}</span>
              </button>
            ))}
          </div>
        </InputRow>

        <div className="grid grid-cols-2 gap-3">
          <InputRow label="Amount Received (₱)">
            <input type="number" value={form.amount} onChange={e => f("amount", Number(e.target.value))}
              min={0} step="0.01" className={inputCls} />
          </InputRow>
          <InputRow label="Payment Date">
            <input type="date" value={form.payment_date} onChange={e => f("payment_date", e.target.value)} className={inputCls} />
          </InputRow>
        </div>

        <InputRow label="Reference / Transaction Number">
          <input value={form.reference_number} onChange={e => f("reference_number", e.target.value)}
            placeholder={refPlaceholder} className={inputCls} />
        </InputRow>

        <InputRow label="Notes (optional)">
          <input value={form.notes} onChange={e => f("notes", e.target.value)} placeholder="e.g. Partial payment for milestone 1" className={inputCls} />
        </InputRow>

        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg text-[var(--text-muted)] hover:text-white">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50">
            {saving ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────────────
function InvoicesTab({ workspaceId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ workspaceId });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search) params.set("search", search);
      const res = await apiFetch(`/invoicing/invoices?${params}`);
      setInvoices(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [workspaceId, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  async function handleSend(id) {
    try {
      await apiFetch(`/invoicing/invoices/${id}/send`, { method: "POST" });
      await load();
    } catch (e) { setError(e.message); }
  }

  const totalOutstanding = invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status))
    .reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
  const overdue = invoices.filter(i => i.status === "overdue").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KPICard icon={FileText}    label="Total Invoices"  value={invoices.length} color="text-blue-400" />
        <KPICard icon={DollarSign}  label="Outstanding"     value={fmt(totalOutstanding)} color="text-amber-400" />
        <KPICard icon={CheckCircle} label="Collected"       value={fmt(totalPaid)} color="text-emerald-400" />
        <KPICard icon={AlertCircle} label="Overdue"         value={overdue} sub="past due" color="text-red-400" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…"
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white focus:outline-none">
          <option value="all">All Status</option>
          {["draft","sent","viewed","paid","partial","overdue","cancelled"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <button onClick={load} className="p-2 text-[var(--text-muted)] hover:text-white"><RefreshCw size={15} /></button>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black text-sm font-semibold rounded-lg hover:opacity-90">
          <PlusCircle size={14} /> New Invoice
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">Invoice #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Progress</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--accent)]">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-white">{inv.client_name || inv.client_email || "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3"><InvoiceStatusPipeline status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 justify-end">
                      <button onClick={() => { setSelected(inv); setShowPayment(false); }} title="View"
                        className="p-1 text-[var(--text-muted)] hover:text-white"><Eye size={13} /></button>
                      {inv.status === "draft" && (
                        <button onClick={() => handleSend(inv.id)} title="Send"
                          className="p-1 text-[var(--text-muted)] hover:text-blue-400"><Send size={13} /></button>
                      )}
                      {["sent","viewed","partial","overdue"].includes(inv.status) && (
                        <button onClick={() => { setSelected(inv); setShowPayment(true); }} title="Record Payment"
                          className="p-1 text-[var(--text-muted)] hover:text-emerald-400"><CreditCard size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                  No invoices yet.{" "}
                  <button onClick={() => setShowCreate(true)} className="text-[var(--accent)] hover:underline">
                    Create your first invoice →
                  </button>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoice detail slide-over */}
      {selected && !showPayment && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelected(null)}>
          <div className="ml-auto bg-[var(--bg-card)] border-l border-white/10 h-full w-full max-w-md p-6 overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">{selected.invoice_number}</h3>
                <div className="mt-1"><InvoiceStatusPipeline status={selected.status} /></div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={16} /></button>
            </div>

            <div className="space-y-4 text-sm">
              {/* BIR section */}
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <ShieldCheck size={11} /> BIR Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-[var(--text-muted)]">Client TIN</p><p className="text-white font-mono">{selected.client_tin || "—"}</p></div>
                  <div><p className="text-[var(--text-muted)]">OR / SI Number</p><p className="text-white font-mono">{selected.bir_or_number || "—"}</p></div>
                  <div><p className="text-[var(--text-muted)]">VAT Type</p><p className="text-white capitalize">{(selected.vat_type || "").replace(/_/g," ")}</p></div>
                  <div><p className="text-[var(--text-muted)]">EWT Rate</p><p className="text-white">{selected.ewt_rate || 0}%</p></div>
                </div>
              </div>

              {/* Client & dates */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-[var(--text-muted)]">Client</p><p className="text-white">{selected.client_name || "—"}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Email</p><p className="text-white text-xs">{selected.client_email || "—"}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Issue Date</p><p className="text-white">{fmtDate(selected.issue_date)}</p></div>
                <div><p className="text-xs text-[var(--text-muted)]">Due Date</p><p className="text-white">{fmtDate(selected.due_date)}</p></div>
              </div>

              {/* Tax breakdown */}
              <div className="bg-[var(--bg-secondary,#0f172a)] rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-[var(--text-muted)] text-xs"><span>Subtotal</span><span className="font-mono">{fmt(selected.subtotal)}</span></div>
                <div className="flex justify-between text-[var(--text-muted)] text-xs"><span>VAT (12%)</span><span className="font-mono">{fmt(selected.vat_amount)}</span></div>
                {selected.ewt_amount > 0 && (
                  <div className="flex justify-between text-amber-400 text-xs"><span>EWT Withheld</span><span className="font-mono">-{fmt(selected.ewt_amount)}</span></div>
                )}
                <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2">
                  <span>Total Due</span><span className="font-mono text-[var(--accent)]">{fmt(selected.total_amount)}</span>
                </div>
                {(selected.amount_paid || 0) > 0 && (
                  <div className="flex justify-between text-emerald-400 text-xs"><span>Amount Paid</span><span className="font-mono">{fmt(selected.amount_paid)}</span></div>
                )}
              </div>

              {selected.notes && (
                <div><p className="text-xs text-[var(--text-muted)]">Notes</p><p className="text-white text-xs mt-1">{selected.notes}</p></div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {["sent","viewed","partial","overdue"].includes(selected.status) && (
                  <button onClick={() => setShowPayment(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500">
                    <CreditCard size={13} /> Record Payment
                  </button>
                )}
                {selected.status === "draft" && (
                  <button onClick={() => handleSend(selected.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500">
                    <Send size={13} /> Send Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal workspaceId={workspaceId} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {showPayment && selected && (
        <RecordPaymentModal invoice={selected} workspaceId={workspaceId}
          onClose={() => setShowPayment(false)}
          onRecorded={() => { setShowPayment(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}

// ── Quotes Tab ────────────────────────────────────────────────────────────────
function QuotesTab({ workspaceId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ workspaceId });
      if (search) params.set("search", search);
      const res = await apiFetch(`/invoicing/quotes?${params}`);
      setQuotes(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [workspaceId, search]);

  useEffect(() => { load(); }, [load]);

  async function handleConvert(id) {
    if (!confirm("Convert this quote to an invoice?")) return;
    try {
      await apiFetch(`/invoicing/quotes/${id}/convert-to-invoice`, { method: "POST" });
      await load();
    } catch (e) { setError(e.message); }
  }

  const totalValue = quotes.reduce((s, q) => s + (q.total_amount || 0), 0);
  const accepted = quotes.filter(q => q.status === "accepted").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KPICard icon={Package}     label="Total Quotes"   value={quotes.length} color="text-purple-400" />
        <KPICard icon={CheckCircle} label="Accepted"       value={accepted} color="text-emerald-400" />
        <KPICard icon={TrendingUp}  label="Pipeline Value" value={fmt(totalValue)} color="text-blue-400" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes…"
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
        <button onClick={load} className="p-2 text-[var(--text-muted)] hover:text-white"><RefreshCw size={15} /></button>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black text-sm font-semibold rounded-lg hover:opacity-90">
          <PlusCircle size={14} /> New Quote
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">Quote #</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Valid Until</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--accent)]">{q.quote_number}</td>
                  <td className="px-4 py-3 text-white">{q.client_name || q.client_email || "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmtDate(q.valid_until)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{fmt(q.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 justify-end">
                      {q.status === "accepted" && !q.converted_to_invoice_id && (
                        <button onClick={() => handleConvert(q.id)}
                          className="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg">
                          → Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                  No quotes yet.{" "}
                  <button onClick={() => setShowCreate(true)} className="text-[var(--accent)] hover:underline">
                    Create your first quote →
                  </button>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal workspaceId={workspaceId} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────
function PaymentsTab({ workspaceId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/invoicing/payments?workspaceId=${workspaceId}`);
        setPayments(res.data || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [workspaceId]);

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const byMethod = Object.entries(PH_PAYMENT_METHODS).map(([key, pm]) => ({
    ...pm, key,
    total: payments.filter(p => p.payment_method === key).reduce((s, p) => s + (p.amount || 0), 0),
    count: payments.filter(p => p.payment_method === key).length,
  })).filter(m => m.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <CreditCard size={18} className="text-emerald-400" />
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Payments Received</p>
            <p className="text-xl font-bold text-white">{fmt(total)}</p>
          </div>
          <span className="ml-auto text-sm text-[var(--text-muted)]">{payments.length} records</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">By Payment Method</p>
          <div className="flex flex-wrap gap-2">
            {byMethod.map(m => (
              <div key={m.key} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 text-xs">
                <span>{m.icon}</span>
                <span className="text-[var(--text-muted)]">{m.label}</span>
                <span className="text-white font-medium">{fmt(m.total)}</span>
              </div>
            ))}
            {byMethod.length === 0 && <span className="text-[var(--text-muted)] text-xs">No payments yet</span>}
          </div>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">Payment #</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-white/3">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--accent)]">{p.payment_number}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{p.invoice_number || p.invoice_id || "—"}</td>
                  <td className="px-4 py-3"><PaymentMethodBadge method={p.payment_method} /></td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs font-mono">{p.reference_number || "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmtDate(p.payment_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">{fmt(p.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                  No payments recorded yet. Record payments from the Invoices tab.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── AI Expense Categorizer ────────────────────────────────────────────────────
function AIExpenseCategorizer({ workspaceId }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const categorize = async () => {
    if (!desc) return;
    setLoading(true); setResult(null);
    try {
      const res = await apiFetch("/ai/accounting/categorize-expense", {
        method: "POST",
        body: JSON.stringify({ description: desc, amount: Number(amount) || 0, workspaceId }),
      });
      setResult(res.data || res);
    } catch (e) { setResult({ error: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-purple-400" />
          <span className="text-sm font-medium text-white">AI Expense Categorizer</span>
          <span className="text-xs text-purple-400 bg-purple-900/40 px-2 py-0.5 rounded-full">BIR-Aware</span>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-xs text-[var(--text-muted)] hover:text-white">
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 mt-3">
          <div className="flex gap-2">
            <input value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && categorize()}
              placeholder="Describe the expense (e.g. 'Meralco electric bill August')"
              className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₱ Amount"
              className="w-28 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500" />
            <button onClick={categorize} disabled={loading || !desc}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1.5">
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {loading ? "" : "Classify"}
            </button>
          </div>

          {result && !result.error && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-[var(--text-muted)] mb-1">Category</p>
                <p className="text-white font-medium">{result.category}</p>
                <p className="text-purple-400 mt-1">GL: {result.suggested_account_code}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-[var(--text-muted)] mb-1">Tax Treatment</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {result.vat_applicable && <span className="px-1.5 py-0.5 bg-blue-900/40 text-blue-400 rounded">{result.vat_applicable}</span>}
                  {result.ewt_applicable && <span className="px-1.5 py-0.5 bg-amber-900/40 text-amber-400 rounded">EWT {result.ewt_rate_suggestion}%</span>}
                  {result.bir_classification && <span className="px-1.5 py-0.5 bg-white/5 text-[var(--text-muted)] rounded">{result.bir_classification}</span>}
                </div>
              </div>
              {result.notes && (
                <div className="col-span-2 bg-black/20 rounded-lg p-3 text-[var(--text-muted)]">{result.notes}</div>
              )}
            </div>
          )}
          {result?.error && <p className="text-xs text-red-400">{result.error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ workspaceId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/invoicing/expenses?workspaceId=${workspaceId}`);
        setExpenses(res.data || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [workspaceId]);

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pending = expenses.filter(e => e.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KPICard icon={Receipt}     label="Total Expenses"   value={fmt(total)} color="text-orange-400" />
        <KPICard icon={Clock}       label="Pending Approval" value={pending} color="text-amber-400" />
        <KPICard icon={CheckCircle} label="Approved"         value={expenses.filter(e => e.status === "approved").length} color="text-emerald-400" />
      </div>

      <AIExpenseCategorizer workspaceId={workspaceId} />

      {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">{error}</div>}

      <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Amount (₱)</th>
                <th className="text-right px-4 py-3">VAT</th>
                <th className="text-right px-4 py-3">EWT</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-white/3">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-white/5 text-[var(--text-muted)] px-2 py-0.5 rounded-full capitalize">
                      {(e.category || "Other").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white truncate max-w-xs">{e.description || "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{fmtDate(e.expense_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-orange-400">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)]">{e.vat_amount > 0 ? fmt(e.vat_amount) : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-amber-400">{e.ewt_amount > 0 ? fmt(e.ewt_amount) : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">
                  No expenses found. Use the AI Categorizer above to classify your first expense.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "invoices", label: "Invoices",  icon: FileText },
  { id: "quotes",   label: "Quotes",    icon: Package },
  { id: "payments", label: "Payments",  icon: CreditCard },
  { id: "expenses", label: "Expenses",  icon: Receipt },
];

export default function AdminInvoicing() {
  const [tab, setTab] = useState("invoices");
  const workspaceId = localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id") || "";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={22} className="text-[var(--accent)]" />
            Invoicing & Billing
            <span className="text-xs font-normal bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              🇵🇭 VAT + EWT Ready
            </span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            BIR-Compliant Invoices · Quotes · GCash/Maya/Bank · AI Expense Categorizer · EWT 2307
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {Object.values(PH_PAYMENT_METHODS).slice(0, 4).map(pm => (
            <span key={pm.label} className="flex items-center gap-1">{pm.icon} {pm.label}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-white/10 rounded-xl p-1 w-fit">
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />)}
      </div>

      {!workspaceId && (
        <div className="text-amber-400 text-sm bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle size={16} /> Workspace ID not detected. Please sign in to load invoicing data.
        </div>
      )}

      {workspaceId && (
        <>
          {tab === "invoices" && <InvoicesTab workspaceId={workspaceId} />}
          {tab === "quotes"   && <QuotesTab   workspaceId={workspaceId} />}
          {tab === "payments" && <PaymentsTab  workspaceId={workspaceId} />}
          {tab === "expenses" && <ExpensesTab  workspaceId={workspaceId} />}
        </>
      )}
    </div>
  );
}
