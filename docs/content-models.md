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

## Mobile

**id:** mobile  
**label:** Mobile  
**description:** Sectioned mobile worksheet with container intro rows and UI Label (English) content rows  
**enabled:** true
**kind:** grouped

**columns:**
- key: wireframe, label: Wireframe (For example purposes ONLY. Final content to be found in UI Label column.), path: nodeUrl
- key: elementType, label: Element type (e.g. Header / Text / Button / HAT), path: field.role
- key: uiLabelEnglish, label: UI label (English), path: content.value
- key: uiLabelSpanish, label: UI label (Spanish), path: content.value
- key: contentKeyOrIdentifier, label: Content Key (or Identifier) (Developer string/key reference if necessary), path: contentKey
- key: notesRules, label: Notes/rules, path: notes
- key: jiraLinks, label: JIRA Links (Release / Epic / Editor Subtask / Story (ies)) (Listed in reverse order Newest to Oldest), path: jiraTicket

**template:**
```json
{
  "headerRows": [
    [
      "Wireframe (For example purposes ONLY. Final content to be found in UI Label column.)",
      "Element type (e.g. Header / Text / Button / HAT)",
      "UI label (English)",
      "UI label (Spanish)",
      "Content Key (or Identifier) (Developer string/key reference if necessary)",
      "Notes/rules",
      "JIRA Links (Release / Epic / Editor Subtask / Story (ies)) (Listed in reverse order Newest to Oldest)"
    ]
  ],
  "containerIntroRows": [
    [
      {
        "type": "static",
        "text": "Section {sectionIndex}: [User will add]"
      },
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    [
      {
        "type": "link",
        "label": {
          "type": "static",
          "text": "View in Figma"
        },
        "hrefField": "containerUrl",
        "suffix": "\nPlace Image Here"
      },
      "",
      "",
      "",
      "",
      "",
      ""
    ]
  ],
  "itemRows": [
    [
      "",
      "",
      {
        "type": "field",
        "field": "content"
      },
      "",
      "",
      "",
      ""
    ]
  ]
}
```

---

## Simple Worksheet

**id:** simple-worksheet  
**label:** Simple Worksheet  
**description:** Minimal worksheet with only Figma reference and content values  
**enabled:** true

**columns:**
- key: figmaRef, label: Figma Ref, path: nodeUrl
- key: content, label: Content, path: content.value

---

## Content Only

**id:** content-only  
**label:** Content Only  
**description:** Grouped worksheet export with container intro row and content-only item rows  
**enabled:** true
**kind:** grouped

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

**template:**
```json
{
  "headerRows": [
    [
      "Column 1",
      "Column 2",
      "Column 3",
      "Column 4",
      "Column 5",
      "Column 6",
      "Column 7",
      "Column 8",
      "Column 9"
    ],
    [
      "Figma Ref",
      "Tag",
      "Source",
      "Model",
      "Metadata Key",
      "Content Key",
      "Content",
      "Rules/Comment",
      "Notes/Jira"
    ]
  ],
  "containerIntroRows": [
    [
      {
        "type": "link",
        "label": {
          "type": "static",
          "text": "View in Figma"
        },
        "hrefField": "containerUrl"
      },
      "",
      "",
      {
        "type": "static",
        "text": "Content Only"
      },
      "",
      "",
      "",
      "",
      ""
    ]
  ],
  "itemRows": [
    [
      "",
      "",
      "",
      "",
      "",
      "",
      {
        "type": "field",
        "field": "content"
      },
      "",
      ""
    ]
  ]
}
```

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
**kind:** grouped

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

**template:**
```json
{
  "headerRows": [
    [
      "Column 1",
      "Column 2",
      "Column 3",
      "Column 4",
      "Column 5",
      "Column 6",
      "Column 7",
      "Column 8",
      "Column 9"
    ],
    [
      "Figma Ref",
      "Tag",
      "Source",
      "Model",
      "Metadata Key",
      "Content Key",
      "Content",
      "Rules/Comment",
      "Notes/Jira"
    ]
  ],
  "containerIntroRows": [
    [
      {
        "type": "link",
        "label": {
          "type": "static",
          "text": "View in Figma"
        },
        "hrefField": "containerUrl"
      },
      "",
      "",
      {
        "type": "static",
        "text": "ContentList"
      },
      {
        "type": "static",
        "text": "id"
      },
      "",
      "",
      "",
      ""
    ],
    [
      "",
      "",
      "",
      "",
      "",
      {
        "type": "static",
        "text": "title"
      },
      "",
      "",
      ""
    ]
  ],
  "itemRows": [
    [
      "",
      "",
      "",
      "",
      {
        "type": "static",
        "text": "key"
      },
      "",
      "",
      "",
      ""
    ],
    [
      "",
      "",
      "",
      "",
      "",
      {
        "type": "static",
        "text": "value"
      },
      {
        "type": "field",
        "field": "content"
      },
      "",
      ""
    ]
  ]
}
```

---

## Content Model 2

**id:** content-model-2  
**label:** Content Model 2  
**description:** Schema-style export with rowspans and staggered rows for Dialog and Links sections  
**enabled:** false

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

---

## Analytics Tagging

**id:** analytics-tagging  
**label:** Analytics Tagging  
**description:** Screen ID, screenshot, description, action type, component, Action ID, Figma link, population, note  
**enabled:** true

**columns:**
- key: screenId, label: Screen ID, path: screenId
- key: screenshot, label: Screenshot, path: screenshot
- key: description, label: Description, path: description
- key: actionType, label: Action Type, path: actionType
- key: component, label: Component, path: component.name
- key: actionId, label: Action ID, path: actionId
- key: actionName, label: Action Name, path: actionName
- key: figmaElementLink, label: Figma Element Link, path: figmaElementLink
- key: population, label: Population, path: population
- key: note, label: Note, path: note
