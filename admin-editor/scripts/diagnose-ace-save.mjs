#!/usr/bin/env node
/**
 * Diagnostic: simulate ACE flow Load -> change -> Validate -> Save -> change -> Validate -> Save.
 * GET /api/model, then POST /api/save (defaultMode advanced), then POST /api/save (defaultMode simple).
 * Logs clientRevision sent and response meta.revision for each Save.
 */
const BASE = 'http://localhost:3333'

async function main() {
  console.log('[diagnose] GET /api/model')
  const loadRes = await fetch(BASE + '/api/model', { cache: 'no-store' })
  if (!loadRes.ok) throw new Error('Load failed: ' + loadRes.status)
  const loadData = await loadRes.json()
  const R1 = loadData.meta?.revision ?? ''
  console.log('[diagnose] Load meta.revision R1 length=', typeof R1 === 'string' ? R1.length : 0, 'value=', R1 || '(empty)')

  const model1 = JSON.parse(JSON.stringify(loadData.model))
  if (!model1.config) model1.config = {}
  if (!model1.config.ui) model1.config.ui = {}
  model1.config.ui.defaultMode = 'advanced'

  console.log('[diagnose] POST /api/save (first Save: defaultMode=advanced) meta.revision=R1')
  const save1Res = await fetch(BASE + '/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model1, meta: { revision: R1 } })
  })
  const save1Data = await save1Res.json()
  const R2 = save1Data.meta?.revision ?? ''
  console.log('[diagnose] First Save status=', save1Res.status, 'meta.revision R2 length=', typeof R2 === 'string' ? R2.length : 0, 'value=', R2 || '(missing)')

  const model2 = JSON.parse(JSON.stringify(model1))
  model2.config.ui.defaultMode = 'simple'

  console.log('[diagnose] POST /api/save (second Save: defaultMode=simple) meta.revision=R2')
  const save2Res = await fetch(BASE + '/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model2, meta: { revision: R2 } })
  })
  const save2Data = await save2Res.json()
  const R3 = save2Data.meta?.revision ?? ''
  console.log('[diagnose] Second Save status=', save2Res.status, 'meta.revision length=', typeof R3 === 'string' ? R3.length : 0, 'value=', R3 || '(missing)')
  if (save2Res.status === 409) {
    console.log('[diagnose] 409 response: serverRevision=', save2Data.meta?.revision ?? '(missing)')
  }
  console.log('[diagnose] done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
