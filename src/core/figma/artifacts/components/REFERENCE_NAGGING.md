# Deceptive Demo — Nagging Card Reference Design

**Purpose:** Design specifications for the centralized Nagging card component  
**Source:** Visual reference (screenshot) + pattern matching with Forced Action card

---

## Container Structure

The component creates a **full container hierarchy** matching the Forced Action pattern:

### Root Frame
- **Name:** "Deceptive Demo — Nagging"
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
  - **Title:** "Deceptive Demo — Nagging"
    - Font: Inter Bold, 16px
    - Fill: `rgb(0.1, 0.1, 0.1)`
  - **Description:** "Repeated prompts that reappear after dismissal."
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
    - Uses line break character (`\n`) for multi-line text

#### 4. UI Demo Block (Inner Card)
- **Name:** "UI Demo"
- **Layout:** Vertical auto-layout
- **Padding:** 16px (all sides)
- **Item Spacing:** 16px
- **Corner Radius:** 12px
- **Fill:** Lavender tint (`rgb(0.97, 0.96, 1.0)`) - **ASSUMPTION** (approximated from screenshot)
- **Stroke:** Dashed outline
  - **Color:** Orange (`rgb(1, 0.56666666, 0.0)`)
  - **Weight:** 2px
  - **Dash Pattern:** `[4, 4]` (4px dash, 4px gap) - **ASSUMPTION** (same as Forced Action)
- **Clips Content:** true

**UI Demo Content Structure:**

Two prompt rows stacked vertically:

**Prompt Row 1: "Enable Notifications"**
- **Layout:** Horizontal auto-layout
- **Item Spacing:** 12px (between checkbox and text block)
- **Children:**
  - **Checkbox:** 14x14px rectangle
    - Fill: white
    - Stroke: `rgb(0.5, 0.5, 0.5)`, strokeWeight 1px
    - Corner radius: 3px
  - **Text Block:** Vertical auto-layout
    - Item Spacing: 4px (between heading and subtext)
    - **Heading:** "Enable Notifications"
      - Font: Inter Bold, 14px
      - Fill: `rgb(0.1, 0.1, 0.1)`
    - **Subtext:** "Stay updated with alerts."
      - Font: Inter Regular, 12px
      - Fill: `rgb(0.35, 0.35, 0.35)`

**Prompt Row 2: "Enable Location?"**
- **Layout:** Horizontal auto-layout
- **Item Spacing:** 12px (same as row 1)
- **Children:**
  - **Checkbox:** 14x14px rectangle (same as row 1)
  - **Text Block:** Vertical auto-layout
    - Item Spacing: 4px (same as row 1)
    - **Heading:** "Enable Location?"
      - Font: Inter Bold, 14px
      - Fill: `rgb(0.1, 0.1, 0.1)`
    - **Subtext:** "We need your location for better results."
      - Font: Inter Regular, 12px
      - Fill: `rgb(0.35, 0.35, 0.35)`

---

## Implementation Notes

### Container Hierarchy
The component builds the **complete container structure** (root + 4 children: badge, details, instructions, UI Demo), matching the Forced Action pattern for consistency.

### Lavender Fill Color
The UI Demo fill color (`rgb(0.97, 0.96, 1.0)`) is an approximation based on the screenshot. If the exact color is specified, it should be updated.

### Typography Scale
- Heading font size (14px) is slightly smaller than Forced Action heading (16px) to match the visual hierarchy in the screenshot
- Subtext uses secondary text color (`rgb(0.35, 0.35, 0.35)`) for visual hierarchy
- All other typography matches Forced Action card specifications

### Spacing
- Checkbox-to-text spacing: 12px (horizontal)
- Heading-to-subtext spacing: 4px (vertical within text block)
- Prompt row spacing: 16px (vertical, via UI Demo itemSpacing)

### Text Wrapping
All text nodes use:
- `layoutSizingHorizontal = 'FILL'` (stretches to fill container width)
- `textAutoResize = 'HEIGHT'` (allows wrapping based on available width)

---

## Usage

This card component is centralized in `src/core/figma/artifacts/components/deceptiveNaggingCard.ts` and is used by:
- TEMP Quick Action: `[TEMP] Place Forced Action Card` (places both Forced Action and Nagging cards side-by-side)

---

## Assumptions

1. **Lavender Fill:** The exact lavender tint color is approximated. If a specific color value is provided, it should be updated.
2. **Dash Pattern:** Uses the same default pattern as Forced Action (`[4, 4]`).
3. **Spacing:** Checkbox-to-text spacing (12px) and heading-to-subtext spacing (4px) are based on visual estimation from the screenshot.
4. **Font Sizes:** Heading size (14px) is slightly smaller than Forced Action (16px) to match visual hierarchy.

---

## Debug Logging

When debug logging is enabled for `subsystem:artifacts`, the component logs:
- Root frame name
- Number of children created
- Names and types of all children

This helps verify the structure is created correctly during development and troubleshooting.
