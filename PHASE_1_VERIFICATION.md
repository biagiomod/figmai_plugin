# Phase 1: Mode Persistence Verification

This document provides step-by-step verification procedures to ensure mode persistence is working correctly after the Phase 1 fixes.

## Prerequisites

1. Build the plugin: `npm run build`
2. Open the plugin in Figma
3. Open browser DevTools (for the plugin iframe) to view console logs

## Enabling Debug Logging (Optional)

To see detailed mode tracking logs, enable UI subsystem debugging:

1. Open `src/core/config.ts`
2. Set `CONFIG.dev.debug.enabled = true`
3. Set `CONFIG.dev.debug.scopes['subsystem:ui'] = true`
4. Rebuild: `npm run build`
5. Reload the plugin

Debug logs will appear with prefix `[UI:mode]` showing:
- Mode initialization source
- Mode state changes with context
- localStorage writes with callsite

## Verification Steps

### A) Mode Persistence on Selection Changes

**Goal**: Verify that mode does not reset when clicking/selecting nodes on the Figma canvas.

**Steps**:
1. Set mode to "Advanced" (or "Simple") via Settings or mode selector
2. Verify mode is set: Check the mode selector button shows "Advanced" (or "Simple")
3. Click/select multiple different nodes on the Figma canvas (at least 5-10 selections)
4. After each selection, verify:
   - Mode selector still shows the same mode
   - No unexpected mode changes in console logs
   - No localStorage writes for 'figmai-mode' (check DevTools Console for `[UI:mode] localStorage write` logs)

**Expected Result**: 
- Mode remains stable throughout all selections
- No localStorage writes occur during selection changes
- Console shows no mode state changes triggered by selection

**How to Verify localStorage Writes**:
- With debug logging enabled, look for `[UI:mode] localStorage write` messages
- In DevTools Console, filter for "localStorage write" or "figmai-mode"
- Alternatively, use DevTools Application tab → Local Storage → Check 'figmai-mode' value (should not change during selections)

---

### B) Plugin Reload Persistence

**Goal**: Verify that mode persists across plugin UI close/reopen cycles.

**Steps**:
1. Set mode to "Advanced" (or "Simple")
2. Verify mode is saved: In DevTools Console, run:
   ```javascript
   localStorage.getItem('figmai-mode')
   ```
   Should return `"advanced"` or `"simple"`
3. Close the plugin UI (click X or close panel)
4. Reopen the plugin UI
5. Verify mode is still "Advanced" (or "Simple")

**Expected Result**:
- Mode persists after plugin reload
- Console shows mode initialization from localStorage (with debug logging enabled)
- Mode selector shows the correct persisted mode

**Debug Log Check** (if enabled):
- Look for: `[UI:mode] getInitialMode: using localStorage` with `source: 'localStorage'`

---

### C) Empty localStorage Test

**Goal**: Verify that mode falls back to CONFIG.defaultMode when localStorage is empty.

**Steps**:
1. Open DevTools Console for the plugin iframe
2. Clear the mode from localStorage:
   ```javascript
   localStorage.removeItem('figmai-mode')
   ```
3. Verify it's cleared:
   ```javascript
   localStorage.getItem('figmai-mode')
   ```
   Should return `null`
4. Reload the plugin UI (close and reopen, or refresh iframe)
5. Verify mode is set to "Advanced" (CONFIG.defaultMode)

**Expected Result**:
- Mode initializes to "Advanced" (default)
- Console shows mode initialization from CONFIG.defaultMode (with debug logging enabled)
- No errors occur

**Debug Log Check** (if enabled):
- Look for: `[UI:mode] getInitialMode: using fallback` with `source: 'CONFIG.defaultMode'`

---

### D) hideContentMvpMode Test

**Goal**: Verify that stored 'content-mvp' mode is rejected when hideContentMvpMode is enabled, and mode does not flip-flop on selection changes.

**Steps**:
1. **Enable hideContentMvpMode**:
   - Open `custom/config.json`
   - Set `"hideContentMvpMode": true`
   - Rebuild: `npm run build`
   - Reload plugin

2. **Set invalid mode in localStorage**:
   - Open DevTools Console
   - Run:
     ```javascript
     localStorage.setItem('figmai-mode', 'content-mvp')
     ```
   - Verify:
     ```javascript
     localStorage.getItem('figmai-mode')
     ```
     Should return `"content-mvp"`

3. **Reload plugin UI**:
   - Close and reopen plugin
   - Verify mode is NOT 'content-mvp'
   - Verify mode is "Advanced" (fallback)

4. **Verify no flip-flop on selection**:
   - Click/select multiple nodes on canvas (5-10 selections)
   - After each selection, verify mode remains "Advanced"
   - Check console for any mode state changes

**Expected Result**:
- Initialization rejects 'content-mvp' and uses fallback ("Advanced")
- Mode remains stable during selection changes
- No localStorage writes occur (mode should not be "normalized" back to 'content-mvp')
- Console shows: `[UI:mode] getInitialMode: localStorage value invalid` with reason

**Debug Log Check** (if enabled):
- Look for: `[UI:mode] getInitialMode: localStorage value invalid` with `reason: 'content-mvp hidden'`
- Look for: `[UI:mode] getInitialMode: using fallback` with `source: 'CONFIG.defaultMode'`

---

## Troubleshooting

### Mode Resets on Selection

If mode still resets on selection:
1. Check console for `[UI:mode] Mode state changed` logs
2. Look for the `context` field to identify the trigger
3. Check if `SETTINGS_RESPONSE` messages are being received (look for `[UI:mode] SETTINGS_RESPONSE` logs)
4. Verify SettingsModal useEffect dependencies (should NOT include `currentMode`)

### Mode Doesn't Persist on Reload

If mode doesn't persist:
1. Check localStorage: `localStorage.getItem('figmai-mode')` in console
2. Verify the value is valid: should be `"simple"`, `"advanced"`, or `"content-mvp"` (if not hidden)
3. Check console for initialization logs to see which source was used
4. Verify `getInitialMode()` is being called on mount (check `[UI:mode] Plugin mount: mode initialized`)

### Invalid Mode in localStorage

If an invalid mode is stored:
1. Clear it: `localStorage.removeItem('figmai-mode')`
2. Reload plugin
3. Mode should fall back to CONFIG.defaultMode
4. Set a valid mode via Settings or mode selector

---

## Clean Up After Verification

Once verification is complete:

1. **Disable debug logging** (if enabled):
   - Open `src/core/config.ts`
   - Set `CONFIG.dev.debug.enabled = false`
   - Or set `CONFIG.dev.debug.scopes['subsystem:ui'] = false`
   - Rebuild: `npm run build`

2. **Restore hideContentMvpMode** (if changed):
   - Open `custom/config.json`
   - Set `"hideContentMvpMode": false` (or remove the property)
   - Rebuild: `npm run build`

---

## Summary Checklist

- [ ] **A) Mode Persistence**: Mode does not change on selection
- [ ] **B) Plugin Reload**: Mode persists after close/reopen
- [ ] **C) Empty localStorage**: Falls back to CONFIG.defaultMode
- [ ] **D) hideContentMvpMode**: Rejects invalid mode, no flip-flop

All checks should pass for Phase 1 to be considered complete.
