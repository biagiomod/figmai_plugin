/**
 * Jazz Design System constants for DW-A prompt injection and rendering.
 * Source of truth for all Jazz color, radius, and typography values in the plugin renderer.
 */

/** Jazz colors as Figma 0–1 RGB values */
export const JAZZ_RGB = {
  primary:     { r: 0,     g: 0.369, b: 0.722 }, // #005EB8
  navy:        { r: 0,     g: 0.184, b: 0.424 }, // #002F6C
  text:        { r: 0.063, g: 0.094, b: 0.125 }, // #101820
  muted:       { r: 0.404, g: 0.424, b: 0.435 }, // #676C6F
  border:      { r: 0.831, g: 0.831, b: 0.831 }, // #D4D4D4
  surface0:    { r: 1,     g: 1,     b: 1     }, // #FFFFFF
  surface1:    { r: 0.961, g: 0.969, b: 0.973 }, // #F5F7F8
  iconSurface: { r: 0.910, g: 0.941, b: 0.980 }, // #E8F0FA
  cta:         { r: 0.071, g: 0.533, b: 0.259 }, // #128842 — CTA green, primary buttons only
  error:       { r: 0.749, g: 0.129, b: 0.333 }, // #BF2155
}

/** Jazz border radius in pixels — always 4, the defining Jazz characteristic */
export const JAZZ_RADIUS = 4

/** System prompt context block injected into DW-A prepareMessages */
export const JAZZ_CONTEXT_BLOCK = `
=== JAZZ DESIGN SYSTEM — REQUIRED STYLING ===
You MUST use Jazz Design System tokens. Do not use generic or arbitrary colors.

COLORS:
- Primary blue: #005EB8 — buttons (non-CTA), borders, active states
- CTA green: #128842 — ONE primary CTA button per screen ONLY. Never use green elsewhere.
- Body text: #101820
- Muted / label text: #676C6F
- Border: #D4D4D4
- Screen background: #FFFFFF
- Card / surface: #FFFFFF fill with #D4D4D4 border

BORDER RADIUS: Always 4px. This is the defining Jazz characteristic. Never use rounded values like 8, 12, 20.

BUTTONS:
- Primary CTA (one per screen): variant "primary" — renderer will use #128842 green
- Standard primary: variant "secondary" — renderer will use #005EB8 blue
- Tertiary / ghost: variant "tertiary"

FIDELITY: Always use "hi".

DENSITY: "comfortable"

BLOCK VOCABULARY — only these block types (no others):
heading | bodyText | button | input | card | spacer | image

JAZZ SCREEN EXAMPLE:
{
  "name": "Welcome",
  "layout": { "direction": "vertical", "padding": 24, "gap": 16 },
  "blocks": [
    { "type": "heading", "text": "Welcome to FiFi", "level": 1 },
    { "type": "bodyText", "text": "Manage your finances with confidence." },
    { "type": "spacer", "height": 24 },
    { "type": "button", "text": "Get Started", "variant": "primary" },
    { "type": "button", "text": "Sign In", "variant": "secondary" }
  ]
}
`
