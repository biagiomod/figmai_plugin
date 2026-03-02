#!/usr/bin/env node

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  buildKey,
  collectLocalConfigFiles,
  generateSnapshotId,
  getRepoRoot,
  getS3Env
} from './s3-config-files'

function guessContentType(relativeKey: string): string {
  if (relativeKey.endsWith('.json')) return 'application/json'
  if (relativeKey.endsWith('.md')) return 'text/markdown'
  return 'application/octet-stream'
}

async function putText(
  s3: S3Client,
  bucket: string,
  key: string,
  text: string,
  contentType: string
): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(text, 'utf-8'),
    ContentType: contentType
  }))
}

async function main(): Promise<void> {
  const rootDir = getRepoRoot()
  const env = getS3Env()
  const s3 = new S3Client({ region: env.region })
  const files = collectLocalConfigFiles(rootDir)

  const snapshotId = env.pinnedSnapshotId || generateSnapshotId()
  const now = new Date().toISOString()
  const author = (process.env.CONFIG_AUTHOR || process.env.USER || 'unknown').trim()

  for (const file of files) {
    const draftKey = buildKey(env.prefix, `draft/${file.relativeKey}`)
    await s3.send(new PutObjectCommand({
      Bucket: env.bucket,
      Key: draftKey,
      Body: file.body,
      ContentType: guessContentType(file.relativeKey)
    }))
  }

  const draftMeta = {
    version: 1,
    lastModified: now,
    lastAuthor: author
  }
  await putText(
    s3,
    env.bucket,
    buildKey(env.prefix, 'draft/_meta.json'),
    `${JSON.stringify(draftMeta, null, 2)}\n`,
    'application/json'
  )

  for (const file of files) {
    const snapshotKey = buildKey(env.prefix, `snapshots/${snapshotId}/${file.relativeKey}`)
    await s3.send(new PutObjectCommand({
      Bucket: env.bucket,
      Key: snapshotKey,
      Body: file.body,
      ContentType: guessContentType(file.relativeKey)
    }))
  }

  const manifest = {
    snapshotId,
    createdAt: now,
    author,
    draftVersion: 1,
    fileCount: files.length
  }
  await putText(
    s3,
    env.bucket,
    buildKey(env.prefix, `snapshots/${snapshotId}/_manifest.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'application/json'
  )

  await putText(
    s3,
    env.bucket,
    buildKey(env.prefix, 'published.json'),
    `${JSON.stringify({ snapshotId }, null, 2)}\n`,
    'application/json'
  )

  console.log(`[seed-s3] Seeded ${files.length} file(s)`)
  console.log(`[seed-s3] Snapshot: ${snapshotId}`)
  console.log(`[seed-s3] Published pointer updated`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
