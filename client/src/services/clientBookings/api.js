function normalizeApiBaseUrl(value) {
  const rawBaseUrl = (
    value ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000/api"
  ).replace(/\/+$/, "");

  if (rawBaseUrl.endsWith("/api")) {
    return rawBaseUrl;
  }

  return `${rawBaseUrl}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl();

export async function parseApiResponse(response) {
  const rawText = await response.text();

  let result = null;

  try {
    result = rawText ? JSON.parse(rawText) : {};
  } catch (_error) {
    throw new Error(
      `Invalid API response from ${response.url}. Expected JSON but received: ${rawText.slice(
        0,
        160
      )}`
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error ||
        result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}
