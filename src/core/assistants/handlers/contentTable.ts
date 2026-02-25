/**
 * Content Table Assistant Handler
 *
 * Supports two actions:
 *   generate-table  — scans selected containers and creates a new table/session.
 *   add-to-table    — scans selected containers and appends rows to the existing session.
 *
 * Multi-select: accepts 1+ containers. Each is scanned in selectionOrder (deterministic).
 * PAGE / DOCUMENT nodes are skipped with a warning; empty selection is an error.
 *
 * After a successful scan the Figma selection is cleared (matches Analytics Tagging UX).
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { ContentItemV1 } from '../../contentTable/types'
import { scanContentTable } from '../../contentTable/scanner'
import { loadWorkAdapter } from '../../work/loadAdapter'
import { normalizeContentTableV1, validateContentTableV1 } from '../../contentTable/validate'
import { applyExclusionRules, resolveExclusionConfigWithSource } from '../../contentTable/exclusionRules'
import type { ExclusionRulesConfig } from '../../contentTable/exclusionRules'
import { getCustomConfig } from '../../../custom/config'
import { resolveSelection } from '../../figma/selectionResolver'

export class ContentTableHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'content_table' && (actionId === 'generate-table' || actionId === 'add-to-table')
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, selectionOrder, replaceStatusMessage } = context
    const isAppend = actionId === 'add-to-table'

    if (selectionOrder.length === 0) {
      const errorMsg = 'Select one or more containers to scan.'
      replaceStatusMessage(errorMsg, true)
      figma.notify(errorMsg)
      return { handled: true }
    }

    const resolvedSelection = await resolveSelection(selectionOrder, {
      containerStrategy: 'expand',
      skipHidden: true
    })
    const validNodes = resolvedSelection.scanRoots
    const skippedNames = resolvedSelection.diagnostics.excluded
      .filter((e) => e.reason === 'page-or-document')
      .map((e) => e.nodeName || e.nodeId)

    if (validNodes.length === 0) {
      const errorMsg = resolvedSelection.diagnostics.hints[0] || 'No scannable containers found in selection.'
      replaceStatusMessage(errorMsg, true)
      figma.notify(errorMsg)
      return { handled: true }
    }

    try {
      const workAdapter = await loadWorkAdapter()
      const ignoreRules = workAdapter.getContentTableIgnoreRules?.() || null
      const detectDesignSystemComponent = workAdapter.detectDesignSystemComponent

      // Scan each valid container in selection order and concatenate items.
      // Use the first container for table-level metadata (source, meta, thumbnail).
      let contentTable = await scanContentTable(validNodes[0], ignoreRules, detectDesignSystemComponent)

      if (validNodes.length > 1) {
        const additionalItems: ContentItemV1[] = []
        for (let i = 1; i < validNodes.length; i++) {
          const extra = await scanContentTable(validNodes[i], ignoreRules, detectDesignSystemComponent)
          additionalItems.push(...extra.items)
        }
        contentTable = { ...contentTable, items: [...contentTable.items, ...additionalItems] }
      }

      // Post-process (Work-only hook)
      if (workAdapter.postProcessContentTable) {
        try {
          const selectionContext = {
            pageId: contentTable.source.pageId,
            pageName: contentTable.source.pageName,
            rootNodeId: contentTable.meta.rootNodeId
          }
          contentTable = await workAdapter.postProcessContentTable({ table: contentTable, selectionContext })
        } catch (error) {
          console.error('[ContentTableHandler] Error in postProcessContentTable hook:', error)
        }
      }

      // Normalize + validate
      contentTable = normalizeContentTableV1(contentTable)
      const validation = validateContentTableV1(contentTable)
      if (!validation.ok && validation.errors.length > 0) {
        console.error('[ContentTableHandler] Content table validation errors:', validation.errors)
      }
      if (validation.warnings.length > 0) {
        console.warn('[ContentTableHandler] Content table validation warnings:', validation.warnings)
      }

      // Post-filter: exclusion rules. Priority: Work adapter > custom config > default.
      const customExclusionRaw = getCustomConfig()?.contentTable?.exclusionRules
      const customExclusion: ExclusionRulesConfig | undefined = customExclusionRaw
        ? {
            enabled: customExclusionRaw.enabled === true,
            rules: Array.isArray(customExclusionRaw.rules) ? customExclusionRaw.rules : []
          }
        : undefined
      const resolvedExclusion = resolveExclusionConfigWithSource(
        workAdapter.getExclusionRulesConfig?.(),
        customExclusion,
        { enabled: true, rules: [] }
      )
      const exclusionDebugEnabled = getCustomConfig()?.contentTable?.exclusionRulesDebug === true
      const exclusionResult = applyExclusionRules(contentTable.items, resolvedExclusion.config, exclusionDebugEnabled)
      contentTable = { ...contentTable, items: exclusionResult.items }
      if (exclusionDebugEnabled) {
        const activeRuleCount = (resolvedExclusion.config.rules || []).filter((rule) => {
          if (!rule || typeof rule !== 'object') return false
          const enabled = !('enabled' in rule) || (rule as { enabled?: boolean }).enabled !== false
          const pattern = 'pattern' in rule && typeof (rule as { pattern?: string }).pattern === 'string'
            ? (rule as { pattern?: string }).pattern || ''
            : ''
          return enabled && !!pattern.trim()
        }).length
        console.info('[CT-A exclusion]', {
          source: resolvedExclusion.source,
          enabled: resolvedExclusion.config.enabled,
          activeRuleCount,
          diagnostics: exclusionResult.diagnostics
        })
      }

      // Status message
      const itemCount = contentTable.items.length
      const verb = isAppend ? 'added' : 'generated'
      if (itemCount === 0) {
        replaceStatusMessage('No text items found in the selected container(s).')
      } else {
        const skipNote = skippedNames.length > 0 ? ` (skipped: ${skippedNames.join(', ')})` : ''
        replaceStatusMessage(`${isAppend ? 'Added' : 'Found'} ${itemCount} text item${itemCount === 1 ? '' : 's'}. Table ${verb}.${skipNote}`)
      }

      figma.ui.postMessage({
        pluginMessage: {
          type: isAppend ? 'CONTENT_TABLE_APPEND' : 'CONTENT_TABLE_GENERATED',
          table: contentTable,
          flaggedIgnoreIds: Array.from(exclusionResult.flaggedIds),
          ignoreRuleByItemId: exclusionResult.matchedRuleByItemId,
          exclusionDebug: exclusionDebugEnabled
            ? {
                source: resolvedExclusion.source,
                enabled: resolvedExclusion.config.enabled,
                activeRuleCount: (resolvedExclusion.config.rules || []).filter((rule) => {
                  if (!rule || typeof rule !== 'object') return false
                  const enabled = !('enabled' in rule) || (rule as { enabled?: boolean }).enabled !== false
                  const pattern = 'pattern' in rule && typeof (rule as { pattern?: string }).pattern === 'string'
                    ? (rule as { pattern?: string }).pattern || ''
                    : ''
                  return enabled && !!pattern.trim()
                }).length,
                diagnostics: exclusionResult.diagnostics
              }
            : undefined,
          scannedContainerNodeIds: validNodes.map(n => n.id)
        }
      })

      // Clear Figma selection after successful scan (matches Analytics Tagging UX).
      try { figma.currentPage.selection = [] } catch { /* fail silently */ }

      return { handled: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      replaceStatusMessage(`Error: ${errorMessage}`, true)
      figma.notify(`Error generating table: ${errorMessage}`)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'CONTENT_TABLE_ERROR',
          error: errorMessage
        }
      })
      return { handled: true }
    }
  }
}
