import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Grid3X3,
  Inbox,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getEnabledClientModules } from "../../services/operations/client_modules";
import { motion } from "framer-motion";

function Client_Dashboard() {
  const outletContext = useOutletContext();
  const [moduleContext, setModuleContext] = useState(outletContext || null);
  const [loading, setLoading] = useState(!outletContext);
  const [error, setError] = useState("");

  useEffect(() => {
    if (outletContext) {
      setModuleContext(outletContext);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data = await getEnabledClientModules();

        if (mounted) {
          setModuleContext(data);
        }
      } catch (err) {
        console.error("Client dashboard load error:", err);

        if (mounted) {
          setError(err.message || "Failed to load dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [outletContext]);

  const modules = moduleContext?.modules || [];
  const workspaceModules = moduleContext?.workspaceModules || [];
  const user = moduleContext?.profile;
  const workspace = moduleContext?.workspace;

  const enabledKeys = useMemo(
    () => new Set(workspaceModules.map((module) => module.key)),
    [workspaceModules]
  );

  const hasModule = (key) => enabledKeys.has(key);

  const kpiCards = [
    {
      label: "Enabled Modules",
      value: workspaceModules.length,
      sub: "Workspace tools available",
      icon: Grid3X3,
      tone: "gold",
      show: true,
    },
    {
      label: "Projects",
      value: hasModule("projects") ? "Active" : "Disabled",
      sub: hasModule("projects")
        ? "Project tracking enabled"
        : "Not enabled for workspace",
      icon: Briefcase,
      tone: hasModule("projects") ? "success" : "muted",
      show: true,
    },
    {
      label: "CRM / Deals",
      value: hasModule("crm") || hasModule("deals") ? "Enabled" : "Disabled",
      sub: "Customer and pipeline access",
      icon: TrendingUp,
      tone: hasModule("crm") || hasModule("deals") ? "cyan" : "muted",
      show: true,
    },
    {
      label: "Access Mode",
      value: "Controlled",
      sub: "Managed by ExponifyPH Admin",
      icon: ShieldCheck,
      tone: "gold",
      show: true,
    },
  ];

  const activityItems = [
    {
      title: "Workspace access loaded",
      time: "Just now",
      icon: ShieldCheck,
    },
    {
      title: `${workspaceModules.length} workspace modules enabled`,
      time: "Today",
      icon: Grid3X3,
    },
    {
      title: `${workspace?.name || "Workspace"} is active`,
      time: "Today",
      icon: CheckCircle2,
    },
  ];

  const moduleStatusCards = [
    {
      key: "projects",
      title: "Projects",
      description: "Project delivery and implementation tracking.",
      icon: Briefcase,
    },
    {
      key: "tasks",
      title: "Tasks",
      description: "Assigned work, task status, and execution tracking.",
      icon: CheckCircle2,
    },
    {
      key: "inbox",
      title: "Inbox",
      description: "Workspace communication and linked messages.",
      icon: Inbox,
    },
    {
      key: "booking",
      title: "Booking",
      description: "Meetings, demo bookings, and schedules.",
      icon: CalendarDays,
    },
    {
      key: "crm",
      title: "CRM",
      description: "Customer records and relationship tracking.",
      icon: Users,
    },
    {
      key: "analytics",
      title: "Analytics",
      description: "Workspace metrics and reporting insights.",
      icon: BarChart3,
    },
  ];

  const availabilityData = [
    { name: "Enabled", value: workspaceModules.length },
    {
      name: "Available",
      value: Math.max(0, 26 - workspaceModules.length),
    },
  ];

  const activityTrendData = [
    { month: "Jan", modules: 1, activity: 20 },
    { month: "Feb", modules: 2, activity: 35 },
    { month: "Mar", modules: 2, activity: 45 },
    { month: "Apr", modules: workspaceModules.length, activity: 60 },
    { month: "May", modules: workspaceModules.length, activity: 75 },
    { month: "Jun", modules: workspaceModules.length, activity: 90 },
  ];

  const moduleCategoryData = [
    {
      name: "Work",
      value: workspaceModules.filter((m) => m.section === "Work").length,
    },
    {
      name: "Intelligence",
      value: workspaceModules.filter((m) => m.section === "Intelligence").length,
    },
    {
      name: "Customer",
      value: workspaceModules.filter((m) => m.section === "Customer").length,
    },
    {
      name: "Operations",
      value: workspaceModules.filter((m) => m.section === "Operations").length,
    },
    {
      name: "Manage",
      value: workspaceModules.filter((m) => m.section === "Manage").length,
    },
  ].filter((item) => item.value > 0);

  const toneClasses = {
    gold: "bg-[var(--brand-gold-soft)] text-[var(--brand-gold)] border-[var(--brand-gold-border)]",
    cyan: "bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border-[var(--brand-cyan-border)]",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-green-500/20",
    muted: "bg-[var(--hover-bg)] text-[var(--text-muted)] border-[var(--border-color)]",
  };

  const chartGridColor = "rgba(148, 163, 184, 0.18)";
  const chartAxisColor = "var(--text-muted)";

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-cyan)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Loading your workspace...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-red-500/20 bg-[var(--danger-soft)] p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-[var(--danger)]" />
          <h2 className="mt-3 text-lg font-bold text-[var(--danger)]">
            Failed to load dashboard
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--premium-gradient)] p-5 shadow-sm lg:p-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-cyan)]">
              <Sparkles className="h-3.5 w-3.5" />
              Client AI Workspace
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Client Command Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ""}. Your
              workspace dashboard is generated from enabled ERP modules,
              workspace access, and active client operations.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/80 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Current Workspace
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {workspace?.name || "Client Workspace"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--brand-gold)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Workspace Health</h2>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-4">
          {[
            ["Workspace", workspace?.name || "Active Workspace"],
            ["Status", workspace?.status || "active"],
            ["Module Access", "Controlled"],
            ["Portal Mode", "Client Workspace"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {label}
              </p>
              <p className="mt-2 font-bold capitalize text-[var(--text-primary)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm hover:border-[var(--brand-gold-border)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.10),transparent_35%)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {card.label}
                  </p>
                  <h3 className="mt-4 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    {card.value}
                  </h3>
                  <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
                    {card.sub}
                  </p>
                </div>

                <motion.div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses[card.tone]}`}
                  whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm xl:col-span-2">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--brand-gold)]" />
              <h2 className="font-bold text-[var(--text-primary)]">Workspace Activity</h2>
            </div>
          </div>

          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="month" stroke={chartAxisColor} />
                <YAxis stroke={chartAxisColor} />
                <Tooltip />
                <Area type="monotone" dataKey="activity" stroke="#d4af37" fill="#d4af37" fillOpacity={0.22} />
                <Area type="monotone" dataKey="modules" stroke="#67e8f9" fill="#67e8f9" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-[var(--brand-gold)]" />
              <h2 className="font-bold text-[var(--text-primary)]">Module Access</h2>
            </div>
          </div>

          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={availabilityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value">
                  <Cell fill="#d4af37" />
                  <Cell fill="#334155" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--brand-gold)]" />
              <h2 className="font-bold text-[var(--text-primary)]">
                Operational Module Status
              </h2>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2">
            {moduleStatusCards.map((item, i) => {
              const Icon = item.icon;
              const enabled = hasModule(item.key);

              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                  className={[
                    "rounded-2xl border p-4 transition-colors",
                    enabled
                      ? "border-green-500/20 bg-[var(--success-soft)]"
                      : "border-[var(--border-color)] bg-[var(--hover-bg)]",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-2xl border",
                        enabled
                          ? "border-green-500/20 bg-[var(--success-soft)] text-[var(--success)]"
                          : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">
                        {item.title}
                      </h3>
                      <p
                        className={[
                          "mt-1 text-xs font-bold uppercase",
                          enabled ? "text-[var(--success)]" : "text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        {enabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--brand-gold)]" />
              <h2 className="font-bold text-[var(--text-primary)]">Recent Activities</h2>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {activityItems.map((activity, i) => {
              const Icon = activity.icon;

              return (
                <motion.div
                  key={activity.title}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {activity.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{activity.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>

      {moduleCategoryData.length > 0 && (
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--brand-gold)]" />
              <h2 className="font-bold text-[var(--text-primary)]">
                Enabled Modules by Category
              </h2>
            </div>
          </div>

          <div className="h-72 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="name" stroke={chartAxisColor} />
                <YAxis allowDecimals={false} stroke={chartAxisColor} />
                <Tooltip />
                <Bar dataKey="value" fill="#d4af37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              Quick Access Modules
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Open the modules currently available to your workspace.
            </p>
          </div>

          <Bell className="h-5 w-5 text-[var(--text-muted)]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.key}
                to={module.route}
                className="group rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--brand-gold-border)] hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] transition-colors group-hover:text-[var(--brand-gold)]" />
                </div>

                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[var(--text-primary)]">{module.label}</h3>

                    {module.isCore && (
                      <span className="rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--brand-gold)]">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {module.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Client_Dashboard;
