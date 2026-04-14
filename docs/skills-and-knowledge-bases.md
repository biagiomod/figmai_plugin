# Shared Skills and Internal Knowledge Bases

> **Audience:** ACE admins managing the ACE editor
>
> **Purpose:** Distinguish the two knowledge mechanisms in FigmAI and explain when to use each.

FigmAI has two distinct knowledge systems in ACE. They serve different purposes, are stored differently, and operate at different points in the prompt assembly lifecycle. Do not treat them as interchangeable.

---

## Shared Skills

**Where:** `custom/skills/*.md` + `custom/skills/registry.json`
**ACE UI:** Resources → Shared Skills tab
**API:** `/api/skills/*`
**Format:** Markdown with YAML frontmatter (`version`, `tags`, `updatedAt`) and structured sections

Shared Skills are reusable context documents that describe how assistants should behave in specific domains. They are composed into assistant prompts at the ACE authoring level — by a human author — not injected automatically at runtime.

**Use Shared Skills for:**

- Cross-assistant behavior standards and evaluation criteria
- Terminology and definition frameworks
- Design heuristics and domain framing useful across multiple assistants
- Content that helps an author write or calibrate a better assistant prompt

**Format:** Each Shared Skill is a Markdown file with frontmatter followed by structured sections. The conventional section structure is: Purpose, Scope, Definitions, Rules, Do, Don't, Examples, Edge Cases. Not all sections are required.

**Managed via:** ACE editor (Resources → Shared Skills), `/api/skills/*` routes, or by editing files in `custom/skills/` directly and updating `registry.json`.

### Current Skills

15 Shared Skills are registered as of April 2026:

| ID | Title |
|----|-------|
| `errors` | Errors |
| `design-workshop` | Design Workshop |
| `design-critique` | Design Critique |
| `dark-deceptive-practices` | Dark & Deceptive Practices |
| `accessibility` | Accessibility |
| `business-review` | Business Review |
| `competitive-analysis` | Competitive Analysis |
| `content-design` | Content Design |
| `customer-feedback` | Customer Feedback |
| `design-heuristics` | Design Heuristics |
| `forms-input-patterns` | Forms & Input Patterns |
| `interaction-patterns-states` | Interaction Patterns & States |
| `platform-guidelines` | Platform Guidelines |
| `service-design` | Service Design |
| `ux-research` | UX Research |

---

## Internal Knowledge Bases

**Where:** `custom/knowledge-bases/*.kb.json` + `custom/knowledge-bases/registry.json`
**ACE UI:** Resources → Internal KBs tab
**API:** `/api/kb/*`
**Format:** Structured JSON with fields: `id`, `title`, `purpose`, `scope`, `definitions`, `rulesConstraints`, `doDont`, `examples`, `edgeCases`

Internal KBs are structured reference corpora resolved and injected into assistant prompts at runtime by the KB resolution pipeline. The runtime — not the author — is responsible for assembling this content into the final prompt.

**Use Internal KBs for:**

- Reference data that changes frequently or is too large to embed in every prompt
- Design system inventories or component reference material specific to a runtime context
- Content that needs to be selectively injected based on the active assistant, not always included
- Documents where the runtime, not the author, should decide when to include them

**How they are referenced:** An assistant's `manifest.json` includes a `knowledgeBaseRefs` array listing KB IDs. The runtime KB resolver loads the referenced documents and injects their content during prompt assembly.

### Current Knowledge Bases

2 Internal KBs are registered:

| ID | Title |
|----|-------|
| `design-system-nuxt-ui` | Design System: Nuxt UI (v4) |
| `test-kb` | Test Knowledge Base |

---

## Which System to Use

| Need | System |
|------|--------|
| Cross-assistant behavior standards | Shared Skills |
| Domain-specific evaluation criteria for a specific assistant | Internal KB or assistant-local `SKILL.md` |
| Large reference corpus injected selectively at runtime | Internal KB |
| Content you want visible in the ACE prompt composer | Shared Skills |
| Design system-specific component or token reference | Internal KB |
| Short, stable framing useful across many prompt runs | Shared Skills or `SKILL.md` |

---

## Migration Note

In April 2026, 11 Internal KBs covering general design domains — accessibility, content design, UX research, dark patterns, and others — were migrated to Shared Skills format. The original `.kb.json` files remain on disk but are deregistered from `registry.json`. The Shared Skills versions in `custom/skills/` are the active source of truth for those domains.

The orphaned `.kb.json` files (`accessibility.kb.json`, `business-review.kb.json`, `competitive-analysis.kb.json`, `content-design.kb.json`, `customer-feedback.kb.json`, `design-heuristics.kb.json`, `forms-input-patterns.kb.json`, `interaction-patterns-states.kb.json`, `platform-guidelines.kb.json`, `service-design.kb.json`, `ux-research.kb.json`) have no runtime effect and can be safely deleted from `custom/knowledge-bases/`. They are not loaded or referenced by any code path.

The remaining Internal KBs (`design-system-nuxt-ui`, `test-kb`) were not migrated. They serve specific runtime injection purposes and are not general-purpose context documents.

---

## See Also

- [LLM Context Authoring](llm-context-authoring.md) — guidance on `SKILL.md` vs retrieval-backed reference content, and the practical decision test for where content belongs
- [Assistant SDK](assistant-sdk.md) — per-assistant `SKILL.md` and `manifest.json` structure, including `knowledgeBaseRefs`
