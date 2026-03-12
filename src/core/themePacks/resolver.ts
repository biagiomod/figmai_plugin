/**
 * Theme resolver (M1 — skin-only).
 *
 * Resolves a persisted skin ID into the concrete values the UI layer needs
 * (cssDataThemeValue).  Falls back to DEFAULT_SKIN_ID when the ID is
 * unknown or missing.
 *
 * DS integration (M3) will extend this to merge DS tokens on top.
 */

import { DEFAULT_SKIN_ID } from './defaults'
import { getSkinById, type SkinRegistration } from './registry'

export interface ResolvedTheme {
  skinId: string
  cssThemeValue: string
}

export function resolveTheme(skinId: string | undefined): ResolvedTheme {
  const skin: SkinRegistration | undefined = skinId ? getSkinById(skinId) : undefined
  if (skin) {
    return { skinId: skin.id, cssThemeValue: skin.cssDataThemeValue }
  }
  const fallback = getSkinById(DEFAULT_SKIN_ID)!
  return { skinId: fallback.id, cssThemeValue: fallback.cssDataThemeValue }
}
