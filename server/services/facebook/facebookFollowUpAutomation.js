/**
 * Follow-Up Automation System for Facebook Chatbot
 * Manages automated follow-up sequences based on lead behavior and engagement
 */

const logger = require('../../config/logger');

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const { isFilipinoStyle } = require("./facebookReplyUtils");

// Follow-up sequence definitions
const FOLLOW_UP_SEQUENCES = {
  new_lead: {
    name: "New Lead Nurturing",
    stages: [
      {
        delay: 5, // minutes
        trigger: "no_reply",
        template: "new_lead_initial",
      },
      {
        delay: 60, // 1 hour
        trigger: "no_reply",
        template: "new_lead_hour",
      },
      {
        delay: 1440, // 24 hours
        trigger: "no_reply",
        template: "new_lead_day",
      },
      {
        delay: 4320, // 3 days
        trigger: "no_reply",
        template: "new_lead_final",
      },
    ],
  },

  hot_lead: {
    name: "Hot Lead Fast Follow-up",
    stages: [
      {
        delay: 5,
        trigger: "no_reply",
        template: "hot_lead_immediate",
      },
      {
        delay: 30,
        trigger: "no_reply",
        template: "hot_lead_urgent",
      },
      {
        delay: 120,
        trigger: "no_reply",
        template: "hot_lead_final",
      },
    ],
  },

  interested_but_stalled: {
    name: "Stalled Lead Re-engagement",
    stages: [
      {
        delay: 1440, // 24 hours
        trigger: "stall_detected",
        template: "stall_value_reminder",
      },
      {
        delay: 2880, // 48 hours
        trigger: "no_reply",
        template: "stall_social_proof",
      },
      {
        delay: 4320, // 3 days
        trigger: "no_reply",
        template: "stall_final",
      },
    ],
  },

  demo_scheduled: {
    name: "Demo Confirmation",
    stages: [
      {
        delay: 60, // 1 hour before
        trigger: "demo_reminder",
        template: "demo_reminder_1hr",
      },
      {
        delay: 1440, // 24 hours after if no show
        trigger: "no_reply",
        template: "demo_no_show",
      },
    ],
  },
};

// Get follow-up sequences with configurable timing
function getFollowUpSequences(pageConfig = {}) {
  const customSequences = pageConfig?.businessLogicSettings?.followUpSequences;
  
  if (!customSequences || !Array.isArray(customSequences) || customSequences.length === 0) {
    return FOLLOW_UP_SEQUENCES;
  }

  // Convert array format to object format for easier lookup
  const sequences = {};
  customSequences.forEach(seq => {
    if (seq.name && Array.isArray(seq.stages)) {
      const key = seq.name.toLowerCase().replace(/\s+/g, '_');
      sequences[key] = seq;
    }
  });

  return sequences;
}

// Follow-up message templates
const FOLLOW_UP_TEMPLATES = {
  new_lead_initial: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 😊

Nakita ko lang po na nag-inquire kayo kanina. Gusto ko lang po i-check kung may question pa kayo o kailangan niyo ng additional info?

Nandito lang po ako para matulungan kayo!`,
    english: (data) => `Hi ${data.customerName || "there"}! 😊

I saw your inquiry earlier. Just wanted to check if you have any questions or need any additional information?

I'm here to help!`,
  },

  new_lead_hour: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 👋

Baka busy lang po kayo kanina, pero gusto ko lang i-share yung quick highlight:

${data.keyBenefit || "Marami pong nakakatulong sa aming services"}

Gusto niyo po bang mag-book ng FREE consultation para mas ma-discuss natin?`,
    english: (data) => `Hi ${data.customerName || "there"}! 👋

You might have been busy earlier, but I just wanted to share a quick highlight:

${data.keyBenefit || "Many have found our services really helpful"}

Would you like to book a FREE consultation to discuss this further?`,
  },

  new_lead_day: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 🌟

1 day na rin po since nag-inquire kayo. Gusto ko lang i-remind na may FREE consultation pa rin po kami na available para sa inyo.

Marami pong nag-enjoy sa consultation na ito dahil nakita nila yung value agad.

Available po kaming bukas o kahit anong oras convenient sa inyo!`,
    english: (data) => `Hi ${data.customerName || "there"}! 🌟

It's been a day since your inquiry. Just a reminder that we still have FREE consultations available for you.

Many have found these consultations valuable as they immediately see the value for their situation.

We're available tomorrow or whatever time works best for you!`,
  },

  new_lead_final: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 💫

Last follow-up ko na po ito, promise! 😊

Kung may doubt pa rin po kayo o kailangan ng clarifications, I'm here. Pero kung ready na rin po kayo, let's move forward!

Anong best way para ma-contact kayo?`,
    english: (data) => `Hi ${data.customerName || "there"}! 💫

This is my last follow-up, I promise! 😊

If you still have doubts or need clarifications, I'm here. But if you're ready, let's move forward!

What's the best way to contact you?`,
  },

  hot_lead_immediate: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 🔥

Nakita ko po na super interested kayo sa aming ${data.interest || "services"}!

Gusto ko lang po i-prioritize yung inquiry niyo. Pwede ko po kayong i-assign sa priority list namin para may dedicated follow-up.

Anong oras po ang convenient para mag-quick call or chat?`,
    english: (data) => `Hi ${data.customerName || "there"}! 🔥

I can see you're really interested in our ${data.interest || "services"}!

I want to prioritize your inquiry. I can add you to our priority list for dedicated follow-up.

What time works best for a quick call or chat?`,
  },

  hot_lead_urgent: {
    filipino: (data) => `Hi ${data.customerName || "po"}! ⚡

Quick update: May limited slots po kaming available this week for ${data.interest || "onboarding"}.

Gusto ko lang i-ensure na hindi niyo masisilip yung slot na pwede para sa inyo.

Available po until ${data.deadline || "end of week"}. Should I reserve one for you?`,
    english: (data) => `Hi ${data.customerName || "there"}! ⚡

Quick update: We have limited slots available this week for ${data.interest || "onboarding"}.

I want to make sure you don't miss out on a slot that could work for you.

Available until ${data.deadline || "end of week"}. Should I reserve one for you?`,
  },

  hot_lead_final: {
    filipino: (data) => `Hi ${data.customerName || "po"}! ⏰

Last chance po for this week's slots! 😊

Kung hindi po makakapag-decide ngayon, next available po ay ${data.nextAvailable || "next week"}.

Pero baka gusto niyo ng instant access? Pwede na rin po kayong mag-start anytime with our self-service option.

Anong preference niyo?`,
    english: (data) => `Hi ${data.customerName || "there"}! ⏰

Last chance for this week's slots! 😊

If you can't decide now, the next available slot is ${data.nextAvailable || "next week"}.

But if you want instant access, you can also start anytime with our self-service option.

What's your preference?`,
  },

  stall_value_reminder: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 💡

Baka helpful lang ito: ${data.valuePoint || "Marami pong nakakapag-save ng oras at pera pag nagamit na nila aming services"}

Gusto niyo po bang i-revisit yung mga details? Or may specific concern pa ba na gusto nating ma-address?`,
    english: (data) => `Hi ${data.customerName || "there"}! 💡

Just a helpful reminder: ${data.valuePoint || "Many have saved time and money using our services"}

Would you like to revisit the details? Or is there a specific concern you'd like us to address?`,
  },

  stall_social_proof: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 🌟

Check natin yung success story ni ${data.similarClient || "isang client na same situation niyo"}:

"${data.testimonial || "Nakakatulong talaga, nag-improve yung business namin after nagamit namin ito"}" — ${data.clientName || "Client"}

Gusto niyo po bang maging part ng success stories namin?`,
    english: (data) => `Hi ${data.customerName || "there"}! 🌟

Let me share a success story from ${data.similarClient || "a client in a similar situation"}:

"${data.testimonial || "This really helped, our business improved after using this"}" — ${data.clientName || "Client"}

Would you like to be part of our success stories?`,
  },

  stall_final: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 🤝

Last follow-up ko na po talaga! 😊

Kung hindi pa rin po ready, no problem! Pwede niyo po ring i-book yung consultation kahit kailan man.

Nandito lang po ako anytime kung may question kayo. Salamat po sa time!`,
    english: (data) => `Hi ${data.customerName || "there"}! 🤝

This is really my last follow-up! 😊

If you're still not ready, no problem! You can book the consultation anytime.

I'm here anytime if you have questions. Thanks for your time!`,
  },

  demo_reminder_1hr: {
    filipino: (data) => `Hi ${data.customerName || "po"}! ⏰

Reminder: 1 hour na lang before yung scheduled demo/consultation natin! 😊

${data.demoDetails || "I'll send the meeting link shortly"}

See you soon!`,
    english: (data) => `Hi ${data.customerName || "there"}! ⏰

Reminder: 1 hour until our scheduled demo/consultation! 😊

${data.demoDetails || "I'll send the meeting link shortly"}

See you soon!`,
  },

  demo_no_show: {
    filipino: (data) => `Hi ${data.customerName || "po"}! 👋

Nakita ko lang po na hindi po kayo nakapag-attend kanina. Busy lang po ba kayo?

Gusto niyo po bang mag-reschedule? Available po kaming bukas o kahit anong oras convenient sa inyo!`,
    english: (data) => `Hi ${data.customerName || "there"}! 👋

I noticed you weren't able to attend earlier. Were you just busy?

Would you like to reschedule? We're available tomorrow or whatever time works best for you!`,
  },
};

// Determine follow-up sequence based on lead data
function determineFollowUpSequence(leadData = {}, flowData = {}, pageConfig = {}) {
  const leadScore = flowData.leadScore || 0;
  const leadPriority = flowData.leadPriority || "new";
  const lastIntent = flowData.intent || "unknown";
  const ctaChoice = flowData.ctaChoice || "";
  const stage = flowData.currentState || "new";

  // Hot lead with high score
  if (leadScore >= 80 || leadPriority === "hot") {
    return "hot_lead";
  }

  // Demo scheduled
  if (ctaChoice === "demo" || stage === "awaiting_demo_schedule" || stage === "demo_schedule_received") {
    return "demo_scheduled";
  }

  // Stalled lead (said "I'll think about it" or similar)
  if (lastIntent === "stall_objection" || ctaChoice === "not_now") {
    return "interested_but_stalled";
  }

  // Default: new lead nurturing
  return "new_lead";
}

// Build personalized follow-up message
function buildFollowUpMessage({
  templateName,
  leadData = {},
  pageConfig = {},
  compactFacebookReply,
}) {
  const template = FOLLOW_UP_TEMPLATES[templateName];
  if (!template) {
    return null;
  }

  const isFilipino = isFilipinoStyle(leadData.customerMessage || leadData.customerName || "");
  const templateFn = isFilipino ? template.filipino : template.english;

  const personalizedData = {
    customerName: normalizeText(leadData.customerName),
    interest: normalizeText(leadData.productOrServiceWanted),
    businessType: normalizeText(leadData.businessType),
    keyBenefit: extractKeyBenefit(pageConfig, leadData),
    valuePoint: extractValuePoint(pageConfig, leadData),
    similarClient: findSimilarClient(leadData),
    testimonial: findRelevantTestimonial(pageConfig, leadData),
    clientName: "Satisfied Client",
    deadline: calculateDeadline(),
    nextAvailable: calculateNextAvailable(),
    demoDetails: buildDemoDetails(leadData),
    customerMessage: leadData.customerMessage || "",
  };

  const messageText = templateFn(personalizedData);

  return compactFacebookReply(messageText);
}

function extractKeyBenefit(pageConfig = {}, leadData = {}) {
  const products = normalizeText(pageConfig.productServices);
  const knowledge = normalizeText(pageConfig.knowledge);

  if (products) {
    // Extract first benefit from product list
    const firstProduct = products.split('\n')[0];
    return firstProduct;
  }

  if (knowledge) {
    // Extract first sentence as benefit
    const sentences = knowledge.split(/[.!?]+/);
    return sentences[0]?.trim() || "Our services";
  }

  return "Our services";
}

function extractValuePoint(pageConfig = {}, leadData = {}) {
  const businessType = normalizeText(leadData.businessType);
  const problem = normalizeText(leadData.problemEncountered);

  if (problem) {
    return `We specifically help with: ${problem}`;
  }

  if (businessType) {
    return `We specialize in helping ${businessType} businesses like yours`;
  }

  return "We help businesses save time and increase revenue";
}

function findSimilarClient(leadData = {}) {
  const businessType = normalizeText(leadData.businessType);

  // In a real implementation, this would query the database for similar clients
  // For now, return a generic reference
  if (businessType) {
    return `a ${businessType} business owner`;
  }

  return "one of our clients";
}

function findRelevantTestimonial(pageConfig = {}, leadData = {}) {
  const interest = normalizeText(leadData.productOrServiceWanted);

  // In a real implementation, this would query testimonials from the database
  // For now, return a generic testimonial
  if (interest) {
    return `The ${interest} solution really transformed how we operate`;
  }

  return "This solution really transformed how we operate";
}

function calculateDeadline() {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (5 - now.getDay())); // Friday
  endOfWeek.setHours(23, 59, 59, 999);

  return endOfWeek.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
}

function calculateNextAvailable() {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  return nextWeek.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
}

function buildDemoDetails(leadData = {}) {
  const schedule = normalizeText(leadData.preferredSchedule);
  const contact = normalizeText(leadData.phone) || normalizeText(leadData.email);

  if (schedule && contact) {
    return `Scheduled for: ${schedule}\nWe'll contact you at: ${contact}`;
  }

  if (schedule) {
    return `Scheduled for: ${schedule}\nWe'll send you the meeting link shortly.`;
  }

  return "We'll send you the meeting link shortly.";
}

// Check if follow-up should be sent
function shouldSendFollowUp({
  lastMessageAt,
  followUpSequence,
  currentStageIndex,
  conversationStatus,
}) {
  // Don't send if conversation is in human handoff or closed
  if (conversationStatus === "human_handoff" || conversationStatus === "closed") {
    return false;
  }

  // Don't send if no last message timestamp
  if (!lastMessageAt) {
    return false;
  }

  const lastMessageTime = new Date(lastMessageAt);
  const now = new Date();
  const minutesSinceLastMessage = (now - lastMessageTime) / (1000 * 60);

  // Get current stage delay
  const sequence = FOLLOW_UP_SEQUENCES[followUpSequence];
  if (!sequence || !sequence.stages[currentStageIndex]) {
    return false;
  }

  const currentStage = sequence.stages[currentStageIndex];
  const shouldSend = minutesSinceLastMessage >= currentStage.delay;

  return shouldSend;
}

// Get next follow-up stage
function getNextFollowUpStage(followUpSequence, currentStageIndex) {
  const sequence = FOLLOW_UP_SEQUENCES[followUpSequence];
  if (!sequence) {
    return null;
  }

  const nextIndex = currentStageIndex + 1;
  if (nextIndex >= sequence.stages.length) {
    return null; // Sequence complete
  }

  return {
    stageIndex: nextIndex,
    stage: sequence.stages[nextIndex],
  };
}

// Track follow-up state in conversation metadata
function buildFollowUpMetadata(existingMetadata = {}, followUpData = {}) {
  const metadata = existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};

  return {
    ...metadata,
    followUp: {
      sequence: followUpData.sequence || metadata.followUp?.sequence || null,
      currentStageIndex: followUpData.currentStageIndex ?? metadata.followUp?.currentStageIndex ?? 0,
      lastFollowUpAt: followUpData.lastFollowUpAt || new Date().toISOString(),
      nextFollowUpAt: followUpData.nextFollowUpAt || null,
      completed: followUpData.completed || false,
    },
  };
}

// Check if conversation needs follow-up
function checkFollowUpNeeded(conversation = {}) {
  const metadata = conversation.metadata && typeof conversation.metadata === "object" ? conversation.metadata : {};
  const followUp = metadata.followUp || {};
  const lastMessageAt = conversation.last_message_at;
  const conversationStatus = normalizeText(conversation.conversation_status);

  // Skip if already in follow-up sequence
  if (followUp.sequence && !followUp.completed) {
    const sequences = getFollowUpSequences({}); // Use defaults for now, can pass pageConfig if available
    const sequence = sequences[followUp.sequence];
    if (!sequence) {
      return null;
    }

    const currentStageIndex = followUp.currentStageIndex || 0;
    const currentStage = sequence.stages[currentStageIndex];

    if (!currentStage) {
      return null;
    }

    const shouldSend = shouldSendFollowUp({
      lastMessageAt,
      followUpSequence: followUp.sequence,
      currentStageIndex,
      conversationStatus,
    });

    if (shouldSend) {
      return {
        sequence: followUp.sequence,
        stageIndex: currentStageIndex,
        template: currentStage.template,
      };
    }

    return null;
  }

  // Determine if new follow-up sequence should start
  const flowData = metadata.flowData || {};
  const leadScore = flowData.leadScore || 0;
  const leadPriority = flowData.leadPriority || "new";

  // Only start follow-up for leads with some engagement
  if (leadScore < 20) {
    return null;
  }

  // Don't start if conversation is too fresh (less than 5 minutes)
  if (lastMessageAt) {
    const minutesSinceLastMessage = (new Date() - new Date(lastMessageAt)) / (1000 * 60);
    if (minutesSinceLastMessage < 5) {
      return null;
    }
  }

  const sequence = determineFollowUpSequence(flowData, flowData);

  return {
    sequence,
    stageIndex: 0,
    template: FOLLOW_UP_SEQUENCES[sequence]?.stages[0]?.template || null,
  };
}

module.exports = {
  FOLLOW_UP_SEQUENCES,
  FOLLOW_UP_TEMPLATES,
  buildFollowUpMessage,
  buildFollowUpMetadata,
  checkFollowUpNeeded,
  determineFollowUpSequence,
  getNextFollowUpStage,
  shouldSendFollowUp,
};