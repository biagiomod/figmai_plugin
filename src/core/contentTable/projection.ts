/**
 * CT-A Projection Layer
 *
 * Single source of truth for projecting ContentItemV1[] through a preset
 * into { headerRows, headers, columnKeys, rows: Cell[][] }.
 *
 * ALL output paths (inline table, clipboard HTML/TSV, stage) MUST call
 * projectContentTable() instead of independently calling col.extract().
 *
 * Link columns produce rich Cell objects with href so downstream renderers
 * never need to guess which columns are links.
 *
 * Supports two row modes:
 *   items — 1 SSOT item → 1 row (default for all presets)
 *   kv    — 1 SSOT item → N rows grouped by container (content-model-1)
 */

import type { ContentItemV1, TableFormatPreset } from './types'
import { PRESET_COLUMNS } from './presets.generated'

/** A projected cell: plain string or rich text + hyperlink. */
export type Cell = string | { text: string; href: string }

export interface ProjectedTable {
  /**
   * All header rows (top to bottom). Non-KV presets have a single row;
   * CM1 has two rows: ["Column 1"…"Column 9"] then the real labels.
   */
  headerRows: string[][]
  /** Primary (last) header row — the semantic column labels. */
  headers: string[]
  columnKeys: string[]
  rows: Cell[][]
  /** True when the projected rows are synthetic (KV mode) and inline editing is not meaningful. */
  readOnly: boolean
}

export function cellText(cell: Cell): string {
  return typeof cell === 'string' ? cell : cell.text
}

export function cellHref(cell: Cell): string | undefined {
  return typeof cell === 'string' ? undefined : cell.href
}

/**
 * Column keys that represent Figma node URLs.
 * Any column whose key is in this set will emit a rich Cell with href
 * when the extracted value is a non-empty string.
 */
const LINK_COLUMN_KEYS = new Set([
  'figmaRef',
  'nodeUrl',
  'figmaElementLink'
])

const KV_PRESET_IDS = new Set<TableFormatPreset>(['content-model-1'])

function getColumnsForPreset(presetId: TableFormatPreset) {
  const cols = PRESET_COLUMNS[presetId]
  if (!cols || cols.length === 0) return PRESET_COLUMNS['universal']
  return cols
}

export function projectContentTable(
  presetId: TableFormatPreset,
  items: ContentItemV1[]
): ProjectedTable {
  if (KV_PRESET_IDS.has(presetId)) {
    return projectKV(presetId, items)
  }
  return projectItems(presetId, items)
}

function projectItems(
  presetId: TableFormatPreset,
  items: ContentItemV1[]
): ProjectedTable {
  const cols = getColumnsForPreset(presetId)
  const headers = cols.map(c => c.label)
  const columnKeys = cols.map(c => c.key)

  const rows: Cell[][] = items.map(item =>
    cols.map(col => {
      const raw = col.extract(item)
      if (LINK_COLUMN_KEYS.has(col.key) && raw) {
        return { text: 'View in Figma', href: raw }
      }
      return raw
    })
  )

  return { headerRows: [headers], headers, columnKeys, rows, readOnly: false }
}

// ---------------------------------------------------------------------------
// KV projection for Content Model 1
// ---------------------------------------------------------------------------

/**
 * Extract container name from an item's breadcrumb path.
 * Scanner stores field.path as "ContainerName / SubGroup / TextLabel".
 * The first segment is always the scanned container's name.
 */
function containerKey(item: ContentItemV1): string {
  const path = item.field?.path ?? ''
  const sep = path.indexOf(' / ')
  return sep > 0 ? path.slice(0, sep) : path || item.id
}

interface ContainerGroup {
  name: string
  /** URL of first item in the group (best available proxy for container URL). */
  firstItemUrl: string
  items: ContentItemV1[]
}

/**
 * Group items by container, preserving scan order.
 * Items from the same container are contiguous (scanner appends in order).
 * If the same container name reappears later (e.g. after appending a second
 * selection), each run becomes its own block to match scan order.
 */
function groupByContainer(items: ContentItemV1[]): ContainerGroup[] {
  const groups: ContainerGroup[] = []
  let current: ContainerGroup | null = null

  for (const item of items) {
    const key = containerKey(item)
    if (!current || current.name !== key) {
      current = { name: key, firstItemUrl: item.nodeUrl || '', items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }

  return groups
}

/**
 * Build a blank row (matches column count).
 */
function blankRow(colCount: number): Cell[] {
  return Array.from({ length: colCount }, () => '')
}

/**
 * Project items in KV mode for Content Model 1.
 *
 * Per container block:
 *   Row 1 (header): Col0=View in Figma link, Col3="ContentList", Col4="id"
 *   Row 2:          Col5="title"
 *   Then for each content item:
 *     Row A:         Col4="key"
 *     Row B:         Col5="value", Col6=<content text>
 *
 * Column indices (0-based):
 *   0=Figma Ref, 1=Tag, 2=Source, 3=Model, 4=Metadata Key,
 *   5=Content Key, 6=Content, 7=Rules/Comment, 8=Notes/Jira
 *
 * headerRows includes an extra "Column 1..Column 9" row above the
 * semantic labels row.
 */
function projectKV(
  presetId: TableFormatPreset,
  items: ContentItemV1[]
): ProjectedTable {
  const cols = getColumnsForPreset(presetId)
  const headers = cols.map(c => c.label)
  const columnKeys = cols.map(c => c.key)
  const colCount = cols.length

  const numberedRow = cols.map((_, i) => `Column ${i + 1}`)

  const COL_FIGMA_REF = 0
  const COL_MODEL = 3
  const COL_METADATA_KEY = 4
  const COL_CONTENT_KEY = 5
  const COL_CONTENT = 6

  const groups = groupByContainer(items)
  const rows: Cell[][] = []

  for (const group of groups) {
    const headerRow = blankRow(colCount)
    if (group.firstItemUrl) {
      headerRow[COL_FIGMA_REF] = { text: 'View in Figma', href: group.firstItemUrl }
    }
    headerRow[COL_MODEL] = 'ContentList'
    headerRow[COL_METADATA_KEY] = 'id'
    rows.push(headerRow)

    const titleRow = blankRow(colCount)
    titleRow[COL_CONTENT_KEY] = 'title'
    rows.push(titleRow)

    for (const item of group.items) {
      const keyRow = blankRow(colCount)
      keyRow[COL_METADATA_KEY] = 'key'
      rows.push(keyRow)

      const valueRow = blankRow(colCount)
      valueRow[COL_CONTENT_KEY] = 'value'
      valueRow[COL_CONTENT] = item.content?.value ?? ''
      rows.push(valueRow)
    }
  }

  return {
    headerRows: [numberedRow, headers],
    headers,
    columnKeys,
    rows,
    readOnly: true
  }
}
