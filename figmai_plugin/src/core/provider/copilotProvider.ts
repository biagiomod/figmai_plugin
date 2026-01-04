import type { Provider, ChatRequest, ProviderCapabilities } from './provider'
import { ProviderError, ProviderErrorType } from './provider'

/**
 * Copilot Provider - Coming soon
 * Example of a provider that may have different capabilities
 * (e.g., no images, requires strict schemas)
 */
export class CopilotProvider implements Provider {
  readonly id = 'copilot'
  readonly label = 'Copilot (Coming soon)'
  readonly isEnabled = false
  
  /**
   * Copilot provider capabilities
   * Example: May not support images or may require strict schemas
   * Update these when implementing
   */
  readonly capabilities: ProviderCapabilities = {
    supportsImages: false,
    supportsMarkdown: false,
    requiresStrictSchema: true
  }

  async sendChat(_request: ChatRequest): Promise<string> {
    throw new ProviderError(
      'Copilot provider is not yet implemented',
      ProviderErrorType.INVALID_REQUEST
    )
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Copilot provider is not yet implemented'
    }
  }
}

