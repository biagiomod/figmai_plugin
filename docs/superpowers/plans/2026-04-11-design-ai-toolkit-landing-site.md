# Design AI Toolkit Landing Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone React/Vite landing site (`figmai_plugin/site/`) with a homepage, five assistant pages, a roadmap, and a resources page — fully self-contained, deployable to localhost or S3.

**Architecture:** React 18 + Vite 5 + TypeScript with React Router v6 for client-side routing. All assets (fonts, icons, videos) are bundled or served from `public/`. Theme switching (Mixed/Dark/Light) is class-based on `<html>` with localStorage persistence. Per-assistant accent colors are applied via CSS custom property `--ac-color`.

**Tech Stack:** React 18, Vite 5, TypeScript 5, react-router-dom 6, lucide-react (npm — NOT CDN), Vitest + @testing-library/react, local OTF fonts, pre-rendered MP4 videos.

---

## File Map

```
figmai_plugin/site/
  public/
    fonts/Carbon/ Industry/ Protipo/   ← copied OTFs
    videos/general.mp4 evergreens.mp4 accessibility.mp4 design-workshop.mp4 analytics-tagging.mp4
  src/
    components/
      Nav.tsx + Nav.module.css
      Footer.tsx + Footer.module.css
      ThemeToggle.tsx + ThemeToggle.module.css
      AssistantCard.tsx + AssistantCard.module.css
      VideoPlayer.tsx + VideoPlayer.module.css
      FeedbackPanel.tsx + FeedbackPanel.module.css
      StrikeTeamSection.tsx + StrikeTeamSection.module.css
      StrikeTeamProfile.tsx + StrikeTeamProfile.module.css
      RoadmapCard.tsx + RoadmapCard.module.css
      ResourceCard.tsx + ResourceCard.module.css
    pages/
      Home.tsx + Home.module.css
      AssistantPage.tsx + AssistantPage.module.css
      Roadmap.tsx + Roadmap.module.css
      Resources.tsx + Resources.module.css
    data/
      types.ts
      assistants.ts
      roadmap.ts
      resources.ts
      strikeTeams.ts
    styles/
      tokens.css
      themes.css
      fonts.css
      global.css
    test/setup.ts
    App.tsx
    main.tsx
  index.html
  vite.config.ts
  tsconfig.json tsconfig.app.json tsconfig.node.json
  package.json
  README.md
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `site/package.json`
- Create: `site/vite.config.ts`
- Create: `site/index.html`
- Create: `site/tsconfig.json`, `site/tsconfig.app.json`, `site/tsconfig.node.json`
- Create: `site/src/test/setup.ts`

- [ ] **Step 1: Create `site/` directory and `package.json`**

Run from `figmai_plugin/`:
```bash
mkdir -p site/src/test site/public/fonts site/public/videos
```

Create `site/package.json`:
```json
{
  "name": "design-ai-toolkit-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.441.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `site/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 3: Create TypeScript configs**

`site/tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`site/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

`site/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `site/index.html`**

```html
<!doctype html>
<html lang="en" class="theme-mixed">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Design AI Toolkit</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `site/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Install dependencies**

```bash
cd site && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd site && npx tsc -b
```

Expected: no output (success). If errors, fix tsconfig paths.

- [ ] **Step 8: Commit**

```bash
git add site/
git commit -m "feat(site): scaffold React/Vite project with Vitest"
```

---

## Task 2: Fonts and FPO Videos

**Files:**
- Create: `site/public/fonts/Carbon/`, `Industry/`, `Protipo/` (copied OTFs)
- Create: `site/public/videos/*.mp4` (5 FPO placeholders)

- [ ] **Step 1: Copy font files**

Run from `figmai_plugin/`:
```bash
cp -r admin-editor/public/fonts/Carbon site/public/fonts/Carbon
cp -r admin-editor/public/fonts/Industry site/public/fonts/Industry
cp -r admin-editor/public/fonts/Protipo site/public/fonts/Protipo
```

Verify:
```bash
ls site/public/fonts/Carbon | head -3
```
Expected: `Carbon-Bold-Italic.otf  Carbon-Bold.otf  Carbon-Regular-Italic.otf`

- [ ] **Step 2: Create FPO MP4 placeholder videos**

Requires `ffmpeg` (install via `brew install ffmpeg` if missing):
```bash
cd site
for slug in general evergreens accessibility design-workshop analytics-tagging; do
  ffmpeg -f lavfi -i color=c=black:size=1280x720:rate=1 \
    -t 5 -c:v libx264 -pix_fmt yuv420p \
    public/videos/${slug}.mp4 -y
done
```

Verify:
```bash
ls -lh public/videos/
```
Expected: 5 `.mp4` files, each ~20–60 KB.

- [ ] **Step 3: Commit**

```bash
cd .. && git add site/public/fonts/ site/public/videos/
git commit -m "feat(site): add local fonts and FPO video placeholders"
```

---

## Task 3: Design Tokens and Global Styles

**Files:**
- Create: `site/src/styles/tokens.css`
- Create: `site/src/styles/themes.css`
- Create: `site/src/styles/fonts.css`
- Create: `site/src/styles/global.css`

- [ ] **Step 1: Create `site/src/styles/tokens.css`**

```css
:root {
  --accent: #d50c7d;
  --ac-color: var(--accent);

  --bg-hero: #0a0a0a;
  --bg-nav: #0a0a0a;
  --bg-body: #f7f7f7;
  --bg-card: #ffffff;
  --bg-dark-card: #1c1c1c;

  --text-primary: #111111;
  --text-muted: #666666;
  --text-subtle: #999999;
  --text-on-dark: #ffffff;
  --text-on-dark-muted: rgba(255, 255, 255, 0.55);

  --border-card: #e8e8e8;
  --border-dark: rgba(255, 255, 255, 0.08);

  --radius-card: 10px;
  --radius-sm: 6px;
  --radius-xs: 4px;

  --font-display: 'Industry Inc', system-ui, sans-serif;
  --font-body: 'Protipo', system-ui, sans-serif;
  --font-label: 'Carbon', system-ui, sans-serif;
}
```

- [ ] **Step 2: Create `site/src/styles/themes.css`**

```css
/* Mixed (default): dark hero/nav surfaces, light body */
html.theme-mixed {
  --bg-body: #f7f7f7;
  --bg-card: #ffffff;
  --bg-section-alt: #0a0a0a;
  --text-primary: #111111;
  --text-muted: #666666;
  --border-card: #e8e8e8;
}

/* Dark: all surfaces dark */
html.theme-dark {
  --bg-body: #0f0f0f;
  --bg-card: #1c1c1c;
  --bg-section-alt: #0a0a0a;
  --text-primary: #f0f0f0;
  --text-muted: rgba(255, 255, 255, 0.55);
  --border-card: rgba(255, 255, 255, 0.08);
}

/* Light: all surfaces light */
html.theme-light {
  --bg-body: #ffffff;
  --bg-card: #f8f8f8;
  --bg-section-alt: #111111;
  --text-primary: #111111;
  --text-muted: #666666;
  --border-card: #e4e4e4;
}
```

- [ ] **Step 3: Create `site/src/styles/fonts.css`**

```css
@font-face {
  font-family: 'Industry Inc';
  src: url('/fonts/Industry/Industry_Inc_Base.otf') format('opentype');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Industry Inc';
  src: url('/fonts/Industry/Industry_Inc_Bold.otf') format('opentype');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Protipo';
  src: url('/fonts/Protipo/Protipo-Regular.otf') format('opentype');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Protipo';
  src: url('/fonts/Protipo/Protipo-Semibold.otf') format('opentype');
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Protipo';
  src: url('/fonts/Protipo/Protipo-Bold.otf') format('opentype');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Protipo';
  src: url('/fonts/Protipo/Protipo-Extrabold.otf') format('opentype');
  font-weight: 800; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Carbon';
  src: url('/fonts/Carbon/Carbon-Regular.otf') format('opentype');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Carbon';
  src: url('/fonts/Carbon/Carbon-Bold.otf') format('opentype');
  font-weight: 700; font-style: normal; font-display: swap;
}
```

- [ ] **Step 4: Create `site/src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-body);
  transition: background 0.2s, color 0.2s;
}

body { min-height: 100vh; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
img, video { max-width: 100%; display: block; }

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```

- [ ] **Step 5: Commit**

```bash
git add site/src/styles/
git commit -m "feat(site): add design tokens, theme vars, font-face declarations, and global reset"
```

---

## Task 4: Data Layer — Types and Assistants

**Files:**
- Create: `site/src/data/types.ts`
- Create: `site/src/data/assistants.ts`
- Create: `site/src/data/__tests__/assistants.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/data/__tests__/assistants.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { ASSISTANTS, getAssistant, LIVE_ASSISTANTS } from '../assistants'

describe('assistants data', () => {
  it('has exactly 5 live assistants', () => {
    expect(LIVE_ASSISTANTS).toHaveLength(5)
  })

  it('each assistant has required fields', () => {
    for (const a of ASSISTANTS) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.howToUse.length).toBeGreaterThanOrEqual(3)
      expect(a.quickActions.length).toBeGreaterThanOrEqual(2)
      expect(a.resources.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('getAssistant returns correct entry by id', () => {
    const a = getAssistant('evergreens')
    expect(a?.name).toBe('Evergreens')
  })

  it('getAssistant returns undefined for unknown id', () => {
    expect(getAssistant('does-not-exist')).toBeUndefined()
  })

  it('only evergreens has bestPractices', () => {
    const eg = getAssistant('evergreens')
    expect(eg?.bestPractices).toBeDefined()
    const others = ASSISTANTS.filter(a => a.id !== 'evergreens')
    for (const a of others) {
      expect(a.bestPractices).toBeUndefined()
    }
  })

  it('slugs match expected values', () => {
    const ids = ASSISTANTS.map(a => a.id)
    expect(ids).toEqual(['general', 'evergreens', 'accessibility', 'design-workshop', 'analytics-tagging'])
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/data/__tests__/assistants.test.ts
```
Expected: FAIL — `Cannot find module '../assistants'`

- [ ] **Step 3: Create `site/src/data/types.ts`**

```ts
import type { LucideIcon } from 'lucide-react'

export type Step = { number: number; title: string; description: string }
export type Resource = { title: string; description: string; tag: string; href: string }
export type BestPractice = { title: string; description: string }
export type TeamMember = { name: string; role: string; isLead: boolean; avatarInitials: string }
export type OpenSlot = { role: string; description: string; applyHref: string }
export type StrikeTeam = { members: TeamMember[]; openSlots: OpenSlot[] }
export type AssistantStatus = 'live' | 'backlog' | 'planned'
export type Theme = 'mixed' | 'dark' | 'light'

export type Assistant = {
  id: string
  name: string
  tagline: string
  accent: string
  icon: LucideIcon
  status: AssistantStatus
  video: string
  howToUse: Step[]
  quickActions: string[]
  resources: Resource[]
  bestPractices?: BestPractice[]
  strikeTeam: StrikeTeam
}

export type RoadmapEntry = {
  id: string
  name: string
  tagline: string
  accent: string
  icon: LucideIcon
  status: AssistantStatus
}
```

- [ ] **Step 4: Create `site/src/data/assistants.ts`**

```ts
import { MessageSquare, Leaf, Eye, Lightbulb, BarChart2 } from 'lucide-react'
import type { Assistant } from './types'

export const ASSISTANTS: Assistant[] = [
  {
    id: 'general',
    name: 'General',
    tagline: 'Open-ended design Q&A, component briefs, and design rationale.',
    accent: '#4a90e2',
    icon: MessageSquare,
    status: 'live',
    video: 'general.mp4',
    howToUse: [
      { number: 1, title: 'Open the plugin in Figma', description: 'Launch the Design AI Toolkit plugin from the Figma plugin menu.' },
      { number: 2, title: 'Select General', description: 'Choose the General assistant from the assistant selector.' },
      { number: 3, title: 'Type your question or brief', description: 'Ask a design question, describe a component you need, or request a rationale review.' },
      { number: 4, title: 'Review and apply the output', description: 'Copy relevant content or apply suggestions directly to your Figma file.' },
    ],
    quickActions: ['Write a component brief', 'Explain this design decision', 'Suggest alternatives', 'Review this pattern'],
    resources: [
      { title: 'General Assistant Docs', description: 'Full capability reference and example prompts.', tag: 'Doc', href: '#' },
      { title: 'Prompt Writing Guide', description: 'How to write effective prompts for consistent output.', tag: 'Guide', href: '#' },
      { title: 'Example Conversations', description: 'Real examples of productive General assistant sessions.', tag: 'Examples', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Product Design', isLead: true, avatarInitials: 'TL' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'MB' },
      ],
      openSlots: [{ role: 'Content Strategist', description: 'Prompt design and output quality review', applyHref: '#' }],
    },
  },
  {
    id: 'evergreens',
    name: 'Evergreens',
    tagline: 'Find, update, and create reusable design pattern entries.',
    accent: '#007a39',
    icon: Leaf,
    status: 'live',
    video: 'evergreens.mp4',
    howToUse: [
      { number: 1, title: 'Open the plugin in Figma', description: 'Launch the Design AI Toolkit plugin from the Figma plugin menu.' },
      { number: 2, title: 'Select Evergreens', description: 'Choose the Evergreens assistant from the assistant selector.' },
      { number: 3, title: 'Search for a pattern', description: 'Type a pattern name or description to find existing Evergreen entries.' },
      { number: 4, title: 'Review or update the entry', description: 'Read the entry details, propose updates, or create a new entry if no match exists.' },
    ],
    quickActions: ['Find a pattern', 'Update an Evergreen', 'Create new entry', 'Check for duplicates'],
    resources: [
      { title: 'Evergreens Content Model', description: 'How Evergreen entries are structured and authored.', tag: 'Doc', href: '#' },
      { title: 'Update Process', description: 'Who can update entries and the review/approval flow.', tag: 'Guide', href: '#' },
      { title: 'Evergreens Figma File', description: 'Figma file for authoring and reviewing pattern entries.', tag: 'Figma', href: '#' },
    ],
    bestPractices: [
      { title: 'Writing Good Evergreens', description: 'Be specific, use real examples from the design system, and link to the Figma component.' },
      { title: 'When to Create vs. Update', description: 'Update an existing entry when adding guidance. Create a new one only when the pattern is truly distinct.' },
      { title: 'Content Model Conventions', description: "Follow the structured fields: name, description, usage guidance, do/don't examples, and Figma link." },
      { title: 'Review Checklist', description: 'Before submitting, verify the entry has been reviewed by at least one lead and all links resolve.' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Content Design', isLead: true, avatarInitials: 'BG' },
        { name: 'FPO Member', role: 'Product Manager', isLead: false, avatarInitials: 'TM' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'SR' },
      ],
      openSlots: [{ role: 'Content Strategist', description: 'Content modeling, taxonomy review, stakeholder alignment', applyHref: '#' }],
    },
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    tagline: 'Run WCAG checks, generate remediation copy, and export audits.',
    accent: '#e07b00',
    icon: Eye,
    status: 'live',
    video: 'accessibility.mp4',
    howToUse: [
      { number: 1, title: 'Select a frame or component in Figma', description: 'Click on the element you want to audit before opening the plugin.' },
      { number: 2, title: 'Open the plugin and select Accessibility', description: 'Launch the Design AI Toolkit and choose the Accessibility assistant.' },
      { number: 3, title: 'Run the check', description: 'Click "Run check" to analyze the selected element against WCAG 2.2 criteria.' },
      { number: 4, title: 'Review findings and export', description: 'Read the findings, generate remediation copy, and export the audit report.' },
    ],
    quickActions: ['Check this component', 'Generate alt text', 'WCAG criteria reference', 'Export audit'],
    resources: [
      { title: 'Accessibility Standards Reference', description: 'WCAG 2.2 criteria mapped to our component library.', tag: 'Doc', href: '#' },
      { title: 'Audit Sheet Template', description: 'Spreadsheet for tracking WCAG review findings.', tag: 'Template', href: '#' },
      { title: 'Remediation Guide', description: 'How to write effective remediation copy for common issues.', tag: 'Guide', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Accessibility', isLead: true, avatarInitials: 'AL' },
        { name: 'FPO Member', role: 'Product Design', isLead: false, avatarInitials: 'PS' },
      ],
      openSlots: [
        { role: 'Engineering', description: 'ARIA implementation review and automated testing integration', applyHref: '#' },
        { role: 'Product', description: 'Stakeholder requirements and compliance tracking', applyHref: '#' },
      ],
    },
  },
  {
    id: 'design-workshop',
    name: 'Design Workshop',
    tagline: 'Structured ideation sessions and workshop artifact export.',
    accent: '#7c3aed',
    icon: Lightbulb,
    status: 'live',
    video: 'design-workshop.mp4',
    howToUse: [
      { number: 1, title: 'Define your workshop goal', description: "Decide what problem you're solving and who the participants are before opening the plugin." },
      { number: 2, title: 'Open the plugin and select Design Workshop', description: 'Launch the Design AI Toolkit and choose the Design Workshop assistant.' },
      { number: 3, title: 'Run a session prompt', description: 'Choose a session type (HMW, concept sprint, prioritization) and provide your context.' },
      { number: 4, title: 'Export workshop artifacts', description: 'Download session outputs as Figma frames, sticky notes, or a summary document.' },
    ],
    quickActions: ['Run ideation session', 'Generate HMW questions', 'Prioritize concepts', 'Export summary'],
    resources: [
      { title: 'Workshop Facilitation Deck', description: 'Slides for running an AI-assisted workshop with your team.', tag: 'Slides', href: '#' },
      { title: 'Session Types Reference', description: 'When to use HMW, concept sprints, and prioritization sessions.', tag: 'Doc', href: '#' },
      { title: 'Workshop Figma Template', description: 'Pre-structured Figma file for workshop artifact capture.', tag: 'Figma', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'UX Research', isLead: true, avatarInitials: 'MK' },
        { name: 'FPO Member', role: 'Product Design', isLead: false, avatarInitials: 'JP' },
      ],
      openSlots: [
        { role: 'UX Design', description: 'Workshop template design and session facilitation', applyHref: '#' },
        { role: 'Product', description: 'Use case definition and stakeholder coordination', applyHref: '#' },
      ],
    },
  },
  {
    id: 'analytics-tagging',
    name: 'Analytics Tagging',
    tagline: 'Generate taxonomy-aligned Jira tags for design handoff.',
    accent: '#008282',
    icon: BarChart2,
    status: 'live',
    video: 'analytics-tagging.mp4',
    howToUse: [
      { number: 1, title: 'Select a component or screen in Figma', description: 'Click on the element you want to tag before opening the plugin.' },
      { number: 2, title: 'Open the plugin and select Analytics Tagging', description: 'Launch the Design AI Toolkit and choose the Analytics Tagging assistant.' },
      { number: 3, title: 'Generate tags', description: 'Click "Generate tags" to get taxonomy-aligned Jira tag suggestions for the selected element.' },
      { number: 4, title: 'Copy tags to Jira', description: 'Review and accept tags, then copy the formatted output directly into your Jira ticket.' },
    ],
    quickActions: ['Tag this component', 'Suggest taxonomy', 'Review existing tags', 'Format for Jira'],
    resources: [
      { title: 'Analytics Taxonomy Spec', description: 'Complete tagging vocabulary, naming conventions, and Jira field mappings.', tag: 'Doc', href: '#' },
      { title: 'Tagging Taxonomy Reference', description: 'Quick-reference card for the most common tag types.', tag: 'Template', href: '#' },
      { title: 'Jira Integration Guide', description: 'How to paste generated tags into Jira and align with the analytics team.', tag: 'Guide', href: '#' },
    ],
    strikeTeam: {
      members: [
        { name: 'FPO Team Lead', role: 'Analytics', isLead: true, avatarInitials: 'AL' },
        { name: 'FPO Member', role: 'Product Design', isLead: false, avatarInitials: 'FP' },
        { name: 'FPO Member', role: 'Engineering', isLead: false, avatarInitials: 'MK' },
      ],
      openSlots: [],
    },
  },
]

export function getAssistant(id: string): Assistant | undefined {
  return ASSISTANTS.find(a => a.id === id)
}

export const LIVE_ASSISTANTS = ASSISTANTS.filter(a => a.status === 'live')
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/data/__tests__/assistants.test.ts
```
Expected: PASS — 6 tests

- [ ] **Step 6: Commit**

```bash
git add site/src/data/
git commit -m "feat(site): add data types and all 5 live assistant entries"
```

---

## Task 5: Data Layer — Roadmap, Resources, StrikeTeams

**Files:**
- Create: `site/src/data/roadmap.ts`
- Create: `site/src/data/resources.ts`
- Create: `site/src/data/strikeTeams.ts`
- Create: `site/src/data/__tests__/roadmap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/data/__tests__/roadmap.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { ROADMAP_ENTRIES } from '../roadmap'

describe('roadmap data', () => {
  it('has 5 live entries', () => {
    expect(ROADMAP_ENTRIES.filter(e => e.status === 'live')).toHaveLength(5)
  })

  it('has at least 6 backlog entries', () => {
    expect(ROADMAP_ENTRIES.filter(e => e.status === 'backlog').length).toBeGreaterThanOrEqual(6)
  })

  it('each entry has id, name, tagline, accent, and status', () => {
    for (const e of ROADMAP_ENTRIES) {
      expect(e.id).toBeTruthy()
      expect(e.name).toBeTruthy()
      expect(e.tagline).toBeTruthy()
      expect(e.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(['live', 'backlog', 'planned']).toContain(e.status)
    }
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/data/__tests__/roadmap.test.ts
```
Expected: FAIL — `Cannot find module '../roadmap'`

- [ ] **Step 3: Create `site/src/data/roadmap.ts`**

```ts
import {
  MessageSquare, Leaf, Eye, Lightbulb, BarChart2,
  Pencil, Layers, Users, Zap, BookOpen, Globe, Sliders,
} from 'lucide-react'
import type { RoadmapEntry } from './types'

export const ROADMAP_ENTRIES: RoadmapEntry[] = [
  // Live
  { id: 'general',           name: 'General',           tagline: 'Open-ended design Q&A and component briefs.',      accent: '#4a90e2', icon: MessageSquare, status: 'live' },
  { id: 'evergreens',        name: 'Evergreens',        tagline: 'Find, update, and create reusable patterns.',       accent: '#007a39', icon: Leaf,          status: 'live' },
  { id: 'accessibility',     name: 'Accessibility',     tagline: 'WCAG checks, remediation copy, and audit exports.', accent: '#e07b00', icon: Eye,           status: 'live' },
  { id: 'design-workshop',   name: 'Design Workshop',   tagline: 'Structured ideation and artifact export.',          accent: '#7c3aed', icon: Lightbulb,     status: 'live' },
  { id: 'analytics-tagging', name: 'Analytics Tagging', tagline: 'Taxonomy-aligned Jira tags for handoff.',           accent: '#008282', icon: BarChart2,     status: 'live' },
  // Backlog
  { id: 'copywriting',       name: 'Copywriting',       tagline: 'UX copy generation for UI components.',             accent: '#c0006a', icon: Pencil,        status: 'backlog' },
  { id: 'component-spec',    name: 'Component Spec',    tagline: 'Auto-generate component spec documentation.',       accent: '#005fcc', icon: Layers,        status: 'backlog' },
  { id: 'user-research',     name: 'User Research',     tagline: 'Research synthesis and insight summaries.',         accent: '#9a5500', icon: Users,         status: 'backlog' },
  { id: 'design-tokens',     name: 'Design Tokens',     tagline: 'Token generation and style guide authoring.',       accent: '#5600cc', icon: Zap,           status: 'backlog' },
  { id: 'onboarding',        name: 'Onboarding',        tagline: 'New designer onboarding flows and checklists.',     accent: '#008282', icon: BookOpen,      status: 'backlog' },
  { id: 'localization',      name: 'Localization',      tagline: 'Internationalization guidance and copy review.',    accent: '#007a60', icon: Globe,         status: 'backlog' },
  // Planned
  { id: 'design-ops',        name: 'Design Ops',        tagline: 'Process automation for design team operations.',    accent: '#555555', icon: Sliders,       status: 'planned' },
]
```

- [ ] **Step 4: Create `site/src/data/resources.ts`**

```ts
export type ResourceItem = {
  title: string
  description: string
  tag: string
  tagColor: string
  source: string
  href: string
  accentColor?: string
}

export type ResourceSection = {
  id: string
  title: string
  iconName: string
  color: string
  items: ResourceItem[]
}

export const RESOURCES_SECTIONS: ResourceSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    iconName: 'map',
    color: '#005fcc',
    items: [
      { title: 'Quick Start: Your First AI-Assisted Design', description: 'Step-by-step walkthrough from opening the plugin to your first generated component.', tag: 'Guide', tagColor: '#005fcc', source: 'Docs', href: '#' },
      { title: 'Installing and Configuring the Plugin', description: 'How to install the Figma plugin, connect your profile, and set your preferences.', tag: 'Video', tagColor: '#c0006a', source: '3 min', href: '#' },
      { title: 'Starter Figma File', description: 'Pre-wired Figma file with component slots, annotation layers, and tagging placeholders.', tag: 'Template', tagColor: '#007a39', source: 'Figma Community', href: '#' },
      { title: 'Choosing the Right Assistant', description: 'Decision guide: which assistant to use for research, documentation, accessibility, and tagging.', tag: 'Guide', tagColor: '#005fcc', source: 'Docs', href: '#' },
    ],
  },
  {
    id: 'templates',
    title: 'Templates',
    iconName: 'layout-template',
    color: '#007a39',
    items: [
      { title: 'Evergreens Content Model', description: 'Figma file for pattern authoring scaffold', tag: 'Figma', tagColor: '#007a39', source: 'Figma', href: '#' },
      { title: 'Accessibility Audit Sheet', description: 'Spreadsheet template for WCAG reviews', tag: 'Sheet', tagColor: '#007a39', source: 'Sheets', href: '#' },
      { title: 'Workshop Facilitation Deck', description: 'Slides for running an AI-assisted workshop', tag: 'Slides', tagColor: '#007a39', source: 'Slides', href: '#' },
      { title: 'Tagging Taxonomy Reference', description: 'Analytics taxonomy for Jira annotation', tag: 'Doc', tagColor: '#007a39', source: 'Doc', href: '#' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Links',
    iconName: 'wrench',
    color: '#9a5500',
    items: [
      { title: 'Figma Plugin — Install', description: 'Install Design AI Toolkit in Figma', tag: 'External', tagColor: '#9a5500', source: 'Figma', href: '#' },
      { title: '#design-ai-toolkit Slack', description: 'Questions, feedback, announcements', tag: 'External', tagColor: '#9a5500', source: 'Slack', href: '#' },
      { title: 'Jira Project Board', description: 'Track requests, bugs, and roadmap items', tag: 'External', tagColor: '#9a5500', source: 'Jira', href: '#' },
      { title: 'GitHub Repository', description: 'Source code and contributing guide', tag: 'External', tagColor: '#9a5500', source: 'GitHub', href: '#' },
    ],
  },
  {
    id: 'documentation',
    title: 'Documentation',
    iconName: 'file-text',
    color: '#5600cc',
    items: [
      { title: 'Data Handling and Privacy Policy', description: 'How prompts, outputs, and Figma data are handled, retained, and secured.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'AI Use Guidelines for Design', description: 'Approved use cases, review obligations, and quality standards for AI-generated outputs.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Evergreens Update Process', description: 'Who can update entries, review steps, and approval flow for new Evergreens.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Accessibility Standards Reference', description: 'WCAG 2.2 criteria mapped to our component library with remediation guidance.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Analytics Taxonomy Spec', description: 'Complete tagging vocabulary, naming conventions, and Jira field mappings.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
      { title: 'Prompt Writing Best Practices', description: 'How to write effective prompts for each assistant to get consistent, high-quality output.', tag: 'Doc', tagColor: '#5600cc', source: 'Internal', href: '#' },
    ],
  },
]
```

- [ ] **Step 5: Create `site/src/data/strikeTeams.ts`**

```ts
// Strike team data is embedded directly in each Assistant entry in assistants.ts.
// This file re-exports helpers used by StrikeTeamSection on the homepage.
import { LIVE_ASSISTANTS } from './assistants'
export type { StrikeTeam, TeamMember, OpenSlot } from './types'

export function getAssistantsWithOpenSlots() {
  return LIVE_ASSISTANTS.filter(a => a.strikeTeam.openSlots.length > 0)
}
```

- [ ] **Step 6: Run roadmap test — verify it passes**

```bash
cd site && npm run test:run -- src/data/__tests__/roadmap.test.ts
```
Expected: PASS — 3 tests

- [ ] **Step 7: Commit**

```bash
git add site/src/data/roadmap.ts site/src/data/resources.ts site/src/data/strikeTeams.ts
git commit -m "feat(site): add roadmap, resources, and strike team data"
```

---

## Task 6: App Shell and Theme Toggle

**Files:**
- Create: `site/src/components/ThemeToggle.tsx`
- Create: `site/src/components/ThemeToggle.module.css`
- Create: `site/src/App.tsx`
- Create: `site/src/main.tsx`
- Create: `site/src/components/__tests__/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/__tests__/ThemeToggle.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'

beforeEach(() => {
  document.documentElement.className = 'theme-mixed'
  localStorage.clear()
})

describe('ThemeToggle', () => {
  it('shows current theme label', () => {
    render(<ThemeToggle />)
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('cycles Mixed → Dark → Light → Mixed on click', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(screen.getByText('Dark')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    expect(screen.getByText('Light')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(document.documentElement.classList.contains('theme-mixed')).toBe(true)
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('persists theme to localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('dat-theme')).toBe('dark')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/components/__tests__/ThemeToggle.test.tsx
```
Expected: FAIL — `Cannot find module '../ThemeToggle'`

- [ ] **Step 3: Create `site/src/components/ThemeToggle.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { Sun, Moon, Blend } from 'lucide-react'
import type { Theme } from '../data/types'
import styles from './ThemeToggle.module.css'

const THEMES: Theme[] = ['mixed', 'dark', 'light']
const LABELS: Record<Theme, string> = { mixed: 'Mixed', dark: 'Dark', light: 'Light' }
const ICONS: Record<Theme, React.ReactNode> = {
  mixed: <Blend size={13} style={{ opacity: 0.7 }} />,
  dark:  <Moon  size={13} style={{ opacity: 0.7 }} />,
  light: <Sun   size={13} style={{ opacity: 0.7 }} />,
}
const LS_KEY = 'dat-theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(LS_KEY) as Theme | null
  return stored && THEMES.includes(stored) ? stored : 'mixed'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.remove('theme-mixed', 'theme-dark', 'theme-light')
    document.documentElement.classList.add(`theme-${theme}`)
    localStorage.setItem(LS_KEY, theme)
  }, [theme])

  function cycle() {
    setTheme(t => {
      const idx = THEMES.indexOf(t)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }

  return (
    <button className={styles.toggle} onClick={cycle} aria-label={`Theme: ${LABELS[theme]}`}>
      {ICONS[theme]}
      <span>{LABELS[theme]}</span>
    </button>
  )
}
```

- [ ] **Step 4: Create `site/src/components/ThemeToggle.module.css`**

```css
.toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-sm);
  color: rgba(255,255,255,0.7);
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s;
}
.toggle:hover { background: rgba(255,255,255,0.13); }
```

- [ ] **Step 5: Create `site/src/App.tsx`**

```tsx
import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { AssistantPage } from './pages/AssistantPage'
import { Roadmap } from './pages/Roadmap'
import { Resources } from './pages/Resources'
import type { Theme } from './data/types'

const LS_KEY = 'dat-theme'

function applyStoredTheme() {
  const stored = localStorage.getItem(LS_KEY) as Theme | null
  const theme = stored ?? 'mixed'
  document.documentElement.classList.remove('theme-mixed', 'theme-dark', 'theme-light')
  document.documentElement.classList.add(`theme-${theme}`)
}

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/assistants', element: <Navigate to="/" replace /> },
  { path: '/assistants/:slug', element: <AssistantPage /> },
  { path: '/roadmap', element: <Roadmap /> },
  { path: '/resources', element: <Resources /> },
], { basename: import.meta.env.BASE_URL })

export function App() {
  useEffect(() => { applyStoredTheme() }, [])
  return <RouterProvider router={router} />
}
```

- [ ] **Step 6: Create `site/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/fonts.css'
import './styles/global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/components/__tests__/ThemeToggle.test.tsx
```
Expected: PASS — 3 tests

- [ ] **Step 8: Commit**

```bash
git add site/src/
git commit -m "feat(site): add ThemeToggle, App router, and main entry"
```

---

## Task 7: Nav and Footer

**Files:**
- Create: `site/src/components/Nav.tsx` + `Nav.module.css`
- Create: `site/src/components/Footer.tsx` + `Footer.module.css`
- Create: `site/src/components/__tests__/Nav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/__tests__/Nav.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Nav } from '../Nav'

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
    </MemoryRouter>
  )
}

describe('Nav', () => {
  it('renders the logo wordmark', () => {
    renderNav()
    expect(screen.getByText('Design AI Toolkit')).toBeInTheDocument()
  })

  it('renders Roadmap and Resources links', () => {
    renderNav()
    expect(screen.getByRole('link', { name: /roadmap/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /resources/i })).toBeInTheDocument()
  })

  it('Roadmap link is active on /roadmap', () => {
    renderNav('/roadmap')
    const link = screen.getByRole('link', { name: /roadmap/i })
    expect(link.className).toMatch(/active/)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/components/__tests__/Nav.test.tsx
```
Expected: FAIL — `Cannot find module '../Nav'`

- [ ] **Step 3: Create `site/src/components/Nav.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import styles from './Nav.module.css'

export function Nav() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.logo}>
        <span className={styles.logoIcon}><Cpu size={15} style={{ opacity: 0.7 }} /></span>
        Design AI Toolkit
      </NavLink>
      <div className={styles.links}>
        <NavLink
          to="/"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
          end
        >
          Assistants
        </NavLink>
        <NavLink
          to="/roadmap"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Roadmap
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Resources
        </NavLink>
        <ThemeToggle />
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create `site/src/components/Nav.module.css`**

```css
.nav {
  background: var(--bg-nav);
  height: 52px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}
.logoIcon {
  width: 28px; height: 28px;
  background: var(--accent);
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
}
.links {
  display: flex;
  align-items: center;
  gap: 24px;
}
.link {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.01em;
  transition: color 0.15s;
}
.link:hover { color: rgba(255,255,255,0.85); }
.active { color: #fff !important; }
```

- [ ] **Step 5: Create `site/src/components/Footer.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.logo}>
          <span className={styles.logoIcon}><Cpu size={13} style={{ opacity: 0.7 }} /></span>
          Design AI Toolkit
        </span>
        <span className={styles.copy}>© {new Date().getFullYear()} — All rights reserved</span>
      </div>
      <nav className={styles.links}>
        <NavLink to="/" className={styles.link}>Assistants</NavLink>
        <NavLink to="/roadmap" className={styles.link}>Roadmap</NavLink>
        <NavLink to="/resources" className={styles.link}>Resources</NavLink>
      </nav>
    </footer>
  )
}
```

- [ ] **Step 6: Create `site/src/components/Footer.module.css`**

```css
.footer {
  background: var(--bg-nav);
  padding: 28px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.left { display: flex; flex-direction: column; gap: 4px; }
.logo {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 700; color: #fff;
}
.logoIcon {
  width: 22px; height: 22px;
  background: var(--accent);
  border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
}
.copy { font-size: 11px; color: rgba(255,255,255,0.3); }
.links { display: flex; gap: 20px; }
.link { font-size: 12px; color: rgba(255,255,255,0.45); transition: color 0.15s; }
.link:hover { color: rgba(255,255,255,0.8); }
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/components/__tests__/Nav.test.tsx
```
Expected: PASS — 3 tests

- [ ] **Step 8: Commit**

```bash
git add site/src/components/Nav.tsx site/src/components/Nav.module.css \
        site/src/components/Footer.tsx site/src/components/Footer.module.css
git commit -m "feat(site): add Nav and Footer components"
```

---

## Task 8: AssistantCard and VideoPlayer

**Files:**
- Create: `site/src/components/AssistantCard.tsx` + `AssistantCard.module.css`
- Create: `site/src/components/VideoPlayer.tsx` + `VideoPlayer.module.css`
- Create: `site/src/components/__tests__/AssistantCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/__tests__/AssistantCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AssistantCard } from '../AssistantCard'
import { ASSISTANTS } from '../../data/assistants'

describe('AssistantCard', () => {
  it('renders assistant name', () => {
    const a = ASSISTANTS[0]
    render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    expect(screen.getByText(a.name)).toBeInTheDocument()
  })

  it('applies --ac-color CSS variable from accent', () => {
    const a = ASSISTANTS[1] // evergreens, #007a39
    const { container } = render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    const card = container.firstChild as HTMLElement
    expect(card.style.getPropertyValue('--ac-color')).toBe('#007a39')
  })

  it('renders a link to the assistant page', () => {
    const a = ASSISTANTS[0]
    render(<MemoryRouter><AssistantCard assistant={a} /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(`/assistants/${a.id}`)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/components/__tests__/AssistantCard.test.tsx
```
Expected: FAIL — `Cannot find module '../AssistantCard'`

- [ ] **Step 3: Create `site/src/components/AssistantCard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Assistant } from '../data/types'
import styles from './AssistantCard.module.css'

type Props = { assistant: Assistant }

export function AssistantCard({ assistant }: Props) {
  const { id, name, tagline, accent, icon: Icon } = assistant
  return (
    <div
      className={styles.card}
      style={{ '--ac-color': accent } as React.CSSProperties}
    >
      <div className={styles.iconWrap}>
        <Icon size={18} style={{ opacity: 0.7 }} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.tagline}>{tagline}</p>
      </div>
      <Link to={`/assistants/${id}`} className={styles.cta}>
        Open <ArrowRight size={12} />
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/components/AssistantCard.module.css`**

```css
.card {
  background: color-mix(in srgb, var(--ac-color) 8%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--ac-color) 25%, transparent);
  border-left: 3px solid var(--ac-color);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.iconWrap {
  width: 36px; height: 36px;
  background: var(--ac-color);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.tagline { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 2px; }
.body { flex: 1; }
.cta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600;
  color: var(--ac-color);
  transition: gap 0.15s;
}
.cta:hover { gap: 8px; }
```

- [ ] **Step 5: Create `site/src/components/VideoPlayer.tsx`**

```tsx
import { useState, useRef } from 'react'
import { Play } from 'lucide-react'
import styles from './VideoPlayer.module.css'

type Props = { src: string; poster?: string; title: string }

export function VideoPlayer({ src, poster, title }: Props) {
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)

  function handlePlay() {
    setPlaying(true)
    ref.current?.play()
  }

  return (
    <div className={styles.wrap}>
      <video
        ref={ref}
        className={styles.video}
        src={src}
        poster={poster}
        controls={playing}
        aria-label={title}
      />
      {!playing && (
        <button className={styles.playBtn} onClick={handlePlay} aria-label={`Play ${title}`}>
          <Play size={28} style={{ opacity: 0.9 }} />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `site/src/components/VideoPlayer.module.css`**

```css
.wrap {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: #000;
  aspect-ratio: 16/9;
}
.video { width: 100%; height: 100%; object-fit: cover; display: block; }
.playBtn {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35);
  color: #fff;
  transition: background 0.15s;
}
.playBtn:hover { background: rgba(0,0,0,0.5); }
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/components/__tests__/AssistantCard.test.tsx
```
Expected: PASS — 3 tests

- [ ] **Step 8: Commit**

```bash
git add site/src/components/AssistantCard.tsx site/src/components/AssistantCard.module.css \
        site/src/components/VideoPlayer.tsx site/src/components/VideoPlayer.module.css
git commit -m "feat(site): add AssistantCard and VideoPlayer components"
```

---

## Task 9: FeedbackPanel, StrikeTeamSection, StrikeTeamProfile

**Files:**
- Create: `site/src/components/FeedbackPanel.tsx` + `FeedbackPanel.module.css`
- Create: `site/src/components/StrikeTeamSection.tsx` + `StrikeTeamSection.module.css`
- Create: `site/src/components/StrikeTeamProfile.tsx` + `StrikeTeamProfile.module.css`
- Create: `site/src/components/__tests__/FeedbackPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/__tests__/FeedbackPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedbackPanel } from '../FeedbackPanel'

describe('FeedbackPanel', () => {
  it('renders Report a Bug panel', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    expect(screen.getByText(/report a bug/i)).toBeInTheDocument()
  })

  it('renders Request a Change panel', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    expect(screen.getByText(/request a change/i)).toBeInTheDocument()
  })

  it('bug link has correct href', () => {
    render(<FeedbackPanel bugHref="https://jira.example.com/bug" changeHref="https://jira.example.com/change" />)
    const link = screen.getByRole('link', { name: /report a bug/i })
    expect(link.getAttribute('href')).toBe('https://jira.example.com/bug')
  })

  it('renders as links, not form submit buttons', () => {
    render(<FeedbackPanel bugHref="#" changeHref="#" />)
    const buttons = screen.queryAllByRole('button', { name: /submit/i })
    expect(buttons).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/components/__tests__/FeedbackPanel.test.tsx
```
Expected: FAIL — `Cannot find module '../FeedbackPanel'`

- [ ] **Step 3: Create `site/src/components/FeedbackPanel.tsx`**

```tsx
import { Bug, GitPullRequest } from 'lucide-react'
import styles from './FeedbackPanel.module.css'

type Props = { bugHref: string; changeHref: string }

export function FeedbackPanel({ bugHref, changeHref }: Props) {
  return (
    <div className={styles.wrap}>
      <a href={bugHref} target="_blank" rel="noopener noreferrer" className={styles.panel}>
        <div className={styles.iconWrap} style={{ background: '#d50c7d' }}>
          <Bug size={18} style={{ opacity: 0.7, color: '#fff' }} />
        </div>
        <div>
          <div className={styles.title}>Report a Bug</div>
          <div className={styles.desc}>Found something broken? Open a Jira ticket and we'll triage it.</div>
        </div>
        <span className={styles.cta}>Open Jira →</span>
      </a>
      <a href={changeHref} target="_blank" rel="noopener noreferrer" className={styles.panel}>
        <div className={styles.iconWrap} style={{ background: '#005fcc' }}>
          <GitPullRequest size={18} style={{ opacity: 0.7, color: '#fff' }} />
        </div>
        <div>
          <div className={styles.title}>Request a Change</div>
          <div className={styles.desc}>Want new functionality or a behavior update? Submit a change request.</div>
        </div>
        <span className={styles.cta}>Open Jira →</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/components/FeedbackPanel.module.css`**

```css
.wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.panel:hover {
  border-color: #ccc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.iconWrap {
  width: 38px; height: 38px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
}
.title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.desc  { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.cta   { font-size: 12px; font-weight: 600; color: var(--accent); margin-top: auto; }
```

- [ ] **Step 5: Create `site/src/components/StrikeTeamSection.tsx`**

```tsx
import { ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAssistantsWithOpenSlots } from '../data/strikeTeams'
import styles from './StrikeTeamSection.module.css'

export function StrikeTeamSection() {
  const teams = getAssistantsWithOpenSlots().slice(0, 3)

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Strike Teams</div>
          <h2 className={styles.headline}>Build the tools.<br /><span className={styles.accent}>Join the team.</span></h2>
          <p className={styles.body}>Each assistant is maintained by a small cross-functional Strike Team. Join an existing team, fill an open slot, or submit a proposal to start a new one.</p>
        </div>
        <div className={styles.actions}>
          <a href="#" className={styles.btnPrimary}><Plus size={13} /> Propose a New Assistant</a>
          <button className={styles.btnGhost}>Browse All Teams</button>
        </div>
      </div>
      <div className={styles.grid}>
        {teams.map(a => (
          <div key={a.id} className={styles.card} style={{ '--ac-color': a.accent } as React.CSSProperties}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><a.icon size={14} style={{ opacity: 0.7 }} /></span>
              <span className={styles.cardName}>{a.name}</span>
            </div>
            <div className={styles.avatars}>
              {a.strikeTeam.members.slice(0, 3).map(m => (
                <span key={m.avatarInitials} className={styles.avatar}>{m.avatarInitials}</span>
              ))}
              {a.strikeTeam.openSlots.map((_, i) => (
                <span key={`slot-${i}`} className={styles.avatarEmpty} />
              ))}
            </div>
            <div className={styles.chips}>
              {a.strikeTeam.openSlots.map(s => (
                <span key={s.role} className={styles.chip}>{s.role} open</span>
              ))}
            </div>
            <Link to={`/assistants/${a.id}`} className={styles.viewLink}>
              View team and apply <ArrowRight size={11} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Create `site/src/components/StrikeTeamSection.module.css`**

```css
.section { background: var(--bg-section-alt); padding: 64px 40px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; gap: 24px; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
.headline { font-size: 32px; font-weight: 800; color: var(--text-on-dark); line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 12px; font-family: var(--font-display); }
.accent { color: var(--accent); }
.body { font-size: 13px; color: var(--text-on-dark-muted); max-width: 400px; line-height: 1.6; }
.actions { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; flex-shrink: 0; }
.btnPrimary {
  display: flex; align-items: center; gap: 6px;
  background: var(--accent); color: #fff;
  border-radius: var(--radius-sm); padding: 9px 16px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
}
.btnGhost {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.7); border-radius: var(--radius-sm);
  padding: 8px 16px; font-size: 12px; font-weight: 500;
}
.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 3px solid var(--ac-color);
  border-radius: var(--radius-card); padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.cardHeader { display: flex; align-items: center; gap: 8px; }
.cardIcon { width: 26px; height: 26px; background: var(--ac-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; }
.cardName { font-size: 13px; font-weight: 700; color: var(--text-on-dark); }
.avatars { display: flex; gap: 4px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--ac-color); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; }
.avatarEmpty { width: 28px; height: 28px; border-radius: 50%; border: 1.5px dashed rgba(255,255,255,0.25); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.65); }
.viewLink { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--ac-color); margin-top: auto; }
```

- [ ] **Step 7: Create `site/src/components/StrikeTeamProfile.tsx`**

```tsx
import { UserPlus } from 'lucide-react'
import type { StrikeTeam } from '../data/types'
import styles from './StrikeTeamProfile.module.css'

type Props = { teamName: string; strikeTeam: StrikeTeam }

export function StrikeTeamProfile({ teamName, strikeTeam }: Props) {
  const { members, openSlots } = strikeTeam
  return (
    <section className={styles.section}>
      <div className={styles.eyebrow}>Strike Team</div>
      <h2 className={styles.headline}>Meet the {teamName} team</h2>
      <p className={styles.subtext}>A cross-functional group responsible for building, maintaining, and improving this assistant. Open slots are listed below.</p>
      <div className={styles.body}>
        <div className={styles.members}>
          <div className={styles.listLabel}>Current Members</div>
          {members.map(m => (
            <div key={m.name} className={styles.memberRow}>
              <span className={styles.avatar}>{m.avatarInitials}</span>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.name}</span>
                <span className={styles.memberRole}>{m.role}</span>
              </div>
              <span className={styles.badge} data-lead={m.isLead}>{m.isLead ? 'Lead' : 'Member'}</span>
            </div>
          ))}
        </div>
        <div className={styles.slots}>
          <div className={styles.slotsHeader}>
            <UserPlus size={14} />
            <span>Open Slots</span>
            <span className={styles.slotCount}>{openSlots.length} position{openSlots.length !== 1 ? 's' : ''} available</span>
          </div>
          {openSlots.length > 0 ? (
            <>
              {openSlots.map(s => (
                <div key={s.role} className={styles.slotRow}>
                  <div className={styles.slotInfo}>
                    <div className={styles.slotRole}>{s.role}</div>
                    <div className={styles.slotDesc}>{s.desc ?? s.description}</div>
                  </div>
                  <a href={s.applyHref} className={styles.applyLink}>+ Apply</a>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.noSlots}>Team is full. Check back for future openings.</p>
          )}
          <a href="#" className={styles.interestBtn}>Express Interest</a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Create `site/src/components/StrikeTeamProfile.module.css`**

```css
.section { background: var(--bg-card); border-top: 1px solid var(--border-card); padding: 56px 40px; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
.headline { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; font-family: var(--font-display); }
.subtext { font-size: 13px; color: var(--text-muted); max-width: 560px; line-height: 1.6; margin-bottom: 32px; }
.body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 800px; }
.listLabel { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 12px; }
.members { display: flex; flex-direction: column; gap: 4px; }
.memberRow { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); background: var(--bg-body); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--ac-color, var(--accent)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.memberInfo { flex: 1; }
.memberName { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); }
.memberRole { display: block; font-size: 11px; color: var(--text-muted); }
.badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
.badge[data-lead="true"] { background: rgba(213,12,125,0.1); color: var(--accent); }
.badge[data-lead="false"] { background: #f0f0f0; color: #666; }
.slots { border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: 18px; }
.slotsHeader { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; }
.slotCount { margin-left: auto; font-size: 11px; color: var(--text-muted); font-weight: 400; }
.slotRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--border-card); }
.slotRow:last-of-type { border-bottom: none; }
.slotRole { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.slotDesc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.applyLink { font-size: 11px; font-weight: 600; color: var(--ac-color, var(--accent)); white-space: nowrap; }
.noSlots { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.interestBtn { display: flex; align-items: center; justify-content: center; margin-top: 14px; background: var(--accent); color: #fff; border-radius: var(--radius-sm); padding: 9px; font-size: 12px; font-weight: 600; }
```

- [ ] **Step 9: Run FeedbackPanel test — verify it passes**

```bash
cd site && npm run test:run -- src/components/__tests__/FeedbackPanel.test.tsx
```
Expected: PASS — 4 tests

- [ ] **Step 10: Commit**

```bash
git add site/src/components/FeedbackPanel.tsx site/src/components/FeedbackPanel.module.css \
        site/src/components/StrikeTeamSection.tsx site/src/components/StrikeTeamSection.module.css \
        site/src/components/StrikeTeamProfile.tsx site/src/components/StrikeTeamProfile.module.css
git commit -m "feat(site): add FeedbackPanel, StrikeTeamSection, StrikeTeamProfile"
```

---

## Task 10: RoadmapCard and ResourceCard

**Files:**
- Create: `site/src/components/RoadmapCard.tsx` + `RoadmapCard.module.css`
- Create: `site/src/components/ResourceCard.tsx` + `ResourceCard.module.css`
- Create: `site/src/components/__tests__/RoadmapCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/__tests__/RoadmapCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoadmapCard } from '../RoadmapCard'
import { ROADMAP_ENTRIES } from '../../data/roadmap'

describe('RoadmapCard', () => {
  it('renders entry name', () => {
    const entry = ROADMAP_ENTRIES[0]
    render(<MemoryRouter><RoadmapCard entry={entry} /></MemoryRouter>)
    expect(screen.getByText(entry.name)).toBeInTheDocument()
  })

  it('applies --ac-color from entry accent', () => {
    const entry = ROADMAP_ENTRIES[1] // evergreens
    const { container } = render(<MemoryRouter><RoadmapCard entry={entry} /></MemoryRouter>)
    const card = container.firstChild as HTMLElement
    expect(card.style.getPropertyValue('--ac-color')).toBe(entry.accent)
  })

  it('live entries link to assistant page', () => {
    const live = ROADMAP_ENTRIES.find(e => e.status === 'live')!
    render(<MemoryRouter><RoadmapCard entry={live} /></MemoryRouter>)
    expect(screen.getByRole('link').getAttribute('href')).toBe(`/assistants/${live.id}`)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/components/__tests__/RoadmapCard.test.tsx
```
Expected: FAIL — `Cannot find module '../RoadmapCard'`

- [ ] **Step 3: Create `site/src/components/RoadmapCard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import type { RoadmapEntry } from '../data/types'
import styles from './RoadmapCard.module.css'

type Props = { entry: RoadmapEntry }

export function RoadmapCard({ entry }: Props) {
  const { id, name, tagline, accent, icon: Icon, status } = entry
  const isLive = status === 'live'
  return (
    <div className={styles.card} style={{ '--ac-color': accent } as React.CSSProperties}>
      <div className={styles.iconWrap}><Icon size={15} style={{ opacity: 0.7 }} /></div>
      <div className={styles.body}>
        <div className={styles.name}>{name}</div>
        <div className={styles.tagline}>{tagline}</div>
      </div>
      {isLive && (
        <Link to={`/assistants/${id}`} className={styles.link}>Open →</Link>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/components/RoadmapCard.module.css`**

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-left: 3px solid var(--ac-color);
  border-radius: var(--radius-card);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.iconWrap {
  width: 30px; height: 30px;
  background: var(--ac-color);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.tagline { font-size: 11px; color: var(--text-muted); line-height: 1.5; margin-top: 2px; }
.body { flex: 1; }
.link { font-size: 11px; font-weight: 600; color: var(--ac-color); }
```

- [ ] **Step 5: Create `site/src/components/ResourceCard.tsx`**

```tsx
import { ArrowRight } from 'lucide-react'
import type { ResourceItem } from '../data/resources'
import styles from './ResourceCard.module.css'

type Props = { item: ResourceItem }

export function ResourceCard({ item }: Props) {
  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <div className={styles.top}>
        <span className={styles.tag} style={{ color: item.tagColor, background: `${item.tagColor}18` }}>
          {item.tag}
        </span>
      </div>
      <div className={styles.title}>{item.title}</div>
      <div className={styles.desc}>{item.description}</div>
      <div className={styles.footer}>
        <span className={styles.source}>{item.source}</span>
        <ArrowRight size={11} className={styles.arrow} />
      </div>
    </a>
  )
}
```

- [ ] **Step 6: Create `site/src/components/ResourceCard.module.css`**

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.card:hover { border-color: #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
.top { display: flex; justify-content: flex-end; }
.tag { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 6px; border-radius: var(--radius-xs); }
.title { font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
.desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; flex: 1; }
.footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border-card); }
.source { font-size: 10px; color: var(--text-subtle); }
.arrow { color: #bbb; }
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/components/__tests__/RoadmapCard.test.tsx
```
Expected: PASS — 3 tests

- [ ] **Step 8: Commit**

```bash
git add site/src/components/RoadmapCard.tsx site/src/components/RoadmapCard.module.css \
        site/src/components/ResourceCard.tsx site/src/components/ResourceCard.module.css
git commit -m "feat(site): add RoadmapCard and ResourceCard components"
```

---

## Task 11: Homepage

**Files:**
- Create: `site/src/pages/Home.tsx` + `Home.module.css`
- Create: `site/src/pages/__tests__/Home.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/pages/__tests__/Home.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '../Home'
import { LIVE_ASSISTANTS } from '../../data/assistants'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

describe('Home page', () => {
  it('renders all 5 assistant cards', () => {
    renderHome()
    for (const a of LIVE_ASSISTANTS) {
      expect(screen.getByText(a.name)).toBeInTheDocument()
    }
  })

  it('renders the hero headline', () => {
    renderHome()
    expect(screen.getByText(/design moves fast/i)).toBeInTheDocument()
  })

  it('renders the Strike Teams section headline', () => {
    renderHome()
    expect(screen.getByText(/build the tools/i)).toBeInTheDocument()
  })

  it('renders the Explore Assistants CTA', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /explore assistants/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/pages/__tests__/Home.test.tsx
```
Expected: FAIL — `Cannot find module '../Home'`

- [ ] **Step 3: Create `site/src/pages/Home.tsx`**

```tsx
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { AssistantCard } from '../components/AssistantCard'
import { StrikeTeamSection } from '../components/StrikeTeamSection'
import { LIVE_ASSISTANTS } from '../data/assistants'
import styles from './Home.module.css'

const PHILOSOPHY = [
  { icon: '⚡', title: 'Speed without shortcuts', body: 'AI-assisted design compresses research, documentation, and ideation cycles — so your team can move faster without cutting corners.' },
  { icon: '🎯', title: 'Consistency at scale', body: 'From Evergreens to accessibility, every assistant is wired to your design system, standards, and taxonomy by default.' },
  { icon: '💡', title: 'Confident decisions', body: 'Better context, faster synthesis, and real-time guidance means your team ships with more confidence and less second-guessing.' },
]

export function Home() {
  return (
    <div className={styles.page}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>Design AI Toolkit</div>
        <h1 className={styles.heroHeadline}>
          Design moves fast.<br />
          <span className={styles.heroAccent}>Your tools should too.</span>
        </h1>
        <p className={styles.heroSub}>Five AI assistants built for designers — wired to your system, your standards, and your workflow.</p>
        <div className={styles.heroCtas}>
          <a href="#assistants" className={styles.btnPrimary}>Explore Assistants</a>
          <a href="/roadmap" className={styles.btnGhost}>View Roadmap</a>
        </div>
      </section>

      {/* Philosophy */}
      <section className={styles.philosophy}>
        {PHILOSOPHY.map(p => (
          <div key={p.title} className={styles.philCard}>
            <div className={styles.philIcon}>{p.icon}</div>
            <h3 className={styles.philTitle}>{p.title}</h3>
            <p className={styles.philBody}>{p.body}</p>
          </div>
        ))}
      </section>

      {/* Assistants grid */}
      <section id="assistants" className={styles.assistants}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Assistants</div>
          <h2 className={styles.sectionTitle}>Five tools. One toolkit.</h2>
        </div>
        <div className={styles.grid}>
          {LIVE_ASSISTANTS.map(a => <AssistantCard key={a.id} assistant={a} />)}
        </div>
      </section>

      {/* Strike Teams */}
      <StrikeTeamSection />

      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/pages/Home.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }

/* Hero */
.hero { background: var(--bg-hero); padding: 72px 40px 64px; text-align: center; }
.heroEyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 16px; }
.heroHeadline { font-size: 52px; font-weight: 800; color: var(--text-on-dark); line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px; font-family: var(--font-display); }
.heroAccent { color: var(--accent); }
.heroSub { font-size: 16px; color: var(--text-on-dark-muted); max-width: 500px; margin: 0 auto 32px; line-height: 1.6; }
.heroCtas { display: flex; gap: 12px; justify-content: center; }
.btnPrimary { background: var(--accent); color: #fff; border-radius: var(--radius-sm); padding: 11px 22px; font-size: 13px; font-weight: 600; }
.btnGhost { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.8); border-radius: var(--radius-sm); padding: 10px 22px; font-size: 13px; font-weight: 500; }

/* Philosophy */
.philosophy { background: var(--bg-section-alt); padding: 56px 40px; display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.philCard { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-card); padding: 28px; }
.philIcon { width: 40px; height: 40px; background: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 16px; }
.philTitle { font-size: 15px; font-weight: 700; color: var(--text-on-dark); margin-bottom: 8px; }
.philBody { font-size: 13px; color: var(--text-on-dark-muted); line-height: 1.65; }

/* Assistants section */
.assistants { padding: 56px 40px; background: var(--bg-body); }
.sectionHeader { margin-bottom: 28px; }
.sectionEyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.sectionTitle { font-size: 28px; font-weight: 800; color: var(--text-primary); font-family: var(--font-display); }
.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/pages/__tests__/Home.test.tsx
```
Expected: PASS — 4 tests

- [ ] **Step 6: Verify dev server renders homepage**

```bash
cd site && npm run dev
```
Open `http://localhost:5173`. Verify hero, philosophy cards, 5 assistant cards, and strike teams section render.

- [ ] **Step 7: Commit**

```bash
git add site/src/pages/Home.tsx site/src/pages/Home.module.css
git commit -m "feat(site): add Homepage with hero, philosophy, assistant grid, and strike teams"
```

---

## Task 12: AssistantPage Template

**Files:**
- Create: `site/src/pages/AssistantPage.tsx` + `AssistantPage.module.css`
- Create: `site/src/pages/__tests__/AssistantPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/pages/__tests__/AssistantPage.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AssistantPage } from '../AssistantPage'

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/assistants/${slug}`]}>
      <Routes>
        <Route path="/assistants/:slug" element={<AssistantPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AssistantPage', () => {
  it('renders General assistant name', () => {
    renderAt('general')
    expect(screen.getByRole('heading', { name: /general/i })).toBeInTheDocument()
  })

  it('renders Evergreens assistant name', () => {
    renderAt('evergreens')
    expect(screen.getByRole('heading', { name: /evergreens/i })).toBeInTheDocument()
  })

  it('renders Best Practices section only for evergreens', () => {
    renderAt('evergreens')
    expect(screen.getByText(/best practices/i)).toBeInTheDocument()
  })

  it('does not render Best Practices for non-evergreens', () => {
    renderAt('general')
    expect(screen.queryByText(/best practices/i)).not.toBeInTheDocument()
  })

  it('redirects to / for unknown slug', () => {
    renderAt('does-not-exist')
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/pages/__tests__/AssistantPage.test.tsx
```
Expected: FAIL — `Cannot find module '../AssistantPage'`

- [ ] **Step 3: Create `site/src/pages/AssistantPage.tsx`**

```tsx
import { useParams, Navigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { VideoPlayer } from '../components/VideoPlayer'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { StrikeTeamProfile } from '../components/StrikeTeamProfile'
import { getAssistant } from '../data/assistants'
import styles from './AssistantPage.module.css'

export function AssistantPage() {
  const { slug } = useParams<{ slug: string }>()
  const assistant = getAssistant(slug ?? '')

  if (!assistant) return <Navigate to="/" replace />

  const { name, tagline, accent, icon: Icon, video, howToUse, quickActions, resources, bestPractices, strikeTeam } = assistant

  return (
    <div className={styles.page} style={{ '--ac-color': accent } as React.CSSProperties}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}><span className={styles.eyebrowBorder} />{name}</div>
        <h1 className={styles.headline}>{name}</h1>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.heroCtas}>
          <a href="#" className={styles.btnPrimary}><Icon size={13} style={{ opacity: 0.7 }} /> Open in Figma</a>
          <a href="#feedback" className={styles.btnGhost}>Submit Feedback</a>
        </div>
      </section>

      {/* Video */}
      <section className={styles.section}>
        <VideoPlayer src={`/videos/${video}`} title={`${name} assistant walkthrough`} />
      </section>

      {/* How to Use */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>How to Use</div>
        <h2 className={styles.sectionTitle}>Get started in four steps</h2>
        <div className={styles.stepsGrid}>
          {howToUse.map(step => (
            <div key={step.number} className={styles.stepCard}>
              <span className={styles.stepNum}>{step.number}</span>
              <div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.chips}>
          {quickActions.map(q => (
            <span key={q} className={styles.chip}>{q}</span>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>Resources</div>
        <h2 className={styles.sectionTitle}>Helpful links</h2>
        <div className={styles.resourcesGrid}>
          {resources.map(r => (
            <a key={r.title} href={r.href} target="_blank" rel="noopener noreferrer" className={styles.resourceCard}>
              <span className={styles.resourceTag} style={{ color: accent, background: `${accent}18` }}>{r.tag}</span>
              <div className={styles.resourceTitle}>{r.title}</div>
              <div className={styles.resourceDesc}>{r.description}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Best Practices — Evergreens only */}
      {bestPractices && (
        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>Best Practices</div>
          <h2 className={styles.sectionTitle}>Working with Evergreens</h2>
          <div className={styles.bpGrid}>
            {bestPractices.map(bp => (
              <div key={bp.title} className={styles.bpCard}>
                <div className={styles.bpTitle}>{bp.title}</div>
                <div className={styles.bpDesc}>{bp.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strike Team */}
      <StrikeTeamProfile teamName={name} strikeTeam={strikeTeam} />

      {/* Feedback */}
      <section id="feedback" className={styles.section}>
        <div className={styles.sectionEyebrow}>Feedback</div>
        <h2 className={styles.sectionTitle}>Get in touch</h2>
        <FeedbackPanel bugHref="#" changeHref="#" />
      </section>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/pages/AssistantPage.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }

.hero { background: var(--bg-hero); padding: 56px 40px 48px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ac-color); margin-bottom: 14px; }
.eyebrowBorder { display: block; width: 3px; height: 14px; background: var(--ac-color); border-radius: 2px; }
.headline { font-size: 40px; font-weight: 800; color: var(--text-on-dark); font-family: var(--font-display); letter-spacing: -0.02em; margin-bottom: 10px; }
.tagline { font-size: 15px; color: var(--text-on-dark-muted); max-width: 480px; line-height: 1.6; margin-bottom: 24px; }
.heroCtas { display: flex; gap: 12px; }
.btnPrimary { display: flex; align-items: center; gap: 6px; background: var(--ac-color); color: #fff; border-radius: var(--radius-sm); padding: 10px 18px; font-size: 13px; font-weight: 600; }
.btnGhost { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.75); border-radius: var(--radius-sm); padding: 9px 18px; font-size: 13px; }

.section { padding: 52px 40px; background: var(--bg-body); border-top: 1px solid var(--border-card); }
.sectionEyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ac-color); margin-bottom: 6px; }
.sectionTitle { font-size: 22px; font-weight: 800; color: var(--text-primary); font-family: var(--font-display); margin-bottom: 24px; }

.stepsGrid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 20px; }
.stepCard { display: flex; gap: 14px; align-items: flex-start; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: 18px; }
.stepNum { width: 28px; height: 28px; border-radius: 50%; background: var(--ac-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.stepTitle { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.stepDesc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { background: color-mix(in srgb, var(--ac-color) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ac-color) 25%, transparent); color: var(--ac-color); border-radius: 20px; padding: 5px 12px; font-size: 11px; font-weight: 600; }

.resourcesGrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.resourceCard { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s; }
.resourceCard:hover { border-color: #ccc; }
.resourceTag { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; align-self: flex-start; }
.resourceTitle { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.resourceDesc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

.bpGrid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
.bpCard { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: 20px; }
.bpTitle { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.bpDesc { font-size: 12px; color: var(--text-muted); line-height: 1.55; }
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/pages/__tests__/AssistantPage.test.tsx
```
Expected: PASS — 5 tests

- [ ] **Step 6: Verify in browser for all 5 slugs**

With `npm run dev` running, visit:
- `http://localhost:5173/assistants/general`
- `http://localhost:5173/assistants/evergreens` (must show Best Practices section)
- `http://localhost:5173/assistants/accessibility`
- `http://localhost:5173/assistants/design-workshop`
- `http://localhost:5173/assistants/analytics-tagging`
- `http://localhost:5173/assistants/unknown` (must redirect to `/`)

- [ ] **Step 7: Commit**

```bash
git add site/src/pages/AssistantPage.tsx site/src/pages/AssistantPage.module.css
git commit -m "feat(site): add AssistantPage template with all sections"
```

---

## Task 13: Roadmap Page

**Files:**
- Create: `site/src/pages/Roadmap.tsx` + `Roadmap.module.css`
- Create: `site/src/pages/__tests__/Roadmap.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/pages/__tests__/Roadmap.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Roadmap } from '../Roadmap'

function renderRoadmap() {
  return render(<MemoryRouter><Roadmap /></MemoryRouter>)
}

describe('Roadmap page', () => {
  it('renders Live column heading', () => {
    renderRoadmap()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('renders Backlog column heading', () => {
    renderRoadmap()
    expect(screen.getByText('Backlog')).toBeInTheDocument()
  })

  it('shows all live assistant names by default', () => {
    renderRoadmap()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Evergreens')).toBeInTheDocument()
  })

  it('filter pill hides Backlog column when toggled off', () => {
    renderRoadmap()
    const backlogPill = screen.getByRole('button', { name: /backlog/i })
    fireEvent.click(backlogPill)
    expect(screen.queryByText('Copywriting')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/pages/__tests__/Roadmap.test.tsx
```
Expected: FAIL — `Cannot find module '../Roadmap'`

- [ ] **Step 3: Create `site/src/pages/Roadmap.tsx`**

```tsx
import { useState } from 'react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { RoadmapCard } from '../components/RoadmapCard'
import { ROADMAP_ENTRIES } from '../data/roadmap'
import type { AssistantStatus } from '../data/types'
import styles from './Roadmap.module.css'

const ALL_STATUSES: AssistantStatus[] = ['live', 'backlog', 'planned']
const STATUS_LABELS: Record<AssistantStatus, string> = { live: 'Live', backlog: 'Backlog', planned: 'Planned' }

export function Roadmap() {
  const [visible, setVisible] = useState<Set<AssistantStatus>>(new Set(ALL_STATUSES))

  function toggle(status: AssistantStatus) {
    setVisible(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <Nav />
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Roadmap</div>
        <h1 className={styles.headline}>What we're building.</h1>
        <p className={styles.sub}>Five assistants are live today. See what's coming next and what's in the backlog.</p>
      </section>

      <div className={styles.body}>
        <div className={styles.filters}>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              className={[styles.pill, visible.has(s) ? styles.pillActive : ''].join(' ')}
              onClick={() => toggle(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className={styles.columns}>
          {ALL_STATUSES.map(status => (
            visible.has(status) && (
              <div key={status} className={styles.column}>
                <div className={styles.colHeader}>
                  <span className={styles.colTitle}>{STATUS_LABELS[status]}</span>
                  <span className={styles.colCount}>
                    {ROADMAP_ENTRIES.filter(e => e.status === status).length}
                  </span>
                </div>
                <div className={styles.cards}>
                  {ROADMAP_ENTRIES.filter(e => e.status === status).map(e => (
                    <RoadmapCard key={e.id} entry={e} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/pages/Roadmap.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }
.hero { background: var(--bg-hero); padding: 56px 40px 48px; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
.headline { font-size: 36px; font-weight: 800; color: var(--text-on-dark); font-family: var(--font-display); letter-spacing: -0.02em; margin-bottom: 10px; }
.sub { font-size: 14px; color: var(--text-on-dark-muted); max-width: 440px; line-height: 1.6; }
.body { flex: 1; padding: 40px; background: var(--bg-body); }
.filters { display: flex; gap: 8px; margin-bottom: 28px; }
.pill { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--text-muted); transition: all 0.15s; }
.pillActive { background: var(--accent); border-color: var(--accent); color: #fff; }
.columns { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; align-items: start; }
.column {}
.colHeader { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--accent); }
.colTitle { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.02em; }
.colCount { font-size: 11px; color: var(--text-muted); }
.cards { display: flex; flex-direction: column; gap: 10px; }
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/pages/__tests__/Roadmap.test.tsx
```
Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add site/src/pages/Roadmap.tsx site/src/pages/Roadmap.module.css
git commit -m "feat(site): add Roadmap page with 3-column layout and filter pills"
```

---

## Task 14: Resources Page

**Files:**
- Create: `site/src/pages/Resources.tsx` + `Resources.module.css`
- Create: `site/src/pages/__tests__/Resources.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `site/src/pages/__tests__/Resources.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Resources } from '../Resources'
import { LIVE_ASSISTANTS } from '../../data/assistants'

function renderResources() {
  return render(<MemoryRouter><Resources /></MemoryRouter>)
}

describe('Resources page', () => {
  it('renders the hero headline', () => {
    renderResources()
    expect(screen.getByText(/guides, templates/i)).toBeInTheDocument()
  })

  it('renders the Start Here strip', () => {
    renderResources()
    expect(screen.getByText(/start here/i)).toBeInTheDocument()
  })

  it('renders a video card for each live assistant', () => {
    renderResources()
    for (const a of LIVE_ASSISTANTS) {
      expect(screen.getByText(new RegExp(`${a.name}.*walkthrough`, 'i'))).toBeInTheDocument()
    }
  })

  it('renders Documentation section', () => {
    renderResources()
    expect(screen.getByText('Documentation')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd site && npm run test:run -- src/pages/__tests__/Resources.test.tsx
```
Expected: FAIL — `Cannot find module '../Resources'`

- [ ] **Step 3: Create `site/src/pages/Resources.tsx`**

```tsx
import { Play, PenTool, Hash, GitBranch, Code2 } from 'lucide-react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'
import { ResourceCard } from '../components/ResourceCard'
import { RESOURCES_SECTIONS } from '../data/resources'
import { LIVE_ASSISTANTS } from '../data/assistants'
import styles from './Resources.module.css'

export function Resources() {
  return (
    <div className={styles.page}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Resources</div>
        <h1 className={styles.headline}>Guides, templates,<br />and tools to get you going.</h1>
        <p className={styles.sub}>Everything you need to use the Design AI Toolkit effectively: documentation, how-to videos, Figma templates, and links to the team.</p>
      </section>

      <div className={styles.body}>
        {/* Start Here */}
        <div className={styles.featured}>
          <div className={styles.featuredIcon}><Play size={20} style={{ opacity: 0.7 }} /></div>
          <div className={styles.featuredText}>
            <div className={styles.featuredLabel}>Start here</div>
            <div className={styles.featuredTitle}>Design AI Toolkit — Intro Video</div>
            <div className={styles.featuredDesc}>5-minute walkthrough of all five assistants, how they connect, and when to use each one.</div>
          </div>
          <a href="#" className={styles.featuredCta}><Play size={12} /> Watch now</a>
        </div>

        {/* Getting Started */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Getting Started</div>
          <div className={styles.grid3}>
            {RESOURCES_SECTIONS.find(s => s.id === 'getting-started')?.items.map(item => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* Video Library */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Video Library</div>
          <div className={styles.grid3}>
            {LIVE_ASSISTANTS.map(a => (
              <ResourceCard key={a.id} item={{
                title: `${a.name} Assistant Walkthrough`,
                description: a.tagline,
                tag: 'Video',
                tagColor: a.accent,
                source: '4 min',
                href: '#',
              }} />
            ))}
          </div>
        </div>

        {/* Templates + Tools */}
        <div className={styles.twoCol}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Templates</div>
            <div className={styles.listCard}>
              {RESOURCES_SECTIONS.find(s => s.id === 'templates')?.items.map(item => (
                <a key={item.title} href={item.href} className={styles.listItem}>
                  <span className={styles.listIcon}><PenTool size={13} /></span>
                  <div>
                    <div className={styles.listTitle}>{item.title}</div>
                    <div className={styles.listDesc}>{item.description}</div>
                  </div>
                  <span className={styles.listTag} style={{ color: item.tagColor, background: `${item.tagColor}18` }}>{item.tag}</span>
                </a>
              ))}
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Tools &amp; Links</div>
            <div className={styles.listCard}>
              {RESOURCES_SECTIONS.find(s => s.id === 'tools')?.items.map(item => (
                <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className={styles.listItem}>
                  <span className={styles.listIcon}>{item.title.includes('Plugin') ? <PenTool size={13} /> : item.title.includes('Slack') ? <Hash size={13} /> : item.title.includes('Jira') ? <GitBranch size={13} /> : <Code2 size={13} />}</span>
                  <div>
                    <div className={styles.listTitle}>{item.title}</div>
                    <div className={styles.listDesc}>{item.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>Documentation</div>
          <div className={styles.grid3}>
            {RESOURCES_SECTIONS.find(s => s.id === 'documentation')?.items.map(item => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* Contact bar */}
        <div className={styles.contactBar}>
          <div>
            <div className={styles.contactTitle}>Missing something?</div>
            <div className={styles.contactSub}>Request a guide, report a broken link, or suggest a resource to add.</div>
          </div>
          <div className={styles.contactActions}>
            <a href="#" className={styles.contactBtn}>+ Request a resource</a>
            <a href="#" className={styles.contactBtn}>↗ Report an issue</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Create `site/src/pages/Resources.module.css`**

```css
.page { min-height: 100vh; display: flex; flex-direction: column; }
.hero { background: var(--bg-hero); padding: 56px 40px 48px; }
.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
.headline { font-size: 36px; font-weight: 800; color: var(--text-on-dark); font-family: var(--font-display); letter-spacing: -0.02em; margin-bottom: 10px; line-height: 1.15; }
.sub { font-size: 14px; color: var(--text-on-dark-muted); max-width: 480px; line-height: 1.65; }

.body { flex: 1; padding: 40px; background: var(--bg-body); display: flex; flex-direction: column; gap: 40px; }

.featured { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
.featuredIcon { width: 44px; height: 44px; background: var(--accent); border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; }
.featuredText { flex: 1; }
.featuredLabel { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); margin-bottom: 3px; }
.featuredTitle { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; }
.featuredDesc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.featuredCta { display: flex; align-items: center; gap: 6px; background: var(--accent); color: #fff; border-radius: var(--radius-sm); padding: 9px 16px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }

.section {}
.sectionHeader { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-card); }
.grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

.listCard { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-card); overflow: hidden; }
.listItem { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; transition: background 0.12s; }
.listItem:last-child { border-bottom: none; }
.listItem:hover { background: #fafafa; }
.listIcon { width: 28px; height: 28px; border-radius: 7px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.listTitle { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.listDesc { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.listTag { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-left: auto; }

.contactBar { background: var(--bg-hero); border-radius: var(--radius-card); padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.contactTitle { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.contactSub { font-size: 12px; color: rgba(255,255,255,0.45); }
.contactActions { display: flex; gap: 10px; }
.contactBtn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; font-weight: 500; }
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd site && npm run test:run -- src/pages/__tests__/Resources.test.tsx
```
Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add site/src/pages/Resources.tsx site/src/pages/Resources.module.css
git commit -m "feat(site): add Resources page with all sections"
```

---

## Task 15: README and Deployment Verification

**Files:**
- Create: `site/README.md`

- [ ] **Step 1: Run the full test suite**

```bash
cd site && npm run test:run
```
Expected: All tests PASS. Fix any failures before continuing.

- [ ] **Step 2: Create `site/README.md`**

```markdown
# Design AI Toolkit — Landing Site

Standalone React/Vite site for the Design AI Toolkit. Deployable to localhost or AWS S3.

## Prerequisites

- Node 20+
- ffmpeg (for generating FPO video placeholders)
- Font files at `../admin-editor/public/fonts/`

## One-time setup

### Copy fonts

Run from `figmai_plugin/`:
\`\`\`bash
cp -r admin-editor/public/fonts/Carbon site/public/fonts/Carbon
cp -r admin-editor/public/fonts/Industry site/public/fonts/Industry
cp -r admin-editor/public/fonts/Protipo site/public/fonts/Protipo
\`\`\`

### Generate FPO video placeholders

Run from `figmai_plugin/site/`:
\`\`\`bash
for slug in general evergreens accessibility design-workshop analytics-tagging; do
  ffmpeg -f lavfi -i color=c=black:size=1280x720:rate=1 \
    -t 5 -c:v libx264 -pix_fmt yuv420p \
    public/videos/${slug}.mp4 -y
done
\`\`\`

Replace these with final Remotion-rendered MP4s before launch.

## Local development

\`\`\`bash
cd site
npm install
npm run dev
# → http://localhost:5173
\`\`\`

The ACE admin editor runs on a separate port and is not related to this site.

## Tests

\`\`\`bash
npm run test:run
\`\`\`

## S3 build

\`\`\`bash
VITE_BASE_PATH=/design-ai-toolkit/ npm run build
# Output: site/dist/
# Upload dist/ to your S3 bucket or CloudFront prefix
\`\`\`

Configure a CloudFront/S3 404 rule to redirect all paths to `index.html` for client-side routing.

## Updating assistant data

`src/data/assistants.ts` is the site's internal data file. It mirrors the 5 live assistants from `custom/assistants.manifest.json`.

**Sync rule:** If you change `assistants.manifest.json` in a way that affects a live assistant's name, status, or description, update `src/data/assistants.ts` in the same PR.

## Adding real videos

Replace the FPO placeholders in `public/videos/` with final Remotion-rendered MP4s. Filename must match the `video` field in `src/data/assistants.ts`.
```

- [ ] **Step 3: Verify S3 base path build**

```bash
cd site && VITE_BASE_PATH=/design-ai-toolkit/ npm run build
```
Expected: `dist/` created. No TypeScript or Vite errors.

Check that `dist/index.html` references assets with `/design-ai-toolkit/` prefix:
```bash
grep 'design-ai-toolkit' site/dist/index.html | head -3
```
Expected: asset paths like `/design-ai-toolkit/assets/index-xxxxx.js`

- [ ] **Step 4: Verify local preview build**

```bash
cd site && npm run build && npm run preview
```
Open `http://localhost:4173`. Confirm all 4 routes load without blank screens:
- `/`
- `/assistants/evergreens`
- `/roadmap`
- `/resources`

Confirm `/assistants/unknown` redirects to `/`.

- [ ] **Step 5: Commit**

```bash
git add site/README.md
git commit -m "feat(site): add README with setup, font copy, FPO video, and S3 deploy instructions"
```
