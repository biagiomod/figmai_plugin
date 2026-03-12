/**
 * Skin registry — static list of available skins.
 *
 * Adding a new skin:
 *   1. Create  src/ui/styles/skins/<id>.css  with [data-theme="<id>"] overrides.
 *   2. Import the CSS file in  src/ui.tsx.
 *   3. Add an entry below.
 */

export interface SkinRegistration {
  /** Unique stable identifier (matches the CSS data-theme value). */
  id: string
  /** Human-readable label for the Settings dropdown. */
  name: string
  /** Value written to `document.documentElement.dataset.theme`. */
  cssDataThemeValue: string
}

const SKIN_REGISTRY: readonly SkinRegistration[] = [
  { id: 'light', name: 'Light',   cssDataThemeValue: 'light' },
  { id: 'dark',  name: 'Dark',    cssDataThemeValue: 'dark' },
  { id: 'neowave', name: 'NeoWave', cssDataThemeValue: 'neowave' },
] as const

export function listSkins(): readonly SkinRegistration[] {
  return SKIN_REGISTRY
}

export function getSkinById(id: string): SkinRegistration | undefined {
  return SKIN_REGISTRY.find(s => s.id === id)
}
