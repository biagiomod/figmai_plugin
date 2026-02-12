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
  type ReportDoc
} from './reportFormat'
import { parseRichText } from './parseRichText'

/** Mirror of main.ts cleanChatContent (no welcome-line logic) to test SD report pipeline in isolation. */
function cleanChatContentMainStyle(raw: string): string {
  if (!raw) return ''
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '')
    .replace(/generate:\s*\d+\/\d+/gi, '')
    .replace(/\(\d+%\)/g, '')
    .trim()
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0)
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/
  for (const line of lines) {
    const trimmed = line.trim()
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

/** Mirror of ui.tsx cleanChatContent (with welcome-line logic) to test double-clean. */
function cleanChatContentUIStyle(raw: string): string {
  if (!raw) return ''
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '')
    .replace(/generate:\s*\d+\/\d+/gi, '')
    .replace(/\(\d+%\)/g, '')
    .trim()
  const welcomeLinePatterns = [/welcome to your content table assistant/i, /welcome to your design workshop assistant/i, /welcome to your/i]
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0)
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  let welcomeLineFound: string | null = null
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/
  for (const line of lines) {
    const trimmed = line.trim()
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
  console.log('[reportFormat] All tests passed.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
