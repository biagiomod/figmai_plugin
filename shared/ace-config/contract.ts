/**
 * Shared API contract types for ACE /api/* routes.
 *
 * Both the local Express server and hosted Lambda use these shapes.
 * The browser frontend (admin-editor/public/app.js) depends on this contract.
 *
 * Frozen contract — do not change field names or remove fields without
 * corresponding frontend update.
 */

// --- Model response ---

export interface ModelCapabilities {
  /** True when the draft has been modified since the last publish. */
  hasUnpublished: boolean
  /** Whether this backend supports the POST /api/publish route. */
  canPublish: boolean
}

export interface ModelApiMeta {
  /** Opaque revision token used for optimistic concurrency on save. */
  revision: string
  capabilities?: ModelCapabilities
}

export interface ModelApiResponse {
  model: Record<string, unknown>
  meta: ModelApiMeta
  validation: { errors: string[]; warnings: string[] }
}

// --- Save response (success) ---

export interface SaveApiResponse {
  success: boolean
  meta: { revision: string }
  filesWritten: string[]
  generatorsRun: string[]
}

// --- Save response (dryRun) ---

export interface SaveDryRunApiResponse {
  success: boolean
  filesWouldWrite: string[]
  generatorsWouldRun: string[]
  backupsWouldCreateAt?: string
  backupRootPreview?: string
  nextSteps?: string
  errors?: string[]
}

// --- Save response (409 stale revision) ---

export interface StaleRevisionApiResponse {
  error: 'STALE_REVISION'
  message: string
  expectedRevision: string
  currentRevision: string
  lastPublishedRevision?: string | null
  meta: { revision: string }
}

// --- Validate response ---

export interface ValidateApiResponse {
  errors: string[]
  warnings: string[]
}

// --- Publish response ---

export interface PublishApiResponse {
  snapshotId: string
  createdAt: string
  publishedRevision: string
}
