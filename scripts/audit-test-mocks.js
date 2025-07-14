#!/usr/bin/env node

/**
 * Script to audit test mocks and identify patterns that don't follow dependency injection
 * 
 * ALLOWED PATTERNS:
 * - createMockExecutor() - dependency injection executor mocks
 * - createMockFileSystemExecutor() - file system executor mocks
 * - vi.mock('fs') - file system mocks
 * - vi.mock('fs/promises') - file system promise mocks
 * - vi.mock('path') - path utility mocks
 * 
 * FORBIDDEN PATTERNS:
 * - vi.mock('child_process') - should use executor injection instead
 * - vi.mock('../../../utils/index.js') - should use executor injection instead
 * - vi.mock('../../utils/index.js') - should use executor injection instead
 * - Any other vi.mock() calls that aren't file system related
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Patterns for ALLOWED mocks - ONLY dependency injection patterns
const ALLOWED_MOCK_PATTERNS = [
  /createMockExecutor/,                         // Dependency injection executor
  /createMockFileSystemExecutor/,               // File system executor
];

// Patterns for FORBIDDEN mocks - NO vi.mock() calls allowed, only dependency injection
const FORBIDDEN_MOCK_PATTERNS = [
  {
    pattern: /vi\.mock\s*\(/,
    reason: 'NO vi.mock() calls allowed - use dependency injection with createMockExecutor() instead'
  },
  {
    pattern: /mockExecuteCommand/,
    reason: 'Should use createMockExecutor() instead of mocking executeCommand directly'
  },
  {
    pattern: /mockValidateRequiredParam/,
    reason: 'Should use actual validation or executor injection'
  },
  {
    pattern: /mockValidateFileExists/,
    reason: 'Should use actual validation or executor injection'
  },
  {
    pattern: /mockStartLogCapture/,
    reason: 'Should use actual function or executor injection'
  },
  {
    pattern: /mockCreateTextResponse/,
    reason: 'Should use actual function - no need to mock response utilities'
  },
  {
    pattern: /mockCreateErrorResponse/,
    reason: 'Should use actual function - no need to mock response utilities'
  },
  {
    pattern: /\.mockReturnValue/,
    reason: 'No vitest mocking - use dependency injection with createMockExecutor()'
  },
  {
    pattern: /\.mockResolvedValue/,
    reason: 'No vitest mocking - use dependency injection with createMockExecutor()'
  },
  {
    pattern: /\.mockRejectedValue/,
    reason: 'No vitest mocking - use dependency injection with createMockExecutor()'
  },
  {
    pattern: /\.mockImplementation/,
    reason: 'No vitest mocking - use dependency injection with createMockExecutor()'
  },
];

// Additional patterns that might indicate setTimeout-based testing
const DEPRECATED_PATTERNS = [
  {
    pattern: /setTimeout\s*\(\s*\(\s*\)\s*=>/,
    reason: 'Deprecated setTimeout-based testing pattern'
  },
  {
    pattern: /MockChildProcess\s+extends\s+EventEmitter/,
    reason: 'Deprecated MockChildProcess pattern'
  },
  {
    pattern: /mockProcess\.stdout\.emit/,
    reason: 'Deprecated process event mocking'
  },
  {
    pattern: /mockProcess\.stderr\.emit/,
    reason: 'Deprecated process event mocking'
  },
  {
    pattern: /mockProcess\.emit/,
    reason: 'Deprecated process event mocking'
  },
];

function findTestFiles(dir) {
  const testFiles = [];
  
  function traverse(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          traverse(fullPath);
        }
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return testFiles;
}

function analyzeTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    const lines = content.split('\n');
    
    const issues = [];
    const allowedMocks = [];
    const deprecatedPatterns = [];
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // Check for allowed patterns
      ALLOWED_MOCK_PATTERNS.forEach(pattern => {
        if (pattern.test(trimmedLine)) {
          allowedMocks.push({
            line: lineNumber,
            content: trimmedLine,
            type: 'allowed'
          });
        }
      });
      
      // Check for forbidden patterns
      FORBIDDEN_MOCK_PATTERNS.forEach(({ pattern, reason }) => {
        if (pattern.test(trimmedLine)) {
          issues.push({
            line: lineNumber,
            content: trimmedLine,
            reason,
            type: 'forbidden'
          });
        }
      });
      
      // Check for deprecated patterns
      DEPRECATED_PATTERNS.forEach(({ pattern, reason }) => {
        if (pattern.test(trimmedLine)) {
          deprecatedPatterns.push({
            line: lineNumber,
            content: trimmedLine,
            reason,
            type: 'deprecated'
          });
        }
      });
    });
    
    return {
      filePath: relativePath,
      issues,
      allowedMocks,
      deprecatedPatterns,
      hasProblems: issues.length > 0 || deprecatedPatterns.length > 0
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 Auditing test mocks for dependency injection compliance...\n');
  
  const testFiles = findTestFiles(join(projectRoot, 'src'));
  const results = testFiles.map(analyzeTestFile).filter(Boolean);
  
  const problemFiles = results.filter(r => r.hasProblems);
  const cleanFiles = results.filter(r => !r.hasProblems);
  
  console.log(`📊 AUDIT SUMMARY`);
  console.log(`===============`);
  console.log(`Total test files analyzed: ${results.length}`);
  console.log(`❌ Files with mock issues: ${problemFiles.length}`);
  console.log(`✅ Clean files: ${cleanFiles.length}`);
  console.log('');
  
  if (problemFiles.length > 0) {
    console.log(`❌ FILES WITH MOCK ISSUES (${problemFiles.length}):`);
    console.log(`====================================`);
    
    problemFiles.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      
      if (result.issues.length > 0) {
        console.log(`   🚫 FORBIDDEN MOCKS:`);
        result.issues.forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.content}`);
          console.log(`   Reason: ${issue.reason}`);
          console.log('');
        });
      }
      
      if (result.deprecatedPatterns.length > 0) {
        console.log(`   ⚠️  DEPRECATED PATTERNS:`);
        result.deprecatedPatterns.forEach(pattern => {
          console.log(`   Line ${pattern.line}: ${pattern.content}`);
          console.log(`   Reason: ${pattern.reason}`);
          console.log('');
        });
      }
      
      console.log('');
    });
  }
  
  // Show examples of clean files
  const cleanFilesWithMocks = cleanFiles.filter(f => f.allowedMocks.length > 0);
  if (cleanFilesWithMocks.length > 0) {
    console.log(`✅ EXAMPLES OF CLEAN FILES (${Math.min(cleanFilesWithMocks.length, 5)}):`);
    console.log(`================================`);
    
    cleanFilesWithMocks.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      if (result.allowedMocks.length > 0) {
        console.log(`   ✅ Allowed mocks: ${result.allowedMocks.length}`);
        result.allowedMocks.slice(0, 2).forEach(mock => {
          console.log(`   Line ${mock.line}: ${mock.content}`);
        });
        if (result.allowedMocks.length > 2) {
          console.log(`   ... and ${result.allowedMocks.length - 2} more`);
        }
      }
      console.log('');
    });
  }
  
  // Summary recommendations
  console.log(`🎯 RECOMMENDATIONS:`);
  console.log(`==================`);
  
  if (problemFiles.length > 0) {
    console.log(`1. Fix ${problemFiles.length} files with forbidden mock patterns`);
    console.log(`2. Convert to dependency injection using createMockExecutor()`);
    console.log(`3. Remove vi.mock() calls for utils and child_process`);
    console.log(`4. Update plugin implementations to accept executor parameter`);
    console.log(`5. Use actual utility functions instead of mocking them`);
  } else {
    console.log(`🎉 All test files follow dependency injection mock patterns!`);
  }
  
  console.log('');
  console.log(`📋 ALLOWED MOCK PATTERNS (ONLY):`);
  console.log(`- createMockExecutor() - for command execution dependency injection`);
  console.log(`- createMockFileSystemExecutor() - for file system dependency injection`);
  console.log('');
  console.log(`🚫 FORBIDDEN PATTERNS:`);
  console.log(`- vi.mock() - ALL vi.mock() calls forbidden`);
  console.log(`- .mockReturnValue() - No vitest mocking`);
  console.log(`- .mockResolvedValue() - No vitest mocking`);
  console.log(`- mockExecuteCommand - No direct utils mocking`);
  
  // Exit with appropriate code
  process.exit(problemFiles.length > 0 ? 1 : 0);
}

main();