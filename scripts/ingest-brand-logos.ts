#!/usr/bin/env npx tsx
/**
 * ingest-brand-logos.ts
 *
 * One-time / on-demand ingestion script.
 * Downloads SVG logos from glincker/thesvg (MIT license) and generates
 * src/core/designWorkshop/brandLogos/index.ts — a static TypeScript artifact
 * with all logo data URIs embedded inline.
 *
 * Run: npm run ingest-brand-logos
 *
 * IMPORTANT — Trademark notice:
 * Brand logos are trademarks of their respective owners.
 * The vendored SVG code is MIT-licensed (glincker/thesvg).
 * This library is for development and prototype use only — not for production distribution.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

// ─── Target brand list ───────────────────────────────────────────────────────
// slug → { name, ticker, category, variantPriority }
// variantPriority: first found variant wins.

const BRANDS: Array<{
  slug: string
  name: string
  ticker: string
  category: 'tech' | 'finance' | 'consumer' | 'industrial' | 'media' | 'telecom'
  variants: string[]   // ordered priority: first available wins
}> = [
  // ─── Tech ────────────────────────────────────────────────────────────────
  { slug: 'apple',         name: 'Apple',           ticker: 'AAPL', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'microsoft',     name: 'Microsoft',       ticker: 'MSFT', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'google',        name: 'Alphabet',        ticker: 'GOOGL',category: 'tech',       variants: ['color', 'default'] },
  { slug: 'amazon',        name: 'Amazon',          ticker: 'AMZN', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'meta',          name: 'Meta',            ticker: 'META', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'nvidia',        name: 'NVIDIA',          ticker: 'NVDA', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'tesla',         name: 'Tesla',           ticker: 'TSLA', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'broadcom',      name: 'Broadcom',        ticker: 'AVGO', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'adobe',         name: 'Adobe',           ticker: 'ADBE', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'salesforce',    name: 'Salesforce',      ticker: 'CRM',  category: 'tech',       variants: ['color', 'default'] },
  { slug: 'oracle',        name: 'Oracle',          ticker: 'ORCL', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'amd',           name: 'AMD',             ticker: 'AMD',  category: 'tech',       variants: ['color', 'default'] },
  { slug: 'intel',         name: 'Intel',           ticker: 'INTC', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'cisco',         name: 'Cisco',           ticker: 'CSCO', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'qualcomm',      name: 'Qualcomm',        ticker: 'QCOM', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'ibm',           name: 'IBM',             ticker: 'IBM',  category: 'tech',       variants: ['color', 'default'] },
  { slug: 'shopify',       name: 'Shopify',         ticker: 'SHOP', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'uber',          name: 'Uber',            ticker: 'UBER', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'airbnb',        name: 'Airbnb',          ticker: 'ABNB', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'netflix',       name: 'Netflix',         ticker: 'NFLX', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'paypal',        name: 'PayPal',          ticker: 'PYPL', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'spotify',       name: 'Spotify',         ticker: 'SPOT', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'snowflake',     name: 'Snowflake',       ticker: 'SNOW', category: 'tech',       variants: ['color', 'default'] },
  { slug: 'palantir',      name: 'Palantir',        ticker: 'PLTR', category: 'tech',       variants: ['color', 'default'] },
  // ─── Finance ─────────────────────────────────────────────────────────────
  { slug: 'visa',          name: 'Visa',            ticker: 'V',    category: 'finance',    variants: ['color', 'default'] },
  { slug: 'mastercard',    name: 'Mastercard',      ticker: 'MA',   category: 'finance',    variants: ['color', 'default'] },
  { slug: 'american-express', name: 'American Express', ticker: 'AXP', category: 'finance', variants: ['color', 'default'] },
  { slug: 'bank-of-america',  name: 'Bank of America',  ticker: 'BAC', category: 'finance', variants: ['color', 'default'] },
  { slug: 'wells-fargo',   name: 'Wells Fargo',     ticker: 'WFC',  category: 'finance',    variants: ['color', 'default'] },
  { slug: 'goldman-sachs', name: 'Goldman Sachs',   ticker: 'GS',   category: 'finance',    variants: ['color', 'default'] },
  { slug: 'morgan-stanley',name: 'Morgan Stanley',  ticker: 'MS',   category: 'finance',    variants: ['color', 'default'] },
  { slug: 'capital-one',   name: 'Capital One',     ticker: 'COF',  category: 'finance',    variants: ['color', 'default'] },
  { slug: 'charles-schwab',name: 'Charles Schwab',  ticker: 'SCHW', category: 'finance',    variants: ['color', 'default'] },
  // ─── Consumer ────────────────────────────────────────────────────────────
  { slug: 'walmart',       name: 'Walmart',         ticker: 'WMT',  category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'target',        name: 'Target',          ticker: 'TGT',  category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'costco',        name: 'Costco',          ticker: 'COST', category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'home-depot',    name: 'Home Depot',      ticker: 'HD',   category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'mcdonalds',     name: "McDonald's",      ticker: 'MCD',  category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'starbucks',     name: 'Starbucks',       ticker: 'SBUX', category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'nike',          name: 'Nike',            ticker: 'NKE',  category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'coca-cola',     name: 'Coca-Cola',       ticker: 'KO',   category: 'consumer',   variants: ['color', 'default'] },
  { slug: 'pepsico',       name: 'PepsiCo',         ticker: 'PEP',  category: 'consumer',   variants: ['color', 'default'] },
  // ─── Industrial ──────────────────────────────────────────────────────────
  { slug: 'boeing',        name: 'Boeing',          ticker: 'BA',   category: 'industrial', variants: ['color', 'default'] },
  { slug: 'caterpillar',   name: 'Caterpillar',     ticker: 'CAT',  category: 'industrial', variants: ['color', 'default'] },
  { slug: '3m',            name: '3M',              ticker: 'MMM',  category: 'industrial', variants: ['color', 'default'] },
  { slug: 'general-electric', name: 'GE Aerospace', ticker: 'GE',  category: 'industrial', variants: ['color', 'default'] },
  { slug: 'fedex',         name: 'FedEx',           ticker: 'FDX',  category: 'industrial', variants: ['color', 'default'] },
  { slug: 'ups',           name: 'UPS',             ticker: 'UPS',  category: 'industrial', variants: ['color', 'default'] },
  // ─── Media ───────────────────────────────────────────────────────────────
  { slug: 'disney',        name: 'Walt Disney',     ticker: 'DIS',  category: 'media',      variants: ['color', 'default'] },
  // ─── Telecom ─────────────────────────────────────────────────────────────
  { slug: 'verizon',       name: 'Verizon',         ticker: 'VZ',   category: 'telecom',    variants: ['color', 'default'] },
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
    dataUri: string
    variant: string
  }> = []

  let fetched = 0
  let failed = 0

  for (const brand of BRANDS) {
    let dataUri: string | null = null
    let usedVariant: string | null = null

    for (const variant of brand.variants) {
      const url = `${BASE_RAW}/${brand.slug}/${variant}.svg`
      const svg = await fetchText(url)
      if (svg) {
        dataUri = toDataUri(svg)
        usedVariant = variant
        break
      }
    }

    if (dataUri && usedVariant) {
      entries.push({
        slug: brand.slug,
        name: brand.name,
        ticker: brand.ticker,
        category: brand.category,
        dataUri,
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
    '/** Embedded brand logo data URIs (SVG, base64) */',
    'const BRAND_LOGOS: Record<string, string> = {',
    ...entries.map(e => `  '${e.slug}': '${e.dataUri}',`),
    '}',
    '',
    '/**',
    ' * Returns a brand logo data URI for a given ticker symbol or brand slug.',
    ' * Returns null if no real logo is available — caller should fall back to letter-avatar.',
    ' *',
    ' * @example',
    " * const uri = getBrandLogoDataUri('AAPL') // real Apple logo",
    " * const uri = getBrandLogoDataUri('VTIP') // null → use letter-avatar fallback",
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
    '  return slug in BRAND_LOGOS',
    '}',
    '',
  ]

  const outPath = path.join(OUT_DIR, 'index.ts')
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

  const kb = Math.round(Buffer.byteLength(lines.join('\n'), 'utf8') / 1024)
  console.log(`\nWrote ${outPath} (${kb} KB, ${entries.length} logos)`)
}

main().catch(err => { console.error(err); process.exit(1) })
