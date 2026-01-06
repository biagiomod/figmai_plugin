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
- `field.role` → item.field.role
- `content.value` → item.content.value
- `textLayerName` → item.textLayerName
- `notes` → item.notes
- `contentKey` → item.contentKey
- `jiraTicket` → item.jiraTicket
- `adaNotes` → item.adaNotes
- `errorMessage` → item.errorMessage
- `meta.visible` → item.meta.visible (returns "Yes"/"No")
- `meta.locked` → item.meta.locked (returns "Yes"/"No")
- `variantProperties.<key>` → item.component.variantProperties?.[key] (e.g., `variantProperties.Size`)

If a path is missing, it returns an empty string.

---

## Universal

**id:** universal  
**label:** Universal Table  
**description:** Enhanced content table with meta row, 10 columns, and thumbnail preview  
**enabled:** true

**columns:**
- key: figmaRef, label: Figma Ref, path: nodeUrl
- key: componentName, label: Component Name, path: component.name
- key: textLayerName, label: Text Layer Name, path: textLayerName
- key: fieldRole, label: Field / Role, path: field.role
- key: content, label: Content, path: content.value
- key: notes, label: Notes, path: notes
- key: contentKey, label: Content Key (CMS), path: contentKey
- key: jiraTicket, label: Jira / Ticket, path: jiraTicket
- key: adaNotes, label: ADA Notes / Flags, path: adaNotes
- key: errorMessage, label: Error Message, path: errorMessage

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
**description:** Structured content export with merged cells and staggered rows  
**enabled:** true

**columns:**
- key: figmaRef, label: Figma Ref, path: nodeUrl
- key: tag, label: Tag, path: component.name
- key: source, label: Source, path: field.path
- key: model, label: Model, path: component.kind
- key: metadataKey, label: Metadata Key, path: field.label
- key: contentKey, label: Content Key, path: contentKey
- key: content, label: Content, path: content.value
- key: rulesComment, label: Rules/Comment, path: notes
- key: notesJira, label: Notes/Jira, path: jiraTicket

---

## Content Model 2

**id:** content-model-2  
**label:** Content Model 2  
**description:** Schema-style export with rowspans and staggered rows for Dialog and Links sections  
**enabled:** true

**columns:**
- key: figmaRef, label: Figma Ref, path: nodeUrl
- key: tag, label: Tag, path: component.name
- key: source, label: Source, path: field.path
- key: model, label: Model, path: component.kind
- key: metadataKey, label: Metadata Key, path: field.label
- key: contentKey, label: Content Key, path: contentKey
- key: content, label: Content, path: content.value
- key: rulesComment, label: Rules/Comment, path: notes
- key: notesJira, label: Notes/Jira, path: jiraTicket

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

