/**
 * Smart Detector harness: quick action that runs scanSelectionSmart on selection
 * and posts a summary (nodesScanned, elements by kind, content by kind, first N items).
 * Uses canonical Markdown formatting (reportFormat); no raw HTML.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { scanSelectionSmart } from '../../detection/smartDetector'
import { debug } from '../../debug/logger'
import {
  type ReportDoc,
  toCanonicalMarkdown,
  renderForChat
} from '../../richText/reportFormat'

let handlerTraceCounter = 0
function qaTraceHandler(marker: string, data: Record<string, unknown>) {
  if (!debug.isEnabled('trace:chat')) return
  handlerTraceCounter += 1
  debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: handlerTraceCounter, ...data })
}

const TOP_PREVIEW = 3

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

function buildReportDoc(result: Awaited<ReturnType<typeof scanSelectionSmart>>): ReportDoc {
  const { stats, elements, content } = result
  const sections: ReportDoc['sections'] = [
    {
      keyValues: [
        { key: 'Scanned', value: `${stats.nodesScanned} nodes${stats.capped ? ' (capped)' : ''}` },
        {
          key: 'Elements',
          value: Object.entries(stats.elementsByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'
        },
        {
          key: 'Content',
          value: Object.entries(stats.contentByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'
        },
        { key: 'Patterns', value: String(stats.patternCount) }
      ]
    }
  ]

  if (elements.length > 0) {
    sections.push({
      title: 'Top Elements',
      keyValues: elements.slice(0, TOP_PREVIEW).flatMap((e, i) => {
        const reasons = e.reasons.length ? e.reasons.join(', ') : 'none'
        const label = e.labelGuess ? e.labelGuess.slice(0, 60) : '—'
        return [
          { key: `${i + 1}.`, value: `**Kind:** ${e.kind} **Confidence:** ${e.confidence}` },
          { key: 'Label', value: label },
          { key: 'Reasons', value: reasons }
        ]
      })
    })
  }

  if (content.length > 0) {
    sections.push({
      title: 'Top Content',
      keyValues: content.slice(0, TOP_PREVIEW).flatMap((c, i) => {
        const preview = c.text.slice(0, 50) + (c.text.length > 50 ? '…' : '')
        return [
          { key: `${i + 1}.`, value: `**Kind:** ${c.contentKind} **Confidence:** ${c.confidence}` },
          { key: 'Text', value: preview }
        ]
      })
    })
  }

  return {
    title: 'Smart Detector',
    sections
  }
}

function formatSummary(result: Awaited<ReturnType<typeof scanSelectionSmart>>): string {
  const doc = buildReportDoc(result)
  const md = toCanonicalMarkdown(doc)
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
    const roots = await getSelectionRoots(selectionOrder)
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
