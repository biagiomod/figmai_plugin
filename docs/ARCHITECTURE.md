# Architecture

**Purpose:** Subsystems, entry points, data flow, and runtime services. Facts derived from the codebase and existing docs.

---

## Subsystems

| Subsystem | Responsibility | Key paths |
|-----------|----------------|----------|
| **Plugin UI** | Chat, assistant selector, quick actions, mode (simple/advanced/content-mvp), message history, artifact rendering, settings modal | `src/ui.tsx`, `src/ui/components/*.tsx` |
| **Main thread** | Message routing, handler lookup, selection state, provider creation, SEND_MESSAGE and RUN_QUICK_ACTION, preamble injection, sendChatWithRecovery | `src/main.ts` |
| **Providers** | LLM request formatting and send; Internal API vs Proxy vs stubs | `src/core/provider/*.ts`, `src/core/proxy/client.ts` |
| **Config** | customConfig (bundled), getEffectiveSettings (customConfig + clientStorage) | `src/custom/config.ts`, `src/custom/generated/customConfig.ts`, `src/core/settings.ts` |
| **Assistants** | Manifest → ASSISTANTS; mergeKnowledgeBase + appendDesignSystemKnowledge → promptMarkdown; listAssistantsByMode, getAssistant, getHandler | `src/assistants/index.ts`, `src/assistants/assistants.generated.ts`, `src/core/assistants/handlers/index.ts` |
| **Knowledge bases** | Runtime: resolveKnowledgeBaseDocs(refs) → docs from KB_DOCS; instruction assembly appends KB segment to preamble | `src/core/knowledgeBases/resolveKb.ts`, `src/knowledge-bases/knowledgeBases.generated.ts`, `src/core/assistants/instructionAssembly.ts` |
| **ACE (Admin Config Editor)** | Local server: load/save model (config, assistants manifest, custom knowledge), auth, RBAC, users | `admin-editor/server.ts`, `admin-editor/src/model.ts`, `admin-editor/src/save.ts` |
| **Content safety & recovery** | Tiered retry on content filter; segment sanitization and budgets | `src/core/contentSafety/recovery.ts`, `src/core/llm/promptPipeline.ts` |

---

## Entry points

| Trigger | Flow |
|--------|------|
| **User sends chat message** | UI `handleSend` → `SEND_MESSAGE` → main: build context, normalize messages, optional handler.prepareMessages → sendChatWithRecovery → handler.handleResponse or replaceStatusMessage(response) |
| **User clicks quick action** | UI `handleQuickAction` → UI-only or `RUN_QUICK_ACTION` → main: getAssistant, getHandler; tool-only/ui-only early return or build context → sendChatWithRecovery → handler.handleResponse or replaceStatusMessage |
| **Settings** | `REQUEST_SETTINGS` → main: getEffectiveSettings() → `SETTINGS_RESPONSE` → SettingsModal |
| **Plugin load** | main.ts registers message handlers; UI mounts, requests settings and assistant list |

---

## Runtime services and network

All endpoints and ports referenced in code are listed below. **External network** = outbound from the Figma plugin or from a local server to the internet; must be allowlisted where applicable.

### Plugin → external (Figma sandbox)

Figma enforces `manifest.json` → `networkAccess.allowedDomains`. No request can be made to an origin not in that list.

| Purpose | Endpoint / URL pattern | Source | External network? |
|---------|------------------------|--------|-------------------|
| **Proxy: health** | `GET {proxyBaseUrl}/health` | `src/core/proxy/client.ts` | **Yes** — origin must be in allowedDomains (user-configured proxy, e.g. [REDACTED] or localhost) |
| **Proxy: chat** | `POST {proxyBaseUrl}/v1/chat` | `src/core/proxy/client.ts` | **Yes** — same as above |
| **Internal API: chat** | `POST {internalApiUrl}` (single URL, JSON body) | `src/core/provider/internalApiProvider.ts` | **Yes** — origin must be in allowedDomains |
| **Analytics** | `POST {endpointUrl}` (if analytics.enabled and endpointUrl set) | `src/core/analytics/service.ts`; config from customConfig | **Yes** — if used; origin must be in allowedDomains |

**Default / example allowedDomains (build-time):**  
Script `scripts/update-manifest-network-access.ts` and `custom/config.json` → `networkAccess.baseAllowedDomains` / `extraAllowedDomains` determine final `manifest.json` → `allowedDomains`. Public defaults in script include: `https://api.openai.com`, `http://localhost:8787`, and one example proxy origin [REDACTED]. Corporate builds replace or extend via custom config.

### Local development (not in plugin sandbox)

| Service | Port / URL | Source | External network? |
|---------|------------|--------|-------------------|
| **Proxy (local)** | `http://localhost:8787` (documented in proxy-setup.md) | Docs + manifest default allowedDomains | No (local only) |
| **ACE (Admin Config Editor)** | `http://localhost:3333` (or `ADMIN_EDITOR_PORT`) | `admin-editor/server.ts` | No — local server; browser talks to localhost |

ACE endpoints (all local): `GET /api/model`, `POST /api/validate`, `POST /api/save`, `GET /api/build-info`, auth and user routes under `/api/auth`, `/api/users`; KB routes under `/api/kb/...`. No outbound calls from ACE to third parties except as configured in the repo (e.g. none by default).

---

## Data flow (high level)

1. **Config:** `custom/config.json` + generators → `src/custom/generated/customConfig.ts`. At runtime, getEffectiveSettings() merges customConfig with Figma clientStorage (user-editable settings).
2. **Assistants:** `custom/assistants.manifest.json` → generate-assistants-from-manifest → `assistants.generated.ts`. Index builds ASSISTANTS with promptMarkdown = mergeKnowledgeBase(assistantId, promptTemplate) + appendDesignSystemKnowledge().
3. **KB docs (structured):** `custom/knowledge-bases/registry.json` + `*.kb.json` → generate-knowledge-bases → `knowledgeBases.generated.ts`. At runtime, main resolves refs via resolveKnowledgeBaseDocs(assistant.knowledgeBaseRefs) and passes kbDocs into buildAssistantInstructionSegments; KB segment is appended to preamble when refs exist.
4. **LLM request:** buildSelectionContext (selection, summary, optional images) + buildAssistantInstructionSegments (preamble + optional KB segment) → prompt pipeline (assemble, sanitize, budgets, safety) → provider.sendChat(). Recovery tiers on content filter.
5. **Manifest:** build-figma-plugin produces manifest from package.json; postbuild runs update-manifest-network-access and writes `networkAccess.allowedDomains` from custom config.

---

## Build pipeline (summary)

- **prebuild:** generate-assistants, generate-presets, generate-custom-overlay, generate-dark-demo-cards, generate-knowledge-bases, generate-build-info.
- **build:** build-figma-plugin (typecheck + minify).
- **postbuild:** check-sync-api, check-banned-phrases, update-manifest-network-access, invariants.

See [RUNBOOK.md](RUNBOOK.md#build-commands) for exact commands.
