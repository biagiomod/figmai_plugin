#!/usr/bin/env node
/**
 * Prebuild step: reads Open Sans font files from src/assets/fonts/ and generates
 * src/generated/fontFaceCSS.ts with base64-embedded @font-face declarations.
 *
 * Supported formats (in preference order — first found wins per weight):
 *   .woff2  → smallest base64 payload, preferred
 *   .ttf    → larger but works in all modern browsers, accepted as fallback
 *
 * Variable font support:
 *   If a variable font file is found it is used as a single @font-face covering all
 *   weights (300–800), replacing any per-weight static files.
 *   Checked filenames (woff2 preferred over ttf):
 *     OpenSans-VariableFont.woff2 / OpenSans-VariableFont.ttf
 *     OpenSans[wdth,wght].woff2  / OpenSans[wdth,wght].ttf
 *     OpenSans[wght].woff2       / OpenSans[wght].ttf
 *
 * If no font files are present the output constant is an empty string and the
 * exported HTML prototype falls back to the system font stack — no external calls.
 *
 * Run automatically via: npm run build  (included in prebuild)
 * Run manually via:       npm run generate-font-face-css
 */

import * as fs from 'fs'
import * as path from 'path'

const rootDir = path.resolve(__dirname, '..')
const fontsDir = path.join(rootDir, 'src', 'assets', 'fonts')
const outputFile = path.join(rootDir, 'src', 'generated', 'fontFaceCSS.ts')

// ─── helpers ────────────────────────────────────────────────────────────────

function mimeType(ext: string): string {
  return ext === '.woff2' ? 'font/woff2' : 'font/ttf'
}

function formatHint(ext: string): string {
  return ext === '.woff2' ? 'woff2' : 'truetype'
}

function readAsBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64')
}

/** Return the first existing file from the candidates list, or null. */
function firstExisting(candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function fontFaceBlock(
  weight: string,
  filePath: string,
  ext: string
): string {
  const base64 = readAsBase64(filePath)
  const mime = mimeType(ext)
  const fmt = formatHint(ext)
  return (
    `@font-face {\n` +
    `  font-family: 'Open Sans';\n` +
    `  font-weight: ${weight};\n` +
    `  font-style: normal;\n` +
    `  font-display: swap;\n` +
    `  src: url('data:${mime};base64,${base64}') format('${fmt}');\n` +
    `}`
  )
}

// ─── variable font check ─────────────────────────────────────────────────────

const VARIABLE_CANDIDATES = [
  // woff2 first (smaller)
  'OpenSans-VariableFont.woff2',
  'OpenSans[wdth,wght].woff2',
  'OpenSans[wght].woff2',
  // ttf fallback
  'OpenSans-VariableFont.ttf',
  'OpenSans[wdth,wght].ttf',
  'OpenSans[wght].ttf',
  // Google Fonts zip variant name
  'OpenSans-VariableFont_wdth,wght.woff2',
  'OpenSans-VariableFont_wdth,wght.ttf',
  'OpenSans-VariableFont_wght.woff2',
  'OpenSans-VariableFont_wght.ttf',
].map(f => path.join(fontsDir, f))

// ─── static font entries ─────────────────────────────────────────────────────

interface StaticEntry {
  weight: number
  basenames: string[] // tried in order; first found is used
}

const STATIC_ENTRIES: StaticEntry[] = [
  { weight: 300, basenames: ['OpenSans-Light.woff2',     'OpenSans-Light.ttf']     },
  { weight: 400, basenames: ['OpenSans-Regular.woff2',   'OpenSans-Regular.ttf']   },
  { weight: 600, basenames: ['OpenSans-SemiBold.woff2',  'OpenSans-SemiBold.ttf']  },
  { weight: 700, basenames: ['OpenSans-Bold.woff2',      'OpenSans-Bold.ttf']      },
  { weight: 800, basenames: ['OpenSans-ExtraBold.woff2', 'OpenSans-ExtraBold.ttf'] },
]

// ─── main ────────────────────────────────────────────────────────────────────

function generate(): { css: string; summary: string } {
  if (!fs.existsSync(fontsDir)) {
    return { css: '', summary: 'fonts directory not found' }
  }

  // 1. Try variable font first
  const variablePath = firstExisting(VARIABLE_CANDIDATES)
  if (variablePath) {
    const ext = path.extname(variablePath)
    const css = fontFaceBlock('300 800', variablePath, ext)
    return {
      css,
      summary: `variable font (${path.basename(variablePath)}, ${ext.slice(1).toUpperCase()}, weight range 300–800)`
    }
  }

  // 2. Fall back to per-weight static files
  const rules: string[] = []
  let found = 0

  for (const entry of STATIC_ENTRIES) {
    const candidates = entry.basenames.map(b => path.join(fontsDir, b))
    const filePath = firstExisting(candidates)
    if (!filePath) {
      console.warn(`[generate-font-face-css] Missing weight ${entry.weight} — tried: ${entry.basenames.join(', ')}`)
      continue
    }
    const ext = path.extname(filePath)
    rules.push(fontFaceBlock(String(entry.weight), filePath, ext))
    found++
  }

  return {
    css: rules.join('\n'),
    summary: found > 0
      ? `${found}/${STATIC_ENTRIES.length} static weights`
      : 'no font files found'
  }
}

const { css, summary } = generate()

const output =
  `// AUTO-GENERATED by scripts/generate-font-face-css.ts — do not edit manually.\n` +
  `// Source: src/assets/fonts/\n` +
  `// Regenerated by: npm run build  (or npm run generate-font-face-css)\n` +
  `\n` +
  `/**\n` +
  ` * Embedded @font-face CSS for Open Sans (base64 woff2/ttf).\n` +
  ` * Empty string when no font files are present — HTML export uses system fonts.\n` +
  ` */\n` +
  `export const FONT_FACE_CSS = ${JSON.stringify(css)};\n`

fs.writeFileSync(outputFile, output, 'utf-8')

if (css.length > 0) {
  const kb = Math.round(css.length / 1024)
  console.log(`[generate-font-face-css] ✓ Embedded Open Sans — ${summary} (~${kb} KB of CSS)`)
} else {
  console.log(`[generate-font-face-css] ⚠ ${summary} — HTML export will use system fonts`)
}
