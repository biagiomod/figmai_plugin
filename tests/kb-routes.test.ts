/**
 * KB API route tests (PR11b). Uses temp dir; does not touch real custom/knowledge-bases.
 * Run: npx tsx tests/kb-routes.test.ts (or npm run test)
 */

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import express from 'express'
import { createKbRouter } from '../admin-editor/src/kb-routes'

async function run(): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-routes-test-'))
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/kb', createKbRouter(tmpDir))

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const port = (server.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}/api/kb`

  try {
    // GET /registry — empty
    let res = await fetch(base + '/registry')
    assert.strictEqual(res.status, 200)
    const reg = await res.json()
    assert.ok(Array.isArray(reg.knowledgeBases))
    assert.strictEqual(reg.knowledgeBases.length, 0)

    // GET /:id — 404
    res = await fetch(base + '/my-kb')
    assert.strictEqual(res.status, 404)

    // GET /:id — 400 invalid id (path traversal or invalid chars)
    res = await fetch(base + '/' + encodeURIComponent('invalid id'))
    assert.strictEqual(res.status, 400, 'invalid id (space) should return 400')
    res = await fetch(base + '/' + encodeURIComponent('UPPERCASE'))
    assert.strictEqual(res.status, 400, 'invalid id (uppercase) should return 400')

    // POST /normalize — md
    res = await fetch(base + '/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'md',
        content: '## Purpose\nSingle source.\n\n## Scope\nAll surfaces.',
        id: 'test-kb',
        title: 'Test KB'
      })
    })
    assert.strictEqual(res.status, 200)
    const norm = await res.json()
    assert.ok(norm.doc)
    assert.strictEqual(norm.doc.id, 'test-kb')
    assert.strictEqual(norm.doc.title, 'Test KB')
    assert.strictEqual(norm.doc.purpose, 'Single source.')
    assert.strictEqual(norm.doc.scope, 'All surfaces.')

    // POST /normalize — invalid id
    res = await fetch(base + '/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'md', content: '# X', id: 'bad id' })
    })
    assert.strictEqual(res.status, 200)
    const normBad = await res.json()
    assert.ok(normBad.errors && normBad.errors.length > 0)

    // POST / — create
    const doc = {
      id: 'test-kb',
      title: 'Test KB',
      purpose: 'P',
      scope: 'S',
      definitions: [],
      rulesConstraints: [],
      doDont: { do: [], dont: [] },
      examples: [],
      edgeCases: [],
      tags: []
    }
    res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc })
    })
    assert.strictEqual(res.status, 201)
    const created = await res.json()
    assert.ok(created.doc)
    assert.ok(created.registry)
    assert.strictEqual(created.registry.knowledgeBases.length, 1)
    assert.ok(fs.existsSync(path.join(tmpDir, 'custom', 'knowledge-bases', 'test-kb.kb.json')))

    // POST / — 409 without forceOverwrite
    res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc })
    })
    assert.strictEqual(res.status, 409)
    const conflict = await res.json()
    assert.strictEqual(conflict.code, 'OVERWRITE_REQUIRED')

    // GET /:id — 200
    res = await fetch(base + '/test-kb')
    assert.strictEqual(res.status, 200)
    const got = await res.json()
    assert.strictEqual(got.id, 'test-kb')

    // PATCH /:id — id mismatch 400
    res = await fetch(base + '/test-kb', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: { ...doc, id: 'other-id' } })
    })
    assert.strictEqual(res.status, 400)

    // PATCH /:id — success
    res = await fetch(base + '/test-kb', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc: {
          ...doc,
          title: 'Updated Title',
          purpose: 'Updated purpose'
        }
      })
    })
    assert.strictEqual(res.status, 200)
    const patched = await res.json()
    assert.strictEqual(patched.doc.title, 'Updated Title')
    assert.strictEqual(patched.doc.purpose, 'Updated purpose')

    // Registry: one entry per id
    res = await fetch(base + '/registry')
    const reg2 = await res.json()
    assert.strictEqual(reg2.knowledgeBases.length, 1)
    assert.strictEqual(reg2.knowledgeBases[0].filePath, 'test-kb.kb.json')

    // DELETE /:id
    res = await fetch(base + '/test-kb', { method: 'DELETE' })
    assert.strictEqual(res.status, 204)
    assert.ok(!fs.existsSync(path.join(tmpDir, 'custom', 'knowledge-bases', 'test-kb.kb.json')))
    res = await fetch(base + '/registry')
    const reg3 = await res.json()
    assert.strictEqual(reg3.knowledgeBases.length, 0)

    // DELETE /:id — 404
    res = await fetch(base + '/test-kb', { method: 'DELETE' })
    assert.strictEqual(res.status, 404)

    console.log('All kb-routes tests passed.')
  } finally {
    server.close()
    try {
      fs.rmSync(tmpDir, { recursive: true })
    } catch {
      // ignore
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
