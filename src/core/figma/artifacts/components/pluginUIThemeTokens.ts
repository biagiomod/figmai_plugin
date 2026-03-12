/**
 * Theme tokens for rendering the FigmAI plugin UI on the Figma stage.
 * Values are static RGB (0-1 range) derived from:
 *   - src/ui/styles/theme.css (light)
 *   - src/ui/styles/skins/dark.css (dark)
 */

export interface RGB { r: number; g: number; b: number }

export interface UIThemeTokens {
  bg: RGB
  bgSecondary: RGB
  bgElevated: RGB
  bgModal: RGB
  fg: RGB
  fgSecondary: RGB
  fgDisabled: RGB
  accent: RGB
  accentText: RGB
  border: RGB
  borderSubtle: RGB
  error: RGB
  success: RGB
  warning: RGB
}

function hex(r: number, g: number, b: number): RGB {
  return { r: r / 255, g: g / 255, b: b / 255 }
}

export const LIGHT_TOKENS: UIThemeTokens = {
  bg: hex(255, 255, 255),
  bgSecondary: hex(245, 245, 245),
  bgElevated: hex(255, 255, 255),
  bgModal: hex(255, 255, 255),
  fg: hex(0, 0, 0),
  fgSecondary: hex(102, 102, 102),
  fgDisabled: hex(153, 153, 153),
  accent: hex(0, 102, 255),
  accentText: hex(255, 255, 255),
  border: hex(224, 224, 224),
  borderSubtle: hex(224, 224, 224),
  error: hex(255, 51, 51),
  success: hex(0, 204, 102),
  warning: hex(255, 153, 0)
}

export const DARK_TOKENS: UIThemeTokens = {
  bg: hex(13, 13, 13),
  bgSecondary: hex(26, 26, 26),
  bgElevated: hex(38, 38, 38),
  bgModal: hex(31, 31, 31),
  fg: hex(255, 255, 255),
  fgSecondary: hex(179, 179, 179),
  fgDisabled: hex(102, 102, 102),
  accent: hex(77, 166, 255),
  accentText: hex(255, 255, 255),
  border: hex(64, 64, 64),
  borderSubtle: hex(80, 80, 80),
  error: hex(255, 107, 107),
  success: hex(81, 207, 102),
  warning: hex(255, 212, 59)
}

export const NEOWAVE_TOKENS: UIThemeTokens = {
  bg: hex(11, 14, 23),
  bgSecondary: hex(19, 24, 41),
  bgElevated: hex(26, 32, 53),
  bgModal: hex(21, 26, 46),
  fg: hex(228, 232, 247),
  fgSecondary: hex(139, 147, 176),
  fgDisabled: hex(77, 85, 115),
  accent: hex(0, 212, 255),
  accentText: hex(11, 14, 23),
  border: hex(42, 49, 80),
  borderSubtle: hex(51, 57, 92),
  error: hex(255, 94, 122),
  success: hex(0, 230, 138),
  warning: hex(255, 179, 71)
}

export function getTokensForTheme(theme: string): UIThemeTokens {
  switch (theme) {
    case 'dark': return DARK_TOKENS
    case 'neowave': return NEOWAVE_TOKENS
    default: return LIGHT_TOKENS
  }
}
