#!/usr/bin/env node
/**
 * Generate Nuxt DS demo allowlist module from custom/design-systems/nuxt-ui-v4/
 *
 * Reads nuxt-ui-v4.catalog.json and demo-allowlist.json, filters catalog to
 * allowlisted names (component_set preferred for demo), and emits
 * src/custom/generated/nuxtDsCatalog.generated.ts so the plugin can import
 * NUxtDemoAllowlist at build time. Unicode in catalog (variant axis names) is
 * preserved exactly via JSON.stringify.
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const DS_DIR = path.join(ROOT, 'custom', 'design-systems', 'nuxt-ui-v4')
const CATALOG_PATH = path.join(DS_DIR, 'nuxt-ui-v4.catalog.json')
const ALLOWLIST_PATH = path.join(DS_DIR, 'demo-allowlist.json')
const OUT_PATH = path.join(ROOT, 'src', 'custom', 'generated', 'nuxtDsCatalog.generated.ts')

interface CatalogComponent {
  kind: string
  name: string
  key: string
  variantAxes?: Record<string, string[]>
  defaultVariant?: Record<string, string>
}

interface Catalog {
  designSystemId?: string
  components: CatalogComponent[]
}

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.warn('[generate-nuxt-ds-catalog] Catalog not found:', CATALOG_PATH)
    // Emit empty allowlist so build does not fail
    const emptyContent = `/**
 * Nuxt DS demo allowlist – generated from custom/design-systems/nuxt-ui-v4/
 * Do not edit by hand. Run: npm run generate-nuxt-ds-catalog
 */

export interface NuxtDemoAllowlistEntry {
  kind: string
  name: string
  key: string
  variantAxes?: Record<string, string[]>
  defaultVariant?: Record<string, string>
}

export const NUxtDemoAllowlist: NuxtDemoAllowlistEntry[] = []
`
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, emptyContent, 'utf-8')
    console.log('[generate-nuxt-ds-catalog] Wrote empty allowlist to', OUT_PATH)
    return
  }

  const catalogRaw = fs.readFileSync(CATALOG_PATH, 'utf-8')
  const catalog: Catalog = JSON.parse(catalogRaw)
  const allowlistRaw = fs.existsSync(ALLOWLIST_PATH)
    ? fs.readFileSync(ALLOWLIST_PATH, 'utf-8')
    : '{"names":[]}'
  const allowlist: { names: string[] } = JSON.parse(allowlistRaw)
  const namesSet = new Set((allowlist.names || []).map((n: string) => n.trim()).filter(Boolean))

  const filtered: CatalogComponent[] = (catalog.components || []).filter(
    (c: CatalogComponent) => c.name && namesSet.has(c.name)
  )

  console.log(`[generate-nuxt-ds-catalog] Filtered ${filtered.length} entries from catalog (allowlist: ${namesSet.size} names)`)

  const content = `/**
 * Nuxt DS demo allowlist – generated from custom/design-systems/nuxt-ui-v4/
 * Do not edit by hand. Run: npm run generate-nuxt-ds-catalog
 */

export interface NuxtDemoAllowlistEntry {
  kind: string
  name: string
  key: string
  variantAxes?: Record<string, string[]>
  defaultVariant?: Record<string, string>
}

export const NUxtDemoAllowlist: NuxtDemoAllowlistEntry[] = ${JSON.stringify(filtered, null, 2)}
`

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, content, 'utf-8')
  console.log('[generate-nuxt-ds-catalog] Wrote', OUT_PATH)
}

main()
