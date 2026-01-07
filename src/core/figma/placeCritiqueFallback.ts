/**
 * Place Critique Fallback
 * Fallback rendering for Design Critique when JSON parsing fails
 * Creates a styled text frame with markdown converted to styled text
 */

interface TextSpan {
  start: number
  end: number
  style: 'regular' | 'bold' | 'italic' | 'boldItalic'
  size?: number
}

interface ParsedText {
  text: string
  spans: TextSpan[]
}

/**
 * Parse markdown to plain text with style spans
 * Converts bold (**text**), italic (*text*), headings (# ## ###), and lists
 */
function parseMarkdownToStyledText(md: string): ParsedText {
  const lines = md.split('\n')
  const output: string[] = []
  const spans: TextSpan[] = []
  let currentOffset = 0
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const originalLineStart = currentOffset
    
    // Detect heading level
    let headingLevel = 0
    if (line.match(/^#{1,3}\s+/)) {
      const match = line.match(/^(#{1,3})\s+/)
      if (match) {
        headingLevel = match[1].length
        line = line.replace(/^#{1,3}\s+/, '')
      }
    }
    
    // Detect list markers
    const isUnorderedList = /^[-*]\s+/.test(line)
    const orderedListMatch = line.match(/^\d+\.\s+/)
    const isOrderedList = !!orderedListMatch
    
    // Process list markers
    if (isUnorderedList) {
      line = line.replace(/^[-*]\s+/, '• ')
    } else if (isOrderedList) {
      const num = orderedListMatch[0].replace(/\s+$/, '')
      line = line.replace(/^\d+\.\s+/, `${num} `)
    }
    
    // Process inline markdown: **bold** and *italic*
    // First, handle **bold** (non-greedy)
    const boldRegex = /\*\*([^*]+)\*\*/g
    const boldMatches: Array<{ start: number; end: number; text: string }> = []
    let boldMatch
    while ((boldMatch = boldRegex.exec(line)) !== null) {
      boldMatches.push({
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        text: boldMatch[1]
      })
    }
    
    // Then handle *italic* (but not **bold**)
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g
    const italicMatches: Array<{ start: number; end: number; text: string }> = []
    let italicMatch: RegExpExecArray | null
    while ((italicMatch = italicRegex.exec(line)) !== null) {
      // Check if this is inside a bold match
      const isInsideBold = boldMatches.some(b => 
        italicMatch!.index >= b.start && italicMatch!.index < b.end
      )
      if (!isInsideBold) {
        italicMatches.push({
          start: italicMatch.index,
          end: italicMatch.index + italicMatch[0].length,
          text: italicMatch[1]
        })
      }
    }
    
    // Also handle _italic_ (underscore variant)
    const italicUnderscoreRegex = /(?<!_)_([^_]+)_(?!_)/g
    let italicUnderscoreMatch: RegExpExecArray | null
    while ((italicUnderscoreMatch = italicUnderscoreRegex.exec(line)) !== null) {
      const isInsideBold = boldMatches.some(b => 
        italicUnderscoreMatch!.index >= b.start && italicUnderscoreMatch!.index < b.end
      )
      if (!isInsideBold) {
        italicMatches.push({
          start: italicUnderscoreMatch.index,
          end: italicUnderscoreMatch.index + italicUnderscoreMatch[0].length,
          text: italicUnderscoreMatch[1]
        })
      }
    }
    
    // Build output text by removing markdown delimiters
    let outputLine = line
    // Remove bold markers
    for (const match of boldMatches.reverse()) {
      outputLine = outputLine.substring(0, match.start) + match.text + outputLine.substring(match.end)
      // Adjust subsequent match positions
      for (const otherMatch of boldMatches) {
        if (otherMatch.start > match.start) {
          otherMatch.start -= 2
          otherMatch.end -= 2
        }
      }
      for (const otherMatch of italicMatches) {
        if (otherMatch.start > match.start) {
          otherMatch.start -= 2
          otherMatch.end -= 2
        }
      }
    }
    // Remove italic markers
    for (const match of italicMatches.reverse()) {
      if (outputLine.substring(match.start, match.end).includes('*') || outputLine.substring(match.start, match.end).includes('_')) {
        const markerLength = outputLine[match.start] === '*' ? 1 : 1
        outputLine = outputLine.substring(0, match.start) + match.text + outputLine.substring(match.end)
        // Adjust subsequent match positions
        for (const otherMatch of boldMatches) {
          if (otherMatch.start > match.start) {
            otherMatch.start -= markerLength
            otherMatch.end -= markerLength
          }
        }
        for (const otherMatch of italicMatches) {
          if (otherMatch.start > match.start) {
            otherMatch.start -= markerLength
            otherMatch.end -= markerLength
          }
        }
      }
    }
    
    // Add line to output
    output.push(outputLine)
    
    // Record spans for bold/italic
    const lineStartOffset = currentOffset
    for (const match of boldMatches) {
      const boldStart = lineStartOffset + match.start
      const boldEnd = boldStart + match.text.length
      // Check if this range overlaps with italic
      const hasItalic = italicMatches.some(it => 
        (it.start < match.end && it.end > match.start) ||
        (match.start < it.end && match.end > it.start)
      )
      if (hasItalic) {
        spans.push({ start: boldStart, end: boldEnd, style: 'boldItalic' })
      } else {
        spans.push({ start: boldStart, end: boldEnd, style: 'bold' })
      }
    }
    
    for (const match of italicMatches) {
      const italicStart = lineStartOffset + match.start
      const italicEnd = italicStart + match.text.length
      // Check if this range overlaps with bold
      const hasBold = boldMatches.some(b => 
        (b.start < match.end && b.end > match.start) ||
        (match.start < b.end && match.end > b.start)
      )
      if (!hasBold) {
        spans.push({ start: italicStart, end: italicEnd, style: 'italic' })
      }
    }
    
    // Record span for heading
    if (headingLevel > 0 && outputLine.trim().length > 0) {
      const headingStart = lineStartOffset
      const headingEnd = headingStart + outputLine.length
      spans.push({ 
        start: headingStart, 
        end: headingEnd, 
        style: 'bold',
        size: headingLevel === 1 ? 18 : headingLevel === 2 ? 16 : 14
      })
    }
    
    currentOffset += outputLine.length + 1 // +1 for newline
  }
  
  const finalText = output.join('\n')
  
  return {
    text: finalText,
    spans: spans.sort((a, b) => a.start - b.start)
  }
}

/**
 * Place critique text on canvas as a simple text frame with styled text
 * Converts markdown to styled Figma text
 */
export async function placeCritiqueOnCanvas(text: string, selectedNode?: SceneNode, runId?: string): Promise<FrameNode> {
  const logId = runId || 'unknown'
  console.log(`[DC ${logId}] placeCritiqueOnCanvas ENTER`, { selectedNode: selectedNode ? { name: selectedNode.name, id: selectedNode.id } : null })
  
  // Import anchor helpers
  const { getTopLevelContainerNodeForArtifact, computeAnchorBoundsForArtifact } = await import('./artifacts/placeArtifact')
  const { computePlacement } = await import('../stage/anchor')
  
  // Truncate very long text (cap at 20k chars)
  const MAX_CHARS = 20000
  let displayText = text
  if (text.length > MAX_CHARS) {
    displayText = text.substring(0, MAX_CHARS) + '\n\n(truncated)'
  }
  
  // Parse markdown to styled text
  const parsed = parseMarkdownToStyledText(displayText)
  
  // Load fonts (try Inter variants, fallback to Roboto)
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
      // Fallback: use Bold if Bold Italic not available
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
  
  // Create frame (NOT auto-layout, clearly labeled as fallback)
  const frame = figma.createFrame()
  frame.name = 'FigmAI — Critique (fallback)'
  // Set pluginData to identify as critique artifact
  frame.setPluginData('figmai.artifactType', 'critique')
  frame.setPluginData('figmai.assistant', 'design_critique')
  // No layoutMode, no padding, no itemSpacing - just a container
  
  // Create text node
  const textNode = figma.createText()
  textNode.name = 'Critique Text'
  textNode.fontName = fonts.regular
  textNode.fontSize = 12
  textNode.characters = parsed.text
  textNode.textAutoResize = 'HEIGHT'
  
  // Apply base font to full range
  textNode.setRangeFontName(0, parsed.text.length, fonts.regular)
  
  // Apply styled spans
  for (const span of parsed.spans) {
    if (span.start < parsed.text.length && span.end <= parsed.text.length && span.start < span.end) {
      // Set font style
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
      
      // Set font size for headings
      if (span.size) {
        textNode.setRangeFontSize(span.start, span.end, span.size)
      }
    }
  }
  
  // Constrain width to 640px
  textNode.resize(640, textNode.height)
  
  // Append text to frame
  frame.appendChild(textNode)
  
  // Resize frame to fit text
  frame.resize(textNode.width, textNode.height)
  
  // Calculate placement using same anchor logic as artifacts
  let anchor: SceneNode | undefined
  let anchorBounds: { x: number; y: number; width: number; height: number } | null = null
  
  if (selectedNode) {
    anchor = getTopLevelContainerNodeForArtifact(selectedNode)
    anchorBounds = computeAnchorBoundsForArtifact(anchor)
    console.log(`[DC ${logId}] placeCritiqueOnCanvas anchor`, {
      selectedNode: { name: selectedNode.name, id: selectedNode.id },
      anchor: { name: anchor.name, id: anchor.id },
      anchorBounds: anchorBounds ? { x: anchorBounds.x, y: anchorBounds.y, width: anchorBounds.width, height: anchorBounds.height } : null
    })
  } else {
    console.log(`[DC ${logId}] placeCritiqueOnCanvas anchor`, { selectedNode: null, anchor: null, anchorBounds: null })
  }
  
  // Use same placement logic as artifacts (40px left, top-aligned)
  const placement = computePlacement(anchorBounds, frame.width, frame.height, {
    mode: 'left',
    offset: 40,
    minX: 0
  })
  
  frame.x = placement.x
  frame.y = placement.y
  
  console.log(`[DC ${logId}] placeCritiqueOnCanvas placement`, { computedX: placement.x, computedY: placement.y, frameWidth: frame.width, frameHeight: frame.height })
  
  // Append to page
  figma.currentPage.appendChild(frame)
  
  // Scroll into view and select
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  
  console.log(`[DC ${logId}] placeCritiqueOnCanvas EXIT`, { frameName: frame.name, frameId: frame.id })
  return frame
}

