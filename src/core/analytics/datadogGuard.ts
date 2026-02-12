/**
 * Datadog RUM guard: never initialize in Figma plugin sandbox or in dev unless explicitly enabled.
 *
 * The plugin UI runs in a Figma iframe where DNS/external egress often fails
 * (e.g. POST https://browser-intake-datadoghq.com/api/v2/rum → net::ERR_NAME_NOT_RESOLVED).
 * We do not ship @datadog/browser-rum; this guard exists so that if it is added later,
 * it is only initialized when ENABLE_DD_RUM (build-time), config.analytics.datadog.enabled,
 * and not in Figma plugin sandbox.
 *
 * Usage when/if adding Datadog:
 *   if (shouldInitDatadogRum()) {
 *     const { datadogRum } = await import('@datadog/browser-rum')
 *     datadogRum.init({ ... })
 *   }
 */

import { ENABLE_DD_RUM } from '../../generated/buildInfo'
import { getDatadogRumEnabled } from '../../custom/config'

/**
 * True when running inside the Figma plugin UI iframe (or main thread).
 * Plugin UI: typically in an iframe (self !== top) or document.referrer points at Figma.
 * Main thread: no window or different context; treat as sandbox.
 */
export function isFigmaPluginSandbox(): boolean {
  if (typeof window === 'undefined') return true
  if (window.self !== window.top) return true
  const ref = typeof document !== 'undefined' ? document.referrer || '' : ''
  if (/figma\.com|figma\.io/i.test(ref)) return true
  return false
}

/**
 * True only when Datadog RUM should be initialized: build-time enable, config explicitly enabled, and not in Figma plugin sandbox.
 * ENABLE_DD_RUM is false at build time for the plugin, so this always returns false in shipped builds.
 */
export function shouldInitDatadogRum(): boolean {
  if (!ENABLE_DD_RUM) return false
  if (!getDatadogRumEnabled()) return false
  if (isFigmaPluginSandbox()) return false
  return true
}
