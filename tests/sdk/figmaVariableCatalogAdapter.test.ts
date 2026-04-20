// tests/sdk/figmaVariableCatalogAdapter.test.ts
// Unit tests for the Figma variable catalog adapter. Uses injected stubs,
// no Figma runtime.

import {
  buildVariableCatalogSnapshot,
  type VariableCatalogSnapshot,
} from '../../src/core/sdk/adapters/figmaVariableCatalogAdapter'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

const stubCollections = [
  {
    id: 'c-colors',
    name: 'Colors',
    modes: [
      { modeId: 'm-light', name: 'Light' },
      { modeId: 'm-dark', name: 'Dark' },
    ],
    defaultModeId: 'm-light',
    remote: false,
    hiddenFromPublishing: false,
  },
]

const stubVariables = [
  {
    id: 'v-primary',
    name: 'color/brand/primary',
    variableCollectionId: 'c-colors',
    resolvedType: 'COLOR' as const,
    scopes: ['ALL_FILLS'],
    valuesByMode: {
      'm-light': { r: 0.2, g: 0.5, b: 1, a: 1 },
      'm-dark':  { r: 0.3, g: 0.6, b: 1 },  // missing a — adapter should default to 1
    },
    remote: false,
  },
  {
    id: 'v-alias',
    name: 'color/alias/accent',
    variableCollectionId: 'c-colors',
    resolvedType: 'COLOR' as const,
    scopes: ['ALL_FILLS'],
    valuesByMode: {
      'm-light': { type: 'VARIABLE_ALIAS', id: 'v-primary' },
      'm-dark':  { type: 'VARIABLE_ALIAS', id: 'v-primary' },
    },
  },
  {
    id: 'v-size',
    name: 'size/md',
    variableCollectionId: 'c-colors',
    resolvedType: 'FLOAT' as const,
    scopes: ['WIDTH_HEIGHT'],
    valuesByMode: {
      'm-light': 16,
      'm-dark': 16,
    },
  },
]

const stubApi = {
  async getLocalVariableCollectionsAsync() { return stubCollections },
  async getLocalVariablesAsync() { return stubVariables },
}

async function run() {
  let snap: VariableCatalogSnapshot

  await test('builds a snapshot with correct collection shape', async () => {
    snap = await buildVariableCatalogSnapshot(stubApi)
    assert(snap.collections.length === 1, 'one collection')
    const c = snap.collections[0]!
    assert(c.id === 'c-colors', 'collection id')
    assert(c.name === 'Colors', 'collection name')
    assert(c.modes.length === 2, 'two modes')
    assert(c.defaultModeId === 'm-light', 'default mode')
    assert(c.remote === false, 'remote flag carried')
    assert(c.hiddenFromPublishing === false, 'hiddenFromPublishing carried')
  })

  await test('normalizes COLOR values with default alpha=1', async () => {
    const v = snap.variables.find(x => x.id === 'v-primary')!
    const light = v.valuesByMode['m-light']!
    const dark  = v.valuesByMode['m-dark']!
    assert(light.type === 'COLOR' && light.r === 0.2 && light.a === 1, 'light value with explicit a=1')
    assert(dark.type  === 'COLOR' && dark.a  === 1, 'dark value with implicit a=1')
  })

  await test('normalizes VARIABLE_ALIAS references', async () => {
    const v = snap.variables.find(x => x.id === 'v-alias')!
    const light = v.valuesByMode['m-light']!
    assert(light.type === 'ALIAS' && light.variableId === 'v-primary', 'alias shape')
  })

  await test('normalizes FLOAT values', async () => {
    const v = snap.variables.find(x => x.id === 'v-size')!
    const val = v.valuesByMode['m-light']!
    assert(val.type === 'FLOAT' && val.value === 16, 'float shape')
  })

  await test('preserves variableCollectionId as collectionId', async () => {
    for (const v of snap.variables) {
      assert(v.collectionId === 'c-colors', `variable ${v.id} has collectionId`)
    }
  })

  await test('preserves scopes and resolvedType', async () => {
    const color = snap.variables.find(x => x.id === 'v-primary')!
    assert(color.resolvedType === 'COLOR', 'COLOR type')
    assert(color.scopes.includes('ALL_FILLS'), 'scopes preserved')
    const size = snap.variables.find(x => x.id === 'v-size')!
    assert(size.resolvedType === 'FLOAT', 'FLOAT type')
  })

  await test('empty catalog returns empty arrays', async () => {
    const emptySnap = await buildVariableCatalogSnapshot({
      async getLocalVariableCollectionsAsync() { return [] },
      async getLocalVariablesAsync() { return [] },
    })
    assert(emptySnap.collections.length === 0, 'no collections')
    assert(emptySnap.variables.length === 0, 'no variables')
  })

  console.log('figmaVariableCatalogAdapter tests passed')
}
run()
