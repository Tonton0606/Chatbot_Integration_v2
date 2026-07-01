const logger = require('../../config/logger');
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const ADMIN_FACEBOOK_PAGE_IDS = new Set(["1042482222282366"]);
const ADMIN_FACEBOOK_PAGE_NAMES = new Set(["exponifyph", "exponify"]);

function inferLeadStageFromIntent(intent) {
  if (intent === "demo_request") return "qualified";
  if (intent === "human_request") return "qualified";
  if (intent === "pricing_inquiry") return "contacted";
  if (intent === "automation_interest") return "contacted";
  if (intent === "crm_interest") return "contacted";
  return "new";
}

function getLeadProbabilityFromStatus(status) {
  if (status === "qualified") return 60;
  if (status === "contacted") return 30;
  if (status === "converted") return 100;
  if (status === "lost") return 0;
  return 10;
}

function isAdminFacebookPage(pageConfig = {}) {
  const pageId = normalizeText(pageConfig.pageId || pageConfig.page_id);
  const pageName = normalizeText(
    pageConfig.pageName || pageConfig.fbName || pageConfig.fb_name
  ).toLowerCase();

  return (
    ADMIN_FACEBOOK_PAGE_IDS.has(pageId) ||
    ADMIN_FACEBOOK_PAGE_NAMES.has(pageName)
  );
}

function getConfirmedLeadData(flowState = {}) {
  const data = flowState?.data || {};

  if (
    data.confirmedLeadData &&
    typeof data.confirmedLeadData === "object" &&
    Object.keys(data.confirmedLeadData).length > 0
  ) {
    return data.confirmedLeadData;
  }

  return data.crmConfirmed === true ? data : {};
}

function buildFacebookLeadNotes({
  incomingText,
  intentResult,
  pageConfig,
  flowState,
  pageIntelligence,
}) {
  const pageName = pageConfig?.pageName || "Facebook Page";
  const pageBusinessType = pageConfig?.businessType || "";
  const productServices = pageConfig?.productServices || "";
  const data = getConfirmedLeadData(flowState);
  const crmSignals = pageIntelligence?.crmSignals || {};

  return [
    "Source: Facebook Messenger",
    `Page: ${pageName}`,
    `Detected intent: ${intentResult.intent}`,
    `Intent confidence: ${intentResult.confidence}`,
    pageBusinessType ? `Page business type: ${pageBusinessType}` : "",
    productServices ? `Configured products/services: ${productServices}` : "",
    pageIntelligence?.pageType ? `AI page type: ${pageIntelligence.pageType}` : "",
    pageIntelligence?.offeringType
      ? `AI offering type: ${pageIntelligence.offeringType}`
      : "",
    pageIntelligence?.customerGoal
      ? `AI customer goal: ${pageIntelligence.customerGoal}`
      : "",
    data.businessType ? `Lead business type: ${data.businessType}` : "",
    data.businessModel ? `Business model: ${data.businessModel}` : "",
    data.productOrServiceWanted
      ? `Product/service wanted: ${data.productOrServiceWanted}`
      : "",
    data.problemEncountered ? `Problem encountered: ${data.problemEncountered}` : "",
    data.desiredSolution ? `Desired solution: ${data.desiredSolution}` : "",
    data.inquirySource ? `Inquiry/source channel: ${data.inquirySource}` : "",
    data.dailyVolume
      ? `Estimated daily inquiries/orders: ${data.dailyVolume}`
      : "",
    data.customerName ? `Customer name: ${data.customerName}` : "",
    data.phone ? `Phone: ${data.phone}` : "",
    data.email ? `Email: ${data.email}` : "",
    data.location ? `Location: ${data.location}` : "",
    data.budgetOrQuantity ? `Budget/quantity: ${data.budgetOrQuantity}` : "",
    data.preferredSchedule ? `Preferred schedule: ${data.preferredSchedule}` : "",
    data.urgency ? `Urgency: ${data.urgency}` : "",
    flowState?.data?.ctaChoice ? `CTA choice: ${flowState.data.ctaChoice}` : "",
    crmSignals.leadType ? `CRM lead type: ${crmSignals.leadType}` : "",
    crmSignals.priority ? `CRM priority: ${crmSignals.priority}` : "",
    crmSignals.productInterest
      ? `CRM product interest: ${crmSignals.productInterest}`
      : "",
    crmSignals.serviceInterest
      ? `CRM service interest: ${crmSignals.serviceInterest}`
      : "",
    crmSignals.problem ? `CRM problem: ${crmSignals.problem}` : "",
    crmSignals.suggestedAction
      ? `Suggested action: ${crmSignals.suggestedAction}`
      : "",
    `Latest message: ${incomingText}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findWorkspaceOwnerId({ supabaseClient, workspaceId }) {
  if (!supabaseClient || !workspaceId) return null;

  const { data, error } = await supabaseClient
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({
      workspaceId,
      message: error.message,
    }, "Failed to find workspace member for Facebook lead");
    return null;
  }

  return data?.user_id || null;
}

async function findAdminOwnerId({ supabaseClient }) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .in("role", ["Admin", "SuperAdmin", "admin", "superadmin", "super_admin"])
    .order("full_name", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({
      message: error.message,
    }, "Failed to find admin owner for Facebook lead");
    return null;
  }

  return data?.id || null;
}

async function searchClientFacebookContact({
  supabaseClient,
  workspaceId,
  fallbackName,
  fullName,
}) {
  let query = supabaseClient
    .from("client_contacts")
    .select("id, workspace_id, full_name, source, status")
    .eq("workspace_id", workspaceId)
    .eq("source", "facebook")
    .limit(1);

  if (fullName && fullName !== fallbackName) {
    query = query.or(`full_name.eq.${fallbackName},full_name.eq.${fullName}`);
  } else {
    query = query.eq("full_name", fallbackName);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    logger.error({
      workspaceId,
      fallbackName,
      fullName,
      message: error.message,
    }, "Failed to search client Facebook contact");
  }

  return data || null;
}

async function updateClientFacebookContact({
  supabaseClient,
  workspaceId,
  contactId,
  fullName,
  email,
  phone,
}) {
  const { data, error } = await supabaseClient
    .from("client_contacts")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      status: "lead",
    })
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .select("id, workspace_id, full_name, source, status")
    .single();

  if (error) {
    logger.error({
      workspaceId,
      contactId,
      message: error.message,
    }, "Failed to update client Facebook contact");
    return null;
  }

  return data;
}

async function findOrCreateClientFacebookContact({
  supabaseClient,
  workspaceId,
  senderId,
  flowState,
}) {
  if (!supabaseClient || !workspaceId || !senderId) return null;

  const psid = String(senderId).trim();
  const confirmed = getConfirmedLeadData(flowState);
  const fallbackName = `Facebook User ${psid.slice(-6)}`;
  const fullName = normalizeText(confirmed.customerName) || fallbackName;
  const email = normalizeText(confirmed.email);
  const phone = normalizeText(confirmed.phone);

  const existing = await searchClientFacebookContact({
    supabaseClient,
    workspaceId,
    fallbackName,
    fullName,
  });

  if (existing?.id) {
    const shouldUpdate =
      fullName !== existing.full_name ||
      email ||
      phone ||
      existing.status !== "lead";

    if (shouldUpdate) {
      const updated = await updateClientFacebookContact({
        supabaseClient,
        workspaceId,
        contactId: existing.id,
        fullName,
        email,
        phone,
      });

      return updated || existing;
    }

    return existing;
  }

  const createdBy = await findWorkspaceOwnerId({ supabaseClient, workspaceId });

  const { data: created, error } = await supabaseClient
    .from("client_contacts")
    .insert({
      workspace_id: workspaceId,
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      source: "facebook",
      status: "lead",
      created_by: createdBy,
    })
    .select("id, workspace_id, full_name, source, status")
    .single();

  if (error) {
    logger.error({
      workspaceId,
      psid,
      message: error.message,
    }, "Failed to create client Facebook contact");
    return null;
  }

  return created;
}

async function searchAdminFacebookContact({
  supabaseClient,
  fallbackName,
  fullName,
}) {
  let query = supabaseClient
    .from("contacts")
    .select("id, full_name, email, phone, company_name, source, status")
    .eq("source", "facebook")
    .limit(1);

  if (fullName && fullName !== fallbackName) {
    query = query.or(`full_name.eq.${fallbackName},full_name.eq.${fullName}`);
  } else {
    query = query.eq("full_name", fallbackName);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    logger.error({
      fallbackName,
      fullName,
      message: error.message,
    }, "Failed to search admin Facebook contact");
  }

  return data || null;
}

async function updateAdminFacebookContact({
  supabaseClient,
  contactId,
  fullName,
  email,
  phone,
  companyName,
  assignedAdminId,
}) {
  const { data, error } = await supabaseClient
    .from("contacts")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      company_name: companyName || null,
      source: "facebook",
      status: "lead",
      assigned_admin_id: assignedAdminId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("id, full_name, email, phone, company_name, source, status")
    .single();

  if (error) {
    logger.error({
      contactId,
      message: error.message,
    }, "Failed to update admin Facebook contact");
    return null;
  }

  return data;
}

async function findOrCreateAdminFacebookContact({
  supabaseClient,
  senderId,
  flowState,
}) {
  if (!supabaseClient || !senderId) return null;

  const psid = String(senderId).trim();
  const confirmed = getConfirmedLeadData(flowState);
  const fallbackName = `Facebook User ${psid.slice(-6)}`;
  const fullName = normalizeText(confirmed.customerName) || fallbackName;
  const email = normalizeText(confirmed.email);
  const phone = normalizeText(confirmed.phone);
  const companyName =
    normalizeText(confirmed.companyName) ||
    normalizeText(confirmed.company_name) ||
    normalizeText(confirmed.businessType) ||
    null;

  const assignedAdminId = await findAdminOwnerId({ supabaseClient });

  const existing = await searchAdminFacebookContact({
    supabaseClient,
    fallbackName,
    fullName,
  });

  if (existing?.id) {
    const shouldUpdate =
      fullName !== existing.full_name ||
      email ||
      phone ||
      companyName ||
      existing.status !== "lead";

    if (shouldUpdate) {
      const updated = await updateAdminFacebookContact({
        supabaseClient,
        contactId: existing.id,
        fullName,
        email,
        phone,
        companyName,
        assignedAdminId,
      });

      return updated || existing;
    }

    return existing;
  }

  const { data: created, error } = await supabaseClient
    .from("contacts")
    .insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      company_name: companyName,
      source: "facebook",
      status: "lead",
      assigned_admin_id: assignedAdminId,
    })
    .select("id, full_name, email, phone, company_name, source, status")
    .single();

  if (error) {
    logger.error({
      psid,
      message: error.message,
    }, "Failed to create admin Facebook contact");
    return null;
  }

  return created;
}

async function syncClientFacebookLead({
  supabaseClient,
  pageConfig,
  senderId,
  incomingText,
  intentResult,
  flowState,
  pageIntelligence,
}) {
  const workspaceId = normalizeText(pageConfig?.connectedWorkspaceId);
  const confirmed = getConfirmedLeadData(flowState);

  if (!workspaceId) return null;

  const contact = await findOrCreateClientFacebookContact({
    supabaseClient,
    workspaceId,
    senderId,
    flowState,
  });

  if (!contact?.id) return null;

  const status = inferLeadStageFromIntent(intentResult.intent);
  const notes = buildFacebookLeadNotes({
    incomingText,
    intentResult,
    pageConfig,
    flowState,
    pageIntelligence,
  });

  const createdBy = await findWorkspaceOwnerId({ supabaseClient, workspaceId });

  const titleBase =
    normalizeText(confirmed.productOrServiceWanted) ||
    normalizeText(confirmed.desiredSolution) ||
    normalizeText(confirmed.problemEncountered) ||
    "Facebook inquiry";

  const title = `${titleBase} - ${contact.full_name || senderId}`;
  const probability = getLeadProbabilityFromStatus(status);

  const { data: existingLead, error: existingLeadError } = await supabaseClient
    .from("client_leads")
    .select("id, workspace_id, contact_id, title, status, notes")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contact.id)
    .eq("source", "facebook")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingLeadError) {
    logger.error({
      workspaceId,
      contactId: contact.id,
      message: existingLeadError.message,
    }, "Failed to search client Facebook lead");
  }

  if (existingLead?.id) {
    const nextNotes = [existingLead.notes, notes]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const { data: updated, error } = await supabaseClient
      .from("client_leads")
      .update({
        title,
        status,
        notes: nextNotes,
        probability,
      })
      .eq("id", existingLead.id)
      .eq("workspace_id", workspaceId)
      .select("id, workspace_id, contact_id, title, status")
      .single();

    if (error) {
      logger.error({
        workspaceId,
        leadId: existingLead.id,
        message: error.message,
      }, "Failed to update client Facebook lead");
      return existingLead;
    }

    return updated;
  }

  const { data: created, error } = await supabaseClient
    .from("client_leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      title,
      source: "facebook",
      status,
      notes,
      estimated_value: 0,
      probability,
      created_by: createdBy,
      assignment_type: "self",
      assigned_user_id: createdBy,
      archived_at: null,
      archived_by: null,
    })
    .select("id, workspace_id, contact_id, title, status")
    .single();

  if (error) {
    logger.error({
      workspaceId,
      contactId: contact.id,
      message: error.message,
    }, "Failed to create client Facebook lead");
    return null;
  }

  return created;
}

async function syncAdminFacebookLead({
  supabaseClient,
  pageConfig,
  senderId,
  incomingText,
  intentResult,
  flowState,
  pageIntelligence,
}) {
  const confirmed = getConfirmedLeadData(flowState);

  const contact = await findOrCreateAdminFacebookContact({
    supabaseClient,
    senderId,
    flowState,
  });

  if (!contact?.id) return null;

  const status = inferLeadStageFromIntent(intentResult.intent);
  const notes = buildFacebookLeadNotes({
    incomingText,
    intentResult,
    pageConfig,
    flowState,
    pageIntelligence,
  });

  const assignedAdminId = await findAdminOwnerId({ supabaseClient });

  const titleBase =
    normalizeText(confirmed.productOrServiceWanted) ||
    normalizeText(confirmed.desiredSolution) ||
    normalizeText(confirmed.problemEncountered) ||
    "Facebook inquiry";

  const title = `${titleBase} - ${contact.full_name || senderId}`;

  const { data: existingLead, error: existingLeadError } = await supabaseClient
    .from("crm_leads")
    .select("id, contact_id, title, status, notes")
    .eq("contact_id", contact.id)
    .eq("source", "facebook")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingLeadError) {
    logger.error({
      contactId: contact.id,
      message: existingLeadError.message,
    }, "Failed to search admin Facebook lead");
  }

  if (existingLead?.id) {
    const nextNotes = [existingLead.notes, notes]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const { data: updated, error } = await supabaseClient
      .from("crm_leads")
      .update({
        title,
        status,
        notes: nextNotes,
        assigned_admin_id: assignedAdminId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLead.id)
      .select("id, contact_id, title, status")
      .single();

    if (error) {
      logger.error({
        leadId: existingLead.id,
        message: error.message,
      }, "Failed to update admin Facebook lead");
      return existingLead;
    }

    return updated;
  }

  const { data: created, error } = await supabaseClient
    .from("crm_leads")
    .insert({
      contact_id: contact.id,
      title,
      source: "facebook",
      status,
      assigned_admin_id: assignedAdminId || null,
      notes,
    })
    .select("id, contact_id, title, status")
    .single();

  if (error) {
    logger.error({
      contactId: contact.id,
      message: error.message,
    }, "Failed to create admin Facebook lead");
    return null;
  }

  return created;
}

async function syncFacebookLead({
  supabaseClient,
  pageConfig,
  senderId,
  incomingText,
  intentResult,
  flowState,
  pageIntelligence,
}) {
  const workspaceId = normalizeText(pageConfig?.connectedWorkspaceId);
  const confirmed = getConfirmedLeadData(flowState);

  if (
    !supabaseClient ||
    !senderId ||
    flowState?.data?.crmConfirmed !== true ||
    Object.keys(confirmed).length === 0
  ) {
    return null;
  }

  if (isAdminFacebookPage(pageConfig)) {
    return syncAdminFacebookLead({
      supabaseClient,
      pageConfig,
      senderId,
      incomingText,
      intentResult,
      flowState,
      pageIntelligence,
    });
  }

  if (!workspaceId) return null;

  return syncClientFacebookLead({
    supabaseClient,
    pageConfig,
    senderId,
    incomingText,
    intentResult,
    flowState,
    pageIntelligence,
  });
}

module.exports = {
  buildFacebookLeadNotes,
  findOrCreateFacebookContact: findOrCreateClientFacebookContact,
  findWorkspaceOwnerId,
  getLeadProbabilityFromStatus,
  inferLeadStageFromIntent,
  isAdminFacebookPage,
  syncFacebookLead,
};
