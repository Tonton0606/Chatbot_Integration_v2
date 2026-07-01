import { supabase } from "../../config/supabaseClient";

import { requireValue } from "./utils";
import { getCurrentUserProfile } from "./workspace";
import { normalizeClientBooking } from "./normalizers";

export async function getClientBookings(workspaceId) {
  requireValue(workspaceId, "Workspace ID is required.");

  const { data, error } = await supabase
    .from("client_bookings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("preferred_date", { ascending: true })
    .order("preferred_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeClientBooking);
}

export async function getClientBookingFormOptions(workspaceId) {
  requireValue(workspaceId, "Workspace ID is required.");

  const [profile, contactsResult, employeesResult] = await Promise.all([
    getCurrentUserProfile(),

    supabase
      .from("client_contacts")
      .select("id, full_name, email, phone, company_name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .not("email", "is", null)
      .order("full_name", { ascending: true }),

    supabase
      .from("employees")
      .select("id, full_name, email, job_title, status")
      .eq("workspace_id", workspaceId)
      .not("email", "is", null)
      .order("full_name", { ascending: true }),
  ]);

  if (contactsResult.error) {
    throw contactsResult.error;
  }

  const employees =
    employeesResult.error?.code === "42P01"
      ? []
      : employeesResult.error
        ? []
        : employeesResult.data || [];

  return {
    currentUser: profile,
    contacts: contactsResult.data || [],
    employees,
  };
}
