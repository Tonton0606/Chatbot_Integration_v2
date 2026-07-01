function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasValue(value) {
  return normalizeText(value).length > 0;
}

function getPendingLeadData(data = {}) {
  return data.pendingLeadData && typeof data.pendingLeadData === "object"
    ? data.pendingLeadData
    : {};
}

function getConfirmedLeadData(data = {}) {
  return data.confirmedLeadData && typeof data.confirmedLeadData === "object"
    ? data.confirmedLeadData
    : {};
}

function getEffectiveLeadData(data = {}) {
  return {
    ...getConfirmedLeadData(data),
    ...getPendingLeadData(data),
  };
}

// Maps pageIntelligence.pageType (from facebookPageIntelligence.js) to
// the ordered discovery fields worth collecting for that business category.
// Priority = array order; first missing field is asked first.
const DISCOVERY_FIELDS_BY_PAGE_TYPE = {
  // Software / automation / B2B SaaS — needs business context + volume
  b2b_saas: [
    "productOrServiceWanted",
    "businessType",
    "problemEncountered",
    "desiredSolution",
    "dailyVolume",
  ],
  software: [
    "productOrServiceWanted",
    "businessType",
    "problemEncountered",
    "desiredSolution",
    "dailyVolume",
  ],
  // Appointment-first: salons, clinics, gyms, restaurants, hotels
  booking_business: [
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
    "preferredSchedule",
  ],
  // Professional services: lawyers, coaches, consultants, real estate
  consultation_business: [
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
    "budgetOrQuantity",
  ],
  // Online retail / e-commerce
  ecommerce_business: [
    "productOrServiceWanted",
    "budgetOrQuantity",
    "location",
  ],
  // Physical retail / product shops
  product_business: [
    "productOrServiceWanted",
    "budgetOrQuantity",
    "location",
  ],
  // On-site services: cleaning, repair, delivery, transport
  service_business: [
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
    "location",
  ],
  // Catch-all for mixed or uncategorised pages
  mixed_business: [
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
  ],
  unknown: [
    "productOrServiceWanted",
    "problemEncountered",
    "desiredSolution",
  ],
};

// Derive page type from pageConfig.businessType text when the LLM hasn't
// classified it yet (e.g. first message before pageIntelligence is populated).
function inferPageTypeFromConfig(pageConfig = {}) {
  const type = normalizeText(pageConfig.businessType).toLowerCase();
  if (!type) return "unknown";

  if (/(salon|spa|clinic|gym|fitness|dental|medical|restaurant|hotel|resort|barber|nail|beauty|massage)/.test(type)) {
    return "booking_business";
  }
  if (/(software|saas|tech|automation|crm|erp|app|system|platform|chatbot|digital)/.test(type)) {
    return "b2b_saas";
  }
  if (/(lawyer|legal|accounting|accountant|consultant|coach|real estate|realtor|financial|insurance|advisory)/.test(type)) {
    return "consultation_business";
  }
  if (/(ecommerce|e-commerce|online shop|online store)/.test(type)) {
    return "ecommerce_business";
  }
  if (/(store|shop|retail|clothing|fashion|food|grocery|product|gadget|jewelry|ukay|tiangge)/.test(type)) {
    return "product_business";
  }
  if (/(delivery|cleaning|repair|transport|logistics|service|maintenance|installation)/.test(type)) {
    return "service_business";
  }

  return "mixed_business";
}

function getPageType({ pageIntelligence = {}, pageConfig = {} }) {
  const aiType = normalizeText(pageIntelligence.pageType);
  if (aiType && aiType !== "unknown") return aiType;
  return inferPageTypeFromConfig(pageConfig);
}

function getRequiredDiscoveryFields({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  const pageType = getPageType({ pageIntelligence, pageConfig });
  
  // Use configurable field mappings if available, otherwise use defaults
  const customMappings = pageConfig?.businessLogicSettings?.discoveryFieldMappings;
  if (customMappings && typeof customMappings === "object") {
    const fields = customMappings[pageType] || customMappings.unknown || DISCOVERY_FIELDS_BY_PAGE_TYPE.unknown;
    return Array.isArray(fields) ? [...new Set(fields)] : [...new Set(DISCOVERY_FIELDS_BY_PAGE_TYPE.unknown)];
  }
  
  const fields = DISCOVERY_FIELDS_BY_PAGE_TYPE[pageType] || DISCOVERY_FIELDS_BY_PAGE_TYPE.unknown;
  return [...new Set(fields)];
}

function getRequiredContactFields() {
  return ["customerName", "phone"];
}

function getMissingDiscoveryFields({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  const lead = getEffectiveLeadData(data);
  const required = getRequiredDiscoveryFields({ intentResult, data, pageIntelligence, pageConfig });
  return required.filter((field) => !hasValue(lead[field]));
}

function getMissingContactFields({ data = {} }) {
  const lead = getEffectiveLeadData(data);
  return getRequiredContactFields().filter((field) => !hasValue(lead[field]));
}

function getNextDiscoveryField({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  const required = getRequiredDiscoveryFields({ intentResult, data, pageIntelligence, pageConfig });
  const missing = getMissingDiscoveryFields({ intentResult, data, pageIntelligence, pageConfig });
  // Preserve required priority order
  return required.find((field) => missing.includes(field)) || "";
}

function getNextContactField({ data = {} }) {
  const priority = ["customerName", "phone"];
  const missing = getMissingContactFields({ data });
  return priority.find((field) => missing.includes(field)) || "";
}

function hasMinimumDiscovery({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  return getMissingDiscoveryFields({ intentResult, data, pageIntelligence, pageConfig }).length === 0;
}

function hasMinimumContact({ data = {} }) {
  return getMissingContactFields({ data }).length === 0;
}

function canShowCta({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  return hasMinimumDiscovery({ intentResult, data, pageIntelligence, pageConfig });
}

function shouldAskContactBeforeAction({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  return canShowCta({ intentResult, data, pageIntelligence, pageConfig }) && !hasMinimumContact({ data });
}

function canSyncCrm({ data = {} }) {
  const confirmed = getConfirmedLeadData(data);

  const hasContact =
    hasValue(confirmed.customerName) ||
    hasValue(confirmed.phone) ||
    hasValue(confirmed.email);

  const hasInquiry =
    hasValue(confirmed.productOrServiceWanted) ||
    hasValue(confirmed.problemEncountered) ||
    hasValue(confirmed.desiredSolution) ||
    hasValue(confirmed.businessType);

  return data.crmConfirmed === true && hasContact && hasInquiry;
}

function shouldConfirmBeforeCta({ intentResult = {}, data = {}, pageIntelligence = {}, pageConfig = {} }) {
  return (
    hasMinimumDiscovery({ intentResult, data, pageIntelligence, pageConfig }) &&
    hasMinimumContact({ data }) &&
    data.crmConfirmed !== true
  );
}

module.exports = {
  canShowCta,
  canSyncCrm,
  getEffectiveLeadData,
  getMissingContactFields,
  getMissingDiscoveryFields,
  getNextContactField,
  getNextDiscoveryField,
  getPageType,
  getPendingLeadData,
  getConfirmedLeadData,
  getRequiredContactFields,
  getRequiredDiscoveryFields,
  hasMinimumContact,
  hasMinimumDiscovery,
  inferPageTypeFromConfig,
  shouldAskContactBeforeAction,
  shouldConfirmBeforeCta,
};
