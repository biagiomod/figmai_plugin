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
const TIME_24 = '([01]\\d|2[0-3]):(\\d{2})'
// Optional timezone suffix: ET, CT, MT, PT + daylight/standard variants, UTC, GMT, and 2-4 char zone codes
const TZ = '(?:\\s+(?:ET|CT|MT|PT|EST|CST|MST|PST|EDT|CDT|MDT|PDT|UTC|GMT|[A-Z]{2,4}))?'

// DateTime combos — short month, with year
const DT_S_HMM_AMPM = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_HMM_AMPM}${TZ}\\b`, 'gi')
const DT_S_24 = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_24}${TZ}\\b`, 'gi')
// DateTime combos — long month, with year
const DT_L_HMM_AMPM = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_HMM_AMPM}${TZ}\\b`, 'gi')
const DT_L_24 = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s+${TIME_24}${TZ}\\b`, 'gi')
// DateTime combos — short month, NO year (e.g. "Mar 7 1:15 PM ET")
const DT_S_NO_YEAR_HMM_AMPM = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s+${TIME_HMM_AMPM}${TZ}\\b`, 'gi')
// DateTime combos — long month, NO year (e.g. "March 7 1:15 PM ET")
const DT_L_NO_YEAR_HMM_AMPM = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s+${TIME_HMM_AMPM}${TZ}\\b`, 'gi')

// Individual dates
const DATE_DOW_L = new RegExp(`\\b(${DOW}),\\s+(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_L = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_S = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`, 'gi')
const DATE_ISO = /\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g
// Individual dates — NO year (e.g. "Mar 7", "March 7")
const DATE_L_NO_YEAR = new RegExp(`\\b(${MO_L})\\s+(\\d{1,2})\\b`, 'gi')
const DATE_S_NO_YEAR = new RegExp(`\\b(${MO_S})\\s+(\\d{1,2})\\b`, 'gi')

// Individual times (only after datetime combos have run)
const TIME_HMM_AMPM_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)\b/gi
const TIME_H_AMPM_RE = /\b(\d{1,2})\s+(AM|PM)\b/gi
// CRITICAL: require two-digit hours to avoid false positives on single-digit hours like "3:45"
const TIME_24_RE = /\b([01]\d|2[0-3]):([0-5]\d)\b/g

// ---------------------------------------------------------------------------
// Financial patterns
// ---------------------------------------------------------------------------

const NUM = '\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?'
const SYM_RE = '[$€£¥₹₩₿]'

// delta-currency: +$1,234.56  -€99
const DELTA_CCY_RE = new RegExp(`([+-])\\s*(${SYM_RE})\\s*(${NUM})`, 'g')
// plain currency: $1,234.56
const CCY_RE = new RegExp(`(${SYM_RE})\\s*(${NUM})`, 'g')
// COMBINED percent: handles both delta (+4.59%, -0.5%) and plain (4.59%) in a single pass
// to prevent re-matching digits inside already-produced {{DeltaPercent:...}} tokens
const COMBINED_PCT_RE = /([+-]?)(\d+(?:\.\d+)?)%/g
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
// Ticker patterns
//   $AAPL — dollar-prefixed (most common in mockups)
//   NYSE:AAPL / NASDAQ:TSLA — exchange-qualified
// ---------------------------------------------------------------------------

const TICKER_DOLLAR_RE = /\$([A-Z]{1,5})\b/g
const TICKER_EXCHANGE_RE = /\b(NYSE|NASDAQ|LSE|AMEX|TSX):([A-Z]{1,5})\b/g

// ---------------------------------------------------------------------------
// Account pattern: 1–4 title-case words followed by (...NNNN)
//   e.g. "Self-Directed (...6061)" | "Brokerage Account (...1234)"
// ---------------------------------------------------------------------------

const ACCOUNT_RE = /\b[A-Z][a-zA-Z-]*(?:\s+[A-Z][a-zA-Z-]*){0,3}\s+\(\.\.\.\d{4}\)/g

// ---------------------------------------------------------------------------
// All module-level stateful regexes (for lastIndex reset)
// ---------------------------------------------------------------------------

const ALL_REGEXES = [
  DT_S_HMM_AMPM, DT_S_24, DT_L_HMM_AMPM, DT_L_24,
  DT_S_NO_YEAR_HMM_AMPM, DT_L_NO_YEAR_HMM_AMPM,
  DATE_DOW_L, DATE_L, DATE_S, DATE_ISO, DATE_L_NO_YEAR, DATE_S_NO_YEAR,
  TIME_HMM_AMPM_RE, TIME_H_AMPM_RE, TIME_24_RE,
  TICKER_DOLLAR_RE, TICKER_EXCHANGE_RE,
  DELTA_CCY_RE, CCY_RE, COMBINED_PCT_RE, DELTA_AMT_RE, AMT_RE,
  ACCOUNT_RE,
  EMAIL_RE, PHONE_RE
]

// ---------------------------------------------------------------------------
// Replacement passes
// ---------------------------------------------------------------------------

function applyDateTimeCombos(s: string): string {
  // With-year patterns first so they win over no-year when year is present
  s = s.replace(DT_S_HMM_AMPM, () => '{{DateTime: mmm dd, yyyy h:mm AM/PM}}')
  s = s.replace(DT_S_24, () => '{{DateTime: mmm dd, yyyy hh:mm}}')
  s = s.replace(DT_L_HMM_AMPM, () => '{{DateTime: mmmm dd, yyyy h:mm AM/PM}}')
  s = s.replace(DT_L_24, () => '{{DateTime: mmmm dd, yyyy hh:mm}}')
  // No-year combos (e.g. "Mar 7 1:15 PM ET" — timezone absorbed)
  s = s.replace(DT_S_NO_YEAR_HMM_AMPM, () => '{{DateTime: mmm d, h:mm AM/PM}}')
  s = s.replace(DT_L_NO_YEAR_HMM_AMPM, () => '{{DateTime: mmmm d, h:mm AM/PM}}')
  return s
}

function applyDates(s: string): string {
  s = s.replace(DATE_DOW_L, () => '{{Date: [$-x-sysdate]dddd, mmmm dd, yyyy}}')
  s = s.replace(DATE_L, () => '{{Date: mmmm dd, yyyy}}')
  s = s.replace(DATE_S, () => '{{Date: mmm dd, yyyy}}')
  s = s.replace(DATE_ISO, () => '{{Date: yyyy-mm-dd}}')
  // No-year dates (run after with-year so they don't match the day portion of a full date)
  s = s.replace(DATE_L_NO_YEAR, () => '{{Date: mmmm d}}')
  s = s.replace(DATE_S_NO_YEAR, () => '{{Date: mmm d}}')
  return s
}

function applyTimes(s: string): string {
  s = s.replace(TIME_HMM_AMPM_RE, () => '{{Time: h:mm AM/PM}}')
  s = s.replace(TIME_H_AMPM_RE, () => '{{Time: h AM/PM}}')
  s = s.replace(TIME_24_RE, () => '{{Time: hh:mm}}')
  return s
}

function applyFinancial(s: string): string {
  // Tickers first: $AAPL uses $ sign — must run before CCY_RE which also matches $
  s = s.replace(TICKER_DOLLAR_RE, () => '{{Ticker}}')
  s = s.replace(TICKER_EXCHANGE_RE, () => '{{Ticker}}')
  s = s.replace(DELTA_CCY_RE, (_m, _sign, sym, num) =>
    `{{DeltaCurrency:${symbolToIso(sym)}:+${numFmt(num)};-${numFmt(num)}}}`
  )
  s = s.replace(CCY_RE, (_m, sym, num) =>
    `{{Currency:${symbolToIso(sym)}:${numFmt(num)}}}`
  )
  // COMBINED: single pass for delta+plain percent to avoid re-matching inside produced tokens
  s = s.replace(COMBINED_PCT_RE, (_m, sign, num) => {
    const fmt = hasDecimal(num) ? '0.00' : '0'
    if (sign === '+' || sign === '-') {
      return `{{DeltaPercent:+${fmt}%;-${fmt}%}}`
    }
    return `{{Percent:${fmt}%}}`
  })
  s = s.replace(DELTA_AMT_RE, (_m, _sign, num) =>
    `{{Delta:+${numFmt(num)};-${numFmt(num)}}}`
  )
  s = s.replace(AMT_RE, (_m, num) =>
    `{{Amount:${numFmt(num)}}}`
  )
  return s
}

function applyContact(s: string): string {
  s = s.replace(ACCOUNT_RE, () => '{{Account}}')
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
  ALL_REGEXES.forEach(re => { re.lastIndex = 0 })

  let result = text
  result = applyDateTimeCombos(result)
  result = applyDates(result)
  result = applyTimes(result)
  result = applyFinancial(result)
  result = applyContact(result)

  return { value: result, changed: result !== text }
}
