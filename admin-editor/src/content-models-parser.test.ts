/**
 * Round-trip test for content models parser.
 * Asserts: serialize(parse(raw)) === raw (trailing newline normalized).
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseContentModelsMarkdown, serializeContentModelsMarkdown } from './content-models-parser'

const rootDir = path.resolve(__dirname, '..', '..')
const mdPath = path.join(rootDir, 'docs', 'content-models.md')
const raw = fs.readFileSync(mdPath, 'utf-8')

const { header, models } = parseContentModelsMarkdown(raw)
const serialized = serializeContentModelsMarkdown(header, models)

const normalizeTrailing = (s: string) => s.replace(/\n+$/, '\n')

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) { passed++ } else { failed++; console.error(`  FAIL: ${label}`) }
}

assert(models.length > 0, 'parsed at least one model')
assert(models.some(m => m.id === 'universal'), 'found universal model')
assert(models.some(m => m.id === 'analytics-tagging'), 'found analytics-tagging model')

const universalModel = models.find(m => m.id === 'universal')!
assert(universalModel.columns.length === 10, 'universal has 10 columns')
assert(universalModel.enabled === true, 'universal is enabled')
assert(universalModel.heading === 'Universal', 'universal heading preserved')

const cm3 = models.find(m => m.id === 'content-model-3')!
assert(cm3.enabled === false, 'content-model-3 is disabled')
assert(cm3.columns.length === 0, 'content-model-3 has no columns')

const roundTrip = normalizeTrailing(serialized) === normalizeTrailing(raw)
if (!roundTrip) {
  const rawLines = normalizeTrailing(raw).split('\n')
  const serLines = normalizeTrailing(serialized).split('\n')
  for (let i = 0; i < Math.max(rawLines.length, serLines.length); i++) {
    if (rawLines[i] !== serLines[i]) {
      console.error(`  First diff at line ${i + 1}:`)
      console.error(`    raw: ${JSON.stringify(rawLines[i])}`)
      console.error(`    ser: ${JSON.stringify(serLines[i])}`)
      break
    }
  }
}
assert(roundTrip, 'serialize(parse(raw)) === raw (round-trip)')

console.log(`\n[content-models-parser.test] ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
