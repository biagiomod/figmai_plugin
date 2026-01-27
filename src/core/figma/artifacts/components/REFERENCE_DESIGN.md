# Deceptive Demo — Forced Action Card Reference Design

**Purpose:** Design specifications for the centralized Forced Action card component  
**Source:** Figma Dev Mode JSON scrape

---

## Card Specifications (UI Demo Frame)

### Frame Structure
- **Name:** "UI Demo"
- **Layout:** Vertical auto-layout
- **Padding:** 16px (all sides)
- **Item Spacing:** 16px
- **Width:** Auto (hugs content)
- **Height:** Auto (hugs content)
- **Corner Radius:** 12px
- **Clips Content:** true

### Visual Styling
- **Background:** `rgb(0.96, 0.96, 1.0)` (light blue tint)
- **Stroke:** Dashed outline
  - **Color:** `rgb(1, 0.56666666, 0.0)` (orange)
  - **Weight:** 2px
  - **Dash Pattern:** `[4, 4]` (4px dash, 4px gap) - **ASSUMPTION** (JSON didn't include dash pattern fields)

### Content Structure

1. **Heading Text** (required)
   - Text: "Create an account to continue" (default)
   - Font: Inter Bold, 16px
   - Fill: `rgb(0.1, 0.1, 0.1)`

2. **Body Text** (required)
   - Text: "Access to the article requires account creation." (default)
   - Font: Inter Regular, 12px
   - Fill: `rgb(0.1, 0.1, 0.1)`

3. **Checkbox** (optional)
   - Frame: "Checkbox_Email me updates"
   - Layout: HORIZONTAL, itemSpacing 8px
   - Checkbox box: 14x14px rectangle
     - Fill: white
     - Stroke: `rgb(0.5, 0.5, 0.5)`, strokeWeight 1px
     - Corner radius: 3px
   - Label: "Email me updates"
     - Font: Inter Regular, 12px
     - Fill: `rgb(0.1, 0.1, 0.1)`

4. **Button Row** (required)
   - Frame: "ButtonRow"
   - Layout: HORIZONTAL, itemSpacing 8px
   
   **Primary Button:**
   - Corner radius: 6px
   - Fill: `rgb(0.16, 0.49, 0.98)`
   - Padding: 16px left/right, 12px top/bottom
   - Text: Inter Bold, 12px, fill white
   
   **Secondary Button:**
   - Corner radius: 6px
   - Fill: `rgb(0.9, 0.9, 0.92)`
   - Stroke: `rgb(0.75, 0.77, 0.8)`, strokeWeight 1px
   - Padding: 16px left/right, 12px top/bottom
   - Text: Inter Bold, 12px, fill `rgb(0.15, 0.15, 0.2)`

---

## Implementation Notes

### Dash Pattern
The JSON scrape does not include dash pattern fields. The component uses `setDashedStroke()` with a default pattern of `[4, 4]` (4px dash, 4px gap). This can be overridden via the `dashPattern` option in `ForcedActionCardOptions`.

### Color Values
All color values are specified directly from the JSON spec (RGB values) rather than using token system values, to ensure exact match with the reference design.

### Typography
Font specifications match JSON exactly:
- Inter Bold 16px for heading
- Inter Regular 12px for body and checkbox label
- Inter Bold 12px for button labels

---

## Usage

This card component is centralized in `src/core/figma/artifacts/components/deceptiveForcedActionCard.ts` and is used by:
- TEMP Quick Action: `[TEMP] Place Forced Action Card`
- Deceptive Demo Screens: `createForcedActionDemoScreen()`

All implementations use this single source of truth to ensure consistency.
