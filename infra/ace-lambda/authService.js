'use strict';

/**
 * Auth routes for the private/work Lambda API.
 *
 * In the private/work deployment the API Gateway handles the outer transport;
 * session management is left to the caller (e.g. a cookie set by a proxy, or
 * JWT issued by API Gateway Authorizer). These routes provide:
 *   - /api/auth/me          — identity stub (always returns admin in Bearer-token mode)
 *   - /api/auth/bootstrap-allowed — check if first-user bootstrap is possible
 *   - /api/auth/bootstrap   — create the first admin account
 *   - /api/auth/login       — verify credentials, return user info
 *   - /api/auth/logout      — stateless OK response
 *
 * User data is stored in S3 at admin/users.json via userService.
 */

const bcrypt = require('bcryptjs');
const { readUsers, writeUsers, isBootstrapAllowed, normalizeRole, generateId, SALT_ROUNDS } = require('./userService');
const { json, errorResponse, parseBody } = require('./responseUtils');

async function handleAuth(method, path, body, origin) {
  // GET /api/auth/me
  if (method === 'GET' && path === '/api/auth/me') {
    // In Bearer-token mode there is no per-user identity at the API layer.
    // Return a generic admin identity. Extend this when per-user JWT is added.
    return json(200, { user: { username: 'admin', role: 'admin' }, allowedTabs: [] }, origin);
  }

  // GET /api/auth/bootstrap-allowed
  if (method === 'GET' && path === '/api/auth/bootstrap-allowed') {
    const data = await readUsers();
    const allowed = isBootstrapAllowed(data.users);
    return json(200, {
      allowed,
      reason: allowed ? undefined : 'At least one active user exists',
    }, origin);
  }

  // POST /api/auth/logout — stateless; nothing to invalidate in Bearer-token mode
  if (method === 'POST' && path === '/api/auth/logout') {
    return json(200, { success: true }, origin);
  }

  // POST /api/auth/bootstrap — create first admin account
  if (
    method === 'POST' &&
    (path === '/api/auth/bootstrap' || path === '/api/auth/bootstrap/create-first-account')
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
    const { passwordHash: _ph, ...safeUser } = user;
    return json(200, { success: true, user: safeUser }, origin);
  }

  // POST /api/auth/login — verify credentials
  if (method === 'POST' && path === '/api/auth/login') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const { username, password } = payload;
    if (!username || !password)
      return errorResponse(400, 'Username and password are required.', origin);

    const data = await readUsers();
    const user = data.users.find(
      (u) => u.username.toLowerCase() === String(username).trim().toLowerCase() && !u.disabled
    );
    if (!user) return errorResponse(401, 'Invalid credentials.', origin);

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) return errorResponse(401, 'Invalid credentials.', origin);

    const { passwordHash: _ph, ...safeUser } = user;
    return json(200, { success: true, user: safeUser }, origin);
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleAuth };
