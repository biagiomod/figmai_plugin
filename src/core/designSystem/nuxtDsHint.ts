/**
 * One-time user hint when Nuxt DS import fails and Design Workshop falls back to primitives.
 * Uses figma.clientStorage so the hint is shown at most once across sessions.
 */

const STORAGE_KEY = 'figmai_nuxt_ds_hint_shown'
const MESSAGE = 'Nuxt UI components couldn\'t be loaded; using built-in shapes. To use Nuxt UI, ensure the Nuxt UI Figma library is available to your team.'

/**
 * If fallback occurred and the hint has not been shown yet, show it and set the flag.
 * Call after a Design Workshop render when usedDsFallback is true.
 */
export async function showNuxtDsFallbackHintIfNeeded(): Promise<void> {
  try {
    const alreadyShown = await figma.clientStorage.getAsync(STORAGE_KEY)
    if (alreadyShown === true) return
    figma.notify(MESSAGE)
    await figma.clientStorage.setAsync(STORAGE_KEY, true)
  } catch (e) {
    console.warn('[Nuxt DS Hint] Could not show or persist hint:', e)
  }
}
