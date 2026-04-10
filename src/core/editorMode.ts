/**
 * Editor mode state — shared between main.ts and handlers.
 * Kept in core/ (not main.ts) to avoid circular imports:
 *   main.ts → handlers → core/editorMode  (no cycle)
 */

let _editorType: 'figma' | 'dev' = 'figma'

/** Called once at plugin init with figma.editorType. */
export function setEditorType(t: 'figma' | 'dev'): void {
  _editorType = t
}

/** True when the plugin is running in Figma Dev Mode (read-only). */
export function isDevMode(): boolean {
  return _editorType === 'dev'
}
