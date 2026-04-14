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
| Fonts | Local copies in `site/public/fonts/` (Carbon, Protipo, Industry Inc) | Copied from `admin-editor/public/fonts/`; no Google Fonts or CDN |
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
      fonts/          ← copied from admin-editor/public/fonts/ (not symlinked)
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
        FeedbackPanel.tsx       ← styled CTA panel (not a form); routes to Jira/mailto
      pages/
        Home.tsx
        AssistantPage.tsx       ← route template, parameterized by slug
        Roadmap.tsx
        Resources.tsx
      data/
        assistants.ts           ← hand-authored; kept in sync with assistants.manifest.json
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

The homepage is the only assistant discovery surface. There is no separate `/assistants` index page. The "Assistants" nav link scrolls to or routes to the Assistants Grid on the homepage.

**Sections (top to bottom):**

1. **Nav** — Logo + wordmark, links: "Assistants" (scrolls to grid on `/`), "Roadmap", "Resources"; theme toggle (Mixed / Dark / Light).
2. **Hero** — Dark background. Headline drawn from generalized speech content ("Design moves fast. Your tools should too."). Two CTAs: "Explore Assistants" (primary, scrolls to grid), "View Roadmap" (ghost, routes to `/roadmap`). Tagline strip below the headline.
3. **Philosophy Cards** — Three cards: Speed, Consistency, Confidence. Each has a solid `#d50c7d` icon background with a white Lucide icon at 70% opacity, a headline, and 2–3 sentences of body copy.
4. **Assistants Grid** — 5 cards, one per active assistant. Each card: assistant accent color as a left border + subtle tinted background, icon, name, one-line description, "Open" CTA linking to `/assistants/:slug`.
5. **Strike Teams Banner** — Dark section. Headline: "Build the tools. Join the team." Two CTAs: "Propose a New Assistant" (opens pre-filled Jira ticket) and "Browse All Teams" (scrolls to the grid). Three sample team cards showing avatar rows, open-role chips, and "View team and apply" links.
6. **Footer** — Dark. Left: logo + copyright. Right: nav links.

**Theme toggle behavior:** Persisted to `localStorage`. Default is Mixed (dark hero + light body). Dark makes every surface dark. Light makes every surface light. Toggle cycles through the three options.

---

### 5.2 Assistant Pages (`/assistants/:slug`)

One route template renders all five assistant pages. The slug matches the assistant `id` from `assistants.ts`. There is no index at `/assistants` — that path redirects to `/`.

**The five active assistants (all are distinct live tools, not overview pages):**

| Slug | Name | Purpose |
|---|---|---|
| `general` | General | Open-ended design Q&A, component briefs, design rationale |
| `evergreens` | Evergreens | Find, update, and create reusable design pattern entries |
| `accessibility` | Accessibility | Run WCAG checks, generate remediation copy, export audits |
| `design-workshop` | Design Workshop | Structured ideation sessions and artifact export |
| `analytics-tagging` | Analytics Tagging | Generate taxonomy-aligned Jira tags |

**Sections (top to bottom):**

1. **Nav** — same as homepage, with breadcrumb: Assistants > [Name].
2. **Hero** — Dark background with the assistant's accent color as a left-border accent on the eyebrow label. Assistant name as H1, tagline, two CTAs: "Open in Figma" (primary), "Submit Feedback" (ghost, scrolls to Feedback section).
3. **Video** — Poster image with a play button overlay. Clicking loads the assistant's pre-rendered MP4 from `public/videos/`. Autoplay is off.
4. **How to Use** — Numbered step cards (3–5 steps per assistant). Below the steps: quick-action chips for the most common tasks.
5. **Resources** *(assistant-specific)* — Three-column card grid. Contains only resources directly relevant to using this specific assistant: assistant-specific docs, templates, and related internal tools. Does not repeat content from the global `/resources` page.
6. **Best Practices** *(Evergreens only)* — Four-card grid covering: writing good Evergreens, when to create vs. update, content model conventions, and review checklist.
7. **Strike Team** — Current members list (avatar, name, role, Lead/Member badge) on the left. Open Slots card on the right (dashed slot rows with role name, description, Apply link). "Express Interest" CTA shown when no slots are available.
8. **Feedback** — `FeedbackPanel` component renders two styled CTA panels side by side: "Report a Bug" (opens pre-filled Jira bug ticket) and "Request a Change" (opens pre-filled Jira change request ticket). Below: team contacts with name, role, and Slack/email link. No client-side form submission; all actions are external links.

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

Each card shows: assistant icon (accent-colored), name, one-line description, and accent-colored left border. Column placement communicates status; no redundant status label on individual cards.

---

### 5.4 Resources (`/resources`)

**Content boundary:** This page covers cross-cutting resources that apply to the toolkit as a whole or span multiple assistants — getting started, overall platform docs, shared templates, and external tools. Resources that are specific to a single assistant live only on that assistant's page and are not duplicated here.

**Sections:**

1. **Hero** — Dark. Headline: "Guides, templates, and tools to get you going."
2. **Start Here strip** — Featured intro video (poster + Watch Now CTA).
3. **Getting Started** — 4 cards: Quick Start guide, plugin installation video, starter Figma file template, "Choosing the Right Assistant" guide.
4. **Video Library** — 5 cards, one per assistant walkthrough, each using the assistant's accent color on the video icon.
5. **Templates + Tools & Links** — Two-column layout. Templates: cross-cutting Figma files, spreadsheets, slide decks. Tools & Links: plugin install, Slack channel (`hash` icon), Jira board, GitHub repo.
6. **Documentation** — 6 cards: privacy policy, AI use guidelines, Evergreens update process, accessibility standards, tagging taxonomy, prompt best practices.
7. **Contact bar** — Dark. "Request a resource" (opens Jira) and "Report an issue" (opens Jira) CTAs.

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

- Import from `lucide-react` as React components (bundled, no CDN). There is no SVG sprite pipeline.
- `figma` and `slack` are not in Lucide — use `pen-tool` and `hash` respectively.
- Icon sizes inside colored backgrounds: `width: 15–20px`, `height: 15–20px`.
- White icons on colored backgrounds: `opacity: 0.7` in both dark and light themes.

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

| Path | Component | Notes |
|---|---|---|
| `/` | `Home` | Only assistant discovery surface |
| `/assistants` | redirect → `/` | No index page; redirect prevents 404 |
| `/assistants/:slug` | `AssistantPage` | One of five slugs: `general`, `evergreens`, `accessibility`, `design-workshop`, `analytics-tagging` |
| `/roadmap` | `Roadmap` | |
| `/resources` | `Resources` | |

For S3 deployment, Vite builds to `dist/` with the correct `base` path. A 404 redirect rule in S3/CloudFront routes all unmatched paths to `index.html` to support client-side routing.

---

## 9. Serving Model and Integration Boundaries

### Local development

| App | Command | URL |
|---|---|---|
| Landing site | `cd site && npm run dev` | `http://localhost:5173` |
| ACE admin editor | existing server | separate port (unchanged) |

The two apps are fully independent processes with no shared routing or middleware. No path collision.

### S3 / static hosting

The landing site deploys to a dedicated S3 bucket or prefix (e.g., `https://intranet.example.com/design-ai-toolkit/`). ACE deploys separately to its own bucket/prefix. The only connection between them is an HTML `<a>` link from the site nav to ACE, and vice versa.

Vite `base` is set at build time via `VITE_BASE_PATH`. Default is `/` for local dev.

### ACE relationship

ACE (`admin-editor/`) is not modified by this project. The landing site may link to ACE via a nav item or CTA ("Open in Figma" CTAs link to the Figma plugin directly, not to ACE). ACE is not embedded in the landing site.

---

## 10. Data Layer

### `assistants.ts` — sync rule

`src/data/assistants.ts` is a hand-authored TypeScript file containing data for the five live assistants. It is the site's internal source of truth and is not auto-generated.

**Sync rule:** Any PR that changes `custom/assistants.manifest.json` in a way that affects a live assistant (name, status, description) must also update `assistants.ts` in the same PR. The manifest remains the plugin's runtime source of truth; `assistants.ts` is the site's typed representation of its live subset.

A build-time generator is explicitly out of scope for this release. The manifest format is designed for the plugin runtime, not for site content, so a generator would require non-trivial mapping logic that is not worth the added complexity for a stable 5-item dataset.

### Type definitions

```ts
type Step            = { number: number; title: string; description: string; };
type Resource        = { title: string; description: string; tag: string; href: string; };
type BestPractice    = { title: string; description: string; };
type TeamMember      = { name: string; role: string; isLead: boolean; avatarInitials: string; };
type OpenSlot        = { role: string; description: string; applyHref: string; };
type StrikeTeam      = { members: TeamMember[]; openSlots: OpenSlot[]; };

type Assistant = {
  id: string;                   // URL slug
  name: string;
  tagline: string;
  accent: string;               // hex color
  icon: LucideIcon;
  status: 'live' | 'backlog' | 'planned';
  video: string;                // filename in public/videos/
  howToUse: Step[];
  quickActions: string[];
  resources: Resource[];        // assistant-specific only
  bestPractices?: BestPractice[]; // Evergreens only
  strikeTeam: StrikeTeam;
};
```

`src/data/roadmap.ts` includes all 11 assistants (5 live + 6 backlog/planned) with FPO data for non-live entries.

`src/data/strikeTeams.ts` holds team member and open slot data, co-located with `assistants.ts` but split for clarity.

---

## 11. Font Strategy

Font files are **copied** (not symlinked) from `admin-editor/public/fonts/` into `site/public/fonts/` at project setup. Copying is required for:

- Portability in CI environments where symlinks may not be resolved
- Correct inclusion in Vite's static asset pipeline
- Reliable S3 upload (symlinks are not followed by standard upload tools)

The copy is a one-time manual step documented in `site/README.md`. When fonts are updated in `admin-editor/`, the same files should be re-copied to `site/public/fonts/`.

---

## 12. Deployment

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
# Upload dist/ to S3 bucket/prefix
```

Vite config reads `VITE_BASE_PATH` and passes it to the `base` option. Default is `/` for local.

---

## 13. Out of Scope

- Authentication / access control (deferred; the site is intranet-internal)
- CMS or dynamic content editing
- Live Remotion rendering at request time
- Client-side form submission (feedback is pre-filled Jira/mailto links only)
- Analytics instrumentation
- i18n / localization
- Mobile-responsive layout (desktop-first for initial release; responsive pass is a follow-on)
- Auto-generation of `assistants.ts` from `assistants.manifest.json`
