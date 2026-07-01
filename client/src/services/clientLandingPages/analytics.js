import { supabase } from "../../config/supabaseClient";
import { requireWorkspaceId } from "./utils";

export async function getLandingPageAnalytics(workspaceId, landingPageId) {
  requireWorkspaceId(workspaceId);

  let query = supabase
    .from("workspace_landing_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (landingPageId) {
    query = query.eq("landing_page_id", landingPageId);
  }

  const { data, error } = await query.limit(500);

  if (error) throw error;

  const events = data || [];

  const views = events.filter((event) =>
    ["view", "page_view"].includes(event.event_type)
  ).length;

  const bookingClicks = events.filter(
    (event) => event.event_type === "booking_click"
  ).length;

  const bookingSubmissions = events.filter(
    (event) => event.event_type === "booking_submit"
  ).length;

  const conversionRate =
    views > 0 ? Math.round((bookingSubmissions / views) * 100) : 0;

  return {
    events,
    stats: {
      views,
      bookingClicks,
      bookingSubmissions,
      conversionRate,
    },
  };
}
