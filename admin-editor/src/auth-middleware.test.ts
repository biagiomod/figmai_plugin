import assert from 'node:assert'

type MockReq = {
  headers: Record<string, string | undefined>
  cookies?: Record<string, string>
}

type MockRes = {
  locals: Record<string, unknown>
  statusCode?: number
  payload?: unknown
  status: (code: number) => MockRes
  json: (body: unknown) => void
}

function makeRes (): MockRes {
  return {
    locals: {},
    status (code: number) {
      this.statusCode = code
      return this
    },
    json (body: unknown) {
      this.payload = body
    }
  }
}

async function run () {
  process.env.ACE_AUTH_MODE = 'wrapper'
  process.env.ACE_WRAPPER_TOKEN = 'test-token'
  process.env.ACE_ALLOW_GROUPS_FALLBACK = 'false'

  const mod = await import('./auth-middleware.ts')
  const middleware = mod.requireAuth('/tmp/noop')

  {
    const req: MockReq = { headers: { 'x-ace-user': 'alice@example.com' } }
    const res = makeRes()
    let called = false
    await middleware(req as any, res as any, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 403)
  }

  {
    const req: MockReq = { headers: { 'x-ace-wrapper-token': 'test-token', 'x-ace-role': 'editor' } }
    const res = makeRes()
    let called = false
    await middleware(req as any, res as any, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 403)
  }

  {
    const req: MockReq = {
      headers: {
        'x-ace-user': 'alice@example.com',
        'x-ace-wrapper-token': 'wrong',
        'x-ace-role': 'editor'
      }
    }
    const res = makeRes()
    let called = false
    await middleware(req as any, res as any, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 403)
  }

  {
    const req: MockReq = {
      headers: {
        'x-ace-user': 'alice@example.com',
        'x-ace-wrapper-token': 'test-token',
        'x-ace-role': 'not-a-role'
      }
    }
    const res = makeRes()
    let called = false
    await middleware(req as any, res as any, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 403)
  }

  {
    const req: MockReq = {
      headers: {
        'x-ace-user': 'alice@example.com',
        'x-ace-wrapper-token': 'test-token',
        'x-ace-role': 'editor',
        'x-ace-groups': 'ace-editors,ace-reviewers'
      }
    }
    const res = makeRes()
    let called = false
    await middleware(req as any, res as any, () => { called = true })
    assert.strictEqual(called, true)
    const auth = res.locals.auth as { username: string; role: string }
    assert.strictEqual(auth.username, 'alice@example.com')
    assert.strictEqual(auth.role, 'editor')
  }

  console.log('[auth-middleware.test] all assertions passed')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
