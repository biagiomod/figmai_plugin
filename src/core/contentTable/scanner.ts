/**
 * Content Table Scanner
 * Extracts text nodes from a selected container and builds Universal Content Table
 */

import type { UniversalContentTableV1, ContentItemV1, TableMetaV1 } from './types'
import type { ContentTableIgnoreRules, DesignSystemDetectionResult } from '../work/adapter'
import { CONFIG } from '../config'
// Note: SceneNode, TextNode, BaseNode are global types from @figma/plugin-typings (ambient types)

/**
 * Build breadcrumb path from root to node
 */
function buildBreadcrumbPath(rootNode: SceneNode, targetNode: SceneNode): string {
  const path: string[] = []
  let current: BaseNode | null = targetNode
  
  while (current && current !== rootNode) {
    // Skip PAGE and DOCUMENT nodes
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') {
      break
    }
    // Only add SceneNode types to path
    if ('name' in current && current !== rootNode) {
      path.unshift(current.name)
    }
    current = current.parent
  }
  
  // Add root node name at the beginning
  path.unshift(rootNode.name)
  
  return path.join(' / ')
}

/**
 * Resolve main component for an instance node (async-safe for dynamic-page)
 * Returns null if component is external/unavailable
 */
async function resolveInstanceMainComponent(instance: InstanceNode): Promise<ComponentNode | null> {
  try {
    const main = await instance.getMainComponentAsync().catch(() => null)
    
    if (CONFIG.dev.enableSyncApiErrorDetection) {
      console.log('[INSTANCE_DEBUG] resolveInstanceMainComponent:', {
        nodeId: instance.id,
        nodeName: instance.name,
        nodeType: instance.type,
        hasMainComponent: !!main,
        mainComponentName: main?.name,
        mainComponentKey: main?.key
      })
    }
    
    return main
  } catch (error) {
    if (CONFIG.dev.enableSyncApiErrorDetection) {
      console.warn('[INSTANCE_DEBUG] resolveInstanceMainComponent failed:', {
        nodeId: instance.id,
        nodeName: instance.name,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    return null
  }
}

type ComponentContext = {
  kind: "component" | "componentSet" | "instance" | "custom"
  name: string
  key?: string
  variantProperties?: Record<string, string>
}

/**
 * Get component context for a node
 * Enhanced to detect component instances and extract variant properties
 */
async function getComponentContext(node: SceneNode): Promise<ComponentContext> {
  let current: BaseNode | null = node
  
  while (current) {
    if (current.type === 'INSTANCE') {
      const instance = current as InstanceNode
      const mainComponent = await resolveInstanceMainComponent(instance)
      if (mainComponent) {
        // Extract variant properties if available
        const variantProperties: Record<string, string> | undefined = 
          instance.variantProperties && Object.keys(instance.variantProperties).length > 0
            ? Object.fromEntries(
                Object.entries(instance.variantProperties).map(([key, value]) => [
                  key,
                  typeof value === 'string' ? value : String(value)
                ])
              )
            : undefined
        
        return {
          kind: 'instance',
          name: mainComponent.name,
          key: mainComponent.key,
          variantProperties
        }
      }
    } else if (current.type === 'COMPONENT') {
      const component = current as ComponentNode
      return {
        kind: 'component',
        name: component.name,
        key: component.key
      }
    } else if (current.type === 'COMPONENT_SET') {
      const componentSet = current as ComponentSetNode
      return {
        kind: 'componentSet',
        name: componentSet.name,
        key: componentSet.key
      }
    }
    
    // Move to parent, but stop at PAGE/DOCUMENT
    if (current.parent) {
      if (current.parent.type === 'PAGE' || current.parent.type === 'DOCUMENT') {
        break
      }
      // Only continue if parent is a SceneNode
      if ('visible' in current.parent) {
        current = current.parent as SceneNode
      } else {
        break
      }
    } else {
      break
    }
  }
  
  return {
    kind: 'custom',
    name: 'Custom'
  }
}

/**
 * Build stable plugin-safe Figma URL for a node
 * Format: https://www.figma.com/file/<FILE_KEY>?node-id=<encodeURIComponent(nodeId)>
 * Uses /file/ endpoint which is more stable and plugin-safe than /design/
 */
function buildCanonicalFigmaUrl(nodeId: string): string {
  try {
    // Get file key (may not be in types but exists in runtime)
    // @ts-ignore - fileKey may not be in types but exists in runtime
    const fileKey = figma.fileKey
    
    if (!fileKey) {
      // Fallback to figma:// protocol if fileKey not available
      return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    }
    
    // Use encodeURIComponent for node ID to ensure proper URL encoding
    const encodedNodeId = encodeURIComponent(nodeId)
    
    return `https://www.figma.com/file/${fileKey}?node-id=${encodedNodeId}`
  } catch (error) {
    // Fallback to figma:// protocol on any error
    console.warn('[Scanner] Failed to build canonical Figma URL:', error)
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

/**
 * Sort nodes deterministically: top-to-bottom, left-to-right
 * This ensures consistent ordering across scans
 */
function sortNodesDeterministically(nodes: readonly SceneNode[]): SceneNode[] {
  return [...nodes].sort((a, b) => {
    // First sort by Y position (top to bottom)
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 1) { // Allow 1px tolerance for alignment
      return yDiff
    }
    // Then sort by X position (left to right)
    return a.x - b.x
  })
}

/**
 * Infer field role from node name and content
 * Returns: CTA | Headline | Body | Helper | Placeholder | Tooltip | Error | etc.
 */
function inferFieldRole(node: TextNode, path: string): string | undefined {
  const name = node.name.toLowerCase()
  const content = node.characters.toLowerCase()
  
  // Error messages
  if (name.includes('error') || content.includes('error') || name.includes('invalid')) {
    return 'Error'
  }
  
  // CTAs
  if (name.includes('cta') || name.includes('button') || name.includes('action')) {
    return 'CTA'
  }
  
  // Headlines
  if (name.includes('headline') || name.includes('title') || name.includes('heading')) {
    return 'Headline'
  }
  
  // Placeholders
  if (name.includes('placeholder') || content.includes('enter') || content.includes('type')) {
    return 'Placeholder'
  }
  
  // Tooltips
  if (name.includes('tooltip') || name.includes('hint')) {
    return 'Tooltip'
  }
  
  // Helper text
  if (name.includes('helper') || name.includes('help') || name.includes('description')) {
    return 'Helper'
  }
  
  // Body text
  if (name.includes('body') || name.includes('text') || name.includes('content')) {
    return 'Body'
  }
  
  // Default: unknown (leave blank)
  return undefined
}

/**
 * Compile regex patterns safely, returning null for invalid patterns
 */
function compileRegexPattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern)
  } catch (error) {
    console.warn(`[ContentTable] Invalid regex pattern ignored: "${pattern}"`, error)
    return null
  }
}

/**
 * Check if a text node should be ignored based on ignore rules
 */
function shouldIgnoreTextNode(
  node: TextNode,
  componentContext: { key?: string },
  ignoreRules: ContentTableIgnoreRules | null
): boolean {
  if (!ignoreRules) {
    return false // No rules = don't ignore
  }

  // Check node name patterns
  if (ignoreRules.nodeNamePatterns && ignoreRules.nodeNamePatterns.length > 0) {
    for (const pattern of ignoreRules.nodeNamePatterns) {
      const regex = compileRegexPattern(pattern)
      if (regex && regex.test(node.name)) {
        return true // Matched ignore pattern
      }
    }
  }

  // Check node ID prefixes
  if (ignoreRules.nodeIdPrefixes && ignoreRules.nodeIdPrefixes.length > 0) {
    for (const prefix of ignoreRules.nodeIdPrefixes) {
      if (node.id.startsWith(prefix)) {
        return true // Matched ID prefix
      }
    }
  }

  // Check component key allowlist (if provided, only allow these)
  if (ignoreRules.componentKeyAllowlist && ignoreRules.componentKeyAllowlist.length > 0) {
    if (!componentContext.key || !ignoreRules.componentKeyAllowlist.includes(componentContext.key)) {
      return true // Not in allowlist
    }
  }

  // Check component key denylist
  if (ignoreRules.componentKeyDenylist && ignoreRules.componentKeyDenylist.length > 0) {
    if (componentContext.key && ignoreRules.componentKeyDenylist.includes(componentContext.key)) {
      return true // In denylist
    }
  }

  // Check text value patterns
  if (ignoreRules.textValuePatterns && ignoreRules.textValuePatterns.length > 0) {
    for (const pattern of ignoreRules.textValuePatterns) {
      const regex = compileRegexPattern(pattern)
      if (regex && regex.test(node.characters)) {
        return true // Matched text value pattern
      }
    }
  }

  return false // No matches = don't ignore
}

/**
 * Normalize text content for Content Table Assistant
 * - Detects and normalizes list formats (numbered/bullet) to dash-prefixed format
 * - Only normalizes when 2+ lines match list-item patterns (reduces false positives)
 * - Preserves special characters exactly as they appear
 * - Preserves all line breaks and carriage returns exactly as they appear
 * - Keeps lists as single text blocks (including header lines)
 * 
 * Supported numbered markers: "1-", "1 -", "1.", "1)", "2-", etc.
 * Supported bullet markers: "•", "-", "*"
 */
function normalizeContentTableText(text: string): string {
  if (!text || text.trim().length === 0) {
    return text
  }

  // Split by line breaks while preserving the original line break style
  // Handle \r\n (Windows), \n (Unix), and \r (old Mac) line breaks
  const lineBreakRegex = /\r\n|\r|\n/
  const lines = text.split(lineBreakRegex)
  
  // Detect the original line break style used in the text
  // Default to \n if no line breaks found, otherwise use the first one encountered
  let lineBreakStyle = '\n'
  if (text.includes('\r\n')) {
    lineBreakStyle = '\r\n'
  } else if (text.includes('\r')) {
    lineBreakStyle = '\r'
  } else if (text.includes('\n')) {
    lineBreakStyle = '\n'
  }
  
  // Helper function to check if a line is a numbered list item
  function isNumberedListItem(line: string): boolean {
    // Match: optional whitespace, digits, optional whitespace, then period/paren/dash, optional whitespace, then content
    // Patterns: "1.", "1. ", "1 -", "1-", "1)", "1 )", etc.
    const match = line.match(/^\s*\d+\s*[\.\)\-]\s*(.+)$/)
    const result = match !== null && match[1].trim().length > 0
    return result
  }
  
  // Helper function to check if a line is a bullet list item
  function isBulletListItem(line: string): boolean {
    // Match: optional whitespace, bullet character (•, -, *), optional whitespace, then content
    const match = line.match(/^\s*[•\-\*]\s*(.+)$/)
    const result = match !== null && match[1].trim().length > 0
    return result
  }
  
  // Helper function to extract content after numbered marker
  function extractNumberedContent(line: string): string | null {
    const match = line.match(/^\s*\d+\s*[\.\)\-]\s*(.+)$/)
    return match ? match[1].trimStart() : null
  }
  
  // Helper function to extract content after bullet marker
  function extractBulletContent(line: string): string | null {
    const match = line.match(/^\s*[•\-\*]\s*(.+)$/)
    return match ? match[1].trimStart() : null
  }
  
  // Count lines that match list patterns (must have content after marker)
  let listItemCount = 0
  for (const line of lines) {
    if (isNumberedListItem(line) || isBulletListItem(line)) {
      listItemCount++
    }
  }
  
  // Count non-empty lines (for detecting unmarked lists)
  const nonEmptyLines = lines.filter(line => line.trim().length > 0)
  const hasUnmarkedList = listItemCount === 0 && nonEmptyLines.length >= 3 && lines.length >= 3
  
  // Normalize if we have 2+ marked list items OR if we detect an unmarked list (3+ non-empty lines)
  const shouldNormalize = listItemCount >= 2 || hasUnmarkedList
  
  if (!shouldNormalize) {
    return text // Return unchanged if not enough list items
  }
  
  // Normalize list items
  const normalizedLines = lines.map((line, index) => {
    // Check for numbered pattern
    const numberedContent = extractNumberedContent(line)
    if (numberedContent !== null && numberedContent.length > 0) {
      const normalized = `- ${numberedContent}`
      return normalized
    }
    
    // Check for bullet pattern
    const bulletContent = extractBulletContent(line)
    if (bulletContent !== null && bulletContent.length > 0) {
      const normalized = `- ${bulletContent}`
      return normalized
    }
    
    // Handle unmarked list items (when we detected an unmarked list but this line doesn't have a marker)
    // Only normalize non-empty lines that aren't the first line (first line might be a header)
    if (hasUnmarkedList && line.trim().length > 0 && index > 0) {
      // Skip empty lines, but normalize content lines after the first
      const normalized = `- ${line.trimStart()}`
      return normalized
    }
    
    // Non-list line: return unchanged (preserves header lines, special characters, and carriage returns)
    return line
  })
  
  // Rejoin with the original line break style to preserve line breaks and carriage returns
  const result = normalizedLines.join(lineBreakStyle)
  
  return result
}

/**
 * Recursively collect all text nodes from a node's subtree
 * Enhanced with deterministic ordering (top-to-bottom, left-to-right)
 * CRITICAL: Ignores hidden layers (node.visible === false) and does NOT traverse their children
 * Applies ignore rules if provided (Work-only feature)
 * Records design system detection results (Work-only feature)
 */
async function collectTextNodes(
  rootNode: SceneNode,
  items: ContentItemV1[],
  currentPath: string[] = [],
  ignoreRules: ContentTableIgnoreRules | null = null,
  detectDesignSystemComponent?: (node: SceneNode) => DesignSystemDetectionResult | null,
  designSystemCache: Map<string, DesignSystemDetectionResult | null> = new Map(),
  designSystemByNodeId: Record<string, DesignSystemDetectionResult> = {}
): Promise<void> {
  // CRITICAL RULE: Skip hidden nodes entirely
  if (!rootNode.visible) {
    return // Do NOT traverse children of hidden nodes
  }
  
  // Detect design system for this node if detector is provided (Work-only feature)
  // Cache results by node.id to avoid redundant calls
  let dsResult: DesignSystemDetectionResult | null = null
  if (detectDesignSystemComponent) {
    if (designSystemCache.has(rootNode.id)) {
      dsResult = designSystemCache.get(rootNode.id) ?? null
    } else {
      // Only call detector for relevant node types (keep it cheap)
      const nodeType = rootNode.type
      if (nodeType === 'FRAME' || nodeType === 'INSTANCE' || nodeType === 'COMPONENT' || nodeType === 'COMPONENT_SET' || nodeType === 'TEXT') {
        try {
          dsResult = detectDesignSystemComponent(rootNode)
        } catch (error) {
          console.warn(`[ContentTable] Design system detection failed for node ${rootNode.id}:`, error)
          dsResult = null
        }
      }
      designSystemCache.set(rootNode.id, dsResult)
      
      // Store in map if detected
      if (dsResult && dsResult.isDesignSystem) {
        designSystemByNodeId[rootNode.id] = dsResult
      }
    }
  }
  
  // If this is a text node, check ignore rules and add to items if not ignored
  if (rootNode.type === 'TEXT') {
    const textNode = rootNode as TextNode
    const componentContext = await getComponentContext(textNode)
    
    // Check if this node should be ignored (Work-only feature)
    if (shouldIgnoreTextNode(textNode, componentContext, ignoreRules)) {
      return // Skip this node, but continue traversing children
    }
    
    const breadcrumb = currentPath.length > 0 
      ? currentPath.join(' / ')
      : textNode.name
    
    const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
    const role = inferFieldRole(textNode, breadcrumb)
    
    // Get DS detection result for this text node
    const nodeDsResult = designSystemCache.get(textNode.id) ?? null
    
    const item: ContentItemV1 = {
      id: textNode.id,
      nodeId: textNode.id,
      nodeUrl: nodeUrl,
      component: componentContext,
      field: {
        label: textNode.name,
        path: breadcrumb,
        role: role
      },
      content: {
        type: 'text',
        value: normalizeContentTableText(textNode.characters)
      },
      textLayerName: textNode.name, // For TEXT nodes only
      meta: {
        visible: textNode.visible !== false,
        locked: textNode.locked === true
      },
      // Optional fields (blank by default)
      notes: '',
      contentKey: '',
      jiraTicket: '',
      adaNotes: '',
      // Error message: populate if role === "Error"
      errorMessage: role === 'Error' ? textNode.characters : '',
      // Design system detection result (Work-only feature)
      designSystem: nodeDsResult && nodeDsResult.isDesignSystem ? nodeDsResult : undefined
    }
    
    items.push(item)
  }
  
  // Traverse children if node has them
  if ('children' in rootNode) {
    // Sort children deterministically (top-to-bottom, left-to-right)
    const sortedChildren = sortNodesDeterministically(rootNode.children)
    
    for (const child of sortedChildren) {
      // CRITICAL RULE: Skip hidden nodes entirely
      if (!child.visible) {
        continue // Do NOT traverse children of hidden nodes
      }
      
      if (child.type === 'TEXT') {
        const textNode = child as TextNode
        const componentContext = await getComponentContext(textNode)
        
        // Check if this node should be ignored (Work-only feature)
        if (shouldIgnoreTextNode(textNode, componentContext, ignoreRules)) {
          continue // Skip this node, continue to next child
        }
        
        // Detect design system for this text node
        let childDsResult: DesignSystemDetectionResult | null = null
        if (detectDesignSystemComponent) {
          if (designSystemCache.has(textNode.id)) {
            childDsResult = designSystemCache.get(textNode.id) ?? null
          } else {
            try {
              childDsResult = detectDesignSystemComponent(textNode)
            } catch (error) {
              console.warn(`[ContentTable] Design system detection failed for node ${textNode.id}:`, error)
              childDsResult = null
            }
            designSystemCache.set(textNode.id, childDsResult)
            
            // Store in map if detected
            if (childDsResult && childDsResult.isDesignSystem) {
              designSystemByNodeId[textNode.id] = childDsResult
            }
          }
        }
        
        const childPath = [...currentPath, textNode.name]
        const breadcrumb = childPath.join(' / ')
        
        const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
        const role = inferFieldRole(textNode, breadcrumb)
        
        const item: ContentItemV1 = {
          id: textNode.id,
          nodeId: textNode.id,
          nodeUrl: nodeUrl,
          component: componentContext,
          field: {
            label: textNode.name,
            path: breadcrumb,
            role: role
          },
          content: {
            type: 'text',
            value: normalizeContentTableText(textNode.characters)
          },
          textLayerName: textNode.name, // For TEXT nodes only
          meta: {
            visible: textNode.visible !== false,
            locked: textNode.locked === true
          },
          // Optional fields (blank by default)
          notes: '',
          contentKey: '',
          jiraTicket: '',
          adaNotes: '',
          // Error message: populate if role === "Error"
          errorMessage: role === 'Error' ? textNode.characters : '',
          // Design system detection result (Work-only feature)
          designSystem: childDsResult && childDsResult.isDesignSystem ? childDsResult : undefined
        }
        
        items.push(item)
      } else if ('children' in child) {
        // Recursively scan child containers (pass cache and map down)
        const childPath = [...currentPath, child.name]
        await collectTextNodes(child as SceneNode, items, childPath, ignoreRules, detectDesignSystemComponent, designSystemCache, designSystemByNodeId)
      }
    }
  }
}

/**
 * Export node as thumbnail image (~100px width)
 * Returns base64 data URL or undefined if export fails
 */
async function exportThumbnail(node: SceneNode): Promise<string | undefined> {
  try {
    // Calculate scale to get ~100px width
    const targetWidth = 100
    const nodeWidth = 'width' in node ? node.width : 100
    const scale = Math.min(1, targetWidth / nodeWidth)
    
    // Export as PNG
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: {
        type: 'SCALE',
        value: scale
      }
    })
    
    // Convert to base64 data URL
    const base64 = figma.base64Encode(bytes)
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.warn('[Scanner] Failed to export thumbnail:', error)
    return undefined
  }
}

/**
 * Scan selected container and generate Universal Content Table
 * Now async to support thumbnail export
 * 
 * @param selectedNode - The node to scan
 * @param ignoreRules - Optional ignore rules from Work adapter (Work-only feature)
 * @param detectDesignSystemComponent - Optional design system detector from Work adapter (Work-only feature)
 */
export async function scanContentTable(
  selectedNode: SceneNode,
  ignoreRules: ContentTableIgnoreRules | null = null,
  detectDesignSystemComponent?: (node: SceneNode) => DesignSystemDetectionResult | null
): Promise<UniversalContentTableV1> {
  const page = selectedNode.parent
  const pageName = page && page.type === 'PAGE' ? page.name : 'Unknown Page'
  const pageId = page && page.type === 'PAGE' ? page.id : ''
  
  const items: ContentItemV1[] = []
  const designSystemCache = new Map<string, DesignSystemDetectionResult | null>()
  const designSystemByNodeId: Record<string, DesignSystemDetectionResult> = {}
  
  // Collect all text nodes from the selected container
  // Start with root node name in path
  // CRITICAL: Hidden nodes are automatically skipped by collectTextNodes
  // Work-only: Ignore rules and design system detection are applied if provided
  await collectTextNodes(selectedNode, items, [selectedNode.name], ignoreRules, detectDesignSystemComponent, designSystemCache, designSystemByNodeId)
  
  // Export thumbnail for root node
  const thumbnailDataUrl = await exportThumbnail(selectedNode)
  
  // Build table metadata
  const rootNodeUrl = buildCanonicalFigmaUrl(selectedNode.id)
  const meta: TableMetaV1 = {
    contentModel: 'Universal v2',
    contentStage: 'Draft',
    adaStatus: '⏳ Pending',
    legalStatus: '⏳ Pending',
    lastUpdated: new Date().toISOString(),
    version: 'v1',
    rootNodeId: selectedNode.id,
    rootNodeName: selectedNode.name,
    rootNodeUrl: rootNodeUrl,
    thumbnailDataUrl: thumbnailDataUrl
  }
  
  // Build result object
  const result: UniversalContentTableV1 = {
    type: "universal-content-table",
    version: 1,
    generatedAtISO: new Date().toISOString(),
    source: {
      pageId: pageId,
      pageName: pageName,
      selectionNodeId: selectedNode.id,
      selectionName: selectedNode.name
    },
    meta: meta,
    items: items
  }
  
  // Add design system detection results if any were found (Work-only feature)
  if (Object.keys(designSystemByNodeId).length > 0) {
    result.designSystemByNodeId = designSystemByNodeId
  }
  
  return result
}
