/**
 * projection.test.ts — unit tests for projectContentTable
 * Run: npx tsx src/core/contentTable/projection.test.ts
 */

import assert from 'node:assert'
import { projectContentTable, cellText, cellHref } from './projection'
import type { ContentItemV1 } from './types'
import { PRESET_COLUMNS } from './presets.generated'

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

console.log('projection.test.ts')

test('universal headers match PRESET_COLUMNS', () => {
  const p = projectContentTable('universal', [makeItem()])
  const expected = PRESET_COLUMNS['universal'].map(c => c.label)
  assert.deepStrictEqual(p.headers, expected)
})

test('universal columnKeys match PRESET_COLUMNS', () => {
  const p = projectContentTable('universal', [makeItem()])
  const expected = PRESET_COLUMNS['universal'].map(c => c.key)
  assert.deepStrictEqual(p.columnKeys, expected)
})

test('row count equals items count', () => {
  const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })]
  const p = projectContentTable('universal', items)
  assert.strictEqual(p.rows.length, 2)
})

test('empty items returns empty rows', () => {
  const p = projectContentTable('universal', [])
  assert.strictEqual(p.rows.length, 0)
  assert.ok(p.headers.length > 0, 'headers should still be present')
})

test('figmaRef column produces rich cell with href', () => {
  const item = makeItem({ nodeUrl: 'https://www.figma.com/file/x' })
  const p = projectContentTable('universal', [item])
  const refIdx = p.columnKeys.indexOf('figmaRef')
  assert.ok(refIdx >= 0, 'figmaRef column must exist in universal')
  const cell = p.rows[0][refIdx]
  assert.strictEqual(cellHref(cell), 'https://www.figma.com/file/x')
  assert.strictEqual(cellText(cell), 'View in Figma')
})

test('nodeUrl key (dev-only) produces rich cell with href', () => {
  const item = makeItem({ nodeUrl: 'https://www.figma.com/file/y' })
  const p = projectContentTable('dev-only', [item])
  const refIdx = p.columnKeys.indexOf('nodeUrl')
  assert.ok(refIdx >= 0, 'nodeUrl column must exist in dev-only')
  const cell = p.rows[0][refIdx]
  assert.strictEqual(cellHref(cell), 'https://www.figma.com/file/y')
  assert.strictEqual(cellText(cell), 'View in Figma')
})

test('empty nodeUrl produces plain string cell', () => {
  const item = makeItem({ nodeUrl: '' })
  const p = projectContentTable('universal', [item])
  const refIdx = p.columnKeys.indexOf('figmaRef')
  const cell = p.rows[0][refIdx]
  assert.strictEqual(typeof cell, 'string', 'empty URL should produce plain string')
  assert.strictEqual(cellHref(cell), undefined)
})

test('non-link columns produce plain string cells', () => {
  const item = makeItem({ content: { type: 'text', value: 'Test Value' } })
  const p = projectContentTable('universal', [item])
  const contentIdx = p.columnKeys.indexOf('content')
  const cell = p.rows[0][contentIdx]
  assert.strictEqual(typeof cell, 'string')
  assert.strictEqual(cell, 'Test Value')
})

test('content-only grouped preset emits intro row + item row', () => {
  const item = makeItem({
    field: { label: 'Title', path: 'Container A / Title', role: 'Headline' },
    content: { type: 'text', value: 'CO Test' }
  })
  const p = projectContentTable('content-only', [item])
  assert.strictEqual(p.rows.length, 2, 'content-only grouped preset should emit 2 rows for one item')
  const introRow = p.rows[0]
  const itemRow = p.rows[1]
  assert.strictEqual(cellText(introRow[0]), 'View in Figma', 'intro row col1 must be View in Figma')
  assert.ok(cellHref(introRow[0]) !== undefined, 'intro row col1 must include href')
  assert.strictEqual(cellText(introRow[3]), 'Content Only', 'intro row col4 must be static Content Only')
  for (let i = 0; i < introRow.length; i++) {
    if (i !== 0 && i !== 3) assert.strictEqual(cellText(introRow[i]), '', `intro row col ${i} should be blank`)
  }
  assert.strictEqual(cellText(itemRow[6]), 'CO Test', 'item row col7 must contain content value')
  for (let i = 0; i < itemRow.length; i++) {
    if (i !== 6) assert.strictEqual(cellText(itemRow[i]), '', `item row col ${i} should be blank`)
  }
})

test('mobile grouped preset emits section row, link+suffix row, and item row', () => {
  const item = makeItem({
    id: 'm1',
    nodeUrl: 'https://www.figma.com/file/mobile?node-id=1',
    field: { label: 'Title', path: 'Mobile Screen / Title', role: 'Header' },
    content: { type: 'text', value: 'Welcome screen title' }
  })
  const p = projectContentTable('mobile', [item])
  assert.strictEqual(p.readOnly, true, 'mobile should be grouped/read-only')
  assert.strictEqual(p.headerRows.length, 1, 'mobile should have one header row')
  assert.strictEqual(p.columnKeys[0], 'rowNumber', 'mobile should prepend rowNumber column')
  assert.strictEqual(p.columnKeys[p.columnKeys.length - 1], 'tools', 'mobile should append tools column')
  assert.strictEqual(p.headers[0], '#', 'mobile primary header should start with #')
  assert.strictEqual(p.headers[p.headers.length - 1], 'Tools', 'mobile primary header should end with Tools')
  assert.strictEqual(p.rows.length, 3, 'mobile should emit 2 intro rows + 1 item row for one item')

  const sectionRow = p.rows[0]
  const linkRow = p.rows[1]
  const itemRow = p.rows[2]

  assert.strictEqual(cellText(sectionRow[0]), '1')
  assert.strictEqual(cellText(sectionRow[1]), 'Section 1: [User will add]')
  for (let i = 2; i < sectionRow.length - 1; i++) {
    assert.strictEqual(cellText(sectionRow[i]), '', `section row col ${i} should be blank`)
  }
  assert.strictEqual(cellText(sectionRow[sectionRow.length - 1]), '', 'section row tools cell should be blank')

  assert.strictEqual(cellText(linkRow[0]), '2')
  assert.strictEqual(cellHref(linkRow[1]), 'https://www.figma.com/file/mobile?node-id=1')
  assert.strictEqual(cellText(linkRow[1]), 'View in Figma\nPlace Image Here')
  for (let i = 2; i < linkRow.length - 1; i++) {
    assert.strictEqual(cellText(linkRow[i]), '', `link row col ${i} should be blank`)
  }
  assert.strictEqual(cellText(linkRow[linkRow.length - 1]), '', 'link row tools cell should be blank')

  assert.strictEqual(cellText(itemRow[0]), '3')
  assert.strictEqual(cellText(itemRow[3]), 'Welcome screen title', 'only UI label English column should be populated')
  for (let i = 0; i < itemRow.length; i++) {
    if (i !== 0 && i !== 3) assert.strictEqual(cellText(itemRow[i]), '', `item row col ${i} should be blank`)
  }
})

test('mobile sectionIndex token increments per container group', () => {
  const items = [
    makeItem({ id: 'm1', field: { label: 'A', path: 'Screen A / Title' }, nodeUrl: 'https://figma.com/a', content: { type: 'text', value: 'A title' } }),
    makeItem({ id: 'm2', field: { label: 'B', path: 'Screen B / Title' }, nodeUrl: 'https://figma.com/b', content: { type: 'text', value: 'B title' } })
  ]
  const p = projectContentTable('mobile', items)
  assert.strictEqual(cellText(p.rows[0][1]), 'Section 1: [User will add]')
  assert.strictEqual(cellText(p.rows[3][1]), 'Section 2: [User will add]')
})

test('fallback to universal for disabled preset', () => {
  const item = makeItem()
  const p = projectContentTable('content-model-3', [item])
  const expected = PRESET_COLUMNS['universal'].map(c => c.label)
  assert.deepStrictEqual(p.headers, expected, 'disabled preset should fall back to universal')
})

test('cellText helper extracts text from string cell', () => {
  assert.strictEqual(cellText('hello'), 'hello')
})

test('cellText helper extracts text from rich cell', () => {
  assert.strictEqual(cellText({ text: 'View', href: 'http://x' }), 'View')
})

test('cellText helper appends suffix for rich cell', () => {
  assert.strictEqual(cellText({ text: 'View', href: 'http://x', suffix: '\nPlace Image Here' }), 'View\nPlace Image Here')
})

test('cellHref helper returns undefined for string cell', () => {
  assert.strictEqual(cellHref('hello'), undefined)
})

test('cellHref helper returns href from rich cell', () => {
  assert.strictEqual(cellHref({ text: 'View', href: 'http://x' }), 'http://x')
})

// ---------------------------------------------------------------------------
// CM1 KV projection tests
// ---------------------------------------------------------------------------

test('CM1 uses KV projection (not items mode)', () => {
  const item = makeItem({ field: { label: 'Heading', path: 'Card / Heading', role: 'Headline' } })
  const p = projectContentTable('content-model-1', [item])
  // KV mode: 1 item → 1 container block = header(1) + title(1) + key(1) + value(1) = 4 rows
  assert.strictEqual(p.rows.length, 4, 'CM1 should expand 1 item into 4 rows')
})

test('CM1 headers match preset columns', () => {
  const p = projectContentTable('content-model-1', [makeItem()])
  const expected = PRESET_COLUMNS['content-model-1'].map(c => c.label)
  assert.deepStrictEqual(p.headers, expected)
})

test('CM1 columnKeys match preset columns', () => {
  const p = projectContentTable('content-model-1', [makeItem()])
  const expected = PRESET_COLUMNS['content-model-1'].map(c => c.key)
  assert.deepStrictEqual(p.columnKeys, expected)
})

test('CM1 block header row has link + ContentList + id', () => {
  const item = makeItem({
    nodeUrl: 'https://www.figma.com/file/abc',
    field: { label: 'Title', path: 'MyCard / Title' }
  })
  const p = projectContentTable('content-model-1', [item])
  const row0 = p.rows[0]
  // Col0: Figma Ref → rich link
  assert.strictEqual(cellHref(row0[0]), 'https://www.figma.com/file/abc')
  assert.strictEqual(cellText(row0[0]), 'View in Figma')
  // Col3: Model = "ContentList"
  assert.strictEqual(cellText(row0[3]), 'ContentList')
  // Col4: Metadata Key = "id"
  assert.strictEqual(cellText(row0[4]), 'id')
  // Cols 1,2,5,6,7,8 blank
  assert.strictEqual(cellText(row0[1]), '')
  assert.strictEqual(cellText(row0[2]), '')
  assert.strictEqual(cellText(row0[5]), '')
  assert.strictEqual(cellText(row0[6]), '')
  assert.strictEqual(cellText(row0[7]), '')
  assert.strictEqual(cellText(row0[8]), '')
})

test('CM1 title row has "title" in Content Key column', () => {
  const item = makeItem({ field: { label: 'Txt', path: 'Box / Txt' } })
  const p = projectContentTable('content-model-1', [item])
  const row1 = p.rows[1]
  assert.strictEqual(cellText(row1[5]), 'title')
  // All other cols blank
  for (let i = 0; i < row1.length; i++) {
    if (i !== 5) assert.strictEqual(cellText(row1[i]), '', `col ${i} should be blank on title row`)
  }
})

test('CM1 key row has "key" in Metadata Key column', () => {
  const item = makeItem({ field: { label: 'Txt', path: 'Box / Txt' } })
  const p = projectContentTable('content-model-1', [item])
  const row2 = p.rows[2]
  assert.strictEqual(cellText(row2[4]), 'key')
  for (let i = 0; i < row2.length; i++) {
    if (i !== 4) assert.strictEqual(cellText(row2[i]), '', `col ${i} should be blank on key row`)
  }
})

test('CM1 value row has "value" + content text', () => {
  const item = makeItem({
    field: { label: 'Txt', path: 'Box / Txt' },
    content: { type: 'text', value: 'Welcome to Funville!' }
  })
  const p = projectContentTable('content-model-1', [item])
  const row3 = p.rows[3]
  assert.strictEqual(cellText(row3[5]), 'value')
  assert.strictEqual(cellText(row3[6]), 'Welcome to Funville!')
  for (let i = 0; i < row3.length; i++) {
    if (i !== 5 && i !== 6) assert.strictEqual(cellText(row3[i]), '', `col ${i} should be blank on value row`)
  }
})

test('CM1 two containers with 2 items each produce correct row count', () => {
  const items = [
    makeItem({ id: 'a1', field: { label: 'H1', path: 'CardA / H1' }, content: { type: 'text', value: 'Alpha' }, nodeUrl: 'https://fig.com/a1' }),
    makeItem({ id: 'a2', field: { label: 'B1', path: 'CardA / B1' }, content: { type: 'text', value: 'Beta' }, nodeUrl: 'https://fig.com/a2' }),
    makeItem({ id: 'b1', field: { label: 'H2', path: 'CardB / H2' }, content: { type: 'text', value: 'Gamma' }, nodeUrl: 'https://fig.com/b1' }),
    makeItem({ id: 'b2', field: { label: 'B2', path: 'CardB / B2' }, content: { type: 'text', value: 'Delta' }, nodeUrl: 'https://fig.com/b2' })
  ]
  const p = projectContentTable('content-model-1', items)
  // Container A: header(1) + title(1) + 2*(key+value) = 6
  // Container B: header(1) + title(1) + 2*(key+value) = 6
  // Total: 12
  assert.strictEqual(p.rows.length, 12)
})

test('CM1 two containers have correct block header links', () => {
  const items = [
    makeItem({ id: 'a1', field: { label: 'H1', path: 'CardA / H1' }, nodeUrl: 'https://fig.com/a1' }),
    makeItem({ id: 'b1', field: { label: 'H2', path: 'CardB / H2' }, nodeUrl: 'https://fig.com/b1' })
  ]
  const p = projectContentTable('content-model-1', items)
  // First block header at row 0
  assert.strictEqual(cellHref(p.rows[0][0]), 'https://fig.com/a1')
  // Second block header at row 4 (header+title+key+value = 4 rows for first block)
  assert.strictEqual(cellHref(p.rows[4][0]), 'https://fig.com/b1')
})

test('CM1 content values appear in correct rows', () => {
  const items = [
    makeItem({ id: 'a1', field: { label: 'H1', path: 'CardA / H1' }, content: { type: 'text', value: 'First' } }),
    makeItem({ id: 'a2', field: { label: 'B1', path: 'CardA / B1' }, content: { type: 'text', value: 'Second' } })
  ]
  const p = projectContentTable('content-model-1', items)
  // Row 0: header, Row 1: title, Row 2: key, Row 3: value(First), Row 4: key, Row 5: value(Second)
  assert.strictEqual(cellText(p.rows[3][6]), 'First')
  assert.strictEqual(cellText(p.rows[5][6]), 'Second')
})

test('CM1 empty items produce empty rows', () => {
  const p = projectContentTable('content-model-1', [])
  assert.strictEqual(p.rows.length, 0)
  assert.ok(p.headers.length > 0, 'headers should still be present')
})

test('CM1 item with no path uses item.id as container key', () => {
  const item = makeItem({ id: 'orphan-1', field: { label: 'Solo', path: '' } })
  const p = projectContentTable('content-model-1', [item])
  // Should still produce 4 rows (1 container block with 1 item)
  assert.strictEqual(p.rows.length, 4)
})

test('CM1 item with empty nodeUrl produces no href on header row', () => {
  const item = makeItem({ nodeUrl: '', field: { label: 'Txt', path: 'Box / Txt' } })
  const p = projectContentTable('content-model-1', [item])
  assert.strictEqual(cellHref(p.rows[0][0]), undefined, 'empty URL should not produce href')
})

// ---------------------------------------------------------------------------
// headerRows + readOnly tests
// ---------------------------------------------------------------------------

test('universal headerRows has 1 row matching headers', () => {
  const p = projectContentTable('universal', [makeItem()])
  assert.strictEqual(p.headerRows.length, 1)
  assert.deepStrictEqual(p.headerRows[0], p.headers)
})

test('universal readOnly is false', () => {
  const p = projectContentTable('universal', [makeItem()])
  assert.strictEqual(p.readOnly, false)
})

test('content-only headerRows has 2 rows', () => {
  const p = projectContentTable('content-only', [makeItem()])
  assert.strictEqual(p.headerRows.length, 2)
  const expectedTop = Array.from({ length: 9 }, (_, i) => `Column ${i + 1}`)
  assert.deepStrictEqual(p.headerRows[0], expectedTop)
})

test('content-only grouped rows are always 9 columns', () => {
  const items = [
    makeItem({ id: 'a1', field: { label: 'A1', path: 'Container A / A1' }, content: { type: 'text', value: 'Alpha' } }),
    makeItem({ id: 'a2', field: { label: 'A2', path: 'Container A / A2' }, content: { type: 'text', value: 'Beta' } }),
    makeItem({ id: 'b1', field: { label: 'B1', path: 'Container B / B1' }, content: { type: 'text', value: 'Gamma' } })
  ]
  const p = projectContentTable('content-only', items)
  p.rows.forEach((row, idx) => {
    assert.strictEqual(row.length, 9, `content-only row ${idx} must have 9 columns`)
  })
})

test('simple-worksheet remains simple 2-column preset', () => {
  const p = projectContentTable('simple-worksheet', [makeItem({ content: { type: 'text', value: 'Simple' } })])
  assert.strictEqual(p.headerRows.length, 1, 'simple-worksheet must have one header row')
  assert.strictEqual(p.columnKeys.length, 2, 'simple-worksheet must have 2 columns')
  assert.deepStrictEqual(p.columnKeys, ['figmaRef', 'content'])
})

test('CM1 headerRows has 2 rows', () => {
  const p = projectContentTable('content-model-1', [makeItem({ field: { label: 'T', path: 'X / T' } })])
  assert.strictEqual(p.headerRows.length, 2)
})

test('CM1 headerRows first row is Column 1..Column 9', () => {
  const p = projectContentTable('content-model-1', [makeItem({ field: { label: 'T', path: 'X / T' } })])
  const expected = Array.from({ length: 9 }, (_, i) => `Column ${i + 1}`)
  assert.deepStrictEqual(p.headerRows[0], expected)
})

test('CM1 headerRows second row matches preset labels', () => {
  const p = projectContentTable('content-model-1', [makeItem({ field: { label: 'T', path: 'X / T' } })])
  const expected = PRESET_COLUMNS['content-model-1'].map(c => c.label)
  assert.deepStrictEqual(p.headerRows[1], expected)
})

test('CM1 readOnly is true', () => {
  const p = projectContentTable('content-model-1', [makeItem({ field: { label: 'T', path: 'X / T' } })])
  assert.strictEqual(p.readOnly, true)
})

test('preset switching does not mutate SSOT items', () => {
  const items = [
    makeItem({ id: 's1', field: { label: 'H1', path: 'CardA / H1' }, content: { type: 'text', value: 'A' } }),
    makeItem({ id: 's2', field: { label: 'H2', path: 'CardB / H2' }, content: { type: 'text', value: 'B' } })
  ]
  const before = JSON.parse(JSON.stringify(items))
  projectContentTable('universal', items)
  projectContentTable('content-model-1', items)
  assert.deepStrictEqual(items, before)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
