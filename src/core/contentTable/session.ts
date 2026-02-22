/**
 * ContentTableSession — overlay model for per-session edits.
 *
 * The original UniversalContentTableV1 is never mutated.
 * Instead, edits are stored as overlays (editedItems, deletedIds)
 * and "effective items" are computed on the fly.
 *
 * Session is ephemeral: new plugin open = new session (no persistence).
 */

import type { ContentItemV1, UniversalContentTableV1 } from './types'

export interface ContentTableSession {
  /** The original scan result (immutable reference). */
  baseTable: UniversalContentTableV1
  /** Per-item field overrides keyed by item.id → partial ContentItemV1. */
  editedItems: Record<string, Partial<ContentItemV1>>
  /** Set of item IDs deleted in this session. */
  deletedIds: Set<string>
  /** Session-local duplicate groups (item IDs sharing the same content value). */
  duplicates: Map<string, string[]>
  /** Whether duplicate detection is active. */
  scanEnabled: boolean
  /** Item IDs flagged as possible (MED-confidence) duplicates. */
  flaggedDuplicateIds: Set<string>
  /** Item IDs flagged by ACE ignore-list rules with action=flag. */
  flaggedIgnoreIds: Set<string>
  /** Optional rule name by item id for ignore-flag tooltip/context. */
  ignoreRuleByItemId: Record<string, string>
  /** Count of HIGH-confidence duplicates skipped in the most recent scan/add. */
  lastSkippedCount: number
}

/**
 * Create a fresh session from a newly generated table.
 */
export function createSession(
  table: UniversalContentTableV1,
  opts?: {
    flaggedDuplicateIds?: Set<string>
    flaggedIgnoreIds?: Set<string>
    ignoreRuleByItemId?: Record<string, string>
    skippedCount?: number
  }
): ContentTableSession {
  const validIds = new Set(table.items.map(item => item.id))
  const ignoreFlags = new Set<string>()
  opts?.flaggedIgnoreIds?.forEach(id => { if (validIds.has(id)) ignoreFlags.add(id) })
  const ignoreRuleByItemId: Record<string, string> = {}
  if (opts?.ignoreRuleByItemId) {
    const initialRuleMap = opts.ignoreRuleByItemId
    Object.keys(opts.ignoreRuleByItemId).forEach((id) => {
      if (validIds.has(id)) ignoreRuleByItemId[id] = initialRuleMap[id]
    })
  }
  return {
    baseTable: table,
    editedItems: {},
    deletedIds: new Set(),
    duplicates: new Map(),
    scanEnabled: true,
    flaggedDuplicateIds: opts?.flaggedDuplicateIds ?? new Set(),
    flaggedIgnoreIds: ignoreFlags,
    ignoreRuleByItemId,
    lastSkippedCount: opts?.skippedCount ?? 0
  }
}

/**
 * Compute the effective items list by applying overlays to base items.
 * Deterministic: preserves original ordering, excludes deleted items.
 */
export function getEffectiveItems(session: ContentTableSession): ContentItemV1[] {
  return session.baseTable.items
    .filter(item => !session.deletedIds.has(item.id))
    .map(item => {
      const overrides = session.editedItems[item.id]
      if (!overrides) return item
      return applyOverrides(item, overrides)
    })
}

/**
 * Apply a field edit to the session. Returns a new session (immutable update).
 */
export function applyEdit(
  session: ContentTableSession,
  itemId: string,
  field: keyof ContentItemV1,
  value: unknown
): ContentTableSession {
  const existing = session.editedItems[itemId] || {}
  const updated: Partial<ContentItemV1> = { ...existing }

  if (field === 'content' && typeof value === 'string') {
    updated.content = { type: 'text', value }
  } else if (field === 'notes' && typeof value === 'string') {
    updated.notes = value
  } else if (field === 'contentKey' && typeof value === 'string') {
    updated.contentKey = value
  } else if (field === 'jiraTicket' && typeof value === 'string') {
    updated.jiraTicket = value
  } else if (field === 'adaNotes' && typeof value === 'string') {
    updated.adaNotes = value
  } else if (field === 'errorMessage' && typeof value === 'string') {
    updated.errorMessage = value
  }

  const newEdited = { ...session.editedItems, [itemId]: updated }
  const newSession = { ...session, editedItems: newEdited }

  if (newSession.scanEnabled) {
    newSession.duplicates = detectDuplicates(newSession)
  }

  return newSession
}

/**
 * Mark an item as deleted. Returns a new session (immutable update).
 */
export function deleteItem(session: ContentTableSession, itemId: string): ContentTableSession {
  const newDeleted = new Set(session.deletedIds)
  newDeleted.add(itemId)
  const newIgnoreFlags = new Set(session.flaggedIgnoreIds)
  newIgnoreFlags.delete(itemId)
  const newRuleMap = { ...session.ignoreRuleByItemId }
  delete newRuleMap[itemId]
  const newSession = {
    ...session,
    deletedIds: newDeleted,
    flaggedIgnoreIds: newIgnoreFlags,
    ignoreRuleByItemId: newRuleMap
  }

  if (newSession.scanEnabled) {
    newSession.duplicates = detectDuplicates(newSession)
  }

  return newSession
}

/**
 * Append new items to the session's base table. Returns a new session.
 * Existing edits/deletions are preserved; new items appear at the bottom.
 */
export function appendItems(
  session: ContentTableSession,
  newItems: ContentItemV1[],
  opts?: {
    flaggedDuplicateIds?: Set<string>
    flaggedIgnoreIds?: Set<string>
    ignoreRuleByItemId?: Record<string, string>
    skippedCount?: number
  }
): ContentTableSession {
  const updatedTable: UniversalContentTableV1 = {
    ...session.baseTable,
    items: [...session.baseTable.items, ...newItems]
  }
  const mergedFlags = new Set(session.flaggedDuplicateIds)
  if (opts?.flaggedDuplicateIds) {
    opts.flaggedDuplicateIds.forEach(id => mergedFlags.add(id))
  }
  const mergedIgnoreFlags = new Set(session.flaggedIgnoreIds)
  if (opts?.flaggedIgnoreIds) {
    opts.flaggedIgnoreIds.forEach(id => mergedIgnoreFlags.add(id))
  }
  const mergedIgnoreRules = { ...session.ignoreRuleByItemId, ...(opts?.ignoreRuleByItemId || {}) }
  const validIds = new Set(updatedTable.items.map(item => item.id))
  const prunedIgnoreFlags = new Set<string>()
  mergedIgnoreFlags.forEach(id => { if (validIds.has(id)) prunedIgnoreFlags.add(id) })
  const prunedIgnoreRules: Record<string, string> = {}
  Object.keys(mergedIgnoreRules).forEach((id) => {
    if (validIds.has(id)) prunedIgnoreRules[id] = mergedIgnoreRules[id]
  })
  const newSession: ContentTableSession = {
    ...session,
    baseTable: updatedTable,
    flaggedDuplicateIds: mergedFlags,
    flaggedIgnoreIds: prunedIgnoreFlags,
    ignoreRuleByItemId: prunedIgnoreRules,
    lastSkippedCount: opts?.skippedCount ?? 0
  }
  if (newSession.scanEnabled) {
    newSession.duplicates = detectDuplicates(newSession)
  }
  return newSession
}

/**
 * Toggle duplicate detection on/off. Returns a new session.
 */
export function toggleDuplicateScan(session: ContentTableSession, enabled: boolean): ContentTableSession {
  const newSession = { ...session, scanEnabled: enabled }
  newSession.duplicates = enabled ? detectDuplicates(newSession) : new Map()
  return newSession
}

/**
 * Detect duplicate content values across effective items.
 * Groups items by normalized content value; only groups with 2+ members are kept.
 */
function detectDuplicates(session: ContentTableSession): Map<string, string[]> {
  const effective = getEffectiveItems(session)
  const byValue = new Map<string, string[]>()

  for (const item of effective) {
    const val = item.content.value.trim().toLowerCase()
    if (!val) continue
    const list = byValue.get(val) || []
    list.push(item.id)
    byValue.set(val, list)
  }

  const dupes = new Map<string, string[]>()
  byValue.forEach((ids, val) => {
    if (ids.length > 1) dupes.set(val, ids)
  })
  return dupes
}

function applyOverrides(item: ContentItemV1, overrides: Partial<ContentItemV1>): ContentItemV1 {
  const merged = { ...item }
  if (overrides.content) merged.content = { ...item.content, ...overrides.content }
  if (overrides.notes !== undefined) merged.notes = overrides.notes
  if (overrides.contentKey !== undefined) merged.contentKey = overrides.contentKey
  if (overrides.jiraTicket !== undefined) merged.jiraTicket = overrides.jiraTicket
  if (overrides.adaNotes !== undefined) merged.adaNotes = overrides.adaNotes
  if (overrides.errorMessage !== undefined) merged.errorMessage = overrides.errorMessage
  return merged
}
