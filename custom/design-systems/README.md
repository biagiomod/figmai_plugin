# Design System Component Registry

The Design System Component Registry enables Assistants to discover, query, and place shared library components on the Figma canvas. Each registry is self-contained with rich metadata, allowing LLMs to make intelligent component selection decisions.

## Overview

The registry system allows you to:
- Define design system components with rich metadata (purpose, when to use, accessibility notes)
- Enable Assistants to recommend and place components automatically
- Maintain component documentation in a structured, LLM-friendly format
- Control which registries are active via configuration (work-only protection)

## Key Principles

1. **No Global Taxonomy**: Each registry is self-describing. No cross-registry taxonomy alignment required.
2. **Self-Contained**: Each component entry includes all information needed for LLM selection (purpose, whenToUse, whenNotToUse, examples).
3. **Config-Driven**: Registry activation controlled via `custom/config.json` (no runtime switching).
4. **Work-Only Protection**: Example/demo registries disabled by default; allowlist/denylist prevent accidental activation.

## File Structure

```
custom/design-systems/
├── README.md                    # This file
├── example/                     # Example DS (disabled by default, for testing only)
│   ├── registry.json
│   ├── components/
│   │   └── button.md
│   └── README.md
└── <your-registry-id>/         # Your custom registry
    ├── registry.json            # Required: Component registry
    ├── components/              # Optional: Per-component Markdown docs
    │   └── <component-name>.md
    └── README.md                # Optional: Registry overview
```

## Registry JSON Schema

Each registry must have a `registry.json` file in its directory.

### Registry Structure

```json
{
  "id": "custom",
  "name": "My Design System",
  "version": "1.0.0",
  "description": "Brief description of the design system",
  "components": [
    {
      "name": "Component Name",
      "key": "I123:456;789:012",
      "purpose": "Clear description of what this component does",
      "whenToUse": [
        "Use case 1",
        "Use case 2"
      ],
      "whenNotToUse": [
        "Anti-pattern 1"
      ],
      "examples": [
        "Example scenario 1"
      ],
      "isComponentSet": true,
      "variantProperties": {
        "Size": ["Small", "Medium", "Large"]
      },
      "accessibility": {
        "minSize": { "width": 44, "height": 44 },
        "requiredLabels": ["Label text"],
        "contrastRequirements": "WCAG AA: 4.5:1"
      },
      "implementationNotes": "Coding considerations",
      "commonPitfalls": [
        "Pitfall to avoid"
      ],
      "docFile": "components/component-name.md"
    }
  ]
}
```

### Required Fields

- `id`: Unique registry identifier (must match directory name)
- `name`: Human-readable registry name
- `components`: Array of component entries

### Component Entry Required Fields

- `name`: Component name (e.g., "Primary Button")
- `key`: Figma component key (required for placement)
- `purpose`: Clear description of component purpose
- `whenToUse`: Array of use case descriptions (helps LLM choose)

### Component Entry Optional Fields

- `aliases`: Array of alternative names (scoped to this registry only)
- `whenNotToUse`: Array of anti-patterns
- `examples`: Array of example scenarios
- `isComponentSet`: Boolean (true if component set)
- `variantProperties`: Object mapping property names to value arrays
- `accessibility`: Accessibility requirements object
- `implementationNotes`: Coding considerations
- `commonPitfalls`: Array of things to avoid
- `docFile`: Relative path to component Markdown doc

## Component Documentation (Optional)

Per-component Markdown files provide detailed documentation for humans and LLMs. Place them in `components/<component-name>.md`.

**Recommended sections:**
- Overview
- Anatomy
- Variants
- Accessibility
- Implementation (code examples)
- Examples
- Common Pitfalls

See `example/components/button.md` for a complete example.

## Configuration

Configure registries in `custom/config.json`:

```json
{
  "designSystems": {
    "enabled": true,
    "activeRegistries": ["custom"],
    "allowlist": ["custom"],
    "denylist": ["example"],
    "strictMode": true
  }
}
```

### Config Fields

- `enabled`: Master enable/disable (default: `false`)
- `activeRegistries`: Array of registry IDs to activate (e.g., `["custom"]`)
- `allowlist`: Only these registry IDs can load (optional, most restrictive)
- `denylist`: These registry IDs cannot load (optional)
- `strictMode`: If `true`, registry load failures disable entire system (default: `false`)

### Work-Only Configuration

To ensure only work registries load (prevent example DS activation):

```json
{
  "designSystems": {
    "enabled": true,
    "activeRegistries": ["custom"],
    "allowlist": ["custom"],
    "strictMode": true
  }
}
```

**Protection layers:**
1. Example DS not in `activeRegistries` (default)
2. `allowlist: ["custom"]` blocks any non-allowed registries
3. `denylist: ["example"]` explicitly blocks example DS
4. `strictMode: true` fails loudly on misconfiguration

## Authoring Workflow

### Option 1: LLM-Assisted Generation

Use this template prompt with an LLM to generate registry entries:

```
You are helping create a Design System Component Registry JSON file for a Figma plugin.

Given a list of Figma component keys and brief descriptions, generate a valid registry.json file.

Registry Structure:
- id: unique identifier (e.g., "custom", "work")
- name: human-readable name
- components: array of component entries

Each component entry must include:
- name: component name
- key: Figma component key (provided)
- purpose: clear description of what this component does
- whenToUse: array of 3-5 use case descriptions
- whenNotToUse: array of 2-3 anti-patterns (optional but recommended)
- examples: array of example scenarios (optional)
- accessibility: minSize, requiredLabels, contrastRequirements (if applicable)
- implementationNotes: coding considerations (optional)
- commonPitfalls: things to avoid (optional)
- isComponentSet: true if component set, false or omit if single component
- variantProperties: object mapping property names to arrays of values (if component set)

Input format:
Component Key: <key>
Description: <brief description>

Generate the registry.json following the schema above. Focus on clarity and LLM-selectability.
No global taxonomy needed - each component should be self-describing.
```

### Option 2: Manual Authoring

1. Create directory: `custom/design-systems/<your-registry-id>/`
2. Create `registry.json` following the schema
3. (Optional) Create `components/*.md` files for detailed docs
4. Update `custom/config.json` to activate your registry
5. Rebuild: `npm run build`

## Finding Component Keys

To find a component's key in Figma:

1. **Via Plugin Dev Tools:**
   - Open plugin dev tools
   - Select component in library
   - Check component properties (key is visible)

2. **Via Figma API (in plugin):**
   ```typescript
   const component = figma.getNodeById(nodeId) as ComponentNode
   console.log(component.key)
   ```

3. **Via Figma URL:**
   - Component URLs contain node IDs
   - Keys are different from node IDs (keys are stable across files)

## Updating Component Keys Safely

When component keys change (e.g., after library reorganization):

1. Update `registry.json` with new keys
2. Rebuild: `npm run build`
3. Test component placement
4. Update documentation if needed

**Note**: Old keys will fail gracefully (component import returns null, user sees error message).

## Troubleshooting

### Registry Not Loading

- **Check config**: Ensure `designSystems.enabled: true` and registry ID in `activeRegistries`
- **Check allowlist/denylist**: Registry may be filtered out
- **Check strict mode**: If `strictMode: true`, any validation error disables system
- **Check file path**: Registry JSON must be at `custom/design-systems/<id>/registry.json`
- **Check JSON validity**: Invalid JSON will cause load failure

### Component Placement Fails

- **Library not enabled**: Component library must be enabled in current Figma file
- **Invalid key**: Key may be incorrect or component deleted
- **Permissions**: User may not have access to library component

### Example DS Appears in Work Build

- **Check activeRegistries**: Ensure "example" is not listed
- **Set denylist**: Add `"denylist": ["example"]` for extra protection
- **Set allowlist**: Use `"allowlist": ["custom"]` to only allow work registries
- **Enable strict mode**: `"strictMode": true` fails loudly on misconfiguration

## Best Practices

1. **Rich Metadata**: Provide detailed `purpose`, `whenToUse`, and `whenNotToUse` for better LLM selection
2. **Self-Describing**: Each component should be understandable without cross-registry context
3. **Accessibility First**: Include accessibility requirements in every component entry
4. **Version Control**: Track registry version for change management
5. **Documentation**: Use Markdown docs for complex components (anatomy, detailed examples)
6. **Testing**: Test component placement with actual library components before deploying

## See Also

- `example/` - Example registry demonstrating format
- `../README.md` - Main custom configuration guide
- `../config.example.json` - Example configuration with DS registry
