import {
  executeLandingAction,
  getLandingActionHref,
  isActionConfigured,
} from "../../services/landing/landingActionResolver";

function cleanValue(value) {
  return String(value || "").trim();
}

function normalizeActionType(value) {
  const clean = cleanValue(value);

  if (clean === "navigate" || clean === "section") return "internal_section";
  if (clean === "url" || clean === "external_url") return "external_link";
  if (clean === "lead_form") return "form";

  return clean;
}

function buildActionFromLegacyButton(button = {}) {
  const destinationType = normalizeActionType(
    button.destination_type || button.type || button.action
  );

  const destination = cleanValue(button.destination || button.target);

  if (!destinationType) {
    return {
      type: "none",
    };
  }

  if (destinationType === "booking") {
    return {
      type: "booking",
      booking_preset_id: destination || button.booking_preset_id || null,
    };
  }

  if (destinationType === "internal_section") {
    return {
      type: "internal_section",
      section_id: destination,
    };
  }

  if (destinationType === "external_link") {
    return {
      type: "external_link",
      url: destination,
    };
  }

  if (destinationType === "phone") {
    return {
      type: "phone",
      phone: destination,
    };
  }

  if (destinationType === "email") {
    return {
      type: "email",
      email: destination,
    };
  }

  if (destinationType === "whatsapp") {
    return {
      type: "whatsapp",
      phone: destination,
      message: cleanValue(button.message),
    };
  }

  if (destinationType === "messenger") {
    return {
      type: "messenger",
      url: destination,
    };
  }

  if (destinationType === "download") {
    return {
      type: "download",
      url: destination,
    };
  }

  if (destinationType === "form") {
    return {
      type: "form",
      target: destination || "default",
    };
  }

  if (destinationType === "cart") {
    return {
      type: "internal_section",
      section_id: "cart",
    };
  }

  if (destinationType === "product") {
    return {
      type: "internal_section",
      section_id: destination,
    };
  }

  if (destinationType === "custom") {
    return destination
      ? {
          type: "internal_section",
          section_id: destination,
        }
      : {
          type: "none",
        };
  }

  return {
    type: destinationType,
    target: destination,
  };
}

function getButtonLabel(button = {}, index = 0, landingPage = {}) {
  const payload = landingPage?.payload || {};

  if (cleanValue(button.label)) return cleanValue(button.label);
  if (cleanValue(button.cta_label)) return cleanValue(button.cta_label);

  if (index === 0 && cleanValue(landingPage?.primary_cta_label)) {
    return cleanValue(landingPage.primary_cta_label);
  }

  if (index === 0 && cleanValue(payload.cta_label)) {
    return cleanValue(payload.cta_label);
  }

  if (index === 1 && cleanValue(payload.hero_secondary_cta_label)) {
    return cleanValue(payload.hero_secondary_cta_label);
  }

  return "";
}

function getFallbackHeroAction(index = 0, landingPage = {}) {
  const payload = landingPage?.payload || {};

  if (index === 0) {
    const hasPrimaryLabel =
      cleanValue(landingPage?.primary_cta_label) || cleanValue(payload.cta_label);

    return hasPrimaryLabel
      ? {
          type: "booking",
          booking_preset_id: null,
        }
      : {
          type: "none",
        };
  }

  if (index === 1 && cleanValue(payload.hero_secondary_cta_label)) {
    return {
      type: "internal_section",
      section_id: "services",
    };
  }

  return {
    type: "none",
  };
}

export function normalizeHeroButton(button = {}, index = 0, landingPage = {}) {
  const label = getButtonLabel(button, index, landingPage);
  const configuredAction = button.cta?.action || button.action_config || null;
  const action = configuredAction
    ? configuredAction
    : button.action || button.destination_type || button.type
      ? buildActionFromLegacyButton(button)
      : getFallbackHeroAction(index, landingPage);

  if (!label || !isActionConfigured(action)) {
    return null;
  }

  return {
    id: button.id || (index === 0 ? "primary" : `button_${index + 1}`),
    label,
    action,
    open_in_new_tab:
      typeof button.open_in_new_tab === "boolean"
        ? button.open_in_new_tab
        : Boolean(button.new_tab),
    style_key:
      button.style_key ||
      button.styleKey ||
      (index === 0 ? "hero_button_primary" : "hero_button_secondary"),
    visual_variant:
      button.visual_variant ||
      button.variant ||
      (index === 0 ? "primary" : "secondary"),
  };
}

export function getHeroButtons(landingPage = {}) {
  const payload = landingPage?.payload || {};
  const buttons = Array.isArray(payload.hero_buttons)
    ? payload.hero_buttons
    : [];

  if (buttons.length > 0) {
    return buttons
      .map((button, index) => normalizeHeroButton(button, index, landingPage))
      .filter(Boolean);
  }

  return [0, 1]
    .map((_, index) => normalizeHeroButton({}, index, landingPage))
    .filter(Boolean);
}

export function getButtonHref(button = {}) {
  return getLandingActionHref(button.action) || "#";
}

export function isInternalButtonAction(button = {}) {
  const type = cleanValue(button.action?.type);

  return ["booking", "popup", "form", "none"].includes(type);
}

export function shouldRenderAsButton(button = {}) {
  return isInternalButtonAction(button);
}

export function handleLandingButtonClick({
  event,
  button,
  onBookingClick,
  onPreviewClick,
  previewId,
}) {
  if (onPreviewClick && previewId) {
    event.stopPropagation();
    onPreviewClick(previewId);
  }

  executeLandingAction({
    event,
    action: button.action,
    context: {
      onBookingClick,
    },
  });
}
