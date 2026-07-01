import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  HeartHandshake,
  RefreshCw,
  ShieldAlert,
  Target,
  Users,
  Wallet,
} from "lucide-react";

import { getHRAnalyticsData } from "../../services/human_resources/hr_analytics";

function formatPhp(value=0){
  return new Intl.NumberFormat("en-PH",{
    style:"currency",
    currency:"PHP",
    maximumFractionDigits:0
  }).format(value);
}

function Card({label,value,subtext,icon:Icon}) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-xs uppercase text-[var(--text-muted)]">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
            {value}
          </h3>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {subtext}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)]">
          <Icon className="h-5 w-5 text-[var(--brand-gold)]"/>
        </div>
      </div>
    </div>
  );
}

export default function AdminHRDashboard(){

  const [summary,setSummary]=useState({});
  const [insights,setInsights]=useState([]);

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function loadDashboard(){

    try{

      setLoading(true);

      const data=await getHRAnalyticsData();

      setSummary(data.summary||{});
      setInsights(data.insights||[]);

    }catch(err){

      setError(err.message);

    }finally{

      setLoading(false);

    }

  }

  useEffect(()=>{
    loadDashboard();
  },[]);

  return(
    <div className="space-y-6">

      <div className="flex justify-between border-b border-[var(--border-color)] pb-6">

        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            HR Dashboard
          </h1>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Workforce operational control center
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-color)] px-4 py-2"
        >
          <RefreshCw className="h-4 w-4"/>
          Refresh
        </button>

      </div>

      {loading && (
        <div className="rounded-3xl bg-[var(--bg-card)] p-10 text-center">
          Loading...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl bg-[var(--danger-soft)] p-5">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <Card
              label="Employees"
              value={summary.totalEmployees}
              subtext={`${summary.activeEmployees} active`}
              icon={Users}
            />

            <Card
              label="Attendance"
              value={`${summary.attendanceRate}%`}
              subtext="Today's attendance"
              icon={CheckCircle2}
            />

            <Card
              label="Pending Leave"
              value={summary.pendingLeave}
              subtext={`${summary.approvedLeave} approved`}
              icon={CalendarClock}
            />

            <Card
              label="Payroll Net"
              value={formatPhp(summary.payrollNet)}
              subtext={`Gross ${formatPhp(summary.payrollGross)}`}
              icon={Wallet}
            />

            <Card
              label="Open Jobs"
              value={summary.openJobs}
              subtext={`${summary.candidates} candidates`}
              icon={Briefcase}
            />

            <Card
              label="Performance"
              value={summary.averagePerformanceScore}
              subtext={`${summary.goalProgress}% goals`}
              icon={Target}
            />

            <Card
              label="Engagement"
              value={`${summary.engagementScore}%`}
              subtext="Latest survey"
              icon={HeartHandshake}
            />

            <Card
              label="Retention Risks"
              value={summary.retentionRisks}
              subtext={`${summary.highRisks} high`}
              icon={ShieldAlert}
            />

          </div>

          <div className="rounded-3xl border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] p-5">

            <h3 className="font-bold text-[var(--text-primary)]">
              HR Executive Intelligence
            </h3>

            <div className="mt-4 space-y-3">

              {insights.map(item=>(
                <div
                  key={item.id}
                  className="rounded-2xl bg-[var(--bg-card)] p-4"
                >
                  <div className="flex gap-2">

                    <AlertTriangle className="h-4 w-4 text-[var(--brand-gold)]"/>

                    <div>

                      <h4 className="font-semibold">
                        {item.title}
                      </h4>

                      <p className="text-sm text-[var(--text-secondary)]">
                        {item.detail}
                      </p>

                    </div>

                  </div>
                </div>
              ))}

            </div>

          </div>

        </>
      )}

    </div>
  );
}
