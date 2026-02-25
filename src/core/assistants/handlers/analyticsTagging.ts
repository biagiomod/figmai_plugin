/**
 * Analytics Tagging Assistant Handler
 * Selection-driven flow: get-analytics-tags (scan ScreenID root + visible descendants for ActionID), copy-table, new-session.
 * No screenshots in this flow.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { validateEligibleScreenSelections, scanVisibleActionIds, actionIdFindingsToRows } from '../../analyticsTagging/selection'
import { loadSession, saveSession, createNewSession } from '../../analyticsTagging/storage'
import type { Session, Row } from '../../analyticsTagging/types'
import { resolveSelection } from '../../figma/selectionResolver'

export class AnalyticsTaggingHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    if (assistantId !== 'analytics_tagging') return false
    return (
      actionId === 'get-analytics-tags' ||
      actionId === 'append-analytics-tags' ||
      actionId === 'copy-table' ||
      actionId === 'new-session'
    )
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, replaceStatusMessage, selectionOrder } = context

    if (actionId === 'new-session') {
      const page = figma.currentPage
      const session = createNewSession({
        pageId: page.id,
        pageName: page.name
      })
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session
        }
      })
      replaceStatusMessage('New session started.')
      return { handled: true }
    }

    if (actionId === 'copy-table') {
      const session = await loadSession()
      if (!session || session.rows.length === 0) {
        replaceStatusMessage('No table to copy. Run Get Analytics Tags first.', true)
        figma.notify('No table to copy.')
        return { handled: true }
      }
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_REQUEST_COPY_TABLE'
        }
      })
      replaceStatusMessage('Copy table requested.')
      return { handled: true }
    }

    if (actionId === 'get-analytics-tags' || actionId === 'append-analytics-tags') {
      const isAppend = actionId === 'append-analytics-tags'
      const resolvedSelection = await resolveSelection(selectionOrder, {
        containerStrategy: 'expand',
        skipHidden: true
      })
      if (resolvedSelection.scanRoots.length === 0) {
        const errorMsg = resolvedSelection.diagnostics.hints[0] || 'No screens found. Select frames with ScreenID annotations.'
        replaceStatusMessage(errorMsg, true)
        figma.notify(errorMsg)
        return { handled: true }
      }

      const validation = await validateEligibleScreenSelections(resolvedSelection.scanRoots)
      if (!validation.ok) {
        const sectionHint = resolvedSelection.diagnostics.hints.find((h) => h.toLowerCase().includes('section'))
        const finalMessage = sectionHint
          ? `${validation.message} Tip: ${sectionHint}`
          : validation.message
        replaceStatusMessage(finalMessage, true)
        const notifyDetail =
          validation.invalidNames.length > 0
            ? ` Invalid: ${validation.invalidNames.slice(0, 5).join(', ')}${validation.invalidNames.length > 5 ? '…' : ''}`
            : ''
        figma.notify(finalMessage + notifyDetail)
        return { handled: true }
      }
      const allRows: Row[] = []
      for (const { node, screenId } of validation.screens) {
        const findings = await scanVisibleActionIds(node)
        const screenRows = await actionIdFindingsToRows(screenId, node.id, findings)
        allRows.push(...screenRows)
      }
      const seen = new Set<string>()
      const newRows = allRows.filter((row) => {
        const key = `${row.screenId}::${row.actionId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      let session: Session | null = await loadSession()
      const page = figma.currentPage
      if (!session) {
        session = createNewSession({ pageId: page.id, pageName: page.name })
      }

      let keptRows = newRows
      let skippedCount = 0
      if (isAppend) {
        const existingKeys = new Set(session.rows.map(r => `${r.screenId}::${r.actionId}`))
        keptRows = newRows.filter(r => !existingKeys.has(`${r.screenId}::${r.actionId}`))
        skippedCount = newRows.length - keptRows.length
        session.rows = [...session.rows, ...keptRows]
      } else {
        session.rows = newRows
      }
      session.draftRow = null
      session.updatedAtISO = new Date().toISOString()
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session
        }
      })
      if (keptRows.length === 0 && skippedCount === 0) {
        figma.notify('No ActionID items found.')
        replaceStatusMessage('No ActionID items found in selection.', true)
      } else if (isAppend && keptRows.length === 0 && skippedCount > 0) {
        figma.notify(`All ${skippedCount} row(s) already exist.`)
        replaceStatusMessage(`${skippedCount} duplicate row(s) skipped; no new rows appended.`)
      } else {
        const screenCount = validation.screens.length
        const verb = isAppend ? 'appended' : 'added'
        const skipNote = skippedCount > 0 ? ` (${skippedCount} duplicate(s) skipped)` : ''
        replaceStatusMessage(
          screenCount === 1
            ? `${keptRows.length} row(s) ${verb} from scan.${skipNote}`
            : `${keptRows.length} row(s) ${verb} from ${screenCount} screen(s).${skipNote}`
        )
      }
      return { handled: true }
    }

    return { handled: false }
  }
}
