/**
 * Behavioral Trigger System for Facebook Chatbot
 * Detects user behavior patterns and triggers contextual responses
 */

const logger = require('../../config/logger');

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const { isFilipinoStyle } = require("./facebookReplyUtils");

// Behavioral patterns to detect
const BEHAVIORAL_PATTERNS = {
  // High engagement signals
  high_engagement: {
    patterns: [
      /(interested| gusto| want| need| looking for| searching| need help)/i,
      /(magkano| price| cost| pricing| presyo| bayad)/i,
      /(demo| trial| test| sample| consultation| consult)/i,
      /(available| available ba| schedule| booking| book| reserve)/i,
    ],
    weight: 3,
  },

  // Urgency signals
  urgency: {
    patterns: [
      /(asap| urgent| immediately| right now| today| ngayon| mamaya| soon)/i,
      /(deadline| due date| need by| kailangan ng| before)/i,
      /(rush| quick| fast| immediate| instant)/i,
    ],
    weight: 4,
  },

  // Decision stage signals
  decision_stage: {
    patterns: [
      /(decide| decision| choose| select| pick| option| choice)/i,
      /(compare| comparison| versus| vs| better| best)/i,
      /(pros| cons| advantage| disadvantage| benefit)/i,
    ],
    weight: 2,
  },

  // Objection signals
  objection: {
    patterns: [
      /(but| however| though| although| medyo| medyo mahal| medyo mahal)/i,
      /(concern| worry| doubt| unsure| hesitant| nagdadalawang isip)/i,
      /(risk| gamble| safe| sure| confident| confident)/i,
    ],
    weight: 2,
  },

  // Trust building signals
  trust_building: {
    patterns: [
      /(trust| reliable| reputable| established| experienced| expert)/i,
      /(testimonial| review| feedback| recommendation| referral| recommend)/i,
      /(case study| success story| track record| portfolio)/i,
    ],
    weight: 2,
  },

  // Contact readiness signals
  contact_ready: {
    patterns: [
      /(call| phone| number| contact| email| reach| message)/i,
      /(tawag| text| message| chat| kumustahin| kontakin)/i,
      /(schedule| appointment| meeting| calendar| book)/i,
    ],
    weight: 3,
  },

  // Information gathering signals
  information_gathering: {
    patterns: [
      /(how| what| when| where| why| who| which| ano| paano| saan| kailan| bakit| sino)/i,
      /(explain| describe| detail| information| info| details| specifics)/i,
      /(learn| understand| know| find out| discover| check)/i,
    ],
    weight: 1,
  },

  // Comparison shopping signals
  comparison_shopping: {
    patterns: [
      /(other| else| alternative| option| choice| iba| ibang)/i,
      /(cheaper| affordable| budget| cost| price| presyo| mura)/i,
      /(compare| comparison| versus| vs| better| best| difference)/i,
    ],
    weight: 2,
  },
};

// Get behavioral patterns with configurable weights
function getBehavioralPatterns(pageConfig = {}) {
  const customWeights = pageConfig?.businessLogicSettings?.behavioralSignalWeights;
  
  if (!customWeights || typeof customWeights !== "object") {
    return BEHAVIORAL_PATTERNS;
  }

  // Merge custom weights with default patterns
  const patterns = {};
  Object.entries(BEHAVIORAL_PATTERNS).forEach(([signalType, config]) => {
    patterns[signalType] = {
      ...config,
      weight: customWeights[signalType] !== undefined ? customWeights[signalType] : config.weight,
    };
  });

  return patterns;
}

// Detect behavioral signals from message
function detectBehavioralSignals(text = "", recentMessages = [], pageConfig = {}) {
  const message = normalizeText(text).toLowerCase();
  const signals = [];
  const allMessages = [message, ...recentMessages.map(m => normalizeText(m.content).toLowerCase())].join(" ");
  
  const patterns = getBehavioralPatterns(pageConfig);

  Object.entries(patterns).forEach(([signalType, config]) => {
    const matches = config.patterns.filter(pattern => pattern.test(allMessages));
    if (matches.length > 0) {
      signals.push({
        type: signalType,
        strength: Math.min(matches.length * config.weight, 10),
        matchedPatterns: matches,
      });
    }
  });

  return signals.sort((a, b) => b.strength - a.strength);
}

// Calculate engagement score
function calculateEngagementScore(signals = [], messageCount = 0, responseTime = 0) {
  let score = 0;

  // Base score from message count
  score += Math.min(messageCount * 5, 25);

  // Score from behavioral signals
  signals.forEach(signal => {
    score += signal.strength;
  });

  // Bonus for fast responses (indicates high interest)
  if (responseTime > 0 && responseTime < 30000) { // Less than 30 seconds
    score += 10;
  } else if (responseTime > 0 && responseTime < 60000) { // Less than 1 minute
    score += 5;
  }

  return Math.min(score, 100);
}

// Determine lead temperature from engagement
function determineLeadTemperature(engagementScore, signals = [], pageConfig = {}) {
  const customThresholds = pageConfig?.businessLogicSettings?.engagementThresholds;
  
  if (!customThresholds || typeof customThresholds !== "object") {
    // Use default thresholds
    if (engagementScore >= 80) return "hot";
    if (engagementScore >= 60) return "warm";
    if (engagementScore >= 40) return "interested";
    if (engagementScore >= 20) return "curious";
    return "cold";
  }

  // Use configurable thresholds
  if (engagementScore >= (customThresholds.hot || 80)) return "hot";
  if (engagementScore >= (customThresholds.warm || 60)) return "warm";
  if (engagementScore >= (customThresholds.interested || 40)) return "interested";
  if (engagementScore >= (customThresholds.curious || 20)) return "curious";
  return "cold";
}

// Detect buying intent
function detectBuyingIntent(signals = [], flowData = {}) {
  const highEngagement = signals.some(s => s.type === "high_engagement");
  const urgency = signals.some(s => s.type === "urgency");
  const contactReady = signals.some(s => s.type === "contact_ready");
  const decisionStage = signals.some(s => s.type === "decision_stage");

  const leadScore = flowData.leadScore || 0;
  const hasContactInfo = !!(flowData.pendingLeadData?.phone || flowData.pendingLeadData?.email);

  let intentScore = 0;

  if (highEngagement) intentScore += 30;
  if (urgency) intentScore += 25;
  if (contactReady) intentScore += 20;
  if (decisionStage) intentScore += 15;
  if (hasContactInfo) intentScore += 10;
  if (leadScore >= 60) intentScore += 20;

  if (intentScore >= 70) return "ready_to_buy";
  if (intentScore >= 50) return "ready_to_commit";
  if (intentScore >= 30) return "considering";
  if (intentScore >= 15) return "interested";
  return "browsing";
}

// Generate behavioral insights
function generateBehavioralInsights(signals = [], flowData = {}, conversationHistory = []) {
  const insights = [];
  const topSignal = signals[0];

  if (!topSignal) {
    return insights;
  }

  switch (topSignal.type) {
    case "high_engagement":
      insights.push({
        type: "engagement",
        message: "User shows high interest in products/services",
        action: "prioritize_lead",
      });
      break;

    case "urgency":
      insights.push({
        type: "urgency",
        message: "User has urgency signals - time-sensitive opportunity",
        action: "accelerate_sales_cycle",
      });
      break;

    case "decision_stage":
      insights.push({
        type: "decision",
        message: "User is in decision-making mode",
        action: "provide_comparison",
      });
      break;

    case "objection":
      insights.push({
        type: "objection",
        message: "User has concerns or objections",
        action: "address_concerns",
      });
      break;

    case "trust_building":
      insights.push({
        type: "trust",
        message: "User needs trust signals",
        action: "provide_social_proof",
      });
      break;

    case "contact_ready":
      insights.push({
        type: "contact",
        message: "User is ready to share contact info",
        action: "request_contact",
      });
      break;

    case "information_gathering":
      insights.push({
        type: "information",
        message: "User is gathering information",
        action: "provide_detailed_info",
      });
      break;

    case "comparison_shopping":
      insights.push({
        type: "comparison",
        message: "User is comparing options",
        action: "highlight_differentiators",
      });
      break;
  }

  return insights;
}

// Build contextual response based on behavioral signals
function buildBehavioralResponse({
  signals = [],
  flowData = {},
  pageConfig = {},
  pageIntelligence = {},
  compactFacebookReply,
  isFilipino = false,
}) {
  const topSignal = signals[0];
  if (!topSignal) {
    return null;
  }

  const pageName = normalizeText(pageConfig.pageName) || "we";
  const leadData = flowData.pendingLeadData || flowData.confirmedLeadData || {};
  const interest = normalizeText(leadData.productOrServiceWanted) || "our services";

  switch (topSignal.type) {
    case "urgency":
      if (isFilipino) {
        return compactFacebookReply(
          [
            `Nakita ko po na may urgency sa inquiry niyo! 😊`,
            "",
            `Para sa ${interest}, may mga option po kaming pwedeng magamit niyo agad.`,
            "",
            `Gusto niyo po bang i-prioritize yung inquiry niyo? Pwede ko po kayong i-assign sa priority list para may dedicated follow-up.`,
            "",
            `Anong oras po ang convenient para mag-quick call or chat?`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
      return compactFacebookReply(
        [
          `I can see there's urgency in your inquiry! 😊`,
          "",
          `For ${interest}, we have options that can be set up quickly.`,
          "",
          `Would you like me to prioritize your inquiry? I can add you to our priority list for dedicated follow-up.`,
          "",
          `What time works best for a quick call or chat?`,
        ]
          .filter(Boolean)
          .join("\n")
      );

    case "decision_stage":
      if (isFilipino) {
        return compactFacebookReply(
          [
            `Mukhang nag-iisip-isip na kayo! 😊`,
            "",
            `Para mas madali ang pagpili, pwede ko po kayong i-guide base sa specific na kailangan niyo.`,
            "",
            `Anong pinaka-importante para sa inyo: presyo, features, o bilis ng setup?`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
      return compactFacebookReply(
        [
          `Sounds like you're weighing your options! 😊`,
          "",
          `To make the decision easier, I can guide you based on what matters most to your situation.`,
          "",
          `What's most important to you: pricing, features, or speed of setup?`,
        ]
          .filter(Boolean)
          .join("\n")
      );

    // NOTE: trust_building and comparison_shopping are handled by
    // facebookObjectionHandling (buildTrustObjectionResponse /
    // buildCompetitorObjectionResponse) which fires first in the flow.
    // Returning null here avoids duplicate competing replies.
    default:
      return null;
  }
}

// Analyze conversation patterns
function analyzeConversationPattern(conversationHistory = []) {
  const patterns = {
    messageCount: conversationHistory.length,
    avgResponseTime: 0,
    questionCount: 0,
    positiveSentiment: 0,
    negativeSentiment: 0,
    engagementLevel: "low",
  };

  if (conversationHistory.length === 0) {
    return patterns;
  }

  // Count questions
  patterns.questionCount = conversationHistory.filter(
    msg => msg.role === "user" && msg.content.includes("?")
  ).length;

  // Simple sentiment analysis
  const positiveWords = /\b(great|good|excellent|amazing|wonderful|perfect|thanks|thank you|salamat|maganda|ayos|okay|sige|oo|opo)\b/i;
  const negativeWords = /\b(bad|terrible|awful|horrible|problem|issue|concern|worry|hindi|ayaw|no|nope|problemado|hirap)\b/i;

  conversationHistory.forEach(msg => {
    if (msg.role === "user") {
      if (positiveWords.test(msg.content)) patterns.positiveSentiment++;
      if (negativeWords.test(msg.content)) patterns.negativeSentiment++;
    }
  });

  // Determine engagement level
  if (patterns.messageCount >= 10 && patterns.questionCount >= 3) {
    patterns.engagementLevel = "high";
  } else if (patterns.messageCount >= 5 && patterns.questionCount >= 1) {
    patterns.engagementLevel = "medium";
  } else if (patterns.messageCount >= 2) {
    patterns.engagementLevel = "low";
  }

  return patterns;
}

// Predict next best action
function predictNextBestAction({
  signals = [],
  flowData = {},
  conversationPattern = {},
  pageConfig = {},
}) {
  const topSignal = signals[0];
  const leadScore = flowData.leadScore || 0;
  const leadPriority = flowData.leadPriority || "new";
  const currentStage = flowData.currentState || "new";

  // High priority leads
  if (leadScore >= 80 || leadPriority === "hot") {
    return {
      action: "accelerate_to_close",
      reason: "Hot lead with high engagement",
      recommendedStep: "request_contact_or_demo",
    };
  }

  // Urgency detected
  if (topSignal?.type === "urgency") {
    return {
      action: "accelerate_sales_cycle",
      reason: "Urgency signals detected",
      recommendedStep: "offer_immediate_action",
    };
  }

  // Trust building needed
  if (topSignal?.type === "trust_building") {
    return {
      action: "build_trust",
      reason: "User needs trust signals",
      recommendedStep: "share_social_proof",
    };
  }

  // Comparison shopping
  if (topSignal?.type === "comparison_shopping") {
    return {
      action: "differentiate",
      reason: "User is comparing options",
      recommendedStep: "highlight_unique_value",
    };
  }

  // Contact ready
  if (topSignal?.type === "contact_ready") {
    return {
      action: "capture_contact",
      reason: "User ready to share contact",
      recommendedStep: "request_contact_info",
    };
  }

  // Information gathering
  if (topSignal?.type === "information_gathering") {
    return {
      action: "educate",
      reason: "User needs more information",
      recommendedStep: "provide_detailed_info",
    };
  }

  // Default based on stage
  if (currentStage === "new" || currentStage === "understanding_inquiry") {
    return {
      action: "qualify",
      reason: "New lead - need to qualify",
      recommendedStep: "ask_discovery_questions",
    };
  }

  if (currentStage === "adaptive_qualification") {
    return {
      action: "continue_qualification",
      reason: "Gathering qualification data",
      recommendedStep: "ask_next_qualification_question",
    };
  }

  return {
    action: "nurture",
    reason: "Continue nurturing lead",
    recommendedStep: "provide_value",
  };
}

module.exports = {
  BEHAVIORAL_PATTERNS,
  analyzeConversationPattern,
  calculateEngagementScore,
  detectBehavioralSignals,
  detectBuyingIntent,
  determineLeadTemperature,
  generateBehavioralInsights,
  buildBehavioralResponse,
  predictNextBestAction,
};