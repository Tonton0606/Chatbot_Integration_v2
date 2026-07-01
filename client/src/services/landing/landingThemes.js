import { supabase } from "../../config/supabaseClient";
import { DEFAULT_THEME } from "./landingTypes";

/**
 * Hermes2 / ExponifyPH
 * Landing Themes Service
 *
 * Handles admin-defined landing theme presets.
 */

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function normalizeThemePayload(payload = {}) {
  return {
    theme_key: payload.theme_key,
    name: payload.name,
    description: payload.description || null,
    theme_mode: payload.theme_mode || "dark",
    primary_color: payload.primary_color || "#0d1b2e",
    secondary_color: payload.secondary_color || "#0a1628",
    accent_color: payload.accent_color || "#c9a84c",
    text_color: payload.text_color || "#e6edf3",
    card_style: payload.card_style || "glass",
    booking_style: payload.booking_style || "premium_dark",
    button_style: payload.button_style || "gold_solid",
    overlay_opacity:
      payload.overlay_opacity === undefined
        ? 0.65
        : Number(payload.overlay_opacity),
    default_for_industry: payload.default_for_industry || null,
    status: payload.status || "active",
    order_index: Number.isFinite(Number(payload.order_index))
      ? Number(payload.order_index)
      : 0,
    updated_at: new Date().toISOString(),
  };
}

export async function getLandingThemes({
  status = "active",
  includeInactive = false,
} = {}) {
  let query = supabase
    .from("landing_theme_presets")
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

export async function getThemeByKey(themeKey = DEFAULT_THEME) {
  requireValue(themeKey, "themeKey is required.");

  const { data, error } = await supabase
    .from("landing_theme_presets")
    .select("*")
    .eq("theme_key", themeKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDefaultThemeForIndustry(industryKey) {
  if (!industryKey) {
    return getThemeByKey(DEFAULT_THEME);
  }

  const { data, error } = await supabase
    .from("landing_theme_presets")
    .select("*")
    .eq("default_for_industry", industryKey)
    .eq("status", "active")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || getThemeByKey(DEFAULT_THEME);
}

export async function createThemePreset(payload) {
  requireValue(payload?.theme_key, "theme_key is required.");
  requireValue(payload?.name, "name is required.");

  const cleanPayload = normalizeThemePayload(payload);

  const { data, error } = await supabase
    .from("landing_theme_presets")
    .insert(cleanPayload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateThemePreset(id, payload) {
  requireValue(id, "theme preset id is required.");

  const cleanPayload = normalizeThemePayload(payload);

  delete cleanPayload.theme_key;

  const { data, error } = await supabase
    .from("landing_theme_presets")
    .update(cleanPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateThemeStatus(id, status) {
  requireValue(id, "theme preset id is required.");
  requireValue(status, "status is required.");

  const { data, error } = await supabase
    .from("landing_theme_presets")
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

export async function activateThemePreset(id) {
  return updateThemeStatus(id, "active");
}

export async function disableThemePreset(id) {
  return updateThemeStatus(id, "disabled");
}

export async function archiveThemePreset(id) {
  return updateThemeStatus(id, "archived");
}

export function mapThemeToCssVariables(theme) {
  if (!theme) {
    return {};
  }

  return {
    "--landing-primary": theme.primary_color,
    "--landing-secondary": theme.secondary_color,
    "--landing-accent": theme.accent_color,
    "--landing-text": theme.text_color,
    "--landing-overlay-opacity": String(theme.overlay_opacity ?? 0.65),
  };
}

export function buildThemeRuntimeConfig(theme) {
  if (!theme) {
    return null;
  }

  return {
    key: theme.theme_key,
    name: theme.name,
    mode: theme.theme_mode,
    colors: {
      primary: theme.primary_color,
      secondary: theme.secondary_color,
      accent: theme.accent_color,
      text: theme.text_color,
    },
    styles: {
      card: theme.card_style,
      booking: theme.booking_style,
      button: theme.button_style,
      overlayOpacity: theme.overlay_opacity,
    },
    cssVariables: mapThemeToCssVariables(theme),
  };
}
