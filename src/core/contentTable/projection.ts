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
import { PRESET_COLUMNS, PRESET_INFO, PRESET_TEMPLATES } from './presets.generated'

/** A projected cell: plain string or rich text + hyperlink (+ optional plain suffix line). */
export type Cell = string | { text: string; href: string; suffix?: string }

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
  if (typeof cell === 'string') return cell
  return cell.suffix ? `${cell.text}${cell.suffix}` : cell.text
}

export function cellHref(cell: Cell): string | undefined {
  return typeof cell === 'string' ? undefined : cell.href
}

export function cellSuffix(cell: Cell): string {
  return typeof cell === 'string' ? '' : (cell.suffix || '')
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

function getColumnsForPreset(presetId: TableFormatPreset) {
  const cols = PRESET_COLUMNS[presetId]
  if (!cols || cols.length === 0) return PRESET_COLUMNS['universal']
  return cols
}

function getPresetKind(presetId: TableFormatPreset): 'simple' | 'grouped' {
  const info = PRESET_INFO.find(p => p.id === presetId)
  return info?.kind === 'grouped' ? 'grouped' : 'simple'
}

export function projectContentTable(
  presetId: TableFormatPreset,
  items: ContentItemV1[]
): ProjectedTable {
  if (getPresetKind(presetId) === 'grouped') {
    if (!PRESET_TEMPLATES[presetId]) return projectItems(presetId, items)
    return projectGrouped(presetId, items)
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
// Grouped/template projection
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
  /** URL of first item in the group; used as best available container URL proxy. */
  containerUrl: string
  items: ContentItemV1[]
}

function pickContainerUrl(item: ContentItemV1): string {
  const anyItem = item as unknown as Record<string, unknown>
  const direct = typeof anyItem.containerUrl === 'string' ? anyItem.containerUrl : ''
  const containerNodeUrl = typeof anyItem.containerNodeUrl === 'string' ? anyItem.containerNodeUrl : ''
  const rootNodeUrl = typeof anyItem.rootNodeUrl === 'string' ? anyItem.rootNodeUrl : ''
  const meta = (anyItem.meta && typeof anyItem.meta === 'object') ? anyItem.meta as Record<string, unknown> : null
  const metaContainerUrl = meta && typeof meta.containerUrl === 'string' ? meta.containerUrl : ''
  return direct || containerNodeUrl || rootNodeUrl || metaContainerUrl || item.nodeUrl || ''
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
    const containerUrl = pickContainerUrl(item)
    if (!current || current.name !== key) {
      current = { name: key, containerUrl, items: [] }
      groups.push(current)
    } else if (!current.containerUrl && containerUrl) {
      current.containerUrl = containerUrl
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

interface TemplateStaticCell {
  type: 'static'
  text: string
}

interface TemplateFieldCell {
  type: 'field'
  field: string
}

interface TemplateLinkCell {
  type: 'link'
  label: string | { type: 'static'; text: string } | { type: 'field'; field: string }
  hrefField: string
  suffix?: string
}

type TemplateCell = string | TemplateStaticCell | TemplateFieldCell | TemplateLinkCell | null

interface GroupedTemplateDef {
  headerRows?: string[][]
  containerIntroRows?: TemplateCell[][]
  itemRows?: TemplateCell[][]
}

function pathValue(source: unknown, path: string): string {
  if (!source || !path) return ''
  const parts = path.split('.')
  let current: unknown = source
  for (const part of parts) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[part]
  }
  if (current === null || current === undefined) return ''
  return String(current)
}

function resolveField(field: string, group: ContainerGroup, item?: ContentItemV1): string {
  switch (field) {
    case 'containerUrl':
      return group.containerUrl
    case 'containerName':
      return group.name
    case 'content':
      return item?.content?.value ?? ''
    case 'nodeUrl':
      return item?.nodeUrl ?? group.containerUrl
    default:
      return pathValue(item ?? group, field)
  }
}

function normalizeTemplateCell(raw: TemplateCell): TemplateCell {
  if (raw === null || raw === undefined) return ''
  return raw
}

function resolveTemplateCell(cell: TemplateCell, group: ContainerGroup, sectionIndex: number, item?: ContentItemV1): Cell {
  const normalized = normalizeTemplateCell(cell)
  if (typeof normalized === 'string') return normalized
  if (!normalized || typeof normalized !== 'object') return ''
  if (normalized.type === 'static') {
    return (normalized.text || '').replace(/\{sectionIndex\}/g, String(sectionIndex))
  }
  if (normalized.type === 'field') return resolveField(normalized.field, group, item)
  if (normalized.type === 'link') {
    const href = resolveField(normalized.hrefField, group, item)
    let text = ''
    if (typeof normalized.label === 'string') {
      text = normalized.label
    } else if (normalized.label?.type === 'static') {
      text = normalized.label.text || ''
    } else if (normalized.label?.type === 'field') {
      text = resolveField(normalized.label.field, group, item)
    }
    const suffix = typeof normalized.suffix === 'string'
      ? normalized.suffix.replace(/\{sectionIndex\}/g, String(sectionIndex))
      : ''
    if (!href || !text) return text ? `${text}${suffix}` : ''
    return suffix ? { text, href, suffix } : { text, href }
  }
  return ''
}

function projectGrouped(
  presetId: TableFormatPreset,
  items: ContentItemV1[]
): ProjectedTable {
  const cols = getColumnsForPreset(presetId)
  const headers = cols.map(c => c.label)
  const columnKeys = cols.map(c => c.key)
  const colCount = cols.length
  const template = (PRESET_TEMPLATES[presetId] ?? {}) as GroupedTemplateDef

  const headerRows = Array.isArray(template.headerRows) && template.headerRows.length > 0
    ? template.headerRows
    : [headers]
  const groups = groupByContainer(items)
  const rows: Cell[][] = []

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const sectionIndex = gi + 1
    for (const templateRow of template.containerIntroRows ?? []) {
      const row = blankRow(colCount)
      templateRow.forEach((cell, idx) => {
        if (idx < colCount) row[idx] = resolveTemplateCell(cell, group, sectionIndex)
      })
      rows.push(row)
    }

    for (const item of group.items) {
      for (const templateRow of template.itemRows ?? []) {
        const row = blankRow(colCount)
        templateRow.forEach((cell, idx) => {
          if (idx < colCount) row[idx] = resolveTemplateCell(cell, group, sectionIndex, item)
        })
        rows.push(row)
      }
    }
  }

  if (presetId === 'mobile') {
    const mobileHeaderRows = headerRows.map((row, ri) => {
      const isPrimary = ri === headerRows.length - 1
      return [isPrimary ? '#' : '', ...row, isPrimary ? 'Tools' : '']
    })
    const mobileHeaders = mobileHeaderRows[mobileHeaderRows.length - 1]
    const mobileColumnKeys = ['rowNumber', ...columnKeys, 'tools']
    const mobileRows: Cell[][] = rows.map((row, idx) => [String(idx + 1), ...row, ''])
    return {
      headerRows: mobileHeaderRows,
      headers: mobileHeaders,
      columnKeys: mobileColumnKeys,
      rows: mobileRows,
      readOnly: true
    }
  }

  return {
    headerRows,
    headers,
    columnKeys,
    rows,
    readOnly: true
  }
}
