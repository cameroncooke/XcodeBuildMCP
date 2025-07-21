#!/usr/bin/env node

/**
 * Audit script to find test files that incorrectly test plugin.handler
 * instead of the exported logic functions.
 * 
 * After Separation of Concerns refactoring:
 * ✅ CORRECT: Test toolLogic() with dependency injection
 * ❌ VIOLATION: Test plugin.handler() (causes real executor errors)
 */

import fs from 'fs';
import { glob } from 'glob';

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function auditTestPatterns() {
  // Find all test files
  const testFiles = await glob('src/plugins/**/*.test.ts', {
    ignore: ['**/node_modules/**']
  });

  console.log(`\n${BLUE}Auditing ${testFiles.length} test files for handler test violations...${RESET}\n`);

  let violationCount = 0;
  const violations = [];
  let correctCount = 0;

  for (const filePath of testFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = filePath.replace(/^src\/plugins\//, '');

    // Check for handler test violations
    const handlerTestMatches = content.match(/(\w+)\.handler\s*\(/g) || [];
    const handlerCalls = handlerTestMatches.filter(match => 
      !match.includes('typeof') && // Ignore "typeof plugin.handler" checks
      !match.includes('expect(') // Ignore expect statements checking handler existence
    );

    // Check for correct logic function usage
    const logicFunctionMatches = content.match(/\w+Logic\s*\(/g) || [];

    if (handlerCalls.length > 0) {
      violationCount++;
      violations.push({
        file: fileName,
        handlerCalls: handlerCalls.length,
        logicCalls: logicFunctionMatches.length,
        violations: handlerCalls
      });
    } else if (logicFunctionMatches.length > 0) {
      correctCount++;
    }
  }

  // Display results
  if (violations.length === 0) {
    console.log(`${GREEN}✓ All ${testFiles.length} test files follow correct patterns!${RESET}`);
    console.log(`${GREEN}✓ ${correctCount} files use logic function testing${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ Found ${violations.length} test files with handler violations:${RESET}\n`);
    
    violations.forEach(({ file, handlerCalls, logicCalls, violations }) => {
      console.log(`${YELLOW}${file}${RESET}`);
      console.log(`  ${RED}✗${RESET} Handler calls: ${handlerCalls}`);
      console.log(`  ${logicCalls > 0 ? GREEN + '✓' : RED + '✗'}${RESET} Logic calls: ${logicCalls}`);
      
      violations.forEach(violation => {
        console.log(`    ${RED}→${RESET} ${violation.trim()}`);
      });
      console.log();
    });
    
    console.log(`${RED}Summary:${RESET}`);
    console.log(`  ${RED}Files with violations: ${violations.length}/${testFiles.length}${RESET}`);
    console.log(`  ${GREEN}Files using correct pattern: ${correctCount}/${testFiles.length}${RESET}`);
    console.log(`  ${YELLOW}Files needing conversion: ${violations.length}${RESET}\n`);
    
    console.log(`${BLUE}Fix Pattern:${RESET}`);
    console.log(`  Replace: ${RED}await plugin.handler(args)${RESET}`);
    console.log(`  With:    ${GREEN}await toolLogic(args, mockExecutor)${RESET}\n`);
    
    process.exit(1);
  }
}

// Run the audit
auditTestPatterns().catch(console.error);