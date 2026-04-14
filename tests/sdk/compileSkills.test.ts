// tests/sdk/compileSkills.test.ts
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { compile } from '../../scripts/compile-skills'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  return Promise.resolve(fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTempRepo(id: string): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `compile-skills-${id}-`))
  fs.mkdirSync(path.join(tmp, 'custom', 'assistants'), { recursive: true })
  fs.mkdirSync(path.join(tmp, 'src', 'assistants'), { recursive: true })
  return tmp
}

function writeFlatManifest(repo: string, assistants: object[]): void {
  fs.writeFileSync(
    path.join(repo, 'custom', 'assistants.manifest.json'),
    JSON.stringify({ assistants }),
    'utf-8'
  )
}

function writePerDirAssistant(repo: string, id: string, manifest: object, skillMd: string): void {
  const dir = path.join(repo, 'custom', 'assistants', id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
  fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd, 'utf-8')
}

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const MINIMAL_FLAT_ENTRY = {
  id: 'general',
  label: 'General',
  intro: 'I help.',
  iconId: 'AskIcon',
  kind: 'ai',
  quickActions: [{ id: 'explain', label: 'Explain', templateMessage: 'Explain this.', executionType: 'llm' }],
  promptTemplate: 'You are a design assistant.'
}

const MINIMAL_PER_DIR_MANIFEST = {
  id: 'general',
  label: 'General',
  intro: 'I help.',
  iconId: 'AskIcon',
  kind: 'ai',
  quickActions: [{ id: 'explain', label: 'Explain', executionType: 'llm' }]
}

const MINIMAL_SKILL_MD = `---
skillVersion: 1
id: general
---

## Identity

You are a design assistant.

## Quick Actions

### explain

templateMessage: Explain this.
`

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  // ── Flat manifest path ────────────────────────────────────────────────────

  await test('flat manifest: single assistant → output contains ASSISTANTS_MANIFEST and id + promptTemplate', () => {
    const repo = makeTempRepo('flat-single')
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY])
    const output = compile(repo)
    assert(output.includes('ASSISTANTS_MANIFEST'), 'output contains ASSISTANTS_MANIFEST')
    assert(output.includes('"general"'), 'output contains id "general"')
    assert(output.includes('You are a design assistant'), 'output contains promptTemplate content')
  })

  await test('flat manifest: promptTemplate preserved exactly in output', () => {
    const repo = makeTempRepo('flat-prompt')
    const entry = { ...MINIMAL_FLAT_ENTRY, promptTemplate: 'UNIQUE_PROMPT_XYZ_123' }
    writeFlatManifest(repo, [entry])
    const output = compile(repo)
    assert(output.includes('UNIQUE_PROMPT_XYZ_123'), 'promptTemplate preserved exactly')
  })

  await test('flat manifest: multiple assistants → flat manifest order preserved in output', () => {
    const repo = makeTempRepo('flat-multi')
    const entryA = { ...MINIMAL_FLAT_ENTRY, id: 'alpha', label: 'Alpha', promptTemplate: 'Alpha prompt.' }
    const entryB = { ...MINIMAL_FLAT_ENTRY, id: 'beta', label: 'Beta', promptTemplate: 'Beta prompt.' }
    writeFlatManifest(repo, [entryA, entryB])
    const output = compile(repo)
    const posAlpha = output.indexOf('"alpha"')
    const posBeta = output.indexOf('"beta"')
    assert(posAlpha !== -1, 'alpha entry present')
    assert(posBeta !== -1, 'beta entry present')
    assert(posAlpha < posBeta, 'alpha appears before beta (order preserved)')
  })

  // ── Per-directory path ────────────────────────────────────────────────────

  await test('per-dir: empty flat manifest allowed when all assistants are per-directory', () => {
    const repo = makeTempRepo('perdir-empty-flat')
    writeFlatManifest(repo, [])
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    // Should compile without error — per-directory entry is the full source of truth
    const output = compile(repo)
    assert(output.includes('You are a design assistant'), 'per-dir content compiled from empty flat manifest')
  })

  await test('per-dir: Identity content assembled into promptTemplate (no ## Identity heading in output)', () => {
    const repo = makeTempRepo('perdir-identity')
    writeFlatManifest(repo, [])
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    const output = compile(repo)
    assert(output.includes('You are a design assistant'), 'identity content in promptTemplate')
    assert(!output.includes('## Identity'), '## Identity heading not in output')
  })

  await test('per-dir: templateMessage from SKILL.md overlay appears in emitted quickActions', () => {
    const repo = makeTempRepo('perdir-tm')
    writeFlatManifest(repo, [])
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    const output = compile(repo)
    assert(output.includes('Explain this.'), 'templateMessage from SKILL.md overlay present in output')
  })

  await test('per-dir: per-directory entry takes precedence over flat manifest entry for same ID', () => {
    const repo = makeTempRepo('perdir-precedence')
    // Flat manifest has "general" with a different promptTemplate
    const flatEntry = { ...MINIMAL_FLAT_ENTRY, promptTemplate: 'FLAT_VERSION_SHOULD_NOT_APPEAR' }
    writeFlatManifest(repo, [flatEntry])
    // Per-dir "general" with identity "PER_DIR_VERSION"
    const skillMd = `---
skillVersion: 1
id: general
---

## Identity

PER_DIR_VERSION

## Quick Actions

### explain

templateMessage: Explain this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    const output = compile(repo)
    assert(output.includes('PER_DIR_VERSION'), 'per-dir version present')
    assert(!output.includes('FLAT_VERSION_SHOULD_NOT_APPEAR'), 'flat version replaced by per-dir')
  })

  await test('per-dir: Behavior section content appended to promptTemplate after Identity', () => {
    const repo = makeTempRepo('perdir-behavior')
    writeFlatManifest(repo, [])
    const skillMd = `---
skillVersion: 1
id: general
---

## Identity

You are a design assistant.

## Behavior

Be concise and clear.

## Quick Actions

### explain

templateMessage: Explain this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    const output = compile(repo)
    assert(output.includes('You are a design assistant'), 'identity content present')
    assert(output.includes('Be concise and clear'), 'behavior content present')
    // Identity should appear before Behavior
    const posIdentity = output.indexOf('You are a design assistant')
    const posBehavior = output.indexOf('Be concise and clear')
    assert(posIdentity < posBehavior, 'identity appears before behavior')
  })

  // ── Warning behavior ──────────────────────────────────────────────────────

  await test('warning: flat manifest fallback emits [SKILL_COMPILER WARNING] with assistant ID', () => {
    const repo = makeTempRepo('warn-fallback')
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY])
    const warnings: string[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')) }
    try {
      compile(repo)
    } finally {
      console.warn = origWarn
    }
    const combinedWarnings = warnings.join('\n')
    assert(combinedWarnings.includes('[SKILL_COMPILER WARNING]'), 'warning contains [SKILL_COMPILER WARNING]')
    assert(combinedWarnings.includes('general'), 'warning mentions assistant ID "general"')
  })

  // ── Hard error tests ──────────────────────────────────────────────────────

  await test('hard error: missing frontmatter → process.exit called', () => {
    const repo = makeTempRepo('err-no-frontmatter')
    const dummyFlat = { ...MINIMAL_FLAT_ENTRY, id: 'dummy', label: 'Dummy', promptTemplate: 'Dummy.' }
    writeFlatManifest(repo, [dummyFlat])
    const skillMd = `## Identity\n\nYou are a design assistant.\n`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    let exited = false
    const orig = process.exit
    ;(process.exit as unknown as (code?: number) => never) = (() => { exited = true; throw new Error('exit') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = orig
    assert(exited, 'should have exited on missing frontmatter')
  })

  await test('hard error: missing ## Identity → process.exit called', () => {
    const repo = makeTempRepo('err-no-identity')
    const dummyFlat = { ...MINIMAL_FLAT_ENTRY, id: 'dummy', label: 'Dummy', promptTemplate: 'Dummy.' }
    writeFlatManifest(repo, [dummyFlat])
    const skillMd = `---
skillVersion: 1
id: general
---

## Behavior

Be concise.

## Quick Actions

### explain

templateMessage: Explain this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    let exited = false
    const orig = process.exit
    ;(process.exit as unknown as (code?: number) => never) = (() => { exited = true; throw new Error('exit') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = orig
    assert(exited, 'should have exited on missing Identity section')
  })

  await test('hard error: unknown ## Heading → process.exit called', () => {
    const repo = makeTempRepo('err-unknown-heading')
    const dummyFlat = { ...MINIMAL_FLAT_ENTRY, id: 'dummy', label: 'Dummy', promptTemplate: 'Dummy.' }
    writeFlatManifest(repo, [dummyFlat])
    const skillMd = `---
skillVersion: 1
id: general
---

## Identity

You are a design assistant.

## UnknownSection

Some content.

## Quick Actions

### explain

templateMessage: Explain this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    let exited = false
    const orig = process.exit
    ;(process.exit as unknown as (code?: number) => never) = (() => { exited = true; throw new Error('exit') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = orig
    assert(exited, 'should have exited on unknown heading')
  })

  await test('hard error: id mismatch (frontmatter id ≠ directory name) → process.exit called', () => {
    const repo = makeTempRepo('err-id-mismatch')
    const dummyFlat = { ...MINIMAL_FLAT_ENTRY, id: 'dummy', label: 'Dummy', promptTemplate: 'Dummy.' }
    writeFlatManifest(repo, [dummyFlat])
    // SKILL.md says id: "wrong-id" but directory is "general"
    const skillMd = `---
skillVersion: 1
id: wrong-id
---

## Identity

You are a design assistant.

## Quick Actions

### explain

templateMessage: Explain this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    let exited = false
    const orig = process.exit
    ;(process.exit as unknown as (code?: number) => never) = (() => { exited = true; throw new Error('exit') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = orig
    assert(exited, 'should have exited on id mismatch')
  })

  await test('hard error: structural field in quick action overlay (executionType: in SKILL.md) → process.exit called', () => {
    const repo = makeTempRepo('err-structural-field')
    const dummyFlat = { ...MINIMAL_FLAT_ENTRY, id: 'dummy', label: 'Dummy', promptTemplate: 'Dummy.' }
    writeFlatManifest(repo, [dummyFlat])
    const skillMd = `---
skillVersion: 1
id: general
---

## Identity

You are a design assistant.

## Quick Actions

### explain

templateMessage: Explain this.
executionType: llm
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, skillMd)
    let exited = false
    const orig = process.exit
    ;(process.exit as unknown as (code?: number) => never) = (() => { exited = true; throw new Error('exit') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = orig
    assert(exited, 'should have exited on structural field in quick action overlay')
  })

  console.log('compileSkills tests passed')
}

run()
