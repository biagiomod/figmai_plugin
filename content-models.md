# Content Models

This file defines the table format presets for the Content Table Assistant. Each model specifies which columns to include and how to extract values from the Universal Content Table JSON.

## Format

Each model is defined with:
- `id`: The preset identifier (must match TableFormatPreset type)
- `label`: Human-readable name
- `description`: Brief description of the model's purpose
- `enabled`: Whether this model is currently implemented (true/false)
- `columns`: List of column definitions

Each column has:
- `key`: Unique identifier for the column
- `label`: Display label
- `path`: Value expression (e.g., `id`, `component.name`, `content.value`, `variantProperties.Size`)

## Value Path Expressions

Supported paths:
- `id` → item.id
- `nodeId` → item.nodeId
- `nodeUrl` → item.nodeUrl
- `component.name` → item.component.name
- `component.kind` → item.component.kind
- `component.key` → item.component.key
- `field.label` → item.field.label
- `field.path` → item.field.path
- `content.value` → item.content.value
- `meta.visible` → item.meta.visible (returns "Yes"/"No")
- `meta.locked` → item.meta.locked (returns "Yes"/"No")
- `variantProperties.<key>` → item.component.variantProperties?.[key] (e.g., `variantProperties.Size`)

If a path is missing, it returns an empty string.

---

## Universal

**id:** universal  
**label:** Universal Table  
**description:** Complete content inventory with all metadata  
**enabled:** true

**columns:**
- key: id, label: ID, path: id
- key: component, label: Component, path: component.name
- key: componentKind, label: Component Kind, path: component.kind
- key: fieldLabel, label: Field Label, path: field.label
- key: path, label: Path, path: field.path
- key: content, label: Content, path: content.value
- key: visible, label: Visible, path: meta.visible
- key: locked, label: Locked, path: meta.locked
- key: nodeUrl, label: Node URL, path: nodeUrl

---

## Dev Only

**id:** dev-only  
**label:** Dev Only  
**description:** Minimal columns for development handoff  
**enabled:** true

**columns:**
- key: component, label: Component, path: component.name
- key: fieldLabel, label: Field Label, path: field.label
- key: content, label: Content, path: content.value
- key: nodeUrl, label: Node URL, path: nodeUrl

---

## ADA Only

**id:** ada-only  
**label:** ADA Only  
**description:** Accessibility-focused columns for compliance review  
**enabled:** true

**columns:**
- key: fieldLabel, label: Field Label, path: field.label
- key: content, label: Content, path: content.value
- key: path, label: Path, path: field.path
- key: nodeUrl, label: Node URL, path: nodeUrl

---

## Content Model 1

**id:** content-model-1  
**label:** Content Model 1  
**description:** Placeholder for future content model  
**enabled:** false

**columns:**
(empty - not yet defined)

---

## Content Model 2

**id:** content-model-2  
**label:** Content Model 2  
**description:** Placeholder for future content model  
**enabled:** false

**columns:**
(empty - not yet defined)

---

## Content Model 3

**id:** content-model-3  
**label:** Content Model 3  
**description:** Placeholder for future content model  
**enabled:** false

**columns:**
(empty - not yet defined)

---

## Content Model 4

**id:** content-model-4  
**label:** Content Model 4  
**description:** Placeholder for future content model  
**enabled:** false

**columns:**
(empty - not yet defined)

---

## Content Model 5

**id:** content-model-5  
**label:** Content Model 5  
**description:** Placeholder for future content model  
**enabled:** false

**columns:**
(empty - not yet defined)

