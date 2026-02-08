#!/usr/bin/env node
/**
 * Build-time check: Fail if build artifacts contain patterns that Figma's
 * plugin VM rejects (e.g. \bimport\s*\(, import.meta, or top-level import/export).
 * Prevents "SyntaxError: possible import expression rejected around line 1".
 * Run as part of postbuild.
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const filesToCheck = ['main.js', 'ui.js'];

const SNIPPET_RADIUS = 50;

function snippet(content, index, patternLength) {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(content.length, index + patternLength + SNIPPET_RADIUS);
  let s = content.slice(start, end);
  s = s.replace(/\n/g, '\\n');
  if (start > 0) s = '...' + s;
  if (end < content.length) s = s + '...';
  return s;
}

const checks = [
  { name: 'import\\s*\\(', re: /\bimport\s*\(/g },
  { name: 'import.meta', re: /import\.meta/g },
];

let failed = false;

for (const file of filesToCheck) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[check-figma-bundle-compat] Warning: ${file} not found, skipping`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');

  for (const { name, re } of checks) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      failed = true;
      console.error(`[check-figma-bundle-compat] FAIL: ${file} contains forbidden pattern "${name}" at index ${m.index}`);
      console.error(`  snippet: ${snippet(content, m.index, m[0].length)}`);
    }
  }

  // Top-level import/export: treat each line (and start-of-file) as line start
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(import|export)\s/.test(lines[i])) {
      failed = true;
      const lineNum = i + 1;
      const short = lines[i].slice(0, 80).replace(/\n/g, '\\n');
      console.error(`[check-figma-bundle-compat] FAIL: ${file} line ${lineNum} contains top-level module syntax`);
      console.error(`  snippet: ${short}${lines[i].length > 80 ? '...' : ''}`);
    }
  }
}

if (failed) {
  console.error('[check-figma-bundle-compat] Remove these patterns from source (or build config) so bundles stay Figma VM compatible.');
  process.exit(1);
}

console.log('[check-figma-bundle-compat] PASSED: No Figma-rejected patterns in build artifacts');
process.exit(0);
