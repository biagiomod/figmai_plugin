import type { TableFormatPreset } from './types'
import type { PresetInfo } from './presets.generated'

/**
 * Single source of truth for CT-A preset ordering in UI selectors.
 */
export const CTA_PRESET_ORDER: TableFormatPreset[] = [
  'universal',
  'simple-worksheet',
  'content-only',
  'content-model-1',
  'mobile',
  'dev-only',
  'ada-only'
]

export function getOrderedCtaPresets(
  presets: PresetInfo[],
  options: { enabledOnly?: boolean } = {}
): PresetInfo[] {
  const { enabledOnly = true } = options
  const presetById = new Map<TableFormatPreset, PresetInfo>()
  for (const preset of presets) {
    presetById.set(preset.id, preset)
  }
  const ordered = CTA_PRESET_ORDER
    .map((id) => presetById.get(id))
    .filter((p): p is PresetInfo => !!p)
  return enabledOnly ? ordered.filter((p) => p.enabled) : ordered
}
