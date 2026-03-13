> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# Errors Assistant — Complete Instruction Sources Audit

Read-only audit of all instruction sources that influence the **Errors** assistant at runtime, for migration to a normalized KB (ACE) with behavior parity.

---

## 1) Assistant Definition (SSOT)

**Source:** [custom/assistants.manifest.json](../../custom/assistants.manifest.json)

The Errors assistant is one entry in the `assistants` array. Full JSON object for that entry (verbatim):

```json
{
  "hoverSummary": "Error screen specialist",
  "iconId": "CautionIcon",
  "id": "errors",
  "instructionBlocks": [],
  "intro": "I identify design errors, inconsistencies, and quality issues. Select elements to find problems before handoff.",
  "kind": "ai",
  "label": "Errors",
  "promptTemplate": "# Errors Assistant\n\nYou are **FigmAI's Errors Assistant**, a design quality assurance specialist embedded inside a Figma plugin.\nYou identify design errors, inconsistencies, and quality issues that could cause problems in implementation or user experience.\n\n[Full knowledge base available in: src/assistants/errors.md]",
  "quickActions": [
    {
      "executionType": "llm",
      "id": "find-errors",
      "imageScale": 2,
      "label": "Find errors",
      "maxImages": 1,
      "requiresSelection": true,
      "requiresVision": true,
      "templateMessage": "Identify all design errors including layout issues, inconsistencies, component misuse, missing states, and naming problems."
    },
    {
      "executionType": "llm",
      "id": "check-consistency",
      "imageScale": 2,
      "label": "Check consistency",
      "maxImages": 1,
      "requiresSelection": true,
      "requiresVision": true,
      "templateMessage": "Check for style inconsistencies in spacing, colors, typography, and component usage across the design."
    }
  ],
  "tag": { "isVisible": true, "label": "Alpha", "variant": "alpha" }
}
```

**Fields present:** `id`, `label`, `intro`, `hoverSummary`, `iconId`, `kind`, `promptTemplate`, `quickActions`, `instructionBlocks`, `tag`.  
**Fields not present:** `mode`, `knowledgeBaseRefs`, `toneStylePreset`, `outputSchemaId`, `safetyOverrides`.

- **promptTemplate:** Inline markdown (see above). Contains a reference to `src/assistants/errors.md`; that file is not loaded or inlined by the plugin at runtime.
- **instructionBlocks:** Empty array `[]`.
- **quickActions:** Two actions, both `executionType: "llm"`, with `requiresSelection` and `requiresVision: true`, `maxImages: 1`, `imageScale: 2`.

---

## 2) Legacy Custom Knowledge Overlay (per-assistant .md)

**File merged for Errors:** [custom/knowledge/errors.md](../../custom/knowledge/errors.md)

**Full contents (verbatim):**

```markdown
# Custom Knowledge Base: Errors Assistant

Add your custom knowledge base content here. This content will be merged with the public knowledge base according to the policy configured in `config.json`.

## Usage

1. Edit this file with your organization-specific error detection guidelines
2. Configure the merge policy in `../config.json`:
   - `"append"`: Adds this content to the public knowledge base
   - `"override"`: Replaces the public knowledge base entirely
3. Rebuild the plugin: `npm run build`
```

**Policy for Errors in config:** Errors has **no** entry under `knowledgeBases` in [custom/config.json](../../custom/config.json). The config has an empty `knowledgeBases` object. Therefore no append/override policy is applied for the Errors assistant.

**Config subsection (verbatim):**

```json
"knowledgeBases": {}
```

**Runtime behavior:** [src/custom/knowledge.ts](../../src/custom/knowledge.ts) `mergeKnowledgeBase(assistantId, publicContent)` only merges when `customConfig?.knowledgeBases?.[assistantId]` is set. For `assistantId === "errors"` that is undefined, so `mergeKnowledgeBase("errors", promptTemplate)` returns `promptTemplate` unchanged. The content of `custom/knowledge/errors.md` is **not** merged into the Errors assistant at runtime (it exists in [src/custom/generated/customKnowledge.ts](../../src/custom/generated/customKnowledge.ts) as `customKnowledgeByAssistant["errors"]`, but is never used because there is no `knowledgeBases.errors` config).

---

## 3) Legacy Prompt Markdown or Text Referenced by promptTemplate

The Errors `promptTemplate` is **inline** in the manifest (see section 1). It also contains the text:

`[Full knowledge base available in: src/assistants/errors.md]`

That is a reference to a file path; the plugin does **not** resolve or load that path at runtime. The file exists in the repo for documentation/reference.

**Referenced file:** [src/assistants/errors.md](../../src/assistants/errors.md)

This file is **not** loaded or inlined at runtime by the plugin; the promptTemplate only references its path. Full contents (verbatim) for migration reference:

```markdown (figmai_plugin/src/assistants/errors.md)
# Errors Assistant

You are **FigmAI's Errors Assistant**, a design quality assurance specialist embedded inside a Figma plugin.
You identify design errors, inconsistencies, and quality issues that could cause problems in implementation or user experience.

---

## Your Role

Diagnose design problems and provide specific, actionable fixes that help designers catch issues before handoff.

Your evaluations focus on:
- **Layout Errors**: Misalignment, overflow, constraint issues
- **Style Inconsistencies**: Spacing, colors, typography mismatches
- **Component Misuse**: Wrong variants, missing states, incorrect usage
- **Naming Issues**: Unclear or inconsistent layer names
- **Missing Elements**: Error states, loading states, empty states
- **Implementation Issues**: Problems that will cause development challenges

Assume the user is a designer or QA reviewer who values direct, diagnostic feedback that helps them fix issues quickly.

---

## Input Expectations

You will receive:
- Selected Figma frames or components
- Visual context (images of the design) - **REQUIRED for accurate analysis**
- Node information (types, names, dimensions, properties)
- Layout properties (auto-layout, padding, gaps, constraints)
- Component/instance information
- Text content and styling

**Critical**: Visual context is essential for identifying layout and visual errors. If images are not available, you can still provide analysis based on node information but must note limitations.

---

(Remaining sections of src/assistants/errors.md — Output Structure (STRICT) with full JSON schema and example, Error Categories, Severity Levels, Error Structure, Warnings, Checklist, Evaluation Guidelines, Missing Selection JSON, Context Usage — are in the repo file. Full verbatim: figmai_plugin/src/assistants/errors.md, 339 lines.)
```

---

## 4) Structured Knowledge Base Inputs (if already referenced)

The Errors assistant entry in [custom/assistants.manifest.json](../../custom/assistants.manifest.json) does **not** define `knowledgeBaseRefs`. The generated type allows `knowledgeBaseRefs?: string[]`, but the Errors entry does not include it, so at runtime `errors.knowledgeBaseRefs` is `undefined` → treated as `[]`.

**Conclusion:** No structured KB inputs are referenced for Errors. No registry or `.kb.json` entries are used for this assistant.

**For completeness, registry and example KB (not used by Errors):**

- [custom/knowledge-bases/registry.json](../../custom/knowledge-bases/registry.json):

```json
{"knowledgeBases":[{"id":"test-kb","title":"Test Knowledge Base","filePath":"test-kb.kb.json","updatedAt":"2026-02-07T00:25:31.744Z"}]}
```

- Errors does not reference `test-kb` or any other id. No `custom/knowledge-bases/<id>.kb.json` is used for Errors.

---

## 5) Handler / Runtime Code That Adds Constraints or Formats Output (Errors-specific only)

**Search:** `src/core/assistants/handlers` and handler registry `getHandler` for `assistantId === 'errors'` and any Errors-specific `actionId`.

**Handler registry:** [src/core/assistants/handlers/index.ts](../../src/core/assistants/handlers/index.ts)

```typescript
const handlers: AssistantHandler[] = [
  new ContentTableHandler(),
  new DesignCritiqueHandler(),
  new DesignWorkshopHandler(),
  new DiscoveryCopilotHandler(),
  new AnalyticsTaggingHandler()
]

export function getHandler(assistantId: string, actionId: string | undefined): AssistantHandler | undefined {
  return handlers.find(handler => handler.canHandle(assistantId, actionId))
}
```

**Result:** No dedicated handler for the Errors assistant. None of the registered handlers implement `canHandle('errors', ...)`.

**Evidence:**

- [designCritique.ts](../../src/core/assistants/handlers/designCritique.ts): `canHandle(assistantId, actionId)` returns true only for `assistantId === 'design_critique'` and specific actionIds.
- [contentTable.ts](../../src/core/assistants/handlers/contentTable.ts): handles `content_table`.
- [designWorkshop.ts](../../src/core/assistants/handlers/designWorkshop.ts): handles `design_workshop`.
- [discovery.ts](../../src/core/assistants/handlers/discovery.ts): handles `discovery_copilot`.
- [analyticsTagging.ts](../../src/core/assistants/handlers/analyticsTagging.ts): handles `analytics_tagging`.

**Conclusion:** No Errors-specific handler exists. No handler adds instruction-like strings, schema expectations, or message preparation for Errors. Response formatting and constraints are therefore **only** from the instruction sources in sections 1–3 and 6 (and any backend behavior outside this repo).

---

## 6) Prompt Assembly: Where These Instructions Are Combined (Evidence only)

**6.1) Where `promptMarkdown` is built (merge + design system)**

Source: [src/assistants/index.ts](../../src/assistants/index.ts)

```typescript
// Build ASSISTANTS from manifest: promptMarkdown = mergeKnowledgeBase + appendDesignSystemKnowledge
export const ASSISTANTS: Assistant[] = ASSISTANTS_MANIFEST.map((entry) => {
  const { promptTemplate, ...rest } = entry
  const promptMarkdown = appendDesignSystemKnowledge(
    mergeKnowledgeBase(entry.id, promptTemplate)
  )
  return { ...rest, promptMarkdown }
})
```

Order: for each manifest entry, `promptMarkdown = appendDesignSystemKnowledge(mergeKnowledgeBase(entry.id, promptTemplate))`. So: **base = promptTemplate**, then optional custom merge, then optional DS append.

**6.2) `mergeKnowledgeBase` usage**

Source: [src/custom/knowledge.ts](../../src/custom/knowledge.ts)

```typescript
export function mergeKnowledgeBase(
  assistantId: string,
  publicContent: string
): string {
  const assistantPolicy = customConfig?.knowledgeBases?.[assistantId]
  if (!assistantPolicy) {
    return publicContent
  }

  const customContent = customKnowledgeByAssistant[assistantId]
  if (!customContent) {
    return publicContent
  }

  const policy = assistantPolicy.policy || 'append'
  if (policy === 'override') {
    return customContent
  } else {
    return `${publicContent}\n\n---\n\n${customContent}`
  }
}
```

For Errors, `assistantPolicy` is undefined, so `mergeKnowledgeBase("errors", promptTemplate)` always returns `promptTemplate` unchanged.

**6.3) `appendDesignSystemKnowledge`**

Source: [src/custom/knowledge.ts](../../src/custom/knowledge.ts)

```typescript
export function appendDesignSystemKnowledge(baseContent: string): string {
  const dsConfig = customConfig?.designSystems
  if (!dsConfig || dsConfig.enabled !== true) {
    return baseContent
  }
  try {
    const registries = loadDesignSystemRegistries()
    if (registries.length === 0) {
      return baseContent
    }
    const index = buildComponentIndex(registries)
    if (!index) {
      return baseContent
    }
    return `${baseContent}\n\n---\n\n${index}`
  } catch (error) {
    console.warn('[Knowledge] Failed to append design system knowledge:', error)
    return baseContent
  }
}
```

When design systems are enabled and registries load, the DS index is appended after `---` to `baseContent`.

**6.4) Function that assembles instruction segments for the LLM (preamble path)**

Source: [src/core/assistants/instructionAssembly.ts](../../src/core/assistants/instructionAssembly.ts)

Relevant portion (ordering and where KB segment is appended):

```typescript
export function buildAssistantInstructionSegments(
  params: BuildAssistantInstructionSegmentsParams
): InstructionAssemblyResult {
  const { assistantEntry, legacyInstructionsSource, kbDocs } = params
  const blocks = assistantEntry.instructionBlocks
  const hasEnabledBlocks =
    Array.isArray(blocks) && blocks.some((b) => b.enabled !== false)

  const segments: string[] = []
  if (hasEnabledBlocks && blocks!.length > 0) {
    for (const block of blocks!) {
      if (block.enabled === false) continue
      const prefix = KIND_PREFIX[block.kind] ?? ''
      const content = (block.content || '').trim()
      if (content) segments.push(prefix + content)
    }
    // ... tone, outputSchemaId
  }

  let instructionPreambleText =
    segments.length > 0 ? segments.join('\n\n') : legacyInstructionsSource

  if (Array.isArray(kbDocs) && kbDocs.length > 0) {
    const kbSegment = buildKbSegment(kbDocs)
    if (kbSegment) instructionPreambleText = instructionPreambleText + '\n\n' + kbSegment
  }
  // ...
}
```

For Errors: `instructionBlocks` is empty, so `instructionPreambleText` is set from `legacyInstructionsSource`. `kbDocs` is `[]` (no `knowledgeBaseRefs`), so no KB segment is appended.

**6.5) Where `buildAssistantInstructionSegments` is called and what is used as legacy source**

Source: [src/main.ts](../../src/main.ts) (chat message path, lines 553–558; quick-action path, lines 935–940).

```typescript
const kbDocs = resolveKnowledgeBaseDocs(currentAssistant.knowledgeBaseRefs ?? [])
const built = buildAssistantInstructionSegments({
  assistantEntry: currentAssistant,
  actionId: undefined,
  legacyInstructionsSource: getShortInstructions(currentAssistant),
  kbDocs
})
const preamble =
  SESSION_HEADER_SAFE +
  '\n\n' +
  `${currentAssistant.label} context: ${built.instructionPreambleText}\n\n`
// ... first user message is then: preamble + finalChatMessages[0].content
```

`legacyInstructionsSource` for Errors is `getShortInstructions(currentAssistant)`, which is derived from `assistant.promptMarkdown` (see 6.6). So the **preamble** contains only a short summary of the full prompt, not the full prompt or the full `src/assistants/errors.md` content.

**6.6) `getShortInstructions` (defines “short” legacy instructions)**

Source: [src/assistants/index.ts](../../src/assistants/index.ts)

```typescript
export function getShortInstructions(assistant: Assistant): string {
  const prompt = assistant.promptMarkdown || ''
  const firstParagraph = prompt.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length > 0 && firstParagraph.length <= 300) {
    return firstParagraph
  }
  const truncated = prompt.substring(0, 200)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 150) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + (prompt.length > 200 ? '...' : '')
}
```

So for Errors, the preamble text is the **first paragraph** of `promptMarkdown` (i.e. of `promptTemplate` + optional DS block), or a 200-character truncation. The full `errors.md` content is never passed to this path.

---

## 7) Effective Instruction Map (No speculation)

What the Errors assistant receives as instruction context at runtime, in order:

1. **Preamble prefix (when provider supports preamble injection)**  
   - **Segment:** `SESSION_HEADER_SAFE` plus `"Errors context: "` plus `instructionPreambleText`.  
   - **Source:** [src/main.ts](../../src/main.ts) (preamble injection block).  
   - **Content of `instructionPreambleText`:** For Errors, `getShortInstructions(assistant)` (first paragraph of `promptMarkdown`, or truncated to ~200 chars).  
   - **Conditional:** Only when `currentProvider.capabilities.supportsPreambleInjection` is true and it is the first user message in the segment.

2. **Legacy instruction source (short)**  
   - **Segment:** Same as above — `instructionPreambleText` = `getShortInstructions(assistant)` = first paragraph of `promptMarkdown`.  
   - **Source:** [src/assistants/index.ts](../../src/assistants/index.ts) `getShortInstructions()`; `promptMarkdown` from same file (built from manifest + merge + DS).  
   - **Conditional:** Always used when instructionBlocks are empty (as for Errors).

3. **Full promptTemplate (inline in manifest)**  
   - **Segment:** The full Errors `promptTemplate` string from the manifest (identity + one-sentence role + reference to `src/assistants/errors.md`).  
   - **Source:** [custom/assistants.manifest.json](../../custom/assistants.manifest.json) → [src/assistants/assistants.generated.ts](../../src/assistants/assistants.generated.ts); used as `promptMarkdown` after merge + DS.  
   - **Conditional:** Always; it is the base of `promptMarkdown`. (Only the short version is injected into the preamble; the full `promptMarkdown` is not sent in the request payload in the code paths audited; a proxy/backend could use `assistantId` to add more context.)

4. **Merged custom knowledge (legacy overlay)**  
   - **Segment:** None at runtime for Errors.  
   - **Source:** [custom/knowledge/errors.md](../../custom/knowledge/errors.md) exists and is in [src/custom/generated/customKnowledge.ts](../../src/custom/generated/customKnowledge.ts) as `customKnowledgeByAssistant["errors"]`, but [custom/config.json](../../custom/config.json) has no `knowledgeBases.errors`, so `mergeKnowledgeBase` never merges it.  
   - **Conditional:** Would only apply if `config.json` had `knowledgeBases.errors` with a policy; currently not applied.

5. **Design system knowledge**  
   - **Segment:** Design system component index (registry names, components, keys, purpose).  
   - **Source:** [src/custom/knowledge.ts](../../src/custom/knowledge.ts) `appendDesignSystemKnowledge()`; index from [src/core/designSystem/searchIndex.ts](../../src/core/designSystem/searchIndex.ts) `buildComponentIndex(registries)`; registries from [src/core/designSystem/registryLoader.ts](../../src/core/designSystem/registryLoader.ts).  
   - **Conditional:** Only when `customConfig.designSystems.enabled === true` and `loadDesignSystemRegistries()` returns at least one registry.

6. **Structured KB segment (ACE / .kb.json)**  
   - **Segment:** None.  
   - **Source:** Errors has no `knowledgeBaseRefs`; `resolveKnowledgeBaseDocs([])` returns `[]`; no KB segment is appended in `buildAssistantInstructionSegments`.  
   - **Conditional:** N/A.

7. **Handler-based message preparation or schema**  
   - **Segment:** None.  
   - **Source:** No handler handles `assistantId === 'errors'`.  
   - **Conditional:** N/A.

**Important:** The file [src/assistants/errors.md](../../src/assistants/errors.md) (output structure, categories, severity, evaluation guidelines) is **not** loaded or inlined anywhere in the plugin. Only the short manifest `promptTemplate` (and optionally the DS index) is used. To achieve behavior parity with that spec in ACE, its content must be carried into the normalized KB and used by the runtime that builds instructions or system/context messages.

---

## Summary Table

| # | Segment                     | Source(s)                                      | Conditional              |
|---|-----------------------------|------------------------------------------------|--------------------------|
| 1 | Preamble (header + label)   | main.ts                                        | Preamble injection only  |
| 2 | Short legacy instructions  | getShortInstructions(promptMarkdown)           | Always for Errors        |
| 3 | Full promptTemplate        | custom/assistants.manifest.json (inline)       | Always                   |
| 4 | Custom knowledge overlay  | custom/knowledge/errors.md                     | No (config has no entry) |
| 5 | Design system index        | appendDesignSystemKnowledge                    | designSystems.enabled    |
| 6 | Structured KB docs         | —                                              | None (no refs)           |
| 7 | Handler instructions       | —                                              | No Errors handler        |

---

*Audit complete. No code or config was modified.*
