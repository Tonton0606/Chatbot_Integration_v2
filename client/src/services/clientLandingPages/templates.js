import { supabase } from "../../config/supabaseClient";
import { buildTemplateLookupKeys } from "./utils";

export async function getDefaultTemplate() {
  const { data, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function getTemplateServices(
  templateKey,
  industryKey = null
) {
  const keys = buildTemplateLookupKeys(
    templateKey,
    industryKey
  );

  if (!keys.length) {
    return [];
  }

  const { data: byTemplateKey, error: templateError } =
    await supabase
      .from("landing_template_services")
      .select("*")
      .in("template_key", keys)
      .eq("status", "active")
      .order("order_index", { ascending: true });

  if (templateError) {
    throw templateError;
  }

  if (byTemplateKey?.length) {
    return byTemplateKey;
  }

  const { data: byIndustryKey, error: industryError } =
    await supabase
      .from("landing_template_services")
      .select("*")
      .in("industry_key", keys)
      .eq("status", "active")
      .order("order_index", { ascending: true });

  if (industryError) {
    throw industryError;
  }

  return byIndustryKey || [];
}

export async function getDefaultBookingPreset(templateKey) {
  if (!templateKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("landing_booking_presets")
    .select("*")
    .or(`preset_key.eq.${templateKey},industry_key.eq.${templateKey}`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function getLandingPageTemplates() {
  const { data, error } = await supabase
    .from("landing_page_templates")
    .select("*")
    .eq("status", "active")
    .order("order_index", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLandingSectionTypes() {
  const { data, error } = await supabase
    .from("landing_section_types")
    .select("*")
    .eq("status", "active")
    .order("category", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}
