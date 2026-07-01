import {
  createWorkspaceCard,
  deleteCard,
  getWorkspaceCards,
  reorderCards,
  toggleCard,
  updateWorkspaceCard,
} from "../../../../services/landing/landingServiceCards";

import { sortByOrderIndex } from "./clientLandingPageState";

export function useLandingServiceCardActions({
  workspaceContext,
  landingPage,
  serviceCards,
  setSaving,
  setError,
  setServiceCards,
}) {
  async function refreshServiceCards(landingPageId = landingPage?.id) {
    if (!landingPageId) return;

    try {
      const rows = await getWorkspaceCards(landingPageId, {
        includeArchived: false,
      });

      setServiceCards(sortByOrderIndex(rows || []));
    } catch (err) {
      console.error("Refresh service cards error:", err);
      setError(err.message || "Failed to refresh service cards.");
    }
  }

  async function handleAddServiceCard(payload) {
    if (!workspaceContext?.workspaceId || !landingPage?.id) return;

    try {
      setSaving(true);
      setError("");

      await createWorkspaceCard({
        ...payload,
        workspace_id: workspaceContext.workspaceId,
        landing_page_id: landingPage.id,
        order_index: serviceCards.length,
      });

      await refreshServiceCards(landingPage.id);
    } catch (err) {
      console.error("Service card add error:", err);
      setError(err.message || "Failed to add service card.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateServiceCard(cardId, payload) {
    if (!landingPage?.id || !cardId) return;

    try {
      setSaving(true);
      setError("");

      await updateWorkspaceCard(cardId, payload);
      await refreshServiceCards(landingPage.id);
    } catch (err) {
      console.error("Service card update error:", err);
      setError(err.message || "Failed to update service card.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteServiceCard(cardId) {
    if (!landingPage?.id || !cardId) return;

    try {
      setSaving(true);
      setError("");

      await deleteCard(cardId);
      await refreshServiceCards(landingPage.id);
    } catch (err) {
      console.error("Service card delete error:", err);
      setError(err.message || "Failed to delete service card.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleServiceCard(cardId, enabled) {
    if (!landingPage?.id || !cardId) return;

    try {
      setSaving(true);
      setError("");

      await toggleCard(cardId, enabled);
      await refreshServiceCards(landingPage.id);
    } catch (err) {
      console.error("Service card toggle error:", err);
      setError(err.message || "Failed to update service card visibility.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReorderServiceCards(nextCards) {
    if (!landingPage?.id) return;

    try {
      setSaving(true);
      setError("");

      setServiceCards(nextCards);
      await reorderCards(nextCards);
      await refreshServiceCards(landingPage.id);
    } catch (err) {
      console.error("Service card reorder error:", err);
      setError(err.message || "Failed to reorder service cards.");
    } finally {
      setSaving(false);
    }
  }

  return {
    refreshServiceCards,
    handleAddServiceCard,
    handleUpdateServiceCard,
    handleDeleteServiceCard,
    handleToggleServiceCard,
    handleReorderServiceCards,
  };
}
