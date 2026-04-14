/**
 * viewportManager.ts — Shared viewport scrolling operations for the plugin UI.
 */

export interface ViewportManager {
  scrollToTop(): void
  scrollToBottom(): void
  scrollIntoView(element: HTMLElement | null): void
}

export function createViewportManager(): ViewportManager {
  return {
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    scrollToBottom() {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    },
    scrollIntoView(element: HTMLElement | null) {
      element?.scrollIntoView({ behavior: 'smooth' })
    }
  }
}
