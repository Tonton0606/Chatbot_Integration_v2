import { useState } from "react";

import {
  CompetitiveLandscape,
  ExportStrategyDeckModal,
  InitiativeDetailDrawer,
  InitiativesBoard,
  MarketOpportunities,
  NewObjectiveModal,
  ObjectiveDetailDrawer,
  OKRBurndownChart,
  OKRTracker,
  RiskRegister,
  RoadmapTimeline,
  ScheduleReviewModal,
  StakeholderMap,
  StrategicHealthDashboard,
  StrategicInsightsBanner,
  StrategicKPIGrid,
  StrategicPlanningHeader,
  SWOTMatrix,
  ToastStack,
  VisionMissionBanner,
} from "../../components/admin/layout/Admin_StrategicPlanning_Components.jsx";

/* ============================================================
   MOCK DATA
   --------------------------------------------------------------
   All static for UI/UX review. Designed so each section is
   independently swappable to live data once the MVC backend
   stands up. Mock numbers are calibrated for a Series-B SaaS in
   the Philippines competing in the SEA enterprise market.
============================================================ */

const MOCK_VISION = {
  vision:
    "Be Southeast Asia's most trusted AI Enterprise Operating System — the default control plane for ambitious mid-market companies.",
  mission:
    "Empower every Filipino-led enterprise to run smarter, faster, and more decisively with AI-native workflows.",
  northStarLabel: "Activated Workspaces / Quarter",
  northStarValue: "1,284",
  northStarDelta: 14.6,
};

const MOCK_INSIGHTS = {
  theme: "Q2 2026 · Compounding Land-and-Expand",
  summary:
    "Strategy AI detected a 2.3x expansion lift when premium support is bundled with enterprise tier. Recommend re-prioritizing two initiatives to capture this window before competitor X closes its catch-up cycle.",
  actions: [
    {
      title: "Promote 'Enterprise Premium Support' to P0",
      description: "Cross-functional task force needed by 2026-06-01 to capitalize on 2.3x expansion lift.",
    },
    {
      title: "Defer 'Tier-3 City Expansion' to FY27 H1",
      description: "Current CAC payback (24 mo) outside guardrails. Pause until unit economics improve.",
    },
    {
      title: "Accelerate Series C raise window",
      description: "Funding intelligence suggests narrow window in Q3 2027 before macro shift.",
    },
    {
      title: "Brief board on competitive moat erosion",
      description: "Two competitors closing feature gap. Articulate AI defensibility and switching cost moat.",
    },
  ],
};

const MOCK_KPIS = {
  totalOKRs: 12,
  onTrackOKRs: 8,
  atRiskOKRs: 3,
  completedOKRs: 1,
  initiativeProgress: 67,
  activeInitiatives: 14,
  alignmentScore: 88,
  marketRank: 2,
  marketShare: 18.5,
  riskLevel: "Medium",
  openRisks: 9,
  eNPS: 64,
  eNPSDelta: 9,
};

const MOCK_OBJECTIVES = [
  {
    id: "obj-1",
    theme: "Growth",
    title: "Cross $7M ARR with healthy unit economics",
    rationale:
      "Series C narrative requires sustained 40%+ ARR growth at <12mo CAC payback. This objective anchors the GTM and pricing strategy for the year.",
    owner: "Maya Reyes (COO)",
    dueDate: "2026-12-31",
    status: "on-track",
    keyResults: [
      { id: 1, title: "Achieve $7.2M ARR (run-rate)", target: "$7.2M", progress: 73, owner: "VP Sales" },
      { id: 2, title: "Keep CAC payback ≤ 11 months", target: "≤ 11 mo", progress: 84, owner: "VP Marketing" },
      { id: 3, title: "Net retention ≥ 115%", target: "≥ 115%", progress: 92, owner: "VP CS" },
    ],
    linkedInitiatives: ["Enterprise Pricing Refresh", "AI Lead Scoring v2", "Customer Health Score Rollout"],
  },
  {
    id: "obj-2",
    theme: "Product",
    title: "Ship the AI-first command bar across all admin modules",
    rationale:
      "Investor-facing differentiator. Becomes a wedge against legacy ERPs and a key Series-C demo moment.",
    owner: "Karlo Estrella (CTO)",
    dueDate: "2026-09-30",
    status: "at-risk",
    keyResults: [
      { id: 1, title: "Cover 80% of admin module routes", target: "≥ 80%", progress: 48, owner: "Eng Lead" },
      { id: 2, title: "Reach 30% weekly active usage", target: "≥ 30% WAU", progress: 22, owner: "PM Lead" },
      { id: 3, title: "Latency p95 < 600ms", target: "< 600ms", progress: 64, owner: "Platform Lead" },
    ],
    linkedInitiatives: ["AI Command Bar v1", "Vector Embedding Migration", "Internal Tools Refactor"],
  },
  {
    id: "obj-3",
    theme: "Market",
    title: "Establish category leadership in PH enterprise AI",
    rationale:
      "Brand awareness deficit vs incumbents is closing slowly. We need a 12-month push to own the analyst narrative.",
    owner: "Camille Salvador (CMO)",
    dueDate: "2026-12-31",
    status: "on-track",
    keyResults: [
      { id: 1, title: "Featured in 3 tier-1 analyst reports", target: "3", progress: 67, owner: "AR Lead" },
      { id: 2, title: "Organic SEO impressions +60%", target: "+60%", progress: 71, owner: "Growth Lead" },
      { id: 3, title: "Earned media reach 2M+", target: "2M+", progress: 54, owner: "PR Lead" },
    ],
    linkedInitiatives: ["Hermes Analyst Day", "Public IR Site Refresh", "Thought-Leader Speaker Program"],
  },
  {
    id: "obj-4",
    theme: "People",
    title: "Build the org to ship at Series-B scale",
    rationale:
      "Velocity is the constraint, not capital. Org design and senior hiring will unlock the next phase.",
    owner: "Anika Reyes (Chief of Staff)",
    dueDate: "2026-12-31",
    status: "on-track",
    keyResults: [
      { id: 1, title: "Fill VP Eng + VP People roles", target: "2 hires", progress: 50, owner: "Founder" },
      { id: 2, title: "Maintain eNPS ≥ 60", target: "≥ 60", progress: 100, owner: "People Lead" },
      { id: 3, title: "Time-to-productivity ≤ 45 days", target: "≤ 45 days", progress: 78, owner: "People Ops" },
    ],
    linkedInitiatives: ["Senior Hiring Sprint", "Career Framework v2", "Hermes Way Onboarding"],
  },
];

const MOCK_INITIATIVES = [
  { id: 1, name: "Enterprise Pricing Refresh", description: "Restructure tiers, add usage-based meter for AI calls.", status: "active", priority: "P0", progress: 62, owner: "VP Sales", budget: 220_000 },
  { id: 2, name: "AI Command Bar v1", description: "Ship cross-module command-K interface backed by Hermes LLM.", status: "active", priority: "P0", progress: 48, owner: "CTO", budget: 540_000 },
  { id: 3, name: "Customer Health Score Rollout", description: "Predictive churn & expansion scoring; pipe to CS playbooks.", status: "active", priority: "P1", progress: 71, owner: "VP CS", budget: 180_000 },
  { id: 4, name: "Hermes Analyst Day", description: "PH-first analyst & press briefing in BGC, Q3.", status: "planning", priority: "P1", progress: 18, owner: "CMO", budget: 260_000 },
  { id: 5, name: "Tier-3 City Expansion (PH)", description: "Pilot 3 secondary cities with regional sales partners.", status: "at-risk", priority: "P2", progress: 26, owner: "VP Sales", budget: 410_000 },
  { id: 6, name: "Vector Embedding Migration", description: "Move from baseline embeddings to fine-tuned Filipino-context model.", status: "active", priority: "P1", progress: 55, owner: "Platform Lead", budget: 320_000 },
  { id: 7, name: "Senior Hiring Sprint", description: "Close VP Eng and VP People by end of Q2.", status: "active", priority: "P0", progress: 50, owner: "Founder", budget: 95_000 },
  { id: 8, name: "Public IR Site Refresh", description: "Build investor-grade public site with KPIs and audited financials.", status: "planning", priority: "P2", progress: 12, owner: "CMO", budget: 80_000 },
  { id: 9, name: "Series C Pre-Marketing", description: "Selectively engage 8 Series-C ready funds for early dialogue.", status: "active", priority: "P0", progress: 35, owner: "Founder", budget: 60_000 },
  { id: 10, name: "Internal Tools Refactor", description: "Consolidate ops dashboards onto the Hermes platform.", status: "completed", priority: "P2", progress: 100, owner: "Eng Lead", budget: 150_000 },
  { id: 11, name: "Customer Advisory Board", description: "Stand up 10-customer advisory board, quarterly cadence.", status: "completed", priority: "P1", progress: 100, owner: "VP CS", budget: 45_000 },
  { id: 12, name: "AI Safety & Governance Layer", description: "Formal model evaluation + governance for enterprise buyers.", status: "active", priority: "P1", progress: 42, owner: "CTO", budget: 200_000 },
  { id: 13, name: "Thought-Leader Speaker Program", description: "Place execs on 12+ tier-1 stages by year-end.", status: "active", priority: "P2", progress: 67, owner: "PR Lead", budget: 70_000 },
  { id: 14, name: "Hermes Way Onboarding", description: "Standardize 30-60-90 onboarding playbook across functions.", status: "planning", priority: "P2", progress: 22, owner: "People Lead", budget: 35_000 },
];

const MOCK_SWOT = {
  strengths: [
    { title: "Filipino-context AI", detail: "Fine-tuned for local language, tax, and regulatory context." },
    { title: "Founder-led GTM", detail: "Sub-30 day enterprise sales cycle with anchor design partners." },
    { title: "Strong unit economics", detail: "LTV/CAC = 4.8x, gross margin 76%." },
    { title: "Tier-1 LP base", detail: "Endorsement from anchor Series-B leads opens future doors." },
  ],
  weaknesses: [
    { title: "Single-region revenue", detail: "94% of revenue still Philippines-based." },
    { title: "Brand awareness gap", detail: "Outside the top-3 in unaided recall for PH enterprise AI." },
    { title: "Sr leadership benches", detail: "VP Eng, VP People still unfilled — load on founders is high." },
  ],
  opportunities: [
    { title: "SEA expansion", detail: "Vietnam and Indonesia mid-market opening up for SaaS purchases." },
    { title: "AI governance demand", detail: "BSP draft regs on AI create a moat-building moment." },
    { title: "Bundled premium support", detail: "Cross-sell lift of 2.3x detected — productize quickly." },
  ],
  threats: [
    { title: "Global incumbent localizes", detail: "If a Tier-1 vendor invests in PH go-to-market, gap closes fast." },
    { title: "Macro tightening", detail: "Higher rates may compress IT budgets in Q3-Q4." },
    { title: "Talent poaching", detail: "Sr Filipino AI talent in demand from US/Singapore remote-first firms." },
  ],
};

const MOCK_ROADMAP = [
  {
    quarter: "Q1 2026",
    theme: "Foundation Reset",
    status: "completed",
    milestones: [
      { label: "Series B close", done: true },
      { label: "Org redesign", done: true },
      { label: "Customer health scoring live", done: true },
    ],
  },
  {
    quarter: "Q2 2026",
    theme: "Compounding Growth",
    status: "active",
    milestones: [
      { label: "Pricing refresh GA", done: true },
      { label: "AI command bar beta", done: false },
      { label: "Senior hiring sprint", done: false },
      { label: "Customer Advisory Board #1", done: true },
    ],
  },
  {
    quarter: "Q3 2026",
    theme: "Category Leadership",
    status: "planned",
    milestones: [
      { label: "Hermes Analyst Day", done: false },
      { label: "Series C pre-marketing", done: false },
      { label: "Vietnam pilot launch", done: false },
    ],
  },
  {
    quarter: "Q4 2026",
    theme: "Series C Readiness",
    status: "planned",
    milestones: [
      { label: "Series C term sheet", done: false },
      { label: "Audited financials FY26", done: false },
      { label: "Enterprise SLA program", done: false },
    ],
  },
];

const MOCK_COMPETITORS = [
  { name: "Northstar OS", hq: "Singapore", position: "Leader", share: 24.1, strength: "SEA-wide brand", weakness: "Generic AI features", threat: "Medium" },
  { name: "ExponifyPH", hq: "Makati, PH", position: "Challenger", share: 18.5, strength: "PH-native AI depth", weakness: "Single-region revenue", threat: "Low" },
  { name: "Vertex Cloud Suite", hq: "Hong Kong", position: "Challenger", share: 15.2, strength: "Enterprise-grade compliance", weakness: "Slow innovation cycle", threat: "High" },
  { name: "Pesos AI", hq: "Manila, PH", position: "Niche", share: 9.8, strength: "Fintech vertical focus", weakness: "Narrow ICP", threat: "Medium" },
  { name: "OpenStack PH (legacy)", hq: "Manila, PH", position: "Niche", share: 6.4, strength: "Government accounts", weakness: "Aging architecture", threat: "Low" },
];

const MOCK_RISKS = [
  { id: 1, title: "Series C window slips beyond Q3 2027", category: "Capital", likelihood: "Medium", impact: "High", severity: "High", owner: "Founder", mitigation: "Anchor LP commitments by Q4 2026." },
  { id: 2, title: "Macro IT-budget compression", category: "Market", likelihood: "Medium", impact: "Medium", severity: "Medium", owner: "VP Sales", mitigation: "Lock annual contracts; expand into resilient verticals." },
  { id: 3, title: "AI safety incident", category: "Product", likelihood: "Low", impact: "High", severity: "High", owner: "CTO", mitigation: "Ship governance layer (init #12) by Q3." },
  { id: 4, title: "Senior hiring slips", category: "People", likelihood: "Medium", impact: "Medium", severity: "Medium", owner: "Founder", mitigation: "Retainer with two executive search firms." },
  { id: 5, title: "Competitor localizes PH context", category: "Competitive", likelihood: "Medium", impact: "High", severity: "High", owner: "CMO", mitigation: "Accelerate Filipino-context moat narrative." },
  { id: 6, title: "Regulatory shift on data residency", category: "Regulatory", likelihood: "Medium", impact: "Medium", severity: "Medium", owner: "Legal", mitigation: "PH-only data residency option for enterprise tier." },
  { id: 7, title: "Cloud vendor concentration", category: "Operations", likelihood: "Low", impact: "Medium", severity: "Low", owner: "Platform Lead", mitigation: "Multi-cloud evaluation budgeted FY27." },
  { id: 8, title: "Currency volatility", category: "Financial", likelihood: "Medium", impact: "Low", severity: "Low", owner: "Finance Lead", mitigation: "USD pricing for non-PH revenue; FX hedging." },
  { id: 9, title: "Brand reputation event", category: "Brand", likelihood: "Low", impact: "High", severity: "Medium", owner: "CMO", mitigation: "Crisis-comms playbook v2 stood up." },
];

const MOCK_OPPORTUNITIES = [
  { area: "AI Governance Suite", description: "Productize compliance & evaluation as standalone module.", tam: 1_400_000_000, timeline: "12–18 mo", fit: "Strong" },
  { area: "Vietnam Enterprise Beachhead", description: "Mid-market manufacturing & finance buyers digitizing fast.", tam: 2_100_000_000, timeline: "18–24 mo", fit: "Strong" },
  { area: "Filipino BPO Vertical", description: "AI-augmented quality and workforce ops for 1.5M-seat BPO base.", tam: 850_000_000, timeline: "6–12 mo", fit: "Strong" },
  { area: "Indonesian SMB", description: "SMB AI adoption curve mirroring PH 2-year lead.", tam: 1_800_000_000, timeline: "24–36 mo", fit: "Moderate" },
  { area: "Gov-Tech Modernization", description: "BSP/SEC pushing AI-aware compliance frameworks.", tam: 600_000_000, timeline: "12–18 mo", fit: "Moderate" },
  { area: "Healthcare Workflow AI", description: "Major HMOs evaluating AI-driven claims and ops platforms.", tam: 950_000_000, timeline: "18–24 mo", fit: "Weak" },
];

const MOCK_STAKEHOLDERS = {
  "high-high": ["Board of Directors", "Lead VC (Pacific Bridge)", "Executive Team", "Top 10 Enterprise Customers"],
  "high-low": ["BSP Regulators", "Strategic Investors Fund", "Series C Prospective Leads"],
  "low-high": ["Customer Advisory Board", "Series-A Angels", "Industry Analysts", "Internal Champions"],
  "low-low": ["Press Beat Reporters", "Inactive SPV Members", "Long-tail Vendors"],
};

const MOCK_OKR_BURNDOWN = [
  { week: "W1",  ideal: 8,  actual: 5 },
  { week: "W2",  ideal: 17, actual: 14 },
  { week: "W3",  ideal: 25, actual: 22 },
  { week: "W4",  ideal: 33, actual: 31 },
  { week: "W5",  ideal: 42, actual: 38 },
  { week: "W6",  ideal: 50, actual: 44 },
  { week: "W7",  ideal: 58, actual: 53 },
  { week: "W8",  ideal: 67, actual: 64 },
  { week: "W9",  ideal: 75, actual: 70 },
  { week: "W10", ideal: 83, actual: 76 },
  { week: "W11", ideal: 92, actual: 81 },
  { week: "W12", ideal: 100, actual: 88 },
];

const MOCK_PILLARS = [
  { name: "Growth", metric: "ARR run-rate", value: "$5.84M", score: 73, status: "healthy" },
  { name: "Product Velocity", metric: "Shipped initiatives / Quarter", value: "11 of 14", score: 78, status: "healthy" },
  { name: "Customer Health", metric: "Net Retention", value: "118%", score: 88, status: "healthy" },
  { name: "Talent", metric: "Open Sr roles filled", value: "2 of 4", score: 50, status: "watch" },
  { name: "Capital", metric: "Runway", value: "22 mo", score: 82, status: "healthy" },
  { name: "Risk Posture", metric: "High-severity risks open", value: "3", score: 55, status: "watch" },
];

/* ============================================================
   PAGE
============================================================ */
export default function AdminStrategicPlanning() {
  const [selectedObjective, setSelectedObjective] = useState(null);
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [quarter, setQuarter] = useState("Q2-2026");

  const [initiatives, setInitiatives] = useState(MOCK_INITIATIVES);

  const [exportOpen, setExportOpen] = useState(false);
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const pushToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts((arr) => [...arr, { id, ...toast }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), 5000);
  };
  const dismissToast = (id) => setToasts((arr) => arr.filter((t) => t.id !== id));

  const owners = MOCK_OBJECTIVES.map((o) => o.owner);

  function handleInitiativeUpdate({ id, progress, status }) {
    setInitiatives((arr) =>
      arr.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i };
        if (typeof progress === "number") next.progress = progress;
        if (typeof status === "string") next.status = status;
        return next;
      })
    );
    setSelectedInitiative((current) => {
      if (!current || current.id !== id) return current;
      const next = { ...current };
      if (typeof progress === "number") next.progress = progress;
      if (typeof status === "string") next.status = status;
      return next;
    });
  }

  return (
    <div className="space-y-6 pb-12">
      <StrategicPlanningHeader
        quarter={quarter}
        onQuarterChange={setQuarter}
        onExportStrategy={() => setExportOpen(true)}
        onCreateOKR={() => setObjectiveOpen(true)}
        onSchedulePlanning={() => setReviewOpen(true)}
      />

      <VisionMissionBanner vision={MOCK_VISION} />

      <StrategicKPIGrid kpis={MOCK_KPIS} />

      <StrategicInsightsBanner insights={MOCK_INSIGHTS} />

      <OKRTracker objectives={MOCK_OBJECTIVES} onSelectObjective={setSelectedObjective} />

      <OKRBurndownChart data={MOCK_OKR_BURNDOWN} />

      <InitiativesBoard
        initiatives={initiatives}
        onSelectInitiative={setSelectedInitiative}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SWOTMatrix swot={MOCK_SWOT} />
        <StrategicHealthDashboard pillars={MOCK_PILLARS} />
      </div>

      <RoadmapTimeline roadmap={MOCK_ROADMAP} />

      <MarketOpportunities opportunities={MOCK_OPPORTUNITIES} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CompetitiveLandscape competitors={MOCK_COMPETITORS} />
        <StakeholderMap stakeholders={MOCK_STAKEHOLDERS} />
      </div>

      <RiskRegister risks={MOCK_RISKS} />

      {selectedObjective && (
        <ObjectiveDetailDrawer objective={selectedObjective} onClose={() => setSelectedObjective(null)} />
      )}

      {selectedInitiative && (
        <InitiativeDetailDrawer
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
          onUpdate={(payload) => {
            handleInitiativeUpdate(payload);
            if (typeof payload.progress === "number") {
              pushToast({
                kind: "success",
                title: "Progress updated",
                description: `${selectedInitiative.name} now at ${payload.progress}%.`,
              });
            }
            if (typeof payload.status === "string") {
              pushToast({
                kind: "success",
                title: "Status changed",
                description: `${selectedInitiative.name} moved to ${payload.status === "active" ? "In Progress" : payload.status === "at-risk" ? "At Risk" : payload.status === "completed" ? "Completed" : "Planning"}.`,
              });
            }
          }}
        />
      )}

      <NewObjectiveModal
        open={objectiveOpen}
        onClose={() => setObjectiveOpen(false)}
        owners={owners}
        onCreate={(payload) =>
          pushToast({
            kind: "success",
            title: "Objective created",
            description: `“${payload.title}” added with ${payload.keyResults.length} key results.`,
          })
        }
      />

      <ScheduleReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSchedule={(payload) =>
          pushToast({
            kind: "success",
            title: "Review scheduled",
            description: `${payload.title} · ${payload.date} ${payload.time} · ${payload.attendees.length} attendee groups.`,
          })
        }
      />

      <ExportStrategyDeckModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={(result) =>
          pushToast({
            kind: "success",
            title: "Strategy deck generated",
            description: `${result.fileName} · ${result.sectionCount} sections ready to download.`,
          })
        }
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
