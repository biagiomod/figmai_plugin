#!/usr/bin/env node
/**
 * Build-time check: Ensure no sync node API calls exist in build artifacts
 * Checks for: getNodeById, getStyleById, getVariableById (excluding async variants)
 * Fails the build if any are found
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const filesToCheck = ['main.js', 'ui.js'];

// Sync APIs that are forbidden with documentAccess="dynamic-page"
const syncApis = [
  { name: 'getNodeById', async: 'getNodeByIdAsync' },
  { name: 'getStyleById', async: 'getStyleByIdAsync' },
  { name: 'getVariableById', async: 'getVariableByIdAsync' }
];

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
    
    // Skip lines that are just checking for error messages (error detection code)
    if (line.includes('errorMessage.includes') || 
        line.includes('reasonStr.includes') ||
        line.includes('SYNC_API_ERROR')) {
      continue;
    }
    
    for (const api of syncApis) {
      // Match actual function calls: .getNodeById( or figma.getNodeById( but NOT getNodeByIdAsync
      // Use regex to match function call patterns, not just string contains
      const syncCallRegex = new RegExp(`(?:figma\\.|\\w+\\.)${api.name}\\s*\\(`, 'g');
      const asyncPattern = `${api.async}(`;
      
      // Check if line contains sync call pattern but not async variant
      if (syncCallRegex.test(line) && !line.includes(asyncPattern)) {
        foundSyncCalls = true;
        errors.push(`${file}:${i + 1} - Found sync ${api.name} call`);
      }
    }
  }
}

if (foundSyncCalls) {
  console.error('[check-sync-api] ❌ FAILED: Found sync node API calls in build artifacts:');
  errors.forEach(err => console.error(`  ${err}`));
  console.error('[check-sync-api] All node API calls must use Async variants for documentAccess="dynamic-page"');
  console.error('[check-sync-api] Required: getNodeByIdAsync, getStyleByIdAsync, getVariableByIdAsync');
  process.exit(1);
} else {
  console.log('[check-sync-api] ✅ PASSED: No sync node API calls found in build artifacts');
  process.exit(0);
}
