/**
 * KB normalization tests (PR11a): schema validation and conversion mapping.
 * Run: npx tsx tests/kb-normalization.test.ts (or npm run test)
 */

import assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  getDefaultKbDocument,
  knowledgeBaseDocumentSchema
} from '../admin-editor/src/kbSchema'
import { parseMarkdown, normalizeLooseJson, stringifyDoc } from '../scripts/convert-kb'

// --- Schema: valid document ---
function test_schema_validDocument() {
  const doc = {
    id: 'design-guidelines',
    title: 'Design guidelines',
    purpose: 'Single source of truth.',
    scope: 'All surfaces.',
    definitions: [] as string[],
    rulesConstraints: ['Use sentence case.'],
    doDont: { do: ['Do this.'], dont: ["Don't do that."] },
    examples: [],
    edgeCases: [],
    tags: []
  }
  const parsed = knowledgeBaseDocumentSchema.parse(doc)
  assert.strictEqual(parsed.id, 'design-guidelines')
  assert.deepStrictEqual(parsed.doDont, { do: ['Do this.'], dont: ["Don't do that."] })
}

// --- Schema: valid kebab-case ids ---
function test_schema_validIds() {
  for (const id of ['a', 'my-kb', 'a11y-ref', 'design-guidelines']) {
    const doc = getDefaultKbDocument(id)
    const parsed = knowledgeBaseDocumentSchema.parse(doc)
    assert.strictEqual(parsed.id, id)
  }
}

// --- Schema: invalid id (spaces, uppercase) ---
function test_schema_invalidId() {
  for (const id of ['has space', 'Uppercase', 'under_score']) {
    const result = knowledgeBaseDocumentSchema.safeParse({ ...getDefaultKbDocument('x'), id })
    assert.strictEqual(result.success, false, `id "${id}" should be invalid`)
  }
}

// --- Schema: doDont shape (both do and dont arrays; wrong type fails) ---
function test_schema_doDontRequired() {
  const base = getDefaultKbDocument('x')
  const wrongType = knowledgeBaseDocumentSchema.safeParse({ ...base, doDont: { do: 'not-array', dont: [] } })
  assert.strictEqual(wrongType.success, false)
  const withBoth = knowledgeBaseDocumentSchema.safeParse({ ...base, doDont: { do: [], dont: [] } })
  assert.strictEqual(withBoth.success, true)
  // Partial doDont gets defaults from schema
  const partialDoDont = knowledgeBaseDocumentSchema.safeParse({ ...base, doDont: { dont: [] } })
  assert.strictEqual(partialDoDont.success, true)
  if (partialDoDont.success) assert.deepStrictEqual(partialDoDont.data.doDont, { do: [], dont: [] })
}

// --- Schema: default document has all required keys ---
function test_schema_defaultHasAllKeys() {
  const doc = getDefaultKbDocument('test-id')
  const parsed = knowledgeBaseDocumentSchema.parse(doc)
  assert.strictEqual(parsed.id, 'test-id')
  assert.strictEqual(parsed.title, '')
  assert.deepStrictEqual(parsed.definitions, [])
  assert.deepStrictEqual(parsed.rulesConstraints, [])
  assert.deepStrictEqual(parsed.doDont, { do: [], dont: [] })
  assert.deepStrictEqual(parsed.examples, [])
  assert.deepStrictEqual(parsed.edgeCases, [])
}

// --- Markdown → JSON: Purpose, Scope, Rules ---
function test_md_to_json_sections() {
  const md = `# Design guidelines

## Purpose
Single source of truth for UI and copy standards.

## Scope
All product surfaces and FigmAI-assisted outputs.

## Rules
- Use sentence case for buttons.
- Never use lorem ipsum in production copy.
`
  const doc = parseMarkdown(md, 'design-guidelines')
  assert.strictEqual(doc.title, 'Design guidelines')
  assert.strictEqual(doc.purpose, 'Single source of truth for UI and copy standards.')
  assert.strictEqual(doc.scope, 'All product surfaces and FigmAI-assisted outputs.')
  assert.strictEqual(doc.rulesConstraints.length, 2)
  assert.ok(doc.rulesConstraints.includes('Use sentence case for buttons.'))
  assert.ok(doc.rulesConstraints.includes('Never use lorem ipsum in production copy.'))
  assert.deepStrictEqual(doc.doDont, { do: [], dont: [] })
  assert.deepStrictEqual(doc.definitions, [])
  assert.deepStrictEqual(doc.examples, [])
  assert.deepStrictEqual(doc.edgeCases, [])
}

// --- Markdown → JSON: Do / Don't (standalone ## sections) ---
function test_md_to_json_doDont() {
  const md = `## Do
- Use clear labels.
- Test with screen readers.

## Don't
- Rely on color alone.
- Use tiny touch targets.
`
  const doc = parseMarkdown(md, 'a11y-kb')
  assert.deepStrictEqual(doc.doDont.do, ['Use clear labels.', 'Test with screen readers.'])
  assert.deepStrictEqual(doc.doDont.dont, ['Rely on color alone.', 'Use tiny touch targets.'])
}

// --- Loose JSON → normalized ---
function test_loose_json_to_normalized() {
  const loose = {
    purpose: 'Quick ref for accessibility',
    rulesConstraints: ['Always provide alt text for images.']
  }
  const doc = normalizeLooseJson(loose, 'a11y-ref')
  assert.strictEqual(doc.id, 'a11y-ref')
  assert.strictEqual(doc.purpose, 'Quick ref for accessibility')
  assert.deepStrictEqual(doc.rulesConstraints, ['Always provide alt text for images.'])
  assert.deepStrictEqual(doc.doDont, { do: [], dont: [] })
  assert.deepStrictEqual(doc.definitions, [])
  assert.strictEqual(doc.title, '')
}

// --- Determinism: same input → same output ---
function test_determinism_sameOutput() {
  const md = `## Purpose\nOne goal.\n\n## Scope\nOne scope.`
  const doc1 = parseMarkdown(md, 'same-id')
  const doc2 = parseMarkdown(md, 'same-id')
  const out1 = stringifyDoc(doc1)
  const out2 = stringifyDoc(doc2)
  assert.strictEqual(out1, out2)
}

// --- Overwrite protection: --write without --force aborts when file exists ---
function test_overwrite_protection() {
  const scriptPath = path.join(process.cwd(), 'scripts', 'convert-kb.ts')
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'kb-test-'))
  try {
    const kbDir = path.join(tempDir, 'custom', 'knowledge-bases')
    fs.mkdirSync(kbDir, { recursive: true })
    fs.writeFileSync(
      path.join(kbDir, 'registry.json'),
      JSON.stringify({ knowledgeBases: [] }, null, 2),
      'utf-8'
    )
    const existingPath = path.join(kbDir, 'overwrite-me.kb.json')
    fs.writeFileSync(
      existingPath,
      JSON.stringify({
        id: 'overwrite-me',
        title: 'Original',
        purpose: 'Original purpose.',
        scope: '',
        definitions: [],
        rulesConstraints: [],
        doDont: { do: [], dont: [] },
        examples: [],
        edgeCases: [],
        tags: []
      }),
      'utf-8'
    )
    const inputPath = path.join(tempDir, 'input.json')
    fs.writeFileSync(inputPath, '{"purpose":"New purpose."}', 'utf-8')

    const run = (force: boolean) =>
      spawnSync(
        'npx',
        [
          'tsx',
          scriptPath,
          '--from',
          'json',
          '--input',
          'input.json',
          '--id',
          'overwrite-me',
          '--write',
          ...(force ? ['--force'] : [])
        ],
        { cwd: tempDir, encoding: 'utf-8' }
      )

    const withoutForce = run(false)
    assert.strictEqual(withoutForce.status, 1, 'Expected non-zero exit when overwriting without --force')
    assert.ok(
      (withoutForce.stderr || '').includes('already exists') || (withoutForce.stderr || '').includes('overwrite'),
      'Expected error message about existing file or overwrite'
    )
    const contentBefore = fs.readFileSync(existingPath, 'utf-8')
    assert.ok(contentBefore.includes('Original purpose.'), 'File must not be changed without --force')

    const withForce = run(true)
    assert.strictEqual(withForce.status, 0, 'Expected zero exit when using --force')
    const contentAfter = fs.readFileSync(existingPath, 'utf-8')
    assert.ok(contentAfter.includes('New purpose.'), 'File must be updated with --force')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function runAll() {
  test_schema_validDocument()
  test_schema_validIds()
  test_schema_invalidId()
  test_schema_doDontRequired()
  test_schema_defaultHasAllKeys()
  test_md_to_json_sections()
  test_md_to_json_doDont()
  test_loose_json_to_normalized()
  test_determinism_sameOutput()
  test_overwrite_protection()
  console.log('All KB normalization tests passed.')
}

runAll()
