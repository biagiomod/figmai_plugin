'use strict';

/**
 * User store backed by S3 at admin/users.json.
 * Mirrors the file-backed logic in admin-editor/src/auth-users.ts.
 *
 * Exports both admin-facing HTTP handlers (handleUsers) and
 * low-level user data helpers (readUsers, isBootstrapAllowed) used by authService.
 */

const bcrypt = require('bcryptjs');
const { getObjectText, putObjectText } = require('./storageService');
const { json, errorResponse, parseBody } = require('./responseUtils');

const USERS_PATH = 'admin/users.json';
const SALT_ROUNDS = 10;
const ALLOWED_ROLES = ['admin', 'manager', 'editor', 'reviewer'];
const VALID_TAB_IDS = new Set([
  'config', 'ai', 'assistants', 'knowledge', 'knowledge-bases',
  'content-models', 'registries', 'analytics', 'users',
]);

function generateId() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function normalizeRole(role) {
  const r = (role || '').trim().toLowerCase();
  if (r === 'owner' || r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  if (r === 'editor') return 'editor';
  if (r === 'reviewer') return 'reviewer';
  return 'editor';
}

/**
 * Read users file from S3. Returns { version: 1, users: [] } if missing or invalid.
 */
async function readUsers() {
  const raw = await getObjectText(USERS_PATH);
  if (!raw) return { version: 1, users: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.users)) return { version: 1, users: [] };
    const users = parsed.users.map((u) => ({ ...u, role: normalizeRole(u.role) }));
    return { version: 1, users };
  } catch {
    return { version: 1, users: [] };
  }
}

async function writeUsers(data) {
  await putObjectText(USERS_PATH, JSON.stringify(data, null, 2) + '\n', 'application/json');
}

/**
 * Bootstrap is allowed when no active (non-disabled) users exist.
 */
function isBootstrapAllowed(users) {
  return users.filter((u) => !u.disabled).length === 0;
}

/** Strip passwordHash from a user record before sending to clients. */
function safeUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// --- HTTP handlers ---

async function handleUsers(method, path, body, requestId, origin) {
  // GET /api/users
  if (method === 'GET' && path === '/api/users') {
    const data = await readUsers();
    return json(200, { users: data.users.map(safeUser) }, origin);
  }

  // POST /api/users — create
  if (method === 'POST' && path === '/api/users') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const { username, password, role } = payload;
    if (!username || !username.trim()) return errorResponse(400, 'Username is required.', origin);
    if (!password || password.length < 8)
      return errorResponse(400, 'Password must be at least 8 characters.', origin);
    const normalizedRole = normalizeRole(role);
    if (!ALLOWED_ROLES.includes(normalizedRole))
      return errorResponse(400, 'Invalid role.', origin);

    const data = await readUsers();
    if (data.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase()))
      return errorResponse(409, 'Username already exists.', origin);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();
    const user = {
      id: generateId(),
      username: username.trim(),
      passwordHash,
      role: normalizedRole,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };
    data.users.push(user);
    await writeUsers(data);
    console.log(JSON.stringify({ type: 'action', action: 'user-create', requestId, userId: user.id }));
    return json(201, safeUser(user), origin);
  }

  // PATCH /api/users/:id
  const idMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (method === 'PATCH' && idMatch) {
    const id = idMatch[1];
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }

    const data = await readUsers();
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx === -1) return errorResponse(404, 'User not found.', origin);

    const user = { ...data.users[idx], updatedAt: new Date().toISOString() };
    if (typeof payload.disabled === 'boolean') user.disabled = payload.disabled;
    if (payload.role !== undefined) {
      const r = normalizeRole(payload.role);
      if (!ALLOWED_ROLES.includes(r)) return errorResponse(400, 'Invalid role.', origin);
      user.role = r;
    }
    if (typeof payload.password === 'string') {
      if (payload.password.length < 8)
        return errorResponse(400, 'Password must be at least 8 characters.', origin);
      user.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
    }
    if (payload.allowedTabs !== undefined) {
      if (!Array.isArray(payload.allowedTabs))
        return errorResponse(400, 'allowedTabs must be an array.', origin);
      const filtered = payload.allowedTabs.filter(
        (t) => typeof t === 'string' && VALID_TAB_IDS.has(t)
      );
      user.allowedTabs = filtered.length > 0 ? filtered : undefined;
    }

    data.users[idx] = user;
    await writeUsers(data);
    console.log(JSON.stringify({ type: 'action', action: 'user-update', requestId, userId: id }));
    return json(200, safeUser(user), origin);
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleUsers, readUsers, writeUsers, isBootstrapAllowed, normalizeRole, generateId, SALT_ROUNDS };
