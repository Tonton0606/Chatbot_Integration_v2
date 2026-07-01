/**
 * Business Logic Presets for Facebook Chatbot
 * Pre-configured settings for common business types
 */

export const BUSINESS_LOGIC_PRESETS = {
  default: {
    name: "Default (Balanced)",
    description: "Balanced settings suitable for most businesses",
    settings: {
      discoveryFieldMappings: {
        b2b_saas: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume"],
        software: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume"],
        booking_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "preferredSchedule"],
        consultation_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "budgetOrQuantity"],
        ecommerce_business: ["productOrServiceWanted", "budgetOrQuantity", "location"],
        product_business: ["productOrServiceWanted", "budgetOrQuantity", "location"],
        service_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "location"],
        mixed_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
        unknown: ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
      },
      behavioralSignalWeights: {
        high_engagement: 3,
        urgency: 4,
        decision_stage: 2,
        objection: 2,
        trust_building: 2,
        contact_ready: 3,
        information_gathering: 1,
        comparison_shopping: 2,
      },
      engagementThresholds: {
        hot: 80,
        warm: 60,
        interested: 40,
        curious: 20,
      },
      followUpSequences: [
        {
          name: "new_lead",
          stages: [
            { delay: 5, trigger: "no_reply", template: "new_lead_initial" },
            { delay: 60, trigger: "no_reply", template: "new_lead_hour" },
            { delay: 1440, trigger: "no_reply", template: "new_lead_day" },
            { delay: 4320, trigger: "no_reply", template: "new_lead_final" },
          ],
        },
        {
          name: "hot_lead",
          stages: [
            { delay: 5, trigger: "no_reply", template: "hot_lead_immediate" },
            { delay: 30, trigger: "no_reply", template: "hot_lead_urgent" },
            { delay: 120, trigger: "no_reply", template: "hot_lead_final" },
          ],
        },
        {
          name: "interested_but_stalled",
          stages: [
            { delay: 1440, trigger: "stall_detected", template: "stall_value_reminder" },
            { delay: 2880, trigger: "no_reply", template: "stall_social_proof" },
            { delay: 4320, trigger: "no_reply", template: "stall_final" },
          ],
        },
        {
          name: "demo_scheduled",
          stages: [
            { delay: 60, trigger: "demo_reminder", template: "demo_reminder_1hr" },
            { delay: 1440, trigger: "no_reply", template: "demo_no_show" },
          ],
        },
      ],
      objectionPatterns: {
        price_objection: ["mahal", "gastos", "budget", "pera", "walang pondo", "walang pera", "expensive", "costly", "pricey", "too much", "di ko afford", "di ko kaya", "hindi ko afford", "hindi ko kaya", "cheaper", "bawas", "discount", "sale", "promo"],
        stall_objection: ["i'll think", "think about it", "consider", "i'll consider", "mamimili", "magsusuri", "review", "check", "i'll get back", "balik", "follow up", "follow-up", "next time", "mamaya", "bukas", "later", "mamaya na", "after", "soon"],
        details_request: ["send details", "send info", "email me", "text me", "message me", "details first", "info first", "brochure", "catalog", "pamphlet", "ipadala", "send", "paki send", "paki-text", "paki-email"],
        trust_objection: ["legit", "legitimate", "scam", "fake", "trust", "tiwala", "nagdadalawang isip", "doubt", "sigurado", "siguradong", "prove", "proba", "testimonials", "reviews", "ref", "referral", "nagkaroon", "nagka"],
        competitor_objection: ["other", "iba", "competitor", "kumpetisyon", "cheaper elsewhere", "mas mura", "other option", "kumuha na lang", "kumuha sa", "try other", "check other"],
        timing_objection: ["not ready", "hindi pa", "too early", "mamaya pa", "next month", "next year", "busy", "occupied", "no time", "walang oras", "hindi oras"],
        authority_objection: ["ask my", "consult", "partner", "spouse", "boss", "manager", "team", "pamilya", "asawa", "magulang", "kumonsulta", "tanungin"],
      },
      languageDetectionKeywords: {
        filipino: ["ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo", "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo", "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong", "serbisyo", "produkto", "inyo", "kita", "ko", "mo", "sa", "ang", "na", "at"],
        english: ["what", "how", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are", "service", "services", "product", "products"],
      },
    },
  },

  aggressive_sales: {
    name: "Aggressive Sales",
    description: "Faster follow-ups, higher urgency weight, lower thresholds for hot leads",
    settings: {
      discoveryFieldMappings: {
        b2b_saas: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume", "budgetOrQuantity"],
        software: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution", "dailyVolume", "budgetOrQuantity"],
        booking_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "preferredSchedule", "budgetOrQuantity"],
        consultation_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "budgetOrQuantity", "location"],
        ecommerce_business: ["productOrServiceWanted", "budgetOrQuantity", "location", "preferredSchedule"],
        product_business: ["productOrServiceWanted", "budgetOrQuantity", "location", "quantity"],
        service_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "location", "budgetOrQuantity"],
        mixed_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "budgetOrQuantity"],
        unknown: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "budgetOrQuantity"],
      },
      behavioralSignalWeights: {
        high_engagement: 4,
        urgency: 5,
        decision_stage: 3,
        objection: 2,
        trust_building: 2,
        contact_ready: 4,
        information_gathering: 1,
        comparison_shopping: 2,
      },
      engagementThresholds: {
        hot: 70,
        warm: 50,
        interested: 30,
        curious: 15,
      },
      followUpSequences: [
        {
          name: "new_lead",
          stages: [
            { delay: 3, trigger: "no_reply", template: "new_lead_initial" },
            { delay: 30, trigger: "no_reply", template: "new_lead_hour" },
            { delay: 720, trigger: "no_reply", template: "new_lead_day" },
            { delay: 2880, trigger: "no_reply", template: "new_lead_final" },
          ],
        },
        {
          name: "hot_lead",
          stages: [
            { delay: 3, trigger: "no_reply", template: "hot_lead_immediate" },
            { delay: 15, trigger: "no_reply", template: "hot_lead_urgent" },
            { delay: 60, trigger: "no_reply", template: "hot_lead_final" },
          ],
        },
        {
          name: "interested_but_stalled",
          stages: [
            { delay: 720, trigger: "stall_detected", template: "stall_value_reminder" },
            { delay: 1440, trigger: "no_reply", template: "stall_social_proof" },
            { delay: 2880, trigger: "no_reply", template: "stall_final" },
          ],
        },
        {
          name: "demo_scheduled",
          stages: [
            { delay: 30, trigger: "demo_reminder", template: "demo_reminder_1hr" },
            { delay: 720, trigger: "no_reply", template: "demo_no_show" },
          ],
        },
      ],
      objectionPatterns: {
        price_objection: ["mahal", "gastos", "budget", "pera", "walang pondo", "walang pera", "expensive", "costly", "pricey", "too much", "di ko afford", "di ko kaya", "hindi ko afford", "hindi ko kaya", "cheaper", "bawas", "discount", "sale", "promo"],
        stall_objection: ["i'll think", "think about it", "consider", "i'll consider", "mamimili", "magsusuri", "review", "check", "i'll get back", "balik", "follow up", "follow-up", "next time", "mamaya", "bukas", "later", "mamaya na", "after", "soon"],
        details_request: ["send details", "send info", "email me", "text me", "message me", "details first", "info first", "brochure", "catalog", "pamphlet", "ipadala", "send", "paki send", "paki-text", "paki-email"],
        trust_objection: ["legit", "legitimate", "scam", "fake", "trust", "tiwala", "nagdadalawang isip", "doubt", "sigurado", "siguradong", "prove", "proba", "testimonials", "reviews", "ref", "referral", "nagkaroon", "nagka"],
        competitor_objection: ["other", "iba", "competitor", "kumpetisyon", "cheaper elsewhere", "mas mura", "other option", "kumuha na lang", "kumuha sa", "try other", "check other"],
        timing_objection: ["not ready", "hindi pa", "too early", "mamaya pa", "next month", "next year", "busy", "occupied", "no time", "walang oras", "hindi oras"],
        authority_objection: ["ask my", "consult", "partner", "spouse", "boss", "manager", "team", "pamilya", "asawa", "magulang", "kumonsulta", "tanungin"],
      },
      languageDetectionKeywords: {
        filipino: ["ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo", "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo", "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong", "serbisyo", "produkto", "inyo", "kita", "ko", "mo", "sa", "ang", "na", "at"],
        english: ["what", "how", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are", "service", "services", "product", "products"],
      },
    },
 },

  relationship_building: {
    name: "Relationship Building",
    description: "Slower follow-ups, emphasis on trust building, higher thresholds",
    settings: {
      discoveryFieldMappings: {
        b2b_saas: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution"],
        software: ["productOrServiceWanted", "businessType", "problemEncountered", "desiredSolution"],
        booking_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "preferredSchedule"],
        consultation_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
        ecommerce_business: ["productOrServiceWanted", "location"],
        product_business: ["productOrServiceWanted", "location"],
        service_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution", "location"],
        mixed_business: ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
        unknown: ["productOrServiceWanted", "problemEncountered", "desiredSolution"],
      },
      behavioralSignalWeights: {
        high_engagement: 2,
        urgency: 2,
        decision_stage: 2,
        objection: 2,
        trust_building: 4,
        contact_ready: 2,
        information_gathering: 2,
        comparison_shopping: 2,
      },
      engagementThresholds: {
        hot: 90,
        warm: 70,
        interested: 50,
        curious: 30,
      },
      followUpSequences: [
        {
          name: "new_lead",
          stages: [
            { delay: 10, trigger: "no_reply", template: "new_lead_initial" },
            { delay: 120, trigger: "no_reply", template: "new_lead_hour" },
            { delay: 2880, trigger: "no_reply", template: "new_lead_day" },
            { delay: 5760, trigger: "no_reply", template: "new_lead_final" },
          ],
        },
        {
          name: "hot_lead",
          stages: [
            { delay: 10, trigger: "no_reply", template: "hot_lead_immediate" },
            { delay: 60, trigger: "no_reply", template: "hot_lead_urgent" },
            { delay: 240, trigger: "no_reply", template: "hot_lead_final" },
          ],
        },
        {
          name: "interested_but_stalled",
          stages: [
            { delay: 2880, trigger: "stall_detected", template: "stall_value_reminder" },
            { delay: 4320, trigger: "no_reply", template: "stall_social_proof" },
            { delay: 5760, trigger: "no_reply", template: "stall_final" },
          ],
        },
        {
          name: "demo_scheduled",
          stages: [
            { delay: 120, trigger: "demo_reminder", template: "demo_reminder_1hr" },
            { delay: 2880, trigger: "no_reply", template: "demo_no_show" },
          ],
        },
      ],
      objectionPatterns: {
        price_objection: ["mahal", "gastos", "budget", "pera", "walang pondo", "walang pera", "expensive", "costly", "pricey", "too much", "di ko afford", "di ko kaya", "hindi ko afford", "hindi ko kaya", "cheaper", "bawas", "discount", "sale", "promo"],
        stall_objection: ["i'll think", "think about it", "consider", "i'll consider", "mamimili", "magsusuri", "review", "check", "i'll get back", "balik", "follow up", "follow-up", "next time", "mamaya", "bukas", "later", "mamaya na", "after", "soon"],
        details_request: ["send details", "send info", "email me", "text me", "message me", "details first", "info first", "brochure", "catalog", "pamphlet", "ipadala", "send", "paki send", "paki-text", "paki-email"],
        trust_objection: ["legit", "legitimate", "scam", "fake", "trust", "tiwala", "nagdadalawang isip", "doubt", "sigurado", "siguradong", "prove", "proba", "testimonials", "reviews", "ref", "referral", "nagkaroon", "nagka"],
        competitor_objection: ["other", "iba", "competitor", "kumpetisyon", "cheaper elsewhere", "mas mura", "other option", "kumuha na lang", "kumuha sa", "try other", "check other"],
        timing_objection: ["not ready", "hindi pa", "too early", "mamaya pa", "next month", "next year", "busy", "occupied", "no time", "walang oras", "hindi oras"],
        authority_objection: ["ask my", "consult", "partner", "spouse", "boss", "manager", "team", "pamilya", "asawa", "magulang", "kumonsulta", "tanungin"],
      },
      languageDetectionKeywords: {
        filipino: ["ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo", "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo", "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong", "serbisyo", "produkto", "inyo", "kita", "ko", "mo", "sa", "ang", "na", "at"],
        english: ["what", "how", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are", "service", "services", "product", "products"],
      },
    },
  },

  minimal_nurturing: {
    name: "Minimal Nurturing",
    description: "Very light follow-ups, respects customer space, low urgency",
    settings: {
      discoveryFieldMappings: {
        b2b_saas: ["productOrServiceWanted", "businessType"],
        software: ["productOrServiceWanted", "businessType"],
        booking_business: ["productOrServiceWanted"],
        consultation_business: ["productOrServiceWanted"],
        ecommerce_business: ["productOrServiceWanted"],
        product_business: ["productOrServiceWanted"],
        service_business: ["productOrServiceWanted"],
        mixed_business: ["productOrServiceWanted"],
        unknown: ["productOrServiceWanted"],
      },
      behavioralSignalWeights: {
        high_engagement: 1,
        urgency: 1,
        decision_stage: 1,
        objection: 1,
        trust_building: 2,
        contact_ready: 2,
        information_gathering: 2,
        comparison_shopping: 1,
      },
      engagementThresholds: {
        hot: 95,
        warm: 75,
        interested: 55,
        curious: 35,
      },
      followUpSequences: [
        {
          name: "new_lead",
          stages: [
            { delay: 60, trigger: "no_reply", template: "new_lead_initial" },
            { delay: 1440, trigger: "no_reply", template: "new_lead_day" },
          ],
        },
        {
          name: "hot_lead",
          stages: [
            { delay: 30, trigger: "no_reply", template: "hot_lead_immediate" },
            { delay: 1440, trigger: "no_reply", template: "hot_lead_final" },
          ],
        },
        {
          name: "interested_but_stalled",
          stages: [
            { delay: 4320, trigger: "stall_detected", template: "stall_value_reminder" },
          ],
        },
        {
          name: "demo_scheduled",
          stages: [
            { delay: 60, trigger: "demo_reminder", template: "demo_reminder_1hr" },
          ],
        },
      ],
      objectionPatterns: {
        price_objection: ["mahal", "gastos", "budget", "pera", "walang pondo", "walang pera", "expensive", "costly", "pricey", "too much", "di ko afford", "di ko kaya", "hindi ko afford", "hindi ko kaya", "cheaper", "bawas", "discount", "sale", "promo"],
        stall_objection: ["i'll think", "think about it", "consider", "i'll consider", "mamimili", "magsusuri", "review", "check", "i'll get back", "balik", "follow up", "follow-up", "next time", "mamaya", "bukas", "later", "mamaya na", "after", "soon"],
        details_request: ["send details", "send info", "email me", "text me", "message me", "details first", "info first", "brochure", "catalog", "pamphlet", "ipadala", "send", "paki send", "paki-text", "paki-email"],
        trust_objection: ["legit", "legitimate", "scam", "fake", "trust", "tiwala", "nagdadalawang isip", "doubt", "sigurado", "siguradong", "prove", "proba", "testimonials", "reviews", "ref", "referral", "nagkaroon", "nagka"],
        competitor_objection: ["other", "iba", "competitor", "kumpetisyon", "cheaper elsewhere", "mas mura", "other option", "kumuha na lang", "kumuha sa", "try other", "check other"],
        timing_objection: ["not ready", "hindi pa", "too early", "mamaya pa", "next month", "next year", "busy", "occupied", "no time", "walang oras", "hindi oras"],
        authority_objection: ["ask my", "consult", "partner", "spouse", "boss", "manager", "team", "pamilya", "asawa", "magulang", "kumonsulta", "tanungin"],
      },
      languageDetectionKeywords: {
        filipino: ["ano", "anong", "mga", "paano", "saan", "kailan", "magkano", "presyo", "bayad", "meron", "wala", "pwede", "pede", "puwede", "kayo", "nyo", "niyo", "namin", "po", "opo", "salamat", "makakabili", "tulong", "serbisyo", "produkto", "inyo", "kita", "ko", "mo", "sa", "ang", "na", "at"],
        english: ["what", "how", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are", "service", "services", "product", "products"],
      },
    },
  },
};

export const validateBusinessLogicSettings = (settings) => {
  const errors = [];

  if (!settings || typeof settings !== "object") {
    errors.push("Settings must be a valid JSON object");
    return { valid: false, errors };
  }

  // Validate discoveryFieldMappings
  if (settings.discoveryFieldMappings) {
    if (typeof settings.discoveryFieldMappings !== "object") {
      errors.push("discoveryFieldMappings must be an object");
    } else {
      Object.entries(settings.discoveryFieldMappings).forEach(([pageType, fields]) => {
        if (!Array.isArray(fields)) {
          errors.push(`discoveryFieldMappings.${pageType} must be an array`);
        }
      });
    }
  }

  // Validate behavioralSignalWeights
  if (settings.behavioralSignalWeights) {
    if (typeof settings.behavioralSignalWeights !== "object") {
      errors.push("behavioralSignalWeights must be an object");
    } else {
      Object.entries(settings.behavioralSignalWeights).forEach(([signal, weight]) => {
        if (typeof weight !== "number" || weight < 0 || weight > 10) {
          errors.push(`behavioralSignalWeights.${signal} must be a number between 0 and 10`);
        }
      });
    }
  }

  // Validate engagementThresholds
  if (settings.engagementThresholds) {
    if (typeof settings.engagementThresholds !== "object") {
      errors.push("engagementThresholds must be an object");
    } else {
      Object.entries(settings.engagementThresholds).forEach(([level, threshold]) => {
        if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
          errors.push(`engagementThresholds.${level} must be a number between 0 and 100`);
        }
      });
    }
  }

  // Validate followUpSequences
  if (settings.followUpSequences) {
    if (!Array.isArray(settings.followUpSequences)) {
      errors.push("followUpSequences must be an array");
    } else {
      settings.followUpSequences.forEach((seq, idx) => {
        if (!seq.name) {
          errors.push(`followUpSequences[${idx}].name is required`);
        }
        if (!Array.isArray(seq.stages)) {
          errors.push(`followUpSequences[${idx}].stages must be an array`);
        }
      });
    }
  }

  // Validate objectionPatterns
  if (settings.objectionPatterns) {
    if (typeof settings.objectionPatterns !== "object") {
      errors.push("objectionPatterns must be an object");
    } else {
      Object.entries(settings.objectionPatterns).forEach(([type, patterns]) => {
        if (!Array.isArray(patterns)) {
          errors.push(`objectionPatterns.${type} must be an array`);
        }
      });
    }
  }

  // Validate languageDetectionKeywords
  if (settings.languageDetectionKeywords) {
    if (typeof settings.languageDetectionKeywords !== "object") {
      errors.push("languageDetectionKeywords must be an object");
    } else {
      Object.entries(settings.languageDetectionKeywords).forEach(([lang, keywords]) => {
        if (!Array.isArray(keywords)) {
          errors.push(`languageDetectionKeywords.${lang} must be an array`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
};
