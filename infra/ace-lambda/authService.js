'use strict';

/**
 * Auth routes for the private/work Lambda API.
 *
 * Bootstrap flow:
 *   1. GET  /api/auth/bootstrap-allowed  — check if first-user setup is possible
 *   2. POST /api/auth/bootstrap          — create the first admin account
 *   3. POST /api/auth/login              — verify credentials, receive a signed JWT
 *   4. GET  /api/auth/me                 — decode JWT from Authorization header, return identity
 *   5. POST /api/auth/logout             — client discards token (stateless; JWTs expire naturally)
 *
 * Two token types are accepted by the auth guard:
 *   - Shared service token (CONFIG_API_TOKEN) — scripts, CI, direct API use
 *   - User JWT (JWT_SECRET)                   — ACE frontend sessions
 *
 * User data: S3 at admin/users.json (via userService).
 * JWTs:      signed/verified via jwtService (jsonwebtoken, JWT_SECRET env var).
 */

const bcrypt = require('bcryptjs');
const { signToken, verifyToken, extractBearerToken } = require('./jwtService');
const { readUsers, writeUsers, isBootstrapAllowed, generateId, SALT_ROUNDS } = require('./userService');
const { json, errorResponse, parseBody } = require('./responseUtils');

/**
 * Main auth route handler.
 * headers — raw Lambda event headers (needed by auth/me to read the Authorization value).
 */
async function handleAuth(method, path, body, origin, headers) {

  // GET /api/auth/me — decode JWT and return real identity
  if (method === 'GET' && path === '/figma-admin/api/auth/me') {
    const authHeader = (headers || {})['authorization'] || (headers || {})['Authorization'] || '';
    const token = extractBearerToken(authHeader);

    if (!token) return errorResponse(401, 'No token provided.', origin);

    // Service token: no per-user identity
    const serviceToken = process.env.CONFIG_API_TOKEN;
    if (serviceToken && token === serviceToken) {
      return json(200, { user: { username: 'service', role: 'admin' }, allowedTabs: [], tokenType: 'service' }, origin);
    }

    const payload = verifyToken(token);
    if (!payload) return errorResponse(401, 'Token is invalid or expired.', origin);

    return json(200, {
      user: { id: payload.sub, username: payload.username, role: payload.role },
      allowedTabs: payload.allowedTabs || [],
      tokenType: 'user',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
    }, origin);
  }

  // GET /api/auth/bootstrap-allowed
  if (method === 'GET' && path === '/figma-admin/api/auth/bootstrap-allowed') {
    const data = await readUsers();
    const allowed = isBootstrapAllowed(data.users);
    return json(200, {
      allowed,
      reason: allowed ? undefined : 'At least one active user exists',
    }, origin);
  }

  // POST /api/auth/bootstrap — create first admin, return JWT so the caller is immediately logged in
  if (
    method === 'POST' &&
    (path === '/figma-admin/api/auth/bootstrap' ||
      path === '/figma-admin/api/auth/bootstrap/create-first-account')
  ) {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const data = await readUsers();
    if (!isBootstrapAllowed(data.users)) {
      return errorResponse(403, 'Bootstrap not allowed: an active user already exists.', origin);
    }

    const { username, password } = payload;
    if (!username || !String(username).trim())
      return errorResponse(400, 'Username is required.', origin);
    if (!password || String(password).length < 8)
      return errorResponse(400, 'Password must be at least 8 characters.', origin);

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const now = new Date().toISOString();
    const user = {
      id: generateId(),
      username: String(username).trim(),
      passwordHash,
      role: 'admin',
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };
    await writeUsers({ version: 1, users: [user] });

    const token = signToken(user);
    const { passwordHash: _ph, ...safeUser } = user;
    return json(200, { success: true, user: safeUser, token }, origin);
  }

  // POST /api/auth/login — verify credentials, issue JWT
  if (method === 'POST' && path === '/figma-admin/api/auth/login') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const { username, password } = payload;
    if (!username || !password)
      return errorResponse(400, 'Username and password are required.', origin);

    const data = await readUsers();
    const user = data.users.find(
      (u) =>
        u.username.toLowerCase() === String(username).trim().toLowerCase() && !u.disabled
    );
    // Use a constant-time comparison path to avoid user enumeration via timing
    if (!user) {
      await bcrypt.hash('__dummy__', SALT_ROUNDS); // consume time even on miss
      return errorResponse(401, 'Invalid credentials.', origin);
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) return errorResponse(401, 'Invalid credentials.', origin);

    const token = signToken(user);
    const { passwordHash: _ph, ...safeUser } = user;
    return json(200, { success: true, user: safeUser, token }, origin);
  }

  // POST /api/auth/logout — JWT is stateless; client must discard the token.
  // Short expiry (JWT_EXPIRY_HOURS) is the primary protection after logout.
  if (method === 'POST' && path === '/figma-admin/api/auth/logout') {
    return json(200, { success: true }, origin);
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleAuth };
