import type { HowToScript } from '../src/compositions/how-to/types'

export const STRIKE_TEAM_SCRIPT: HowToScript = {
  title: 'Strike Team Onboarding',
  accentColor: '#ef4477',
  chapters: [
    {
      id: 'welcome',
      title: "Welcome & What You're Building",
      durationSeconds: 45,
      scenes: [
        {
          type: 'bullets',
          heading: 'You are a Strike Team.',
          points: [
            'A small, focused team that builds and maintains one AI assistant in FigmAI',
            'You work independently in your own corner of the codebase',
            'The Core Team owns everything else — SDK, infrastructure, and the main plugin shell',
            'Your job: make your assistant great. Ship via Pull Request.',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'team', label: 'Strike Team' },
            { id: 'plugin', label: 'Plugin Build' },
            { id: 'figma', label: 'Designer in Figma' },
          ],
          arrows: [
            { from: 'team', to: 'plugin' },
            { from: 'plugin', to: 'figma' },
          ],
        },
      ],
    },
    {
      id: 'setup',
      title: 'Get Set Up',
      durationSeconds: 75,
      scenes: [
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'git clone https://github.com/your-org/figmai-starter',
              output: ["Cloning into 'figmai-starter'...", 'done.'],
            },
            {
              cmd: 'cd figmai-starter && npm install',
              output: ['added 847 packages in 12s'],
            },
            {
              cmd: 'code .',
              output: ['Opening in Visual Studio Code...'],
            },
          ],
        },
      ],
    },
    {
      id: 'directories',
      title: 'Your Two Directories',
      durationSeconds: 90,
      scenes: [
        {
          type: 'filetree',
          lines: [
            { text: 'figmai-starter/', dim: true },
            { text: '  src/', dim: true },
            { text: '    assistants/', dim: true },
            { text: '      general/     ← example', highlight: true },
            { text: '      evergreens/  ← example', highlight: true },
            { text: '      accessibility/ ← example', highlight: true },
            { text: '    core/           (Core Team)', dim: true },
            { text: '    sdk/            (Core Team)', dim: true },
            { text: '  custom/', dim: true },
            { text: '    assistants/', dim: true },
            { text: '      general/     ← example', highlight: true },
            { text: '      evergreens/  ← example', highlight: true },
            { text: '      accessibility/ ← example', highlight: true },
            { text: '    knowledge-bases/ (Core Team)', dim: true },
            { text: '    config.json     (Core Team)', dim: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'You own exactly two directories.',
          points: [
            'src/assistants/your-name/  —  your TypeScript handler code',
            'custom/assistants/your-name/  —  config, knowledge files, SKILL.md',
            'Never modify files outside these two without Core Team approval',
            "SKILL.md controls your assistant's behavior and personality in the plugin",
          ],
        },
      ],
    },
    {
      id: 'build',
      title: 'Build & Test in Figma',
      durationSeconds: 75,
      scenes: [
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'npm run build',
              output: [
                '── build-assistants ───────────────────',
                '✓ general           updated',
                '✓ evergreens        updated',
                '⚠ accessibility     kept previous   handler.ts:14 — fix yours',
                '',
                'Build complete.',
              ],
            },
          ],
        },
        {
          type: 'bullets',
          heading: 'Reading the build report.',
          points: [
            '✓ updated — your assistant compiled and is ready to test',
            '⚠ kept previous — TypeScript error on the line shown. Fix it.',
            'Errors in other assistants do not block your build',
            'Load in Figma: Plugins → Development → Import plugin from manifest.json',
          ],
        },
      ],
    },
    {
      id: 'pr',
      title: 'Submit Your Work — Pull Request',
      durationSeconds: 75,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'branch', label: 'Create branch' },
            { id: 'pr', label: 'Open PR' },
            { id: 'review', label: 'Core Team reviews' },
            { id: 'merged', label: 'Merged ✓' },
          ],
          arrows: [
            { from: 'branch', to: 'pr' },
            { from: 'pr', to: 'review' },
            { from: 'review', to: 'merged' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Submitting your work.',
          points: [
            'git checkout -b feat/my-update',
            'git add src/assistants/your-name/ custom/assistants/your-name/',
            'Only commit files inside your two directories — nothing else',
            "If your PR fails, Core Team explains why and offers a fix. Push the fix and it's re-reviewed.",
          ],
        },
      ],
    },
    {
      id: 'ace',
      title: 'ACE Admin — Edit & Configure',
      durationSeconds: 60,
      scenes: [
        {
          type: 'bullets',
          heading: 'Content changes. No code needed.',
          points: [
            'Log into ACE using the link your Core Team provided',
            "Navigate to Assistants → your assistant's page",
            'Edit description, feature list, SKILL.md, and knowledge base entries',
            'Hit Publish — changes go live on the Main Site without a PR',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit', label: 'Edit in ACE' },
            { id: 'publish', label: 'Publish' },
            { id: 'live', label: 'Live on Main Site' },
          ],
          arrows: [
            { from: 'edit', to: 'publish' },
            { from: 'publish', to: 'live' },
          ],
        },
      ],
    },
  ],
}
