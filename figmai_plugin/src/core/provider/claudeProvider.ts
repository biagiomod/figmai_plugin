import type { Provider, ChatRequest, ProviderCapabilities } from './provider'
import { ProviderError, ProviderErrorType } from './provider'

/**
 * Claude Provider - Coming soon
 * Example of a provider that supports images and markdown
 */
export class ClaudeProvider implements Provider {
  readonly id = 'claude'
  readonly label = 'Claude (Coming soon)'
  readonly isEnabled = false
  
  /**
   * Claude provider capabilities
   * Claude supports images and markdown
   */
  readonly capabilities: ProviderCapabilities = {
    supportsImages: true,
    supportsMarkdown: true,
    requiresStrictSchema: false
  }

  async sendChat(_request: ChatRequest): Promise<string> {
    throw new ProviderError(
      'Claude provider is not yet implemented',
      ProviderErrorType.INVALID_REQUEST
    )
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Claude provider is not yet implemented'
    }
  }
}

