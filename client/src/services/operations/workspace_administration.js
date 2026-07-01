import { supabase } from "../../config/supabaseClient";

export const WORKSPACE_TYPES = ["individual", "shared", "company", "internal"];

export const WORKSPACE_STATUSES = [
  "active",
  "inactive",
  "suspended",
  "archived",
];

export const WORKSPACE_MEMBER_ROLES = ["owner", "admin", "member"];

export async function getWorkspaceAdministrationData() {
  const { data, error } = await supabase
    .from("workspaces")
    .select(`
      id,
      name,
      workspace_type,
      status,
      owner_user_id,
      created_at,
      updated_at,
      owner:owner_user_id (
        id,
        email,
        full_name,
        role,
        status
      ),
      workspace_members (
        id,
        user_id,
        workspace_id,
        role,
        created_at,
        user:user_id (
          id,
          email,
          full_name,
          role,
          status
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getWorkspaceAssignableProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data || [];
}

// Default Philippine BIR Chart of Accounts
const DEFAULT_CHART_OF_ACCOUNTS = [
  // Assets
  { code: '1000', name: 'Cash', type: 'asset', subtype: 'current_asset', tax_category: 'exempt' },
  { code: '1010', name: 'Cash on Hand', type: 'asset', subtype: 'current_asset', tax_category: 'exempt' },
  { code: '1020', name: 'Bank - General Account', type: 'asset', subtype: 'current_asset', tax_category: 'exempt' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'current_asset', tax_category: 'exempt' },
  { code: '1200', name: 'Inventories', type: 'asset', subtype: 'current_asset', tax_category: 'taxable' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', subtype: 'current_asset', tax_category: 'exempt' },
  { code: '1400', name: 'Fixed Assets', type: 'asset', subtype: 'non_current_asset', tax_category: 'exempt' },
  { code: '1410', name: 'Office Equipment', type: 'asset', subtype: 'non_current_asset', tax_category: 'exempt' },
  { code: '1420', name: 'Computer Equipment', type: 'asset', subtype: 'non_current_asset', tax_category: 'exempt' },
  { code: '1430', name: 'Furniture & Fixtures', type: 'asset', subtype: 'non_current_asset', tax_category: 'exempt' },
  { code: '1500', name: 'Accumulated Depreciation', type: 'asset', subtype: 'non_current_asset', tax_category: 'exempt' },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2010', name: 'VAT Payable', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2020', name: 'Withholding Tax Payable', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2030', name: 'Expanded Withholding Tax Payable', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2100', name: 'Accrued Expenses', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2200', name: 'Unearned Revenue', type: 'liability', subtype: 'current_liability', tax_category: 'exempt' },
  { code: '2300', name: 'Loans Payable', type: 'liability', subtype: 'non_current_liability', tax_category: 'exempt' },
  // Equity
  { code: '3000', name: 'Owner\'s Equity', type: 'equity', subtype: 'equity', tax_category: 'exempt' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'equity', tax_category: 'exempt' },
  { code: '3200', name: 'Current Year Earnings', type: 'equity', subtype: 'equity', tax_category: 'exempt' },
  // Revenue
  { code: '4000', name: 'Sales Revenue', type: 'revenue', subtype: 'operating_revenue', tax_category: 'taxable' },
  { code: '4010', name: 'Service Revenue', type: 'revenue', subtype: 'operating_revenue', tax_category: 'taxable' },
  { code: '4020', name: 'Consulting Revenue', type: 'revenue', subtype: 'operating_revenue', tax_category: 'taxable' },
  { code: '4100', name: 'Other Income', type: 'revenue', subtype: 'non_operating_revenue', tax_category: 'exempt' },
  { code: '4200', name: 'Interest Income', type: 'revenue', subtype: 'non_operating_revenue', tax_category: 'exempt' },
  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cost_of_goods', tax_category: 'taxable' },
  { code: '5100', name: 'Cost of Services', type: 'expense', subtype: 'cost_of_goods', tax_category: 'taxable' },
  { code: '6000', name: 'Salaries & Wages', type: 'expense', subtype: 'operating_expense', tax_category: 'exempt' },
  { code: '6010', name: 'Employee Benefits', type: 'expense', subtype: 'operating_expense', tax_category: 'exempt' },
  { code: '6020', name: 'SSS, PhilHealth, Pag-IBIG', type: 'expense', subtype: 'operating_expense', tax_category: 'exempt' },
  { code: '6100', name: 'Rent Expense', type: 'expense', subtype: 'operating_expense', tax_category: 'taxable' },
  { code: '6200', name: 'Utilities', type: 'expense', subtype: 'operating_expense', tax_category: 'taxable' },
  { code: '6300', name: 'Office Supplies', type: 'expense', subtype: 'operating_expense', tax_category: 'taxable' },
  { code: '6400', name: 'Professional Fees', type: 'expense', subtype: 'operating_expense', tax_category: 'withholding' },
  { code: '6500', name: 'Marketing & Advertising', type: 'expense', subtype: 'operating_expense', tax_category: 'taxable' },
  { code: '6600', name: 'Travel & Transportation', type: 'expense', subtype: 'operating_expense', tax_category: 'taxable' },
  { code: '6700', name: 'Depreciation Expense', type: 'expense', subtype: 'operating_expense', tax_category: 'exempt' },
  { code: '7000', name: 'Interest Expense', type: 'expense', subtype: 'non_operating_expense', tax_category: 'exempt' },
  { code: '8000', name: 'Income Tax Expense', type: 'expense', subtype: 'tax_expense', tax_category: 'exempt' },
  { code: '8100', name: 'Business Tax (Percentage Tax)', type: 'expense', subtype: 'tax_expense', tax_category: 'exempt' },
];

async function seedDefaultChartOfAccounts(workspaceId) {
  const accounts = DEFAULT_CHART_OF_ACCOUNTS.map((acct) => ({
    ...acct,
    workspace_id: workspaceId,
    is_active: true,
    created_at: new Date().toISOString(),
  }));

  // Batch insert — Supabase handles up to 1000 rows per insert
  const BATCH_SIZE = 100;
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("chart_of_accounts").insert(batch);
    if (error) {
      console.warn("[Workspace] Default chart of accounts seed warning:", error.message);
      // Non-fatal: workspace was created even if seeding fails
    }
  }
}

export async function createWorkspace(payload) {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      name: payload.name?.trim(),
      workspace_type: payload.workspace_type || "individual",
      status: payload.status || "active",
      owner_user_id: payload.owner_user_id || null,
    })
    .select(`
      id,
      name,
      workspace_type,
      status,
      owner_user_id,
      created_at,
      updated_at,
      owner:owner_user_id (
        id,
        email,
        full_name,
        role,
        status
      )
    `)
    .single();

  if (error) throw error;

  if (payload.owner_user_id) {
    await upsertWorkspaceMember({
      workspaceId: data.id,
      userId: payload.owner_user_id,
      role: "owner",
    });
  }

  // Seed default chart of accounts + subscription for new workspace
  try {
    await seedDefaultChartOfAccounts(data.id);

    // Create default free subscription
    await supabase.from("workspace_subscriptions").insert({
      workspace_id: data.id,
      plan: "free",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (seedError) {
    console.warn("[Workspace] Post-creation seed warning:", seedError.message);
  }

  return data;
}

export async function updateWorkspace(id, payload) {
  if (!id) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspaces")
    .update({
      name: payload.name?.trim(),
      workspace_type: payload.workspace_type,
      status: payload.status,
      owner_user_id: payload.owner_user_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      id,
      name,
      workspace_type,
      status,
      owner_user_id,
      created_at,
      updated_at,
      owner:owner_user_id (
        id,
        email,
        full_name,
        role,
        status
      )
    `)
    .single();

  if (error) throw error;

  if (payload.owner_user_id) {
    await upsertWorkspaceMember({
      workspaceId: id,
      userId: payload.owner_user_id,
      role: "owner",
    });
  }

  return data;
}

export async function updateWorkspaceStatus(id, status) {
  if (!id) throw new Error("Workspace ID is required.");

  const { data, error } = await supabase
    .from("workspaces")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function upsertWorkspaceMember({ workspaceId, userId, role }) {
  if (!workspaceId) throw new Error("Workspace ID is required.");
  if (!userId) throw new Error("User is required.");

  const { data, error } = await supabase
    .from("workspace_members")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        role: role || "member",
      },
      {
        onConflict: "user_id,workspace_id",
      }
    )
    .select(`
      id,
      user_id,
      workspace_id,
      role,
      created_at,
      user:user_id (
        id,
        email,
        full_name,
        role,
        status
      )
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function removeWorkspaceMember(memberId) {
  if (!memberId) throw new Error("Workspace member ID is required.");

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;

  return true;
}
