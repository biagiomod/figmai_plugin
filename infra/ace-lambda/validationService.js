'use strict';

/**
 * ACE config Zod schemas — JavaScript port of shared/ace-config/schemas.ts.
 * Kept in sync manually with the TypeScript source.
 */

const { z } = require('zod');

// --- Config schema ---

const linkSchema = z.object({ label: z.string(), url: z.string() }).passthrough();
const creditEntrySchema = z.object({ label: z.string(), url: z.string() }).passthrough();

const configSchema = z
  .object({
    ui: z
      .object({
        defaultMode: z.enum(['content-mvp', 'simple', 'advanced']).optional(),
        hideContentMvpMode: z.boolean().optional(),
        simpleModeIds: z.array(z.string()).optional(),
        contentMvpAssistantId: z.string().optional(),
        branding: z
          .object({
            showLogo: z.boolean().optional(),
            showName: z.boolean().optional(),
            showAppName: z.boolean().optional(),
            showLogline: z.boolean().optional(),
            appName: z.string().optional(),
            logline: z.string().optional(),
            logoPath: z.string().optional(),
          })
          .passthrough()
          .optional(),
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
            sharedToken: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    knowledgeBases: z
      .record(
        z
          .object({ policy: z.enum(['append', 'override']), file: z.string() })
          .passthrough()
      )
      .optional(),
    networkAccess: z
      .object({
        baseAllowedDomains: z.array(z.string()).optional(),
        extraAllowedDomains: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    resources: z
      .object({
        links: z
          .object({
            about: linkSchema.optional(),
            feedback: linkSchema.optional(),
            meetup: linkSchema.optional(),
          })
          .passthrough()
          .optional(),
        credits: z
          .object({
            createdBy: z.array(creditEntrySchema).optional(),
            apiTeam: z.array(creditEntrySchema).optional(),
            llmInstruct: z.array(creditEntrySchema).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    designSystems: z
      .object({
        enabled: z.boolean().optional(),
        activeRegistries: z.array(z.string()).optional(),
        denylist: z.array(z.string()).optional(),
        strictMode: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    accessibility: z
      .object({ hatRequiredComponents: z.array(z.string()).optional() })
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
        debug: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    branding: z
      .object({
        appName: z.string().optional(),
        appTagline: z.string().optional(),
        logoKey: z.enum(['default', 'work', 'none']).optional(),
      })
      .passthrough()
      .optional(),
    contentTable: z
      .object({
        exclusionRules: z
          .object({
            enabled: z.boolean().optional(),
            rules: z
              .array(
                z
                  .object({
                    name: z.string().optional(),
                    enabled: z.boolean().optional(),
                    note: z.string().optional(),
                    matchTarget: z.enum(['content', 'layerName', 'both']).optional(),
                    matchType: z.enum(['exact', 'contains', 'regex']).optional(),
                    pattern: z.string().optional(),
                    action: z.enum(['exclude', 'flag']).optional(),
                    confidence: z.enum(['high', 'med', 'low']).optional(),
                    // Legacy shape
                    label: z.string().optional(),
                    field: z
                      .enum([
                        'component.name',
                        'component.kind',
                        'field.label',
                        'field.role',
                        'content.value',
                        'textLayerName',
                      ])
                      .optional(),
                    match: z
                      .enum(['equals', 'contains', 'startsWith', 'regex'])
                      .optional(),
                  })
                  .passthrough()
              )
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// --- Assistants manifest schema ---

const executionTypeEnum = z.enum(['ui-only', 'tool-only', 'llm', 'hybrid']);

const quickActionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    templateMessage: z.string(),
    executionType: executionTypeEnum,
    requiresSelection: z.boolean().optional(),
    requiresVision: z.boolean().optional(),
    maxImages: z.number().optional(),
    imageScale: z.number().optional(),
  })
  .passthrough();

const tagSchema = z
  .object({
    isVisible: z.boolean().optional(),
    label: z.string().optional(),
    variant: z.enum(['new', 'beta', 'alpha']).optional(),
  })
  .passthrough();

const instructionBlockSchema = z
  .object({
    id: z.string(),
    label: z.string().optional(),
    kind: z.enum(['system', 'behavior', 'rules', 'examples', 'format', 'context']),
    content: z.string(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

const safetyOverridesSchema = z
  .object({
    allowImages: z.boolean().optional(),
    safetyToggles: z.record(z.boolean()).optional(),
  })
  .passthrough()
  .optional();

const toolSettingsSchema = z
  .object({
    defaultContentModel: z.string().optional(),
    dedupeDefault: z.boolean().optional(),
    quickActionsLocation: z.enum(['top', 'bottom', 'inline']).optional(),
    showInput: z.boolean().optional(),
  })
  .passthrough()
  .optional();

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
  instructionBlocks: z.array(instructionBlockSchema).optional(),
  toneStylePreset: z.string().optional(),
  outputSchemaId: z.string().optional(),
  safetyOverrides: safetyOverridesSchema,
  knowledgeBaseRefs: z.array(z.string()).optional(),
  toolSettings: toolSettingsSchema,
});

const assistantsManifestSchema = z.object({
  assistants: z.array(assistantEntrySchema),
});

// --- Admin-editable model schema ---

const adminEditableModelSchema = z
  .object({
    config: configSchema,
    assistantsManifest: assistantsManifestSchema,
    customKnowledge: z.record(z.string()),
    contentModelsRaw: z.string().optional(),
    designSystemRegistries: z.record(z.unknown()).optional(),
  })
  .strict();

// --- Save request schema ---

const saveRequestBodySchema = z
  .object({
    model: adminEditableModelSchema,
    meta: z.object({ revision: z.string() }),
  })
  .strict();

// --- KB schema ---

const KB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const doDontSchema = z
  .object({
    do: z.array(z.string()).default([]),
    dont: z.array(z.string()).default([]),
  })
  .default({ do: [], dont: [] });

const knowledgeBaseDocumentSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*'),
    title: z.string().default(''),
    source: z.string().optional().default(''),
    updatedAt: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    purpose: z.string().default(''),
    scope: z.string().default(''),
    definitions: z.array(z.string()).default([]),
    rulesConstraints: z.array(z.string()).default([]),
    doDont: doDontSchema,
    examples: z.array(z.string()).default([]),
    edgeCases: z.array(z.string()).default([]),
  })
  .passthrough();

function getDefaultKbDocument(id) {
  return {
    id,
    title: '',
    source: '',
    purpose: '',
    scope: '',
    definitions: [],
    rulesConstraints: [],
    doDont: { do: [], dont: [] },
    examples: [],
    edgeCases: [],
    tags: [],
  };
}

/**
 * Validate full model — structure and semantics.
 * Returns { errors: string[], warnings: string[] }.
 */
function validateModel(model) {
  const result = { errors: [], warnings: [] };
  const parsed = adminEditableModelSchema.safeParse(model);
  if (!parsed.success) {
    result.errors.push(
      ...parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    );
    return result;
  }
  const m = parsed.data;

  // Duplicate assistant ids
  const ids = m.assistantsManifest.assistants.map((a) => a.id);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) result.errors.push(`Duplicate assistant id: ${id}`);
    seen.add(id);
  }

  const idSet = new Set(ids);

  for (const id of m.config.ui?.simpleModeIds || []) {
    if (!idSet.has(id))
      result.warnings.push(
        `config.ui.simpleModeIds references unknown assistant id: ${id}`
      );
  }
  const contentMvpId = m.config.ui?.contentMvpAssistantId;
  if (contentMvpId && !idSet.has(contentMvpId)) {
    result.warnings.push(
      `config.ui.contentMvpAssistantId references unknown assistant id: ${contentMvpId}`
    );
  }

  const urlLike = (s) => /^https?:\/\/[^\s]+$/i.test(s.trim());
  const endpoint = m.config.llm?.endpoint;
  if (typeof endpoint === 'string' && endpoint.trim() && !urlLike(endpoint)) {
    result.warnings.push(
      'config.llm.endpoint should be a valid URL (e.g. https://...)'
    );
  }
  const proxyBaseUrl = m.config.llm?.proxy?.baseUrl;
  if (
    typeof proxyBaseUrl === 'string' &&
    proxyBaseUrl.trim() &&
    !urlLike(proxyBaseUrl)
  ) {
    result.warnings.push(
      'config.llm.proxy.baseUrl should be a valid URL (e.g. https://...)'
    );
  }

  return result;
}

module.exports = {
  configSchema,
  assistantsManifestSchema,
  adminEditableModelSchema,
  saveRequestBodySchema,
  knowledgeBaseDocumentSchema,
  KB_ID_REGEX,
  getDefaultKbDocument,
  validateModel,
};
