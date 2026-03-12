import { checkS3Readiness, getObjectText, s3Info } from '../s3';
function parsePublished(raw) {
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export async function healthResponse() {
    const serviceName = process.env.SERVICE_NAME || 'ace-config-api';
    const serviceVersion = process.env.SERVICE_VERSION || '0.1.0';
    const commitSha = process.env.GIT_COMMIT_SHA || '';
    const buildTimestamp = process.env.BUILD_TIMESTAMP || '';
    const publishedRaw = await getObjectText('published.json');
    const published = parsePublished(publishedRaw);
    const readiness = await checkS3Readiness();
    return {
        service: {
            name: serviceName,
            version: serviceVersion,
            commitSha,
            buildTimestamp
        },
        s3: s3Info(),
        readiness: {
            canReadS3: readiness.canReadS3,
            canWriteS3: readiness.canWriteS3,
            checks: readiness.details
        },
        publishedRevision: published.publishedRevision || null,
        publishedSnapshotId: published.snapshotId || null
    };
}
