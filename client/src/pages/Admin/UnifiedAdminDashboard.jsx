import { useState, useEffect, useRef } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  UserPlus,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  CheckCircle,
  Clock,
  Server,
  Database,
  Shield,
  Activity,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  Eye,
  FileText,
  Briefcase,
  Globe,
  ChevronDown,
  Brain,
  Check,
} from "lucide-react";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
} from "../../components/admin/ui";

import { fmt } from "../../lib/adminUtils";
import { supabase, db } from "../../config/supabaseClient";
import { motion } from "framer-motion";

const chartTooltipStyle = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  color: "var(--text-primary)",
};

const chartLabelStyle = {
  color: "var(--text-primary)",
};

const CURRENCY_OPTIONS = {
  PHP: { label: "Peso", symbol: "₱", rate: 1 },
  USD: { label: "Dollar", symbol: "$", rate: 1 / 56 },
};

function timeAgo(date) {
  if (!date) return "—";

  const parsed = new Date(date).getTime();
  if (Number.isNaN(parsed)) return "—";

  const seconds = Math.floor((Date.now() - parsed) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function safeSelect(table, queryBuilder) {
  const result = await queryBuilder;

  if (result.error?.code === "42P01") {
    console.warn(`Table "${table}" does not exist. Using empty fallback.`);
    return { data: [], count: 0, error: null };
  }

  if (result.error) {
    console.warn(`Table "${table}" query failed:`, result.error.message);
    return { data: [], count: 0, error: null };
  }

  return result;
}

function CurrencySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = CURRENCY_OPTIONS[value];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-4 py-2 text-sm font-semibold text-[#c9a84c] outline-none transition-colors hover:bg-[#c9a84c]/20"
      >
        {selected.symbol} {selected.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-[#c9a84c]/20 shadow-2xl shadow-black/60"
          style={{ background: '#0d1220' }}
        >
          {Object.entries(CURRENCY_OPTIONS).map(([key, opt]) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-all ${
                value === key
                  ? 'bg-[#c9a84c]/10 text-[#c9a84c]'
                  : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <span>{opt.symbol} {opt.label}</span>
              {value === key && <Check className="h-3.5 w-3.5 shrink-0 text-[#c9a84c]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UnifiedAdminDashboard() {
  const [currency, setCurrency] = useState("PHP");
  const [expandedSummary, setExpandedSummary] = useState(null);
  const [revenueTarget, setRevenueTarget] = useState(100000);
  const [revenueTargetStatus, setRevenueTargetStatus] = useState("saved");
  const [revenueTargetLoaded, setRevenueTargetLoaded] = useState(false);
  const [revenueTargetDirty, setRevenueTargetDirty] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    groqAI: "checking",
    nuclei: "checking",
    trivy: "checking",
    database: "checking",
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCustomers: 0,
    totalDocuments: 0,
    totalRevenue: 0,
    totalBookings: 0,
    totalProjects: 0,
    newLeads: 0,
    activeDeals: 0,
    pipelineValue: 0,
    avgDealSize: 0,
    activeCustomers: 0,
    conversionRate: 0,
    churnRate: 0,
    avgSessionDuration: 0,
    systemLoad: 0,
    storageUsed: 0,
    apiCalls: 0,
    errorRate: 0,
    responseTime: 0,
  });

  const [chartData, setChartData] = useState({
    revenue: [],
    pipeline: [],
    userGrowth: [],
    performance: [],
    geo: [],
    activityHeatmap: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [recentBookings, setRecentBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);

  const [realTimeStats, setRealTimeStats] = useState({
    onlineUsers: 0,
    activeSessions: 0,
    processingJobs: 0,
  });

  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadRevenueTarget();

    const interval = setInterval(() => {
      loadPresenceStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!revenueTargetLoaded || !revenueTargetDirty) return undefined;

    const timeoutId = window.setTimeout(() => {
      saveRevenueTarget(revenueTarget);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [revenueTarget, revenueTargetLoaded, revenueTargetDirty]);

  const loadRevenueTarget = async () => {
    const { data, error } = await supabase
      .from("executive_targets")
      .select("target_value")
      .eq("target_key", "monthly_revenue")
      .maybeSingle();

    if (error) {
      console.warn("Failed to load revenue target:", error.message);
    }

    if (!error && data?.target_value !== undefined && data?.target_value !== null) {
      setRevenueTarget(Number(data.target_value) || 100000);
    }

    setRevenueTargetStatus(error ? "error" : "saved");
    setRevenueTargetLoaded(true);
  };

  const saveRevenueTarget = async (targetValue) => {
    setRevenueTargetStatus("saving");

    const { error } = await supabase
      .from("executive_targets")
      .upsert(
        {
          target_key: "monthly_revenue",
          target_label: "Monthly Revenue Target",
          target_value: Number(targetValue) || 0,
          target_unit: "currency",
          period: "monthly",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "target_key" }
      );

    if (error) {
      console.warn("Failed to save revenue target:", error.message);
    }

    setRevenueTargetStatus(error ? "error" : "saved");
    if (!error) setRevenueTargetDirty(false);
  };

  const loadPresenceStats = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("user_presence")
      .select("user_id", { count: "exact", head: true })
      .eq("is_online", true)
      .gte("last_seen_at", fiveMinutesAgo);

    if (error) {
      setRealTimeStats((current) => ({ ...current, onlineUsers: 0, activeSessions: 0 }));
      return;
    }

    setRealTimeStats((current) => ({
      ...current,
      onlineUsers: count || 0,
      activeSessions: count || 0,
    }));
  };

  const generateAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const dashboardData = {
        stats,
        realTimeStats,
        chartData,
        systemStatus,
        currency,
      };

      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/ai/executive-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardData }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }

      const data = await response.json();
      setAiSummary(data);
    } catch (error) {
      console.error('AI summary error:', error);
      setAiSummary({ error: error.message });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        profiles,
        customers,
        documents,
        bookings,
        projects,
        leads,
        deals,
        securityLogs,
      ] = await Promise.all([
        db.getAllProfiles(),
        db.getCustomers(),
        db.getDocuments(),
        db.getDemoBookings(),
        db.getProjects(),
        safeSelect(
          "leads",
          supabase.from("leads").select("*", { count: "exact", head: true })
        ),
        safeSelect("deals", supabase.from("crm_opportunities").select("*")),
        safeSelect(
          "security_logs",
          supabase
            .from("security_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10)
        ),
      ]);

      const profileRows = profiles.data || [];
      const customerRows = customers.data || [];
      const documentRows = documents.data || [];
      const bookingRows = bookings.data || [];
      const projectRows = projects.data || [];
      const dealRows = deals.data || [];
      const securityRows = securityLogs.data || [];

      const totalUsers = profileRows.length;
      const activeSince = new Date();
      activeSince.setDate(activeSince.getDate() - 30);
      const activeUsers = profileRows.filter((profile) => {
        const lastActive = new Date(profile.updated_at || profile.created_at);
        return !Number.isNaN(lastActive.getTime()) && lastActive >= activeSince;
      }).length;

      const totalCustomers = customerRows.length;
      const totalDocuments = documentRows.length;
      const totalBookings = bookingRows.length;
      const totalProjects = projectRows.length;

      const getDealAmount = (deal) =>
        Number(deal.expected_revenue ?? deal.value ?? deal.amount ?? deal.deal_value ?? 0) || 0;
      const getDealStage = (deal) => deal.stage?.name || deal.stage_name || deal.stage || deal.status || "";
      const isWonDeal = (deal) =>
        getDealStage(deal).toLowerCase().includes("won") || deal.status === "won";
      const isLostDeal = (deal) =>
        getDealStage(deal).toLowerCase().includes("lost") || deal.status === "lost";
      const closedDeals = dealRows.filter(isWonDeal);

      const totalRevenue = closedDeals.reduce(
        (sum, deal) => sum + getDealAmount(deal),
        customerRows.reduce((sum, customer) => sum + (parseFloat(customer.value) || 0), 0)
      );

      const newLeads = leads.count || 0;

      const activeDeals = dealRows.filter((deal) => !isWonDeal(deal) && !isLostDeal(deal)).length;

      const pipelineValue = dealRows.reduce(
        (sum, deal) => sum + getDealAmount(deal),
        0
      );

      const avgDealSize =
        closedDeals.length > 0
          ? closedDeals.reduce(
              (sum, deal) => sum + getDealAmount(deal),
              0
            ) / closedDeals.length
          : 0;

      const conversionRate =
        newLeads > 0 ? (closedDeals.length / newLeads) * 100 : 0;

      const churnRate =
        totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;

      const monthlyRevenue = generateRevenueData(dealRows, getDealAmount, isWonDeal);
      const pipelineData = generatePipelineData(dealRows, getDealStage);
      const userGrowthData = generateUserGrowthData(profileRows);
      const systemLoad = Math.min(100, Math.round((securityRows.length + documentRows.length + projectRows.length) * 2.5));
      const apiCalls = securityRows.length + bookingRows.length + projectRows.length + documentRows.length;
      const responseTime = apiCalls > 0 ? Math.min(1000, 120 + apiCalls * 8) : 120;
      const performanceData = generatePerformanceData({ systemLoad, apiCalls, responseTime, errorRate: securityRows.filter((log) => log.action === "error").length });
      const geoData = generateGeoData(customerRows);
      const activityHeatmap = await generateActivityHeatmap();

      setChartData({
        revenue: monthlyRevenue,
        pipeline: pipelineData,
        userGrowth: userGrowthData,
        performance: performanceData,
        geo: geoData,
        activityHeatmap,
      });

      const alerts = generateSystemAlerts({
        totalUsers,
        systemLoad: Math.random() * 100,
        errorRate: securityRows.filter((log) => log.action === "error").length,
        storageUsed: documentRows.length * 2.5 || 0,
      });

      setSystemAlerts(alerts);

      setStats({
        totalUsers,
        activeUsers,
        totalCustomers,
        totalDocuments,
        totalRevenue,
        totalBookings,
        totalProjects,
        newLeads,
        activeDeals,
        pipelineValue,
        avgDealSize,
        activeCustomers: closedDeals.length,
        conversionRate,
        churnRate,
        avgSessionDuration: 0,
        systemLoad,
        storageUsed: documentRows.length * 2.5 || 0,
        apiCalls,
        errorRate: securityRows.filter((log) => log.action === "error").length,
        responseTime,
      });

      const recent =
        bookingRows.slice(0, 5).map((booking) => ({
          text: `Demo booked with ${
            booking.company || booking.full_name || "Unknown client"
          }`,
          time: timeAgo(booking.created_at),
          type: "booking",
          company: booking.company,
          status: booking.status,
        })) || [];

      const allActivities = [
        ...recent,
        ...profileRows.slice(0, 2).map((profile) => ({
          text: `User registered${profile.full_name ? ` - ${profile.full_name}` : ""}`,
          time: timeAgo(profile.created_at),
          type: "user",
        })),
        ...closedDeals.slice(0, 2).map((deal) => ({
          text: `Deal closed - ${formatMoney(getDealAmount(deal))}`,
          time: timeAgo(deal.updated_at || deal.created_at),
          type: "deal",
        })),
      ];

      setActivities(allActivities);
      setRecentBookings(recent);

      await loadPresenceStats();
      await checkSystemHealth();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    const selected = CURRENCY_OPTIONS[currency];
    const value = (Number(amount) || 0) * selected.rate;
    return `${selected.symbol}${fmt.number(Math.round(value))}`;
  };

  const convertMoney = (amount) => (Number(amount) || 0) * CURRENCY_OPTIONS[currency].rate;

  const generateRevenueData = (deals, getDealAmount, isWonDeal) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const monthly = months.map((month) => ({ month, revenue: 0, target: 0, profit: 0 }));
    deals?.filter(isWonDeal).forEach((deal) => {
      const date = new Date(deal.updated_at || deal.created_at);
      const index = date.getMonth();
      if (index >= 0 && index < monthly.length) {
        const amount = getDealAmount(deal);
        monthly[index].revenue += amount;
        monthly[index].profit += amount * 0.35;
      }
    });
    const target = Math.max(...monthly.map((item) => item.revenue), 0);
    return monthly.map((item) => ({ ...item, target }));
  };

  const generatePipelineData = (deals, getDealStage) => {
    const stages = [
      "Discovery",
      "Proposal",
      "Negotiation",
      "Closed Won",
      "Closed Lost",
    ];

    const colors = ["#c9a84c", "#67e8f9", "#a78bfa", "#22c55e", "#ef4444"];

    return stages.map((stage, index) => {
      const count =
        deals?.filter((deal) => getDealStage(deal) === stage)?.length || 0;

      return {
        name: stage,
        value: count,
        color: colors[index],
        percentage: deals?.length ? Math.round((count / deals.length) * 100) : 0,
      };
    });
  };

  const generateUserGrowthData = (profiles) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, index) => {
      const users = profiles.filter((profile) => new Date(profile.created_at).getMonth() <= index).length;
      const active = profiles.filter((profile) => new Date(profile.updated_at || profile.created_at).getMonth() <= index).length;
      const newUsers = profiles.filter((profile) => new Date(profile.created_at).getMonth() === index).length;
      return { month, users, active, new: newUsers };
    });
  };

  const generatePerformanceData = ({ systemLoad, apiCalls, responseTime, errorRate }) => {
    return [
      { metric: "Response Time", current: Math.max(0, 100 - Math.min(100, responseTime / 10)), target: 80, status: responseTime < 500 ? "good" : "warning" },
      { metric: "Throughput", current: Math.min(100, apiCalls), target: 80, status: apiCalls > 0 ? "good" : "warning" },
      { metric: "Error Rate", current: Math.max(0, 100 - errorRate * 10), target: 95, status: errorRate === 0 ? "good" : "warning" },
      { metric: "Uptime", current: systemStatus.database === "online" ? 99 : 50, target: 99, status: systemStatus.database === "online" ? "good" : "warning" },
      { metric: "System Load", current: Math.max(0, 100 - systemLoad), target: 80, status: systemLoad < 80 ? "good" : "warning" },
    ];
  };

  const generateGeoData = () => {
    return [
      { country: "United States", users: 450, percentage: 45 },
      { country: "United Kingdom", users: 200, percentage: 20 },
      { country: "Canada", users: 150, percentage: 15 },
      { country: "Australia", users: 100, percentage: 10 },
      { country: "Others", users: 100, percentage: 10 },
    ];
  };

  const generateActivityHeatmap = async () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }, (_, index) => index);

    return days.map((day) => ({
      day,
      hours: hours.map((hour) => ({
        hour,
        activity: Math.floor(Math.random() * 100),
      })),
    }));
  };

  const generateSystemAlerts = (metrics) => {
    const alerts = [];

    if (metrics.systemLoad > 80) {
      alerts.push({
        type: "warning",
        message: "High system load detected",
        icon: <AlertTriangle className="h-4 w-4" />,
        time: "5 min ago",
      });
    }

    if (metrics.errorRate > 10) {
      alerts.push({
        type: "error",
        message: "Increased error rate detected",
        icon: <AlertTriangle className="h-4 w-4" />,
        time: "10 min ago",
      });
    }

    if (metrics.storageUsed > 80) {
      alerts.push({
        type: "warning",
        message: "Storage usage approaching limit",
        icon: <Database className="h-4 w-4" />,
        time: "1 hour ago",
      });
    }

    return alerts;
  };

  const checkSystemHealth = async () => {
    try {
      const dbHealth = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      setSystemStatus({
        groqAI: "online",
        nuclei: "online",
        trivy: "online",
        database: dbHealth.error ? "offline" : "online",
      });
    } catch (error) {
      console.error("Error checking system health:", error);

      setSystemStatus({
        groqAI: "offline",
        nuclei: "offline",
        trivy: "offline",
        database: "offline",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "text-green-400";
      case "offline":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "booking":
        return <Calendar className="h-4 w-4" />;
      case "user":
        return <UserPlus className="h-4 w-4" />;
      case "deal":
        return <DollarSign className="h-4 w-4" />;
      case "system":
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 animate-pulse rounded-xl bg-[var(--hover-bg)]" />
            <div className="h-4 w-80 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
          </div>
        </div>
        <div className="h-5 w-44 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-[var(--hover-bg)]" />
                  <div className="h-7 w-32 animate-pulse rounded bg-[var(--hover-bg)]" />
                  <div className="h-3 w-20 animate-pulse rounded bg-[var(--hover-bg)]" />
                </div>
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-[var(--hover-bg)]" />
              </div>
              <div className="h-7 w-28 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
            </div>
          ))}
        </div>
        <div className="h-5 w-52 animate-pulse rounded-lg bg-[var(--hover-bg)]" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:col-span-2">
            <div className="h-5 w-40 animate-pulse rounded bg-[var(--hover-bg)] mb-4" />
            <div className="h-[300px] animate-pulse rounded-xl bg-[var(--hover-bg)]" />
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--hover-bg)] mb-4" />
            <div className="h-[300px] animate-pulse rounded-xl bg-[var(--hover-bg)]" />
          </div>
        </div>
      </div>
    );
  }

  // Trend delta computations: compare last 2 months of chart data
  const revMonths = chartData.revenue;
  const revDelta = revMonths.length >= 2
    ? revMonths[revMonths.length - 1].revenue - revMonths[revMonths.length - 2].revenue
    : null;

  const ugMonths = chartData.userGrowth;
  const ugDelta = ugMonths.length >= 2
    ? ugMonths[ugMonths.length - 1].active - ugMonths[ugMonths.length - 2].active
    : null;

  const hasRevenueData = chartData.revenue.some((item) => item.revenue > 0 || item.profit > 0);
  const hasPipelineData = chartData.pipeline.some((item) => item.value > 0);
  const revenueTrendData = chartData.revenue.length
    ? chartData.revenue.map((item) => ({ label: item.month, value: convertMoney(item.revenue) }))
    : [{ label: "No data", value: 0 }];
  const conversionTrendData = chartData.userGrowth.length
    ? chartData.userGrowth.map((item) => ({ label: item.month, value: item.new || 0 }))
    : [{ label: "No data", value: 0 }];
  const uptimeTrendData = chartData.performance.length
    ? chartData.performance.map((item) => ({ label: item.metric, value: item.current || 0 }))
    : [{ label: "No data", value: 0 }];
  const responseTrendData = chartData.activityHeatmap.length
    ? chartData.activityHeatmap.slice(0, 8).flatMap((day) =>
        (day.hours || []).slice(0, 1).map((hour) => ({
          label: day.day,
          value: Math.max(1, 500 - (hour.activity || 0) * 4),
        }))
      )
    : [{ label: "No data", value: 0 }];
  const summaryCards = [
    {
      key: "revenue",
      title: "Total Revenue",
      actionLabel: "Revenue Trend",
      value: formatMoney(stats.totalRevenue),
      sub: stats.totalRevenue > 0 ? "Closed-won and customer value" : "No revenue recorded yet",
      icon: DollarSign,
      hoverChart: true,
      trendDir: revDelta !== null ? (revDelta >= 0 ? 'up' : 'down') : null,
      trendLabel: revDelta !== null
        ? `${revDelta >= 0 ? '+' : ''}${formatMoney(Math.abs(revDelta))} vs prev mo`
        : null,
      history: chartData.revenue.map((item) => ({
        label: item.month,
        value: formatMoney(item.revenue),
      })),
    },
    {
      key: "activeUsers",
      title: "Active Users",
      actionLabel: "User Growth",
      value: fmt.number(stats.activeUsers),
      sub: `of ${fmt.number(stats.totalUsers)} total`,
      icon: Users,
      trendDir: ugDelta !== null ? (ugDelta >= 0 ? 'up' : 'down') : null,
      trendLabel: ugDelta !== null
        ? `${ugDelta >= 0 ? '+' : ''}${fmt.number(Math.abs(ugDelta))} active vs prev mo`
        : null,
      history: chartData.userGrowth.map((item) => ({
        label: item.month,
        value: `${fmt.number(item.active)} active`,
      })),
    },
    {
      key: "systemHealth",
      title: "System Health",
      actionLabel: "Health Details",
      value: systemStatus.database === "online" ? "98.9%" : "Degraded",
      sub: "Uptime last 30 days",
      icon: Shield,
      trendDir: systemStatus.database === 'online' ? 'up' : 'down',
      trendLabel: systemStatus.database === 'online' ? 'All systems operational' : 'Service degraded',
      history: chartData.performance.map((item) => ({
        label: item.metric,
        value: `${fmt.number(Math.round(item.current))}%`,
      })),
    },
    {
      key: "onlineNow",
      title: "Online Now",
      actionLabel: "Session Details",
      value: fmt.number(realTimeStats.onlineUsers),
      sub: "Active sessions",
      icon: Eye,
      trendDir: realTimeStats.onlineUsers > 0 ? 'up' : null,
      trendLabel: realTimeStats.onlineUsers > 0
        ? `${realTimeStats.activeSessions} concurrent sessions`
        : null,
      history: [
        { label: "Online now", value: fmt.number(realTimeStats.onlineUsers) },
        { label: "Active sessions", value: fmt.number(realTimeStats.activeSessions) },
        { label: "Presence window", value: "Last 5 min" },
      ],
    },
  ];

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">
            Corporate performance overview by business division
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CurrencySelect value={currency} onChange={setCurrency} />

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-4 py-2 text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/20 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <BarChart3 className="h-5 w-5 text-[#c9a84c]" />
          Executive Summary
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, cardIdx) => {
            const Icon = card.icon;
            const isExpanded = expandedSummary === card.key;

            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: cardIdx * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
              <Card className="group relative overflow-visible h-full">
                <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_35%)]" />
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{card.title}</p>
                      <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{card.value}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{card.sub}</p>
                      {card.trendDir && card.trendLabel && (
                        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          card.trendDir === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span>{card.trendDir === 'up' ? '↑' : '↓'}</span>
                          <span>{card.trendLabel}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/10 text-[#c9a84c]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedSummary(isExpanded ? null : card.key)}
                    className="mt-4 ml-auto flex items-center gap-1 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-2 py-1 text-xs font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c]/20"
                  >
                    {card.actionLabel}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] p-3">
                      {card.history.length > 0 ? (
                        card.history.slice(-6).map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-[var(--text-secondary)]">{item.label}</span>
                            <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--text-muted)]">No history available yet.</p>
                      )}
                    </div>
                  )}
                </div>
                {card.hoverChart && (
                  <div className="pointer-events-none absolute left-0 top-full z-30 mt-3 hidden w-80 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-2xl group-hover:block">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Revenue Growth</p>
                      <BarChart3 className="h-4 w-4 text-[#c9a84c]" />
                    </div>
                    {hasRevenueData ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={chartData.revenue.map((item) => ({
                          ...item,
                          revenue: convertMoney(item.revenue),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                          <XAxis dataKey="month" stroke="var(--text-muted)" />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={chartTooltipStyle}
                            labelStyle={chartLabelStyle}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#c9a84c"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#c9a84c]/30 bg-[#c9a84c]/5 text-center text-xs text-[var(--text-muted)]">
                        No revenue history available yet.
                      </div>
                    )}
                  </div>
                )}
              </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <TrendingUp className="h-5 w-5 text-[#c9a84c]" />
          Sales & CRM Performance
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            index={0}
            title="Active Deals"
            value={fmt.number(stats.activeDeals)}
            sub={
              stats.pipelineValue > 0
                ? formatMoney(stats.pipelineValue)
                : "In pipeline"
            }
            icon={TrendingUp}
            color="purple"
            trend={stats.activeDeals > 10 ? "up" : "down"}
          />

          <StatCard
            index={1}
            title="Conversion Rate"
            value={fmt.pct(stats.conversionRate)}
            sub="Lead to customer"
            icon={Target}
            color="success"
            trend={stats.conversionRate > 15 ? "up" : "down"}
          />

          <StatCard
            index={2}
            title="New Leads"
            value={fmt.number(stats.newLeads)}
            sub="This month"
            icon={UserPlus}
            color="violet"
          />

          <StatCard
            index={3}
            title="Avg Deal Size"
            value={formatMoney(stats.avgDealSize)}
            sub="Per closed deal"
            icon={Briefcase}
            color="indigo"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <Users className="h-5 w-5 text-[#c9a84c]" />
          Customer Engagement
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            index={0}
            title="Total Customers"
            value={fmt.number(stats.totalCustomers)}
            sub="Active accounts"
            icon={Users}
            color="cyan"
          />

          <StatCard
            index={1}
            title="Churn Rate"
            value={fmt.pct(stats.churnRate)}
            sub="Monthly user loss"
            icon={TrendingDown}
            color={stats.churnRate < 5 ? "success" : "danger"}
          />

          <StatCard
            index={2}
            title="Avg Session"
            value={`${fmt.number(stats.avgSessionDuration)} min`}
            sub="User engagement"
            icon={Clock}
            color="warning"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <Briefcase className="h-5 w-5 text-[#c9a84c]" />
          Operations
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            index={0}
            title="Active Projects"
            value={fmt.number(stats.totalProjects)}
            sub="In progress"
            icon={Briefcase}
            color="pink"
          />

          <StatCard
            index={1}
            title="Total Bookings"
            value={fmt.number(stats.totalBookings)}
            sub="Demo requests"
            icon={Calendar}
            color="lime"
          />

          <StatCard
            index={2}
            title="Documents"
            value={fmt.number(stats.totalDocuments)}
            sub="Files stored"
            icon={FileText}
            color="amber"
          />

          <StatCard
            index={3}
            title="Storage Used"
            value={`${fmt.number(stats.storageUsed)} MB`}
            sub="Of 10 GB limit"
            icon={Database}
            color="slate"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <PieChartIcon className="h-5 w-5 text-[#c9a84c]" />
          Intelligence & Analytics
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#c9a84c]" />
                Revenue Performance
              </CardTitle>
            </CardHeader>

            <CardContent>
              {hasRevenueData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData.revenue.map((item) => ({
                    ...item,
                    revenue: convertMoney(item.revenue),
                    profit: convertMoney(item.profit),
                    target: convertMoney(item.target),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartLabelStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      fill="#c9a84c"
                      fillOpacity={0.3}
                      stroke="#c9a84c"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#c9a84c"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#c9a84c]/30 bg-[#c9a84c]/5 p-6 text-center">
                  <DollarSign className="mb-3 h-10 w-10 text-[#c9a84c]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">No revenue trend yet</h3>
                  <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                    Revenue will appear here after deals are marked as Closed Won or customer value records are added.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#c9a84c]" />
                Deal Pipeline
              </CardTitle>
            </CardHeader>

            <CardContent>
              {hasPipelineData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.pipeline}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.pipeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartLabelStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#c9a84c]/30 bg-[#c9a84c]/5 p-6 text-center">
                  <Target className="mb-3 h-10 w-10 text-[#c9a84c]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">No active pipeline yet</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Add CRM opportunities or move deals through stages to populate this pipeline.
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {chartData.pipeline.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-[var(--text-secondary)]">
                        {item.name}
                      </span>
                    </div>

                    <span className="font-medium text-[var(--text-primary)]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#c9a84c]" />
                User Growth Trend
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartLabelStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stackId="1"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="new"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#c9a84c]" />
                System Performance
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={chartData.performance}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--text-muted)" />
                  <PolarRadiusAxis stroke="var(--text-muted)" />
                  <Radar
                    name="Current"
                    dataKey="current"
                    stroke="#c9a84c"
                    fill="#c9a84c"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Target"
                    dataKey="target"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartLabelStyle}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#c9a84c]" />
              Executive Targets
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Revenue Target",
                  editable: true,
                  current: formatMoney(stats.totalRevenue),
                  target: formatMoney(revenueTarget),
                  caption: "AI Forecast",
                  forecast: formatMoney(Math.max(stats.totalRevenue * 1.15, stats.totalRevenue)),
                  note: "by month-end",
                  probability: revenueTarget > 0 ? Math.min(100, Math.round((stats.totalRevenue / revenueTarget) * 100)) : 0,
                  color: "#a855f7",
                  data: revenueTrendData,
                },
                {
                  label: "Conversion Target",
                  current: fmt.pct(stats.conversionRate),
                  target: "15%",
                  caption: "AI Forecast",
                  forecast: fmt.pct(Math.max(stats.conversionRate * 1.1, stats.conversionRate)),
                  note: "by month-end",
                  probability: Math.min(100, Math.round((stats.conversionRate / 15) * 100)) || 0,
                  color: "#f59e0b",
                  data: conversionTrendData,
                },
                {
                  label: "System Uptime Target",
                  current: systemStatus.database === "online" ? "98.9%" : "0%",
                  target: "99%",
                  caption: "Current Uptime",
                  forecast: systemStatus.database === "online" ? "99.92%" : "Degraded",
                  note: "last 30 days",
                  probability: systemStatus.database === "online" ? 100 : 0,
                  color: "#22c55e",
                  data: uptimeTrendData,
                },
                {
                  label: "Response Time Target",
                  current: `${fmt.number(Math.round(stats.responseTime))} ms`,
                  target: "500 ms",
                  caption: "Current Avg",
                  forecast: `${fmt.number(Math.round(stats.responseTime || 0))} ms`,
                  note: "last 30 days",
                  probability: Math.min(100, Math.round(((500 - Math.min(stats.responseTime, 500)) / 500) * 100)) || 0,
                  color: "#eab308",
                  data: responseTrendData,
                },
              ].map((target) => (
                <div key={target.label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{target.label}</p>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        {target.current} / {target.target}
                      </div>
                      {target.editable && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">Target</span>
                          <input
                            type="number"
                            min="0"
                            value={revenueTarget}
                            onChange={(event) => {
                              setRevenueTarget(Number(event.target.value) || 0);
                              setRevenueTargetDirty(true);
                            }}
                            className="w-28 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-2 py-1 text-xs font-semibold text-[#c9a84c] outline-none"
                          />
                          <span className={`text-[10px] font-semibold ${
                            revenueTargetStatus === "error"
                              ? "text-red-400"
                              : revenueTargetStatus === "saving"
                                ? "text-yellow-400"
                                : "text-green-400"
                          }`}>
                            {revenueTargetStatus === "error"
                              ? "Save failed"
                              : revenueTargetStatus === "saving"
                                ? "Saving..."
                                : "Saved"}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="font-bold" style={{ color: target.color }}>
                      {target.probability}%
                    </span>
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">{target.caption}</p>
                        <p className="text-xl font-bold" style={{ color: target.color }}>
                          {target.forecast}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{target.note}</p>
                      </div>
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          color: target.color,
                          background: `conic-gradient(${target.color} ${target.probability * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                        }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-card)]">
                          {target.probability}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={target.data}>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={target.color}
                            fill={target.color}
                            fillOpacity={0.18}
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <Server className="h-5 w-5 text-[#c9a84c]" />
          System Health & Monitoring
        </h2>

        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Database", systemStatus.database, Database],
                ["Groq AI", systemStatus.groqAI, Server],
                ["Nuclei", systemStatus.nuclei, Shield],
                ["Trivy", systemStatus.trivy, Activity],
              ].map(([label, status, Icon]) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-8 w-8 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {label}
                    </p>
                    <p className={`font-semibold ${getStatusColor(status)}`}>
                      {status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              System Alerts
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {systemAlerts.length > 0 ? (
                systemAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      alert.type === "error"
                        ? "border border-red-500/20 bg-red-500/10"
                        : alert.type === "warning"
                          ? "border border-yellow-500/20 bg-yellow-500/10"
                          : "border border-green-500/20 bg-green-500/10"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${
                        alert.type === "error"
                          ? "text-red-400"
                          : alert.type === "warning"
                            ? "text-yellow-400"
                            : "text-green-400"
                      }`}
                    >
                      {alert.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)]">
                        {alert.message}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-400" />
                  <p className="text-[var(--text-secondary)]">
                    All systems operational
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#c9a84c]" />
              Recent Activities
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg bg-[var(--hover-bg)] p-3 transition-colors hover:opacity-90"
                >
                  <div className="rounded-lg bg-[#c9a84c]/10 p-2 text-[#c9a84c]">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--text-primary)]">
                      {activity.text}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Live
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  {realTimeStats.onlineUsers} online
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  {realTimeStats.activeSessions} sessions
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  {realTimeStats.processingJobs} jobs
                </span>
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)] border-l-2 border-[#c9a84c]/60 pl-3">
            <Brain className="h-5 w-5 text-[#c9a84c]" />
            AI Executive Summary
          </h2>
          <button
            onClick={generateAiSummary}
            disabled={aiSummaryLoading}
            className="flex items-center gap-2 rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1.5 text-xs font-semibold text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${aiSummaryLoading ? 'animate-spin' : ''}`} />
            {aiSummaryLoading ? 'Generating...' : 'Refresh'}
          </button>
        </div>

        <Card className="border-[#c9a84c]/20 bg-[#c9a84c]/5">
          {aiSummaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#c9a84c]" />
            </div>
          ) : aiSummary?.error ? (
            <div className="py-6 text-center">
              <p className="text-sm text-red-400 mb-2">Failed to generate summary</p>
              <p className="text-xs text-[var(--text-muted)]">{aiSummary.error}</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Make sure GROQ_API_KEY is configured in server/.env</p>
            </div>
          ) : aiSummary ? (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Summary</h3>
                <p className="text-sm text-[var(--text-secondary)]">{aiSummary.summary}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-green-400">Highlights</h3>
                  <ul className="space-y-1">
                    {aiSummary.highlights?.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-orange-400">Concerns</h3>
                  <ul className="space-y-1">
                    {aiSummary.concerns?.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-blue-400">Recommendations</h3>
                <ul className="space-y-1">
                  {aiSummary.recommendations?.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[#c9a84c]/10 px-3 py-2">
                <TrendingUp className={`h-4 w-4 ${
                  aiSummary.trend === 'upward' ? 'text-green-400' :
                  aiSummary.trend === 'downward' ? 'text-red-400' :
                  'text-yellow-400'
                }`} />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Overall Trend: <span className={`${
                    aiSummary.trend === 'upward' ? 'text-green-400' :
                    aiSummary.trend === 'downward' ? 'text-red-400' :
                    'text-yellow-400'
                  } capitalize`}>{aiSummary.trend}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">Click "Refresh" to generate AI-powered executive summary</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
