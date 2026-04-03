/**
 * Unit tests for annotations.ts shared cache and read API.
 * Run: npx tsx src/core/figma/annotations.test.ts
 * No Figma runtime required — figma global is mocked via globalThis.
 */

import assert from 'node:assert'
import {
  getCategoryMapShared,
  clearAnnotationCategoryCache,
  ensureAnnotationCategory,
  readResolvedAnnotations,
  readAnnotationValue
} from './annotations'

let passed = 0
let failed = 0

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    passed++
    console.log(`  \u2713 ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  \u2717 ${name}`)
    console.error(`    ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Helpers to mock figma global
// ---------------------------------------------------------------------------

type FigmaMock = {
  annotations?: {
    getAnnotationCategoriesAsync?: () => Promise<Array<{ id: string; label: string }>>
    addAnnotationCategoryAsync?: (input: { label: string; color: string }) => Promise<{ id: string; label: string }>
  }
}

function setFigmaMock(mock: FigmaMock) {
  ;(globalThis as unknown as { figma: FigmaMock }).figma = mock
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

async function run() {
  console.log('annotations.test.ts')

  // a. getCategoryMapShared — lazy load
  await runTest('a: getCategoryMapShared lazy-loads categories and caches result', async () => {
    clearAnnotationCategoryCache()
    let callCount = 0
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => {
          callCount++
          return [
            { id: 'cat-1', label: 'Design' },
            { id: 'cat-2', label: 'Review' }
          ]
        }
      }
    })

    const map1 = await getCategoryMapShared()
    assert.strictEqual(map1.size, 2)
    assert.strictEqual(map1.get('cat-1'), 'Design')
    assert.strictEqual(map1.get('cat-2'), 'Review')
    assert.strictEqual(callCount, 1, 'should have fetched once')

    // Second call should return cached
    const map2 = await getCategoryMapShared()
    assert.strictEqual(callCount, 1, 'should not have fetched again')
    assert.strictEqual(map2, map1, 'should return same Map instance')
  })

  // b. getCategoryMapShared — API unavailable
  await runTest('b: getCategoryMapShared returns empty Map when figma.annotations is undefined', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({ annotations: undefined })

    const map = await getCategoryMapShared()
    assert.ok(map instanceof Map)
    assert.strictEqual(map.size, 0)

    // Subsequent call should return cached empty map (not re-fetch)
    const map2 = await getCategoryMapShared()
    assert.strictEqual(map2, map, 'should return same cached empty Map')
  })

  // c. clearAnnotationCategoryCache — re-fetches after clear
  await runTest('c: clearAnnotationCategoryCache causes next call to re-fetch', async () => {
    clearAnnotationCategoryCache()
    let callCount = 0
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => {
          callCount++
          return [{ id: 'cat-x', label: 'Accessibility' }]
        }
      }
    })

    await getCategoryMapShared()
    assert.strictEqual(callCount, 1)

    clearAnnotationCategoryCache()
    await getCategoryMapShared()
    assert.strictEqual(callCount, 2, 'should re-fetch after cache clear')
  })

  // d. ensureAnnotationCategory — write-through when cache is loaded
  await runTest('d: ensureAnnotationCategory writes through to cache when cache is loaded', async () => {
    clearAnnotationCategoryCache()
    let nextId = 100
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-existing', label: 'Existing' }],
        addAnnotationCategoryAsync: async ({ label }) => ({ id: `new-${++nextId}`, label })
      }
    })

    // Prime the cache
    const initialMap = await getCategoryMapShared()
    assert.strictEqual(initialMap.size, 1)

    // Create a new category — should write-through
    const newId = await ensureAnnotationCategory('NewCategory')
    assert.ok(newId, 'should return a new category id')

    // getCategoryMapShared should return updated cache WITHOUT re-fetching
    const updatedMap = await getCategoryMapShared()
    assert.ok(updatedMap.has(newId!), 'new category id should be in cache')
    assert.strictEqual(updatedMap.get(newId!), 'NewCategory')
  })

  // e. ensureAnnotationCategory — no write-through when cache is null
  await runTest('e: ensureAnnotationCategory does not initialise cache when it is null', async () => {
    clearAnnotationCategoryCache()
    let callCount = 0
    const categories: Array<{ id: string; label: string }> = [{ id: 'cat-existing', label: 'Existing' }]
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => {
          callCount++
          return [...categories]
        },
        addAnnotationCategoryAsync: async ({ label }) => {
          const created = { id: `created-${label}`, label }
          categories.push(created)
          return created
        }
      }
    })

    // Call ensureAnnotationCategory without ever calling getCategoryMapShared first
    // Cache should remain null (no write-through to null cache)
    const newId = await ensureAnnotationCategory('FreshCategory')
    assert.ok(newId, 'should return a new category id')

    // Now calling getCategoryMapShared should fetch fresh and include the new category
    // Note: ensureAnnotationCategory already called getAnnotationCategoriesAsync once (to check for existing),
    // so getCategoryMapShared will call it a second time (total = 2).
    const callCountBeforeGet = callCount
    const map = await getCategoryMapShared()
    assert.ok(map.has(newId!), 'new category should be in freshly fetched map')
    assert.strictEqual(callCount, callCountBeforeGet + 1, 'getCategoryMapShared should trigger one additional fetch')
  })

  // f. readResolvedAnnotations — node without annotations property
  await runTest('f: readResolvedAnnotations returns [] for node without annotations property', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({ annotations: { getAnnotationCategoriesAsync: async () => [] } })

    const node = { id: 'n1', type: 'TEXT' } as unknown as BaseNode
    const result = await readResolvedAnnotations(node)
    assert.deepStrictEqual(result, [])
  })

  // g. readResolvedAnnotations — node with no annotations array
  await runTest('g: readResolvedAnnotations returns [] for node with empty/missing annotations array', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({ annotations: { getAnnotationCategoriesAsync: async () => [] } })

    const nodeNoArr = { id: 'n2', type: 'FRAME', annotations: undefined } as unknown as BaseNode
    const result1 = await readResolvedAnnotations(nodeNoArr)
    assert.deepStrictEqual(result1, [])

    const nodeEmptyArr = { id: 'n3', type: 'FRAME', annotations: [] } as unknown as BaseNode
    const result2 = await readResolvedAnnotations(nodeEmptyArr)
    assert.deepStrictEqual(result2, [])
  })

  // h. readResolvedAnnotations — full resolution
  await runTest('h: readResolvedAnnotations resolves both category labels and plain text', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [
          { id: 'cat-a', label: 'Hat' },
          { id: 'cat-b', label: 'Confidence' }
        ]
      }
    })

    const node = {
      id: 'n4',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-a', label: 'Book queue' },
        { categoryId: 'cat-b', labelMarkdown: '**high**' }
      ]
    } as unknown as BaseNode

    const result = await readResolvedAnnotations(node)
    assert.strictEqual(result.length, 2)

    assert.strictEqual(result[0].categoryId, 'cat-a')
    assert.strictEqual(result[0].categoryLabel, 'Hat')
    assert.strictEqual(result[0].label, 'Book queue')
    assert.strictEqual(result[0].plainText, 'Book queue')

    assert.strictEqual(result[1].categoryId, 'cat-b')
    assert.strictEqual(result[1].categoryLabel, 'Confidence')
    assert.strictEqual(result[1].labelMarkdown, '**high**')
    assert.strictEqual(result[1].plainText, 'high')
  })

  // i. readResolvedAnnotations — unknown categoryId
  await runTest('i: readResolvedAnnotations sets categoryLabel=undefined for unknown categoryId', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-known', label: 'Known' }]
      }
    })

    const node = {
      id: 'n5',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-unknown', label: 'Some value' }
      ]
    } as unknown as BaseNode

    const result = await readResolvedAnnotations(node)
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].categoryLabel, undefined)
    assert.strictEqual(result[0].plainText, 'Some value')
  })

  // j. readResolvedAnnotations — markdown normalization
  await runTest('j: readResolvedAnnotations strips markdown and collapses whitespace', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-md', label: 'Notes' }]
      }
    })

    const node = {
      id: 'n6',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-md', labelMarkdown: '**HAT:** Book queue\n\n**Confidence:** high' }
      ]
    } as unknown as BaseNode

    const result = await readResolvedAnnotations(node)
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].plainText, 'HAT: Book queue Confidence: high')
  })

  // j2. readResolvedAnnotations — link syntax stripping
  await runTest('j2: stripMarkdown handles link syntax', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-link', label: 'Notes' }]
      }
    })

    const node = {
      id: 'n9',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-link', labelMarkdown: 'See [design spec](https://example.com) for details' }
      ]
    } as unknown as BaseNode

    const entries = await readResolvedAnnotations(node)
    assert.strictEqual(entries[0].plainText, 'See design spec for details')
  })

  // k. readAnnotationValue — match (exact and case-insensitive)
  await runTest('k: readAnnotationValue returns plainText for matching category (case-insensitive)', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-review', label: 'Review' }]
      }
    })

    const node = {
      id: 'n7',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-review', label: 'Approved' }
      ]
    } as unknown as BaseNode

    const exact = await readAnnotationValue(node, 'Review')
    assert.strictEqual(exact, 'Approved')

    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-review', label: 'Review' }]
      }
    })

    const caseInsensitive = await readAnnotationValue(node, 'review')
    assert.strictEqual(caseInsensitive, 'Approved')
  })

  // l. readAnnotationValue — no match
  await runTest('l: readAnnotationValue returns null for non-matching category', async () => {
    clearAnnotationCategoryCache()
    setFigmaMock({
      annotations: {
        getAnnotationCategoriesAsync: async () => [{ id: 'cat-review', label: 'Review' }]
      }
    })

    const node = {
      id: 'n8',
      type: 'FRAME',
      annotations: [
        { categoryId: 'cat-review', label: 'Approved' }
      ]
    } as unknown as BaseNode

    const result = await readAnnotationValue(node, 'NonExistent')
    assert.strictEqual(result, null)
  })

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
