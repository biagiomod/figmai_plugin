# Example Design System

This is an **example** design system registry for demonstration and testing purposes.

## ⚠️ Important

- **This registry is disabled by default** (not in `activeRegistries`)
- **Do not use in production** - this is for local testing only
- **Component keys are placeholders** - replace with actual Figma component keys

## Purpose

This example demonstrates:
- Registry JSON structure and schema
- Component entry format with rich metadata
- Optional per-component Markdown documentation
- Self-describing component definitions (no global taxonomy)

## Structure

```
example/
├── registry.json          # Component registry (keys, metadata)
├── components/            # Optional per-component docs
│   └── button.md         # Detailed button documentation
└── README.md             # This file
```

## Enabling for Testing

To enable this example registry for local testing:

1. Edit `custom/config.json`
2. Set `designSystems.enabled: true`
3. Add `"example"` to `designSystems.activeRegistries`

**Example config:**
```json
{
  "designSystems": {
    "enabled": true,
    "activeRegistries": ["example"]
  }
}
```

4. Rebuild: `npm run build`
5. Reload plugin in Figma

## Work-Only Protection

For work builds, ensure example registry is **not** in `activeRegistries`. Use allowlist/denylist for extra protection:

```json
{
  "designSystems": {
    "enabled": true,
    "activeRegistries": ["custom"],
    "denylist": ["example"]
  }
}
```

## Component Keys

**Note**: The component keys in this example are placeholders. Replace them with actual Figma component keys from your library.

To find a component key in Figma:
1. Select the component in your library
2. Check the component's key property (visible in plugin dev tools or via API)
