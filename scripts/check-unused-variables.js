#!/usr/bin/env node

/**
 * Unused Variable Violations Checker
 * 
 * Detects variables/interfaces/types prefixed with underscore (_) which indicates:
 * 1. Variable is defined but never used (should be removed)
 * 2. Variable is used but marked as unused (investigation needed)
 * 
 * This script helps maintain code quality by identifying these violations.
 * Excludes legitimate uses like Node.js globals and necessary import aliases.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const VIOLATION_PATTERNS = [
  // Interface definitions with underscore prefix
  {
    pattern: /interface\s+_\w+/g,
    description: 'Interface definition with underscore prefix',
    severity: 'error'
  },
  // Type definitions with underscore prefix  
  {
    pattern: /type\s+_\w+/g,
    description: 'Type definition with underscore prefix',
    severity: 'error'
  },
  // Variable declarations with underscore prefix (excluding Node.js globals)
  {
    pattern: /(?:const|let|var)\s+_(?!_)\w+/g,
    description: 'Variable declaration with underscore prefix',
    severity: 'error'
  },
];

async function findTypeScriptFiles(dir) {
  const files = [];
  
  async function traverse(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}: ${error.message}`);
    }
  }
  
  await traverse(dir);
  return files;
}

async function checkFileForViolations(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const violations = [];
    
    VIOLATION_PATTERNS.forEach((patternObj, index) => {
      const matches = content.match(patternObj.pattern);
      if (matches) {
        matches.forEach(match => {
          // Get line number
          const lines = content.substring(0, content.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          // Skip legitimate import aliases that are actually used
          if (match.includes('import') && content.includes(match.replace('_', ''))) {
            return;
          }
          
          violations.push({
            file: filePath,
            line: lineNumber,
            violation: match.trim(),
            description: patternObj.description,
            severity: patternObj.severity
          });
        });
      }
    });
    
    return violations;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🔍 Checking for unused variable violations...\n');
  
  const srcDir = join(process.cwd(), 'src');
  const files = await findTypeScriptFiles(srcDir);
  
  console.log(`📁 Scanning ${files.length} TypeScript files...\n`);
  
  const allViolations = [];
  
  for (const file of files) {
    const violations = await checkFileForViolations(file);
    allViolations.push(...violations);
  }
  
  if (allViolations.length === 0) {
    console.log('✅ No unused variable violations found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${allViolations.length} unused variable violations:\n`);
  
  // Group by file
  const violationsByFile = {};
  allViolations.forEach(violation => {
    const relativePath = violation.file.replace(process.cwd() + '/', '');
    if (!violationsByFile[relativePath]) {
      violationsByFile[relativePath] = [];
    }
    violationsByFile[relativePath].push(violation);
  });
  
  // Display violations
  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`📄 ${file}:`);
    violations.forEach(v => {
      const emoji = v.severity === 'error' ? '🚨' : '⚠️';
      console.log(`  ${emoji} Line ${v.line}: ${v.violation}`);
      console.log(`    → ${v.description}`);
    });
    console.log('');
  });
  
  // Summary and recommendations
  console.log('🔧 RECOMMENDATIONS:');
  console.log('');
  console.log('1. REMOVE UNUSED: If the variable is truly unused, remove it entirely');
  console.log('2. INVESTIGATE USAGE: If the variable should be used, find where and fix the logic');
  console.log('3. REFACTOR: Consider if the code design needs improvement');
  console.log('');
  console.log('⚠️  Variables prefixed with _ indicate code quality issues that need attention!');
  console.log('');
  console.log('NOTE: This script excludes legitimate uses like:');
  console.log('- Node.js globals (__filename, __dirname)'); 
  console.log('- Mock function parameters in test utilities');
  console.log('- Import aliases that resolve naming conflicts');
  
  process.exit(1);
}

main().catch(error => {
  console.error('Error running unused variables check:', error);
  process.exit(1);
});