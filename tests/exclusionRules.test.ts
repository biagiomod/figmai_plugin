/**
 * Exclusion rules tests — numeric/currency handling + pattern rules.
 */

import {
  type ExclusionRule,
  isStandaloneNumeric,
  isStandaloneCurrency,
  variableizeNumerics,
  applyExclusionRules,
  normalizeLegacyRuleToNewRule,
  resolveExclusionConfigWithSource
} from '../src/core/contentTable/exclusionRules'
import type { ContentItemV1 } from '../src/core/contentTable/types'

function makeItem(id: string, value: string): ContentItemV1 {
  return {
    id,
    nodeId: id,
    nodeUrl: '',
    component: { kind: 'custom', name: 'Test' },
    field: { label: 'field', path: 'path' },
    content: { type: 'text', value },
    meta: { visible: true, locked: false }
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

// --- isStandaloneNumeric ---

assert(isStandaloneNumeric('25') === true, 'isStandaloneNumeric: "25"')
assert(isStandaloneNumeric('3.45') === true, 'isStandaloneNumeric: "3.45"')
assert(isStandaloneNumeric('1,234') === true, 'isStandaloneNumeric: "1,234"')
assert(isStandaloneNumeric('1,234.56') === true, 'isStandaloneNumeric: "1,234.56"')
assert(isStandaloneNumeric('+42') === true, 'isStandaloneNumeric: "+42"')
assert(isStandaloneNumeric('-7.5') === true, 'isStandaloneNumeric: "-7.5"')
assert(isStandaloneNumeric('  25  ') === true, 'isStandaloneNumeric: whitespace trimmed')
assert(isStandaloneNumeric('25 MPG') === false, 'isStandaloneNumeric: mixed text')
assert(isStandaloneNumeric('') === false, 'isStandaloneNumeric: empty')
assert(isStandaloneNumeric('abc') === false, 'isStandaloneNumeric: letters only')

// --- isStandaloneCurrency ---

assert(isStandaloneCurrency('$3.45') === true, 'isStandaloneCurrency: "$3.45"')
assert(isStandaloneCurrency('€100') === true, 'isStandaloneCurrency: "€100"')
assert(isStandaloneCurrency('£1,234.56') === true, 'isStandaloneCurrency: "£1,234.56"')
assert(isStandaloneCurrency('¥500') === true, 'isStandaloneCurrency: "¥500"')
assert(isStandaloneCurrency('₹999') === true, 'isStandaloneCurrency: "₹999"')
assert(isStandaloneCurrency('$3.45 earned') === false, 'isStandaloneCurrency: mixed with letters')
assert(isStandaloneCurrency('25') === true, 'isStandaloneCurrency: plain number also matches')
assert(isStandaloneCurrency('') === false, 'isStandaloneCurrency: empty')

// --- variableizeNumerics ---

assert(variableizeNumerics("You've earned: $4.50") === "You've earned: {variable}", 'variableize: currency in sentence')
assert(variableizeNumerics('Due in 500 miles') === 'Due in {variable} miles', 'variableize: number in sentence')
assert(variableizeNumerics('25 MPG (Last 30 days)') === '{variable} MPG (Last {variable} days)', 'variableize: multiple numbers')
assert(variableizeNumerics('$1,234.56 balance remaining') === '{variable} balance remaining', 'variableize: formatted currency')
assert(variableizeNumerics('No numbers here') === 'No numbers here', 'variableize: no numbers => unchanged')
assert(variableizeNumerics('25') === '25', 'variableize: standalone number => unchanged (no letters)')
assert(variableizeNumerics('$3.45') === '$3.45', 'variableize: standalone currency => unchanged (no letters)')
assert(variableizeNumerics('') === '', 'variableize: empty => unchanged')

// --- applyExclusionRules: disabled config => NO-OP ---

const disabledItems = [makeItem('d1', '25'), makeItem('d2', '$3.45'), makeItem('d3', 'Hello')]
const disabledResult = applyExclusionRules(disabledItems, { enabled: false, rules: [] })
assert(disabledResult.items.length === 3, 'disabled config: all items pass through')
assert(disabledResult.flaggedIds.size === 0, 'disabled config: no flags')

// --- applyExclusionRules: enabled, standalone numeric excluded ---

const enabledItems = [
  makeItem('n1', '25'),
  makeItem('n2', '$3.45'),
  makeItem('n3', 'Hello world'),
  makeItem('n4', "You've earned: $4.50"),
  makeItem('n5', 'Due in 500 miles'),
  makeItem('n6', '1,234')
]
const enabledResult = applyExclusionRules(enabledItems, { enabled: true, rules: [] })

assert(enabledResult.items.length === 3, 'enabled: 3 items survive (3 standalone excluded)')
assert(!enabledResult.items.find(i => i.id === 'n1'), 'enabled: "25" excluded')
assert(!enabledResult.items.find(i => i.id === 'n2'), 'enabled: "$3.45" excluded')
assert(!enabledResult.items.find(i => i.id === 'n6'), 'enabled: "1,234" excluded')

const hello = enabledResult.items.find(i => i.id === 'n3')
assert(hello !== undefined && hello.content.value === 'Hello world', 'enabled: plain text unchanged')

const earned = enabledResult.items.find(i => i.id === 'n4')
assert(earned !== undefined && earned.content.value === "You've earned: {variable}", 'enabled: currency in sentence variableized')

const due = enabledResult.items.find(i => i.id === 'n5')
assert(due !== undefined && due.content.value === 'Due in {variable} miles', 'enabled: number in sentence variableized')

// --- new rules: exclude vs flag ---

const actionRules: ExclusionRule[] = [
  {
    name: 'Exclude dash',
    enabled: true,
    note: '',
    matchTarget: 'content',
    matchType: 'exact',
    pattern: '—',
    action: 'exclude',
    confidence: 'high'
  },
  {
    name: 'Flag ticker',
    enabled: true,
    note: '',
    matchTarget: 'content',
    matchType: 'regex',
    pattern: '^[A-Z]{2,5}$',
    action: 'flag',
    confidence: 'low'
  }
]
const actionItems = [makeItem('a1', '—'), makeItem('a2', 'AAPL'), makeItem('a3', 'Normal copy')]
const actionResult = applyExclusionRules(actionItems, { enabled: true, rules: actionRules })
assert(actionResult.items.length === 2, 'exclude action removes matching item')
assert(actionResult.flaggedIds.has('a2'), 'flag action marks matching item')
assert(actionResult.matchedRuleByItemId.a2 === 'Flag ticker', 'matched rule name tracked for flagged row')

// --- placeholder dash variants ---

const dashRule: ExclusionRule = {
  name: 'Empty placeholder dashes',
  enabled: true,
  note: '',
  matchTarget: 'content',
  matchType: 'regex',
  pattern: '^[\\s\\-–—]{2,}$',
  action: 'exclude',
  confidence: 'high'
}
const emDashRule: ExclusionRule = {
  name: 'Em dash filler',
  enabled: true,
  note: '',
  matchTarget: 'content',
  matchType: 'exact',
  pattern: '—',
  action: 'exclude',
  confidence: 'high'
}
const dashItems = [makeItem('dsh1', '--'), makeItem('dsh2', '—'), makeItem('dsh3', '––'), makeItem('dsh4', ' - - '), makeItem('dsh5', 'Real text')]
const dashResult = applyExclusionRules(dashItems, { enabled: true, rules: [dashRule, emDashRule] })
assert(!dashResult.items.find(i => i.id === 'dsh1'), 'dash regex excludes "--"')
assert(!dashResult.items.find(i => i.id === 'dsh2'), 'dash regex excludes "—"')
assert(!dashResult.items.find(i => i.id === 'dsh3'), 'dash regex excludes "––"')
assert(dashResult.items.find(i => i.id === 'dsh5') !== undefined, 'dash regex does not exclude normal text')

// --- order regression: rules match raw content before variableization ---

const dateRule: ExclusionRule = {
  name: 'Date/time stamp',
  enabled: true,
  note: '',
  matchTarget: 'content',
  matchType: 'regex',
  pattern: '\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\s+\\d{1,2}(?:,\\s*\\d{2,4})?(?:\\s+\\d{1,2}:\\d{2}(?:\\s?[AP]M)?)?(?:\\s+[A-Z]{2,4})?\\b',
  action: 'exclude',
  confidence: 'high'
}
const dateItem = makeItem('date1', 'Mar 7 1:15 PM ET')
const dateResult = applyExclusionRules([dateItem], { enabled: true, rules: [dateRule] })
assert(dateResult.items.length === 0, 'date/time rule excludes raw date string even with numeric variableization active')

// --- match targets: content vs layerName vs both ---

const targetItem = {
  ...makeItem('t1', 'body copy here'),
  textLayerName: 'Header title'
}
const targetRules: ExclusionRule[] = [
  { name: 'Content contains', enabled: true, note: '', matchTarget: 'content', matchType: 'contains', pattern: 'body', action: 'flag', confidence: 'med' },
  { name: 'Layer exact', enabled: true, note: '', matchTarget: 'layerName', matchType: 'exact', pattern: 'Header title', action: 'flag', confidence: 'med' },
  { name: 'Both OR', enabled: true, note: '', matchTarget: 'both', matchType: 'contains', pattern: 'title', action: 'flag', confidence: 'low' }
]
const targetResult = applyExclusionRules([targetItem], { enabled: true, rules: [targetRules[0]] })
assert(targetResult.flaggedIds.has('t1'), 'content target matches content only')
const layerResult = applyExclusionRules([targetItem], { enabled: true, rules: [targetRules[1]] })
assert(layerResult.flaggedIds.has('t1'), 'layerName target matches layer name')
const bothResult = applyExclusionRules([targetItem], { enabled: true, rules: [targetRules[2]] })
assert(bothResult.flaggedIds.has('t1'), 'both target uses OR semantics')

// --- invalid regex safety ---

const badRegexRule: ExclusionRule = {
  name: 'Bad regex',
  enabled: true,
  note: '',
  matchTarget: 'content',
  matchType: 'regex',
  pattern: '[abc',
  action: 'exclude',
  confidence: 'high'
}
const badRegexResult = applyExclusionRules([makeItem('r1', 'abc')], { enabled: true, rules: [badRegexRule] })
assert(badRegexResult.items.length === 1, 'invalid regex does not crash and is treated as non-match')

// --- legacy compatibility ---

const legacyResult = applyExclusionRules(
  [makeItem('l1', 'Debug: keep out'), makeItem('l2', 'Normal')],
  {
    enabled: true,
    rules: [{ label: 'Legacy debug', field: 'content.value', match: 'startsWith', pattern: 'Debug:' }]
  }
)
assert(legacyResult.items.length === 1, 'legacy rule still excludes correctly')
assert(legacyResult.items[0].id === 'l2', 'legacy filter keeps expected row')

const normalizedLegacy = normalizeLegacyRuleToNewRule({ label: 'Legacy text layer', field: 'textLayerName', match: 'contains', pattern: 'Header' }, 0)
assert(normalizedLegacy !== null && normalizedLegacy.matchTarget === 'layerName', 'legacy adapter maps textLayerName -> layerName')
assert(normalizedLegacy !== null && normalizedLegacy.matchType === 'contains', 'legacy adapter maps contains as contains')

// --- source precedence: work > custom > default ---

const customCfg = { enabled: true, rules: [{ name: 'custom', matchTarget: 'content', matchType: 'contains', pattern: 'x', action: 'exclude', confidence: 'high' }] }
const workCfg = { enabled: true, rules: [{ name: 'work', matchTarget: 'content', matchType: 'contains', pattern: 'y', action: 'exclude', confidence: 'high' }] }
const defaultCfg = { enabled: true, rules: [] }
const src1 = resolveExclusionConfigWithSource(workCfg, customCfg, defaultCfg)
assert(src1.source === 'work', 'precedence picks work when present')
const src2 = resolveExclusionConfigWithSource(undefined, customCfg, defaultCfg)
assert(src2.source === 'custom', 'precedence picks custom when work missing')
const src3 = resolveExclusionConfigWithSource(undefined, undefined, defaultCfg)
assert(src3.source === 'default', 'precedence falls back to default')

// --- Report ---

console.log(`\n[exclusionRules.test] ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
