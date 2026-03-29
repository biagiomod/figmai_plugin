# FigmAI Extensibility — Plan B: ACE Admin Scoping

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each Strike Team a scoped ACE view — they log in and see only their assistant's config, KBs, and knowledge files. Core Team admins continue to see everything. Scoping is enforced at both the UI layer and the backend API.

**Architecture:** Add `assistantScope: string[]` to user records (empty = all, populated = filtered). The ace-lambda API filters GET /api/model responses and rejects out-of-scope writes with 403. The ACE UI hides tabs and restricts the assistant selector to the user's scope. The per-team config directories (`custom/assistants/{name}/`) replace the single `custom/assistants.manifest.json`. Both the local server (`admin-editor/server.ts`) and the Lambda backend are updated.

**Tech Stack:** JavaScript (ace-lambda), TypeScript (admin-editor/server.ts), vanilla JS (admin-editor/public/app.js), JSON (users.json schema), bcryptjs (existing), JWT (existing).

---

> **Scope note:** Plan B is independent of Plan A. It does not require the SDK or compile gate to be in place first.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `custom/assistants/` | CREATE (new structure) | Per-assistant config dirs, replacing single manifest |
| `custom/assistants.manifest.json` | KEEP → deprecate | Legacy file; read during migration, replaced by per-dir manifests |
| `scripts/split-manifest.ts` | CREATE | One-time migration script — splits manifest into per-dir files |
| `scripts/generate-assistants-from-manifest.ts` | MODIFY | Read from per-dir manifests (backward-compat with single file during transition) |
| `infra/ace-lambda/userService.js` | MODIFY | Add `assistantScope` field to user create/update/JWT schema |
| `infra/ace-lambda/authService.js` | MODIFY | Include `assistantScope` in JWT payload on login + bootstrap |
| `infra/ace-lambda/handler.js` | MODIFY | Add `requireScope` middleware helper |
| `infra/ace-lambda/configService.js` | MODIFY | Filter model response and validate scope on save |
| `infra/ace-lambda/kbService.js` | MODIFY | Restrict KB routes to scoped assistant dirs |
| `admin-editor/public/app.js` | MODIFY | Tab filtering + assistant selector scoping |
| `admin-editor/dist/app.js` | MODIFY | Keep in sync with public/app.js (copy) |

---

## Task 1: Split the Manifest into Per-Assistant Directories

**Files:**
- Create: `scripts/split-manifest.ts` (one-time migration tool)
- Create: `custom/assistants/{name}/manifest.json` for each assistant

This is a one-time migration. The script reads `custom/assistants.manifest.json` and writes one `manifest.json` per assistant into `custom/assistants/{name}/`.

- [ ] **Step 1: Read the current manifest structure**

```bash
cat custom/assistants.manifest.json | npx tsx -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf-8'))
console.log('Assistant IDs:', d.assistants.map(a => a.id).join(', '))
console.log('Count:', d.assistants.length)
"
```

This confirms the IDs you'll create directories for.

- [ ] **Step 2: Create `scripts/split-manifest.ts`**

```typescript
// scripts/split-manifest.ts
// One-time migration: splits custom/assistants.manifest.json into
// custom/assistants/{id}/manifest.json (one file per assistant).
// Run: npx tsx scripts/split-manifest.ts
// Safe to run multiple times — skips if file already exists.

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'custom', 'assistants.manifest.json')
const OUT_DIR = path.join(ROOT, 'custom', 'assistants')

interface AssistantEntry {
  id: string
  [key: string]: unknown
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('custom/assistants.manifest.json not found')
    process.exit(1)
  }

  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8')
  const manifest: { assistants: AssistantEntry[] } = JSON.parse(raw)
  const assistants = manifest.assistants

  if (!Array.isArray(assistants)) {
    console.error('Expected manifest.assistants to be an array')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const entry of assistants) {
    const id = entry.id
    if (!id || typeof id !== 'string') {
      console.warn(`Skipping entry with missing id: ${JSON.stringify(entry).slice(0, 60)}`)
      continue
    }

    const dirPath = path.join(OUT_DIR, id)
    const filePath = path.join(dirPath, 'manifest.json')

    if (fs.existsSync(filePath)) {
      console.log(`  skip  ${id}  (already exists)`)
      continue
    }

    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({ assistants: [entry] }, null, 2) + '\n', 'utf-8')
    console.log(`  wrote custom/assistants/${id}/manifest.json`)
  }

  console.log(`\nDone. ${assistants.length} assistant(s) processed.`)
  console.log('Old file custom/assistants.manifest.json is kept as backup — remove when ready.')
}

main()
```

> Note: each per-assistant `manifest.json` keeps the same shape `{ assistants: [entry] }` so that `generate-assistants-from-manifest.ts` can read them with minimal changes (see Task 2).

- [ ] **Step 3: Run the split**

```bash
npx tsx scripts/split-manifest.ts
```

Expected output lists one `wrote` line per assistant (e.g., `wrote custom/assistants/content_table/manifest.json`).

- [ ] **Step 4: Verify the output**

```bash
ls custom/assistants/
cat custom/assistants/content_table/manifest.json | head -20
```

Confirm each directory contains a `manifest.json` with a single assistant entry.

- [ ] **Step 5: Commit**

```bash
git add scripts/split-manifest.ts custom/assistants/
git commit -m "feat: split custom/assistants.manifest.json into per-assistant directories"
```

---

## Task 2: Update generate-assistants to Read Per-Dir Manifests

**Files:**
- Modify: `scripts/generate-assistants-from-manifest.ts`

Update `loadManifest()` so it reads from `custom/assistants/{id}/manifest.json` files when the per-dir structure exists, falling back to the single file if not.

- [ ] **Step 1: Read the current loadManifest function**

```bash
grep -n "loadManifest\|manifestPath\|readFileSync" scripts/generate-assistants-from-manifest.ts | head -20
```

Locate the `loadManifest` function (around lines 40-60 based on prior exploration).

- [ ] **Step 2: Replace `loadManifest` with a version that reads per-dir manifests**

Find and replace the `loadManifest` function body:

```typescript
function loadManifest(rootDir: string): ManifestRoot {
  const perDirRoot = path.join(rootDir, 'custom', 'assistants')
  const singleManifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')

  // Prefer per-directory structure if it exists
  if (fs.existsSync(perDirRoot) && fs.statSync(perDirRoot).isDirectory()) {
    const entries: AssistantManifestEntry[] = []
    const dirs = fs.readdirSync(perDirRoot)
      .filter(d => fs.statSync(path.join(perDirRoot, d)).isDirectory())
      .sort()

    for (const dir of dirs) {
      const manifestFile = path.join(perDirRoot, dir, 'manifest.json')
      if (!fs.existsSync(manifestFile)) continue
      try {
        const content = fs.readFileSync(manifestFile, 'utf-8')
        const parsed = JSON.parse(content) as ManifestRoot
        if (Array.isArray(parsed.assistants)) {
          entries.push(...parsed.assistants)
        }
      } catch (err) {
        console.error(`[generate-assistants] Failed to read ${manifestFile}:`, err)
        process.exit(1)
      }
    }

    if (entries.length > 0) {
      return { assistants: entries }
    }
    // Fall through to single-file if no entries found
  }

  // Fallback: single manifest file
  if (!fs.existsSync(singleManifestPath)) {
    console.error('[generate-assistants] Missing custom/assistants.manifest.json')
    process.exit(1)
  }
  try {
    const content = fs.readFileSync(singleManifestPath, 'utf-8')
    return JSON.parse(content) as ManifestRoot
  } catch (err) {
    console.error('[generate-assistants] Failed to read or parse manifest:', err)
    process.exit(1)
  }
}
```

- [ ] **Step 3: Verify the build still works**

```bash
npm run generate-assistants
```

Expected: `src/assistants/assistants.generated.ts` is regenerated with the same assistants as before. Check the count:

```bash
grep '"id":' src/assistants/assistants.generated.ts | wc -l
```

Must match the original assistant count.

- [ ] **Step 4: Run full build**

```bash
npm run build
```

Expected: passes. No change in behavior.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-assistants-from-manifest.ts
git commit -m "feat: generate-assistants now reads from per-directory custom/assistants/{id}/manifest.json"
```

---

## Task 3: Add assistantScope to the User Schema (ace-lambda)

**Files:**
- Modify: `infra/ace-lambda/userService.js`
- Modify: `infra/ace-lambda/authService.js`

Add `assistantScope: string[]` to the user record shape. Update the JWT payload so the scope is carried in the token. Existing users without the field default to `[]` (all access — backward compatible).

- [ ] **Step 1: Read the current user create/update functions in userService.js**

```bash
grep -n "createUser\|updateUser\|safeUser\|allowedTabs\|role" infra/ace-lambda/userService.js | head -30
```

- [ ] **Step 2: Add assistantScope to createUser**

Find the `createUser` function. In the user object construction, add `assistantScope` after `allowedTabs`:

```javascript
// In createUser, in the newUser object:
allowedTabs: Array.isArray(data.allowedTabs) ? data.allowedTabs.filter(t => VALID_TAB_IDS.has(t)) : [],
assistantScope: Array.isArray(data.assistantScope) ? data.assistantScope.map(s => String(s).trim()).filter(Boolean) : [],
```

- [ ] **Step 3: Add assistantScope to updateUser**

In `updateUser`, after the `allowedTabs` update block, add:

```javascript
if (data.assistantScope !== undefined) {
  if (!Array.isArray(data.assistantScope)) {
    return { success: false, error: 'assistantScope must be an array' }
  }
  updated.assistantScope = data.assistantScope.map(s => String(s).trim()).filter(Boolean)
}
```

- [ ] **Step 4: Add assistantScope to safeUser**

In the `safeUser` function (or equivalent — the function that strips passwordHash before returning to client), add `assistantScope`:

```javascript
function safeUser(user) {
  const { passwordHash, ...safe } = user
  return {
    ...safe,
    assistantScope: user.assistantScope || [],
  }
}
```

- [ ] **Step 5: Read authService.js JWT generation**

```bash
grep -n "sign\|payload\|allowedTabs\|token" infra/ace-lambda/authService.js | head -20
```

- [ ] **Step 6: Add assistantScope to the JWT payload in authService.js**

Find where the JWT token is signed on login and bootstrap. Add `assistantScope` to the payload alongside `allowedTabs`:

```javascript
// In the token payload object:
const payload = {
  sub: user.id,
  username: user.username,
  role: user.role,
  allowedTabs: user.allowedTabs || [],
  assistantScope: user.assistantScope || [],   // ← ADD THIS
  exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
}
```

Apply this in BOTH the login route and the bootstrap route.

- [ ] **Step 7: Verify existing users get empty scope (backward compat)**

Any existing user record in S3 `admin/users.json` that lacks `assistantScope` will return `[]` via the `user.assistantScope || []` fallback. This means all existing users retain full access. No migration needed.

- [ ] **Step 8: Commit**

```bash
git add infra/ace-lambda/userService.js infra/ace-lambda/authService.js
git commit -m "feat(ace-lambda): add assistantScope field to user records and JWT payload"
```

---

## Task 4: Add Scope Enforcement to API Routes (ace-lambda)

**Files:**
- Modify: `infra/ace-lambda/handler.js`
- Modify: `infra/ace-lambda/configService.js`
- Modify: `infra/ace-lambda/kbService.js`

Scoping is enforced at the API level — not just the UI. Scoped users can only read/write assistants in their scope.

- [ ] **Step 1: Read handler.js to understand how JWT is extracted**

```bash
grep -n "jwt\|token\|payload\|verify\|middleware\|getUser" infra/ace-lambda/handler.js | head -30
```

- [ ] **Step 2: Add a scope check helper to handler.js**

In `handler.js`, add this helper near the JWT verification logic:

```javascript
/**
 * Check if the authenticated user can access the given assistantId.
 * An empty assistantScope means the user is unrestricted (admin/full access).
 * A non-empty assistantScope means the user can only access listed IDs.
 */
function isInScope(jwtPayload, assistantId) {
  const scope = jwtPayload.assistantScope || []
  if (scope.length === 0) return true  // empty = all
  return scope.includes(assistantId)
}
```

Export or expose this so `configService.js` and `kbService.js` can use it:

```javascript
module.exports = {
  // ... existing exports
  isInScope,
}
```

- [ ] **Step 3: Read configService.js GET /api/model route**

```bash
grep -n "model\|manifest\|assistants\|jwtPayload\|payload" infra/ace-lambda/configService.js | head -40
```

- [ ] **Step 4: Filter GET /api/model response by assistantScope**

In the `GET /api/model` handler in `configService.js`, after loading the manifest data, apply scope filtering:

```javascript
// After loading model data, filter assistants for scoped users:
const { isInScope } = require('./handler')  // or inline the check

const scope = jwtPayload.assistantScope || []
if (scope.length > 0 && modelData.assistants) {
  modelData.assistants = modelData.assistants.filter(a => scope.includes(a.id))
}
```

This ensures scoped users never receive data for assistants outside their scope.

- [ ] **Step 5: Enforce scope on POST /api/save**

In the `POST /api/save` handler in `configService.js`, validate the save payload against the user's scope:

```javascript
// After authenticating, before saving:
const scope = jwtPayload.assistantScope || []
if (scope.length > 0 && body.assistants) {
  const outOfScope = body.assistants.filter(a => !scope.includes(a.id))
  if (outOfScope.length > 0) {
    return responses.forbidden(
      `Save rejected: assistants [${outOfScope.map(a => a.id).join(', ')}] are outside your assistantScope.`
    )
  }
}
```

- [ ] **Step 6: Read kbService.js route structure**

```bash
grep -n "assistantId\|scope\|params\|route\|jwtPayload" infra/ace-lambda/kbService.js | head -30
```

- [ ] **Step 7: Enforce scope on KB routes**

In `kbService.js`, for every route that accepts an `assistantId` path parameter (e.g., `GET /api/kb/{assistantId}/...` and `POST /api/kb/{assistantId}/...`), add a scope check after authentication:

```javascript
// At the start of each KB route handler, after extracting assistantId from path:
const { isInScope } = require('./handler')
if (!isInScope(jwtPayload, assistantId)) {
  return responses.forbidden(`Access to assistant '${assistantId}' is outside your scope.`)
}
```

Apply this to every KB route that takes an assistantId parameter.

- [ ] **Step 8: Verify with a manual test using curl (optional but recommended)**

If you have the Lambda running locally via `sam local start-api`:

```bash
# Login as a scoped user and get their token:
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"scoped-user","password":"test"}' | jq -r '.token')

# Try to GET model — should only return scoped assistant:
curl -s http://localhost:3000/api/model \
  -H "Authorization: Bearer $TOKEN" | jq '.assistants[].id'

# Try to save out-of-scope assistant — should return 403:
curl -s -X POST http://localhost:3000/api/save \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assistants":[{"id":"general"}]}'
```

- [ ] **Step 9: Commit**

```bash
git add infra/ace-lambda/handler.js infra/ace-lambda/configService.js infra/ace-lambda/kbService.js
git commit -m "feat(ace-lambda): enforce assistantScope on model, save, and KB routes"
```

---

## Task 5: Update the ACE UI for Scoped Users

**Files:**
- Modify: `admin-editor/public/app.js`
- Modify: `admin-editor/dist/app.js`

The ACE frontend reads `assistantScope` from the auth state (it's in the JWT, returned on login/bootstrap). Scoped users see only their assistant's tabs. Admin users (empty scope) see all tabs.

- [ ] **Step 1: Read how auth state is stored in app.js**

```bash
grep -n "assistantScope\|auth\.scope\|allowedTabs\|state\.auth" admin-editor/public/app.js | head -20
```

If `assistantScope` is not yet in the auth state, it needs to be added.

- [ ] **Step 2: Add assistantScope to state.auth**

Find the `state` object definition (around line 15-43). Add `assistantScope`:

```javascript
const state = {
  auth: { user: null, role: null, allowedTabs: [], assistantScope: [] },
  // ... rest unchanged
}
```

- [ ] **Step 3: Store assistantScope after login/bootstrap**

Find `apiAuthLogin` and `apiAuthBootstrap` (they were already fixed in a prior session to store the JWT token). In those functions, also store `assistantScope` when the user data arrives:

```javascript
// In apiAuthLogin and apiAuthBootstrap, after setting state.auth.user:
state.auth.assistantScope = data.user.assistantScope || []
```

Alternatively, if `assistantScope` is decoded from the JWT payload client-side, read it from the decoded token.

- [ ] **Step 4: Filter tabs based on assistantScope**

Find the `renderTabs()` function (or wherever tab buttons are rendered). After the existing `allowedTabs` filter, add an `assistantScope` filter.

The mapping of assistant IDs to tab IDs:
- If scope contains `'content_table'` → show `'content-models'` tab and `'knowledge'` tab (knowledge docs for that assistant)
- If scope contains `'analytics_tagging'` → show `'analytics'` tab
- Admin tabs always hidden from non-admins: `'config'`, `'registries'`, `'users'`, `'ai'`

Add this logic immediately after the existing `role !== 'admin'` check in `switchTab` and tab rendering:

```javascript
function isTabAllowedByScope(tabId, assistantScope) {
  // Empty scope = admin = all tabs allowed
  if (!assistantScope || assistantScope.length === 0) return true

  // These tabs are always hidden from scoped users
  const adminOnlyTabs = new Set(['config', 'ai', 'registries', 'users'])
  if (adminOnlyTabs.has(tabId)) return false

  // The assistant-specific tabs a scoped user can see
  const scopedTabMap = {
    'assistants': true,          // always show (filtered by scope on load)
    'knowledge-bases': true,     // always show (filtered by scope on load)
    'knowledge': true,           // always show (filtered by scope on load)
    'content-models': true,      // show for content_table scope
  }
  return scopedTabMap[tabId] !== undefined
}
```

In `switchTab`, after the existing allowedTabs check, add:

```javascript
if (!isTabAllowedByScope(tabId, state.auth.assistantScope)) {
  const firstAllowed = getAllowedTabs(state.auth.assistantScope)[0] || 'assistants'
  state.selectedTab = firstAllowed
  tabId = firstAllowed
}
```

- [ ] **Step 5: Hide tabs in the tab bar rendering**

Find where tab `<button>` elements are rendered or shown/hidden (look for `querySelectorAll('[data-tab]')` or the tab rendering loop). Add visibility control based on scope:

```javascript
tabButtons.forEach(function (btn) {
  const t = btn.getAttribute('data-tab')
  const scopeAllowed = isTabAllowedByScope(t, state.auth.assistantScope)
  btn.style.display = scopeAllowed ? '' : 'none'
})
```

- [ ] **Step 6: Filter the assistant selector to show only scoped assistants**

Find where the assistant list is rendered in the Assistants tab (the dropdown or list of assistant entries). After loading assistant data, filter by scope:

```javascript
// When rendering the assistants list:
const scope = state.auth.assistantScope || []
const visibleAssistants = scope.length === 0
  ? allAssistants
  : allAssistants.filter(a => scope.includes(a.id))
```

- [ ] **Step 7: Sync changes to dist/app.js**

`admin-editor/dist/app.js` must match `admin-editor/public/app.js`. After all changes are made to `public/app.js`, apply the identical changes to `dist/app.js`.

Search for the same function names in `dist/app.js` and apply the same edits. Run a diff to verify:

```bash
diff admin-editor/public/app.js admin-editor/dist/app.js | head -40
```

The diff should only show non-functional differences (if any). If the dist is a build artifact, regenerate it:

```bash
# Check if there's a dist build command:
grep -n "dist" admin-editor/package.json 2>/dev/null || echo "no dist build script"
```

If `dist/` is a manual copy, apply the changes manually.

- [ ] **Step 8: Run the local ACE server and test the scoped UI**

```bash
npm run admin
```

Open `http://localhost:3000` (or whichever port ACE uses).

Log in as a scoped user (one with `assistantScope: ["content_table"]`). Verify:
- Only the allowed tabs are visible
- The Assistants tab shows only the Evergreens assistant
- Clicking a hidden tab is blocked

Log in as an admin (empty scope). Verify all tabs are visible and all assistants appear.

- [ ] **Step 9: Commit**

```bash
git add admin-editor/public/app.js admin-editor/dist/app.js
git commit -m "feat(ace-ui): filter tabs and assistant list by assistantScope for scoped users"
```

---

## Task 6: Final Verification

End-to-end check of the full scoping system.

- [ ] **Step 1: Create a scoped test user via ACE (local)**

```bash
npm run admin
```

Navigate to Users tab → create a new user with:
- `username`: `test-scoped`
- `role`: `editor`
- `assistantScope`: `["content_table"]`

- [ ] **Step 2: Log in as the scoped user**

Log out, then log in as `test-scoped`. Verify:
- Only Evergreens-related tabs visible
- Config, Users, AI, Design Systems tabs hidden
- Assistant selector shows only Evergreens

- [ ] **Step 3: Attempt to access a hidden tab directly (URL manipulation)**

If the tab ID can be set via URL hash or query param, try navigating to a hidden tab. Expected: redirected to the first allowed tab with an "unauthorized" notification.

- [ ] **Step 4: Log in as admin, verify full access**

Log out and log in as an admin (empty `assistantScope`). Verify all tabs and all assistants are visible.

- [ ] **Step 5: Run invariants**

```bash
npm run invariants
```

Expected: passes.

- [ ] **Step 6: Note Lambda deployment requirement**

The ace-lambda changes require a SAM deployment to take effect in the hosted environment:

```bash
cd infra/ace-lambda
sam build && sam deploy
```

This updates the hosted Lambda with the new scope enforcement middleware.

---

## Self-Review Checklist

- [ ] `assistantScope: []` on any existing user returns full access (backward compatible)
- [ ] `assistantScope: ["content_table"]` hides Config, Users, AI, Design Systems tabs
- [ ] POST /api/save with out-of-scope assistant ID returns 403 (not just hidden in UI)
- [ ] GET /api/model strips out-of-scope assistants from response
- [ ] KB routes return 403 for out-of-scope assistantId
- [ ] `admin-editor/public/app.js` and `admin-editor/dist/app.js` are in sync
- [ ] `npm run admin` works locally with scoped users
- [ ] `npm run invariants` passes
