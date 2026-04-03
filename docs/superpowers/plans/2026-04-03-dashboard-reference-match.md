# Dashboard Reference Match — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the DW-A Dashboard demo preset and HTML renderer to exactly match the Jazz DS reference design — confirmed tokens, chart colors, asset allocation donut, watchlist section, and correct position values.

**Architecture:** Three new `BlockSpec` variants (`metricsGrid`, `allocation`, `watchlist`) are added to the DesignSpecV1 schema, validated, and rendered in both the HTML prototype renderer and the Figma canvas renderer (as labelled placeholders). The Dashboard and Positions presets in `demoPreset.ts` are rewritten with exact reference values. Jazz DS token corrections (`color.text`, `color.muted`, `color.border`) are applied throughout.

**Tech Stack:** TypeScript, Preact (DesignWorkshopPanel), inline SVG (HTML renderer), Figma Plugin API (canvas renderer).

---

## File Map

| File | Change |
|------|--------|
| `src/core/designWorkshop/types.ts` | Add 3 new `BlockSpec` union members |
| `src/core/designWorkshop/validate.ts` | Add `case` for each new block in block switch |
| `src/core/designWorkshop/stockLogos.ts` | Add SPLV, TLT, VIG, IDU, VPU entries |
| `src/core/designWorkshop/htmlRenderer.ts` | Token corrections + chart color/tooltip fixes + 3 new block renderers |
| `src/core/designWorkshop/renderer.ts` | 3 new Figma canvas placeholder cases |
| `src/core/designWorkshop/demoPreset.ts` | Rewrite Dashboard preset; update Positions preset values |
| `src/ui/components/DesignWorkshopPanel.tsx` | Correct 2 hardcoded color constants |

---

## Task 1: Add new block types to types.ts

**Files:**
- Modify: `src/core/designWorkshop/types.ts:81-89`

- [ ] **Step 1: Verify current BlockSpec union**

Read `src/core/designWorkshop/types.ts` lines 81–89. Current union ends with:
```typescript
  | { type: "chart"; height?: number; caption?: string }
```

- [ ] **Step 2: Add 3 new union members**

Replace the `BlockSpec` type (lines 81–89) with:
```typescript
export type BlockSpec =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "bodyText"; text: string }
  | { type: "button"; text: string; variant?: "primary" | "secondary" | "tertiary" }
  | { type: "input"; label?: string; placeholder?: string; inputType?: "text" | "email" | "password" }
  | { type: "card"; title?: string; content: string }
  | { type: "spacer"; height?: number }
  | { type: "image"; src?: string; alt?: string; width?: number; height?: number }
  | { type: "chart"; height?: number; caption?: string }
  | { type: "metricsGrid"; items: Array<{ label: string; value: string; gain?: boolean }> }
  | { type: "allocation"; equity: number; fixedIncome: number; altAssets: number; total?: string }
  | { type: "watchlist"; title: string; items: Array<{ ticker: string; price: string; change: string; gain: boolean }> }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build 2>&1 | grep -E "error TS|types\.ts"`
Expected: no errors from `types.ts`

- [ ] **Step 4: Commit**

```bash
git add src/core/designWorkshop/types.ts
git commit -m "feat(dw-a): add metricsGrid, allocation, watchlist block types"
```

---

## Task 2: Add validation cases for new block types

**Files:**
- Modify: `src/core/designWorkshop/validate.ts:224-226`

- [ ] **Step 1: Locate the block switch in validate.ts**

The `default:` error case is at line ~227. The `case 'chart':` no-op is at line 224.

- [ ] **Step 2: Add three new cases before `default:`**

After the `case 'chart':` no-op, add:
```typescript
        case 'metricsGrid': {
          if (!Array.isArray(blockObj.items) || blockObj.items.length === 0) {
            errors.push(`screens[${index}].blocks[${blockIndex}].items must be a non-empty array`)
          }
          break
        }
        case 'allocation': {
          if (typeof blockObj.equity !== 'number' || typeof blockObj.fixedIncome !== 'number' || typeof blockObj.altAssets !== 'number') {
            errors.push(`screens[${index}].blocks[${blockIndex}] allocation must have numeric equity, fixedIncome, altAssets`)
          }
          break
        }
        case 'watchlist': {
          if (typeof blockObj.title !== 'string') {
            errors.push(`screens[${index}].blocks[${blockIndex}].title is missing or invalid`)
          }
          if (!Array.isArray(blockObj.items) || blockObj.items.length === 0) {
            errors.push(`screens[${index}].blocks[${blockIndex}].items must be a non-empty array`)
          }
          break
        }
```

- [ ] **Step 3: Run build to confirm no errors**

Run: `npm run build 2>&1 | grep -E "error TS|validate\.ts"`
Expected: no errors from `validate.ts`

- [ ] **Step 4: Commit**

```bash
git add src/core/designWorkshop/validate.ts
git commit -m "feat(dw-a): validate metricsGrid, allocation, watchlist blocks"
```

---

## Task 3: Add 5 new ticker entries to stockLogos.ts

**Files:**
- Modify: `src/core/designWorkshop/stockLogos.ts`

- [ ] **Step 1: Add to TICKER_NAMES**

In `TICKER_NAMES` (around line 58–62), after the Invesco section, add:
```typescript
  // New — watchlist tickers
  SPLV: 'Invesco S&P 500 Low Volatility ETF',
  TLT:  'iShares 20+ Year Treasury Bond ETF',
  VIG:  'Vanguard Dividend Appreciation ETF',
  IDU:  'iShares U.S. Utilities ETF',
  VPU:  'Vanguard Utilities ETF',
```

- [ ] **Step 2: Add to TICKER_COLORS**

In `TICKER_COLORS` (around line 160–177), after the existing ETF entries, add:
```typescript
  SPLV:  '#7952B3',  // Invesco purple
  TLT:   '#F7941D',  // iShares orange
  VIG:   '#CC0000',  // Vanguard red
  IDU:   '#F7941D',  // iShares orange
  VPU:   '#CC0000',  // Vanguard red
```

- [ ] **Step 3: Verify tickers render**

Run: `node -e "const {getTickerLogoSvg} = require('./src/core/designWorkshop/stockLogos'); ['SPLV','TLT','VIG','IDU','VPU'].forEach(t => console.log(t, getTickerLogoSvg(t).slice(0,60)))"`

Expected: 5 lines, each starting with `<svg xmlns=...` and containing the correct brand color.

(If that import fails because it's TypeScript, verify via build instead.)

- [ ] **Step 4: Commit**

```bash
git add src/core/designWorkshop/stockLogos.ts
git commit -m "feat(dw-a): add SPLV, TLT, VIG, IDU, VPU to stockLogos"
```

---

## Task 4: Update Jazz DS tokens and chart SVG in htmlRenderer.ts

**Files:**
- Modify: `src/core/designWorkshop/htmlRenderer.ts:13-38` (JAZZ_CSS_VARS)
- Modify: `src/core/designWorkshop/htmlRenderer.ts:381-388` (active period btn CSS)
- Modify: `src/core/designWorkshop/htmlRenderer.ts:842-888` (chart case in renderBlock)

- [ ] **Step 1: Update JAZZ_CSS_VARS**

Replace the `JAZZ_CSS_VARS` constant (lines 13–38) with:
```typescript
const JAZZ_CSS_VARS = `
  --jazz-primary: #005EB8;
  --jazz-primary-hover: #004692;
  --jazz-primary-active: #002F6C;
  --jazz-primary-subtle: rgba(0,94,184,0.08);
  --jazz-navy: #002F6C;
  --jazz-cta: #128842;
  --jazz-gain: #128842;
  --jazz-loss: #DA0B16;
  --jazz-text: #0F171F;
  --jazz-muted: #5B6C7B;
  --jazz-subdued: #85888A;
  --jazz-border: #E2E4E5;
  --jazz-surface: #FFFFFF;
  --jazz-surface0: #FFFFFF;
  --jazz-surface1: #F5F7F8;
  --jazz-surface2: #F1F1F0;
  --jazz-icon-bg: #E8F0FA;
  --jazz-error: #BF2155;
  --jazz-warning: #D56B01;
  --jazz-radius: 4px;
  --jazz-radius-pill: 8px;
  --jazz-font: "Open Sans", "Helvetica Neue", helvetica, arial, sans-serif;
  --jazz-shadow-sm: 0 2px 4px rgba(0,0,0,0.10);
  --jazz-shadow-md: 0 3px 10px rgba(0,0,0,0.20);
  --jazz-shadow-lg: 0 8px 24px rgba(0,0,0,0.40);
  --chart-area: #4A8FD4;
  --chart-seg1: #7B9E4B;
  --chart-seg2: #2E7E9E;
  --chart-seg3: #6B5B95;
  --chart-tooltip: #0F171F;
`
```

- [ ] **Step 2: Update active period button CSS to pill shape**

Find the `.block-chart-period-btn.active-period` rule (around line 381) and replace it with:
```css
  .block-chart-period-btn.active-period {
    background: rgba(0,47,108,0.08);
    border-color: var(--jazz-primary);
    border-radius: var(--jazz-radius-pill);
    color: var(--jazz-primary);
  }
```

- [ ] **Step 3: Update chart SVG in renderBlock — correct colors + add callout**

Replace the entire `case 'chart':` block (lines 842–888) with:
```typescript
    case 'chart': {
      // Static SVG area chart: Jazz DS confirmed tokens
      // YTD: Jan 2 $313,875 → Feb 18 peak $322,612 → Apr 2 $319,448
      const chartH = block.height ?? 140
      const caption = block.caption ?? ''
      const svgH = chartH - 20  // leave room for x-axis labels
      // Y range: $313k–$323k, bottom=svgH-10, top=10
      // Normalized: Jan2=0.13, Feb18=1.0 (peak), Apr2=0.64
      const yScale = (norm: number) => Math.round((svgH - 10) - norm * (svgH - 20))
      const yJan  = yScale(0.13)
      const yPeak = yScale(1.0)
      const yApr  = yScale(0.64)
      const yMid  = yScale(0.60)  // early March
      const svgChart = `<svg viewBox="0 0 335 ${chartH}" xmlns="http://www.w3.org/2000/svg" class="block-chart-svg" aria-hidden="true">
  <defs>
    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4A8FD4" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#4A8FD4" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <!-- Y-axis labels -->
  <text x="4" y="14" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">$323k</text>
  <text x="4" y="${Math.round(svgH * 0.5) + 4}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">$318k</text>
  <text x="4" y="${svgH - 6}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">$313k</text>
  <!-- Grid lines -->
  <line x1="36" y1="12" x2="331" y2="12" stroke="#E2E4E5" stroke-width="1"/>
  <line x1="36" y1="${Math.round(svgH * 0.5)}" x2="331" y2="${Math.round(svgH * 0.5)}" stroke="#E2E4E5" stroke-width="1"/>
  <line x1="36" y1="${svgH - 10}" x2="331" y2="${svgH - 10}" stroke="#E2E4E5" stroke-width="1"/>
  <!-- Area fill -->
  <path d="M36,${yJan} C70,${yJan + 6} 90,${Math.round((yJan + yPeak) / 2)} 130,${yPeak} C160,${yPeak - 4} 180,${yPeak - 4} 210,${Math.round((yPeak + yMid) / 2)} C240,${yMid + 4} 270,${yMid + 4} 331,${yApr} L331,${svgH - 10} L36,${svgH - 10} Z" fill="url(#chartGrad)"/>
  <!-- Line -->
  <path d="M36,${yJan} C70,${yJan + 6} 90,${Math.round((yJan + yPeak) / 2)} 130,${yPeak} C160,${yPeak - 4} 180,${yPeak - 4} 210,${Math.round((yPeak + yMid) / 2)} C240,${yMid + 4} 270,${yMid + 4} 331,${yApr}" fill="none" stroke="#4A8FD4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- End dot -->
  <circle cx="331" cy="${yApr}" r="3.5" fill="#4A8FD4"/>
  <!-- Tooltip callout at end point -->
  <rect x="248" y="${yApr - 20}" width="80" height="16" rx="3" fill="#0F171F"/>
  <text x="288" y="${yApr - 9}" font-size="9" fill="#FFFFFF" text-anchor="middle" font-family="Open Sans,system-ui,sans-serif">Apr 2 · $319,448</text>
  <!-- Callout stem -->
  <line x1="331" y1="${yApr - 4}" x2="320" y2="${yApr - 4}" stroke="#0F171F" stroke-width="1"/>
  <!-- X-axis labels -->
  <text x="36"  y="${chartH}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">Jan</text>
  <text x="118" y="${chartH}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">Feb</text>
  <text x="200" y="${chartH}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">Mar</text>
  <text x="310" y="${chartH}" font-size="9" fill="#5B6C7B" font-family="Open Sans,system-ui,sans-serif">Apr</text>
</svg>`
      return `<div class="block-chart" style="${mb}">
  <div class="block-chart-period-row">
    <button class="block-chart-period-btn active-period">YTD</button>
    <button class="block-chart-period-btn">1M</button>
    <button class="block-chart-period-btn">3M</button>
    <button class="block-chart-period-btn">1Y</button>
    <button class="block-chart-period-btn">All</button>
  </div>
  ${svgChart}
  ${caption ? `<div class="block-chart-caption">${escapeHtml(caption)}</div>` : ''}
</div>`
    }
```

- [ ] **Step 4: Build and verify**

Run: `npm run build 2>&1 | grep -E "error TS|htmlRenderer"`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/core/designWorkshop/htmlRenderer.ts
git commit -m "feat(dw-a): apply confirmed Jazz DS tokens and chart color/tooltip updates"
```

---

## Task 5: Add CSS and renderBlock cases for metricsGrid, allocation, watchlist in htmlRenderer.ts

**Files:**
- Modify: `src/core/designWorkshop/htmlRenderer.ts` (CSS section + renderBlock)

- [ ] **Step 1: Add CSS for the three new block types**

After the `.delta-loss` rule (around line 356), add the following CSS inside the `BASE_CSS` template literal:

```css
  /* ── Metrics 2×2 grid block ── */
  .block-metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    overflow: hidden;
  }
  .block-metrics-cell {
    padding: 10px 14px;
    border-right: 1px solid var(--jazz-border);
    border-bottom: 1px solid var(--jazz-border);
  }
  .block-metrics-cell:nth-child(2n) { border-right: none; }
  .block-metrics-cell:nth-last-child(-n+2) { border-bottom: none; }
  .block-metrics-label {
    font-size: 10px;
    color: var(--jazz-muted);
    margin-bottom: 3px;
    line-height: 1.3;
  }
  .block-metrics-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--jazz-text);
  }
  .block-metrics-value.gain { color: var(--jazz-gain); }

  /* ── Asset allocation block ── */
  .block-allocation {
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .block-allocation-donut { flex-shrink: 0; }
  .block-allocation-legend { flex: 1; display: flex; flex-direction: column; gap: 7px; }
  .block-alloc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .block-alloc-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .block-alloc-label { flex: 1; color: var(--jazz-muted); }
  .block-alloc-pct   { font-weight: 600; color: var(--jazz-text); }

  /* ── Watchlist block ── */
  .block-watchlist {
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    overflow: hidden;
  }
  .block-watchlist-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 6px;
    border-bottom: 1px solid var(--jazz-border);
  }
  .block-watchlist-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--jazz-text);
  }
  .block-watchlist-row {
    display: flex;
    align-items: center;
    padding: 8px 14px;
    border-bottom: 1px solid var(--jazz-border);
    gap: 10px;
  }
  .block-watchlist-row:last-child { border-bottom: none; }
  .block-watchlist-logo {
    width: 28px; height: 28px;
    border-radius: 14px;
    border: 1px solid var(--jazz-border);
    flex-shrink: 0;
    display: block;
  }
  .block-watchlist-ticker { font-size: 12px; font-weight: 700; color: var(--jazz-primary); flex: 1; }
  .block-watchlist-price  { font-size: 12px; color: var(--jazz-text); }
  .block-watchlist-chg    { font-size: 11px; font-weight: 600; min-width: 60px; text-align: right; }
  .block-watchlist-chg.gain { color: var(--jazz-gain); }
  .block-watchlist-chg.loss { color: var(--jazz-loss); }
```

- [ ] **Step 2: Add metricsGrid case to renderBlock**

After the `case 'chart':` closing brace and before `default:`, add:

```typescript
    case 'metricsGrid': {
      const cells = block.items.map(item => {
        const gainClass = item.gain ? ' gain' : ''
        return `<div class="block-metrics-cell">
  <div class="block-metrics-label">${escapeHtml(item.label)}</div>
  <div class="block-metrics-value${gainClass}">${escapeHtml(item.value)}</div>
</div>`
      }).join('\n')
      return `<div class="block-metrics-grid" style="${mb}">${cells}</div>`
    }

    case 'allocation': {
      // Donut SVG: r=34, stroke-width=20, cx=40, cy=40 → 80×80px
      // circumference = 2π*34 ≈ 213.6
      // Each segment uses its own full circle but only shows its arc via stroke-dasharray.
      // stroke-dashoffset shifts the start position: each segment starts where the previous ended.
      // We rotate by -90° (top of circle = start), so base offset = C/4 for all segments.
      // Then subtract cumulative arc lengths for segments after the first.
      const C = 213.6
      const eqDash  = (block.equity       / 100) * C
      const fiDash  = (block.fixedIncome  / 100) * C
      const altDash = (block.altAssets    / 100) * C
      // stroke-dashoffset: positive = rotate start clockwise from SVG default (3-o-clock)
      // With rotate(-90 40 40), 3-o-clock becomes 12-o-clock. Each subsequent segment
      // shifts backward by the cumulative arc consumed.
      const eqOffset  = C / 4                    // start at top (12 o'clock)
      const fiOffset  = C / 4 - eqDash           // start after equity arc
      const altOffset = C / 4 - eqDash - fiDash  // start after equity + fixed arc
      const total = block.total ?? `$${Math.round(block.equity + block.fixedIncome + block.altAssets)}k`
      const donutSvg = `<svg width="80" height="80" viewBox="0 0 80 80" class="block-allocation-donut">
  <circle cx="40" cy="40" r="34" fill="none" stroke="#7B9E4B" stroke-width="20"
    stroke-dasharray="${eqDash.toFixed(1)} ${C.toFixed(1)}"
    stroke-dashoffset="${eqOffset.toFixed(1)}" transform="rotate(-90 40 40)"/>
  <circle cx="40" cy="40" r="34" fill="none" stroke="#2E7E9E" stroke-width="20"
    stroke-dasharray="${fiDash.toFixed(1)} ${C.toFixed(1)}"
    stroke-dashoffset="${fiOffset.toFixed(1)}" transform="rotate(-90 40 40)"/>
  <circle cx="40" cy="40" r="34" fill="none" stroke="#6B5B95" stroke-width="20"
    stroke-dasharray="${altDash.toFixed(1)} ${C.toFixed(1)}"
    stroke-dashoffset="${altOffset.toFixed(1)}" transform="rotate(-90 40 40)"/>
  <text x="40" y="37" text-anchor="middle" font-size="9" fill="#414042" font-family="Open Sans,system-ui">Total</text>
  <text x="40" y="48" text-anchor="middle" font-size="10" font-weight="600" fill="#414042" font-family="Open Sans,system-ui">${escapeHtml(total)}</text>
</svg>`
      return `<div class="block-allocation" style="${mb}">
  ${donutSvg}
  <div class="block-allocation-legend">
    <div class="block-alloc-row">
      <div class="block-alloc-dot" style="background:#7B9E4B"></div>
      <div class="block-alloc-label">Equity</div>
      <div class="block-alloc-pct">${block.equity.toFixed(2)}%</div>
    </div>
    <div class="block-alloc-row">
      <div class="block-alloc-dot" style="background:#2E7E9E"></div>
      <div class="block-alloc-label">Fixed Income</div>
      <div class="block-alloc-pct">${block.fixedIncome.toFixed(2)}%</div>
    </div>
    <div class="block-alloc-row">
      <div class="block-alloc-dot" style="background:#6B5B95"></div>
      <div class="block-alloc-label">Alt Assets</div>
      <div class="block-alloc-pct">${block.altAssets.toFixed(2)}%</div>
    </div>
  </div>
</div>`
    }

    case 'watchlist': {
      const rows = block.items.map(item => {
        const logoUri = getTickerLogoDataUri(item.ticker)
        const chgClass = item.gain ? 'gain' : 'loss'
        return `<div class="block-watchlist-row">
  <img src="${logoUri}" class="block-watchlist-logo" alt="${escapeHtml(item.ticker)}"/>
  <div class="block-watchlist-ticker">${escapeHtml(item.ticker)}</div>
  <div class="block-watchlist-price">${escapeHtml(item.price)}</div>
  <div class="block-watchlist-chg ${chgClass}">${escapeHtml(item.change)}</div>
</div>`
      }).join('\n')
      return `<div class="block-watchlist" style="${mb}">
  <div class="block-watchlist-header">
    <span class="block-watchlist-title">${escapeHtml(block.title)}</span>
  </div>
  ${rows}
</div>`
    }
```

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | grep -E "error TS|htmlRenderer"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/core/designWorkshop/htmlRenderer.ts
git commit -m "feat(dw-a): render metricsGrid, allocation, watchlist blocks in HTML prototype"
```

---

## Task 6: Add Figma canvas placeholder cases to renderer.ts

**Files:**
- Modify: `src/core/designWorkshop/renderer.ts`

- [ ] **Step 1: Locate the chart case in renderer.ts**

Find `case 'chart':` (around line 688). The pattern is: create frame, set fills/strokes/radius, add centred text label, return frame.

- [ ] **Step 2: Add three new cases after chart**

After the closing `}` of `case 'chart':` and before `default:`, add:

```typescript
    case 'metricsGrid': {
      const mgFrame = figma.createFrame()
      mgFrame.name = 'Metrics Grid'
      mgFrame.resize(maxWidth, 80)
      mgFrame.fills = [getImageFill(fidelity, useJazz)]
      mgFrame.strokes = [getImageStroke(fidelity, intent)]
      mgFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      mgFrame.layoutMode = 'VERTICAL'
      mgFrame.primaryAxisAlignItems = 'CENTER'
      mgFrame.counterAxisAlignItems = 'CENTER'
      const mgLabel = await createTextNode(`Metrics (${block.items.length} cells)`, {
        fontSize: 11,
        fontName: fonts.regular,
        fills: [getPlaceholderColor(fidelity)]
      })
      mgFrame.appendChild(mgLabel)
      return mgFrame
    }

    case 'allocation': {
      const allocFrame = figma.createFrame()
      allocFrame.name = 'Asset Allocation'
      allocFrame.resize(maxWidth, 90)
      allocFrame.fills = [getImageFill(fidelity, useJazz)]
      allocFrame.strokes = [getImageStroke(fidelity, intent)]
      allocFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      allocFrame.layoutMode = 'VERTICAL'
      allocFrame.primaryAxisAlignItems = 'CENTER'
      allocFrame.counterAxisAlignItems = 'CENTER'
      const allocLabel = await createTextNode(
        `Equity ${block.equity}% · Fixed ${block.fixedIncome}% · Alt ${block.altAssets}%`,
        { fontSize: 10, fontName: fonts.regular, fills: [getPlaceholderColor(fidelity)] }
      )
      allocFrame.appendChild(allocLabel)
      return allocFrame
    }

    case 'watchlist': {
      const wlFrame = figma.createFrame()
      wlFrame.name = block.title
      wlFrame.resize(maxWidth, 24 + block.items.length * 36)
      wlFrame.fills = [getImageFill(fidelity, useJazz)]
      wlFrame.strokes = [getImageStroke(fidelity, intent)]
      wlFrame.cornerRadius = getCornerRadius(fidelity, intent, useJazz)
      wlFrame.layoutMode = 'VERTICAL'
      wlFrame.primaryAxisAlignItems = 'CENTER'
      wlFrame.counterAxisAlignItems = 'CENTER'
      const wlLabel = await createTextNode(
        `${block.title} · ${block.items.map(i => i.ticker).join(', ')}`,
        { fontSize: 10, fontName: fonts.regular, fills: [getPlaceholderColor(fidelity)] }
      )
      wlFrame.appendChild(wlLabel)
      return wlFrame
    }
```

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | grep -E "error TS|renderer\.ts"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/core/designWorkshop/renderer.ts
git commit -m "feat(dw-a): add Figma canvas placeholders for metricsGrid, allocation, watchlist"
```

---

## Task 7: Rewrite Dashboard preset and update Positions preset in demoPreset.ts

**Files:**
- Modify: `src/core/designWorkshop/demoPreset.ts`

- [ ] **Step 1: Replace FIFI_DASHBOARD_PRESET blocks**

Replace the `screens` array of `FIFI_DASHBOARD_PRESET` (lines 58–87) with:

```typescript
  screens: [
    {
      name: 'Dashboard',
      layout: { direction: 'vertical', padding: 0, gap: 0 },
      blocks: [
        // Hero tile
        { type: 'card', title: 'Account Value', content: '$319,448.13 · ▲ +$5,572.13 (+1.78%) today' },
        // 2×2 summary metrics
        {
          type: 'metricsGrid',
          items: [
            { label: "Day's Gain", value: '$0.00' },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        // YTD area chart
        { type: 'chart', height: 150, caption: 'YTD performance' },
        // Top positions with values
        { type: 'heading', text: 'Positions', level: 3 },
        { type: 'card', title: 'VTIP', content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',  content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'VCSH', content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'VOO',  content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'SCHD', content: '$24,082.26 · +1.9%' },
        { type: 'button', text: 'Showing 5 of 10 positions', variant: 'secondary' },
        // Asset allocation
        { type: 'allocation', equity: 23.32, fixedIncome: 74.89, altAssets: 1.79, total: '$319k' },
        // Watchlist
        {
          type: 'watchlist',
          title: 'Recession Investing',
          items: [
            { ticker: 'SPLV', price: '$67.21', change: '+0.32%', gain: true },
            { ticker: 'TLT',  price: '$88.45', change: '-0.18%', gain: false },
            { ticker: 'VIG',  price: '$185.30', change: '+0.91%', gain: true },
          ]
        }
      ]
    }
  ]
```

- [ ] **Step 2: Update FIFI_POSITIONS_PRESET blocks with reference values**

Replace the blocks in `FIFI_POSITIONS_PRESET` (lines 113–128) with:

```typescript
      blocks: [
        { type: 'card', title: 'Portfolio Value', content: '$319,448.13 · 10 positions' },
        { type: 'card', title: 'Total Gain / Loss', content: '+$13,466.95 (+4.40%)' },
        { type: 'spacer', height: 4 },
        { type: 'card', title: 'VTIP',  content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',   content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'VCSH',  content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'VOO',   content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'SCHD',  content: '$24,082.26 · +1.9%' },
        { type: 'card', title: 'VDC',   content: '$18,200.00 · -0.6%' },
        { type: 'card', title: 'SGOV',  content: '$9,948.30 · +0.1%' },
        { type: 'card', title: 'GLDM',  content: '$8,760.00 · +3.4%' },
        { type: 'card', title: 'JPM',   content: '$2,100.28 · +0.9%' },
        { type: 'spacer', height: 8 },
        { type: 'button', text: 'Add Position', variant: 'primary' }
      ]
```

- [ ] **Step 3: Update Dashboard screen in FIFI_FLOW_PRESET (screen index 2) to use metricsGrid**

Replace the Dashboard screen blocks in `FIFI_FLOW_PRESET` (currently lines 186–199) with:

```typescript
    {
      name: 'Dashboard',
      layout: { direction: 'vertical', padding: 0, gap: 0 },
      blocks: [
        { type: 'card', title: 'Account Value', content: '$319,448.13 · ▲ +$5,572.13 (+1.78%)' },
        {
          type: 'metricsGrid',
          items: [
            { label: "Day's Gain", value: '$0.00' },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        { type: 'chart', height: 120, caption: 'YTD performance' },
        { type: 'heading', text: 'Top Positions', level: 3 },
        { type: 'card', title: 'VTIP', content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',  content: '$69,359.97 · +1.1%' },
        { type: 'button', text: 'See All Positions', variant: 'primary' }
      ]
    },
```

- [ ] **Step 4: Build — the build-time validation in demoPreset.ts will catch any schema errors**

Run: `npm run build 2>&1 | grep -E "error TS|DW-A|demoPreset"`
Expected: no errors, no "DW-A … is invalid" messages

- [ ] **Step 5: Commit**

```bash
git add src/core/designWorkshop/demoPreset.ts
git commit -m "feat(dw-a): rewrite dashboard preset with exact reference values, allocation, watchlist"
```

---

## Task 8: Update color constants in DesignWorkshopPanel.tsx

**Files:**
- Modify: `src/ui/components/DesignWorkshopPanel.tsx:35-41`

- [ ] **Step 1: Update the two stale color constants**

Find lines 35–41:
```typescript
const JAZZ_BLUE    = '#005EB8'
const JAZZ_GREEN   = '#128842'
const JAZZ_TEXT    = '#101820'
const JAZZ_MUTED   = '#676C6F'
const JAZZ_BORDER  = '#D4D4D4'
const JAZZ_SURFACE1 = '#F5F7F8'
const JAZZ_ICON_BG = '#E8F0FA'
```

Replace with:
```typescript
const JAZZ_BLUE    = '#005EB8'
const JAZZ_GREEN   = '#128842'
const JAZZ_TEXT    = '#0F171F'
const JAZZ_MUTED   = '#5B6C7B'
const JAZZ_BORDER  = '#E2E4E5'
const JAZZ_SURFACE1 = '#F5F7F8'
const JAZZ_ICON_BG = '#E8F0FA'
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | grep -E "error TS|DesignWorkshopPanel"`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/DesignWorkshopPanel.tsx
git commit -m "fix(dw-a): correct Jazz DS color tokens in DesignWorkshopPanel"
```

---

## Task 9: Full build verification and smoke test

**Files:**
- Read: `src/core/designWorkshop/demoPreset.ts` (confirm build-time validation passes)

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: exits 0, no TypeScript errors, no "DW-A … is invalid" build-time errors

- [ ] **Step 2: Run invariants check**

Run: `npm run invariants`
Expected: exits 0

- [ ] **Step 3: Verify all 4 demo presets validate**

The build-time validation loop in `demoPreset.ts` runs at import time. If any preset has an invalid schema, the build will fail with `[DW-A] … is invalid`. A clean build confirms all presets are valid.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(dw-a): dashboard reference match — Jazz DS tokens, chart, allocation, watchlist"
```
