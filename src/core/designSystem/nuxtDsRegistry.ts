/**
 * Nuxt UI v4 Design System – PoC registry (code-side only).
 * Provides demo allowlist for Design Workshop when user includes "@ds-nuxt" in prompt.
 * Does not use the generic registry loader; data comes from generated nuxtDsCatalog.
 */

import { NUxtDemoAllowlist, type NuxtDemoAllowlistEntry } from '../../custom/generated/nuxtDsCatalog.generated'

/**
 * Return the full demo allowlist (for Design Workshop renderer).
 */
export function getNuxtDemoAllowlist(): NuxtDemoAllowlistEntry[] {
  return NUxtDemoAllowlist
}

/**
 * Return the first allowlist entry whose name matches (case-sensitive).
 * Used to resolve block type (button, input, card) to a Nuxt component key.
 */
export function getNuxtComponentByName(name: string): NuxtDemoAllowlistEntry | null {
  return NUxtDemoAllowlist.find((e) => e.name === name) ?? null
}
