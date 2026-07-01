import { useEffect, useState } from "react";

import {
  AnalyticsBarWidget,
  AnalyticsLineWidget,
  HRAnalyticsAIInsights,
  HRAnalyticsErrorState,
  HRAnalyticsHeader,
  HRAnalyticsLoadingState,
  WorkforceHealthScore,
} from "../../components/admin/layout/Admin_HRAnalytics_Components.jsx";

import {
  getHRAnalyticsData,
} from "../../services/human_resources/hr_analytics";

export default function AdminHRAnalytics() {

  const [healthScore,setHealthScore]=useState(0);

  const [workforceGrowth,setWorkforceGrowth]=useState([]);
  const [departmentHeadcount,setDepartmentHeadcount]=useState([]);
  const [hiringFunnel,setHiringFunnel]=useState([]);
  const [attendanceTrend,setAttendanceTrend]=useState([]);
  const [payrollTrend,setPayrollTrend]=useState([]);
  const [leaveUsage,setLeaveUsage]=useState([]);
  const [feedbackSentiment,setFeedbackSentiment]=useState([]);
  const [insights,setInsights]=useState([]);

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    loadHRAnalytics();
  },[]);

  async function loadHRAnalytics(){

    try{

      setLoading(true);
      setError("");

      const data=await getHRAnalyticsData();

      setHealthScore(data.healthScore||0);

      setWorkforceGrowth(data.workforceGrowth||[]);
      setDepartmentHeadcount(data.departmentHeadcount||[]);
      setHiringFunnel(data.hiringFunnel||[]);
      setAttendanceTrend(data.attendanceTrend||[]);
      setPayrollTrend(data.payrollTrend||[]);
      setLeaveUsage(data.leaveUsage||[]);
      setFeedbackSentiment(data.feedbackSentiment||[]);
      setInsights(data.insights||[]);

    }catch(err){

      console.error(err);
      setError(err.message);

    }finally{

      setLoading(false);

    }

  }

  return (

    <div className="space-y-6">

      <HRAnalyticsHeader
        onRefresh={loadHRAnalytics}
      />

      {loading && <HRAnalyticsLoadingState />}

      {!loading && error && (
        <HRAnalyticsErrorState
          message={error}
          onRetry={loadHRAnalytics}
        />
      )}

      {!loading && !error && (
        <>

          <WorkforceHealthScore
            score={healthScore}
          />

          <HRAnalyticsAIInsights
            insights={insights}
          />

          <div className="grid gap-6 xl:grid-cols-2">

            <AnalyticsLineWidget
              title="Workforce Growth"
              subtitle="Employee growth trend"
              data={workforceGrowth}
            />

            <AnalyticsBarWidget
              title="Department Headcount"
              subtitle="Employee distribution"
              data={departmentHeadcount}
            />

            <AnalyticsBarWidget
              title="Hiring Funnel"
              subtitle="Recruitment conversion"
              data={hiringFunnel}
            />

            <AnalyticsLineWidget
              title="Attendance Trend"
              subtitle="Attendance history"
              data={attendanceTrend}
              suffix="%"
            />

            <AnalyticsLineWidget
              title="Payroll Trend"
              subtitle="Net payroll history"
              data={payrollTrend}
            />

            <AnalyticsBarWidget
              title="Leave Usage"
              subtitle="Leave consumption"
              data={leaveUsage}
            />

            <AnalyticsBarWidget
              title="Feedback Sentiment"
              subtitle="Sentiment distribution"
              data={feedbackSentiment}
            />

          </div>

        </>
      )}

    </div>

  );

}
