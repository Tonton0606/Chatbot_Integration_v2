import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { supabase } from "../../../config/supabaseClient";
import DraggableChatHead from "../../chat/DraggableChatHead.jsx";
import autoAIEngine from "../../../services/ai/autoAIEngine";
import { speakJarvisWelcome } from "../../../utils/jarvisWelcome";

const TITLES = {
  "/Admin/Dashboard": "Executive Dashboard",
  "/Admin/Analytics": "Analytics",
  "/Admin/BoardMeeting": "Board Meeting View",
  "/Admin/InvestorRelations": "Investor Relations",
  "/Admin/ComplianceRisk": "Compliance & Risk",
  "/Admin/StrategicPlanning": "Strategic Planning",
  "/Admin/CRM": "CRM",
  "/Admin/Deals": "Deals Pipeline",
  "/Admin/Contacts": "Contacts",
  "/Admin/Revenue": "Revenue",
  "/Admin/PipelineAnalytics": "Pipeline Analytics",
  "/Admin/Leaderboard": "Sales Leaderboard",
  "/Admin/Marketing": "Email Campaigns",
  "/Admin/CustomerPortal": "Customer Portal",
  "/Admin/FeedbackPortal": "Feedback Portal",
  "/Admin/Projects": "Projects",
  "/Admin/Tasks": "Tasks",
  "/Admin/Inventory": "Inventory",
  "/Admin/ERPRegistry": "ERP Registry",
  "/Admin/WorkspaceAccess": "Workspace Access",
  "/Admin/WorkspaceAdministration": "Workspace Administration",
  "/Admin/Booking": "Booking",
  "/Admin/DataAnalytics": "Data Analytics",
  "/Admin/Calendar": "Calendar",
  "/Admin/RevenueProjections": "Revenue Forecast",
  "/Admin/Predictive": "Predictive AI",
  "/Admin/Reports": "Reports",
  "/Admin/DataExport": "Data Export",
  "/Admin/HRAnalytics": "HR Analytics",
  "/Admin/Performance": "Performance Management",
  "/Admin/TalentManagement": "Talent Management",
  "/Admin/Recruitment": "Recruitment AI",
  "/Admin/EmployeeEngagement": "Employee Engagement",
  "/Admin/Finance": "Finance Control",
  "/Admin/Treasury": "Treasury",
  "/Admin/BIRCompliance": "BIR Tax Compliance",
  "/Admin/FixedAssets": "Fixed Assets & Depreciation",
  "/Admin/PayrollTax": "Payroll Tax",
  "/Admin/GoogleMapsLeads": "Leads Generator",
  "/Client/Payments": "Payments",
  "/Client/Delivery": "Delivery Tracker",
  "/Client/Workflows": "Workflows",
  "/Client/Notifications": "Notifications",
  "/Client/AuditLogs": "Audit Logs",
  "/Client/Reports": "Reports",
  "/Client/Chatbot": "AI Assistant",
  "/Client/Team": "Team",
  "/Client/Settings": "Settings",
  "/Admin/FinancialPlanning": "Financial Planning",
  "/Admin/FraudDetection": "Fraud Detection",
  "/Admin/Legal": "Legal",
  "/Admin/ContractAnalysis": "Contract Analysis",
  "/Admin/RegulatoryCompliance": "Regulatory Compliance",
  "/Admin/RiskManagement": "Risk Management",
  "/Admin/Research": "Research & Development",
  "/Admin/Innovation": "Innovation Pipeline",
  "/Admin/Patents": "Patents & IP",
  "/Admin/LabManagement": "Lab Management",
  "/Admin/CrossDepartmentAI": "Cross-Department AI",
  "/Admin/ResourceAllocation": "Resource Allocation AI",
  "/Admin/PredictiveAnalytics": "Predictive Analytics Hub",
  "/Admin/AutomatedReporting": "Automated Reporting",
  "/Admin/WorkflowIntelligence": "Workflow Intelligence",
  "/Admin/DigitalTwin": "Digital Twin",
  "/Admin/PrescriptiveAnalytics": "Prescriptive Analytics",
  "/Admin/AnomalyDetection": "Anomaly Detection",
  "/Admin/NaturalLanguageInterface": "Voice & NLP Interface",
  "/Admin/MeetingIntelligence": "Meeting Intelligence",
  "/Admin/DocumentIntelligence": "Document Intelligence",
  "/Admin/CommunicationHub": "Communication Hub",
  "/Admin/CorporateCommunications": "Corporate Communications",
  "/Admin/Team": "Team Management",
  "/Admin/Workflows": "Workflows",
  "/Admin/AuditLogs": "Audit Logs",
  "/Admin/Notifications": "Notifications",
  "/Admin/Security": "Security",
  "/Admin/AccountControl": "Account Control",
  "/Admin/Settings": "Settings",
  "/Admin/OmniChannelInbox": "Omni-Channel Inbox",
  "/Admin/SocialMediaHub": "Social Media Hub",
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const mainRef = useRef(null);

  // Boot the AI automation engine once when admin enters the app
  useEffect(() => {
    autoAIEngine.initialize().catch(() => {});
    return () => autoAIEngine.destroy();
  }, []);

  useEffect(() => {
    let heartbeatId;

    async function updatePresence() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      await supabase.from("user_presence").upsert({
        user_id: authUser.id,
        last_seen_at: new Date().toISOString(),
        is_online: true,
        updated_at: new Date().toISOString(),
      });
    }

    updatePresence();
    heartbeatId = window.setInterval(updatePresence, 60000);

    return () => {
      if (heartbeatId) window.clearInterval(heartbeatId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || !mounted) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (mounted) {
        setUser(profile || authUser);
      }
    }

    getUser();

    window.addEventListener('profileUpdated', getUser);

    return () => {
      mounted = false;
      window.removeEventListener('profileUpdated', getUser);
    };
  }, []);

  // JARVIS-style spoken welcome — once per session, after the profile loads.
  useEffect(() => {
    if (user) speakJarvisWelcome(user.full_name || user.fullName || user.name || user.email);
  }, [user]);

  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="admin-shell h-screen w-full overflow-hidden bg-[var(--bg-app)]">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin sidebar"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen min-w-0 flex-col lg:ml-[280px]">
        <AdminHeader
          onMenu={() => setSidebarOpen(true)}
          title={TITLES[location.pathname] || "Hermes Admin"}
          user={user}
        />

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg-app)] px-4 py-4 lg:px-6 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <DraggableChatHead userRole="admin" moduleContext={TITLES[location.pathname] || "Admin Dashboard"} />
    </div>
  );
}
