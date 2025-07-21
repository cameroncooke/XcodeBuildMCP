#!/usr/bin/env node

/**
 * Script to check which plugin tools have not been refactored to use the Separation of Concerns pattern.
 * 
 * This script looks for:
 * 1. Files that don't have an exported logic function (e.g., toolNameLogic)
 * 2. Files where the handler still has optional parameters with defaults
 * 3. Files that haven't been properly separated
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function checkSeparationOfConcerns() {
  // Find all plugin tool files (excluding tests and index files)
  const pluginFiles = await glob('src/plugins/**/*.ts', {
    ignore: [
      '**/index.ts',
      '**/__tests__/**',
      '**/tests/**',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]
  });

  console.log(`\nChecking ${pluginFiles.length} plugin files for Separation of Concerns pattern...\n`);

  let violationCount = 0;
  const violations = [];

  pluginFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, '.ts');
  
  // Check if file exports a default handler
  if (!content.includes('export default') || !content.includes('handler')) {
    return; // Skip files that don't export handlers
  }
  
  // Expected logic function name
  const expectedLogicFunction = `${fileName.replace(/-/g, '_')}Logic`;
  
  // Check for violations
  const hasLogicFunction = content.includes(`export async function ${expectedLogicFunction}`) ||
                          content.includes(`export function ${expectedLogicFunction}`);
  
  // Check if handler has optional parameters (old pattern)
  const handlerRegex = /handler\s*[:(]\s*async?\s*\([^)]*\)\s*(?::|=>)[^{]*{/s;
  const handlerMatch = content.match(handlerRegex);
  
  let hasOptionalParams = false;
  if (handlerMatch) {
    // Look for parameters with default values in handler signature
    const handlerSignatureRegex = /handler\s*[:(]\s*async?\s*\(([^)]+)\)/s;
    const signatureMatch = content.match(handlerSignatureRegex);
    if (signatureMatch) {
      const params = signatureMatch[1];
      // Check for = getDefault... or other default value patterns
      hasOptionalParams = params.includes('=') && 
                         (params.includes('getDefault') || params.includes('?:'));
    }
  }
  
  // Check if handler is a thin wrapper (should be less than 5 lines)
  const handlerBodyRegex = /handler\s*[:(]\s*async?\s*\([^)]*\)\s*(?::|=>)\s*{([^}]+)}/s;
  const bodyMatch = content.match(handlerBodyRegex);
  let isThinWrapper = true;
  if (bodyMatch) {
    const body = bodyMatch[1];
    const lines = body.split('\n').filter(line => line.trim().length > 0);
    // A thin wrapper should just validate params and call the logic function
    isThinWrapper = lines.length <= 5;
  }
  
  const isViolation = !hasLogicFunction || hasOptionalParams || !isThinWrapper;
  
  if (isViolation) {
    violationCount++;
    violations.push({
      file: filePath,
      hasLogicFunction,
      hasOptionalParams,
      isThinWrapper,
      expectedLogicFunction
    });
  }
});

// Display results
if (violations.length === 0) {
  console.log(`${GREEN}✓ All ${pluginFiles.length} plugin files follow the Separation of Concerns pattern!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}✗ Found ${violations.length} files that need refactoring:${RESET}\n`);
  
  violations.forEach(({ file, hasLogicFunction, hasOptionalParams, isThinWrapper, expectedLogicFunction }) => {
    const relPath = path.relative(process.cwd(), file);
    console.log(`${YELLOW}${relPath}${RESET}`);
    
    if (!hasLogicFunction) {
      console.log(`  ${RED}✗${RESET} Missing exported logic function: ${expectedLogicFunction}`);
    }
    if (hasOptionalParams) {
      console.log(`  ${RED}✗${RESET} Handler has optional parameters with defaults`);
    }
    if (!isThinWrapper) {
      console.log(`  ${RED}✗${RESET} Handler is not a thin wrapper (too much logic)`);
    }
    console.log();
  });
  
  console.log(`${RED}Total violations: ${violations.length}/${pluginFiles.length} files${RESET}\n`);
  
  // Exit with error code to fail CI
  process.exit(1);
  }
}

// Run the check
checkSeparationOfConcerns().catch(console.error);