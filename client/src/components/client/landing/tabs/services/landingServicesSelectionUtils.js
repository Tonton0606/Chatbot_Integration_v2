export const SERVICE_CARD_TARGET_LABELS = {
  card: "Card Properties",
  title: "Title Properties",
  description: "Description Properties",
  button: "Button Properties",
  media: "Media Properties",
};

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function mergeCardDraft(card, draft) {
  if (!draft) return card;

  return {
    ...card,
    ...draft,
    payload: {
      ...(card.payload || {}),
      ...(draft.payload || {}),
    },
  };
}

export function parseServiceCardPreviewId(previewId) {
  const value = String(previewId || "");

  if (!value.startsWith("card-")) {
    return null;
  }

  const match = value.match(/^card-(.+?)(?:-(title|description|button|media))?$/);

  if (!match) {
    return null;
  }

  return {
    cardId: match[1],
    target: match[2] || "card",
  };
}

export function getSelectedServicesElement({
  activePreviewId,
  selectedGroup,
  cards,
}) {
  const previewId = String(activePreviewId || "");
  if (!previewId) return null;

  if (previewId.startsWith("section-")) {
    return {
      type: "services-section",
      target: "section",
      previewId,
      title: selectedGroup?.title || "Services Section",
      description:
        "Edit layout, media mode, interaction, and section text for this services section.",
      group: selectedGroup,
    };
  }

  const cardSelection = parseServiceCardPreviewId(previewId);

  if (cardSelection) {
    const card = (cards || []).find(
      (item) => String(item.id) === String(cardSelection.cardId)
    );

    if (!card) return null;

    const targetLabel =
      SERVICE_CARD_TARGET_LABELS[cardSelection.target] || "Card Properties";

    return {
      type: "service-card",
      target: cardSelection.target,
      cardId: cardSelection.cardId,
      previewId,
      title:
        cardSelection.target === "card"
          ? card.title || "Service Card"
          : targetLabel,
      description:
        cardSelection.target === "card"
          ? "Edit the selected card content, style, media, and button."
          : `Edit only this card's ${targetLabel.toLowerCase()}.`,
      card,
    };
  }

  return null;
}

export function getApplyPayload(applyPayload) {
  const normalized = asObject(applyPayload);

  if (normalized.styles || normalized.media) {
    return {
      styles: asObject(normalized.styles),
      media: asObject(normalized.media),
    };
  }

  return {
    styles: normalized,
    media: {},
  };
}

export function isCardSelectionActive(activePreviewId, cardPreviewId) {
  const activeId = String(activePreviewId || "");

  return activeId === cardPreviewId || activeId.startsWith(`${cardPreviewId}-`);
}
