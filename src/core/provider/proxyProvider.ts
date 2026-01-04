import type { Provider, ChatRequest, ProviderCapabilities } from './provider'
import { proxyClient } from '../proxy/client'
import { getSettings } from '../settings'
import { prepareRequest } from './normalize'

/**
 * Proxy Provider
 * Implements LLM access via proxy server
 * Supports external LLMs (OpenAI) and enterprise/internal LLMs
 */
export class ProxyProvider implements Provider {
  readonly id = 'openai'
  readonly label = 'OpenAI'
  readonly isEnabled = true
  
  /**
   * Proxy provider capabilities
   * Supports images and markdown (capabilities determined by backend)
   * For strict schemas, the proxy server should handle validation
   */
  readonly capabilities: ProviderCapabilities = {
    supportsImages: true,
    supportsMarkdown: true,
    requiresStrictSchema: false,
    maxImages: undefined // No limit (proxy server should enforce)
  }

  async sendChat(request: ChatRequest): Promise<string> {
    const settings = await getSettings()
    
    // Normalize request based on capabilities
    const normalizedRequest = prepareRequest(request, this.capabilities)
    
    // Build messages array (role/content only, no system messages here)
    const messages = normalizedRequest.messages.map(m => ({
      role: m.role,
      content: m.content
    }))
    
    // Call proxy client with assistant context
    return await proxyClient.chat(messages, {
      model: settings.defaultModel,
      assistantId: normalizedRequest.assistantId,
      quickActionId: normalizedRequest.quickActionId,
      selectionSummary: normalizedRequest.selectionSummary,
      images: normalizedRequest.images
    })
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return await proxyClient.healthCheck()
  }
  
  async *sendChatStream(request: ChatRequest): AsyncIterable<string> {
    // Streaming not implemented yet
    const response = await this.sendChat(request)
    yield response
  }
}
