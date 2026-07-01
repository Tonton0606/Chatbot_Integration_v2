const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

export const TIME_HOURS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

export const TIME_MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function inferMediaType(value = "") {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "unknown";
  if (VIDEO_EXTENSIONS.test(cleanValue)) return "video";
  if (IMAGE_EXTENSIONS.test(cleanValue)) return "image";

  return "image";
}

export function getViewportMode(previewMode) {
  if (previewMode === "mobile") return "mobile";
  if (previewMode === "tablet") return "tablet";

  if (typeof window !== "undefined") {
    const width = window.innerWidth;

    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
  }

  return "desktop";
}

export function getItemText(item = {}) {
  return item.body || item.description || item.value || item.answer || "";
}

export function getItemTitle(item = {}, fallback = "Item") {
  return item.title || item.label || item.question || fallback;
}

export function normalizeExternalUrl(value = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return "";

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  return `https://${rawValue}`;
}

export function isTimeField(field = {}) {
  const key = String(field.field_key || field.key || "").toLowerCase();
  const label = String(field.label || "").toLowerCase();
  const type = String(field.type || "").toLowerCase();

  return type === "time" || key.includes("time") || label.includes("time");
}

export function parseTimeValue(value = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return {
      hour: "09",
      minute: "00",
      period: "AM",
    };
  }

  const amPmMatch = rawValue.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);

  if (amPmMatch) {
    return {
      hour: String(Number(amPmMatch[1])).padStart(2, "0"),
      minute: amPmMatch[2] || "00",
      period: amPmMatch[3].toUpperCase(),
    };
  }

  const timeMatch = rawValue.match(/^(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    const numericHour = Number(timeMatch[1]);
    const minute = timeMatch[2];

    if (numericHour === 0) {
      return {
        hour: "12",
        minute,
        period: "AM",
      };
    }

    if (numericHour === 12) {
      return {
        hour: "12",
        minute,
        period: "PM",
      };
    }

    if (numericHour > 12) {
      return {
        hour: String(numericHour - 12).padStart(2, "0"),
        minute,
        period: "PM",
      };
    }

    return {
      hour: String(numericHour).padStart(2, "0"),
      minute,
      period: "AM",
    };
  }

  return {
    hour: "09",
    minute: "00",
    period: "AM",
  };
}

export function buildTimeValue({ hour, minute, period }) {
  const numericHour = Number(hour);
  const safeMinute = minute || "00";
  const safePeriod = period || "AM";

  let outputHour = numericHour;

  if (safePeriod === "AM" && numericHour === 12) {
    outputHour = 0;
  }

  if (safePeriod === "PM" && numericHour !== 12) {
    outputHour = numericHour + 12;
  }

  return `${String(outputHour).padStart(2, "0")}:${safeMinute}`;
}

function getServicesPresentationSettings(payload = {}) {
  const settings = asObject(payload);

  return {
    payload: settings,
    layoutMode: settings.layout_mode || settings.layoutMode || "grid",
    mediaMode: settings.media_mode || settings.mediaMode || "image",
    interactionMode:
      settings.interaction_mode || settings.interactionMode || "direct",
    responsive: asObject(settings.responsive),
    layers: asArray(settings.layers),
  };
}

function hasServiceGroupContent(group = {}) {
  return (
    (group.cards?.length || 0) > 0 ||
    Boolean(group.title) ||
    Boolean(group.subtitle) ||
    Boolean(group.description) ||
    Boolean(group.payload?.heading) ||
    Boolean(group.payload?.eyebrow) ||
    Boolean(group.payload?.description)
  );
}

function buildServiceGroupFromSection(section, cards) {
  const sectionPayload = asObject(section.payload);

  return {
    id: section.id,
    sectionId: section.id,
    title:
      sectionPayload.heading ||
      section.title ||
      sectionPayload.title ||
      "",
    subtitle:
      sectionPayload.eyebrow ||
      section.subtitle ||
      sectionPayload.subtitle ||
      "",
    description:
      sectionPayload.description ||
      section.description ||
      "",
    ...getServicesPresentationSettings(sectionPayload),
    cards,
  };
}

export function groupCardsByServicesSection(
  sections = [],
  serviceCards = [],
  serviceGroups = []
) {
  if (serviceGroups.length > 0) {
    return serviceGroups
      .map((group) => {
        const settings = getServicesPresentationSettings(group.payload);

        return {
          ...group,
          ...settings,
          title:
            group.payload?.heading ||
            group.title ||
            group.payload?.title ||
            "",
          subtitle:
            group.payload?.eyebrow ||
            group.subtitle ||
            group.payload?.subtitle ||
            "",
          description:
            group.payload?.description ||
            group.description ||
            "",
          cards: group.cards || [],
        };
      })
      .filter(hasServiceGroupContent);
  }

  const serviceSections = sections.filter(
    (section) => section.section_type === "services"
  );

  if (!serviceSections.length) {
    const cards = serviceCards.filter((card) => card.enabled !== false);

    return cards.length
      ? [
          {
            id: "default-services",
            title: "",
            subtitle: "",
            description: "",
            sectionId: null,
            ...getServicesPresentationSettings({
              layout_mode: "grid",
              media_mode: "image",
              interaction_mode: "direct",
            }),
            cards,
          },
        ]
      : [];
  }

  return serviceSections
    .map((section, index) => {
      const directCards = serviceCards.filter(
        (card) => card.section_id === section.id && card.enabled !== false
      );

      const fallbackCards =
        index === 0
          ? serviceCards.filter(
              (card) => !card.section_id && card.enabled !== false
            )
          : [];

      return buildServiceGroupFromSection(section, [
        ...directCards,
        ...fallbackCards,
      ]);
    })
    .filter(hasServiceGroupContent);
}
