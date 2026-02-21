/**
 * Exclusion rules tests — numeric/currency handling + pattern rules.
 */

import {
  isStandaloneNumeric,
  isStandaloneCurrency,
  variableizeNumerics,
  applyExclusionRules
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
assert(disabledResult.length === 3, 'disabled config: all items pass through')

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

assert(enabledResult.length === 3, 'enabled: 3 items survive (3 standalone excluded)')
assert(!enabledResult.find(i => i.id === 'n1'), 'enabled: "25" excluded')
assert(!enabledResult.find(i => i.id === 'n2'), 'enabled: "$3.45" excluded')
assert(!enabledResult.find(i => i.id === 'n6'), 'enabled: "1,234" excluded')

const hello = enabledResult.find(i => i.id === 'n3')
assert(hello !== undefined && hello.content.value === 'Hello world', 'enabled: plain text unchanged')

const earned = enabledResult.find(i => i.id === 'n4')
assert(earned !== undefined && earned.content.value === "You've earned: {variable}", 'enabled: currency in sentence variableized')

const due = enabledResult.find(i => i.id === 'n5')
assert(due !== undefined && due.content.value === 'Due in {variable} miles', 'enabled: number in sentence variableized')

// --- applyExclusionRules: pattern rule + numeric together ---

const patternItems = [
  makeItem('p1', 'Debug: test value'),
  makeItem('p2', '42'),
  makeItem('p3', 'Normal text')
]
const patternResult = applyExclusionRules(patternItems, {
  enabled: true,
  rules: [{ label: 'Debug filter', field: 'content.value', match: 'startsWith', pattern: 'Debug:' }]
})
assert(patternResult.length === 1, 'pattern + numeric: only "Normal text" survives')
assert(patternResult[0].id === 'p3', 'pattern + numeric: correct item survives')

// --- Report ---

console.log(`\n[exclusionRules.test] ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
