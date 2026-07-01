import { useState, useEffect, useCallback } from "react";
import {
  FileText, CreditCard, Clock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Search, Download, Eye, X
} from "lucide-react";
import {
  getInvoices, getPayments, formatPHP, INVOICE_STATUS_COLORS
} from "../../../services/clientInvoicing/index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWorkspaceId() {
  return localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id");
}

function StatusBadge({ status }) {
  const color = INVOICE_STATUS_COLORS[status] || "#6b7280";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: color + "22", color }}
    >
      {status}
    </span>
  );
}

function KPICard({ icon: Icon, label, value, color = "blue", sub }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Invoice Detail Slide-Over ─────────────────────────────────────────────────

function InvoiceDetail({ invoice, onClose }) {
  if (!invoice) return null;
  const items = invoice.invoice_items || [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</h3>
            <StatusBadge status={invoice.status} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Billing info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Bill To</p>
              <p className="font-medium text-gray-900 dark:text-white">{invoice.customer_name}</p>
              {invoice.customer_email && <p className="text-gray-500">{invoice.customer_email}</p>}
              {invoice.customer_address && <p className="text-gray-500">{invoice.customer_address}</p>}
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Details</p>
              <p className="text-gray-600 dark:text-gray-300">Issued: {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString("en-PH") : "—"}</p>
              <p className="text-gray-600 dark:text-gray-300">Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-PH") : "—"}</p>
              {invoice.payment_terms && <p className="text-gray-600 dark:text-gray-300">Terms: {invoice.payment_terms.toUpperCase()}</p>}
            </div>
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Items</p>
              <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Price</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.description}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatPHP(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatPHP(item.quantity * item.unit_price - (item.discount_amount || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4 space-y-1 text-sm">
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Discount</span><span>-{formatPHP(invoice.discount_amount)}</span>
              </div>
            )}
            {invoice.vat_amount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>VAT ({invoice.vat_rate || 12}%)</span><span>{formatPHP(invoice.vat_amount)}</span>
              </div>
            )}
            {invoice.ewt_amount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>EWT ({invoice.ewt_rate}%)</span><span>-{formatPHP(invoice.ewt_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white text-base pt-1">
              <span>Total Due</span><span>{formatPHP(invoice.total_amount)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span><span>{formatPHP(invoice.amount_paid)}</span>
              </div>
            )}
            {invoice.balance_due > 0 && (
              <div className="flex justify-between font-bold text-red-500 text-base">
                <span>Balance Due</span><span>{formatPHP(invoice.balance_due)}</span>
              </div>
            )}
          </div>

          {/* BIR fields */}
          {(invoice.bir_serial_number || invoice.or_number) && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-400">
              <p className="font-semibold mb-1">BIR Information</p>
              {invoice.bir_serial_number && <p>Serial No: {invoice.bir_serial_number}</p>}
              {invoice.or_number && <p>OR No: {invoice.or_number}</p>}
            </div>
          )}

          {invoice.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientInvoicing() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expanded, setExpanded] = useState({});

  const workspaceId = getWorkspaceId();

  const load = useCallback(async () => {
    if (!workspaceId) { setError("No workspace found."); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [invRes, payRes] = await Promise.all([
        getInvoices(workspaceId, { status: statusFilter }),
        getPayments(workspaceId),
      ]);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv =>
    !search || (inv.invoice_number + inv.customer_name).toLowerCase().includes(search.toLowerCase())
  );

  const kpis = {
    total: invoices.length,
    outstanding: invoices.filter(i => ["sent", "viewed", "partial"].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0),
    paid: invoices.filter(i => i.status === "paid").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invoicing</h1>
          <p className="text-sm text-gray-500">View your invoices and payment history</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Total Invoices" value={kpis.total} color="blue" />
        <KPICard icon={Clock} label="Outstanding" value={formatPHP(kpis.outstanding)} color="amber" />
        <KPICard icon={CheckCircle} label="Paid" value={kpis.paid} color="green" />
        <KPICard icon={AlertCircle} label="Overdue" value={kpis.overdue} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {["invoices", "payments"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-[var(--brand-gold,#f59e0b)] text-[var(--brand-gold,#f59e0b)]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by invoice # or customer…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold,#f59e0b)]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none"
            >
              <option value="">All statuses</option>
              {["draft","sent","viewed","partial","paid","overdue","cancelled","void"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No invoices found.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Invoice #</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Customer</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Due Date</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{inv.customer_name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatPHP(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payment records found.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Invoice #</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Method</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Reference</th>
                    <th className="text-right px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {p.invoice?.invoice_number || p.invoice_id?.slice(0, 8) || "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell capitalize text-gray-600 dark:text-gray-400">
                        {(p.payment_method || "").replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                        {p.reference_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {formatPHP(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoice Detail Slide-Over */}
      {selectedInvoice && (
        <InvoiceDetail invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
