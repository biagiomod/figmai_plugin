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

export interface ContentModelDef {
  /** Section heading (e.g. "Universal", "Content Model 1") */
  heading: string
  id: string
  label: string
  description: string
  enabled: boolean
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

    for (const line of lines) {
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
      } else if (trimmed === '**columns:**') {
        inColumns = true
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
    out += '\n'
    out += '**columns:**\n'
    if (model.columns.length === 0) {
      out += '(empty - not yet defined)\n'
    } else {
      for (const col of model.columns) {
        out += `- key: ${col.key}, label: ${col.label}, path: ${col.path}\n`
      }
    }
  }

  return out
}
