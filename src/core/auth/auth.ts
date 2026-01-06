import type { ProxySettings } from './storage'

/**
 * Get authentication headers for proxy requests
 */
export function getProxyAuthHeaders(settings: ProxySettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (settings.proxyAuthMode === 'shared_token') {
    if (settings.proxySharedToken) {
      headers['X-FigmAI-Token'] = settings.proxySharedToken
    }
  } else if (settings.proxyAuthMode === 'session_token') {
    if (settings.proxySessionToken) {
      headers['Authorization'] = `Bearer ${settings.proxySessionToken}`
    }
  }
  
  return headers
}



