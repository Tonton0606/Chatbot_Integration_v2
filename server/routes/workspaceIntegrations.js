const logger = require("../config/logger");
const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const { supabase } = require("../config/supabase");
const { requireAuth, getWorkspaceId } = require("../middleware/auth");

const router = express.Router();

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const ZOOM_SCOPES = ["meeting:write", "user:read"];

function getBackendUrl() {
  return process.env.BACKEND_URL || "http://localhost:5000";
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} is not configured.`);
  }

  return process.env[name];
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    `${getBackendUrl()}/api/workspace-integrations/google/callback`
  );
}

async function upsertIntegration({
  workspaceId,
  provider,
  intendedEmail,
  connectedEmail,
  connectedName,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
  createdBy,
}) {
  const { data, error } = await supabase
    .from("workspace_integrations")
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        intended_email: intendedEmail || null,
        connected_email: connectedEmail || null,
        connected_name: connectedName || null,
        access_token: accessToken || null,
        refresh_token: refreshToken || null,
        expires_at: expiresAt || null,
        scopes: scopes || [],
        status: "active",
        created_by: createdBy || null,
      },
      {
        onConflict: "workspace_id,provider",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

router.get("/", requireAuth, async (req, res) => {
  const workspaceId = getWorkspaceId(req);

  try {
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "Workspace context required. Send the x-workspace-id header for this request.",
      });
    }

    const { data, error } = await supabase
      .from("workspace_integrations")
      .select(
        `
        id,
        workspace_id,
        provider,
        intended_email,
        connected_email,
        connected_name,
        expires_at,
        scopes,
        status,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", workspaceId)
      .order("provider", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      integrations: data || [],
    });
  } catch (error) {
    logger.error({ err: error }, "WORKSPACE INTEGRATIONS LIST ERROR:");

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/google/connect", requireAuth, async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const { intended_email, user_id } = req.body;

  try {
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "Workspace context required. Send the x-workspace-id header for this request.",
      });
    }

    const oauth2Client = getGoogleOAuthClient();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_SCOPES,
      state: encodeState({
        workspace_id: workspaceId,
        intended_email,
        user_id,
        provider: "google",
      }),
    });

    return res.json({
      success: true,
      auth_url: authUrl,
    });
  } catch (error) {
    logger.error({ err: error }, "GOOGLE CONNECT ERROR:");

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;

  try {
    if (!code || !state) {
      throw new Error("Missing Google OAuth callback data.");
    }

    const parsedState = decodeState(state);
    const oauth2Client = getGoogleOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });

    const { data: profile } = await oauth2.userinfo.get();

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    await upsertIntegration({
      workspaceId: parsedState.workspace_id,
      provider: "google",
      intendedEmail: parsedState.intended_email,
      connectedEmail: profile.email,
      connectedName: profile.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scopes: GOOGLE_SCOPES,
      createdBy: parsedState.user_id,
    });

    return res.redirect(
      `${getFrontendUrl()}/Client/Booking?integration=google&status=connected`
    );
  } catch (error) {
    logger.error({ err: error }, "GOOGLE CALLBACK ERROR:");

    return res.redirect(
      `${getFrontendUrl()}/Client/Booking?integration=google&status=failed`
    );
  }
});

router.post("/zoom/connect", requireAuth, async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const { intended_email, user_id } = req.body;

  try {
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "Workspace context required. Send the x-workspace-id header for this request.",
      });
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: requireEnv("ZOOM_OAUTH_CLIENT_ID"),
      redirect_uri: `${getBackendUrl()}/api/workspace-integrations/zoom/callback`,
      state: encodeState({
        workspace_id: workspaceId,
        intended_email,
        user_id,
        provider: "zoom",
      }),
    });

    return res.json({
      success: true,
      auth_url: `https://zoom.us/oauth/authorize?${params.toString()}`,
    });
  } catch (error) {
    logger.error({ err: error }, "ZOOM CONNECT ERROR:");

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/zoom/callback", async (req, res) => {
  const { code, state } = req.query;

  try {
    if (!code || !state) {
      throw new Error("Missing Zoom OAuth callback data.");
    }

    const parsedState = decodeState(state);

    const credentials = Buffer.from(
      `${requireEnv("ZOOM_OAUTH_CLIENT_ID")}:${requireEnv(
        "ZOOM_OAUTH_CLIENT_SECRET"
      )}`
    ).toString("base64");

    const tokenResponse = await axios.post(
      "https://zoom.us/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getBackendUrl()}/api/workspace-integrations/zoom/callback`,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokens = tokenResponse.data;

    const userResponse = await axios.get("https://api.zoom.us/v2/users/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const profile = userResponse.data;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await upsertIntegration({
      workspaceId: parsedState.workspace_id,
      provider: "zoom",
      intendedEmail: parsedState.intended_email,
      connectedEmail: profile.email,
      connectedName:
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        profile.display_name ||
        profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scopes: ZOOM_SCOPES,
      createdBy: parsedState.user_id,
    });

    return res.redirect(
      `${getFrontendUrl()}/Client/Booking?integration=zoom&status=connected`
    );
  } catch (error) {
    logger.error({ err: error.response?.data || error }, "ZOOM CALLBACK ERROR");

    return res.redirect(
      `${getFrontendUrl()}/Client/Booking?integration=zoom&status=failed`
    );
  }
});

router.post("/disconnect", requireAuth, async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const { provider } = req.body;

  try {
    if (!workspaceId || !provider) {
      return res.status(400).json({
        success: false,
        error: "Workspace context and provider are required.",
      });
    }

    const { data, error } = await supabase
      .from("workspace_integrations")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        expires_at: null,
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      integration: data,
    });
  } catch (error) {
    logger.error({ err: error }, "WORKSPACE INTEGRATION DISCONNECT ERROR:");

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/test", (_req, res) => {
  return res.json({
    success: true,
    route: "workspace-integrations",
  });
});

module.exports = router;
