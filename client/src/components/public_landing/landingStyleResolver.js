const SAFE_STYLE_KEYS = new Set([
  "background",
  "backgroundColor",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  "color",
  "border",
  "borderColor",
  "borderRadius",
  "borderWidth",
  "borderStyle",
  "boxShadow",
  "opacity",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "textDecoration",
  "width",
  "maxWidth",
  "minWidth",
  "minHeight",
  "height",
  "display",
  "gap",
  "alignItems",
  "justifyContent",
  "translateX",
  "translateY",
  "transform",
]);

const EDITOR_STYLE_ALIASES = {
  bold: "fontWeight",
  italic: "fontStyle",
  underline: "textDecoration",
  translate_x: "translateX",
  translate_y: "translateY",
};

const EDITOR_STYLE_VALUES = {
  bold: (value) => (value ? 800 : undefined),
  italic: (value) => (value ? "italic" : undefined),
  underline: (value) => (value ? "underline" : undefined),
  translate_x: (value) => value,
  translate_y: (value) => value,
};

const SHAPE_RADIUS = {
  rectangle: "0px",
  rounded: "12px",
  rounded_rectangle: "16px",
  pill: "999px",
  circle: "999px",
  ellipse: "999px",
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStyleEntries(style = {}) {
  if (!isPlainObject(style)) return {};

  return Object.entries(style).reduce((normalized, [key, value]) => {
    const aliasKey = EDITOR_STYLE_ALIASES[key];

    if (aliasKey) {
      const normalizedValue = EDITOR_STYLE_VALUES[key]?.(value);

      if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== "") {
        normalized[aliasKey] = normalizedValue;
      }

      return normalized;
    }

    normalized[key] = value;
    return normalized;
  }, {});
}

function cleanStyle(style = {}) {
  if (!isPlainObject(style)) return {};

  const normalizedStyle = normalizeStyleEntries(style);
  
  const tx = Number(normalizedStyle.translateX) || 0;
  const ty = Number(normalizedStyle.translateY) || 0;
  
  if (tx || ty) {
    normalizedStyle.transform = `translate(${tx}px, ${ty}px)`;
  }

  return Object.entries(normalizedStyle).reduce((safeStyle, [key, value]) => {
    if (!SAFE_STYLE_KEYS.has(key)) return safeStyle;
    if (value === undefined || value === null || value === "") return safeStyle;

    safeStyle[key] = value;
    return safeStyle;
  }, {});
}

function getStyles(payload = {}) {
  return isPlainObject(payload?.styles) ? payload.styles : {};
}

function getTokens(payload = {}) {
  const styles = getStyles(payload);
  return isPlainObject(styles.tokens) ? styles.tokens : {};
}

function resolveTokenValue(value, tokens = {}) {
  if (typeof value !== "string") return value;
  if (!value.startsWith("$")) return value;

  const tokenKey = value.slice(1);
  return tokens[tokenKey] || value;
}

function resolveTokenizedStyle(style = {}, tokens = {}) {
  if (!isPlainObject(style)) return {};

  return Object.entries(style).reduce((resolved, [key, value]) => {
    resolved[key] = resolveTokenValue(value, tokens);
    return resolved;
  }, {});
}

function resolveStyleByKey(scopeStyles = {}, key = "default") {
  if (!isPlainObject(scopeStyles)) return {};
  if (isPlainObject(scopeStyles?.[key])) return scopeStyles[key];

  return {};
}

function resolveScopedStyle(payload = {}, scope, key = "default") {
  const styles = getStyles(payload);
  const tokens = getTokens(payload);
  const scopeStyles = isPlainObject(styles?.[scope]) ? styles[scope] : {};
  const targetStyle = resolveStyleByKey(scopeStyles, key);

  return cleanStyle(resolveTokenizedStyle(targetStyle, tokens));
}

function resolveScopedStyleChain(payload = {}, scope, keys = []) {
  const styles = getStyles(payload);
  const tokens = getTokens(payload);
  const scopeStyles = isPlainObject(styles?.[scope]) ? styles[scope] : {};
  const safeKeys = Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);

  return safeKeys.reduce((mergedStyle, key) => {
    const targetStyle = resolveStyleByKey(scopeStyles, key);

    return {
      ...mergedStyle,
      ...cleanStyle(resolveTokenizedStyle(targetStyle, tokens)),
    };
  }, {});
}

export function resolvePageStyle(payload = {}) {
  return resolveScopedStyle(payload, "page", "default");
}

export function resolveSectionStyle(payload = {}, sectionKey = "default") {
  return resolveScopedStyleChain(payload, "sections", [
    "default",
    sectionKey,
  ]);
}

export function resolveCardStyle(payload = {}, cardKey = "default") {
  return resolveScopedStyleChain(payload, "cards", [
    "default",
    cardKey,
  ]);
}

export function resolveTextStyle(payload = {}, textKey = "default") {
  return resolveScopedStyleChain(payload, "text", [
    "default",
    textKey,
  ]);
}

export function resolveButtonStyle(payload = {}, buttonKey = "default") {
  return resolveScopedStyleChain(payload, "buttons", [
    "default",
    buttonKey,
  ]);
}

export function resolveBadgeStyle(payload = {}, badgeKey = "default") {
  return resolveScopedStyleChain(payload, "badges", [
    "default",
    badgeKey,
  ]);
}

export function resolveIconStyle(payload = {}, iconKey = "default") {
  return resolveScopedStyleChain(payload, "icons", [
    "default",
    iconKey,
  ]);
}

export function resolveMediaStyle(payload = {}, mediaKey = "default") {
  return resolveScopedStyleChain(payload, "media", [
    "default",
    mediaKey,
  ]);
}

export function resolveElementStyle(
  payload = {},
  scope,
  keys = [],
  overrides = {}
) {
  const safeKeys = Array.isArray(keys) ? keys : [keys];

  return mergeLandingStyles(
    resolveScopedStyleChain(payload, scope, safeKeys),
    overrides
  );
}

export function resolveShapeStyle(shape, fallback = "rounded") {
  const shapeKey = String(shape || fallback).toLowerCase();

  return {
    borderRadius: SHAPE_RADIUS[shapeKey] || SHAPE_RADIUS[fallback] || "12px",
  };
}

export function mergeLandingStyles(...styles) {
  return styles.reduce((merged, style) => {
    if (!isPlainObject(style)) return merged;

    return {
      ...merged,
      ...cleanStyle(style),
    };
  }, {});
}
