# FigmAI Plugin + ACE — Project Context (ChatGPT Synthesis)

## Purpose of this File
This document captures critical context, invariants, mental models, and design intent that emerged through extensive iterative development and debugging of the FigmAI Figma plugin and its Admin Config Editor (ACE).

It complements (but does not replace) the following SSOT files:
- SSOT.md
- ARCHITECTURE.md
- KB_AND_ASSISTANTS.md
- DECISIONS.md
- RUNBOOK.md

This file exists to prevent regressions, misinterpretation, and architectural drift when continuing development, refactoring, or onboarding new contributors (human or AI).

---

## High-Level System Overview

FigmAI consists of two tightly related but **strictly separated** systems:

1. **Figma Plugin (Runtime)**
   - Runs inside Figma
   - Must be deterministic, offline-safe, and governed
   - Consumes only generated TypeScript artifacts
   - Never reads JSON at runtime
   - Never fetches remote configuration

2. **Admin Config Editor (ACE)**
   - Local admin UI for authoring Assistants, Knowledge Bases, settings
   - Produces validated JSON
   - Writes only to `custom/`
   - All runtime consumption happens via build-time generators

This separation is **non-negotiable** and enforced by invariants and tests.

---

## Assistants: What They Are and Are Not

### Assistants ARE:
- Conversational + action-oriented AI roles
- Defined declaratively via manifest → generated TS
- Allowed to have:
  - Instruction blocks (role, tone, behavior)
  - Output schemas
  - Quick actions (ui-only, tool-only, llm, hybrid)
  - Knowledge base references (IDs only)

### Assistants are NOT:
- Knowledge bases
- Free-form prompt blobs
- Runtime-configurable via JSON
- Allowed to dynamically fetch or mutate configuration

---

## Knowledge Bases (KBs): Correct Mental Model

### KBs ARE:
- Static, normalized reference documents
- Versioned, auditable, deterministic
- Validated by Zod
- Compiled into `knowledgeBases.generated.ts`
- Injected into prompts as **reference context only**

### KBs are NOT:
- Prompt templates
- Tone controllers
- Output schema definitions
- JSON format enforcers
- Behavior switches

KBs should contain:
- Rules
- Constraints
- Definitions
- Heuristics
- Domain knowledge

KBs should NOT contain:
- “You are an assistant…”
- “Return JSON…”
- “Be concise…”
- Tool invocation rules

---

## Prompt Assembly: Critical Invariants

Prompt assembly has a **single choke point**:
- `buildAssistantInstructionSegments()`

Order of influence:
1. System/session header
2. Assistant instruction blocks (or legacy fallback)
3. Knowledge base segment (bounded + truncated)
4. User message
5. Selection context (conditionally)
6. Provider recovery logic (Tier 1/2/3)

No other part of the system should assemble prompts.

---

## Artifact Generation Safety

Some assistants (e.g. Design Critique, Content Table, Analytics Tagging):
- Generate structured JSON
- Drive Figma canvas mutations
- Depend on strict output contracts

Safety guarantees:
- Output schemas live in prompt templates + handlers
- KBs do NOT modify output shape
- Handlers are the only place that touch the canvas
- Tool-only actions never call LLMs
- UI-only actions never reach `main.ts`

Breaking any of the above is a regression.

---

## ExecutionType: Why It Exists

Every quick action has an explicit `executionType`:
- ui-only
- tool-only
- llm
- hybrid

This exists to:
- Eliminate hidden routing logic
- Prevent accidental LLM calls
- Enable invariant testing
- Make assistant behavior auditable

Routing logic in `main.ts` must remain aligned with `executionType`.

---

## Knowledge Base Lifecycle

1. KB authored/imported in ACE
2. Normalized via deterministic code (no AI)
3. Stored as `<id>.kb.json`
4. Registered in `registry.json`
5. Compiled via `generate-knowledge-bases.ts`
6. Consumed by plugin via generated TS only

If a KB is missing or invalid:
- Build must fail
- Runtime must not guess

---

## Migration Strategy (Critical)

When migrating existing assistant knowledge into KBs:

DO:
- Extract factual knowledge, rules, heuristics
- Preserve assistant prompt templates
- Migrate incrementally, assistant by assistant
- Start with low-risk assistants (Errors, General)

DO NOT:
- Move JSON output rules into KBs
- Move tone/role instructions into KBs
- Change multiple assistants at once
- Change prompt structure during KB migration

Test after every migration.

---

## Testing Philosophy

Before changing content:
- Ensure pipeline works end-to-end

During migration:
- Behavior parity > elegance
- No regressions tolerated

After migration:
- Only then consider enhancements (e.g. user-selected KBs)

---

## Deferred / Backlog Ideas (Explicitly Not Implemented Yet)

- User-selectable KB mentions in chat (e.g. `@accessibility`)
- Dynamic KB weighting
- Per-action KB overrides
- KB authoring with AI assistance

These require new UX and are intentionally postponed.

---

## Non-Negotiable Constraints

- No runtime JSON reads
- No external network calls
- No implicit behavior
- No “magic” prompts
- No hidden configuration

If unsure: stop and re-check SSOT.md + DECISIONS.md.

---

## Final Note

This project has been intentionally designed to be:
- Boring at runtime
- Strict at build time
- Flexible at the edges
- Safe for enterprise environments

Preserve those qualities.