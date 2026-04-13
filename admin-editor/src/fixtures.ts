/**
 * Fixture loader for the ACE test harness.
 * loadFixtureCatalog — reads all *.json files recursively under fixturesDir.
 * loadFixtureImages  — reads PNG files referenced by a fixture, returns base64 data URLs.
 */

import * as fs from 'fs'
import * as path from 'path'

export interface FixtureMeta {
  id: string
  name: string
  category: string
  tags: string[]
  selectionSummary: string
  images: string[]           // filenames relative to fixtures/<category>/
  supportsVision: boolean
  requiresSelection: boolean
  useCases: string[]
  notes?: string
}

/**
 * Read every *.json file under fixturesDir (one level of subdirectories = category).
 * Returns metadata only — no image data.
 */
export function loadFixtureCatalog(fixturesDir: string): FixtureMeta[] {
  const results: FixtureMeta[] = []
  if (!fs.existsSync(fixturesDir)) return results
  let categories: string[]
  try { categories = fs.readdirSync(fixturesDir) } catch { return results }
  for (const cat of categories) {
    const catDir = path.join(fixturesDir, cat)
    let stat: fs.Stats
    try { stat = fs.statSync(catDir) } catch { continue }
    if (!stat.isDirectory()) continue
    let files: string[]
    try { files = fs.readdirSync(catDir) } catch { continue }
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(catDir, file)
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw) as FixtureMeta
        results.push(parsed)
      } catch {
        // skip malformed JSON
      }
    }
  }
  return results
}

/**
 * Read PNG files referenced by fixture.images, return as base64 data URLs.
 * Images are expected at fixturesDir/<fixture.category>/<filename>.
 */
export function loadFixtureImages(fixturesDir: string, fixture: FixtureMeta): string[] {
  const dataUrls: string[] = []
  for (const filename of fixture.images) {
    // Reject path traversal attempts
    const safe = path.basename(filename)
    if (safe !== filename) continue
    const imgPath = path.join(fixturesDir, fixture.category, safe)
    try {
      const buf = fs.readFileSync(imgPath)
      dataUrls.push('data:image/png;base64,' + buf.toString('base64'))
    } catch {
      // skip missing images silently
    }
  }
  return dataUrls
}
