#!/usr/bin/env node
/**
 * Build-time check: Fail if build artifacts contain banned/jailbreak-style phrases.
 * Prevents "Ignore previous assistant instructions" and similar override phrases
 * from reaching the Internal API payload. Run as part of postbuild.
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const filesToCheck = ['main.js', 'ui.js'];

const BANNED_PHRASES = [
  'Ignore previous assistant instructions',
  'Ignore previous instructions',
  'disregard prior',
  'you are now'
];

let found = false;
const hits = [];

for (const file of filesToCheck) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[check-banned-phrases] Warning: ${file} not found, skipping`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lower = content.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      found = true;
      const idx = lower.indexOf(phrase.toLowerCase());
      const line = content.slice(0, idx).split('\n').length;
      hits.push({ file, line, phrase });
    }
  }
}

if (found) {
  console.error('[check-banned-phrases] FAILED: Banned phrases found in build artifacts:');
  hits.forEach(({ file, line, phrase }) => console.error(`  ${file}:${line} - "${phrase}"`));
  console.error('[check-banned-phrases] Remove these phrases from source and rebuild.');
  process.exit(1);
}
console.log('[check-banned-phrases] PASSED: No banned phrases in build artifacts');
process.exit(0);
