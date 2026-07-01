function cleanValue(value) {
  return String(value || "").trim();
}

function normalizePhone(value) {
  return cleanValue(value).replace(/\s+/g, "");
}

function normalizeWhatsappPhone(value) {
  return cleanValue(value).replace(/[^\d]/g, "");
}

function withProtocol(value) {
  const clean = cleanValue(value);

  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;

  return `https://${clean}`;
}

function withHash(value) {
  const clean = cleanValue(value).replace(/^#/, "");
  return clean ? `#${clean}` : "";
}

function buildMailto(action = {}) {
  const email = cleanValue(action.email || action.destination || action.target);

  if (!email) return "";

  const subject = cleanValue(action.subject);
  const message = cleanValue(action.message);

  const params = new URLSearchParams();

  if (subject) params.set("subject", subject);
  if (message) params.set("body", message);

  const query = params.toString();

  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}

function buildWhatsappUrl(action = {}) {
  const phone = normalizeWhatsappPhone(
    action.phone || action.destination || action.target
  );

  if (!phone) return "";

  const message = cleanValue(action.message);
  const query = message
    ? `?text=${encodeURIComponent(message)}`
    : "";

  return `https://wa.me/${phone}${query}`;
}

function getActionType(action = {}) {
  return cleanValue(action.type || action.action || action.destination_type);
}

function getActionTarget(action = {}) {
  return cleanValue(
    action.target ||
      action.destination ||
      action.url ||
      action.section_id ||
      action.phone ||
      action.email ||
      action.file_url
  );
}

export function isActionConfigured(action = {}) {
  const type = getActionType(action);

  if (!type || type === "none") return false;

  if (type === "booking") return true;
  if (type === "popup") return true;
  if (type === "internal_section") return Boolean(action.section_id || action.destination || action.target);
  if (type === "external_link") return Boolean(action.url || action.destination || action.target);
  if (type === "phone") return Boolean(action.phone || action.destination || action.target);
  if (type === "email") return Boolean(action.email || action.destination || action.target);
  if (type === "whatsapp") return Boolean(action.phone || action.destination || action.target);
  if (type === "messenger") return Boolean(action.url || action.destination || action.target);
  if (type === "download") return Boolean(action.url || action.file_url || action.destination || action.target);
  if (type === "form") return true;

  return Boolean(getActionTarget(action));
}

export function getLandingActionHref(action = {}) {
  const type = getActionType(action);

  if (!isActionConfigured(action)) return "";

  if (type === "internal_section") {
    return withHash(action.section_id || action.destination || action.target);
  }

  if (type === "external_link") {
    return withProtocol(action.url || action.destination || action.target);
  }

  if (type === "phone") {
    const phone = normalizePhone(action.phone || action.destination || action.target);
    return phone ? `tel:${phone}` : "";
  }

  if (type === "email") {
    return buildMailto(action);
  }

  if (type === "whatsapp") {
    return buildWhatsappUrl(action);
  }

  if (type === "messenger") {
    return withProtocol(action.url || action.destination || action.target);
  }

  if (type === "download") {
    return withProtocol(
      action.url || action.file_url || action.destination || action.target
    );
  }

  return "";
}

export function executeLandingAction({
  event,
  action,
  context = {},
} = {}) {
  const type = getActionType(action);

  if (!isActionConfigured(action)) {
    event?.preventDefault?.();
    return false;
  }

  if (type === "booking") {
    event?.preventDefault?.();
    context.onBookingClick?.({
      bookingPresetId: action.booking_preset_id || null,
      action,
    });
    return true;
  }

  if (type === "popup") {
    event?.preventDefault?.();
    context.onPopupOpen?.({
      target: action.target || action.destination || null,
      action,
    });
    return true;
  }

  if (type === "form") {
    event?.preventDefault?.();
    context.onFormOpen?.({
      target: action.target || action.destination || "default",
      action,
    });
    return true;
  }

  if (type === "internal_section") {
    event?.preventDefault?.();

    const targetId = cleanValue(
      action.section_id || action.destination || action.target
    ).replace(/^#/, "");

    if (!targetId) return false;

    const target = document.querySelector(`#${CSS.escape(targetId)}`);

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    return Boolean(target);
  }

  return true;
}

export function normalizeLandingCta(rawCta = {}, fallbackAction = {}) {
  const label = cleanValue(rawCta.label || rawCta.cta_label);
  const action = rawCta.action || fallbackAction || {};

  if (!label || !isActionConfigured(action)) {
    return {
      enabled: false,
      label: "",
      action: {
        type: "none",
      },
    };
  }

  return {
    enabled: rawCta.enabled !== false,
    label,
    action,
  };
}
