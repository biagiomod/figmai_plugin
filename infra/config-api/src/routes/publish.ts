import { copyObject, getObjectText, listRelativeKeys, putObjectText } from '../s3'

interface DraftMeta {
  version: number
}

function generateSnapshotId(): string {
  const now = new Date()
  const iso = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${iso}_${rand}`
}

export async function publishResponse() {
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

  await putObjectText(
    'published.json',
    `${JSON.stringify({ snapshotId }, null, 2)}\n`,
    'application/json'
  )

  return {
    snapshotId,
    createdAt
  }
}

