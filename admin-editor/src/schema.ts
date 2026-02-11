/**
 * Zod schemas for Admin Editable Model.
 * Validates config.json, assistants.manifest.json, and the full model.
 * Permissive where needed (unknown keys allowed) but validates critical fields.
 */

import { z } from 'zod'

// --- Config (custom/config.json) ---
const linkSchema = z.object({ label: z.string(), url: z.string() }).passthrough()
const creditEntrySchema = z.object({ label: z.string(), url: z.string() }).passthrough()

export const configSchema = z
  .object({
    ui: z
      .object({
        defaultMode: z.enum(['content-mvp', 'simple', 'advanced']).optional(),
        hideContentMvpMode: z.boolean().optional(),
        simpleModeIds: z.array(z.string()).optional(),
        contentMvpAssistantId: z.string().optional()
      })
      .passthrough()
      .optional(),
    llm: z
      .object({
        endpoint: z.string().optional(),
        hideModelSettings: z.boolean().optional(),
        uiMode: z.enum(['full', 'connection-only']).optional(),
        provider: z.enum(['internal-api', 'proxy']).optional(),
        showTestConnection: z.boolean().optional(),
        hideInternalApiSettings: z.boolean().optional(),
        hideProxySettings: z.boolean().optional(),
        hideTestConnectionButton: z.boolean().optional(),
        proxy: z
          .object({
            baseUrl: z.string().optional(),
            defaultModel: z.string().optional(),
            authMode: z.enum(['shared_token', 'session_token']).optional(),
            sharedToken: z.string().optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    knowledgeBases: z.record(z.object({ policy: z.enum(['append', 'override']), file: z.string() }).passthrough()).optional(),
    networkAccess: z
      .object({
        baseAllowedDomains: z.array(z.string()).optional(),
        extraAllowedDomains: z.array(z.string()).optional()
      })
      .passthrough()
      .optional(),
    resources: z
      .object({
        links: z.object({ about: linkSchema.optional(), feedback: linkSchema.optional(), meetup: linkSchema.optional() }).passthrough().optional(),
        credits: z
          .object({
            createdBy: z.array(creditEntrySchema).optional(),
            apiTeam: z.array(creditEntrySchema).optional(),
            llmInstruct: z.array(creditEntrySchema).optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    designSystems: z
      .object({
        enabled: z.boolean().optional(),
        activeRegistries: z.array(z.string()).optional(),
        denylist: z.array(z.string()).optional(),
        strictMode: z.boolean().optional()
      })
      .passthrough()
      .optional(),
    /** Component/instance names that should always be treated as requiring HAT. Used by Content Review Assistant "Add HAT" action. */
    accessibility: z
      .object({
        hatRequiredComponents: z.array(z.string()).optional()
      })
      .passthrough()
      .optional(),
    analytics: z
      .object({
        enabled: z.boolean().optional(),
        endpointUrl: z.string().optional(),
        flushIntervalMs: z.number().optional(),
        maxBatchSize: z.number().optional(),
        maxBuffer: z.number().optional(),
        retryMaxAttempts: z.number().optional(),
        retryBaseDelayMs: z.number().optional(),
        debug: z.boolean().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough()

export type Config = z.infer<typeof configSchema>

// --- Assistants manifest ---
const executionTypeEnum = z.enum(['ui-only', 'tool-only', 'llm', 'hybrid'])
const quickActionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    templateMessage: z.string(),
    /** Required. Routing and handler selection depend on this. */
    executionType: executionTypeEnum,
    requiresSelection: z.boolean().optional(),
    requiresVision: z.boolean().optional(),
    maxImages: z.number().optional(),
    imageScale: z.number().optional()
  })
  .passthrough()

const tagSchema = z
  .object({
    isVisible: z.boolean().optional(),
    label: z.string().optional(),
    variant: z.enum(['new', 'beta', 'alpha']).optional()
  })
  .passthrough()

// --- Optional structured assistant config (PR7; no runtime behavior change) ---
const instructionBlockKindEnum = z.enum(['system', 'behavior', 'rules', 'examples', 'format', 'context'])
const instructionBlockSchema = z
  .object({
    id: z.string(),
    label: z.string().optional(),
    kind: instructionBlockKindEnum,
    content: z.string(),
    enabled: z.boolean().optional()
  })
  .passthrough()

const safetyOverridesSchema = z
  .object({
    allowImages: z.boolean().optional(),
    safetyToggles: z.record(z.boolean()).optional()
  })
  .passthrough()
  .optional()

const assistantEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  intro: z.string(),
  welcomeMessage: z.string().optional(),
  hoverSummary: z.string().optional(),
  tag: tagSchema.optional(),
  iconId: z.string(),
  kind: z.enum(['ai', 'tool', 'hybrid']),
  quickActions: z.array(quickActionSchema),
  promptTemplate: z.string(),
  // Optional structured config (editor-friendly; not wired to runtime in this PR)
  instructionBlocks: z.array(instructionBlockSchema).optional(),
  toneStylePreset: z.string().optional(),
  outputSchemaId: z.string().optional(),
  safetyOverrides: safetyOverridesSchema,
  knowledgeBaseRefs: z.array(z.string()).optional()
})

export const assistantsManifestSchema = z.object({
  assistants: z.array(assistantEntrySchema)
})

export type AssistantsManifest = z.infer<typeof assistantsManifestSchema>
export type AssistantManifestEntry = z.infer<typeof assistantEntrySchema>

// --- Admin Editable Model (full payload) ---
export const adminEditableModelSchema = z
  .object({
    config: configSchema,
    assistantsManifest: assistantsManifestSchema,
    customKnowledge: z.record(z.string()), // assistantId -> markdown body
    contentModelsRaw: z.string().optional(), // raw markdown for docs/content-models.md
    designSystemRegistries: z.record(z.unknown()).optional() // registryId -> registry JSON
  })
  .strict() // reject unknown top-level keys

export type AdminEditableModel = z.infer<typeof adminEditableModelSchema>

// --- Save request: { model, meta } (meta.revision for concurrency guard). Strict, no extra keys. ---
export const saveRequestBodySchema = z
  .object({
    model: adminEditableModelSchema,
    meta: z.object({ revision: z.string() })
  })
  .strict()
export type SaveRequestBody = z.infer<typeof saveRequestBodySchema>

// --- Validation result ---
export interface ValidationResult {
  errors: string[]
  warnings: string[]
}

/**
 * Validate full model and add derived checks (duplicate ids, missing refs, etc.).
 */
export function validateModel(model: unknown): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] }
  const parsed = adminEditableModelSchema.safeParse(model)
  if (!parsed.success) {
    result.errors.push(...parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`))
    return result
  }
  const m = parsed.data

  // Duplicate assistant ids
  const ids = m.assistantsManifest.assistants.map((a) => a.id)
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) result.errors.push(`Duplicate assistant id: ${id}`)
    seen.add(id)
  }

  // simpleModeIds / contentMvpAssistantId must reference existing assistant ids
  const idSet = new Set(ids)
  const simpleIds = m.config.ui?.simpleModeIds ?? []
  for (const id of simpleIds) {
    if (!idSet.has(id)) result.warnings.push(`config.ui.simpleModeIds references unknown assistant id: ${id}`)
  }
  const contentMvpId = m.config.ui?.contentMvpAssistantId
  if (contentMvpId && !idSet.has(contentMvpId)) {
    result.warnings.push(`config.ui.contentMvpAssistantId references unknown assistant id: ${contentMvpId}`)
  }

  // LLM URL-ish validation (permissive: require http(s) and non-empty host-ish)
  const urlLike = (s: string) => /^https?:\/\/[^\s]+$/i.test(s.trim())
  const endpoint = m.config.llm?.endpoint
  if (typeof endpoint === 'string' && endpoint.trim() && !urlLike(endpoint)) {
    result.warnings.push('config.llm.endpoint should be a valid URL (e.g. https://...)')
  }
  const proxyBaseUrl = m.config.llm?.proxy?.baseUrl
  if (typeof proxyBaseUrl === 'string' && proxyBaseUrl.trim() && !urlLike(proxyBaseUrl)) {
    result.warnings.push('config.llm.proxy.baseUrl should be a valid URL (e.g. https://...)')
  }

  return result
}
