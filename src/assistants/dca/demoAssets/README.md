# Demo Assets Builder System

This module provides a reusable, deterministic system for building demo screens on the Figma stage without LLM calls. It functions as a mini component library in code.

## Architecture

- **`tokens.ts`**: Design tokens (colors, spacing, radii, stroke weights, fonts)
- **`textStyles.ts`**: Named text style definitions mapping typography specs to Figma properties
- **`primitives.ts`**: Low-level helpers (color conversion, auto-layout, text styling, font loading)
- **`components.ts`**: Reusable component builders (badge, section, button, checkbox, banner, card)
- **`screens.ts`**: Complete demo screen builders (one per deceptive UX dimension)

## Adding a New Demo Screen

1. **Define the screen builder function** in `screens.ts`:

```typescript
export async function createMyNewDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — My Pattern',
    'Brief description of what to detect.'
  )

  // Build UI using component builders
  const section = createSection('MySection', { padding: 12, spacing: 8 })
  const title = await createText('My Title', 'title16Bold')
  const button = await createButton('Click me', 'primary')
  
  section.appendChild(title)
  section.appendChild(button)
  frame.appendChild(section)

  frame.locked = true
  return frame
}
```

2. **Add to the builders array** in `screens.ts`:

```typescript
export const demoScreenBuilders = [
  // ... existing builders
  createMyNewDemoScreen
] as const
```

3. **Wire into the handler** (if needed): The handler automatically iterates over `demoScreenBuilders`, so no additional wiring is required.

## Adding a New Text Style

1. **Define the style** in `textStyles.ts`:

```typescript
export const textStyles = {
  // ... existing styles
  myNewStyle: {
    fontFamily: fonts.inter,
    fontSize: 15,
    fontWeight: 'Medium' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle
}
```

2. **Use it in components**:

```typescript
const node = await createText('My text', 'myNewStyle')
```

## Typography Mapping

### Line Height: "normal"

When a design specifies `lineHeight: "normal"`, we use Figma's AUTO line height:

```typescript
lineHeight: { unit: 'AUTO' }
```

For fixed pixel values, use:

```typescript
lineHeight: { unit: 'PIXELS', value: 20 }
```

### Unsupported CSS Properties

The following CSS properties are not supported by the Figma API and should be ignored:

- **`leading-trim`**: Text edge trimming (not available in Figma)
- **`text-edge`**: Text edge rendering (not available in Figma)

These properties are typically used for precise typography control in web/CSS but have no Figma equivalent. The demo screens focus on visual representation rather than pixel-perfect CSS matching.

## Component Usage Examples

### Creating a Button

```typescript
const button = await createButton('Submit', 'primary', { name: 'SubmitButton' })
```

### Creating a Checkbox Row

```typescript
const checkbox = await createCheckbox('Accept terms', true)
```

### Creating Text with Style

```typescript
const title = await createText('My Title', 'title16Bold', { fillContainer: true })
const helper = await createText('Helper text', 'helper10Regular', { fillContainer: false })
```

### Creating a Section/Card

```typescript
const card = createCardFrame('MyCard', {
  padding: 16,
  spacing: 12,
  fill: colors.bgLight,
  cornerRadius: 8,
  stroke: { color: colors.borderLight, weight: 1 }
})
```

## Deterministic Output

All builders are designed to produce **exactly the same output** on every run:

- Explicit sizes (no random or time-based values)
- Explicit auto-layout settings (padding, itemSpacing, sizing modes)
- Explicit fontName/fontSize/fontWeight/fills per text node via textStyles
- No dependencies on external state or user input

This ensures demo screens are consistent and reproducible for testing the "Deceptive Review" Quick Action.
