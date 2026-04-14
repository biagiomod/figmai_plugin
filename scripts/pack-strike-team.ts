/**
 * pack-strike-team.ts
 *
 * Produces a per-assistant tarball that an Assistant Strike Team can clone,
 * build, and test independently. The tarball contains the shared plugin core
 * plus one assistant's editable files; admin tooling (ACE) and hosted
 * infra (Lambda, S3 scripts) are excluded.
 *
 * Usage:
 *   npm run pack-strike-team -- --assistant <id>            # one team
 *   npm run pack-strike-team -- --all                       # every assistant
 *   npm run pack-strike-team -- --assistant <id> --no-verify  # skip build step
 *   npm run pack-strike-team -- --assistant <id> --out <dir>  # override output dir
 *
 * See docs/strike-team-distribution.md for the full workflow.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {
  ALWAYS_EXCLUDE,
  ALWAYS_INCLUDE,
  ASSISTANT_HANDLER_MAP,
  EXCLUDED_NPM_SCRIPTS,
  EXCLUDED_SCRIPT_FILES,
  INCLUDED_DOCS,
  PACKAGED_TEST_COMMAND
} from './pack-strike-team.config'

const REPO_ROOT = path.resolve(__dirname, '..')

interface Options {
  assistant?: string
  all: boolean
  out: string
  verify: boolean
}

interface AssistantInfo {
  id: string
  source: 'per-directory' | 'flat-manifest'
  perDirPath?: string
  knowledgeOverlayPath?: string
  handlerFiles: string[]
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    assistant: undefined,
    all: false,
    out: path.join(REPO_ROOT, 'dist', 'strike-teams'),
    verify: true
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--assistant') opts.assistant = argv[++i]
    else if (a === '--all') opts.all = true
    else if (a === '--out') opts.out = path.resolve(argv[++i])
    else if (a === '--no-verify') opts.verify = false
    else if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }
  if (!opts.all && !opts.assistant) {
    printHelp()
    throw new Error('Must pass --assistant <id> or --all')
  }
  return opts
}

function printHelp() {
  console.log(
    [
      'Usage: npm run pack-strike-team -- [options]',
      '',
      'Options:',
      '  --assistant <id>   Pack a single assistant',
      '  --all              Pack every assistant in the manifest',
      '  --out <dir>        Output directory (default: dist/strike-teams)',
      '  --no-verify        Skip the npm ci && npm run build verification step',
      '  --help             Show this help'
    ].join('\n')
  )
}

/**
 * Resolve which assistants exist.
 * Primary: per-assistant directories under custom/assistants/<id>/
 * Fallback: flat manifest entries not covered by a per-directory.
 */
function loadAssistants(): Map<string, AssistantInfo> {
  const assistants = new Map<string, AssistantInfo>()
  const perDirRoot = path.join(REPO_ROOT, 'custom', 'assistants')

  if (fs.existsSync(perDirRoot)) {
    for (const entry of fs.readdirSync(perDirRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(perDirRoot, entry.name, 'manifest.json')
      if (!fs.existsSync(manifestPath)) continue
      assistants.set(entry.name, {
        id: entry.name,
        source: 'per-directory',
        perDirPath: path.join('custom', 'assistants', entry.name),
        handlerFiles: ASSISTANT_HANDLER_MAP[entry.name] || []
      })
    }
  }

  const flatManifestPath = path.join(REPO_ROOT, 'custom', 'assistants.manifest.json')
  if (fs.existsSync(flatManifestPath)) {
    const flat = JSON.parse(fs.readFileSync(flatManifestPath, 'utf-8')) as {
      assistants?: Array<{ id?: string }>
    }
    for (const entry of flat.assistants ?? []) {
      if (!entry.id || assistants.has(entry.id)) continue
      assistants.set(entry.id, {
        id: entry.id,
        source: 'flat-manifest',
        handlerFiles: ASSISTANT_HANDLER_MAP[entry.id] || []
      })
    }
  }

  // Attach knowledge overlay path if it exists
  for (const info of assistants.values()) {
    const overlay = path.join('custom', 'knowledge', `${info.id}.md`)
    if (fs.existsSync(path.join(REPO_ROOT, overlay))) {
      info.knowledgeOverlayPath = overlay
    }
  }

  return assistants
}

/**
 * Collect every path (relative to REPO_ROOT) that goes into this team's tarball.
 */
function buildFileList(info: AssistantInfo): string[] {
  const set = new Set<string>()

  for (const p of ALWAYS_INCLUDE) set.add(p)
  for (const p of INCLUDED_DOCS) set.add(p)

  // scripts/ — whole dir minus excluded scripts
  for (const f of fs.readdirSync(path.join(REPO_ROOT, 'scripts'))) {
    const rel = path.join('scripts', f)
    if (EXCLUDED_SCRIPT_FILES.includes(rel)) continue
    set.add(rel)
  }

  // Team-editable paths are covered by ALWAYS_INCLUDE (entire src/ and custom/
  // are shipped for build integrity). perDirPath / knowledgeOverlayPath /
  // handler files are documented as editable in STRIKE_TEAM.md.
  if (info.perDirPath) set.add(info.perDirPath)
  if (info.knowledgeOverlayPath) set.add(info.knowledgeOverlayPath)
  for (const f of info.handlerFiles) set.add(f)

  return Array.from(set).sort()
}

/**
 * Copy a file or directory into the staging area, honoring ALWAYS_EXCLUDE
 * and EXCLUDED_SCRIPT_FILES at every level.
 */
function copyPath(rel: string, stageDir: string) {
  const src = path.join(REPO_ROOT, rel)
  const dst = path.join(stageDir, rel)
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDirRecursive(src, dst, rel)
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
  }
}

function copyDirRecursive(srcDir: string, dstDir: string, relBase: string) {
  fs.mkdirSync(dstDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const dstPath = path.join(dstDir, entry.name)
    const relPath = path.join(relBase, entry.name)
    if (isExcluded(relPath)) continue
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath, relPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

function isExcluded(rel: string): boolean {
  const normalized = rel.split(path.sep).join('/')
  for (const ex of ALWAYS_EXCLUDE) {
    if (normalized === ex || normalized.startsWith(`${ex}/`)) return true
  }
  if (EXCLUDED_SCRIPT_FILES.includes(normalized)) return true
  return false
}

/**
 * Other teams' per-directory assistants and knowledge overlays remain in
 * the tarball so the shared compile chain (compile-skills, generate-*) can
 * resolve every assistant in the flat manifest. Edit-ownership is enforced
 * by STRIKE_TEAM.md and PR review, not by file removal.
 */

/**
 * Strip other teams' handler files from src/core/assistants/handlers/ and
 * src/assistants/evergreens/ so only the current team's handler is present.
 * Handlers referenced by the registry that belong to other teams remain
 * only if they are shared utilities (SmartDetector, contentReview, base,
 * analyticsTagging if not the current team's, etc.). The handler registry
 * index.ts imports every handler, so we must keep the files the registry
 * imports — we only strip files NOT imported by the shared registry but
 * listed in ASSISTANT_HANDLER_MAP for a different team.
 *
 * In practice, each team's handler file is imported by the registry, so
 * teams receive all handler files as source. They may only edit their own.
 * This is documented in STRIKE_TEAM.md.
 */
function noteHandlerOwnership(_stageDir: string, _keepId: string) {
  // no-op: all handler files remain so the registry imports resolve;
  // editing ownership is enforced by documentation + PR review.
}

/**
 * Rewrite package.json to remove admin/S3/ACE scripts and swap the test
 * command to the plugin-only version.
 */
function rewritePackageJson(stageDir: string) {
  const pkgPath = path.join(stageDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const scripts = pkg.scripts || {}
  for (const name of EXCLUDED_NPM_SCRIPTS) {
    delete scripts[name]
  }
  scripts.test = PACKAGED_TEST_COMMAND
  pkg.scripts = scripts
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

function formatDate(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function generateStrikeTeamReadme(info: AssistantInfo, stageDir: string) {
  const editable = [
    info.perDirPath,
    info.knowledgeOverlayPath,
    ...info.handlerFiles
  ].filter(Boolean) as string[]

  const lines: string[] = [
    `# Strike Team Package: ${info.id}`,
    '',
    `This package contains everything the **${info.id}** Strike Team needs to compile, test, and iterate on their assistant. Built ${formatDate()} UTC.`,
    '',
    '## What you own (editable)',
    '',
    'These files are your assistant. Changes here go through your Strike Team PR.',
    '',
    ...editable.map((f) => `- \`${f}\``),
    '',
    '## What is shared (read-only reference)',
    '',
    'These files are included so your build works, but are owned by other teams or by core. Do not edit them in this package. If changes are needed, open a discussion with the Core Team or use ACE:',
    '',
    '- `custom/config.json` — managed in ACE with user roles',
    '- `custom/assistants.manifest.json` — shared flat manifest (your entry only)',
    '- `custom/knowledge-bases/` — shared Internal KBs',
    '- `custom/skills/` — shared Skills library',
    '- `custom/design-systems/` — design system registries',
    '- `src/core/`, `src/ui/`, `src/sdk/`, `src/work/` — shared plugin runtime',
    '- `src/core/assistants/handlers/*` (other than your own) — other teams\' handlers',
    '- `custom/assistants/<other-id>/` (other than your own) — other teams\' per-directory assistants',
    '- `custom/knowledge/<other-id>.md` (other than your own) — other teams\' knowledge overlays',
    '',
    'Other teams\' assistant files are present because the shared build chain (compile-skills, generate-*) needs every assistant in the flat manifest to resolve. Do not edit them in your package.',
    '',
    '## Setup',
    '',
    '```bash',
    'npm ci',
    'npm run build',
    'npm run test',
    '```',
    '',
    'First build runs the prebuild chain (compile-skills, generate-assistants, generate-knowledge-bases, etc.). Subsequent builds are incremental via `npm run watch`.',
    '',
    '## Testing the plugin in Figma',
    '',
    '1. Open Figma desktop.',
    '2. Plugins → Development → Import plugin from manifest.',
    '3. Select `manifest.json` at the root of this package.',
    '4. Run the plugin in a test file.',
    '',
    '## Submitting changes back to Core',
    '',
    'Your changes go back to the Core Team as either a PR or a file bundle. The recommended flow:',
    '',
    '1. Commit your changes on a team branch: `strike/<your-id>/<feature>`',
    '2. Push and open a PR against the Core Team\'s main branch.',
    '3. Your PR should only touch files in the "What you own" section above.',
    '4. The Core Team will validate, run invariants, and merge.',
    '',
    '## Do not',
    '',
    '- Edit `custom/config.json` directly. Use ACE (Admin Config Editor) with your account role.',
    '- Edit generated files (`*.generated.ts`). They are rewritten by `npm run prebuild`.',
    '- Edit other teams\' handlers or per-directory assistants.',
    '- Add hosted-infra code (S3, Lambda, ACE). Those scripts were stripped from this package on purpose.',
    '',
    '## Questions',
    '',
    'Reach the Core Team via the usual channels. Reference `docs/assistant-sdk.md` and `docs/skills-and-knowledge-bases.md` in this package for authoring guidance.',
    ''
  ]

  fs.writeFileSync(path.join(stageDir, 'STRIKE_TEAM.md'), lines.join('\n'), 'utf-8')
}

function verifyBuild(stageDir: string) {
  console.log(`[pack] Verifying build in ${stageDir} (npm ci && npm run build)...`)
  execSync('npm ci', { cwd: stageDir, stdio: 'inherit' })
  execSync('npm run build', { cwd: stageDir, stdio: 'inherit' })
  console.log('[pack] Verification succeeded.')
}

function tarball(stageDir: string, outFile: string) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  const stageParent = path.dirname(stageDir)
  const stageName = path.basename(stageDir)
  execSync(
    `tar --exclude='node_modules' --exclude='dist' -czf "${outFile}" -C "${stageParent}" "${stageName}"`,
    { stdio: 'inherit' }
  )
}

function packOne(info: AssistantInfo, opts: Options) {
  const stageRoot = path.join(REPO_ROOT, '.pack-staging')
  const stageName = `strike-${info.id}-${formatDate()}`
  const stageDir = path.join(stageRoot, stageName)

  if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true })
  fs.mkdirSync(stageDir, { recursive: true })

  console.log(`\n[pack] === ${info.id} (source: ${info.source}) ===`)
  console.log(`[pack] Staging at ${stageDir}`)

  const files = buildFileList(info)
  for (const f of files) copyPath(f, stageDir)

  noteHandlerOwnership(stageDir, info.id)

  rewritePackageJson(stageDir)
  generateStrikeTeamReadme(info, stageDir)

  let success = false
  try {
    if (opts.verify) verifyBuild(stageDir)
    success = true
  } catch (err) {
    console.error(`[pack] Verification failed for ${info.id}. Staging dir kept at ${stageDir}`)
    throw err
  }

  const outFile = path.join(opts.out, `figmai-${stageName}.tar.gz`)
  tarball(stageDir, outFile)
  console.log(`[pack] Wrote ${outFile}`)

  if (success) {
    fs.rmSync(stageDir, { recursive: true, force: true })
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const assistants = loadAssistants()

  const targets: AssistantInfo[] = opts.all
    ? Array.from(assistants.values())
    : (() => {
        const info = assistants.get(opts.assistant!)
        if (!info) {
          throw new Error(
            `Assistant "${opts.assistant}" not found. Available: ${Array.from(assistants.keys()).sort().join(', ')}`
          )
        }
        return [info]
      })()

  for (const info of targets) packOne(info, opts)

  console.log(`\n[pack] Done. ${targets.length} package(s) in ${opts.out}`)
}

main()
