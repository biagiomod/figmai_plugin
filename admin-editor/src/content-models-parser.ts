/**
 * Content Models Markdown Parser — parse + serialize with round-trip fidelity.
 *
 * SSOT: docs/content-models.md
 * Parser extracts structured ContentModelDef[] from markdown.
 * Serializer writes them back to the same markdown format.
 *
 * Round-trip invariant: serialize(parse(raw)) === raw
 *   (with trailing newline normalization only)
 */

export interface ColumnDef {
  key: string
  label: string
  path: string
}

export type ContentModelKind = 'simple' | 'grouped'

export interface GroupedTemplate {
  headerRows: string[][]
  containerIntroRows: Array<Array<Record<string, unknown> | string>>
  itemRows: Array<Array<Record<string, unknown> | string>>
}

export interface ContentModelDef {
  /** Section heading (e.g. "Universal", "Content Model 1") */
  heading: string
  id: string
  label: string
  description: string
  enabled: boolean
  kind: ContentModelKind
  template?: GroupedTemplate
  columns: ColumnDef[]
}

/**
 * Parse docs/content-models.md and extract model definitions.
 * Preserves the header block (everything before the first `---` separator).
 */
export function parseContentModelsMarkdown(raw: string): {
  header: string
  models: ContentModelDef[]
} {
  const sections = raw.split(/^---$/m)

  let header = ''
  const models: ContentModelDef[] = []

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]

    if (si === 0) {
      header = section
      continue
    }

    const lines = section.split('\n')
    let currentModel: Partial<ContentModelDef> | null = null
    let inColumns = false

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      const trimmed = line.trim()

      if (trimmed.startsWith('## ')) {
        if (currentModel && currentModel.id) {
          models.push(currentModel as ContentModelDef)
        }
        currentModel = {
          heading: trimmed.replace('## ', ''),
          id: '',
          label: '',
          description: '',
          enabled: false,
          kind: 'simple',
          columns: []
        }
        inColumns = false
        continue
      }

      if (!currentModel) continue

      if (trimmed.startsWith('**id:**')) {
        currentModel.id = trimmed.replace(/^\*\*id:\*\*\s*/, '').trim()
      } else if (trimmed.startsWith('**label:**')) {
        currentModel.label = trimmed.replace(/^\*\*label:\*\*\s*/, '').trim()
      } else if (trimmed.startsWith('**description:**')) {
        currentModel.description = trimmed.replace(/^\*\*description:\*\*\s*/, '').trim()
      } else if (trimmed.startsWith('**enabled:**')) {
        currentModel.enabled = trimmed.replace(/^\*\*enabled:\*\*\s*/, '').trim() === 'true'
      } else if (trimmed.startsWith('**kind:**')) {
        const kindValue = trimmed.replace(/^\*\*kind:\*\*\s*/, '').trim()
        currentModel.kind = kindValue === 'grouped' ? 'grouped' : 'simple'
      } else if (trimmed === '**columns:**') {
        inColumns = true
      } else if (trimmed === '**template:**') {
        // Grouped-only template block:
        // **template:**
        // ```json
        // { ... }
        // ```
        inColumns = false

        let fenceIdx = li + 1
        while (fenceIdx < lines.length && lines[fenceIdx].trim() === '') fenceIdx++
        if (fenceIdx >= lines.length || !lines[fenceIdx].trim().startsWith('```')) {
          throw new Error(`Invalid template block for model "${currentModel.id}": missing opening code fence`)
        }

        const jsonLines: string[] = []
        let closeIdx = fenceIdx + 1
        while (closeIdx < lines.length && lines[closeIdx].trim() !== '```') {
          jsonLines.push(lines[closeIdx])
          closeIdx++
        }
        if (closeIdx >= lines.length) {
          throw new Error(`Invalid template block for model "${currentModel.id}": missing closing code fence`)
        }

        const jsonRaw = jsonLines.join('\n').trim()
        if (!jsonRaw) {
          throw new Error(`Invalid template block for model "${currentModel.id}": empty JSON payload`)
        }

        try {
          const parsedTemplate = JSON.parse(jsonRaw) as GroupedTemplate
          currentModel.template = parsedTemplate
          currentModel.kind = 'grouped'
        } catch (error) {
          throw new Error(`Invalid template JSON for model "${currentModel.id}": ${(error as Error).message}`)
        }

        // Continue from the closing fence line
        li = closeIdx
      } else if (inColumns && trimmed.startsWith('- ')) {
        const columnLine = trimmed.replace('- ', '')
        const parts = columnLine.split(',').map(p => p.trim())
        let key = '', label = '', path = ''
        for (const part of parts) {
          if (part.startsWith('key: ')) key = part.replace('key: ', '').trim()
          else if (part.startsWith('label: ')) label = part.replace('label: ', '').trim()
          else if (part.startsWith('path: ')) path = part.replace('path: ', '').trim()
        }
        if (key && label && path && currentModel.columns) {
          currentModel.columns.push({ key, label, path })
        }
      } else if (trimmed === '(empty - not yet defined)') {
        if (currentModel) currentModel.columns = []
      }
    }

    if (currentModel && currentModel.id) {
      models.push(currentModel as ContentModelDef)
    }
  }

  return { header, models }
}

/**
 * Serialize models back to the same markdown format as docs/content-models.md.
 * Produces a stable, deterministic output.
 */
export function serializeContentModelsMarkdown(header: string, models: ContentModelDef[]): string {
  let out = header.replace(/\n*$/, '\n')

  for (const model of models) {
    out += '\n---\n'
    out += '\n## ' + model.heading + '\n'
    out += '\n'
    out += `**id:** ${model.id}  \n`
    out += `**label:** ${model.label}  \n`
    out += `**description:** ${model.description}  \n`
    out += `**enabled:** ${model.enabled}\n`
    if (model.kind === 'grouped') {
      out += `**kind:** grouped\n`
    }
    out += '\n'
    out += '**columns:**\n'
    if (model.columns.length === 0) {
      out += '(empty - not yet defined)\n'
    } else {
      for (const col of model.columns) {
        out += `- key: ${col.key}, label: ${col.label}, path: ${col.path}\n`
      }
    }
    if (model.kind === 'grouped') {
      out += '\n'
      out += '**template:**\n'
      out += '```json\n'
      out += `${JSON.stringify(model.template ?? {}, null, 2)}\n`
      out += '```\n'
    }
  }

  return out
}
