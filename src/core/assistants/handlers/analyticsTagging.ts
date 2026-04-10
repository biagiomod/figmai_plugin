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
import { detectNearMisses } from '../../analyticsTagging/nearMissDetector'
import type { NearMissResult } from '../../analyticsTagging/nearMissDetector'
import type { NearMissInfo, AutoAnnotateResult } from '../../types'
import { repairNearMissAnnotations } from '../../figma/annotations'
import { autoAnnotateScreens, buildSummaryMessage } from '../../analyticsTagging/autoAnnotator'
import { isDevMode } from '../../editorMode'

/**
 * Stores live NearMissResult[] (with SceneNode refs) from the most recent scan.
 * Reset to [] on every get/append/fix+rescan run and on new-session.
 * Never echoed back from UI — UI only holds NearMissInfo[] (no node refs).
 *
 * The capture-then-clear pattern in fix-annotation-near-misses ensures a concurrent
 * fix invocation sees an empty toFix rather than a partial state. Safe under
 * the single-threaded Figma plugin runtime.
 */
let _lastNearMisses: NearMissResult[] = []

export class AnalyticsTaggingHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    if (assistantId !== 'analytics_tagging') return false
    return (
      actionId === 'get-analytics-tags' ||
      actionId === 'append-analytics-tags' ||
      actionId === 'copy-table' ||
      actionId === 'new-session' ||
      actionId === 'fix-annotation-near-misses' ||
      actionId === 'add-annotations'
    )
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, replaceStatusMessage, selectionOrder } = context

    if (actionId === 'new-session') {
      _lastNearMisses = []
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
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_NEAR_MISSES',
          nearMisses: []
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

    if (actionId === 'fix-annotation-near-misses') {
      if (isDevMode()) {
        replaceStatusMessage('Annotation writes require Design mode.', true)
        return { handled: true }
      }
      const toFix = _lastNearMisses
      _lastNearMisses = []
      if (toFix.length === 0) {
        replaceStatusMessage('Nothing to fix.')
        figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: [] } })
        return { handled: true }
      }
      replaceStatusMessage('Fixing annotations…')
      const repairedCount = await repairNearMissAnnotations(toFix)
      if (repairedCount === 0) {
        replaceStatusMessage('Could not update annotations. Check that you have edit access to this file.', true)
        figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: [] } })
        return { handled: true }
      }
      // Re-run as append so existing rows from prior scans are preserved
      return this._runGetAnalyticsTags(context, true)
    }

    if (actionId === 'add-annotations') {
      if (isDevMode()) {
        replaceStatusMessage('Annotation writes require Design mode.', true)
        return { handled: true }
      }
      const resolvedSelection = await resolveSelection(selectionOrder, {
        containerStrategy: 'expand',
        skipHidden: true
      })

      if (resolvedSelection.scanRoots.length === 0) {
        const errorMsg = 'No screens found in selection. Select a frame to continue.'
        figma.ui.postMessage({
          pluginMessage: { type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE', result: null, error: errorMsg }
        })
        replaceStatusMessage(errorMsg, true)
        return { handled: true }
      }

      let result: AutoAnnotateResult | null = null
      let errorMsg: string | null = null
      try {
        result = await autoAnnotateScreens(resolvedSelection.scanRoots)
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Unknown error during annotation'
      } finally {
        figma.ui.postMessage({
          pluginMessage: { type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE', result, error: errorMsg }
        })
        const summary = buildSummaryMessage(result, errorMsg)
        replaceStatusMessage(summary, errorMsg != null)
      }
      return { handled: true }
    }

    if (actionId === 'get-analytics-tags' || actionId === 'append-analytics-tags') {
      return this._runGetAnalyticsTags(context, actionId === 'append-analytics-tags')
    }

    return { handled: false }
  }

  private async _runGetAnalyticsTags(
    context: HandlerContext,
    isAppend: boolean
  ): Promise<HandlerResult> {
    const { replaceStatusMessage, selectionOrder } = context

    _lastNearMisses = []

    const resolvedSelection = await resolveSelection(selectionOrder, {
      containerStrategy: 'expand',
      skipHidden: true
    })
    if (resolvedSelection.scanRoots.length === 0) {
      const errorMsg = resolvedSelection.diagnostics.hints[0] || 'No screens found. Select frames with ScreenID annotations.'
      replaceStatusMessage(errorMsg, true)
      figma.notify(errorMsg)
      figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: [] } })
      return { handled: true }
    }

    // Detect near-misses in parallel with validation (both need the scan roots)
    // Both calls share _sharedCategoryCache — safe under the single-threaded Figma plugin runtime.
    const [nearMisses, validation] = await Promise.all([
      detectNearMisses(resolvedSelection.scanRoots),
      validateEligibleScreenSelections(resolvedSelection.scanRoots)
    ])
    _lastNearMisses = nearMisses

    // Send near-misses regardless of validation result
    const nearMissesInfo: NearMissInfo[] = nearMisses.map(r => ({
      nodeId: r.nodeId,
      nodeName: r.nodeName,
      nearMissLabel: r.nearMissLabel,
      canonicalLabel: r.canonicalLabel
    }))
    figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: nearMissesInfo } })

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
}
