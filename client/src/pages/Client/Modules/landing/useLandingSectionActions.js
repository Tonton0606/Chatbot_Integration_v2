import {
  createLandingSection,
  createSectionFromTemplate,
  deleteLandingSection,
  getLandingSections,
  updateLandingSection,
} from "../../../../services/clientLandingPages";

import { reorderLandingSections } from "../../../../services/landing/landingSections";

import { sortByOrderIndex } from "./clientLandingPageState";

export function useLandingSectionActions({
  landingPage,
  sections,
  sectionTypes,
  setSaving,
  setError,
  setSections,
  refreshServiceCards,
}) {
  async function refreshSections(landingPageId = landingPage?.id) {
    if (!landingPageId) return;

    try {
      const rows = await getLandingSections(landingPageId);
      setSections(sortByOrderIndex(rows || []));
    } catch (err) {
      console.error("Refresh sections error:", err);
      setError(err.message || "Failed to refresh landing sections.");
    }
  }

  async function handleAddTemplate(template) {
    if (!landingPage?.id || !template) return;

    try {
      setSaving(true);
      setError("");

      await createSectionFromTemplate({
        landingPageId: landingPage.id,
        template,
        orderIndex: sections.length,
      });

      await Promise.all([
        refreshSections(landingPage.id),
        refreshServiceCards?.(landingPage.id),
      ]);
    } catch (err) {
      console.error("Landing template add error:", err);
      setError(err.message || "Failed to add business format.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSection(sectionType) {
    if (!landingPage?.id || !sectionType) return;

    try {
      setSaving(true);
      setError("");

      const type = sectionTypes.find((item) => item.section_key === sectionType);

      await createLandingSection({
        landingPageId: landingPage.id,
        sectionType,
        title: type?.label || "Custom Section",
        subtitle: type?.category || "",
        orderIndex: sections.length,
      });

      await Promise.all([
        refreshSections(landingPage.id),
        refreshServiceCards?.(landingPage.id),
      ]);
    } catch (err) {
      console.error("Landing section add error:", err);
      setError(err.message || "Failed to add landing section.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSection(sectionId, payload) {
    if (!landingPage?.id || !sectionId) return;

    try {
      setSaving(true);
      setError("");

      await updateLandingSection(sectionId, payload);
      await refreshSections(landingPage.id);
    } catch (err) {
      console.error("Landing section update error:", err);
      setError(err.message || "Failed to update landing section.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSection(sectionId) {
    if (!landingPage?.id || !sectionId) return;

    try {
      setSaving(true);
      setError("");

      await deleteLandingSection(sectionId);
      await refreshSections(landingPage.id);
    } catch (err) {
      console.error("Landing section delete error:", err);
      setError(err.message || "Failed to delete landing section.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveSection(fromIndex, toIndex) {
    if (
      !landingPage?.id ||
      toIndex < 0 ||
      toIndex >= sections.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const nextSections = [...sections];
      const [moved] = nextSections.splice(fromIndex, 1);
      nextSections.splice(toIndex, 0, moved);

      setSections(nextSections);
      await reorderLandingSections(nextSections);
      await refreshSections(landingPage.id);
    } catch (err) {
      console.error("Landing section reorder error:", err);
      setError(err.message || "Failed to reorder sections.");
    } finally {
      setSaving(false);
    }
  }

  return {
    refreshSections,
    handleAddTemplate,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleMoveSection,
  };
}
