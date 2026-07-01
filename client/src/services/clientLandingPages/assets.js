import { supabase } from "../../config/supabaseClient";
import { getCurrentUserId, requireWorkspaceId } from "./utils";

export async function uploadLandingAsset({
  workspaceId,
  landingPageId,
  file,
  assetType = "image",
  onProgress,
}) {
  requireWorkspaceId(workspaceId);

  if (!file) {
    throw new Error("File is required.");
  }

  const userId = await getCurrentUserId();

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("User session is required to upload landing assets.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase upload configuration is missing.");
  }

  const fileExt = file.name.split(".").pop();
  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const filePath = `${workspaceId}/${assetType}/${Date.now()}-${safeName}.${fileExt}`;

  const encodedPath = filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const uploadUrl = `${supabaseUrl.replace(
    /\/+$/,
    ""
  )}/storage/v1/object/landing-assets-v2/${encodedPath}`;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", uploadUrl);

    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");

    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }

      const percent = Math.max(
        1,
        Math.min(99, Math.round((event.loaded / event.total) * 100))
      );

      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === "function") {
          onProgress(100);
        }

        resolve();
        return;
      }

      let message = "Failed to upload landing asset.";

      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed.message || parsed.error || message;
      } catch {
        message = xhr.responseText || message;
      }

      reject(new Error(message));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading landing asset."));
    };

    xhr.onabort = () => {
      reject(new Error("Landing asset upload was cancelled."));
    };

    xhr.send(file);
  });

  const { data: publicData } = supabase.storage
    .from("landing-assets-v2")
    .getPublicUrl(filePath);

  const fileUrl = publicData?.publicUrl;

  if (!fileUrl) {
    throw new Error("Failed to generate public asset URL.");
  }

  const { data, error } = await supabase
    .from("workspace_landing_assets")
    .insert({
      workspace_id: workspaceId,
      landing_page_id: landingPageId || null,
      asset_type: assetType,
      file_url: fileUrl,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    asset: data,
    fileUrl,
  };
}
