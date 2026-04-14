import { getBranding } from '../custom/config'

/**
 * Brand configuration - single source of truth
 * - codeName: Internal identifiers, package name, logging
 * - brandName: UI display name
 */
export const BRAND = {
  codeName: 'figmai_plugin',
  brandName: 'Design AI Toolkit'
} as const

export function getDisplayBrand(): {
  showLogo: boolean
  showAppName: boolean
  showLogline: boolean
  appName: string
  logline: string
  logoPath: string
  logoKey: 'default' | 'work' | 'none'
} {
  return getBranding()
}

