# Smart Detector Chat Output Formatting — Plan

## Goal

Make Smart Detector chat output match the target formatting: clean markdown with proper line breaks, blank lines between sections, and spacing between numbered items. No SD-specific bypasses; use existing tools and improve them where needed.

---

## Target Markdown Shape (Attachment 2)

```markdown
## Smart Detector

**Scanned:** <N> nodes
**Elements:** button=<n>, image=<n>, icon=<n>, link=<n>
**Content:** heading_copy=<n>, body_copy=<n>, cta_copy=<n>
**Patterns:** <n>

### Top Elements

1. **Kind:** <kind>
   **Confidence:** <low|med|high>
   **Label:** <label>
   **Reasons:** <comma-separated>

2. ...

### Top Content

1. **Kind:** <kind>
   **Confidence:** <...>
   **Text:** <text>

2. ...
```

**Requirements:**
- Each field on its own line
- Blank line between major blocks (title/summary/sections)
- Blank line between numbered items
- Title uses `##`, section headings use `###`

---

## Root Causes (Current State)

| Cause | Location | Issue |
|-------|----------|-------|
| **Run-on fields** | `smartDetector.ts` lines 61, 76 | `value: \`**Kind:** ${e.kind} **Confidence:** ${e.confidence}\`` concatenates Kind and Confidence into one line |
| **Wrong heading level** | `reportFormat.ts` line 29 | `SECTION_HEADING_PREFIX = '## '` used for all sections; target needs `###` for Top Elements/Content |
| **No item boundaries** | `buildReportDoc` structure | Flat keyValues array; no way to add single blank between items without changing toCanonicalMarkdown |
| **Blank lines stripped** | `main.ts` L285, `ui.tsx` L217 | `split(/\n+/).filter(line => line.trim().length > 0)` removes empty lines; parseRichText needs blanks to separate paragraphs |

---

## Minimal Code Changes

### 1. Add `formatSmartDetectorReport` in reportFormat.ts

**File:** [src/core/richText/reportFormat.ts](../../src/core/richText/reportFormat.ts)

**Change:** Add a dedicated formatter that returns the target markdown using explicit `\n` and `\n\n`.

**Adapter shape (avoid importing detection types):**

```ts
/** Minimal shape for formatSmartDetectorReport; avoids importing detection layer. */
export interface SmartDetectorReportInput {
  stats: {
    nodesScanned: number
    capped?: boolean
    elementsByKind: Record<string, number>
    contentByKind: Record<string, number>
    patternCount: number
  }
  elements: Array<{ kind: string; confidence: string; reasons: string[]; labelGuess?: string }>
  content: Array<{ contentKind: string; confidence: string; text: string }>
}
```

**Function:** `formatSmartDetectorReport(input: SmartDetectorReportInput): string`

- Build markdown string with template literals
- Summary: `**Scanned:**`, `**Elements:**`, `**Content:**`, `**Patterns:**` each on own line
- Sections: `### Top Elements`, `### Top Content`
- Per item: `1. **Kind:** …`, `**Confidence:** …`, `**Label:** …`, `**Reasons:** …` on separate lines
- Insert `\n\n` between blocks and between items

**Do NOT change:** `ReportDoc`, `toCanonicalMarkdown`, or other reportFormat exports.

---

### 2. Update SmartDetectorHandler

**File:** [src/core/assistants/handlers/smartDetector.ts](../../src/core/assistants/handlers/smartDetector.ts)

**Changes:**
- Import `formatSmartDetectorReport` from reportFormat (remove `ReportDoc`, `toCanonicalMarkdown`)
- Replace `formatSummary` body:
  ```ts
  const md = formatSmartDetectorReport(result)
  return renderForChat(md)
  ```
- **Keep renderForChat:** truncation (maxLength 8000) and line-ending normalization are useful
- Remove `buildReportDoc` (or keep only if needed for existing tests; handler path uses new formatter)

---

### 3. Preserve blank lines in cleanChatContent

**Files:** [src/main.ts](../../src/main.ts) (L273), [src/ui.tsx](../../src/ui.tsx) (L196)

**Change:** Allow single blank lines to survive; collapse multiple consecutive blanks to one.

**Current logic:** `lines = text.split(/\n+/).filter(line => line.trim().length > 0)` — strips all blanks.

**New logic:**
- `lines = text.split('\n')` — keep empty lines
- In loop: when `trimmed === ''`, push `''` to uniqueLines only if last element is not `''` (avoid bloat)
- Keep existing dedupe, keyValueLike, welcomeLine behavior for non-empty lines

**Pseudo-code:**

```ts
const lines = text.split('\n')
const uniqueLines: string[] = []
// ... existing seen, welcomeLineFound, keyValueLike ...

for (const line of lines) {
  const trimmed = line.trim()
  if (trimmed === '') {
    if (uniqueLines[uniqueLines.length - 1] !== '') uniqueLines.push('')
    continue
  }
  // ... existing logic for non-empty lines ...
}
```

**Rationale:** parseRichText needs blank lines to separate paragraphs. General change; no SD-specific logic.

---

### 4. Update test helpers (reportFormat.test.ts)

**File:** [src/core/richText/reportFormat.test.ts](../../src/core/richText/reportFormat.test.ts)

The test uses `cleanChatContentMainStyle` and `cleanChatContentUIStyle` — mirror the main/ui logic. When main/ui gain blank preservation, update these helpers to match so pipeline tests stay valid.

---

## Tests to Add

**File:** [src/core/richText/reportFormat.test.ts](../../src/core/richText/reportFormat.test.ts)

### Test 1: formatSmartDetectorReport structure

- Raw markdown contains `"## Smart Detector\n\n"`
- Contains `"\n**Scanned:**"`, `"\n**Elements:**"`, `"\n**Content:**"`, `"\n**Patterns:**"`
- Contains `"\n\n### Top Elements\n\n"`
- Blank line between items: `/\n\n\d+\.\s+\*\*Kind:/` matches (blank + "2. **Kind:" etc.)
- No run-on: `"**Confidence:**"` and `"**Label:**"` appear on different lines in first item (e.g. indexOf checks)

### Test 2: Pipeline (format → sanitize → clean → parse)

- Build mock input, call `formatSmartDetectorReport` → `sanitizeForChat` → `cleanChatContentMainStyle` (updated) → `parseRichText`
- Assert visible text includes: "Scanned", "Elements", "Top Elements", and at least one "button="
- Assert `\n\n### Top Elements\n\n` survives cleanChatContent (or equivalent: section heading present after clean)

### Test 3: Blank-line preservation

- Input: `"Line1\n\nLine2\n\n\nLine3"`
- After cleanChatContent: contains at least one `\n\n` (blanks preserved; multi-blank collapsed)

---

## Files Touched (Summary)

| File | Change |
|------|--------|
| `src/core/richText/reportFormat.ts` | Add `SmartDetectorReportInput`, `formatSmartDetectorReport` |
| `src/core/assistants/handlers/smartDetector.ts` | Use `formatSmartDetectorReport` + `renderForChat`; remove `buildReportDoc` from handler path |
| `src/main.ts` | Preserve single blanks in `cleanChatContent` |
| `src/ui.tsx` | Same blank preservation in `cleanChatContent` |
| `src/core/richText/reportFormat.test.ts` | Add 3 tests; update `cleanChatContentMainStyle`/`cleanChatContentUIStyle` if needed |

---

## Manual Verification Checklist (PR)

- [ ] `npm run build` passes
- [ ] `npx tsx src/core/richText/reportFormat.test.ts` passes
- [ ] Build/reload plugin; run Smart Detector on a selection
- [ ] Summary shows 4 distinct lines (Scanned, Elements, Content, Patterns)
- [ ] Top Elements/Content items have line breaks and spacing between them
- [ ] Headings render correctly (## title, ### sections)
- [ ] No new console spam
- [ ] No SD-specific bypass logic introduced

---

## Out of Scope

- No changes to `parseRichText` list detection
- No changes to `contentNormalized` contract
- No new logging
- No changes to `ReportDoc`/`toCanonicalMarkdown` (other reports unchanged)
