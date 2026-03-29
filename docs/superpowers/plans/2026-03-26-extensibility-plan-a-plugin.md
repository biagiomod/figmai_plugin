# FigmAI Extensibility — Plan A: Plugin SDK, Handler Migration & Compile Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Evergreens handler to its own directory, create a typed SDK contract, and add a per-assistant compile gate so one broken handler never blocks the whole build.

**Architecture:** Each assistant gets a directory under `src/assistants/{name}/` containing its handler code and a `index.ts` that exports an `AssistantModule`. A new `scripts/build-assistants.ts` script runs `tsc --noEmit` before esbuild, reports which assistants have type errors, and updates per-assistant generated snapshot files only when validation passes. The existing `esbuild` step is unaffected (esbuild is type-error tolerant).

**Tech Stack:** TypeScript, tsx (script runner), Node.js `child_process.execSync`, existing `tsc` from project `node_modules/.bin/tsc`.

---

> **Scope note:** This plan covers only the plugin codebase (SDK, handler migration, compile gate). ACE admin scoping — user `assistantScope` field, per-assistant config directories, and API middleware — is a separate independent plan (Plan B).

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `src/sdk/index.ts` | CREATE | Public type contract — re-exports handler types from core |
| `src/assistants/evergreens/handler.ts` | CREATE (moved) | Evergreens handler class, paths updated |
| `src/assistants/evergreens/index.ts` | CREATE | Wraps handler into `AssistantModule` |
| `src/assistants/evergreens/knowledge.md` | CREATE (moved) | Evergreens KB content |
| `src/assistants/evergreens/evergreens.generated.ts` | CREATE | Initial validated snapshot (re-export + timestamp) |
| `src/assistants/_registry.generated.ts` | CREATE | Assembled registry — grows as more teams migrate |
| `scripts/build-assistants.ts` | CREATE | Per-assistant compile gate + report + generated file updates |
| `src/core/assistants/handlers/index.ts` | MODIFY | Import `ContentTableHandler` from new location |
| `src/core/assistants/handlers/contentTable.ts` | DELETE | Moved to `src/assistants/evergreens/handler.ts` |
| `package.json` | MODIFY | Add `build-assistants` step to `prebuild` |
| `CODEOWNERS` | CREATE | Directory ownership per team |
| `docs/ASSISTANT_SDK.md` | CREATE | Strike Team onboarding guide |

---

## Task 1: Create the SDK

**Files:**
- Create: `src/sdk/index.ts`

The SDK is a single re-export file. It surfaces existing core types under a stable public path. Strike Teams import only from `../../sdk`, never directly from `../../core/...`.

- [ ] **Step 1: Create the SDK file**

```typescript
// src/sdk/index.ts
/**
 * FigmAI Assistant SDK
 * Public contract for Strike Team assistants.
 * Import from here — never from core internals.
 */

import type { AssistantHandler } from '../core/assistants/handlers/base'

// Handler contract
export type { AssistantHandler, HandlerContext, HandlerResult } from '../core/assistants/handlers/base'

// Message + provider types needed by handlers
export type { NormalizedMessage, Message } from '../core/provider/provider'

// Selection state passed to handlers via HandlerContext
export type { SelectionState } from '../types'

// Assistant module shape — what each index.ts must export
export interface AssistantModule {
  assistantId: string
  handler?: AssistantHandler
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
npx tsc --noEmit
```

Expected: same output as before this change (no new errors). If new errors appear related to `../types` or `../core/provider/provider`, check that those paths exist:

```bash
ls src/types.ts src/core/provider/provider.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/sdk/index.ts
git commit -m "feat: add src/sdk/index.ts — public type contract for Strike Team assistants"
```

---

## Task 2: Create the Evergreens Directory

**Files:**
- Create: `src/assistants/evergreens/handler.ts`
- Create: `src/assistants/evergreens/index.ts`
- Create: `src/assistants/evergreens/knowledge.md`

This moves the Evergreens handler to its own directory and adds the `index.ts` module wrapper. The handler class is identical — only import paths change.

- [ ] **Step 1: Create `src/assistants/evergreens/handler.ts`**

This is `src/core/assistants/handlers/contentTable.ts` with import paths updated.
All imports that used `./base` now use `../../sdk`.
All imports that used `../../contentTable/*` now use `../../core/contentTable/*`.
The import for `../../work/loadAdapter` becomes `../../core/work/loadAdapter`.
The import for `../../../custom/config` becomes `../../custom/config`.
The import for `../../figma/selectionResolver` becomes `../../core/figma/selectionResolver`.

Read the existing file first, then create the new one with all paths updated:

```bash
cat src/core/assistants/handlers/contentTable.ts
```

Create `src/assistants/evergreens/handler.ts` with this header block replaced:

```typescript
// BEFORE (in contentTable.ts):
import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { ContentItemV1 } from '../../contentTable/types'
import { scanContentTable } from '../../contentTable/scanner'
import { loadWorkAdapter } from '../../work/loadAdapter'
import { normalizeContentTableV1, validateContentTableV1 } from '../../contentTable/validate'
import { applyExclusionRules, resolveExclusionConfigWithSource } from '../../contentTable/exclusionRules'
import type { ExclusionRulesConfig } from '../../contentTable/exclusionRules'
import { getCustomConfig } from '../../../custom/config'
import { resolveSelection } from '../../figma/selectionResolver'

// AFTER (in evergreens/handler.ts):
import type { AssistantHandler, HandlerContext, HandlerResult } from '../../sdk'
import type { ContentItemV1 } from '../../core/contentTable/types'
import { scanContentTable } from '../../core/contentTable/scanner'
import { loadWorkAdapter } from '../../core/work/loadAdapter'
import { normalizeContentTableV1, validateContentTableV1 } from '../../core/contentTable/validate'
import { applyExclusionRules, resolveExclusionConfigWithSource } from '../../core/contentTable/exclusionRules'
import type { ExclusionRulesConfig } from '../../core/contentTable/exclusionRules'
import { getCustomConfig } from '../../custom/config'
import { resolveSelection } from '../../core/figma/selectionResolver'
```

Everything below the import block is identical to the original `contentTable.ts`. The class name, method implementations, and all logic stay exactly the same.

- [ ] **Step 2: Create `src/assistants/evergreens/index.ts`**

```typescript
// src/assistants/evergreens/index.ts
/**
 * Evergreens Assistant Module
 * Owned by: Evergreens Team
 *
 * To extend: add logic to handler.ts.
 * Do NOT import from core internals — use ../../sdk only.
 */
import type { AssistantModule } from '../../sdk'
import { ContentTableHandler } from './handler'

const evergreensModule: AssistantModule = {
  assistantId: 'content_table',
  handler: new ContentTableHandler(),
}

export default evergreensModule
```

- [ ] **Step 3: Copy the knowledge file**

```bash
cp src/assistants/contentTable.md src/assistants/evergreens/knowledge.md
```

Do NOT delete `src/assistants/contentTable.md` yet — it may still be referenced by `generate-assistants-from-manifest.ts`. Verify first:

```bash
grep -r "contentTable.md" scripts/ src/
```

If the only reference is in the generate script as a knowledge-merge source, check how that reference works (it uses the assistant ID `content_table` to find the file, not the filename directly). Only remove the old file after confirming the new location will be picked up, which is addressed in Task 3.

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors in `src/assistants/evergreens/handler.ts` or `index.ts`.

If you see errors like `Cannot find module '../../core/contentTable/types'`, double-check the path:

```bash
ls src/core/contentTable/
```

The modules should include: `types.ts`, `scanner.ts`, `validate.ts`, `exclusionRules.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/assistants/evergreens/
git commit -m "feat: add src/assistants/evergreens/ — handler + index + knowledge (Evergreens migration step 1)"
```

---

## Task 3: Update the Handler Registry Import

**Files:**
- Modify: `src/core/assistants/handlers/index.ts`
- Delete: `src/core/assistants/handlers/contentTable.ts`

The handler registry switches its `ContentTableHandler` import from the old core location to the new Strike Team directory. All other handlers are unchanged.

- [ ] **Step 1: Update the import in `handlers/index.ts`**

Change line 7 from:
```typescript
import { ContentTableHandler } from './contentTable'
```
to:
```typescript
import { ContentTableHandler } from '../../assistants/evergreens/handler'
```

The rest of `handlers/index.ts` is unchanged.

- [ ] **Step 2: Run the type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find module '../../assistants/evergreens/handler'`, verify the path from `src/core/assistants/handlers/`:
- `../../assistants/evergreens/handler` resolves to `src/assistants/evergreens/handler` ✓

- [ ] **Step 3: Run the full build to verify nothing is broken**

```bash
npm run build
```

Expected: successful build. The `ContentTableHandler` is now sourced from `src/assistants/evergreens/handler.ts` but esbuild doesn't care — it follows imports regardless of directory.

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all tests pass. The Evergreens handler behavior is unchanged — only the file location moved.

- [ ] **Step 5: Delete the old handler file**

```bash
git rm src/core/assistants/handlers/contentTable.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/core/assistants/handlers/index.ts
git commit -m "refactor: move ContentTableHandler import to src/assistants/evergreens/ and remove old core file"
```

---

## Task 4: Create the Compile Gate Script

**Files:**
- Create: `scripts/build-assistants.ts`
- Create: `src/assistants/evergreens/evergreens.generated.ts` (initial snapshot)
- Create: `src/assistants/_registry.generated.ts` (initial assembly)

This is the core of the compile gate. It runs `tsc --noEmit` globally, groups any errors by assistant directory, updates generated files only for clean assistants, then assembles the registry.

- [ ] **Step 1: Write a failing test first**

Create a minimal test file to verify the script's error-grouping logic:

```typescript
// scripts/build-assistants.test.ts
import { groupErrorsByAssistant } from './build-assistants'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e: any) {
    console.error(`  ✗ ${name}: ${e.message}`)
    process.exit(1)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

test('groups error by assistant name from file path', () => {
  const output = `src/assistants/analytics/handler.ts(14,5): error TS2345: Type 'string' is not assignable`
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(result['analytics'] !== undefined, 'should have analytics key')
  assert(result['analytics'].length === 1, 'should have 1 error')
})

test('returns empty object for clean tsc output', () => {
  const result = groupErrorsByAssistant('', 'src/assistants')
  assert(Object.keys(result).length === 0, 'should be empty')
})

test('ignores errors outside assistants directory', () => {
  const output = `src/core/foo.ts(1,1): error TS9999: some error`
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(Object.keys(result).length === 0, 'should ignore core errors')
})

test('groups multiple errors for same assistant', () => {
  const output = [
    `src/assistants/analytics/handler.ts(14,5): error TS2345: first`,
    `src/assistants/analytics/index.ts(3,1): error TS2551: second`,
  ].join('\n')
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(result['analytics'].length === 2, 'should have 2 errors for analytics')
})

console.log('build-assistants tests:')
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx tsx scripts/build-assistants.test.ts
```

Expected: fails with `Cannot find module './build-assistants'` or similar.

- [ ] **Step 3: Create `scripts/build-assistants.ts`**

```typescript
// scripts/build-assistants.ts
/**
 * Per-assistant compile gate.
 *
 * Runs tsc --noEmit for the whole project, then groups any errors
 * by assistant directory. Assistants with no errors get a fresh
 * {name}.generated.ts snapshot. Assistants with errors keep their
 * existing snapshot. Always assembles _registry.generated.ts from
 * all present snapshots.
 *
 * Run via: npx tsx scripts/build-assistants.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const ROOT = path.resolve(__dirname, '..')
const ASSISTANTS_DIR = path.join(ROOT, 'src', 'assistants')
const ASSISTANTS_REL = 'src/assistants'

// ---------------------------------------------------------------------------
// Exported for testing
// ---------------------------------------------------------------------------

/**
 * Parse tsc --noEmit stdout and group error lines by assistant directory name.
 * Only errors whose file path starts with `assistantsRelDir/` are included.
 */
export function groupErrorsByAssistant(
  tscOutput: string,
  assistantsRelDir: string
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const prefix = assistantsRelDir.replace(/\\/g, '/') + '/'
  for (const line of tscOutput.split('\n')) {
    const normalised = line.replace(/\\/g, '/')
    if (!normalised.startsWith(prefix)) continue
    // e.g. src/assistants/analytics/handler.ts(14,5): error TS...
    const after = normalised.slice(prefix.length)
    const slashIdx = after.indexOf('/')
    if (slashIdx === -1) continue
    const name = after.slice(0, slashIdx)
    result[name] = result[name] || []
    result[name].push(line)
  }
  return result
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function findAssistantDirs(): string[] {
  return fs.readdirSync(ASSISTANTS_DIR)
    .filter(entry => {
      const full = path.join(ASSISTANTS_DIR, entry)
      return (
        fs.statSync(full).isDirectory() &&
        fs.existsSync(path.join(full, 'index.ts'))
      )
    })
    .sort()
}

function runTscNoEmit(): string {
  try {
    execSync('npx tsc --noEmit', {
      cwd: ROOT,
      stdio: 'pipe',
    })
    return ''
  } catch (e: any) {
    return (e.stdout?.toString() || '') + (e.stderr?.toString() || '')
  }
}

function writeGeneratedFile(assistantName: string, timestamp: string): void {
  const dir = path.join(ASSISTANTS_DIR, assistantName)
  const outPath = path.join(dir, `${assistantName}.generated.ts`)
  const content = [
    `// ${assistantName}.generated.ts — DO NOT EDIT`,
    `// Generated by scripts/build-assistants.ts`,
    `// Last type-validated: ${timestamp}`,
    ``,
    `export { default as ${assistantName}Module } from './index'`,
    ``,
  ].join('\n')
  fs.writeFileSync(outPath, content, 'utf-8')
}

function assembleRegistry(assistantNames: string[], timestamp: string): void {
  const outPath = path.join(ASSISTANTS_DIR, '_registry.generated.ts')
  const lines = [
    `// _registry.generated.ts — DO NOT EDIT`,
    `// Assembled by scripts/build-assistants.ts`,
    `// Last assembled: ${timestamp}`,
    `//`,
    `// Add new assistants here when they first pass validation.`,
    ``,
    ...assistantNames.map(
      name => `export { ${name}Module } from './${name}/${name}.generated'`
    ),
    ``,
  ]
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8')
}

function main() {
  const DIVIDER = '─'.repeat(53)
  console.log(`── build-assistants ${'─'.repeat(34)}`)

  const assistants = findAssistantDirs()
  if (assistants.length === 0) {
    console.log('No assistant directories found in src/assistants/')
    process.exit(0)
  }

  const tscOutput = runTscNoEmit()
  const errors = groupErrorsByAssistant(tscOutput, ASSISTANTS_REL)
  const timestamp = new Date().toISOString()

  const kept: string[] = []
  const updated: string[] = []
  const registryNames: string[] = []

  for (const name of assistants) {
    const generatedPath = path.join(ASSISTANTS_DIR, name, `${name}.generated.ts`)
    const hasErrors = errors[name] !== undefined

    if (hasErrors) {
      const firstError = errors[name][0] || 'type error'
      console.log(`⚠ ${name.padEnd(18)} kept previous     ${firstError.split(': error ')[1]?.split(':')[0] || 'type error'}`)
      kept.push(name)
    } else {
      writeGeneratedFile(name, timestamp)
      console.log(`✓ ${name.padEnd(18)} updated`)
      updated.push(name)
    }

    // Include in registry if a generated file exists (updated or previously created)
    if (fs.existsSync(generatedPath)) {
      registryNames.push(name)
    }
  }

  console.log(DIVIDER)

  if (kept.length > 0) {
    console.log(`⚠ ${kept.length} assistant(s) kept previous version: ${kept.join(', ')}`)
    for (const name of kept) {
      for (const errLine of (errors[name] || []).slice(0, 3)) {
        console.log(`  ${errLine}`)
      }
    }
  }

  assembleRegistry(registryNames, timestamp)
  console.log(`Registry assembled (${registryNames.length} assistant(s)). Proceeding with build.`)
  console.log(DIVIDER)
}

main()
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx tsx scripts/build-assistants.test.ts
```

Expected output:
```
build-assistants tests:
  ✓ groups error by assistant name from file path
  ✓ returns empty object for clean tsc output
  ✓ ignores errors outside assistants directory
  ✓ groups multiple errors for same assistant
```

- [ ] **Step 5: Run the script manually to verify it works end-to-end**

```bash
npx tsx scripts/build-assistants.ts
```

Expected output:
```
── build-assistants ────────────────────────────────────────────────
✓ evergreens         updated
─────────────────────────────────────────────────────
Registry assembled (1 assistant(s)). Proceeding with build.
─────────────────────────────────────────────────────
```

After running, verify the generated files exist:

```bash
cat src/assistants/evergreens/evergreens.generated.ts
cat src/assistants/_registry.generated.ts
```

Expected `evergreens.generated.ts`:
```typescript
// evergreens.generated.ts — DO NOT EDIT
// Generated by scripts/build-assistants.ts
// Last type-validated: 2026-03-26T...

export { default as evergreensModule } from './index'
```

Expected `_registry.generated.ts`:
```typescript
// _registry.generated.ts — DO NOT EDIT
// Assembled by scripts/build-assistants.ts
// ...
export { evergreensModule } from './evergreens/evergreens.generated'
```

- [ ] **Step 6: Commit**

```bash
git add scripts/build-assistants.ts scripts/build-assistants.test.ts \
        src/assistants/evergreens/evergreens.generated.ts \
        src/assistants/_registry.generated.ts
git commit -m "feat: add scripts/build-assistants.ts — per-assistant compile gate with report and generated snapshots"
```

---

## Task 5: Wire Build-Assistants into the Prebuild

**Files:**
- Modify: `package.json`

Add `build-assistants` as the FIRST step in `prebuild`, before `generate-assistants`. This ensures generated snapshots exist before anything downstream reads from `_registry.generated.ts`.

- [ ] **Step 1: Update `package.json`**

Current `prebuild`:
```json
"prebuild": "npm run generate-assistants && npm run generate-presets && npm run generate-custom-overlay && npm run generate-dark-demo-cards && npm run generate-knowledge-bases && npm run generate-nuxt-ds-catalog && tsx scripts/generate-build-info.ts"
```

Updated `prebuild` (add `build-assistants` first, and add it as its own script entry):
```json
"prebuild": "npm run build-assistants && npm run generate-assistants && npm run generate-presets && npm run generate-custom-overlay && npm run generate-dark-demo-cards && npm run generate-knowledge-bases && npm run generate-nuxt-ds-catalog && tsx scripts/generate-build-info.ts",
"build-assistants": "tsx scripts/build-assistants.ts",
```

Also add `build-assistants` to the `watch` script in the same position.

- [ ] **Step 2: Run full build to verify**

```bash
npm run build
```

Expected: build succeeds. Terminal output will include the `── build-assistants` report before the esbuild step. Watch for:
- `✓ evergreens    updated` — Evergreens passed validation
- No errors in the report section

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build: add build-assistants step to prebuild — per-assistant compile gate now runs before esbuild"
```

---

## Task 6: Clean Up Knowledge File Reference

**Files:**
- Possibly delete: `src/assistants/contentTable.md`

The `generate-assistants-from-manifest.ts` script uses `mergeKnowledgeBase()` which reads markdown files from `src/assistants/`. Verify whether it looks for files by assistant ID or by filename.

- [ ] **Step 1: Check how knowledge files are resolved**

```bash
grep -n "contentTable\|mergeKnowledge\|knowledge" scripts/generate-assistants-from-manifest.ts | head -30
```

And:
```bash
grep -n "contentTable\|mergeKnowledge" src/assistants/index.ts | head -20
```

- [ ] **Step 2: Determine the resolution strategy**

If knowledge files are looked up by assistant ID (e.g., `content_table.md`), the file `src/assistants/contentTable.md` (camelCase) may already be ignored. Check what files are actually loaded.

If the script hardcodes `contentTable.md` by name, update it to look in `src/assistants/evergreens/knowledge.md` instead.

If `src/assistants/contentTable.md` is no longer needed:

```bash
git rm src/assistants/contentTable.md
npm run build   # verify build still passes
```

- [ ] **Step 3: Commit (only if a file was changed or removed)**

```bash
git add -A
git commit -m "refactor: remove src/assistants/contentTable.md (knowledge file now at evergreens/knowledge.md)"
```

---

## Task 7: Create CODEOWNERS

**Files:**
- Create: `CODEOWNERS`

- [ ] **Step 1: Create `CODEOWNERS`**

```
# CODEOWNERS
# Controls who must review pull requests touching each directory.
# Format: path  @team-or-username
# Matches GitHub, GitLab, and Azure DevOps (ADO) CODEOWNERS syntax.
#
# Core Code Team reviews are required for anything not listed below.
# Strike Teams own their own directories — they can merge without Core review
# as long as no files outside their paths are touched.

# ----- CORE (protected — Core Code Team must review) -----
/src/core/                    @core-code-team
/src/sdk/                     @core-code-team
/scripts/                     @core-code-team
/src/main.ts                  @core-code-team
/src/ui.tsx                   @core-code-team

# ----- STRIKE TEAMS (owned per team) -----
/src/assistants/evergreens/   @evergreens-team
/src/assistants/analytics/    @analytics-team
/src/assistants/accessibility/ @accessibility-team
/src/assistants/prompt-to-screen/ @prompt-to-screen-team

# Custom config dirs (ACE-managed — added when Plan B completes)
# /custom/assistants/evergreens/   @evergreens-team
# /custom/assistants/analytics/    @analytics-team
```

- [ ] **Step 2: Commit**

```bash
git add CODEOWNERS
git commit -m "chore: add CODEOWNERS — per-directory ownership for Core and Strike Teams"
```

---

## Task 8: Create SDK Documentation

**Files:**
- Create: `docs/ASSISTANT_SDK.md`

- [ ] **Step 1: Create `docs/ASSISTANT_SDK.md`**

```markdown
# FigmAI Assistant SDK — Strike Team Guide

This guide covers everything you need to build and maintain an assistant in FigmAI.

---

## Quick Start

Copy the `analytics/` template directory (when it exists) and rename it to your assistant name. If you need custom logic (like Evergreens), copy `evergreens/` instead.

```bash
cp -r src/assistants/analytics/ src/assistants/your-assistant-name/
```

Update the `assistantId` in `index.ts` to match your assistant's ID in the manifest.

---

## Your Two Directories

You own exactly two directories:

| Directory | Purpose |
|-----------|---------|
| `src/assistants/{name}/` | Handler code — TypeScript, built and validated |
| `custom/assistants/{name}/` | Config — manifest JSON, knowledge files, KB files (ACE-editable) |

Never modify files outside these two directories without a Core Code Team review.

---

## The index.ts Contract

Every assistant must have `src/assistants/{name}/index.ts` that exports a default `AssistantModule`:

```typescript
import type { AssistantModule } from '../../sdk'
// If you have custom logic, import your handler:
// import { YourHandler } from './handler'

const module: AssistantModule = {
  assistantId: 'your_assistant_id',   // must match id in custom/assistants.manifest.json
  // handler: new YourHandler(),      // omit if AI-only
}

export default module
```

**AI-only assistants** (just a prompt, no custom logic): omit `handler`.

**Tool assistants** (custom pre-LLM logic): include `handler`.

---

## The Handler Contract

If your assistant needs custom logic, create `handler.ts` in your directory:

```typescript
import type { AssistantHandler, HandlerContext, HandlerResult } from '../../sdk'

export class YourHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'your_assistant_id'
      && actionId === 'your-action-id'
  }

  async handleResponse(ctx: HandlerContext): Promise<HandlerResult> {
    // Your logic here. Use ctx.selectionOrder, ctx.provider, etc.
    return { handled: true }
  }
}
```

Import ONLY from `../../sdk`. Do not import from `../../core/...` directly.
Exception: if you need deep core utilities (scanners, adapters), ask Core Code Team to add them to the SDK.

---

## Testing Locally

```bash
npm run build          # full build — runs compile gate, shows per-assistant report
npm run build:offline  # same but skips S3 sync
```

The compile gate report tells you immediately if your handler has TypeScript errors:

```
── build-assistants ──────────────────────────────────
✓ your-assistant   updated
⚠ analytics        kept previous     handler.ts:14 — Type 'string' is not assignable
```

Errors in other assistants do not block your build. Fix your own errors and ship.

---

## What Core Code Team Owns

The Core Code Team owns everything outside your two directories. You should never need to touch:

- `src/core/`
- `src/sdk/`
- `scripts/`
- `src/main.ts`, `src/ui.tsx`
- `package.json`

If you need a new type exported from the SDK, open a PR to `src/sdk/index.ts` and request Core review.

---

## Onboarding a New Team

1. Core Team admin creates an ACE user with `role: "editor"` and `assistantScope: ["your_assistant_id"]`
2. Create `src/assistants/{name}/` with `index.ts` (and `handler.ts` if needed)
3. Add an entry to `custom/assistants.manifest.json` for your assistant
4. Add CODEOWNERS entries for your directories
5. Run `npm run build` — if it passes, your assistant is live
```

- [ ] **Step 2: Commit**

```bash
git add docs/ASSISTANT_SDK.md
git commit -m "docs: add ASSISTANT_SDK.md — Strike Team guide for building assistants"
```

---

## Task 9: Final Verification

End-to-end check that the full pipeline works correctly.

- [ ] **Step 1: Clean build from scratch**

```bash
npm run build
```

Expected: build succeeds. The compile gate report shows `✓ evergreens  updated`.

- [ ] **Step 2: Verify the test for intentional failure**

Temporarily introduce a type error in `src/assistants/evergreens/handler.ts` (add a line with a deliberate bad type):

```typescript
const _test: number = 'this is wrong'  // deliberate error for testing
```

Run the build:
```bash
npm run build
```

Expected:
- Compile gate report shows `⚠ evergreens  kept previous`
- Build still completes (esbuild proceeds with the snapshot)
- Terminal shows the specific type error line

Remove the deliberate error:
```bash
git checkout src/assistants/evergreens/handler.ts
```

- [ ] **Step 3: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Final commit if any fixes were needed during verification**

```bash
# only if changes were made during verification
git add -A
git commit -m "fix: corrections from final Plan A verification"
```

---

## Self-Review Checklist

Before considering this plan complete, verify:

- [ ] `src/sdk/index.ts` re-exports `AssistantHandler`, `HandlerContext`, `HandlerResult`, `NormalizedMessage`, `SelectionState`
- [ ] `src/assistants/evergreens/handler.ts` has NO imports from `./base` or `../../core/assistants/handlers/` — only from `../../sdk` and `../../core/{module}`
- [ ] `src/assistants/evergreens/index.ts` imports only from `../../sdk` and `./handler`
- [ ] `src/core/assistants/handlers/index.ts` imports `ContentTableHandler` from `../../assistants/evergreens/handler` (not from `./contentTable`)
- [ ] `src/core/assistants/handlers/contentTable.ts` does NOT exist
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run invariants` passes
- [ ] `scripts/build-assistants.test.ts` passes
```
