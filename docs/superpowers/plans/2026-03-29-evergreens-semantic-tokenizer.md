# Evergreens Semantic Tokenizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace EG-A's broad legacy numeric/currency exclusion with a precise semantic token engine that classifies content values into typed `{{Token}}` placeholders, stores originals as reversible session overlays, and adds a human-editable ignore-rules file for shell/chrome filtering.

**Architecture:** A pure `semanticTokenizer.ts` module classifies each scanned text value using prioritized regex passes (datetime → financial → contact → legal). Tokenized content is stored as a per-session overlay (`tokenizedItems`) distinct from user edits, so revert is trivial. Ignore rules are authored in `custom/content-table-ignore-rules.md`, compiled at build time to a generated TypeScript constant, and used as the open-source fallback when no Work adapter provides rules.

**Tech Stack:** TypeScript, Node `tsx` for test runner, Preact for UI, existing `ContentTableSession` overlay model, regex-only classification (no external NLP).

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `src/core/contentTable/semanticTokenizer.ts` | **Create** | Pure token classification engine |
| `tests/semanticTokenizer.test.ts` | **Create** | Unit tests for all token families |
| `src/core/contentTable/session.ts` | **Modify** | Add `tokenizedItems`, `tokenizedIds`, `revertTokenizedItem()`, update `getEffectiveItems()` |
| `src/assistants/evergreens/handler.ts` | **Modify** | Call tokenizer after exclusion rules; include tokenized data in postMessage |
| `src/core/contentTable/exclusionRules.ts` | **Modify** | Disable Steps 2+3 (standalone numeric exclusion + variableizeNumerics) |
| `src/ui.tsx` | **Modify** | Pass `tokenizedItems`/`tokenizedIds` from message to `createSession` |
| `src/ui/components/ContentTableView.tsx` | **Modify** | Add revert button + original-text tooltip for tokenized items |
| `custom/config.json` | **Modify** | Disable "Date/time stamp" exclusion rule |
| `custom/content-table-ignore-rules.md` | **Create** | Human-editable ignore rules source |
| `scripts/generate-ignore-rules.ts` | **Create** | Build-time parser for ignore rules markdown |
| `src/custom/generated/contentTableIgnoreRules.generated.ts` | **Create** | Compiled ignore rules (build artifact) |
| `package.json` | **Modify** | Add `generate-ignore-rules` to `prebuild`; add test to `test` script |

---

### Task 1: Semantic tokenizer — TDD

**Files:**
- Create: `tests/semanticTokenizer.test.ts`
- Create: `src/core/contentTable/semanticTokenizer.ts`
- Modify: `package.json` (add test entry)

- [ ] **Step 1: Write the failing test file**

Create `tests/semanticTokenizer.test.ts`:

```typescript
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

// --- DateTime combos ---

assert(tokenizeContent('Apr 28, 2025 4:36 PM').value === '{{DateTime: mmm dd, yyyy h:mm AM/PM}}', 'datetime: Apr 28 2025 4:36 PM')

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
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```bash
npx tsx tests/semanticTokenizer.test.ts
```

Expected: `Error: Cannot find module '../src/core/contentTable/semanticTokenizer'`

- [ ] **Step 3: Implement `src/core/contentTable/semanticTokenizer.ts`**

```typescript
/**
 * Semantic Token Engine for EG-A (Evergreens Assistant, content_table).
 *
 * Classifies content values from Figma text nodes and replaces them with typed
 * semantic placeholders using {{Token: formatHint}} syntax.
 *
 * Format hints follow Microsoft Excel custom date/time/number notation.
 * Pure functions — no side effects, no Figma API calls, no plugin imports.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SemanticTokenResult {
  /** Resulting text. Equals input if nothing was classified. */
  value: string
  /** True when at least one token replacement was applied. */
  changed: boolean
}

// ---------------------------------------------------------------------------
// Preserve list — named entities with numeric components that must NOT be tokenized
// ---------------------------------------------------------------------------

const PRESERVE_PATTERNS: RegExp[] = [
  /^S&P\s*500(?:\s+index)?$/i,
  /^401\(k\)$/i,
  /^403\(b\)$/i,
  /^457\(b\)$/i,
  /^529(?:\s+plan)?$/i,
  /^(?:Form\s+)?1099(?:-[A-Z]{1,4})?$/i,
  /^W-[249]$/i,
  /^Roth\s+IRA$/i,
  /^Traditional\s+IRA$/i,
]

function shouldPreserveLiteral(text: string): boolean {
  const t = text.trim()
  return PRESERVE_PATTERNS.some(re => re.test(t))
}

// ---------------------------------------------------------------------------
// Legal block detection
// ---------------------------------------------------------------------------

const LEGAL_MIN_LENGTH = 80
const LEGAL_SIGNALS_RE = /^(?:\*|†|‡|\d+\.\s|Note:|Important:|Disclosure:|Disclaimer:|Past performance|Subject to|Not FDIC|FDIC insured|Not a deposit|Securities offered|Investing involves|Investment products|Options involve)/i

function isLegalBlock(text: string): boolean {
  return text.length >= LEGAL_MIN_LENGTH && LEGAL_SIGNALS_RE.test(text.trimStart())
}

// ---------------------------------------------------------------------------
// Currency symbol → ISO code
// ---------------------------------------------------------------------------

const SYMBOL_TO_ISO: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', '₩': 'KRW', '₿': 'BTC'
}

function symbolToIso(sym: string): string {
  return SYMBOL_TO_ISO[sym] || 'USD'
}

function hasDecimal(numStr: string): boolean {
  return numStr.includes('.')
}

function numFmt(numStr: string): string {
  return hasDecimal(numStr) ? '#,##0.00' : '#,##0'
}

// ---------------------------------------------------------------------------
// Date / time patterns
//
// ORDER MATTERS: longer/more-specific patterns must come before shorter ones.
// DateTime combos must precede standalone dates and times.
// ---------------------------------------------------------------------------

const MO_S = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep(?:t)?|Oct|Nov|Dec'
const MO_L = 'January|February|March|April|May|June|July|August|September|October|November|December'
const DOW = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'
const TIME_HMM_AMPM = '(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*(AM|PM)'
const TIME_H_AMPM = '(\\d{1,2})\\s+(AM|PM)'
const TIME_24 = '([01]?\\d|2[0-3]):(\\d{2})'

// DateTime combos — short month
const DT_S_HMM_AMPM = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_HMM_AMPM}\\b`, 'gi')
const DT_S_24 = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_24}\\b`, 'gi')
// DateTime combos — long month
const DT_L_HMM_AMPM = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_HMM_AMPM}\\b`, 'gi')
const DT_L_24 = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_24}\\b`, 'gi')

// Individual dates
const DATE_DOW_L = new RegExp(`\\b(${DOW}),\\s+(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_L = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_S = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_ISO = /\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g

// Individual times (only after datetime combos have run)
const TIME_HMM_AMPM_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\b/gi
const TIME_H_AMPM_RE = /\b(\d{1,2})\s+(AM|PM)\b/gi
const TIME_24_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g

// ---------------------------------------------------------------------------
// Financial patterns
// ---------------------------------------------------------------------------

const NUM = '\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?'
const SYM_RE = '[$€£¥₹₩₿]'

// delta-currency: +$1,234.56  -€99
const DELTA_CCY_RE = new RegExp(`([+-])\\s*(${SYM_RE})\\s*(${NUM})`, 'g')
// plain currency: $1,234.56
const CCY_RE = new RegExp(`(${SYM_RE})\\s*(${NUM})`, 'g')
// delta percent: +4.59%  -0.5%
const DELTA_PCT_RE = /([+-])(\d+(?:\.\d+)?)%/g
// plain percent: 4.59%
const PCT_RE = /(\d+(?:\.\d+)?)%/g
// delta amount (requires comma grouping): +2,545  -1,234.56
const DELTA_AMT_RE = /([+-])(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/g
// plain amount with comma grouping: 2,545  1,234.56
const AMT_RE = /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g

// ---------------------------------------------------------------------------
// Contact patterns
// ---------------------------------------------------------------------------

const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g
const PHONE_RE = /(?:\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/g

// ---------------------------------------------------------------------------
// Replacement passes
// ---------------------------------------------------------------------------

function applyDateTimeCombos(s: string): string {
  s = s.replace(DT_S_HMM_AMPM, () => '{{DateTime: mmm dd, yyyy h:mm AM/PM}}')
  s = s.replace(DT_S_24, () => '{{DateTime: mmm dd, yyyy hh:mm}}')
  s = s.replace(DT_L_HMM_AMPM, () => '{{DateTime: mmmm dd, yyyy h:mm AM/PM}}')
  s = s.replace(DT_L_24, () => '{{DateTime: mmmm dd, yyyy hh:mm}}')
  return s
}

function applyDates(s: string): string {
  s = s.replace(DATE_DOW_L, () => '{{Date: [$-x-sysdate]dddd, mmmm dd, yyyy}}')
  s = s.replace(DATE_L, () => '{{Date: mmmm dd, yyyy}}')
  s = s.replace(DATE_S, () => '{{Date: mmm dd, yyyy}}')
  s = s.replace(DATE_ISO, () => '{{Date: yyyy-mm-dd}}')
  return s
}

function applyTimes(s: string): string {
  s = s.replace(TIME_HMM_AMPM_RE, (_m, _h, _mm, ampm) => `{{Time: h:mm ${String(ampm).toUpperCase()}}}`)
  s = s.replace(TIME_H_AMPM_RE, (_m, _h, ampm) => `{{Time: h ${String(ampm).toUpperCase()}}}`)
  s = s.replace(TIME_24_RE, () => '{{Time: hh:mm}}')
  return s
}

function applyFinancial(s: string): string {
  s = s.replace(DELTA_CCY_RE, (_m, _sign, sym, num) =>
    `{{DeltaCurrency:${symbolToIso(sym)}:+${numFmt(num)};-${numFmt(num)}}}`
  )
  s = s.replace(CCY_RE, (_m, sym, num) =>
    `{{Currency:${symbolToIso(sym)}:${numFmt(num)}}}`
  )
  s = s.replace(DELTA_PCT_RE, (_m, _sign, num) => {
    const fmt = hasDecimal(num) ? '0.00' : '0'
    return `{{DeltaPercent:+${fmt}%;-${fmt}%}}`
  })
  s = s.replace(PCT_RE, (_m, num) =>
    `{{Percent:${hasDecimal(num) ? '0.00' : '0'}%}}`
  )
  s = s.replace(DELTA_AMT_RE, (_m, _sign, num) =>
    `{{Delta:+${numFmt(num)};-${numFmt(num)}}}`
  )
  s = s.replace(AMT_RE, (_m, num) =>
    `{{Amount:${numFmt(num)}}}`
  )
  return s
}

function applyContact(s: string): string {
  s = s.replace(EMAIL_RE, () => '{{Email}}')
  s = s.replace(PHONE_RE, () => '{{Phone}}')
  return s
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a single content value and replace matched patterns with semantic tokens.
 * Returns the original value unchanged if no patterns match.
 */
export function tokenizeContent(text: string): SemanticTokenResult {
  const trimmed = text.trim()
  if (!trimmed) return { value: text, changed: false }
  if (shouldPreserveLiteral(trimmed)) return { value: text, changed: false }
  if (isLegalBlock(trimmed)) return { value: '{{LegalDisclosure}}', changed: true }

  // Reset all stateful regex lastIndex (safety: these are module-level globals with /g flag)
  ;[DT_S_HMM_AMPM, DT_S_24, DT_L_HMM_AMPM, DT_L_24, DATE_DOW_L, DATE_L, DATE_S, DATE_ISO,
    TIME_HMM_AMPM_RE, TIME_H_AMPM_RE, TIME_24_RE,
    DELTA_CCY_RE, CCY_RE, DELTA_PCT_RE, PCT_RE, DELTA_AMT_RE, AMT_RE,
    EMAIL_RE, PHONE_RE].forEach(re => { re.lastIndex = 0 })

  let result = text
  result = applyDateTimeCombos(result)
  result = applyDates(result)
  result = applyTimes(result)
  result = applyFinancial(result)
  result = applyContact(result)

  return { value: result, changed: result !== text }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx tsx tests/semanticTokenizer.test.ts
```

Expected: `N passed, 0 failed` (all tests green)

If any tests fail, fix the regex in `semanticTokenizer.ts` until all pass. Common issues:
- Time regex matching digits inside already-tokenized `{{Currency...}}` tokens. Fix by resetting `lastIndex` before each pass (already done in the `forEach` above).
- Delta-currency regex not matching `+$` because `+` is not adjacent — check spacing: `([+-])\s*(SYM)\s*(NUM)`.

- [ ] **Step 5: Add test to `package.json` test script**

In `package.json`, find the `"test"` script and append `&& tsx tests/semanticTokenizer.test.ts` at the end:

```json
"test": "tsx scripts/build-assistants.test.ts && ... && tsx tests/exclusionRules.test.ts && tsx tests/selectionResolver.test.ts && tsx admin-editor/src/content-models-parser.test.ts && tsx src/core/figma/textLinkRanges.test.ts && tsx src/core/contentTable/presetOrder.test.ts && tsx src/core/contentTable/renderers.test.ts && tsx tests/semanticTokenizer.test.ts"
```

(Append `&& tsx tests/semanticTokenizer.test.ts` at the very end of the existing test script string.)

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: All tests pass including the new `semanticTokenizer` suite.

- [ ] **Step 7: Commit**

```bash
git add src/core/contentTable/semanticTokenizer.ts tests/semanticTokenizer.test.ts package.json
git commit -m "feat(ct-a): semantic token engine with TDD — dates, times, financials, contact, legal"
```

---

### Task 2: Session tokenized overlay

**Files:**
- Modify: `src/core/contentTable/session.ts`

- [ ] **Step 1: Add `tokenizedItems` and `tokenizedIds` fields to `ContentTableSession`**

In `src/core/contentTable/session.ts`, add two fields at the bottom of the `ContentTableSession` interface (after `lastSkippedCount`):

```typescript
  /** Per-item auto-tokenized content, keyed by item.id → tokenized value.
   * Separate from user editedItems: user edits win over token overlays. */
  tokenizedItems: Record<string, string>
  /** Item IDs that were auto-tokenized. Used to show revert affordance in UI. */
  tokenizedIds: Set<string>
```

- [ ] **Step 2: Update `createSession()` to accept tokenized data in opts**

In `createSession()`, add `tokenizedItems` and `tokenizedIds` to the opts parameter:

```typescript
export function createSession(
  table: UniversalContentTableV1,
  opts?: {
    flaggedDuplicateIds?: Set<string>
    flaggedIgnoreIds?: Set<string>
    ignoreRuleByItemId?: Record<string, string>
    skippedCount?: number
    tokenizedItems?: Record<string, string>
    tokenizedIds?: Set<string>
  }
): ContentTableSession {
```

Then in the return object, add:

```typescript
  return {
    baseTable: table,
    editedItems: {},
    deletedIds: new Set(),
    duplicates: new Map(),
    scanEnabled: true,
    flaggedDuplicateIds: opts?.flaggedDuplicateIds ?? new Set(),
    flaggedIgnoreIds: ignoreFlags,
    ignoreRuleByItemId,
    lastSkippedCount: opts?.skippedCount ?? 0,
    tokenizedItems: opts?.tokenizedItems
      ? Object.fromEntries(Object.entries(opts.tokenizedItems).filter(([id]) => validIds.has(id)))
      : {},
    tokenizedIds: opts?.tokenizedIds
      ? new Set([...opts.tokenizedIds].filter(id => validIds.has(id)))
      : new Set()
  }
```

(The `validIds` set is already defined at the top of `createSession`: `const validIds = new Set(table.items.map(item => item.id))`)

- [ ] **Step 3: Update `appendItems()` to merge tokenized data**

In `appendItems()`, add to the opts parameter:

```typescript
  opts?: {
    flaggedDuplicateIds?: Set<string>
    flaggedIgnoreIds?: Set<string>
    ignoreRuleByItemId?: Record<string, string>
    skippedCount?: number
    tokenizedItems?: Record<string, string>
    tokenizedIds?: Set<string>
  }
```

After the `prunedIgnoreRules` block (before the `newSession` construction), add:

```typescript
  const mergedTokenizedItems = { ...session.tokenizedItems, ...(opts?.tokenizedItems || {}) }
  const mergedTokenizedIds = new Set([...session.tokenizedIds, ...(opts?.tokenizedIds || [])])
  const prunedTokenizedItems: Record<string, string> = {}
  Object.keys(mergedTokenizedItems).forEach((id) => {
    if (validIds.has(id)) prunedTokenizedItems[id] = mergedTokenizedItems[id]
  })
  const prunedTokenizedIds = new Set<string>()
  mergedTokenizedIds.forEach(id => { if (validIds.has(id)) prunedTokenizedIds.add(id) })
```

Then include in `newSession`:

```typescript
  const newSession: ContentTableSession = {
    ...session,
    baseTable: updatedTable,
    flaggedDuplicateIds: mergedFlags,
    flaggedIgnoreIds: prunedIgnoreFlags,
    ignoreRuleByItemId: prunedIgnoreRules,
    lastSkippedCount: opts?.skippedCount ?? 0,
    tokenizedItems: prunedTokenizedItems,
    tokenizedIds: prunedTokenizedIds
  }
```

- [ ] **Step 4: Update `getEffectiveItems()` to apply token overlays (user edits win)**

Replace the current `getEffectiveItems` body with:

```typescript
export function getEffectiveItems(session: ContentTableSession): ContentItemV1[] {
  return session.baseTable.items
    .filter(item => !session.deletedIds.has(item.id))
    .map(item => {
      const tokenOverride = session.tokenizedItems[item.id]
      const userOverrides = session.editedItems[item.id]
      if (!tokenOverride && !userOverrides) return item
      let merged: ContentItemV1 = { ...item }
      // Token overlay applied first (lower priority)
      if (tokenOverride !== undefined) {
        merged = { ...merged, content: { ...item.content, value: tokenOverride } }
      }
      // User overrides applied second (higher priority)
      if (userOverrides) {
        merged = applyOverrides(merged, userOverrides)
      }
      return merged
    })
}
```

- [ ] **Step 5: Add `revertTokenizedItem()` export**

After `toggleDuplicateScan`, add:

```typescript
/**
 * Remove the automatic token overlay for an item, restoring the original scanned text.
 * User edits on that item (if any) are NOT affected.
 */
export function revertTokenizedItem(
  session: ContentTableSession,
  itemId: string
): ContentTableSession {
  const newTokenizedItems = { ...session.tokenizedItems }
  delete newTokenizedItems[itemId]
  const newTokenizedIds = new Set(session.tokenizedIds)
  newTokenizedIds.delete(itemId)
  return { ...session, tokenizedItems: newTokenizedItems, tokenizedIds: newTokenizedIds }
}
```

- [ ] **Step 6: Run build to check TypeScript**

```bash
npm run build
```

Expected: Build succeeds. If there are TypeScript errors about `tokenizedItems` or `tokenizedIds` being missing on `ContentTableSession` usages, those will be fixed in Task 3 when `ui.tsx` and the handler are updated. For now the build may show errors in files that create `ContentTableSession` objects — that is expected and will be resolved in the next task.

If the build errors are ONLY about missing fields in `createSession` callers (in `ui.tsx`), proceed to Task 3. If there are errors in `session.ts` itself, fix them before committing.

- [ ] **Step 7: Commit**

```bash
git add src/core/contentTable/session.ts
git commit -m "feat(ct-a): add tokenizedItems overlay + revertTokenizedItem to ContentTableSession"
```

---

### Task 3: Wire tokenizer into handler + disable legacy rules

**Files:**
- Modify: `src/assistants/evergreens/handler.ts`
- Modify: `src/core/contentTable/exclusionRules.ts`
- Modify: `src/ui.tsx`
- Modify: `custom/config.json`

- [ ] **Step 1: Import `tokenizeContent` in `handler.ts`**

In `src/assistants/evergreens/handler.ts`, add this import after the existing imports (around line 22):

```typescript
import { tokenizeContent } from '../../core/contentTable/semanticTokenizer'
```

- [ ] **Step 2: Call tokenizer in `handler.ts` after exclusion rules**

In `handler.ts`, find the block that ends with:
```typescript
contentTable = { ...contentTable, items: exclusionResult.items }
```

Immediately after that line (and before the status message block), add:

```typescript
      // Semantic tokenization: classify values as typed placeholders (reversible overlay)
      const tokenizedItemsMap: Record<string, string> = {}
      const tokenizedIds = new Set<string>()
      for (const item of contentTable.items) {
        const tokenResult = tokenizeContent(item.content.value)
        if (tokenResult.changed) {
          tokenizedItemsMap[item.id] = tokenResult.value
          tokenizedIds.add(item.id)
        }
      }
```

- [ ] **Step 3: Add tokenized data to `postMessage` in `handler.ts`**

Find the `figma.ui.postMessage` call in `handler.ts`. Add `tokenizedItems` and `tokenizedIds` to the `pluginMessage` object:

```typescript
      figma.ui.postMessage({
        pluginMessage: {
          type: isAppend ? 'CONTENT_TABLE_APPEND' : 'CONTENT_TABLE_GENERATED',
          table: contentTable,
          flaggedIgnoreIds: Array.from(exclusionResult.flaggedIds),
          ignoreRuleByItemId: exclusionResult.matchedRuleByItemId,
          tokenizedItems: tokenizedItemsMap,
          tokenizedIds: Array.from(tokenizedIds),
          exclusionDebug: exclusionDebugEnabled
            ? {
                source: resolvedExclusion.source,
                enabled: resolvedExclusion.config.enabled,
```

(Only add the two new lines `tokenizedItems` and `tokenizedIds`; leave the rest of the object unchanged.)

- [ ] **Step 4: Disable Steps 2+3 in `exclusionRules.ts`**

In `src/core/contentTable/exclusionRules.ts`, find the `applyExclusionRules` function body. Remove the two blocks labelled "Step 2" and "Step 3":

Remove these lines entirely:
```typescript
    const trimmedContent = rawContent.trim()

    // Step 2: standalone numeric/currency → exclude
    if (isStandaloneNumeric(trimmedContent) || isStandaloneCurrency(trimmedContent)) continue

    // Step 3: mixed text+number → variableize
    const transformed = variableizeNumerics(rawContent)
    if (transformed !== rawContent) {
      result.push({ ...item, content: { ...item.content, value: transformed } })
    } else {
      result.push(item)
    }
```

Replace with the simple form:
```typescript
    result.push(item)
```

The function body after the pattern-rules block should now look like:

```typescript
    // Step 1: pattern-based rule actions (unchanged)
    if (normalizedRules.length > 0) {
      let excludedByRule = false
      for (const rule of normalizedRules) {
        if (!matchesRule(item, rule, rawContent)) continue
        matchedRuleByItemId[item.id] = rule.name
        if (rule.action === 'exclude') {
          excludedByRule = true
          break
        }
        if (rule.action === 'flag') {
          flaggedIds.add(item.id)
          break
        }
      }
      if (excludedByRule) continue
    }

    result.push(item)
  }
```

Note: The exported functions `isStandaloneNumeric`, `isStandaloneCurrency`, and `variableizeNumerics` remain in the file — they are tested in `tests/exclusionRules.test.ts` and may still be useful as utilities. Only their call sites in `applyExclusionRules` are removed.

- [ ] **Step 5: Update `tests/exclusionRules.test.ts` — add regression test for disabled numeric behavior**

Find `tests/exclusionRules.test.ts` and add these assertions after the existing `applyExclusionRules` tests (before the final `console.log`):

```typescript
// --- applyExclusionRules: standalone numbers no longer excluded (tokenizer handles them) ---

const numItem = makeItem('num1', '25')
const numResult = applyExclusionRules([numItem], { enabled: true, rules: [] })
assert(numResult.items.length === 1, 'applyExclusionRules: standalone number "25" is NOT excluded (tokenizer handles it)')

const currItem = makeItem('curr1', '$500.00')
const currResult = applyExclusionRules([currItem], { enabled: true, rules: [] })
assert(currResult.items.length === 1, 'applyExclusionRules: standalone currency "$500.00" is NOT excluded')

const mixItem = makeItem('mix1', 'Balance: $500.00')
const mixResult = applyExclusionRules([mixItem], { enabled: true, rules: [] })
assert(mixResult.items[0]?.content.value === 'Balance: $500.00', 'applyExclusionRules: mixed text NOT variableized (stays as-is)')
```

- [ ] **Step 6: Update `src/ui.tsx` — pass tokenized data to `createSession`**

In `src/ui.tsx`, find the `case 'CONTENT_TABLE_GENERATED':` block (around line 781). It currently calls `createSession(dedupedTable, { ... })`. Add the two new opts:

```typescript
          const tokenizedItemsFromMsg: Record<string, string> =
            message.tokenizedItems && typeof message.tokenizedItems === 'object'
              ? message.tokenizedItems
              : {}
          const tokenizedIdsFromMsg = new Set<string>(
            Array.isArray(message.tokenizedIds) ? message.tokenizedIds : []
          )
          setCtSession(createSession(dedupedTable, {
            flaggedDuplicateIds: ...,           // leave unchanged
            flaggedIgnoreIds: ignoreFlagIds,    // leave unchanged
            ignoreRuleByItemId: ...,            // leave unchanged
            tokenizedItems: tokenizedItemsFromMsg,
            tokenizedIds: tokenizedIdsFromMsg
          }))
```

(Add only the two new lines inside the existing opts object; do not change any other lines.)

Also find the `case 'CONTENT_TABLE_APPEND':` block (around line 807) and apply the same pattern. The `createSession` call there uses the same opts signature:

```typescript
          const appendTokenizedItems: Record<string, string> =
            message.tokenizedItems && typeof message.tokenizedItems === 'object'
              ? message.tokenizedItems
              : {}
          const appendTokenizedIds = new Set<string>(
            Array.isArray(message.tokenizedIds) ? message.tokenizedIds : []
          )
```

Then pass them to `appendItems` (or `createSession` for the fallback branch) as `tokenizedItems: appendTokenizedItems, tokenizedIds: appendTokenizedIds`.

Also ensure `revertTokenizedItem` is imported at the top of `ui.tsx` from session (it will be used in Task 4):

```typescript
import { createSession, getEffectiveItems, applyEdit, deleteItem, appendItems, toggleDuplicateScan, revertTokenizedItem } from './core/contentTable/session'
```

- [ ] **Step 7: Disable "Date/time stamp" rule in `custom/config.json`**

In `custom/config.json`, find the `contentTable.exclusionRules.rules` array and set `"enabled": false` on the rule named `"Date/time stamp"`:

```json
{
  "action": "exclude",
  "confidence": "high",
  "enabled": false,
  "matchTarget": "content",
  "matchType": "regex",
  "name": "Date/time stamp",
  "note": "Disabled: semantic tokenizer handles date/time classification",
  "pattern": "\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\s+\\d{1,2}(?:,\\s*\\d{2,4})?(?:\\s+\\d{1,2}:\\d{2}(?:\\s?[AP]M)?)?(?:\\s+[A-Z]{2,4})?\\b"
}
```

(Change only `"enabled": true` → `"enabled": false` and add the `"note"` field explaining why.)

- [ ] **Step 8: Run tests**

```bash
npm run test
```

Expected: All tests pass, including the new assertions in `exclusionRules.test.ts`.

- [ ] **Step 9: Run build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add src/assistants/evergreens/handler.ts src/core/contentTable/exclusionRules.ts src/ui.tsx custom/config.json tests/exclusionRules.test.ts
git commit -m "feat(ct-a): wire semantic tokenizer into handler; disable legacy numeric exclusion"
```

---

### Task 4: UI revert affordance

**Files:**
- Modify: `src/ui/components/ContentTableView.tsx`

- [ ] **Step 1: Import `revertTokenizedItem` in `ContentTableView.tsx`**

In `src/ui/components/ContentTableView.tsx`, update the session import line from:

```typescript
import { getEffectiveItems, applyEdit, deleteItem } from '../../core/contentTable/session'
```

to:

```typescript
import { getEffectiveItems, applyEdit, deleteItem, revertTokenizedItem } from '../../core/contentTable/session'
```

- [ ] **Step 2: Add `baseItemById` memo and `isTokenized` flag in the items-mode render section**

In `ContentTableView.tsx`, find the items-mode render section. It starts at approximately line 293:

```tsx
items.map((item, idx) => {
  const isFlagged = session.flaggedDuplicateIds.has(item.id)
  const isIgnoreFlagged = session.flaggedIgnoreIds.has(item.id)
```

Before the `items.map(...)` call (but inside the component's JSX), add a `useMemo` at the top of the functional component body (after all other hooks):

```typescript
  // Build lookup for original (pre-tokenization) content values.
  // Used to show "Original: ..." tooltip on tokenized cells.
  const baseContentById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const bi of session.baseTable.items) {
      m[bi.id] = bi.content.value
    }
    return m
  }, [session.baseTable.items])
```

- [ ] **Step 3: Add `isTokenized` flag and revert button in `renderToolsCell`**

In the items-mode section, add `isTokenized` just after the existing flag variables:

```typescript
  const isFlagged = session.flaggedDuplicateIds.has(item.id)
  const isIgnoreFlagged = session.flaggedIgnoreIds.has(item.id)
  const ignoreRuleName = session.ignoreRuleByItemId[item.id] || ''
  const isTokenized = session.tokenizedIds.has(item.id)
  const originalContent = isTokenized ? (baseContentById[item.id] || '') : ''
```

Then, inside `renderToolsCell()`, add a revert button before the existing delete button:

```tsx
const renderToolsCell = () => (
  <span>
    {isIgnoreFlagged && (
      <span title={ignoreRuleName ? `Matched ignore rule: ${ignoreRuleName}` : 'Matched ignore-list rule'} style={{ fontSize: '8px', color: '#7a4f00', backgroundColor: '#fff3cd', padding: '1px 3px', borderRadius: '3px', marginRight: '2px', fontWeight: 600 }}>Ignore?</span>
    )}
    {isFlagged && (
      <span title="Possible duplicate" style={{ fontSize: '8px', color: '#b36b00', backgroundColor: '#fff8e6', padding: '1px 3px', borderRadius: '3px', marginRight: '2px', fontWeight: 600 }}>Dup?</span>
    )}
    {isTokenized && (
      <button
        onClick={() => onSessionChange(revertTokenizedItem(session, item.id))}
        title={`Tokenized — click to revert to original:\n"${originalContent}"`}
        style={{ ...TOOL_BTN, color: '#6b21a8', fontSize: '8px', fontWeight: 600, padding: '1px 3px' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f3ff' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {{'{{'}}T{{'}}'}}
      </button>
    )}
    {item.nodeId && (
      <button onClick={() => onExportRowRefImage(item.nodeId)} title="Get ref image for this row" style={{ ...TOOL_BTN, color: '#333333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
        <ImageDownloadIcon width={14} height={14} />
      </button>
    )}
    <button onClick={() => onSessionChange(deleteItem(session, item.id))} title="Delete row" style={{ ...TOOL_BTN, color: '#cc3333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
      <CloseIcon width={14} height={14} />
    </button>
  </span>
)
```

Note: The `{{'{{'}}T{{'}}'}}` renders as the literal text `{{T}}` in JSX. In the actual file, write it as the string `{'{{T}}'}` inside the JSX, or just the literal `{{T}}` — the purple badge visually signals "this cell was tokenized".

Write the button label in the file as:
```tsx
>&#x7B;&#x7B;T&#x7D;&#x7D;</button>
```
Or more simply with a JSX string:
```tsx
>{'{{T}}'}</button>
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds. The tokenized row indicator appears in the content table tools column as a small purple `{{T}}` badge that shows the original text in a tooltip and reverts on click.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/ContentTableView.tsx
git commit -m "feat(ct-a): add revert affordance in content table for auto-tokenized rows"
```

---

### Task 5: Ignore rules markdown file + build script

**Files:**
- Create: `custom/content-table-ignore-rules.md`
- Create: `scripts/generate-ignore-rules.ts`
- Create: `src/custom/generated/contentTableIgnoreRules.generated.ts` (generated)
- Modify: `package.json`

- [ ] **Step 1: Create `custom/content-table-ignore-rules.md`**

```markdown
# Content Table Ignore Rules

Nodes matching these rules are excluded **before** scanning and semantic tokenization.
Edit this file to tune EG-A for your team's design system shell and shared chrome.

Prefer component keys (stable) over node names (fragile).
Prefer node names over text patterns (avoid over-ignoring real copy).

## Notes

- These rules run in the plugin at scan time, before any content reaches the content table.
- Changes take effect after `npm run build`.
- Use regex patterns prefixed with `(?i)` for case-insensitive matching.

## Component Key Denylist

(Paste stable component keys for shared nav, rails, headers, footers here)
(Example: abc123globalnavkey)

## Node Name Patterns

(Regex patterns matched against Figma node names)
(?i)^top\s+nav(?:igation)?$
(?i)^global\s+header$
(?i)^left\s+rail$
(?i)^side\s+rail$
(?i)^sidebar$
(?i)^app\s+shell$
(?i)^persistent\s+header$
(?i)^persistent\s+footer$
(?i)^global\s+footer$

## Text Value Patterns

(Regex patterns matched against text content — use sparingly)
(?i)^skip\s+to\s+(?:main\s+)?content$

## Node ID Prefixes

(Node ID prefixes to ignore — avoid unless necessary, IDs are file-specific)
```

- [ ] **Step 2: Create `scripts/generate-ignore-rules.ts`**

```typescript
/**
 * generate-ignore-rules.ts
 * Parses custom/content-table-ignore-rules.md and writes
 * src/custom/generated/contentTableIgnoreRules.generated.ts
 *
 * Run: npx tsx scripts/generate-ignore-rules.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const SOURCE = path.join(process.cwd(), 'custom', 'content-table-ignore-rules.md')
const OUTPUT = path.join(process.cwd(), 'src', 'custom', 'generated', 'contentTableIgnoreRules.generated.ts')

function parseSection(lines: string[], header: string): string[] {
  const results: string[] = []
  let inSection = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      inSection = trimmed.toLowerCase().startsWith(`## ${header.toLowerCase()}`)
      continue
    }
    if (!inSection) continue
    if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith('#')) continue
    results.push(trimmed)
  }
  return results
}

function main(): void {
  if (!fs.existsSync(SOURCE)) {
    console.log('[generate-ignore-rules] No source file found, writing empty config.')
    const emptyOutput = `// AUTO-GENERATED — do not edit. Source: custom/content-table-ignore-rules.md
// Run: npm run generate-ignore-rules
import type { ContentTableIgnoreRules } from '../../core/work/adapter'

export const CONTENT_TABLE_IGNORE_RULES: ContentTableIgnoreRules | null = null
`
    fs.writeFileSync(OUTPUT, emptyOutput, 'utf8')
    return
  }

  const content = fs.readFileSync(SOURCE, 'utf8')
  const lines = content.split('\n')

  const componentKeyDenylist = parseSection(lines, 'Component Key Denylist')
  const nodeNamePatterns = parseSection(lines, 'Node Name Patterns')
  const textValuePatterns = parseSection(lines, 'Text Value Patterns')
  const nodeIdPrefixes = parseSection(lines, 'Node ID Prefixes')

  const hasRules =
    componentKeyDenylist.length > 0 ||
    nodeNamePatterns.length > 0 ||
    textValuePatterns.length > 0 ||
    nodeIdPrefixes.length > 0

  const rulesObj = hasRules
    ? JSON.stringify({
        componentKeyDenylist: componentKeyDenylist.length > 0 ? componentKeyDenylist : undefined,
        nodeNamePatterns: nodeNamePatterns.length > 0 ? nodeNamePatterns : undefined,
        textValuePatterns: textValuePatterns.length > 0 ? textValuePatterns : undefined,
        nodeIdPrefixes: nodeIdPrefixes.length > 0 ? nodeIdPrefixes : undefined
      }, null, 2)
    : 'null'

  const output = `// AUTO-GENERATED — do not edit. Source: custom/content-table-ignore-rules.md
// Run: npm run generate-ignore-rules
import type { ContentTableIgnoreRules } from '../../core/work/adapter'

export const CONTENT_TABLE_IGNORE_RULES: ContentTableIgnoreRules | null = ${rulesObj}
`

  fs.writeFileSync(OUTPUT, output, 'utf8')
  console.log(`[generate-ignore-rules] wrote ${OUTPUT}`)
  if (hasRules) {
    console.log(`  componentKeyDenylist: ${componentKeyDenylist.length} entries`)
    console.log(`  nodeNamePatterns: ${nodeNamePatterns.length} patterns`)
    console.log(`  textValuePatterns: ${textValuePatterns.length} patterns`)
    console.log(`  nodeIdPrefixes: ${nodeIdPrefixes.length} prefixes`)
  } else {
    console.log('  No active rules parsed — CONTENT_TABLE_IGNORE_RULES = null')
  }
}

main()
```

- [ ] **Step 3: Run the script to generate the output file**

```bash
npx tsx scripts/generate-ignore-rules.ts
```

Expected output:
```
[generate-ignore-rules] wrote .../src/custom/generated/contentTableIgnoreRules.generated.ts
  componentKeyDenylist: 0 entries
  nodeNamePatterns: 9 patterns
  textValuePatterns: 1 patterns
  nodeIdPrefixes: 0 prefixes
```

Verify the generated file exists:

```bash
head -20 src/custom/generated/contentTableIgnoreRules.generated.ts
```

- [ ] **Step 4: Add `generate-ignore-rules` to `package.json`**

In `package.json`, add the new script to `"scripts"`:

```json
"generate-ignore-rules": "tsx scripts/generate-ignore-rules.ts",
```

Then update the `"prebuild"` script to include it. Find the `prebuild` line and add `npm run generate-ignore-rules &&` at the beginning:

```json
"prebuild": "npm run generate-ignore-rules && npm run build-assistants && npm run generate-assistants && ..."
```

(Prepend `npm run generate-ignore-rules &&` before `npm run build-assistants`.)

- [ ] **Step 5: Run build to verify integration**

```bash
npm run build
```

Expected: Build succeeds. The generated file is picked up by TypeScript compilation.

- [ ] **Step 6: Commit**

```bash
git add custom/content-table-ignore-rules.md scripts/generate-ignore-rules.ts src/custom/generated/contentTableIgnoreRules.generated.ts package.json
git commit -m "feat(ct-a): add human-editable ignore rules file with build-time parser"
```

---

### Task 6: Wire generated ignore rules into handler

**Files:**
- Modify: `src/assistants/evergreens/handler.ts`

- [ ] **Step 1: Import the generated ignore rules**

In `src/assistants/evergreens/handler.ts`, add this import after the existing imports (around line 22):

```typescript
import { CONTENT_TABLE_IGNORE_RULES } from '../../custom/generated/contentTableIgnoreRules.generated'
```

- [ ] **Step 2: Use generated rules as open-source fallback**

In `handler.ts`, find this existing line:

```typescript
const ignoreRules = workAdapter.getContentTableIgnoreRules?.() || null
```

Replace with:

```typescript
const ignoreRules = workAdapter.getContentTableIgnoreRules?.() || CONTENT_TABLE_IGNORE_RULES || null
```

This means:
1. If the Work adapter provides ignore rules, use them (highest priority).
2. Otherwise, if `custom/content-table-ignore-rules.md` produced rules, use those.
3. Otherwise, null (no filtering).

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/assistants/evergreens/handler.ts
git commit -m "feat(ct-a): use compiled ignore rules as open-source fallback in EG-A handler"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| Replace Date/time stamp exclusion rule with semantic tokenizer | Tasks 1, 3 |
| Disable standalone numeric exclusion | Task 3 (exclusionRules.ts Step 4) |
| Disable variableizeNumerics | Task 3 (exclusionRules.ts Step 4) |
| Date/time/datetime tokens with Excel format codes | Task 1 |
| Currency tokens with ISO codes | Task 1 |
| Delta-currency, delta-amount, delta-percent tokens | Task 1 |
| Email, phone tokens | Task 1 |
| Legal disclaimer detection → `{{LegalDisclosure}}` | Task 1 |
| Fixed named entity preserve list (S&P 500, 401(k), etc.) | Task 1 |
| Reversible tokenization — originals preserved in session | Task 2 |
| Revert per item in UI | Task 4 |
| Human-editable ignore rules file | Task 5 |
| Build-time compilation of ignore rules | Task 5 |
| Ignore rules used before semantic extraction | Task 6 (already true: scanner runs ignoreRules before tokenizer) |

### Not in scope (deferred)

- PersonName, Address, TickerSymbol tokens — require NLP or design context, planned for a future pass
- Tables/Charts structural extraction — requires scanner-level changes, separate plan
- `{{Year}}` partial tokenization — context-sensitive, deferred
- Reference numbers (`{{OrderNumber}}` etc.) — pattern too ambiguous without surrounding context
