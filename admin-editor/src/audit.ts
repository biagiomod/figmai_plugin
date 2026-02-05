/**
 * ACE audit log: append JSONL lines to data/audit.jsonl on successful save.
 */

import * as fs from 'fs'
import * as path from 'path'

export interface AuditSaveEntry {
  timestamp: string
  user: string
  action: 'save'
  resource: 'model'
  revisionBefore: string
  revisionAfter: string
  filesWritten: string[]
  dryRun: boolean
}

function ensureDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

/**
 * Append one JSON line to audit.jsonl. One line per entry.
 */
export function appendAuditLine(dataDir: string, entry: AuditSaveEntry): void {
  ensureDataDir(dataDir)
  const filePath = path.join(dataDir, 'audit.jsonl')
  const line = JSON.stringify(entry) + '\n'
  fs.appendFileSync(filePath, line, 'utf-8')
}
