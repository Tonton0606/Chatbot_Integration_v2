import { useMemo, useState } from "react";

import {
  CapitalStructure,
  CommunicationsFeed,
  DocumentsLibrary,
  ESGScorecard,
  ExportDeckModal,
  FinancialProjections,
  FinancialSnapshot,
  FundingTimeline,
  GrowthChart,
  InvestorDetailDrawer,
  InvestorDirectory,
  InvestorIntelligenceBanner,
  InvestorKPIGrid,
  InvestorRelationsHeader,
  ScheduleMeetingModal,
  SendUpdateModal,
  ToastStack,
  UpcomingEvents,
} from "../../components/admin/layout/Admin_InvestorRelations_Components.jsx";

/* ============================================================
   MOCK DATA
   --------------------------------------------------------------
   Frontend-only. All values realistic for a Series-B SaaS in PH.
   Replace these generators with API/Supabase calls once backend
   (MVC) is wired in. Each generator returns a stable shape so
   the UI works without modification.
============================================================ */

const MOCK_KPIS = {
  valuation: 85_000_000,
  valuationDelta: 18.4,
  totalRaised: 12_500_000,
  fundingRounds: 4,
  activeInvestors: 89,
  totalInvestors: 156,
  mrr: 487_000,
  mrrDelta: 8.2,
  arr: 5_844_000,
  arrDelta: 41.7,
  runwayMonths: 22,
  monthlyBurn: 285_000,
};

const MOCK_INSIGHTS = {
  confidence: 92,
  summary:
    "Series-B momentum holds: ARR grew 41.7% YoY with healthy gross retention (118%). Two strategic LPs signaled interest in Series C — expected close window Q3 2027 at $145M post-money.",
  highlights: [
    "Top-quartile growth efficiency: Net New ARR / Net Burn = 1.47x",
    "Two anchor LPs ready to lead Series C at ~$145M post-money",
    "Investor NPS climbed +14 pts after Q4 board pack restructure",
    "Cap-table headroom: 8.5% option pool refresh pending board approval",
  ],
};

const MOCK_SHAREHOLDERS = [
  { id: 1, name: "Founders & Co-founders", type: "Founders", percentage: 38.4, investment: 0 },
  { id: 2, name: "Kalakal Ventures", type: "VC", percentage: 22.1, investment: 5_500_000 },
  { id: 3, name: "Pacific Bridge Capital", type: "VC", percentage: 14.6, investment: 3_400_000 },
  { id: 4, name: "Strategic Investors Fund", type: "PE", percentage: 9.8, investment: 2_300_000 },
  { id: 5, name: "Angel Syndicate (12)", type: "Angel", percentage: 6.1, investment: 1_300_000 },
  { id: 6, name: "Employee Stock Option Pool", type: "ESOP", percentage: 8.5, investment: 0 },
  { id: 7, name: "Convertible Notes (SAFE)", type: "Family", percentage: 0.5, investment: 0 },
];

const MOCK_FUNDING_ROUNDS = [
  {
    id: 1,
    stage: "Seed",
    leadInvestor: "Kalakal Ventures",
    amount: 1_200_000,
    postMoney: 8_000_000,
    closedAt: "2022-04-12",
    status: "Closed",
    participants: ["Angel Syndicate", "Founders Friends & Family"],
  },
  {
    id: 2,
    stage: "Series A",
    leadInvestor: "Pacific Bridge Capital",
    amount: 3_500_000,
    postMoney: 22_000_000,
    closedAt: "2023-09-21",
    status: "Closed",
    participants: ["Kalakal Ventures (follow-on)", "Manila Tech Angels", "Strategic Investors Fund"],
  },
  {
    id: 3,
    stage: "Series A+",
    leadInvestor: "Strategic Investors Fund",
    amount: 2_800_000,
    postMoney: 38_000_000,
    closedAt: "2024-11-18",
    status: "Closed",
    participants: ["Pacific Bridge (follow-on)", "Sea Group Ventures"],
  },
  {
    id: 4,
    stage: "Series B",
    leadInvestor: "Pacific Bridge Capital",
    amount: 5_000_000,
    postMoney: 85_000_000,
    closedAt: "2026-02-14",
    status: "Closed",
    participants: ["Kalakal Ventures", "Strategic Investors Fund", "New: Heritage Asia Growth"],
  },
];

const MOCK_REVENUE_SERIES = [
  { month: "Jun", revenue: 312_000 },
  { month: "Jul", revenue: 335_000 },
  { month: "Aug", revenue: 358_000 },
  { month: "Sep", revenue: 372_000 },
  { month: "Oct", revenue: 391_000 },
  { month: "Nov", revenue: 408_000 },
  { month: "Dec", revenue: 421_000 },
  { month: "Jan", revenue: 435_000 },
  { month: "Feb", revenue: 449_000 },
  { month: "Mar", revenue: 461_000 },
  { month: "Apr", revenue: 473_000 },
  { month: "May", revenue: 487_000 },
];

const MOCK_FINANCIAL_METRICS = [
  { label: "Gross Margin", value: "76.4%", delta: 2.1 },
  { label: "Net Retention", value: "118%", delta: 4.5 },
  { label: "CAC Payback", value: "11 mo", delta: -2.0 },
  { label: "LTV / CAC", value: "4.8x", delta: 12.0 },
];

const MOCK_ARR_GROWTH = [
  { label: "Q1 25", value: 2_100_000 },
  { label: "Q2 25", value: 2_750_000 },
  { label: "Q3 25", value: 3_480_000 },
  { label: "Q4 25", value: 4_290_000 },
  { label: "Q1 26", value: 5_100_000 },
  { label: "Q2 26", value: 5_844_000 },
];

const MOCK_INVESTORS = [
  {
    id: "inv-1",
    name: "Kalakal Ventures",
    type: "VC",
    location: "Makati, Philippines",
    investment: 5_500_000,
    percentage: 22.1,
    round: "Seed → Series B (lead, follow-on)",
    joinedAt: "2022-04-12",
    lastContact: "2026-05-08",
    status: "active",
    sentiment: 88,
    contactPerson: "Maria Linsangan",
    contactRole: "Managing Partner",
    contactEmail: "maria@kalakalvc.ph",
    contactPhone: "+63 917 555 1042",
    notes:
      "Anchor LP across rounds. Has signaled willingness to lead Series C with $25M ticket. Wants quarterly product roadmap reviews going forward.",
    recentActivity: [
      { type: "meeting", title: "Series C readiness review", date: "2026-05-08" },
      { type: "email", title: "Q1 board pack acknowledged", date: "2026-04-22" },
      { type: "call", title: "Pricing strategy alignment", date: "2026-03-14" },
    ],
  },
  {
    id: "inv-2",
    name: "Pacific Bridge Capital",
    type: "VC",
    location: "Singapore",
    investment: 3_400_000,
    percentage: 14.6,
    round: "Series A (lead), Series B (lead)",
    joinedAt: "2023-09-21",
    lastContact: "2026-05-12",
    status: "engaged",
    sentiment: 91,
    contactPerson: "Daniel Wu",
    contactRole: "Partner",
    contactEmail: "dwu@pacificbridge.sg",
    contactPhone: "+65 6789 0142",
    notes:
      "Most active board observer. Pushing for stronger SEA expansion narrative ahead of Series C. Introducing potential Heritage Asia partner.",
    recentActivity: [
      { type: "meeting", title: "Board strategy session", date: "2026-05-12" },
      { type: "update", title: "Investor letter sent", date: "2026-05-01" },
      { type: "report", title: "Operating metrics review", date: "2026-04-18" },
    ],
  },
  {
    id: "inv-3",
    name: "Strategic Investors Fund",
    type: "PE",
    location: "Hong Kong",
    investment: 2_300_000,
    percentage: 9.8,
    round: "Series A+, Series B",
    joinedAt: "2024-11-18",
    lastContact: "2026-04-30",
    status: "active",
    sentiment: 74,
    contactPerson: "Anika Sharma",
    contactRole: "Investment Director",
    contactEmail: "anika@sifund.hk",
    contactPhone: "+852 3158 4422",
    notes:
      "Focused on unit economics. Quarterly cohort analyses expected. Concern flagged around expansion CAC in tier-3 cities.",
    recentActivity: [
      { type: "call", title: "Unit economics deep dive", date: "2026-04-30" },
      { type: "email", title: "Cohort dashboard requested", date: "2026-04-12" },
    ],
  },
  {
    id: "inv-4",
    name: "Sea Group Ventures",
    type: "Strategic",
    location: "Singapore",
    investment: 1_400_000,
    percentage: 5.4,
    round: "Series A+",
    joinedAt: "2024-11-18",
    lastContact: "2026-03-22",
    status: "warm",
    sentiment: 68,
    contactPerson: "Reginald Tan",
    contactRole: "Strategic Investments",
    contactEmail: "reginald.tan@seagroup.com",
    contactPhone: "+65 9876 5544",
    notes:
      "Strategic angle on fintech integrations. Open to commercial partnership beyond financial investment.",
    recentActivity: [
      { type: "meeting", title: "Partnership scoping", date: "2026-03-22" },
      { type: "update", title: "Quarterly investor update", date: "2026-03-01" },
    ],
  },
  {
    id: "inv-5",
    name: "Heritage Asia Growth",
    type: "VC",
    location: "Tokyo, Japan",
    investment: 2_100_000,
    percentage: 7.8,
    round: "Series B (new)",
    joinedAt: "2026-02-14",
    lastContact: "2026-05-15",
    status: "engaged",
    sentiment: 84,
    contactPerson: "Hiroshi Nakamura",
    contactRole: "Principal",
    contactEmail: "h.nakamura@heritageasia.jp",
    contactPhone: "+81 3 5555 9921",
    notes:
      "Newest institutional investor. Onboarding to monthly metrics drip. Bullish on Japan expansion thesis — keep informed of GTM plans.",
    recentActivity: [
      { type: "meeting", title: "Welcome / 90-day plan", date: "2026-05-15" },
      { type: "email", title: "Diligence appendix shared", date: "2026-02-08" },
    ],
  },
  {
    id: "inv-6",
    name: "Manila Tech Angels",
    type: "Angel",
    location: "Manila, Philippines",
    investment: 850_000,
    percentage: 3.8,
    round: "Seed, Series A",
    joinedAt: "2022-04-12",
    lastContact: "2026-04-04",
    status: "active",
    sentiment: 79,
    contactPerson: "Lara Mendoza",
    contactRole: "Syndicate Lead",
    contactEmail: "lara@manilatechangels.ph",
    contactPhone: "+63 917 222 9183",
    notes:
      "13-member syndicate. Lara handles all communication. Highly active on intro-making and product feedback.",
    recentActivity: [
      { type: "update", title: "Syndicate quarterly digest", date: "2026-04-04" },
      { type: "call", title: "Intro: enterprise prospect", date: "2026-03-18" },
    ],
  },
  {
    id: "inv-7",
    name: "Ortigas Family Office",
    type: "Family",
    location: "Pasig, Philippines",
    investment: 600_000,
    percentage: 2.4,
    round: "Series A",
    joinedAt: "2023-09-21",
    lastContact: "2026-02-11",
    status: "warm",
    sentiment: 62,
    contactPerson: "Carlos Ortigas",
    contactRole: "Director, Alternatives",
    contactEmail: "c.ortigas@ortigasfo.ph",
    contactPhone: "+63 917 888 1100",
    notes:
      "Conservative LP. Prefers semi-annual updates. Open to pro-rata in Series C if metrics maintain.",
    recentActivity: [
      { type: "report", title: "Semi-annual financials sent", date: "2026-02-11" },
    ],
  },
  {
    id: "inv-8",
    name: "Founders Friends & Family SPV",
    type: "Angel",
    location: "Quezon City, Philippines",
    investment: 350_000,
    percentage: 1.4,
    round: "Pre-seed",
    joinedAt: "2021-08-10",
    lastContact: "2025-12-15",
    status: "dormant",
    sentiment: 55,
    contactPerson: "Joey Reyes",
    contactRole: "SPV Lead",
    contactEmail: "joey@frfspv.ph",
    contactPhone: "+63 917 100 2200",
    notes:
      "Early backers. Minimal involvement. Annual update sufficient — last touchpoint was December holiday letter.",
    recentActivity: [
      { type: "update", title: "Year-end holiday letter", date: "2025-12-15" },
    ],
  },
];

const MOCK_COMMUNICATIONS = [
  {
    id: 1,
    type: "report",
    title: "Q1 2026 Board Pack",
    recipient: "Board of Directors (5)",
    recipientsCount: 5,
    date: "2026-05-01",
    summary: "Quarterly financials, ARR breakdown by cohort, hiring plan, and Series C readiness assessment.",
    read: true,
  },
  {
    id: 2,
    type: "update",
    title: "April Investor Letter",
    recipient: "All Active Investors",
    recipientsCount: 89,
    date: "2026-04-28",
    summary: "Product launches, customer wins, key hires, financial highlights, and ask: 3 warm intros for enterprise pilot.",
    read: true,
  },
  {
    id: 3,
    type: "meeting",
    title: "Series C Anchor LP Discussion",
    recipient: "Kalakal Ventures",
    recipientsCount: 2,
    date: "2026-05-08",
    summary: "Maria walked through Kalakal’s appetite for a $25M lead at $145M pre. Term-sheet draft due 2026-06-15.",
    read: true,
  },
  {
    id: 4,
    type: "email",
    title: "Cohort Dashboard Requested",
    recipient: "Strategic Investors Fund",
    recipientsCount: 1,
    date: "2026-04-12",
    summary: "Anika asked for self-serve access to cohort retention dashboards before next board cycle.",
    read: false,
  },
  {
    id: 5,
    type: "call",
    title: "Heritage Asia 90-day Onboarding",
    recipient: "Heritage Asia Growth",
    recipientsCount: 1,
    date: "2026-05-15",
    summary: "Joint planning session covering Japan GTM, regulatory considerations, and shared introductions roadmap.",
    read: true,
  },
];

const MOCK_EVENTS = [
  { id: 1, title: "Q2 Board Meeting", date: "2026-06-12", time: "10:00 AM PHT", location: "Hybrid · BGC HQ + Zoom", kind: "Board", attendees: 7, priority: "high" },
  { id: 2, title: "Series C Term Sheet Review", date: "2026-06-18", time: "2:00 PM PHT", location: "Kalakal Office, Makati", kind: "Strategic", attendees: 4, priority: "high" },
  { id: 3, title: "Investor Townhall (Active LPs)", date: "2026-06-25", time: "9:00 AM PHT", location: "Zoom Webinar", kind: "Townhall", attendees: 89, priority: "normal" },
  { id: 4, title: "Heritage Asia QBR", date: "2026-07-09", time: "11:00 AM PHT", location: "Tokyo · Heritage Asia HQ", kind: "1:1", attendees: 3, priority: "high" },
  { id: 5, title: "Annual Investor Day 2026", date: "2026-09-22", time: "All day", location: "Shangri-La BGC", kind: "Event", attendees: 120, priority: "high" },
];

const MOCK_DOCUMENTS = [
  { id: 1, title: "Investor Deck Q2 2026", category: "Pitch Deck", pages: 28, size: "12.4 MB", updatedAt: "2026-05-01", confidential: true },
  { id: 2, title: "Series B Term Sheet (Executed)", category: "Legal", pages: 14, size: "3.1 MB", updatedAt: "2026-02-14", confidential: true },
  { id: 3, title: "Q1 2026 Board Pack", category: "Board Report", pages: 42, size: "18.7 MB", updatedAt: "2026-05-01", confidential: true },
  { id: 4, title: "Audited Financials 2025", category: "Financials", pages: 36, size: "6.2 MB", updatedAt: "2026-03-30", confidential: true },
  { id: 5, title: "Cap Table (Pro Forma post-Series B)", category: "Cap Table", pages: 6, size: "0.8 MB", updatedAt: "2026-02-15", confidential: true },
  { id: 6, title: "Public One-Pager", category: "Marketing", pages: 1, size: "0.3 MB", updatedAt: "2026-04-20", confidential: false },
];

const MOCK_PROJECTIONS = [
  { period: "Q3 2026", scenario: "Base", revenue: 1_650_000, ebitda: 280_000, growth: 13.4, confidence: 84 },
  { period: "FY 2026", scenario: "Bull", revenue: 7_200_000, ebitda: 1_400_000, growth: 48.2, confidence: 71 },
  { period: "FY 2027", scenario: "Bear", revenue: 9_100_000, ebitda: 1_600_000, growth: 26.4, confidence: 62 },
];

const MOCK_ESG = {
  tier: "A",
  pillars: [
    { name: "Environmental", score: 78, summary: "Carbon-neutral cloud footprint. Tracking Scope 1–2 quarterly." },
    { name: "Social", score: 86, summary: "Gender parity in leadership (52% women). Filipino-first hiring." },
    { name: "Governance", score: 91, summary: "Independent board majority. Audit committee chaired by external CPA." },
  ],
};

/* ============================================================
   PAGE
============================================================ */
export default function AdminInvestorRelations() {
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [exportOpen, setExportOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const pushToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts((arr) => [...arr, { id, ...toast }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), 5000);
  };
  const dismissToast = (id) => setToasts((arr) => arr.filter((t) => t.id !== id));

  const filteredInvestors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_INVESTORS.filter((inv) => {
      if (typeFilter !== "all" && inv.type !== typeFilter) return false;
      if (!q) return true;
      return (
        inv.name.toLowerCase().includes(q) ||
        inv.location.toLowerCase().includes(q) ||
        inv.contactPerson.toLowerCase().includes(q)
      );
    });
  }, [search, typeFilter]);

  return (
    <div className="space-y-6 pb-12">
      <InvestorRelationsHeader
        onExportDeck={() => setExportOpen(true)}
        onSendUpdate={() => setUpdateOpen(true)}
        onScheduleMeeting={() => setMeetingOpen(true)}
      />

      <InvestorIntelligenceBanner insights={MOCK_INSIGHTS} />

      <InvestorKPIGrid kpis={MOCK_KPIS} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CapitalStructure shareholders={MOCK_SHAREHOLDERS} />
        <FundingTimeline rounds={MOCK_FUNDING_ROUNDS} />
      </div>

      <FinancialSnapshot revenueSeries={MOCK_REVENUE_SERIES} metrics={MOCK_FINANCIAL_METRICS} />

      <GrowthChart data={MOCK_ARR_GROWTH} title="ARR Growth · 6 Quarters" subtitle="QoQ trajectory" />

      <InvestorDirectory
        investors={filteredInvestors}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onSelectInvestor={setSelectedInvestor}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CommunicationsFeed
          items={MOCK_COMMUNICATIONS}
          onComposeUpdate={() => setUpdateOpen(true)}
        />
        <UpcomingEvents events={MOCK_EVENTS} />
      </div>

      <FinancialProjections projections={MOCK_PROJECTIONS} />

      <DocumentsLibrary documents={MOCK_DOCUMENTS} />

      <ESGScorecard esg={MOCK_ESG} />

      {selectedInvestor && (
        <InvestorDetailDrawer
          investor={selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
          onLogActivity={(inv) => {
            pushToast({
              kind: "success",
              title: "Activity logged",
              description: `Touchpoint with ${inv.name} recorded to CRM.`,
            });
            setSelectedInvestor(null);
          }}
        />
      )}

      <ExportDeckModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={(result) =>
          pushToast({
            kind: "success",
            title: "Deck generated",
            description: `${result.fileName} · ${result.sectionCount} sections ready to download.`,
          })
        }
      />

      <SendUpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onSend={(payload) =>
          pushToast({
            kind: "success",
            title: payload.scheduledAt ? "Update scheduled" : "Update sent",
            description: payload.scheduledAt
              ? `Queued for ${new Date(payload.scheduledAt).toLocaleString()} to ${payload.audienceMeta?.count} recipients.`
              : `Delivered to ${payload.audienceMeta?.count} investors.`,
          })
        }
      />

      <ScheduleMeetingModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        investors={MOCK_INVESTORS}
        onSchedule={(payload) =>
          pushToast({
            kind: "success",
            title: "Meeting scheduled",
            description: `“${payload.title}” on ${payload.date} at ${payload.time} · ${payload.invitees.length} invitees.`,
          })
        }
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
