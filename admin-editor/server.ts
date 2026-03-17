/**
 * Admin Config Editor – local server.
 * GET /api/model, POST /api/validate, POST /api/save (auth + editor+).
 * Auth: cookie ace_sid, file-backed users, RBAC admin/manager/editor/reviewer.
 * Serves static files from admin-editor/public.
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cookieParser from 'cookie-parser'
import { loadModel } from './src/model'
import { validateModel, adminEditableModelSchema, saveRequestBodySchema } from './src/schema'
import { saveModel, saveModelDryRun } from './src/save'
import { requireAuth, requireAdmin, requireRoleValidateSave, validateWrapperConfig } from './src/auth-middleware'
import {
  handleLogin,
  handleLogout,
  handleMe,
  handleBootstrapAllowed,
  handleBootstrap
} from './src/auth-routes'
import {
  handleListUsers,
  handleCreateUser,
  handleUpdateUser
} from './src/users-routes'
import { createKbRouter } from './src/kb-routes'
import { appendAuditLine } from './src/audit'
import type { AuthLocals } from './src/auth-middleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const adminEditorDir = __dirname
const repoRoot = path.resolve(adminEditorDir, '..')
const backupRootDir = path.join(adminEditorDir, '.backups')
const dataDir = path.join(adminEditorDir, 'data')

const ACE_DEBUG = process.env.ACE_DEBUG === '1' || process.env.ACE_DEBUG === 'true'
const ACE_AUTH_MODE = process.env.ACE_AUTH_MODE || 'local'

// Fail fast if wrapper mode is misconfigured (missing/placeholder token)
validateWrapperConfig()

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// In dev, prevent caching of main static assets so refresh always serves current files (avoids stale UI/blank page).
const NO_CACHE_PATHS = new Set([
  '/', '/index.html', '/app.js', '/styles.css', '/fonts.css',
  '/home', '/home/', '/home/admin', '/home/admin/', '/home/admin/index.html', '/home/admin/app.js', '/home/admin/styles.css', '/home/admin/fonts.css'
])
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'GET' && NO_CACHE_PATHS.has(req.path)) {
      res.setHeader('Cache-Control', 'no-store')
    }
    next()
  })
}

const publicDir = path.join(adminEditorDir, 'public')

type ManifestQuickAction = {
  id?: string
  label?: string
  templateMessage?: string
}

type ManifestAssistant = {
  id: string
  label: string
  intro: string
  promptTemplate?: string
  quickActions?: ManifestQuickAction[]
}

function escapeHtml (value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sentenceCase (value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeIntroLine (intro: string): string {
  const oneLine = String(intro || '').replace(/\n+/g, ' ').replace(/\*\*/g, '').trim()
  return oneLine.length > 220 ? oneLine.slice(0, 217) + '...' : oneLine
}

function loadAssistantsFromManifest (): ManifestAssistant[] {
  const manifestPath = path.join(repoRoot, 'custom', 'assistants.manifest.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (!parsed || !Array.isArray(parsed.assistants)) return []
    return parsed.assistants.filter((a: any) => a && typeof a.id === 'string' && typeof a.label === 'string').map((a: any) => ({
      id: a.id,
      label: a.label,
      intro: typeof a.intro === 'string' ? a.intro : '',
      promptTemplate: typeof a.promptTemplate === 'string' ? a.promptTemplate : '',
      quickActions: Array.isArray(a.quickActions) ? a.quickActions : []
    }))
  } catch (err) {
    console.error('[home-pages] Failed to read assistants manifest:', err)
    return []
  }
}

function getRelatedAssistants (assistants: ManifestAssistant[], currentId: string): ManifestAssistant[] {
  const idx = assistants.findIndex(a => a.id === currentId)
  if (idx === -1) return assistants.slice(0, 3)
  const candidates: ManifestAssistant[] = []
  for (let i = 1; i < assistants.length && candidates.length < 3; i++) {
    const left = idx - i
    const right = idx + i
    if (left >= 0 && assistants[left].id !== currentId) candidates.push(assistants[left])
    if (right < assistants.length && assistants[right].id !== currentId && candidates.length < 3) candidates.push(assistants[right])
  }
  return candidates
}

function deriveBestFor (assistant: ManifestAssistant): string[] {
  const intro = normalizeIntroLine(assistant.intro).toLowerCase()
  const bullets = [
    `Teams that need consistent ${assistant.label.toLowerCase()} outputs`,
    'Design workflows that require clear decisions and documentation',
    'Cross-functional collaboration with fewer handoff gaps'
  ]
  if (intro.includes('accessibility')) bullets[0] = 'Teams shipping inclusive and accessible experiences'
  if (intro.includes('content')) bullets[0] = 'Teams aligning UX writing and content structure'
  if (intro.includes('critique')) bullets[0] = 'Teams running repeatable design critiques'
  return bullets
}

function deriveWhatYouGet (assistant: ManifestAssistant): string[] {
  const actionLabels = (assistant.quickActions || [])
    .map(a => (a.label || '').trim())
    .filter(Boolean)
    .slice(0, 3)
  if (actionLabels.length === 0) {
    return [
      'Structured guidance in the plugin workflow',
      'Actionable outputs tied to selected frames',
      'Repeatable prompts for team consistency'
    ]
  }
  return actionLabels.map(l => sentenceCase(l))
}

function deriveExamplePrompts (assistant: ManifestAssistant): string[] {
  const promptMap: Record<string, string[]> = {
    design_critique: [
      'Review this flow and list the top usability issues.',
      'Give me wins, risks, and concrete fixes for this screen.',
      'Evaluate hierarchy, clarity, and interaction feedback.',
      'Check this design for deceptive patterns and explain why.'
    ],
    accessibility: [
      'Review this design for accessibility issues and suggest fixes.',
      'Check color contrast and WCAG alignment for this screen.',
      'Identify interaction and readability risks for keyboard users.'
    ],
    content_table: [
      'Generate a content table from the selected container.',
      'List all text fields and classify by content type.',
      'Create a clean inventory for handoff and review.'
    ]
  }
  if (promptMap[assistant.id]) return promptMap[assistant.id]
  const fromActions = (assistant.quickActions || [])
    .map(a => (a.templateMessage || '').trim())
    .filter(Boolean)
    .slice(0, 5)
  if (fromActions.length >= 3) return fromActions
  return [
    `Help me use ${assistant.label} on this selected frame.`,
    `What output should I expect from ${assistant.label} for this task?`,
    `Give me a structured result I can apply to the design and handoff.`
  ]
}

function assertNoEmDash (html: string, routeName: string): void {
  if (process.env.NODE_ENV === 'production') return
  const idx = html.indexOf('—')
  if (idx === -1) return
  const start = Math.max(0, idx - 40)
  const end = Math.min(html.length, idx + 40)
  const snippet = html.slice(start, end).replace(/\n/g, ' ')
  console.error(`[home-pages:no-em-dash] Found em dash on route ${routeName}. Snippet: ${snippet}`)
}

function marketingLayout (opts: { title: string, activePath: string, body: string }): string {
  const navLinks = [
    { href: '/home', label: 'Home' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/assistants', label: 'Assistants' },
    { href: '/demo', label: 'Demo' },
    { href: '/faq', label: 'FAQ' },
    { href: '/home/admin', label: 'Admin' }
  ]
  const navHtml = navLinks.map(link => {
    const active = opts.activePath === link.href || (opts.activePath.startsWith('/assistants/') && link.href === '/assistants')
    return `<a class="ace-home-nav-link${active ? ' is-active' : ''}" href="${link.href}">${escapeHtml(link.label)}</a>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en" class="ace-home-html">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
  <link rel="stylesheet" href="/fonts.css" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="ace-home-page">
  <header class="ace-home-topbar" role="banner">
    <div class="ace-home-topbar-inner ace-container">
      <a href="/home" class="ace-home-brand">
        <img src="/assets/logo-figmai.svg" alt="" class="ace-home-logo" width="117" height="36" />
      </a>
      <nav class="ace-home-nav" aria-label="Marketing pages">${navHtml}</nav>
    </div>
  </header>
  <main class="ace-home-main" role="main">
    ${opts.body}
  </main>
</body>
</html>`
}

function sendMarketingPage (res: express.Response, routeName: string, page: { title: string, activePath: string, body: string }): void {
  const html = marketingLayout(page)
  assertNoEmDash(html, routeName)
  res.setHeader('Cache-Control', 'no-store')
  res.send(html)
}

// ——— Home and ACE paths ———
app.get(['/home', '/home/'], (_req, res) => {
  const assistants = loadAssistantsFromManifest()
  const assistantsCards = assistants.map(a => `
    <article class="ace-card ace-home-assistant-card">
      <h3 class="ace-card-title">${escapeHtml(a.label)}</h3>
      <p class="ace-card-subtext">${escapeHtml(normalizeIntroLine(a.intro) || 'Specialized assistant for focused design outcomes.')}</p>
      <a class="btn-secondary ace-home-inline-btn" href="/assistants/${encodeURIComponent(a.id)}">View</a>
    </article>
  `).join('')

  const faqTeaser = [
    ['How do we start?', 'Install the plugin, choose an assistant, and run a focused quick action on selected frames.'],
    ['Can teams tune behavior?', 'Yes. Assistants and knowledge can be configured through ACE when needed.'],
    ['Does this replace design judgment?', 'No. It accelerates analysis and output so teams can make better decisions faster.'],
    ['Is it tied only to Figma?', 'Figma is the current integration. The approach is designed to extend over time.'],
    ['How is consistency maintained?', 'Teams use shared assistants, bounded references, and repeatable execution patterns.'],
    ['Can we use it for accessibility checks?', 'Yes. Accessibility-focused assistants support review and remediation guidance.']
  ].map(([q, a]) => `<article class="ace-card"><h3 class="ace-card-title">${escapeHtml(q)}</h3><p class="ace-card-subtext">${escapeHtml(a)}</p></article>`).join('')

  const body = `
  <section class="ace-home-hero ace-container">
    <div class="ace-card ace-home-hero-card">
      <h1 class="ace-section-title">AI assistance for design teams that need consistency, not chaos.</h1>
      <p class="ace-home-lead">Ableza brings specialized assistants into your design process: critique, accessibility checks, discovery support, content workflows, and structured outputs, grounded in your standards and knowledge bases.</p>
      <div class="ace-home-cta-row">
        <a class="btn-primary" href="/home/admin">Install the Plugin</a>
        <a class="btn-secondary" href="/demo">Watch 2-min Demo</a>
      </div>
      <ul class="ace-home-proof-list">
        <li>No API keys stored in the plugin</li>
        <li>Build time compiled assistants and knowledge</li>
        <li>Allowlisted network origins and explicit execution types</li>
      </ul>
    </div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">Alignment is expensive</h2></div>
    <div class="ace-card">
      <ul class="ace-home-bullet-list">
        <li>Repeated critique and standards review across teams</li>
        <li>Discovery swirl that produces artifacts without decisions</li>
        <li>Inconsistent patterns, accessibility misses, and content drift</li>
        <li>Institutional knowledge that does not scale</li>
      </ul>
    </div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">What Ableza is</h2></div>
    <div class="ace-card">
      <p class="ace-home-lead ace-home-lead-small">Ableza is an AI layer inside the design workflow that helps teams move from questions to usable outputs with more consistency.</p>
      <ul class="ace-home-bullet-list">
        <li>Chat and quick actions inside the workflow</li>
        <li>Specialized assistants by job to be done</li>
        <li>Governed knowledge bases injected as bounded reference context</li>
        <li>Optional Admin Config Editor (ACE) for configuration and knowledge</li>
      </ul>
    </div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">Key benefits</h2></div>
    <div class="ace-home-grid ace-home-grid-5">
      <article class="ace-card"><h3 class="ace-card-title">Faster decisions with less churn</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Consistency across teams</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Higher-quality releases</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Better onboarding</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Governed by default</h3></article>
    </div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">How it works</h2></div>
    <div class="ace-home-grid ace-home-grid-3">
      <article class="ace-card"><h3 class="ace-card-title">1. Pick an assistant or run a quick action</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">2. Select relevant frames and ask for output</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">3. Apply results to designs and handoff</h3></article>
    </div>
    <p class="ace-home-inline-links">See the full flow on <a href="/how-it-works">How It Works</a> or browse <a href="/assistants">Assistants</a>.</p>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">Assistants overview</h2></div>
    <div class="ace-home-grid ace-home-grid-3">${assistantsCards}</div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">Differentiators</h2></div>
    <div class="ace-home-grid ace-home-grid-2">
      <article class="ace-card"><h3 class="ace-card-title">Built for governed environments</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Deterministic content and behavior</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Explicit execution types</h3></article>
      <article class="ace-card"><h3 class="ace-card-title">Knowledge as reference, not prompt soup</h3></article>
    </div>
  </section>

  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h2 class="ace-section-title">FAQ</h2></div>
    <div class="ace-home-grid ace-home-grid-2">${faqTeaser}</div>
    <p class="ace-home-inline-links"><a href="/faq">Read the full FAQ</a></p>
  </section>

  <section class="ace-container ace-home-section ace-home-final-cta">
    <div class="ace-card">
      <h2 class="ace-section-title">Ready to bring structured AI support into your design workflow?</h2>
      <div class="ace-home-cta-row">
        <a class="btn-primary" href="/home/admin">Install the Plugin</a>
        <a class="btn-secondary" href="/demo">Watch 2-min Demo</a>
      </div>
      <p class="ace-card-subtext">Start with one assistant, validate outputs in context, and scale gradually with team standards.</p>
    </div>
  </section>
  `

  sendMarketingPage(res, '/home', {
    title: 'Ableza Home',
    activePath: '/home',
    body
  })
})
app.get('/how-it-works', (_req, res) => {
  const body = `
  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h1 class="ace-section-title">How It Works</h1></div>
    <div class="ace-card">
      <ol class="ace-home-number-list">
        <li>Install the plugin and open Ableza in Figma.</li>
        <li>Pick an assistant aligned to your current task.</li>
        <li>Select relevant frames, then run a quick action or ask a focused prompt.</li>
        <li>Review the output, apply changes, and capture decisions for handoff.</li>
      </ol>
    </div>
  </section>
  <section class="ace-container ace-home-section">
    <div class="ace-card">
      <h2 class="ace-card-title">First successful run path</h2>
      <ol class="ace-home-number-list">
        <li>Open a real screen in your file.</li>
        <li>Run one assistant action on that screen.</li>
        <li>Apply at least one recommendation.</li>
        <li>Share the updated frame with your team for validation.</li>
      </ol>
      <p class="ace-home-inline-links"><a href="/home">Back to Home</a></p>
    </div>
  </section>
  `
  sendMarketingPage(res, '/how-it-works', {
    title: 'How It Works',
    activePath: '/how-it-works',
    body
  })
})
app.get('/assistants', (_req, res) => {
  const assistants = loadAssistantsFromManifest()
  const cards = assistants.map(a => `
    <article class="ace-card ace-home-assistant-card">
      <h2 class="ace-card-title">${escapeHtml(a.label)}</h2>
      <p class="ace-card-subtext">${escapeHtml(normalizeIntroLine(a.intro) || 'Specialized design workflow support.')}</p>
      <a class="btn-secondary ace-home-inline-btn" href="/assistants/${encodeURIComponent(a.id)}">View</a>
    </article>
  `).join('')
  const body = `
  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h1 class="ace-section-title">Assistants</h1></div>
    <p class="ace-home-lead ace-home-lead-small">Directory sourced from assistants manifest.</p>
    <div class="ace-home-grid ace-home-grid-3">${cards}</div>
  </section>
  `
  sendMarketingPage(res, '/assistants', {
    title: 'Assistants',
    activePath: '/assistants',
    body
  })
})
app.get('/assistants/:id', (req, res) => {
  const assistants = loadAssistantsFromManifest()
  const current = assistants.find(a => a.id === req.params.id)
  if (!current) {
    const body = `
    <section class="ace-container ace-home-section">
      <div class="ace-card">
        <h1 class="ace-section-title">Assistant not found</h1>
        <p class="ace-card-subtext">The requested assistant id does not exist in the manifest.</p>
        <a class="btn-secondary" href="/assistants">Back to Assistants</a>
      </div>
    </section>
    `
    res.status(404)
    return sendMarketingPage(res, '/assistants/:id', {
      title: 'Assistant Not Found',
      activePath: '/assistants',
      body
    })
  }

  const bestFor = deriveBestFor(current).map(item => `<li>${escapeHtml(item)}</li>`).join('')
  const whatYouGet = deriveWhatYouGet(current).map(item => `<li>${escapeHtml(item)}</li>`).join('')
  const prompts = deriveExamplePrompts(current).slice(0, 5).map(item => `<li>${escapeHtml(item)}</li>`).join('')
  const related = getRelatedAssistants(assistants, current.id).map(a => `<li><a href="/assistants/${encodeURIComponent(a.id)}">${escapeHtml(a.label)}</a></li>`).join('')
  const body = `
  <section class="ace-container ace-home-section">
    <div class="ace-card">
      <h1 class="ace-section-title">${escapeHtml(current.label)}</h1>
      <p class="ace-home-lead ace-home-lead-small">${escapeHtml(normalizeIntroLine(current.intro) || 'Specialized assistant for focused workflow outcomes.')}</p>
    </div>
  </section>
  <section class="ace-container ace-home-section ace-home-grid ace-home-grid-2">
    <article class="ace-card">
      <h2 class="ace-card-title">Best for</h2>
      <ul class="ace-home-bullet-list">${bestFor}</ul>
    </article>
    <article class="ace-card">
      <h2 class="ace-card-title">What you get</h2>
      <ul class="ace-home-bullet-list">${whatYouGet}</ul>
    </article>
  </section>
  <section class="ace-container ace-home-section ace-home-grid ace-home-grid-2">
    <article class="ace-card">
      <h2 class="ace-card-title">Example prompts</h2>
      <ul class="ace-home-bullet-list">${prompts}</ul>
    </article>
    <article class="ace-card">
      <h2 class="ace-card-title">Workflow steps</h2>
      <ol class="ace-home-number-list">
        <li>Open the assistant and choose a quick action.</li>
        <li>Select relevant frames and run the request.</li>
        <li>Apply output to design and confirm with stakeholders.</li>
      </ol>
    </article>
  </section>
  <section class="ace-container ace-home-section">
    <article class="ace-card">
      <h2 class="ace-card-title">Related assistants</h2>
      <ul class="ace-home-bullet-list">${related}</ul>
      <p class="ace-home-inline-links"><a href="/assistants">Back to Assistants</a></p>
    </article>
  </section>
  `
  sendMarketingPage(res, '/assistants/:id', {
    title: current.label,
    activePath: '/assistants',
    body
  })
})
app.get('/demo', (_req, res) => {
  const body = `
  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h1 class="ace-section-title">Demo</h1></div>
    <div class="ace-home-grid ace-home-grid-2">
      <article class="ace-card">
        <h2 class="ace-card-title">Plugin walkthrough</h2>
        <p class="ace-card-subtext">Coming soon. Quick orientation to assistants and actions in context.</p>
      </article>
      <article class="ace-card">
        <h2 class="ace-card-title">Design critique flow</h2>
        <p class="ace-card-subtext">Coming soon. End-to-end review from frame selection to applied fixes.</p>
      </article>
      <article class="ace-card">
        <h2 class="ace-card-title">Accessibility review flow</h2>
        <p class="ace-card-subtext">Coming soon. Typical checks and remediation handoff workflow.</p>
      </article>
      <article class="ace-card">
        <h2 class="ace-card-title">Content workflow flow</h2>
        <p class="ace-card-subtext">Coming soon. Structured content outputs for collaboration and handoff.</p>
      </article>
    </div>
  </section>
  `
  sendMarketingPage(res, '/demo', {
    title: 'Demo',
    activePath: '/demo',
    body
  })
})
app.get('/faq', (_req, res) => {
  const section = (title: string, items: Array<[string, string]>) => `
    <article class="ace-card">
      <h2 class="ace-card-title">${escapeHtml(title)}</h2>
      <div class="ace-home-faq-group">
        ${items.map(([q, a]) => `<div class="ace-home-faq-item"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('')}
      </div>
    </article>
  `
  const body = `
  <section class="ace-container ace-home-section">
    <div class="ace-section-header-row"><h1 class="ace-section-title">FAQ</h1></div>
    <div class="ace-home-grid ace-home-grid-2">
      ${section('Security', [
        ['Where are API keys stored?', 'The plugin does not store API keys inside the client workflow.'],
        ['How is network use controlled?', 'Teams can control allowed origins and execution behavior through configuration.']
      ])}
      ${section('Setup', [
        ['How quickly can a team start?', 'Most teams can install, run one assistant action, and validate value in a short session.'],
        ['Do we need ACE to start?', 'No. ACE is optional and useful when teams want governed configuration and knowledge updates.']
      ])}
      ${section('Governance', [
        ['Can we standardize assistant behavior?', 'Yes. Assistants and knowledge references can be configured for consistent outcomes.'],
        ['How do we avoid prompt drift?', 'Use bounded references, focused actions, and shared review practices.']
      ])}
      ${section('Usage', [
        ['What if output is not ready to apply?', 'Treat results as draft input, then refine with design judgment and team review.'],
        ['Can this support handoff?', 'Yes. Teams can use structured outputs to reduce ambiguity before delivery.']
      ])}
    </div>
  </section>
  `
  sendMarketingPage(res, '/faq', {
    title: 'FAQ',
    activePath: '/faq',
    body
  })
})
app.use((req, res, next) => {
  if (req.path === '/home/admin') {
    return res.redirect(302, '/home/admin/')
  }
  if (req.path === '/home/ace') {
    return res.redirect(302, '/home/admin/')
  }
  next()
})
app.use('/home/admin', express.static(publicDir, { index: 'index.html' }))

// ——— Root: ACE UI (unchanged) ———
app.use(express.static(publicDir))

// ——— Build info (no auth) ———
// Reads build/build-info.json (generated by scripts/generate-build-info.ts). No caching so ACE shows current build.
app.get('/api/build-info', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const buildInfoPath = path.resolve(repoRoot, 'build', 'build-info.json')
  try {
    console.log('[build-info] path:', buildInfoPath)
    console.log('[build-info] exists:', fs.existsSync(buildInfoPath))
    if (!fs.existsSync(buildInfoPath)) {
      res.status(404).json({ version: '', buildId: undefined, builtAt: undefined })
      return
    }
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'))
    const version = typeof buildInfo.version === 'string' ? buildInfo.version : ''
    const buildId = typeof buildInfo.buildId === 'string' ? buildInfo.buildId : undefined
    const builtAt = typeof buildInfo.builtAt === 'string' ? buildInfo.builtAt : undefined
    res.json({ version, buildId, builtAt })
  } catch (err) {
    console.log('[build-info] error:', err?.message ?? String(err))
    res.status(404).json({ version: '', buildId: undefined, builtAt: undefined })
  }
})

// ——— Wrapper mode: disable all Node auth endpoints ———
if (ACE_AUTH_MODE === 'wrapper') {
  app.use('/api/auth', (_req: express.Request, res: express.Response) => {
    res.status(403).json({ error: 'Auth endpoints disabled in wrapper mode. Authentication is handled by the Spring wrapper.' })
  })
}

// ——— Auth routes (local mode only; wrapper mode guard above returns 403) ———
app.get('/api/auth/bootstrap-allowed', (req, res) => {
  handleBootstrapAllowed(req, res, dataDir)
})
app.post('/api/auth/bootstrap', (req, res, next) => {
  handleBootstrap(req, res, dataDir).catch(next)
})
app.post('/api/auth/login', (req, res, next) => {
  handleLogin(req, res, dataDir).catch(next)
})
app.post('/api/auth/logout', handleLogout)

// ——— Auth: me (requires valid session / wrapper headers) ———
app.get('/api/auth/me', requireAuth(dataDir), (req, res) => handleMe(req, res, dataDir))

// ——— Users CRUD (admin only) ———
app.get('/api/users', requireAuth(dataDir), requireAdmin, (req, res) => {
  handleListUsers(req, res, dataDir)
})
app.post('/api/users', requireAuth(dataDir), requireAdmin, (req, res, next) => {
  handleCreateUser(req, res, dataDir).catch(next)
})
app.patch('/api/users/:id', requireAuth(dataDir), requireAdmin, (req, res, next) => {
  handleUpdateUser(req, res, dataDir).catch(next)
})

// ——— KB: registry + CRUD (admin/manager/editor) ———
app.use('/api/kb', requireAuth(dataDir), requireRoleValidateSave, createKbRouter(repoRoot))

// ——— Model: GET requires auth ———
app.get('/api/model', requireAuth(dataDir), (_req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const { model, meta } = loadModel(repoRoot)
    const validation = validateModel(model)
    res.json({
      model,
      meta: {
        repoRoot: meta.repoRoot,
        filePaths: meta.filePaths,
        lastModified: meta.lastModified,
        revision: meta.revision,
        files: meta.files
      },
      validation: {
        errors: validation.errors,
        warnings: validation.warnings
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) })
  }
})

/** Format Zod errors for ACE UX: resolve assistantsManifest.assistants[i].quickActions[j].* to assistantId/actionId. */
function formatSchemaErrorsForACE (body: unknown, zodError: { errors: Array<{ path: (string | number)[]; message: string }> }): string[] {
  const model = body && typeof body === 'object' && 'model' in body ? (body as { model: unknown }).model : body
  const assistants = model && typeof model === 'object' && model !== null && 'assistantsManifest' in model
    ? (model as { assistantsManifest?: { assistants?: Array<{ id?: string; quickActions?: Array<{ id?: string }> }> } }).assistantsManifest?.assistants
    : undefined
  const pathPrefix = body && typeof body === 'object' && 'model' in body ? ['model'] : []
  return zodError.errors.map((e) => {
    const path = e.path
    const rel = pathPrefix.length && path[0] === 'model' ? path.slice(1) : path
    if (Array.isArray(assistants) && rel[0] === 'assistantsManifest' && rel[1] === 'assistants' && typeof rel[2] === 'number') {
      const i = rel[2]
      const asst = assistants[i]
      const assistantId = asst?.id ?? String(i)
      if (rel[3] === 'quickActions' && typeof rel[4] === 'number') {
        const j = rel[4]
        const actionId = asst?.quickActions?.[j]?.id ?? `quickActions[${j}]`
        const field = rel[5] !== undefined ? String(rel[5]) : ''
        const msg = field ? `${field}: ${e.message}` : e.message
        return `${assistantId}/${actionId}: ${msg}`
      }
      if (rel[3] === 'instructionBlocks' && typeof rel[4] === 'number') {
        const blockIdx = rel[4]
        const field = rel[5] !== undefined ? String(rel[5]) : ''
        const msg = field ? `${field}: ${e.message}` : e.message
        return `${assistantId}/instructionBlocks[${blockIdx}]: ${msg}`
      }
    }
    return `${path.join('.')}: ${e.message}`
  })
}

// ——— Validate: admin/manager/editor (reviewer 403) ———
app.post('/api/validate', requireAuth(dataDir), requireRoleValidateSave, (req, res) => {
  try {
    const parsed = adminEditableModelSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatSchemaErrorsForACE(req.body, parsed.error)
      return res.status(400).json({ errors, warnings: [] })
    }
    const result = validateModel(parsed.data)
    res.json({ errors: result.errors, warnings: result.warnings })
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) })
  }
})

// ——— Save: admin/manager/editor (reviewer 403); audit on success ———
app.post('/api/save', requireAuth(dataDir), requireRoleValidateSave, (req, res) => {
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true'
  const auth = res.locals.auth as AuthLocals
  try {
    const parsed = saveRequestBodySchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatSchemaErrorsForACE(req.body, parsed.error)
      return res.status(400).json({ errors, success: false })
    }
    const { meta: currentMeta } = loadModel(repoRoot)
    const clientRevision = parsed.data.meta.revision
    if (ACE_DEBUG) {
      const match = currentMeta.revision === clientRevision
      console.log('[ACE /api/save] start: clientRevisionLength=' + (typeof clientRevision === 'string' ? clientRevision.length : 0) + ', currentMeta.revisionLength=' + (typeof currentMeta.revision === 'string' ? currentMeta.revision.length : 0) + ', match=' + match)
    }
    if (currentMeta.revision !== clientRevision) {
      return res.status(409).json({
        error: 'Files changed since load; reload to avoid overwriting.',
        meta: {
          repoRoot: currentMeta.repoRoot,
          filePaths: currentMeta.filePaths,
          lastModified: currentMeta.lastModified,
          revision: currentMeta.revision,
          files: currentMeta.files
        }
      })
    }
    const m = parsed.data.model
    const toSave = {
      config: m.config,
      assistantsManifest: m.assistantsManifest,
      customKnowledge: m.customKnowledge,
      contentModelsRaw: m.contentModelsRaw,
      designSystemRegistries: m.designSystemRegistries
    }
    if (dryRun) {
      const summary = saveModelDryRun(toSave, currentMeta, backupRootDir)
      if (!summary.success) {
        return res.status(400).json(summary)
      }
      return res.json(summary)
    }
    const summary = saveModel(toSave, currentMeta, backupRootDir)
    if (!summary.success) {
      res.status(400).json(summary)
      return
    }
    const { meta: newMeta } = loadModel(repoRoot)
    if (ACE_DEBUG) {
      console.log('[ACE /api/save] 200: newMeta.revisionLength=' + (typeof newMeta.revision === 'string' ? newMeta.revision.length : 0))
    }
    appendAuditLine(dataDir, {
      timestamp: new Date().toISOString(),
      user: auth.username,
      action: 'save',
      resource: 'model',
      revisionBefore: clientRevision,
      revisionAfter: newMeta.revision,
      filesWritten: summary.filesWritten || [],
      dryRun: false
    })
    res.json({ ...summary, meta: newMeta })
  } catch (err: any) {
    res.status(500).json({
      success: false,
      filesWritten: [],
      backupsCreatedAt: '',
      backupRoot: '',
      generatorsRun: [],
      errors: [err?.message ?? String(err)],
      nextSteps: 'Ask an admin to run `npm run build` and then publish via the normal process.'
    })
  }
})

// ——— Test: connection (draft-aware, no save required) ———
// Accepts draft LLM settings and makes a real test call to verify connectivity.
app.post('/api/test/connection', requireAuth(dataDir), requireRoleValidateSave, async (req, res) => {
  const { provider, endpoint, proxy } = req.body || {}
  const providerType = provider === 'proxy' ? 'proxy' : 'internal-api'

  if (providerType === 'internal-api') {
    const url = (typeof endpoint === 'string' ? endpoint : '').trim().replace(/\/+$/, '')
    if (!url) {
      return res.json({
        success: false,
        message: 'No Internal API endpoint configured. Enter an endpoint URL in the AI page first.'
      })
    }
    try {
      const payload = { type: 'generalChat', message: 'test', kbName: 'figma' }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      })
      let responseBody = ''
      try { responseBody = (await response.text()).slice(0, 300) } catch { /* ignore */ }
      const diagnostics = { url, statusCode: response.status, responseBody }
      if (!response.ok) {
        let message = `Connection failed: ${response.status} ${response.statusText}`
        if (response.status === 401) message = 'Authentication failed. Check that you are on your organization network and the endpoint is correct.'
        return res.json({ success: false, message, diagnostics })
      }
      return res.json({ success: true, message: 'Connection successful. The Internal API endpoint responded.', diagnostics })
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Connection test failed: ${msg}`
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach endpoint: ${msg}. Check that the URL is correct and the service is running.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The endpoint did not respond within 15 seconds.'
      }
      return res.json({ success: false, message, diagnostics: { url, error: msg } })
    }
  } else {
    const baseUrl = (typeof proxy?.baseUrl === 'string' ? proxy.baseUrl : '').trim().replace(/\/+$/, '')
    if (!baseUrl) {
      return res.json({
        success: false,
        message: 'No Proxy base URL configured. Enter a Proxy base URL in the AI page first.'
      })
    }
    // figmai-proxy health check: GET /health (no auth required, no body)
    const healthUrl = baseUrl + '/health'
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      })
      let responseBody = ''
      try { responseBody = (await response.text()).slice(0, 300) } catch { /* ignore */ }
      const diagnostics = { url: healthUrl, statusCode: response.status, responseBody }
      if (!response.ok) {
        let message = `Connection failed: ${response.status} ${response.statusText}`
        if (response.status === 401 || response.status === 403) message = 'Authentication failed. Check your proxy shared token configuration.'
        return res.json({ success: false, message, diagnostics })
      }
      return res.json({ success: true, message: 'Connection successful. The Proxy /health endpoint responded.', diagnostics })
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Connection test failed: ${msg}`
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach proxy: ${msg}. Check that the base URL is correct.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The proxy did not respond within 15 seconds.'
      }
      return res.json({ success: false, message, diagnostics: { url: healthUrl, error: msg } })
    }
  }
})

// ——— Test: assistant (draft-aware, no save required) ———
// Accepts draft assistant + LLM settings and runs a real test request.
app.post('/api/test/assistant', requireAuth(dataDir), requireRoleValidateSave, async (req, res) => {
  const { provider, endpoint, proxy, assistant, message, kbName } = req.body || {}

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'No test message provided.' })
  }
  if (!assistant || typeof assistant !== 'object') {
    return res.status(400).json({ success: false, message: 'No assistant data provided.' })
  }

  const providerType = provider === 'proxy' ? 'proxy' : 'internal-api'
  const resolvedKbName: string = (typeof kbName === 'string' && kbName) ? kbName : 'figma'

  // Build system prompt from draft assistant (promptTemplate + enabled instructionBlocks)
  const systemParts: string[] = []
  if (typeof assistant.promptTemplate === 'string' && assistant.promptTemplate.trim()) {
    systemParts.push(assistant.promptTemplate.trim())
  }
  if (Array.isArray(assistant.instructionBlocks)) {
    for (const block of assistant.instructionBlocks) {
      if (block.enabled !== false && typeof block.content === 'string' && block.content.trim()) {
        systemParts.push(block.content.trim())
      }
    }
  }
  const systemPrompt = systemParts.join('\n\n')

  function extractInternalApiText (body: string): string {
    try {
      const json = JSON.parse(body)
      if (json?.Prompts?.[0]?.ResponseFromAssistant) return String(json.Prompts[0].ResponseFromAssistant)
      if (typeof json?.result === 'string') return json.result
      if (json?.result && typeof json.result === 'object' && !Array.isArray(json.result)) return JSON.stringify(json.result, null, 2)
    } catch { /* fallback to raw body */ }
    return body
  }

  // Mirrors normalize.ts extractResponseText for figmai-proxy responses.
  // figmai-proxy may return: { text }, { content }, { message }, { response }, or OpenAI choices shape.
  function extractProxyText (body: string): string {
    try {
      const json = JSON.parse(body)
      if (typeof json?.text === 'string') return json.text
      if (typeof json?.content === 'string') return json.content
      if (typeof json?.message === 'string') return json.message
      if (typeof json?.response === 'string') return json.response
      if (json?.choices?.[0]?.message?.content) return String(json.choices[0].message.content)
      if (typeof json?.choices?.[0]?.text === 'string') return String(json.choices[0].text)
    } catch { /* fallback to raw body */ }
    return body
  }

  if (providerType === 'internal-api') {
    const url = (typeof endpoint === 'string' ? endpoint : '').trim().replace(/\/+$/, '')
    if (!url) {
      return res.json({ success: false, message: 'No Internal API endpoint configured. Enter an endpoint URL in the AI page first.' })
    }
    try {
      const fullMessage = systemPrompt ? `${systemPrompt}\n\n${message.trim()}` : message.trim()
      const payload: Record<string, unknown> = { type: 'generalChat', message: fullMessage, kbName: resolvedKbName }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000)
      })
      let responseBody = ''
      try { responseBody = await response.text() } catch { /* ignore */ }
      if (!response.ok) {
        let msg = `Request failed: ${response.status} ${response.statusText}`
        if (response.status === 401) msg = 'Authentication failed. Check your organization network access.'
        return res.json({ success: false, message: msg, diagnostics: { statusCode: response.status, responseBody: responseBody.slice(0, 300) } })
      }
      const responseText = extractInternalApiText(responseBody)
      return res.json({ success: true, response: responseText, assistantId: assistant.id || '(unknown)', kbName: resolvedKbName })
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Test request failed: ${msg}`
      if (err?.name === 'TimeoutError' || msg.includes('timeout')) message = 'Request timed out after 60 seconds.'
      return res.json({ success: false, message })
    }
  } else {
    const baseUrl = (typeof proxy?.baseUrl === 'string' ? proxy.baseUrl : '').trim().replace(/\/+$/, '')
    if (!baseUrl) {
      return res.json({ success: false, message: 'No Proxy base URL configured. Enter a Proxy base URL in the AI page first.' })
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      // Resolve authMode with fallbacks: if absent, infer from which token is present; default to shared_token.
      // This matches the renderAITab default and guards against model state where authMode was never explicitly set.
      const hasSharedToken = typeof proxy?.sharedToken === 'string' && !!proxy.sharedToken
      const hasSessionToken = typeof proxy?.sessionToken === 'string' && !!proxy.sessionToken
      const effectiveAuthMode = proxy?.authMode === 'session_token' ? 'session_token'
        : proxy?.authMode === 'shared_token' ? 'shared_token'
        : hasSharedToken ? 'shared_token'
        : hasSessionToken ? 'session_token'
        : 'shared_token'
      // figmai-proxy uses X-FigmAI-Token for shared_token; Authorization Bearer for session_token
      if (effectiveAuthMode === 'shared_token' && hasSharedToken) {
        headers['X-FigmAI-Token'] = proxy.sharedToken
      } else if (effectiveAuthMode === 'session_token' && hasSessionToken) {
        headers['Authorization'] = `Bearer ${proxy.sessionToken}`
      }
      const messages: Array<{ role: string; content: string }> = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      messages.push({ role: 'user', content: message.trim() })
      const payload: Record<string, unknown> = { messages }
      if (typeof proxy?.defaultModel === 'string' && proxy.defaultModel) payload.model = proxy.defaultModel
      // figmai-proxy chat endpoint: /v1/chat (not /chat/completions)
      const testUrl = baseUrl + '/v1/chat'
      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000)
      })
      let responseBody = ''
      try { responseBody = await response.text() } catch { /* ignore */ }
      if (!response.ok) {
        let msg = `Request failed: ${response.status} ${response.statusText}`
        if (response.status === 401) msg = 'Authentication failed. Check your proxy token configuration.'
        return res.json({ success: false, message: msg, diagnostics: { statusCode: response.status, responseBody: responseBody.slice(0, 300) } })
      }
      const responseText = extractProxyText(responseBody)
      return res.json({ success: true, response: responseText, assistantId: assistant.id || '(unknown)', kbName: resolvedKbName })
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Test request failed: ${msg}`
      if (err?.name === 'TimeoutError' || msg.includes('timeout')) message = 'Request timed out after 60 seconds.'
      return res.json({ success: false, message })
    }
  }
})

const PORT = process.env.ADMIN_EDITOR_PORT ? parseInt(process.env.ADMIN_EDITOR_PORT, 10) : 3333
const HOST = process.env.ADMIN_EDITOR_HOST || (ACE_AUTH_MODE === 'wrapper' ? '127.0.0.1' : '0.0.0.0')
app.listen(PORT, HOST, () => {
  console.log(`Admin Config Editor server at http://${HOST}:${PORT}`)
  console.log(`Auth mode: ${ACE_AUTH_MODE}${ACE_AUTH_MODE === 'wrapper' ? ' (Spring wrapper — Node login disabled, identity from headers)' : ' (local cookie/session auth)'}`)
  console.log(`Repo root: ${repoRoot}`)
  console.log(`Data dir: ${dataDir}`)
  console.log('Endpoints: GET /api/model, POST /api/validate, POST /api/save; auth: /api/auth/*, users: /api/users (admin)')
  console.log('Test endpoints: POST /api/test/connection, POST /api/test/assistant (draft-aware, no save required)')
})
