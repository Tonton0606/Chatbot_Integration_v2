export const HERO_TEMPLATES = [
  {
    value: "corporate_premium",
    label: "Corporate Premium",
    description: "Text on the left, image/video on the right, ad-ready layout.",
  },
  {
    value: "personal_brand",
    label: "Personal Brand",
    description: "Advisor/consultant-focused hero for service-based selling.",
  },
  {
    value: "minimal_modern",
    label: "Minimal Modern",
    description: "Clean layout with fewer cards and stronger whitespace.",
  },
];

export const SHAPE_OPTIONS = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded_rectangle", label: "Rounded Rectangle" },
  { value: "pill", label: "Pill" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
];

export const SHAPE_RADIUS = {
  rectangle: "0px",
  rounded_rectangle: "18px",
  pill: "999px",
  circle: "999px",
  ellipse: "999px",
};

export const DEFAULT_BENEFIT = {
  title: "New Benefit",
  description: "Explain one key reason visitors should trust your offer.",
};

export const DEFAULT_METRIC = {
  value: "100%",
  label: "Client Focused",
};

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function getScopedValue(payload, scope, key, property, fallback = "") {
  const styles = asObject(payload?.styles);
  return styles?.[scope]?.[key]?.[property] || fallback;
}

export function editorClass(activePreviewId, previewId, baseClass = "") {
  return `${baseClass} ${
    activePreviewId === previewId ? "landing-editor-focus-ring" : ""
  }`.trim();
}
