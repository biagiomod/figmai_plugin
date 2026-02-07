# Decisions

**Purpose:** Key architectural and product decisions. Where the rationale is not evident from the codebase or comments, the entry is marked **TBD**.

---

## Provider and connection

| Decision | Summary | Rationale / status |
|----------|---------|--------------------|
| **Single active provider per session** | When Internal API is enabled, all LLM requests use Internal API only; proxy is ignored. | Documented in invariants and connection-modes; ensures predictable routing. |
| **Proxy vs Internal API choice in settings** | User selects connection type and URL in Settings; stored in clientStorage, merged with customConfig. | TBD: historical reason for offering both (e.g. dev vs enterprise). |
| **No direct OpenAI from plugin** | Plugin never holds API keys; requests go to proxy or Internal API. | Sandbox and security: keys stay server-side; see open-source-architecture and proxy-setup. |

---

## Assistants and knowledge

| Decision | Summary | Rationale / status |
|----------|---------|--------------------|
| **Assistants from generated TS only** | Runtime does not read custom/assistants.manifest.json; only assistants.generated.ts. | Invariant (assert-invariants); avoids async/file in sandbox and keeps single code path. |
| **Two knowledge mechanisms** | (1) Custom .md per assistant merged via mergeKnowledgeBase; (2) structured KB (.kb.json) via knowledgeBaseRefs and resolveKnowledgeBaseDocs → preamble segment. | (1) Legacy/custom overlay; (2) PR11c1: deterministic, budgeted KB segment from generated TS only. TBD: long-term plan to consolidate or keep both. |
| **Dispatch key (assistantId, actionId)** | Handlers are selected by getHandler(assistantId, actionId); canHandle(assistantId, actionId). | Invariant; ensures one handler per (assistant, action) and stable behavior. |

---

## Build and config

| Decision | Summary | Rationale / status |
|----------|---------|--------------------|
| **Custom overlay is build-time** | custom/config.json, custom/knowledge, custom/knowledge-bases, design-systems are read by scripts; plugin loads only generated TS. | No runtime file/network for config or KB docs; supports locked-down deployments. |
| **Manifest allowedDomains patched at build** | update-manifest-network-access.ts writes manifest.json.networkAccess.allowedDomains from custom config (and defaults). | Figma requires explicit origins; one source of truth for allowed domains. |
| **ACE is optional** | Admin Config Editor is a separate local server for editing config and manifest; plugin runs without it. | TBD: why ACE vs. only hand-editing custom/ files. |

---

## Content safety and recovery

| Decision | Summary | Rationale / status |
|----------|---------|--------------------|
| **Tiered recovery on content filter** | Tier 1 full payload; on filter, Tier 2 (redaction) or Tier 3 (minimal) retry. | Documented in contentSafety and LLM prompt pipeline; reduces user-facing failures. |
| **No change to provider/recovery for KB** | PR11c1 added KB segment to preamble but did not change recovery tier logic. | Constraint of PR11c1; keeps behavior stable. |

---

## Testing and invariants

| Decision | Summary | Rationale / status |
|----------|---------|--------------------|
| **Tests as tsx scripts** | No Jest/Vitest; tests are run via `tsx path/to/test.ts`. | Evident from package.json "test" script. TBD: whether to adopt a framework later. |
| **Assert-invariants in postbuild** | Script checks dispatch key, ui-only/tool-only ordering, assistants from generated only, selection-context image gating. | Prevents regressions that violate documented architecture. |

---

## Placeholders (TBD)

- **Default allowedDomains including localhost and one proxy origin:** Rationale for exact default list (e.g. 8787, [REDACTED]) not in code.  
- **ACE port 3333:** Default chosen for local dev; no rationale in repo.  
- **Preamble injection only for providers that support it:** Which providers support it and why that gate exists — from code (capabilities.supportsPreambleInjection); product rationale TBD.  
- **Analytics endpoint optional and config-driven:** Why analytics is optional and where endpointUrl is used; code in analytics/service.ts; product rationale TBD.
