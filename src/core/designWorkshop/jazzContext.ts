/**
 * Jazz Design System constants for DW-A prompt injection and rendering.
 * Source of truth for all Jazz color, radius, and typography values in the plugin renderer.
 */

/** Jazz colors as Figma 0–1 RGB values */
export const JAZZ_RGB = {
  primary:        { r: 0,     g: 0.369, b: 0.722 }, // #005EB8
  primaryHover:   { r: 0,     g: 0.275, b: 0.573 }, // #004692
  navy:           { r: 0,     g: 0.184, b: 0.424 }, // #002F6C — primaryActive / heroBg
  text:           { r: 0.063, g: 0.094, b: 0.125 }, // #101820
  muted:          { r: 0.404, g: 0.424, b: 0.435 }, // #676C6F
  subdued:        { r: 0.522, g: 0.533, b: 0.541 }, // #85888A — inactive nav, secondary labels, placeholders
  border:         { r: 0.886, g: 0.894, b: 0.898 }, // #E2E4E5
  surface0:       { r: 1,     g: 1,     b: 1     }, // #FFFFFF
  surface1:       { r: 0.961, g: 0.969, b: 0.973 }, // #F5F7F8
  surface2:       { r: 0.945, g: 0.945, b: 0.941 }, // #F1F1F0
  iconSurface:    { r: 0.910, g: 0.941, b: 0.980 }, // #E8F0FA
  cta:            { r: 0.071, g: 0.533, b: 0.259 }, // #128842 — CTA green, primary buttons only
  gain:           { r: 0.071, g: 0.533, b: 0.259 }, // #128842 — positive delta indicator
  loss:           { r: 0.855, g: 0.043, b: 0.086 }, // #DA0B16 — negative delta indicator
  error:          { r: 0.749, g: 0.129, b: 0.333 }, // #BF2155 — form validation / system errors
  warning:        { r: 0.835, g: 0.420, b: 0.004 }, // #D56B01
}

/** Jazz border radius in pixels — always 4, the defining Jazz characteristic */
export const JAZZ_RADIUS = 4

/** System prompt context block injected into DW-A prepareMessages */
export const JAZZ_CONTEXT_BLOCK = `
=== JAZZ DESIGN SYSTEM — REQUIRED STYLING ===
You MUST use Jazz Design System tokens. Do not use generic or arbitrary colors.

COLORS:
- Primary blue: #005EB8 — buttons (non-CTA), borders, active states, links
- Hero / header bg: #002F6C — fixed header bars, status bars, splash screens
- CTA green: #128842 — ONE primary CTA button per screen ONLY. Never use green elsewhere.
- Gain (positive delta): #128842 — value-up indicators (prefix with "+")
- Loss (negative delta): #DA0B16 — value-down indicators (prefix with "−")
- Body text: #101820
- Muted label text: #676C6F — secondary labels, captions
- Subdued text: #85888A — inactive items, placeholders, tertiary labels
- Border: #E2E4E5
- Background: #F5F7F8 (surface1) — page background
- Card surface: #FFFFFF (surface0)
- Error: #BF2155 — form validation errors only

BORDER RADIUS: Always 4px. This is the defining Jazz characteristic.

TYPOGRAPHY SCALE:
- h1 (40px/700): SPLASH and ONBOARDING ONLY. Never on data or dashboard screens.
- h2 (28px/600): Primary intro line on auth/settings screens. Use sparingly.
- h3 (22px/600): Section headers within a screen. Use instead of h2 on most screens.
- h4 (18px/600): Sub-section labels.
- Body (16px/400): Standard content.
- Caption (12px/400-600): Labels, eyebrows, tags.
- Button label: 14px/600.
- Table header: 11px/600. Table data: 13px/400.

CRITICAL SCREEN COMPOSITION RULES:
1. The nav bar already shows the screen name. NEVER add an h1 or h2 that repeats the screen name.
2. Lead with content, not titles. Dashboard → lead with metric cards. List → lead with summary + items.
3. Use h3 or h4 (not h1/h2) for section labels inside data screens.
4. Compact data screens: padding 16, gap 8. Onboarding/form screens: padding 24, gap 16.
5. CTA button always last, pinned to bottom via a spacer before it.

SCREEN ARCHETYPES:

DASHBOARD / OVERVIEW:
- No redundant heading. Start directly with metric cards.
- Metric card pattern: { type: "card", title: "Short Label", content: "$X,XXX.XX" }
- Stack 2-3 metric cards (gap 8), then a spacer, then a list section label (bodyText), then compact list cards, then CTA.
- Change/delta values: include inline — e.g. content: "+$1,230.00 (+1.1%)"

POSITIONS / LIST SCREENS:
- Start with a summary card (total count or total value).
- Compact list: gap 8, each card uses title for the primary identifier and content for one-line details.
- Detail line format: "X units · $X.XX · +X.X%" or "X units · $X.XX · −X.X%"
- Positive delta in content: prefix with "+" — renderer will color gain (#128842).
- Negative delta in content: prefix with "−" — renderer will color loss (#DA0B16).

FORM / AUTH SCREENS:
- h2 or h3 for the form title.
- Inputs stacked with gap 12.
- Primary CTA button below inputs with spacer before it.
- Secondary action (link-style) as a tertiary button below primary.

ONBOARDING / SPLASH SCREENS:
- Only screens where h1 is appropriate.
- Large spacer at top, h1, bodyText subtitle, spacer, primary CTA, secondary button.

BUTTONS:
- Primary CTA (ONE per screen): variant "primary" → #128842 green
- Secondary action: variant "secondary" → #005EB8 blue
- Ghost / tertiary: variant "tertiary"

FIDELITY: Always "hi". DENSITY: "comfortable".

BLOCK VOCABULARY — only these types:
heading | bodyText | button | input | card | spacer | image | chart | metricsGrid | allocation | watchlist

Every screen MUST have at least 3 blocks. Never output an empty blocks array.
`
