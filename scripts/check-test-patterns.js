#!/usr/bin/env node

/**
 * XcodeBuildMCP Test Pattern Violations Checker
 * 
 * Validates that all test files follow established testing patterns and
 * identifies violations of the project's testing guidelines.
 * 
 * USAGE:
 *   node scripts/check-test-patterns.js [--pattern=vitest|timeout|all]
 *   node scripts/check-test-patterns.js --help
 * 
 * TESTING GUIDELINES ENFORCED:
 * 1. NO vitest mocking patterns (vi.mock, vi.fn, .mockResolvedValue, etc.)
 * 2. NO setTimeout-based mocking patterns
 * 3. ONLY dependency injection with createMockExecutor() and createMockFileSystemExecutor()
 * 4. Proper test architecture compliance
 * 5. NO handler signature violations (handlers must have exact MCP SDK signatures)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const patternFilter = args.find(arg => arg.startsWith('--pattern='))?.split('=')[1] || 'all';
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
XcodeBuildMCP Test Pattern Violations Checker

USAGE:
  node scripts/check-test-patterns.js [options]

OPTIONS:
  --pattern=TYPE    Check specific pattern type (vitest|timeout|handler|all) [default: all]
  --help, -h        Show this help message

PATTERN TYPES:
  vitest           Check only vitest mocking violations (vi.mock, vi.fn, etc.)
  timeout          Check only setTimeout-based mocking patterns
  handler          Check only handler signature violations
  all              Check all pattern violations (default)

EXAMPLES:
  node scripts/check-test-patterns.js
  node scripts/check-test-patterns.js --pattern=vitest
  node scripts/check-test-patterns.js --pattern=timeout
`);
  process.exit(0);
}

// Patterns that indicate setTimeout-based mocking approach
const TIMEOUT_PATTERNS = [
  /setTimeout\s*\(\s*\(\s*\)\s*=>/,  // setTimeout(() => {
  /setTimeout\s*\(\s*function/,      // setTimeout(function() {
  /mockProcess\.stdout\.emit/,       // mockProcess.stdout.emit
  /mockProcess\.stderr\.emit/,       // mockProcess.stderr.emit
  /mockProcess\.emit\s*\(/,          // mockProcess.emit(
  /MockChildProcess\s+extends\s+EventEmitter/, // class MockChildProcess extends EventEmitter
  /new\s+EventEmitter\(\)/,          // new EventEmitter()
];

// CRITICAL: ALL VITEST MOCKING PATTERNS ARE COMPLETELY FORBIDDEN
// ONLY dependency injection with createMockExecutor and createMockFileSystemExecutor is allowed
const VITEST_MOCKING_PATTERNS = [
  /vi\.mock\s*\(/,                   // vi.mock() - BANNED
  /vi\.fn\s*\(/,                     // vi.fn() - BANNED
  /vi\.mocked\s*\(/,                 // vi.mocked() - BANNED
  /vi\.spyOn\s*\(/,                  // vi.spyOn() - BANNED
  /vi\.clearAllMocks\s*\(/,          // vi.clearAllMocks() - BANNED
  /\.mockResolvedValue/,             // .mockResolvedValue - BANNED
  /\.mockRejectedValue/,             // .mockRejectedValue - BANNED
  /\.mockReturnValue/,               // .mockReturnValue - BANNED
  /\.mockImplementation/,            // .mockImplementation - BANNED
  /\.mockClear/,                     // .mockClear - BANNED
  /\.mockReset/,                     // .mockReset - BANNED
  /\.mockRestore/,                   // .mockRestore - BANNED
  /\.toHaveBeenCalled/,              // .toHaveBeenCalled - BANNED
  /\.toHaveBeenCalledWith/,          // .toHaveBeenCalledWith - BANNED
  /MockedFunction/,                  // MockedFunction type - BANNED
  /mockExecuteCommand/,              // mockExecuteCommand variables - BANNED
  /mockValidateRequiredParam/,       // mockValidateRequiredParam variables - BANNED
  /mockValidateFileExists/,          // mockValidateFileExists variables - BANNED
  /mockStartLogCapture/,             // mockStartLogCapture variables - BANNED
  /mockCreateTextResponse/,          // mockCreateTextResponse variables - BANNED
  /mockCreateErrorResponse/,         // mockCreateErrorResponse variables - BANNED
  /mockLog/,                         // mockLog variables - BANNED
  /mockTemplateManager/,             // mockTemplateManager variables - BANNED
  /as MockedFunction/,               // Type casting to MockedFunction - BANNED
  /\bexecSync\b/,                    // execSync usage - BANNED (use executeCommand instead)
  /\bexecSyncFn\b/,                  // execSyncFn usage - BANNED (use executeCommand instead)
];

// CRITICAL: HANDLER SIGNATURE VIOLATIONS ARE FORBIDDEN
// MCP SDK requires handlers to have exact signatures: 
// Tools: (args: Record<string, unknown>) => Promise<ToolResponse>
// Resources: (uri: URL) => Promise<{ contents: Array<{ text: string }> }>
const HANDLER_SIGNATURE_VIOLATIONS = [
  /async\s+handler\s*\([^)]*:\s*[^,)]+,\s*[^)]+\s*:/ms,  // Handler with multiple parameters separated by comma - BANNED
  /async\s+handler\s*\(\s*args\?\s*:/ms,                   // Handler with optional args parameter - BANNED (should be required)
  /async\s+handler\s*\([^)]*,\s*[^)]*CommandExecutor/ms,  // Handler with CommandExecutor parameter - BANNED
  /async\s+handler\s*\([^)]*,\s*[^)]*FileSystemExecutor/ms, // Handler with FileSystemExecutor parameter - BANNED
  /async\s+handler\s*\([^)]*,\s*[^)]*Dependencies/ms,      // Handler with Dependencies parameter - BANNED
  /async\s+handler\s*\([^)]*,\s*[^)]*executor\s*:/ms,      // Handler with executor parameter - BANNED
  /async\s+handler\s*\([^)]*,\s*[^)]*dependencies\s*:/ms,  // Handler with dependencies parameter - BANNED
];

// ALLOWED PATTERNS for cleanup (not mocking)
const ALLOWED_CLEANUP_PATTERNS = [
  // All cleanup patterns removed - no exceptions allowed
];

// Patterns that indicate TRUE dependency injection approach
const DEPENDENCY_INJECTION_PATTERNS = [
  /createMockExecutor/,              // createMockExecutor usage
  /createMockFileSystemExecutor/,    // createMockFileSystemExecutor usage
  /executor\?\s*:\s*CommandExecutor/, // executor?: CommandExecutor parameter
];

function findTestFiles(dir) {
  const testFiles = [];
  
  function traverse(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other non-relevant directories
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

function findToolAndResourceFiles(dir) {
  const toolFiles = [];
  
  function traverse(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip test directories and other non-relevant directories
        if (!item.startsWith('.') && item !== '__tests__' && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          traverse(fullPath);
        }
      } else if ((item.endsWith('.ts') || item.endsWith('.js')) && !item.includes('.test.') && item !== 'index.ts' && item !== 'index.js') {
        toolFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return toolFiles;
}

function analyzeTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for setTimeout patterns
    const hasTimeoutPatterns = TIMEOUT_PATTERNS.some(pattern => pattern.test(content));
    
    // Check for vitest mocking patterns (FORBIDDEN)
    const hasVitestMockingPatterns = VITEST_MOCKING_PATTERNS.some(pattern => pattern.test(content));
    
    // Check for dependency injection patterns (TRUE DI)
    const hasDIPatterns = DEPENDENCY_INJECTION_PATTERNS.some(pattern => pattern.test(content));
    
    // Extract specific pattern occurrences for details
    const timeoutDetails = [];
    const vitestMockingDetails = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      TIMEOUT_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          timeoutDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
      
      VITEST_MOCKING_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          // Check if this line matches any allowed cleanup patterns
          const isAllowedCleanup = ALLOWED_CLEANUP_PATTERNS.some(allowedPattern => 
            allowedPattern.test(line.trim())
          );
          
          if (!isAllowedCleanup) {
            vitestMockingDetails.push({
              line: index + 1,
              content: line.trim(),
              pattern: pattern.source
            });
          }
        }
      });
    });
    
    return {
      filePath: relativePath,
      hasTimeoutPatterns,
      hasVitestMockingPatterns,
      hasDIPatterns,
      timeoutDetails,
      vitestMockingDetails,
      needsConversion: hasTimeoutPatterns || hasVitestMockingPatterns,
      isConverted: hasDIPatterns && !hasTimeoutPatterns && !hasVitestMockingPatterns,
      isMixed: (hasTimeoutPatterns || hasVitestMockingPatterns) && hasDIPatterns
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

function analyzeToolOrResourceFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for handler signature violations (FORBIDDEN)
    const hasHandlerSignatureViolations = HANDLER_SIGNATURE_VIOLATIONS.some(pattern => pattern.test(content));
    
    // Extract handler signature violation details
    const handlerSignatureDetails = [];
    if (hasHandlerSignatureViolations) {
      // Use regex to find the violation and its line number
      const lines = content.split('\n');
      const fullContent = content;
      
      HANDLER_SIGNATURE_VIOLATIONS.forEach(pattern => {
        let match;
        const globalPattern = new RegExp(pattern.source, pattern.flags + 'g');
        while ((match = globalPattern.exec(fullContent)) !== null) {
          // Find which line this match is on
          const beforeMatch = fullContent.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          
          handlerSignatureDetails.push({
            line: lineNumber,
            content: match[0].replace(/\s+/g, ' ').trim(),
            pattern: pattern.source
          });
        }
      });
    }
    
    return {
      filePath: relativePath,
      hasHandlerSignatureViolations,
      handlerSignatureDetails,
      needsConversion: hasHandlerSignatureViolations
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 XcodeBuildMCP Test Pattern Violations Checker\n');
  console.log(`🎯 Checking pattern type: ${patternFilter.toUpperCase()}\n`);
  console.log('TESTING GUIDELINES ENFORCED:');
  console.log('✅ ONLY ALLOWED: createMockExecutor() and createMockFileSystemExecutor()');
  console.log('❌ BANNED: vitest mocking patterns (vi.mock, vi.fn, .mockResolvedValue, etc.)');
  console.log('❌ BANNED: setTimeout-based mocking patterns');
  console.log('❌ BANNED: handler signature violations (handlers must have exact MCP SDK signatures)\n');
  
  const testFiles = findTestFiles(join(projectRoot, 'src'));
  const results = testFiles.map(analyzeTestFile).filter(Boolean);
  
  // Also check tool and resource files for handler signature violations
  const toolFiles = findToolAndResourceFiles(join(projectRoot, 'src', 'mcp', 'tools'));
  const resourceFiles = findToolAndResourceFiles(join(projectRoot, 'src', 'mcp', 'resources'));
  const allToolAndResourceFiles = [...toolFiles, ...resourceFiles];
  const handlerResults = allToolAndResourceFiles.map(analyzeToolOrResourceFile).filter(Boolean);
  
  // Filter results based on pattern type
  let filteredResults;
  let filteredHandlerResults = [];
  
  switch (patternFilter) {
    case 'vitest':
      filteredResults = results.filter(r => r.hasVitestMockingPatterns);
      console.log(`Filtering to show only vitest mocking violations (${filteredResults.length} files)`);
      break;
    case 'timeout':
      filteredResults = results.filter(r => r.hasTimeoutPatterns);
      console.log(`Filtering to show only setTimeout violations (${filteredResults.length} files)`);
      break;
    case 'handler':
      filteredResults = [];
      filteredHandlerResults = handlerResults.filter(r => r.hasHandlerSignatureViolations);
      console.log(`Filtering to show only handler signature violations (${filteredHandlerResults.length} files)`);
      break;
    case 'all':
    default:
      filteredResults = results.filter(r => r.needsConversion);
      filteredHandlerResults = handlerResults.filter(r => r.hasHandlerSignatureViolations);
      console.log(`Showing all pattern violations (${filteredResults.length} test files + ${filteredHandlerResults.length} handler files)`);
      break;
  }
  
  const needsConversion = filteredResults;
  const converted = results.filter(r => r.isConverted);
  const mixed = results.filter(r => r.isMixed);
  const timeoutOnly = results.filter(r => r.hasTimeoutPatterns && !r.hasVitestMockingPatterns && !r.hasDIPatterns);
  const vitestMockingOnly = results.filter(r => r.hasVitestMockingPatterns && !r.hasTimeoutPatterns && !r.hasDIPatterns);
  const noPatterns = results.filter(r => !r.hasTimeoutPatterns && !r.hasVitestMockingPatterns && !r.hasDIPatterns);
  
  console.log(`📊 VITEST MOCKING VIOLATION ANALYSIS`);
  console.log(`===================================`);
  console.log(`Total test files analyzed: ${results.length}`);
  console.log(`🚨 FILES VIOLATING VITEST MOCKING BAN: ${needsConversion.length}`);
  console.log(`  └─ setTimeout-based violations: ${timeoutOnly.length}`);
  console.log(`  └─ vitest mocking violations: ${vitestMockingOnly.length}`);
  console.log(`✅ COMPLIANT (pure dependency injection): ${converted.length}`);
  console.log(`⚠️  MIXED VIOLATIONS: ${mixed.length}`);
  console.log(`📝 No patterns detected: ${noPatterns.length}`);
  console.log('');
  
  if (needsConversion.length > 0) {
    console.log(`❌ FILES THAT NEED CONVERSION (${needsConversion.length}):`);
    console.log(`=====================================`);
    needsConversion.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      
      if (result.timeoutDetails.length > 0) {
        console.log(`   🕐 TIMEOUT PATTERNS (${result.timeoutDetails.length}):`);
        result.timeoutDetails.slice(0, 2).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.timeoutDetails.length > 2) {
          console.log(`   ... and ${result.timeoutDetails.length - 2} more setTimeout patterns`);
        }
      }
      
      if (result.vitestMockingDetails.length > 0) {
        console.log(`   🧪 VITEST MOCKING PATTERNS (${result.vitestMockingDetails.length}):`);
        result.vitestMockingDetails.slice(0, 2).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.vitestMockingDetails.length > 2) {
          console.log(`   ... and ${result.vitestMockingDetails.length - 2} more vitest patterns`);
        }
      }
      
      console.log('');
    });
  }
  
  // Handler signature violations reporting
  if (filteredHandlerResults.length > 0) {
    console.log(`🚨 HANDLER SIGNATURE VIOLATIONS (${filteredHandlerResults.length}):`);
    console.log(`===========================================`);
    filteredHandlerResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      
      if (result.handlerSignatureDetails.length > 0) {
        console.log(`   🛠️  HANDLER VIOLATIONS (${result.handlerSignatureDetails.length}):`);
        result.handlerSignatureDetails.forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
      }
      
      console.log('');
    });
  }
  
  if (mixed.length > 0) {
    console.log(`⚠️  FILES WITH MIXED PATTERNS (${mixed.length}):`);
    console.log(`===================================`);
    mixed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      console.log(`   ⚠️  Contains both setTimeout and dependency injection patterns`);
      console.log('');
    });
  }
  
  if (converted.length > 0) {
    console.log(`✅ SUCCESSFULLY CONVERTED FILES (${converted.length}):`);
    console.log(`====================================`);
    converted.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
    });
    console.log('');
  }
  
  // Summary for next steps
  const hasViolations = needsConversion.length > 0 || filteredHandlerResults.length > 0;
  
  if (needsConversion.length > 0) {
    console.log(`🚨 CRITICAL ACTION REQUIRED (TEST FILES):`);
    console.log(`=======================================`);
    console.log(`1. IMMEDIATELY remove ALL vitest mocking from ${needsConversion.length} files`);
    console.log(`2. BANNED: vi.mock(), vi.fn(), .mockResolvedValue(), .toHaveBeenCalled(), etc.`);
    console.log(`3. ONLY ALLOWED: createMockExecutor() and createMockFileSystemExecutor()`);
    console.log(`4. Update plugin implementations to accept executor?: CommandExecutor parameter`);
    console.log(`5. Run this script again after each fix to track progress`);
    console.log('');
    
    // Show top files by total violation count
    const sortedByPatterns = needsConversion
      .sort((a, b) => (b.timeoutDetails.length + b.vitestMockingDetails.length) - (a.timeoutDetails.length + a.vitestMockingDetails.length))
      .slice(0, 5);
    
    console.log(`🚨 TOP 5 TEST FILES WITH MOST VIOLATIONS:`);
    sortedByPatterns.forEach((result, index) => {
      const totalPatterns = result.timeoutDetails.length + result.vitestMockingDetails.length;
      console.log(`${index + 1}. ${result.filePath} (${totalPatterns} violations: ${result.timeoutDetails.length} timeout + ${result.vitestMockingDetails.length} vitest)`);
    });
    console.log('');
  }
  
  if (filteredHandlerResults.length > 0) {
    console.log(`🚨 CRITICAL ACTION REQUIRED (HANDLER FILES):`);
    console.log(`==========================================`);
    console.log(`1. IMMEDIATELY fix ALL handler signature violations in ${filteredHandlerResults.length} files`);
    console.log(`2. Tools: Handler must be: async handler(args: Record<string, unknown>): Promise<ToolResponse>`);
    console.log(`3. Resources: Handler must be: async handler(uri: URL): Promise<{ contents: Array<{ text: string }> }>`);
    console.log(`4. Inject dependencies INSIDE handler body: const executor = getDefaultCommandExecutor()`);
    console.log(`5. Run this script again after each fix to track progress`);
    console.log('');
  }
  
  if (!hasViolations && mixed.length === 0) {
    console.log(`🎉 ALL FILES COMPLY WITH PROJECT STANDARDS!`);
    console.log(`==========================================`);
    console.log(`✅ All test files use ONLY createMockExecutor() and createMockFileSystemExecutor()`);
    console.log(`✅ All handler signatures comply with MCP SDK requirements`);
    console.log(`✅ No violations detected!`);
  }
  
  // Exit with appropriate code
  process.exit(hasViolations || mixed.length > 0 ? 1 : 0);
}

main();