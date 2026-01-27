/**
 * Renders dark demo card specs (from dark_demo_cards.json) to Figma nodes.
 *
 * Text sizing: all text nodes use fill horizontal + hug vertical:
 * - No resize() / fixed width or height on text.
 * - layoutSizingHorizontal = 'FILL' and textAutoResize = 'HEIGHT' after append.
 */

import type { DarkDemoNodeSpec } from './darkDemoCardTypes'
import { rgbToPaint, applyAutoLayout, ensureFontsLoaded, setDashedStroke } from '../../../../assistants/dca/demoAssets/primitives'

/** Collect all font family+style from a spec tree for loading */
function collectFonts(spec: DarkDemoNodeSpec, set: Set<string>): void {
  if (spec.text) {
    set.add(`${spec.text.fontFamily}:${spec.text.fontStyle}`)
  }
  for (const child of spec.children ?? []) {
    collectFonts(child, set)
  }
}

async function loadFontsForSpec(spec: DarkDemoNodeSpec): Promise<void> {
  const fonts = new Set<string>()
  collectFonts(spec, fonts)
  const byFamily = new Map<string, string[]>()
  Array.from(fonts).forEach((key) => {
    const [family, style] = key.split(':')
    if (!byFamily.has(family)) byFamily.set(family, [])
    if (!byFamily.get(family)!.includes(style)) byFamily.get(family)!.push(style)
  })
  const entries = Array.from(byFamily.entries())
  for (let i = 0; i < entries.length; i++) {
    const [family, styles] = entries[i]
    await ensureFontsLoaded(family, styles)
  }
}

function applyVisualToNode(
  node: FrameNode | RectangleNode | EllipseNode | TextNode,
  visual: NonNullable<DarkDemoNodeSpec['visual']>
): void {
  if (visual.fills && visual.fills.length > 0 && 'fills' in node) {
    node.fills = visual.fills.map((p) => rgbToPaint(p.color))
  }
  if (visual.strokes && visual.strokes.length > 0 && 'strokes' in node) {
    node.strokes = visual.strokes.map((p) => rgbToPaint(p.color))
  }
  if (visual.strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = visual.strokeWeight
  }
  if (visual.strokeAlign !== undefined && 'strokeAlign' in node) {
    node.strokeAlign = visual.strokeAlign
  }
  if (visual.cornerRadius !== undefined && 'cornerRadius' in node) {
    node.cornerRadius = visual.cornerRadius
  }
  if (visual.dashPattern && visual.dashPattern.length > 0 && 'dashPattern' in node) {
    const geom = node as GeometryMixin
    setDashedStroke(geom, {
      color: visual.strokes?.[0]?.color ?? { r: 0, g: 0, b: 0 },
      weight: visual.strokeWeight ?? 1,
      dashPattern: visual.dashPattern
    })
  }
}

async function renderNode(
  spec: DarkDemoNodeSpec,
  parentLayoutMode?: 'VERTICAL' | 'HORIZONTAL'
): Promise<SceneNode> {
  if (spec.type === 'TEXT') {
    const text = spec.text
    if (!text) throw new Error('TEXT node must have text spec')
    const node = figma.createText()
    node.name = spec.name
    await figma.loadFontAsync({ family: text.fontFamily, style: text.fontStyle })
    node.fontName = { family: text.fontFamily, style: text.fontStyle }
    node.fontSize = text.fontSize
    node.characters = text.characters
    if (text.textAlignHorizontal) node.textAlignHorizontal = text.textAlignHorizontal
    if (text.textAlignVertical) node.textAlignVertical = text.textAlignVertical
    if (text.lineHeight?.unit === 'AUTO') node.lineHeight = { unit: 'AUTO' }
    if (spec.visual?.fills?.length) node.fills = [rgbToPaint(spec.visual.fills[0].color)]
    // Do NOT set width/height on text; caller will set layoutSizingHorizontal and textAutoResize after append
    return node
  }

  if (spec.type === 'RECTANGLE') {
    const w = spec.width ?? 14
    const h = spec.height ?? 14
    const node = figma.createRectangle()
    node.name = spec.name
    node.resize(w, h)
    if (spec.visual) applyVisualToNode(node, spec.visual)
    return node
  }

  if (spec.type === 'ELLIPSE') {
    const w = spec.width ?? 14
    const h = spec.height ?? 14
    const node = figma.createEllipse()
    node.name = spec.name
    node.resize(w, h)
    if (spec.visual) applyVisualToNode(node, spec.visual)
    return node
  }

  // FRAME
  const frame = figma.createFrame()
  frame.name = spec.name

  const layout = spec.layout
  const children = spec.children ?? []
  // Ensure any frame with children has layout mode (required before setting layoutSizingHorizontal on children)
  if (layout || children.length > 0) {
    frame.layoutMode = layout?.mode ?? 'VERTICAL'
    if (layout?.padding) {
      frame.paddingTop = layout.padding.top
      frame.paddingRight = layout.padding.right
      frame.paddingBottom = layout.padding.bottom
      frame.paddingLeft = layout.padding.left
    }
    if (layout?.itemSpacing !== undefined) frame.itemSpacing = layout.itemSpacing
    if (layout?.sizing?.primary) frame.primaryAxisSizingMode = layout.sizing.primary
    if (layout?.sizing?.counter) frame.counterAxisSizingMode = layout.sizing.counter
  }

  if (spec.visual) applyVisualToNode(frame, spec.visual)

  // Apply fixed size only for frames (not for root if we want hug height – handled at card level)
  const isRoot = parentLayoutMode === undefined
  if (spec.width !== undefined && spec.height !== undefined && !isRoot) {
    frame.resize(spec.width, spec.height)
  } else if (spec.width !== undefined) {
    frame.resize(spec.width, frame.height)
  }

  for (let i = 0; i < children.length; i++) {
    const childSpec = children[i]
    const childNode = await renderNode(childSpec, layout?.mode ?? 'VERTICAL')
    frame.appendChild(childNode)
    // Set layout only after append so node is a child of an auto-layout frame
    if (childSpec.type === 'TEXT') {
      ;(childNode as TextNode).layoutSizingHorizontal = 'FILL'
      ;(childNode as TextNode).textAutoResize = 'HEIGHT'
    }
    if (childSpec.type === 'FRAME' && childSpec.layout?.align === 'STRETCH') {
      ;(childNode as FrameNode).layoutSizingHorizontal = 'FILL'
      ;(childNode as FrameNode).layoutGrow = 0
    }
  }

  // Root card: fix width 320 only; height hugs content (primaryAxisSizingMode AUTO from spec)
  if (isRoot) {
    frame.resize(320, frame.height)
    frame.counterAxisAlignItems = 'MIN'
  }

  return frame
}

/**
 * Render a single dark demo card spec to a Figma FrameNode.
 * Text nodes are given layoutSizingHorizontal = 'FILL' and textAutoResize = 'HEIGHT';
 * no fixed width/height is set on any text.
 */
export async function renderDarkDemoCard(spec: DarkDemoNodeSpec): Promise<FrameNode> {
  await loadFontsForSpec(spec)
  const node = await renderNode(spec)
  if (node.type !== 'FRAME') throw new Error('Root spec must be FRAME')
  return node as FrameNode
}
