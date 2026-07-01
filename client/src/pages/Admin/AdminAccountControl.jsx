import { useEffect, useMemo, useState } from "react";

import {
  AccountControlErrorState,
  AccountControlHeader,
  AccountControlKPIs,
  AccountControlLoadingState,
  AccountSearchBar,
  AccountsTable,
  EditAccountModal,
} from "../../components/admin/layout/Admin_AccountControl_Components";

import {
  getAccounts,
  updateAccount,
} from "../../services/administration/account_control";

const ROLE_OPTIONS = ["Client", "Admin"];
const STATUS_OPTIONS = ["active", "inactive"];

function isAdminRole(role) {
  return ["admin", "superadmin"].includes(
    String(role || "").toLowerCase()
  );
}

export default function AdminAccountControl() {
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingAccount, setEditingAccount] =
    useState(null);

  const [form, setForm] = useState({
    full_name: "",
    role: "Client",
    status: "active",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");

      const data = await getAccounts();

      setAccounts(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Failed to load accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredAccounts = useMemo(() => {
    const keyword = searchTerm
      .trim()
      .toLowerCase();

    if (!keyword) return accounts;

    return accounts.filter((account) => {
      return (
        account.email
          ?.toLowerCase()
          .includes(keyword) ||
        account.full_name
          ?.toLowerCase()
          .includes(keyword) ||
        account.role
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [accounts, searchTerm]);

  const adminAccounts =
    filteredAccounts.filter((account) =>
      isAdminRole(account.role)
    );

  const clientAccounts =
    filteredAccounts.filter(
      (account) =>
        !isAdminRole(account.role)
    );

  function openEdit(account) {
    setEditingAccount(account);

    setForm({
      full_name:
        account.full_name || "",
      role: isAdminRole(account.role)
        ? "Admin"
        : "Client",
      status:
        account.status || "active",
    });
  }

  function closeEdit() {
    setEditingAccount(null);

    setForm({
      full_name: "",
      role: "Client",
      status: "active",
    });
  }

  function handleFormChange(
    field,
    value
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!editingAccount) return;

    try {
      setSaving(true);

      await updateAccount(
        editingAccount.id,
        form
      );

      await loadAccounts();

      closeEdit();
    } catch (err) {
      alert(
        err.message ||
          "Failed to update account."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AccountControlHeader
        onRefresh={loadAccounts}
      />

      <AccountControlKPIs
        accounts={accounts}
      />

      <AccountSearchBar
        searchTerm={searchTerm}
        onSearchChange={
          setSearchTerm
        }
      />

      {loading && (
        <AccountControlLoadingState />
      )}

      {!loading && error && (
        <AccountControlErrorState
          message={error}
        />
      )}

      {!loading && !error && (
        <>
          <AccountsTable
            title="Admins"
            description="Internal Hermes administrators."
            rows={adminAccounts}
            type="admin"
            onEdit={openEdit}
          />

          <AccountsTable
            title="Clients"
            description="Client and workspace accounts."
            rows={clientAccounts}
            type="client"
            onEdit={openEdit}
          />
        </>
      )}

      <EditAccountModal
        account={editingAccount}
        form={form}
        saving={saving}
        roleOptions={
          ROLE_OPTIONS
        }
        statusOptions={
          STATUS_OPTIONS
        }
        onChange={
          handleFormChange
        }
        onClose={closeEdit}
        onSave={handleSave}
      />
    </div>
  );
}
