const {
  buildCtaChoiceReply,
  resolveCtaChoice,
} = require("./facebookCtaResolver");

const { getConfirmedLeadData } = require("./facebookLeadConfirmation");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getPageLink(pageConfig = {}) {
  return (
    normalizeText(pageConfig.websiteLink) ||
    normalizeText(pageConfig.website_link) ||
    ""
  );
}

function buildCtaOptionsReply(compactFacebookReply) {
  return compactFacebookReply(
    "What would you prefer next?\n\n1. Demo / consultation\n2. Pricing overview\n3. Human representative"
  );
}

function getSafeConfirmedLeadData(data = {}) {
  const confirmed = getConfirmedLeadData(data);

  if (
    confirmed &&
    typeof confirmed === "object" &&
    Object.keys(confirmed).length
  ) {
    return confirmed;
  }

  return data.crmConfirmed === true ? data : {};
}

function normalizeConfirmedFlowData(data = {}) {
  const confirmedLeadData = getSafeConfirmedLeadData(data);

  return {
    ...(data || {}),
    crmConfirmed: true,
    confirmedLeadData,
    pendingLeadData: {},
    awaitingField: "",
  };
}

function buildLeadSummary(data = {}) {
  const confirmed = getSafeConfirmedLeadData(data);

  return [
    confirmed.customerName ? `Name: ${confirmed.customerName}` : "",
    confirmed.phone ? `Phone: ${confirmed.phone}` : "",
    confirmed.email ? `Email: ${confirmed.email}` : "",
    confirmed.businessType ? `Business/Need: ${confirmed.businessType}` : "",
    confirmed.productOrServiceWanted
      ? `Interest: ${confirmed.productOrServiceWanted}`
      : "",
    confirmed.problemEncountered
      ? `Concern: ${confirmed.problemEncountered}`
      : "",
    confirmed.desiredSolution
      ? `Desired result: ${confirmed.desiredSolution}`
      : "",
    confirmed.dailyVolume ? `Volume: ${confirmed.dailyVolume}` : "",
    confirmed.preferredSchedule
      ? `Preferred schedule: ${confirmed.preferredSchedule}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHumanHandoffReply({
  data = {},
  pageConfig = {},
  compactFacebookReply,
}) {
  const summary = buildLeadSummary(data);
  const link = getPageLink(pageConfig);

  const customHandoffMessage = normalizeText(pageConfig.handoffMessage);

  if (customHandoffMessage) {
    return compactFacebookReply(
      [
        customHandoffMessage,
        summary ? `Here are the details I already have:\n${summary}` : "",
        link ? `You may also reach us here:\n${link}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  }

  return compactFacebookReply(
    [
      "Sure po. I saved your details and marked this conversation for human assistance.",
      summary ? `Here are the details I already have:\n${summary}` : "",
      link ? `You may also reach us here:\n${link}` : "",
      "A team member will review this conversation and assist you as soon as possible.",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function buildDemoScheduleCapturedReply({
  data = {},
  pageConfig = {},
  compactFacebookReply,
}) {
  const confirmed = getSafeConfirmedLeadData(data);
  const schedule = normalizeText(confirmed.preferredSchedule);
  const link = getPageLink(pageConfig);

  return compactFacebookReply(
    [
      "Thank you po. I saved your details and noted your preferred demo/consultation schedule.",
      schedule ? `Preferred schedule: ${schedule}` : "",
      link ? `You can also view more details here:\n${link}` : "",
      "A team member will review your request and contact you for confirmation.",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function appendConfirmedField(data = {}, patch = {}) {
  const confirmed = getSafeConfirmedLeadData(data);
  const nextConfirmed = { ...confirmed };

  Object.entries(patch || {}).forEach(([key, value]) => {
    const cleanValue = normalizeText(value);

    if (cleanValue) {
      nextConfirmed[key] = cleanValue;
    }
  });

  return normalizeConfirmedFlowData({
    ...(data || {}),
    confirmedLeadData: nextConfirmed,
  });
}

function handleDemoSchedule({
  incomingText,
  data = {},
  pageConfig = {},
  flowStateService,
  pageId,
  senderId,
  compactFacebookReply,
}) {
  const nextData = appendConfirmedField(data, {
    preferredSchedule: incomingText,
    ctaChoice: "demo",
  });

  return {
    handled: true,
    flowState: flowStateService.setFlowState(pageId, senderId, {
      stage: "demo_schedule_received",
      data: nextData,
    }),
    reply: buildDemoScheduleCapturedReply({
      data: nextData,
      pageConfig,
      compactFacebookReply,
    }),
  };
}

function handleHumanHandoff({
  data = {},
  pageConfig = {},
  flowStateService,
  pageId,
  senderId,
  compactFacebookReply,
}) {
  const nextData = normalizeConfirmedFlowData({
    ...(data || {}),
    requestedHuman: true,
    ctaChoice: "human",
  });

  return {
    handled: true,
    flowState: flowStateService.setFlowState(pageId, senderId, {
      stage: "human_handoff",
      data: nextData,
    }),
    reply: buildHumanHandoffReply({
      data: nextData,
      pageConfig,
      compactFacebookReply,
    }),
  };
}

function handlePostConfirmationFlow({
  incomingText,
  data = {},
  stateStage = "",
  pageConfig = {},
  flowStateService,
  pageId,
  senderId,
  compactFacebookReply,
}) {
  const confirmedData = normalizeConfirmedFlowData(data);

  if (stateStage === "awaiting_demo_schedule") {
    return handleDemoSchedule({
      incomingText,
      data: confirmedData,
      pageConfig,
      flowStateService,
      pageId,
      senderId,
      compactFacebookReply,
    });
  }

  if (stateStage === "human_handoff") {
    return handleHumanHandoff({
      data: confirmedData,
      pageConfig,
      flowStateService,
      pageId,
      senderId,
      compactFacebookReply,
    });
  }

  const choice = resolveCtaChoice(incomingText);

  if (!choice || choice === "needs_choice") {
    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "awaiting_cta_choice",
        data: confirmedData,
      }),
      reply: buildCtaOptionsReply(compactFacebookReply),
    };
  }

  if (choice === "human") {
    return handleHumanHandoff({
      data: confirmedData,
      pageConfig,
      flowStateService,
      pageId,
      senderId,
      compactFacebookReply,
    });
  }

  const next = buildCtaChoiceReply({
    choice,
    data: confirmedData,
    compactFacebookReply,
  });

  return {
    handled: true,
    flowState: flowStateService.setFlowState(pageId, senderId, {
      stage: next.stage,
      data: normalizeConfirmedFlowData({
        ...(next.data || confirmedData),
        ctaChoice: choice,
      }),
    }),
    reply: next.reply,
  };
}

module.exports = {
  buildCtaOptionsReply,
  buildDemoScheduleCapturedReply,
  buildHumanHandoffReply,
  buildLeadSummary,
  handlePostConfirmationFlow,
  normalizeConfirmedFlowData,
};
