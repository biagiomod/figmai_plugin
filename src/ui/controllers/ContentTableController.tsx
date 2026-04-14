/**
 * ContentTableController — owns state, message handling, and clipboard operations
 * for the content_table assistant.
 *
 * Extracted from ui.tsx to reduce its size.
 */
import { h } from 'preact'
import { useState, useRef, useCallback } from 'preact/hooks'
import { emit } from '@create-figma-plugin/utilities'

import { CONFIG } from '../../core/config'
import type {
  UniversalContentTableV1,
  TableFormatPreset,
  SelectionState,
  CopyTableStatusHandler,
  ExportContentTableRefImageHandler,
  ContentTableResetHandler,
  RenderTableOnStageHandler,
  Message,
} from '../../core/types'
import type { ContentItemV1 } from '../../core/contentTable/types'
import type { ContentTableSession } from '../../core/contentTable/session'
import { createSession, getEffectiveItems, applyEdit, deleteItem, appendItems, toggleDuplicateScan } from '../../core/contentTable/session'
import { classifyCandidates, filterByDuplicates } from '../../core/contentTable/duplicates'
import { projectContentTable } from '../../core/contentTable/projection'
import { universalTableToHtml, universalTableToTsv, universalTableToJson } from '../../core/contentTable/renderers'
import { copyHtmlToClipboard, copyTextToClipboard, copyImageToClipboard } from '../services/clipboardService'
import { ContentTableWelcome } from '../components/ContentTableWelcome'
import { ContentTableView } from '../components/ContentTableView'

export interface ContentTableControllerDeps {
  assistantId: string
  selectionState: SelectionState
  editorType: 'figma' | 'dev'
  stageFrameIdRef: React.MutableRefObject<string | null>
  handleQuickAction: (actionId: string) => void
  setMessages: (fn: (prev: Message[]) => Message[]) => void
}

export function useContentTableController(deps: ContentTableControllerDeps) {
  const {
    assistantId,
    selectionState,
    editorType,
    stageFrameIdRef,
    handleQuickAction,
    setMessages,
  } = deps

  // --- State ---
  const [contentTable, setContentTable] = useState<UniversalContentTableV1 | null>(null)
  const [ctSession, setCtSession] = useState<ContentTableSession | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<TableFormatPreset>('universal')
  const [showTableView, setShowTableView] = useState(false)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [showCopyFormatModal, setShowCopyFormatModal] = useState(false)
  const [showConfluenceModal, setShowConfluenceModal] = useState(false)
  const [confluenceFormat, setConfluenceFormat] = useState<TableFormatPreset>('universal')
  const [pendingAction, setPendingAction] = useState<'copy' | 'view' | 'confluence' | null>(null)
  const [isCopyingTable, setIsCopyingTable] = useState(false)
  const [isCopyingRefImage, setIsCopyingRefImage] = useState(false)
  const [showRescanConfirm, setShowRescanConfirm] = useState(false)
  const [copyStatus, setCopyStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [debugHtml, setDebugHtml] = useState('')
  const [debugTsv, setDebugTsv] = useState('')

  const scannedContainerIdsRef = useRef<Set<string>>(new Set())
  const pendingRescanActionRef = useRef<string | null>(null)

  // Debug logging function (gated behind CONFIG.dev.enableClipboardDebugLogging)
  const uiDebugLog = useCallback((message: string, data?: Record<string, unknown>) => {
    if (CONFIG.dev.enableClipboardDebugLogging) {
      console.log(`[Clipboard] ${message}`, data || '')
    }
  }, [])

  // --- Message handler ---
  function handleMessage(type: string, message: Record<string, unknown>): boolean {
    switch (type) {
      case 'CONTENT_TABLE_GENERATED':
        if (message.table) {
          const rawItems = (message.table as UniversalContentTableV1).items as ContentItemV1[]
          const dupResults = classifyCandidates(rawItems, [])
          const { items: filtered, flaggedIds, skippedCount } = filterByDuplicates(dupResults)
          const dedupedTable = { ...(message.table as UniversalContentTableV1), items: filtered }
          const ignoreFlagIds = new Set<string>(Array.isArray(message.flaggedIgnoreIds) ? message.flaggedIgnoreIds as string[] : [])
          const ignoreRuleByItemId = (message.ignoreRuleByItemId && typeof message.ignoreRuleByItemId === 'object')
            ? message.ignoreRuleByItemId as Record<string, string>
            : {}
          const tokenizedItemsFromMsg: Record<string, string> =
            message.tokenizedItems && typeof message.tokenizedItems === 'object'
              ? message.tokenizedItems as Record<string, string>
              : {}
          const tokenizedIdsFromMsg = new Set<string>(
            Array.isArray(message.tokenizedIds) ? message.tokenizedIds as string[] : []
          )
          setContentTable(dedupedTable)
          setCtSession(createSession(dedupedTable, {
            flaggedDuplicateIds: flaggedIds,
            flaggedIgnoreIds: ignoreFlagIds,
            ignoreRuleByItemId,
            skippedCount,
            tokenizedItems: tokenizedItemsFromMsg,
            tokenizedIds: tokenizedIdsFromMsg
          }))
          setSelectedFormat('simple-worksheet')
          const genContainerIds: string[] = (message.scannedContainerNodeIds as string[]) || []
          for (const cid of genContainerIds) scannedContainerIdsRef.current.add(cid)
          if (genContainerIds.length === 0 && (message.table as UniversalContentTableV1).meta?.rootNodeId) {
            scannedContainerIdsRef.current.add((message.table as UniversalContentTableV1).meta!.rootNodeId!)
          }
        }
        return true

      case 'CONTENT_TABLE_APPEND':
        if (message.table) {
          setCtSession(prev => {
            const appendIgnoreFlags = new Set<string>(Array.isArray(message.flaggedIgnoreIds) ? message.flaggedIgnoreIds as string[] : [])
            const appendIgnoreRules = (message.ignoreRuleByItemId && typeof message.ignoreRuleByItemId === 'object')
              ? message.ignoreRuleByItemId as Record<string, string>
              : {}
            const appendTokenizedItems: Record<string, string> =
              message.tokenizedItems && typeof message.tokenizedItems === 'object'
                ? message.tokenizedItems as Record<string, string>
                : {}
            const appendTokenizedIds = new Set<string>(
              Array.isArray(message.tokenizedIds) ? message.tokenizedIds as string[] : []
            )
            if (!prev) return createSession(message.table as UniversalContentTableV1, {
              flaggedIgnoreIds: appendIgnoreFlags,
              ignoreRuleByItemId: appendIgnoreRules,
              tokenizedItems: appendTokenizedItems,
              tokenizedIds: appendTokenizedIds
            })
            const existing = getEffectiveItems(prev)
            if (prev.scanEnabled) {
              const dupResults = classifyCandidates((message.table as UniversalContentTableV1).items, existing)
              const { items: filteredItems, flaggedIds, skippedCount } = filterByDuplicates(dupResults)
              return appendItems(prev, filteredItems, {
                flaggedDuplicateIds: flaggedIds,
                flaggedIgnoreIds: appendIgnoreFlags,
                ignoreRuleByItemId: appendIgnoreRules,
                skippedCount,
                tokenizedItems: appendTokenizedItems,
                tokenizedIds: appendTokenizedIds
              })
            }
            return appendItems(prev, (message.table as UniversalContentTableV1).items, {
              flaggedIgnoreIds: appendIgnoreFlags,
              ignoreRuleByItemId: appendIgnoreRules,
              tokenizedItems: appendTokenizedItems,
              tokenizedIds: appendTokenizedIds
            })
          })
          setContentTable(prev => {
            if (!prev) return message.table as UniversalContentTableV1
            return { ...prev, items: [...prev.items, ...(message.table as UniversalContentTableV1).items] }
          })
          const appContainerIds: string[] = (message.scannedContainerNodeIds as string[]) || []
          for (const cid of appContainerIds) scannedContainerIdsRef.current.add(cid)
          if (appContainerIds.length === 0 && (message.table as UniversalContentTableV1).meta?.rootNodeId) {
            scannedContainerIdsRef.current.add((message.table as UniversalContentTableV1).meta!.rootNodeId!)
          }
        }
        return true

      case 'CONTENT_TABLE_ERROR':
        console.error('[UI] Received CONTENT_TABLE_ERROR:', message.error)
        setContentTable(null)
        setCtSession(null)
        return true

      case 'CONTENT_TABLE_REF_IMAGE_READY':
        console.log('[UI] Received CONTENT_TABLE_REF_IMAGE_READY, dataUrl length:', (message.dataUrl as string)?.length || 0)
        handleCopyRefImageToClipboard(message.dataUrl as string)
        return true

      case 'CONTENT_TABLE_REF_IMAGE_ERROR':
        console.log('[UI] Received CONTENT_TABLE_REF_IMAGE_ERROR:', message.message)
        setIsCopyingRefImage(false)
        emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', (message.message as string) || 'Could not copy reference image.')
        return true

      case 'RENDER_TABLE_ON_STAGE_DONE':
        if (message.frameId) stageFrameIdRef.current = message.frameId as string
        return true

      case 'CONTENT_TABLE_RESET_DONE':
        resetState()
        return true

      default:
        return false
    }
  }

  // --- Reset ---
  function resetState() {
    setContentTable(null)
    setCtSession(null)
    setShowTableView(false)
    setShowFormatModal(false)
    setShowCopyFormatModal(false)
    setShowConfluenceModal(false)
    setPendingAction(null)
    setSelectedFormat('simple-worksheet')
    setIsCopyingTable(false)
    setIsCopyingRefImage(false)
    setShowRescanConfirm(false)
    scannedContainerIdsRef.current.clear()
    pendingRescanActionRef.current = null
    stageFrameIdRef.current = null
  }

  // --- Copy table ---
  const handleCopyTable = useCallback(async (format: TableFormatPreset, copyFormatType: 'html' | 'tsv' | 'json' = 'html', rowsOnly = false, itemsOverride?: ContentItemV1[]) => {
    if (!contentTable) {
      setCopyStatus({ success: false, message: 'No table available to copy' })
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'No table available to copy')
      return
    }

    setIsCopyingTable(true)
    setCopyStatus(null)

    try {
      const effectiveItems = itemsOverride ?? (ctSession ? getEffectiveItems(ctSession) : contentTable.items)
      const projected = projectContentTable(format, effectiveItems)
      const { html: htmlTable } = universalTableToHtml(contentTable, projected, rowsOnly)
      const tsv = universalTableToTsv(contentTable, projected, rowsOnly)
      const json = universalTableToJson(contentTable)

      uiDebugLog('Copy attempt started', { format, copyFormatType, htmlLength: htmlTable.length, tsvLength: tsv.length, jsonLength: json.length })
      setDebugHtml(htmlTable)
      setDebugTsv(tsv)

      let result: { success: boolean; message: string }
      if (copyFormatType === 'html') {
        result = await copyHtmlToClipboard(htmlTable, tsv)
      } else if (copyFormatType === 'tsv') {
        result = await copyTextToClipboard(tsv)
      } else {
        result = await copyTextToClipboard(json)
      }

      setIsCopyingTable(false)
      setCopyStatus(result)
      if (result.success) {
        setShowCopySuccess(true)
        emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
        setTimeout(() => {
          setShowCopySuccess(false)
          setCopyStatus(null)
        }, 3000)
      } else {
        emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', result.message)
      }
    } catch (error: unknown) {
      const err = error as Error
      setIsCopyingTable(false)
      setCopyStatus({ success: false, message: `Copy failed: ${err.message || 'Unknown error'}` })
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'Failed to copy table.')
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Failed to copy table to clipboard: ${err.message || 'Unknown error'}`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [contentTable, ctSession, uiDebugLog, setMessages])

  // --- Copy ref image ---
  const handleCopyRefImage = useCallback(() => {
    if (!contentTable || !contentTable.meta?.rootNodeId) {
      setIsCopyingRefImage(false)
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'No table available or root node not found.')
      return
    }
    setIsCopyingRefImage(true)
    emit<ExportContentTableRefImageHandler>('EXPORT_CONTENT_TABLE_REF_IMAGE', contentTable.meta.rootNodeId)
  }, [contentTable])

  const handleCopyRefImageToClipboard = useCallback(async (dataUrl: string) => {
    const rootNodeId = contentTable?.meta?.rootNodeId
    const filename = rootNodeId
      ? `CT_RefImage_${rootNodeId.replace(/[:]/g, '-')}_600w.png`
      : 'CT_RefImage_600w.png'
    const result = await copyImageToClipboard(dataUrl, filename)
    setIsCopyingRefImage(false)
    if (result.success) {
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Reference image copied to clipboard')
    } else {
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', result.message)
    }
  }, [contentTable])

  // --- Copy content column only ---
  const handleCopyContentColumn = useCallback(async (visibleItems: ContentItemV1[]) => {
    const text = visibleItems.map(item => item.content.value).filter(Boolean).join('\n')
    setIsCopyingTable(true)
    setCopyStatus(null)
    try {
      const result = await copyTextToClipboard(text)
      setIsCopyingTable(false)
      setCopyStatus(result)
      if (result.success) {
        setShowCopySuccess(true)
        emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Content column copied to clipboard')
        setTimeout(() => { setShowCopySuccess(false); setCopyStatus(null) }, 3000)
      } else {
        emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', result.message)
      }
    } catch (error: unknown) {
      const err = error as Error
      setIsCopyingTable(false)
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'Failed to copy content column.')
      setCopyStatus({ success: false, message: `Copy failed: ${err.message || 'Unknown error'}` })
    }
  }, [])

  // --- Copy TSV only ---
  const handleCopyTsv = useCallback(async (format: TableFormatPreset) => {
    if (!contentTable) return
    if (window.focus) window.focus()
    const tsvProjected = projectContentTable(format, contentTable.items)
    const tsv = universalTableToTsv(contentTable, tsvProjected)
    const result = await copyTextToClipboard(tsv)
    setCopyStatus(result.success ? { success: true, message: 'TSV copied to clipboard' } : { success: false, message: `TSV copy failed: ${result.message}` })
    if (result.success) {
      setShowCopySuccess(true)
      setTimeout(() => { setShowCopySuccess(false); setCopyStatus(null) }, 2000)
    }
  }, [contentTable])

  // --- Download HTML ---
  const handleDownloadHtml = useCallback((format: TableFormatPreset) => {
    if (!contentTable) return
    const dlProjected = projectContentTable(format, contentTable.items)
    const { html: htmlTable } = universalTableToHtml(contentTable, dlProjected)
    const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Content Table</title>\n</head>\n<body>\n${htmlTable}\n</body>\n</html>`
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `content-table-${format}-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [contentTable])

  // --- Confluence success ---
  const handleConfluenceSuccess = useCallback(() => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: 'Table sent to Confluence',
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, message])
  }, [setMessages])

  // --- Quick action helpers ---
  function checkRescanOverlap(actionId: string): boolean {
    const selNodeIds = selectionState.nodeIds || []
    const overlap = selNodeIds.some(id => scannedContainerIdsRef.current.has(id))
    if (overlap) {
      pendingRescanActionRef.current = actionId
      setShowRescanConfirm(true)
      return true
    }
    return false
  }

  return {
    // State
    contentTable,
    setContentTable,
    ctSession,
    setCtSession,
    selectedFormat,
    setSelectedFormat,
    showTableView,
    setShowTableView,
    showFormatModal,
    setShowFormatModal,
    showCopyFormatModal,
    setShowCopyFormatModal,
    showConfluenceModal,
    setShowConfluenceModal,
    confluenceFormat,
    setConfluenceFormat,
    pendingAction,
    setPendingAction,
    isCopyingTable,
    isCopyingRefImage,
    showRescanConfirm,
    setShowRescanConfirm,
    copyStatus,
    setCopyStatus,
    showCopySuccess,
    setShowCopySuccess,
    debugHtml,
    debugTsv,
    scannedContainerIdsRef,
    pendingRescanActionRef,

    // Handlers
    handleMessage,
    resetState,
    handleCopyTable,
    handleCopyContentColumn,
    handleCopyRefImage,
    handleCopyTsv,
    handleDownloadHtml,
    handleConfluenceSuccess,
    checkRescanOverlap,
  }
}
