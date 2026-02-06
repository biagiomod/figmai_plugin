/**
 * ACE RBAC: role→tabs and role normalization.
 * Roles: admin, manager, editor, reviewer.
 */

export type AceRole = 'admin' | 'manager' | 'editor' | 'reviewer'

/** Tab ids that can appear in the left nav. */
export const ALL_TAB_IDS = [
  'config',
  'ai',
  'assistants',
  'knowledge',
  'content-models',
  'registries',
  'analytics',
  'users'
] as const

export type TabId = (typeof ALL_TAB_IDS)[number]

/**
 * Normalize legacy "owner" to "admin" for session/file compatibility.
 */
export function normalizeRole(role: string): AceRole {
  const r = (role || '').trim().toLowerCase()
  if (r === 'owner') return 'admin'
  if (r === 'admin' || r === 'manager' || r === 'editor' || r === 'reviewer') return r as AceRole
  return 'reviewer'
}

/**
 * Which left-nav tabs this role can access.
 * Admin/Manager/Editor: all tabs. Reviewer: config (read-only) + users (profile + logout).
 */
export function roleToAllowedTabs(role: AceRole): TabId[] {
  switch (role) {
    case 'admin':
    case 'manager':
    case 'editor':
      return [...ALL_TAB_IDS]
    case 'reviewer':
      return ['config', 'users']
    default:
      return ['config', 'users']
  }
}

const VALID_TAB_SET = new Set<string>(ALL_TAB_IDS)

/**
 * Effective allowed tabs: if per-user allowedTabs is set and non-empty, use it (filtered to valid ids);
 * otherwise use role default.
 */
export function getEffectiveAllowedTabs(
  role: AceRole,
  perUserTabs?: string[] | null
): TabId[] {
  if (Array.isArray(perUserTabs) && perUserTabs.length > 0) {
    const filtered = perUserTabs.filter((t) => VALID_TAB_SET.has(t))
    if (filtered.length > 0) return filtered as TabId[]
  }
  return roleToAllowedTabs(role)
}

/** Can this role access Users CRUD (list, create, update)? */
export function canManageUsers(role: AceRole): boolean {
  return role === 'admin'
}

/** Can this role call validate/preview/save? */
export function canValidateAndSave(role: AceRole): boolean {
  return role === 'admin' || role === 'manager' || role === 'editor'
}
