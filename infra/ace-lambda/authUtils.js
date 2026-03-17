'use strict';

/**
 * Request authorization helpers.
 *
 * A request is authorized if its Bearer token is either:
 *   (a) the shared service token  — CONFIG_API_TOKEN env var
 *   (b) a valid, unexpired user JWT — signed with JWT_SECRET
 *
 * The service token is for scripts / CI. User JWTs are issued by POST /api/auth/login.
 */

const { verifyToken, extractBearerToken } = require('./jwtService');

/**
 * Returns true if the event carries a valid service token or user JWT.
 */
function isAuthorized(event) {
  const token = extractBearerToken(
    (event.headers || {})['authorization'] || (event.headers || {})['Authorization'] || ''
  );
  if (!token) return false;

  // Service token check (fast path — no crypto)
  const serviceToken = process.env.CONFIG_API_TOKEN;
  if (serviceToken && token === serviceToken) return true;

  // JWT check
  return verifyToken(token) !== null;
}

/**
 * Returns the decoded JWT payload for a user request, or null.
 * Returns null for service-token requests (no per-user identity).
 */
function getTokenUser(event) {
  const token = extractBearerToken(
    (event.headers || {})['authorization'] || (event.headers || {})['Authorization'] || ''
  );
  if (!token) return null;

  const serviceToken = process.env.CONFIG_API_TOKEN;
  if (serviceToken && token === serviceToken) return null;

  return verifyToken(token);
}

module.exports = { isAuthorized, getTokenUser };
