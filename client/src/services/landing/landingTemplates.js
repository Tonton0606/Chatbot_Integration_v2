import { supabase } from "../../config/supabaseClient";
import { DEFAULT_TEMPLATE } from "./landingTypes";

/**
 * Hermes2 / ExponifyPH
 * Landing Templates Service
 *
 * This service controls admin-defined landing templates and their default
 * service cards. It does not handle workspace/client overrides.
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function normalizeTemplatePayload(payload = {}) {
  return {
    template_key: payload.template_key,
    name: payload.name,
    category: payload.category || "marketing",
    industry_category: payload.industry_category || null,
    description: payload.description || null,
    preview_image_url: payload.preview_image_url || null,
    theme_mode: payload.theme_mode || "dark",
    layout_template: payload.layout_template || "exponify_premium",
    default_payload: payload.default_payload || {},
    status: payload.status || "active",
    order_index: Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0,
    updated_at: new Date().toISOString(),
  };
}

export async function getLandingTemplates({
  status = "active",
  includeInactive = false,
} = {}) {
  let query = supabase
    .from("landing_page_templates")
    .select("*")
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive && status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getTemplateByKey(templateKey = DEFAULT_TEMPLATE) {
  requireValue(templateKey, "templateKey is required.");

  const { data, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("template_key", templateKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTemplateServices(templateKey) {
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

export async function getTemplateBundle(templateKey = DEFAULT_TEMPLATE) {
  const [template, services] = await Promise.all([
    getTemplateByKey(templateKey),
    getTemplateServices(templateKey),
  ]);

  return {
    template,
    services,
  };
}

export async function createTemplate(payload) {
  requireValue(payload?.template_key, "template_key is required.");
  requireValue(payload?.name, "name is required.");

  const cleanPayload = normalizeTemplatePayload(payload);

  const { data, error } = await supabase
    .from("landing_page_templates")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTemplate(id, payload) {
  requireValue(id, "template id is required.");

  const cleanPayload = normalizeTemplatePayload(payload);

  delete cleanPayload.template_key;

  const { data, error } = await supabase
    .from("landing_page_templates")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function duplicateTemplate(templateId) {
  requireValue(templateId, "template id is required.");

  const { data: source, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    throw error;
  }

  const suffix = Date.now();

  return createTemplate({
    ...source,
    id: undefined,
    template_key: `${source.template_key}_copy_${suffix}`,
    name: `${source.name} Copy`,
    status: "draft",
    order_index: Number(source.order_index || 0) + 1,
  });
}

export async function updateTemplateStatus(id, status) {
  requireValue(id, "template id is required.");
  requireValue(status, "status is required.");

  const { data, error } = await supabase
    .from("landing_page_templates")
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

export async function disableTemplate(id) {
  return updateTemplateStatus(id, "disabled");
}

export async function archiveTemplate(id) {
  return updateTemplateStatus(id, "archived");
}

export async function activateTemplate(id) {
  return updateTemplateStatus(id, "active");
}

export async function createTemplateService(payload) {
  requireValue(payload?.template_key, "template_key is required.");
  requireValue(payload?.industry_key, "industry_key is required.");
  requireValue(payload?.service_key, "service_key is required.");
  requireValue(payload?.title, "title is required.");

  const cleanPayload = {
    template_key: payload.template_key,
    industry_key: payload.industry_key,
    service_key: payload.service_key,
    title: payload.title,
    description: payload.description || null,
    default_image_url: payload.default_image_url || null,
    default_background_image_url:
      payload.default_background_image_url || null,
    icon: payload.icon || null,
    cta_label: payload.cta_label || "Book Consultation",
    booking_category: payload.booking_category || payload.service_key,
    booking_fields: payload.booking_fields || [],
    is_required: Boolean(payload.is_required),
    is_default_enabled:
      payload.is_default_enabled === undefined
        ? true
        : Boolean(payload.is_default_enabled),
    client_can_edit:
      payload.client_can_edit === undefined
        ? true
        : Boolean(payload.client_can_edit),
    client_can_hide:
      payload.client_can_hide === undefined
        ? true
        : Boolean(payload.client_can_hide),
    status: payload.status || "active",
    order_index: Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("landing_template_services")
    .upsert(cleanPayload, {
      onConflict: "template_key,service_key",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTemplateService(id, payload) {
  requireValue(id, "template service id is required.");

  const cleanPayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  delete cleanPayload.id;

  const { data, error } = await supabase
    .from("landing_template_services")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTemplateService(id) {
  requireValue(id, "template service id is required.");

  const { error } = await supabase
    .from("landing_template_services")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}
