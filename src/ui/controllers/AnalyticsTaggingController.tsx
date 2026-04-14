/**
 * AnalyticsTaggingController — owns all state and message handling for the analytics_tagging assistant.
 *
 * Extracted from ui.tsx to reduce its size. This hook controller manages:
 * - AT-A session state and autosave status
 * - Screenshot preview/error state
 * - Export (bulk + single-row) state and File System Access API flow
 * - Near-miss annotation state
 * - All ANALYTICS_TAGGING_* message handlers
 * - Quick action handling for export-screenshots
 * - View rendering (AnalyticsTaggingView / AnalyticsTaggingWelcome)
 */
import { h } from 'preact'
import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { emit } from '@create-figma-plugin/utilities'

import { CONFIG } from '../../core/config'
import type {
  SelectionState,
  RequestAnalyticsTaggingSessionHandler,
  AnalyticsTaggingUpdateRowHandler,
  AnalyticsTaggingDeleteRowHandler,
  ExportAnalyticsTaggingScreenshotsHandler,
  ExportAnalyticsTaggingOneRowHandler,
  RunQuickActionHandler,
  CopyTableStatusHandler,
  RenderTableOnStageHandler,
  TableFormatPreset,
  AnalyticsTaggingExportCompactRow,
} from '../../core/types'
import type { NearMissInfo } from '../../core/types'
import type { Session, Row } from '../../core/analyticsTagging/types'
import { sessionToTable } from '../../core/analyticsTagging/sessionToTable'
import { projectContentTable } from '../../core/contentTable/projection'
import { copyHtmlToClipboard } from '../services/clipboardService'
import { universalTableToHtml, universalTableToTsv } from '../../core/contentTable/renderers'
import { AnalyticsTaggingView } from '../components/AnalyticsTaggingView'
import { AnalyticsTaggingWelcome } from '../components/AnalyticsTaggingWelcome'

export interface AnalyticsTaggingControllerDeps {
  assistantId: string
  selectionState: SelectionState
  editorType: 'figma' | 'dev'
  stageFrameIdRef: React.MutableRefObject<string | null>
  setCopyStatus: (status: { success: boolean; message: string } | null) => void
  setSelectedFormat: (f: TableFormatPreset) => void
  setPendingAction: (a: 'copy' | 'view' | 'confluence' | null) => void
  setShowFormatModal: (v: boolean) => void
  handleQuickAction: (actionId: string) => void
}

export function useAnalyticsTaggingController(deps: AnalyticsTaggingControllerDeps) {
  const {
    assistantId,
    selectionState,
    editorType,
    stageFrameIdRef,
    setCopyStatus,
    setSelectedFormat,
    setPendingAction,
    setShowFormatModal,
    handleQuickAction,
  } = deps

  // --- State ---
  const [session, setSession] = useState<Session | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'failed'>('saved')
  const [screenshotPreviews, setScreenshotPreviews] = useState<Record<string, string>>({})
  const [screenshotErrors, setScreenshotErrors] = useState<Record<string, string>>({})
  const [exportInProgress, setExportInProgress] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [exportSession, setExportSession] = useState<Session | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [nearMisses, setNearMisses] = useState<NearMissInfo[]>([])
  const [isFixingNearMisses, setIsFixingNearMisses] = useState(false)
  const [nearMissesDismissed, setNearMissesDismissed] = useState(false)
  const [isAddingAnnotations, setIsAddingAnnotations] = useState(false)

  // --- Refs ---
  const sessionRef = useRef<Session | null>(null)
  const exportDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const exportBaseNamesRef = useRef<Map<string, number>>(new Map())
  const exportItemsRef = useRef<Array<{ rowId: string; screenId: string; actionId: string; base64?: string; error?: string }>>([])
  const exportInProgressRef = useRef(false)
  const exportProgressRef = useRef<{ done: number; total: number; failed: number } | null>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Request session when becoming active
  useEffect(() => {
    if (assistantId === 'analytics_tagging') {
      emit<RequestAnalyticsTaggingSessionHandler>('REQUEST_ANALYTICS_TAGGING_SESSION')
    }
  }, [assistantId])

  // --- Message handler ---
  function handleMessage(type: string, message: Record<string, unknown>): boolean {
    switch (type) {
      case 'ANALYTICS_TAGGING_SESSION_UPDATED':
        if (message.session) {
          setSession(message.session as Session)
          setAutosaveStatus('saved')
          if (message.warning) setWarning(message.warning as string)
          else setWarning(null)
        }
        return true

      case 'ANALYTICS_TAGGING_NEAR_MISSES': {
        const incoming = (message.nearMisses ?? []) as NearMissInfo[]
        setNearMisses(incoming)
        setNearMissesDismissed(false)
        setIsFixingNearMisses(false)
        return true
      }

      case 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE':
        setIsAddingAnnotations(false)
        return true

      case 'ANALYTICS_TAGGING_OPEN_EXPORT':
        if (message.session) {
          setExportSession(message.session as Session)
          setSelectedFormat('analytics-tagging')
          setPendingAction('confluence')
          setShowFormatModal(true)
        }
        return true

      case 'ANALYTICS_TAGGING_SCREENSHOT_READY':
        if (message.refId && message.dataUrl) {
          setScreenshotPreviews(prev => ({ ...prev, [message.refId as string]: message.dataUrl as string }))
          setScreenshotErrors(prev => {
            const next = { ...prev }
            delete next[message.refId as string]
            return next
          })
        }
        return true

      case 'ANALYTICS_TAGGING_SCREENSHOT_ERROR':
        if (message.refId) {
          setScreenshotErrors(prev => ({ ...prev, [message.refId as string]: (message.message as string) || 'Failed' }))
        }
        return true

      case 'ANALYTICS_TAGGING_EXPORT_ITEM': {
        const rowId = message.rowId as string
        const screenId = message.screenId as string
        const actionId = message.actionId as string
        const base64 = message.base64 as string | undefined
        const error = message.error as string | undefined
        const item = { rowId, screenId, actionId, base64, error }
        const isBulk = exportInProgressRef.current
        if (isBulk) {
          const prev = exportProgressRef.current
          if (prev) {
            const next = { ...prev, done: prev.done + 1, failed: prev.failed + (error ? 1 : 0) }
            exportProgressRef.current = next
            setExportProgress(next)
          }
          if (base64 && exportItemsRef.current.length < 500) {
            exportItemsRef.current.push(item)
          }
        }
        if (!isBulk && base64) {
          const sanitize = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'row'
          const name = `${sanitize(screenId)}_${sanitize(actionId)}.png`
          const a = document.createElement('a')
          a.href = `data:image/png;base64,${base64}`
          a.download = name
          a.click()
        }
        return true
      }

      case 'ANALYTICS_TAGGING_EXPORT_DONE': {
        const total = (message.total as number) ?? 0
        exportInProgressRef.current = false
        setExportInProgress(false)
        const items = exportItemsRef.current.slice()
        exportItemsRef.current = []
        setExportProgress(null)
        const dirHandle = exportDirHandleRef.current
        const failedCount = (exportProgressRef.current?.failed ?? 0)
        exportProgressRef.current = null
        ;(async () => {
          const sanitize = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'row'
          const baseNames = new Map<string, number>()
          const getUniqueFilename = (sid: string, aid: string) => {
            const base = `${sanitize(sid)}__${sanitize(aid)}`
            const count = (baseNames.get(base) ?? 0) + 1
            baseNames.set(base, count)
            return count === 1 ? `${base}.png` : `${base}_${count}.png`
          }
          if (CONFIG.dev?.debug?.enabled && (CONFIG.dev.debug.scopes as Record<string, boolean>)?.['subsystem:analytics_tagging']) {
            console.log('[ATA-export] path:', dirHandle ? 'dir-export' : 'download-fallback', { total, itemsWithBase64: items.filter(i => i.base64).length })
          }
          let writtenCount = 0
          if (dirHandle) {
            for (const item of items) {
              if (!item.base64) continue
              const name = getUniqueFilename(item.screenId, item.actionId)
              try {
                const fileHandle = await dirHandle.getFileHandle(name, { create: true })
                const writable = await fileHandle.createWritable()
                const blob = await fetch(`data:image/png;base64,${item.base64}`).then(r => r.blob())
                await writable.write(blob)
                await writable.close()
                writtenCount++
              } catch (e) {
                console.warn('[ATA-export] write to dir failed', name, e)
              }
            }
            const msg = `Exported ${writtenCount} of ${total} to folder.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`
            setCopyStatus({ success: failedCount === 0, message: msg })
          } else {
            const delayMs = 250
            for (let i = 0; i < items.length; i++) {
              const item = items[i]
              if (!item.base64) continue
              try {
                const name = getUniqueFilename(item.screenId, item.actionId)
                const bin = Uint8Array.from(atob(item.base64), c => c.charCodeAt(0))
                const blob = new Blob([bin], { type: 'image/png' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = name
                a.click()
                URL.revokeObjectURL(url)
                writtenCount++
              } catch (_) {}
              if (i < items.length - 1) await new Promise(r => setTimeout(r, delayMs))
            }
            let msg = `Exported ${writtenCount} of ${total} (downloads).`
            if (failedCount > 0) msg += ` ${failedCount} failed.`
            setCopyStatus({ success: failedCount === 0, message: msg })
          }
          setTimeout(() => setCopyStatus(null), 4000)
        })()
        return true
      }

      case 'ANALYTICS_TAGGING_REQUEST_COPY_TABLE':
        copyTableToClipboardRef.current?.()
        return true

      default:
        return false
    }
  }

  // --- Quick action handler ---
  function handleExportScreenshots(): boolean {
    const currentSession = sessionRef.current
    if (!currentSession || currentSession.rows.length === 0) return true
    const total = currentSession.rows.length
    const doExport = async () => {
      exportDirHandleRef.current = null
      const hasDirPicker = typeof (window as unknown as { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<unknown> }).showDirectoryPicker === 'function'
      if (CONFIG.dev?.debug?.enabled && (CONFIG.dev.debug.scopes as Record<string, boolean>)?.['subsystem:analytics_tagging']) {
        console.log('[ATA-export] showDirectoryPicker exists:', hasDirPicker)
      }
      if (hasDirPicker) {
        try {
          const dir = await (window as unknown as { showDirectoryPicker: (opts: { mode: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({ mode: 'readwrite' })
          exportDirHandleRef.current = dir
        } catch (_) {
          exportDirHandleRef.current = null
        }
      }
      exportBaseNamesRef.current = new Map()
      exportItemsRef.current = []
      exportProgressRef.current = { done: 0, total, failed: 0 }
      setExportProgress({ done: 0, total, failed: 0 })
      exportInProgressRef.current = true
      setExportInProgress(true)
      const rows: AnalyticsTaggingExportCompactRow[] = currentSession.rows.map(row => ({
        rowId: row.id,
        screenId: row.screenId,
        actionId: row.actionId,
        meta: row.meta ? { containerNodeId: row.meta.containerNodeId, targetNodeId: row.meta.targetNodeId, rootScreenNodeId: row.meta.rootScreenNodeId } : undefined,
        screenshotRef: row.screenshotRef ? { containerNodeId: row.screenshotRef.containerNodeId, targetNodeId: row.screenshotRef.targetNodeId, rootNodeId: row.screenshotRef.rootNodeId } : undefined
      }))
      emit<ExportAnalyticsTaggingScreenshotsHandler>('EXPORT_ANALYTICS_TAGGING_SCREENSHOTS', { rows })
    }
    doExport()
    return true
  }

  // --- Clipboard copy ---
  const copyTableToClipboard = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession || currentSession.rows.length === 0) {
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'No table to copy.')
      return
    }
    const table = sessionToTable(currentSession)
    const atProjected = projectContentTable('analytics-tagging', table.items)
    const { html: htmlTable } = universalTableToHtml(table, atProjected)
    const tsv = universalTableToTsv(table, atProjected)
    const result = await copyHtmlToClipboard(htmlTable, tsv)
    if (result.success) {
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', result.message)
    } else {
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', result.message)
    }
  }, [])
  const copyTableToClipboardRef = useRef(copyTableToClipboard)
  copyTableToClipboardRef.current = copyTableToClipboard

  // --- Row handlers ---
  const handleUpdateRow = useCallback((rowId: string, updates: Record<string, unknown>) => {
    setAutosaveStatus('saving')
    emit<AnalyticsTaggingUpdateRowHandler>('ANALYTICS_TAGGING_UPDATE_ROW', rowId, updates)
  }, [])

  const handleDeleteRow = useCallback((rowId: string) => {
    emit<AnalyticsTaggingDeleteRowHandler>('ANALYTICS_TAGGING_DELETE_ROW', rowId)
  }, [])

  const handleFixNearMisses = useCallback(() => {
    setIsFixingNearMisses(true)
    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', 'fix-annotation-near-misses', 'analytics_tagging')
  }, [])

  const handleDismissNearMisses = useCallback(() => {
    setNearMissesDismissed(true)
  }, [])

  const handleAddAnnotations = useCallback(() => {
    if (isAddingAnnotations) return
    if (!selectionState.hasSelection) return
    setIsAddingAnnotations(true)
    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', 'add-annotations', 'analytics_tagging')
  }, [isAddingAnnotations, selectionState.hasSelection])

  const downloadPngDataUrl = useCallback((filename: string, dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename.endsWith('.png') ? filename : filename + '.png'
    a.click()
  }, [])

  const handleExportRowThumbnail = useCallback((row: Row, dataUrl: string) => {
    const sanitize = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'row'
    const screenId = (row.screenId || '').trim()
    const actionId = (row.actionId || '').trim()
    const filename = screenId && actionId
      ? `${sanitize(screenId)}__${sanitize(actionId)}.png`
      : `row_${row.id}.png`
    downloadPngDataUrl(filename, dataUrl)
  }, [downloadPngDataUrl])

  const displayedNearMisses = nearMissesDismissed ? [] : nearMisses

  // --- View rendering ---
  function renderView(): h.JSX.Element | null {
    if (assistantId !== 'analytics_tagging') return null

    if (session && session.rows.length > 0) {
      return (
        <AnalyticsTaggingView
          session={session}
          hasSelection={selectionState.hasSelection}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
          onAppend={() => handleQuickAction('append-analytics-tags')}
          onViewOnStage={editorType !== 'dev' ? () => {
            if (!session) return
            const table = sessionToTable(session)
            const atStageProjected = projectContentTable('analytics-tagging', table.items)
            emit<RenderTableOnStageHandler>('RENDER_TABLE_ON_STAGE', {
              headers: atStageProjected.headers,
              headerRows: atStageProjected.headerRows,
              rows: atStageProjected.rows,
              title: session.source?.pageName || 'AT-A Table Preview',
              existingFrameId: stageFrameIdRef.current,
              columnKeys: atStageProjected.columnKeys
            })
          } : undefined}
          onCopyToClipboard={async () => {
            setIsCopying(true)
            try {
              await copyTableToClipboard()
            } finally {
              setIsCopying(false)
            }
          }}
          onRestart={() => {
            handleQuickAction('new-session')
            setSession(null)
            setNearMisses([])
            setNearMissesDismissed(false)
            setIsFixingNearMisses(false)
          }}
          onExportRowRefImage={(row) => {
            const compact: AnalyticsTaggingExportCompactRow = {
              rowId: row.id,
              screenId: row.screenId,
              actionId: row.actionId,
              meta: row.meta ? { containerNodeId: row.meta.containerNodeId, targetNodeId: row.meta.targetNodeId, rootScreenNodeId: row.meta.rootScreenNodeId } : undefined,
              screenshotRef: row.screenshotRef ? { containerNodeId: row.screenshotRef.containerNodeId, targetNodeId: row.screenshotRef.targetNodeId, rootNodeId: row.screenshotRef.rootNodeId } : undefined
            }
            emit<ExportAnalyticsTaggingOneRowHandler>('EXPORT_ANALYTICS_TAGGING_ONE_ROW', { row: compact })
          }}
          isCopying={isCopying}
          screenshotPreviews={screenshotPreviews}
          screenshotErrors={screenshotErrors}
          nearMisses={displayedNearMisses}
          onFixNearMisses={handleFixNearMisses}
          onDismissNearMisses={handleDismissNearMisses}
          isFixingNearMisses={isFixingNearMisses}
          onAddAnnotations={handleAddAnnotations}
          isAddingAnnotations={isAddingAnnotations}
        />
      )
    }

    return (
      <AnalyticsTaggingWelcome
        hasSelection={selectionState.hasSelection}
        onGetTags={() => handleQuickAction('get-analytics-tags')}
        nearMisses={displayedNearMisses}
        onFixNearMisses={handleFixNearMisses}
        onDismissNearMisses={handleDismissNearMisses}
        isFixingNearMisses={isFixingNearMisses}
        onAddAnnotations={handleAddAnnotations}
        isAddingAnnotations={isAddingAnnotations}
      />
    )
  }

  return {
    session,
    exportSession,
    setExportSession,
    isCopying,
    handleMessage,
    handleExportScreenshots,
    renderView,
    // Exposed for quick-action disabled check
    copyTableToClipboard,
  }
}
