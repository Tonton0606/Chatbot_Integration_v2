import { useState, useEffect, useCallback } from "react";
import {
  Truck, Package, Plus, RefreshCw, CheckCircle, MapPin,
  Clock, XCircle, ChevronRight, Search, AlertCircle,
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";

// ── Constants ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_META = {
  pending:          { label: "Pending",           icon: Clock,         color: "text-amber-500",  bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  packed:           { label: "Packed",            icon: Package,       color: "text-indigo-500", bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" },
  picked_up:        { label: "Picked Up",         icon: Truck,         color: "text-purple-500", bg: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" },
  in_transit:       { label: "In Transit",        icon: Truck,         color: "text-cyan-500",   bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300" },
  out_for_delivery: { label: "Out for Delivery",  icon: Truck,         color: "text-blue-500",   bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  delivered:        { label: "Delivered",         icon: CheckCircle,   color: "text-green-500",  bg: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  failed:           { label: "Failed",            icon: XCircle,       color: "text-red-500",    bg: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  returned:         { label: "Returned",          icon: Package,       color: "text-gray-500",   bg: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400" },
};

const DELIVERY_STATUSES = Object.keys(STATUS_META);
const COURIERS = ["LBC","JRS Express","J&T Express","Lalamove","Grab Express","Moto-rider","Own Delivery","2GO","Flash Express","Ninja Van","Other"];

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

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, bg: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${m.bg}`}>{m.label}</span>;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function Timeline({ events = [] }) {
  if (!events.length) return null;
  return (
    <ol className="space-y-3 mt-3">
      {[...events].reverse().map((e, i) => {
        const m = STATUS_META[e.status] || {};
        const Icon = m.icon || Package;
        return (
          <li key={i} className="flex gap-3 text-sm">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-[var(--brand-gold)]" : "bg-[var(--bg-app)]"}`}>
              <Icon className={`w-3.5 h-3.5 ${i === 0 ? "text-white" : "text-[var(--text-muted)]"}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className={`font-medium ${i === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{m.label || e.status}</p>
              {e.note && <p className="text-xs text-[var(--text-muted)]">{e.note}</p>}
              <p className="text-xs text-[var(--text-muted)]">{new Date(e.timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DeliveryDetail({ delivery, onClose, onUpdated }) {
  const [status, setStatus] = useState(delivery.status);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(delivery.tracking_number || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate() {
    setError("");
    setLoading(true);
    try {
      await authFetch(`/api/delivery/${delivery.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note || undefined, tracking_number: tracking || undefined }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{delivery.customer_name || "Shipment"}</h2>
            <p className="text-xs text-[var(--text-muted)]">{delivery.courier} {delivery.tracking_number ? `· ${delivery.tracking_number}` : ""}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Address */}
          {delivery.customer_address && (
            <div className="flex gap-2 text-sm text-[var(--text-muted)]">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{delivery.customer_address}</span>
            </div>
          )}

          {/* Update status */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text-muted)]">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT_CLS}>
              {DELIVERY_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Tracking Number</label>
            <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. LBC1234567890" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Left at guardhouse" className={INPUT_CLS} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full rounded-lg bg-[var(--brand-gold)] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Saving…" : "Update Status"}
          </button>

          {/* Timeline */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">Timeline</p>
            <Timeline events={delivery.timeline || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Shipment Modal ─────────────────────────────────────────────────────

function CreateShipmentModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_address: "",
    courier: "J&T Express",
    tracking_number: "",
    notes: "",
    estimated_delivery: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authFetch("/api/delivery", { method: "POST", body: JSON.stringify(form) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="font-semibold text-[var(--text-primary)]">New Shipment</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Customer Name</label>
            <input type="text" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Juan dela Cruz" className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Delivery Address</label>
            <textarea rows={2} value={form.customer_address} onChange={(e) => set("customer_address", e.target.value)} placeholder="Complete address including barangay, city, province" className={INPUT_CLS} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Courier</label>
              <select value={form.courier} onChange={(e) => set("courier", e.target.value)} className={INPUT_CLS}>
                {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tracking #</label>
              <input type="text" value={form.tracking_number} onChange={(e) => set("tracking_number", e.target.value)} placeholder="Optional" className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Est. Delivery Date</label>
            <input type="date" value={form.estimated_delivery} onChange={(e) => set("estimated_delivery", e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Fragile, leave at door, etc." className={INPUT_CLS} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[var(--brand-gold)] text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? "Creating…" : "Create Shipment"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ClientDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search) params.set("search", search);
      const res = await authFetch(`/api/delivery?${params}`);
      setDeliveries(res.deliveries || []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const stats = {
    total: deliveries.length,
    inTransit: deliveries.filter((d) => ["picked_up","in_transit","out_for_delivery"].includes(d.status)).length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
    pending: deliveries.filter((d) => d.status === "pending").length,
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Delivery Tracker</h1>
          <p className="text-sm text-[var(--text-muted)]">Track shipments: LBC · J&T · Lalamove · Grab Express · COD</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDeliveries} className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-gold)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Shipments",  value: stats.total,      color: "text-blue-500" },
          { label: "Pending",          value: stats.pending,    color: "text-amber-500" },
          { label: "In Transit",       value: stats.inTransit,  color: "text-cyan-500" },
          { label: "Delivered",        value: stats.delivered,  color: "text-green-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT_CLS} pl-7 w-48 py-1.5 text-xs`}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...DELIVERY_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? "bg-[var(--brand-gold)] text-white border-[var(--brand-gold)]"
                  : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s === "all" ? "All" : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-[var(--brand-gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No shipments found.</p>
            <p className="text-xs mt-1">Click &quot;New Shipment&quot; to start tracking deliveries.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {deliveries.map((d) => {
              const m = STATUS_META[d.status] || {};
              const Icon = m.icon || Package;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-app)] transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-app)] ${m.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{d.customer_name || "Unknown"}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {d.courier}{d.tracking_number ? ` · ${d.tracking_number}` : ""}
                      {d.customer_address ? ` · ${d.customer_address.split(",")[0]}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={d.status} />
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <DeliveryDetail
          delivery={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); fetchDeliveries(); }}
        />
      )}

      {showCreate && (
        <CreateShipmentModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchDeliveries}
        />
      )}
    </div>
  );
}
