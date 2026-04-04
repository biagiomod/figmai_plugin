#!/usr/bin/env npx tsx
/**
 * ingest-brand-logos.ts
 *
 * One-time / on-demand ingestion script.
 * Downloads SVG logos from glincker/thesvg (MIT license) and generates
 * src/core/designWorkshop/brandLogos/index.ts — a static TypeScript artifact
 * with all logo SVG strings and data URIs embedded inline.
 *
 * Run: npm run ingest-brand-logos
 *
 * IMPORTANT — Trademark notice:
 * Brand logos are trademarks of their respective owners.
 * The vendored SVG code is MIT-licensed (glincker/thesvg).
 * This library is for development and prototype use only — not for production distribution.
 *
 * Variant selection strategy:
 * - 'light'  = logo paths designed for light/white backgrounds (dark or colored fills)
 * - 'color'  = multi-color version, works on white backgrounds
 * - 'default' = brand's primary color on transparent, works on white for most brands
 *
 * Exceptions: Tesla 'light' has white fills (invisible on white), so use 'default' first.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

// ─── Target brand list ───────────────────────────────────────────────────────
// slug → { name, ticker, category, variantPriority }
// variantPriority: first found variant wins.
// Standard priority: light > color > default (best for white backgrounds in Figma)
// Tesla exception: light variant has white fills → use default first

const BRANDS: Array<{
  slug: string
  name: string
  ticker: string
  category: 'tech' | 'finance' | 'consumer' | 'industrial' | 'media' | 'telecom'
  variants: string[]   // ordered priority: first available wins
}> = [
  // ─── Tech ────────────────────────────────────────────────────────────────
  { slug: 'apple',         name: 'Apple',           ticker: 'AAPL', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'microsoft',     name: 'Microsoft',       ticker: 'MSFT', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'google',        name: 'Alphabet',        ticker: 'GOOGL',category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'amazon',        name: 'Amazon',          ticker: 'AMZN', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'meta',          name: 'Meta',            ticker: 'META', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'nvidia',        name: 'NVIDIA',          ticker: 'NVDA', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'tesla',         name: 'Tesla',           ticker: 'TSLA', category: 'tech',       variants: ['default', 'color', 'mono'] },  // light is white-on-transparent
  { slug: 'broadcom',      name: 'Broadcom',        ticker: 'AVGO', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'adobe',         name: 'Adobe',           ticker: 'ADBE', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'salesforce',    name: 'Salesforce',      ticker: 'CRM',  category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'oracle',        name: 'Oracle',          ticker: 'ORCL', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'amd',           name: 'AMD',             ticker: 'AMD',  category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'intel',         name: 'Intel',           ticker: 'INTC', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'cisco',         name: 'Cisco',           ticker: 'CSCO', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'qualcomm',      name: 'Qualcomm',        ticker: 'QCOM', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'ibm',           name: 'IBM',             ticker: 'IBM',  category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'shopify',       name: 'Shopify',         ticker: 'SHOP', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'uber',          name: 'Uber',            ticker: 'UBER', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'airbnb',        name: 'Airbnb',          ticker: 'ABNB', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'netflix',       name: 'Netflix',         ticker: 'NFLX', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'paypal',        name: 'PayPal',          ticker: 'PYPL', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'spotify',       name: 'Spotify',         ticker: 'SPOT', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'snowflake',     name: 'Snowflake',       ticker: 'SNOW', category: 'tech',       variants: ['light', 'color', 'default'] },
  { slug: 'palantir',      name: 'Palantir',        ticker: 'PLTR', category: 'tech',       variants: ['light', 'color', 'default'] },
  // ─── Finance ─────────────────────────────────────────────────────────────
  { slug: 'visa',          name: 'Visa',            ticker: 'V',    category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'mastercard',    name: 'Mastercard',      ticker: 'MA',   category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'american-express', name: 'American Express', ticker: 'AXP', category: 'finance', variants: ['light', 'color', 'default'] },
  { slug: 'bank-of-america',  name: 'Bank of America',  ticker: 'BAC', category: 'finance', variants: ['light', 'color', 'default'] },
  { slug: 'wells-fargo',   name: 'Wells Fargo',     ticker: 'WFC',  category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'goldman-sachs', name: 'Goldman Sachs',   ticker: 'GS',   category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'morgan-stanley',name: 'Morgan Stanley',  ticker: 'MS',   category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'capital-one',   name: 'Capital One',     ticker: 'COF',  category: 'finance',    variants: ['light', 'color', 'default'] },
  { slug: 'charles-schwab',name: 'Charles Schwab',  ticker: 'SCHW', category: 'finance',    variants: ['light', 'color', 'default'] },
  // ─── Consumer ────────────────────────────────────────────────────────────
  { slug: 'walmart',       name: 'Walmart',         ticker: 'WMT',  category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'target',        name: 'Target',          ticker: 'TGT',  category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'costco',        name: 'Costco',          ticker: 'COST', category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'home-depot',    name: 'Home Depot',      ticker: 'HD',   category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'mcdonalds',     name: "McDonald's",      ticker: 'MCD',  category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'starbucks',     name: 'Starbucks',       ticker: 'SBUX', category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'nike',          name: 'Nike',            ticker: 'NKE',  category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'coca-cola',     name: 'Coca-Cola',       ticker: 'KO',   category: 'consumer',   variants: ['light', 'color', 'default'] },
  { slug: 'pepsico',       name: 'PepsiCo',         ticker: 'PEP',  category: 'consumer',   variants: ['light', 'color', 'default'] },
  // ─── Industrial ──────────────────────────────────────────────────────────
  { slug: 'boeing',        name: 'Boeing',          ticker: 'BA',   category: 'industrial', variants: ['light', 'color', 'default'] },
  { slug: 'caterpillar',   name: 'Caterpillar',     ticker: 'CAT',  category: 'industrial', variants: ['light', 'color', 'default'] },
  { slug: '3m',            name: '3M',              ticker: 'MMM',  category: 'industrial', variants: ['light', 'color', 'default'] },
  { slug: 'general-electric', name: 'GE Aerospace', ticker: 'GE',  category: 'industrial', variants: ['light', 'color', 'default'] },
  { slug: 'fedex',         name: 'FedEx',           ticker: 'FDX',  category: 'industrial', variants: ['light', 'color', 'default'] },
  { slug: 'ups',           name: 'UPS',             ticker: 'UPS',  category: 'industrial', variants: ['light', 'color', 'default'] },
  // ─── Media ───────────────────────────────────────────────────────────────
  { slug: 'disney',        name: 'Walt Disney',     ticker: 'DIS',  category: 'media',      variants: ['light', 'color', 'default'] },
  // ─── Telecom ─────────────────────────────────────────────────────────────
  { slug: 'verizon',       name: 'Verizon',         ticker: 'VZ',   category: 'telecom',    variants: ['light', 'color', 'default'] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_RAW = 'https://raw.githubusercontent.com/glincker/thesvg/main/public/icons'

function fetchText(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 404) { resolve(null); return }
      if (res.statusCode !== 200) { resolve(null); return }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(8000, () => { req.destroy(); resolve(null) })
  })
}

function toDataUri(svg: string): string {
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const OUT_DIR = path.join(__dirname, '../src/core/designWorkshop/brandLogos')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log(`Ingesting ${BRANDS.length} brand logos from thesvg...\n`)

  const entries: Array<{
    slug: string
    name: string
    ticker: string
    category: string
    svgString: string
    dataUri: string
    variant: string
  }> = []

  let fetched = 0
  let failed = 0

  for (const brand of BRANDS) {
    let svgString: string | null = null
    let usedVariant: string | null = null

    for (const variant of brand.variants) {
      const url = `${BASE_RAW}/${brand.slug}/${variant}.svg`
      const svg = await fetchText(url)
      if (svg) {
        svgString = svg
        usedVariant = variant
        break
      }
    }

    if (svgString && usedVariant) {
      entries.push({
        slug: brand.slug,
        name: brand.name,
        ticker: brand.ticker,
        category: brand.category,
        svgString,
        dataUri: toDataUri(svgString),
        variant: usedVariant,
      })
      console.log(`  ✓ ${brand.slug} (${usedVariant}) → ${brand.ticker}`)
      fetched++
    } else {
      console.warn(`  ✗ ${brand.slug} — all variants failed`)
      failed++
    }
  }

  console.log(`\nFetched: ${fetched}  Failed: ${failed}`)

  // ─── Generate index.ts ────────────────────────────────────────────────────
  const lines: string[] = [
    '/**',
    ' * Brand Logo Library — AUTO-GENERATED',
    ' * Do not edit manually. Run: npm run ingest-brand-logos',
    ' *',
    ' * Source: glincker/thesvg (MIT license)',
    ' * Brand logos are trademarks of their respective owners.',
    ' * For development and prototype use only.',
    ' *',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Brands: ${entries.length}`,
    ' */',
    '',
    "export type BrandCategory = 'tech' | 'finance' | 'consumer' | 'industrial' | 'media' | 'telecom'",
    '',
    'export interface BrandEntry {',
    '  slug: string',
    '  name: string',
    '  ticker: string',
    "  category: BrandCategory",
    '}',
    '',
    '/** Full manifest of vendored brand logos */',
    'export const BRAND_MANIFEST: BrandEntry[] = [',
    ...entries.map(e =>
      `  { slug: '${e.slug}', name: ${JSON.stringify(e.name)}, ticker: '${e.ticker}', category: '${e.category}' },`
    ),
    ']',
    '',
    '/** Ticker symbol → brand slug mapping */',
    'export const TICKER_TO_SLUG: Record<string, string> = {',
    ...entries.map(e => `  '${e.ticker}': '${e.slug}',`),
    '}',
    '',
    '/** Raw SVG strings — for use with figma.createNodeFromSvg() on the Figma canvas */',
    'const BRAND_LOGOS_SVG: Record<string, string> = {',
    ...entries.map(e => `  '${e.slug}': ${JSON.stringify(e.svgString)},`),
    '}',
    '',
    '/** Embedded brand logo data URIs (SVG base64) — for use in HTML/CSS img src */',
    'const BRAND_LOGOS: Record<string, string> = {',
    ...entries.map(e => `  '${e.slug}': '${e.dataUri}',`),
    '}',
    '',
    '/**',
    ' * Returns the raw SVG string for a given ticker or brand slug.',
    ' * For use with figma.createNodeFromSvg() in the Figma canvas renderer.',
    ' * Returns null if no logo is available.',
    ' */',
    'export function getBrandLogoSvg(tickerOrSlug: string): string | null {',
    '  const slug = TICKER_TO_SLUG[tickerOrSlug] ?? tickerOrSlug',
    '  return BRAND_LOGOS_SVG[slug] ?? null',
    '}',
    '',
    '/**',
    ' * Returns a brand logo data URI for a given ticker symbol or brand slug.',
    ' * For use in HTML/CSS <img src> or background-image.',
    ' * Returns null if no real logo is available — caller should fall back to letter-avatar.',
    ' */',
    'export function getBrandLogoDataUri(tickerOrSlug: string): string | null {',
    '  const slug = TICKER_TO_SLUG[tickerOrSlug] ?? tickerOrSlug',
    '  return BRAND_LOGOS[slug] ?? null',
    '}',
    '',
    '/**',
    ' * Returns true if a real brand logo is available for the given ticker or slug.',
    ' */',
    'export function hasBrandLogo(tickerOrSlug: string): boolean {',
    '  const slug = TICKER_TO_SLUG[tickerOrSlug] ?? tickerOrSlug',
    '  return slug in BRAND_LOGOS_SVG',
    '}',
    '',
  ]

  const outPath = path.join(OUT_DIR, 'index.ts')
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

  const kb = Math.round(Buffer.byteLength(lines.join('\n'), 'utf8') / 1024)
  console.log(`\nWrote ${outPath} (${kb} KB, ${entries.length} logos)`)
}

main().catch(err => { console.error(err); process.exit(1) })
