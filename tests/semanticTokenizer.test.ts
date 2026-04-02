/**
 * Semantic tokenizer tests.
 * Run: npx tsx tests/semanticTokenizer.test.ts
 */

import { tokenizeContent } from '../src/core/contentTable/semanticTokenizer'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) { passed++ }
  else { failed++; console.error(`  FAIL: ${label}`) }
}

// --- Preserve list ---

assert(tokenizeContent('S&P 500').changed === false, 'preserve: S&P 500')
assert(tokenizeContent('401(k)').changed === false, 'preserve: 401(k)')
assert(tokenizeContent('529 plan').changed === false, 'preserve: 529 plan')
assert(tokenizeContent('1099-INT').changed === false, 'preserve: 1099-INT')
assert(tokenizeContent('Form 1099').changed === false, 'preserve: Form 1099')
assert(tokenizeContent('W-2').changed === false, 'preserve: W-2')

// --- No-op cases ---

assert(tokenizeContent('').changed === false, 'no-op: empty string')
assert(tokenizeContent('Hello world').changed === false, 'no-op: plain text')
assert(tokenizeContent('Submit').changed === false, 'no-op: single word')

// --- Legal blocks ---

const legalText = '* Past performance is not a guarantee of future results. Investment products are not FDIC insured, not a deposit, and may lose value.'
assert(tokenizeContent(legalText).value === '{{LegalDisclosure}}', 'legal: disclaimer block → LegalDisclosure')
assert(tokenizeContent(legalText).changed === true, 'legal: changed flag true')

// --- Dates ---

assert(tokenizeContent('Apr 28, 2025').value === '{{Date: mmm dd, yyyy}}', 'date: Apr 28, 2025')
assert(tokenizeContent('April 28, 2025').value === '{{Date: mmmm dd, yyyy}}', 'date: April 28, 2025')
assert(tokenizeContent('Friday, February 28, 2025').value === '{{Date: [$-x-sysdate]dddd, mmmm dd, yyyy}}', 'date: Friday, February 28, 2025')
assert(tokenizeContent('2025-04-28').value === '{{Date: yyyy-mm-dd}}', 'date: ISO 2025-04-28')

// --- Times ---

assert(tokenizeContent('4 PM').value === '{{Time: h AM/PM}}', 'time: 4 PM')
assert(tokenizeContent('4:36 PM').value === '{{Time: h:mm AM/PM}}', 'time: 4:36 PM')
assert(tokenizeContent('16:36').value === '{{Time: hh:mm}}', 'time: 24h 16:36')

// --- DateTime combos (with year) ---

assert(tokenizeContent('Apr 28, 2025 4:36 PM').value === '{{DateTime: mmm dd, yyyy h:mm AM/PM}}', 'datetime: Apr 28 2025 4:36 PM')

// --- DateTime combos (no year) + timezone absorption ---

assert(tokenizeContent('Mar 7 1:15 PM ET').value === '{{DateTime: mmm d, h:mm AM/PM}}', 'datetime-no-year: Mar 7 1:15 PM ET (timezone absorbed)')
assert(tokenizeContent('Mar 7 1:15 PM').value === '{{DateTime: mmm d, h:mm AM/PM}}', 'datetime-no-year: Mar 7 1:15 PM (no timezone)')
assert(tokenizeContent('March 7 1:15 PM ET').value === '{{DateTime: mmmm d, h:mm AM/PM}}', 'datetime-no-year: March 7 1:15 PM ET (long month)')
assert(tokenizeContent('Jan 15 9:00 AM EST').value === '{{DateTime: mmm d, h:mm AM/PM}}', 'datetime-no-year: Jan 15 9:00 AM EST')

// --- Standalone dates (no year) ---

assert(tokenizeContent('Mar 7').value === '{{Date: mmm d}}', 'date-no-year: Mar 7')
assert(tokenizeContent('January 15').value === '{{Date: mmmm d}}', 'date-no-year: January 15')

// --- Currency ---

assert(tokenizeContent('$500,561.88').value === '{{Currency:USD:#,##0.00}}', 'currency: $500,561.88')
assert(tokenizeContent('€99.00').value === '{{Currency:EUR:#,##0.00}}', 'currency: €99.00')
assert(tokenizeContent('£1,200').value === '{{Currency:GBP:#,##0}}', 'currency: £1,200')
assert(tokenizeContent('+$2,545.34').value === '{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}}', 'delta-currency: +$2,545.34')
assert(tokenizeContent('-$2,545.34').value === '{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}}', 'delta-currency: -$2,545.34')

// --- Amounts (no currency symbol) ---

assert(tokenizeContent('2,545').value === '{{Amount:#,##0}}', 'amount: 2,545')
assert(tokenizeContent('+2,545').value === '{{Delta:+#,##0;-#,##0}}', 'delta: +2,545')

// --- Percentages ---

assert(tokenizeContent('4.59%').value === '{{Percent:0.00%}}', 'percent: 4.59%')
assert(tokenizeContent('+4.59%').value === '{{DeltaPercent:+0.00%;-0.00%}}', 'delta-percent: +4.59%')
assert(tokenizeContent('-4.59%').value === '{{DeltaPercent:+0.00%;-0.00%}}', 'delta-percent: -4.59%')

// --- Mixed text with tokens ---

assert(
  tokenizeContent('+$2,545.34 (+4.59%)').value === '{{DeltaCurrency:USD:+#,##0.00;-#,##0.00}} ({{DeltaPercent:+0.00%;-0.00%}})',
  'mixed: delta-currency + delta-percent'
)

// --- Email ---

assert(tokenizeContent('name@example.com').value === '{{Email}}', 'email: name@example.com')
assert(tokenizeContent('Contact us at support@acme.io').value === 'Contact us at {{Email}}', 'email: inline in sentence')

// --- Phone ---

assert(tokenizeContent('866-440-1238').value === '{{Phone}}', 'phone: 866-440-1238')
assert(tokenizeContent('(800) 555-1212').value === '{{Phone}}', 'phone: (800) 555-1212')

// --- changed flag ---

assert(tokenizeContent('Apr 28, 2025').changed === true, 'changed: true for date')
assert(tokenizeContent('Hello').changed === false, 'changed: false for plain text')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
