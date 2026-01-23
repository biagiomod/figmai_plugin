# Phase 0: localStorage Mode Audit Report

## Storage Keys

**Mode Storage:**
- Key: `'figmai-mode'` (localStorage, UI thread only)
- Used in: `src/ui.tsx`, `src/ui/components/SettingsModal.tsx`
- No assistant-specific storage key - assistant is derived from mode via `getDefaultAssistant(mode)`

## Mode Default Fallbacks (8 locations found)

### Correct (using CONFIG.defaultMode):
1. `src/main.ts:133` - Main thread mode initialization ✓
2. `src/main.ts:348` - RESET handler ✓

### Incorrect (hardcoded values):
3. `src/ui.tsx:265` - Mode state init fallback: hardcoded `'advanced'` (should use CONFIG.defaultMode)
4. `src/ui.tsx:283` - Assistant init mode fallback: hardcoded `'advanced'` (should use CONFIG.defaultMode)
5. `src/ui/components/SettingsModal.tsx:34` - Mode state init fallback: hardcoded `'content-mvp'` ❌
6. `src/ui/components/SettingsModal.tsx:48` - Initial mode tracking fallback: hardcoded `'content-mvp'` ❌
7. `src/ui/components/SettingsModal.tsx:121` - SETTINGS_RESPONSE handler fallback: hardcoded `'simple'` ❌
8. `src/ui/components/SettingsModal.tsx:135` - SETTINGS_RESPONSE error fallback: hardcoded `'simple'` ❌

## Assistant-Mode Coupling

- **No localStorage persistence for assistant** - assistant state is React-only
- Assistant is derived from mode: `getDefaultAssistant(mode)`
- Mode changes trigger assistant updates in `handleModeSelect()` (src/ui.tsx:775-796)

## Issues Identified

1. **Inconsistent fallbacks**: SettingsModal defaults to `'content-mvp'` while main UI defaults to `'advanced'`
2. **Hardcoded values**: Multiple locations use string literals instead of CONFIG.defaultMode
3. **No validation against hideContentMvpMode**: Stored `'content-mvp'` is accepted even if config hides it
4. **SETTINGS_RESPONSE handler**: May overwrite mode unnecessarily (line 118-142 in SettingsModal)

## Next Steps

Phase 1 will:
1. Create `src/ui/utils/mode.ts` with centralized `getInitialMode()` function
2. Replace all 6 incorrect initialization points
3. Add validation for `hideContentMvpMode`
4. Guard SETTINGS_RESPONSE handler to prevent mode overwrites
