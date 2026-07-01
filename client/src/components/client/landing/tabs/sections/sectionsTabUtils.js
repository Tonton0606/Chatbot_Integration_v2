export const friendlySectionLabels = {
  hero: "Hero",
  about: "About",
  services: "Services",
  booking: "Booking",
  map: "Map",
  faq: "FAQ",
  contact: "Contact",
  gallery: "Gallery",
  testimonials: "Testimonials",
  pricing: "Pricing",
  team: "Team",
  portfolio: "Portfolio",
  products: "Products",
  stats: "Stats",
  timeline: "Timeline",
  custom: "Custom",
};

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanValue(value) {
  return String(value || "").trim();
}

function createItemBase(id, type) {
  return {
    id,
    type,
    styles: {},
    image_url: "",
    media_url: "",
    media_position: "top",
    media_fit: "cover",
    media_width: "",
    media_max_width: "",
    media_height: "",
    button_label: "",
    button_url: "",
    link_label: "",
    link_url: "",
  };
}

export function createItem(sectionType, itemType = "item") {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `item-${Date.now()}`;

  if (itemType === "textbox") {
    return {
      ...createItemBase(id, "textbox"),
      content: "",
    };
  }

  if (sectionType === "faq") {
    return {
      ...createItemBase(id, "faq"),
      question: "",
      answer: "",
    };
  }

  if (sectionType === "contact") {
    return {
      ...createItemBase(id, "contact"),
      label: "",
      value: "",
      description: "",
    };
  }

  return {
    ...createItemBase(id, "item"),
    title: "",
    body: "",
  };
}

function normalizeItemType(sectionType, item = {}) {
  if (item.type) return item.type;
  if (sectionType === "faq") return "faq";
  if (sectionType === "contact") return "contact";

  return "item";
}

function normalizeItem(sectionType, item = {}, index) {
  const type = normalizeItemType(sectionType, item);
  const id = item.id || `item-${index}`;

  return {
    ...createItemBase(id, type),
    ...item,
    id,
    type,

    title: item.title || item.label || "",
    body: item.body || item.description || item.answer || "",
    content: item.content || item.body || "",

    label: item.label || "",
    value: item.value || "",
    description: item.description || "",

    question: item.question || item.title || "",
    answer: item.answer || item.body || item.description || "",

    image_url:
      item.image_url ||
      item.media_url ||
      item.image ||
      item.thumbnail_url ||
      item.url ||
      "",

    media_url: item.media_url || item.image_url || item.image || "",

    media_position:
      item.media_position ||
      item.image_position ||
      item.position ||
      "top",

    media_fit:
      item.media_fit ||
      item.image_fit ||
      item.object_fit ||
      item.objectFit ||
      "cover",

    media_width: item.media_width || item.image_width || "",
    media_max_width: item.media_max_width || item.image_max_width || "",
    media_height: item.media_height || item.image_height || "",

    button_label:
      item.button_label ||
      item.cta_label ||
      item.link_label ||
      item.linkLabel ||
      "",

    button_url:
      item.button_url ||
      item.cta_url ||
      item.link_url ||
      item.linkUrl ||
      item.url ||
      item.href ||
      "",

    link_label:
      item.link_label ||
      item.linkLabel ||
      item.button_label ||
      item.cta_label ||
      "",

    link_url:
      item.link_url ||
      item.linkUrl ||
      item.button_url ||
      item.cta_url ||
      item.url ||
      item.href ||
      "",

    styles: asObject(item.styles || item.payload?.styles),
  };
}

export function normalizeItems(sectionType, payload = {}) {
  const source = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.faqs)
      ? payload.faqs
      : [];

  return source.map((item, index) => normalizeItem(sectionType, item, index));
}

export function buildSectionForm(section = {}) {
  const payload = asObject(section.payload);

  return {
    title: section.title || payload.title || payload.heading || "",
    subtitle: section.subtitle || payload.subtitle || payload.eyebrow || "",
    description:
      section.description || payload.description || payload.body || "",
    enabled: section.enabled === undefined ? true : Boolean(section.enabled),
    items: normalizeItems(section.section_type, payload),
  };
}

export function getSectionLabel(sectionType) {
  return friendlySectionLabels[sectionType] || sectionType || "Section";
}

export function isDefaultSection(section = {}) {
  return (
    ["hero", "about", "booking", "faq", "contact"].includes(
      section.section_type
    ) ||
    (section.section_type === "services" && !section.template_key)
  );
}

export function canEditSectionItems(sectionType) {
  return ["faq", "contact", "about", "custom"].includes(sectionType);
}

function normalizeItemsForSave(sectionType, items = []) {
  return (items || []).map((item, index) => {
    const normalized = normalizeItem(sectionType, item, index);

    return {
      ...normalized,
      image_url: cleanValue(normalized.image_url),
      media_url: cleanValue(normalized.media_url),
      media_position: normalized.media_position || "top",
      media_fit: normalized.media_fit || "cover",
      media_width: cleanValue(normalized.media_width),
      media_max_width: cleanValue(normalized.media_max_width),
      media_height: cleanValue(normalized.media_height),
      button_label: cleanValue(normalized.button_label),
      button_url: cleanValue(normalized.button_url),
      link_label: cleanValue(normalized.link_label),
      link_url: cleanValue(normalized.link_url),
      styles: asObject(normalized.styles),
    };
  });
}

export function buildSectionSavePayload(section = {}, form = {}) {
  const payload = asObject(section.payload);
  const normalizedItems = normalizeItemsForSave(
    section.section_type,
    form.items || []
  );

  const nextPayload = {
    ...payload,
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    body: form.description,
    items: normalizedItems,
  };

  if (section.section_type === "services") {
    nextPayload.heading = form.title;
    nextPayload.eyebrow = form.subtitle;
  }

  if (section.section_type === "faq") {
    nextPayload.faqs = normalizedItems;
  }

  return {
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    enabled: form.enabled,
    payload: nextPayload,
  };
}
