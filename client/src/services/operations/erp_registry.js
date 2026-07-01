import { supabase } from "../../config/supabaseClient";
import { getIcon } from "../../constants/navigationRegistry";

export const ERP_REGISTRY_STATUSES = ["active", "beta", "planned", "disabled"];

function normalizeKey(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function getERPRegistryData() {
  const [divisionResult, featureResult] = await Promise.all([
    supabase
      .from("erp_divisions")
      .select(`
        id,
        division_key,
        title,
        icon,
        description,
        order_index,
        admin_visible,
        client_visible,
        status,
        status_note,
        created_at,
        updated_at
      `)
      .order("order_index", { ascending: true })
      .order("title", { ascending: true }),

    supabase
      .from("erp_features")
      .select(`
        id,
        division_id,
        feature_key,
        label,
        icon,
        description,
        admin_route,
        client_route,
        admin_visible,
        client_visible,
        status,
        status_note,
        auto_enable_with_division,
        order_index,
        created_at,
        updated_at,
        division:erp_divisions!erp_features_division_id_fkey (
          id,
          division_key,
          title
        )
      `)
      .order("order_index", { ascending: true })
      .order("label", { ascending: true }),
  ]);

  if (divisionResult.error) throw divisionResult.error;
  if (featureResult.error) throw featureResult.error;

  return {
    divisions: divisionResult.data || [],
    features: featureResult.data || [],
  };
}

export function buildNavigationRegistry({
  divisions = [],
  features = [],
  enabledFeatureKeys = [],
  mode = "client",
} = {}) {
  const enabledSet = new Set(enabledFeatureKeys);

  return divisions
    .filter((division) => {
      if (!division) return false;
      if (division.status === "disabled") return false;
      if (mode === "admin" && !division.admin_visible) return false;
      if (mode === "client" && !division.client_visible) return false;
      return true;
    })
    .map((division) => {
      const items = features
        .filter((feature) => feature.division_id === division.id)
        .filter((feature) => {
          if (!feature) return false;
          if (feature.status === "disabled") return false;

          if (mode === "admin") {
            if (!feature.admin_visible) return false;
            if (!feature.admin_route) return false;
          }

          if (mode === "client") {
            if (!feature.client_visible) return false;
            if (!feature.client_route) return false;
            if (!enabledSet.has(feature.feature_key)) return false;
            if (feature.status === "planned") return false;
          }

          return true;
        })
        .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
        .map((feature) => ({
          id: feature.id,
          key: feature.feature_key,
          label: feature.label,
          icon: getIcon(feature.icon),
          description: feature.description,
          status: feature.status,
          statusNote: feature.status_note,
          autoEnableWithDivision: !!feature.auto_enable_with_division,
          adminRoute: feature.admin_route,
          clientRoute: feature.client_route,
          adminVisible: !!feature.admin_visible,
          clientVisible: !!feature.client_visible,
          order: Number(feature.order_index || 0),
          divisionId: division.id,
          divisionKey: division.division_key,
          divisionTitle: division.title,
        }));

      return {
        id: division.id,
        key: division.division_key,
        title: division.title,
        icon: getIcon(division.icon),
        description: division.description,
        status: division.status,
        adminVisible: !!division.admin_visible,
        clientVisible: !!division.client_visible,
        order: Number(division.order_index || 0),
        items,
      };
    })
    .filter((division) => division.items.length > 0)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export async function createERPDivision(payload) {
  const divisionKey = normalizeKey(payload.division_key || payload.title);

  if (!divisionKey) {
    throw new Error("Division key is required.");
  }

  const { error } = await supabase.from("erp_divisions").insert({
    division_key: divisionKey,
    title: payload.title?.trim(),
    icon: payload.icon?.trim() || null,
    description: payload.description?.trim() || null,
    order_index: Number(payload.order_index || 0),
    admin_visible: payload.admin_visible ?? true,
    client_visible: payload.client_visible ?? true,
    status: payload.status || "active",
    status_note: payload.status_note?.trim() || null,
  });

  if (error) throw error;

  return true;
}

export async function updateERPDivision(id, payload) {
  if (!id) {
    throw new Error("Division ID is required.");
  }

  const updates = {
    title: payload.title?.trim(),
    icon: payload.icon?.trim() || null,
    description: payload.description?.trim() || null,
    order_index: Number(payload.order_index || 0),
    admin_visible: payload.admin_visible ?? true,
    client_visible: payload.client_visible ?? true,
    status: payload.status || "active",
    status_note: payload.status_note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (payload.division_key) {
    updates.division_key = normalizeKey(payload.division_key);
  }

  const { data, error } = await supabase
    .from("erp_divisions")
    .update(updates)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error(
      "Division update was blocked or no row was updated. Check your admin role and RLS policy."
    );
  }

  return true;
}

export async function updateERPFeature(id, payload) {
  if (!id) {
    throw new Error("Feature ID is required.");
  }

  const updates = {
    division_id: payload.division_id,
    label: payload.label?.trim(),
    icon: payload.icon?.trim() || null,
    description: payload.description?.trim() || null,
    admin_route: payload.admin_route?.trim() || null,
    client_route: payload.client_route?.trim() || null,
    admin_visible: payload.admin_visible ?? true,
    client_visible: payload.client_visible ?? true,
    status: payload.status || "planned",
    status_note: payload.status_note?.trim() || null,
    auto_enable_with_division: payload.auto_enable_with_division ?? false,
    order_index: Number(payload.order_index || 0),
    updated_at: new Date().toISOString(),
  };

  if (payload.feature_key) {
    updates.feature_key = normalizeKey(payload.feature_key);
  }

  const { data, error } = await supabase
    .from("erp_features")
    .update(updates)
    .eq("id", id)
    .select("id, feature_key, status")
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error(
      "Feature update was blocked or no row was updated. Check your admin role and RLS policy."
    );
  }

  return data;
}

export async function deleteERPDivision(id) {
  if (!id) {
    throw new Error("Division ID is required.");
  }

  const { error } = await supabase
    .from("erp_divisions")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}

export async function createERPFeature(payload) {
  const featureKey = normalizeKey(payload.feature_key || payload.label);

  if (!payload.division_id) {
    throw new Error("Division is required.");
  }

  if (!featureKey) {
    throw new Error("Feature key is required.");
  }

  const { error } = await supabase.from("erp_features").insert({
    division_id: payload.division_id,
    feature_key: featureKey,
    label: payload.label?.trim(),
    icon: payload.icon?.trim() || null,
    description: payload.description?.trim() || null,
    admin_route: payload.admin_route?.trim() || null,
    client_route: payload.client_route?.trim() || null,
    admin_visible: payload.admin_visible ?? true,
    client_visible: payload.client_visible ?? true,
    status: payload.status || "planned",
    status_note: payload.status_note?.trim() || null,
    auto_enable_with_division: payload.auto_enable_with_division ?? false,
    order_index: Number(payload.order_index || 0),
  });

  if (error) throw error;

  return true;
}

export async function deleteERPFeature(id) {
  if (!id) {
    throw new Error("Feature ID is required.");
  }

  const { error } = await supabase
    .from("erp_features")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}
