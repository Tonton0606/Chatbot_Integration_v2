import { supabase } from "../../config/supabaseClient";
import { slugify } from "./utils";
import { DEFAULT_SERVICES } from "./constants";
import { getTemplateServices } from "./templates";

export async function getLandingSections(landingPageId) {
  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .select("*")
    .eq("landing_page_id", landingPageId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function createLandingSection({
  landingPageId,
  templateKey = null,
  sectionType = "custom",
  title = "New Section",
  subtitle = "",
  description = "",
  imageUrl = "",
  payload = {},
  orderIndex = 0,
}) {
  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .insert({
      landing_page_id: landingPageId,
      template_key: templateKey,
      section_type: sectionType,
      title,
      subtitle,
      description,
      image_url: imageUrl,
      payload,
      order_index: orderIndex,
      enabled: true,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function updateLandingSection(sectionId, payload) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const updatePayload = {
    template_key: payload.template_key,
    section_type: payload.section_type,
    title: payload.title,
    subtitle: payload.subtitle,
    description: payload.description,
    image_url: payload.image_url,
    payload: payload.payload,
    order_index: payload.order_index,
    enabled: payload.enabled,
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const { data, error } = await supabase
    .from("workspace_landing_sections")
    .update(updatePayload)
    .eq("id", sectionId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function deleteLandingSection(sectionId) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const { error } = await supabase
    .from("workspace_landing_sections")
    .delete()
    .eq("id", sectionId);

  if (error) throw error;

  return true;
}

async function getLandingPageCore(landingPageId) {
  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("id, workspace_id, template_key, industry_key")
    .eq("id", landingPageId)
    .single();

  if (error) throw error;

  if (!data?.workspace_id) {
    throw new Error("Landing page workspace_id was not found.");
  }

  return data;
}

export async function createSectionFromTemplate({
  landingPageId,
  template,
  orderIndex = 0,
}) {

  if (!landingPageId) {
    throw new Error("Landing page ID is required.");
  }

  if (!template?.template_key && !template?.industry_key) {
    throw new Error("Template is required.");
  }

  const page = await getLandingPageCore(landingPageId);

  const sectionTitle =
    template.name ||
    template.label ||
    template.title ||
    "Service Group";

  const sectionSubtitle =
    template.industry_category ||
    template.category ||
    template.industry_key ||
    "Services";

  const sectionDescription =
    template.description ||
    "Explore available services.";

  const servicesSection = await createLandingSection({
    landingPageId,
    templateKey: template.template_key || template.industry_key,
    sectionType: "services",
    title: sectionTitle,
    subtitle: sectionSubtitle,
    description: sectionDescription,
    imageUrl: template.preview_image_url || "",
    payload: {
      source: "service_template",
      template_key: template.template_key || null,
      industry_key: template.industry_key || null,
      headline: sectionTitle,
      description: sectionDescription,
    },
    orderIndex,
  });

  const templateServices = await getTemplateServices(
    template.template_key,
    template.industry_key
  );


  const servicesToInsert =
    templateServices.length > 0
      ? templateServices
      : DEFAULT_SERVICES.map((service, index) => ({
          id: null,
          industry_key:
            template.industry_key ||
            template.template_key ||
            "general",
          service_key: slugify(service.title),
          title: service.title,
          description: service.description,
          default_image_url: service.image_url || null,
          default_background_image_url: null,
          icon: "Building2",
          cta_label: service.cta_label || "Book Consultation",
          booking_category: slugify(service.title),
          is_default_enabled: true,
          order_index: index + 1,
        }));

  const { data: existingCards, error: cardLookupError } =
    await supabase
      .from("workspace_landing_service_cards")
      .select("service_key, section_id")
      .eq("landing_page_id", landingPageId)
      .eq("section_id", servicesSection.id);

  if (cardLookupError) throw cardLookupError;

  const existingServiceKeys = new Set(
    (existingCards || []).map(
      (card) => `${card.section_id}:${card.service_key}`
    )
  );


  const cardsToInsert = servicesToInsert
    .filter(
      (service) =>
        !existingServiceKeys.has(
          `${servicesSection.id}:${service.service_key}`
        )
    )
    .map((service) => ({
      workspace_id: page.workspace_id,
      landing_page_id: landingPageId,
      section_id: servicesSection.id,
      template_service_id: service.id || null,
      industry_key:
        service.industry_key ||
        template.industry_key ||
        template.industry_category ||
        template.template_key ||
        null,
      service_key: service.service_key,
      title: service.title,
      description: service.description,
      image_url: service.default_image_url || null,
      background_image_url:
        service.default_background_image_url || null,
      icon: service.icon || "Building2",
      cta_label: service.cta_label || "Book Consultation",
      booking_category:
        service.booking_category || service.service_key,
      enabled:
        service.is_default_enabled === undefined
          ? true
          : Boolean(service.is_default_enabled),
      client_modified: false,
      order_index: Number(service.order_index || 0),
      payload: {
        source: service.id ? "template_service" : "fallback_service",
        template_key: template.template_key || null,
        industry_key:
          service.industry_key || template.industry_key || null,
        service_key: service.service_key,
        service_group_id: servicesSection.id,
        service_group_title: sectionTitle,
      },
    }));

  if (!cardsToInsert.length) {
    return servicesSection;
  }

  const { error: insertCardError } = await supabase
    .from("workspace_landing_service_cards")
    .insert(cardsToInsert);


  if (insertCardError) {
    throw insertCardError;
  }

  return servicesSection;
}
