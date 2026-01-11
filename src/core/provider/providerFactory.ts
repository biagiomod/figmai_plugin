import type { LlmProviderId } from '../types'
import type { Provider } from './provider'
import { StubProvider } from './stubProvider'
import { ProxyProvider } from './proxyProvider'
import { InternalApiProvider } from './internalApiProvider'
import { ClaudeProvider } from './claudeProvider'
import { CopilotProvider } from './copilotProvider'
import { CONFIG } from '../config'
import { getSettings } from '../settings'

/**
 * Provider Factory
 * Creates provider instances based on configuration
 */
export async function createProvider(providerId?: LlmProviderId): Promise<Provider> {
  const id = providerId || CONFIG.provider
  const settings = await getSettings()
  
  // Check connection type first
  // If Internal API is configured, use InternalApiProvider
  if (settings.connectionType === 'internal-api' && settings.internalApiUrl) {
    return new InternalApiProvider()
  }
  
  // Otherwise, check if proxy is configured (backward compatible)
  // Default to proxy if connectionType is undefined
  if (settings.proxyBaseUrl || !settings.connectionType || settings.connectionType === 'proxy') {
    return new ProxyProvider()
  }
  
  // Fall back to stub provider if no connection configured
  switch (id) {
    case 'openai':
      return new ProxyProvider() // Will use proxy if configured, otherwise stub
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
