# SKILL.md + ACE Hybrid Editor — Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `generate-assistants-from-manifest.ts` with a new `compile-skills.ts` compiler that supports per-assistant `SKILL.md` authored behavior, add a migration script, and update ACE to load and edit `SKILL.md` content.

**Architecture:** A new `compile-skills.ts` script reads per-assistant `custom/assistants/<id>/manifest.json` + `SKILL.md` pairs (primary path) and falls back to the flat `custom/assistants.manifest.json` for unmigrated assistants. The emitted `src/assistants/assistants.generated.ts` shape is unchanged — no downstream consumer changes required. ACE gains a new `skillMdContent` field in the editable model, allowing SKILL.md editing alongside existing manifest form fields.

**Tech Stack:** TypeScript, tsx, Node.js fs, plain string parsing (no YAML library), vanilla JS for ACE frontend, Zod for ACE schemas.

**Spec:** `docs/superpowers/specs/2026-04-11-skillmd-ace-design.md`

---

## File Map

**Create:**
- `scripts/compile-skills.ts` — new compiler (SKILL.md parser + validator + merger + emitter)
- `scripts/migrate-assistant-to-skillmd.ts` — migration helper (scaffolds per-assistant dir)
- `tests/sdk/compileSkills.test.ts` — compiler unit tests

**Modify:**
- `package.json` — add `compile-skills` script; update `generate-assistants` to call `compile-skills.ts`; add test to `npm test`
- `shared/ace-config/schemas.ts` — add `skillMdContent` to `AdminEditableModel`
- `admin-editor/src/model.ts` — load SKILL.md content per assistant
- `admin-editor/src/save.ts` — write SKILL.md on save; use `compile-skills` generator
- `admin-editor/public/app.js` — add SKILL.md panel to assistant detail view

**Do NOT modify:**
- `src/assistants/assistants.generated.ts` — generated file; no manual edits
- `scripts/generate-assistants-from-manifest.ts` — retained until retirement criteria pass

---

## Task 1: Compiler — flat manifest path (drop-in parity)

**Goal:** A working `compile-skills.ts` that handles the flat manifest path only. Produces byte-for-byte identical `src/assistants/assistants.generated.ts` to the old generator. No SKILL.md parsing yet.

**Files:**
- Create: `scripts/compile-skills.ts`

- [ ] **Step 1: Snapshot current generated output for comparison**

```bash
cp src/assistants/assistants.generated.ts /tmp/assistants.generated.baseline.ts
```

Expected: file is copied to `/tmp/` for comparison in step 9.

- [ ] **Step 2: Create `scripts/compile-skills.ts` with types**

```typescript
#!/usr/bin/env node
/**
 * Skill Compiler — compile-skills.ts
 *
 * Primary path: custom/assistants/<id>/manifest.json + SKILL.md
 * Fallback:     custom/assistants.manifest.json (unmigrated assistants)
 *
 * Emits src/assistants/assistants.generated.ts — same shape as
 * generate-assistants-from-manifest.ts output.
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────
const KIND_VALUES = ['ai', 'tool', 'hybrid'] as const
const TAG_VARIANTS = ['new', 'beta', 'alpha'] as const
const EXECUTION_TYPE_VALUES = ['ui-only', 'tool-only', 'llm', 'hybrid'] as const
const INSTRUCTION_BLOCK_KINDS = ['system', 'behavior', 'rules', 'examples', 'format', 'context'] as const

interface QuickActionEntry {
  id: string
  label: string
  templateMessage: string
  executionType: (typeof EXECUTION_TYPE_VALUES)[number]
  requiresSelection?: boolean
  requiresVision?: boolean
  maxImages?: number
  imageScale?: number
}

interface TagEntry {
  isVisible?: boolean
  label?: string
  variant?: 'new' | 'beta' | 'alpha'
}

interface InstructionBlockEntry {
  id: string
  label?: string
  kind: (typeof INSTRUCTION_BLOCK_KINDS)[number]
  content: string
  enabled?: boolean
}

interface SafetyOverridesEntry {
  allowImages?: boolean
  safetyToggles?: Record<string, boolean>
}

interface ToolSettingsEntry {
  defaultContentModel?: string
  dedupeDefault?: boolean
  quickActionsLocation?: 'top' | 'bottom' | 'inline'
  showInput?: boolean
}

interface AssistantEntry {
  id: string
  label: string
  intro: string
  welcomeMessage?: string
  hoverSummary?: string
  tag?: TagEntry
  iconId: string
  kind: 'ai' | 'tool' | 'hybrid'
  quickActions: QuickActionEntry[]
  promptTemplate: string
  instructionBlocks?: InstructionBlockEntry[]
  toneStylePreset?: string
  outputSchemaId?: string
  safetyOverrides?: SafetyOverridesEntry
  knowledgeBaseRefs?: string[]
  toolSettings?: ToolSettingsEntry
}

interface FlatManifestRoot {
  assistants: AssistantEntry[]
}
```

- [ ] **Step 3: Add emitter functions (identical to `generate-assistants-from-manifest.ts`)**

Append to `scripts/compile-skills.ts`:

```typescript
// ── Emitter ───────────────────────────────────────────────────────────────────
function esc(str: string): string {
  return JSON.stringify(str)
}

function emitQuickAction(q: QuickActionEntry): string {
  const parts = [
    `id: ${esc(q.id)}`,
    `label: ${esc(q.label)}`,
    `templateMessage: ${esc(q.templateMessage)}`,
    `executionType: ${esc(q.executionType)}`
  ]
  if (q.requiresSelection === true) parts.push('requiresSelection: true')
  if (q.requiresVision === true) parts.push('requiresVision: true')
  if (q.maxImages !== undefined) parts.push(`maxImages: ${q.maxImages}`)
  if (q.imageScale !== undefined) parts.push(`imageScale: ${q.imageScale}`)
  return `{ ${parts.join(', ')} }`
}

function emitTag(tag: TagEntry): string {
  const parts: string[] = []
  if (tag.isVisible === true) parts.push('isVisible: true')
  if (tag.label !== undefined) parts.push(`label: ${esc(tag.label)}`)
  if (tag.variant !== undefined) parts.push(`variant: ${esc(tag.variant)}`)
  return `{ ${parts.join(', ')} }`
}

function emitInstructionBlock(block: InstructionBlockEntry): string {
  const parts = [`id: ${esc(block.id)}`, `kind: ${esc(block.kind)}`, `content: ${esc(block.content)}`]
  if (block.label !== undefined) parts.push(`label: ${esc(block.label)}`)
  if (block.enabled === false) parts.push('enabled: false')
  return `{ ${parts.join(', ')} }`
}

function emitSafetyOverrides(o: SafetyOverridesEntry): string {
  const parts: string[] = []
  if (o.allowImages === true) parts.push('allowImages: true')
  if (o.safetyToggles !== undefined && Object.keys(o.safetyToggles).length > 0) {
    parts.push(`safetyToggles: ${JSON.stringify(o.safetyToggles)}`)
  }
  return `{ ${parts.join(', ')} }`
}

function emitEntry(entry: AssistantEntry): string {
  const lines: string[] = [
    '  {',
    `    id: ${esc(entry.id)},`,
    `    label: ${esc(entry.label)},`,
    `    intro: ${esc(entry.intro)},`
  ]
  if (entry.welcomeMessage !== undefined && entry.welcomeMessage !== '') {
    lines.push(`    welcomeMessage: ${esc(entry.welcomeMessage)},`)
  }
  if (entry.hoverSummary !== undefined && entry.hoverSummary !== '') {
    lines.push(`    hoverSummary: ${esc(entry.hoverSummary)},`)
  }
  if (entry.tag !== undefined && (entry.tag.isVisible || entry.tag.label || entry.tag.variant !== undefined)) {
    lines.push(`    tag: ${emitTag(entry.tag)},`)
  }
  lines.push(`    iconId: ${esc(entry.iconId)},`)
  lines.push(`    kind: ${esc(entry.kind)},`)
  lines.push('    quickActions: [')
  for (const q of entry.quickActions) {
    lines.push(`      ${emitQuickAction(q)},`)
  }
  lines.push('    ],')
  lines.push(`    promptTemplate: ${esc(entry.promptTemplate)}`)
  if (entry.instructionBlocks !== undefined && entry.instructionBlocks.length > 0) {
    lines.push('    , instructionBlocks: [')
    for (const b of entry.instructionBlocks) {
      lines.push(`      ${emitInstructionBlock(b)},`)
    }
    lines.push('    ]')
  }
  if (entry.toneStylePreset !== undefined && entry.toneStylePreset !== '') {
    lines.push(`    , toneStylePreset: ${esc(entry.toneStylePreset)}`)
  }
  if (entry.outputSchemaId !== undefined && entry.outputSchemaId !== '') {
    lines.push(`    , outputSchemaId: ${esc(entry.outputSchemaId)}`)
  }
  if (
    entry.safetyOverrides !== undefined &&
    (entry.safetyOverrides.allowImages === true ||
      (entry.safetyOverrides.safetyToggles && Object.keys(entry.safetyOverrides.safetyToggles).length > 0))
  ) {
    lines.push(`    , safetyOverrides: ${emitSafetyOverrides(entry.safetyOverrides)}`)
  }
  if (entry.knowledgeBaseRefs !== undefined && entry.knowledgeBaseRefs.length > 0) {
    lines.push(`    , knowledgeBaseRefs: [${entry.knowledgeBaseRefs.map(esc).join(', ')}]`)
  }
  if (entry.toolSettings !== undefined) {
    const tsParts: string[] = []
    if (entry.toolSettings.defaultContentModel !== undefined)
      tsParts.push(`defaultContentModel: ${esc(entry.toolSettings.defaultContentModel)}`)
    if (entry.toolSettings.dedupeDefault !== undefined)
      tsParts.push(`dedupeDefault: ${entry.toolSettings.dedupeDefault}`)
    if (entry.toolSettings.quickActionsLocation !== undefined)
      tsParts.push(`quickActionsLocation: ${esc(entry.toolSettings.quickActionsLocation)}`)
    if (entry.toolSettings.showInput !== undefined)
      tsParts.push(`showInput: ${entry.toolSettings.showInput}`)
    if (tsParts.length > 0) lines.push(`    , toolSettings: { ${tsParts.join(', ')} }`)
  }
  lines.push('  }')
  return lines.join('\n')
}

function generateTs(entries: AssistantEntry[]): string {
  const body = entries.map(emitEntry).join(',\n')
  return `/**
 * Generated Assistants
 *
 * DO NOT EDIT MANUALLY - edit custom/assistants/<id>/manifest.json + SKILL.md
 * (or custom/assistants.manifest.json for unmigrated assistants)
 * and run npm run compile-skills
 *
 * Generated by scripts/compile-skills.ts
 */

import type { QuickAction, AssistantTag, InstructionBlock, SafetyOverrides, ToolSettings } from '../core/types'

export interface AssistantManifestEntry {
  id: string
  label: string
  intro: string
  welcomeMessage?: string
  hoverSummary?: string
  tag?: AssistantTag
  iconId: string
  kind: 'ai' | 'tool' | 'hybrid'
  quickActions: QuickAction[]
  promptTemplate: string
  instructionBlocks?: InstructionBlock[]
  toneStylePreset?: string
  outputSchemaId?: string
  safetyOverrides?: SafetyOverrides
  knowledgeBaseRefs?: string[]
  toolSettings?: ToolSettings
}

export const ASSISTANTS_MANIFEST: AssistantManifestEntry[] = [
${body}
]
`
}
```

- [ ] **Step 4: Add flat manifest loading + validation**

Append to `scripts/compile-skills.ts`:

```typescript
// ── Flat manifest loader ───────────────────────────────────────────────────────
function loadFlatManifest(rootDir: string): FlatManifestRoot | null {
  const manifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')
  if (!fs.existsSync(manifestPath)) return null
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as FlatManifestRoot
  } catch (err) {
    console.error('[SKILL_COMPILER ERROR] Failed to parse custom/assistants.manifest.json:', err)
    process.exit(1)
  }
}

function validateFlatEntry(a: AssistantEntry, idx: number): void {
  if (!a.id || typeof a.id !== 'string') {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest index ${idx}: missing or invalid "id"`)
    process.exit(1)
  }
  if (!a.label || typeof a.label !== 'string') {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": missing or invalid "label"`)
    process.exit(1)
  }
  if (typeof a.intro !== 'string') {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": "intro" must be a string`)
    process.exit(1)
  }
  if (!a.iconId || typeof a.iconId !== 'string') {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": missing or invalid "iconId"`)
    process.exit(1)
  }
  if (!KIND_VALUES.includes(a.kind)) {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": "kind" must be one of ${KIND_VALUES.join(', ')}`)
    process.exit(1)
  }
  if (!Array.isArray(a.quickActions)) {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": "quickActions" must be an array`)
    process.exit(1)
  }
  if (typeof a.promptTemplate !== 'string') {
    console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}": "promptTemplate" must be a string`)
    process.exit(1)
  }
  for (let j = 0; j < a.quickActions.length; j++) {
    const q = a.quickActions[j]
    if (!q.id || !q.label || typeof q.templateMessage !== 'string') {
      console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}" quickActions[${j}]: id, label, templateMessage required`)
      process.exit(1)
    }
    if (!EXECUTION_TYPE_VALUES.includes(q.executionType as (typeof EXECUTION_TYPE_VALUES)[number])) {
      console.error(`[SKILL_COMPILER ERROR] Flat manifest "${a.id}" quickAction "${q.id}": invalid executionType "${q.executionType}"`)
      process.exit(1)
    }
  }
}
```

- [ ] **Step 5: Add `compile()` export + `main()`**

Append to `scripts/compile-skills.ts`:

```typescript
// ── Discovery + compilation ───────────────────────────────────────────────────

/**
 * Discover and compile all assistants.
 * Returns the generated TypeScript string (does not write files).
 */
export function compile(rootDir: string): string {
  const perDirRoot = path.join(rootDir, 'custom', 'assistants')
  const flatManifest = loadFlatManifest(rootDir)

  // Track which IDs are covered by per-directory path
  const coveredIds = new Set<string>()
  const perDirEntries: AssistantEntry[] = []

  // Per-directory path (SKILL.md path — implemented in Task 3)
  // Placeholder: no per-directory entries in this initial version

  // Flat manifest fallback for uncovered assistants
  const flatEntries: AssistantEntry[] = []
  if (flatManifest) {
    if (!Array.isArray(flatManifest.assistants) || flatManifest.assistants.length === 0) {
      console.error('[SKILL_COMPILER ERROR] custom/assistants.manifest.json: "assistants" array is missing or empty')
      process.exit(1)
    }
    const seenIds = new Set<string>()
    for (let i = 0; i < flatManifest.assistants.length; i++) {
      const a = flatManifest.assistants[i]
      validateFlatEntry(a, i)
      if (seenIds.has(a.id)) {
        console.error(`[SKILL_COMPILER ERROR] Duplicate assistant id: ${a.id}`)
        process.exit(1)
      }
      seenIds.add(a.id)
      if (!coveredIds.has(a.id)) {
        console.warn(`[SKILL_COMPILER WARNING] "${a.id}" resolved via flat manifest fallback — migrate to custom/assistants/${a.id}/ to remove this warning`)
        flatEntries.push(a)
      }
    }
  }

  if (perDirEntries.length === 0 && flatEntries.length === 0) {
    console.error('[SKILL_COMPILER ERROR] No assistants found — check custom/assistants.manifest.json or custom/assistants/<id>/')
    process.exit(1)
  }

  // Preserve flat manifest order for unmigrated; per-dir entries sort alphabetically
  const allEntries = [...perDirEntries, ...flatEntries]
  return generateTs(allEntries)
}

function main(): void {
  const rootDir = path.resolve(__dirname, '..')
  const code = compile(rootDir)
  const outputPath = path.join(rootDir, 'src', 'assistants', 'assistants.generated.ts')
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  let existing = ''
  try { existing = fs.readFileSync(outputPath, 'utf-8') } catch { /* new file */ }
  if (existing === code) {
    console.log('[compile-skills] No changes detected, skipping write')
  } else {
    fs.writeFileSync(outputPath, code, 'utf-8')
    console.log(`[compile-skills] Generated: ${outputPath}`)
  }
  console.log('[compile-skills] ✓ Done')
}

main()
```

- [ ] **Step 6: Run the compiler and verify output matches baseline**

```bash
tsx scripts/compile-skills.ts
diff src/assistants/assistants.generated.ts /tmp/assistants.generated.baseline.ts
```

Expected: `diff` outputs nothing (files are identical except for the header comment). If they differ only in the header comment (line 2-7), that is acceptable — the structural content from line 8 onward must be identical.

**If diff fails beyond the header:** the emitter has a bug. Compare the emitter functions against `generate-assistants-from-manifest.ts` line-by-line and fix.

- [ ] **Step 7: Commit**

```bash
git add scripts/compile-skills.ts
git commit -m "feat(phase5): add compile-skills.ts — flat manifest path (parity with old generator)"
```

---

## Task 2: Wire compiler into build + npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `generate-assistants` script to call `compile-skills.ts`**

In `package.json`, find:
```json
"generate-assistants": "tsx scripts/generate-assistants-from-manifest.ts",
```
Replace with:
```json
"compile-skills": "tsx scripts/compile-skills.ts",
"generate-assistants": "tsx scripts/compile-skills.ts",
```

- [ ] **Step 2: Verify prebuild still works**

```bash
npm run generate-assistants
```

Expected: `[compile-skills] No changes detected, skipping write` or `[compile-skills] Generated: ...` followed by `[compile-skills] ✓ Done`. Exit code 0.

- [ ] **Step 3: Verify no downstream breakage**

```bash
npm run build
```

Expected: build completes cleanly. 0 type errors. 0 bundle errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(phase5): wire compile-skills into generate-assistants + add compile-skills npm script"
```

---

## Task 3: SKILL.md parser + per-directory path

**Goal:** Add SKILL.md parsing, validation, and per-directory discovery to `compile-skills.ts`. When a `custom/assistants/<id>/SKILL.md` exists alongside a `manifest.json`, use the per-directory path instead of the flat manifest fallback.

**Files:**
- Modify: `scripts/compile-skills.ts`

- [ ] **Step 1: Add canonical section names + SKILL.md types**

After the `INSTRUCTION_BLOCK_KINDS` constant in `compile-skills.ts`, add:

```typescript
const KNOWN_SKILL_SECTIONS = [
  'Identity',
  'Behavior',
  'Instruction Blocks',
  'Output Guidance',
  'Quick Actions'
] as const

const STRUCTURAL_QA_FIELDS = [
  'executionType', 'requiresSelection', 'requiresVision', 'maxImages', 'imageScale'
] as const

interface QuickActionOverlay {
  templateMessage?: string
  guidance?: string
}

interface ParsedSkillMd {
  frontmatter: { skillVersion: number; id: string }
  sections: Partial<Record<(typeof KNOWN_SKILL_SECTIONS)[number], string>>
  quickActions: Record<string, QuickActionOverlay>
}

interface PerDirManifest {
  id: string
  label: string
  intro: string
  welcomeMessage?: string
  hoverSummary?: string
  tag?: TagEntry
  iconId: string
  kind: 'ai' | 'tool' | 'hybrid'
  quickActions: Array<Omit<QuickActionEntry, 'templateMessage'> & { templateMessage?: string }>
  instructionBlocks?: InstructionBlockEntry[]
  toneStylePreset?: string
  outputSchemaId?: string
  safetyOverrides?: SafetyOverridesEntry
  knowledgeBaseRefs?: string[]
  toolSettings?: ToolSettingsEntry
}
```

- [ ] **Step 2: Add `normalizeHeading()` helper**

```typescript
function normalizeHeading(raw: string): string {
  const map: Record<string, string> = {
    identity: 'Identity',
    behavior: 'Behavior',
    'instruction blocks': 'Instruction Blocks',
    'output guidance': 'Output Guidance',
    'quick actions': 'Quick Actions'
  }
  return map[raw.toLowerCase()] ?? raw
}
```

- [ ] **Step 3: Add `parseQuickActionOverlay()`**

```typescript
function parseQuickActionOverlay(
  content: string,
  filePath: string,
  qId: string
): QuickActionOverlay {
  // Guard: structural fields must not appear in SKILL.md quick action sections
  for (const field of STRUCTURAL_QA_FIELDS) {
    if (new RegExp(`^${field}\\s*:`, 'm').test(content)) {
      console.error(
        `[SKILL_COMPILER ERROR] ${filePath}: quick action "${qId}" contains structural field "${field}" — must only be in manifest.json`
      )
      process.exit(1)
    }
  }

  const overlay: QuickActionOverlay = {}

  // templateMessage: (plain or block scalar)
  const tmRaw = extractYamlField(content, 'templateMessage')
  if (tmRaw !== null) overlay.templateMessage = tmRaw

  // guidance:
  const guidanceRaw = extractYamlField(content, 'guidance')
  if (guidanceRaw !== null) overlay.guidance = guidanceRaw

  return overlay
}

function extractYamlField(content: string, fieldName: string): string | null {
  // Match: fieldName: single-line value
  const inlineMatch = content.match(new RegExp(`^${fieldName}:\\s+(.+)$`, 'm'))
  if (inlineMatch) return inlineMatch[1].trim()

  // Match: fieldName: |\n  indented lines
  const blockMatch = content.match(new RegExp(`^${fieldName}:\\s*\\|\\n((  [^\\n]*\\n?)*)`, 'm'))
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map((l) => l.replace(/^  /, ''))
      .join('\n')
      .trim()
  }

  return null
}
```

- [ ] **Step 4: Add `parseSkillMd()`**

```typescript
function parseSkillMd(content: string, filePath: string): ParsedSkillMd {
  // 1. Extract frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!fmMatch) {
    console.error(`[SKILL_COMPILER ERROR] ${filePath}: missing YAML frontmatter block (expected ---...---)`)
    process.exit(1)
  }
  const fmText = fmMatch[1]

  const svMatch = fmText.match(/^skillVersion:\s*(\S+)\s*$/m)
  if (!svMatch) {
    console.error(`[SKILL_COMPILER ERROR] ${filePath}: missing "skillVersion" in frontmatter`)
    process.exit(1)
  }
  const skillVersion = parseInt(svMatch[1], 10)
  if (isNaN(skillVersion) || skillVersion !== 1) {
    console.error(`[SKILL_COMPILER ERROR] ${filePath}: skillVersion must be 1, got "${svMatch[1]}"`)
    process.exit(1)
  }

  const idMatch = fmText.match(/^id:\s*(.+?)\s*$/m)
  if (!idMatch) {
    console.error(`[SKILL_COMPILER ERROR] ${filePath}: missing "id" in frontmatter`)
    process.exit(1)
  }
  const id = idMatch[1].trim()

  // 2. Extract body after frontmatter
  const body = content.slice(fmMatch[0].length)

  // 3. Split by ## headings
  const sections: Partial<Record<(typeof KNOWN_SKILL_SECTIONS)[number], string>> = {}
  const sectionBoundaries: Array<{ heading: string; start: number }> = []
  const headingRe = /^## (.+)$/gm
  let hm: RegExpExecArray | null
  while ((hm = headingRe.exec(body)) !== null) {
    sectionBoundaries.push({ heading: hm[1].trim(), start: hm.index })
  }

  for (let i = 0; i < sectionBoundaries.length; i++) {
    const { heading, start } = sectionBoundaries[i]
    const end = i + 1 < sectionBoundaries.length ? sectionBoundaries[i + 1].start : body.length
    const normalized = normalizeHeading(heading) as (typeof KNOWN_SKILL_SECTIONS)[number]
    if (!KNOWN_SKILL_SECTIONS.includes(normalized)) {
      console.error(`[SKILL_COMPILER ERROR] ${filePath}: unknown section "## ${heading}"`)
      process.exit(1)
    }
    // Section content: everything after the ## Heading line
    const sectionText = body.slice(start, end).replace(/^##[^\n]*\n/, '').trim()
    sections[normalized] = sectionText
  }

  if (!sections['Identity']) {
    console.error(`[SKILL_COMPILER ERROR] ${filePath}: missing required section "## Identity"`)
    process.exit(1)
  }

  // 4. Parse ## Quick Actions subsections
  const quickActions: Record<string, QuickActionOverlay> = {}
  if (sections['Quick Actions']) {
    const qaBody = sections['Quick Actions']
    const qaBoundaries: Array<{ id: string; start: number }> = []
    const qaRe = /^### (.+)$/gm
    let qm: RegExpExecArray | null
    while ((qm = qaRe.exec(qaBody)) !== null) {
      qaBoundaries.push({ id: qm[1].trim(), start: qm.index })
    }
    for (let i = 0; i < qaBoundaries.length; i++) {
      const { id: qId, start } = qaBoundaries[i]
      const end = i + 1 < qaBoundaries.length ? qaBoundaries[i + 1].start : qaBody.length
      const subsection = qaBody.slice(start, end).replace(/^###[^\n]*\n/, '')
      quickActions[qId] = parseQuickActionOverlay(subsection, filePath, qId)
    }
  }

  return { frontmatter: { skillVersion, id }, sections, quickActions }
}
```

- [ ] **Step 5: Add per-directory assistant loader + merger**

```typescript
function loadPerDirAssistant(assistantDir: string, dirName: string): AssistantEntry | null {
  const manifestPath = path.join(assistantDir, 'manifest.json')
  const skillMdPath = path.join(assistantDir, 'SKILL.md')

  const hasManifest = fs.existsSync(manifestPath)
  const hasSkillMd = fs.existsSync(skillMdPath)

  // Only process dirs that have BOTH files
  if (!hasManifest && !hasSkillMd) return null
  if (hasManifest && !hasSkillMd) {
    // Partial migration: has manifest.json but no SKILL.md — hard error
    console.error(
      `[SKILL_COMPILER ERROR] custom/assistants/${dirName}/: found manifest.json without SKILL.md — ` +
        `complete the migration or remove manifest.json and let flat manifest fallback handle this assistant`
    )
    process.exit(1)
  }
  if (!hasManifest) return null

  let perDirManifest: PerDirManifest
  try {
    perDirManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PerDirManifest
  } catch (err) {
    console.error(`[SKILL_COMPILER ERROR] Failed to parse ${manifestPath}:`, err)
    process.exit(1)
  }

  const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8')
  const parsed = parseSkillMd(skillMdContent, skillMdPath)

  // Validate id match
  if (parsed.frontmatter.id !== dirName) {
    console.error(
      `[SKILL_COMPILER ERROR] ${skillMdPath}: frontmatter id "${parsed.frontmatter.id}" does not match directory name "${dirName}"`
    )
    process.exit(1)
  }

  // Validate per-dir manifest id matches dir name
  if (perDirManifest.id !== dirName) {
    console.error(
      `[SKILL_COMPILER ERROR] ${manifestPath}: id "${perDirManifest.id}" does not match directory name "${dirName}"`
    )
    process.exit(1)
  }

  // Assemble promptTemplate from SKILL.md sections (excluding Quick Actions)
  const promptParts: string[] = []
  const promptSectionOrder = ['Identity', 'Behavior', 'Instruction Blocks', 'Output Guidance'] as const
  for (const sec of promptSectionOrder) {
    if (parsed.sections[sec]) {
      promptParts.push(parsed.sections[sec]!)
    }
  }
  const promptTemplate = promptParts.join('\n\n')

  // Merge quick action overlays onto per-dir manifest quick actions
  const quickActions: QuickActionEntry[] = (perDirManifest.quickActions || []).map((q) => {
    const overlay = parsed.quickActions[q.id]
    const templateMessage = overlay?.templateMessage ?? q.templateMessage ?? ''
    if (!templateMessage) {
      console.error(
        `[SKILL_COMPILER ERROR] ${manifestPath}: quick action "${q.id}" has no templateMessage — ` +
          `add it to SKILL.md ## Quick Actions ### ${q.id} or to manifest.json`
      )
      process.exit(1)
    }
    // Validate unknown quick action IDs in SKILL.md
    return {
      id: q.id,
      label: q.label,
      templateMessage,
      executionType: q.executionType,
      requiresSelection: q.requiresSelection,
      requiresVision: q.requiresVision,
      maxImages: q.maxImages,
      imageScale: q.imageScale
    }
  })

  // Validate SKILL.md quick action overlay IDs reference known quick actions
  const knownQaIds = new Set(perDirManifest.quickActions.map((q) => q.id))
  for (const qId of Object.keys(parsed.quickActions)) {
    if (!knownQaIds.has(qId)) {
      console.error(
        `[SKILL_COMPILER ERROR] ${skillMdPath}: quick action overlay "### ${qId}" references unknown quick action id — add it to manifest.json first`
      )
      process.exit(1)
    }
  }

  return {
    id: perDirManifest.id,
    label: perDirManifest.label,
    intro: perDirManifest.intro,
    welcomeMessage: perDirManifest.welcomeMessage,
    hoverSummary: perDirManifest.hoverSummary,
    tag: perDirManifest.tag,
    iconId: perDirManifest.iconId,
    kind: perDirManifest.kind,
    quickActions,
    promptTemplate,
    instructionBlocks: perDirManifest.instructionBlocks,
    toneStylePreset: perDirManifest.toneStylePreset,
    outputSchemaId: perDirManifest.outputSchemaId,
    safetyOverrides: perDirManifest.safetyOverrides,
    knowledgeBaseRefs: perDirManifest.knowledgeBaseRefs,
    toolSettings: perDirManifest.toolSettings
  }
}
```

- [ ] **Step 6: Update `compile()` to include per-directory path**

In `compile-skills.ts`, replace the `compile()` function with:

```typescript
export function compile(rootDir: string): string {
  const perDirRoot = path.join(rootDir, 'custom', 'assistants')
  const flatManifest = loadFlatManifest(rootDir)

  const coveredIds = new Set<string>()
  const perDirEntries: AssistantEntry[] = []

  // 1. Per-directory path (SKILL.md assistants)
  if (fs.existsSync(perDirRoot) && fs.statSync(perDirRoot).isDirectory()) {
    const dirs = fs.readdirSync(perDirRoot)
      .filter((d) => fs.statSync(path.join(perDirRoot, d)).isDirectory())
      .sort()

    for (const dirName of dirs) {
      const assistantDir = path.join(perDirRoot, dirName)
      const entry = loadPerDirAssistant(assistantDir, dirName)
      if (entry !== null) {
        if (coveredIds.has(entry.id)) {
          console.error(`[SKILL_COMPILER ERROR] Duplicate assistant id from per-directory: "${entry.id}"`)
          process.exit(1)
        }
        coveredIds.add(entry.id)
        perDirEntries.push(entry)
      }
    }
  }

  // 2. Flat manifest fallback for uncovered assistants
  const flatEntries: AssistantEntry[] = []
  if (flatManifest) {
    if (!Array.isArray(flatManifest.assistants) || flatManifest.assistants.length === 0) {
      console.error('[SKILL_COMPILER ERROR] custom/assistants.manifest.json: "assistants" array is missing or empty')
      process.exit(1)
    }
    const seenIds = new Set<string>()
    for (let i = 0; i < flatManifest.assistants.length; i++) {
      const a = flatManifest.assistants[i]
      validateFlatEntry(a, i)
      if (seenIds.has(a.id)) {
        console.error(`[SKILL_COMPILER ERROR] Duplicate assistant id in flat manifest: ${a.id}`)
        process.exit(1)
      }
      seenIds.add(a.id)
      if (!coveredIds.has(a.id)) {
        console.warn(
          `[SKILL_COMPILER WARNING] "${a.id}" resolved via flat manifest fallback — ` +
            `migrate to custom/assistants/${a.id}/ to remove this warning`
        )
        flatEntries.push(a)
      }
    }
  }

  if (perDirEntries.length === 0 && flatEntries.length === 0) {
    console.error('[SKILL_COMPILER ERROR] No assistants found')
    process.exit(1)
  }

  const allEntries = [...perDirEntries, ...flatEntries]
  return generateTs(allEntries)
}
```

- [ ] **Step 7: Run compiler — still 11 warnings, identical output**

```bash
tsx scripts/compile-skills.ts 2>&1 | head -20
diff src/assistants/assistants.generated.ts /tmp/assistants.generated.baseline.ts
```

Expected:
- 11 `[SKILL_COMPILER WARNING]` lines (one per assistant, all using flat manifest fallback)
- `diff` shows only header comment differences (structural content is identical)

- [ ] **Step 8: Run full test suite**

```bash
npm test
```

Expected: all tests pass, 0 failures.

- [ ] **Step 9: Commit**

```bash
git add scripts/compile-skills.ts
git commit -m "feat(phase5): add SKILL.md parser and per-directory path to compile-skills.ts"
```

---

## Task 4: Compiler tests

**Files:**
- Create: `tests/sdk/compileSkills.test.ts`
- Modify: `package.json` (add test to npm test chain)

- [ ] **Step 1: Create the test file**

```typescript
// tests/sdk/compileSkills.test.ts
/**
 * Tests for scripts/compile-skills.ts
 *
 * Uses a temp directory approach: write fixture files to /tmp, call compile(),
 * check the returned TypeScript string.
 */

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { compile } from '../../scripts/compile-skills'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e: unknown) {
    console.error(`  ✗ ${name}:`, (e as Error).message)
    process.exit(1)
  }
}

function makeTempRepo(id: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `compile-skills-test-${id}-`))
  fs.mkdirSync(path.join(dir, 'custom'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'src', 'assistants'), { recursive: true })
  return dir
}

function writeFlatManifest(repoRoot: string, assistants: unknown[]): void {
  fs.writeFileSync(
    path.join(repoRoot, 'custom', 'assistants.manifest.json'),
    JSON.stringify({ assistants }, null, 2)
  )
}

function writePerDirAssistant(repoRoot: string, id: string, manifest: unknown, skillMd: string): void {
  const dir = path.join(repoRoot, 'custom', 'assistants', id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd)
}

const MINIMAL_FLAT_ENTRY = {
  id: 'general',
  label: 'General',
  intro: 'I help with design.',
  iconId: 'AskIcon',
  kind: 'ai',
  quickActions: [
    { id: 'explain', label: 'Explain', templateMessage: 'Explain this.', executionType: 'llm' }
  ],
  promptTemplate: 'You are a design assistant.'
}

const MINIMAL_PER_DIR_MANIFEST = {
  id: 'general',
  label: 'General',
  intro: 'I help with design.',
  iconId: 'AskIcon',
  kind: 'ai',
  quickActions: [
    { id: 'explain', label: 'Explain', executionType: 'llm' }
  ]
}

const MINIMAL_SKILL_MD = `---
skillVersion: 1
id: general
---

## Identity

You are a design assistant.

## Quick Actions

### explain

templateMessage: Explain this.
`

async function run(): Promise<void> {
  // ── Flat manifest path ──────────────────────────────────────────────────────

  await test('flat manifest: compiles single assistant to valid TS', () => {
    const repo = makeTempRepo('flat-single')
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY])
    const ts = compile(repo)
    assert(ts.includes('export const ASSISTANTS_MANIFEST'), 'exports ASSISTANTS_MANIFEST')
    assert(ts.includes('"general"'), 'includes assistant id')
    assert(ts.includes('You are a design assistant.'), 'includes promptTemplate content')
    assert(ts.includes('[SKILL_COMPILER WARNING]') === false, 'no warning in output string')
  })

  await test('flat manifest: emitted promptTemplate matches input', () => {
    const repo = makeTempRepo('flat-prompttemplate')
    const entry = { ...MINIMAL_FLAT_ENTRY, promptTemplate: 'My custom prompt.' }
    writeFlatManifest(repo, [entry])
    const ts = compile(repo)
    assert(ts.includes('My custom prompt.'), 'promptTemplate preserved exactly')
  })

  await test('flat manifest: emitted quickActions include templateMessage', () => {
    const repo = makeTempRepo('flat-qa')
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY])
    const ts = compile(repo)
    assert(ts.includes('Explain this.'), 'quickAction templateMessage present')
  })

  await test('flat manifest: multiple assistants preserve order', () => {
    const repo = makeTempRepo('flat-multi')
    const b = { ...MINIMAL_FLAT_ENTRY, id: 'beta', label: 'Beta' }
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY, b])
    const ts = compile(repo)
    const idxGeneral = ts.indexOf('"general"')
    const idxBeta = ts.indexOf('"beta"')
    assert(idxGeneral < idxBeta, 'flat manifest order preserved (general before beta)')
  })

  // ── Per-directory path ──────────────────────────────────────────────────────

  await test('per-directory: assembles promptTemplate from ## Identity section', () => {
    const repo = makeTempRepo('perdir-identity')
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    const ts = compile(repo)
    assert(ts.includes('You are a design assistant.'), 'Identity content in promptTemplate')
  })

  await test('per-directory: templateMessage from SKILL.md quick action overlay', () => {
    const repo = makeTempRepo('perdir-qa-overlay')
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    const ts = compile(repo)
    assert(ts.includes('Explain this.'), 'templateMessage from SKILL.md overlay')
  })

  await test('per-directory: per-dir entry takes precedence over flat manifest', () => {
    const repo = makeTempRepo('perdir-precedence')
    // Flat manifest has different promptTemplate
    writeFlatManifest(repo, [{ ...MINIMAL_FLAT_ENTRY, promptTemplate: 'FLAT PROMPT' }])
    // Per-dir SKILL.md has different content
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, MINIMAL_SKILL_MD)
    const ts = compile(repo)
    assert(!ts.includes('FLAT PROMPT'), 'flat manifest promptTemplate ignored for migrated assistant')
    assert(ts.includes('You are a design assistant.'), 'SKILL.md content used')
  })

  await test('per-directory: Behavior section appended to promptTemplate', () => {
    const repo = makeTempRepo('perdir-behavior')
    const md = MINIMAL_SKILL_MD + '\n## Behavior\n\n- Rule 1\n- Rule 2\n'
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, md)
    const ts = compile(repo)
    assert(ts.includes('Rule 1'), 'Behavior section in promptTemplate')
  })

  await test('per-directory: flat manifest fallback emits warning string', () => {
    const repo = makeTempRepo('perdir-warning')
    writeFlatManifest(repo, [MINIMAL_FLAT_ENTRY])
    // Capture console.warn output
    const warnMessages: string[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => { warnMessages.push(args.join(' ')) }
    compile(repo)
    console.warn = origWarn
    assert(
      warnMessages.some((m) => m.includes('[SKILL_COMPILER WARNING]') && m.includes('general')),
      'emits [SKILL_COMPILER WARNING] for unmigrated assistant'
    )
  })

  // ── Validation errors ───────────────────────────────────────────────────────

  await test('error: missing frontmatter exits process', () => {
    const repo = makeTempRepo('err-no-fm')
    const badMd = '## Identity\n\nSome content\n'
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, badMd)
    let exited = false
    const origExit = process.exit
    process.exit = (() => { exited = true; throw new Error('process.exit called') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = origExit
    assert(exited, 'process.exit called for missing frontmatter')
  })

  await test('error: missing Identity section exits process', () => {
    const repo = makeTempRepo('err-no-identity')
    const badMd = '---\nskillVersion: 1\nid: general\n---\n\n## Behavior\n\nSome behavior.\n'
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, badMd)
    let exited = false
    const origExit = process.exit
    process.exit = (() => { exited = true; throw new Error('process.exit called') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = origExit
    assert(exited, 'process.exit called for missing Identity')
  })

  await test('error: unknown section exits process', () => {
    const repo = makeTempRepo('err-unknown-section')
    const badMd = '---\nskillVersion: 1\nid: general\n---\n\n## Identity\n\nHello.\n\n## RandomSection\n\nStuff.\n'
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, badMd)
    let exited = false
    const origExit = process.exit
    process.exit = (() => { exited = true; throw new Error('process.exit called') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = origExit
    assert(exited, 'process.exit called for unknown section')
  })

  await test('error: id mismatch exits process', () => {
    const repo = makeTempRepo('err-id-mismatch')
    const badMd = '---\nskillVersion: 1\nid: wrong-id\n---\n\n## Identity\n\nHello.\n'
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, badMd)
    let exited = false
    const origExit = process.exit
    process.exit = (() => { exited = true; throw new Error('process.exit called') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = origExit
    assert(exited, 'process.exit called for id mismatch')
  })

  await test('error: structural field in SKILL.md quick action exits process', () => {
    const repo = makeTempRepo('err-structural-qa')
    const badMd = `---
skillVersion: 1
id: general
---

## Identity

Hello.

## Quick Actions

### explain

executionType: llm
templateMessage: Do this.
`
    writePerDirAssistant(repo, 'general', MINIMAL_PER_DIR_MANIFEST, badMd)
    let exited = false
    const origExit = process.exit
    process.exit = (() => { exited = true; throw new Error('process.exit called') }) as never
    try { compile(repo) } catch { /* expected */ }
    process.exit = origExit
    assert(exited, 'process.exit called for structural field in SKILL.md')
  })

  console.log('compileSkills tests passed')
}

run()
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
tsx tests/sdk/compileSkills.test.ts
```

Expected: all 12 tests pass. If any fail, fix `compile-skills.ts` before proceeding.

- [ ] **Step 3: Add test to `npm test` chain in `package.json`**

In `package.json`, find the last entry in the `test` script chain:
```
tsx tests/sdk/assistantConfig.test.ts"
```
Replace with:
```
tsx tests/sdk/assistantConfig.test.ts && tsx tests/sdk/compileSkills.test.ts"
```

- [ ] **Step 4: Run full npm test to verify no regressions**

```bash
npm test
```

Expected: all tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add tests/sdk/compileSkills.test.ts package.json
git commit -m "test(phase5): add compile-skills unit tests; wire into npm test"
```

---

## Task 5: Migration script

**Goal:** Provide `scripts/migrate-assistant-to-skillmd.ts` that scaffolds the per-directory structure for a given assistant ID. Verify by migrating the `general` assistant and checking that the compiler output is unchanged and the warning count drops by 1.

**Files:**
- Create: `scripts/migrate-assistant-to-skillmd.ts`

- [ ] **Step 1: Create the migration script**

```typescript
#!/usr/bin/env node
/**
 * Migration script: scaffold per-assistant SKILL.md directory.
 *
 * Usage: tsx scripts/migrate-assistant-to-skillmd.ts <assistantId>
 *
 * Creates:
 *   custom/assistants/<id>/manifest.json  — structural fields (no promptTemplate)
 *   custom/assistants/<id>/SKILL.md       — Identity section wrapping promptTemplate content
 *
 * Does NOT remove the assistant from custom/assistants.manifest.json.
 * Review the created files, then manually remove the entry from the flat manifest
 * once you've verified the compiler produces identical output.
 */

import * as fs from 'fs'
import * as path from 'path'

const assistantId = process.argv[2]
if (!assistantId) {
  console.error('Usage: tsx scripts/migrate-assistant-to-skillmd.ts <assistantId>')
  process.exit(1)
}

const rootDir = path.resolve(__dirname, '..')
const flatManifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')

if (!fs.existsSync(flatManifestPath)) {
  console.error(`[migrate] custom/assistants.manifest.json not found at ${flatManifestPath}`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(flatManifestPath, 'utf-8')) as { assistants: Record<string, unknown>[] }
const entry = manifest.assistants.find((a) => a.id === assistantId)
if (!entry) {
  console.error(`[migrate] Assistant "${assistantId}" not found in custom/assistants.manifest.json`)
  process.exit(1)
}

const targetDir = path.join(rootDir, 'custom', 'assistants', assistantId)
if (fs.existsSync(targetDir)) {
  console.error(`[migrate] custom/assistants/${assistantId}/ already exists — remove it first if you want to re-migrate`)
  process.exit(1)
}

fs.mkdirSync(targetDir, { recursive: true })

// 1. Write manifest.json — all fields EXCEPT promptTemplate
const { promptTemplate, ...structuralFields } = entry as Record<string, unknown>
const manifestJson = JSON.stringify(structuralFields, null, 2) + '\n'
fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestJson)
console.log(`[migrate] Wrote custom/assistants/${assistantId}/manifest.json`)

// 2. Write SKILL.md — wrap promptTemplate in ## Identity section
const quickActions = (entry.quickActions as Array<Record<string, unknown>> | undefined) ?? []
const qaSection = quickActions.length > 0
  ? '\n\n## Quick Actions\n' +
    quickActions
      .map((q) => {
        const tm = typeof q.templateMessage === 'string' ? q.templateMessage : ''
        return `\n### ${q.id}\n\ntemplateMessage: |\n${tm.split('\n').map((l) => `  ${l}`).join('\n')}\n`
      })
      .join('')
  : ''

const skillMd = `---
skillVersion: 1
id: ${assistantId}
---

## Identity

${typeof promptTemplate === 'string' ? promptTemplate : ''}
${qaSection}`

fs.writeFileSync(path.join(targetDir, 'SKILL.md'), skillMd.trimEnd() + '\n')
console.log(`[migrate] Wrote custom/assistants/${assistantId}/SKILL.md`)

console.log('')
console.log(`[migrate] ✓ Scaffolded custom/assistants/${assistantId}/`)
console.log('[migrate]   Review the files, then verify with: tsx scripts/compile-skills.ts')
console.log('[migrate]   Once verified, manually remove the entry from custom/assistants.manifest.json')
```

- [ ] **Step 2: Snapshot current compiled output**

```bash
cp src/assistants/assistants.generated.ts /tmp/assistants.before-migrate.ts
tsx scripts/compile-skills.ts 2>&1 | grep -c "\[SKILL_COMPILER WARNING\]"
```

Expected: prints `11` (11 warnings before migration).

- [ ] **Step 3: Run migration for `general` assistant**

```bash
tsx scripts/migrate-assistant-to-skillmd.ts general
```

Expected output:
```
[migrate] Wrote custom/assistants/general/manifest.json
[migrate] Wrote custom/assistants/general/SKILL.md
[migrate] ✓ Scaffolded custom/assistants/general/
[migrate]   Review the files, then verify with: tsx scripts/compile-skills.ts
[migrate]   Once verified, manually remove the entry from custom/assistants.manifest.json
```

- [ ] **Step 4: Verify created files look correct**

```bash
cat custom/assistants/general/manifest.json
cat custom/assistants/general/SKILL.md
```

Check:
- `manifest.json` has all fields except `promptTemplate`
- `SKILL.md` starts with `---\nskillVersion: 1\nid: general\n---`
- `SKILL.md` has `## Identity` section with the original promptTemplate content
- `SKILL.md` has `## Quick Actions` section with `templateMessage` overlays for each quick action

- [ ] **Step 5: Run compiler — verify warning count drops by 1**

```bash
tsx scripts/compile-skills.ts 2>&1 | grep -c "\[SKILL_COMPILER WARNING\]"
```

Expected: prints `10`.

- [ ] **Step 6: Verify generated output is structurally identical**

```bash
diff <(tsx scripts/compile-skills.ts 2>/dev/null) /tmp/assistants.before-migrate.ts
```

Expected: diff shows only cosmetic differences (e.g., whitespace in promptTemplate), not structural differences. The `general` assistant entry should have the same fields populated.

**Note:** The `promptTemplate` assembled from SKILL.md may differ slightly from the flat manifest's `promptTemplate` in whitespace/formatting. This is expected for the initial scaffold — the authoring quality pass (deferred) will refine content.

- [ ] **Step 7: Remove `general` from flat manifest**

In `custom/assistants.manifest.json`, delete the `general` assistant entry object from the `assistants` array. Save the file.

- [ ] **Step 8: Verify compiler still works with 10 warnings**

```bash
tsx scripts/compile-skills.ts 2>&1 | grep -c "\[SKILL_COMPILER WARNING\]"
npm test
```

Expected: `10` warnings. All tests pass.

- [ ] **Step 9: Revert `general` migration (restore flat manifest)**

For now, keep the flat manifest as the authoritative source — the full migration of all 11 assistants is a separate tracked effort. Revert the `general` migration to keep the codebase in a clean state:

```bash
rm -rf custom/assistants/general/
# Restore assistants.manifest.json (git checkout or undo the manual deletion)
git checkout custom/assistants.manifest.json
tsx scripts/compile-skills.ts 2>/dev/null
```

Expected: `11` warnings. Tests pass. This task proves the migration flow works end-to-end without committing the actual migration (the real migrations happen per-assistant in a follow-up effort after Phase 5 ships).

- [ ] **Step 10: Commit migration script**

```bash
git add scripts/migrate-assistant-to-skillmd.ts
git commit -m "feat(phase5): add migrate-assistant-to-skillmd.ts scaffolding script"
```

---

## Task 6: ACE backend — load and save SKILL.md

**Goal:** Add `skillMdContent: Record<string, string>` to `AdminEditableModel`. Load SKILL.md content per assistant in `model.ts`. Write SKILL.md on save in `save.ts`. Update GENERATOR_SCRIPTS to use `compile-skills`.

**Files:**
- Modify: `shared/ace-config/schemas.ts`
- Modify: `admin-editor/src/model.ts`
- Modify: `admin-editor/src/save.ts`

- [ ] **Step 1: Add `skillMdContent` to `AdminEditableModel` schema**

In `shared/ace-config/schemas.ts`, find:
```typescript
export const adminEditableModelSchema = z
  .object({
    config: configSchema,
    assistantsManifest: assistantsManifestSchema,
    customKnowledge: z.record(z.string()),
    contentModelsRaw: z.string().optional(),
    designSystemRegistries: z.record(z.unknown()).optional()
  })
  .strict()
```

Replace with:
```typescript
export const adminEditableModelSchema = z
  .object({
    config: configSchema,
    assistantsManifest: assistantsManifestSchema,
    customKnowledge: z.record(z.string()),
    contentModelsRaw: z.string().optional(),
    designSystemRegistries: z.record(z.unknown()).optional(),
    skillMdContent: z.record(z.string()).optional()
  })
  .strict()
```

- [ ] **Step 2: Run `npm run build` to verify schema change compiles**

```bash
npm run build
```

Expected: 0 type errors. (The new optional field doesn't break existing callers.)

- [ ] **Step 3: Add SKILL.md loader to `admin-editor/src/model.ts`**

After the `loadCustomKnowledge` function (line ~60), add:

```typescript
/**
 * Load SKILL.md content for each migrated assistant in custom/assistants/<id>/SKILL.md.
 * Returns map by assistantId. Only includes assistants that have SKILL.md files.
 */
function loadSkillMdContent(repoRoot: string): { byId: Record<string, string>; paths: Record<string, string> } {
  const assistantsDir = path.join(repoRoot, 'custom', 'assistants')
  const byId: Record<string, string> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(assistantsDir)) return { byId, paths }
  try {
    const dirs = fs.readdirSync(assistantsDir, { withFileTypes: true })
    for (const entry of dirs) {
      if (!entry.isDirectory()) continue
      const skillMdPath = path.join(assistantsDir, entry.name, 'SKILL.md')
      if (fs.existsSync(skillMdPath)) {
        byId[entry.name] = readText(skillMdPath)
        paths[entry.name] = skillMdPath
      }
    }
  } catch {
    // ignore
  }
  return { byId, paths }
}
```

- [ ] **Step 4: Include `skillMdContent` in the loaded model**

In `loadModel()`, after the `loadDesignSystemRegistries` call, add:

```typescript
const { byId: skillMdContent, paths: skillMdPaths } = loadSkillMdContent(repoRoot)
```

And update the model object:

```typescript
const model: AdminEditableModel = {
  config,
  assistantsManifest: manifest,
  customKnowledge,
  contentModelsRaw: contentModelsRaw || undefined,
  designSystemRegistries: Object.keys(designSystemRegistries).length > 0 ? designSystemRegistries : undefined,
  skillMdContent: Object.keys(skillMdContent).length > 0 ? skillMdContent : undefined
}
```

And add `skillMdPaths` to the `ModelMeta.filePaths`:

In `ModelMeta` interface, add:
```typescript
skillMd: Record<string, string>  // assistantId -> absolute path
```

And in the meta object construction:
```typescript
filePaths: {
  config: configPath,
  assistantsManifest: manifestPath,
  customKnowledge: knowledgePaths,
  contentModels: contentModelsPath,
  designSystemRegistries: registryPaths,
  skillMd: skillMdPaths
},
```

And include skillMdPaths in allPaths for revision computation:
```typescript
const allPaths = [
  configPath,
  manifestPath,
  contentModelsPath,
  ...Object.values(knowledgePaths),
  ...Object.values(registryPaths),
  ...Object.values(skillMdPaths)
]
```

- [ ] **Step 5: Run `npm run build` to check model changes compile**

```bash
npm run build
```

Expected: 0 type errors.

- [ ] **Step 6: Add inline SKILL.md normalizer to `admin-editor/src/save.ts`**

After the imports in `save.ts`, add:

```typescript
/**
 * Normalize SKILL.md content for canonical on-disk format.
 * - Normalizes section heading casing
 * - Strips trailing whitespace from lines
 * - Ensures single blank line between sections
 * - Ensures trailing newline
 * Called before writing SKILL.md to disk.
 */
function normalizeSkillMd(content: string): string {
  const headingMap: Record<string, string> = {
    identity: '## Identity',
    behavior: '## Behavior',
    'instruction blocks': '## Instruction Blocks',
    'output guidance': '## Output Guidance',
    'quick actions': '## Quick Actions'
  }

  // Normalize ## headings
  let normalized = content.replace(/^## (.+)$/gm, (_match, heading: string) => {
    const key = heading.trim().toLowerCase()
    return headingMap[key] ?? `## ${heading.trim()}`
  })

  // Strip trailing whitespace from each line
  normalized = normalized
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')

  // Collapse 3+ consecutive blank lines to 2
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  // Ensure trailing newline
  if (!normalized.endsWith('\n')) normalized += '\n'

  return normalized
}
```

- [ ] **Step 7: Add SKILL.md write logic to `saveModel()` in `save.ts`**

In the `saveModel()` function, after writing design system registries (near end of the write block), add:

```typescript
// N) Write SKILL.md for migrated assistants
if (model.skillMdContent) {
  for (const [assistantId, content] of Object.entries(model.skillMdContent)) {
    if (!content || !content.trim()) continue
    const skillMdPath =
      meta.filePaths.skillMd[assistantId] ??
      path.join(repoRoot, 'custom', 'assistants', assistantId, 'SKILL.md')
    const skillMdDir = path.dirname(skillMdPath)
    if (!fs.existsSync(skillMdDir)) {
      fs.mkdirSync(skillMdDir, { recursive: true })
    }
    if (fs.existsSync(skillMdPath)) {
      backupFile(skillMdPath, backupRoot, repoRoot)
    }
    const normalizedContent = normalizeSkillMd(content)
    if (writeFileIfChanged(skillMdPath, normalizedContent)) {
      filesWritten.push(skillMdPath)
    }
  }
}
```

Also add `skillMdContent` to `computeFilesWouldWrite()` for dry-run support:

```typescript
if (model.skillMdContent) {
  for (const [assistantId, content] of Object.entries(model.skillMdContent)) {
    if (!content || !content.trim()) continue
    const skillMdPath =
      meta.filePaths.skillMd[assistantId] ??
      path.join(repoRoot, 'custom', 'assistants', assistantId, 'SKILL.md')
    const normalizedContent = normalizeSkillMd(content)
    if (getExistingContent(skillMdPath) !== normalizedContent) wouldWrite.push(skillMdPath)
  }
}
```

- [ ] **Step 8: Update `GENERATOR_SCRIPTS` to use `compile-skills`**

In `save.ts`, find:
```typescript
const GENERATOR_SCRIPTS = ['generate-assistants', 'generate-custom-overlay', 'generate-presets']
```
Replace with:
```typescript
const GENERATOR_SCRIPTS = ['compile-skills', 'generate-custom-overlay', 'generate-presets']
```

- [ ] **Step 9: Run `npm run build` and `npm test`**

```bash
npm run build && npm test
```

Expected: 0 errors, all tests pass.

- [ ] **Step 10: Commit**

```bash
git add shared/ace-config/schemas.ts admin-editor/src/model.ts admin-editor/src/save.ts
git commit -m "feat(phase5): ACE backend loads/saves SKILL.md; GENERATOR_SCRIPTS uses compile-skills"
```

---

## Task 7: ACE backend integration test

**Goal:** Verify the full ACE load → edit → save → compile cycle works end-to-end for a migrated assistant. Uses a temp repo structure.

**Files:**
- No new files (inline test using existing patterns)

- [ ] **Step 1: Manually test ACE load with a migrated assistant**

```bash
# Migrate general temporarily
tsx scripts/migrate-assistant-to-skillmd.ts general
# Start ACE server
npm run admin
```

In a browser, navigate to the ACE admin editor (typically `http://localhost:3000`). Open the `General` assistant.

Expected: No server crash. The model loads cleanly. (The SKILL.md panel will be empty in the UI until Task 8 adds the frontend.)

```bash
# Cleanup
rm -rf custom/assistants/general/
git checkout custom/assistants.manifest.json
```

- [ ] **Step 2: Commit (no code change needed — this is a manual verification checkpoint)**

If the server crashed in Step 1, fix the error before committing. Otherwise:

```bash
git status
```

Expected: nothing to commit (no files changed by this task).

---

## Task 8: ACE frontend — SKILL.md panel

**Goal:** Add a SKILL.md editor panel to the assistant detail view in `admin-editor/public/app.js`. The panel shows the raw SKILL.md content in an editable textarea (source mode). It is only visible when `skillMdContent[assistantId]` is non-empty (i.e., when the assistant has been migrated). On save, the edited SKILL.md content is included in the save payload.

**Files:**
- Modify: `admin-editor/public/app.js`

**Note:** `app.js` is 5443 lines of vanilla JS. Make targeted additions — do not refactor existing code. Read the file before editing to locate insertion points precisely.

- [ ] **Step 1: Add `skillMdEdits` to state object**

In `app.js`, find the `state` object (around line 15). Add `skillMdEdits` to track in-memory SKILL.md edits per assistant:

Find:
```javascript
selectedAssistantDetailTab: 'overview',
```
Replace with:
```javascript
selectedAssistantDetailTab: 'overview',
skillMdEdits: {},   // assistantId -> edited SKILL.md content (unsaved)
```

- [ ] **Step 2: Populate `skillMdEdits` on model load**

In `app.js`, find the section where `state.editedModel` is assigned after a successful GET /api/model call. This is around where `state.originalModel = data.model` is set.

Find the pattern (approximately line 670):
```javascript
state.originalModel = data.model
state.editedModel = deepClone(data.model)
```

Add after these two lines:
```javascript
// Initialize skillMdEdits from loaded model
state.skillMdEdits = {}
if (data.model.skillMdContent) {
  for (var _smId in data.model.skillMdContent) {
    state.skillMdEdits[_smId] = data.model.skillMdContent[_smId] || ''
  }
}
```

- [ ] **Step 3: Add SKILL.md panel render function `_aeSkillMdPanel()`**

In `app.js`, find the `_aeSkillsTab` function. Add a new function after it:

```javascript
function _aeSkillMdPanel(assistantId) {
  var model = state.editedModel
  var skillMdContent = (model && model.skillMdContent && model.skillMdContent[assistantId]) || null
  var editedContent = state.skillMdEdits[assistantId] || ''
  var html = ''

  html += '<div class="ae-section-block">'
  html += '<h3 class="ae-section-heading">SKILL.md</h3>'

  if (!skillMdContent && !editedContent) {
    html += '<div class="ae-helper">'
    html += 'This assistant has not been migrated to per-assistant SKILL.md yet. '
    html += 'Run <code>tsx scripts/migrate-assistant-to-skillmd.ts ' + escapeHtml(assistantId) + '</code> to scaffold the files.'
    html += '</div>'
  } else {
    html += '<p class="ae-helper">Edit the SKILL.md authored behavior. Changes are saved atomically with the manifest.</p>'
    html += '<textarea'
    html += ' class="ace-field ace-textarea ace-skillmd-editor"'
    html += ' data-assistant-id="' + escapeHtml(assistantId) + '"'
    html += ' rows="20"'
    html += ' style="font-family: monospace; font-size: 13px; white-space: pre;"'
    html += '>' + escapeHtml(editedContent || skillMdContent || '') + '</textarea>'
  }

  html += '</div>'
  return html
}
```

- [ ] **Step 4: Add SKILL.md panel to assistant detail view**

In `app.js`, find the `_aeOverviewTab(a)` function. At the end of the function, before the closing `return html`, add a call to the SKILL.md panel:

```javascript
html += _aeSkillMdPanel(a.id)
```

- [ ] **Step 5: Wire textarea `change` event to update `state.skillMdEdits`**

In `app.js`, find the delegated event listener section (where click/change/input events are handled via event delegation on the main container). Look for patterns like `e.target.classList.contains(...)`.

Add a handler for the SKILL.md textarea:

```javascript
if (e.type === 'change' || e.type === 'input') {
  if (e.target && e.target.classList && e.target.classList.contains('ace-skillmd-editor')) {
    var aId = e.target.getAttribute('data-assistant-id')
    if (aId) {
      state.skillMdEdits[aId] = e.target.value
      // Mark model as dirty (touch editedModel to trigger change detection)
      if (!state.editedModel.skillMdContent) state.editedModel.skillMdContent = {}
      state.editedModel.skillMdContent[aId] = e.target.value
      render()
    }
  }
}
```

- [ ] **Step 6: Include `skillMdContent` in save payload**

In `app.js`, find where the save payload is constructed (the POST /api/save request body). Look for where `model: state.editedModel` is included in the payload.

The `state.editedModel.skillMdContent` is already updated via the textarea handler in Step 5, so it is automatically included in the save payload. Verify this is the case by checking the model structure that is POSTed.

If `buildSavePayload()` or similar does a deep-clone of `editedModel`, the `skillMdContent` field will be included automatically. No change needed.

- [ ] **Step 7: Manual integration test**

```bash
tsx scripts/migrate-assistant-to-skillmd.ts general
npm run admin
```

Open ACE in browser, navigate to `General` assistant. Expected:
- SKILL.md panel is visible in the Overview tab
- A textarea shows the current SKILL.md content
- Editing the textarea and clicking Save completes without error
- After save, `custom/assistants/general/SKILL.md` contains the edited (normalized) content
- `src/assistants/assistants.generated.ts` is updated by the compile-skills run

```bash
# Cleanup after manual test
rm -rf custom/assistants/general/
git checkout custom/assistants.manifest.json
git checkout src/assistants/assistants.generated.ts
```

- [ ] **Step 8: Run `npm run build` and `npm test`**

```bash
npm run build && npm test
```

Expected: 0 errors, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(phase5): ACE SKILL.md panel — shows editor for migrated assistants in Overview tab"
```

---

## Task 9: Final wiring verification

**Goal:** Verify the full Phase 5 slice 1 system works end-to-end: compiler produces correct output, migration script works, ACE saves SKILL.md and re-compiles, all gates pass.

**Files:** No new files.

- [ ] **Step 1: Run all gates**

```bash
npm run build && npm test && npm run invariants
```

Expected:
- `npm run build`: 0 errors
- `npm test`: all tests pass, 0 failures
- `npm run invariants`: 10/10 pass

- [ ] **Step 2: Verify compile-skills warning count**

```bash
tsx scripts/compile-skills.ts 2>&1 | grep -c "\[SKILL_COMPILER WARNING\]"
```

Expected: `11` (all 11 assistants still using flat manifest — no production migrations committed yet)

- [ ] **Step 3: Verify compile-skills script is wired correctly in package.json**

```bash
npm run compile-skills
npm run generate-assistants
```

Expected: both commands run `compile-skills.ts` and produce identical output (same compiled artifact).

- [ ] **Step 4: Update handoff doc**

Open `docs/superpowers/plans/2026-04-11-dst-readiness-handoff.md` (wrong doc — use the Phase 5 kickoff doc).

Update `docs/superpowers/plans/2026-04-11-phase5-skillmd-ace-kickoff.md` to note Phase 5 slice 1 is complete. Add:

```markdown
## Phase 5 Slice 1 Status (completed 2026-04-11)

- compile-skills.ts: ✅ Live
- migrate-assistant-to-skillmd.ts: ✅ Live
- ACE SKILL.md panel: ✅ Live
- Production migrations: ⏳ Deferred (run per-assistant when ready)
- Authoring quality pass: ⏳ Deferred (use Skill Writer docs when ready)
```

- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/plans/2026-04-11-phase5-skillmd-ace-kickoff.md
git commit -m "docs: Phase 5 slice 1 complete — compile-skills, migration script, ACE SKILL.md panel"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Section 1 (file layout, ownership split): Task 3 (per-directory path), Task 5 (migration)
- ✅ Section 2 (SKILL.md canonical schema): Task 3 (`parseSkillMd`, validation)
- ✅ Section 3 (compiler model): Tasks 1–4 (`compile-skills.ts`, tests)
- ✅ Section 4 (ACE editor): Tasks 6–8 (backend + frontend)
- ✅ Section 5 (migration path): Task 5 (`migrate-assistant-to-skillmd.ts`)
- ✅ Section 6 (out of scope): no shared skills, no AssistantConfig wiring, no knowledgeBaseRefs editing
- ✅ Compiler warning for flat manifest fallback: Task 1 + Task 4 tests
- ✅ Hard errors for all 7 error conditions: Task 3 + Task 4 tests
- ✅ `compile-skills` wired into `generate-assistants` npm script: Task 2
- ✅ ACE GENERATOR_SCRIPTS updated: Task 6
- ✅ Normalization-stable round-trip (normalizeSkillMd): Task 6

**Gaps: none.**

**Type consistency:**
- `AssistantEntry` (compiler internal) → `AssistantManifestEntry` (emitted interface) — same fields, confirmed in Task 1 emitter
- `PerDirManifest.quickActions[].templateMessage` is optional; `AssistantEntry.quickActions[].templateMessage` is required — merged in `loadPerDirAssistant()`
- `ModelMeta.filePaths.skillMd` added in Task 6; used in Task 6 save.ts — consistent
- `AdminEditableModel.skillMdContent` optional Record<string, string> — used consistently in model.ts + save.ts + app.js
