#!/usr/bin/env node
/**
 * Build-time check: Fail if build artifacts contain banned/jailbreak-style phrases
 * or network debug ingest URLs (no fetch to 127.0.0.1:7242/ingest/ in shipped code).
 * Run as part of postbuild.
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

/** Fail if build contains debug ingest URL (fetch to local ingest server). */
const DEBUG_INGEST_PATTERNS = ['127.0.0.1:7242', '/ingest/'];

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
  for (const pattern of DEBUG_INGEST_PATTERNS) {
    if (content.includes(pattern)) {
      found = true;
      const idx = content.indexOf(pattern);
      const line = content.slice(0, idx).split('\n').length;
      hits.push({ file, line, phrase: `debug ingest URL (${pattern})` });
    }
  }
}

if (found) {
  console.error('[check-banned-phrases] FAILED: Banned phrases or debug ingest URL in build artifacts:');
  hits.forEach(({ file, line, phrase }) => console.error(`  ${file}:${line} - "${phrase}"`));
  console.error('[check-banned-phrases] Remove these from source and rebuild.');
  process.exit(1);
}
console.log('[check-banned-phrases] PASSED: No banned phrases in build artifacts');
process.exit(0);
