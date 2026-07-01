/**
 * Deal lifecycle hooks — fire side effects when deal status changes.
 *
 * deal.won  → commission event (commissionService.onDealWon)
 * deal.lost → enroll contact in re-nurture email campaign
 */

const { supabase } = require("../../config/supabase");
const logger = require("../../config/logger");
const { onDealWon } = require("../commissions/commissionService");

async function handleDealWon({ deal, workspaceId }) {
  if (!deal.assigned_to || !deal.value) return;
  try {
    await onDealWon({
      dealId:      deal.id,
      repId:       deal.assigned_to,
      dealAmount:  Number(deal.value),
      workspaceId,
    });
  } catch (err) {
    logger.warn({ err, dealId: deal.id }, "dealHooks: commission event failed (non-fatal)");
  }
}

async function handleDealLost({ deal, workspaceId }) {
  if (!deal.contact_email && !deal.contact_id) return;

  try {
    // Resolve contact email
    let email = deal.contact_email || null;
    let contactName = deal.contact_name || null;

    if (!email && deal.contact_id) {
      const { data: contact } = await supabase
        .from("customers")
        .select("email, name")
        .eq("id", deal.contact_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (contact) { email = contact.email; contactName = contact.name; }
    }

    if (!email) {
      logger.info({ dealId: deal.id }, "dealHooks: no email for lost deal — skipping re-nurture");
      return;
    }

    // Find the workspace's active re-nurture campaign (tagged 'renurture')
    const { data: campaign } = await supabase
      .from("email_campaigns")
      .select("id, recipient_list")
      .eq("workspace_id", workspaceId)
      .eq("status", "draft")
      .ilike("name", "%nurture%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (campaign) {
      // Add contact to recipient_list (deduplicated)
      const existing = campaign.recipient_list || [];
      if (!existing.includes(email)) {
        await supabase
          .from("email_campaigns")
          .update({ recipient_list: [...existing, email], recipient_count: existing.length + 1 })
          .eq("id", campaign.id);
        logger.info({ dealId: deal.id, campaignId: campaign.id, email }, "dealHooks: contact enrolled in re-nurture campaign");
      }
    } else {
      // No existing re-nurture campaign — create a workflow trigger instead
      await supabase.from("workflow_triggers").insert({
        workspace_id: workspaceId,
        trigger_type: "deal_lost_renurture",
        payload: {
          deal_id:      deal.id,
          email,
          contact_name: contactName,
          lost_at:      new Date().toISOString(),
          deal_title:   deal.title,
          deal_value:   deal.value,
        },
        status: "pending",
      }).then(({ error }) => {
        if (error) logger.warn({ err: error }, "dealHooks: workflow_trigger insert failed");
        else logger.info({ dealId: deal.id, email }, "dealHooks: re-nurture workflow trigger queued");
      });
    }
  } catch (err) {
    logger.warn({ err, dealId: deal.id }, "dealHooks: re-nurture enroll failed (non-fatal)");
  }
}

/**
 * Route all deal status transitions to the appropriate hook.
 * Call this after any deal status update.
 */
async function onDealStatusChanged({ deal, previousStatus, workspaceId }) {
  const newStatus = deal.status;
  if (newStatus === previousStatus) return;

  if (newStatus === "closed_won") {
    await handleDealWon({ deal, workspaceId });
  } else if (newStatus === "closed_lost") {
    await handleDealLost({ deal, workspaceId });
  }
}

module.exports = { onDealStatusChanged };
