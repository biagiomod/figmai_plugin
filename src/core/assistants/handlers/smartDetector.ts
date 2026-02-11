/**
 * Smart Detector harness: quick action that runs scanSelectionSmart on selection
 * and posts a summary (nodesScanned, elements by kind, content by kind, first N items).
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { scanSelectionSmart } from '../../detection/smartDetector'

// #region agent log
let handlerTraceCounter = 0
function qaTraceHandler(marker: string, data: Record<string, unknown>) {
  handlerTraceCounter += 1
  const payload = { location: 'smartDetector.ts', message: marker, data: { n: handlerTraceCounter, ...data }, timestamp: Date.now(), hypothesisId: 'RUN_QUICK_ACTION_FLOW' }
  console.log('[QA_TRACE]', marker, '#', handlerTraceCounter, data)
  try {
    fetch('http://127.0.0.1:7242/ingest/5cbaa6c2-4815-4212-80f6-d608747f90a6', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
  } catch {}
}
// #endregion

const SUMMARY_PREVIEW = 5

async function getSelectionRoots(selectionOrder: string[]): Promise<SceneNode[]> {
  const roots: SceneNode[] = []
  for (const id of selectionOrder) {
    const n = await figma.getNodeByIdAsync(id)
    if (n && n.type !== 'DOCUMENT' && n.type !== 'PAGE') {
      roots.push(n as SceneNode)
    }
  }
  return roots
}

function formatSummary(result: Awaited<ReturnType<typeof scanSelectionSmart>>): string {
  const { stats, elements, content } = result
  const lines: string[] = [
    `Smart Detector: scanned ${stats.nodesScanned} nodes${stats.capped ? ' (capped)' : ''}.`,
    `Elements: ${Object.entries(stats.elementsByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}.`,
    `Content: ${Object.entries(stats.contentByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}.`,
    `Patterns: ${stats.patternCount}.`
  ]
  if (elements.length > 0) {
    lines.push('')
    lines.push(`First ${Math.min(SUMMARY_PREVIEW, elements.length)} elements:`)
    for (const e of elements.slice(0, SUMMARY_PREVIEW)) {
      lines.push(`  ${e.kind} (${e.confidence}): ${e.reasons.join(', ')}${e.labelGuess ? ` — "${e.labelGuess.slice(0, 30)}"` : ''}`)
    }
  }
  if (content.length > 0) {
    lines.push('')
    lines.push(`First ${Math.min(SUMMARY_PREVIEW, content.length)} content:`)
    for (const c of content.slice(0, SUMMARY_PREVIEW)) {
      const preview = c.text.slice(0, 40) + (c.text.length > 40 ? '…' : '')
      lines.push(`  ${c.contentKind} (${c.confidence}): "${preview}"`)
    }
  }
  return lines.join('\n')
}

export class SmartDetectorHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'general' && actionId === 'run-smart-detector'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { selectionOrder, requestId, assistantId, actionId } = context
    qaTraceHandler('HANDLER_START', { requestId, assistantId, actionId })
    if (selectionOrder.length === 0) {
      const msg = 'Smart Detector: no selection. Select one or more nodes first.'
      qaTraceHandler('HANDLER_DONE', { requestId, messageHash: msg.slice(0, 40) + '_' + msg.length })
      return { handled: true, message: msg }
    }
    const roots = await getSelectionRoots(selectionOrder)
    if (roots.length === 0) {
      const msg = 'Smart Detector: no valid roots in selection.'
      qaTraceHandler('HANDLER_DONE', { requestId, messageHash: msg.slice(0, 40) + '_' + msg.length })
      return { handled: true, message: msg }
    }
    const result = await scanSelectionSmart(roots, {})
    const message = formatSummary(result)
    const messageHash = message.slice(0, 40) + '_' + message.length
    qaTraceHandler('HANDLER_DONE', { requestId, messageHash })
    return { handled: true, message }
  }
}
