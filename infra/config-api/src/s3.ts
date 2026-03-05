import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

function bucket(): string {
  const value = (process.env.S3_BUCKET || '').trim()
  if (!value) throw new Error('S3_BUCKET is not configured')
  return value
}

function prefix(): string {
  const raw = (process.env.S3_PREFIX || 'figmai/').trim()
  const normalized = raw.replace(/^\/+/, '').replace(/\/+$/, '')
  return normalized ? `${normalized}/` : ''
}

export function key(relativePath: string): string {
  return `${prefix()}${relativePath.replace(/^\/+/, '')}`
}

export async function getObjectText(relativePath: string): Promise<string | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: key(relativePath)
      })
    )
    if (!response.Body) return null
    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes).toString('utf-8')
  } catch {
    return null
  }
}

export async function putObjectText(
  relativePath: string,
  body: string,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key(relativePath),
      Body: Buffer.from(body, 'utf-8'),
      ContentType: contentType
    })
  )
}

export async function deleteObject(relativePath: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key(relativePath)
    })
  )
}

export async function listRelativeKeys(relativePrefix: string): Promise<string[]> {
  const normalizedPrefix = prefix()
  const resolvedPrefix = `${normalizedPrefix}${relativePrefix.replace(/^\/+/, '')}`
  const results: string[] = []
  let continuationToken: string | undefined = undefined
  do {
    const listed: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: resolvedPrefix,
        ContinuationToken: continuationToken
      })
    )
    for (const item of listed.Contents || []) {
      const fullKey = item.Key || ''
      if (!fullKey || fullKey.endsWith('/')) continue
      results.push(fullKey.slice(normalizedPrefix.length))
    }
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (continuationToken)
  return results
}

export async function copyObject(fromRelativePath: string, toRelativePath: string): Promise<void> {
  const fullSource = key(fromRelativePath)
  const fullTarget = key(toRelativePath)
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket(),
      CopySource: `/${bucket()}/${fullSource}`,
      Key: fullTarget
    })
  )
}

