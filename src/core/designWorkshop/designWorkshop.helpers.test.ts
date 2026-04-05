/**
 * Design Workshop Helpers tests.
 * Run: npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
 */

import assert from 'node:assert'
import { detectArchetypeRecipe, applyFintechFallback } from './designWorkshop.helpers'
import type { DesignSpecV1, BlockSpec } from './types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFinTechSpec(
  screenName: string,
  blocks: DesignSpecV1['screens'][0]['blocks']
): DesignSpecV1 {
  return {
    type: 'designScreens',
    version: 1,
    meta: { title: 'Test', intent: { appType: 'fintech' } },
    canvas: { device: { kind: 'mobile', width: 375, height: 812 } },
    render: { intent: { fidelity: 'hi' } },
    screens: [{ name: screenName, blocks }]
  }
}

function makeCards(count: number): DesignSpecV1['screens'][0]['blocks'] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'card' as const,
    title: `Card ${i + 1}`,
    content: `Value ${i + 1}`
  }))
}

// ---------------------------------------------------------------------------
// detectArchetypeRecipe tests
// ---------------------------------------------------------------------------

function test_detects_fintech_by_intent_appType() {
  const recipe = detectArchetypeRecipe({ appType: 'fintech' }, '')
  assert.ok(recipe !== null, 'Expected recipe for appType=fintech')
  assert.ok(recipe.includes('FINTECH'), 'Expected FINTECH recipe content')
}

function test_detects_fintech_by_request_keyword() {
  const recipe = detectArchetypeRecipe({}, 'portfolio trading app')
  assert.ok(recipe !== null, 'Expected recipe for "portfolio trading"')
  assert.ok(recipe.includes('FINTECH'), 'Expected FINTECH recipe content')
}

function test_detects_onboarding_by_request() {
  const recipe = detectArchetypeRecipe({}, 'welcome splash screen for new users')
  assert.ok(recipe !== null, 'Expected recipe for "welcome splash"')
  assert.ok(recipe.includes('ONBOARDING'), 'Expected ONBOARDING recipe content')
}

function test_detects_auth_by_request() {
  const recipe = detectArchetypeRecipe({}, 'login signup form')
  assert.ok(recipe !== null, 'Expected recipe for "login signup"')
  assert.ok(recipe.includes('LOGIN'), 'Expected AUTH recipe content')
}

function test_detects_settings_by_request() {
  const recipe = detectArchetypeRecipe({}, 'profile account settings page')
  assert.ok(recipe !== null, 'Expected recipe for "profile account settings"')
  assert.ok(recipe.includes('SETTINGS'), 'Expected SETTINGS recipe content')
}

function test_returns_null_for_unknown_archetype() {
  const recipe = detectArchetypeRecipe({}, 'build something cool')
  assert.strictEqual(recipe, null, 'Expected null for unknown archetype')
}

function test_returns_null_for_empty_intent_and_empty_request() {
  const recipe = detectArchetypeRecipe({}, '')
  assert.strictEqual(recipe, null, 'Expected null for empty intent and empty request')
}

// ---------------------------------------------------------------------------
// applyFintechFallback tests
// ---------------------------------------------------------------------------

function test_does_not_apply_in_wireframe_mode() {
  const spec = makeFinTechSpec('Dashboard', makeCards(4))
  const result = applyFintechFallback(spec, 'wireframe')
  assert.strictEqual(result, spec, 'Expected same object reference (no-op) for wireframe mode')
}

function test_does_not_apply_when_rich_blocks_present() {
  const blocks: DesignSpecV1['screens'][0]['blocks'] = [
    { type: 'metricsGrid', items: [{ label: 'Value', value: '$1000' }] },
    ...makeCards(4)
  ]
  const spec = makeFinTechSpec('Dashboard', blocks)
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result, spec, 'Expected no-op when metricsGrid already present')
}

function test_does_not_apply_when_fewer_than_4_consecutive_cards() {
  const spec = makeFinTechSpec('Dashboard', makeCards(3))
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result, spec, 'Expected no-op for 3 consecutive cards')
}

function test_does_not_apply_to_non_dashboard_screen_name() {
  const spec = makeFinTechSpec('Settings', makeCards(4))
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result, spec, 'Expected no-op for non-dashboard screen name')
}

function test_collapses_4_cards_to_metricsGrid_for_dashboard_screen() {
  const blocks: DesignSpecV1['screens'][0]['blocks'] = [
    { type: 'card', title: 'Portfolio Value', content: '$12,345.00' },
    { type: 'card', title: 'Gain/Loss', content: '+$1,234.00' },
    { type: 'card', title: 'Day Change', content: '+2.3%' },
    { type: 'card', title: 'YTD', content: '+18.5%' }
  ]
  const spec = makeFinTechSpec('Dashboard', blocks)
  const result = applyFintechFallback(spec, 'jazz')

  assert.notStrictEqual(result, spec, 'Expected new object (no mutation)')
  assert.strictEqual(result.screens[0].blocks.length, 1, 'Expected 1 block after collapse')

  const metricsBlock = result.screens[0].blocks[0]
  assert.strictEqual(metricsBlock.type, 'metricsGrid', 'Expected metricsGrid block type')

  const metrics = (metricsBlock as Extract<typeof metricsBlock, { type: 'metricsGrid' }>).items
  assert.strictEqual(metrics.length, 4, 'Expected 4 metrics items')
  assert.strictEqual(metrics[0].label, 'Portfolio Value', 'Expected label from card title')
  assert.strictEqual(metrics[0].value, '$12,345.00', 'Expected value from card content')
  assert.strictEqual(metrics[1].label, 'Gain/Loss')
  assert.strictEqual(metrics[2].label, 'Day Change')
  assert.strictEqual(metrics[3].label, 'YTD')
}

function test_preserves_non_card_blocks_after_collapse() {
  const blocks: DesignSpecV1['screens'][0]['blocks'] = [
    ...makeCards(4),
    { type: 'button', text: 'Trade Now', variant: 'primary' }
  ]
  const spec = makeFinTechSpec('Portfolio', blocks)
  const result = applyFintechFallback(spec, 'jazz')

  assert.notStrictEqual(result, spec, 'Expected new object')
  assert.strictEqual(result.screens[0].blocks.length, 2, 'Expected metricsGrid + button = 2 blocks')
  assert.strictEqual(result.screens[0].blocks[0].type, 'metricsGrid', 'First block should be metricsGrid')
  assert.strictEqual(result.screens[0].blocks[1].type, 'button', 'Second block should be button')
}

function test_does_not_apply_when_appType_not_fintech_or_banking() {
  const spec: DesignSpecV1 = {
    type: 'designScreens',
    version: 1,
    meta: { title: 'Test', intent: { appType: 'fitness' } },
    canvas: { device: { kind: 'mobile', width: 375, height: 812 } },
    render: { intent: { fidelity: 'hi' } },
    screens: [{ name: 'Dashboard', blocks: makeCards(4) }]
  }
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result, spec, 'Expected no-op for non-fintech appType')
}

function test_appType_wins_over_request_keyword_for_archetype_detection() {
  // appType='auth' but request mentions 'settings profile' — auth should win
  const recipe = detectArchetypeRecipe({ appType: 'auth' }, 'design settings profile screens')
  assert.ok(recipe !== null, 'should return a recipe')
  assert.ok(recipe!.includes('AUTH') || recipe!.includes('LOGIN'), 'auth recipe should win over settings keywords in request')
}

function test_collapses_cards_for_banking_appType() {
  const spec: DesignSpecV1 = {
    type: 'designScreens', version: 1,
    meta: { title: 'Banking', intent: { appType: 'banking' } },
    canvas: { device: { kind: 'mobile', width: 375, height: 812 } },
    render: { intent: { fidelity: 'hi' } },
    screens: [{ name: 'Overview', blocks: [
      { type: 'card', title: 'Balance', content: '$12,450' },
      { type: 'card', title: 'Available', content: '$10,200' },
      { type: 'card', title: 'Pending', content: '$320' },
      { type: 'card', title: 'Limit', content: '$25,000' },
    ]}]
  }
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result.screens[0].blocks[0].type, 'metricsGrid',
    'banking appType should trigger fallback same as fintech')
}

function test_collapses_second_run_when_first_run_is_too_short() {
  const spec = makeFinTechSpec('Dashboard', [
    { type: 'card', title: 'A', content: '1' },
    { type: 'card', title: 'B', content: '2' },
    { type: 'card', title: 'C', content: '3' },
    { type: 'button', text: 'Separator', variant: 'secondary' },
    { type: 'card', title: 'D', content: '4' },
    { type: 'card', title: 'E', content: '5' },
    { type: 'card', title: 'F', content: '6' },
    { type: 'card', title: 'G', content: '7' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  // First run (A/B/C) is only 3 — skipped. Second run (D/E/F/G) is 4 — collapses.
  assert.strictEqual(result.screens[0].blocks[0].type, 'card', 'first card A should remain')
  assert.strictEqual(result.screens[0].blocks[1].type, 'card', 'second card B should remain')
  assert.strictEqual(result.screens[0].blocks[2].type, 'card', 'third card C should remain')
  assert.strictEqual(result.screens[0].blocks[3].type, 'button', 'separator button should remain')
  assert.strictEqual(result.screens[0].blocks[4].type, 'metricsGrid', 'second run should collapse to metricsGrid')
  const mg = result.screens[0].blocks[4] as Extract<BlockSpec, { type: 'metricsGrid' }>
  assert.strictEqual(mg.items.length, 4, 'metricsGrid should have 4 items from second run')
  assert.strictEqual(result.screens[0].blocks.length, 5, 'total: 3 cards + button + metricsGrid')
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

function main() {
  test_detects_fintech_by_intent_appType()
  test_detects_fintech_by_request_keyword()
  test_detects_onboarding_by_request()
  test_detects_auth_by_request()
  test_detects_settings_by_request()
  test_returns_null_for_unknown_archetype()
  test_returns_null_for_empty_intent_and_empty_request()
  test_appType_wins_over_request_keyword_for_archetype_detection()

  test_does_not_apply_in_wireframe_mode()
  test_does_not_apply_when_rich_blocks_present()
  test_does_not_apply_when_fewer_than_4_consecutive_cards()
  test_does_not_apply_to_non_dashboard_screen_name()
  test_collapses_4_cards_to_metricsGrid_for_dashboard_screen()
  test_preserves_non_card_blocks_after_collapse()
  test_does_not_apply_when_appType_not_fintech_or_banking()
  test_collapses_cards_for_banking_appType()
  test_collapses_second_run_when_first_run_is_too_short()

  console.log('[designWorkshop.helpers] All 17 tests passed.')
}

main()
