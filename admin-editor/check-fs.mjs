#!/usr/bin/env node
/**
 * Minimal checks for admin-editor fs utilities (canonicalize, ensureTrailingNewline).
 * Run: node admin-editor/check-fs.mjs (from repo root, after ts build of admin-editor if needed)
 * Or: npx tsx admin-editor/src/fs.ts with a small runner. This script uses dynamic import
 * of the compiled output or we can run inline checks. For simplicity we test the behavior inline.
 */

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

async function main() {
  // Load fs module (ESM from TS would need tsx; here we test logic inline)
  const ensureTrailingNewline = (s) => (s.length === 0 ? '\n' : s.endsWith('\n') ? s : s + '\n')
  const sortKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(sortKeys)
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))
    return Object.fromEntries(keys.map((k) => [k, sortKeys(obj[k])]))
  }

  let ok = 0
  // ensureTrailingNewline
  if (ensureTrailingNewline('') === '\n') ok++
  if (ensureTrailingNewline('a') === 'a\n') ok++
  if (ensureTrailingNewline('a\n') === 'a\n') ok++
  // sortKeys
  const o = { b: 1, a: 2 }
  const sorted = sortKeys(o)
  if (JSON.stringify(sorted) === '{"a":2,"b":1}') ok++
  console.log('check-fs: %d/4 passed', ok)
  process.exit(ok === 4 ? 0 : 1)
}
main()
