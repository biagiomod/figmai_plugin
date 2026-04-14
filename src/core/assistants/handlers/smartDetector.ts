/**
 * Smart Detector harness: quick action that runs scanSelectionSmart on selection
 * and posts a summary (nodesScanned, elements by kind, content by kind, first N items).
 * Uses canonical Markdown formatting (reportFormat); no raw HTML.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { SDToolkitSmartDetectionEngine } from '../../detection/smartDetector/SDToolkitSmartDetectionEngine'
import type { SmartDetectionPort, SmartDetectionResult } from '../../sdk/ports/SmartDetectionPort'
import { debug } from '../../debug/logger'
import { formatSmartDetectorReport, renderForChat } from '../../richText/reportFormat'
import { resolveSelection } from '../../figma/selectionResolver'

// SD-T v0.1.0-alpha.0 (Phase 0): candidateEntry is null for most nodes until Phase 1 taxonomy is wired.
// formatSummary handles null candidateType gracefully (maps to 'unknown' kind bucket).
const sdPort: SmartDetectionPort = new SDToolkitSmartDetectionEngine()

let handlerTraceCounter = 0
function qaTraceHandler(marker: string, data: Record<string, unknown>) {
  if (!debug.isEnabled('trace:chat')) return
  handlerTraceCounter += 1
  debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: handlerTraceCounter, ...data })
}

/** Map port certainty back to the confidence string expected by formatSmartDetectorReport. */
function certaintyToConfidence(certainty: string): string {
  switch (certainty) {
    case 'exact': return 'high'
    case 'inferred': return 'med'
    case 'weak': return 'low'
    default: return 'low'
  }
}

function formatSummary(sdResults: SmartDetectionResult[]): string {
  // Merge results across all roots into a single report input
  const allElements: Array<{ kind: string; confidence: string; reasons: string[]; labelGuess?: string }> = []
  const elementsByKind: Record<string, number> = {}
  let totalNodes = 0

  for (const res of sdResults) {
    // root.children holds the detected elements mapped from the internal scanner
    for (const el of res.root.children) {
      const kind = el.candidateType ?? 'unknown'
      const confidence = certaintyToConfidence(el.certainty)
      const reasons = el.matchedSignals
      allElements.push({ kind, confidence, reasons })
      elementsByKind[kind] = (elementsByKind[kind] ?? 0) + 1
    }
    // summary.total represents element count; use as proxy for nodes scanned
    totalNodes += res.summary.total
  }

  const reportInput = {
    stats: {
      nodesScanned: totalNodes,
      capped: false,
      elementsByKind,
      contentByKind: {},
      patternCount: 0,
    },
    elements: allElements,
    content: [],
  }

  const md = formatSmartDetectorReport(reportInput)
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
    const sdResults = await sdPort.detect(roots)
    const message = formatSummary(sdResults)
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
