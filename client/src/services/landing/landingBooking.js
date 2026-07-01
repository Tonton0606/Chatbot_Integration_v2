import { supabase } from "../../config/supabaseClient";
import {
  DEFAULT_APPROVAL_MODE,
  DEFAULT_BOOKING_PROVIDER,
} from "./landingTypes";

/**
 * Hermes2 / ExponifyPH
 * Landing Booking Service
 *
 * Handles:
 * - Admin booking presets
 * - Workspace booking mappings
 * - Landing booking bridge configuration
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function normalizeBookingPresetPayload(payload = {}) {
  return {
    preset_key: payload.preset_key,
    name: payload.name,
    industry_key: payload.industry_key || null,
    description: payload.description || null,
    fields: Array.isArray(payload.fields) ? payload.fields : [],
    meeting_type: payload.meeting_type || DEFAULT_BOOKING_PROVIDER,
    approval_mode: payload.approval_mode || DEFAULT_APPROVAL_MODE,
    auto_create_lead:
      payload.auto_create_lead === undefined
        ? true
        : Boolean(payload.auto_create_lead),
    auto_create_contact:
      payload.auto_create_contact === undefined
        ? true
        : Boolean(payload.auto_create_contact),
    auto_create_booking:
      payload.auto_create_booking === undefined
        ? true
        : Boolean(payload.auto_create_booking),
    status: payload.status || "active",
    updated_at: new Date().toISOString(),
  };
}

function normalizeBookingMappingPayload(payload = {}) {
  return {
    workspace_id: payload.workspace_id,
    landing_page_id: payload.landing_page_id || null,
    booking_preset_id: payload.booking_preset_id || null,
    service_card_id: payload.service_card_id || null,
    create_lead:
      payload.create_lead === undefined
        ? true
        : Boolean(payload.create_lead),
    create_contact:
      payload.create_contact === undefined
        ? true
        : Boolean(payload.create_contact),
    create_booking:
      payload.create_booking === undefined
        ? true
        : Boolean(payload.create_booking),
    create_calendar_event:
      payload.create_calendar_event === undefined
        ? false
        : Boolean(payload.create_calendar_event),
    meeting_provider: payload.meeting_provider || DEFAULT_BOOKING_PROVIDER,
    approval_mode: payload.approval_mode || DEFAULT_APPROVAL_MODE,
    crm_pipeline_stage: payload.crm_pipeline_stage || null,
    assigned_owner: payload.assigned_owner || null,
    status: payload.status || "active",
    updated_at: new Date().toISOString(),
  };
}

function buildBookingPresetUpdatePayload(payload = {}) {
  const update = {};

  if ("name" in payload) {
    update.name = payload.name;
  }

  if ("industry_key" in payload) {
    update.industry_key = payload.industry_key || null;
  }

  if ("description" in payload) {
    update.description = payload.description || null;
  }

  if ("fields" in payload) {
    update.fields = Array.isArray(payload.fields) ? payload.fields : [];
  }

  if ("meeting_type" in payload) {
    update.meeting_type = payload.meeting_type || DEFAULT_BOOKING_PROVIDER;
  }

  if ("approval_mode" in payload) {
    update.approval_mode = payload.approval_mode || DEFAULT_APPROVAL_MODE;
  }

  if ("auto_create_lead" in payload) {
    update.auto_create_lead = Boolean(payload.auto_create_lead);
  }

  if ("auto_create_contact" in payload) {
    update.auto_create_contact = Boolean(payload.auto_create_contact);
  }

  if ("auto_create_booking" in payload) {
    update.auto_create_booking = Boolean(payload.auto_create_booking);
  }

  if ("status" in payload) {
    update.status = payload.status || "active";
  }

  update.updated_at = new Date().toISOString();

  return update;
}

function buildBookingMappingUpdatePayload(payload = {}) {
  const update = {};

  if ("landing_page_id" in payload) {
    update.landing_page_id = payload.landing_page_id || null;
  }

  if ("booking_preset_id" in payload) {
    update.booking_preset_id = payload.booking_preset_id || null;
  }

  if ("service_card_id" in payload) {
    update.service_card_id = payload.service_card_id || null;
  }

  if ("create_lead" in payload) {
    update.create_lead = Boolean(payload.create_lead);
  }

  if ("create_contact" in payload) {
    update.create_contact = Boolean(payload.create_contact);
  }

  if ("create_booking" in payload) {
    update.create_booking = Boolean(payload.create_booking);
  }

  if ("create_calendar_event" in payload) {
    update.create_calendar_event = Boolean(payload.create_calendar_event);
  }

  if ("meeting_provider" in payload) {
    update.meeting_provider = payload.meeting_provider || DEFAULT_BOOKING_PROVIDER;
  }

  if ("approval_mode" in payload) {
    update.approval_mode = payload.approval_mode || DEFAULT_APPROVAL_MODE;
  }

  if ("crm_pipeline_stage" in payload) {
    update.crm_pipeline_stage = payload.crm_pipeline_stage || null;
  }

  if ("assigned_owner" in payload) {
    update.assigned_owner = payload.assigned_owner || null;
  }

  if ("status" in payload) {
    update.status = payload.status || "active";
  }

  update.updated_at = new Date().toISOString();

  return update;
}

/**
 * Updated getExistingBookingMapping() with duplicate-safe selection
 */
async function getExistingBookingMapping({
  workspaceId,
  landingPageId = null,
  serviceCardId = null,
}) {
  requireValue(workspaceId, "workspaceId is required.");

  let query = supabase
    .from("landing_booking_mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (landingPageId) {
    query = query.eq("landing_page_id", landingPageId);
  } else {
    query = query.is("landing_page_id", null);
  }

  if (serviceCardId) {
    query = query.eq("service_card_id", serviceCardId);
  } else {
    query = query.is("service_card_id", null);
  }

  // Duplicate-safe: order newest first, limit 1
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

export async function getBookingPresets({
  status = "active",
  industryKey = null,
  includeInactive = false,
} = {}) {
  let query = supabase
    .from("landing_booking_presets")
    .select("*")
    .order("name", { ascending: true });

  if (!includeInactive && status) {
    query = query.eq("status", status);
  }

  if (industryKey) {
    query = query.eq("industry_key", industryKey);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getBookingPresetByKey(presetKey) {
  requireValue(presetKey, "presetKey is required.");

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .select("*")
    .eq("preset_key", presetKey)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getDefaultBookingPresetForIndustry(industryKey) {
  if (!industryKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .select("*")
    .eq("industry_key", industryKey)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBookingPreset(payload) {
  requireValue(payload?.preset_key, "preset_key is required.");
  requireValue(payload?.name, "name is required.");

  const cleanPayload = normalizeBookingPresetPayload(payload);

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBookingPreset(id, payload) {
  requireValue(id, "booking preset id is required.");

  const cleanPayload = buildBookingPresetUpdatePayload(payload);

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBookingPresetStatus(id, status) {
  requireValue(id, "booking preset id is required.");
  requireValue(status, "status is required.");

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .update({
      status,
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

export async function getLandingBookingMappings(landingPageId) {
  requireValue(landingPageId, "landingPageId is required.");

  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .select(
      `
      *,
      preset:landing_booking_presets(*),
      service_card:workspace_landing_service_cards(*)
    `
    )
    .eq("landing_page_id", landingPageId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getServiceBookingMapping(serviceCardId) {
  requireValue(serviceCardId, "serviceCardId is required.");

  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .select(
      `
      *,
      preset:landing_booking_presets(*),
      service_card:workspace_landing_service_cards(*)
    `
    )
    .eq("service_card_id", serviceCardId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBookingMapping(payload) {
  requireValue(payload?.workspace_id, "workspace_id is required.");

  const existingMapping = await getExistingBookingMapping({
    workspaceId: payload.workspace_id,
    landingPageId: payload.landing_page_id || null,
    serviceCardId: payload.service_card_id || null,
  });

  if (existingMapping) {
    return existingMapping;
  }

  const cleanPayload = normalizeBookingMappingPayload(payload);

  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBookingMapping(id, payload) {
  requireValue(id, "booking mapping id is required.");

  const cleanPayload = buildBookingMappingUpdatePayload(payload);

  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function disableBookingMapping(id) {
  requireValue(id, "booking mapping id is required.");

  const { data, error } = await supabase
    .from("landing_booking_mappings")
    .update({
      status: "disabled",
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

export function buildBookingFieldsFromPreset(preset) {
  if (!preset?.fields) {
    return [];
  }

  return Array.isArray(preset.fields) ? preset.fields : [];
}
