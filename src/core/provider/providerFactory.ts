import type { LlmProviderId } from '../types'
import type { Provider } from './provider'
import type { Settings } from '../settings'
import { StubProvider } from './stubProvider'
import { ProxyProvider } from './proxyProvider'
import { InternalApiProvider } from './internalApiProvider'
import { ClaudeProvider } from './claudeProvider'
import { CopilotProvider } from './copilotProvider'
import { CONFIG } from '../config'
import { getEffectiveSettings } from '../settings'

/**
 * Active connection type for observability and UI only.
 * Uses the same precedence as createProvider: internal-api first, then proxy, else none.
 */
export type ActiveConnectionType = 'internal-api' | 'proxy' | 'none'

/**
 * Returns the active connection type from settings (same condition as createProvider).
 * Use for logging and UI only; do not use to decide which provider to create — that is createProvider's responsibility.
 */
export function getActiveConnectionType(settings: Settings): ActiveConnectionType {
  if (settings.connectionType === 'internal-api' && settings.internalApiUrl) {
    return 'internal-api'
  }
  if (settings.proxyBaseUrl || !settings.connectionType || settings.connectionType === 'proxy') {
    return 'proxy'
  }
  return 'none'
}

/**
 * Provider Factory — single source of truth for provider selection.
 *
 * HARD REQUIREMENT (routing precedence):
 * When Internal API is enabled (connectionType === 'internal-api' AND internalApiUrl is set),
 * ALL LLM/chat requests MUST use InternalApiProvider only. Proxy and providerId are ignored.
 * If proxy or other public settings exist at the same time, they are inactive for the session.
 *
 * Precedence:
 * 1. Internal API: connectionType === 'internal-api' && internalApiUrl → InternalApiProvider
 * 2. Proxy: proxyBaseUrl or connectionType proxy/undefined → ProxyProvider
 * 3. Else: providerId-based fallback (openai → ProxyProvider, claude/copilot/stub)
 */
export async function createProvider(providerId?: LlmProviderId): Promise<Provider> {
  const id = providerId || CONFIG.provider
  const settings = await getEffectiveSettings()

  // Internal API first: when enabled, all requests use InternalApiProvider; proxy/providerId ignored
  if (settings.connectionType === 'internal-api' && settings.internalApiUrl) {
    return new InternalApiProvider()
  }

  // Otherwise proxy (backward compatible)
  if (settings.proxyBaseUrl || !settings.connectionType || settings.connectionType === 'proxy') {
    return new ProxyProvider()
  }

  // Fallback by providerId when no connection configured
  switch (id) {
    case 'openai':
      return new ProxyProvider()
    case 'claude':
      return new ClaudeProvider()
    case 'copilot':
      return new CopilotProvider()
    default:
      return new StubProvider()
  }
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Provider[] {
  return [
    new ProxyProvider(),
    new ClaudeProvider(),
    new CopilotProvider()
  ]
}
