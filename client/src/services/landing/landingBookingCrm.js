import { supabase } from "../../config/supabaseClient";

function cleanText(value) {
  return String(value || "").trim();
}

function buildFullName(bookingForm = {}, booking = {}) {
  const firstName = cleanText(bookingForm.first_name);
  const lastName = cleanText(bookingForm.last_name);
  const composedName = `${firstName} ${lastName}`.trim();

  return (
    composedName ||
    cleanText(bookingForm.full_name) ||
    cleanText(booking.full_name) ||
    "Landing Page Visitor"
  );
}

function buildLeadTitle({ fullName, serviceInterest }) {
  if (serviceInterest) {
    return `${serviceInterest} Inquiry - ${fullName}`;
  }

  return `Landing Page Booking - ${fullName}`;
}

function buildLeadNotes({
  bookingForm,
  landingPage,
  booking,
  serviceInterest,
}) {
  return [
    "Created from public landing page booking.",
    landingPage?.title ? `Landing Page: ${landingPage.title}` : null,
    serviceInterest ? `Service Interest: ${serviceInterest}` : null,
    booking?.preferred_date ? `Preferred Date: ${booking.preferred_date}` : null,
    booking?.preferred_time ? `Preferred Time: ${booking.preferred_time}` : null,
    booking?.platform ? `Platform: ${booking.platform}` : null,
    bookingForm?.message ? `Message: ${bookingForm.message}` : null,
    booking?.id ? `Booking ID: ${booking.id}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findExistingContact({ workspaceId, email }) {
  if (!workspaceId || !email) {
    return null;
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function createContact({
  workspaceId,
  fullName,
  email,
  phone,
  companyName,
}) {
  const { data, error } = await supabase
    .from("client_contacts")
    .insert({
      workspace_id: workspaceId,
      full_name: fullName,
      email,
      phone: phone || null,
      company_name: companyName || null,
      source: "landing_page",
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function updateContact(contactId, payload = {}) {
  const cleanPayload = {};

  if (payload.full_name) cleanPayload.full_name = payload.full_name;
  if (payload.phone) cleanPayload.phone = payload.phone;
  if (payload.company_name) cleanPayload.company_name = payload.company_name;

  if (Object.keys(cleanPayload).length === 0) {
    return null;
  }

  cleanPayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("client_contacts")
    .update(cleanPayload)
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function createLead({
  workspaceId,
  contactId,
  title,
  notes,
}) {
  const { data, error } = await supabase
    .from("client_leads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId || null,
      title,
      source: "landing_page_booking",
      status: "new",
      notes,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function syncLandingBookingToCrm({
  landingPage,
  booking,
  bookingForm,
}) {
  const workspaceId = landingPage?.workspace_id || booking?.workspace_id;

  if (!workspaceId) {
    throw new Error("workspace_id is required to sync booking to CRM.");
  }

  const email = cleanText(bookingForm?.email || booking?.email).toLowerCase();
  const fullName = buildFullName(bookingForm, booking);
  const phone = cleanText(bookingForm?.phone || booking?.phone);
  const companyName = cleanText(bookingForm?.company || booking?.company);
  const serviceInterest = cleanText(bookingForm?.service_interest);

  let contact = null;

  if (email) {
    contact = await findExistingContact({
      workspaceId,
      email,
    });

    if (contact) {
      const updatedContact = await updateContact(contact.id, {
        full_name: fullName,
        phone,
        company_name: companyName,
      });

      contact = updatedContact || contact;
    } else {
      contact = await createContact({
        workspaceId,
        fullName,
        email,
        phone,
        companyName,
      });
    }
  }

  const lead = await createLead({
    workspaceId,
    contactId: contact?.id || null,
    title: buildLeadTitle({
      fullName,
      serviceInterest,
    }),
    notes: buildLeadNotes({
      bookingForm,
      landingPage,
      booking,
      serviceInterest,
    }),
  });

  return {
    contact,
    lead,
  };
}
