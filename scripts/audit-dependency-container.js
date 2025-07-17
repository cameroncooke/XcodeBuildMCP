#!/usr/bin/env node

/**
 * Dependency Container Conversion Audit Script
 * 
 * This script audits the conversion of plugin handlers and tests to use the dependency container pattern
 * for safe MCP SDK integration with guaranteed test mocking.
 * 
 * CONVERSION RULES:
 * ================
 * 
 * 1. PLUGIN HANDLER CONVERSION:
 *    - Handler signature MUST use: (args, commandExecutor = getDefaultCommandExecutor(), fileSystemExecutor = getDefaultFileSystemExecutor())
 *    - Import getDefaultCommandExecutor and getDefaultFileSystemExecutor from command.ts
 *    - Remove any manual defaultExecutor/defaultFileSystemExecutor imports
 *    - Use the injected executors throughout the handler
 * 
 * 2. TEST CONVERSION:
 *    - Tests MUST explicitly pass createMockExecutor() and createMockFileSystemExecutor()
 *    - NO reliance on default parameters in tests
 *    - Tests should call: handler(args, createMockExecutor(...), createMockFileSystemExecutor(...))
 *    - If test doesn't provide executors, it will throw error in test environment
 * 
 * 3. IMPORT REQUIREMENTS:
 *    - Handlers: import { getDefaultCommandExecutor, getDefaultFileSystemExecutor } from '../../utils/command.js'
 *    - Tests: import { createMockExecutor, createMockFileSystemExecutor } from '../../utils/command.js'
 * 
 * 4. MCP SDK COMPATIBILITY:
 *    - MCP SDK calls handler(args, {signal: {}, requestId: "..."})
 *    - Extra parameters are ignored, defaults used automatically
 *    - Production works seamlessly without any changes
 * 
 * 5. TEST SAFETY GUARANTEE:
 *    - Default executors throw errors in test environment
 *    - Forces explicit mocking in all tests
 *    - Prevents accidental real system calls during testing
 * 
 * ORCHESTRATION WORKFLOW:
 * ======================
 * 1. Run this script to identify files needing conversion
 * 2. Launch up to 5 parallel conversion tasks
 * 3. Each task converts ONE file (handler + test)
 * 4. Main orchestrator validates each completion
 * 5. Build and test the specific converted file
 * 6. Commit ONLY the validated file to prevent conflicts
 * 7. Start new task to replace completed one
 * 8. Continue until all conversions complete
 * 
 * DETECTION PATTERNS:
 * ==================
 * - CONVERTED HANDLER: Uses getDefaultCommandExecutor() and getDefaultFileSystemExecutor() as defaults
 * - CONVERTED TEST: Uses createMockExecutor() and createMockFileSystemExecutor() explicitly
 * - UNCONVERTED HANDLER: Uses direct defaultExecutor imports or no DI at all
 * - UNCONVERTED TEST: Relies on default parameters or doesn't provide executors
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Plugin handler conversion patterns
const CONVERTED_HANDLER_PATTERNS = [
  /getDefaultCommandExecutor\s*\(\s*\)/,                    // getDefaultCommandExecutor()
  /getDefaultFileSystemExecutor\s*\(\s*\)/,                // getDefaultFileSystemExecutor()
  /commandExecutor\s*:\s*CommandExecutor\s*=\s*getDefaultCommandExecutor\s*\(\s*\)/, // parameter with default
  /fileSystemExecutor\s*:\s*FileSystemExecutor\s*=\s*getDefaultFileSystemExecutor\s*\(\s*\)/, // parameter with default
];

const CONVERTED_HANDLER_IMPORTS = [
  /import\s*\{[^}]*getDefaultCommandExecutor[^}]*\}\s*from\s*['"][^'"]*command\.js['"]/, // Import getDefaultCommandExecutor
  /import\s*\{[^}]*getDefaultFileSystemExecutor[^}]*\}\s*from\s*['"][^'"]*command\.js['"]/, // Import getDefaultFileSystemExecutor
];

// Test conversion patterns
const CONVERTED_TEST_PATTERNS = [
  /createMockExecutor\s*\(/,                                // createMockExecutor usage
  /createMockFileSystemExecutor\s*\(/,                      // createMockFileSystemExecutor usage
  /handler\s*\([^)]*createMockExecutor\s*\(/,               // handler call with createMockExecutor
  /handler\s*\([^)]*createMockFileSystemExecutor\s*\(/,     // handler call with createMockFileSystemExecutor
];

const CONVERTED_TEST_IMPORTS = [
  /import\s*\{[^}]*createMockExecutor[^}]*\}\s*from\s*['"][^'"]*command\.js['"]/, // Import createMockExecutor
  /import\s*\{[^}]*createMockFileSystemExecutor[^}]*\}\s*from\s*['"][^'"]*command\.js['"]/, // Import createMockFileSystemExecutor
];

// Old patterns that need conversion
const OLD_HANDLER_PATTERNS = [
  /defaultExecutor\s*,/,                                    // Direct defaultExecutor import
  /defaultFileSystemExecutor\s*,/,                          // Direct defaultFileSystemExecutor import
  /executor\?\s*:\s*CommandExecutor/,                       // Optional executor parameter without default
  /commandExecutor\?\s*:\s*CommandExecutor/,                // Optional commandExecutor parameter without default
  /fileSystemExecutor\?\s*:\s*FileSystemExecutor/,          // Optional fileSystemExecutor parameter without default
  /commandExecutor\s*:\s*CommandExecutor\s*=\s*defaultExecutor/, // Old default
  /fileSystemExecutor\s*:\s*FileSystemExecutor\s*=\s*defaultFileSystemExecutor/, // Old default
];

const OLD_TEST_PATTERNS = [
  /handler\s*\([^)]*\)\s*(?![^;]*createMockExecutor)/,      // handler call without createMockExecutor
  /setTimeout\s*\(/,                                        // setTimeout-based mocking (legacy)
  /mockProcess\./,                                          // Direct process mocking (legacy)
];

function findPluginFiles(dir) {
  const results = { handlers: [], tests: [] };
  
  function traverse(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          traverse(fullPath);
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.d.ts')) {
        // Check if it's a plugin handler (not utility or index files)
        if (fullPath.includes('/plugins/') && !fullPath.includes('/utils/') && !fullPath.includes('index.ts')) {
          results.handlers.push(fullPath);
        }
      } else if (item.endsWith('.test.ts')) {
        // Plugin test files
        if (fullPath.includes('/plugins/')) {
          results.tests.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return results;
}

function analyzeHandlerFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for converted patterns
    const hasConvertedPatterns = CONVERTED_HANDLER_PATTERNS.some(pattern => pattern.test(content));
    const hasConvertedImports = CONVERTED_HANDLER_IMPORTS.some(pattern => pattern.test(content));
    
    // Check for old patterns
    const hasOldPatterns = OLD_HANDLER_PATTERNS.some(pattern => pattern.test(content));
    
    // Check if file exports a handler
    const hasHandlerExport = /export\s+default\s*\{[^}]*handler\s*[:]/s.test(content) || 
                              /async\s+handler\s*\(/s.test(content);
    
    const isConverted = hasConvertedPatterns && hasConvertedImports && !hasOldPatterns;
    const needsConversion = hasHandlerExport && (!hasConvertedPatterns || !hasConvertedImports || hasOldPatterns);
    
    // Extract details
    const details = {
      hasHandlerExport,
      hasConvertedPatterns,
      hasConvertedImports,
      hasOldPatterns,
      convertedPatternsFound: [],
      oldPatternsFound: [],
    };
    
    // Find specific patterns
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      CONVERTED_HANDLER_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          details.convertedPatternsFound.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
      
      OLD_HANDLER_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          details.oldPatternsFound.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });
    
    return {
      filePath: relativePath,
      isConverted,
      needsConversion,
      details,
      hasHandlerExport
    };
  } catch (error) {
    console.error(`Error reading handler file ${filePath}: ${error.message}`);
    return null;
  }
}

function analyzeTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for converted patterns
    const hasConvertedPatterns = CONVERTED_TEST_PATTERNS.some(pattern => pattern.test(content));
    const hasConvertedImports = CONVERTED_TEST_IMPORTS.some(pattern => pattern.test(content));
    
    // Check for old patterns
    const hasOldPatterns = OLD_TEST_PATTERNS.some(pattern => pattern.test(content));
    
    // Check if this is a plugin test (has handler tests)
    const hasHandlerTests = /handler\s*\(/g.test(content);
    
    const isConverted = hasConvertedPatterns && hasConvertedImports && !hasOldPatterns;
    const needsConversion = hasHandlerTests && (!hasConvertedPatterns || !hasConvertedImports || hasOldPatterns);
    
    // Extract details
    const details = {
      hasHandlerTests,
      hasConvertedPatterns,
      hasConvertedImports,
      hasOldPatterns,
      convertedPatternsFound: [],
      oldPatternsFound: [],
    };
    
    // Find specific patterns
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      CONVERTED_TEST_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          details.convertedPatternsFound.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
      
      OLD_TEST_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          details.oldPatternsFound.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });
    
    return {
      filePath: relativePath,
      isConverted,
      needsConversion,
      details,
      hasHandlerTests
    };
  } catch (error) {
    console.error(`Error reading test file ${filePath}: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 DEPENDENCY CONTAINER CONVERSION AUDIT');
  console.log('==========================================\n');
  
  console.log('📋 CONVERSION RULES:');
  console.log('- Handlers: Use getDefaultCommandExecutor() and getDefaultFileSystemExecutor() as defaults');
  console.log('- Tests: Explicitly pass createMockExecutor() and createMockFileSystemExecutor()');
  console.log('- MCP SDK compatibility: Extra parameters ignored, defaults used automatically');
  console.log('- Test safety: Default executors throw errors in test environment\n');
  
  const files = findPluginFiles(join(projectRoot, 'src'));
  
  console.log(`📊 ANALYSIS RESULTS:`);
  console.log(`Total plugin handlers found: ${files.handlers.length}`);
  console.log(`Total plugin tests found: ${files.tests.length}\n`);
  
  // Analyze handlers
  const handlerResults = files.handlers.map(analyzeHandlerFile).filter(Boolean);
  const convertedHandlers = handlerResults.filter(r => r.isConverted);
  const handlersNeedingConversion = handlerResults.filter(r => r.needsConversion);
  const nonPluginHandlers = handlerResults.filter(r => !r.hasHandlerExport);
  
  // Analyze tests
  const testResults = files.tests.map(analyzeTestFile).filter(Boolean);
  const convertedTests = testResults.filter(r => r.isConverted);
  const testsNeedingConversion = testResults.filter(r => r.needsConversion);
  const nonPluginTests = testResults.filter(r => !r.hasHandlerTests);
  
  console.log(`🔧 PLUGIN HANDLERS:`);
  console.log(`  ✅ Converted: ${convertedHandlers.length}`);
  console.log(`  ❌ Need conversion: ${handlersNeedingConversion.length}`);
  console.log(`  ℹ️  Non-plugin files: ${nonPluginHandlers.length}`);
  console.log('');
  
  console.log(`🧪 PLUGIN TESTS:`);
  console.log(`  ✅ Converted: ${convertedTests.length}`);
  console.log(`  ❌ Need conversion: ${testsNeedingConversion.length}`);
  console.log(`  ℹ️  Non-plugin tests: ${nonPluginTests.length}`);
  console.log('');
  
  if (handlersNeedingConversion.length > 0) {
    console.log(`❌ HANDLERS NEEDING CONVERSION (${handlersNeedingConversion.length}):`);
    console.log('================================================');
    handlersNeedingConversion.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      
      if (result.details.oldPatternsFound.length > 0) {
        console.log(`   🔴 OLD PATTERNS (${result.details.oldPatternsFound.length}):`);
        result.details.oldPatternsFound.slice(0, 3).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.details.oldPatternsFound.length > 3) {
          console.log(`   ... and ${result.details.oldPatternsFound.length - 3} more`);
        }
      }
      
      if (!result.details.hasConvertedImports) {
        console.log(`   ⚠️  Missing imports: getDefaultCommandExecutor, getDefaultFileSystemExecutor`);
      }
      
      console.log('');
    });
  }
  
  if (testsNeedingConversion.length > 0) {
    console.log(`❌ TESTS NEEDING CONVERSION (${testsNeedingConversion.length}):`);
    console.log('===========================================');
    testsNeedingConversion.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      
      if (result.details.oldPatternsFound.length > 0) {
        console.log(`   🔴 OLD PATTERNS (${result.details.oldPatternsFound.length}):`);
        result.details.oldPatternsFound.slice(0, 3).forEach(detail => {
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.details.oldPatternsFound.length > 3) {
          console.log(`   ... and ${result.details.oldPatternsFound.length - 3} more`);
        }
      }
      
      if (!result.details.hasConvertedImports) {
        console.log(`   ⚠️  Missing imports: createMockExecutor, createMockFileSystemExecutor`);
      }
      
      console.log('');
    });
  }
  
  if (convertedHandlers.length > 0) {
    console.log(`✅ CONVERTED HANDLERS (${convertedHandlers.length}):`);
    console.log('================================');
    convertedHandlers.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
    });
    console.log('');
  }
  
  if (convertedTests.length > 0) {
    console.log(`✅ CONVERTED TESTS (${convertedTests.length}):`);
    console.log('===========================');
    convertedTests.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
    });
    console.log('');
  }
  
  // Summary for orchestration
  const totalConversionsNeeded = handlersNeedingConversion.length + testsNeedingConversion.length;
  
  if (totalConversionsNeeded > 0) {
    console.log(`🎯 ORCHESTRATION SUMMARY:`);
    console.log(`========================`);
    console.log(`Total conversions needed: ${totalConversionsNeeded}`);
    console.log(`  - Handlers: ${handlersNeedingConversion.length}`);
    console.log(`  - Tests: ${testsNeedingConversion.length}`);
    console.log('');
    console.log(`📋 NEXT STEPS:`);
    console.log(`1. Launch up to 5 parallel conversion tasks`);
    console.log(`2. Each task converts one handler + its corresponding test`);
    console.log(`3. Validate with build + test for each conversion`);
    console.log(`4. Commit only validated files individually`);
    console.log(`5. Continue until all conversions complete`);
    console.log('');
    
    // Group handlers with their tests for pairing
    const conversionPairs = [];
    
    handlersNeedingConversion.forEach(handler => {
      const handlerDir = dirname(handler.filePath);
      const handlerName = handler.filePath.split('/').pop().replace('.ts', '');
      
      // Find corresponding test
      const correspondingTest = testsNeedingConversion.find(test => 
        test.filePath.includes(handlerDir) && test.filePath.includes(handlerName)
      );
      
      conversionPairs.push({
        handler: handler.filePath,
        test: correspondingTest ? correspondingTest.filePath : null,
        priority: 'high'
      });
    });
    
    console.log(`🎯 CONVERSION PAIRS FOR PARALLEL PROCESSING:`);
    console.log(`==========================================`);
    conversionPairs.slice(0, 10).forEach((pair, index) => {
      console.log(`${index + 1}. Handler: ${pair.handler}`);
      if (pair.test) {
        console.log(`   Test: ${pair.test}`);
      } else {
        console.log(`   Test: (no corresponding test found)`);
      }
      console.log('');
    });
    
    if (conversionPairs.length > 10) {
      console.log(`... and ${conversionPairs.length - 10} more pairs`);
    }
  } else {
    console.log(`🎉 ALL CONVERSIONS COMPLETE!`);
    console.log(`============================`);
    console.log(`All plugin handlers and tests are using the dependency container pattern.`);
    console.log(`MCP SDK compatibility: ✅`);
    console.log(`Test safety guarantees: ✅`);
    console.log(`Dependency injection: ✅`);
  }
  
  // Exit with appropriate code
  process.exit(totalConversionsNeeded > 0 ? 1 : 0);
}

main();