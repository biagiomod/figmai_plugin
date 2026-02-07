/**
 * Errors Assistant Handler
 * Handles Generate Error Screens (clone + variants + annotation) and Check Errors (annotation only).
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import { extractJsonFromResponse } from '../../output/normalize'
import { getPlacementTarget, placeBatchBelowPageContent, placeSingleArtifactNearSelection } from '../../figma/placement'
import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../../stage/primitives'

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

export class ErrorsHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'errors' &&
      (actionId === 'generate-error-screens' || actionId === 'check-errors')
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    const isGenerate = isGenerateAction(messages)
    const systemContent = 'Return ONLY valid JSON. No prose, no markdown fences, no code blocks. Output must be a single JSON object.'
    const userHint = isGenerate
      ? 'Output shape: { "type": "generateErrorScreens", "version": 1, "meta": {}, "variants": [ { "id", "label", "rationale", "copy": {} } ] }. Up to 6 variants.'
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

    const selectedNode = selectionOrder.length > 0
      ? (await figma.getNodeByIdAsync(selectionOrder[0])) as SceneNode | null
      : null
    const sourceNode = selectedNode ? getPlacementTarget(selectedNode) : null
    if (!sourceNode || !('clone' in sourceNode) || typeof (sourceNode as { clone: () => SceneNode }).clone !== 'function') {
      replaceStatusMessage('Error: Select a frame or component to duplicate.', true)
      return { handled: true }
    }

    try {
      const section = createAutoLayoutFrameSafe('FigmAI — Error Screens', 'HORIZONTAL', { gap: 24, padding: { top: 16, right: 16, bottom: 16, left: 16 } })
      section.name = `FigmAI — Error Screens (${runId})`
      const fonts = await loadFonts()

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const clone = (sourceNode as { clone: () => SceneNode }).clone()
        clone.name = `${sourceNode.name} — ${v.label || v.id || `variant-${i + 1}`}`
        section.appendChild(clone)
        const copyText = v.copy?.inlineMessage || v.copy?.bannerTitle || v.copy?.toastMessage || v.copy?.helperText || v.rationale
        if (copyText && clone.type === 'FRAME') {
          const errText = await createTextNode(copyText.slice(0, 200), { fontSize: 11, fontName: fonts.regular })
          errText.name = 'Error copy'
          ;(clone as FrameNode).appendChild(errText)
          errText.x = 8
          errText.y = 8
        }
      }

      figma.currentPage.appendChild(section)
      placeBatchBelowPageContent(section, { marginTop: 24 })

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
