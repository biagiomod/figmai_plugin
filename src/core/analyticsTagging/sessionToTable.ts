/**
 * Analytics Tagging — map Session.rows → UniversalContentTableV1
 * Reuses Content Table export pipeline (Confluence/XHTML). Items include analytics columns.
 */

import type { UniversalContentTableV1, ContentItemV1, TableMetaV1 } from '../contentTable/types'
import type { Session, Row } from './types'

/** Same as selection.ts: web link when fileKey exists, else figma:// fallback. Keeps export/copy URLs consistent with row links. */
function buildFigmaWebNodeUrl(nodeId: string): string {
  try {
    const fileKey = (figma as { fileKey?: string }).fileKey
    if (!fileKey) return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    const nodeIdParam = nodeId.replace(/:/g, '-')
    return `https://www.figma.com/design/${fileKey}?node-id=${encodeURIComponent(nodeIdParam)}`
  } catch {
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

/** Map a single Row to a table item (ContentItemV1 shape + analytics columns for preset extract) */
function rowToItem(row: Row): ContentItemV1 & Record<string, unknown> {
  const targetId = row.meta?.targetNodeId ?? row.screenshotRef?.targetNodeId ?? ''
  const item: ContentItemV1 & Record<string, unknown> = {
    id: row.id,
    nodeId: targetId,
    nodeUrl: row.figmaElementLink,
    component: { kind: 'custom', name: row.component },
    field: { label: row.actionId, path: row.screenId },
    content: { type: 'text', value: row.description },
    meta: { visible: true, locked: false },
    notes: row.note,
    // Analytics columns (preset extract reads these); always placeholder for Confluence paste
    screenId: row.screenId,
    screenshot: '— / Attach image',
    description: row.description,
    actionType: row.actionType,
    actionId: row.actionId,
    actionName: row.actionName ?? '',
    figmaElementLink: row.figmaElementLink,
    population: row.population,
    note: row.note
  }
  return item
}

/** Build UniversalContentTableV1 from Session for Confluence/HTML/TSV export */
export function sessionToTable(session: Session): UniversalContentTableV1 {
  const now = new Date().toISOString()
  const firstRow = session.rows[0]
  const rootNodeId = firstRow?.meta?.rootScreenNodeId ?? firstRow?.screenshotRef?.rootNodeId ?? ''
  const rootNodeUrl = rootNodeId ? buildFigmaWebNodeUrl(rootNodeId) : ''

  const meta: TableMetaV1 = {
    contentModel: 'Analytics Tagging',
    contentStage: 'Draft',
    adaStatus: '⏳ Pending',
    legalStatus: '⏳ Pending',
    lastUpdated: now,
    version: 'v1',
    rootNodeId,
    rootNodeName: session.source?.pageName ?? 'Analytics Session',
    rootNodeUrl
  }

  const items = session.rows.map(row => rowToItem(row))

  return {
    type: 'universal-content-table',
    version: 1,
    generatedAtISO: now,
    source: {
      pageId: session.source?.pageId ?? '',
      pageName: session.source?.pageName ?? 'Unknown Page',
      selectionNodeId: rootNodeId,
      selectionName: session.source?.pageName ?? 'Analytics Session'
    },
    meta,
    items: items as ContentItemV1[]
  }
}
