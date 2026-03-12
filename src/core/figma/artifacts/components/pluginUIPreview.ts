/**
 * Plugin UI Preview artifact component.
 * Renders FigmAI plugin screens as editable Figma frames for design iteration.
 *
 * Artifact type: 'plugin-ui-preview'
 * Versions: 'light' | 'dark'
 */

import type { ArtifactComponent, ArtifactRenderContext } from '../index'
import { renderDarkDemoCard } from './darkDemoCardsRenderer'
import { getTokensForTheme } from './pluginUIThemeTokens'
import { PHASE_A_SCREENS } from './pluginUIScreenSpecs'
import { PLUGIN_W, CARD_GAP, LABEL_GAP, GRID_PADDING } from './pluginUISizing'

const LABEL_FONT_SIZE = 14

export interface PluginUIPreviewData {
  theme: string
}

export const pluginUIPreviewComponent: ArtifactComponent = {
  getDefaultWidth(): number {
    return PHASE_A_SCREENS.length * (PLUGIN_W + CARD_GAP) - CARD_GAP + GRID_PADDING * 2
  },

  async render(ctx: ArtifactRenderContext): Promise<void> {
    const { root } = ctx
    const data = ctx.data as PluginUIPreviewData
    const tokens = getTokensForTheme(data.theme)

    root.layoutMode = 'HORIZONTAL'
    root.primaryAxisSizingMode = 'AUTO'
    root.counterAxisSizingMode = 'AUTO'
    root.itemSpacing = CARD_GAP
    root.paddingTop = GRID_PADDING
    root.paddingRight = GRID_PADDING
    root.paddingBottom = GRID_PADDING
    root.paddingLeft = GRID_PADDING
    root.fills = []

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' })
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

    for (const screen of PHASE_A_SCREENS) {
      const cardWrapper = figma.createFrame()
      cardWrapper.name = screen.label
      cardWrapper.layoutMode = 'VERTICAL'
      cardWrapper.primaryAxisSizingMode = 'AUTO'
      cardWrapper.counterAxisSizingMode = 'AUTO'
      cardWrapper.itemSpacing = LABEL_GAP
      cardWrapper.fills = []
      cardWrapper.clipsContent = false

      const label = figma.createText()
      label.fontName = { family: 'Inter', style: 'Medium' }
      label.fontSize = LABEL_FONT_SIZE
      label.characters = screen.label
      label.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
      cardWrapper.appendChild(label)

      const spec = screen.build(tokens)
      const screenFrame = await renderDarkDemoCard(spec)

      // The shared renderer hardcodes root width to 320.
      // Override to match the spec's intended dimensions.
      const targetW = spec.width ?? PLUGIN_W
      if (targetW !== 320) {
        screenFrame.resize(targetW, screenFrame.height)
      }
      if (spec.height) {
        screenFrame.resize(screenFrame.width, spec.height)
        screenFrame.primaryAxisSizingMode = 'FIXED'
      }

      cardWrapper.appendChild(screenFrame)
      root.appendChild(cardWrapper)
    }
  }
}
