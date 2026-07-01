const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const logger = require('../config/logger');

const IS_PROD = process.env.NODE_ENV === 'production';

// Single SHA-256 implementation used throughout this module and exported for reuse.
// Never inline require('crypto') in hot paths — use this function consistently.
function _hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isAdminRole(role) {
  return ['admin', 'super_admin'].includes(normalizeRole(role));
}

function isRemovedStatus(status) {
  return ['removed', 'archived', 'inactive', 'disabled'].includes(
    String(status || '').trim().toLowerCase()
  );
}

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next({
        status: 401,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Revocation blacklist check
    const { data: blacklisted, error: revErr } = await supabase
      .from('revoked_tokens')
      .select('id')
      .eq('token_hash', _hashToken(token))
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (revErr) {
      logger.warn({ err: revErr.message }, 'revoked_tokens check failed — allowing token');
    }

    if (blacklisted) {
      return next({ status: 401, message: 'Token has been revoked' });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next({
        status: 401,
        message: 'Unauthorized: invalid or expired token',
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return next({
        status: 403,
        message: 'User profile not found',
      });
    }

    if (isRemovedStatus(profile.status)) {
      return next({
        status: 403,
        message: 'User account is not active',
      });
    }

    const role = normalizeRole(profile.role);
    const isAdmin = isAdminRole(role);

    const requestedWorkspace =
      req.headers['x-workspace-id'] ||
      req.body?.workspaceId ||
      req.body?.workspace_id ||
      req.query?.workspaceId ||
      req.query?.workspace_id ||
      req.params?.workspaceId ||
      req.params?.workspace_id ||
      '';

    let workspaceRole = role || 'member';

    if (requestedWorkspace && !isAdmin) {
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('role, status')
        .eq('workspace_id', requestedWorkspace)
        .eq('user_id', user.id)
        .maybeSingle();

      if (
        membershipError ||
        !membership ||
        isRemovedStatus(membership.status)
      ) {
        return next({
          status: 403,
          message: 'Not authorized for this workspace',
        });
      }

      workspaceRole = membership.role || workspaceRole;
    }

    req.user = user;
    req.profile = profile;
    req.workspaceId = requestedWorkspace || null;
    req.workspaceRole = workspaceRole;
    req.isAdmin = isAdmin;

    return next();
  } catch (_error) {
    return next({
      status: 500,
      message: 'Authentication error',
    });
  }
}

function handleAuthError(error, req, res, _next) {
  const status = error?.status || 500;
  // 401/403 messages are deliberate and safe to surface; 500s hide internals in prod.
  const message = status < 500
    ? (error.message || 'Unauthorized')
    : (IS_PROD ? 'Authentication error' : (error.message || 'Internal server error'));

  return res.status(status).json({
    success: false,
    error: message,
    path: req.originalUrl,
  });
}

function requireWorkspaceRow(table, idColumn = 'id') {
  return async (req, res, next) => {
    try {
      const id = req.params[idColumn] || req.params.id;

      if (!id) {
        return next({
          status: 400,
          message: 'Record id required',
        });
      }

      const { data, error } = await supabase
        .from(table)
        .select('workspace_id')
        .eq(idColumn, id)
        .single();

      if (error || !data) {
        return next({
          status: 404,
          message: 'Record not found',
        });
      }

      if (!req.isAdmin && data.workspace_id !== req.workspaceId) {
        return next({
          status: 403,
          message: 'Not authorized for this workspace',
        });
      }

      req.workspaceRecord = data;

      return next();
    } catch (_error) {
      return next({
        status: 500,
        message: 'Workspace authorization error',
      });
    }
  };
}

// requireAuthOnly: validates JWT only — no profile/role/workspace check.
// ONLY use for routes that fire immediately after Supabase sign-in (e.g. OTP start,
// change-password) where the profile row may not yet be fully hydrated.
// For every other protected route use requireAuth.
async function requireAuthOnly(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next({ status: 401, message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check token against revocation blacklist before Supabase round-trip
    const { data: blacklisted, error: revErr } = await supabase
      .from('revoked_tokens')
      .select('id')
      .eq('token_hash', _hashToken(token))
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (revErr) {
      // Non-fatal: log and continue — don't block all logins if table is unavailable
      logger.warn({ err: revErr.message }, 'revoked_tokens check failed — allowing token');
    }

    if (blacklisted) {
      return next({ status: 401, message: 'Token has been revoked' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next({ status: 401, message: 'Unauthorized: invalid or expired token' });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return next({ status: 500, message: 'Authentication error' });
  }
}

// requireAdmin: requireAuth + must be admin or super_admin role.
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.isAdmin) {
      return next({ status: 403, message: 'Admin access required' });
    }
    return next();
  });
}

// getWorkspaceId: canonical workspace resolver for route handlers.
// Always prefer req.workspaceId (set by requireAuth from the validated
// x-workspace-id header) over body/query — those are attacker-controlled.
function getWorkspaceId(req) {
  return req.workspaceId || null;
}

module.exports = {
  requireAuth,
  requireAuthOnly,
  requireAdmin,
  handleAuthError,
  requireWorkspaceRow,
  getWorkspaceId,
  _hashToken,
};
