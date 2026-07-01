import { useEffect, useMemo, useState } from "react";
import {
  FinanceTreasuryHeader,
  FinanceTreasuryKPICards,
  FinanceTreasuryModuleTabs,
  OverviewDashboard,
  BudgetingSection,
  P2PSection,
  ExpenseSection,
  VendorSection,
  CapExSection,
  OpExSection,
  ReportsSection,
  BudgetDetailDrawer,
  TransactionDetailDrawer,
  VendorDetailDrawer,
  CreatePRModal,
  BudgetTransferModal,
  FinanceTreasuryLoadingState,
  FinanceTreasuryErrorState,
} from "../../components/admin/layout/Admin_FinanceTreasury_Components";

import {
  getFinanceTreasuryOverview,
  getBudgetData,
  getP2PData,
  getExpenseData,
  getVendorData,
  getCapExData,
  getOpExData,
  getReportCatalog,
} from "../../services/finance_treasury";

const TABS_WITH_DATA = {
  overview: getFinanceTreasuryOverview,
  budgeting: getBudgetData,
  p2p: getP2PData,
  expenses: getExpenseData,
  vendors: getVendorData,
  capex: getCapExData,
  opex: getOpExData,
  reports: getReportCatalog,
};

export default function Admin_FinanceTreasury() {
  // ── Module navigation ──
  const [activeTab, setActiveTab] = useState("overview");
  const [activeP2PSubTab, setActiveP2PSubTab] = useState("requisitions");

  // ── Global data & loading ──
  const [overviewData, setOverviewData] = useState(null);
  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filters per tab ──
  const [filters, setFilters] = useState({
    budgeting: { status: "all" },
    p2p: { search: "" },
    expenses: { status: "all", search: "" },
    vendors: { status: "all", search: "" },
    capex: { status: "all" },
    opex: { department: "all" },
    reports: { category: "all" },
  });

  // ── Selection & overlay state ──
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState("requisition");
  const [selectedVendor, setSelectedVendor] = useState(null);

  // ── Modal state ──
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // ── Load overview on mount ──
  useEffect(() => {
    loadOverview();
  }, []);

  // ── Load tab data when tab changes ──
  useEffect(() => {
    if (activeTab !== "overview" && !tabData[activeTab]) {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  async function loadOverview() {
    try {
      setLoading(true);
      setError("");
      const data = await getFinanceTreasuryOverview();
      setOverviewData(data);
    } catch (err) {
      setError(err.message || "Failed to load finance overview.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTabData(tab) {
    try {
      setLoading(true);
      setError("");
      const fetcher = TABS_WITH_DATA[tab];
      if (!fetcher) return;
      const data = await fetcher();
      setTabData((prev) => ({ ...prev, [tab]: data }));
    } catch (err) {
      setError(err.message || `Failed to load ${tab} data.`);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(tabKey, key, value) {
    setFilters((prev) => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], [key]: value },
    }));
  }

  // ── Event handlers ──
  function handleExport() {
    // Triggered by header export button
  }

  function handleCreate() {
    setPrModalOpen(true);
  }

  function handleApprove(item) {
  }

  function handleReject(item) {
  }

  function handleViewTransaction(tx) {
    setSelectedTransaction(tx);
    setSelectedTransactionType("requisition");
  }

  function handleSelectBudget(b) {
    // Merge with lines from tab data if available
    const full = tabData.budgeting?.find((x) => x.id === b.id) || b;
    setSelectedBudget(full);
  }

  function handleSelectVendor(v) {
    const full = tabData.vendors?.find((x) => x.id === v.id) || v;
    setSelectedVendor(full);
  }

  function handleSelectP2PItem(item, type) {
    setSelectedTransaction(item);
    setSelectedTransactionType(type);
  }

  function handleTransfer() {
    setTransferModalOpen(true);
  }

  function handleDownloadReport(report) {
  }

  // ── Derived data ──
  const kpis = overviewData?.kpis || null;

  // Merge overview budgets with detailed tab budgets when available
  const budgets = useMemo(() => {
    if (tabData.budgeting) return tabData.budgeting;
    return overviewData?.budgets || [];
  }, [tabData.budgeting, overviewData?.budgets]);

  const p2pData = tabData.p2p || { requisitions: [], orders: [], invoices: [], payments: [] };
  const vendors = tabData.vendors || [];
  const reports = tabData.reports || [];

  // ── Render ──
  return (
    <div className="space-y-6 p-6">
      <FinanceTreasuryHeader
        dateRange="Apr 1 - May 28 - Fiscal 2026"
        onExport={handleExport}
        onCreate={handleCreate}
      />

      {kpis && <FinanceTreasuryKPICards kpis={kpis} />}

      <FinanceTreasuryModuleTabs activeTab={activeTab} onChange={setActiveTab} />

      {loading && !overviewData && <FinanceTreasuryLoadingState />}
      {!loading && error && <FinanceTreasuryErrorState message={error} onRetry={activeTab === "overview" ? loadOverview : () => loadTabData(activeTab)} />}

      {!loading && !error && (
        <>
          {activeTab === "overview" && overviewData && (
            <OverviewDashboard
              budgets={overviewData.budgets}
              approvalQueue={overviewData.approvalQueue}
              recentTransactions={overviewData.recentTransactions}
              cashFlow={overviewData.cashFlow}
              alerts={overviewData.alerts}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewTransaction={handleViewTransaction}
            />
          )}

          {activeTab === "budgeting" && (
            <BudgetingSection
              budgets={budgets}
              filters={filters.budgeting}
              onFilterChange={(k, v) => updateFilter("budgeting", k, v)}
              onSelectBudget={handleSelectBudget}
              onTransfer={handleTransfer}
            />
          )}

          {activeTab === "p2p" && (
            <P2PSection
              data={p2pData}
              activeSubTab={activeP2PSubTab}
              onSubTabChange={setActiveP2PSubTab}
              onSelectItem={handleSelectP2PItem}
              filters={filters.p2p}
              onFilterChange={(k, v) => updateFilter("p2p", k, v)}
            />
          )}

          {activeTab === "expenses" && (
            <ExpenseSection
              data={tabData.expenses}
              filters={filters.expenses}
              onFilterChange={(k, v) => updateFilter("expenses", k, v)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {activeTab === "vendors" && (
            <VendorSection
              vendors={vendors}
              filters={filters.vendors}
              onFilterChange={(k, v) => updateFilter("vendors", k, v)}
              onSelectVendor={handleSelectVendor}
            />
          )}

          {activeTab === "capex" && (
            <CapExSection
              data={tabData.capex}
              filters={filters.capex}
              onFilterChange={(k, v) => updateFilter("capex", k, v)}
            />
          )}

          {activeTab === "opex" && (
            <OpExSection
              data={tabData.opex}
              filters={filters.opex}
              onFilterChange={(k, v) => updateFilter("opex", k, v)}
            />
          )}

          {activeTab === "reports" && (
            <ReportsSection
              reports={reports}
              filters={filters.reports}
              onFilterChange={(k, v) => updateFilter("reports", k, v)}
              onDownload={handleDownloadReport}
            />
          )}
        </>
      )}

      {/* ── Drawers ── */}
      <BudgetDetailDrawer
        budget={selectedBudget}
        onClose={() => setSelectedBudget(null)}
      />

      <TransactionDetailDrawer
        item={selectedTransaction}
        type={selectedTransactionType}
        onClose={() => setSelectedTransaction(null)}
      />

      <VendorDetailDrawer
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />

      {/* ── Modals ── */}
      <CreatePRModal
        isOpen={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        onSubmit={() => {
          setPrModalOpen(false);
        }}
      />

      <BudgetTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSubmit={() => {
          setTransferModalOpen(false);
        }}
        budgets={budgets}
      />
    </div>
  );
}
