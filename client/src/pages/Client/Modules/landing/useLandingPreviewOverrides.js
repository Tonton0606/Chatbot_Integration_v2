import { useCallback, useMemo, useState } from "react";

import { sortByOrderIndex } from "./clientLandingPageState";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function pickFirstText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return "";
}

function normalizeSectionOverrideFromPayload(nextPayload = {}) {
  const payload = asObject(nextPayload);
  const override = {
    payload,
  };

  if (
    Object.prototype.hasOwnProperty.call(payload, "heading") ||
    Object.prototype.hasOwnProperty.call(payload, "title")
  ) {
    override.title = pickFirstText(payload.heading, payload.title);
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "eyebrow") ||
    Object.prototype.hasOwnProperty.call(payload, "subtitle")
  ) {
    override.subtitle = pickFirstText(payload.eyebrow, payload.subtitle);
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "description") ||
    Object.prototype.hasOwnProperty.call(payload, "body")
  ) {
    override.description = pickFirstText(payload.description, payload.body);
  }

  return override;
}

function mergeSectionOverride(section, override) {
  if (!override) return section;

  const nextPayload = {
    ...(section.payload || {}),
    ...(override.payload || {}),
  };

  return {
    ...section,
    ...override,
    payload: nextPayload,
  };
}

function mergeCardOverride(card, override) {
  if (!override) return card;

  const nextPayload = {
    ...(card.payload || {}),
    ...(override.payload || {}),
  };

  return {
    ...card,
    ...override,
    payload: nextPayload,
  };
}

export function useLandingPreviewOverrides({
  sections = [],
  serviceCards = [],
}) {
  const [sectionOverrides, setSectionOverrides] = useState({});
  const [serviceCardOverrides, setServiceCardOverrides] = useState({});

  const previewSections = useMemo(() => {
    return sortByOrderIndex(
      sections
        .filter((section) => section.enabled !== false)
        .map((section) =>
          mergeSectionOverride(section, sectionOverrides[String(section.id)])
        )
    );
  }, [sections, sectionOverrides]);

  const previewServiceCards = useMemo(() => {
    return sortByOrderIndex(
      serviceCards
        .filter((card) => card.enabled !== false)
        .map((card) =>
          mergeCardOverride(card, serviceCardOverrides[String(card.id)])
        )
    );
  }, [serviceCards, serviceCardOverrides]);

  const updatePreviewSectionPayload = useCallback((sectionId, nextPayload) => {
    if (!sectionId) return;

    const normalizedOverride = normalizeSectionOverrideFromPayload(nextPayload);

    setSectionOverrides((current) => {
      const currentOverride = asObject(current[String(sectionId)]);
      const currentPayload = asObject(currentOverride.payload);

      return {
        ...current,
        [String(sectionId)]: {
          ...currentOverride,
          ...normalizedOverride,
          payload: {
            ...currentPayload,
            ...(normalizedOverride.payload || {}),
          },
        },
      };
    });
  }, []);

  const updatePreviewServiceCard = useCallback((cardId, nextCard) => {
    if (!cardId) return;

    setServiceCardOverrides((current) => {
      const currentOverride = asObject(current[String(cardId)]);
      const currentPayload = asObject(currentOverride.payload);
      const nextPayload = asObject(nextCard?.payload);

      return {
        ...current,
        [String(cardId)]: {
          ...currentOverride,
          ...(nextCard || {}),
          payload: {
            ...currentPayload,
            ...nextPayload,
          },
        },
      };
    });
  }, []);

  const clearPreviewSectionOverride = useCallback((sectionId) => {
    if (!sectionId) return;

    setSectionOverrides((current) => {
      const next = { ...current };
      delete next[String(sectionId)];
      return next;
    });
  }, []);

  const clearPreviewServiceCardOverride = useCallback((cardId) => {
    if (!cardId) return;

    setServiceCardOverrides((current) => {
      const next = { ...current };
      delete next[String(cardId)];
      return next;
    });
  }, []);

  const clearAllPreviewSectionOverrides = useCallback(() => {
    setSectionOverrides({});
  }, []);

  const clearAllPreviewServiceCardOverrides = useCallback(() => {
    setServiceCardOverrides({});
  }, []);

  const clearAllPreviewOverrides = useCallback(() => {
    setSectionOverrides({});
    setServiceCardOverrides({});
  }, []);

  return {
    previewSections,
    previewServiceCards,
    updatePreviewSectionPayload,
    updatePreviewServiceCard,
    clearPreviewSectionOverride,
    clearPreviewServiceCardOverride,
    clearAllPreviewSectionOverrides,
    clearAllPreviewServiceCardOverrides,
    clearAllPreviewOverrides,
  };
}
