#!/usr/bin/env node
/**
 * Post-build script to copy assets and set permissions.
 * Called after tsc compilation to prepare the build directory.
 */

import { chmodSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Set executable permissions for entry points
const executables = [
  'build/cli.js',
  'build/doctor-cli.js',
  'build/daemon.js'
];

for (const file of executables) {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    chmodSync(fullPath, '755');
    console.log(`  Set executable: ${file}`);
  }
}

// Copy tools-manifest.json to build directory (for backward compatibility)
// This can be removed once Phase 7 is complete
const toolsManifestSrc = join(projectRoot, 'build', 'tools-manifest.json');
if (existsSync(toolsManifestSrc)) {
  console.log('  tools-manifest.json already in build/');
}

console.log('✅ Build assets copied successfully');
