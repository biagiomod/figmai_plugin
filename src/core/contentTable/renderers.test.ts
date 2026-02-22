/**
 * renderers unit tests: universalTableToHtml, universalTableToTsv
 * Verifies clipboard export uses preset column extractors for all presets.
 * Run: npx tsx src/core/contentTable/renderers.test.ts
 */

import assert from 'node:assert'
import { universalTableToHtml, universalTableToTsv } from './renderers'
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
      adaStatus: '⏳ Pending',
      legalStatus: '⏳ Pending',
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
    console.log(`  ✓ ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
  }
}

console.log('renderers.test.ts')

// --- Content Only ---
test('content-only HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'My Content' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'content-only')
  assert.ok(html.includes('My Content'), 'Content value must appear in exported HTML')
})

test('content-only HTML export contains component name (Tag column)', () => {
  const item = makeItem({ component: { kind: 'instance', name: 'CardTitle' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'content-only')
  assert.ok(html.includes('CardTitle'), 'Tag/component name must appear in exported HTML')
})

test('content-only HTML export contains Figma Ref as View Element link', () => {
  const item = makeItem()
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'content-only')
  assert.ok(html.includes('View Element'), 'Figma Ref column must render as View Element link')
  assert.ok(html.includes('href='), 'Figma Ref column must have an href attribute')
})

test('content-only TSV export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'TSV Content' } })
  const table = makeTable([item])
  const tsv = universalTableToTsv(table, 'content-only')
  assert.ok(tsv.includes('TSV Content'), 'Content value must appear in TSV export')
})

// --- Universal ---
test('universal HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'Universal Hello' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'universal')
  assert.ok(html.includes('Universal Hello'), 'Content value must appear in universal HTML')
})

test('universal HTML export contains notes', () => {
  const item = makeItem({ notes: 'Review needed' })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'universal')
  assert.ok(html.includes('Review needed'), 'Notes must appear in universal HTML')
})

// --- Dev Only ---
test('dev-only HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'Dev Content' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'dev-only')
  assert.ok(html.includes('Dev Content'), 'Content value must appear in dev-only HTML')
})

test('dev-only HTML export contains field label', () => {
  const item = makeItem({ field: { label: 'Submit Button', path: 'Form > Submit', role: 'CTA' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'dev-only')
  assert.ok(html.includes('Submit Button'), 'Field label must appear in dev-only HTML')
})

// --- Content Model 1 ---
test('content-model-1 HTML export contains content value', () => {
  const item = makeItem({ content: { type: 'text', value: 'CM1 Content' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'content-model-1')
  assert.ok(html.includes('CM1 Content'), 'Content value must appear in CM1 HTML')
})

// --- itemsOverride ---
test('itemsOverride is used instead of table items', () => {
  const original = makeItem({ content: { type: 'text', value: 'ORIGINAL' } })
  const edited = makeItem({ content: { type: 'text', value: 'EDITED' } })
  const table = makeTable([original])
  const { html } = universalTableToHtml(table, 'content-only', [edited])
  assert.ok(html.includes('EDITED'), 'Override items must be used')
  assert.ok(!html.includes('ORIGINAL'), 'Original items must not appear when override is provided')
})

test('itemsOverride excludes deleted items', () => {
  const a = makeItem({ id: 'a', content: { type: 'text', value: 'Keep' } })
  const b = makeItem({ id: 'b', content: { type: 'text', value: 'Deleted' } })
  const table = makeTable([a, b])
  const { html } = universalTableToHtml(table, 'universal', [a])
  assert.ok(html.includes('Keep'), 'Non-deleted item must appear')
  assert.ok(!html.includes('Deleted'), 'Deleted item must not appear')
})

// --- HTML escaping ---
test('HTML special characters are escaped', () => {
  const item = makeItem({ content: { type: 'text', value: '<script>alert("xss")</script>' } })
  const table = makeTable([item])
  const { html } = universalTableToHtml(table, 'universal')
  assert.ok(!html.includes('<script>'), 'Script tags must be escaped')
  assert.ok(html.includes('&lt;script&gt;'), 'Script tags must be HTML-escaped')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
