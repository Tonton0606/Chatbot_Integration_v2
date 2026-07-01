const CAPTURABLE_FIELDS = new Set([
  "customerName",
  "phone",
  "email",
  "location",
  "businessType",
  "businessModel",
  "productOrServiceWanted",
  "problemEncountered",
  "desiredSolution",
  "inquirySource",
  "dailyVolume",
  "budgetOrQuantity",
  "preferredSchedule",
  "urgency",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isCapturableField(field = "") {
  return CAPTURABLE_FIELDS.has(normalizeText(field));
}

function isRejectableShortReply(text = "") {
  const value = normalizeText(text).toLowerCase();

  if (!value) return true;

  return /^(hi|hello|hey|yes|no|ok|okay|sige|sure|opo|oo|hindi|nope|thanks|thank you|salamat)$/i.test(
    value
  );
}

function normalizeEmail(value = "") {
  const text = normalizeText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : "";
}

function normalizePhone(value = "") {
  const text = normalizeText(value);
  const digits = text.replace(/[^\d+]/g, "");
  return digits.length >= 7 ? text : "";
}

function extractDailyVolume(text = "") {
  const message = normalizeText(text);

  const rangeMatch = message.match(/\b(\d+)\s*[-–to]+\s*(\d+)\b/i);
  if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]} per day`;

  const plusMatch = message.match(/\b(\d+)\s*\+/);
  if (plusMatch) return `${plusMatch[1]}+ per day`;

  const numberMatch = message.match(/\b(\d+)\b/);
  if (numberMatch) return `${numberMatch[1]} per day`;

  if (/(few|konti|kaunti)/i.test(message)) return "low volume";
  if (/(many|madami|marami|high)/i.test(message)) return "high volume";

  return "";
}

function normalizeCapturedFieldValue(field = "", text = "") {
  const value = normalizeText(text);

  if (!isCapturableField(field)) return "";
  if (isRejectableShortReply(value)) return "";

  if (field === "email") {
    return normalizeEmail(value);
  }

  if (field === "phone") {
    return normalizePhone(value);
  }

  if (field === "dailyVolume") {
    return extractDailyVolume(value);
  }

  if (value.length < 2) return "";
  if (/^[?!.]+$/.test(value)) return "";

  return value;
}

function captureExpectedField({ data = {}, incomingText = "" }) {
  const awaitingField = normalizeText(data.awaitingField);

  if (!isCapturableField(awaitingField)) {
    return {
      captured: false,
      data,
      field: "",
      value: "",
    };
  }

  const value = normalizeCapturedFieldValue(awaitingField, incomingText);

  if (!value) {
    return {
      captured: false,
      data,
      field: awaitingField,
      value: "",
    };
  }

  return {
    captured: true,
    field: awaitingField,
    value,
    data: {
      ...data,
      awaitingField: "",
      pendingLeadData: {
        ...(data.pendingLeadData || {}),
        [awaitingField]: value,
      },
    },
  };
}

function setAwaitingField(data = {}, field = "") {
  const cleanField = normalizeText(field);

  return {
    ...(data || {}),
    awaitingField: isCapturableField(cleanField) ? cleanField : "",
  };
}

module.exports = {
  captureExpectedField,
  isCapturableField,
  normalizeCapturedFieldValue,
  setAwaitingField,
};
