/**
 * Smart Detector unit tests (mock nodes, no Figma runtime).
 * Run: npx tsx src/core/detection/smartDetector/smartDetector.test.ts
 */

import assert from 'node:assert'
import { parseNameTokens } from '../../assistants/handlers/contentReview'
import { traverseSelection } from './traversal'
import { classifyContent } from './contentClassifier'

// ---- Tokenization / name rules (reuse parseNameTokens from contentReview) ----
function test_parseNameTokens() {
  assert.deepStrictEqual(parseNameTokens('Icon_Book Queue'), ['icon', 'book', 'queue'])
  assert.deepStrictEqual(parseNameTokens('PrimaryButton'), ['primary', 'button'])
  assert.deepStrictEqual(parseNameTokens(''), [])
}

function matchNameKindRules(name: string, rules: Array<{ contains: string[]; kind: string }>): string | undefined {
  const lower = name.toLowerCase()
  for (const rule of rules) {
    if (!Array.isArray(rule.contains)) continue
    const all = rule.contains.every(t => lower.includes(String(t).toLowerCase()))
    if (all && rule.kind) return rule.kind
  }
  return undefined
}

function test_nameKindRules_matching() {
  const rules: Array<{ contains: string[]; kind: string }> = [
    { contains: ['icon', 'button'], kind: 'icon_button' },
    { contains: ['button'], kind: 'button' }
  ]
  assert.strictEqual(matchNameKindRules('Primary Button', rules), 'button')
  assert.strictEqual(matchNameKindRules('Icon Button', rules), 'icon_button')
  assert.strictEqual(matchNameKindRules('IconButton', rules), 'icon_button')
  assert.strictEqual(matchNameKindRules('Link', rules), undefined)
}

// ---- Traversal (mock nodes) ----
function test_traverseSelection_visibility_and_cap() {
  const root = {
    id: 'root',
    type: 'FRAME',
    name: 'Frame',
    visible: true,
    children: [
      {
        id: 'c1',
        type: 'FRAME',
        name: 'Child1',
        visible: true,
        children: []
      },
      {
        id: 'c2',
        type: 'TEXT',
        name: 'Label',
        visible: true,
        characters: 'Hello'
      }
    ]
  }
  const result = traverseSelection([root as unknown as SceneNode], 10)
  assert.strictEqual(result.inspectable.length >= 1, true)
  assert.strictEqual(result.textNodes.length >= 1, true)
  assert.strictEqual(result.capped, false)
}

// ---- Content classifier: role -> ContentKind ----
function test_classifyContent_role_mapping() {
  const nodes = [
    { id: '1', name: 'Headline', characters: 'Welcome' },
    { id: '2', name: 'Body', characters: 'Some body text' },
    { id: '3', name: 'CTA', characters: 'Submit' },
    { id: '4', name: 'Helper', characters: 'Optional field' },
    { id: '5', name: 'Error', characters: 'Invalid input' }
  ] as TextNode[]
  const result = classifyContent(nodes)
  assert.strictEqual(result.length, 5)
  assert.strictEqual(result[0].contentKind, 'heading_copy')
  assert.strictEqual(result[1].contentKind, 'body_copy')
  assert.strictEqual(result[2].contentKind, 'cta_copy')
  assert.strictEqual(result[3].contentKind, 'helper_copy')
  assert.strictEqual(result[4].contentKind, 'error_copy')
}

function test_classifyContent_placeholder_like() {
  const nodes = [
    { id: '1', name: 'Field', characters: '12345' },
    { id: '2', name: 'Field', characters: '{name}' }
  ] as TextNode[]
  const result = classifyContent(nodes)
  assert.strictEqual(result.length, 2)
  assert.strictEqual(result[0].contentKind, 'variable_placeholder')
  assert.strictEqual(result[1].contentKind, 'variable_placeholder')
}

async function main() {
  test_parseNameTokens()
  test_nameKindRules_matching()
  test_traverseSelection_visibility_and_cap()
  test_classifyContent_role_mapping()
  test_classifyContent_placeholder_like()
  console.log('[smartDetector] All tests passed.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
