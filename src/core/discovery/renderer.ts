/**
 * Discovery Copilot Renderer
 * 
 * Renders DiscoverySpecV1 as a human-readable document that updates incrementally.
 * Document appears immediately and updates as conversation progresses.
 */

import type { DiscoverySpecV1, DocumentStatus } from './types'
import type { ExtractedDiscoveryData } from './extract'
import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../stage/primitives'

/**
 * Truncate text to max length, adding "..." if truncated
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Calculate section placement
 * Places section below lowest existing node + 120px, or at origin if no nodes
 */
function calculateSectionPlacement(section: FrameNode): { x: number; y: number } {
  const page = figma.currentPage
  const children = page.children.filter(child => child !== section) // Exclude section itself
  
  if (children.length === 0) {
    // No existing nodes: place at origin
    return { x: 0, y: 0 }
  }
  
  // Find lowest/bottom-most bounding box
  let lowestBottom = 0
  
  for (const child of children) {
    let bottom = 0
    
    if ('absoluteBoundingBox' in child && child.absoluteBoundingBox) {
      bottom = child.absoluteBoundingBox.y + child.absoluteBoundingBox.height
    } else if ('absoluteRenderBounds' in child && child.absoluteRenderBounds) {
      bottom = child.absoluteRenderBounds.y + child.absoluteRenderBounds.height
    } else if ('y' in child && 'height' in child) {
      // Calculate absolute position
      let currentY = child.y
      let parent: BaseNode | null = child.parent
      while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
        if ('y' in parent) {
          currentY += parent.y
        }
        parent = parent.parent
      }
      bottom = currentY + (child.height || 0)
    }
    
    if (bottom > lowestBottom) {
      lowestBottom = bottom
    }
  }
  
  // Place section below lowest node + 120px padding
  const y = lowestBottom + 120
  
  // Ensure y >= 0
  return { x: 0, y: Math.max(0, y) }
}

/**
 * Create initial discovery document frame
 * Called when assistant first starts
 */
export async function createDiscoveryDocument(title: string, status: DocumentStatus): Promise<FrameNode> {
  const fonts = await loadFonts()

  // Create document frame
  const frame = figma.createFrame()
  frame.name = `Discovery — ${title}`
  
  // Set up frame with vertical auto-layout
  frame.layoutMode = 'VERTICAL'
  frame.primaryAxisSizingMode = 'AUTO' // HUG for height (vertical layout)
  frame.counterAxisSizingMode = 'FIXED' // Fixed width
  frame.resize(800, 100) // Initial width, height will grow automatically
  frame.itemSpacing = 24
  frame.paddingTop = 40
  frame.paddingRight = 40
  frame.paddingBottom = 40
  frame.paddingLeft = 40

  // Apply document styling
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  frame.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 }]
  frame.strokeWeight = 1
  frame.cornerRadius = 8
  frame.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 4,
    visible: true,
    blendMode: 'NORMAL'
  }]

  // Add status badge
  const statusBadge = await createStatusBadge(status, fonts)
  frame.appendChild(statusBadge)

  // Add placeholder sections
  await addDocumentSections(frame, {
    problemFrame: undefined,
    risksAndAssumptions: [],
    hypothesesAndExperiments: [],
    decisionLog: [],
    asyncTasks: []
  }, status, fonts)

  // Calculate placement
  const placement = calculateSectionPlacement(frame)
  frame.x = placement.x
  frame.y = placement.y

  // Append to current page
  figma.currentPage.appendChild(frame)

  // Scroll into view and select
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])

  return frame
}

/**
 * Update existing discovery document with new data
 */
export async function updateDiscoveryDocument(
  frame: FrameNode,
  extractedData: ExtractedDiscoveryData,
  status: DocumentStatus
): Promise<void> {
  const fonts = await loadFonts()

  // Update status badge (first child)
  if (frame.children.length > 0) {
    const oldBadge = frame.children[0]
    if (oldBadge.name === 'Status Badge') {
      oldBadge.remove()
    }
  }
  const statusBadge = await createStatusBadge(status, fonts)
  frame.insertChild(0, statusBadge)

  // Remove old sections (everything after status badge)
  const sectionsToRemove: SceneNode[] = []
  for (let i = 1; i < frame.children.length; i++) {
    sectionsToRemove.push(frame.children[i])
  }
  for (const node of sectionsToRemove) {
    node.remove()
  }

  // Add updated sections
  await addDocumentSections(frame, extractedData, status, fonts)

  // Update frame name if title changed
  if (extractedData.meta?.title) {
    frame.name = `Discovery — ${extractedData.meta.title}`
  }
}

/**
 * Create status badge
 */
async function createStatusBadge(status: DocumentStatus, fonts: Awaited<ReturnType<typeof loadFonts>>): Promise<FrameNode> {
  const badge = createAutoLayoutFrameSafe('Status Badge', 'HORIZONTAL', {
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    gap: 8
  })
  badge.counterAxisSizingMode = 'FIXED'
  badge.resize(200, 32)

  const statusText = status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'
  const textNode = await createTextNode(`STATUS: ${statusText}`, {
    fontSize: 14,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  })
  badge.appendChild(textNode)

  // Color based on status
  if (status === 'COMPLETED') {
    badge.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.7, b: 0.2 } }] // Green
  } else {
    badge.fills = [{ type: 'SOLID', color: { r: 1, g: 0.6, b: 0.2 } }] // Orange
  }
  badge.cornerRadius = 4

  return badge
}

/**
 * Add document sections to frame
 */
async function addDocumentSections(
  frame: FrameNode,
  data: ExtractedDiscoveryData,
  status: DocumentStatus,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  // Problem Frame section
  await addProblemFrameSection(frame, data.problemFrame, fonts)

  // Risks & Assumptions section
  if (data.risksAndAssumptions && data.risksAndAssumptions.length > 0) {
    await addRisksSection(frame, data.risksAndAssumptions, fonts)
  } else {
    await addEmptySection(frame, 'Risks & Assumptions', 'No risks or assumptions identified yet.', fonts)
  }

  // Hypotheses & Experiments section
  if (data.hypothesesAndExperiments && data.hypothesesAndExperiments.length > 0) {
    await addHypothesesSection(frame, data.hypothesesAndExperiments, fonts)
  } else {
    await addEmptySection(frame, 'Hypotheses & Experiments', 'No hypotheses identified yet.', fonts)
  }

  // Decision Log (if present)
  if (data.decisionLog && data.decisionLog.length > 0) {
    await addDecisionLogSection(frame, data.decisionLog, fonts)
  }

  // Async Tasks (if present)
  if (data.asyncTasks && data.asyncTasks.length > 0) {
    await addAsyncTasksSection(frame, data.asyncTasks, fonts)
  }
}

/**
 * Add Problem Frame section
 */
async function addProblemFrameSection(
  parent: FrameNode,
  problemFrame: Partial<DiscoverySpecV1['problemFrame']> | undefined,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe('Problem Frame', 'VERTICAL', {
    gap: 12
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  // Section heading
  const heading = await createTextNode('Problem Frame', {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  // What
  const whatLabel = await createTextNode('What:', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(whatLabel)
  const whatValue = problemFrame?.what || 'TBD'
  const whatText = await createTextNode(
    whatValue,
    {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: problemFrame?.what ? { r: 0.2, g: 0.2, b: 0.2 } : { r: 0.6, g: 0.6, b: 0.6 } }]
    }
  )
  section.appendChild(whatText)

  // Who
  const whoLabel = await createTextNode('Who:', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(whoLabel)
  const whoValue = problemFrame?.who || 'TBD'
  const whoText = await createTextNode(
    whoValue,
    {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: problemFrame?.who ? { r: 0.2, g: 0.2, b: 0.2 } : { r: 0.6, g: 0.6, b: 0.6 } }]
    }
  )
  section.appendChild(whoText)

  // Why
  const whyLabel = await createTextNode('Why:', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(whyLabel)
  const whyValue = problemFrame?.why || 'TBD'
  const whyText = await createTextNode(
    whyValue,
    {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: problemFrame?.why ? { r: 0.2, g: 0.2, b: 0.2 } : { r: 0.6, g: 0.6, b: 0.6 } }]
    }
  )
  section.appendChild(whyText)

  // Success
  const successLabel = await createTextNode('Success:', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(successLabel)
  const successValue = problemFrame?.success || 'TBD'
  const successText = await createTextNode(
    successValue,
    {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: problemFrame?.success ? { r: 0.2, g: 0.2, b: 0.2 } : { r: 0.6, g: 0.6, b: 0.6 } }]
    }
  )
  section.appendChild(successText)

  parent.appendChild(section)
}

/**
 * Add Risks & Assumptions section
 */
async function addRisksSection(
  parent: FrameNode,
  risks: DiscoverySpecV1['risksAndAssumptions'],
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe('Risks & Assumptions', 'VERTICAL', {
    gap: 8
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  // Section heading
  const heading = await createTextNode('Risks & Assumptions', {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  // Items
  for (const item of risks) {
    const itemRow = createAutoLayoutFrameSafe(`Item ${item.id}`, 'HORIZONTAL', {
      gap: 8
    })
    itemRow.counterAxisSizingMode = 'AUTO' // HUG for height (horizontal layout)
    itemRow.primaryAxisSizingMode = 'AUTO' // HUG for width

    const prefix = `• [${item.type.toUpperCase()}]`
    const bullet = await createTextNode(prefix, {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
    })
    itemRow.appendChild(bullet)

    const description = await createTextNode(truncateText(item.description, 400), {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    itemRow.appendChild(description)

    section.appendChild(itemRow)
  }

  parent.appendChild(section)
}

/**
 * Add Hypotheses & Experiments section
 */
async function addHypothesesSection(
  parent: FrameNode,
  hypotheses: DiscoverySpecV1['hypothesesAndExperiments'],
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe('Hypotheses & Experiments', 'VERTICAL', {
    gap: 12
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  // Section heading
  const heading = await createTextNode('Hypotheses & Experiments', {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  // Items
  for (const item of hypotheses) {
    const itemFrame = createAutoLayoutFrameSafe(`Hypothesis ${item.id}`, 'VERTICAL', {
      gap: 4
    })
    itemFrame.counterAxisSizingMode = 'FIXED'
    itemFrame.primaryAxisSizingMode = 'AUTO' // HUG for height
    itemFrame.resize(720, 100) // Width fixed, height will grow

    const hypothesisLabel = await createTextNode('Hypothesis:', {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
    })
    itemFrame.appendChild(hypothesisLabel)

    const hypothesisText = await createTextNode(truncateText(item.hypothesis, 400), {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    itemFrame.appendChild(hypothesisText)

    if (item.experiment) {
      const experimentLabel = await createTextNode('Experiment:', {
        fontSize: 14,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
      })
      itemFrame.appendChild(experimentLabel)

      const experimentText = await createTextNode(truncateText(item.experiment, 400), {
        fontSize: 14,
        fontName: fonts.italic,
        fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
      })
      itemFrame.appendChild(experimentText)
    }

    section.appendChild(itemFrame)
  }

  parent.appendChild(section)
}

/**
 * Add Decision Log section
 */
async function addDecisionLogSection(
  parent: FrameNode,
  decisions: DiscoverySpecV1['decisionLog'],
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe('Decision Log', 'VERTICAL', {
    gap: 8
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  const heading = await createTextNode('Decision Log', {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  if (!decisions) return
  for (const entry of decisions) {
    const entryFrame = createAutoLayoutFrameSafe('Decision Entry', 'VERTICAL', {
      gap: 4
    })
    entryFrame.counterAxisSizingMode = 'FIXED'
    entryFrame.primaryAxisSizingMode = 'AUTO' // HUG for height
    entryFrame.resize(720, 100) // Width fixed, height will grow

    const timestamp = await createTextNode(entry.timestamp, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }]
    })
    entryFrame.appendChild(timestamp)

    const decision = await createTextNode(truncateText(entry.decision, 400), {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
    })
    entryFrame.appendChild(decision)

    if (entry.rationale) {
      const rationale = await createTextNode(truncateText(entry.rationale, 300), {
        fontSize: 12,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
      })
      entryFrame.appendChild(rationale)
    }

    section.appendChild(entryFrame)
  }

  parent.appendChild(section)
}

/**
 * Add Async Tasks section
 */
async function addAsyncTasksSection(
  parent: FrameNode,
  tasks: DiscoverySpecV1['asyncTasks'],
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe('Async Tasks', 'VERTICAL', {
    gap: 8
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  const heading = await createTextNode('Async Tasks', {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  if (!tasks) return
  for (const task of tasks) {
    const taskRow = createAutoLayoutFrameSafe(`Task ${task.ownerRole}`, 'HORIZONTAL', {
      gap: 12
    })
    taskRow.counterAxisSizingMode = 'AUTO' // HUG for height (horizontal layout)
    taskRow.primaryAxisSizingMode = 'AUTO' // HUG for width

    const roleBadge = await createTextNode(task.ownerRole, {
      fontSize: 12,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    })
    const badgeFrame = createAutoLayoutFrameSafe('Role Badge', 'HORIZONTAL', {
      padding: { top: 4, right: 8, bottom: 4, left: 8 },
      gap: 4
    })
    badgeFrame.counterAxisSizingMode = 'FIXED'
    badgeFrame.resize(100, 24)
    badgeFrame.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } }]
    badgeFrame.cornerRadius = 4
    badgeFrame.appendChild(roleBadge)
    taskRow.appendChild(badgeFrame)

    const taskText = await createTextNode(truncateText(task.task, 400), {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    taskRow.appendChild(taskText)

    section.appendChild(taskRow)
  }

  parent.appendChild(section)
}

/**
 * Add empty section placeholder
 */
async function addEmptySection(
  parent: FrameNode,
  title: string,
  placeholder: string,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<void> {
  const section = createAutoLayoutFrameSafe(title, 'VERTICAL', {
    gap: 8
  })
  section.counterAxisSizingMode = 'FIXED'
  section.primaryAxisSizingMode = 'AUTO' // HUG for height
  section.resize(720, 100) // Width fixed, height will grow

  const heading = await createTextNode(title, {
    fontSize: 20,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
  })
  section.appendChild(heading)

  const placeholderText = await createTextNode(placeholder, {
    fontSize: 14,
    fontName: fonts.italic,
    fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }]
  })
  section.appendChild(placeholderText)

  parent.appendChild(section)
}

/**
 * Render complete discovery document (for final state)
 * This is a convenience function that creates a new document from a complete spec
 */
export async function renderDiscoveryDocument(
  spec: DiscoverySpecV1,
  status: DocumentStatus
): Promise<FrameNode> {
  const title = spec.meta.title || 'Session'
  const frame = await createDiscoveryDocument(title, status)
  await updateDiscoveryDocument(frame, spec, status)
  return frame
}
