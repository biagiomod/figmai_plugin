/**
 * Errors Assistant Handler
 * Generate Error Screens: clones screen, adds per-variant visible annotation cards (canonical) and native annotations (best-effort).
 * Check Errors: visible frame + native annotation on selection.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import { extractJsonFromResponse } from '../../output/normalize'
import { getPlacementTarget, placeBatchBelowPageContent, placeSingleArtifactNearSelection } from '../../figma/placement'
import { getAnchorBounds } from '../../stage/anchor'
import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../../stage/primitives'
import {
  ensureAnnotationCategory,
  safeSetNativeAnnotations,
  createVisibleAnnotationCard,
  showOnceUserHint
} from '../../figma/annotations'

const DEBUG_GENERATE_ERROR_SCREENS = false
const ANNOTATION_CATEGORY_COLOR = 'orange'

const MAX_VARIANTS = 5
const MAX_CHECK_ITEMS = 6

interface GenerateErrorScreensSpec {
  type?: string
  version?: number
  meta?: { title?: string; sourceName?: string }
  variants?: Array<{
    id: string
    label: string
    rationale: string
    required?: boolean
    trigger?: string
    placementTarget?: string
    userImpact?: string
    recommendedUI?: string
    message?: string
    copy?: { inlineMessage?: string; bannerTitle?: string; toastMessage?: string; helperText?: string }
  }>
}

interface CheckErrorsResult {
  type?: string
  version?: number
  result?: 'PASS' | 'FAIL'
  summary?: string
  items?: Array<{ severity?: string; title?: string; fix?: string }>
}

function isGenerateAction(messages: NormalizedMessage[]): boolean {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const content = (lastUser?.content ?? '').toLowerCase()
  return content.includes('variants') || content.includes('error-state') || content.includes('generate multiple')
}

function cloneableArea(node: SceneNode): number {
  if ('width' in node && 'height' in node && typeof node.width === 'number' && typeof node.height === 'number') {
    const w = node.width
    const h = node.height
    if (!Number.isNaN(w) && !Number.isNaN(h) && w > 0 && h > 0) return w * h
  }
  return 0
}

/** Collect all descendant nodes that are FRAME, COMPONENT, or INSTANCE (flat, depth-first). */
function collectCloneableDescendants(node: BaseNode): SceneNode[] {
  const out: SceneNode[] = []
  if (!('children' in node)) return out
  for (const child of node.children) {
    if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
      out.push(child as SceneNode)
    }
    out.push(...collectCloneableDescendants(child))
  }
  return out
}

/**
 * Two-track selection: analysisTargetNode = what the user selected (for focus/annotation wording).
 * duplicationSourceNode = screen container to clone (FRAME|COMPONENT|INSTANCE only; never GROUP).
 *
 * Resolution order for duplicationSourceNode:
 * (a) Nearest ancestor whose parent is PAGE and type is FRAME|COMPONENT|INSTANCE.
 * (b) Else nearest FRAME|COMPONENT|INSTANCE ancestor (walk up, skip GROUP/SECTION/etc).
 * (c) If selection is SECTION or top-level GROUP with no cloneable ancestor: largest-area FRAME descendant, then COMPONENT, then INSTANCE.
 * GROUP is never returned as the duplication source; we always walk up past GROUP to find a screen.
 */
function getDuplicationSourceNode(analysisTargetNode: SceneNode): SceneNode | null {
  function isCloneable(n: SceneNode): boolean {
    return n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE'
  }

  // (a) Top-level cloneable: walk up to find node whose parent is PAGE and is FRAME|COMPONENT|INSTANCE
  let p: BaseNode | null = analysisTargetNode
  while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
    if (p.parent?.type === 'PAGE' && isCloneable(p as SceneNode)) {
      return p as SceneNode
    }
    p = p.parent
  }

  // (b) Nearest FRAME|COMPONENT|INSTANCE ancestor (skip GROUP, SECTION, TEXT, etc.)
  p = analysisTargetNode.parent
  while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
    if (p.type === 'FRAME' || p.type === 'COMPONENT' || p.type === 'INSTANCE') {
      return p as SceneNode
    }
    p = p.parent
  }

  // (c) No cloneable ancestor (e.g. SECTION or GROUP as direct child of PAGE): descendant search
  const descendants = collectCloneableDescendants(analysisTargetNode)
  if (descendants.length === 0) return null
  const frames = descendants.filter(n => n.type === 'FRAME')
  if (frames.length > 0) {
    frames.sort((a, b) => cloneableArea(b) - cloneableArea(a))
    return frames[0]
  }
  const components = descendants.filter(n => n.type === 'COMPONENT')
  if (components.length > 0) {
    components.sort((a, b) => cloneableArea(b) - cloneableArea(a))
    return components[0]
  }
  const instances = descendants.filter(n => n.type === 'INSTANCE')
  if (instances.length > 0) {
    instances.sort((a, b) => cloneableArea(b) - cloneableArea(a))
    return instances[0]
  }
  return null
}

function isInsideInstance(node: SceneNode): boolean {
  let p: BaseNode | null = node.parent
  while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
    if (p.type === 'INSTANCE') return true
    p = p.parent
  }
  return false
}

function getParentChainToPage(node: SceneNode): Array<{ type: string; name: string }> {
  const chain: Array<{ type: string; name: string }> = []
  let p: BaseNode | null = node
  while (p && p.type !== 'PAGE' && p.type !== 'DOCUMENT') {
    chain.push({ type: p.type, name: 'name' in p ? String(p.name) : '' })
    p = p.parent
  }
  return chain
}

export class ErrorsHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'errors' &&
      (actionId === 'generate-error-screens' || actionId === 'check-errors')
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    const isGenerate = isGenerateAction(messages)
    const systemContent = 'Return ONLY valid JSON. No prose, no markdown fences, no code blocks. Output must be a single JSON object.'
    const userHint = isGenerate
      ? 'Output shape: { "type": "generateErrorScreens", "version": 1, "meta": {}, "variants": [ { "id", "label", "rationale", "required", "trigger", "placementTarget?", "userImpact", "recommendedUI", "message?", "copy": {} } ] }. Up to 6 variants.'
      : 'Output shape: { "type": "checkErrors", "version": 1, "result": "PASS"|"FAIL", "summary": "string", "items": [ { "severity", "title", "fix" } ] }. Up to 10 items.'
    return [
      { role: 'system', content: systemContent },
      ...messages,
      { role: 'user', content: userHint }
    ]
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId } = context
    if (actionId === 'generate-error-screens') {
      return this.handleGenerateErrorScreens(context)
    }
    if (actionId === 'check-errors') {
      return this.handleCheckErrors(context)
    }
    return { handled: false }
  }

  private async handleGenerateErrorScreens(context: HandlerContext): Promise<HandlerResult> {
    const runId = `err_${Date.now()}`
    const { response, selectionOrder, replaceStatusMessage, sendChatWithRecovery } = context

    let jsonString = extractJsonFromResponse(response.trim())
    if (!jsonString) {
      jsonString = response.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      return await this.attemptRepairGenerate(context, response, runId)
    }
    const spec = parsed as GenerateErrorScreensSpec
    if (spec.type !== 'generateErrorScreens' || !Array.isArray(spec.variants) || spec.variants.length === 0) {
      return await this.attemptRepairGenerate(context, response, runId)
    }
    const variants = spec.variants.slice(0, MAX_VARIANTS)

    const rawNode = selectionOrder.length > 0 ? await figma.getNodeByIdAsync(selectionOrder[0]) : null
    if (!rawNode || rawNode.type === 'DOCUMENT' || rawNode.type === 'PAGE') {
      replaceStatusMessage('Error: Select a frame or component to duplicate.', true)
      return { handled: true }
    }
    const analysisTargetNode = rawNode as SceneNode
    const duplicationSourceNode = getDuplicationSourceNode(analysisTargetNode)
    const placementTarget = getPlacementTarget(analysisTargetNode)

    if (DEBUG_GENERATE_ERROR_SCREENS) {
      const chain = getParentChainToPage(analysisTargetNode)
      const insideInstance = isInsideInstance(analysisTargetNode)
      console.log('[Errors Generate] selection count=', selectionOrder.length, 'analysisTarget id=', analysisTargetNode.id, 'name=', analysisTargetNode.name, 'type=', analysisTargetNode.type)
      console.log('[Errors Generate] parent chain to page=', chain.map(c => `${c.type}:${c.name}`).join(' <- '))
      console.log('[Errors Generate] inside INSTANCE=', insideInstance)
      console.log('[Errors Generate] duplicationSourceNode for cloning: id=', duplicationSourceNode?.id, 'name=', duplicationSourceNode?.name, 'type=', duplicationSourceNode?.type)
      console.log('[Errors Generate] placement target (anchor): id=', placementTarget?.id, 'name=', placementTarget?.name, 'type=', placementTarget?.type)
      const anchorBounds = placementTarget ? getAnchorBounds(placementTarget) : null
      const boundsInvalid = anchorBounds ? (anchorBounds.width <= 0 || anchorBounds.height <= 0 || Number.isNaN(anchorBounds.x) || Number.isNaN(anchorBounds.y)) : true
      console.log('[Errors Generate] anchor bounds=', anchorBounds, 'invalid or zero=', boundsInvalid)
      figma.notify(`Generate: analysisTarget=${analysisTargetNode.type} duplicationSource=${duplicationSourceNode?.type ?? 'null'} anchor=${placementTarget?.type ?? 'null'}`)
    }

    if (!duplicationSourceNode || !('clone' in duplicationSourceNode) || typeof (duplicationSourceNode as { clone: () => SceneNode }).clone !== 'function') {
      const errorMsg = analysisTargetNode.type === 'SECTION' || analysisTargetNode.type === 'GROUP'
        ? 'Select a Frame (screen) to duplicate. You may have selected a Section or Group; select the frame inside instead.'
        : 'Select a frame or component to duplicate.'
      replaceStatusMessage(`Error: ${errorMsg}`, true)
      await this.createRationaleFrameOnly(context, variants, runId, analysisTargetNode)
      figma.notify(`Could not duplicate selection type ${analysisTargetNode.type}; created rationale only.`)
      return { handled: true }
    }

    try {
      const categoryId = await ensureAnnotationCategory('Error screens', ANNOTATION_CATEGORY_COLOR)
      const section = createAutoLayoutFrameSafe('FigmAI — Error Screens', 'HORIZONTAL', { gap: 24, padding: { top: 16, right: 16, bottom: 16, left: 16 } })
      section.name = `FigmAI — Error Screens (${runId})`
      const fonts = await loadFonts()

      const labelMarkdowns: string[] = []
      let cloneFailed = false
      const CARD_MARGIN = 12
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        let clone: SceneNode
        try {
          clone = (duplicationSourceNode as { clone: () => SceneNode }).clone()
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          figma.notify(`Could not duplicate selection type ${duplicationSourceNode.type}: ${msg}`)
          cloneFailed = true
          break
        }
        clone.name = `${duplicationSourceNode.name} — ${v.label || v.id || `variant-${i + 1}`}`
        const shortLabel = (v.label || v.id || `Variant ${i + 1}`).slice(0, 80)
        const requiredTag = v.required === false ? 'OPTIONAL' : 'REQUIRED'
        const trigger = (v.trigger ?? '—').slice(0, 120)
        const placementTargetStr = (v.placementTarget ?? 'selected frame').slice(0, 80)
        const recommendedUI = (v.recommendedUI ?? '—').slice(0, 80)
        const message = (v.message ?? v.copy?.inlineMessage ?? v.copy?.bannerTitle ?? v.copy?.toastMessage ?? v.copy?.helperText ?? '').slice(0, 200)
        const userImpact = (v.userImpact ?? v.rationale ?? '').slice(0, 200)
        const rationale = (v.rationale ?? '').slice(0, 300)

        const wrapper = createAutoLayoutFrameSafe(`Variant ${i + 1}`, 'HORIZONTAL', { gap: CARD_MARGIN })
        wrapper.appendChild(clone)
        const cardLines = [
          `Trigger: ${trigger}`,
          `Applies to: ${placementTargetStr}`,
          `Recommended UI: ${recommendedUI}`,
          ...(message ? [`Message: "${message}"`] : []),
          `Why: ${userImpact || '—'}`,
          `Rationale: ${rationale || '—'}`
        ]
        const card = await createVisibleAnnotationCard({
          title: `${requiredTag}: ${shortLabel}`,
          lines: cardLines,
          parent: wrapper,
          maxWidth: 260
        })
        card.name = `Annotation — ${shortLabel}`
        section.appendChild(wrapper)

        const md = [
          `**${requiredTag}: ${shortLabel}**`,
          `Trigger: ${trigger}`,
          `Applies to: ${placementTargetStr}`,
          `Recommended UI: ${recommendedUI}`,
          message ? `Message: "${message}"` : null,
          `Why: ${userImpact || '—'}`,
          `Rationale: ${rationale || '—'}`
        ].filter(Boolean).join('\n')
        labelMarkdowns.push(md.trim() ? md : `**${shortLabel}**`)
      }

      if (cloneFailed) {
        await this.createRationaleFrameOnly(context, variants, runId, analysisTargetNode)
        figma.notify(`Could not duplicate selection type ${duplicationSourceNode.type}; created rationale only.`)
        return { handled: true }
      }

      figma.currentPage.appendChild(section)
      try {
        placeBatchBelowPageContent(section, { marginTop: 24 })
      } catch (e) {
        section.x = 0
        section.y = 100
        if (DEBUG_GENERATE_ERROR_SCREENS) console.warn('[Errors Generate] placement failed, using fallback x/y', e)
      }
      if (DEBUG_GENERATE_ERROR_SCREENS) {
        console.log('[Errors Generate] section parent=', section.parent?.id, section.parent?.name, section.parent?.type)
        console.log('[Errors Generate] section after placement: x=', section.x, 'y=', section.y, 'width=', section.width, 'height=', section.height, 'visible=', section.visible)
        const zeroSized = section.width <= 0 || section.height <= 0
        if (zeroSized) console.warn('[Errors Generate] section is zero-sized')
      }

      let attemptedNative = false
      for (let i = 0; i < section.children.length; i++) {
        const wrapper = section.children[i] as FrameNode
        const clone = wrapper.children[0] as SceneNode
        const labelMarkdown = labelMarkdowns[i] ?? `**${variants[i]?.label ?? variants[i]?.id ?? `Variant ${i + 1}`}**`
        if (safeSetNativeAnnotations(clone, [{ labelMarkdown, ...(categoryId ? { categoryId } : {}) }])) {
          attemptedNative = true
        }
      }

      const requiredCount = variants.filter(v => v.required !== false).length
      const optionalCount = variants.length - requiredCount
      const summaryMarkdown = [
        '**Generated Error Screens**',
        'This plugin analyzed the selected element and inferred potential user interactions and system failures that require error handling.',
        'REQUIRED variants = core UX coverage (validation, auth/permission, submit failures).',
        'OPTIONAL variants = contextual/edge scenarios (offline, retry exhaustion, partial success).',
        `Generated: ${requiredCount} required, ${optionalCount} optional.`
      ].join('\n\n')
      if (safeSetNativeAnnotations(duplicationSourceNode as SceneNode, [{ labelMarkdown: summaryMarkdown, ...(categoryId ? { categoryId } : {}) }])) {
        attemptedNative = true
      }

      if (attemptedNative && showOnceUserHint('annotations-visibility', '')) {
        figma.notify("If you don't see Dev Mode annotations, enable View → Annotations or open Dev Mode. Visible annotation cards have been added on-canvas.")
      }

      const annotationFrame = figma.createFrame()
      annotationFrame.name = `FigmAI — Error Screens rationale (${runId})`
      annotationFrame.layoutMode = 'VERTICAL'
      annotationFrame.primaryAxisSizingMode = 'AUTO'
      annotationFrame.counterAxisSizingMode = 'AUTO'
      annotationFrame.paddingTop = 12
      annotationFrame.paddingRight = 12
      annotationFrame.paddingBottom = 12
      annotationFrame.paddingLeft = 12
      annotationFrame.itemSpacing = 8
      annotationFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
      annotationFrame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
      annotationFrame.strokeWeight = 1
      annotationFrame.cornerRadius = 8
      const titleNode = await createTextNode('Rationales', { fontSize: 12, fontName: fonts.bold })
      annotationFrame.appendChild(titleNode)
      for (const v of variants) {
        const line = await createTextNode(`${v.label || v.id}: ${(v.rationale || '').slice(0, 120)}`, { fontSize: 10, fontName: fonts.regular })
        annotationFrame.appendChild(line)
      }
      annotationFrame.x = section.x + section.width + 24
      annotationFrame.y = section.y
      figma.currentPage.appendChild(annotationFrame)

      replaceStatusMessage('Error screens generated.')
      figma.notify('Error screens placed on canvas')
      return { handled: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      replaceStatusMessage(`Error: ${msg}`, true)
      return { handled: true }
    }
  }

  /**
   * Create only the visible "Error Screens rationale" frame when cloning cannot proceed.
   */
  private async createRationaleFrameOnly(
    context: HandlerContext,
    variants: GenerateErrorScreensSpec['variants'],
    runId: string,
    selectedNode: SceneNode
  ): Promise<void> {
    const { replaceStatusMessage } = context
    const fonts = await loadFonts()
    const annotationFrame = figma.createFrame()
    annotationFrame.name = `FigmAI — Error Screens rationale (${runId})`
    annotationFrame.layoutMode = 'VERTICAL'
    annotationFrame.primaryAxisSizingMode = 'AUTO'
    annotationFrame.counterAxisSizingMode = 'AUTO'
    annotationFrame.paddingTop = 12
    annotationFrame.paddingRight = 12
    annotationFrame.paddingBottom = 12
    annotationFrame.paddingLeft = 12
    annotationFrame.itemSpacing = 8
    annotationFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
    annotationFrame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
    annotationFrame.strokeWeight = 1
    annotationFrame.cornerRadius = 8
    const titleNode = await createTextNode('Rationales (no clones created)', { fontSize: 12, fontName: fonts.bold })
    annotationFrame.appendChild(titleNode)
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const line = await createTextNode(`${v.label || v.id}: ${(v.rationale || '').slice(0, 120)}`, { fontSize: 10, fontName: fonts.regular })
        annotationFrame.appendChild(line)
      }
    }
    figma.currentPage.appendChild(annotationFrame)
    placeSingleArtifactNearSelection(annotationFrame, { selectedNode, preferSide: 'right', margin: 24 })
    replaceStatusMessage('Rationale frame created (selection could not be duplicated).')
  }

  private async attemptRepairGenerate(context: HandlerContext, originalResponse: string, runId: string): Promise<HandlerResult> {
    try {
      const repairPrompt = `Convert to valid JSON only. Required: { "type": "generateErrorScreens", "version": 1, "variants": [ { "id": "string", "label": "string", "rationale": "string" } ] }. No other text.\n\nOriginal:\n${originalResponse.slice(0, 1500)}`
      const repairResponse = await context.sendChatWithRecovery({
        messages: [
          { role: 'system', content: 'Return ONLY valid JSON. No prose, no fences.' },
          { role: 'user', content: repairPrompt }
        ],
        assistantId: context.assistantId,
        assistantName: 'Errors',
        quickActionId: context.actionId
      })
      let jsonString = extractJsonFromResponse(repairResponse)
      if (!jsonString) jsonString = repairResponse.trim()
      const parsed = JSON.parse(jsonString) as GenerateErrorScreensSpec
      if (parsed.type === 'generateErrorScreens' && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
        return this.handleGenerateErrorScreens({ ...context, response: repairResponse })
      }
    } catch {
      // fall through
    }
    context.replaceStatusMessage('Error: Could not parse Generate Error Screens response. Please try again.', true)
    return { handled: true }
  }

  private async handleCheckErrors(context: HandlerContext): Promise<HandlerResult> {
    const runId = `check_${Date.now()}`
    const { response, selectionOrder, replaceStatusMessage } = context

    let jsonString = extractJsonFromResponse(response.trim())
    if (!jsonString) {
      jsonString = response.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      context.replaceStatusMessage('Error: Invalid JSON from Check Errors. Please try again.', true)
      return { handled: true }
    }
    const result = parsed as CheckErrorsResult
    const res = result.result === 'PASS' || result.result === 'FAIL' ? result.result : 'FAIL'
    const summary = typeof result.summary === 'string' ? result.summary : 'No summary.'
    const items = Array.isArray(result.items) ? result.items.slice(0, MAX_CHECK_ITEMS) : []

    let selectedNode: SceneNode | null = null
    if (selectionOrder.length > 0) {
      const node = await figma.getNodeByIdAsync(selectionOrder[0])
      selectedNode = node && node.type !== 'DOCUMENT' && node.type !== 'PAGE' ? (node as SceneNode) : null
    }
    if (selectedNode) selectedNode = getPlacementTarget(selectedNode) ?? selectedNode

    try {
      const categoryId = await ensureAnnotationCategory('Errors check', ANNOTATION_CATEGORY_COLOR)
      if (selectedNode) {
        const annMarkdown = items.length > 0
          ? `**${res}**\n\n${summary}\n\n**Top fixes:**\n${items.map(i => `• ${(i.title || i.fix || '').slice(0, 80)}`).join('\n')}`
          : `**${res}**\n\n${summary}`
        safeSetNativeAnnotations(selectedNode, [{ labelMarkdown: annMarkdown, ...(categoryId ? { categoryId } : {}) }])
      }
      const fonts = await loadFonts()
      const annotationFrame = figma.createFrame()
      annotationFrame.name = 'FigmAI — Errors Check'
      annotationFrame.layoutMode = 'VERTICAL'
      annotationFrame.primaryAxisSizingMode = 'AUTO'
      annotationFrame.counterAxisSizingMode = 'AUTO'
      annotationFrame.paddingTop = 16
      annotationFrame.paddingRight = 16
      annotationFrame.paddingBottom = 16
      annotationFrame.paddingLeft = 16
      annotationFrame.itemSpacing = 10
      annotationFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
      annotationFrame.strokes = [{ type: 'SOLID', color: res === 'PASS' ? { r: 0.2, g: 0.7, b: 0.4 } : { r: 0.9, g: 0.4, b: 0.2 }, opacity: 1 }]
      annotationFrame.strokeWeight = 2
      annotationFrame.cornerRadius = 8

      const titleNode = await createTextNode(`Check: ${res}`, { fontSize: 14, fontName: fonts.bold })
      annotationFrame.appendChild(titleNode)
      const summaryNode = await createTextNode(summary.slice(0, 500), { fontSize: 12, fontName: fonts.regular })
      annotationFrame.appendChild(summaryNode)
      for (const item of items) {
        const line = await createTextNode(`• ${(item.title || item.fix || '').slice(0, 100)}`, { fontSize: 11, fontName: fonts.regular })
        annotationFrame.appendChild(line)
      }

      figma.currentPage.appendChild(annotationFrame)
      placeSingleArtifactNearSelection(annotationFrame, { selectedNode: selectedNode ?? undefined, preferSide: 'right', margin: 24 })

      replaceStatusMessage(res === 'PASS' ? 'Check passed.' : 'Check found issues.')
      figma.notify(res === 'PASS' ? 'Check passed' : 'Check complete — see artifact')
      return { handled: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      replaceStatusMessage(`Error: ${msg}`, true)
      return { handled: true }
    }
  }
}
