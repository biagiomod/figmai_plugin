/**
 * Duplicate detection module tests.
 *
 * Tests normalizeForDedup, classifyCandidates, filterByDuplicates,
 * and session-level integration (appendItems with dedup, deleted rows).
 */

import { normalizeForDedup, classifyCandidates, filterByDuplicates } from '../src/core/contentTable/duplicates'
import { createSession, getEffectiveItems, appendItems, deleteItem, toggleDuplicateScan } from '../src/core/contentTable/session'
import type { ContentItemV1, UniversalContentTableV1 } from '../src/core/contentTable/types'

function makeItem(id: string, value: string, overrides?: Partial<ContentItemV1>): ContentItemV1 {
  return {
    id,
    nodeId: id,
    nodeUrl: '',
    component: { kind: 'custom', name: 'Test' },
    field: { label: 'field', path: 'path' },
    content: { type: 'text', value },
    meta: { visible: true, locked: false },
    ...overrides
  }
}

function makeTable(items: ContentItemV1[]): UniversalContentTableV1 {
  return {
    type: 'universal-content-table',
    version: 1,
    generatedAtISO: new Date().toISOString(),
    source: { pageId: 'p1', pageName: 'Page', selectionNodeId: 's1', selectionName: 'Selection' },
    meta: { contentModel: 'Universal v2', contentStage: 'Draft', adaStatus: '⏳ Pending', legalStatus: '⏳ Pending', lastUpdated: '', version: 'v1', rootNodeId: 's1', rootNodeName: 'Selection', rootNodeUrl: '' },
    items
  }
}

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${label}`)
  }
}

// --- normalizeForDedup ---

assert(normalizeForDedup('  Hello World  ') === 'hello world', 'normalizeForDedup trims and lowercases')
assert(normalizeForDedup('foo  bar\t\nbaz') === 'foo bar baz', 'normalizeForDedup collapses whitespace')
assert(normalizeForDedup('') === '', 'normalizeForDedup empty string')
assert(normalizeForDedup('A') === 'a', 'normalizeForDedup single char')

// --- classifyCandidates: exact match long text => HIGH ---

const existingLong = [makeItem('e1', 'This is a long duplicate text that should be HIGH confidence')]
const candidateLong = [makeItem('c1', 'This is a long duplicate text that should be HIGH confidence')]
const longResults = classifyCandidates(candidateLong, existingLong)
assert(longResults.length === 1, 'classifyCandidates returns one result')
assert(longResults[0].confidence === 'HIGH', 'exact match long text => HIGH')
assert(longResults[0].matchedExistingId === 'e1', 'matchedExistingId set for long match')

// --- classifyCandidates: exact match short text => MED ---

const existingShort = [makeItem('e2', 'Submit')]
const candidateShort = [makeItem('c2', 'Submit')]
const shortResults = classifyCandidates(candidateShort, existingShort)
assert(shortResults[0].confidence === 'MED', 'exact match short text (< 12 chars) => MED')

// --- classifyCandidates: boundary at 12 chars ---

const existing11 = [makeItem('e3', '12345678901')]
const candidate11 = [makeItem('c3', '12345678901')]
const result11 = classifyCandidates(candidate11, existing11)
assert(result11[0].confidence === 'MED', '11 chars => MED')

const existing12 = [makeItem('e4', '123456789012')]
const candidate12 = [makeItem('c4', '123456789012')]
const result12 = classifyCandidates(candidate12, existing12)
assert(result12[0].confidence === 'HIGH', '12 chars => HIGH')

// --- classifyCandidates: unique => NONE ---

const existingUniq = [makeItem('e5', 'Existing text')]
const candidateUniq = [makeItem('c5', 'Completely different')]
const uniqResults = classifyCandidates(candidateUniq, existingUniq)
assert(uniqResults[0].confidence === 'NONE', 'unique text => NONE')

// --- classifyCandidates: within-batch dedup => MED ---

const batchCandidates = [
  makeItem('b1', 'Same text in batch with enough length'),
  makeItem('b2', 'Same text in batch with enough length')
]
const batchResults = classifyCandidates(batchCandidates, [])
assert(batchResults[0].confidence === 'NONE', 'first in batch => NONE')
assert(batchResults[1].confidence === 'MED', 'second in batch => MED (within-batch)')

// --- classifyCandidates: empty content => NONE ---

const candidateEmpty = [makeItem('ce', '')]
const emptyResults = classifyCandidates(candidateEmpty, existingLong)
assert(emptyResults[0].confidence === 'NONE', 'empty content => NONE')

// --- classifyCandidates: whitespace normalization matches ---

const existingWs = [makeItem('ews', 'Hello    World')]
const candidateWs = [makeItem('cws', '  hello   world  ')]
const wsResults = classifyCandidates(candidateWs, existingWs)
assert(wsResults[0].confidence === 'MED', 'whitespace-normalized match => MED ("hello world" is 11 chars)')

// --- filterByDuplicates ---

const mixedResults = [
  { item: makeItem('h1', 'long text that is definitely a dup'), confidence: 'HIGH' as const },
  { item: makeItem('m1', 'short'), confidence: 'MED' as const },
  { item: makeItem('n1', 'unique text here'), confidence: 'NONE' as const }
]
const { items: filtered, flaggedIds, skippedCount } = filterByDuplicates(mixedResults)
assert(filtered.length === 2, 'filterByDuplicates removes HIGH')
assert(skippedCount === 1, 'filterByDuplicates counts 1 skipped')
assert(flaggedIds.has('m1'), 'filterByDuplicates flags MED')
assert(!flaggedIds.has('n1'), 'filterByDuplicates does not flag NONE')
assert(!flaggedIds.has('h1'), 'filterByDuplicates does not flag HIGH (skipped)')

// --- Session: disabled toggle => no skipping/flagging ---

const table1 = makeTable([makeItem('i1', 'Existing long text value')])
const session1 = createSession(table1)
const disabledSession = toggleDuplicateScan(session1, false)
const newItems = [makeItem('i2', 'Existing long text value')]
const appendedDisabled = appendItems(disabledSession, newItems)
const effectiveDisabled = getEffectiveItems(appendedDisabled)
assert(effectiveDisabled.length === 2, 'disabled scan: both items present (no skipping)')
assert(appendedDisabled.flaggedDuplicateIds.size === 0, 'disabled scan: no flagged IDs')

// --- Session: Generate with dedup (within-batch) ---

const batchTable = makeTable([
  makeItem('g1', 'Unique item for generation test'),
  makeItem('g2', 'Unique item for generation test')
])
const dupResults2 = classifyCandidates(batchTable.items, [])
const { items: genFiltered, flaggedIds: genFlags, skippedCount: genSkipped } = filterByDuplicates(dupResults2)
assert(genFiltered.length === 2, 'generate: both items kept (within-batch is MED, not skipped)')
assert(genFlags.has('g2'), 'generate: second item flagged as within-batch MED')
assert(genSkipped === 0, 'generate: 0 skipped (MED not skipped)')

// --- Session: Add appends and flags MED ---

const baseTable = makeTable([makeItem('a1', 'Short')])
const sessionForAdd = createSession(baseTable)
const enabledSession = toggleDuplicateScan(sessionForAdd, true)
const addCandidates = [makeItem('a2', 'Short'), makeItem('a3', 'Brand new long enough text')]
const existingEffective = getEffectiveItems(enabledSession)
const addResults = classifyCandidates(addCandidates, existingEffective)
const { items: addFiltered, flaggedIds: addFlags } = filterByDuplicates(addResults)
const afterAdd = appendItems(enabledSession, addFiltered, { flaggedDuplicateIds: addFlags })
const effectiveAfterAdd = getEffectiveItems(afterAdd)
assert(effectiveAfterAdd.length === 3, 'add: all items present (SHORT dup is MED, not skipped)')
assert(afterAdd.flaggedDuplicateIds.has('a2'), 'add: short dup flagged')
assert(!afterAdd.flaggedDuplicateIds.has('a3'), 'add: unique not flagged')

// --- Session: Add skips HIGH ---

const baseTable2 = makeTable([makeItem('h1', 'This is definitely long enough to be a HIGH confidence duplicate')])
const sessionH = toggleDuplicateScan(createSession(baseTable2), true)
const highCandidates = [makeItem('h2', 'This is definitely long enough to be a HIGH confidence duplicate')]
const existH = getEffectiveItems(sessionH)
const highResults = classifyCandidates(highCandidates, existH)
const { items: highFiltered, skippedCount: highSkipped } = filterByDuplicates(highResults)
const afterHigh = appendItems(sessionH, highFiltered, { skippedCount: highSkipped })
const effectiveH = getEffectiveItems(afterHigh)
assert(effectiveH.length === 1, 'add: HIGH dup skipped, only original remains')
assert(afterHigh.lastSkippedCount === 1, 'add: lastSkippedCount = 1')

// --- Session: Deleted rows do not count as existing duplicates ---

const baseTable3 = makeTable([makeItem('d1', 'Item that will be deleted and is long enough')])
const sessionD = toggleDuplicateScan(createSession(baseTable3), true)
const afterDelete = deleteItem(sessionD, 'd1')
const delEffective = getEffectiveItems(afterDelete)
assert(delEffective.length === 0, 'deleted item removed from effective')
const delCandidates = [makeItem('d2', 'Item that will be deleted and is long enough')]
const delResults = classifyCandidates(delCandidates, delEffective)
assert(delResults[0].confidence === 'NONE', 'deleted row not considered duplicate')

// --- Report ---

console.log(`\n[duplicates.test] ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
