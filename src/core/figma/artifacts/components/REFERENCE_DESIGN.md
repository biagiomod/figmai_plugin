# Deceptive Demo — Forced Action Card Reference Design

**Purpose:** Design specifications for the centralized Forced Action card component  
**Source:** Figma Dev Mode JSON scrape

---

## Container Structure

The component creates a **full container hierarchy** with the following structure:

### Root Frame
- **Name:** "Deceptive Demo — Forced Action"
- **Layout:** Vertical auto-layout
- **Padding:** 16px (all sides)
- **Item Spacing:** 24px
- **Width:** Auto (hugs content)
- **Height:** Auto (hugs content)
- **Corner Radius:** 12px
- **Fill:** White (`rgb(1, 1, 1)` / `#FFFFFF`)
- **Clips Content:** true

### Children (in order)

#### 1. DemoBadge
- **Name:** "DemoBadge"
- **Layout:** Horizontal auto-layout
- **Padding:** 8px top/bottom, 12px left/right
- **Item Spacing:** 6px
- **Corner Radius:** 8px
- **Fill:** Warm peach (`rgb(1, 0.77673286, 0.58137393)`)
- **Clips Content:** true
- **Text:** "DEMO — Intentional Dark Pattern"
  - Font: Inter Bold, 11px
  - Fill: `rgb(0.2, 0.25, 0.32)`

#### 2. Details Block
- **Name:** "Details"
- **Layout:** Vertical auto-layout
- **Item Spacing:** 8px
- **Fill:** None (transparent)
- **Children:**
  - **Title:** "Deceptive Demo — Forced Action"
    - Font: Inter Bold, 16px
    - Fill: `rgb(0.1, 0.1, 0.1)`
  - **Description:** "Blocking content until unrelated account creation is completed."
    - Font: Inter Regular, 12px
    - Fill: `rgb(0.35, 0.35, 0.35)`

#### 3. Instructions Block
- **Name:** "Instructions"
- **Layout:** Vertical auto-layout
- **Item Spacing:** 8px
- **Fill:** None (transparent)
- **Children:**
  - **Label:** "Instructions"
    - Font: Inter Bold, 12px
    - Fill: `rgb(0.1, 0.1, 0.1)`
  - **Body:** "Select the below test content group\nClick the plugin Quick Action "Deceptive Review" to test"
    - Font: Inter Regular, 10px
    - Fill: `rgb(0.35, 0.35, 0.35)`
    - **Note:** Uses line break character (`\n`) for multi-line text. Bullet styling is not implemented via Figma Plugin API; formatted as two lines with line break.

#### 4. UI Demo Block (Inner Card)
- **Name:** "UI Demo"
- **Layout:** Vertical auto-layout
- **Padding:** 16px (all sides)
- **Item Spacing:** 16px
- **Corner Radius:** 12px
- **Fill:** Light blue tint (`rgb(0.96, 0.96, 1.0)`)
- **Stroke:** Dashed outline
  - **Color:** Orange (`rgb(1, 0.56666666, 0.0)`)
  - **Weight:** 2px
  - **Dash Pattern:** `[4, 4]` (4px dash, 4px gap) - **ASSUMPTION** (JSON didn't include dash pattern fields)
- **Clips Content:** true

**UI Demo Content Structure:**

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

### Container Hierarchy
The component builds the **complete container structure** (root + 4 children: badge, details, instructions, UI Demo). This ensures consistency across all uses:
- TEMP Quick Action placement
- Deceptive Demo Screens generator

### Dash Pattern
The JSON scrape does not include dash pattern fields. The component uses `setDashedStroke()` with a default pattern of `[4, 4]` (4px dash, 4px gap). This can be overridden via the `dashPattern` option in `ForcedActionCardOptions`.

### Color Values
All color values are specified directly from the JSON spec (RGB values) rather than using token system values, to ensure exact match with the reference design.

### Typography
Font specifications match JSON exactly:
- Inter Bold 11px for badge
- Inter Bold 16px for details title and UI Demo heading
- Inter Regular 12px for details description and UI Demo body
- Inter Bold 12px for instructions label and button labels
- Inter Regular 10px for instructions body

### Instructions Text Formatting
The instructions body uses a line break character (`\n`) to separate the two lines. Bullet styling is not implemented because the Figma Plugin API does not support rich text formatting with bullets. If bullet styling is required in the future, it would need to be implemented using prefix characters (e.g., "• ") or separate text nodes.

---

## Usage

This card component is centralized in `src/core/figma/artifacts/components/deceptiveForcedActionCard.ts` and is used by:
- TEMP Quick Action: `[TEMP] Place Forced Action Card`
- Deceptive Demo Screens: `createForcedActionDemoScreen()`

All implementations use this single source of truth to ensure consistency.

---

## Debug Logging

When debug logging is enabled for `subsystem:artifacts`, the component logs:
- Root frame name
- Number of children created
- Names and types of all children

This helps verify the structure is created correctly during development and troubleshooting.
