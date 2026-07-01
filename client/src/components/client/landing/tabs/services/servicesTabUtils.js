export const SHAPE_OPTIONS = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded_rectangle", label: "Rounded Rectangle" },
  { value: "pill", label: "Pill" },
];

export const SHAPE_RADIUS = {
  rectangle: "0px",
  rounded_rectangle: "18px",
  pill: "999px",
};

export function slugifyCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function createBlankServiceCard() {
  return {
    title: "",
    description: "",
    image_url: "",
    cta_label: "Book Consultation",
    booking_category: "",
    service_key: `custom-${Date.now()}`,
    enabled: true,
    payload: {
      source: "client_created",
    },
  };
}

export function getSectionTitle(section) {
  return (
    section?.title ||
    section?.payload?.heading ||
    section?.payload?.title ||
    section?.subtitle ||
    "Untitled Services"
  );
}

export function getStyleValue(payload, key, property, fallback = "") {
  const styles = asObject(payload?.styles);
  return styles?.[key]?.[property] || fallback;
}

export function getServiceGroups(sections = [], cards = []) {
  const serviceSections = (sections || []).filter(
    (section) => section.section_type === "services"
  );

  return serviceSections
    .map((section) => {
      const payload = asObject(section.payload);
      const sectionCards = (cards || []).filter(
        (card) => String(card.section_id) === String(section.id)
      );

      return {
        id: String(section.id),
        title: getSectionTitle(section),
        description:
          section.description ||
          payload.description ||
          payload.subtitle ||
          "Custom services section.",
        sectionId: section.id,
        defaultCardsOnly: false,
        payload,
        rawSection: section,
        cards: sectionCards,
      };
    })
    .filter((group) => group.cards?.length > 0);
}

export function filterCardsByGroup(cards = [], selectedGroup) {
  return (cards || []).filter((card) => {
    if (!selectedGroup) return false;

    if (selectedGroup?.sectionId == null) return !card.section_id;

    return String(card.section_id) === String(selectedGroup?.sectionId);
  });
}
