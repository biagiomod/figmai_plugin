# Design AI Toolkit — Landing Site Design Spec

**Date:** 2026-04-11
**Status:** Approved for implementation

---

## 1. Overview

A standalone React/Vite site (`figmai_plugin/site/`) that serves as the public-facing landing experience for the Design AI Toolkit. The site covers the homepage, one page per active assistant, a roadmap, and a resources page. It replaces the current minimal placeholder at `admin-editor/public/home.html` and is deployed as a fully static build to either localhost or AWS S3.

---

## 2. Goals

- Give designers, PMs, and engineers a single place to discover, understand, and access every AI assistant.
- Make each assistant's purpose, how-to steps, and team ownership legible in under two minutes.
- Support the Strike Team model: surface open roles and let anyone propose a new assistant.
- Work identically on localhost and on S3 with no external runtime dependencies.

---

## 3. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Native Remotion support, npm-bundled Lucide, configurable base path for S3 |
| Icons | `lucide-react` (npm, bundled) | No CDN; icons are imported as React components |
| Fonts | Local files from `admin-editor/public/fonts/` (Carbon, Protipo, Industry Inc) | Already hosted; no Google Fonts or CDN |
| Theming | CSS custom properties + class-based toggle | Three themes: Mixed (default), Dark, Light |
| Videos | Pre-rendered Remotion MP4s in `site/public/videos/` | Static files; no runtime Remotion dependency |
| Build output | `site/dist/` — fully self-contained | S3 upload target |
| Deployment | Vite `base` config set at build time via env var | Same codebase for localhost and S3 |

---

## 4. Directory Structure

```
figmai_plugin/
  site/
    public/
      fonts/          ← symlink or copy from admin-editor/public/fonts/
      icons/          ← lucide SVG sprites (generated at build)
      videos/
        general.mp4
        evergreens.mp4
        accessibility.mp4
        design-workshop.mp4
        analytics-tagging.mp4
    src/
      components/
        Nav.tsx
        Footer.tsx
        ThemeToggle.tsx
        AssistantCard.tsx
        StrikeTeamSection.tsx
        StrikeTeamProfile.tsx
        VideoPlayer.tsx
        FeedbackForm.tsx
      pages/
        Home.tsx
        AssistantPage.tsx       ← route template, parameterized
        Roadmap.tsx
        Resources.tsx
      data/
        assistants.ts           ← typed manifest derived from assistants.manifest.json
        roadmap.ts
        resources.ts
        strikeTeams.ts
      styles/
        tokens.css              ← design tokens (colors, typography, spacing)
        themes.css              ← .theme-mixed / .theme-dark / .theme-light
        global.css
      App.tsx
      main.tsx
    index.html
    vite.config.ts
    package.json
```

---

## 5. Pages

### 5.1 Homepage (`/`)

**Sections (top to bottom):**

1. **Nav** — Logo + wordmark, links to Assistants, Roadmap, Resources, theme toggle (Mixed / Dark / Light)
2. **Hero** — Dark background. Headline drawn from generalized speech content ("Design moves fast. Your tools should too."). Two CTAs: "Explore Assistants" (primary), "View Roadmap" (ghost). Tagline strip below the headline.
3. **Philosophy Cards** — Three cards: Speed, Consistency, Confidence. Each has a solid `#d50c7d` icon background with a white Lucide icon at 70% opacity, a headline, and 2–3 sentences of body copy.
4. **Assistants Grid** — 5 cards, one per active assistant. Each card: assistant accent color as a left border + subtle tinted background, icon, name, one-line description, "Open" CTA.
5. **Strike Teams Banner** — Dark section. Headline: "Build the tools. Join the team." Two CTAs: "Propose a New Assistant" and "Browse All Teams". Three sample team cards showing avatar rows, open-role chips, and a "View team and apply" link.
6. **Footer** — Dark. Left: logo + copyright. Right: nav links.

**Theme toggle behavior:** Persisted to `localStorage`. Default is Mixed (dark hero + light body). Dark makes every surface dark. Light makes every surface light. Toggle cycles through the three options.

---

### 5.2 Assistant Pages (`/assistants/:slug`)

One route template renders all five assistant pages. The slug matches the assistant ID from `assistants.ts`.

**Sections (top to bottom):**

1. **Nav** — same as homepage, with breadcrumb: Assistants > [Name]
2. **Hero** — Dark background with the assistant's accent color as a left-border accent on the eyebrow label. Assistant name as H1, tagline, two CTAs: "Open in Figma" (primary), "Submit Feedback" (ghost).
3. **Video** — Poster image with a play button overlay. Clicking loads the assistant's pre-rendered MP4 from `public/videos/`. Autoplay is off.
4. **How to Use** — Numbered step cards (3–5 steps per assistant). Below the steps: quick-action chips for the most common tasks.
5. **Resources** — Three-column card grid with links to docs, templates, and related tools specific to this assistant.
6. **Best Practices** *(Evergreens only)* — Four-card grid covering: writing good Evergreens, when to create vs. update, content model conventions, and review checklist.
7. **Strike Team** — Current members list (avatar, name, role, Lead/Member badge) on the left. Open Slots card on the right (dashed slot rows with role name, description, Apply link). "Express Interest" CTA shown when no slots are available.
8. **Feedback** — Two-column: bug report form on the left, change request form on the right. Below: team contacts with name, role, and communication channel.

**Per-assistant accent colors:**

| Assistant | Accent |
|---|---|
| General | `#4a90e2` (blue) |
| Evergreens | `#007a39` (green) |
| Accessibility | `#e07b00` (amber) |
| Design Workshop | `#7c3aed` (violet) |
| Analytics Tagging | `#008282` (teal) |

---

### 5.3 Roadmap (`/roadmap`)

**Layout:** Three columns — Live (5), Backlog (6), Planned (3 FPO). Filter pills above the columns let users show/hide by status.

Each card shows: assistant icon (accent-colored), name, one-line description, status chip, and accent-colored left border. "Backlog" label is not shown on cards; status is communicated by column placement only.

---

### 5.4 Resources (`/resources`)

**Sections:**

1. **Hero** — Dark. Headline: "Guides, templates, and tools to get you going."
2. **Start Here strip** — Featured intro video (poster + Watch Now CTA).
3. **Getting Started** — 4 cards: Quick Start guide, installation video, starter Figma file template, "Choosing the Right Assistant" guide.
4. **Video Library** — 5 cards, one per assistant walkthrough, each using the assistant's accent color on the video icon.
5. **Templates + Tools & Links** — Two-column layout. Templates: Figma files, spreadsheets, slide decks. Tools & Links: plugin install, Slack channel, Jira board, GitHub repo.
6. **Documentation** — 6 cards: privacy policy, AI use guidelines, Evergreens update process, accessibility standards, tagging taxonomy, prompt best practices.
7. **Contact bar** — Dark. "Request a resource" and "Report an issue" CTAs.

---

## 6. Design System

### Tokens

| Token | Value |
|---|---|
| `--accent` | `#d50c7d` (global brand pink) |
| `--ac-color` | Per-assistant CSS custom property override |
| `--bg-hero` | `#0a0a0a` |
| `--bg-body-mixed` | `#f7f7f7` |
| `--bg-card` | `#ffffff` |
| `--text-primary` | `#111111` |
| `--text-muted` | `#666666` |
| Font heading | Industry Inc (display), Carbon (label) |
| Font body | Protipo |

### Icon rules

- Import from `lucide-react` as React components (bundled, no CDN).
- `figma` and `slack` are not in Lucide — use `pen-tool` and `hash` respectively.
- Icon sizes inside colored backgrounds: `width: 15–20px`, `height: 15–20px`.
- White icons on colored backgrounds: `opacity: 0.7` in both dark and light themes.
- Do not use `<i data-lucide>` in production — that pattern is prototype-only (requires UMD bundle).

### Tinted card backgrounds

Use `color-mix(in srgb, var(--ac-color) 8%, transparent)` for tinted card backgrounds. Pair with `border: 1px solid color-mix(in srgb, var(--ac-color) 25%, transparent)` for visible definition in light mode.

---

## 7. Videos

### Approach

Pre-rendered MP4 files, one per assistant. Generated with Remotion offline and stored as static assets in `site/public/videos/`. The site embeds them as standard `<video>` elements — no Remotion runtime dependency at serve time.

### Per-assistant compositions

| File | Composition | Duration |
|---|---|---|
| `general.mp4` | General Assistant intro | ~60s |
| `evergreens.mp4` | Evergreens intro | ~60s |
| `accessibility.mp4` | Accessibility intro | ~60s |
| `design-workshop.mp4` | Design Workshop intro | ~60s |
| `analytics-tagging.mp4` | Analytics Tagging intro | ~60s |

Remotion compositions live in `site/src/remotion/`. Each uses the assistant's accent color, Lucide icons, and the Design AI Toolkit font stack. FPO placeholder compositions are used in the initial build; final versions are rendered before launch.

### Video player behavior

- Poster image shown by default (static frame exported from Remotion).
- Play button overlay triggers native `<video>` play. No autoplay.
- Controls shown after first play.

---

## 8. Routing

Client-side routing via React Router. Routes:

| Path | Component |
|---|---|
| `/` | `Home` |
| `/assistants/:slug` | `AssistantPage` |
| `/roadmap` | `Roadmap` |
| `/resources` | `Resources` |

For S3 deployment, Vite builds to `dist/` with the correct `base` path. A 404 redirect rule in S3/CloudFront routes all paths to `index.html` to support client-side routing.

---

## 9. Data Layer

`src/data/assistants.ts` is the single source of truth for the five active assistants. It is a typed TypeScript object derived manually from `custom/assistants.manifest.json`. Fields per assistant:

```ts
type Step = { number: number; title: string; description: string; };
type Resource = { title: string; description: string; tag: string; href: string; };
type BestPractice = { title: string; description: string; };
type TeamMember = { name: string; role: string; isLead: boolean; avatarInitials: string; };
type OpenSlot = { role: string; description: string; applyHref: string; };
type StrikeTeam = { members: TeamMember[]; openSlots: OpenSlot[]; };

type Assistant = {
  id: string;          // slug used in URL
  name: string;
  tagline: string;
  accent: string;      // hex color
  icon: LucideIcon;
  status: 'live' | 'backlog' | 'planned';
  video: string;       // filename in public/videos/
  howToUse: Step[];
  quickActions: string[];
  resources: Resource[];
  bestPractices?: BestPractice[];  // Evergreens only
  strikeTeam: StrikeTeam;
};
```

`src/data/roadmap.ts` includes all 11 assistants (5 live + 6 backlog/planned) with FPO data for non-live entries.

`src/data/strikeTeams.ts` holds team member and open slot data per assistant.

---

## 10. Deployment

### Local dev

```bash
cd site
npm install
npm run dev      # http://localhost:5173
```

### S3 build

```bash
VITE_BASE_PATH=/design-ai-toolkit/ npm run build
# Output: site/dist/
# Upload dist/ to S3 bucket
```

Vite config reads `VITE_BASE_PATH` env var and passes it to the `base` option. Default is `/` for local.

---

## 11. Out of Scope

- Authentication / access control (deferred; the site is intranet-internal)
- CMS or dynamic content editing
- Live Remotion rendering at request time
- Analytics instrumentation (feedback forms are static links to Jira/email)
- i18n / localization
- Mobile-responsive layout (desktop-first for initial release; responsive pass is a follow-on)
