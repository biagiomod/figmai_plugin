/**
 * Generator error cases: missing file and invalid schema must exit non-zero with clear messages.
 * Run: npx tsx tests/generate-knowledge-bases.test.ts (or npm run test)
 */

import assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(__dirname, '..')
const SCRIPT = path.join(ROOT, 'scripts', 'generate-knowledge-bases.ts')

function runGenerator(cwd: string, env: NodeJS.ProcessEnv = {}): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync('npx', ['tsx', SCRIPT], {
    cwd: ROOT,
    env: { ...process.env, KB_GENERATOR_ROOT: cwd, ...env },
    encoding: 'utf-8'
  })
  return { status: result.status, stderr: result.stderr || '', stdout: result.stdout || '' }
}

function test_missingFile_exitsNonZero() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-gen-missing-'))
  try {
    const kbDir = path.join(tmp, 'custom', 'knowledge-bases')
    fs.mkdirSync(kbDir, { recursive: true })
    fs.writeFileSync(
      path.join(kbDir, 'registry.json'),
      JSON.stringify({ knowledgeBases: [{ id: 'missing-kb', title: 'Missing', filePath: 'missing.kb.json' }] }, null, 2),
      'utf-8'
    )
    const { status, stderr } = runGenerator(tmp)
    assert.strictEqual(status, 1, 'expected exit 1 for missing file')
    assert.ok(stderr.includes('Missing KB files') || stderr.includes('missing-kb'), 'stderr should mention missing files')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

function test_invalidSchema_exitsNonZero() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-gen-invalid-'))
  try {
    const kbDir = path.join(tmp, 'custom', 'knowledge-bases')
    fs.mkdirSync(kbDir, { recursive: true })
    fs.writeFileSync(
      path.join(kbDir, 'registry.json'),
      JSON.stringify({ knowledgeBases: [{ id: 'bad-kb', title: 'Bad', filePath: 'bad.kb.json' }] }, null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(kbDir, 'bad.kb.json'),
      JSON.stringify({ id: 'invalid id', title: 'Bad' }, null, 2),
      'utf-8'
    )
    const { status, stderr } = runGenerator(tmp)
    assert.strictEqual(status, 1, 'expected exit 1 for invalid schema')
    assert.ok(stderr.includes('Invalid KB document') || stderr.includes('bad-kb'), 'stderr should mention invalid document')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

function run() {
  test_missingFile_exitsNonZero()
  test_invalidSchema_exitsNonZero()
  console.log('[generate-knowledge-bases.test] All generator error tests passed.')
}

run()
