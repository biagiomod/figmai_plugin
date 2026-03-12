import { z } from 'zod';
const linkSchema = z.object({ label: z.string(), url: z.string() }).passthrough();
const creditEntrySchema = z.object({ label: z.string(), url: z.string() }).passthrough();
export const configSchema = z
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
            logoPath: z.string().optional()
        })
            .passthrough()
            .optional()
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
    knowledgeBases: z
        .record(z.object({ policy: z.enum(['append', 'override']), file: z.string() }).passthrough())
        .optional(),
    networkAccess: z
        .object({
        baseAllowedDomains: z.array(z.string()).optional(),
        extraAllowedDomains: z.array(z.string()).optional()
    })
        .passthrough()
        .optional(),
    resources: z
        .object({
        links: z
            .object({
            about: linkSchema.optional(),
            feedback: linkSchema.optional(),
            meetup: linkSchema.optional()
        })
            .passthrough()
            .optional(),
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
        .optional(),
    branding: z
        .object({
        appName: z.string().optional(),
        appTagline: z.string().optional(),
        logoKey: z.enum(['default', 'work', 'none']).optional()
    })
        .passthrough()
        .optional(),
    contentTable: z
        .object({
        exclusionRules: z
            .object({
            enabled: z.boolean().optional(),
            rules: z
                .array(z
                .object({
                name: z.string().optional(),
                enabled: z.boolean().optional(),
                note: z.string().optional(),
                matchTarget: z.enum(['content', 'layerName', 'both']).optional(),
                matchType: z.enum(['exact', 'contains', 'regex']).optional(),
                pattern: z.string().optional(),
                action: z.enum(['exclude', 'flag']).optional(),
                confidence: z.enum(['high', 'med', 'low']).optional(),
                label: z.string().optional(),
                field: z
                    .enum([
                    'component.name',
                    'component.kind',
                    'field.label',
                    'field.role',
                    'content.value',
                    'textLayerName'
                ])
                    .optional(),
                match: z.enum(['equals', 'contains', 'startsWith', 'regex']).optional()
            })
                .passthrough())
                .optional()
        })
            .passthrough()
            .optional()
    })
        .passthrough()
        .optional()
})
    .passthrough();
const executionTypeEnum = z.enum(['ui-only', 'tool-only', 'llm', 'hybrid']);
const quickActionSchema = z
    .object({
    id: z.string(),
    label: z.string(),
    templateMessage: z.string(),
    executionType: executionTypeEnum
})
    .passthrough();
const tagSchema = z
    .object({
    isVisible: z.boolean().optional(),
    label: z.string().optional(),
    variant: z.enum(['new', 'beta', 'alpha']).optional()
})
    .passthrough();
const instructionBlockSchema = z
    .object({
    id: z.string(),
    label: z.string().optional(),
    kind: z.enum(['system', 'behavior', 'rules', 'examples', 'format', 'context']),
    content: z.string(),
    enabled: z.boolean().optional()
})
    .passthrough();
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
    safetyOverrides: z.record(z.unknown()).optional(),
    knowledgeBaseRefs: z.array(z.string()).optional(),
    toolSettings: z.record(z.unknown()).optional()
});
export const assistantsManifestSchema = z.object({
    assistants: z.array(assistantEntrySchema)
});
export const adminEditableModelSchema = z
    .object({
    config: configSchema,
    assistantsManifest: assistantsManifestSchema,
    customKnowledge: z.record(z.string()),
    contentModelsRaw: z.string().optional(),
    designSystemRegistries: z.record(z.unknown()).optional()
})
    .strict();
export const saveRequestBodySchema = z
    .object({
    model: adminEditableModelSchema,
    meta: z.object({ revision: z.string() })
})
    .strict();
export function validateModel(model) {
    const result = { errors: [], warnings: [] };
    const parsed = adminEditableModelSchema.safeParse(model);
    if (!parsed.success) {
        result.errors.push(...parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
        return result;
    }
    const m = parsed.data;
    const ids = m.assistantsManifest.assistants.map((a) => a.id);
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id))
            result.errors.push(`Duplicate assistant id: ${id}`);
        seen.add(id);
    }
    const idSet = new Set(ids);
    const simpleIds = m.config.ui?.simpleModeIds ?? [];
    for (const id of simpleIds) {
        if (!idSet.has(id))
            result.warnings.push(`config.ui.simpleModeIds references unknown assistant id: ${id}`);
    }
    const contentMvpId = m.config.ui?.contentMvpAssistantId;
    if (contentMvpId && !idSet.has(contentMvpId)) {
        result.warnings.push(`config.ui.contentMvpAssistantId references unknown assistant id: ${contentMvpId}`);
    }
    return result;
}
export const KB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const knowledgeBaseDocumentSchema = z
    .object({
    id: z.string().min(1).regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*'),
    title: z.string().default(''),
    source: z.string().optional().default(''),
    updatedAt: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    purpose: z.string().default(''),
    scope: z.string().default(''),
    definitions: z.array(z.string()).default([]),
    rulesConstraints: z.array(z.string()).default([]),
    doDont: z
        .object({
        do: z.array(z.string()).default([]),
        dont: z.array(z.string()).default([])
    })
        .default({ do: [], dont: [] }),
    examples: z.array(z.string()).default([]),
    edgeCases: z.array(z.string()).default([])
})
    .passthrough();
export function getDefaultKbDocument(id) {
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
        tags: []
    };
}
