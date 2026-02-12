/**
 * Smart Detector unit tests (mock nodes, no Figma runtime).
 * Run: npx tsx src/core/detection/smartDetector/smartDetector.test.ts
 */

import assert from 'node:assert'
import { parseNameTokens } from '../../assistants/handlers/contentReview'
import { traverseSelection } from './traversal'
import { classifyContent } from './contentClassifier'
import { classifyElements } from './elementClassifier'

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

// ---- Element classifier: geometry, plausibility, DS, invariant ----
const emptyConfig = { componentKindMap: {}, nameKindRules: [] }

async function test_classifyElements_geometry_nodes_yield_no_elements() {
  const nodes = [
    { id: 'v1', type: 'VECTOR', name: 'union', visible: true },
    { id: 'r1', type: 'RECTANGLE', name: 'rounded rectangle', visible: true }
  ].map(n => n as unknown as SceneNode)
  const result = await classifyElements(nodes, { configOverride: emptyConfig })
  assert.strictEqual(result.length, 0, 'geometry nodes with no signal should not be emitted')
}

async function test_classifyElements_icon_heuristic_emits_with_reasons() {
  const nodes = [
    { id: 'i1', type: 'FRAME', name: 'Icon_Book Queue', visible: true, children: [] }
  ].map(n => n as unknown as SceneNode)
  const result = await classifyElements(nodes, { configOverride: emptyConfig })
  assert.strictEqual(result.length, 1, 'icon heuristic should emit one element')
  assert.strictEqual(result[0].kind, 'icon')
  assert.ok(result[0].reasons.length >= 1, 'icon element must have at least one reason')
}

async function test_classifyElements_image_heuristic_emits_with_reasons() {
  const nodes = [
    { id: 'im1', type: 'FRAME', name: 'Hero Image', visible: true, children: [] }
  ].map(n => n as unknown as SceneNode)
  const result = await classifyElements(nodes, { configOverride: emptyConfig })
  assert.strictEqual(result.length, 1, 'image heuristic should emit one element')
  assert.strictEqual(result[0].kind, 'image')
  assert.ok(result[0].reasons.length >= 1, 'image element must have at least one reason')
}

async function test_classifyElements_name_rule_rectangle_no_text_skipped() {
  const nodes = [
    { id: 'btn1', type: 'RECTANGLE', name: 'btn_bg', visible: true }
  ].map(n => n as unknown as SceneNode)
  const result = await classifyElements(nodes, {
    configOverride: { nameKindRules: [{ contains: ['btn'], kind: 'button' }] }
  })
  assert.strictEqual(result.length, 0, 'name-rule match on RECTANGLE with no text/instance should be skipped (not plausible)')
}

async function test_classifyElements_name_rule_instance_emitted() {
  const instanceNode = {
    id: 'inst1',
    type: 'INSTANCE',
    name: 'Primary Button',
    visible: true,
    getMainComponentAsync: async () => ({ name: 'SomeComponent' })
  } as unknown as SceneNode
  const result = await classifyElements([instanceNode], {
    configOverride: { nameKindRules: [{ contains: ['button'], kind: 'button' }] }
  })
  assert.ok(result.length >= 1, 'name-rule match on INSTANCE (plausible) should emit')
  assert.strictEqual(result[0].kind, 'button')
  assert.ok(result[0].reasons.length >= 1)
}

async function test_classifyElements_name_rule_node_with_text_child_emitted() {
  const nodeWithText = {
    id: 'f1',
    type: 'FRAME',
    name: 'Primary Button',
    visible: true,
    children: [
      { id: 't1', type: 'TEXT', name: 'Label', visible: true, characters: 'Submit' }
    ]
  } as unknown as SceneNode
  const result = await classifyElements([nodeWithText], {
    configOverride: { nameKindRules: [{ contains: ['button'], kind: 'button' }] }
  })
  assert.strictEqual(result.length, 1, 'name-rule + visible TEXT child (plausible) should emit')
  assert.strictEqual(result[0].kind, 'button')
  assert.ok(result[0].reasons.length >= 1)
}

async function test_classifyElements_ds_mapping_wins_with_reason() {
  const instanceNode = {
    id: 'ds1',
    type: 'INSTANCE',
    name: 'Instance',
    visible: true,
    getMainComponentAsync: async () => ({ name: 'Button' })
  } as unknown as SceneNode
  const result = await classifyElements([instanceNode], {
    configOverride: { componentKindMap: { Button: 'button' }, nameKindRules: [] }
  })
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].kind, 'button')
  assert.ok(
    result[0].reasons.some(r => r.startsWith('ds:')),
    'DS mapping should add ds:* reason'
  )
  assert.ok(result[0].reasons.length >= 1)
}

async function test_classifyElements_invariant_reasons_length() {
  const mixed = [
    { id: 'i1', type: 'FRAME', name: 'Icon_Close', visible: true, children: [] },
    { id: 'im1', type: 'FRAME', name: 'Avatar', visible: true, children: [] }
  ].map(n => n as unknown as SceneNode)
  const result = await classifyElements(mixed, { configOverride: emptyConfig })
  for (const e of result) {
    assert.ok(e.reasons.length >= 1, `invariant: every emitted element must have reasons.length >= 1, got ${e.reasons.length} for kind=${e.kind}`)
  }
}

// ---- Button / link structural heuristics (v1.1) ----
async function test_classifyElements_button_structural_emits_with_reasons() {
  const textChild = {
    id: 't1',
    type: 'TEXT',
    name: 'Label',
    visible: true,
    characters: 'Enter',
    absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 20 }
  } as unknown as SceneNode
  const rectChild = {
    id: 'r1',
    type: 'RECTANGLE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 }
  } as unknown as SceneNode
  const frame = {
    id: 'f1',
    type: 'FRAME',
    name: 'Btn',
    visible: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
    children: [rectChild, textChild]
  } as unknown as SceneNode
  const result = await classifyElements([frame], { configOverride: emptyConfig })
  assert.ok(result.length >= 1, 'button structural (FRAME + RECT + TEXT with padding) should emit')
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(buttonEl, 'should emit element with kind button')
  assert.ok(
    buttonEl!.reasons.some(r => r === 'heuristic:text_over_bg'),
    'reasons should include heuristic:text_over_bg'
  )
  assert.ok(buttonEl!.reasons.length >= 1)
  assert.strictEqual(buttonEl!.labelGuess, 'Enter')
}

async function test_classifyElements_button_reject_big_paragraph() {
  const textChild = {
    id: 't1',
    type: 'TEXT',
    name: 'Body',
    visible: true,
    characters: 'This is a long paragraph that should not be classified as a button because it has way too many characters and would fail the short text check.',
    absoluteBoundingBox: { x: 10, y: 10, width: 200, height: 80 }
  } as unknown as SceneNode
  const rectChild = {
    id: 'r1',
    type: 'RECTANGLE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 220, height: 100 }
  } as unknown as SceneNode
  const frame = {
    id: 'f1',
    type: 'FRAME',
    name: 'Card',
    visible: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 220, height: 100 },
    children: [rectChild, textChild]
  } as unknown as SceneNode
  const result = await classifyElements([frame], { configOverride: emptyConfig })
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(!buttonEl, 'FRAME with long paragraph + bg should NOT emit button (text too long)')
}

async function test_classifyElements_link_heuristic_name_contains_link() {
  const textNode = {
    id: 'link1',
    type: 'TEXT',
    name: 'Terms link',
    visible: true,
    characters: 'Terms & Conditions'
  } as unknown as TextNode
  const result = await classifyElements([], {
    configOverride: emptyConfig,
    textNodesForLinks: [textNode]
  })
  assert.ok(result.length >= 1, 'TEXT with name containing "link" should emit link')
  const linkEl = result.find(e => e.kind === 'link')
  assert.ok(linkEl, 'should emit element with kind link')
  assert.ok(
    linkEl!.reasons.some(r => r === 'name:contains_link' || r === 'heuristic:text_link_candidate'),
    'reasons should include link-related reason'
  )
  assert.strictEqual(linkEl!.labelGuess, 'Terms & Conditions')
}

/** Containment: nested label text inside a button must NOT be emitted as a separate link element. */
async function test_classifyElements_nested_label_in_button_suppressed_as_link() {
  const textChild = {
    id: 't1',
    type: 'TEXT',
    name: 'Terms link',
    visible: true,
    characters: 'Terms & Conditions',
    absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 20 },
    parent: null as BaseNode | null
  } as unknown as TextNode
  const rectChild = {
    id: 'r1',
    type: 'RECTANGLE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 }
  } as unknown as SceneNode
  const frame = {
    id: 'f1',
    type: 'FRAME',
    name: 'Btn',
    visible: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
    children: [rectChild, textChild]
  } as unknown as SceneNode
  ;(textChild as unknown as { parent: BaseNode | null }).parent = frame
  const result = await classifyElements([frame], {
    configOverride: emptyConfig,
    textNodesForLinks: [textChild]
  })
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(buttonEl, 'button container should emit button element')
  const linkEl = result.find(e => e.kind === 'link')
  assert.ok(!linkEl, 'TEXT inside button must NOT be emitted as separate link (nested label suppressed)')
}

/** Standalone hyperlink text (not inside a button) must still emit link. */
async function test_classifyElements_standalone_link_emitted() {
  const textNode = {
    id: 'standalone',
    type: 'TEXT',
    name: 'Standalone link',
    visible: true,
    characters: 'Learn more',
    parent: null
  } as unknown as TextNode
  const result = await classifyElements([], {
    configOverride: emptyConfig,
    textNodesForLinks: [textNode]
  })
  const linkEl = result.find(e => e.kind === 'link')
  assert.ok(linkEl, 'standalone CTA-like text with no button ancestor should emit link')
}

/** Invariant: no TEXT node is ever emitted as button (only containers from inspectable). */
async function test_classifyElements_text_never_emitted_as_button() {
  const textNode = {
    id: 'heading1',
    type: 'TEXT',
    name: 'Heading',
    visible: true,
    characters: 'Welcome'
  } as unknown as TextNode
  const result = await classifyElements([], { configOverride: emptyConfig, textNodesForLinks: [textNode] })
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(!buttonEl, 'TEXT nodes must never be emitted as button (only link or not emitted)')
}

/** Heading-like text in a container (name "Heading 1" or large font) must NOT yield Kind: button even with text_over_bg + padding. */
async function test_classifyElements_heading_like_container_not_button() {
  const textChild = {
    id: 't1',
    type: 'TEXT',
    name: 'Heading 1',
    visible: true,
    characters: 'Welcome to the site',
    absoluteBoundingBox: { x: 10, y: 10, width: 180, height: 28 }
  } as unknown as SceneNode
  const rectChild = {
    id: 'r1',
    type: 'RECTANGLE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 48 }
  } as unknown as SceneNode
  const frame = {
    id: 'f1',
    type: 'FRAME',
    name: 'Hero',
    visible: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 48 },
    children: [rectChild, textChild]
  } as unknown as SceneNode
  const result = await classifyElements([frame], { configOverride: emptyConfig })
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(!buttonEl, 'container with heading-like label (name "Heading 1") must NOT emit button')
}

/** Container with large-font text (heading-like) must NOT yield button. */
async function test_classifyElements_large_font_label_not_button() {
  const textChild = {
    id: 't1',
    type: 'TEXT',
    name: 'Title',
    visible: true,
    characters: 'Welcome',
    fontSize: 32,
    absoluteBoundingBox: { x: 10, y: 10, width: 120, height: 36 }
  } as unknown as SceneNode
  const rectChild = {
    id: 'r1',
    type: 'RECTANGLE',
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 140, height: 56 }
  } as unknown as SceneNode
  const frame = {
    id: 'f1',
    type: 'FRAME',
    name: 'Banner',
    visible: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    absoluteBoundingBox: { x: 0, y: 0, width: 140, height: 56 },
    children: [rectChild, textChild]
  } as unknown as SceneNode
  const result = await classifyElements([frame], { configOverride: emptyConfig })
  const buttonEl = result.find(e => e.kind === 'button')
  assert.ok(!buttonEl, 'container with large font label (fontSize > 24) must NOT emit button')
}

async function main() {
  test_parseNameTokens()
  test_nameKindRules_matching()
  test_traverseSelection_visibility_and_cap()
  test_classifyContent_role_mapping()
  test_classifyContent_placeholder_like()
  await test_classifyElements_geometry_nodes_yield_no_elements()
  await test_classifyElements_icon_heuristic_emits_with_reasons()
  await test_classifyElements_image_heuristic_emits_with_reasons()
  await test_classifyElements_name_rule_rectangle_no_text_skipped()
  await test_classifyElements_name_rule_instance_emitted()
  await test_classifyElements_name_rule_node_with_text_child_emitted()
  await test_classifyElements_ds_mapping_wins_with_reason()
  await test_classifyElements_invariant_reasons_length()
  await test_classifyElements_button_structural_emits_with_reasons()
  await test_classifyElements_button_reject_big_paragraph()
  await test_classifyElements_link_heuristic_name_contains_link()
  await test_classifyElements_nested_label_in_button_suppressed_as_link()
  await test_classifyElements_standalone_link_emitted()
  await test_classifyElements_text_never_emitted_as_button()
  await test_classifyElements_heading_like_container_not_button()
  await test_classifyElements_large_font_label_not_button()
  console.log('[smartDetector] All tests passed.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
