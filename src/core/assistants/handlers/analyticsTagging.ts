/**
 * Analytics Tagging Assistant Handler
 * Selection-driven flow: get-analytics-tags (scan ScreenID root + visible descendants for ActionID), copy-table, export, new-session.
 * No screenshots in this flow.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { validateEligibleScreenSelection, scanVisibleActionIds, actionIdFindingsToRows } from '../../analyticsTagging/selection'
import { loadSession, saveSession, createNewSession } from '../../analyticsTagging/storage'
import type { Session } from '../../analyticsTagging/types'

export class AnalyticsTaggingHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    if (assistantId !== 'analytics_tagging') return false
    return (
      actionId === 'get-analytics-tags' ||
      actionId === 'copy-table' ||
      actionId === 'export' ||
      actionId === 'new-session'
    )
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, replaceStatusMessage } = context
    const selection = figma.currentPage.selection as readonly SceneNode[]

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

    if (actionId === 'export') {
      const session = await loadSession()
      if (!session || session.rows.length === 0) {
        replaceStatusMessage('No rows to export. Add at least one row first.', true)
        return { handled: true }
      }
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_OPEN_EXPORT',
          session
        }
      })
      replaceStatusMessage('Export ready.')
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

    if (actionId === 'get-analytics-tags') {
      const validation = await validateEligibleScreenSelection(selection)
      if (!validation.ok) {
        replaceStatusMessage(validation.message, true)
        figma.notify(validation.message)
        return { handled: true }
      }
      const { screenNode, screenId } = validation
      const findings = await scanVisibleActionIds(screenNode)
      const rows = await actionIdFindingsToRows(screenId, screenNode.id, findings)

      let session: Session | null = await loadSession()
      const page = figma.currentPage
      if (!session) {
        session = createNewSession({ pageId: page.id, pageName: page.name })
      }
      session.rows = rows
      session.draftRow = null
      session.updatedAtISO = new Date().toISOString()
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session
        }
      })
      if (rows.length === 0) {
        figma.notify('No ActionID items found.')
        replaceStatusMessage('No ActionID items found in selection.', true)
      } else {
        replaceStatusMessage(`${rows.length} row(s) added from scan.`)
      }
      return { handled: true }
    }

    return { handled: false }
  }
}
