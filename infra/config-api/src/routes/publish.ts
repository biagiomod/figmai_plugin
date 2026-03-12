import { copyObject, getObjectText, listRelativeKeys, putObjectText } from '../s3'
import { logAction } from '../logging'

interface DraftMeta {
  version: number
}

function generateSnapshotId(): string {
  const now = new Date()
  const iso = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${iso}_${rand}`
}

export async function publishResponse(requestId: string) {
  const snapshotId = generateSnapshotId()
  const createdAt = new Date().toISOString()
  const rawMeta = await getObjectText('draft/_meta.json')
  let draftVersion = 0
  if (rawMeta) {
    try {
      draftVersion = Number((JSON.parse(rawMeta) as DraftMeta).version || 0)
    } catch {
      draftVersion = 0
    }
  }

  const draftKeys = await listRelativeKeys('draft/')
  const copyKeys = draftKeys.filter((k) => k !== 'draft/_meta.json')
  for (const fromKey of copyKeys) {
    const relative = fromKey.replace(/^draft\//, '')
    await copyObject(fromKey, `snapshots/${snapshotId}/${relative}`)
  }

  const manifest = {
    snapshotId,
    createdAt,
    author: 'api-user',
    draftVersion,
    fileCount: copyKeys.length
  }
  await putObjectText(
    `snapshots/${snapshotId}/_manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'application/json'
  )

  const publishedRevision = String(draftVersion)
  const snapshotPublishedKey = `snapshots/${snapshotId}/published.json`
  const published = {
    snapshotId,
    publishedRevision,
    publishedAt: createdAt,
    snapshotPath: `snapshots/${snapshotId}/`,
    snapshotKey: snapshotPublishedKey
  }

  await putObjectText(
    snapshotPublishedKey,
    `${JSON.stringify(published, null, 2)}\n`,
    'application/json'
  )

  await putObjectText(
    'published.json',
    `${JSON.stringify(published, null, 2)}\n`,
    'application/json'
  )
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d95772ae-a4b7-4c54-acb0-657380f24cd8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34860e'},body:JSON.stringify({sessionId:'34860e',runId:'pre-fix',hypothesisId:'H3',location:'infra/config-api/src/routes/publish.ts:70',message:'publish success',data:{snapshotId,publishedRevision,fileCount:copyKeys.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  logAction({
    requestId,
    action: 'publish',
    detail: {
      snapshotId,
      publishedRevision,
      fileCount: copyKeys.length
    }
  })

  return {
    snapshotId,
    createdAt,
    publishedRevision
  }
}

