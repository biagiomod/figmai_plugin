/**
 * Analytics Module
 * 
 * Provides analytics service with no-op guard.
 * When analytics is disabled, returns a null analytics service that does nothing.
 */

import type { AnalyticsService, AnalyticsConfig, NullAnalytics } from './types'
import { AnalyticsServiceImpl } from './service'
import { getCustomConfig } from '../../custom/config'

/**
 * Null analytics service (no-op when disabled)
 */
class NullAnalyticsImpl implements NullAnalytics {
  readonly isNull = true as const

  track(): void {
    // No-op
  }

  async flush(): Promise<void> {
    // No-op
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

const nullAnalytics = new NullAnalyticsImpl()

let analyticsInstance: AnalyticsService | null = null

/**
 * Get analytics service instance
 * 
 * Returns either:
 * - Real service instance (if enabled and endpoint configured)
 * - Null analytics (no-op) if disabled or not configured
 * 
 * @returns Analytics service (never null, but may be no-op)
 */
export function getAnalytics(): AnalyticsService {
  if (analyticsInstance !== null) {
    return analyticsInstance
  }

  const config = getCustomConfig()
  const analyticsConfig = config?.analytics

  // Check if analytics is enabled and endpoint is configured
  if (!analyticsConfig?.enabled || !analyticsConfig?.endpointUrl) {
    analyticsInstance = nullAnalytics
    return analyticsInstance
  }

  // Build config with defaults
  const fullConfig: AnalyticsConfig = {
    enabled: true,
    endpointUrl: analyticsConfig.endpointUrl,
    flushIntervalMs: analyticsConfig.flushIntervalMs ?? 30000,
    maxBatchSize: analyticsConfig.maxBatchSize ?? 25,
    maxBuffer: analyticsConfig.maxBuffer ?? 100,
    retryMaxAttempts: analyticsConfig.retryMaxAttempts ?? 5,
    retryBaseDelayMs: analyticsConfig.retryBaseDelayMs ?? 1000,
    debug: analyticsConfig.debug ?? false
  }

  // Create real service instance
  analyticsInstance = new AnalyticsServiceImpl(fullConfig)
  return analyticsInstance
}

/**
 * Shutdown analytics (call on plugin close)
 */
export async function shutdownAnalytics(): Promise<void> {
  if (analyticsInstance && !('isNull' in analyticsInstance && analyticsInstance.isNull)) {
    await analyticsInstance.shutdown()
  }
  analyticsInstance = null
}
