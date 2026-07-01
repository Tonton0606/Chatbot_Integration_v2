import { useCallback, useState } from "react";

import {
  archiveClientLandingPage,
  createClientLandingPage,
  duplicateClientLandingPage,
  listClientLandingPages,
} from "./landingPageManagerService";

export function useLandingPageManagerActions({
  workspaceContext,
  landingPage,
  landingPages,
  selectedLandingPageId,
  setError,
  setSaving,
  setLandingPages,
  loadLandingResources,
}) {
  const [managerModal, setManagerModal] = useState(null);
  const [createPageName, setCreatePageName] = useState("");

  const refreshLandingPages = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return [];

      const rows = await listClientLandingPages(workspaceId);
      setLandingPages(rows || []);

      return rows || [];
    },
    [setLandingPages]
  );

  function openCreateLandingPageModal() {
    setCreatePageName("");
    setManagerModal("create");
  }

  function openDuplicateLandingPageModal() {
    if (!landingPage?.id) return;
    setManagerModal("duplicate");
  }

  function openArchiveLandingPageModal() {
    if (!landingPage?.id) return;

    if (landingPages.length <= 1) {
      setError("Create another landing page before archiving this one.");
      return;
    }

    setManagerModal("archive");
  }

  function closeLandingPageManagerModal() {
    setManagerModal(null);
    setCreatePageName("");
  }

  async function handleSelectLandingPage(landingPageId) {
    if (!landingPageId || landingPageId === selectedLandingPageId) return;

    const page = landingPages.find((item) => item.id === landingPageId);

    if (!page || !workspaceContext?.workspaceId) {
      setError("Selected landing page was not found.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await loadLandingResources({
        context: workspaceContext,
        page,
      });
    } catch (err) {
      console.error("Landing page switch error:", err);
      setError(err.message || "Failed to switch landing page.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCreateLandingPage() {
    if (!workspaceContext?.workspaceId) {
      setError("Workspace context is missing.");
      return;
    }

    const title = String(createPageName || "").trim();

    if (!title) {
      setError("Landing page name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const created = await createClientLandingPage({
        workspaceId: workspaceContext.workspaceId,
        title,
        slug: title,
        createdBy: workspaceContext.user?.id || null,
      });

      const pages = await refreshLandingPages(workspaceContext.workspaceId);

      await loadLandingResources({
        context: workspaceContext,
        page: pages.find((page) => page.id === created.id) || created,
      });

      closeLandingPageManagerModal();
    } catch (err) {
      console.error("Create landing page error:", err);
      setError(err.message || "Failed to create landing page.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDuplicateLandingPage() {
    if (!landingPage?.id || !workspaceContext?.workspaceId) return;

    try {
      setSaving(true);
      setError("");

      const duplicate = await duplicateClientLandingPage({
        sourcePage: landingPage,
        createdBy: workspaceContext?.user?.id || null,
      });

      const pages = await refreshLandingPages(workspaceContext.workspaceId);

      await loadLandingResources({
        context: workspaceContext,
        page: pages.find((page) => page.id === duplicate.id) || duplicate,
      });

      closeLandingPageManagerModal();
    } catch (err) {
      console.error("Duplicate landing page error:", err);
      setError(err.message || "Failed to duplicate landing page.");
    } finally {
      setSaving(false);
    }
  }

  async function submitArchiveLandingPage() {
    if (!landingPage?.id || !workspaceContext?.workspaceId) return;

    if (landingPages.length <= 1) {
      setError("Create another landing page before archiving this one.");
      closeLandingPageManagerModal();
      return;
    }

    try {
      setSaving(true);
      setError("");

      await archiveClientLandingPage(landingPage.id);

      const pages = await refreshLandingPages(workspaceContext.workspaceId);
      const nextPage =
        pages.find((page) => page.id !== landingPage.id) || pages[0];

      await loadLandingResources({
        context: workspaceContext,
        page: nextPage,
      });

      closeLandingPageManagerModal();
    } catch (err) {
      console.error("Archive landing page error:", err);
      setError(err.message || "Failed to archive landing page.");
    } finally {
      setSaving(false);
    }
  }

  return {
    managerModal,
    createPageName,
    setCreatePageName,
    refreshLandingPages,
    handleSelectLandingPage,
    openCreateLandingPageModal,
    openDuplicateLandingPageModal,
    openArchiveLandingPageModal,
    closeLandingPageManagerModal,
    submitCreateLandingPage,
    submitDuplicateLandingPage,
    submitArchiveLandingPage,
  };
}
