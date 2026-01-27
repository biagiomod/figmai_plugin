/**
 * Generate dark demo cards module from refs_for_cursor/dark_demo_cards.json
 *
 * The JSON file contains line comments (// ### Card N Name ###) and 10 separate
 * JSON objects. This script strips comment lines, splits and parses each object,
 * and writes src/core/figma/artifacts/components/darkDemoCards.generated.ts
 * so the plugin can import DARK_DEMO_CARDS at build time.
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const INPUT = path.join(ROOT, 'refs_for_cursor', 'dark_demo_cards.json')
const OUTPUT = path.join(ROOT, 'src', 'core', 'figma', 'artifacts', 'components', 'darkDemoCards.generated.ts')

function loadAndParseCards(): unknown[] {
  const raw = fs.readFileSync(INPUT, 'utf-8')
  // Split by newline followed by "// ### Card" so we get 10 segments (first segment may start with // ### Card 1)
  const segments = raw.split(/\n(?=\/\/ ### Card \d+)/)
  const cards: unknown[] = []
  for (const segment of segments) {
    const firstNewline = segment.indexOf('\n')
    const jsonPart = firstNewline >= 0 ? segment.slice(firstNewline + 1) : segment
    const trimmed = jsonPart.trim()
    if (!trimmed) continue
    try {
      cards.push(JSON.parse(trimmed))
    } catch (e) {
      console.error('Failed to parse card JSON:', e)
      throw e
    }
  }
  return cards
}

function main() {
  const cards = loadAndParseCards()
  console.log(`[generate-dark-demo-cards] Parsed ${cards.length} cards from ${INPUT}`)

  const content = `/**
 * Dark Demo Cards – generated from refs_for_cursor/dark_demo_cards.json
 * Do not edit by hand. Run: npm run generate-dark-demo-cards
 */

export const DARK_DEMO_CARDS = ${JSON.stringify(cards, null, 2)} as const
`

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, content, 'utf-8')
  console.log(`[generate-dark-demo-cards] Wrote ${OUTPUT}`)
}

main()
