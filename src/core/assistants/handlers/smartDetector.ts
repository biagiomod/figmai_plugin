/**
 * Smart Detector harness: quick action that runs scanSelectionSmart on selection
 * and posts a summary (nodesScanned, elements by kind, content by kind, first N items).
 * Uses canonical Markdown formatting (reportFormat); no raw HTML.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { scanSelectionSmart } from '../../detection/smartDetector'
import { debug } from '../../debug/logger'
import { formatSmartDetectorReport, renderForChat } from '../../richText/reportFormat'
import { resolveSelection } from '../../figma/selectionResolver'

let handlerTraceCounter = 0
function qaTraceHandler(marker: string, data: Record<string, unknown>) {
  if (!debug.isEnabled('trace:chat')) return
  handlerTraceCounter += 1
  debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: handlerTraceCounter, ...data })
}

function formatSummary(result: Awaited<ReturnType<typeof scanSelectionSmart>>): string {
  const md = formatSmartDetectorReport(result)
  return renderForChat(md)
}

export class SmartDetectorHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'general' && actionId === 'run-smart-detector'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { selectionOrder, requestId, assistantId, actionId } = context
    const hasSelection = selectionOrder.length > 0
    if (debug.isEnabled('trace:qa')) {
      console.log('[QA_SD_ENTER]', { requestId, actionId, assistantId, hasSelection, selectionCount: selectionOrder.length, returnType: 'HandlerResult' })
    }
    qaTraceHandler('HANDLER_START', { requestId, assistantId, actionId })
    if (selectionOrder.length === 0) {
      const msg = 'Smart Detector: no selection. Select one or more nodes first.'
      qaTraceHandler('HANDLER_DONE', { requestId, messageHash: msg.slice(0, 40) + '_' + msg.length })
      return { handled: true, message: msg }
    }
    const resolvedSelection = await resolveSelection(selectionOrder, {
      containerStrategy: 'direct',
      skipHidden: false
    })
    const roots = resolvedSelection.scanRoots
    if (roots.length === 0) {
      const msg = 'Smart Detector: no valid roots in selection.'
      qaTraceHandler('HANDLER_DONE', { requestId, messageHash: msg.slice(0, 40) + '_' + msg.length })
      return { handled: true, message: msg }
    }
    const result = await scanSelectionSmart(roots, {})
    const message = formatSummary(result)
    if (debug.isEnabled('trace:chat')) {
      const lineCount = message.split('\n').length
      const previewTop = message.slice(0, 200)
      const previewBottom = message.slice(-200)
      const jsonSample = JSON.stringify(message.slice(0, 400))
      debug.scope('trace:chat').log('SD_MD_OUT', { len: message.length, lineCount, previewTop, previewBottom, jsonSample })
    }
    const messageHash = message.slice(0, 40) + '_' + message.length
    qaTraceHandler('HANDLER_DONE', { requestId, messageHash })
    return { handled: true, message }
  }
}
