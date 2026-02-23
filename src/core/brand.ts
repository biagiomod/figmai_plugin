import { getBranding } from '../custom/config'

/**
 * Brand configuration - single source of truth
 * - codeName: Internal identifiers, package name, logging
 * - brandName: UI display name
 */
export const BRAND = {
  codeName: 'figmai_plugin',
  brandName: 'FigmAI'
} as const

export function getDisplayBrand(): {
  appName: string
  appTagline: string
  logoKey: 'default' | 'work' | 'none'
} {
  return getBranding()
}

