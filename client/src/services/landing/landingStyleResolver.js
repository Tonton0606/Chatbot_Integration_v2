const COLOR_PATTERN =
  /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|transparent|currentColor)$/i;

const LENGTH_PATTERN =
  /^-?(\d+|\d*\.\d+)(px|rem|em|%|vh|vw|svh|svw)?$/i;

const SHADOW_PATTERN =
  /^(none|[-\d\s.,pxremrgba()#]+)$/i;

const DEFAULT_DARK_TOKENS = {
  pageBackgroundColor: "#020617",
  sectionBackgroundColor: "#0f172a",
  cardBackgroundColor: "rgba(255,255,255,0.04)",
  cardBorderColor: "rgba(255,255,255,0.10)",
  headingColor: "#ffffff",
  bodyTextColor: "#cbd5e1",
  mutedTextColor: "#94a3b8",
  buttonBackgroundColor: "#c9930c",
  buttonTextColor: "#000000",
  badgeBackgroundColor: "rgba(255,255,255,0.06)",
  badgeTextColor: "#e2e8f0",
  iconColor: "#c9930c",
  iconBackgroundColor: "rgba(255,255,255,0.08)",
};

const DEFAULT_LIGHT_TOKENS = {
  pageBackgroundColor: "#ffffff",
  sectionBackgroundColor: "#f8fafc",
  cardBackgroundColor: "#ffffff",
  cardBorderColor: "#e2e8f0",
  headingColor: "#0f172a",
  bodyTextColor: "#475569",
  mutedTextColor: "#64748b",
  buttonBackgroundColor: "#2563eb",
  buttonTextColor: "#ffffff",
  badgeBackgroundColor: "#f1f5f9",
  badgeTextColor: "#334155",
  iconColor: "#2563eb",
  iconBackgroundColor: "#e0f2fe",
};

const TEXT_TRANSFORMS = new Set([
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
]);

const TEXT_ALIGNMENTS = new Set([
  "left",
  "center",
  "right",
  "justify",
]);

const BORDER_STYLES = new Set([
  "solid",
  "dashed",
  "dotted",
  "none",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asNumber(value, fallback = null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safeColor(value, fallback = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return fallback;

  return COLOR_PATTERN.test(rawValue) ? rawValue : fallback;
}

function safeLength(value, fallback = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return fallback;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  return LENGTH_PATTERN.test(rawValue) ? rawValue : fallback;
}

function safeRadius(value, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  return safeLength(value, fallback);
}

function safeShadow(value, fallback = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) return fallback;

  return SHADOW_PATTERN.test(rawValue) ? rawValue : fallback;
}

function safeFontSize(value, fallback = "") {
  const size = asNumber(value);

  if (size === null) {
    return safeLength(value, fallback);
  }

  if (size < 8 || size > 160) {
    return fallback;
  }

  return `${size}px`;
}

function safeFontWeight(value, fallback = "") {
  const weight = asNumber(value);

  if (weight === null) return fallback;

  if (weight < 100 || weight > 950) return fallback;

  return String(weight);
}

function safeLineHeight(value, fallback = "") {
  const lineHeight = asNumber(value);

  if (lineHeight === null) return safeLength(value, fallback);

  if (lineHeight < 0.8 || lineHeight > 4) return fallback;

  return String(lineHeight);
}

function getResponsiveStyle(style = {}, viewportMode = "desktop") {
  const responsive = asObject(style.responsive);
  const override = asObject(responsive[viewportMode]);

  return {
    ...style,
    ...override,
  };
}

export function getLandingStyles(source = {}) {
  const payload = asObject(source.payload);
  return asObject(payload.styles);
}

export function getLandingTheme(source = {}) {
  const styles = getLandingStyles(source);
  return asObject(styles.theme);
}

export function resolveDesignTokens({
  landingPage,
  primaryColor,
  secondaryColor,
  isLight = false,
} = {}) {
  const styles = getLandingStyles(landingPage);
  const theme = asObject(styles.theme);
  const tokens = asObject(styles.tokens);
  const defaults = isLight ? DEFAULT_LIGHT_TOKENS : DEFAULT_DARK_TOKENS;

  return {
    ...defaults,

    pageBackgroundColor:
      safeColor(theme.page_background_color) ||
      safeColor(theme.pageBackgroundColor) ||
      safeColor(tokens.pageBackgroundColor) ||
      defaults.pageBackgroundColor,

    sectionBackgroundColor:
      safeColor(theme.section_background_color) ||
      safeColor(theme.sectionBackgroundColor) ||
      safeColor(tokens.sectionBackgroundColor) ||
      safeColor(secondaryColor) ||
      defaults.sectionBackgroundColor,

    cardBackgroundColor:
      safeColor(theme.card_background_color) ||
      safeColor(theme.cardBackgroundColor) ||
      safeColor(tokens.cardBackgroundColor) ||
      defaults.cardBackgroundColor,

    cardBorderColor:
      safeColor(theme.card_border_color) ||
      safeColor(theme.cardBorderColor) ||
      safeColor(tokens.cardBorderColor) ||
      defaults.cardBorderColor,

    headingColor:
      safeColor(theme.heading_color) ||
      safeColor(theme.headingColor) ||
      safeColor(tokens.headingColor) ||
      defaults.headingColor,

    bodyTextColor:
      safeColor(theme.body_text_color) ||
      safeColor(theme.bodyTextColor) ||
      safeColor(tokens.bodyTextColor) ||
      defaults.bodyTextColor,

    mutedTextColor:
      safeColor(theme.muted_text_color) ||
      safeColor(theme.mutedTextColor) ||
      safeColor(tokens.mutedTextColor) ||
      defaults.mutedTextColor,

    buttonBackgroundColor:
      safeColor(theme.button_background_color) ||
      safeColor(theme.buttonBackgroundColor) ||
      safeColor(tokens.buttonBackgroundColor) ||
      safeColor(primaryColor) ||
      defaults.buttonBackgroundColor,

    buttonTextColor:
      safeColor(theme.button_text_color) ||
      safeColor(theme.buttonTextColor) ||
      safeColor(tokens.buttonTextColor) ||
      defaults.buttonTextColor,

    badgeBackgroundColor:
      safeColor(theme.badge_background_color) ||
      safeColor(theme.badgeBackgroundColor) ||
      safeColor(tokens.badgeBackgroundColor) ||
      defaults.badgeBackgroundColor,

    badgeTextColor:
      safeColor(theme.badge_text_color) ||
      safeColor(theme.badgeTextColor) ||
      safeColor(tokens.badgeTextColor) ||
      defaults.badgeTextColor,

    iconColor:
      safeColor(theme.icon_color) ||
      safeColor(theme.iconColor) ||
      safeColor(tokens.iconColor) ||
      safeColor(primaryColor) ||
      defaults.iconColor,

    iconBackgroundColor:
      safeColor(theme.icon_background_color) ||
      safeColor(theme.iconBackgroundColor) ||
      safeColor(tokens.iconBackgroundColor) ||
      defaults.iconBackgroundColor,
  };
}

export function resolvePageStyle({
  landingPage,
  tokens,
  viewportMode = "desktop",
} = {}) {
  const styles = getLandingStyles(landingPage);
  const page = getResponsiveStyle(asObject(styles.page), viewportMode);

  return {
    backgroundColor:
      safeColor(page.backgroundColor) ||
      safeColor(page.background_color) ||
      tokens?.pageBackgroundColor,
  };
}

export function resolveSectionStyle({
  section,
  tokens,
  fallbackBackground,
  viewportMode = "desktop",
} = {}) {
  const styles = getLandingStyles(section);
  const sectionStyle = getResponsiveStyle(asObject(styles.section), viewportMode);

  const output = {
    backgroundColor:
      safeColor(sectionStyle.backgroundColor) ||
      safeColor(sectionStyle.background_color) ||
      safeColor(fallbackBackground) ||
      tokens?.sectionBackgroundColor,
  };

  const backgroundImage =
    sectionStyle.backgroundImage || sectionStyle.background_image;

  if (backgroundImage) {
    output.backgroundImage = `url("${String(backgroundImage).replaceAll('"', "")}")`;
    output.backgroundSize = sectionStyle.backgroundSize || "cover";
    output.backgroundPosition = sectionStyle.backgroundPosition || "center";
  }

  const paddingTop = safeLength(sectionStyle.paddingTop || sectionStyle.padding_top);
  const paddingBottom = safeLength(
    sectionStyle.paddingBottom || sectionStyle.padding_bottom
  );
  const marginTop = safeLength(sectionStyle.marginTop || sectionStyle.margin_top);
  const marginBottom = safeLength(
    sectionStyle.marginBottom || sectionStyle.margin_bottom
  );
  const borderRadius = safeRadius(
    sectionStyle.borderRadius || sectionStyle.border_radius
  );
  const borderWidth = safeLength(
    sectionStyle.borderWidth || sectionStyle.border_width
  );
  const borderColor = safeColor(
    sectionStyle.borderColor || sectionStyle.border_color
  );
  const boxShadow = safeShadow(sectionStyle.boxShadow || sectionStyle.shadow);

  if (paddingTop) output.paddingTop = paddingTop;
  if (paddingBottom) output.paddingBottom = paddingBottom;
  if (marginTop) output.marginTop = marginTop;
  if (marginBottom) output.marginBottom = marginBottom;
  if (borderRadius) output.borderRadius = borderRadius;
  if (borderWidth) output.borderWidth = borderWidth;
  if (borderColor) output.borderColor = borderColor;
  if (borderWidth || borderColor) {
    output.borderStyle = BORDER_STYLES.has(sectionStyle.borderStyle)
      ? sectionStyle.borderStyle
      : "solid";
  }
  if (boxShadow) output.boxShadow = boxShadow;

  return output;
}

export function resolveTextStyle({
  style,
  tokens,
  fallbackColor,
  viewportMode = "desktop",
} = {}) {
  const textStyle = getResponsiveStyle(asObject(style), viewportMode);
  const output = {};

  const fontSize = safeFontSize(textStyle.fontSize || textStyle.font_size);
  const fontWeight =
    safeFontWeight(textStyle.fontWeight || textStyle.font_weight) ||
    (textStyle.bold ? "800" : "");
  const fontFamily = String(textStyle.fontFamily || textStyle.font_family || "")
    .trim();
  const color =
    safeColor(textStyle.color) ||
    safeColor(fallbackColor) ||
    tokens?.bodyTextColor;

  const lineHeight = safeLineHeight(textStyle.lineHeight || textStyle.line_height);
  const letterSpacing = safeLength(
    textStyle.letterSpacing || textStyle.letter_spacing
  );
  const backgroundColor = safeColor(
    textStyle.backgroundColor || textStyle.background_color
  );
  const textShadow = safeShadow(textStyle.textShadow || textStyle.text_shadow);

  if (fontSize) output.fontSize = fontSize;
  if (fontWeight) output.fontWeight = fontWeight;
  if (fontFamily) output.fontFamily = fontFamily;
  if (color) output.color = color;
  if (lineHeight) output.lineHeight = lineHeight;
  if (letterSpacing) output.letterSpacing = letterSpacing;
  if (backgroundColor) output.backgroundColor = backgroundColor;
  if (textShadow) output.textShadow = textShadow;

  if (textStyle.italic) output.fontStyle = "italic";

  if (textStyle.underline) {
    output.textDecoration = "underline";
  }

  if (TEXT_ALIGNMENTS.has(textStyle.textAlign || textStyle.text_align)) {
    output.textAlign = textStyle.textAlign || textStyle.text_align;
  }

  if (TEXT_TRANSFORMS.has(textStyle.textTransform || textStyle.text_transform)) {
    output.textTransform = textStyle.textTransform || textStyle.text_transform;
  }

  const translateX = asNumber(textStyle.translateX ?? textStyle.translate_x);
  const translateY = asNumber(textStyle.translateY ?? textStyle.translate_y);
  if (translateX !== null) output.translateX = translateX;
  if (translateY !== null) output.translateY = translateY;

  return output;
}

export function resolveCardStyle({
  card,
  tokens,
  viewportMode = "desktop",
} = {}) {
  const styles = getLandingStyles(card);
  const cardStyle = getResponsiveStyle(asObject(styles.card), viewportMode);

  const output = {
    backgroundColor:
      safeColor(cardStyle.backgroundColor) ||
      safeColor(cardStyle.background_color) ||
      tokens?.cardBackgroundColor,
    borderColor:
      safeColor(cardStyle.borderColor) ||
      safeColor(cardStyle.border_color) ||
      tokens?.cardBorderColor,
  };

  const borderRadius = safeRadius(cardStyle.borderRadius || cardStyle.border_radius);
  const borderWidth = safeLength(cardStyle.borderWidth || cardStyle.border_width);
  const boxShadow = safeShadow(cardStyle.boxShadow || cardStyle.shadow);

  if (borderRadius) output.borderRadius = borderRadius;
  if (borderWidth) output.borderWidth = borderWidth;
  if (borderWidth || output.borderColor) {
    output.borderStyle = BORDER_STYLES.has(cardStyle.borderStyle)
      ? cardStyle.borderStyle
      : "solid";
  }
  if (boxShadow) output.boxShadow = boxShadow;

  return output;
}

export function resolveButtonStyle({
  style,
  tokens,
  viewportMode = "desktop",
} = {}) {
  const buttonStyle = getResponsiveStyle(asObject(style), viewportMode);

  const output = {
    backgroundColor:
      safeColor(buttonStyle.backgroundColor) ||
      safeColor(buttonStyle.background_color) ||
      tokens?.buttonBackgroundColor,
    color:
      safeColor(buttonStyle.color) ||
      safeColor(buttonStyle.textColor) ||
      safeColor(buttonStyle.text_color) ||
      tokens?.buttonTextColor,
  };

  const borderRadius = safeRadius(
    buttonStyle.borderRadius || buttonStyle.border_radius
  );
  const borderColor = safeColor(buttonStyle.borderColor || buttonStyle.border_color);
  const borderWidth = safeLength(buttonStyle.borderWidth || buttonStyle.border_width);
  const boxShadow = safeShadow(buttonStyle.boxShadow || buttonStyle.shadow);

  if (borderRadius) output.borderRadius = borderRadius;
  if (borderColor) output.borderColor = borderColor;
  if (borderWidth) output.borderWidth = borderWidth;
  if (borderColor || borderWidth) {
    output.borderStyle = BORDER_STYLES.has(buttonStyle.borderStyle)
      ? buttonStyle.borderStyle
      : "solid";
  }
  if (boxShadow) output.boxShadow = boxShadow;

  return output;
}

export function resolveBadgeStyle({
  style,
  tokens,
  viewportMode = "desktop",
} = {}) {
  const badgeStyle = getResponsiveStyle(asObject(style), viewportMode);

  const output = {
    backgroundColor:
      safeColor(badgeStyle.backgroundColor) ||
      safeColor(badgeStyle.background_color) ||
      tokens?.badgeBackgroundColor,
    color:
      safeColor(badgeStyle.color) ||
      safeColor(badgeStyle.textColor) ||
      safeColor(badgeStyle.text_color) ||
      tokens?.badgeTextColor,
  };

  const borderRadius = safeRadius(badgeStyle.borderRadius || badgeStyle.border_radius);
  const borderColor = safeColor(badgeStyle.borderColor || badgeStyle.border_color);
  const borderWidth = safeLength(badgeStyle.borderWidth || badgeStyle.border_width);
  const boxShadow = safeShadow(badgeStyle.boxShadow || badgeStyle.shadow);

  if (borderRadius) output.borderRadius = borderRadius;
  if (borderColor) output.borderColor = borderColor;
  if (borderWidth) output.borderWidth = borderWidth;
  if (borderColor || borderWidth) {
    output.borderStyle = BORDER_STYLES.has(badgeStyle.borderStyle)
      ? badgeStyle.borderStyle
      : "solid";
  }
  if (boxShadow) output.boxShadow = boxShadow;

  return output;
}

export function resolveIconStyle({
  style,
  tokens,
  viewportMode = "desktop",
} = {}) {
  const iconStyle = getResponsiveStyle(asObject(style), viewportMode);

  const output = {
    color:
      safeColor(iconStyle.color) ||
      safeColor(iconStyle.iconColor) ||
      safeColor(iconStyle.icon_color) ||
      tokens?.iconColor,
    backgroundColor:
      safeColor(iconStyle.backgroundColor) ||
      safeColor(iconStyle.background_color) ||
      tokens?.iconBackgroundColor,
  };

  const size = safeLength(iconStyle.size);
  const borderRadius = safeRadius(iconStyle.borderRadius || iconStyle.border_radius);
  const borderColor = safeColor(iconStyle.borderColor || iconStyle.border_color);
  const borderWidth = safeLength(iconStyle.borderWidth || iconStyle.border_width);

  if (size) {
    output.width = size;
    output.height = size;
  }

  if (borderRadius) output.borderRadius = borderRadius;
  if (borderColor) output.borderColor = borderColor;
  if (borderWidth) output.borderWidth = borderWidth;
  if (borderColor || borderWidth) {
    output.borderStyle = BORDER_STYLES.has(iconStyle.borderStyle)
      ? iconStyle.borderStyle
      : "solid";
  }

  return output;
}
