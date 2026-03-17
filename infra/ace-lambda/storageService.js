'use strict';

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');

let _client = null;

function getClient() {
  if (!_client) {
    _client = new S3Client({ region: process.env.S3_REGION || 'us-east-2' });
  }
  return _client;
}

function s3Info() {
  return {
    bucket: process.env.S3_BUCKET || '',
    prefix: process.env.S3_PREFIX || 'figmai/',
    region: process.env.S3_REGION || 'us-east-2',
  };
}

function resolveKey(relativePath) {
  const prefix = (process.env.S3_PREFIX || 'figmai/').replace(/\/$/, '');
  return `${prefix}/${relativePath}`;
}

function stripPrefix(key) {
  const prefix = (process.env.S3_PREFIX || 'figmai/').replace(/\/$/, '') + '/';
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/**
 * Get object text. Returns null if missing or on error.
 */
async function getObjectText(relativePath) {
  const { bucket } = s3Info();
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: resolveKey(relativePath) })
    );
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    console.error(`[storage] getObjectText error (${relativePath}):`, err.message);
    return null;
  }
}

/**
 * Write text content to S3.
 */
async function putObjectText(relativePath, content, contentType) {
  const { bucket } = s3Info();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: resolveKey(relativePath),
      Body: content,
      ContentType: contentType || 'application/octet-stream',
    })
  );
}

/**
 * Delete object from S3.
 */
async function deleteObject(relativePath) {
  const { bucket } = s3Info();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: resolveKey(relativePath) })
  );
}

/**
 * Check if an object exists.
 */
async function headObject(relativePath) {
  const { bucket } = s3Info();
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: resolveKey(relativePath) })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * List relative keys under a relative prefix. Returns paths relative to S3_PREFIX.
 */
async function listRelativeKeys(relativePrefix) {
  const { bucket } = s3Info();
  const absPrefix = resolveKey(relativePrefix);
  const keys = [];
  let continuationToken;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: absPrefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents || []) {
      keys.push(stripPrefix(obj.Key));
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

/**
 * Copy object within the same bucket.
 */
async function copyObject(fromRelative, toRelative) {
  const { bucket } = s3Info();
  await getClient().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${resolveKey(fromRelative)}`,
      Key: resolveKey(toRelative),
    })
  );
}

module.exports = {
  s3Info,
  getObjectText,
  putObjectText,
  deleteObject,
  headObject,
  listRelativeKeys,
  copyObject,
};
