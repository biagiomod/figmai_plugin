/**
 * Stage Primitives
 * Reusable helpers for creating Figma nodes
 */

/**
 * Load fonts with fallbacks
 */
export async function loadFonts(): Promise<{
  regular: FontName
  bold: FontName
  italic: FontName
  boldItalic: FontName
}> {
  const fonts = {
    regular: { family: 'Inter', style: 'Regular' } as FontName,
    bold: { family: 'Inter', style: 'Bold' } as FontName,
    italic: { family: 'Inter', style: 'Italic' } as FontName,
    boldItalic: { family: 'Inter', style: 'Bold Italic' } as FontName
  }

  try {
    await figma.loadFontAsync(fonts.regular)
    await figma.loadFontAsync(fonts.bold)
    await figma.loadFontAsync(fonts.italic)
    try {
      await figma.loadFontAsync(fonts.boldItalic)
    } catch {
      fonts.boldItalic = fonts.bold
    }
  } catch {
    // Fallback to Roboto
    try {
      fonts.regular = { family: 'Roboto', style: 'Regular' }
      fonts.bold = { family: 'Roboto', style: 'Bold' }
      fonts.italic = { family: 'Roboto', style: 'Italic' }
      fonts.boldItalic = { family: 'Roboto', style: 'Bold Italic' }
      await figma.loadFontAsync(fonts.regular)
      await figma.loadFontAsync(fonts.bold)
      await figma.loadFontAsync(fonts.italic)
      try {
        await figma.loadFontAsync(fonts.boldItalic)
      } catch {
        fonts.boldItalic = fonts.bold
      }
    } catch {
      // If all fail, use system default
      fonts.regular = { family: 'Inter', style: 'Regular' }
      fonts.bold = fonts.regular
      fonts.italic = fonts.regular
      fonts.boldItalic = fonts.regular
    }
  }

  return fonts
}

/**
 * Create container frame (NO auto-layout)
 */
export function createContainerFrame(name: string, x: number, y: number, width: number, height: number): FrameNode {
  const frame = figma.createFrame()
  frame.name = name
  frame.x = x
  frame.y = y
  frame.resize(width, height)
  // Explicitly NO layoutMode
  return frame
}

/**
 * Create text node
 */
export async function createTextNode(
  text: string,
  style: {
    fontSize?: number
    fontName?: FontName
    fills?: Paint[]
    lineHeight?: LineHeight
    letterSpacing?: LetterSpacing
    textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  } = {}
): Promise<TextNode> {
  const fonts = await loadFonts()
  const textNode = figma.createText()
  textNode.name = 'Text'
  textNode.fontName = style.fontName ?? fonts.regular
  textNode.fontSize = style.fontSize ?? 12
  textNode.characters = text
  textNode.textAutoResize = 'HEIGHT'

  if (style.fills) {
    textNode.fills = style.fills
  }

  if (style.lineHeight) {
    textNode.lineHeight = style.lineHeight
  }

  if (style.letterSpacing) {
    textNode.letterSpacing = style.letterSpacing
  }

  if (style.textAlign) {
    textNode.textAlignHorizontal = style.textAlign
  }

  return textNode
}

/**
 * Apply inline styles to text node
 */
export async function applyInlineStyles(
  textNode: TextNode,
  spans: Array<{ start: number; end: number; style: 'bold' | 'italic' | 'boldItalic' }>
): Promise<void> {
  const fonts = await loadFonts()

  for (const span of spans) {
    if (span.start < textNode.characters.length && span.end <= textNode.characters.length && span.start < span.end) {
      let fontStyle: FontName
      switch (span.style) {
        case 'bold':
          fontStyle = fonts.bold
          break
        case 'italic':
          fontStyle = fonts.italic
          break
        case 'boldItalic':
          fontStyle = fonts.boldItalic
          break
        default:
          fontStyle = fonts.regular
      }
      textNode.setRangeFontName(span.start, span.end, fontStyle)
    }
  }
}

/**
 * Simple vertical layout helper (y-offset stacking)
 */
export function stackVertically(nodes: SceneNode[], startY: number, gap: number = 12): void {
  let currentY = startY
  for (const node of nodes) {
    node.y = currentY
    currentY += ('height' in node ? node.height : 0) + gap
  }
}

/**
 * Safe auto-layout frame creator
 */
export function createAutoLayoutFrameSafe(
  name: string,
  direction: 'HORIZONTAL' | 'VERTICAL',
  options: {
    padding?: { top?: number; right?: number; bottom?: number; left?: number }
    gap?: number
    primaryAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
  } = {}
): FrameNode {
  const frame = figma.createFrame()
  frame.name = name
  frame.layoutMode = direction
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'

  if (options.padding) {
    frame.paddingTop = options.padding.top ?? 0
    frame.paddingRight = options.padding.right ?? 0
    frame.paddingBottom = options.padding.bottom ?? 0
    frame.paddingLeft = options.padding.left ?? 0
  }

  if (options.gap !== undefined) {
    frame.itemSpacing = options.gap
  }

  if (options.primaryAxisAlign) {
    frame.primaryAxisAlignItems = options.primaryAxisAlign
  }

  if (options.counterAxisAlign) {
    frame.counterAxisAlignItems = options.counterAxisAlign
  }

  return frame
}

