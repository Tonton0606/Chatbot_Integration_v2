import {
  mergeLandingStyles,
  resolveBadgeStyle,
  resolveButtonStyle,
  resolveCardStyle,
  resolveIconStyle,
  resolveMediaStyle,
  resolvePageStyle,
  resolveSectionStyle,
  resolveTextStyle,
} from "./landingStyleResolver";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeColor(value, fallback = "") {
  const raw = String(value || "").trim();
  return raw || fallback;
}

function safeStyleValue(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

function getBorderRadius(value) {
  if (value === "large") return "28px";
  if (value === "medium") return "20px";
  if (value === "small") return "12px";
  return "26px";
}

function getDefaultPrimaryTextColor(theme, isLight) {
  if (theme.primary_button_text_color) return theme.primary_button_text_color;

  if (
    theme.button_style === "orange_primary_white_secondary" ||
    theme.button_style === "blue_primary_white_secondary"
  ) {
    return "#ffffff";
  }

  return isLight ? "#ffffff" : "#020617";
}

function getDefaultSecondaryBackgroundColor(theme) {
  if (theme.secondary_button_background_color) {
    return theme.secondary_button_background_color;
  }

  if (
    theme.button_style === "orange_primary_white_secondary" ||
    theme.button_style === "blue_primary_white_secondary"
  ) {
    return "#ffffff";
  }

  return "transparent";
}

function getDefaultSecondaryTextColor(theme, secondaryColor, isLight) {
  if (theme.secondary_button_text_color) {
    return theme.secondary_button_text_color;
  }

  if (
    theme.button_style === "orange_primary_white_secondary" ||
    theme.button_style === "blue_primary_white_secondary"
  ) {
    return secondaryColor;
  }

  return isLight ? "#0f172a" : "#ffffff";
}

function getDefaultSecondaryBorderColor(theme, isLight) {
  if (theme.secondary_button_border_color) {
    return theme.secondary_button_border_color;
  }

  if (
    theme.button_style === "orange_primary_white_secondary" ||
    theme.button_style === "blue_primary_white_secondary"
  ) {
    return "#ffffff";
  }

  return isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.16)";
}

export function getLandingThemeRuntime(landingPage = {}) {
  const payload = asObject(landingPage.payload);
  const styles = asObject(payload.styles);
  const theme = asObject(styles.theme);
  const isLight = landingPage.theme_mode === "light";

  const primaryColor = safeColor(
    theme.accent_color,
    landingPage.primary_color || "#c9930c"
  );

  const secondaryColor = safeColor(
    landingPage.secondary_color,
    isLight ? "#f8fafc" : "#0f172a"
  );

  const pageBackgroundColor = safeColor(
    theme.page_background_color,
    isLight ? "#ffffff" : "#020617"
  );

  const defaultSectionBackgroundColor = safeColor(
    theme.section_background_color,
    isLight ? "#f8fafc" : secondaryColor
  );

  const blueSectionBackground = safeColor(
    theme.blue_section_background,
    isLight ? "#eff6ff" : "#0f172a"
  );

  const lightBlueSectionBackground = safeColor(
    theme.light_section_background,
    isLight ? "#f8fafc" : "#111827"
  );

  const deepBlueSectionBackground = safeColor(
    theme.dark_footer_background,
    isLight ? "#0f172a" : "#020617"
  );

  const sectionPattern = asArray(theme.section_pattern);

  const heroTextColor = safeColor(
    theme.hero_text_color,
    isLight ? "#0f172a" : "#ffffff"
  );

  const heroMutedTextColor = safeColor(
    theme.hero_muted_text_color,
    isLight ? "#475569" : "#cbd5e1"
  );

  const headingColor = safeColor(
    theme.heading_color,
    isLight ? "#0f172a" : "#ffffff"
  );

  const bodyTextColor = safeColor(
    theme.body_text_color,
    isLight ? "#475569" : "#cbd5e1"
  );

  const cardBackgroundColor = safeStyleValue(
    theme.card_background_color,
    isLight ? "#ffffff" : "rgba(255,255,255,0.04)"
  );

  const cardBorderColor = safeStyleValue(
    theme.card_border_color,
    isLight ? "#e2e8f0" : "rgba(255,255,255,0.10)"
  );

  return {
    payload,
    styles,
    theme,

    presetId: theme.preset_id || landingPage.layout_template || "",
    presetName: theme.preset_name || "",
    isInsuranceBluePremium:
      theme.preset_id === "insurance_blue_premium" ||
      landingPage.layout_template === "insurance_blue_premium",

    isLight,
    primaryColor,
    secondaryColor,

    page: {
      backgroundColor: pageBackgroundColor,
      customStyle: resolvePageStyle(payload),
    },

    hero: {
      backgroundColor: safeColor(
        theme.hero_background_color,
        pageBackgroundColor
      ),
      gradientFrom: safeColor(theme.hero_gradient_from, ""),
      gradientTo: safeColor(theme.hero_gradient_to, ""),
      textColor: heroTextColor,
      mutedTextColor: heroMutedTextColor,
      customStyle: resolveSectionStyle(payload, "hero"),
      headlineStyle: mergeLandingStyles(
        { color: heroTextColor },
        resolveTextStyle(payload, "hero_headline")
      ),
      subheadlineStyle: mergeLandingStyles(
        { color: heroMutedTextColor },
        resolveTextStyle(payload, "hero_subheadline")
      ),
      badgeStyle: mergeLandingStyles(
        { color: heroMutedTextColor },
        resolveTextStyle(payload, "hero_badge")
      ),
      mediaStyle: resolveMediaStyle(payload, "hero"),
    },

    section: {
      defaultBackgroundColor: defaultSectionBackgroundColor,
      blueBackgroundColor: blueSectionBackground,
      whiteBackgroundColor: "#ffffff",
      lightBlueBackgroundColor: lightBlueSectionBackground,
      deepBlueBackgroundColor: deepBlueSectionBackground,
      pattern: sectionPattern,
      headingColor,
      bodyTextColor,
    },

    card: {
      backgroundColor: cardBackgroundColor,
      borderColor: cardBorderColor,
      borderRadius: getBorderRadius(theme.border_radius),
      style: theme.card_style || "default",
      titleColor: safeColor(theme.card_title_color, headingColor),
      bodyColor: safeColor(theme.card_body_color, bodyTextColor),
    },

    button: {
      style: theme.button_style || "default",
      primaryBackgroundColor: safeColor(
        theme.primary_button_background_color,
        primaryColor
      ),
      primaryTextColor: getDefaultPrimaryTextColor(theme, isLight),
      primaryBorderColor: safeColor(
        theme.primary_button_border_color,
        primaryColor
      ),
      secondaryBackgroundColor: getDefaultSecondaryBackgroundColor(theme),
      secondaryTextColor: getDefaultSecondaryTextColor(
        theme,
        secondaryColor,
        isLight
      ),
      secondaryBorderColor: getDefaultSecondaryBorderColor(theme, isLight),
    },

    badge: {
      backgroundColor: safeColor(
        theme.badge_background_color,
        isLight ? "#ffffff" : "rgba(255,255,255,0.08)"
      ),
      color: safeColor(theme.badge_text_color, headingColor),
      borderColor: safeColor(
        theme.badge_border_color,
        isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.16)"
      ),
    },

    icon: {
      backgroundColor: safeColor(theme.icon_background_color, primaryColor),
      color: safeColor(theme.icon_text_color, getDefaultPrimaryTextColor(theme, isLight)),
    },
  };
}

export function getSectionPatternKey(runtime, index, fallback = "default") {
  const pattern = asArray(runtime?.section?.pattern);

  if (!pattern.length) return fallback;

  return pattern[index % pattern.length] || fallback;
}

export function resolveRuntimeSectionBackground(runtime, index, fallback) {
  const key = getSectionPatternKey(runtime, index, fallback);

  if (key === "blue") {
    return runtime.section.blueBackgroundColor;
  }

  if (key === "white") {
    return runtime.section.whiteBackgroundColor;
  }

  if (key === "light_blue") {
    return runtime.section.lightBlueBackgroundColor;
  }

  if (key === "deep_blue") {
    return runtime.section.deepBlueBackgroundColor;
  }

  return runtime.section.defaultBackgroundColor;
}

export function resolveRuntimePageStyle(runtime, overrides = {}) {
  return mergeLandingStyles(
    {
      backgroundColor: runtime.page.backgroundColor,
    },
    runtime.page.customStyle,
    overrides
  );
}

export function resolveRuntimeHeroStyle(runtime, overrides = {}) {
  const hero = runtime.hero;

  const baseStyle =
    hero.gradientFrom && hero.gradientTo
      ? {
          background: `linear-gradient(135deg, ${hero.gradientFrom} 0%, ${hero.gradientTo} 100%)`,
          color: hero.textColor,
        }
      : {
          backgroundColor: hero.backgroundColor,
          color: hero.textColor,
        };

  return mergeLandingStyles(baseStyle, hero.customStyle, overrides);
}

export function resolveRuntimeSectionStyle(
  runtime,
  sectionKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(
    {
      backgroundColor: runtime.section.defaultBackgroundColor,
      color: runtime.section.bodyTextColor,
    },
    resolveSectionStyle(runtime.payload, sectionKey),
    overrides
  );
}

export function resolveRuntimeTextStyle(
  runtime,
  textKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(resolveTextStyle(runtime.payload, textKey), overrides);
}

export function resolveRuntimeCardStyle(
  runtime,
  cardKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(
    {
      backgroundColor: runtime.card.backgroundColor,
      borderColor: runtime.card.borderColor,
      borderRadius: runtime.card.borderRadius,
      borderStyle: "solid",
      borderWidth: "1px",
    },
    resolveCardStyle(runtime.payload, "default"),
    resolveCardStyle(runtime.payload, cardKey),
    overrides
  );
}

export function resolveRuntimeButtonStyle(
  runtime,
  buttonKey = "primary",
  overrides = {}
) {
  const isSecondary = buttonKey === "secondary";

  const baseStyle = isSecondary
    ? {
        backgroundColor: runtime.button.secondaryBackgroundColor,
        color: runtime.button.secondaryTextColor,
        borderColor: runtime.button.secondaryBorderColor,
        borderStyle: "solid",
        borderWidth: "1px",
      }
    : {
        backgroundColor: runtime.button.primaryBackgroundColor,
        color: runtime.button.primaryTextColor,
        borderColor: runtime.button.primaryBorderColor,
      };

  return mergeLandingStyles(
    baseStyle,
    resolveButtonStyle(runtime.payload, buttonKey),
    overrides
  );
}

export function resolveRuntimePrimaryButtonStyle(runtime, overrides = {}) {
  return resolveRuntimeButtonStyle(runtime, "primary", overrides);
}

export function resolveRuntimeSecondaryButtonStyle(runtime, overrides = {}) {
  return resolveRuntimeButtonStyle(runtime, "secondary", overrides);
}

export function resolveRuntimeBadgeStyle(
  runtime,
  badgeKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(
    {
      backgroundColor: runtime.badge.backgroundColor,
      color: runtime.badge.color,
      borderColor: runtime.badge.borderColor,
      borderStyle: "solid",
      borderWidth: "1px",
    },
    resolveBadgeStyle(runtime.payload, "default"),
    resolveBadgeStyle(runtime.payload, badgeKey),
    overrides
  );
}

export function resolveRuntimeIconStyle(
  runtime,
  iconKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(
    {
      backgroundColor: runtime.icon.backgroundColor,
      color: runtime.icon.color,
    },
    resolveIconStyle(runtime.payload, iconKey),
    overrides
  );
}

export function resolveRuntimeMediaStyle(
  runtime,
  mediaKey = "default",
  overrides = {}
) {
  return mergeLandingStyles(resolveMediaStyle(runtime.payload, mediaKey), overrides);
}
