import { supabase } from "../../config/supabaseClient";

/**
 * Hermes2 / ExponifyPH
 * Landing Service Cards
 *
 * Handles:
 * - Admin default cards
 * - Workspace card copies
 * - Client-created cards
 * - Client edits
 * - Ordering
 * - Enable/disable
 * - Soft archive
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeCardPayload(payload = {}) {
  return {
    workspace_id: payload.workspace_id,
    landing_page_id: payload.landing_page_id,
    section_id: payload.section_id || null,
    template_service_id: payload.template_service_id || null,
    industry_key: payload.industry_key || null,
    service_key: payload.service_key || null,
    title: payload.title || "Untitled",
    description: payload.description || null,
    image_url: payload.image_url || null,
    background_image_url: payload.background_image_url || null,
    icon: payload.icon || null,
    cta_label: payload.cta_label || "Book Consultation",
    booking_category: payload.booking_category || null,
    enabled:
      payload.enabled === undefined
        ? true
        : Boolean(payload.enabled),
    client_modified:
      payload.client_modified === undefined
        ? false
        : Boolean(payload.client_modified),
    order_index: Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0,
    payload: isPlainObject(payload.payload) ? payload.payload : {},
    created_by: payload.created_by || null,
    updated_by: payload.updated_by || null,
    updated_at: new Date().toISOString(),
  };
}

function buildCardUpdatePayload(payload = {}) {
  const update = {};

  if ("section_id" in payload) {
    update.section_id = payload.section_id || null;
  }

  if ("template_service_id" in payload) {
    update.template_service_id = payload.template_service_id || null;
  }

  if ("industry_key" in payload) {
    update.industry_key = payload.industry_key || null;
  }

  if ("service_key" in payload) {
    update.service_key = payload.service_key || null;
  }

  if ("title" in payload) {
    update.title = payload.title || "Untitled";
  }

  if ("description" in payload) {
    update.description = payload.description || null;
  }

  if ("image_url" in payload) {
    update.image_url = payload.image_url || null;
  }

  if ("background_image_url" in payload) {
    update.background_image_url = payload.background_image_url || null;
  }

  if ("icon" in payload) {
    update.icon = payload.icon || null;
  }

  if ("cta_label" in payload) {
    update.cta_label = payload.cta_label || "Book Consultation";
  }

  if ("booking_category" in payload) {
    update.booking_category = payload.booking_category || null;
  }

  if ("enabled" in payload) {
    update.enabled = Boolean(payload.enabled);
  }

  if ("client_modified" in payload) {
    update.client_modified = Boolean(payload.client_modified);
  }

  if ("order_index" in payload) {
    update.order_index = Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0;
  }

  if ("payload" in payload) {
    update.payload = isPlainObject(payload.payload) ? payload.payload : {};
  }

  if ("updated_by" in payload) {
    update.updated_by = payload.updated_by || null;
  }

  update.updated_at = new Date().toISOString();

  return update;
}

function buildClientCreatedPayload(payload = {}) {
  return {
    source: "client_created",
    ...(isPlainObject(payload.payload) ? payload.payload : {}),
  };
}

function isArchived(card) {
  return card?.payload?.archived === true;
}

async function getExistingCardByServiceKey({
  landingPageId,
  sectionId = null,
  serviceKey,
}) {
  if (!serviceKey) {
    return null;
  }

  let query = supabase
    .from("workspace_landing_service_cards")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .eq("service_key", serviceKey);

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  } else {
    query = query.is("section_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/*
---------------------------------------
ADMIN DEFAULTS
---------------------------------------
*/

export async function getTemplateServiceCards(templateKey) {
  requireValue(templateKey, "templateKey is required.");

  const { data, error } = await supabase
    .from("landing_template_services")
    .select("*")
    .eq("template_key", templateKey)
    .eq("status", "active")
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/*
---------------------------------------
WORKSPACE CARDS
---------------------------------------
*/

export async function getWorkspaceCards(
  landingPageId,
  { enabledOnly = false, includeArchived = false } = {}
) {
  requireValue(landingPageId, "landingPageId is required.");

  let query = supabase
    .from("workspace_landing_service_cards")
    .select(
      `
      *,
      template:landing_template_services(*)
    `
    )
    .eq("landing_page_id", landingPageId)
    .order("order_index", { ascending: true });

  if (enabledOnly) {
    query = query.eq("enabled", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const cards = data || [];

  if (includeArchived) {
    return cards;
  }

  return cards.filter((card) => !isArchived(card));
}

export async function createWorkspaceCard(payload) {
  requireValue(payload?.workspace_id, "workspace_id is required.");
  requireValue(payload?.landing_page_id, "landing_page_id is required.");
  requireValue(payload?.title, "title is required.");

  if (payload.service_key) {
    const existingCard = await getExistingCardByServiceKey({
      landingPageId: payload.landing_page_id,
      sectionId: payload.section_id || null,
      serviceKey: payload.service_key,
    });

    if (existingCard && !isArchived(existingCard)) {
      return existingCard;
    }
  }

  const cleanPayload = normalizeCardPayload({
    ...payload,
    client_modified:
      payload.client_modified === undefined
        ? true
        : payload.client_modified,
    payload: payload.template_service_id
      ? payload.payload
      : buildClientCreatedPayload(payload),
  });

  const { data, error } = await supabase
    .from("workspace_landing_service_cards")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateWorkspaceCard(id, payload) {
  requireValue(id, "card id is required.");

  const cleanPayload = buildCardUpdatePayload({
    ...payload,
    client_modified:
      payload.client_modified === undefined
        ? true
        : payload.client_modified,
  });

  const { data, error } = await supabase
    .from("workspace_landing_service_cards")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function reorderCards(cards = []) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return [];
  }

  const results = await Promise.all(
    cards.map((card, index) =>
      supabase
        .from("workspace_landing_service_cards")
        .update({
          order_index: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id)
        .select("*")
        .single()
    )
  );

  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) {
    throw failedResult.error;
  }

  return results.map((result) => result.data);
}

export async function toggleCard(id, enabled) {
  requireValue(id, "card id is required.");

  const { data, error } = await supabase
    .from("workspace_landing_service_cards")
    .update({
      enabled: Boolean(enabled),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveCard(id) {
  requireValue(id, "card id is required.");

  const { data: card, error: loadError } = await supabase
    .from("workspace_landing_service_cards")
    .select("payload")
    .eq("id", id)
    .single();

  if (loadError) {
    throw loadError;
  }

  const payload = {
    ...(card?.payload || {}),
    archived: true,
    archived_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workspace_landing_service_cards")
    .update({
      enabled: false,
      client_modified: true,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCard(id, { hardDelete = false } = {}) {
  requireValue(id, "card id is required.");

  if (!hardDelete) {
    return archiveCard(id);
  }

  const { error } = await supabase
    .from("workspace_landing_service_cards")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

/*
---------------------------------------
CLONE TEMPLATE
---------------------------------------
*/

export async function cloneTemplateCards(workspaceId, landingPageId, templateKey) {
  requireValue(workspaceId, "workspaceId is required.");
  requireValue(landingPageId, "landingPageId is required.");

  if (!templateKey) {
    return [];
  }

  const cards = await getTemplateServiceCards(templateKey);

  if (cards.length === 0) {
    return [];
  }

  const existingCards = await getWorkspaceCards(landingPageId, {
    includeArchived: true,
  });

  const existingServiceKeys = new Set(
    existingCards
      .filter((card) => card.service_key)
      .map((card) => `${card.section_id || "default"}:${card.service_key}`)
  );

  const inserts = cards
    .filter((card) => {
      const key = `${"default"}:${card.service_key}`;
      return !existingServiceKeys.has(key);
    })
    .map((card) => ({
      workspace_id: workspaceId,
      landing_page_id: landingPageId,
      section_id: null,
      template_service_id: card.id,
      industry_key: card.industry_key,
      service_key: card.service_key,
      title: card.title,
      description: card.description,
      image_url: card.default_image_url,
      background_image_url: card.default_background_image_url,
      icon: card.icon,
      cta_label: card.cta_label || "Book Consultation",
      booking_category: card.booking_category || card.service_key,
      enabled: card.is_default_enabled,
      client_modified: false,
      order_index: Number.isFinite(Number(card.order_index))
        ? Number(card.order_index)
        : 0,
      payload: {
        source: "template_service",
        template_key: card.template_key,
      },
      created_by: null,
      updated_by: null,
    }));

  if (inserts.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("workspace_landing_service_cards")
    .insert(inserts)
    .select("*");

  if (error) {
    throw error;
  }

  return data || [];
}
