export const MOCK_EXECUTIVE_DATA = {
  revenue: {
    total: "₱2,458,000",
    monthlyGrowth: "+24.6%",
    quarterly: "₱7.2M",
    trend: [
      { date: "2026-01", value: 180000 },
      { date: "2026-02", value: 210000 },
      { date: " la 2026-03", value: 195000 },
      { date: "2026-04", value: 230000 },
      { date: "2026-05", value: 245800 },
    ]
  },
  users: {
    active: 12430,
    newRegistrations: 1043,
    activeSessions: 856,
    growth: "+12.3%",
    roleDistribution: [
      { role: "Admin", count: 12 },
      { role: "Manager", count: 45 },
      { role: "Employee", count: 1200 },
      { role: "Client", count: 11173 },
    ],
    topUsers: [
      { name: "Juan Dela Cruz", email: "juan@example.com", role: "Admin", activity: "Very High", revenueContribution: "₱450,000" },
      { name: "Maria Santos", email: "maria@example.com", role: "Manager", activity: "High", revenueContribution: "₱320,000" },
      { name: "Pedro Reyes", email: "pedro@example.com", role: "Employee", activity: "Medium", revenueContribution: "₱120,000" },
      { name: "Anna Garcia", email: "anna@example.com", role: "Client", activity: "High", revenueContribution: "₱85,000" },
      { name: "Roberto Lim", email: "roberto@example.com", role: "Client", activity: "Low", revenueContribution: "₱12,000" },
    ]
  },
  businessMetrics: {
    conversionRate: "18.2%",
    retentionRate: "82%",
    engagementRate: "64%",
    trends: {
      conversion: [15.1, 16.2, 17.5, 18.0, 18.2],
      retention: [78, 80, 81, 82, 82],
      engagement: [60, 62, 61, 63, 64],
    }
  },
  performance: {
    uptime: "99.9%",
    aiRequests: 43201,
    reportsGenerated: 1283,
    departmentPerformance: [
      { dept: "Sales", score: 92, growth: "+5%" },
      { dept: "Marketing", score: 88, growth: "+12%" },
      { dept: "Operations", score: 85, growth: "-2%" },
      { dept: "HR", score: 78, growth: "+1%" },
      { dept: "Finance", score: 95, growth: "+3%" },
    ]
  },
  aiInsights: {
    summaries: [
      "Revenue increased by 24.6% compared to last month, primarily driven by B2B segment growth.",
      "Engagement is strongest on Fridays, suggesting high weekly reporting activity.",
      "CRM conversion is improving steadily with a 3.2% increase in lead-to-close ratio.",
      "Marketing campaigns are performing above average, especially the Q2 Enterprise push."
    ],
    recommendations: [
      { title: "Improve Onboarding", description: "Automate the first 3 steps of the user journey to increase retention by 5%.", impact: "High" },
      { title: "Increase Automation", description: "Deploy AI-driven campaign triggers for inactive leads.", impact: "Medium" },
      { title: "Optimize Funnel", description: "Simplify the payment gateway for the 'Enterprise' tier to reduce drop-offs.", impact: "High" },
      { title: "Expand Channels", description: "Scale high-performing LinkedIn campaigns to include targeted industry cohorts.", impact: "Medium" },
    ]
  }
};
