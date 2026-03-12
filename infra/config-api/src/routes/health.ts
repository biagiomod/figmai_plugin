import { checkS3Readiness, getObjectText, s3Info } from '../s3'

type PublishedState = {
  snapshotId?: string
  publishedRevision?: string
  publishedAt?: string
  snapshotPath?: string
  snapshotKey?: string
}

function parsePublished(raw: string | null): PublishedState {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as PublishedState
  } catch {
    return {}
  }
}

export async function healthResponse() {
  const serviceName = process.env.SERVICE_NAME || 'ace-config-api'
  const serviceVersion = process.env.SERVICE_VERSION || '0.1.0'
  const commitSha = process.env.GIT_COMMIT_SHA || ''
  const buildTimestamp = process.env.BUILD_TIMESTAMP || ''
  const publishedRaw = await getObjectText('published.json')
  const published = parsePublished(publishedRaw)
  const readiness = await checkS3Readiness()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d95772ae-a4b7-4c54-acb0-657380f24cd8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34860e'},body:JSON.stringify({sessionId:'34860e',runId:'pre-fix',hypothesisId:'H4',location:'infra/config-api/src/routes/health.ts:29',message:'health readiness computed',data:{canReadS3:readiness.canReadS3,canWriteS3:readiness.canWriteS3,checkCount:readiness.details.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
  }
}
