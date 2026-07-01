import { supabase } from "../../config/supabaseClient";

export function requireWorkspaceId(workspaceId) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

export function buildTemplateLookupKeys(
  templateKey,
  industryKey
) {
  const keys = new Set();

  [templateKey, industryKey].forEach((value) => {
    const key = normalizeKey(value);

    if (key) {
      keys.add(key);
    }
  });

  const joined = Array.from(keys).join("_");

  if (joined.includes("insurance")) {
    keys.add("insurance");
  }

  if (
    joined.includes("real_estate") ||
    joined.includes("realestate")
  ) {
    keys.add("real_estate");
  }

  if (joined.includes("construction")) {
    keys.add("construction");
  }

  if (
    joined.includes("consultant") ||
    joined.includes("consulting")
  ) {
    keys.add("consultant");
  }

  if (
    joined.includes("clinic") ||
    joined.includes("medical")
  ) {
    keys.add("clinic");
  }

  if (joined.includes("restaurant")) {
    keys.add("restaurant");
  }

  if (joined.includes("furniture")) {
    keys.add("furniture");
  }

  if (joined.includes("education")) {
    keys.add("education");
  }

  if (joined.includes("fitness")) {
    keys.add("fitness");
  }

  if (joined.includes("law")) {
    keys.add("law");
  }

  if (joined.includes("finance")) {
    keys.add("finance");
  }

  if (
    joined.includes("beauty") ||
    joined.includes("salon")
  ) {
    keys.add("beauty");
  }

  if (joined.includes("travel")) {
    keys.add("travel");
  }

  if (joined.includes("photography")) {
    keys.add("photography");
  }

  if (joined.includes("event")) {
    keys.add("events");
  }

  if (joined.includes("general")) {
    keys.add("general_business");
  }

  return Array.from(keys).filter(Boolean);
}

export async function getCurrentUserId() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data?.user?.id || null;
}

export async function generateUniqueLandingSlug(
  baseValue,
  currentLandingId = null
) {
  const baseSlug =
    slugify(baseValue) || `landing-${Date.now()}`;

  const { data, error } = await supabase
    .from("workspace_landing_pages")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const usedSlugs = (data || [])
    .filter((row) => row.id !== currentLandingId)
    .map((row) => row.slug);

  if (!usedSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;

  while (
    usedSlugs.includes(`${baseSlug}-${counter}`)
  ) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}
