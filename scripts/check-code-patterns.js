#!/usr/bin/env node

/**
 * XcodeBuildMCP Code Pattern Violations Checker
 * 
 * Validates that all code files follow XcodeBuildMCP-specific architectural patterns.
 * This script focuses on domain-specific rules that ESLint cannot express.
 * 
 * USAGE:
 *   node scripts/check-code-patterns.js [--pattern=vitest|execsync|handler|handler-testing|all]
 *   node scripts/check-code-patterns.js --help
 * 
 * ARCHITECTURAL RULES ENFORCED:
 * 1. NO vitest mocking patterns (vi.mock, vi.fn, .mockResolvedValue, etc.)
 * 2. NO execSync usage in production code (use CommandExecutor instead)
 * 3. ONLY dependency injection with createMockExecutor() and createMockFileSystemExecutor()
 * 4. NO handler signature violations (handlers must have exact MCP SDK signatures)
 * 5. NO handler testing violations (test logic functions, not handlers directly)
 * 
 * For comprehensive code quality documentation, see docs/dev/CODE_QUALITY.md
 * 
 * Note: General code quality rules (TypeScript, ESLint) are handled by other tools.
 * This script only enforces XcodeBuildMCP-specific architectural patterns.
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
XcodeBuildMCP Code Pattern Violations Checker

USAGE:
  node scripts/check-code-patterns.js [options]

OPTIONS:
  --pattern=TYPE    Check specific pattern type (vitest|execsync|handler|handler-testing|server-typing|all) [default: all]
  --help, -h        Show this help message

PATTERN TYPES:
  vitest           Check only vitest mocking violations (vi.mock, vi.fn, etc.)
  execsync         Check only execSync usage in production code
  handler          Check only handler signature violations
  handler-testing  Check only handler testing violations (testing handlers instead of logic functions)
  server-typing    Check only improper server typing violations (Record<string, unknown> casts)
  all              Check all pattern violations (default)

  Note: General code quality (TypeScript, etc.) is handled by ESLint

EXAMPLES:
  node scripts/check-code-patterns.js
  node scripts/check-code-patterns.js --pattern=vitest
  node scripts/check-code-patterns.js --pattern=handler
  node scripts/check-code-patterns.js --pattern=handler-testing
  node scripts/check-code-patterns.js --pattern=server-typing
`);
  process.exit(0);
}

// Patterns for execSync usage in production code (FORBIDDEN)
// Note: execSync is allowed in test files for mocking, but not in production code
const EXECSYNC_PATTERNS = [
  /\bexecSync\s*\(/,                 // Direct execSync usage
  /\bexecSyncFn\s*[=:]/,             // execSyncFn parameter or assignment
  /^import\s+(?!type\s)[^}]*from\s+['"]child_process['"]/m,    // Importing from child_process (except type-only imports)
  /^import\s+{[^}]*(?:exec|spawn|execSync)[^}]*}\s+from\s+['"](?:node:)?child_process['"]/m, // Named imports of functions
];

// CRITICAL: ALL VITEST MOCKING PATTERNS ARE COMPLETELY FORBIDDEN
// ONLY dependency injection with approved mock utilities is allowed
const VITEST_GENERIC_PATTERNS = [
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
  /as MockedFunction/,               // Type casting to MockedFunction - BANNED
  /\bexecSync\b/,                    // execSync usage - BANNED (use executeCommand instead)
  /\bexecSyncFn\b/,                  // execSyncFn usage - BANNED (use executeCommand instead)
];

// APPROVED mock utilities - ONLY these are allowed
const APPROVED_MOCK_PATTERNS = [
  /\bcreateMockExecutor\b/,
  /\bcreateMockFileSystemExecutor\b/,
  /\bcreateNoopExecutor\b/,
  /\bcreateNoopFileSystemExecutor\b/,
  /\bcreateCommandMatchingMockExecutor\b/,
  /\bcreateMockEnvironmentDetector\b/,
];

// REFINED PATTERNS - Only flag ACTUAL vitest violations, not approved dependency injection patterns
// Manual executors and mock objects are APPROVED when used for dependency injection
const UNAPPROVED_MOCK_PATTERNS = [
  // ONLY ACTUAL VITEST PATTERNS (vi.* usage) - Everything else is approved
  /\bmock[A-Z][a-zA-Z0-9]*\s*=\s*vi\./,              // mockSomething = vi.fn() - vitest assignments only

  // No other patterns - manual executors and mock objects are approved for dependency injection
];

// Function to check if a line contains unapproved mock patterns
function hasUnapprovedMockPattern(line) {
  // Skip lines that contain approved patterns
  const hasApprovedPattern = APPROVED_MOCK_PATTERNS.some(pattern => pattern.test(line));
  if (hasApprovedPattern) {
    return false;
  }

  // Check for unapproved patterns
  return UNAPPROVED_MOCK_PATTERNS.some(pattern => pattern.test(line));
}

// Combined pattern checker for backward compatibility
const VITEST_MOCKING_PATTERNS = VITEST_GENERIC_PATTERNS;

// CRITICAL: ARCHITECTURAL VIOLATIONS - Utilities bypassing CommandExecutor (BANNED)
const UTILITY_BYPASS_PATTERNS = [
  /spawn\s*\(/,                      // Direct Node.js spawn usage in utilities - BANNED
  /exec\s*\(/,                       // Direct Node.js exec usage in utilities - BANNED  
  /execSync\s*\(/,                   // Direct Node.js execSync usage in utilities - BANNED
  /child_process\./,                 // Direct child_process module usage in utilities - BANNED
];

// TypeScript patterns are now handled by ESLint - removed from domain-specific checks
// ESLint has comprehensive TypeScript rules with proper test file exceptions

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

// CRITICAL: HANDLER TESTING IN TESTS IS FORBIDDEN
// Tests must ONLY call logic functions with dependency injection, NEVER handlers directly
// Handlers are thin wrappers for MCP SDK - testing them violates dependency injection architecture
const HANDLER_TESTING_VIOLATIONS = [
  /\.handler\s*\(/,                     // Direct handler calls in tests - BANNED
  /await\s+\w+\.handler\s*\(/,          // Awaited handler calls - BANNED
  /const\s+result\s*=\s*await\s+\w+\.handler/, // Handler result assignment - BANNED
  /expect\s*\(\s*await\s+\w+\.handler/, // Handler expectation calls - BANNED
];

// CRITICAL: IMPROPER SERVER TYPING PATTERNS ARE FORBIDDEN  
// Server instances must use proper MCP SDK types, not generic Record<string, unknown> casts
const IMPROPER_SERVER_TYPING_VIOLATIONS = [
  /as Record<string, unknown>.*server/,           // Casting server to Record - BANNED
  /server.*as Record<string, unknown>/,           // Casting server to Record - BANNED
  /mcpServer\?\s*:\s*Record<string, unknown>/,    // Typing server as Record - BANNED
  /server\.server\?\?\s*server.*as Record/,       // Complex server casting - BANNED
  /interface\s+MCPServerInterface\s*{/,           // Custom MCP interfaces when SDK types exist - BANNED
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

function findUtilityFiles(dir) {
  const utilityFiles = [];

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
        // Only include key utility files that should use CommandExecutor
        // Exclude command.ts itself as it's the core implementation that is allowed to use spawn()
        if (fullPath.includes('/utils/') && (
          fullPath.includes('log_capture.ts') ||
          fullPath.includes('build.ts') ||
          fullPath.includes('simctl.ts')
        ) && !fullPath.includes('command.ts')) {
          utilityFiles.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return utilityFiles;
}

// Helper function to determine if a file is a test file
function isTestFile(filePath) {
  return filePath.includes('__tests__') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.js');
}

// Helper function to determine if a file is a production file
function isProductionFile(filePath) {
  return !isTestFile(filePath) && (filePath.endsWith('.ts') || filePath.endsWith('.js'));
}

// Helper function to determine if a file is allowed to use child_process
function isAllowedChildProcessFile(filePath) {
  // These files need direct child_process access for their core functionality
  return filePath.includes('command.ts') || // Core CommandExecutor implementation
    filePath.includes('swift_package_run.ts'); // Needs spawn for background process management
}

function analyzeTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);

    // Check for vitest mocking patterns using new robust approach
    const vitestMockingDetails = [];
    const lines = content.split('\n');

    // 1. Check generic vi.* patterns (always violations)
    lines.forEach((line, index) => {
      VITEST_GENERIC_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          vitestMockingDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source,
            type: 'vitest-generic'
          });
        }
      });

      // 2. Check for unapproved mock patterns
      if (hasUnapprovedMockPattern(line)) {
        // Find which specific pattern matched for better reporting
        const matchedPattern = UNAPPROVED_MOCK_PATTERNS.find(pattern => pattern.test(line));
        vitestMockingDetails.push({
          line: index + 1,
          content: line.trim(),
          pattern: matchedPattern ? matchedPattern.source : 'unapproved mock pattern',
          type: 'unapproved-mock'
        });
      }
    });

    const hasVitestMockingPatterns = vitestMockingDetails.length > 0;

    // TypeScript patterns now handled by ESLint
    const hasTypescriptAntipatterns = false;

    // Check for handler testing violations (FORBIDDEN - ARCHITECTURAL VIOLATION)
    const hasHandlerTestingViolations = HANDLER_TESTING_VIOLATIONS.some(pattern => pattern.test(content));

    // Check for improper server typing violations (FORBIDDEN - ARCHITECTURAL VIOLATION)
    const hasImproperServerTypingViolations = IMPROPER_SERVER_TYPING_VIOLATIONS.some(pattern => pattern.test(content));

    // Check for dependency injection patterns (TRUE DI)
    const hasDIPatterns = DEPENDENCY_INJECTION_PATTERNS.some(pattern => pattern.test(content));

    // Extract specific pattern occurrences for details
    const execSyncDetails = []; // Not applicable to test files
    const typescriptAntipatternDetails = []; // Unused - TypeScript handled by ESLint
    const handlerTestingDetails = [];
    const improperServerTypingDetails = [];

    lines.forEach((line, index) => {

      // TypeScript anti-patterns now handled by ESLint - removed from domain checks

      HANDLER_TESTING_VIOLATIONS.forEach(pattern => {
        if (pattern.test(line)) {
          handlerTestingDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });

      IMPROPER_SERVER_TYPING_VIOLATIONS.forEach(pattern => {
        if (pattern.test(line)) {
          improperServerTypingDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });

    return {
      filePath: relativePath,
      hasExecSyncPatterns: false, // Not applicable to test files
      hasVitestMockingPatterns,
      hasTypescriptAntipatterns,
      hasHandlerTestingViolations,
      hasImproperServerTypingViolations,
      hasDIPatterns,
      execSyncDetails,
      vitestMockingDetails,
      typescriptAntipatternDetails,
      handlerTestingDetails,
      improperServerTypingDetails,
      needsConversion: hasVitestMockingPatterns || hasHandlerTestingViolations || hasImproperServerTypingViolations,
      isConverted: hasDIPatterns && !hasVitestMockingPatterns && !hasHandlerTestingViolations && !hasImproperServerTypingViolations,
      isMixed: (hasVitestMockingPatterns || hasHandlerTestingViolations || hasImproperServerTypingViolations) && hasDIPatterns
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

    // Check for execSync patterns in production code (excluding allowed files)
    const hasExecSyncPatterns = isProductionFile(filePath) &&
      !isAllowedChildProcessFile(filePath) &&
      EXECSYNC_PATTERNS.some(pattern => pattern.test(content));

    // Check for vitest mocking patterns using new robust approach
    const vitestMockingDetails = [];
    const lines = content.split('\n');

    // 1. Check generic vi.* patterns (always violations)
    lines.forEach((line, index) => {
      VITEST_GENERIC_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          vitestMockingDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source,
            type: 'vitest-generic'
          });
        }
      });

      // 2. Check for unapproved mock patterns
      if (hasUnapprovedMockPattern(line)) {
        // Find which specific pattern matched for better reporting
        const matchedPattern = UNAPPROVED_MOCK_PATTERNS.find(pattern => pattern.test(line));
        vitestMockingDetails.push({
          line: index + 1,
          content: line.trim(),
          pattern: matchedPattern ? matchedPattern.source : 'unapproved mock pattern',
          type: 'unapproved-mock'
        });
      }
    });

    const hasVitestMockingPatterns = vitestMockingDetails.length > 0;

    // TypeScript patterns now handled by ESLint
    const hasTypescriptAntipatterns = false;

    // Check for dependency injection patterns (TRUE DI)
    const hasDIPatterns = DEPENDENCY_INJECTION_PATTERNS.some(pattern => pattern.test(content));

    // Check for handler signature violations (FORBIDDEN)
    const hasHandlerSignatureViolations = HANDLER_SIGNATURE_VIOLATIONS.some(pattern => pattern.test(content));

    // Check for improper server typing violations (FORBIDDEN - ARCHITECTURAL VIOLATION)
    const hasImproperServerTypingViolations = IMPROPER_SERVER_TYPING_VIOLATIONS.some(pattern => pattern.test(content));

    // Check for utility bypass patterns (ARCHITECTURAL VIOLATION)
    const hasUtilityBypassPatterns = UTILITY_BYPASS_PATTERNS.some(pattern => pattern.test(content));

    // Extract specific pattern occurrences for details
    const execSyncDetails = [];
    const typescriptAntipatternDetails = []; // Unused - TypeScript handled by ESLint
    const handlerSignatureDetails = [];
    const improperServerTypingDetails = [];
    const utilityBypassDetails = [];

    lines.forEach((line, index) => {
      if (isProductionFile(filePath) && !isAllowedChildProcessFile(filePath)) {
        EXECSYNC_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            execSyncDetails.push({
              line: index + 1,
              content: line.trim(),
              pattern: pattern.source
            });
          }
        });
      }

      // TypeScript anti-patterns now handled by ESLint - removed from domain checks

      IMPROPER_SERVER_TYPING_VIOLATIONS.forEach(pattern => {
        if (pattern.test(line)) {
          improperServerTypingDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });

      UTILITY_BYPASS_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          utilityBypassDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });
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
      hasExecSyncPatterns,
      hasVitestMockingPatterns,
      hasTypescriptAntipatterns,
      hasDIPatterns,
      hasHandlerSignatureViolations,
      hasImproperServerTypingViolations,
      hasUtilityBypassPatterns,
      execSyncDetails,
      vitestMockingDetails,
      typescriptAntipatternDetails,
      handlerSignatureDetails,
      improperServerTypingDetails,
      utilityBypassDetails,
      needsConversion: hasExecSyncPatterns || hasVitestMockingPatterns || hasHandlerSignatureViolations || hasImproperServerTypingViolations || hasUtilityBypassPatterns,
      isConverted: hasDIPatterns && !hasExecSyncPatterns && !hasVitestMockingPatterns && !hasHandlerSignatureViolations && !hasImproperServerTypingViolations && !hasUtilityBypassPatterns,
      isMixed: (hasExecSyncPatterns || hasVitestMockingPatterns || hasHandlerSignatureViolations || hasImproperServerTypingViolations || hasUtilityBypassPatterns) && hasDIPatterns
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 XcodeBuildMCP Code Pattern Violations Checker\n');
  console.log(`🎯 Checking pattern type: ${patternFilter.toUpperCase()}\n`);
  console.log('CODE GUIDELINES ENFORCED:');
  console.log('✅ ONLY ALLOWED: createMockExecutor() and createMockFileSystemExecutor()');
  console.log('❌ BANNED: vitest mocking patterns (vi.mock, vi.fn, .mockResolvedValue, etc.)');
  console.log('❌ BANNED: execSync usage in production code (use CommandExecutor instead)');
  console.log('ℹ️  TypeScript patterns: Handled by ESLint with proper test exceptions');
  console.log('❌ BANNED: handler signature violations (handlers must have exact MCP SDK signatures)');
  console.log('❌ BANNED: handler testing violations (test logic functions, not handlers directly)');
  console.log('❌ BANNED: improper server typing (use McpServer type, not Record<string, unknown>)\n');

  const testFiles = findTestFiles(join(projectRoot, 'src'));
  const testResults = testFiles.map(analyzeTestFile).filter(Boolean);

  // Also check tool and resource files for TypeScript anti-patterns AND handler signature violations
  const toolFiles = findToolAndResourceFiles(join(projectRoot, 'src', 'mcp', 'tools'));
  const resourceFiles = findToolAndResourceFiles(join(projectRoot, 'src', 'mcp', 'resources'));
  const allToolAndResourceFiles = [...toolFiles, ...resourceFiles];
  const toolResults = allToolAndResourceFiles.map(analyzeToolOrResourceFile).filter(Boolean);

  // Check utility files for architectural violations (bypassing CommandExecutor)
  const utilityFiles = findUtilityFiles(join(projectRoot, 'src'));
  const utilityResults = utilityFiles.map(analyzeToolOrResourceFile).filter(Boolean);

  // Combine test, tool, and utility file results for analysis
  const results = [...testResults, ...toolResults, ...utilityResults];
  const handlerResults = toolResults;
  const utilityBypassResults = utilityResults.filter(r => r.hasUtilityBypassPatterns);

  // Filter results based on pattern type
  let filteredResults;
  let filteredHandlerResults = [];

  switch (patternFilter) {
    case 'vitest':
      filteredResults = results.filter(r => r.hasVitestMockingPatterns);
      console.log(`Filtering to show only vitest mocking violations (${filteredResults.length} files)`);
      break;
    case 'execsync':
      filteredResults = results.filter(r => r.hasExecSyncPatterns);
      console.log(`Filtering to show only execSync violations (${filteredResults.length} files)`);
      break;
    // TypeScript case removed - now handled by ESLint
    case 'handler':
      filteredResults = [];
      filteredHandlerResults = handlerResults.filter(r => r.hasHandlerSignatureViolations);
      console.log(`Filtering to show only handler signature violations (${filteredHandlerResults.length} files)`);
      break;
    case 'handler-testing':
      filteredResults = results.filter(r => r.hasHandlerTestingViolations);
      console.log(`Filtering to show only handler testing violations (${filteredResults.length} files)`);
      break;
    case 'server-typing':
      filteredResults = results.filter(r => r.hasImproperServerTypingViolations);
      console.log(`Filtering to show only improper server typing violations (${filteredResults.length} files)`);
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
  const execSyncOnly = results.filter(r => r.hasExecSyncPatterns && !r.hasVitestMockingPatterns && true && !r.hasHandlerTestingViolations && !r.hasImproperServerTypingViolations && !r.hasDIPatterns);
  const vitestMockingOnly = results.filter(r => r.hasVitestMockingPatterns && !r.hasExecSyncPatterns && true && !r.hasHandlerTestingViolations && !r.hasImproperServerTypingViolations && !r.hasDIPatterns);
  const typescriptOnly = results.filter(r => r.false && !r.hasExecSyncPatterns && !r.hasVitestMockingPatterns && !r.hasHandlerTestingViolations && !r.hasImproperServerTypingViolations && !r.hasDIPatterns);
  const handlerTestingOnly = results.filter(r => r.hasHandlerTestingViolations && !r.hasExecSyncPatterns && !r.hasVitestMockingPatterns && true && !r.hasImproperServerTypingViolations && !r.hasDIPatterns);
  const improperServerTypingOnly = results.filter(r => r.hasImproperServerTypingViolations && !r.hasExecSyncPatterns && !r.hasVitestMockingPatterns && !r.hasHandlerTestingViolations && !r.hasDIPatterns);
  const noPatterns = results.filter(r => !r.hasExecSyncPatterns && !r.hasVitestMockingPatterns && true && !r.hasHandlerTestingViolations && !r.hasImproperServerTypingViolations && !r.hasDIPatterns);

  console.log(`📊 CODE PATTERN VIOLATION ANALYSIS`);
  console.log(`=================================`);
  console.log(`Total files analyzed: ${results.length}`);
  console.log(`🚨 FILES WITH VIOLATIONS: ${needsConversion.length}`);
  console.log(`  └─ execSync production violations: ${execSyncOnly.length}`);
  console.log(`  └─ vitest mocking violations: ${vitestMockingOnly.length}`);
  // TypeScript anti-patterns now handled by ESLint
  console.log(`  └─ handler testing violations: ${handlerTestingOnly.length}`);
  console.log(`  └─ improper server typing violations: ${improperServerTypingOnly.length}`);
  console.log(`🚨 ARCHITECTURAL VIOLATIONS: ${utilityBypassResults.length}`);
  console.log(`✅ COMPLIANT (best practices): ${converted.length}`);
  console.log(`⚠️  MIXED VIOLATIONS: ${mixed.length}`);
  console.log(`📝 No patterns detected: ${noPatterns.length}`);
  console.log('');

  if (needsConversion.length > 0) {
    console.log(`❌ FILES THAT NEED CONVERSION (${needsConversion.length}):`);
    console.log(`=====================================`);
    needsConversion.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);

      if (result.execSyncDetails && result.execSyncDetails.length > 0) {
        console.log(`   🚨 EXECSYNC PATTERNS (${result.execSyncDetails.length}):`);
        result.execSyncDetails.slice(0, 2).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.execSyncDetails.length > 2) {
          console.log(`   ... and ${result.execSyncDetails.length - 2} more execSync patterns`);
        }
        console.log(`   🔧 FIX: Replace execSync with CommandExecutor dependency injection`);
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

      // TypeScript violations now handled by ESLint - removed from domain checks

      if (result.handlerTestingDetails && result.handlerTestingDetails.length > 0) {
        console.log(`   🚨 HANDLER TESTING VIOLATIONS (${result.handlerTestingDetails.length}):`);
        result.handlerTestingDetails.slice(0, 2).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.handlerTestingDetails.length > 2) {
          console.log(`   ... and ${result.handlerTestingDetails.length - 2} more handler testing violations`);
        }
        console.log(`   🔧 FIX: Replace handler calls with logic function calls using dependency injection`);
      }

      if (result.improperServerTypingDetails && result.improperServerTypingDetails.length > 0) {
        console.log(`   🔧 IMPROPER SERVER TYPING VIOLATIONS (${result.improperServerTypingDetails.length}):`);
        result.improperServerTypingDetails.slice(0, 2).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.improperServerTypingDetails.length > 2) {
          console.log(`   ... and ${result.improperServerTypingDetails.length - 2} more server typing violations`);
        }
        console.log(`   🔧 FIX: Import McpServer from SDK and use proper typing instead of Record<string, unknown>`);
      }

      console.log('');
    });
  }

  // Utility bypass violations reporting  
  if (utilityBypassResults.length > 0) {
    console.log(`🚨 CRITICAL: UTILITY ARCHITECTURAL VIOLATIONS (${utilityBypassResults.length}):`);
    console.log(`=======================================================`);
    console.log('⚠️  These utilities bypass CommandExecutor and break our testing architecture!');
    console.log('');
    utilityBypassResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);

      if (result.utilityBypassDetails.length > 0) {
        console.log(`   🚨 BYPASS PATTERNS (${result.utilityBypassDetails.length}):`);
        result.utilityBypassDetails.forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
      }

      console.log('   🔧 FIX: Refactor to accept CommandExecutor and use it instead of direct spawn/exec calls');
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
  const hasViolations = needsConversion.length > 0 || filteredHandlerResults.length > 0 || utilityBypassResults.length > 0;

  if (needsConversion.length > 0) {
    console.log(`🚨 CRITICAL ACTION REQUIRED (TEST FILES):`);
    console.log(`=======================================`);
    console.log(`1. IMMEDIATELY remove ALL vitest mocking from ${needsConversion.length} files`);
    console.log(`2. BANNED: vi.mock(), vi.fn(), .mockResolvedValue(), .toHaveBeenCalled(), etc.`);
    console.log(`3. BANNED: Testing handlers directly (.handler()) - test logic functions with dependency injection`);
    console.log(`4. ONLY ALLOWED: createMockExecutor() and createMockFileSystemExecutor()`);
    console.log(`4. Update plugin implementations to accept executor?: CommandExecutor parameter`);
    console.log(`5. Run this script again after each fix to track progress`);
    console.log('');

    // Show top files by total violation count
    const sortedByPatterns = needsConversion
      .sort((a, b) => {
        const totalA = (a.execSyncDetails?.length || 0) + a.vitestMockingDetails.length + (a.handlerTestingDetails?.length || 0) + (a.improperServerTypingDetails?.length || 0);
        const totalB = (b.execSyncDetails?.length || 0) + b.vitestMockingDetails.length + (b.handlerTestingDetails?.length || 0) + (b.improperServerTypingDetails?.length || 0);
        return totalB - totalA;
      })
      .slice(0, 5);

    console.log(`🚨 TOP 5 FILES WITH MOST VIOLATIONS:`);
    sortedByPatterns.forEach((result, index) => {
      const totalPatterns = (result.execSyncDetails?.length || 0) + result.vitestMockingDetails.length + (result.handlerTestingDetails?.length || 0) + (result.improperServerTypingDetails?.length || 0);
      console.log(`${index + 1}. ${result.filePath} (${totalPatterns} violations: ${result.execSyncDetails?.length || 0} execSync + ${result.vitestMockingDetails.length} vitest + ${result.handlerTestingDetails?.length || 0} handler + ${result.improperServerTypingDetails?.length || 0} server)`);
    });
    console.log('');
  }

  if (utilityBypassResults.length > 0) {
    console.log(`🚨 CRITICAL ACTION REQUIRED (UTILITY FILES):`);
    console.log(`==========================================`);
    console.log(`1. IMMEDIATELY fix ALL architectural violations in ${utilityBypassResults.length} files`);
    console.log(`2. Refactor utilities to accept CommandExecutor parameter`);
    console.log(`3. Replace direct spawn/exec calls with executor calls`);
    console.log(`4. These violations break our entire testing strategy`);
    console.log(`5. Run this script again after each fix to track progress`);
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
    console.log(`✅ All files use ONLY createMockExecutor() and createMockFileSystemExecutor()`);
    console.log(`✅ All files follow TypeScript best practices (no unsafe casts)`);
    console.log(`✅ All handler signatures comply with MCP SDK requirements`);
    console.log(`✅ All utilities properly use CommandExecutor dependency injection`);
    console.log(`✅ No violations detected!`);
  }

  // Exit with appropriate code
  process.exit(hasViolations || mixed.length > 0 ? 1 : 0);
}

main();
