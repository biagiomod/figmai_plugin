#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3'
import { buildKey, getRepoRoot, normalizePrefix } from './s3-config-files'

type PublishedPointer = { snapshotId?: string }

function toPosixPath(p: string): string {
  return p.split(path.sep).join('/')
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  const candidate = body as {
    transformToByteArray?: () => Promise<Uint8Array>
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>
  } | null
  if (!candidate) return Buffer.alloc(0)
  if (typeof candidate.transformToByteArray === 'function') {
    const bytes = await candidate.transformToByteArray()
    return Buffer.from(bytes)
  }
  if (typeof candidate[Symbol.asyncIterator] === 'function') {
    const chunks: Uint8Array[] = []
    for await (const chunk of candidate as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)))
  }
  return Buffer.alloc(0)
}

function mapRelativeKeyToLocal(rootDir: string, relativeKey: string): string | null {
  if (relativeKey === 'config.json') {
    return path.join(rootDir, 'custom', 'config.json')
  }
  if (relativeKey === 'assistants.manifest.json') {
    return path.join(rootDir, 'custom', 'assistants.manifest.json')
  }
  if (relativeKey === 'content-models.md') {
    return path.join(rootDir, 'docs', 'content-models.md')
  }
  if (relativeKey.startsWith('knowledge/') && relativeKey.endsWith('.md')) {
    return path.join(rootDir, 'custom', toPosixPath(relativeKey))
  }
  if (relativeKey.startsWith('design-systems/') && relativeKey.endsWith('/registry.json')) {
    return path.join(rootDir, 'custom', toPosixPath(relativeKey))
  }
  if (relativeKey === 'knowledge-bases/registry.json') {
    return path.join(rootDir, 'custom', toPosixPath(relativeKey))
  }
  if (relativeKey.startsWith('knowledge-bases/') && relativeKey.endsWith('.kb.json')) {
    return path.join(rootDir, 'custom', toPosixPath(relativeKey))
  }
  return null
}

async function getSnapshotId(
  s3: S3Client,
  bucket: string,
  prefix: string,
  pinnedSnapshotId?: string
): Promise<string> {
  if (pinnedSnapshotId) return pinnedSnapshotId
  const publishedKey = buildKey(prefix, 'published.json')
  const pointerObj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: publishedKey }))
  const pointerRaw = await bodyToBuffer(pointerObj.Body)
  const pointer = JSON.parse(pointerRaw.toString('utf-8')) as PublishedPointer
  const snapshotId = (pointer.snapshotId || '').trim()
  if (!snapshotId) {
    throw new Error(`Invalid published.json at s3://${bucket}/${publishedKey}: missing snapshotId`)
  }
  return snapshotId
}

async function main(): Promise<void> {
  const rootDir = getRepoRoot()
  const localConfigPath = path.join(rootDir, 'custom', 'config.json')
  const localBrandingPath = path.join(rootDir, 'custom', 'branding.local.json')

  const bucket = (process.env.S3_BUCKET || '').trim()
  if (!bucket) {
    if (fs.existsSync(localConfigPath)) {
      console.log('S3 not configured, using local config')
      return
    }
    throw new Error('S3_BUCKET is not set and custom/config.json was not found. Configure S3_BUCKET or provide local config.')
  }

  const region = (process.env.S3_REGION || 'us-east-1').trim() || 'us-east-1'
  const prefix = normalizePrefix(process.env.S3_PREFIX)
  const pinnedSnapshotId = (process.env.CONFIG_SNAPSHOT_ID || '').trim() || undefined
  const s3 = new S3Client({ region })

  const snapshotId = await getSnapshotId(s3, bucket, prefix, pinnedSnapshotId)
  const manifestKey = buildKey(prefix, `snapshots/${snapshotId}/_manifest.json`)

  await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: manifestKey }))

  const snapshotPrefix = buildKey(prefix, `snapshots/${snapshotId}/`)
  const downloaded: string[] = []
  const requiredHits = new Set<string>()
  const required = new Set(['config.json', 'assistants.manifest.json', 'content-models.md'])

  let continuationToken: string | undefined = undefined
  do {
    const listed = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: snapshotPrefix,
      ContinuationToken: continuationToken
    }))
    for (const obj of listed.Contents || []) {
      const fullKey = obj.Key || ''
      if (!fullKey || fullKey.endsWith('/')) continue
      const relativeKey = fullKey.slice(snapshotPrefix.length)
      if (!relativeKey || relativeKey === '_manifest.json') continue

      const localPath = mapRelativeKeyToLocal(rootDir, relativeKey)
      if (!localPath) continue
      if (path.resolve(localPath) === path.resolve(localBrandingPath)) {
        console.warn(`[sync-config] Skipping protected file: ${localPath}`)
        continue
      }

      const objectResp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fullKey }))
      const body = await bodyToBuffer(objectResp.Body)
      fs.mkdirSync(path.dirname(localPath), { recursive: true })
      fs.writeFileSync(localPath, body)
      downloaded.push(localPath)
      if (required.has(relativeKey)) requiredHits.add(relativeKey)
    }
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (continuationToken)

  for (const req of required) {
    if (!requiredHits.has(req)) {
      throw new Error(`Snapshot ${snapshotId} is missing required object: ${req}`)
    }
  }

  const snapshotMarkerPath = path.join(rootDir, 'custom', '.config-snapshot-id')
  fs.mkdirSync(path.dirname(snapshotMarkerPath), { recursive: true })
  fs.writeFileSync(snapshotMarkerPath, `${snapshotId}\n`, 'utf-8')

  console.log(`[sync-config] Synced snapshot ${snapshotId}`)
  console.log(`[sync-config] Downloaded ${downloaded.length} file(s)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
