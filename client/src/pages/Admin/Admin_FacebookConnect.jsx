import { useEffect, useMemo, useState } from "react";
import facebookIntegrationService from "../../services/marketing/facebook_connect";
import { getWorkspaceAdministrationData } from "../../services/operations/workspace_administration";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "../../components/admin/ui";

const PRICE_RANGE_OPTIONS = [
  { value: "", label: "Select price range" },
  { value: "Below PHP 500", label: "Below PHP 500" },
  { value: "PHP 500 - 1,999", label: "PHP 500 - 1,999" },
  { value: "PHP 2,000 - 4,999", label: "PHP 2,000 - 4,999" },
  { value: "PHP 5,000 - 9,999", label: "PHP 5,000 - 9,999" },
  { value: "PHP 10,000 and above", label: "PHP 10,000 and above" },
  { value: "Custom / Varies", label: "Custom / Varies" },
];

const EMPTY_FORM = {
  pageId: "",
  pageName: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  knowledge: "",
  aiInstruction: "",
  connectedWorkspaceId: "",
  generatedToken: "",
};

const EMPTY_EDIT_FORM = {
  pageName: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  knowledge: "",
  aiInstruction: "",
  connectedWorkspaceId: "",
};

export default function Admin_FacebookConnect() {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatingPageId, setUpdatingPageId] = useState("");
  const [editingPageId, setEditingPageId] = useState("");
  const [deletingPageId, setDeletingPageId] = useState("");
  const [subscribingPageId, setSubscribingPageId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const connectedPages = useMemo(
    () => (Array.isArray(status?.connectedPages) ? status.connectedPages : []),
    [status]
  );

  const workspaceOptions = useMemo(() => {
    const options = [
      {
        value: "",
        label: loadingWorkspaces ? "Loading workspaces..." : "Not linked",
      },
    ];

    const entries = Array.isArray(workspaces) ? workspaces : [];
    const sorted = entries
      .filter((ws) => ws?.id && ws?.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    sorted.forEach((ws) => {
      options.push({
        value: String(ws.id),
        label: `${ws.name}${ws.workspace_type ? ` (${ws.workspace_type})` : ""}`,
      });
    });

    return options;
  }, [workspaces, loadingWorkspaces]);

  const loadStatus = async () => {
    try {
      setLoadingStatus(true);
      setError("");

      const data = await facebookIntegrationService.getStatus();

      setStatus(data);
      setForm((current) => ({
        ...current,
        pageId: data.pageId || current.pageId,
        pageName: data.pageName || current.pageName,
        businessType: data.businessType || current.businessType,
        productServices: data.productServices || current.productServices,
        productServicePriceRanges:
          data.productServicePriceRanges || current.productServicePriceRanges,
        websiteLink: data.websiteLink || current.websiteLink,
        shoppeLink: data.shoppeLink || current.shoppeLink,
        lazadaLink: data.lazadaLink || current.lazadaLink,
        knowledge: data.knowledge || current.knowledge,
        aiInstruction: data.aiInstruction || current.aiInstruction,
        connectedWorkspaceId:
          data.connectedWorkspaceId || current.connectedWorkspaceId,
      }));
    } catch (loadError) {
      setError(loadError.message || "Failed to load Facebook integration status.");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const result = await getWorkspaceAdministrationData();
        const workspaceList = Array.isArray(result)
          ? result
          : Array.isArray(result?.workspaces)
            ? result.workspaces
            : [];

        if (mounted) {
          setWorkspaces(workspaceList);
        }
      } catch (workspaceLoadError) {
        if (mounted) {
          setWorkspaces([]);
          setError(workspaceLoadError.message || "Failed to load workspaces.");
        }
      } finally {
        if (mounted) {
          setLoadingWorkspaces(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const summarizeText = (value, limit = 140) => {
    if (!value) return "Not set";
    const text = String(value).trim();
    if (!text) return "Not set";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}...`;
  };

  const parseTextFile = async (file) => {
    if (!file) return "";
    const content = await file.text();
    return typeof content === "string" ? content.trim() : "";
  };

  const handleKnowledgeFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    try {
      const content = await parseTextFile(file);

      if (!content) {
        setError("The uploaded file is empty.");
        return;
      }

      setForm((current) => ({ ...current, knowledge: content }));
      setSuccess("Knowledge text loaded from file.");
    } catch (fileError) {
      setError(fileError?.message || "Failed to read the uploaded file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleEditKnowledgeFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    try {
      const content = await parseTextFile(file);

      if (!content) {
        setError("The uploaded file is empty.");
        return;
      }

      setEditForm((current) => ({ ...current, knowledge: content }));
      setSuccess("Knowledge text loaded from file.");
    } catch (fileError) {
      setError(fileError?.message || "Failed to read the uploaded file.");
    } finally {
      event.target.value = "";
    }
  };

  const generateToken = () => {
    const token = facebookIntegrationService.createToken("fbpage");
    setForm((current) => ({ ...current, generatedToken: token }));
    setSuccess("Generated token created.");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = await facebookIntegrationService.connectPage({
        pageId: form.pageId,
        pageName: form.pageName,
        businessType: form.businessType,
        productServices: form.productServices,
        productServicePriceRanges: form.productServicePriceRanges,
        websiteLink: form.websiteLink,
        shoppeLink: form.shoppeLink,
        lazadaLink: form.lazadaLink,
        pageAccessToken: form.generatedToken,
        verifyToken:
          status?.verifyToken || facebookIntegrationService.getStoredTestToken(status || {}),
        accessMode: status?.accessMode || "enable",
        knowledge: form.knowledge,
        aiInstruction: form.aiInstruction,
        workspaceId: form.connectedWorkspaceId,
        connectedWorkspaceId: form.connectedWorkspaceId,
      });

      setStatus(data);
      setSuccess("Facebook Page connection saved successfully.");
      setForm((current) => ({
        ...current,
        generatedToken: "",
      }));
    } catch (saveError) {
      setError(saveError.message || "Failed to save Facebook Page connection.");
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl =
    status?.webhookUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/facebook`
      : "");

  const testToken =
    status?.verifyToken || facebookIntegrationService.getStoredTestToken(status || {});

  const toReadableMode = (mode) =>
    String(mode || "").toLowerCase() === "disable" ? "Disable" : "Enable";

  const displayValue = (value, fallback = "Not set") => (value ? value : fallback);

  const getWorkspaceLabel = (workspaceId) => {
    const normalizedId = String(workspaceId || "").trim();
    if (!normalizedId) return "Not linked";

    const workspace = workspaces.find(
      (item) => String(item?.id || "").trim() === normalizedId
    );

    return workspace?.name || normalizedId;
  };

  const toggleAccessMode = async (page) => {
    const pageId = page?.pageId;

    if (!pageId) {
      setError("Missing page id. Cannot update access mode.");
      return;
    }

    const currentMode =
      String(page?.accessMode || "enable").toLowerCase() === "disable"
        ? "disable"
        : "enable";

    const nextMode = currentMode === "disable" ? "enable" : "disable";

    setUpdatingPageId(String(pageId));
    setError("");
    setSuccess("");

    try {
      const data = await facebookIntegrationService.updateAccessMode(pageId, nextMode);
      setStatus(data);
      setSuccess(
        `Access mode updated to ${toReadableMode(nextMode)} for ${
          page.pageName || `Page ${pageId}`
        }.`
      );
    } catch (modeError) {
      setError(modeError.message || "Failed to update access mode.");
    } finally {
      setUpdatingPageId("");
    }
  };

  const copyToClipboard = async (value) => {
    if (!value || value === "********") return;

    try {
      await navigator.clipboard.writeText(value);
      setSuccess("Copied to clipboard.");
    } catch {
      setError("Copy failed.");
    }
  };

  const openEditDetails = (page) => {
    const pageId = page?.pageId ? String(page.pageId) : "";

    if (!pageId) {
      setError("Missing page id. Cannot edit details.");
      return;
    }

    setEditingPageId(pageId);
    setEditForm({
      pageName: page?.pageName || "",
      businessType: page?.businessType || "",
      productServices: page?.productServices || "",
      productServicePriceRanges: page?.productServicePriceRanges || "",
      websiteLink: page?.websiteLink || "",
      shoppeLink: page?.shoppeLink || "",
      lazadaLink: page?.lazadaLink || "",
      knowledge: page?.knowledge || "",
      aiInstruction: page?.aiInstruction || "",
      connectedWorkspaceId: page?.connectedWorkspaceId || "",
    });
    setError("");
    setSuccess("");
  };

  const cancelEditDetails = () => {
    setEditingPageId("");
    setEditForm(EMPTY_EDIT_FORM);
  };

  const saveEditDetails = async (event) => {
    event.preventDefault();

    if (!editingPageId) {
      setError("Missing page id. Cannot save changes.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      const data = await facebookIntegrationService.updatePageDetails(editingPageId, {
        pageName: editForm.pageName,
        fbPageRowId:
          connectedPages.find((page) => String(page?.pageId || "") === editingPageId)
            ?.fbPageRowId || "",
        businessType: editForm.businessType,
        productServices: editForm.productServices,
        productServicePriceRanges: editForm.productServicePriceRanges,
        websiteLink: editForm.websiteLink,
        shoppeLink: editForm.shoppeLink,
        lazadaLink: editForm.lazadaLink,
        knowledge: editForm.knowledge,
        aiInstruction: editForm.aiInstruction,
        workspaceId: editForm.connectedWorkspaceId,
        connectedWorkspaceId: editForm.connectedWorkspaceId,
      });

      setStatus(data);
      setSuccess(`Updated details for page ${editingPageId}.`);
      cancelEditDetails();
    } catch (saveError) {
      setError(saveError.message || "Failed to update page details.");
    } finally {
      setSavingEdit(false);
    }
  };

  const resubscribePage = async (page) => {
    const pageId = page?.pageId ? String(page.pageId) : "";
    if (!pageId) { setError("Missing page id."); return; }
    setSubscribingPageId(pageId);
    setError("");
    setSuccess("");
    try {
      await facebookIntegrationService.subscribePage(pageId);
      setSuccess(
        `✅ Webhook re-subscribed for ${page.pageName || pageId}. Comment auto-replies and ad events are now active.`
      );
    } catch (subErr) {
      setError(subErr.message || "Failed to re-subscribe webhook.");
    } finally {
      setSubscribingPageId("");
    }
  };

  const deletePage = async (page) => {
    const pageId = page?.pageId ? String(page.pageId) : "";

    if (!pageId) {
      setError("Missing page id. Cannot delete page.");
      return;
    }

    const confirmed = window.confirm(
      `Delete Facebook Page ${page.pageName || pageId}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingPageId(pageId);
    setError("");
    setSuccess("");

    try {
      const data = await facebookIntegrationService.deletePage(pageId);
      setStatus(data);
      setSuccess(`Deleted page ${page.pageName || pageId}.`);
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete page.");
    } finally {
      setDeletingPageId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          Facebook Page Integration
        </h1>
        <p className="text-sm text-gray-500">
          Use your webhook URL and test token, then add each Facebook Page with its
          page ID and generated token.
        </p>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <Badge variant={status?.connected ? "success" : "default"}>
            {status?.connected ? "Connected" : "Not Connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <p className="text-gray-500">Webhook URL</p>
              <p className="font-medium text-gray-900 break-all">
                {webhookUrl || "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Test Token</p>
              <p className="font-medium text-gray-900 break-all">{testToken}</p>
            </div>
          </div>

          {status?.note && <p className="text-xs text-gray-500">{status.note}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadStatus} disabled={loadingStatus}>
              {loadingStatus ? "Checking..." : "Refresh Status"}
            </Button>
            <Button variant="secondary" onClick={() => copyToClipboard(webhookUrl)}>
              Copy Webhook URL
            </Button>
            <Button variant="secondary" onClick={() => copyToClipboard(testToken)}>
              Copy Test Token
            </Button>
            <Button variant="secondary" onClick={generateToken}>
              Generate Token
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Pages</CardTitle>
          <Badge variant={status?.connected ? "success" : "default"}>
            {status?.connected
              ? `${status?.connectedCount || connectedPages.length || 0} Connected`
              : "No Pages Connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedPages.length > 0 ? (
            connectedPages.map((page, index) => (
              <div
                key={`${page.pageId || page.pageName || "page"}-${index}`}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {page.pageName || "Connected Facebook Page"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {page.pageId ? `Page ID: ${page.pageId}` : webhookUrl}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        String(page.accessMode || "").toLowerCase() === "disable"
                          ? "warning"
                          : "success"
                      }
                    >
                      {toReadableMode(page.accessMode)}
                    </Badge>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditDetails(page)}
                      disabled={savingEdit}
                    >
                      {editingPageId === String(page.pageId)
                        ? "Editing..."
                        : "Edit Details"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleAccessMode(page)}
                      disabled={updatingPageId === String(page.pageId)}
                    >
                      {updatingPageId === String(page.pageId)
                        ? "Updating..."
                        : String(page.accessMode || "").toLowerCase() === "disable"
                          ? "Enable Access"
                          : "Disable Access"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => resubscribePage(page)}
                      disabled={subscribingPageId === String(page.pageId)}
                      title="Re-subscribe webhook to enable comment auto-replies, ad referrals, and follow-up messages"
                    >
                      {subscribingPageId === String(page.pageId)
                        ? "Subscribing..."
                        : "🔔 Re-subscribe Webhook"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => deletePage(page)}
                      disabled={deletingPageId === String(page.pageId)}
                    >
                      {deletingPageId === String(page.pageId)
                        ? "Deleting..."
                        : "Delete Page"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-gray-600 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Business Type
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.businessType)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Product/Services
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.productServices)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Price Range
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.productServicePriceRanges)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Website
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.websiteLink)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Shopee
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.shoppeLink)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Lazada
                    </span>
                    <span className="text-sm text-gray-800">
                      {displayValue(page.lazadaLink)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Connected Workspace
                    </span>
                    <span className="text-sm text-gray-800">
                      {getWorkspaceLabel(page.connectedWorkspaceId)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Webhook Subscription
                    </span>
                    <span className="text-sm text-gray-800">
                      {status?.subscription || "messages and messaging_postbacks"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] uppercase text-gray-400">
                      Stored Token
                    </span>
                    <span className="text-sm text-gray-800">
                      {page.pageAccessTokenMasked || "********"}
                    </span>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <span className="block text-[11px] uppercase text-gray-400">
                      Knowledge
                    </span>
                    <span className="text-sm text-gray-800">
                      {summarizeText(page.knowledge)}
                    </span>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <span className="block text-[11px] uppercase text-gray-400">
                      AI Custom Instructions
                    </span>
                    <span className="text-sm text-gray-800">
                      {summarizeText(page.aiInstruction)}
                    </span>
                  </div>
                </div>

                {editingPageId === String(page.pageId) && (
                  <form className="mt-4 space-y-4" onSubmit={saveEditDetails}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Facebook Page Name"
                        name="pageName"
                        value={editForm.pageName}
                        onChange={onEditChange}
                        placeholder="Hermes Official"
                      />
                      <Input
                        label="Business Type"
                        name="businessType"
                        value={editForm.businessType}
                        onChange={onEditChange}
                        placeholder="Solar Energy, Retail, Real Estate"
                      />
                      <Input
                        label="Product/Services"
                        name="productServices"
                        value={editForm.productServices}
                        onChange={onEditChange}
                        placeholder="Solar Panel, Installation, Maintenance"
                      />
                      <Select
                        label="Price Range"
                        name="productServicePriceRanges"
                        value={editForm.productServicePriceRanges}
                        onChange={onEditChange}
                        options={PRICE_RANGE_OPTIONS}
                      />
                      <Input
                        label="Website Link"
                        name="websiteLink"
                        type="url"
                        value={editForm.websiteLink}
                        onChange={onEditChange}
                        placeholder="https://yourwebsite.com"
                      />
                      <Input
                        label="Shopee Link"
                        name="shoppeLink"
                        type="url"
                        value={editForm.shoppeLink}
                        onChange={onEditChange}
                        placeholder="https://shopee.ph/your-shop"
                      />
                      <Input
                        label="Lazada Link"
                        name="lazadaLink"
                        type="url"
                        value={editForm.lazadaLink}
                        onChange={onEditChange}
                        placeholder="https://www.lazada.com.ph/shop/your-shop"
                      />
                      <Select
                        label="Connect to Workspace"
                        name="connectedWorkspaceId"
                        value={editForm.connectedWorkspaceId}
                        onChange={onEditChange}
                        options={workspaceOptions}
                      />

                      <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Knowledge Base
                          </h4>
                          <span className="text-[11px] uppercase tracking-wide text-gray-400">
                            Text / Markdown
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                              Upload Knowledge File
                            </label>
                            <input
                              type="file"
                              accept=".txt,.md,.markdown,text/plain,text/markdown"
                              onChange={handleEditKnowledgeFileChange}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-[11px] text-gray-400">
                              Upload a .txt or .md file. The content will be saved to
                              the knowledge field.
                            </p>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                              Knowledge (Text)
                            </label>
                            <textarea
                              name="knowledge"
                              value={editForm.knowledge}
                              onChange={onEditChange}
                              rows={6}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                              placeholder="Paste or upload knowledge text for the AI assistant"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                              AI Custom Instructions (Tone / Rules / Personality)
                            </label>
                            <textarea
                              name="aiInstruction"
                              value={editForm.aiInstruction}
                              onChange={onEditChange}
                              rows={4}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                              placeholder="e.g. Speak Taglish only, use happy emojis, be a witty seller, refer to clients as 'suki'"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={cancelEditDetails}
                        disabled={savingEdit}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={savingEdit}>
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No Facebook Page is connected yet. Connect one below to see it listed
              here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Facebook Page</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Facebook Page ID"
                name="pageId"
                value={form.pageId}
                onChange={onChange}
                placeholder="102428222282366"
                required
              />
              <Input
                label="Facebook Page Name"
                name="pageName"
                value={form.pageName}
                onChange={onChange}
                placeholder="Hermes Official"
                required
              />
              <Input
                label="Business Type"
                name="businessType"
                value={form.businessType}
                onChange={onChange}
                placeholder="Solar Energy, Retail, Real Estate"
                required
              />
              <Input
                label="Product/Services"
                name="productServices"
                value={form.productServices}
                onChange={onChange}
                placeholder="Solar Panel, Installation, Maintenance"
              />
              <Select
                label="Price Range"
                name="productServicePriceRanges"
                value={form.productServicePriceRanges}
                onChange={onChange}
                options={PRICE_RANGE_OPTIONS}
              />
              <Input
                label="Website Link"
                name="websiteLink"
                type="url"
                value={form.websiteLink}
                onChange={onChange}
                placeholder="https://yourwebsite.com"
              />
              <Input
                label="Shopee Link"
                name="shoppeLink"
                type="url"
                value={form.shoppeLink}
                onChange={onChange}
                placeholder="https://shopee.ph/your-shop"
              />
              <Input
                label="Lazada Link"
                name="lazadaLink"
                type="url"
                value={form.lazadaLink}
                onChange={onChange}
                placeholder="https://www.lazada.com.ph/shop/your-shop"
              />
              <Select
                label="Connect to Workspace"
                name="connectedWorkspaceId"
                value={form.connectedWorkspaceId}
                onChange={onChange}
                options={workspaceOptions}
              />
              <Input
                label="Generated Token"
                name="generatedToken"
                type="password"
                value={form.generatedToken}
                onChange={onChange}
                placeholder="Token from Meta page"
                required
              />

              <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Knowledge Base
                  </h4>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    Text / Markdown
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      Upload Knowledge File
                    </label>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,text/plain,text/markdown"
                      onChange={handleKnowledgeFileChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Upload a .txt or .md file. The content will be saved to the
                      knowledge field.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      Knowledge (Text)
                    </label>
                    <textarea
                      name="knowledge"
                      value={form.knowledge}
                      onChange={onChange}
                      rows={6}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                      placeholder="Paste or upload knowledge text for the AI assistant"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      AI Custom Instructions (Tone / Rules / Personality)
                    </label>
                    <textarea
                      name="aiInstruction"
                      value={form.aiInstruction}
                      onChange={onChange}
                      rows={4}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                      placeholder="e.g. Speak Taglish only, use happy emojis, be a witty seller, refer to clients as 'suki'"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving}>
                {saving ? "Connecting..." : "Add Facebook Page"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Helper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-gray-500">Webhook URL</p>
              <p className="font-medium text-gray-900 break-all">{webhookUrl}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => copyToClipboard(webhookUrl)}>
              Copy
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-gray-500">Test Token</p>
              <p className="font-medium text-gray-900 break-all">{testToken}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => copyToClipboard(testToken)}>
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
