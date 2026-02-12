# Rich Text Unification — Audit and Plan

## 1) Audit findings

### Where formatting happens today

| Surface | Location | Current format | Notes |
|---------|----------|----------------|-------|
| **Chat Dialog** | [src/core/assistants/handlers/smartDetector.ts](../src/core/assistants/handlers/smartDetector.ts) | Raw `<b>Key:</b> Value` (HTML) | Renders literally; Chat does not parse HTML. |
| **Chat Dialog** | [src/core/assistants/handlers/contentReview.ts](../src/core/assistants/handlers/contentReview.ts) | Plain string (`formatAddHatResultMessage`) | No formatting; single-line summary. |
| **Chat Dialog** | Other handlers (designWorkshop, errors, designCritique) | Plain strings / error messages | Short, no structure. |
| **Chat pipeline** | [src/ui.tsx](../src/ui.tsx) (lines ~2533, 2585, 2641) | `parseRichText(content)` → `enhanceRichText(ast)` → `<RichTextRenderer nodes={...} />` | Content is parsed as **markdown** (not HTML). |
| **Annotations (native)** | [src/core/figma/annotations.ts](../src/core/figma/annotations.ts) | `label` (plain) or `labelMarkdown` | `createVisibleAnnotationCard` uses plain `lines[]`, 400 char slice per line. |
| **Annotations (read)** | [src/core/analyticsTagging/annotations.ts](../src/core/analyticsTagging/annotations.ts) | Reads `label` / `labelMarkdown`; strips markdown to plain for parsing | `labelToPlainText` minimal strip. |
| **Stage reports** | [src/core/figma/placeCritiqueFallback.ts](../src/core/figma/placeCritiqueFallback.ts) | Markdown → `parseMarkdownToStyledText` → styled Figma text (bold/italic spans) | **bold**, *italic*, #, lists. |
| **Stage reports** | [src/core/stage/renderDocument.ts](../src/core/stage/renderDocument.ts), [renderScorecard.ts](../src/core/figma/renderScorecard.ts), [designWorkshop](../src/core/assistants/handlers/designWorkshop.ts) (report frame), [discovery/renderer.ts](../src/core/discovery/renderer.ts), [errors.ts](../src/core/assistants/handlers/errors.ts) | Structured data → `createTextNode(title, { fontSize, fontName: bold/regular })` | We control typography; no markdown in these paths, ad-hoc "Label:" + value. |

### What the Chat UI renderer supports

- **Input:** String content is passed to `parseRichText()` in [src/core/richText/parseRichText.ts](../src/core/richText/parseRichText.ts).
- **Supported:** Markdown-like syntax only (no HTML):
  - **Bold:** `**text**`
  - *Italic:* `*text*`
  - Inline code: `` `code` ``
  - Links: `[text](url)`
  - Headings: `#`, `##`, `###`
  - Lists: `-` / `*` (unordered), `1.` (ordered)
  - Blockquote: `>`
  - Code block: ` ``` `
  - Divider: `---`
- **Rendering:** AST → [RichTextRenderer.tsx](../src/ui/components/RichTextRenderer.tsx) (Preact). No HTML tags are interpreted; `<b>` appears as literal text.

### What annotations support

- **Native Figma API:** `AnnotationEntry` has `label` (plain) or `labelMarkdown`. Figma's `labelMarkdown` supports a **subset of Markdown**: `**bold**`, `*italic*`, `##` (headings), `-`/`*` lists, `` ` `` code, `[text](url)` links. Max length and line limits are platform-defined (to be confirmed).
- **In-plugin visible cards:** [createVisibleAnnotationCard](../src/core/figma/annotations.ts) takes `lines: string[]` (plain), each line sliced to 400 chars. No markdown rendering; plain text only.

### What stage reports can support

- **Full control:** We create TextNodes via [createTextNode](../src/core/stage/primitives.ts) and [applyInlineStyles](../src/core/stage/primitives.ts) (bold/italic spans). Fonts: `fonts.regular`, `fonts.bold`; fontSize, lineHeight, etc. So we can implement "Key: Value" as bold label + regular value, section headers as larger/bold, and lists as "• " + text.

### Existing rich-text utilities

- **[parseRichText](../src/core/richText/parseRichText.ts):** Markdown-like string → `RichTextNode[]` AST (heading, paragraph, list, code, quote, divider). Inline parsing for bold, italic, code, link.
- **[enhancers.ts](../src/core/richText/enhancers.ts):** Assistant-scoped; injects score/scorecard/strengths/issues nodes for `design_critique`. Not used for "Key: Value" summaries.
- **[types.ts](../src/core/richText/types.ts):** `RichTextNode`, `InlineNode` (text, bold, italic, code, link).
- **[placeCritiqueFallback](../src/core/figma/placeCritiqueFallback.ts):** `parseMarkdownToStyledText(md)` → plain text + style spans for Figma; used only for critique fallback.
- **No** shared "Key: Value" or "report summary" formatter; Smart Detector and Add HAT each build strings by hand.

---

## 2) Canonical format decision

**Recommended: Option A — Markdown string**

- **Why:**
  - Chat already consumes markdown via `parseRichText`; switching to Markdown for handler messages removes HTML and aligns with the existing pipeline.
  - Annotations support `labelMarkdown` (Figma-native).
  - Stage can either parse the same markdown (reuse/align with `parseMarkdownToStyledText`) or consume a small structured model derived from the same source (see adapters).
  - Single source of truth is a string: easy to log, test, and pass through; no new AST surface to maintain.
- **Why not Option B (AST-first) for canonical:**
  - Chat would still need to serialize AST → string for display unless we changed the UI to accept AST from handlers (larger change).
  - Handlers today return `message: string`; keeping that and standardizing on Markdown minimizes change and keeps backward compatibility.
  - We can still produce AST from Markdown where needed (Chat already does; stage could use a shared parser if we want).

**Canonical rule:** All handler-generated and report content intended for Chat, Annotations, or Stage is produced in **one** internal form: **Markdown string** (with a small, defined subset: bold, headings, lists, line breaks). No raw HTML. Adapters then turn that Markdown into what each surface needs.

---

## 3) Rendering adapters per surface

| Adapter | Input | Output | Constraints |
|---------|--------|--------|-------------|
| **renderForChat** | Canonical Markdown string | Markdown string (unchanged or normalized) | Chat already runs `parseRichText` → `RichTextRenderer`. No HTML. Truncation optional (cap length to avoid huge blobs). |
| **renderForAnnotation** | Same Markdown string | Plain text **or** Figma-safe Markdown string | Native annotations: use `labelMarkdown` with Figma's subset (no `#`, use `##`; keep **bold**, lists short). Visible cards: plain only, short lines (e.g. 400 chars), truncate to N lines. |
| **renderForStageReport** | Same Markdown string | Structured layout **or** reuse `parseMarkdownToStyledText` | We control `createTextNode` + `applyInlineStyles`; bold labels, regular values, section titles with larger/bold font. |

**Implementation:** [src/core/richText/reportFormat.ts](../src/core/richText/reportFormat.ts) provides `toCanonicalMarkdown`, `renderForChat`, `renderForAnnotation`, and `sanitizeForChat` (guardrail). Stage adapter can be added later reusing existing markdown→styled-text logic.

---

## 4) "Key: Value" formatting spec (consistent everywhere)

- **Header line:** `## Title` (e.g. `## Smart Detector`).
- **Key/value lines:** One per line: `**Key:** value` (numbered keys like `1.` render as `**1.**` value).
- **Section separators:** Blank line between sections.
- **Max items:** "Top N" (e.g. Top 3 elements, Top 3 content).
- **Reasons:** Single line `**Reasons:** r1, r2` or `**Reasons:** none`.

**Example (canonical Markdown):**

```markdown
## Smart Detector
**Scanned:** 16 nodes
**Elements:** image=1, icon=1, button=1
**Content:** heading_copy=1, body_copy=1, cta_copy=1
**Patterns:** 0

## Top Elements
**1.** **Kind:** button **Confidence:** med
**Label:** Enter
**Reasons:** heuristic:text_over_bg, heuristic:cta_text

## Top Content
**1.** **Kind:** heading_copy **Confidence:** high
**Text:** Welcome to Funville!
```

---

## 5) Integration plan (incremental)

1. **Canonical formatter + adapters** — Done: [src/core/richText/reportFormat.ts](../src/core/richText/reportFormat.ts) with `ReportDoc`, `toCanonicalMarkdown`, `renderForChat`, `renderForAnnotation`, `sanitizeForChat`.
2. **Smart Detector** — Done: Builds `ReportDoc`, uses `toCanonicalMarkdown` → `renderForChat`; no HTML.
3. **Add HAT / other tool-only summaries** — Optional: format Add HAT as markdown and pass through `renderForChat`.
4. **Annotations** — When setting annotation content from a report, use `renderForAnnotation(md, { maxLines: 5 })` and set `labelMarkdown` or `label` (plain).
5. **Stage reports** — Future: refactor report generators to consume canonical Markdown or structured output; reuse placeCritiqueFallback-style parsing where it fits.

---

## 6) Guardrails and tests

- **Guard:** `sanitizeForChat(message)` in [reportFormat.ts](../src/core/richText/reportFormat.ts) strips raw HTML (`<b>`, `</b>`, `<br>`, etc.) from any string before it is sent to the Chat UI. Applied in [main.ts](../src/main.ts) in `replaceStatusMessage` and `sendAssistantMessage`.
- **Unit tests:** [src/core/richText/reportFormat.test.ts](../src/core/richText/reportFormat.test.ts) — `toCanonicalMarkdown` golden-style, `renderForChat` passthrough/truncation, `renderForAnnotation` plain and markdown-lite, `sanitizeForChat` strips HTML.
- **Cap:** `renderForChat(md, { maxLength: 8000 })` truncates with "... (truncated)".

---

## 7) Open questions

- **Annotation text constraints:** Confirm Figma's max length for `label` / `labelMarkdown` and any line limits (document in code comments when known).
- **Stage report typography:** Confirm fonts/weights in [primitives.ts](../src/core/stage/primitives.ts) (e.g. only `fonts.regular` and `fonts.bold`) and whether a second size for section headers is needed.

---

## File targets summary

| Phase | File(s) | Status |
|-------|---------|--------|
| 1 | `src/core/richText/reportFormat.ts` | Done |
| 2 | `src/core/assistants/handlers/smartDetector.ts` | Done (ReportDoc + renderForChat) |
| 3 | `src/main.ts` | Done (sanitizeForChat at choke point) |
| 4 | `src/core/richText/reportFormat.test.ts` | Done |
| 5 | `docs/audits/rich-text-unification-plan.md` | Done |
| 6 | Add HAT / contentReview | Optional |
| 7 | Annotation call sites / Stage reports | Future |
