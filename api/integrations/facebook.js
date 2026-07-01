import { createClient } from "@supabase/supabase-js";

const runtimeConfig = {
  pageId: "",
  pageName: "",
  pageAccessToken: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  verifyToken: "",
  appSecret: "",
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServerKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseClient = supabaseUrl && supabaseServerKey ? createClient(supabaseUrl, supabaseServerKey) : null;

function normalizeAccessMode(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "disable" ? "disable" : "enable";
}

function normalizePageId(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getNormalizedSupabaseRecord(record = {}) {
  const pageAccessToken =
    (typeof record.fb_token === "string" && record.fb_token.trim()) ||
    (typeof record.page_access_token === "string" && record.page_access_token.trim()) ||
    "";
  const pageName =
    (typeof record.fb_name === "string" && record.fb_name.trim()) ||
    (typeof record.page_name === "string" && record.page_name.trim()) ||
    "";
  const businessType =
    (typeof record.business_type === "string" && record.business_type.trim()) ||
    (typeof record.businessType === "string" && record.businessType.trim()) ||
    "";
  const productServices =
    (typeof record.product_services === "string" && record.product_services.trim()) ||
    (typeof record.productServices === "string" && record.productServices.trim()) ||
    "";
  const productServicePriceRanges =
    (typeof record.product_service_price_ranges === "string" && record.product_service_price_ranges.trim()) ||
    (typeof record.product_service_price_range === "string" && record.product_service_price_range.trim()) ||
    (typeof record.productServicePriceRanges === "string" && record.productServicePriceRanges.trim()) ||
    "";
  const websiteLink =
    (typeof record.website_link === "string" && record.website_link.trim()) ||
    (typeof record.websiteLink === "string" && record.websiteLink.trim()) ||
    "";
  const shoppeLink =
    (typeof record.shoppe_link === "string" && record.shoppe_link.trim()) ||
    (typeof record.shoppeLink === "string" && record.shoppeLink.trim()) ||
    "";
  const lazadaLink =
    (typeof record.lazada_link === "string" && record.lazada_link.trim()) ||
    (typeof record.lazadaLink === "string" && record.lazadaLink.trim()) ||
    "";
  const rawId = record.page_id ?? record.fb_page_id ?? record.id;
  const accessMode = normalizeAccessMode(record.access_mode ?? record.accessMode);

  return {
    pageId: rawId == null ? "" : String(rawId),
    pageName,
    pageAccessToken,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    accessMode,
  };
}

async function getSupabaseFacebookConfig() {
  if (!supabaseClient) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("fb_pages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to read fb_pages from Supabase", { message: error.message });
    return null;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return getNormalizedSupabaseRecord(data[0]);
}

async function getSupabaseFacebookConfigByPageId(pageId) {
  if (!supabaseClient) {
    return null;
  }

  const normalizedPageId = normalizePageId(pageId);
  if (!normalizedPageId) {
    return null;
  }

  const matchColumns = ["page_id", "fb_page_id", "id"];
  for (const column of matchColumns) {
    const { data, error } = await supabaseClient
      .from("fb_pages")
      .select("*")
      .eq(column, normalizedPageId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      continue;
    }

    if (Array.isArray(data) && data.length > 0) {
      return getNormalizedSupabaseRecord(data[0]);
    }
  }

  return null;
}

async function getSupabaseFacebookPages() {
  if (!supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("fb_pages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to read fb_pages list from Supabase", { message: error.message });
    return [];
  }

  return Array.isArray(data) ? data.map(getNormalizedSupabaseRecord) : [];
}

async function saveSupabasePageToken(payload = {}) {
  if (!supabaseClient) {
    throw new Error("Supabase credentials are missing on server.");
  }

  const normalizedPageId = normalizePageId(payload.pageId);

  const record = {
    page_id: normalizedPageId || null,
    fb_name: normalizeText(payload.pageName),
    fb_token: normalizeText(payload.pageAccessToken),
    business_type: normalizeText(payload.businessType),
    product_services: normalizeText(payload.productServices),
    product_service_price_ranges: normalizeText(payload.productServicePriceRanges),
    website_link: normalizeText(payload.websiteLink),
    shoppe_link: normalizeText(payload.shoppeLink),
    lazada_link: normalizeText(payload.lazadaLink),
    access_mode: normalizeAccessMode(payload.accessMode),
  };

  let insertPayload = { ...record };
  let insertError = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabaseClient.from("fb_pages").insert(insertPayload);

    if (!error) {
      insertError = null;
      break;
    }

    insertError = error;
    const missingColumnMatch = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(error.message || "");

    if (missingColumnMatch?.[1] && Object.prototype.hasOwnProperty.call(insertPayload, missingColumnMatch[1])) {
      delete insertPayload[missingColumnMatch[1]];
      continue;
    }

    break;
  }

  if (insertError) {
    throw new Error(`Failed to insert fb_pages token: ${insertError.message}`);
  }
}

async function updateSupabasePageAccessMode(pageId, accessMode) {
  if (!supabaseClient) {
    throw new Error("Supabase credentials are missing on server.");
  }

  const normalizedPageId = normalizePageId(pageId);
  if (!normalizedPageId) {
    throw new Error("pageId is required");
  }

  const nextAccessMode = normalizeAccessMode(accessMode);
  const matchColumns = ["id", "page_id", "fb_page_id"];

  for (const column of matchColumns) {
    const { data, error } = await supabaseClient
      .from("fb_pages")
      .update({ access_mode: nextAccessMode })
      .eq(column, normalizedPageId)
      .select("*")
      .limit(1);

    if (error) {
      continue;
    }

    if (Array.isArray(data) && data.length > 0) {
      return getNormalizedSupabaseRecord(data[0]);
    }
  }

  throw new Error("Failed to update access mode. Page not found.");
}

async function updateSupabasePageDetails(pageId, payload = {}) {
  if (!supabaseClient) {
    throw new Error("Supabase credentials are missing on server.");
  }

  const normalizedPageId = normalizePageId(pageId);
  if (!normalizedPageId) {
    throw new Error("pageId is required");
  }

  const updatePayload = {
    fb_name: normalizeText(payload.pageName),
    business_type: normalizeText(payload.businessType),
    product_services: normalizeText(payload.productServices),
    product_service_price_ranges: normalizeText(payload.productServicePriceRanges),
    website_link: normalizeText(payload.websiteLink),
    shoppe_link: normalizeText(payload.shoppeLink),
    lazada_link: normalizeText(payload.lazadaLink),
  };

  const matchColumns = ["id", "page_id", "fb_page_id"];
  let lastError = null;

  for (const column of matchColumns) {
    let patch = { ...updatePayload };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data, error } = await supabaseClient
        .from("fb_pages")
        .update(patch)
        .eq(column, normalizedPageId)
        .select("*")
        .limit(1);

      if (!error) {
        if (Array.isArray(data) && data.length > 0) {
          return getNormalizedSupabaseRecord(data[0]);
        }

        break;
      }

      lastError = error;

      const missingColumnMatch = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(error.message || "");
      if (missingColumnMatch?.[1] && Object.prototype.hasOwnProperty.call(patch, missingColumnMatch[1])) {
        delete patch[missingColumnMatch[1]];
        continue;
      }

      break;
    }
  }

  const current = await getSupabaseFacebookConfigByPageId(normalizedPageId);

  if (!current?.pageAccessToken) {
    if (lastError?.message) {
      throw new Error(`Failed to update page details: ${lastError.message}`);
    }

    throw new Error("Failed to update page details. Page not found.");
  }

  await saveSupabasePageToken({
    pageId: normalizedPageId,
    pageName: normalizeText(payload.pageName) || current.pageName,
    pageAccessToken: current.pageAccessToken,
    businessType: normalizeText(payload.businessType) || current.businessType,
    productServices: normalizeText(payload.productServices) || current.productServices,
    productServicePriceRanges: normalizeText(payload.productServicePriceRanges) || current.productServicePriceRanges,
    websiteLink: normalizeText(payload.websiteLink) || current.websiteLink,
    shoppeLink: normalizeText(payload.shoppeLink) || current.shoppeLink,
    lazadaLink: normalizeText(payload.lazadaLink) || current.lazadaLink,
    accessMode: current.accessMode,
  });

  const updated = await getSupabaseFacebookConfigByPageId(normalizedPageId);
  return updated || current;
}

async function getConfig(options = {}) {
  const requestedPageId = normalizePageId(options.pageId);
  const supabaseConfig = requestedPageId
    ? await getSupabaseFacebookConfigByPageId(requestedPageId)
    : await getSupabaseFacebookConfig();

  return {
    pageId: supabaseConfig?.pageId || requestedPageId || runtimeConfig.pageId || process.env.FB_PAGE_ID || "",
    pageName: supabaseConfig?.pageName || runtimeConfig.pageName || process.env.FB_PAGE_NAME || "",
    pageAccessToken:
      supabaseConfig?.pageAccessToken || runtimeConfig.pageAccessToken || process.env.FB_PAGE_ACCESS_TOKEN || "",
    businessType:
      supabaseConfig?.businessType || runtimeConfig.businessType || process.env.FB_BUSINESS_TYPE || "",
    productServices:
      supabaseConfig?.productServices || runtimeConfig.productServices || process.env.FB_PRODUCT_SERVICES || "",
    productServicePriceRanges:
      supabaseConfig?.productServicePriceRanges ||
      runtimeConfig.productServicePriceRanges ||
      process.env.FB_PRODUCT_SERVICE_PRICE_RANGES ||
      "",
    websiteLink:
      supabaseConfig?.websiteLink || runtimeConfig.websiteLink || process.env.FB_WEBSITE_LINK || "",
    shoppeLink:
      supabaseConfig?.shoppeLink || runtimeConfig.shoppeLink || process.env.FB_SHOPPE_LINK || "",
    lazadaLink:
      supabaseConfig?.lazadaLink || runtimeConfig.lazadaLink || process.env.FB_LAZADA_LINK || "",
    accessMode: normalizeAccessMode(supabaseConfig?.accessMode),
    verifyToken: runtimeConfig.verifyToken || process.env.FB_VERIFY_TOKEN || "",
    appSecret: runtimeConfig.appSecret || process.env.FB_APP_SECRET || "",
  };
}

function saveConfig(payload = {}) {
  const normalizedPageId = normalizePageId(payload.pageId);
  if (normalizedPageId) runtimeConfig.pageId = normalizedPageId;
  if (typeof payload.pageName === "string") runtimeConfig.pageName = normalizeText(payload.pageName);
  if (typeof payload.pageAccessToken === "string") runtimeConfig.pageAccessToken = normalizeText(payload.pageAccessToken);
  if (typeof payload.businessType === "string") runtimeConfig.businessType = normalizeText(payload.businessType);
  if (typeof payload.productServices === "string") runtimeConfig.productServices = normalizeText(payload.productServices);
  if (typeof payload.productServicePriceRanges === "string") {
    runtimeConfig.productServicePriceRanges = normalizeText(payload.productServicePriceRanges);
  }
  if (typeof payload.websiteLink === "string") runtimeConfig.websiteLink = normalizeText(payload.websiteLink);
  if (typeof payload.shoppeLink === "string") runtimeConfig.shoppeLink = normalizeText(payload.shoppeLink);
  if (typeof payload.lazadaLink === "string") runtimeConfig.lazadaLink = normalizeText(payload.lazadaLink);
  if (typeof payload.verifyToken === "string") runtimeConfig.verifyToken = normalizeText(payload.verifyToken);
  if (typeof payload.appSecret === "string") runtimeConfig.appSecret = normalizeText(payload.appSecret);
}

function getBaseUrl(req) {
  const configured =
    process.env.BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = req.headers.host || "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function getFacebookWebhookUrl(req) {
  const configuredWebhookUrl = normalizeText(process.env.FACEBOOK_WEBHOOKS);

  if (configuredWebhookUrl) {
    try {
      const parsed = new URL(configuredWebhookUrl);
      const pathname = normalizeText(parsed.pathname);
      if (!pathname || pathname === "/") {
        parsed.pathname = "/api/webhooks/facebook";
      }
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return configuredWebhookUrl.replace(/\/$/, "");
    }
  }

  return `${getBaseUrl(req)}/api/webhooks/facebook`;
}

async function buildStatus(req) {
  const config = await getConfig();
  const connectedPages = await getSupabaseFacebookPages();

  return {
    connected: Boolean(connectedPages.length > 0 && config.verifyToken),
    pageId: config.pageId || null,
    pageName: config.pageName || null,
    businessType: config.businessType || null,
    productServices: config.productServices || null,
    productServicePriceRanges: config.productServicePriceRanges || null,
    websiteLink: config.websiteLink || null,
    shoppeLink: config.shoppeLink || null,
    lazadaLink: config.lazadaLink || null,
    hasPageAccessToken: Boolean(config.pageAccessToken),
    hasVerifyToken: Boolean(config.verifyToken),
    hasAppSecret: Boolean(config.appSecret),
    accessMode: config.accessMode,
    verifyToken: config.verifyToken || null,
    pageAccessTokenMasked: config.pageAccessToken ? `${config.pageAccessToken.slice(0, 4)}********` : null,
    webhookUrl: getFacebookWebhookUrl(req),
    connectedPages: connectedPages.map((page) => ({
      ...page,
      pageAccessTokenMasked: page.pageAccessToken ? `${page.pageAccessToken.slice(0, 4)}********` : null,
    })),
    connectedCount: connectedPages.length,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const status = await buildStatus(req);
      return res.status(200).json(status);
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const action = req.body?.action || "";

    if (action === "connect") {
      const payload = req.body || {};
      if (!payload.pageAccessToken || !payload.verifyToken) {
        return res.status(400).json({ error: "pageAccessToken and verifyToken are required" });
      }

      saveConfig(payload);
      await saveSupabasePageToken(payload);
      const status = await buildStatus(req);
      return res.status(200).json({ success: true, ...status });
    }

    if (action === "updateAccessMode") {
      await updateSupabasePageAccessMode(req.body?.pageId, req.body?.accessMode);
      const status = await buildStatus(req);
      return res.status(200).json({ success: true, ...status });
    }

    if (action === "updatePageDetails") {
      await updateSupabasePageDetails(req.body?.pageId, req.body || {});
      const status = await buildStatus(req);
      return res.status(200).json({ success: true, ...status });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to handle integration" });
  }
}
