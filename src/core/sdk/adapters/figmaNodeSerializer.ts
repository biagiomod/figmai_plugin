// src/core/sdk/adapters/figmaNodeSerializer.ts
/**
 * FigmaNodeSerializer — converts Figma SceneNode to plain FigmaNode JSON.
 * FigmaNode is the input format for SD-T's traverseFigmaNode().
 * This is a host-owned adapter — lives here regardless of which SD engine is active.
 */

export interface FigmaNodeStyle {
  fontSize?: number
  fontFamily?: string
  fontStyle?: string
}

export interface FigmaNodeFill {
  type: string
  color?: { r: number; g: number; b: number }
}

/** Plain JSON representation of a Figma node — safe to serialize, no SceneNode refs. */
export interface FigmaNodeJSON {
  id: string
  name?: string
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
  fills?: FigmaNodeFill[]
  characters?: string
  style?: FigmaNodeStyle
  cornerRadius?: number
  opacity?: number
  visible?: boolean
  strokeWeight?: number
  layoutMode?: string
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  itemSpacing?: number
  children?: FigmaNodeJSON[]
}

export function serializeFigmaNode(node: SceneNode): FigmaNodeJSON {
  const base: FigmaNodeJSON = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: 'visible' in node ? (node as { visible: boolean }).visible : true,
    opacity: 'opacity' in node ? (node as { opacity: number }).opacity : 1,
  }

  if ('x' in node) base.x = (node as { x: number }).x
  if ('y' in node) base.y = (node as { y: number }).y
  if ('width' in node) base.width = (node as { width: number }).width
  if ('height' in node) base.height = (node as { height: number }).height
  if ('fills' in node) {
    const fills = (node as { fills: readonly Paint[] }).fills
    if (Array.isArray(fills)) {
      base.fills = fills.map(f => ({
        type: f.type,
        color: f.type === 'SOLID' ? (f as SolidPaint).color : undefined,
      }))
    }
  }
  if (node.type === 'TEXT') {
    const t = node as TextNode
    base.characters = t.characters
    const fontName = t.fontName
    if (fontName !== figma.mixed) {
      base.style = {
        fontSize: typeof t.fontSize === 'number' ? t.fontSize : undefined,
        fontFamily: (fontName as FontName).family,
        fontStyle: (fontName as FontName).style,
      }
    }
  }
  if ('cornerRadius' in node && typeof (node as { cornerRadius: number | symbol }).cornerRadius === 'number') {
    base.cornerRadius = (node as { cornerRadius: number }).cornerRadius
  }
  if ('strokeWeight' in node && typeof (node as { strokeWeight: number | symbol }).strokeWeight === 'number') {
    base.strokeWeight = (node as { strokeWeight: number }).strokeWeight
  }
  if ('layoutMode' in node) {
    const f = node as FrameNode
    base.layoutMode = f.layoutMode
    base.paddingLeft = f.paddingLeft
    base.paddingRight = f.paddingRight
    base.paddingTop = f.paddingTop
    base.paddingBottom = f.paddingBottom
    base.itemSpacing = f.itemSpacing
  }
  if ('children' in node) {
    base.children = (node as ChildrenMixin).children
      .filter(c => 'visible' in c ? (c as SceneNode & { visible: boolean }).visible : true)
      .map(c => serializeFigmaNode(c as SceneNode))
  }
  return base
}
