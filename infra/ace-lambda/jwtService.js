'use strict';

/**
 * JWT utilities for ACE Lambda user sessions.
 *
 * Two token types coexist in this deployment:
 *   - Service token (CONFIG_API_TOKEN): shared secret for scripts / CI / direct API calls.
 *   - User JWT (JWT_SECRET): short-lived, per-user, issued by POST /api/auth/login.
 *
 * Both are accepted as Bearer tokens. authUtils.js distinguishes them.
 *
 * Required env vars:
 *   JWT_SECRET        — secret used to sign/verify tokens (min 32 chars recommended)
 *   JWT_EXPIRY_HOURS  — token lifetime in hours (default: 8)
 */

const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

function getExpiryHours() {
  const h = parseInt(process.env.JWT_EXPIRY_HOURS || '8', 10);
  return Number.isFinite(h) && h > 0 ? h : 8;
}

/**
 * Sign a JWT for a user record.
 * Payload: { sub, username, role, allowedTabs }
 */
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      allowedTabs: user.allowedTabs || [],
      assistantScope: user.assistantScope || [],
    },
    getSecret(),
    { expiresIn: `${getExpiryHours()}h` }
  );
}

/**
 * Verify and decode a JWT.
 * Returns the decoded payload or null if the token is invalid or expired.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

/**
 * Extract the raw Bearer token string from an Authorization header value.
 * Returns null if the header is absent or not Bearer-prefixed.
 */
function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

module.exports = { signToken, verifyToken, extractBearerToken };
