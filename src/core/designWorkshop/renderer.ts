/**
 * Design Workshop Renderer
 * 
 * Renders DesignSpecV1 to Figma canvas as a Section containing 1-5 screen frames.
 * Section placement: below lowest existing node + 120px, or at origin if no nodes.
 */

import type { DesignSpecV1, BlockSpec, RenderReport } from './types'
import { loadFonts, safeLoadFontAsync, createTextNode, createAutoLayoutFrameSafe } from '../stage/primitives'
import { placeBatchBelowPageContent } from '../figma/placement'
import { getNuxtDemoAllowlist } from '../designSystem/nuxtDsRegistry'
import { createInstanceOnly } from '../designSystem/componentService'
import type { NuxtDemoAllowlistEntry } from '../../custom/generated/nuxtDsCatalog.generated'
import { JAZZ_RGB, JAZZ_RADIUS } from './jazzContext'
import { isLikelyTicker, TICKER_COLORS } from './stockLogos'

/** Convert a #RRGGBB hex string to Figma 0–1 RGB floats. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16) / 255,
    g: parseInt(c.slice(2, 4), 16) / 255,
    b: parseInt(c.slice(4, 6), 16) / 255,
  }
}

export interface RenderDesignSpecOptions {
  useNuxtDs?: boolean
  useJazz?: boolean
}

/**
 * Load Jazz DS fonts: Open Sans Regular + SemiBold (weight 400/600).
 * Falls back to Inter SemiBold if Open Sans is not installed.
 */
async function loadJazzFonts(): Promise<{ regular: FontName; bold: FontName }> {
  const regular: FontName = { family: 'Open Sans', style: 'Regular' }
  const semiBold: FontName = { family: 'Open Sans', style: 'SemiBold' }
  try {
    await Promise.all([safeLoadFontAsync(regular), safeLoadFontAsync(semiBold)])
    return { regular, bold: semiBold }
  } catch {
    // Open Sans not installed — try Inter SemiBold as closest weight match
    try {
      const interRegular: FontName = { family: 'Inter', style: 'Regular' }
      const interSemiBold: FontName = { family: 'Inter', style: 'Semi Bold' }
      await Promise.all([safeLoadFontAsync(interRegular), safeLoadFontAsync(interSemiBold)])
      return { regular: interRegular, bold: interSemiBold }
    } catch {
      const fallback = await loadFonts()
      return { regular: fallback.regular, bold: fallback.bold }
    }
  }
}

/**
 * Render Design Spec to Section
 * 
 * Creates a new Section (FrameNode) on the current page and places 1-5 screen frames inside it.
 * Screens are arranged horizontally with 80px spacing.
 * When options.useNuxtDs is true, tries to place Nuxt UI components for button/input/card blocks.
 * 
 * @param spec - Normalized DesignSpecV1
 * @param runId - Run identifier for logging
 * @param options - useNuxtDs: when true, attempt Nuxt DS instances for button/input/card
 * @returns Section node, screens, report, and usedDsFallback (true if any block fell back to primitive due to DS failure)
 */
export async function renderDesignSpecToSection(
  spec: DesignSpecV1,
  runId?: string,
  options?: RenderDesignSpecOptions
): Promise<{ section: FrameNode, screens: FrameNode[], report: RenderReport, usedDsFallback?: boolean }> {
  // Pre-warm fonts once before any rendering begins — avoids per-block async overhead
  if (options?.useJazz === true) {
    await loadJazzFonts()
  } else {
    await loadFonts()
  }

  // Initialize render report
  const report: RenderReport = {
    consumedFields: [],
    unusedFields: [],
    fallbacks: []
  }
  
  // Track consumed fields
  const consumedFields = new Set<string>()
  
  // Track fidelity usage
  if (spec.render?.intent?.fidelity) {
    consumedFields.add('render.intent.fidelity')
    report.consumedFields.push({
      field: 'render.intent.fidelity',
      value: spec.render.intent.fidelity,
      influence: `Applied ${spec.render.intent.fidelity} fidelity styling (typography, corners, shadows)`
    })
  }
  
  // Track intent usage
  if (spec.meta?.intent) {
    const intent = spec.meta.intent
    if (intent.appType) {
      consumedFields.add('meta.intent.appType')
      report.consumedFields.push({
        field: 'meta.intent.appType',
        value: intent.appType,
        influence: `Influenced screen content and naming for ${intent.appType} app type`
      })
    }
    if (intent.tone) {
      consumedFields.add('meta.intent.tone')
      report.consumedFields.push({
        field: 'meta.intent.tone',
        value: intent.tone,
        influence: `Applied ${intent.tone} tone styling (corner radius, color palette)`
      })
    }
    if (intent.primaryColor) {
      consumedFields.add('meta.intent.primaryColor')
      report.consumedFields.push({
        field: 'meta.intent.primaryColor',
        value: intent.primaryColor,
        influence: `Used ${intent.primaryColor} as primary color in buttons and accents`
      })
    }
    if (intent.accentColors && intent.accentColors.length > 0) {
      consumedFields.add('meta.intent.accentColors')
      // Note: Currently only first accent color is used
      if (intent.accentColors.length > 1) {
        report.unusedFields.push({
          field: 'meta.intent.accentColors[1+]',
          value: intent.accentColors.slice(1),
          reason: 'Only first accent color is currently supported in rendering'
        })
      }
      report.consumedFields.push({
        field: 'meta.intent.accentColors[0]',
        value: intent.accentColors[0],
        influence: `Used ${intent.accentColors[0]} as accent color`
      })
    }
  }
  
  // Track style keywords
  if (spec.render?.intent?.styleKeywords && spec.render.intent.styleKeywords.length > 0) {
    consumedFields.add('render.intent.styleKeywords')
    report.consumedFields.push({
      field: 'render.intent.styleKeywords',
      value: spec.render.intent.styleKeywords,
      influence: `Applied style keywords: ${spec.render.intent.styleKeywords.join(', ')}`
    })
  }
  
  // Track brand tone
  if (spec.render?.intent?.brandTone) {
    consumedFields.add('render.intent.brandTone')
    report.consumedFields.push({
      field: 'render.intent.brandTone',
      value: spec.render.intent.brandTone,
      influence: `Applied brand tone: ${spec.render.intent.brandTone}`
    })
  }
  
  // Track density
  if (spec.render?.intent?.density) {
    consumedFields.add('render.intent.density')
    report.consumedFields.push({
      field: 'render.intent.density',
      value: spec.render.intent.density,
      influence: `Applied ${spec.render.intent.density} density (spacing adjustments)`
    })
  } else {
    report.fallbacks.push({
      field: 'render.intent.density',
      fallback: 'default comfortable density'
    })
  }
  
  // Check for unused fields
  if (spec.meta?.intent?.keywords && spec.meta.intent.keywords.length > 0) {
    if (!consumedFields.has('meta.intent.keywords')) {
      report.unusedFields.push({
        field: 'meta.intent.keywords',
        value: spec.meta.intent.keywords,
        reason: 'Keywords are extracted but not yet used in rendering logic'
      })
    }
  }
  
  if (spec.meta?.intent?.avoidColors && spec.meta.intent.avoidColors.length > 0) {
    report.unusedFields.push({
      field: 'meta.intent.avoidColors',
      value: spec.meta.intent.avoidColors,
      reason: 'Avoid colors not yet implemented in rendering'
    })
  }
  
  if (spec.meta?.intent?.theme) {
    report.unusedFields.push({
      field: 'meta.intent.theme',
      value: spec.meta.intent.theme,
      reason: 'Theme (light/dark) not yet implemented in rendering'
    })
  }
  // Create Section (using FrameNode as SectionNode may not be available)
  const section = figma.createFrame()
  section.name = `Design Workshop — ${spec.meta.title || 'Screens'}`
  
  // Set up section with horizontal auto-layout for screens
  section.layoutMode = 'HORIZONTAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 80
  section.paddingTop = 40
  section.paddingRight = 40
  section.paddingBottom = 40
  section.paddingLeft = 40

  // Create screen frames
  const screens: FrameNode[] = []
  const fidelity = spec.render.intent.fidelity
  const intent = spec.meta?.intent
  const useNuxtDs = options?.useNuxtDs === true
  const useJazz = options?.useJazz === true
  const nuxtAllowlist: NuxtDemoAllowlistEntry[] = useNuxtDs ? getNuxtDemoAllowlist() : []
  let usedDsFallback = false

  for (const screenSpec of spec.screens) {
    const screenResult = await renderScreen(screenSpec, spec.canvas.device, fidelity, intent, useNuxtDs, nuxtAllowlist, useJazz)
    section.appendChild(screenResult.frame)
    screens.push(screenResult.frame)
    if (screenResult.usedDsFallback) usedDsFallback = true
  }

  try {
    placeBatchBelowPageContent(section, { marginTop: 24 })
  } catch (e) {
    section.x = 0
    section.y = 100
  }
  return { section, screens, report, usedDsFallback }
}

/**
 * Render a single screen frame.
 * When useNuxtDs is true, tries Nuxt DS for button/input/card blocks; falls back to primitives on failure.
 */
async function renderScreen(
  screenSpec: DesignSpecV1['screens'][0],
  device: DesignSpecV1['canvas']['device'],
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  intent?: DesignSpecV1['meta']['intent'],
  useNuxtDs?: boolean,
  nuxtAllowlist: NuxtDemoAllowlistEntry[] = [],
  useJazz?: boolean
): Promise<{ frame: FrameNode, usedDsFallback: boolean }> {
  const screenFrame = figma.createFrame()
  screenFrame.name = screenSpec.name || 'Screen'
  screenFrame.resize(device.width, device.height)

  const layout = screenSpec.layout || { direction: 'vertical', padding: 16, gap: 12 }
  const useChrome = useJazz === true && device.kind === 'mobile'

  let blockContainer: FrameNode
  let maxWidth: number

  if (useChrome) {
    // Jazz mobile: fixed-size screen frame with status bar + nav bar chrome
    screenFrame.layoutMode = 'VERTICAL'
    screenFrame.primaryAxisSizingMode = 'FIXED'
    screenFrame.counterAxisSizingMode = 'FIXED'
    screenFrame.itemSpacing = 0
    screenFrame.paddingTop = 0
    screenFrame.paddingRight = 0
    screenFrame.paddingBottom = 0
    screenFrame.paddingLeft = 0
    screenFrame.clipsContent = true

    const fonts = await loadJazzFonts()

    // Status bar (44px tall, Jazz navy)
    const statusBar = await createStatusBar(device.width, fonts)
    screenFrame.appendChild(statusBar)
    statusBar.layoutSizingHorizontal = 'FILL'

    // Nav bar (44px tall, Jazz primary blue, screen name as title)
    const navBar = await createNavBar(screenSpec.name || 'Screen', device.width, fonts)
    screenFrame.appendChild(navBar)
    navBar.layoutSizingHorizontal = 'FILL'

    // Content frame below chrome — holds all blocks
    let padTop: number, padRight: number, padBottom: number, padLeft: number
    if (typeof layout.padding === 'number') {
      padTop = padBottom = layout.padding
      padLeft = padRight = layout.padding
    } else if (layout.padding) {
      padTop = layout.padding.top ?? 24
      padBottom = layout.padding.bottom ?? 24
      padLeft = layout.padding.left ?? 20
      padRight = layout.padding.right ?? 20
    } else {
      padTop = padBottom = 24
      padLeft = padRight = 20
    }
    const gap = layout.gap ?? 16

    const contentFrame = figma.createFrame()
    contentFrame.name = 'Content'
    contentFrame.layoutMode = layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
    contentFrame.primaryAxisSizingMode = 'AUTO'
    contentFrame.counterAxisSizingMode = 'AUTO'
    contentFrame.paddingTop = padTop
    contentFrame.paddingRight = padRight
    contentFrame.paddingBottom = padBottom
    contentFrame.paddingLeft = padLeft
    contentFrame.itemSpacing = gap
    contentFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
    contentFrame.clipsContent = true

    screenFrame.appendChild(contentFrame)
    contentFrame.layoutSizingHorizontal = 'FILL'
    contentFrame.layoutSizingVertical = 'FILL'

    maxWidth = device.width - padLeft - padRight
    blockContainer = contentFrame
  } else {
    // Non-Jazz or non-mobile: original layout behavior
    screenFrame.layoutMode = layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
    screenFrame.primaryAxisSizingMode = 'AUTO'
    screenFrame.counterAxisSizingMode = 'AUTO'

    const defaultPadV = useJazz ? 24 : 16
    const defaultPadH = useJazz ? 20 : 16
    if (typeof layout.padding === 'number') {
      screenFrame.paddingTop = layout.padding
      screenFrame.paddingRight = layout.padding
      screenFrame.paddingBottom = layout.padding
      screenFrame.paddingLeft = layout.padding
    } else if (layout.padding) {
      screenFrame.paddingTop = layout.padding.top ?? defaultPadV
      screenFrame.paddingRight = layout.padding.right ?? defaultPadH
      screenFrame.paddingBottom = layout.padding.bottom ?? defaultPadV
      screenFrame.paddingLeft = layout.padding.left ?? defaultPadH
    } else {
      screenFrame.paddingTop = defaultPadV
      screenFrame.paddingRight = defaultPadH
      screenFrame.paddingBottom = defaultPadV
      screenFrame.paddingLeft = defaultPadH
    }
    screenFrame.itemSpacing = layout.gap ?? (useJazz ? 16 : 12)
    maxWidth = device.width - (screenFrame.paddingLeft + screenFrame.paddingRight)
    blockContainer = screenFrame
  }

  let usedDsFallback = false

  /** Append a block node to a container, setting layoutSizingHorizontal=FILL when in chrome mode. */
  const appendBlock = (container: FrameNode, node: SceneNode) => {
    container.appendChild(node)
    if (useChrome && 'layoutSizingHorizontal' in node) {
      (node as FrameNode).layoutSizingHorizontal = 'FILL'
    }
  }

  if (useChrome) {
    // Jazz mobile: body blocks first, then buttons at the bottom (UX best practice)
    const bodyBlocks = screenSpec.blocks.filter(b => b.type !== 'button')
    const actionBlocks = screenSpec.blocks.filter(b => b.type === 'button')

    for (const block of bodyBlocks) {
      if (useNuxtDs && (block.type === 'input' || block.type === 'card')) {
        const nuxtNode = await tryCreateNuxtBlock(block, nuxtAllowlist)
        if (nuxtNode) { appendBlock(blockContainer, nuxtNode); continue }
        usedDsFallback = true
      }
      appendBlock(blockContainer, await renderBlock(block, fidelity, maxWidth, intent, useJazz))
    }

    if (actionBlocks.length > 0 && bodyBlocks.length > 0) {
      // Grow spacer pushes action buttons to the bottom of the content frame
      const growSpacer = figma.createFrame()
      growSpacer.name = 'Spacer'
      growSpacer.fills = []
      growSpacer.strokes = []
      growSpacer.resize(maxWidth, 1)
      growSpacer.layoutGrow = 1
      blockContainer.appendChild(growSpacer)
      growSpacer.layoutSizingHorizontal = 'FILL'
    }

    for (const block of actionBlocks) {
      if (useNuxtDs) {
        const nuxtNode = await tryCreateNuxtBlock(block, nuxtAllowlist)
        if (nuxtNode) { appendBlock(blockContainer, nuxtNode); continue }
        usedDsFallback = true
      }
      appendBlock(blockContainer, await renderBlock(block, fidelity, maxWidth, intent, useJazz))
    }
  } else {
    // Non-chrome: render blocks in original order
    for (const block of screenSpec.blocks) {
      if (useNuxtDs && (block.type === 'button' || block.type === 'input' || block.type === 'card')) {
        const nuxtNode = await tryCreateNuxtBlock(block, nuxtAllowlist)
        if (nuxtNode) {
          blockContainer.appendChild(nuxtNode)
          continue
        }
        usedDsFallback = true
      }
      blockContainer.appendChild(await renderBlock(block, fidelity, maxWidth, intent, useJazz))
    }
  }

  // Apply fidelity styling to outer screen frame
  applyFidelityStyling(screenFrame, fidelity, intent, useJazz)

  // Jazz chrome screens use a larger corner radius for phone appearance
  if (useChrome) {
    screenFrame.cornerRadius = 8
  }

  return { frame: screenFrame, usedDsFallback }
}

/**
 * Create the iOS-style status bar (9:41 time + WiFi/battery indicators).
 * Navy background, white text, 44px tall.
 */
async function createStatusBar(
  width: number,
  fonts: { regular: FontName; bold: FontName }
): Promise<FrameNode> {
  const bar = figma.createFrame()
  bar.name = 'Status Bar'
  bar.layoutMode = 'HORIZONTAL'
  bar.primaryAxisSizingMode = 'FIXED'
  bar.counterAxisSizingMode = 'FIXED'
  bar.resize(width, 44)
  bar.fills = [{ type: 'SOLID', color: JAZZ_RGB.navy }]
  bar.paddingTop = 14
  bar.paddingBottom = 10
  bar.paddingLeft = 20
  bar.paddingRight = 20
  bar.primaryAxisAlignItems = 'SPACE_BETWEEN'
  bar.counterAxisAlignItems = 'CENTER'
  bar.itemSpacing = 0

  const white: Paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }
  const timeText = await createTextNode('9:41', { fontSize: 12, fontName: fonts.bold, fills: [white] })
  const iconsText = await createTextNode('●●●  WiFi  ▪', { fontSize: 11, fontName: fonts.regular, fills: [white] })

  bar.appendChild(timeText)
  bar.appendChild(iconsText)

  return bar
}

/**
 * Create the navigation bar showing the screen title.
 * Jazz primary blue background, white bold text, 44px tall.
 */
async function createNavBar(
  title: string,
  width: number,
  fonts: { regular: FontName; bold: FontName }
): Promise<FrameNode> {
  const bar = figma.createFrame()
  bar.name = 'Nav Bar'
  bar.layoutMode = 'HORIZONTAL'
  bar.primaryAxisSizingMode = 'FIXED'
  bar.counterAxisSizingMode = 'FIXED'
  bar.resize(width, 44)
  bar.fills = [{ type: 'SOLID', color: JAZZ_RGB.primary }]
  bar.paddingTop = 10
  bar.paddingBottom = 10
  bar.paddingLeft = 20
  bar.paddingRight = 20
  bar.counterAxisAlignItems = 'CENTER'
  bar.itemSpacing = 0

  const white: Paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }
  const titleText = await createTextNode(title, { fontSize: 13, fontName: fonts.bold, fills: [white] })

  bar.appendChild(titleText)

  return bar
}

/**
 * Try to create a Nuxt DS instance for a block. Returns null if no allowlist match or import fails.
 * Uses defaultVariant from allowlist entry; does not map DesignSpec variants to Nuxt axes for PoC.
 * Passes entry.kind so component_set keys use importComponentSetByKeyAsync.
 */
async function tryCreateNuxtBlock(
  block: BlockSpec,
  allowlist: NuxtDemoAllowlistEntry[]
): Promise<InstanceNode | null> {
  const entry = resolveNuxtEntryForBlock(block, allowlist)
  if (!entry) return null
  const kind: 'component' | 'component_set' = entry.kind === 'component_set' ? 'component_set' : 'component'
  console.log(`[DW Nuxt DS] attempt name=${entry.name} key=${entry.key} kind=${kind}`)
  const variantProps = entry.defaultVariant ? { ...entry.defaultVariant } : undefined
  const instance = await createInstanceOnly(entry.key, variantProps, kind)
  return instance
}

/** Resolve block type to an allowlist entry (by name). Prefer first match in order. */
function resolveNuxtEntryForBlock(block: BlockSpec, allowlist: NuxtDemoAllowlistEntry[]): NuxtDemoAllowlistEntry | null {
  const namesToTry: string[] = []
  if (block.type === 'button') {
    namesToTry.push('ButtonPrimary', 'ButtonGroup', 'Button')
  } else if (block.type === 'input') {
    namesToTry.push('InputOutline', 'InputSoft', 'Input')
  } else if (block.type === 'card') {
    namesToTry.push('Card')
  } else {
    return null
  }
  for (const name of namesToTry) {
    const entry = allowlist.find((e) => e.name === name)
    if (entry) return entry
  }
  return null
}

/**
 * Render a block to a Figma node
 */
async function renderBlock(
  block: BlockSpec,
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  maxWidth: number,
  intent?: DesignSpecV1['meta']['intent'],
  useJazz?: boolean
): Promise<SceneNode> {
  const fonts = useJazz ? await loadJazzFonts() : await loadFonts()

  switch (block.type) {
    case 'heading': {
      const textNode = await createTextNode(block.text, {
        fontSize: getHeadingSize(block.level || 1, fidelity, useJazz),
        fontName: fonts.bold,
        fills: [getTextColor(fidelity, useJazz)]
      })
      textNode.name = `Heading ${block.level || 1}`
      textNode.resize(maxWidth, textNode.height)
      return textNode
    }

    case 'bodyText': {
      const textNode = await createTextNode(block.text, {
        fontSize: getBodyTextSize(fidelity, useJazz),
        fontName: fonts.regular,
        fills: [getTextColor(fidelity, useJazz)]
      })
      textNode.name = 'Body Text'
      textNode.resize(maxWidth, textNode.height)
      return textNode
    }

    case 'button': {
      const btnPad = useJazz
        ? { top: 14, right: 16, bottom: 14, left: 16 }
        : { top: 12, right: 24, bottom: 12, left: 24 }
      const buttonFrame = createAutoLayoutFrameSafe('Button', 'HORIZONTAL', {
        padding: btnPad,
        gap: 8,
        primaryAxisAlign: 'CENTER',
        counterAxisAlign: 'CENTER'
      })

      const buttonText = await createTextNode(block.text, {
        fontSize: getButtonTextSize(fidelity),
        fontName: fonts.bold,
        fills: [getButtonTextColor(block.variant || 'primary', fidelity, useJazz)]
      })
      buttonFrame.appendChild(buttonText)

      // Apply button styling (use intent colors if available)
      buttonFrame.fills = [getButtonFill(block.variant || 'primary', fidelity, intent, useJazz)]
      buttonFrame.strokes = [getButtonStroke(block.variant || 'primary', fidelity, intent, useJazz)]
      buttonFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      buttonFrame.effects = getButtonEffects(fidelity)

      buttonFrame.resize(maxWidth, buttonFrame.height)
      return buttonFrame
    }

    case 'input': {
      const inputFrame = createAutoLayoutFrameSafe('Input', 'VERTICAL', {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        gap: 4
      })

      if (block.label) {
        const labelText = await createTextNode(block.label, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [getTextColor(fidelity, useJazz)]
        })
        inputFrame.appendChild(labelText)
        labelText.layoutSizingHorizontal = 'FILL'
      }

      const inputText = await createTextNode(block.placeholder || '', {
        fontSize: getBodyTextSize(fidelity, useJazz),
        fontName: fonts.regular,
        fills: [getPlaceholderColor(fidelity)]
      })
      // Note: inputType is available but not used in primitive rendering
      inputFrame.appendChild(inputText)
      inputText.layoutSizingHorizontal = 'FILL'

      // Apply input styling
      inputFrame.fills = [getInputFill(fidelity, useJazz)]
      inputFrame.strokes = [getInputStroke(fidelity, intent, useJazz)]
      inputFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      inputFrame.effects = getInputEffects(fidelity)

      inputFrame.counterAxisSizingMode = 'FIXED'
      inputFrame.resize(maxWidth, inputFrame.height)
      return inputFrame
    }

    case 'card': {
      // Jazz ticker position card: colored brand badge + symbol + value/change
      if (useJazz && isLikelyTicker(block.title ?? '')) {
        const ticker = block.title!
        const brandRgb = hexToRgb(TICKER_COLORS[ticker] ?? '#005EB8')

        const cardFrame = createAutoLayoutFrameSafe('Card-' + ticker, 'HORIZONTAL', {
          padding: { top: 10, right: 12, bottom: 10, left: 12 },
          gap: 10,
        })
        cardFrame.counterAxisAlignItems = 'CENTER'
        cardFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
        cardFrame.strokes = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        cardFrame.strokeWeight = 1
        cardFrame.cornerRadius = JAZZ_RADIUS

        // Colored brand badge
        const badge = figma.createFrame()
        badge.name = 'Badge'
        badge.layoutMode = 'VERTICAL'
        badge.primaryAxisAlignItems = 'CENTER'
        badge.counterAxisAlignItems = 'CENTER'
        badge.primaryAxisSizingMode = 'FIXED'
        badge.counterAxisSizingMode = 'FIXED'
        badge.resize(32, 32)
        badge.cornerRadius = JAZZ_RADIUS
        badge.fills = [{ type: 'SOLID', color: brandRgb }]
        const abbr = ticker.length <= 3 ? ticker : ticker.slice(0, 3)
        const badgeText = await createTextNode(abbr, {
          fontSize: abbr.length <= 2 ? 12 : 9,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
        })
        badgeText.textAlignHorizontal = 'CENTER'
        badge.appendChild(badgeText)
        cardFrame.appendChild(badge)

        // Right info column: symbol on top, value below
        const infoCol = createAutoLayoutFrameSafe('Info', 'VERTICAL', { gap: 2 })
        infoCol.fills = []

        const symbolText = await createTextNode(ticker, {
          fontSize: 13,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: JAZZ_RGB.text }]
        })
        infoCol.appendChild(symbolText)
        symbolText.layoutSizingHorizontal = 'FILL'

        const content = block.content || ''
        const isGain = content.includes('+')
        const isLoss = !isGain && (content.includes('-') || content.includes('−'))
        const valueColor = isGain ? JAZZ_RGB.gain : isLoss ? JAZZ_RGB.loss : JAZZ_RGB.text
        const valueText = await createTextNode(content, {
          fontSize: 11,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: valueColor }]
        })
        infoCol.appendChild(valueText)
        valueText.layoutSizingHorizontal = 'FILL'

        cardFrame.appendChild(infoCol)
        infoCol.layoutSizingHorizontal = 'FILL'
        infoCol.layoutGrow = 1

        cardFrame.counterAxisSizingMode = 'FIXED'
        cardFrame.resize(maxWidth, cardFrame.height)
        return cardFrame
      }

      // Generic card (hero tiles, non-ticker content)
      const cardFrame = createAutoLayoutFrameSafe('Card', 'VERTICAL', {
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 8
      })

      if (block.title) {
        const titleText = await createTextNode(block.title, {
          fontSize: getHeadingSize(2, fidelity, useJazz),
          fontName: fonts.bold,
          fills: [getTextColor(fidelity, useJazz)]
        })
        cardFrame.appendChild(titleText)
        titleText.layoutSizingHorizontal = 'FILL'
      }

      const contentText = await createTextNode(block.content, {
        fontSize: getBodyTextSize(fidelity, useJazz),
        fontName: fonts.regular,
        fills: [getTextColor(fidelity, useJazz)]
      })
      cardFrame.appendChild(contentText)
      contentText.layoutSizingHorizontal = 'FILL'

      // Apply card styling
      cardFrame.fills = [getCardFill(fidelity, useJazz)]
      cardFrame.strokes = [getCardStroke(fidelity, intent, useJazz)]
      cardFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      cardFrame.effects = getCardEffects(fidelity)

      cardFrame.counterAxisSizingMode = 'FIXED'
      cardFrame.resize(maxWidth, cardFrame.height)
      return cardFrame
    }

    case 'spacer': {
      const spacer = figma.createRectangle()
      spacer.name = 'Spacer'
      spacer.resize(maxWidth, block.height || 16)
      spacer.fills = []
      spacer.strokes = []
      return spacer
    }

    case 'image': {
      const imageFrame = figma.createFrame()
      imageFrame.name = 'Image'
      const imageWidth = block.width || maxWidth
      const imageHeight = block.height || Math.round(imageWidth * 0.75) // 4:3 aspect ratio default
      imageFrame.resize(imageWidth, imageHeight)
      
      // Apply image placeholder styling
      imageFrame.fills = [getImageFill(fidelity, useJazz)]
      imageFrame.strokes = [getImageStroke(fidelity, intent)]
      imageFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      
      // Add placeholder text if wireframe
      if (fidelity === 'wireframe') {
        const placeholderText = await createTextNode('[Image]', {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [getPlaceholderColor(fidelity)]
        })
        placeholderText.textAlignHorizontal = 'CENTER'
        imageFrame.appendChild(placeholderText)
        imageFrame.layoutMode = 'VERTICAL'
        imageFrame.primaryAxisAlignItems = 'CENTER'
        imageFrame.counterAxisAlignItems = 'CENTER'
      }
      
      return imageFrame
    }

    case 'chart': {
      const totalH = block.height ?? 140
      if (useJazz) {
        // Rich chart: header row + ascending bar chart simulating area chart
        const chartFrame = figma.createFrame()
        chartFrame.name = 'Chart'
        chartFrame.layoutMode = 'VERTICAL'
        chartFrame.primaryAxisSizingMode = 'FIXED'
        chartFrame.counterAxisSizingMode = 'FIXED'
        chartFrame.resize(maxWidth, totalH)
        chartFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
        chartFrame.strokes = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        chartFrame.strokeWeight = 1
        chartFrame.cornerRadius = JAZZ_RADIUS
        chartFrame.paddingTop = 10
        chartFrame.paddingRight = 12
        chartFrame.paddingBottom = 8
        chartFrame.paddingLeft = 12
        chartFrame.itemSpacing = 6
        chartFrame.clipsContent = true

        // Header row: caption + period tabs
        const headerRow = figma.createFrame()
        headerRow.name = 'Chart Header'
        headerRow.layoutMode = 'HORIZONTAL'
        headerRow.primaryAxisSizingMode = 'FIXED'
        headerRow.counterAxisSizingMode = 'AUTO'
        headerRow.resize(maxWidth - 24, 10)
        headerRow.primaryAxisAlignItems = 'SPACE_BETWEEN'
        headerRow.counterAxisAlignItems = 'CENTER'
        headerRow.fills = []
        headerRow.itemSpacing = 0
        const captionText = await createTextNode(block.caption ?? 'YTD Performance', {
          fontSize: 11,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: JAZZ_RGB.text }]
        })
        headerRow.appendChild(captionText)
        const periodText = await createTextNode('YTD  1Y  3M  1M', {
          fontSize: 9,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: JAZZ_RGB.muted }]
        })
        headerRow.appendChild(periodText)
        chartFrame.appendChild(headerRow)
        headerRow.layoutSizingHorizontal = 'FILL'

        // Chart area: non-auto-layout, bars positioned absolutely
        const headerH = 26  // 10 font + 16 for auto-sizing
        const areaH = totalH - 10 - 8 - headerH - 6  // padTop + padBottom + headerH + gap
        const areaW = maxWidth - 24
        const areaFrame = figma.createFrame()
        areaFrame.name = 'Chart Area'
        areaFrame.resize(areaW, Math.max(36, areaH))
        areaFrame.fills = []
        areaFrame.strokes = []
        areaFrame.clipsContent = false

        const usableH = Math.max(36, areaH)
        const relHeights = [0.28, 0.38, 0.32, 0.48, 0.55, 0.65, 0.78]
        const barW = Math.max(3, Math.round(areaW / 24))
        const chartBlue: Paint = { type: 'SOLID', color: hexToRgb('#4A8FD4') }
        for (let i = 0; i < relHeights.length; i++) {
          const barH = Math.max(2, Math.round(relHeights[i] * usableH))
          const bar = figma.createRectangle()
          bar.name = `Bar-${i}`
          bar.resize(barW, barH)
          bar.x = Math.round((i / (relHeights.length - 1)) * (areaW - barW))
          bar.y = usableH - barH
          bar.fills = [chartBlue]
          bar.cornerRadius = 1
          areaFrame.appendChild(bar)
        }
        // Baseline
        const baseline = figma.createRectangle()
        baseline.name = 'Baseline'
        baseline.resize(areaW, 1)
        baseline.x = 0
        baseline.y = usableH - 1
        baseline.fills = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        areaFrame.appendChild(baseline)

        chartFrame.appendChild(areaFrame)
        areaFrame.layoutSizingHorizontal = 'FILL'
        return chartFrame
      }

      // Non-Jazz: labeled placeholder
      const chartFrame = figma.createFrame()
      chartFrame.name = 'Chart'
      chartFrame.resize(maxWidth, totalH)
      chartFrame.fills = [getImageFill(fidelity, useJazz)]
      chartFrame.strokes = [getImageStroke(fidelity, intent)]
      chartFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      chartFrame.layoutMode = 'VERTICAL'
      chartFrame.primaryAxisAlignItems = 'CENTER'
      chartFrame.counterAxisAlignItems = 'CENTER'
      const chartLabel = await createTextNode('Portfolio Performance Chart', {
        fontSize: 11,
        fontName: fonts.regular,
        fills: [getPlaceholderColor(fidelity)]
      })
      chartLabel.textAlignHorizontal = 'CENTER'
      chartFrame.appendChild(chartLabel)
      return chartFrame
    }

    case 'metricsGrid': {
      if (useJazz) {
        // 2-column grid: border color as background creates 1px grid lines between cells
        const gridOuter = figma.createFrame()
        gridOuter.name = 'Metrics Grid'
        gridOuter.layoutMode = 'VERTICAL'
        gridOuter.primaryAxisSizingMode = 'AUTO'
        gridOuter.counterAxisSizingMode = 'AUTO'
        gridOuter.fills = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        gridOuter.cornerRadius = JAZZ_RADIUS
        gridOuter.clipsContent = true
        gridOuter.itemSpacing = 1
        gridOuter.paddingTop = 0
        gridOuter.paddingRight = 0
        gridOuter.paddingBottom = 0
        gridOuter.paddingLeft = 0

        const items = block.items
        for (let r = 0; r < Math.ceil(items.length / 2); r++) {
          const rowItems = items.slice(r * 2, r * 2 + 2)
          // FIXED primary width breaks the FILL-child circular dependency
          const rowFrame = figma.createFrame()
          rowFrame.name = `Row-${r}`
          rowFrame.layoutMode = 'HORIZONTAL'
          rowFrame.primaryAxisSizingMode = 'FIXED'
          rowFrame.counterAxisSizingMode = 'AUTO'
          rowFrame.resize(maxWidth, 1)
          rowFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.border }]
          rowFrame.itemSpacing = 1
          rowFrame.paddingTop = 0
          rowFrame.paddingRight = 0
          rowFrame.paddingBottom = 0
          rowFrame.paddingLeft = 0

          for (const item of rowItems) {
            const cell = figma.createFrame()
            cell.name = item.label
            cell.layoutMode = 'VERTICAL'
            cell.primaryAxisSizingMode = 'AUTO'
            cell.counterAxisSizingMode = 'FIXED'
            cell.resize(Math.floor(maxWidth / 2), 10)
            cell.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
            cell.paddingTop = 10
            cell.paddingRight = 12
            cell.paddingBottom = 10
            cell.paddingLeft = 12
            cell.itemSpacing = 2

            const labelText = await createTextNode(item.label, {
              fontSize: 10,
              fontName: fonts.regular,
              fills: [{ type: 'SOLID', color: JAZZ_RGB.muted }]
            })
            cell.appendChild(labelText)
            labelText.layoutSizingHorizontal = 'FILL'

            const valueColor = item.gain === true ? JAZZ_RGB.gain
              : item.gain === false ? JAZZ_RGB.loss
              : JAZZ_RGB.text
            const valueText = await createTextNode(item.value, {
              fontSize: 14,
              fontName: fonts.bold,
              fills: [{ type: 'SOLID', color: valueColor }]
            })
            cell.appendChild(valueText)
            valueText.layoutSizingHorizontal = 'FILL'

            rowFrame.appendChild(cell)
            cell.layoutSizingHorizontal = 'FILL'
            cell.layoutGrow = 1
          }

          gridOuter.appendChild(rowFrame)
          rowFrame.layoutSizingHorizontal = 'FILL'
        }

        return gridOuter
      }

      // Non-Jazz placeholder
      const mgFrame = figma.createFrame()
      mgFrame.name = 'Metrics Grid'
      mgFrame.resize(maxWidth, 80)
      mgFrame.fills = [getImageFill(fidelity, useJazz)]
      mgFrame.strokes = [getImageStroke(fidelity, intent)]
      mgFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      mgFrame.layoutMode = 'VERTICAL'
      mgFrame.primaryAxisAlignItems = 'CENTER'
      mgFrame.counterAxisAlignItems = 'CENTER'
      const mgLabel = await createTextNode(`Metrics (${block.items.length} cells)`, {
        fontSize: 11,
        fontName: fonts.regular,
        fills: [getPlaceholderColor(fidelity)]
      })
      mgFrame.appendChild(mgLabel)
      return mgFrame
    }

    case 'allocation': {
      if (useJazz) {
        // Segmented proportional bar + 3-row legend
        const allocFrame = figma.createFrame()
        allocFrame.name = 'Asset Allocation'
        allocFrame.layoutMode = 'VERTICAL'
        allocFrame.primaryAxisSizingMode = 'AUTO'
        allocFrame.counterAxisSizingMode = 'AUTO'
        allocFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
        allocFrame.strokes = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        allocFrame.strokeWeight = 1
        allocFrame.cornerRadius = JAZZ_RADIUS
        allocFrame.paddingTop = 10
        allocFrame.paddingRight = 12
        allocFrame.paddingBottom = 10
        allocFrame.paddingLeft = 12
        allocFrame.itemSpacing = 8

        // Header: title + total
        const headerRow = figma.createFrame()
        headerRow.name = 'Alloc Header'
        headerRow.layoutMode = 'HORIZONTAL'
        headerRow.primaryAxisSizingMode = 'AUTO'
        headerRow.counterAxisSizingMode = 'AUTO'
        headerRow.primaryAxisAlignItems = 'SPACE_BETWEEN'
        headerRow.counterAxisAlignItems = 'CENTER'
        headerRow.fills = []
        headerRow.itemSpacing = 0
        const allocTitle = await createTextNode('Asset Allocation', {
          fontSize: 11, fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: JAZZ_RGB.text }]
        })
        headerRow.appendChild(allocTitle)
        if (block.total) {
          const totalText = await createTextNode(block.total, {
            fontSize: 11, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: JAZZ_RGB.text }]
          })
          headerRow.appendChild(totalText)
        }
        allocFrame.appendChild(headerRow)
        headerRow.layoutSizingHorizontal = 'FILL'

        // Segmented bar: 3 proportional rectangles in a fixed-height non-auto-layout frame
        const barH = 8
        const total = block.equity + block.fixedIncome + block.altAssets
        const barW = maxWidth - 24
        const eqW = Math.round((block.equity / total) * barW)
        const fiW = Math.round((block.fixedIncome / total) * barW)
        const altW = Math.max(1, barW - eqW - fiW)

        const barFrame = figma.createFrame()
        barFrame.name = 'Alloc Bar'
        barFrame.resize(barW, barH)
        barFrame.cornerRadius = JAZZ_RADIUS
        barFrame.clipsContent = true
        barFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        barFrame.strokes = []

        const seg1 = figma.createRectangle()
        seg1.name = 'Equity'; seg1.resize(eqW, barH)
        seg1.x = 0; seg1.y = 0
        seg1.fills = [{ type: 'SOLID', color: hexToRgb('#7B9E4B') }]
        barFrame.appendChild(seg1)

        const seg2 = figma.createRectangle()
        seg2.name = 'Fixed'; seg2.resize(fiW, barH)
        seg2.x = eqW; seg2.y = 0
        seg2.fills = [{ type: 'SOLID', color: hexToRgb('#2E7E9E') }]
        barFrame.appendChild(seg2)

        const seg3 = figma.createRectangle()
        seg3.name = 'Alt'; seg3.resize(altW, barH)
        seg3.x = eqW + fiW; seg3.y = 0
        seg3.fills = [{ type: 'SOLID', color: hexToRgb('#6B5B95') }]
        barFrame.appendChild(seg3)

        allocFrame.appendChild(barFrame)
        barFrame.layoutSizingHorizontal = 'FILL'

        // Legend rows
        const legendItems = [
          { label: 'Equity', pct: block.equity, color: '#7B9E4B' },
          { label: 'Fixed Income', pct: block.fixedIncome, color: '#2E7E9E' },
          { label: 'Alt Assets', pct: block.altAssets, color: '#6B5B95' },
        ]
        for (const leg of legendItems) {
          const row = figma.createFrame()
          row.name = leg.label
          row.layoutMode = 'HORIZONTAL'
          row.primaryAxisSizingMode = 'AUTO'
          row.counterAxisSizingMode = 'AUTO'
          row.counterAxisAlignItems = 'CENTER'
          row.fills = []
          row.itemSpacing = 6

          const dot = figma.createRectangle()
          dot.resize(8, 8)
          dot.cornerRadius = 2
          dot.fills = [{ type: 'SOLID', color: hexToRgb(leg.color) }]
          row.appendChild(dot)

          const legText = await createTextNode(`${leg.label}  ${leg.pct.toFixed(1)}%`, {
            fontSize: 10, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: JAZZ_RGB.muted }]
          })
          row.appendChild(legText)

          allocFrame.appendChild(row)
          row.layoutSizingHorizontal = 'FILL'
        }

        return allocFrame
      }

      // Non-Jazz placeholder
      const allocFrame = figma.createFrame()
      allocFrame.name = 'Asset Allocation'
      allocFrame.resize(maxWidth, 90)
      allocFrame.fills = [getImageFill(fidelity, useJazz)]
      allocFrame.strokes = [getImageStroke(fidelity, intent)]
      allocFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      allocFrame.layoutMode = 'VERTICAL'
      allocFrame.primaryAxisAlignItems = 'CENTER'
      allocFrame.counterAxisAlignItems = 'CENTER'
      const allocLabel = await createTextNode(
        `Equity ${block.equity}% · Fixed ${block.fixedIncome}% · Alt ${block.altAssets}%`,
        { fontSize: 10, fontName: fonts.regular, fills: [getPlaceholderColor(fidelity)] }
      )
      allocFrame.appendChild(allocLabel)
      return allocFrame
    }

    case 'watchlist': {
      if (useJazz) {
        // Section card with title + divider-separated rows: badge, ticker, price, change
        const wlFrame = figma.createFrame()
        wlFrame.name = block.title
        wlFrame.layoutMode = 'VERTICAL'
        wlFrame.primaryAxisSizingMode = 'AUTO'
        wlFrame.counterAxisSizingMode = 'AUTO'
        wlFrame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
        wlFrame.strokes = [{ type: 'SOLID', color: JAZZ_RGB.border }]
        wlFrame.strokeWeight = 1
        wlFrame.cornerRadius = JAZZ_RADIUS
        wlFrame.paddingTop = 10
        wlFrame.paddingRight = 12
        wlFrame.paddingBottom = 10
        wlFrame.paddingLeft = 12
        wlFrame.itemSpacing = 0

        const titleText = await createTextNode(block.title.toUpperCase(), {
          fontSize: 10, fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: JAZZ_RGB.muted }]
        })
        wlFrame.appendChild(titleText)
        titleText.layoutSizingHorizontal = 'FILL'

        for (const item of block.items) {
          // Divider
          const divider = figma.createRectangle()
          divider.name = 'Divider'
          divider.resize(maxWidth - 24, 1)
          divider.fills = [{ type: 'SOLID', color: JAZZ_RGB.border }]
          wlFrame.appendChild(divider)
          divider.layoutSizingHorizontal = 'FILL'

          // Row: FIXED primary width breaks the infoCol FILL circular dependency
          const row = figma.createFrame()
          row.name = item.ticker
          row.layoutMode = 'HORIZONTAL'
          row.primaryAxisSizingMode = 'FIXED'
          row.counterAxisSizingMode = 'AUTO'
          row.resize(maxWidth - 24, 1)
          row.counterAxisAlignItems = 'CENTER'
          row.fills = []
          row.paddingTop = 8
          row.paddingBottom = 8
          row.itemSpacing = 8

          // Colored brand badge
          const brandRgb = hexToRgb(TICKER_COLORS[item.ticker] ?? '#005EB8')
          const badge = figma.createFrame()
          badge.name = 'Badge-' + item.ticker
          badge.layoutMode = 'VERTICAL'
          badge.primaryAxisAlignItems = 'CENTER'
          badge.counterAxisAlignItems = 'CENTER'
          badge.primaryAxisSizingMode = 'FIXED'
          badge.counterAxisSizingMode = 'FIXED'
          badge.resize(28, 28)
          badge.cornerRadius = JAZZ_RADIUS
          badge.fills = [{ type: 'SOLID', color: brandRgb }]
          const abbr = item.ticker.length <= 3 ? item.ticker : item.ticker.slice(0, 3)
          const badgeText = await createTextNode(abbr, {
            fontSize: abbr.length <= 2 ? 11 : 8,
            fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
          })
          badgeText.textAlignHorizontal = 'CENTER'
          badge.appendChild(badgeText)
          row.appendChild(badge)

          // Ticker + price column
          const infoCol = createAutoLayoutFrameSafe('Info-' + item.ticker, 'VERTICAL', { gap: 1 })
          infoCol.fills = []
          const tickerText = await createTextNode(item.ticker, {
            fontSize: 12, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: JAZZ_RGB.text }]
          })
          infoCol.appendChild(tickerText)
          const priceText = await createTextNode(item.price, {
            fontSize: 10, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: JAZZ_RGB.muted }]
          })
          infoCol.appendChild(priceText)
          row.appendChild(infoCol)
          infoCol.layoutGrow = 1
          infoCol.layoutSizingHorizontal = 'FILL'

          // Change badge
          const changeColor = item.gain ? JAZZ_RGB.gain : JAZZ_RGB.loss
          const changeText = await createTextNode(item.change, {
            fontSize: 11, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: changeColor }]
          })
          row.appendChild(changeText)

          wlFrame.appendChild(row)
          row.layoutSizingHorizontal = 'FILL'
        }

        return wlFrame
      }

      // Non-Jazz placeholder
      const wlFrame = figma.createFrame()
      wlFrame.name = block.title
      wlFrame.resize(maxWidth, 24 + block.items.length * 36)
      wlFrame.fills = [getImageFill(fidelity, useJazz)]
      wlFrame.strokes = [getImageStroke(fidelity, intent)]
      wlFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      wlFrame.layoutMode = 'VERTICAL'
      wlFrame.primaryAxisAlignItems = 'CENTER'
      wlFrame.counterAxisAlignItems = 'CENTER'
      const wlLabel = await createTextNode(
        `${block.title} · ${block.items.map(i => i.ticker).join(', ')}`,
        { fontSize: 10, fontName: fonts.regular, fills: [getPlaceholderColor(fidelity)] }
      )
      wlFrame.appendChild(wlLabel)
      return wlFrame
    }

    default:
      // Fallback: create empty frame
      const fallback = figma.createFrame()
      fallback.name = 'Unknown Block'
      fallback.resize(maxWidth, 40)
      return fallback
  }
}

/**
 * Apply fidelity-specific styling to screen frame
 */
function applyFidelityStyling(frame: FrameNode, fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): void {
  if (useJazz) {
    frame.fills = [{ type: 'SOLID', color: JAZZ_RGB.surface0 }]
    frame.strokes = [{ type: 'SOLID', color: JAZZ_RGB.border, opacity: 1 }]
    frame.strokeWeight = 1
    frame.cornerRadius = JAZZ_RADIUS
    frame.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      offset: { x: 0, y: 2 },
      radius: 6,
      visible: true,
      blendMode: 'NORMAL'
    }]
    return
  }
  switch (fidelity) {
    case 'wireframe':
      frame.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } }] // #E0E0E0
      frame.strokes = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 }] // #999999
      frame.strokeWeight = 1
      frame.cornerRadius = 0
      frame.effects = []
      break
    case 'medium':
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] // White
      frame.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 }] // #E0E0E0
      frame.strokeWeight = 1
      frame.cornerRadius = 8
      frame.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
      break
    case 'hi':
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] // White
      frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }]
      frame.strokeWeight = 0.5
      frame.cornerRadius = 12
      frame.effects = [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        },
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.04 },
          offset: { x: 0, y: 8 },
          radius: 16,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
      break
    case 'creative':
      frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } }] // Slight blue tint
      frame.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 }] // Blue
      frame.strokeWeight = 2
      frame.cornerRadius = 20
      frame.effects = [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.3 },
          offset: { x: 0, y: 4 },
          radius: 12,
          visible: true,
          blendMode: 'NORMAL'
        },
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 16 },
          radius: 32,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
      break
  }
}

// Fidelity-specific styling helpers

function getHeadingSize(level: 1 | 2 | 3, fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): number {
  if (useJazz) {
    const jazzSizes: Record<1 | 2 | 3, number> = { 1: 26, 2: 20, 3: 16 }
    return jazzSizes[level]
  }
  const baseSizes: Record<1 | 2 | 3, number> = {
    1: 32,
    2: 24,
    3: 18
  }

  const base = baseSizes[level]

  switch (fidelity) {
    case 'wireframe':
      return base * 0.8
    case 'medium':
      return base
    case 'hi':
      return base * 1.1
    case 'creative':
      return base * 1.3
  }
}

function getBodyTextSize(fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): number {
  if (useJazz) return 15
  switch (fidelity) {
    case 'wireframe':
      return 12
    case 'medium':
      return 14
    case 'hi':
      return 16
    case 'creative':
      return 18
  }
}

function getButtonTextSize(fidelity: DesignSpecV1['render']['intent']['fidelity']): number {
  switch (fidelity) {
    case 'wireframe':
      return 12
    case 'medium':
      return 14
    case 'hi':
      return 15
    case 'creative':
      return 16
  }
}

function getTextColor(fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: JAZZ_RGB.text }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } } // #666666
    case 'medium':
      return { type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } } // #333333
    case 'hi':
      return { type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } } // #1A1A1A
    case 'creative':
      return { type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.2 } } // Dark blue
  }
}

function getButtonFill(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): Paint {
  if (useJazz) {
    if (variant === 'primary') return { type: 'SOLID', color: JAZZ_RGB.cta }        // #128842 green CTA
    if (variant === 'secondary') return { type: 'SOLID', color: JAZZ_RGB.surface0 } // white fill, bordered
    return { type: 'SOLID', color: JAZZ_RGB.surface0 }
  }
  // Use intent primary color if available and variant is primary
  if (variant === 'primary' && intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color }
    }
  }
  
  // Use intent accent color for secondary if available
  if (variant === 'secondary' && intent?.accentColors && intent.accentColors.length > 0) {
    const color = parseColor(intent.accentColors[0])
    if (color) {
      return { type: 'SOLID', color }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } } // #E0E0E0
    case 'medium':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0, g: 0.4, b: 0.8 } } // #0066CC
      } else {
        return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
      }
    case 'hi':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0, g: 0.4, b: 0.8 } } // #0066CC
      } else if (variant === 'secondary') {
        return { type: 'SOLID', color: { r: 0.42, g: 0.46, b: 0.49 } } // #6C757D
      } else {
        return { type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }
      }
    case 'creative':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } } // Vibrant blue
      } else {
        return { type: 'SOLID', color: { r: 0.95, g: 0.7, b: 0.2 } } // Orange
      }
  }
}

function getButtonTextColor(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): Paint {
  if (useJazz) {
    if (variant === 'primary') return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }      // white on green CTA
    return { type: 'SOLID', color: JAZZ_RGB.primary }                                       // #005EB8 on white
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } } // #666666
    case 'medium':
    case 'hi':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
      } else {
        return { type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } } // Dark
      }
    case 'creative':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
  }
}

function getButtonStroke(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): Paint {
  if (useJazz) {
    if (variant === 'primary') return { type: 'SOLID', color: JAZZ_RGB.cta, opacity: 0 }     // green, no extra stroke
    if (variant === 'secondary') return { type: 'SOLID', color: JAZZ_RGB.primary, opacity: 1 } // #005EB8 border
    return { type: 'SOLID', color: JAZZ_RGB.border, opacity: 1 }
  }
  // Use intent primary color for stroke if available and variant is primary
  if (variant === 'primary' && intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.3 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getButtonEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'hi':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.12 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    case 'creative':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.4 },
          offset: { x: 0, y: 4 },
          radius: 8,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
  }
}

function getInputFill(fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: JAZZ_RGB.surface0 }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
    case 'medium':
    case 'hi':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
    case 'creative':
      return { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } } // Slight blue
  }
}

function getInputStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: JAZZ_RGB.border, opacity: 1 }
  // Use intent primary color for input stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.2 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getInputEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return []
    case 'hi':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'creative':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0.2, g: 0.4, b: 0.8, a: 0.2 },
        offset: { x: 0, y: 2 },
        radius: 4,
        visible: true,
        blendMode: 'NORMAL'
      }]
  }
}

function getCardFill(fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: JAZZ_RGB.surface0 }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
    case 'medium':
    case 'hi':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
    case 'creative':
      return { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } } // Slight blue
  }
}

function getCardStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: JAZZ_RGB.border, opacity: 1 }
  // Use intent primary color for card stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.15 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getCardEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'hi':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    case 'creative':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.3 },
          offset: { x: 0, y: 4 },
          radius: 8,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
  }
}

function getImageFill(fidelity: DesignSpecV1['render']['intent']['fidelity'], useJazz?: boolean): Paint {
  if (useJazz) return { type: 'SOLID', color: { r: 0.910, g: 0.941, b: 0.980 } } // #E8F0FA Jazz icon-bg
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 } // Transparent fill, just stroke
    case 'medium':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } } // Light gray
    case 'hi':
      return { type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.95 } } // Light blue-gray
    case 'creative':
      return { type: 'SOLID', color: { r: 0.85, g: 0.9, b: 1 } } // Light blue
  }
}

function getImageStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color for image stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.2 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getPlaceholderColor(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.7 } } // Light gray
    case 'hi':
      return { type: 'SOLID', color: { r: 0.65, g: 0.65, b: 0.65 } }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.4, g: 0.5, b: 0.7 } } // Blue-gray
  }
}

function getCornerRadius(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean): number {
  if (useJazz) return JAZZ_RADIUS // always 4px
  let baseRadius: number
  switch (fidelity) {
    case 'wireframe':
      baseRadius = 0
      break
    case 'medium':
      baseRadius = 6
      break
    case 'hi':
      baseRadius = 12
      break
    case 'creative':
      baseRadius = 20
      break
  }
  
  // Adjust based on tone: playful = more rounded, serious = less rounded
  if (intent?.tone === 'playful') {
    return baseRadius * 1.5
  } else if (intent?.tone === 'serious') {
    return baseRadius * 0.7
  }
  
  return baseRadius
}

/**
 * Parse color string to RGB color object
 * Supports semantic color names and hex values
 */
function parseColor(colorStr: string): { r: number; g: number; b: number } | null {
  const lower = colorStr.toLowerCase().trim()
  
  // Semantic color names
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    pink: { r: 1, g: 0.4, b: 0.7 },
    blue: { r: 0.2, g: 0.4, b: 0.9 },
    green: { r: 0.2, g: 0.7, b: 0.4 },
    purple: { r: 0.6, g: 0.3, b: 0.9 },
    orange: { r: 1, g: 0.5, b: 0.2 },
    red: { r: 0.9, g: 0.2, b: 0.2 },
    yellow: { r: 1, g: 0.9, b: 0.2 },
    navy: { r: 0.1, g: 0.2, b: 0.5 },
    teal: { r: 0.2, g: 0.6, b: 0.6 },
    magenta: { r: 1, g: 0.2, b: 0.8 }
  }
  
  if (colorMap[lower]) {
    return colorMap[lower]
  }
  
  // Try hex parsing
  if (lower.startsWith('#')) {
    const hex = lower.slice(1)
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      return { r, g, b }
    }
  }
  
  return null
}
