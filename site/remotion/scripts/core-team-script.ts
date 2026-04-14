import type { HowToScript } from '../src/compositions/how-to/types'

export const CORE_TEAM_SCRIPT: HowToScript = {
  title: 'Core Team Architecture',
  accentColor: '#60a5fa',
  chapters: [
    {
      id: 'overview',
      title: 'System Overview — The Big Picture',
      durationSeconds: 90,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'plugin', label: 'Figma Plugin', sublabel: 'Runs in Figma desktop', color: '#ef4477' },
            { id: 'ace',    label: 'ACE Admin',    sublabel: 'Static SPA + Lambda API', color: '#a78bfa' },
            { id: 'aws',    label: 'AWS: Lambda + S3', sublabel: 'Config API + storage', color: '#60a5fa' },
            { id: 'site',   label: 'Main Site',    sublabel: 'React + Vite static', color: '#34d399' },
          ],
          connections: [
            { from: 'plugin', to: 'aws',    label: 'sync-config (build time only)' },
            { from: 'ace',    to: 'aws',    label: 'reads/writes via Config API' },
            { from: 'aws',    to: 'plugin', label: 'config baked in at build' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Who owns what.',
          points: [
            'Strike Teams: src/assistants/name/ and custom/assistants/name/',
            'Core Team: everything else — SDK, main.ts, infrastructure, site',
            'Plugin has zero runtime dependency on ACE or S3',
            'Config is baked in at build time — never fetched at runtime',
          ],
        },
      ],
    },
    {
      id: 'plugin-arch',
      title: 'Plugin Architecture',
      durationSeconds: 120,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'ui',       label: 'UI: RUN_QUICK_ACTION' },
            { id: 'main',     label: 'main.ts routing' },
            { id: 'handler',  label: 'canHandle()?' },
            { id: 'provider', label: 'provider.sendChat()' },
            { id: 'post',     label: 'handleResponse()' },
            { id: 'result',   label: 'UI displays result' },
          ],
          arrows: [
            { from: 'ui',       to: 'main' },
            { from: 'main',     to: 'handler' },
            { from: 'handler',  to: 'provider' },
            { from: 'provider', to: 'post' },
            { from: 'post',     to: 'result' },
          ],
        },
        {
          type: 'filetree',
          lines: [
            { text: 'src/', dim: true },
            { text: '  main.ts         ← orchestrator, routing only', highlight: true },
            { text: '  ui.tsx          ← stateless display', highlight: true },
            { text: '  sdk/            ← stable import surface', highlight: true },
            { text: '  core/           (internal — do not import from assistants)', dim: true },
            { text: '  assistants/     ← Strike Team territory', dim: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'The plugin shell — never add business logic here.',
          points: [
            'main.ts routes messages and maintains history. Never implement features here.',
            'ui.tsx is stateless — listen to main thread, never store state locally',
            'Handler pattern: canHandle() decides ownership, handleResponse() runs logic',
            'SDK barrel: src/sdk/index.ts is the only safe import path for assistants',
          ],
        },
      ],
    },
    {
      id: 'assistant-system',
      title: 'Assistant System & SDK',
      durationSeconds: 120,
      scenes: [
        {
          type: 'filetree',
          lines: [
            { text: 'src/assistants/', dim: true },
            { text: '  general/', highlight: true },
            { text: '    index.ts     ← AssistantModule export', highlight: true },
            { text: '    handler.ts   ← optional custom logic', highlight: true },
            { text: '  evergreens/', dim: true },
            { text: '    index.ts', dim: true },
            { text: '    handler.ts', dim: true },
            { text: 'custom/assistants/', dim: true },
            { text: '  general/', highlight: true },
            { text: '    SKILL.md     ← behavior config', highlight: true },
            { text: '    manifest.json', highlight: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'The two-directory model.',
          points: [
            'src/assistants/name/index.ts — AssistantModule with optional handler',
            'Import only from ../../sdk — never ../../core directly',
            'CODEOWNERS auto-assigns the Strike Team as PR reviewer for their directories',
            'build-assistants generates a per-assistant error report at every build',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'manifest', label: 'manifest.json' },
            { id: 'script',   label: 'build-assistants' },
            { id: 'gen',      label: '_registry.generated.ts' },
            { id: 'runtime',  label: 'Plugin runtime' },
          ],
          arrows: [
            { from: 'manifest', to: 'script' },
            { from: 'script',   to: 'gen' },
            { from: 'gen',      to: 'runtime' },
          ],
        },
      ],
    },
    {
      id: 'ace-pipeline',
      title: 'ACE Admin & Config Pipeline',
      durationSeconds: 120,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'spa',   label: 'ACE SPA',      sublabel: 'Static HTML/CSS/JS', color: '#a78bfa' },
            { id: 'api',   label: 'Config API',   sublabel: 'Stateless Lambda',   color: '#60a5fa' },
            { id: 's3',    label: 'S3 Bucket',    sublabel: 'Private, versioned',  color: '#34d399' },
            { id: 'build', label: 'Plugin Build', sublabel: 'sync-config + generators', color: '#ef4477' },
          ],
          connections: [
            { from: 'spa',   to: 'api',   label: 'REST /api/*' },
            { from: 'api',   to: 's3',    label: 'read/write' },
            { from: 's3',    to: 'build', label: 'sync-config pulls published.json' },
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit',     label: 'Edit in ACE' },
            { id: 'draft',    label: 'Save to S3 draft/' },
            { id: 'publish',  label: 'Publish' },
            { id: 'snapshot', label: 'Snapshot created' },
            { id: 'sync',     label: 'sync-config pulls' },
            { id: 'bake',     label: 'Config baked into build' },
          ],
          arrows: [
            { from: 'edit',     to: 'draft' },
            { from: 'draft',    to: 'publish' },
            { from: 'publish',  to: 'snapshot' },
            { from: 'snapshot', to: 'sync' },
            { from: 'sync',     to: 'bake' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Config pipeline — never touches the plugin at runtime.',
          points: [
            'ACE SPA: pure static files, zero server logic, deploy anywhere',
            'Config API: stateless Lambda — reads/writes S3, validates, manages versions',
            'Publish creates a timestamped snapshot; published.json points to it',
            'sync-config pulls that snapshot into custom/ before every plugin build',
          ],
        },
      ],
    },
    {
      id: 'infrastructure',
      title: 'AWS Infrastructure',
      durationSeconds: 120,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'lambda', label: 'Lambda',      sublabel: 'Config API — stateless',      color: '#60a5fa' },
            { id: 's3',     label: 'S3',          sublabel: 'Private, versioning enabled', color: '#34d399' },
            { id: 'cf',     label: 'CloudFront',  sublabel: 'Serves ACE SPA',              color: '#a78bfa' },
            { id: 'figma',  label: 'Figma Network', sublabel: 'manifest.json enforces allowlist', color: '#ef4477' },
          ],
          connections: [
            { from: 'lambda', to: 's3' },
            { from: 'cf',     to: 'lambda' },
            { from: 'figma',  to: 'lambda', label: 'only allowlisted domains' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Security model.',
          points: [
            'Lambda: stateless, no persistent disk — scales to zero when idle',
            'S3: private bucket, versioning enabled, all keys under figmai/ prefix',
            'manifest.json.networkAccess.allowedDomains — Figma enforces this at runtime, not us',
            'No telemetry SDKs, no analytics, no background sync anywhere',
            'Outbound calls: POST /v1/chat (LLM), GET /health (proxy), POST internalApiUrl',
          ],
        },
      ],
    },
    {
      id: 'main-site',
      title: 'Main Site',
      durationSeconds: 90,
      scenes: [
        {
          type: 'bullets',
          heading: 'React + Vite static site.',
          points: [
            'Pages: Home, per-Assistant, Roadmap, Resources, Strike Team profiles',
            'VideoPlayer: teaser thumbnail (poster@2s) expands full-width on click',
            'Remotion pipeline: compositions in site/remotion/ → .mp4 → site/public/videos/',
            '1200px max-width via CSS formula: max(40px, calc((100% - 1200px) / 2))',
            'Deploy by uploading dist/ to any CDN — no server required',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit',   label: 'Edit component' },
            { id: 'build',  label: 'npm run build' },
            { id: 'dist',   label: 'dist/ output' },
            { id: 'cdn',    label: 'Upload to CDN' },
            { id: 'live',   label: 'Live' },
          ],
          arrows: [
            { from: 'edit',  to: 'build' },
            { from: 'build', to: 'dist' },
            { from: 'dist',  to: 'cdn' },
            { from: 'cdn',   to: 'live' },
          ],
        },
      ],
    },
    {
      id: 'extending',
      title: 'Extending the System',
      durationSeconds: 120,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'index',      label: 'Create index.ts' },
            { id: 'manifest',   label: 'Add to manifest.json' },
            { id: 'codeowners', label: 'Add CODEOWNERS' },
            { id: 'build',      label: 'npm run build' },
            { id: 'gate',       label: 'Compile gate ✓' },
            { id: 'pr',         label: 'Submit PR' },
          ],
          arrows: [
            { from: 'index',      to: 'manifest' },
            { from: 'manifest',   to: 'codeowners' },
            { from: 'codeowners', to: 'build' },
            { from: 'build',      to: 'gate' },
            { from: 'gate',       to: 'pr' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Maintaining and extending.',
          points: [
            'New SDK export: add to src/sdk/index.ts, get Core review, bump exports',
            'PR management: CODEOWNERS auto-assigns, compile gate blocks broken TypeScript',
            'Deploy plugin: build → update manifest.json → distribute new bundle',
            'Debug broken handler: check canHandle() returns true for your assistantId',
            'Config not updating: check sync-config + confirm published.json was updated in S3',
          ],
        },
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'mkdir -p src/assistants/my-assistant',
              output: [],
            },
            {
              cmd: 'cp src/assistants/general/index.ts src/assistants/my-assistant/index.ts',
              output: [],
            },
            {
              cmd: 'npm run build',
              output: [
                '── build-assistants ────────────────────',
                '✓ my-assistant      updated',
                'Build complete.',
              ],
            },
          ],
        },
      ],
    },
  ],
}
