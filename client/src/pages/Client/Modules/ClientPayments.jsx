import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Smartphone, Package, Plus, RefreshCw, ExternalLink,
  CheckCircle, Clock, XCircle, ChevronDown, Copy, Check, AlertCircle,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";

// ── Constants ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_META = {
  paid:         { label: "Paid",          color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  pending:      { label: "Pending",       color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  confirmed:    { label: "Confirmed",     color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  packed:       { label: "Packed",        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  picked_up:    { label: "Picked Up",     color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
  in_transit:   { label: "In Transit",    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400" },
  delivered:    { label: "Delivered",     color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  failed:       { label: "Failed",        color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  returned:     { label: "Returned",      color: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400" },
  unpaid:       { label: "Unpaid",        color: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400" },
};

const METHOD_ICON = {
  gcash:   { icon: Smartphone, label: "GCash",  color: "text-blue-500" },
  paymaya: { icon: Smartphone, label: "Maya",   color: "text-green-500" },
  link:    { icon: CreditCard, label: "Card/Link", color: "text-purple-500" },
  cod:     { icon: Package,    label: "COD",    color: "text-amber-500" },
};

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input,#fff)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)] focus:border-transparent";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function fmt(centavos) {
  return `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${m.color}`}>
      {m.label}
    </span>
  );
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-[var(--bg-hover,#f3f4f6)] text-[var(--text-muted)] transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Create Payment Modal ───────────────────────────────────────────────────────

function CreatePaymentModal({ onClose, onCreated }) {
  const [tab, setTab] = useState("link"); // link | gcash | paymaya | cod
  const [form, setForm] = useState({
    amount: "",
    description: "",
    customer_name: "",
    customer_email: "",
    customer_address: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const centavos = Math.round(parseFloat(form.amount) * 100);
      if (!centavos || centavos < 100) throw new Error("Minimum amount is ₱1.00");

      let res;
      if (tab === "link") {
        res = await authFetch("/api/payments/links", {
          method: "POST",
          body: JSON.stringify({ ...form, amount: centavos }),
        });
      } else if (tab === "gcash" || tab === "paymaya") {
        res = await authFetch("/api/payments/ewallet", {
          method: "POST",
          body: JSON.stringify({ amount: centavos, type: tab, description: form.description }),
        });
      } else {
        res = await authFetch("/api/payments/cod", {
          method: "POST",
          body: JSON.stringify({ ...form, amount: centavos }),
        });
      }
      setResult(res.payment);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { key: "link", label: "Payment Link", icon: CreditCard },
    { key: "gcash", label: "GCash", icon: Smartphone },
    { key: "paymaya", label: "Maya", icon: Smartphone },
    { key: "cod", label: "COD", icon: Package },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)]">New Payment</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none">✕</button>
        </div>

        {result ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Payment created!</span>
            </div>
            {result.checkout_url && (
              <div className="rounded-lg border border-[var(--border-color)] p-3 text-sm break-all text-[var(--text-muted)] flex items-start gap-2">
                <span className="flex-1">{result.checkout_url}</span>
                <CopyBtn value={result.checkout_url} />
              </div>
            )}
            {result.redirect_url && (
              <a
                href={result.redirect_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--brand-gold)] hover:underline"
              >
                Open payment page <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="text-sm text-[var(--text-muted)]">
              Status: <StatusBadge status={result.status || "pending"} />
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-[var(--brand-gold)] text-white py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-[var(--bg-app)] p-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tab === key
                      ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={INPUT_CLS}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Order #1234"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            {(tab === "link" || tab === "cod") && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Customer Name</label>
                  <input type="text" placeholder="Juan dela Cruz" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} className={INPUT_CLS} />
                </div>
                {tab === "link" && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Customer Email</label>
                    <input type="email" placeholder="juan@email.com" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} className={INPUT_CLS} />
                  </div>
                )}
                {tab === "cod" && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Delivery Address</label>
                    <textarea rows={2} placeholder="Complete delivery address" value={form.customer_address} onChange={(e) => set("customer_address", e.target.value)} className={INPUT_CLS} />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--brand-gold)] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Creating…" : tab === "cod" ? "Create COD Order" : "Generate Payment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ClientPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [configured, setConfigured] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filterMethod !== "all") params.set("method", filterMethod);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await authFetch(`/api/payments?${params}`);
      setPayments(res.payments || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [filterMethod, filterStatus]);

  useEffect(() => {
    fetchPayments();
    authFetch("/api/payments/health")
      .then((r) => setConfigured(r.configured))
      .catch(() => setConfigured(false));
  }, [fetchPayments]);

  const stats = {
    total: payments.length,
    paid: payments.filter((p) => p.status === "paid" || p.status === "delivered").length,
    pending: payments.filter((p) => ["pending", "confirmed"].includes(p.status)).length,
    revenue: payments.filter((p) => p.status === "paid" || p.status === "delivered").reduce((s, p) => s + (p.amount || 0), 0),
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Payments</h1>
          <p className="text-sm text-[var(--text-muted)]">GCash · Maya · Card · COD — Philippine payment gateway</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPayments} className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-gold)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Payment
          </button>
        </div>
      </div>

      {/* PayMongo not configured banner */}
      {configured === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">PayMongo not configured.</span>{" "}
            Add <code className="font-mono text-xs bg-amber-100 dark:bg-amber-500/20 px-1 rounded">PAYMONGO_SECRET_KEY</code> to server/.env to enable GCash/Maya/Card payments. COD orders still work offline.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Transactions", value: stats.total, color: "text-blue-500" },
          { label: "Paid / Delivered", value: stats.paid, color: "text-green-500" },
          { label: "Pending", value: stats.pending, color: "text-amber-500" },
          { label: "Revenue", value: fmt(stats.revenue), color: "text-[var(--brand-gold)]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "link", "gcash", "paymaya", "cod"].map((m) => (
          <button
            key={m}
            onClick={() => setFilterMethod(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterMethod === m
                ? "bg-[var(--brand-gold)] text-white border-[var(--brand-gold)]"
                : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {m === "all" ? "All Methods" : METHOD_ICON[m]?.label || m}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${INPUT_CLS} w-auto text-xs py-1.5`}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-[var(--brand-gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payments yet.</p>
            <p className="text-xs mt-1">Click &quot;New Payment&quot; to create a GCash, Maya, or COD transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-app)]">
                <tr>
                  {["Method", "Description", "Customer", "Amount", "Status", "Date", "Link"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {payments.map((p) => {
                  const meta = METHOD_ICON[p.payment_method] || { icon: CreditCard, label: p.payment_method, color: "text-gray-500" };
                  const Icon = meta.icon;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-app)] transition-colors">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 font-medium ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] max-w-[180px] truncate">{p.description || "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{p.customer_name || "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{fmt(p.amount || 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap text-xs">
                        {new Date(p.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        {p.checkout_url ? (
                          <a href={p.checkout_url} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-gold)] hover:underline flex items-center gap-1 text-xs">
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePaymentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPayments(); }}
        />
      )}
    </div>
  );
}
