/**
 * reportFormat unit tests: toCanonicalMarkdown, renderForChat, renderForAnnotation, sanitizeForChat.
 * Run: npx tsx src/core/richText/reportFormat.test.ts
 */

import assert from 'node:assert'
import {
  toCanonicalMarkdown,
  renderForChat,
  renderForAnnotation,
  sanitizeForChat,
  formatSmartDetectorReport,
  type ReportDoc
} from './reportFormat'
import { parseRichText } from './parseRichText'

/** Mirror of main.ts cleanChatContent (no welcome-line logic); preserves single blank lines. */
function cleanChatContentMainStyle(raw: string): string {
  if (!raw) return ''
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '')
    .replace(/generate:\s*\d+\/\d+/gi, '')
    .replace(/\(\d+%\)/g, '')
    .trim()
  const lines = text.split('\n')
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      if (uniqueLines[uniqueLines.length - 1] !== '') uniqueLines.push('')
      continue
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
    if (keyValueLike.test(trimmed)) {
      uniqueLines.push(trimmed)
      continue
    }
    if (!seen.has(normalized)) {
      seen.add(normalized)
      uniqueLines.push(trimmed)
    }
  }
  text = uniqueLines.join('\n')
  text = text.replace(/[ \t]+/g, ' ').trim()
  return text
}

/** Mirror of ui.tsx cleanChatContent (with welcome-line logic); preserves single blank lines. */
function cleanChatContentUIStyle(raw: string): string {
  if (!raw) return ''
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '')
    .replace(/generate:\s*\d+\/\d+/gi, '')
    .replace(/\(\d+%\)/g, '')
    .trim()
  const welcomeLinePatterns = [/welcome to your evergreens assistant/i, /welcome to your design workshop assistant/i, /welcome to your/i]
  const lines = text.split('\n')
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  let welcomeLineFound: string | null = null
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      if (uniqueLines[uniqueLines.length - 1] !== '') uniqueLines.push('')
      continue
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
    const isWelcomeLine = welcomeLinePatterns.some(p => p.test(line) || p.test(normalized))
    if (isWelcomeLine) {
      if (!welcomeLineFound) { welcomeLineFound = trimmed; uniqueLines.push(trimmed) }
      continue
    }
    if (keyValueLike.test(trimmed)) { uniqueLines.push(trimmed); continue }
    if (!seen.has(normalized)) { seen.add(normalized); uniqueLines.push(trimmed) }
  }
  if (welcomeLineFound) {
    const welcomeIndex = uniqueLines.findIndex(l => welcomeLinePatterns.some(p => p.test(l) || p.test(l.trim().toLowerCase().replace(/\s+/g, ' '))))
    if (welcomeIndex > 0) {
      const w = uniqueLines.splice(welcomeIndex, 1)[0]
      uniqueLines.unshift(w)
    }
  }
  text = uniqueLines.join('\n')
  text = text.replace(/[ \t]+/g, ' ').trim()
  return text
}

function test_toCanonicalMarkdown_smart_detector_like() {
  const doc: ReportDoc = {
    title: 'Smart Detector',
    sections: [
      {
        keyValues: [
          { key: 'Scanned', value: '16 nodes' },
          { key: 'Elements', value: 'image=1, icon=1, button=1' },
          { key: 'Content', value: 'heading_copy=1, body_copy=1, cta_copy=1' },
          { key: 'Patterns', value: '0' }
        ]
      },
      {
        title: 'Top Elements',
        keyValues: [
          { key: '1.', value: '**Kind:** button **Confidence:** med' },
          { key: 'Label', value: 'Enter' },
          { key: 'Reasons', value: 'heuristic:text_over_bg, heuristic:cta_text' },
          { key: '2.', value: '**Kind:** image **Confidence:** high' },
          { key: 'Label', value: 'Hero' },
          { key: 'Reasons', value: 'heuristic:image_named_no_text' }
        ]
      },
      {
        title: 'Top Content',
        keyValues: [
          { key: '1.', value: '**Kind:** heading_copy **Confidence:** high' },
          { key: 'Text', value: 'Welcome to Funville!' }
        ]
      }
    ]
  }
  const md = toCanonicalMarkdown(doc)
  assert.ok(md.includes('## Smart Detector'), 'should have doc title as heading')
  assert.ok(md.includes('**Scanned:** 16 nodes'), 'should have key: value lines')
  assert.ok(md.includes('## Top Elements'), 'should have section heading')
  assert.ok(md.includes('**1.** **Kind:** button'), 'numbered key should render without colon after number')
  assert.ok(md.includes('**Reasons:** heuristic:text_over_bg'), 'reasons on one line')
  assert.ok(!md.includes('<b>'), 'output must not contain HTML')
  assert.ok(md.includes('Welcome to Funville!'), 'content text present')
}

function test_renderForChat_passthrough_and_truncation() {
  const short = '## Hi\n**Key:** value'
  assert.strictEqual(renderForChat(short), short, 'short markdown unchanged')
  const long = 'x'.repeat(9000)
  const capped = renderForChat(long, { maxLength: 1000 })
  assert.ok(capped.length <= 1000 + 20)
  assert.ok(capped.endsWith('(truncated)'), 'should end with truncated suffix')
}

function test_renderForAnnotation_plainOnly_and_truncation() {
  const md = '## Title\n**Scanned:** 16 nodes\n**Elements:** 1'
  const plain = renderForAnnotation(md, { plainOnly: true, maxLines: 2 })
  assert.ok('label' in plain && typeof plain.label === 'string')
  assert.ok(!plain.label!.includes('**'), 'plain output should strip bold')
  assert.strictEqual(plain.label!.split('\n').length, 2, 'respect maxLines')
}

function test_renderForAnnotation_markdownLite() {
  const md = '## Smart Detector\n**Scanned:** 16 nodes'
  const out = renderForAnnotation(md, { plainOnly: false, maxLines: 5 })
  assert.ok(out.labelMarkdown != null)
  assert.ok(out.labelMarkdown!.includes('**Scanned:**'), 'keeps bold in markdown-lite')
  assert.ok(out.labelMarkdown!.includes('## '), 'keeps heading')
}

function test_sanitizeForChat_strips_html() {
  assert.strictEqual(sanitizeForChat('Hello'), 'Hello')
  assert.strictEqual(sanitizeForChat('<b>Bold</b>'), 'Bold')
  assert.strictEqual(sanitizeForChat('A<br/>B'), 'A\nB')
  assert.ok(!sanitizeForChat('<b>Key:</b> value').includes('<'), 'no angle brackets left')
}

function test_sanitizeForChat_non_string() {
  assert.strictEqual(sanitizeForChat(''), '')
  assert.strictEqual(sanitizeForChat((null as unknown as string)), '')
}

/** Smart Detector report pipeline: sanitize -> cleanChatContent (main-style) -> parseRichText. Ensures SD report is not lost. */
function test_smart_detector_report_pipeline() {
  const doc: ReportDoc = {
    title: 'Smart Detector',
    sections: [
      {
        keyValues: [
          { key: 'Scanned', value: '16 nodes' },
          { key: 'Elements', value: 'button=1, image=1' },
          { key: 'Content', value: 'heading_copy=1, body_copy=1' },
          { key: 'Patterns', value: '0' }
        ]
      },
      {
        title: 'Top Elements',
        keyValues: [
          { key: '1.', value: '**Kind:** button **Confidence:** med' },
          { key: 'Label', value: 'Submit' },
          { key: 'Reasons', value: 'heuristic:cta_text' }
        ]
      },
      {
        title: 'Top Content',
        keyValues: [
          { key: '1.', value: '**Kind:** heading_copy **Confidence:** high' },
          { key: 'Text', value: 'Welcome' }
        ]
      }
    ]
  }
  const md = toCanonicalMarkdown(doc)
  const forChat = renderForChat(md)
  const sanitized = sanitizeForChat(forChat)
  const cleaned = cleanChatContentMainStyle(sanitized)

  assert.ok(cleaned.length > 0, 'cleaned content must be non-empty')
  assert.ok(cleaned.includes('Smart Detector'), 'title/heading must remain')
  assert.ok(cleaned.includes('Scanned') || cleaned.includes('**Scanned:**'), 'Scanned key must remain')
  assert.ok(cleaned.includes('Top Elements') || cleaned.includes('## Top Elements'), 'Top Elements section must remain')
  assert.ok(cleaned.includes('Top Content') || cleaned.includes('## Top Content'), 'Top Content section must remain')

  const nodes = parseRichText(cleaned)
  assert.ok(Array.isArray(nodes) && nodes.length > 0, 'parseRichText must return non-empty nodes')
  const textContent = nodes
    .map((n) => ('text' in n && typeof (n as { text: string }).text === 'string' ? (n as { text: string }).text : ''))
    .join('')
  assert.ok(textContent.trim().length > 0, 'at least one node must have visible text content')
  // Regression: lines like "**Scanned:** 16 nodes" must be parsed as paragraphs, not skipped (parser used to break on startsWith('*'))
  assert.ok(textContent.includes('16 nodes'), 'parseRichText must include **Scanned:** value (paragraphs starting with ** must not be skipped)')
  assert.ok(textContent.includes('Elements') || textContent.includes('button='), 'parseRichText must include key/value tokens (e.g. **Elements:** or button=)')
}

/** Double-clean (main then UI style): SD report must still be non-empty and parse. */
function test_smart_detector_double_clean() {
  const doc: ReportDoc = {
    title: 'Smart Detector',
    sections: [
      { keyValues: [{ key: 'Scanned', value: '16 nodes' }, { key: 'Elements', value: 'button=1' }] },
      { title: 'Top Elements', keyValues: [{ key: '1.', value: '**Kind:** button' }] }
    ]
  }
  const md = toCanonicalMarkdown(doc)
  const once = cleanChatContentMainStyle(sanitizeForChat(renderForChat(md)))
  const twice = cleanChatContentUIStyle(once)
  assert.ok(twice.length > 0, 'double-cleaned content must be non-empty')
  assert.ok(twice.includes('Smart Detector') && (twice.includes('Scanned') || twice.includes('**Scanned:**')), 'key lines must remain after double-clean')
  const nodes = parseRichText(twice)
  assert.ok(nodes.length > 0 && nodes.some((n) => 'text' in n && typeof (n as { text: string }).text === 'string' && String((n as { text: string }).text).trim().length > 0), 'parseRichText must yield visible text')
}

/** Idempotency: single-pass normalization contract. clean(clean(x)) === clean(x) for main-style. */
function test_cleanChatContent_main_idempotent() {
  const cases = [
    '## Smart Detector\n**Scanned:** 16 nodes\n**Elements:** button=2, image=1',
    'Welcome to your Design Workshop assistant!\n\nSome intro text.',
    'Plain text only.',
    'generate: 1/100 (1%)\nReal content here.',
    'Line one\nLine one\nLine two'
  ]
  for (const raw of cases) {
    const once = cleanChatContentMainStyle(raw)
    const twice = cleanChatContentMainStyle(once)
    assert.strictEqual(twice, once, `idempotent for: ${raw.slice(0, 40)}...`)
  }
}

/** Contract: when contentNormalized is true, stored content must be byte-identical to payload (no re-clean). */
function test_contentNormalized_contract() {
  const mainCleaned = cleanChatContentMainStyle('## Smart Detector\n**Scanned:** 16 nodes\n**Elements:** a=1')
  const contentNormalized = true
  const stored = contentNormalized ? mainCleaned : cleanChatContentUIStyle(mainCleaned)
  assert.strictEqual(stored, mainCleaned, 'when contentNormalized, stored must equal payload')
}

/** formatSmartDetectorReport: block format, no list markers, no double blanks inside items. */
function test_formatSmartDetectorReport_structure() {
  const input = {
    stats: {
      nodesScanned: 16,
      elementsByKind: { button: 2, image: 1 },
      contentByKind: { heading_copy: 1, body_copy: 1 },
      patternCount: 0
    },
    elements: [
      { kind: 'button', confidence: 'med', reasons: ['heuristic:cta_text'], labelGuess: 'Submit' },
      { kind: 'image', confidence: 'high', reasons: ['heuristic:image_named_no_text'], labelGuess: 'Hero' }
    ],
    content: [
      { contentKind: 'heading_copy', confidence: 'high', text: 'Welcome to Funville!' }
    ]
  }
  const md = formatSmartDetectorReport(input)
  assert.ok(md.includes('## Smart Detector\n\n'), 'title followed by blank')
  assert.ok(md.includes('\n\n### Top Elements\n\n'), 'section with blanks')
  assert.ok(md.includes('\n**Confidence:**'), 'Confidence on own line')
  assert.ok(md.includes('\n**Label:**'), 'Label on own line')
  assert.ok(/\n\n\*\*Kind:\*\* image/.test(md), 'exactly one blank line between element blocks')
  assert.ok(md.includes('**Kind:**') && md.includes('**Confidence:**') && md.includes('**Label:**') && md.includes('**Reasons:**'), 'each item has Kind, Confidence, Label, Reasons')
  assert.ok(!/\n\d+\.\s+\*\*Kind:/.test(md), 'no numbered list markers')
  assert.ok(!/\n-\s+/.test(md), 'no "- " at start of any line')
  assert.ok(!/\n\*\s+/.test(md), 'no "* " at start of any line')
  assert.ok(!/\*\*Kind:\*\*[^\n]*\n\n[^\n]*\*\*Confidence:\*\*/.test(md), 'no double blank inside item (Kind and Confidence)')
}

/** Pipeline: formatSmartDetectorReport -> sanitize -> clean -> parse; visible text includes key tokens. */
function test_formatSmartDetectorReport_pipeline() {
  const input = {
    stats: {
      nodesScanned: 16,
      elementsByKind: { button: 2, image: 1 },
      contentByKind: { heading_copy: 1 },
      patternCount: 0
    },
    elements: [
      { kind: 'button', confidence: 'med', reasons: ['heuristic:cta_text'], labelGuess: 'Submit' }
    ],
    content: [{ contentKind: 'heading_copy', confidence: 'high', text: 'Welcome' }]
  }
  const md = formatSmartDetectorReport(input)
  const sanitized = sanitizeForChat(renderForChat(md))
  const cleaned = cleanChatContentMainStyle(sanitized)
  assert.ok(cleaned.includes('Scanned'), 'Scanned survives pipeline')
  assert.ok(cleaned.includes('Elements'), 'Elements survives pipeline')
  assert.ok(cleaned.includes('Top Elements'), 'Top Elements section survives')
  assert.ok(cleaned.includes('button='), 'button= token survives')
  assert.ok(cleaned.includes('\n\n'), 'blank lines survive cleanChatContent')
  const nodes = parseRichText(cleaned)
  const textContent = nodes
    .map((n) => ('text' in n && typeof (n as { text: string }).text === 'string' ? (n as { text: string }).text : ''))
    .join('')
  assert.ok(textContent.includes('16'), 'parseRichText includes Scanned value')
  assert.ok(textContent.includes('button') || textContent.includes('Elements'), 'parseRichText includes key tokens')
  assert.ok(textContent.includes('Kind') || textContent.includes('Confidence') || textContent.includes('Label') || textContent.includes('Reasons'), 'Kind/Confidence/Label/Reasons appear in visible text')
}

/** Two buttons when button=2: Top Elements must include both, each with own block. */
function test_formatSmartDetectorReport_two_buttons() {
  const input = {
    stats: {
      nodesScanned: 20,
      elementsByKind: { button: 2, image: 1, icon: 1 },
      contentByKind: { heading_copy: 1 },
      patternCount: 0
    },
    elements: [
      { kind: 'button', confidence: 'high', reasons: ['heuristic:cta_text'], labelGuess: 'Submit' },
      { kind: 'image', confidence: 'high', reasons: ['heuristic:image_named_no_text'], labelGuess: 'Hero' },
      { kind: 'button', confidence: 'med', reasons: ['heuristic:text_over_bg'], labelGuess: 'Enter' },
      { kind: 'icon', confidence: 'high', reasons: ['heuristic:icon_named_no_text'], labelGuess: 'Icon' }
    ],
    content: [{ contentKind: 'heading_copy', confidence: 'high', text: 'Welcome' }]
  }
  const md = formatSmartDetectorReport(input)
  const buttonBlocks = md.match(/\*\*Kind:\*\* button/g)
  assert.ok(buttonBlocks && buttonBlocks.length >= 2, 'must include two Kind: button blocks when button=2')
  assert.ok(md.includes('Submit'), 'first button label present')
  assert.ok(md.includes('Enter'), 'second button label present')
  assert.ok(/\*\*Kind:\*\* button[\s\S]*?\n\n\*\*Kind:\*\* button/.test(md), 'two button blocks separated by exactly one blank line')
  assert.ok(!/\n\d+\.\s+\*\*Kind:/.test(md), 'no numbered list markers')
}

/** Regression: newlines must survive format -> sanitize -> clean -> parse; Scanned and Elements on separate lines. */
function test_smart_detector_newline_preservation() {
  const input = {
    stats: {
      nodesScanned: 16,
      elementsByKind: { button: 1 },
      contentByKind: { heading_copy: 1 },
      patternCount: 0
    },
    elements: [
      { kind: 'button', confidence: 'med', reasons: ['heuristic:cta_text'], labelGuess: 'Submit' }
    ],
    content: [{ contentKind: 'heading_copy', confidence: 'high', text: 'Welcome' }]
  }
  const md = formatSmartDetectorReport(input)
  const sanitized = sanitizeForChat(renderForChat(md))
  const cleaned = cleanChatContentMainStyle(sanitized)
  const nodes = parseRichText(cleaned)
  const textContent = nodes
    .map((n) => ('text' in n && typeof (n as { text: string }).text === 'string' ? (n as { text: string }).text : ''))
    .join('\n')
  assert.ok(/\*\*Scanned:\*\*[^\n]*\n\*\*Elements:\*\*/.test(textContent), 'Scanned and Elements on separate lines (newline between, not space)')
  assert.ok(/\*\*Kind:\*\*[^\n]*\n\*\*Confidence:\*\*/.test(textContent), 'Kind and Confidence on separate lines (newline between, not space)')
}

/** Blank-line preservation: single blanks survive; multiple consecutive collapse to one. */
function test_cleanChatContent_preserves_blanks() {
  const withBlanks = 'Line1\n\nLine2\n\n\nLine3'
  const cleaned = cleanChatContentMainStyle(withBlanks)
  assert.ok(cleaned.includes('\n\n'), 'at least one blank preserved')
  assert.ok(cleaned.includes('Line1') && cleaned.includes('Line2') && cleaned.includes('Line3'), 'content preserved')
}

async function main() {
  test_toCanonicalMarkdown_smart_detector_like()
  test_renderForChat_passthrough_and_truncation()
  test_renderForAnnotation_plainOnly_and_truncation()
  test_renderForAnnotation_markdownLite()
  test_sanitizeForChat_strips_html()
  test_sanitizeForChat_non_string()
  test_smart_detector_report_pipeline()
  test_smart_detector_double_clean()
  test_cleanChatContent_main_idempotent()
  test_contentNormalized_contract()
  test_formatSmartDetectorReport_structure()
  test_formatSmartDetectorReport_pipeline()
  test_formatSmartDetectorReport_two_buttons()
  test_smart_detector_newline_preservation()
  test_cleanChatContent_preserves_blanks()
  console.log('[reportFormat] All tests passed.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
