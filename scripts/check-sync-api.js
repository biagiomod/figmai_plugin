#!/usr/bin/env node
/**
 * Build-time check: Ensure no sync getNodeById calls exist in build artifacts
 * Fails the build if any are found
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const filesToCheck = ['main.js', 'ui.js'];

let foundSyncCalls = false;
const errors = [];

for (const file of filesToCheck) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[check-sync-api] Warning: ${file} not found, skipping check`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match sync calls: .getNodeById( or figma.getNodeById( but NOT getNodeByIdAsync
    if (line.includes('getNodeById(') && !line.includes('getNodeByIdAsync')) {
      foundSyncCalls = true;
      errors.push(`${file}:${i + 1} - Found sync getNodeById call`);
    }
  }
}

if (foundSyncCalls) {
  console.error('[check-sync-api] ❌ FAILED: Found sync getNodeById calls in build artifacts:');
  errors.forEach(err => console.error(`  ${err}`));
  console.error('[check-sync-api] All getNodeById calls must use getNodeByIdAsync for documentAccess="dynamic-page"');
  process.exit(1);
} else {
  console.log('[check-sync-api] ✅ PASSED: No sync getNodeById calls found in build artifacts');
  process.exit(0);
}
