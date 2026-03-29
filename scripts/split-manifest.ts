// scripts/split-manifest.ts
// One-time migration: splits custom/assistants.manifest.json into
// custom/assistants/{id}/manifest.json (one file per assistant).
// Run: npx tsx scripts/split-manifest.ts
// Safe to run multiple times — skips if file already exists.

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'custom', 'assistants.manifest.json')
const OUT_DIR = path.join(ROOT, 'custom', 'assistants')

interface AssistantEntry {
  id: string
  [key: string]: unknown
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('custom/assistants.manifest.json not found')
    process.exit(1)
  }

  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8')
  const manifest: { assistants: AssistantEntry[] } = JSON.parse(raw)
  const assistants = manifest.assistants

  if (!Array.isArray(assistants)) {
    console.error('Expected manifest.assistants to be an array')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const entry of assistants) {
    const id = entry.id
    if (!id || typeof id !== 'string') {
      console.warn(`Skipping entry with missing id: ${JSON.stringify(entry).slice(0, 60)}`)
      continue
    }

    const dirPath = path.join(OUT_DIR, id)
    const filePath = path.join(dirPath, 'manifest.json')

    if (fs.existsSync(filePath)) {
      console.log(`  skip  ${id}  (already exists)`)
      continue
    }

    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({ assistants: [entry] }, null, 2) + '\n', 'utf-8')
    console.log(`  wrote custom/assistants/${id}/manifest.json`)
  }

  console.log(`\nDone. ${assistants.length} assistant(s) processed.`)
  console.log('Old file custom/assistants.manifest.json is kept as backup — remove when ready.')
}

main()
