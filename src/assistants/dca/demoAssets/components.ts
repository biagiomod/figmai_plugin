/**
 * Reusable Component Builders for Demo Assets
 * 
 * High-level builders for common UI components (badge, section, button, checkbox, etc.)
 * used across demo screens. All components use the token system and text styles.
 */

import type { RGB } from './tokens'
import { colors, spacing, radii, strokes, fonts } from './tokens'
import { textStyles, type TextStyleKey } from './textStyles'
import { rgbToPaint, applyAutoLayout, setTextStyle, ensureFontsLoaded } from './primitives'

/**
 * Create a demo badge (e.g., "DEMO — Intentional Dark Pattern")
 */
export async function createBadge(text: string = 'DEMO — Intentional Dark Pattern'): Promise<FrameNode> {
  await ensureFontsLoaded(fonts.inter, ['Bold'])
  
  const badge = figma.createFrame()
  badge.name = 'DemoBadge'
  applyAutoLayout(badge, {
    direction: 'HORIZONTAL',
    padding: spacing.sm,
    itemSpacing: spacing.sm,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  badge.cornerRadius = radii.md
  badge.fills = [rgbToPaint(colors.bgBadge)]

  const textNode = figma.createText()
  await setTextStyle(textNode, textStyles.badgeLabel)
  textNode.characters = text
  textNode.layoutGrow = 0
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT'
  
  badge.appendChild(textNode)
  return badge
}

/**
 * Create a section frame (card-like container)
 */
export function createSection(
  name: string,
  options: {
    padding?: number
    spacing?: number
    fill?: RGB
    cornerRadius?: number
  } = {}
): FrameNode {
  const section = figma.createFrame()
  section.name = name
  applyAutoLayout(section, {
    direction: 'VERTICAL',
    padding: options.padding ?? spacing.md,
    itemSpacing: options.spacing ?? spacing.md,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  section.fills = [rgbToPaint(options.fill ?? colors.bgLight)]
  if (options.cornerRadius !== undefined) {
    section.cornerRadius = options.cornerRadius
  }
  return section
}

/**
 * Create a text node with a specific text style
 */
export async function createText(
  text: string,
  styleKey: TextStyleKey,
  options: {
    fillContainer?: boolean
    name?: string
  } = {}
): Promise<TextNode> {
  const style = textStyles[styleKey]
  await ensureFontsLoaded(style.fontFamily, [style.fontWeight])
  
  const node = figma.createText()
  if (options.name) {
    node.name = options.name
  }
  await setTextStyle(node, style)
  node.characters = text
  
  if (options.fillContainer !== false) {
    // Fill width, hug height (default)
    // In Figma auto-layout, textAutoResize must be 'NONE' for text to fill container width
    node.layoutGrow = 1
    node.textAutoResize = 'NONE'
  } else {
    // Natural size (for button labels, badges, etc.)
    node.layoutGrow = 0
    node.textAutoResize = 'WIDTH_AND_HEIGHT'
  }
  
  return node
}

/**
 * Create a button
 */
export async function createButton(
  label: string,
  variant: 'primary' | 'secondary' | 'ghost',
  options: {
    name?: string
  } = {}
): Promise<FrameNode> {
  await ensureFontsLoaded(fonts.inter, ['Bold'])
  
  const button = figma.createFrame()
  button.name = options.name ?? `Button_${label}`
  applyAutoLayout(button, {
    direction: 'HORIZONTAL',
    padding: { top: spacing.lg, right: spacing['2xl'], bottom: spacing.lg, left: spacing['2xl'] },
    itemSpacing: spacing.md,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  button.cornerRadius = radii.sm

  if (variant === 'primary') {
    button.fills = [rgbToPaint(colors.primary)]
  } else if (variant === 'secondary') {
    button.fills = [rgbToPaint(colors.secondary)]
    button.strokes = [rgbToPaint(colors.borderMedium)]
    button.strokeWeight = strokes.thin
  } else {
    button.fills = [rgbToPaint(colors.ghost)]
    button.strokes = [rgbToPaint(colors.borderLight)]
    button.strokeWeight = strokes.thin
  }

  const labelNode = figma.createText()
  const labelStyle = variant === 'primary' ? textStyles.buttonLabel : textStyles.buttonLabelSecondary
  await setTextStyle(labelNode, labelStyle)
  labelNode.characters = label
  labelNode.layoutGrow = 0
  labelNode.textAutoResize = 'WIDTH_AND_HEIGHT'
  
  button.appendChild(labelNode)
  return button
}

/**
 * Create a row of buttons
 */
export async function createButtonRow(
  buttons: Array<{ label: string; variant: 'primary' | 'secondary' | 'ghost'; name?: string }>
): Promise<FrameNode> {
  const row = figma.createFrame()
  row.name = 'ButtonRow'
  applyAutoLayout(row, {
    direction: 'HORIZONTAL',
    itemSpacing: spacing.md,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  row.fills = []

  for (const btn of buttons) {
    const button = await createButton(btn.label, btn.variant, { name: btn.name })
    row.appendChild(button)
  }
  
  return row
}

/**
 * Create a checkbox row
 */
export async function createCheckbox(
  label: string,
  checked: boolean = false,
  options: {
    name?: string
  } = {}
): Promise<FrameNode> {
  await ensureFontsLoaded(fonts.inter, ['Regular'])
  
  const row = figma.createFrame()
  row.name = options.name ?? `Checkbox_${label}`
  applyAutoLayout(row, {
    direction: 'HORIZONTAL',
    itemSpacing: spacing.md,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  row.fills = []

  const box = figma.createRectangle()
  box.resize(14, 14)
  box.cornerRadius = radii.sm
  box.strokes = [rgbToPaint(colors.borderDark)]
  box.strokeWeight = strokes.thin
  box.fills = [rgbToPaint(checked ? colors.primary : colors.bgWhite)]

  const labelNode = await createText(label, 'body12Regular', { fillContainer: false })
  
  row.appendChild(box)
  row.appendChild(labelNode)
  return row
}

/**
 * Create a banner (info/alert container)
 */
export async function createBanner(
  title: string,
  subtitle: string,
  options: {
    name?: string
    fill?: RGB
  } = {}
): Promise<FrameNode> {
  const banner = createSection(options.name ?? 'Banner', {
    padding: spacing.xl,
    spacing: spacing.sm,
    fill: options.fill ?? colors.bgBanner
  })

  const titleNode = await createText(title, 'body13Bold')
  const subtitleNode = await createText(subtitle, 'body12Regular')
  
  banner.appendChild(titleNode)
  banner.appendChild(subtitleNode)
  return banner
}

/**
 * Create a card frame (elevated container)
 */
export function createCardFrame(
  name: string,
  options: {
    padding?: number
    spacing?: number
    fill?: RGB
    cornerRadius?: number
    stroke?: { color: RGB; weight: number }
  } = {}
): FrameNode {
  const card = createSection(name, {
    padding: options.padding,
    spacing: options.spacing,
    fill: options.fill,
    cornerRadius: options.cornerRadius ?? radii.lg
  })
  
  if (options.stroke) {
    card.strokes = [rgbToPaint(options.stroke.color)]
    card.strokeWeight = options.stroke.weight
  }
  
  return card
}
