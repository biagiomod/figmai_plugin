# Banned Phrases — Root Cause and Guard

## Root cause

The Internal API payload was still containing "Ignore previous assistant instructions" because **build/main.js was stale**. The TypeScript source (`src/main.ts`) had already been updated to use `SESSION_HEADER_SAFE` ("Start a new conversation. Use only the assistant instructions and context provided in this request.") and no longer contained any banned phrase. The preamble is built in two places in main.ts (general chat path ~534, quick action path ~901), both using `SESSION_HEADER_SAFE + '\n\n' + \`${assistant.label} context: ${getShortInstructions(assistant)}\n\n\``. The plugin loads the compiled `build/main.js`; if that file was not rebuilt after the TS change, it continued to serve the old preamble string.

## Fix

1. **Regenerate artifacts:** Run `npm run build`. The build step compiles main.ts into build/main.js; the new artifact contains the safe preamble and no banned phrase.
2. **Postbuild guard:** Added `scripts/check-banned-phrases.js`, which reads `build/main.js` and `build/ui.js` and fails (exit 1) if any of these substrings appear (case-insensitive): "Ignore previous assistant instructions", "Ignore previous instructions", "disregard prior", "you are now". It is wired into `package.json` postbuild after `check-sync-api.js` and before `update-manifest-network-access.ts`.

## How the guard prevents recurrence

- Every successful `npm run build` runs the postbuild chain; if any banned phrase is present in build/main.js or build/ui.js, `check-banned-phrases.js` exits 1 and the overall build fails.
- A future mistaken edit that reintroduces a banned phrase in source will produce an artifact that fails the check.
- A stale artifact (e.g. an old main.js committed by mistake) will also fail the check until the project is rebuilt from current source.

## Verification checklist (work)

1. **Grep source:** `rg "Ignore previous|disregard prior|you are now" src/` → no matches.
2. **Grep build:** `rg "Ignore previous|disregard prior|you are now" build/` → no matches.
3. **Rebuild:** `npm run build` → completes; postbuild shows `[check-banned-phrases] PASSED`.
4. **Payload:** With Internal API and General Assistant, send "Hello?"; confirm (e.g. via network inspector or diagnostics) that the sent message starts with "Start a new conversation. Use only the assistant instructions and context provided in this request." and does not contain "Ignore previous assistant instructions".
