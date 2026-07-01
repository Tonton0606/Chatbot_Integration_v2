import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, MapPin, FileText, Sparkles, TrendingUp, Send,
  BarChart3, Users, ArrowRight, ExternalLink
} from "lucide-react";
import { supabase } from "../../../config/supabaseClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWorkspaceId() {
  return localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id");
}

function StatCard({ label, value, color = "blue" }) {
  const bg = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-center">
      <p className={`text-2xl font-bold ${bg[color].split(" ")[1]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, description, route, iconColor, disabled }) {
  const navigate = useNavigate();
  return (
    <button
      disabled={disabled}
      onClick={() => navigate(route)}
      className={`w-full text-left rounded-xl border p-5 transition-all flex items-start gap-4 group ${
        disabled
          ? "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3 opacity-50 cursor-not-allowed"
          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[var(--brand-gold,#f59e0b)] hover:shadow-md cursor-pointer"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      {!disabled && (
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--brand-gold,#f59e0b)] transition-colors mt-0.5 flex-shrink-0" />
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientMarketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    (async () => {
      try {
        if (!workspaceId) { setLoading(false); return; }
        const { data } = await supabase
          .from("email_campaigns")
          .select("id, name, status, open_rate, click_rate, emails_sent, created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(5);
        setCampaigns(data || []);
      } catch {
        // table may not exist yet — show empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "active" || c.status === "sent").length,
    sent: campaigns.reduce((s, c) => s + (c.emails_sent || 0), 0),
    avgOpen: campaigns.length > 0
      ? (campaigns.reduce((s, c) => s + (c.open_rate || 0), 0) / campaigns.length).toFixed(1)
      : "0.0",
  };

  const STATUS_COLORS = {
    active: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    draft: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    completed: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Marketing</h1>
        <p className="text-sm text-gray-500">Campaigns, leads, and marketing collateral</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={loading ? "—" : stats.total} color="blue" />
        <StatCard label="Active" value={loading ? "—" : stats.active} color="green" />
        <StatCard label="Emails Sent" value={loading ? "—" : stats.sent.toLocaleString()} color="purple" />
        <StatCard label="Avg Open Rate" value={loading ? "—" : `${stats.avgOpen}%`} color="amber" />
      </div>

      {/* Sub-module Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Marketing Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ModuleCard
            icon={MapPin}
            title="Leads Generator"
            description="AI-powered lead generation — find, enrich, score, and draft outreach for any business nationwide."
            route="/Client/GoogleMapsLeads"
            iconColor="bg-green-500/10 text-green-500"
          />
          <ModuleCard
            icon={FileText}
            title="Marketing Collateral"
            description="Access embedded marketing assets, brochures, and brand materials."
            route="/Client/MarketingCollateral"
            iconColor="bg-blue-500/10 text-blue-500"
          />
          <ModuleCard
            icon={Sparkles}
            title="AI Campaigns"
            description="View AI-generated campaign strategies and optimized send-time schedules."
            route="/Client/Marketing"
            iconColor="bg-purple-500/10 text-purple-500"
            disabled
          />
          <ModuleCard
            icon={BarChart3}
            title="Campaign Analytics"
            description="Open rates, click-through rates, and campaign performance breakdown."
            route="/Client/Analytics"
            iconColor="bg-amber-500/10 text-amber-500"
          />
        </div>
      </div>

      {/* Recent Campaigns */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Recent Campaigns</h2>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-[var(--brand-gold,#f59e0b)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No campaigns yet.</p>
              <p className="text-xs mt-1">Ask your admin to create campaigns from the Marketing panel.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.emails_sent ? `${c.emails_sent.toLocaleString()} sent` : "Not sent"}
                      {c.open_rate ? ` · ${c.open_rate.toFixed(1)}% open` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
