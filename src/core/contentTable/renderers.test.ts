/**
 * renderers unit tests: universalTableToHtml, universalTableToTsv
 * Verifies clipboard export uses projected table for all presets.
 * Run: npx tsx src/core/contentTable/renderers.test.ts
 */

import assert from 'node:assert'
import { universalTableToHtml, universalTableToTsv } from './renderers'
import { projectContentTable } from './projection'
import type { ContentItemV1, UniversalContentTableV1 } from './types'

function makeItem(overrides: Partial<ContentItemV1> = {}): ContentItemV1 {
  return {
    id: 'item-1',
    nodeId: '123:456',
    nodeUrl: 'https://www.figma.com/file/abc/def?node-id=123:456',
    component: { kind: 'instance', name: 'Button' },
    field: { label: 'Label', path: 'Frame > Button', role: 'CTA' },
    content: { type: 'text', value: 'Hello World' },
    textLayerName: 'Button Label',
    meta: { visible: true, locked: false },
    notes: 'Some notes',
    contentKey: 'btn.label',
    jiraTicket: 'PROJ-123',
    ...overrides
  }
}

function makeTable(items: ContentItemV1[]): UniversalContentTableV1 {
  return {
    type: 'universal-content-table',
    version: 1,
    generatedAtISO: new Date().toISOString(),
    source: { pageId: 'p1', pageName: 'Page', selectionNodeId: 's1', selectionName: 'Sel' },
    meta: {
      contentModel: 'Universal',
      contentStage: 'Draft',
      adaStatus: '\u23f3 Pending',
      legalStatus: '\u23f3 Pending',
      lastUpdated: new Date().toISOString(),
      version: 'v1',
      rootNodeId: 'root1',
      rootNodeName: 'Root',
      rootNodeUrl: 'https://www.figma.com/file/abc/def'
    },
    items
  }
}

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  \u2713 ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  \u2717 ${name}`)
    console.error(`    ${err.message}`)
  }
}

console.log('renderers.test.ts')

// --- Content Only ---
test('content-only HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'My Content' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('My Content'), 'Content value must appear in exported HTML')
})

test('content-only HTML export contains component name (Tag column)', () => {
  const item = makeItem({ component: { kind: 'instance', name: 'CardTitle' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('CardTitle'), 'Tag/component name must appear in exported HTML')
})

test('content-only HTML export contains Figma Ref as View Element link', () => {
  const item = makeItem()
  const table = makeTable([item])
  const projected = projectContentTable('content-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('View Element'), 'Figma Ref column must render as View Element link')
  assert.ok(html.includes('href='), 'Figma Ref column must have an href attribute')
})

test('content-only TSV export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'TSV Content' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-only', [item])
  const tsv = universalTableToTsv(table, projected)
  assert.ok(tsv.includes('TSV Content'), 'Content value must appear in TSV export')
})

// --- Universal ---
test('universal HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'Universal Hello' } })
  const table = makeTable([item])
  const projected = projectContentTable('universal', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Universal Hello'), 'Content value must appear in universal HTML')
})

test('universal HTML export contains notes', () => {
  const item = makeItem({ notes: 'Review needed' })
  const table = makeTable([item])
  const projected = projectContentTable('universal', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Review needed'), 'Notes must appear in universal HTML')
})

// --- Dev Only ---
test('dev-only HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'Dev Content' } })
  const table = makeTable([item])
  const projected = projectContentTable('dev-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Dev Content'), 'Content value must appear in dev-only HTML')
})

test('dev-only HTML export contains field label', () => {
  const item = makeItem({ field: { label: 'Submit Button', path: 'Form > Submit', role: 'CTA' } })
  const table = makeTable([item])
  const projected = projectContentTable('dev-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Submit Button'), 'Field label must appear in dev-only HTML')
})

// --- Content Model 1 ---
test('content-model-1 HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'CM1 Content' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-model-1', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('CM1 Content'), 'Content value must appear in CM1 HTML')
})

// --- itemsOverride (now via projectContentTable) ---
test('projected items override table items', () => {
  const original = makeItem({ content: { type: 'text', value: 'ORIGINAL' } })
  const edited = makeItem({ content: { type: 'text', value: 'EDITED' } })
  const table = makeTable([original])
  const projected = projectContentTable('content-only', [edited])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('EDITED'), 'Override items must be used')
  assert.ok(!html.includes('ORIGINAL'), 'Original items must not appear when override is provided')
})

test('projected items exclude deleted items', () => {
  const a = makeItem({ id: 'a', content: { type: 'text', value: 'Keep' } })
  const b = makeItem({ id: 'b', content: { type: 'text', value: 'Deleted' } })
  const table = makeTable([a, b])
  const projected = projectContentTable('universal', [a])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Keep'), 'Non-deleted item must appear')
  assert.ok(!html.includes('Deleted'), 'Deleted item must not appear')
})

// --- HTML escaping ---
test('HTML special characters are escaped', () => {
  const item = makeItem({ content: { type: 'text', value: '<script>alert("xss")</script>' } })
  const table = makeTable([item])
  const projected = projectContentTable('universal', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(!html.includes('<script>'), 'Script tags must be escaped')
  assert.ok(html.includes('&lt;script&gt;'), 'Script tags must be HTML-escaped')
})

// --- Regression: dev-only nodeUrl column now gets link rendering ---
test('dev-only nodeUrl column renders as View Element link in HTML', () => {
  const item = makeItem({ nodeUrl: 'https://www.figma.com/file/test' })
  const table = makeTable([item])
  const projected = projectContentTable('dev-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('View Element'), 'dev-only nodeUrl must render as View Element link')
  assert.ok(html.includes('href="https://www.figma.com/file/test"'), 'dev-only nodeUrl must have correct href')
})

// --- Regression: ada-only nodeUrl column now gets link rendering ---
test('ada-only nodeUrl column renders as View Element link in HTML', () => {
  const item = makeItem({ nodeUrl: 'https://www.figma.com/file/ada-test' })
  const table = makeTable([item])
  const projected = projectContentTable('ada-only', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('View Element'), 'ada-only nodeUrl must render as View Element link')
  assert.ok(html.includes('href="https://www.figma.com/file/ada-test"'), 'ada-only nodeUrl must have correct href')
})

// --- TSV uses cellText for link cells ---
test('TSV export uses View in Figma text for link cells', () => {
  const item = makeItem()
  const table = makeTable([item])
  const projected = projectContentTable('universal', [item])
  const tsv = universalTableToTsv(table, projected)
  assert.ok(tsv.includes('View in Figma'), 'TSV must contain View in Figma text for link columns')
})

// --- Multi-row headers ---
test('CM1 HTML includes both header rows', () => {
  const item = makeItem({ field: { label: 'T', path: 'X / T' }, content: { type: 'text', value: 'CM1val' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-model-1', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(html.includes('Column 1'), 'CM1 HTML must include Column 1 header')
  assert.ok(html.includes('Column 9'), 'CM1 HTML must include Column 9 header')
  assert.ok(html.includes('Figma Ref'), 'CM1 HTML must include semantic Figma Ref header')
  assert.ok(html.includes('Notes/Jira'), 'CM1 HTML must include Notes/Jira header')
  assert.ok(html.includes('CM1val'), 'CM1 HTML must include content value')
})

test('CM1 TSV includes both header rows', () => {
  const item = makeItem({ field: { label: 'T', path: 'X / T' }, content: { type: 'text', value: 'TSVval' } })
  const table = makeTable([item])
  const projected = projectContentTable('content-model-1', [item])
  const tsv = universalTableToTsv(table, projected)
  const lines = tsv.split('\n')
  assert.ok(lines.length >= 3, 'TSV must have at least 3 lines (2 headers + data)')
  assert.ok(lines[0].includes('Column 1'), 'TSV first line must include Column 1')
  assert.ok(lines[1].includes('Figma Ref'), 'TSV second line must include Figma Ref')
})

test('universal HTML has single header row (no Column N)', () => {
  const item = makeItem()
  const table = makeTable([item])
  const projected = projectContentTable('universal', [item])
  const { html } = universalTableToHtml(table, projected)
  assert.ok(!html.includes('Column 1'), 'Universal HTML must NOT include Column 1 label')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
