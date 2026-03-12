import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
function bucket() {
    const value = (process.env.S3_BUCKET || '').trim();
    if (!value)
        throw new Error('S3_BUCKET is not configured');
    return value;
}
function prefix() {
    const raw = (process.env.S3_PREFIX || 'figmai/').trim();
    const normalized = raw.replace(/^\/+/, '').replace(/\/+$/, '');
    return normalized ? `${normalized}/` : '';
}
function region() {
    return process.env.AWS_REGION || 'us-east-1';
}
export function key(relativePath) {
    return `${prefix()}${relativePath.replace(/^\/+/, '')}`;
}
export function s3Info() {
    const rawBucket = (process.env.S3_BUCKET || '').trim();
    return {
        bucket: rawBucket || null,
        prefix: prefix(),
        region: region()
    };
}
export async function getObjectText(relativePath) {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: bucket(),
            Key: key(relativePath)
        }));
        if (!response.Body)
            return null;
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes).toString('utf-8');
    }
    catch {
        return null;
    }
}
export async function headObject(relativePath) {
    try {
        await s3.send(new HeadObjectCommand({
            Bucket: bucket(),
            Key: key(relativePath)
        }));
        return true;
    }
    catch {
        return false;
    }
}
export async function putObjectText(relativePath, body, contentType) {
    await s3.send(new PutObjectCommand({
        Bucket: bucket(),
        Key: key(relativePath),
        Body: Buffer.from(body, 'utf-8'),
        ContentType: contentType
    }));
}
export async function deleteObject(relativePath) {
    await s3.send(new DeleteObjectCommand({
        Bucket: bucket(),
        Key: key(relativePath)
    }));
}
export async function listRelativeKeys(relativePrefix) {
    const normalizedPrefix = prefix();
    const resolvedPrefix = `${normalizedPrefix}${relativePrefix.replace(/^\/+/, '')}`;
    const results = [];
    let continuationToken = undefined;
    do {
        const listed = await s3.send(new ListObjectsV2Command({
            Bucket: bucket(),
            Prefix: resolvedPrefix,
            ContinuationToken: continuationToken
        }));
        for (const item of listed.Contents || []) {
            const fullKey = item.Key || '';
            if (!fullKey || fullKey.endsWith('/'))
                continue;
            results.push(fullKey.slice(normalizedPrefix.length));
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
    return results;
}
export async function copyObject(fromRelativePath, toRelativePath) {
    const fullSource = key(fromRelativePath);
    const fullTarget = key(toRelativePath);
    await s3.send(new CopyObjectCommand({
        Bucket: bucket(),
        CopySource: `/${bucket()}/${fullSource}`,
        Key: fullTarget
    }));
}
function statusCodeFromUnknown(error) {
    if (error &&
        typeof error === 'object' &&
        '$metadata' in error &&
        error.$metadata &&
        typeof error.$metadata === 'object' &&
        'httpStatusCode' in error.$metadata &&
        typeof error.$metadata.httpStatusCode === 'number') {
        return error.$metadata.httpStatusCode;
    }
    return undefined;
}
export async function checkS3Readiness() {
    const details = [];
    let canReadS3 = false;
    try {
        await s3.send(new ListObjectsV2Command({
            Bucket: bucket(),
            Prefix: key('draft/'),
            MaxKeys: 1
        }));
        canReadS3 = true;
        details.push('read:list-ok');
    }
    catch (error) {
        details.push(`read:list-failed:${statusCodeFromUnknown(error) || 'unknown'}`);
    }
    // Non-mutating write heuristic:
    // 1) Ensure draft/_meta.json exists
    // 2) Attempt conditional PutObject with If-None-Match:* on that existing key
    //    - 412 => write permission present, no mutation
    //    - 403/401/etc => no write permission
    let canWriteS3 = false;
    const hasMeta = await headObject('draft/_meta.json');
    if (!hasMeta) {
        details.push('write:meta-missing');
        return { canReadS3, canWriteS3, details };
    }
    try {
        await s3.send(new PutObjectCommand({
            Bucket: bucket(),
            Key: key('draft/_meta.json'),
            Body: Buffer.from('{}', 'utf-8'),
            ContentType: 'application/json',
            IfNoneMatch: '*'
        }));
        // Should not happen when object exists; if it does, treat as write capability.
        canWriteS3 = true;
        details.push('write:conditional-put-succeeded');
    }
    catch (error) {
        const status = statusCodeFromUnknown(error);
        if (status === 412) {
            canWriteS3 = true;
            details.push('write:conditional-put-precondition-failed-ok');
        }
        else {
            details.push(`write:conditional-put-failed:${status || 'unknown'}`);
        }
    }
    return { canReadS3, canWriteS3, details };
}
