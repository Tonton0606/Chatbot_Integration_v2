import { supabase } from "../../config/supabaseClient";

import {
  DEFAULT_CORE_SECTIONS,
  DEFAULT_SERVICES,
} from "./constants";

import {
  getLandingSections,
} from "./sections";

import {
  getTemplateServices,
  getDefaultBookingPreset,
} from "./templates";

import {
  slugify,
} from "./utils";

export async function ensureDefaultSections(
  landingPageId
) {
  const existingSections =
    await getLandingSections(landingPageId);

  const existingTypes = new Set(
    existingSections.map(
      (section) => section.section_type
    )
  );

  const missingSections =
    DEFAULT_CORE_SECTIONS.filter(
      (section) =>
        !existingTypes.has(
          section.section_type
        )
    );

  if (!missingSections.length) {
    return existingSections;
  }

  const inserts = missingSections.map(
    (section) => ({
      landing_page_id: landingPageId,
      template_key: null,
      section_type: section.section_type,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      image_url: "",
      payload: section.payload,
      order_index: section.order_index,
      enabled: true,
    })
  );

  const { error } = await supabase
    .from("workspace_landing_sections")
    .insert(inserts);

  if (error) {
    const duplicateError =
      error.code === "23505" ||
      String(error.message || "").includes(
        "duplicate key"
      );

    if (!duplicateError) {
      throw error;
    }
  }

  return getLandingSections(
    landingPageId
  );
}

export async function ensureDefaultServiceCards({
  workspaceId,
  landingPageId,
  templateKey,
}) {
  const {
    data: existingCards,
    error: existingError,
  } = await supabase
    .from(
      "workspace_landing_service_cards"
    )
    .select("id")
    .eq(
      "landing_page_id",
      landingPageId
    )
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingCards?.length) {
    return;
  }

  const sections =
    await getLandingSections(
      landingPageId
    );

  const servicesSection =
    sections.find(
      (section) =>
        section.section_type ===
        "services"
    );

  const templateServices =
    await getTemplateServices(
      templateKey,
      templateKey
    );

  const cards =
    templateServices.length > 0
      ? templateServices.map(
          (service) => ({
            workspace_id:
              workspaceId,
            landing_page_id:
              landingPageId,
            section_id:
              servicesSection?.id ||
              null,
            template_service_id:
              service.id,
            industry_key:
              service.industry_key,
            service_key:
              service.service_key,
            title: service.title,
            description:
              service.description,
            image_url:
              service.default_image_url,
            background_image_url:
              service.default_background_image_url,
            icon: service.icon,
            cta_label:
              service.cta_label,
            booking_category:
              service.booking_category,
            enabled:
              service.is_default_enabled ===
              undefined
                ? true
                : Boolean(
                    service.is_default_enabled
                  ),
            client_modified: false,
            order_index:
              service.order_index,
            payload: {
              source: "template",
              template_key:
                service.template_key,
            },
          })
        )
      : DEFAULT_SERVICES.map(
          (service, index) => ({
            workspace_id:
              workspaceId,
            landing_page_id:
              landingPageId,
            section_id:
              servicesSection?.id ||
              null,
            template_service_id:
              null,
            industry_key:
              templateKey ||
              "general",
            service_key:
              slugify(
                service.title
              ),
            title:
              service.title,
            description:
              service.description,
            image_url:
              service.image_url ||
              null,
            background_image_url:
              null,
            icon: "Building2",
            cta_label:
              service.cta_label ||
              "Book Consultation",
            booking_category:
              slugify(
                service.title
              ),
            enabled: true,
            client_modified: false,
            order_index: index,
            payload: {
              source: "fallback",
            },
          })
        );

  if (!cards.length) {
    return;
  }

  const { error } =
    await supabase
      .from(
        "workspace_landing_service_cards"
      )
      .insert(cards);

  if (error) {
    throw error;
  }
}

export async function ensureDefaultBookingMapping({
  workspaceId,
  landingPageId,
  templateKey,
}) {
  const {
    data: existingMappings,
    error: existingError,
  } = await supabase
    .from(
      "landing_booking_mappings"
    )
    .select("id")
    .eq(
      "landing_page_id",
      landingPageId
    )
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingMappings?.length) {
    return;
  }

  const bookingPreset =
    await getDefaultBookingPreset(
      templateKey
    );

  const { error } =
    await supabase
      .from(
        "landing_booking_mappings"
      )
      .insert({
        workspace_id:
          workspaceId,
        landing_page_id:
          landingPageId,
        booking_preset_id:
          bookingPreset?.id ||
          null,
        service_card_id: null,
        create_lead: true,
        create_contact: true,
        create_booking: true,
        create_calendar_event: false,
        meeting_provider:
          bookingPreset?.meeting_type ||
          "google_meet",
        approval_mode:
          bookingPreset?.approval_mode ||
          "manual",
        crm_pipeline_stage:
          null,
        assigned_owner: null,
        status: "active",
      });

  if (error) {
    throw error;
  }
}

export async function ensureLandingInitialized({
  landingPage,
  workspaceId,
  templateKey,
}) {
  if (
    !landingPage?.id ||
    !workspaceId
  ) {
    return;
  }

  await ensureDefaultSections(
    landingPage.id
  );

  await ensureDefaultServiceCards({
    workspaceId,
    landingPageId:
      landingPage.id,
    templateKey,
  });

  await ensureDefaultBookingMapping({
    workspaceId,
    landingPageId:
      landingPage.id,
    templateKey,
  });
}
