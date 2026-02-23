#!/usr/bin/env node
/**
 * Custom Overlay Generator
 * 
 * Reads /custom/config.json and /custom/knowledge/*.md files and generates
 * TypeScript modules that embed the custom configuration and knowledge bases.
 * 
 * Run as: npm run generate-custom-overlay or as part of build process
 */

import * as fs from 'fs'
import * as path from 'path'

interface CustomConfig {
  branding?: {
    appName?: string
    appTagline?: string
    logoKey?: 'default' | 'work' | 'none'
  }
  contentTable?: {
    exclusionRules?: {
      enabled?: boolean
      rules?: Array<{
        // New ACE ignore-list rule shape
        name?: string
        enabled?: boolean
        note?: string
        matchTarget?: 'content' | 'layerName' | 'both'
        matchType?: 'exact' | 'contains' | 'regex'
        pattern?: string
        action?: 'exclude' | 'flag'
        confidence?: 'high' | 'med' | 'low'
        // Legacy backward-compatible shape
        label?: string
        field?: 'component.name' | 'component.kind' | 'field.label' | 'field.role' | 'content.value' | 'textLayerName'
        match?: 'equals' | 'contains' | 'startsWith' | 'regex'
      }>
    }
    // Dev-only runtime diagnostics switch (off by default)
    exclusionRulesDebug?: boolean
  }
  ui?: {
    defaultMode?: 'content-mvp' | 'simple' | 'advanced'
    hideContentMvpMode?: boolean
    simpleModeIds?: string[]
    advancedModeIds?: string[]
    contentMvpAssistantId?: string
    branding?: {
      showLogo?: boolean
      showName?: boolean // legacy
      showAppName?: boolean
      showLogline?: boolean
      appName?: string
      logline?: string
      logoPath?: string
    }
  }
  llm?: {
    endpoint?: string
    hideModelSettings?: boolean
    uiMode?: 'full' | 'connection-only'
    provider?: 'internal-api' | 'proxy'
    showTestConnection?: boolean
    hideInternalApiSettings?: boolean
    hideProxySettings?: boolean
    hideTestConnectionButton?: boolean
    proxy?: {
      baseUrl?: string
      defaultModel?: string
      authMode?: 'shared_token' | 'session_token'
      sharedToken?: string
    }
    promptDiagnostics?: {
      enabled?: boolean
      level?: 'off' | 'compact' | 'details'
    }
    safety?: {
      forceNoKbName?: boolean
      forceNoSelectionSummary?: boolean
      forceNoImages?: boolean
    }
  }
  knowledgeBases?: Record<string, {
    policy: 'append' | 'override'
    file: string
  }>
  networkAccess?: {
    baseAllowedDomains?: string[]
    extraAllowedDomains?: string[]
  }
  designSystems?: {
    enabled?: boolean
    activeRegistries?: string[]
    allowlist?: string[]
    denylist?: string[]
    strictMode?: boolean
  }
  /** Component/instance names that should always be treated as requiring HAT (accessible label). Used by Content Review Assistant "Add HAT" action. */
  accessibility?: {
    hatRequiredComponents?: string[]
  }
  analytics?: {
    enabled?: boolean
    endpointUrl?: string
    flushIntervalMs?: number
    maxBatchSize?: number
    maxBuffer?: number
    retryMaxAttempts?: number
    retryBaseDelayMs?: number
    debug?: boolean
    /** Datadog RUM: default false. Do not enable in Figma plugin sandbox (DNS/egress can fail). */
    datadog?: { enabled?: boolean }
  }
  /** Smart Detector: element and content classifier config (build-time only). */
  detectors?: {
    elementClassifier?: {
      componentKindMap?: Record<string, string>
      nameKindRules?: Array<{ contains: string[]; kind: string }>
      maxNodes?: number
    }
    contentClassifier?: {
      keywordLists?: { legal?: string[]; terms?: string[]; privacy?: string[]; consent?: string[] }
      placeholderPatterns?: string[]
      ctaVerbs?: string[]
    }
  }
}

interface BrandingLocalConfig {
  appName?: string
  logline?: string
  showLogo?: boolean
  showName?: boolean // legacy
  showAppName?: boolean
  showLogline?: boolean
  logoPath?: string
  logoKey?: 'default' | 'work' | 'none'
}

type EffectiveBranding = {
  appName: string
  logline: string
  showLogo: boolean
  showAppName: boolean
  showLogline: boolean
  logoPath: string
  logoKey: 'default' | 'work' | 'none'
}

const DEFAULT_BRANDING: EffectiveBranding = {
  appName: 'FigmAI',
  logline: 'AI Powered',
  showLogo: true,
  showAppName: true,
  showLogline: true,
  logoPath: '',
  logoKey: 'default'
}

/**
 * Load custom config from /custom/config.json
 */
function loadCustomConfig(rootDir: string): CustomConfig | null {
  const configPath = path.join(rootDir, 'custom', 'config.json')
  try {
    if (!fs.existsSync(configPath)) {
      return null
    }
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content) as CustomConfig
  } catch (error) {
    console.warn('[Custom Overlay] Error loading custom/config.json:', error)
    return null
  }
}

/**
 * Load local branding override from /custom/branding.local.json
 * This file is optional and gitignored.
 */
function loadBrandingLocal(rootDir: string): BrandingLocalConfig | null {
  const brandingLocalPath = path.join(rootDir, 'custom', 'branding.local.json')
  try {
    if (!fs.existsSync(brandingLocalPath)) {
      return null
    }
    const content = fs.readFileSync(brandingLocalPath, 'utf-8')
    return JSON.parse(content) as BrandingLocalConfig
  } catch (error) {
    console.warn('[Custom Overlay] Error loading custom/branding.local.json:', error)
    return null
  }
}

function normalizeBranding(branding?: {
  appName?: string
  logline?: string
  showLogo?: boolean
  showName?: boolean // legacy
  showAppName?: boolean
  showLogline?: boolean
  logoPath?: string
  logoKey?: 'default' | 'work' | 'none'
} | BrandingLocalConfig | null): EffectiveBranding {
  const b = branding || {}
  const logoKey = b.logoKey === 'work' || b.logoKey === 'none' || b.logoKey === 'default' ? b.logoKey : DEFAULT_BRANDING.logoKey
  const showLogo = typeof b.showLogo === 'boolean' ? b.showLogo : logoKey !== 'none'
  const showAppName = typeof b.showAppName === 'boolean'
    ? b.showAppName
    : (typeof b.showName === 'boolean' ? b.showName : DEFAULT_BRANDING.showAppName)
  const logline = typeof b.logline === 'string' ? b.logline : DEFAULT_BRANDING.logline
  const showLogline = typeof b.showLogline === 'boolean' ? b.showLogline : !!logline.trim()
  return {
    appName: typeof b.appName === 'string' && b.appName.trim() ? b.appName : DEFAULT_BRANDING.appName,
    logline,
    showLogo,
    showAppName,
    showLogline,
    logoPath: typeof b.logoPath === 'string' ? b.logoPath : DEFAULT_BRANDING.logoPath,
    logoKey: showLogo ? (logoKey === 'none' ? 'default' : logoKey) : 'none'
  }
}

/**
 * Branding precedence:
 * defaults < ACE config (custom/config.json) < branding.local.json
 */
function mergeBrandingConfig(config: CustomConfig | null, brandingLocal: BrandingLocalConfig | null): CustomConfig | null {
  if (!config && !brandingLocal) return null
  const merged: CustomConfig = config ? { ...config } : {}
  const effectiveBranding = normalizeBranding({
    ...(config?.branding || {}),
    ...(config?.ui?.branding || {}),
    ...(brandingLocal || {})
  })
  merged.branding = {
    appName: effectiveBranding.appName,
    appTagline: effectiveBranding.logline,
    logoKey: effectiveBranding.logoKey
  }
  merged.ui = {
    ...(merged.ui || {}),
    branding: {
      showLogo: effectiveBranding.showLogo,
      showName: effectiveBranding.showAppName,
      showAppName: effectiveBranding.showAppName,
      showLogline: effectiveBranding.showLogline,
      appName: effectiveBranding.appName,
      logline: effectiveBranding.logline,
      logoPath: effectiveBranding.logoPath
    }
  }
  return merged
}

/**
 * Load custom knowledge bases from /custom/knowledge/*.md
 * Returns a record keyed by assistant ID (filename without .md extension)
 */
function loadCustomKnowledgeBases(rootDir: string): Record<string, string> {
  const knowledgeDir = path.join(rootDir, 'custom', 'knowledge')
  const knowledgeBases: Record<string, string> = {}
  
  if (!fs.existsSync(knowledgeDir)) {
    return {}
  }
  
  try {
    const files = fs.readdirSync(knowledgeDir)
    for (const file of files) {
      // Skip example files and README
      if (file.endsWith('.example.md') || file === 'README.md') {
        continue
      }
      if (file.endsWith('.md')) {
        const assistantId = file.replace('.md', '')
        const filePath = path.join(knowledgeDir, file)
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          knowledgeBases[assistantId] = content
        } catch (error) {
          console.warn(`[Custom Overlay] Failed to read ${filePath}:`, error)
        }
      }
    }
  } catch (error) {
    console.warn('[Custom Overlay] Error reading custom/knowledge directory:', error)
  }
  
  return knowledgeBases
}

/**
 * Load design system registries from /custom/design-systems/<id>/registry.json
 * Returns a record keyed by registry ID
 */
function loadDesignSystemRegistries(rootDir: string): Record<string, any> {
  const designSystemsDir = path.join(rootDir, 'custom', 'design-systems')
  const registries: Record<string, any> = {}
  
  if (!fs.existsSync(designSystemsDir)) {
    return {}
  }
  
  try {
    const entries = fs.readdirSync(designSystemsDir, { withFileTypes: true })
    for (const entry of entries) {
      // Only process directories (skip files like README.md)
      if (!entry.isDirectory()) {
        continue
      }
      
      const registryId = entry.name
      const registryJsonPath = path.join(designSystemsDir, registryId, 'registry.json')
      
      if (fs.existsSync(registryJsonPath)) {
        try {
          const content = fs.readFileSync(registryJsonPath, 'utf-8')
          const registry = JSON.parse(content)
          // Validate that it has required fields
          if (registry.id && registry.name && Array.isArray(registry.components)) {
            registries[registryId] = registry
          } else {
            console.warn(`[Custom Overlay] Invalid registry.json in ${registryId}: missing required fields`)
          }
        } catch (error) {
          console.warn(`[Custom Overlay] Failed to read/parse ${registryJsonPath}:`, error)
        }
      }
    }
  } catch (error) {
    console.warn('[Custom Overlay] Error reading custom/design-systems directory:', error)
  }
  
  return registries
}

const DEFAULT_SIMPLE_MODE_IDS = ['general', 'content_table', 'design_critique', 'design_workshop']
const DEFAULT_CONTENT_MVP_ASSISTANT_ID = 'content_table'

/**
 * Normalize config so emitted TS has defaults for modal visibility (simpleModeIds, contentMvpAssistantId).
 */
function normalizeConfigForEmit(config: CustomConfig): CustomConfig {
  const out = { ...config }
  const effectiveBranding = normalizeBranding({
    ...(out.branding || {}),
    ...(out.ui?.branding || {})
  })
  out.branding = {
    appName: effectiveBranding.appName,
    appTagline: effectiveBranding.logline,
    logoKey: effectiveBranding.logoKey
  }
  if (out.ui) {
    out.ui = { ...out.ui }
    out.ui.branding = {
      showLogo: effectiveBranding.showLogo,
      showName: effectiveBranding.showAppName,
      showAppName: effectiveBranding.showAppName,
      showLogline: effectiveBranding.showLogline,
      appName: effectiveBranding.appName,
      logline: effectiveBranding.logline,
      logoPath: effectiveBranding.logoPath
    }
    if (!Array.isArray(out.ui.simpleModeIds) || out.ui.simpleModeIds.length === 0) {
      out.ui.simpleModeIds = DEFAULT_SIMPLE_MODE_IDS
    }
    if (!out.ui.contentMvpAssistantId) {
      out.ui.contentMvpAssistantId = DEFAULT_CONTENT_MVP_ASSISTANT_ID
    }
  } else {
    out.ui = {
      branding: {
        showLogo: effectiveBranding.showLogo,
        showName: effectiveBranding.showAppName,
        showAppName: effectiveBranding.showAppName,
        showLogline: effectiveBranding.showLogline,
        appName: effectiveBranding.appName,
        logline: effectiveBranding.logline,
        logoPath: effectiveBranding.logoPath
      },
      simpleModeIds: DEFAULT_SIMPLE_MODE_IDS,
      contentMvpAssistantId: DEFAULT_CONTENT_MVP_ASSISTANT_ID
    }
  }
  if (out.accessibility) {
    if (!Array.isArray(out.accessibility.hatRequiredComponents)) {
      out.accessibility.hatRequiredComponents = []
    }
  }
  if (out.detectors) {
    out.detectors = { ...out.detectors }
    if (out.detectors.elementClassifier) {
      out.detectors.elementClassifier = { ...out.detectors.elementClassifier }
      if (!out.detectors.elementClassifier.componentKindMap || typeof out.detectors.elementClassifier.componentKindMap !== 'object') {
        out.detectors.elementClassifier.componentKindMap = {}
      }
      if (!Array.isArray(out.detectors.elementClassifier.nameKindRules)) {
        out.detectors.elementClassifier.nameKindRules = []
      }
    } else {
      out.detectors.elementClassifier = { componentKindMap: {}, nameKindRules: [] }
    }
    if (out.detectors.contentClassifier) {
      out.detectors.contentClassifier = { ...out.detectors.contentClassifier }
      const kl = out.detectors.contentClassifier.keywordLists
      if (!kl || typeof kl !== 'object') {
        out.detectors.contentClassifier.keywordLists = {}
      } else {
        out.detectors.contentClassifier.keywordLists = {
          legal: Array.isArray(kl.legal) ? kl.legal : [],
          terms: Array.isArray(kl.terms) ? kl.terms : [],
          privacy: Array.isArray(kl.privacy) ? kl.privacy : [],
          consent: Array.isArray(kl.consent) ? kl.consent : []
        }
      }
      if (!Array.isArray(out.detectors.contentClassifier.placeholderPatterns)) {
        out.detectors.contentClassifier.placeholderPatterns = []
      }
      if (!Array.isArray(out.detectors.contentClassifier.ctaVerbs)) {
        out.detectors.contentClassifier.ctaVerbs = []
      }
    } else {
      out.detectors.contentClassifier = { keywordLists: {}, placeholderPatterns: [], ctaVerbs: [] }
    }
  } else {
    out.detectors = {
      elementClassifier: { componentKindMap: {}, nameKindRules: [] },
      contentClassifier: { keywordLists: {}, placeholderPatterns: [], ctaVerbs: [] }
    }
  }
  return out
}

/**
 * Generate custom config TypeScript module
 */
function generateConfigModule(config: CustomConfig | null): string {
  const normalized = config ? normalizeConfigForEmit(config) : null
  const configValue = normalized ? JSON.stringify(normalized, null, 2) : 'null'
  
  return `/**
 * Generated Custom Config
 * 
 * This file is auto-generated from /custom/config.json
 * DO NOT EDIT MANUALLY - edit /custom/config.json instead
 * 
 * Generated by scripts/generate-custom-overlay.ts
 */

export interface CustomConfig {
  branding?: {
    appName?: string
    appTagline?: string
    logoKey?: 'default' | 'work' | 'none'
  }
  contentTable?: {
    exclusionRules?: {
      enabled?: boolean
      rules?: Array<{
        name?: string
        enabled?: boolean
        note?: string
        matchTarget?: 'content' | 'layerName' | 'both'
        matchType?: 'exact' | 'contains' | 'regex'
        pattern?: string
        action?: 'exclude' | 'flag'
        confidence?: 'high' | 'med' | 'low'
        label?: string
        field?: 'component.name' | 'component.kind' | 'field.label' | 'field.role' | 'content.value' | 'textLayerName'
        match?: 'equals' | 'contains' | 'startsWith' | 'regex'
      }>
    }
    exclusionRulesDebug?: boolean
  }
  ui?: {
    defaultMode?: 'content-mvp' | 'simple' | 'advanced'
    hideContentMvpMode?: boolean
    simpleModeIds?: string[]
    advancedModeIds?: string[]
    contentMvpAssistantId?: string
    branding?: {
      showLogo?: boolean
      showName?: boolean
      showAppName?: boolean
      showLogline?: boolean
      appName?: string
      logline?: string
      logoPath?: string
    }
  }
  llm?: {
    endpoint?: string
    hideModelSettings?: boolean
    uiMode?: 'full' | 'connection-only'
    provider?: 'internal-api' | 'proxy'
    showTestConnection?: boolean
    hideInternalApiSettings?: boolean
    hideProxySettings?: boolean
    hideTestConnectionButton?: boolean
    proxy?: {
      baseUrl?: string
      defaultModel?: string
      authMode?: 'shared_token' | 'session_token'
      sharedToken?: string
    }
    promptDiagnostics?: {
      enabled?: boolean
      level?: 'off' | 'compact' | 'details'
    }
    safety?: {
      forceNoKbName?: boolean
      forceNoSelectionSummary?: boolean
      forceNoImages?: boolean
    }
  }
  knowledgeBases?: Record<string, {
    policy: 'append' | 'override'
    file: string
  }>
  networkAccess?: {
    baseAllowedDomains?: string[]
    extraAllowedDomains?: string[]
  }
  resources?: {
    links?: {
      about?: { label: string; url: string }
      feedback?: { label: string; url: string }
      meetup?: { label: string; url: string }
    }
    credits?: {
      createdBy?: Array<{ label: string; url: string }>
      apiTeam?: Array<{ label: string; url: string }>
      llmInstruct?: Array<{ label: string; url: string }>
    }
  }
  designSystems?: {
    enabled?: boolean
    activeRegistries?: string[]
    allowlist?: string[]
    denylist?: string[]
    strictMode?: boolean
  }
  accessibility?: {
    hatRequiredComponents?: string[]
  }
  analytics?: {
    enabled?: boolean
    endpointUrl?: string
    flushIntervalMs?: number
    maxBatchSize?: number
    maxBuffer?: number
    retryMaxAttempts?: number
    retryBaseDelayMs?: number
    debug?: boolean
    datadog?: { enabled?: boolean }
  }
  detectors?: {
    elementClassifier?: {
      componentKindMap?: Record<string, string>
      nameKindRules?: Array<{ contains: string[]; kind: string }>
      maxNodes?: number
    }
    contentClassifier?: {
      keywordLists?: { legal?: string[]; terms?: string[]; privacy?: string[]; consent?: string[] }
      placeholderPatterns?: string[]
      ctaVerbs?: string[]
    }
  }
}

export const customConfig: CustomConfig | null = ${configValue}
`
}

/**
 * Generate custom knowledge TypeScript module
 */
function generateKnowledgeModule(knowledgeBases: Record<string, string>): string {
  const knowledgeValue = JSON.stringify(knowledgeBases, null, 2)
  
  return `/**
 * Generated Custom Knowledge Bases
 * 
 * This file is auto-generated from /custom/knowledge/*.md
 * DO NOT EDIT MANUALLY - edit /custom/knowledge/*.md files instead
 * 
 * Generated by scripts/generate-custom-overlay.ts
 */

export const customKnowledgeByAssistant: Record<string, string> = ${knowledgeValue}
`
}

/**
 * Generate design system registries TypeScript module
 */
function generateRegistriesModule(registries: Record<string, any>): string {
  const registriesValue = JSON.stringify(registries, null, 2)
  
  return `/**
 * Generated Design System Registries
 * 
 * This file is auto-generated from /custom/design-systems/<id>/registry.json
 * DO NOT EDIT MANUALLY - edit /custom/design-systems/<id>/registry.json files instead
 * 
 * Generated by scripts/generate-custom-overlay.ts
 */

export const customDesignSystemRegistries: Record<string, any> = ${registriesValue}
`
}

/**
 * Main execution
 */
function main() {
  const rootDir = path.resolve(__dirname, '..')
  const configOutputPath = path.join(rootDir, 'src/custom/generated/customConfig.ts')
  const knowledgeOutputPath = path.join(rootDir, 'src/custom/generated/customKnowledge.ts')
  const registriesOutputPath = path.join(rootDir, 'src/custom/generated/customRegistries.ts')
  
  console.log('[Custom Overlay] Generating custom overlay modules...')
  
  const config = loadCustomConfig(rootDir)
  const brandingLocal = loadBrandingLocal(rootDir)
  const mergedConfig = mergeBrandingConfig(config, brandingLocal)
  const knowledgeBases = loadCustomKnowledgeBases(rootDir)
  const registries = loadDesignSystemRegistries(rootDir)
  
  if (!mergedConfig && Object.keys(knowledgeBases).length === 0 && Object.keys(registries).length === 0) {
    console.log('[Custom Overlay] No custom overlay found, generating empty modules')
  } else {
    console.log(`[Custom Overlay] Loaded custom config: ${config ? 'yes' : 'no'}`)
    console.log(`[Custom Overlay] Loaded branding.local override: ${brandingLocal ? 'yes' : 'no'}`)
    console.log(`[Custom Overlay] Loaded ${Object.keys(knowledgeBases).length} knowledge base files`)
    console.log(`[Custom Overlay] Loaded ${Object.keys(registries).length} design system registries`)
  }
  
  const configCode = generateConfigModule(mergedConfig)
  const knowledgeCode = generateKnowledgeModule(knowledgeBases)
  const registriesCode = generateRegistriesModule(registries)
  
  // Ensure generated directory exists
  const generatedDir = path.dirname(configOutputPath)
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true })
  }
  
  // Only write if content changed (like generate-presets.ts)
  let existingConfigContent = ''
  try {
    existingConfigContent = fs.readFileSync(configOutputPath, 'utf-8')
  } catch {
    // File doesn't exist yet
  }
  
  if (existingConfigContent === configCode) {
    console.log('[Custom Overlay] No changes detected in customConfig.ts, skipping write')
  } else {
    fs.writeFileSync(configOutputPath, configCode, 'utf-8')
    console.log(`[Custom Overlay] Generated: ${configOutputPath}`)
  }
  
  let existingKnowledgeContent = ''
  try {
    existingKnowledgeContent = fs.readFileSync(knowledgeOutputPath, 'utf-8')
  } catch {
    // File doesn't exist yet
  }
  
  if (existingKnowledgeContent === knowledgeCode) {
    console.log('[Custom Overlay] No changes detected in customKnowledge.ts, skipping write')
  } else {
    fs.writeFileSync(knowledgeOutputPath, knowledgeCode, 'utf-8')
    console.log(`[Custom Overlay] Generated: ${knowledgeOutputPath}`)
  }
  
  let existingRegistriesContent = ''
  try {
    existingRegistriesContent = fs.readFileSync(registriesOutputPath, 'utf-8')
  } catch {
    // File doesn't exist yet
  }
  
  if (existingRegistriesContent === registriesCode) {
    console.log('[Custom Overlay] No changes detected in customRegistries.ts, skipping write')
  } else {
    fs.writeFileSync(registriesOutputPath, registriesCode, 'utf-8')
    console.log(`[Custom Overlay] Generated: ${registriesOutputPath}`)
  }
  
  console.log('[Custom Overlay] ✓ Custom overlay generation complete')
}

main()
