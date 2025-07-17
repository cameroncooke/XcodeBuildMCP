#!/usr/bin/env node

/**
 * Test Coverage Audit Script for Executor Patterns
 * 
 * This script audits test coverage patterns across all plugin handlers to ensure proper
 * testing of command execution, success paths, and validation logic.
 * 
 * TESTING PATTERNS EXPECTED:
 * =========================
 * 
 * 1. COMMAND GENERATION TESTS:
 *    - Spy on executor to verify correct CLI commands are generated
 *    - Test that all provided parameters are passed through to CLI
 *    - Pattern: expect(mockExecutor).toHaveBeenCalledWith([...expected command...])
 * 
 * 2. SUCCESS PATH TESTS:
 *    - Mock successful executor responses
 *    - Verify correct MCP content is returned on success
 *    - Pattern: createMockExecutor({success: true, output: 'expected output'})
 * 
 * 3. ERROR PATH TESTS:
 *    - Mock failed executor responses
 *    - Verify proper error handling and error responses
 *    - Pattern: createMockExecutor({success: false, error: 'error message'})
 * 
 * 4. VALIDATION TESTS:
 *    - Test parameter validation logic
 *    - Should use mock_noop_executor (executor should never be called)
 *    - Pattern: createMockNoopExecutor() that throws if called
 * 
 * COVERAGE REQUIREMENTS:
 * =====================
 * For each plugin handler that uses CommandExecutor or FileSystemExecutor:
 * - MUST have command generation tests (verify CLI commands)
 * - MUST have success path tests (verify successful execution handling)
 * - SHOULD have error path tests (verify error handling)
 * - Validation tests MUST use mock_noop_executor
 * 
 * ANALYSIS APPROACH:
 * ==================
 * 1. Find all plugin handler files that use executors
 * 2. Find their corresponding test files
 * 3. Analyze test patterns to identify coverage gaps
 * 4. Report missing test categories and anti-patterns
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Patterns for detecting executor usage in production code
const EXECUTOR_USAGE_PATTERNS = [
  /CommandExecutor/,                              // CommandExecutor type usage
  /FileSystemExecutor/,                           // FileSystemExecutor type usage
  /executeCommand\s*\(/,                          // executeCommand function calls
  /executor\s*\(/,                                // Direct executor calls
  /commandExecutor\s*\(/,                         // commandExecutor calls
  /fileSystemExecutor\./,                         // fileSystemExecutor method calls
];

// Patterns for detecting test coverage types
const TEST_COVERAGE_PATTERNS = {
  // Command generation tests (ANY method of verifying CLI commands)
  commandGeneration: [
    // Vitest spy patterns
    /expect\s*\(\s*\w*[Ee]xecutor\s*\)\s*\.toHaveBeenCalledWith/,  // expect(executor).toHaveBeenCalledWith
    /expect\s*\(\s*\w*[Ee]xecutor\s*\)\s*\.toHaveBeenCalled/,      // expect(executor).toHaveBeenCalled
    /toHaveBeenCalledWith\s*\(\s*\[/,                               // toHaveBeenCalledWith([...])
    
    // Manual call tracking patterns
    /callHistory.*push/,                                            // callHistory.push tracking
    /calls.*push/,                                                  // calls.push tracking
    /commandCalls.*push/,                                           // commandCalls.push tracking
    /executorCalls.*push/,                                          // executorCalls.push tracking
    
    // Wrapped executor patterns
    /wrappedExecutor.*=.*async/,                                    // wrappedExecutor = async
    /const.*Executor.*=.*\(.*command/,                              // const mockExecutor = (command
    
    // Command array validation patterns
    /expect\s*\(.*command.*\).*toEqual.*\[/,                        // expect(command).toEqual([...])
    /expect\s*\(.*callHistory.*\).*toEqual/,                        // expect(callHistory).toEqual
    /expect\s*\(.*calls.*\).*toEqual/,                              // expect(calls).toEqual
    
    // Command string validation patterns
    /expect\s*\(.*command.*\).*toBe.*['"`]/,                        // expect(command).toBe('...')
    /expect\s*\(.*args.*\).*toContain/,                             // expect(args).toContain
    /expect\s*\(.*command.*\).*toContain/,                          // expect(command).toContain
    
    // CLI command checking patterns
    /xcrun.*simctl/,                                                // xcrun simctl commands
    /xcodebuild.*-/,                                                // xcodebuild commands
    /devicectl.*list/,                                              // devicectl commands
    /swift.*build/,                                                 // swift build commands
    
    // Command verification in test descriptions
    /should.*generate.*command/i,                                   // "should generate correct command"
    /should.*call.*with.*command/i,                                 // "should call with correct command"
    /should.*execute.*command/i,                                    // "should execute command"
  ],
  
  // Success path tests (ASSERTION-LEVEL detection of actual success testing)
  successPath: [
    // Success assertions WITHOUT isError (this is the key distinction)
    /expect\s*\(.*result.*\).*toEqual.*content.*(?!.*isError)/s,   // expect(result).toEqual({content: ...}) WITHOUT isError
    /expect\s*\(.*result.*\).*toEqual.*type.*text.*(?!.*isError)/s, // expect(result).toEqual({type: 'text'}) WITHOUT isError
    
    // Success content validation (testing actual response content)
    /expect\s*\(.*result.*content.*\[0\].*text.*\).*toBe/,         // expect(result.content[0].text).toBe(...)
    /expect\s*\(.*result.*content.*\[0\].*text.*\).*toContain/,    // expect(result.content[0].text).toContain(...)
    /expect\s*\(.*result.*content.*\[0\].*text.*\).*toMatch/,      // expect(result.content[0].text).toMatch(...)
    
    // Successful test descriptions (only if paired with success assertions)
    /should.*handle.*success/i,                                    // "should handle successful..."
    /should.*return.*success/i,                                    // "should return successful..."
    /should.*succeed/i,                                            // "should succeed"
    /should.*work/i,                                               // "should work"
    /success.*case/i,                                              // "success case"
    /happy.*path/i,                                                // "happy path"
    
    // Complex success content patterns
    /Available.*Simulators/,                                       // Testing actual simulator listing content
    /BUILD.*SUCCEEDED/,                                            // Testing build success content
    /completed.*successfully/i,                                    // Testing completion messages
    /App.*launched.*successfully/i,                                // Testing app launch success
  ],
  
  // Error path tests (ANY method of testing error scenarios)
  errorPath: [
    // Mock executor with failure patterns
    /createMockExecutor\s*\(\s*\{\s*success\s*:\s*false/,          // createMockExecutor({success: false})
    /success\s*:\s*false.*error\s*:/,                              // success: false, error: ...
    /error\s*:\s*.*success\s*:\s*false/,                           // error: ..., success: false
    
    // Error throwing patterns
    /createMockExecutor\s*\(\s*new\s*Error/,                       // createMockExecutor(new Error(...))
    /createMockExecutor\s*\(\s*['"`]/,                             // createMockExecutor('error string')
    /async.*=>\s*\{\s*throw/,                                      // async () => { throw ... }
    
    // Error response validation patterns
    /expect\s*\(.*result.*\).*toEqual.*isError.*true/,             // expect(result).toEqual({...isError: true})
    /expect\s*\(.*result\.isError.*\).*toBe.*true/,                // expect(result.isError).toBe(true)
    /expect\s*\(.*error/,                                          // expect(...error...)
    
    // Error test descriptions
    /should.*handle.*fail/i,                                       // "should handle failure"
    /should.*handle.*error/i,                                      // "should handle error"
    /should.*fail/i,                                               // "should fail"
    /error.*case/i,                                                // "error case"
    /failure.*case/i,                                              // "failure case"
    /should.*throw/i,                                              // "should throw"
    /command.*fail/i,                                              // "command failure"
  ],
  
  // Validation tests (parameter validation)
  validation: [
    /should.*error.*missing/i,                                     // "should return error for missing..."
    /should.*error.*invalid/i,                                     // "should return error for invalid..."
    /Required parameter.*missing/,                                 // "Required parameter 'x' is missing"
    /validateRequiredParam/,                                       // validateRequiredParam usage
  ],
  
  // Anti-patterns (validation tests using real executors)
  antiPatterns: [
    /should.*error.*missing.*createMockExecutor\s*\(\s*\{/,        // Validation test using createMockExecutor
  ],
};

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
        // Plugin handler files (not utility or index files)
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

function analyzeProductionFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check if file uses executors
    const usesExecutors = EXECUTOR_USAGE_PATTERNS.some(pattern => pattern.test(content));
    
    if (!usesExecutors) {
      return null; // Skip files that don't use executors
    }
    
    // Check which specific executors are used
    const executorTypes = {
      usesCommandExecutor: /CommandExecutor/.test(content),
      usesFileSystemExecutor: /FileSystemExecutor/.test(content),
      hasExecuteCommand: /executeCommand\s*\(/.test(content),
      hasDirectExecutorCalls: /executor\s*\(/.test(content),
    };
    
    // Check if it's a plugin handler
    const hasHandlerExport = /export\s+default\s*\{[^}]*handler\s*[:]/s.test(content) || 
                              /async\s+handler\s*\(/s.test(content);
    
    if (!hasHandlerExport) {
      return null; // Skip non-handler files
    }
    
    // Extract handler signature to understand parameters
    const handlerMatch = content.match(/async\s+handler\s*\([^)]*\)/s);
    const handlerSignature = handlerMatch ? handlerMatch[0] : null;
    
    return {
      filePath: relativePath,
      handlerSignature,
      executorTypes,
      usesExecutors: true,
      hasHandlerExport: true,
    };
  } catch (error) {
    console.error(`Error reading production file ${filePath}: ${error.message}`);
    return null;
  }
}

function analyzeTestFile(filePath, expectedHandlerFile) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for each test coverage pattern
    const coverage = {};
    
    Object.entries(TEST_COVERAGE_PATTERNS).forEach(([category, patterns]) => {
      coverage[category] = {
        hasPattern: patterns.some(pattern => pattern.test(content)),
        matches: [],
      };
      
      // Find specific matches for detailed analysis
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          if (pattern.test(line)) {
            coverage[category].matches.push({
              line: index + 1,
              content: line.trim(),
              pattern: pattern.source,
            });
          }
        });
      });
    });
    
    // Check if test imports createMockExecutor
    const hasCreateMockExecutor = /createMockExecutor/.test(content);
    const hasCreateMockFileSystemExecutor = /createMockFileSystemExecutor/.test(content);
    
    // Refined analysis: distinguish validation from behavior tests
    const errorValidationPatterns = [
      /expect\s*\(.*result.*\).*toEqual.*isError.*true/,
      /expect\s*\(.*result\.isError.*\).*toBe.*true/,
      /Required parameter.*missing/,
    ];
    
    const realSuccessPatterns = [
      /expect\s*\(.*result.*\).*toEqual.*content.*(?!.*isError)/s,
      /expect\s*\(.*result.*\).*toEqual.*type.*text.*(?!.*isError)/s,
      /expect\s*\(.*result.*content.*\[0\].*text.*\).*toBe/,
      /Available.*Simulators/,
      /BUILD.*SUCCEEDED/,
      /completed.*successfully/i,
    ];
    
    // Count actual success tests (not validation tests with success mocks)
    let realSuccessCount = 0;
    let validationErrorCount = 0;
    
    // Handle multiline assertions properly
    const lines = content.split('\n');
    
    // For multiline patterns, test against full content
    // Use a single comprehensive pattern to avoid double counting
    const multilineSuccessPattern = /expect\s*\(.*result.*\).*toEqual\s*\(\s*\{[\s\S]*?\}\s*\)/g;
    
    // Test multiline patterns against full content
    const successAssertions = Array.from(content.matchAll(multilineSuccessPattern));
    
    // Count only those that don't have isError: true
    successAssertions.forEach(assertion => {
      if (!/isError:\s*true/.test(assertion[0])) {
        realSuccessCount++;
      }
    });
    
    // Test single-line patterns line by line
    const singleLineSuccessPatterns = [
      /expect\s*\(.*result.*content.*\[0\].*text.*\).*toBe/,
      /Available.*Simulators/,
      /BUILD.*SUCCEEDED/,
      /completed.*successfully/i,
    ];
    
    lines.forEach(line => {
      if (singleLineSuccessPatterns.some(pattern => pattern.test(line))) {
        realSuccessCount++;
      }
      if (errorValidationPatterns.some(pattern => pattern.test(line))) {
        validationErrorCount++;
      }
    });
    
    // Count different test types
    const testCounts = {
      totalTests: (content.match(/it\s*\('/g) || []).length,
      validationTests: validationErrorCount, // Use actual validation error patterns
      commandTests: coverage.commandGeneration.matches.length,
      successTests: realSuccessCount, // Use refined success pattern count
      errorTests: coverage.errorPath.matches.length,
    };
    
    return {
      filePath: relativePath,
      expectedHandlerFile,
      coverage,
      testCounts,
      hasCreateMockExecutor,
      hasCreateMockFileSystemExecutor,
      antiPatterns: coverage.antiPatterns.matches,
    };
  } catch (error) {
    console.error(`Error reading test file ${filePath}: ${error.message}`);
    return null;
  }
}

function findCorrespondingTestFile(handlerPath, testFiles) {
  const handlerDir = dirname(handlerPath);
  const handlerName = basename(handlerPath, '.ts');
  
  // Look for test file in same directory
  const expectedTestPath = join(handlerDir, '__tests__', `${handlerName}.test.ts`);
  const normalizedExpected = relative(projectRoot, expectedTestPath);
  
  return testFiles.find(testPath => {
    const normalizedTest = relative(projectRoot, testPath);
    return normalizedTest === normalizedExpected;
  });
}

function assessCoverageGaps(handlerAnalysis, testAnalysis) {
  const gaps = [];
  
  if (!testAnalysis) {
    gaps.push('MISSING_TEST_FILE');
    return gaps;
  }
  
  // Check for missing command generation tests
  if (handlerAnalysis.executorTypes.usesCommandExecutor && !testAnalysis.coverage.commandGeneration.hasPattern) {
    gaps.push('MISSING_COMMAND_GENERATION_TESTS');
  }
  
  // Check for missing success path tests (using refined count)
  if (testAnalysis.testCounts.successTests === 0 && testAnalysis.testCounts.totalTests > testAnalysis.testCounts.validationTests) {
    gaps.push('MISSING_SUCCESS_PATH_TESTS');
  }
  
  // Check for anti-patterns (validation tests using real executors)
  if (testAnalysis.antiPatterns.length > 0) {
    gaps.push('VALIDATION_TESTS_USING_REAL_EXECUTORS');
  }
  
  // Check if validation tests exist but no behavior tests (suggests missing coverage)
  if (testAnalysis.testCounts.validationTests > 0 && testAnalysis.testCounts.successTests === 0) {
    gaps.push('VALIDATION_ONLY_NO_BEHAVIOR_TESTS');
  }
  
  return gaps;
}

function main() {
  console.log('🔍 TEST COVERAGE AUDIT FOR EXECUTOR PATTERNS');
  console.log('============================================\n');
  
  console.log('📋 EXPECTED COVERAGE PATTERNS:');
  console.log('- Command Generation: Spy on executor to verify CLI commands');
  console.log('- Success Path: Mock successful responses, verify MCP content');
  console.log('- Error Path: Mock failed responses, verify error handling');
  console.log('- Validation: Use mock_noop_executor for parameter validation\n');
  
  const files = findPluginFiles(join(projectRoot, 'src'));
  
  console.log(`📊 ANALYSIS SCOPE:`);
  console.log(`Plugin handlers found: ${files.handlers.length}`);
  console.log(`Plugin tests found: ${files.tests.length}\n`);
  
  // Analyze production files
  const handlerAnalyses = files.handlers
    .map(analyzeProductionFile)
    .filter(Boolean);
  
  console.log(`🔧 HANDLERS USING EXECUTORS: ${handlerAnalyses.length}\n`);
  
  // Analyze test coverage
  const coverageAnalyses = [];
  let totalGaps = 0;
  
  handlerAnalyses.forEach(handlerAnalysis => {
    const testFile = findCorrespondingTestFile(handlerAnalysis.filePath, files.tests);
    const testAnalysis = testFile ? analyzeTestFile(testFile, handlerAnalysis.filePath) : null;
    const gaps = assessCoverageGaps(handlerAnalysis, testAnalysis);
    
    coverageAnalyses.push({
      handler: handlerAnalysis,
      test: testAnalysis,
      gaps,
    });
    
    totalGaps += gaps.length;
  });
  
  // Report summary
  const withTests = coverageAnalyses.filter(c => c.test).length;
  const withoutTests = coverageAnalyses.filter(c => !c.test).length;
  const withCommandTests = coverageAnalyses.filter(c => c.test?.coverage.commandGeneration.hasPattern).length;
  const withSuccessTests = coverageAnalyses.filter(c => c.test?.testCounts.successTests > 0).length;
  const withAntiPatterns = coverageAnalyses.filter(c => c.test?.antiPatterns.length > 0).length;
  
  console.log(`📈 COVERAGE SUMMARY:`);
  console.log(`================`);
  console.log(`Handlers with tests: ${withTests}/${handlerAnalyses.length}`);
  console.log(`Handlers missing tests: ${withoutTests}`);
  console.log(`Tests with command generation: ${withCommandTests}/${withTests}`);
  console.log(`Tests with success paths: ${withSuccessTests}/${withTests}`);
  console.log(`Tests with anti-patterns: ${withAntiPatterns}`);
  console.log(`Total coverage gaps: ${totalGaps}\n`);
  
  // Report detailed gaps
  const gapsPerType = {};
  coverageAnalyses.forEach(analysis => {
    analysis.gaps.forEach(gap => {
      if (!gapsPerType[gap]) gapsPerType[gap] = [];
      gapsPerType[gap].push(analysis.handler.filePath);
    });
  });
  
  Object.entries(gapsPerType).forEach(([gapType, files]) => {
    console.log(`❌ ${gapType} (${files.length} files):`);
    console.log(`${'='.repeat(gapType.length + 15)}`);
    files.slice(0, 10).forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    if (files.length > 10) {
      console.log(`... and ${files.length - 10} more`);
    }
    console.log('');
  });
  
  // Report top files with most gaps
  const filesByGaps = coverageAnalyses
    .filter(c => c.gaps.length > 0)
    .sort((a, b) => b.gaps.length - a.gaps.length)
    .slice(0, 10);
  
  if (filesByGaps.length > 0) {
    console.log(`🚨 TOP FILES WITH MOST COVERAGE GAPS:`);
    console.log(`===================================`);
    filesByGaps.forEach((analysis, index) => {
      console.log(`${index + 1}. ${analysis.handler.filePath} (${analysis.gaps.length} gaps)`);
      console.log(`   Gaps: ${analysis.gaps.join(', ')}`);
      if (analysis.test) {
        console.log(`   Tests: ${analysis.test.testCounts.totalTests} total, ${analysis.test.testCounts.commandTests} command, ${analysis.test.testCounts.successTests} success`);
      } else {
        console.log(`   Tests: MISSING TEST FILE`);
      }
      console.log('');
    });
  }
  
  // Recommendations
  console.log(`💡 RECOMMENDATIONS:`);
  console.log(`==================`);
  console.log(`1. Create mock_noop_executor pattern for validation tests`);
  console.log(`2. Add command generation tests for ${handlerAnalyses.length - withCommandTests} handlers`);
  console.log(`3. Add success path tests for ${handlerAnalyses.length - withSuccessTests} handlers`);
  console.log(`4. Fix ${withAntiPatterns} files using anti-patterns`);
  console.log(`5. Create ${withoutTests} missing test files`);
  
  // Exit with appropriate code
  process.exit(totalGaps > 0 ? 1 : 0);
}

main();