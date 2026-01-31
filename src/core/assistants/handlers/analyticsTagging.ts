/**
 * Analytics Tagging Assistant Handler
 * Two-step workflow: (1) capture-action-item — 1 node (target) → draft row; (2) capture-screenshot-add-row — 1 node (container) + draft → validate, capture, commit row.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { getAbsoluteBounds } from '../../stage/anchor'
import { validateTargetOnly, validateContainerForDraft } from '../../analyticsTagging/selection'
import { captureVisibleInArea } from '../../analyticsTagging/screenshot'
import { loadSession, saveSession, createNewSession } from '../../analyticsTagging/storage'
import type { Row, Session, DraftRow } from '../../analyticsTagging/types'

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function buildFigmaNodeUrl(nodeId: string): string {
  try {
    const fileKey = (figma as { fileKey?: string }).fileKey
    if (!fileKey) return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    return `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(nodeId)}`
  } catch {
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

export class AnalyticsTaggingHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    if (assistantId !== 'analytics_tagging') return false
    return (
      actionId === 'capture-action-item' ||
      actionId === 'capture-screenshot-add-row' ||
      actionId === 'export' ||
      actionId === 'new-session'
    )
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, replaceStatusMessage } = context
    const selection = figma.currentPage.selection

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

    if (actionId === 'capture-action-item') {
      if (selection.length !== 1) {
        const message = 'Select exactly one node (the action item).'
        replaceStatusMessage(message, true)
        figma.notify(message)
        return { handled: true }
      }
      const targetNode = selection[0]
      const validation = await validateTargetOnly(targetNode as SceneNode)
      if (!validation.ok) {
        replaceStatusMessage(validation.message, true)
        figma.notify(validation.message)
        return { handled: true }
      }
      const { target, rootScreen, screenId, actionId: actionIdValue, component, figmaElementLink, screenIdWarning, actionIdWarning } = validation
      const page = rootScreen.parent
      if (!page || page.type !== 'PAGE') {
        replaceStatusMessage('Target has no page.', true)
        return { handled: true }
      }
      const draftRow: DraftRow = {
        id: generateId(),
        screenId,
        description: '',
        actionType: 'Action',
        component,
        actionId: actionIdValue,
        actionName: validation.actionIdWarning ? undefined : actionIdValue,
        figmaElementLink,
        population: '',
        note: '',
        meta: {
          targetNodeId: target.id,
          rootScreenNodeId: rootScreen.id
        },
        screenIdWarning,
        actionIdWarning
      }
      let session = await loadSession()
      if (!session) {
        session = createNewSession({ pageId: page.id, pageName: page.name })
      }
      session.draftRow = draftRow
      session.updatedAtISO = new Date().toISOString()
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session,
          screenIdWarning: screenIdWarning,
          actionIdWarning: actionIdWarning
        }
      })
      replaceStatusMessage('Action item captured. Fill in the form, then select the section container and click Capture Screenshot & Add Row.')
      return { handled: true }
    }

    if (actionId === 'capture-screenshot-add-row') {
      let session = await loadSession()
      if (!session) {
        session = createNewSession({
          pageId: figma.currentPage.id,
          pageName: figma.currentPage.name
        })
      }
      if (!session.draftRow) {
        const message = 'Capture an action item first.'
        replaceStatusMessage(message, true)
        figma.notify(message)
        return { handled: true }
      }
      if (selection.length !== 1) {
        const message = 'Select exactly one node: the section container.'
        replaceStatusMessage(message, true)
        figma.notify(message)
        return { handled: true }
      }
      const containerNode = selection[0] as SceneNode
      const validation = await validateContainerForDraft(containerNode, session.draftRow)
      if (!validation.ok) {
        replaceStatusMessage(validation.message, true)
        figma.notify(validation.message)
        return { handled: true }
      }
      const { container, target, rootScreen } = validation
      const draft = session.draftRow
      const screenshotRefId = generateId()
      let ref: Row['screenshotRef']
      try {
        const { ref: capturedRef } = await captureVisibleInArea({
          container,
          target,
          rootNodeId: rootScreen.id,
          screenshotRefId
        })
        ref = capturedRef
      } catch (e) {
        replaceStatusMessage('Screenshot capture failed. Row added without screenshot.', true)
        const cropRect = getAbsoluteBounds(container)
        const targetBounds = getAbsoluteBounds(target)
        const cropWidth = cropRect?.width ?? 1
        const cropHeight = cropRect?.height ?? 1
        const hotspotRatioX = targetBounds
          ? (targetBounds.x + targetBounds.width / 2 - (cropRect?.x ?? 0)) / cropWidth
          : 0.5
        const hotspotRatioY = targetBounds
          ? (targetBounds.y + targetBounds.height / 2 - (cropRect?.y ?? 0)) / cropHeight
          : 0.5
        ref = {
          id: screenshotRefId,
          cropWidth,
          cropHeight,
          hotspotRatioX: Math.max(0, Math.min(1, hotspotRatioX)),
          hotspotRatioY: Math.max(0, Math.min(1, hotspotRatioY)),
          containerNodeId: container.id,
          targetNodeId: target.id,
          rootNodeId: rootScreen.id
        }
      }
      const row: Row = {
        id: generateId(),
        screenId: draft.screenId,
        screenshotRef: ref,
        description: draft.description,
        actionType: draft.actionType,
        component: draft.component,
        actionId: draft.actionId,
        actionName: draft.actionName,
        figmaElementLink: draft.figmaElementLink,
        population: draft.population,
        note: draft.note,
        meta: {
          containerNodeId: container.id,
          targetNodeId: target.id,
          rootScreenNodeId: rootScreen.id,
          capturedAtISO: new Date().toISOString()
        }
      }
      session.rows.push(row)
      session.draftRow = null
      session.updatedAtISO = new Date().toISOString()
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session
        }
      })
      replaceStatusMessage(`Row added. ${session.rows.length} row(s) in session.`)
      return { handled: true }
    }

    return { handled: false }
  }
}
