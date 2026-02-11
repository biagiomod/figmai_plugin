/**
 * Content Review handler: icon/image heuristics, visible-text-only, DS matching, messaging.
 * Run: npx tsx src/core/assistants/handlers/contentReview.test.ts
 */

import assert from 'node:assert'
import {
  getMainComponentNameAsync,
  formatAddHatResultMessage,
  nameMatchesIcon,
  nodeHasNoVisibleTextDescendants,
  isIconNamedNoText,
  nameMatchesImage,
  matchesHatToken,
  nameMatchesConfiguredList,
  parseNameTokens
} from './contentReview'

async function test_getMainComponentNameAsync_returns_mc_name() {
  const node = {
    type: 'INSTANCE',
    name: 'Instance 1',
    getMainComponentAsync: async () => ({ name: 'IconButton' })
  } as unknown as InstanceNode
  const out = await getMainComponentNameAsync(node)
  assert.strictEqual(out, 'IconButton')
}

async function test_getMainComponentNameAsync_falls_back_to_instance_name_on_throw() {
  const node = {
    type: 'INSTANCE',
    name: 'AvatarButton',
    getMainComponentAsync: async () => {
      throw new Error('detached')
    }
  } as unknown as InstanceNode
  const out = await getMainComponentNameAsync(node)
  assert.strictEqual(out, 'AvatarButton')
}

async function test_getMainComponentNameAsync_falls_back_when_mc_name_empty() {
  const node = {
    type: 'INSTANCE',
    name: 'ToolbarIconOnly',
    getMainComponentAsync: async () => ({ name: '' })
  } as unknown as InstanceNode
  const out = await getMainComponentNameAsync(node)
  assert.strictEqual(out, 'ToolbarIconOnly')
}

async function test_getMainComponentNameAsync_returns_empty_for_non_instance() {
  const node = {
    type: 'FRAME',
    name: 'Frame 1',
    getMainComponentAsync: async () => ({ name: 'X' })
  } as unknown as InstanceNode
  const out = await getMainComponentNameAsync(node)
  assert.strictEqual(out, '')
}

async function test_getMainComponentNameAsync_handles_null_mc() {
  const node = {
    type: 'INSTANCE',
    name: 'FallbackName',
    getMainComponentAsync: async () => null
  } as unknown as InstanceNode
  const out = await getMainComponentNameAsync(node)
  assert.strictEqual(out, 'FallbackName')
}

function test_formatAddHatResultMessage_no_instances() {
  assert.strictEqual(
    formatAddHatResultMessage(0, 0, false),
    'Add HAT: no HAT candidates found (scanned 0).'
  )
}

function test_formatAddHatResultMessage_capped() {
  assert.strictEqual(
    formatAddHatResultMessage(2000, 3, true),
    'Add HAT: annotated 3 items (scanned 2000) (scan capped at 2000).'
  )
}

function test_formatAddHatResultMessage_not_capped() {
  assert.strictEqual(
    formatAddHatResultMessage(150, 2, false),
    'Add HAT: annotated 2 items (scanned 150).'
  )
}

function test_formatAddHatResultMessage_no_candidates_scanned_some() {
  assert.strictEqual(
    formatAddHatResultMessage(50, 0, false),
    'Add HAT: no HAT candidates found (scanned 50).'
  )
}

function test_nameMatchesIcon() {
  assert.strictEqual(nameMatchesIcon('Icon_Book Queue'), true)
  assert.strictEqual(nameMatchesIcon('ICON'), true)
  assert.strictEqual(nameMatchesIcon('my-icon'), true)
  assert.strictEqual(nameMatchesIcon('Button'), false)
  assert.strictEqual(nameMatchesIcon(''), false)
  assert.strictEqual(nameMatchesIcon(undefined as unknown as string), false)
}

function test_nodeHasNoVisibleTextDescendants() {
  const textVisible = { type: 'TEXT', visible: true, children: undefined } as unknown as SceneNode
  assert.strictEqual(nodeHasNoVisibleTextDescendants(textVisible), false)
  const textHidden = { type: 'TEXT', visible: false, children: undefined } as unknown as SceneNode
  assert.strictEqual(nodeHasNoVisibleTextDescendants(textHidden), true)
  const frameNoText = { type: 'FRAME', children: [] } as unknown as SceneNode
  assert.strictEqual(nodeHasNoVisibleTextDescendants(frameNoText), true)
  const frameWithVisibleText = {
    type: 'FRAME',
    children: [{ type: 'TEXT', visible: true, children: undefined } as unknown as SceneNode]
  } as unknown as SceneNode
  assert.strictEqual(nodeHasNoVisibleTextDescendants(frameWithVisibleText), false)
  const frameWithHiddenText = {
    type: 'FRAME',
    children: [{ type: 'TEXT', visible: false, children: undefined } as unknown as SceneNode]
  } as unknown as SceneNode
  assert.strictEqual(nodeHasNoVisibleTextDescendants(frameWithHiddenText), true)
}

function test_isIconNamedNoText_instance() {
  const instance = {
    type: 'INSTANCE',
    name: 'Icon_Book Queue',
    children: []
  } as unknown as SceneNode
  assert.strictEqual(isIconNamedNoText(instance), true)
}

function test_isIconNamedNoText_frame() {
  const frame = {
    type: 'FRAME',
    name: 'Icon_Book Queue',
    children: []
  } as unknown as SceneNode
  assert.strictEqual(isIconNamedNoText(frame), true)
}

function test_isIconNamedNoText_false_when_visible_text() {
  const frame = {
    type: 'FRAME',
    name: 'Icon_Book Queue',
    children: [{ type: 'TEXT', visible: true, children: undefined } as unknown as SceneNode]
  } as unknown as SceneNode
  assert.strictEqual(isIconNamedNoText(frame), false)
}

function test_nameMatchesImage() {
  assert.strictEqual(nameMatchesImage('Image'), true)
  assert.strictEqual(nameMatchesImage('img-placeholder'), true)
  assert.strictEqual(nameMatchesImage('photo'), true)
  assert.strictEqual(nameMatchesImage('avatar'), true)
  assert.strictEqual(nameMatchesImage('Button'), false)
  assert.strictEqual(nameMatchesImage(''), false)
}

function test_matchesHatToken_exact() {
  assert.strictEqual(matchesHatToken('iconbutton', 'iconbutton'), true)
  assert.strictEqual(matchesHatToken('icon', 'icon'), true)
}

function test_matchesHatToken_contains_boundary() {
  assert.strictEqual(matchesHatToken('icon_book queue', 'icon'), true)
  assert.strictEqual(matchesHatToken('primary-button', 'button'), true)
  assert.strictEqual(matchesHatToken('icon_book queue', 'book'), true)
}

function test_matchesHatToken_no_match_without_boundary() {
  assert.strictEqual(matchesHatToken('iconic', 'icon'), false)
  assert.strictEqual(matchesHatToken('mybutton', 'button'), false)
}

function test_matchesHatToken_short_token_no_contains() {
  assert.strictEqual(matchesHatToken('ab', 'ab'), true)
  assert.strictEqual(matchesHatToken('xabx', 'ab'), false)
}

function test_nameMatchesConfiguredList() {
  assert.strictEqual(nameMatchesConfiguredList('icon_book queue', ['icon']), true)
  assert.strictEqual(nameMatchesConfiguredList('primary-button', ['button']), true)
  assert.strictEqual(nameMatchesConfiguredList('iconic', ['icon']), false)
}

function test_parseNameTokens() {
  assert.deepStrictEqual(parseNameTokens('Icon_Book Queue'), ['icon', 'book', 'queue'])
  assert.deepStrictEqual(parseNameTokens('my-icon-button'), ['my', 'icon', 'button'])
  assert.deepStrictEqual(parseNameTokens('ImageHero'), ['image', 'hero'])
  assert.deepStrictEqual(parseNameTokens(''), [])
  assert.deepStrictEqual(parseNameTokens(undefined as unknown as string), [])
}

async function main() {
  await test_getMainComponentNameAsync_returns_mc_name()
  await test_getMainComponentNameAsync_falls_back_to_instance_name_on_throw()
  await test_getMainComponentNameAsync_falls_back_when_mc_name_empty()
  await test_getMainComponentNameAsync_returns_empty_for_non_instance()
  await test_getMainComponentNameAsync_handles_null_mc()
  test_formatAddHatResultMessage_no_instances()
  test_formatAddHatResultMessage_capped()
  test_formatAddHatResultMessage_not_capped()
  test_formatAddHatResultMessage_no_candidates_scanned_some()
  test_nameMatchesIcon()
  test_nodeHasNoVisibleTextDescendants()
  test_isIconNamedNoText_instance()
  test_isIconNamedNoText_frame()
  test_isIconNamedNoText_false_when_visible_text()
  test_nameMatchesImage()
  test_matchesHatToken_exact()
  test_matchesHatToken_contains_boundary()
  test_matchesHatToken_no_match_without_boundary()
  test_matchesHatToken_short_token_no_contains()
  test_nameMatchesConfiguredList()
  test_parseNameTokens()
  console.log('[contentReview] All handler tests passed.')
}

main()
