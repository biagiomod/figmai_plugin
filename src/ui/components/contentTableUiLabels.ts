import type { PresetInfo } from '../../core/contentTable/presets.generated'
import type { TableFormatPreset } from '../../core/contentTable/types'

export const CTA_DISPLAY_NAME = 'Evergreens'
export const CTA_STAGE_PREVIEW_TITLE = 'Evergreens Table Preview'
export const CTA_WELCOME_MATCHER = 'welcome to your evergreens assistant'

export const CTA_ACTION_LABELS = {
  appendSelection: 'Add Section',
  viewOnStage: 'See Full Table'
} as const

const SIMPLE_WORKSHEET_PRESET_ID: TableFormatPreset = 'simple-worksheet'
const UNIVERSAL_PRESET_ID: TableFormatPreset = 'universal'

export const CTA_DROPDOWN_SEPARATOR_VALUE = '__cta-separator__'
export const CTA_DROPDOWN_SEPARATOR_LABEL = '──────────'

export function getCtaPresetDisplayLabel(preset: PresetInfo): string {
  if (preset.id === SIMPLE_WORKSHEET_PRESET_ID) return 'Edit Evergreen'
  return preset.label
}

export function getCtaPresetDisplayOrder(presets: PresetInfo[]): PresetInfo[] {
  const byId = new Map<TableFormatPreset, PresetInfo>()
  for (const preset of presets) byId.set(preset.id, preset)

  const explicitOrder: TableFormatPreset[] = [
    SIMPLE_WORKSHEET_PRESET_ID,
    UNIVERSAL_PRESET_ID,
    'content-only',
    'content-model-1',
    'mobile',
    'dev-only',
    'ada-only'
  ]

  const ordered: PresetInfo[] = []
  for (const id of explicitOrder) {
    const preset = byId.get(id)
    if (preset) ordered.push(preset)
  }

  return ordered
}
