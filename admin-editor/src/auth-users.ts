/**
 * ACE user store: file-backed users at data/users.json with atomic writes.
 * Roles: admin, manager, editor, reviewer. Legacy "owner" is migrated to "admin".
 */

import * as fs from 'fs'
import * as path from 'path'
import { hash, compare } from 'bcryptjs'
import { normalizeRole, type AceRole } from './permissions'

export type Role = AceRole

/** Tab ids for per-user allowedTabs (must be subset of permissions.ALL_TAB_IDS). */
export type AllowedTabs = string[]

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  role: Role
  disabled?: boolean
  /** Per-user nav tabs; when set, overrides role default. */
  allowedTabs?: AllowedTabs
  /** Assistant IDs this user can access. Empty array means all assistants. */
  assistantScope?: string[]
  createdAt: string
  updatedAt: string
}

export interface UsersFile {
  version: 1
  users: UserRecord[]
}

const SALT_ROUNDS = 10
const USERS_FILENAME = 'users.json'

function getUsersPath(dataDir: string): string {
  return path.join(dataDir, USERS_FILENAME)
}

/** Migrate role "owner" -> "admin" in memory; optionally write back once. */
function migrateOwnerToAdmin(data: UsersFile): { data: UsersFile; didMigrate: boolean } {
  let didMigrate = false
  const users = data.users.map((u) => {
    const role = (u.role || '').trim().toLowerCase()
    if (role === 'owner') {
      didMigrate = true
      return { ...u, role: 'admin' as Role }
    }
    return { ...u, role: normalizeRole(u.role) as Role }
  })
  if (!didMigrate) return { data, didMigrate: false }
  return { data: { ...data, users }, didMigrate: true }
}

function readUsersFile(dataDir: string): UsersFile | null {
  const filePath = getUsersPath(dataDir)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as UsersFile
    if (parsed.version !== 1 || !Array.isArray(parsed.users)) return null
    const { data, didMigrate } = migrateOwnerToAdmin(parsed)
    if (didMigrate) writeUsersFile(dataDir, data)
    return data
  } catch {
    return null
  }
}

/** Atomic write: write to .tmp then rename. */
function writeUsersFile(dataDir: string, data: UsersFile): void {
  const filePath = getUsersPath(dataDir)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const tmpPath = filePath + '.' + Date.now() + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

function generateId(): string {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

/**
 * Load all users (excluding disabled by default).
 */
export function loadUsers(dataDir: string, includeDisabled = false): UserRecord[] {
  const file = readUsersFile(dataDir)
  if (!file) return []
  if (includeDisabled) return file.users
  return file.users.filter((u) => !u.disabled)
}

/**
 * Find user by id (any, including disabled).
 */
export function findUserById(dataDir: string, id: string): UserRecord | null {
  const file = readUsersFile(dataDir)
  if (!file) return null
  return file.users.find((u) => u.id === id) ?? null
}

/**
 * Find user by username (only non-disabled).
 */
export function findUserByUsername(dataDir: string, username: string): UserRecord | null {
  const users = loadUsers(dataDir, false)
  const normalized = username.trim().toLowerCase()
  return users.find((u) => u.username.toLowerCase() === normalized) ?? null
}

/**
 * Verify password against stored hash.
 */
export async function verifyPassword(plain: string, hashStr: string): Promise<boolean> {
  return compare(plain, hashStr)
}

/**
 * Create first admin (bootstrap). Fails if any active (enabled) user exists.
 */
export async function bootstrapAdmin(
  dataDir: string,
  username: string,
  password: string
): Promise<{ ok: true; user: UserRecord } | { ok: false; error: string }> {
  if (!isBootstrapAllowed(dataDir)) {
    return { ok: false, error: 'An active user already exists; bootstrap not allowed.' }
  }
  const trimmed = username.trim()
  if (!trimmed) return { ok: false, error: 'Username is required.' }
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  const passwordHash = await hash(password, SALT_ROUNDS)
  const now = new Date().toISOString()
  const user: UserRecord = {
    id: generateId(),
    username: trimmed,
    passwordHash,
    role: 'admin',
    disabled: false,
    createdAt: now,
    updatedAt: now
  }
  const data: UsersFile = {
    version: 1,
    users: [user]
  }
  writeUsersFile(dataDir, data)
  return { ok: true, user }
}

/**
 * Create a new user (admin only). Username must be unique.
 */
export async function createUser(
  dataDir: string,
  username: string,
  password: string,
  role: Role
): Promise<{ ok: true; user: UserRecord } | { ok: false; error: string }> {
  const trimmed = username.trim()
  if (!trimmed) return { ok: false, error: 'Username is required.' }
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  const allowedRoles: Role[] = ['admin', 'manager', 'editor', 'reviewer']
  if (!allowedRoles.includes(role)) return { ok: false, error: 'Invalid role.' }
  const file = readUsersFile(dataDir)
  const users = file ? [...file.users] : []
  const normalized = trimmed.toLowerCase()
  if (users.some((u) => u.username.toLowerCase() === normalized)) {
    return { ok: false, error: 'Username already exists.' }
  }
  const passwordHash = await hash(password, SALT_ROUNDS)
  const now = new Date().toISOString()
  const user: UserRecord = {
    id: generateId(),
    username: trimmed,
    passwordHash,
    role,
    disabled: false,
    createdAt: now,
    updatedAt: now
  }
  users.push(user)
  writeUsersFile(dataDir, { version: 1, users })
  return { ok: true, user }
}

/** Valid tab ids for allowedTabs (must match permissions.ALL_TAB_IDS). */
const VALID_TAB_IDS = new Set(['config', 'ai', 'assistants', 'knowledge', 'knowledge-bases', 'content-models', 'registries', 'analytics', 'users'])

/**
 * Update user: disable, change role, reset password, or set allowedTabs.
 */
export async function updateUser(
  dataDir: string,
  id: string,
  updates: { disabled?: boolean; role?: Role; password?: string; allowedTabs?: AllowedTabs; assistantScope?: string[] }
): Promise<{ ok: true; user: UserRecord } | { ok: false; error: string }> {
  const file = readUsersFile(dataDir)
  if (!file) return { ok: false, error: 'No users file.' }
  const index = file.users.findIndex((u) => u.id === id)
  if (index === -1) return { ok: false, error: 'User not found.' }
  const user = { ...file.users[index] }
  const now = new Date().toISOString()
  user.updatedAt = now
  if (typeof updates.disabled === 'boolean') user.disabled = updates.disabled
  if (updates.role !== undefined) {
    const allowed: Role[] = ['admin', 'manager', 'editor', 'reviewer']
    if (!allowed.includes(updates.role)) return { ok: false, error: 'Invalid role.' }
    user.role = updates.role
  }
  if (typeof updates.password === 'string') {
    if (updates.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
    user.passwordHash = await hash(updates.password, SALT_ROUNDS)
  }
  if (updates.allowedTabs !== undefined) {
    if (!Array.isArray(updates.allowedTabs)) return { ok: false, error: 'allowedTabs must be an array.' }
    const filtered = updates.allowedTabs.filter((t): t is string => typeof t === 'string' && VALID_TAB_IDS.has(t))
    user.allowedTabs = filtered.length > 0 ? filtered : undefined
  }
  if (updates.assistantScope !== undefined) {
    if (!Array.isArray(updates.assistantScope)) return { ok: false, error: 'assistantScope must be an array.' }
    user.assistantScope = updates.assistantScope.map((s) => String(s).trim()).filter(Boolean)
    if (user.assistantScope.length === 0) user.assistantScope = undefined
  }
  const users = [...file.users]
  users[index] = user
  writeUsersFile(dataDir, { version: 1, users })
  return { ok: true, user }
}

export type BootstrapAllowedResult = { allowed: boolean; reason?: string }

/**
 * Check if bootstrap is allowed: no users file, empty list, or all users disabled.
 * Returns { allowed: false, reason } when at least one enabled (active) user exists.
 * Active user = not disabled (disabled !== true).
 */
export function getBootstrapAllowedStatus(dataDir: string): BootstrapAllowedResult {
  const file = readUsersFile(dataDir)
  if (!file) return { allowed: true }
  if (file.users.length === 0) return { allowed: true }
  const activeCount = file.users.filter((u) => !u.disabled).length
  if (activeCount === 0) return { allowed: true }
  return { allowed: false, reason: 'At least one active user exists' }
}

/**
 * Check if bootstrap is allowed (no active users).
 */
export function isBootstrapAllowed(dataDir: string): boolean {
  return getBootstrapAllowedStatus(dataDir).allowed
}
