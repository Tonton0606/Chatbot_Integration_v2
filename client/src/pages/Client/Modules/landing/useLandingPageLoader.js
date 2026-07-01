import { useCallback } from "react";

import {
  getLandingPageAnalytics,
  getLandingPageTemplates,
  getLandingSections,
  getLandingSectionTypes,
  getOrCreateClientLandingPage,
} from "../../../../services/clientLandingPages";

import { getWorkspaceCards } from "../../../../services/landing/landingServiceCards";

import { getLandingBookingMappings } from "../../../../services/landing/landingBooking";
import {
  ensureLandingMapSection,
  getLandingMapConfig,
  normalizeLandingMap,
} from "../../../../services/landing/landingMap";

import { getWorkspaceFooter } from "./footerService";

import {
  buildInitialForm,
  buildInitialIntegrationMapping,
  selectPrimaryIntegrationMapping,
  sortByOrderIndex,
} from "./clientLandingPageState";

export function useLandingPageLoader({
  adminOverrideMode = false,
  overrideWorkspaceId = "",
  setLoading,
  setError,
  setWorkspaceContext,
  setLandingPage,
  setSelectedLandingPageId,
  setForm,
  setDomainCheckResult,
  setTemplates,
  setSectionTypes,
  setSections,
  setServiceCards,
  setAnalytics,
  setIntegrationMapping,
  setLandingMap,
  setFooter,
  refreshLandingPages,
}) {
  const loadLandingResources = useCallback(
    async ({ context, page }) => {
      if (!context?.workspaceId || !page?.id) return;

      setLandingPage(page);
      setSelectedLandingPageId(page.id);
      setForm(buildInitialForm(page));
      setDomainCheckResult(null);

      const [
        templateRows,
        sectionTypeRows,
        sectionRows,
        cardRows,
        analyticData,
        integrationRows,
        mapData,
        footerData,
      ] = await Promise.all([
        getLandingPageTemplates(),
        getLandingSectionTypes(),
        getLandingSections(page.id),
        getWorkspaceCards(page.id, {
          includeArchived: false,
        }),
        getLandingPageAnalytics(context.workspaceId, page.id),
        getLandingBookingMappings(page.id),
        getLandingMapConfig({
          workspaceId: context.workspaceId,
          landingPageId: page.id,
        }),
        getWorkspaceFooter(context.workspaceId),
      ]);

      let nextSectionRows = sectionRows || [];

      const fallbackMapData =
        mapData ||
        normalizeLandingMap(
          nextSectionRows.find((section) => section.section_type === "map")
            ?.payload?.map_config || {}
        );

      const resolvedMapData = fallbackMapData?.landing_page_id
        ? fallbackMapData
        : null;

      if (resolvedMapData) {
        await ensureLandingMapSection(resolvedMapData);
        nextSectionRows = await getLandingSections(page.id);
      }

      const primaryMapping = selectPrimaryIntegrationMapping(
        integrationRows || []
      );

      setTemplates(templateRows || []);
      setSectionTypes(sectionTypeRows || []);
      setSections(sortByOrderIndex(nextSectionRows || []));
      setServiceCards(sortByOrderIndex(cardRows || []));
      setAnalytics(analyticData || null);
      setLandingMap(resolvedMapData || null);
      setFooter(footerData || null);
      setIntegrationMapping(
        buildInitialIntegrationMapping({
          mapping: primaryMapping,
          workspaceId: context.workspaceId,
          landingPageId: page.id,
        })
      );
    },
    [
      setAnalytics,
      setDomainCheckResult,
      setForm,
      setIntegrationMapping,
      setLandingPage,
      setLandingMap,
      setFooter,
      setSectionTypes,
      setSections,
      setSelectedLandingPageId,
      setServiceCards,
      setTemplates,
    ]
  );

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getOrCreateClientLandingPage({
        overrideWorkspaceId: adminOverrideMode ? overrideWorkspaceId : "",
      });
      const context = result.workspaceContext;

      setWorkspaceContext(context);

      const pages = await refreshLandingPages(context.workspaceId);
      const firstPage =
        pages.find((page) => page.id === result.landingPage?.id) ||
        pages[0] ||
        result.landingPage;

      await loadLandingResources({
        context,
        page: firstPage,
      });
    } catch (err) {
      console.error("Landing page load error:", err);
      setError(err.message || "Failed to load landing page.");
    } finally {
      setLoading(false);
    }
  }, [
    adminOverrideMode,
    overrideWorkspaceId,
    loadLandingResources,
    refreshLandingPages,
    setError,
    setLoading,
    setWorkspaceContext,
  ]);

  return {
    loadPage,
    loadLandingResources,
  };
}
