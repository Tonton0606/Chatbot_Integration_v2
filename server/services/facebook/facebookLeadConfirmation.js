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

function isConfirmationAccepted(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(yes|yep|yeah|correct|confirmed|confirm|ok|okay|sige|oo|opo|tama|yes po)$/i.test(
    message
  );
}

function isConfirmationRejected(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(no|nope|wrong|incorrect|not correct|hindi|mali|di tama|edit|change|palitan|correction)$/i.test(
    message
  );
}

function hasPendingLeadData(data = {}) {
  const pending = getPendingLeadData(data);

  return Object.values(pending).some((value) => hasValue(value));
}

function hasConfirmedLeadData(data = {}) {
  const confirmed = getConfirmedLeadData(data);

  return Object.values(confirmed).some((value) => hasValue(value));
}

function hasPendingContactData(data = {}) {
  const pending = getPendingLeadData(data);

  return (
    hasValue(pending.customerName) ||
    hasValue(pending.phone) ||
    hasValue(pending.email) ||
    hasValue(pending.location)
  );
}

function hasPendingInquiryData(data = {}) {
  const pending = getPendingLeadData(data);

  return (
    hasValue(pending.businessType) ||
    hasValue(pending.productOrServiceWanted) ||
    hasValue(pending.problemEncountered) ||
    hasValue(pending.desiredSolution) ||
    hasValue(pending.inquirySource) ||
    hasValue(pending.dailyVolume) ||
    hasValue(pending.budgetOrQuantity) ||
    hasValue(pending.preferredSchedule) ||
    hasValue(pending.urgency)
  );
}

function isSameData(a = {}, b = {}) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

function needsLeadConfirmation(data = {}) {
  const pending = getPendingLeadData(data);
  const confirmed = getConfirmedLeadData(data);

  return hasPendingLeadData(data) && !isSameData(pending, confirmed);
}

function buildConfirmationLines(data = {}) {
  const pending = getPendingLeadData(data);

  return [
    pending.customerName ? `Name: ${pending.customerName}` : "",
    pending.phone ? `Phone: ${pending.phone}` : "",
    pending.email ? `Email: ${pending.email}` : "",
    pending.location ? `Location: ${pending.location}` : "",
    pending.businessType ? `Business/Need: ${pending.businessType}` : "",
    pending.productOrServiceWanted
      ? `Interest: ${pending.productOrServiceWanted}`
      : "",
    pending.problemEncountered
      ? `Problem/Concern: ${pending.problemEncountered}`
      : "",
    pending.desiredSolution
      ? `Desired result: ${pending.desiredSolution}`
      : "",
    pending.inquirySource ? `Inquiry source: ${pending.inquirySource}` : "",
    pending.dailyVolume ? `Volume: ${pending.dailyVolume}` : "",
    pending.budgetOrQuantity
      ? `Budget/Quantity: ${pending.budgetOrQuantity}`
      : "",
    pending.preferredSchedule
      ? `Preferred schedule: ${pending.preferredSchedule}`
      : "",
    pending.urgency ? `Urgency: ${pending.urgency}` : "",
  ].filter(Boolean);
}

function buildLeadConfirmationReply(data = {}) {
  const lines = buildConfirmationLines(data);

  if (lines.length === 0) {
    return "";
  }

  return `Before I save this for follow-up, please confirm if these details are correct:\n\n${lines.join(
    "\n"
  )}\n\nReply YES if correct, or send the corrected details.`;
}

function promotePendingToConfirmed(data = {}) {
  const pending = getPendingLeadData(data);

  return {
    ...data,
    confirmedLeadData: {
      ...getConfirmedLeadData(data),
      ...pending,
    },
    pendingLeadData: {},
    crmConfirmed: true,
  };
}

function resetLeadConfirmation(data = {}) {
  return {
    ...data,
    crmConfirmed: false,
  };
}

function getCrmSafeLeadData(data = {}) {
  if (data.crmConfirmed !== true) {
    return {};
  }

  return getConfirmedLeadData(data);
}

function canSaveConfirmedLeadToCrm(data = {}) {
  const confirmed = getCrmSafeLeadData(data);

  const hasContact =
    hasValue(confirmed.customerName) ||
    hasValue(confirmed.phone) ||
    hasValue(confirmed.email);

  const hasInquiry =
    hasValue(confirmed.productOrServiceWanted) ||
    hasValue(confirmed.problemEncountered) ||
    hasValue(confirmed.desiredSolution) ||
    hasValue(confirmed.businessType);

  return hasContact && hasInquiry;
}

module.exports = {
  buildConfirmationLines,
  buildLeadConfirmationReply,
  canSaveConfirmedLeadToCrm,
  getConfirmedLeadData,
  getCrmSafeLeadData,
  getEffectiveLeadData,
  getPendingLeadData,
  hasConfirmedLeadData,
  hasPendingContactData,
  hasPendingInquiryData,
  hasPendingLeadData,
  isConfirmationAccepted,
  isConfirmationRejected,
  needsLeadConfirmation,
  promotePendingToConfirmed,
  resetLeadConfirmation,
};
