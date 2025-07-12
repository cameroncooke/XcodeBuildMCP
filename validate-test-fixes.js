#!/usr/bin/env node

/**
 * XcodeBuildMCP Test Fix Validation Script
 * 
 * This script validates that test architecture fixes are correct and complete.
 * It performs comprehensive checks to ensure tests follow the integration testing pattern.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class TestFixValidator {
  constructor() {
    this.results = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: [],
      warnings: [],
      errors: []
    };
  }

  /**
   * Validate all test fixes
   */
  async validate() {
    console.log(`${colors.bold}${colors.blue}🔍 XcodeBuildMCP Test Fix Validation${colors.reset}\n`);
    
    // Step 1: Run architecture audit
    console.log(`${colors.cyan}📊 Step 1: Architecture Audit${colors.reset}`);
    await this.runArchitectureAudit();
    
    // Step 2: Validate individual test files
    console.log(`\n${colors.cyan}🧪 Step 2: Individual Test Validation${colors.reset}`);
    await this.validateTestFiles();
    
    // Step 3: Run test suite
    console.log(`\n${colors.cyan}⚗️  Step 3: Test Suite Execution${colors.reset}`);
    await this.runTestSuite();
    
    // Step 4: Integration testing pattern check
    console.log(`\n${colors.cyan}🔧 Step 4: Integration Pattern Verification${colors.reset}`);
    await this.verifyIntegrationPatterns();
    
    // Generate final report
    this.generateFinalReport();
  }

  /**
   * Run the architecture audit script
   */
  async runArchitectureAudit() {
    try {
      const output = execSync('node audit-tests.js', {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse audit results
      const lines = output.split('\n');
      const summaryStart = lines.findIndex(line => line.includes('Summary:'));
      
      if (summaryStart !== -1) {
        console.log(`${colors.green}✅ Audit completed successfully${colors.reset}`);
        
        // Extract violation counts
        for (let i = summaryStart; i < summaryStart + 6 && i < lines.length; i++) {
          const line = lines[i].replace(/\x1b\[[0-9;]*m/g, ''); // Strip colors
          console.log(`  ${line}`);
          
          if (line.includes('Major violations:')) {
            const violations = parseInt(line.match(/(\d+)/)?.[1] || '0');
            if (violations > 0) {
              this.results.errors.push(`${violations} major violations still exist`);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`${colors.red}❌ Architecture audit failed${colors.reset}`);
      this.results.errors.push(`Architecture audit failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate individual test files
   */
  async validateTestFiles() {
    const testFiles = this.findTestFiles(path.join(__dirname, 'src', 'plugins'));
    this.results.totalFiles = testFiles.length;
    
    console.log(`Found ${testFiles.length} test files to validate\n`);
    
    for (const filePath of testFiles) {
      const validation = this.validateTestFile(filePath);
      
      if (validation.isValid) {
        this.results.validFiles++;
        console.log(`${colors.green}✅${colors.reset} ${validation.relativePath}`);
      } else {
        this.results.invalidFiles.push(validation);
        console.log(`${colors.red}❌${colors.reset} ${validation.relativePath}`);
        validation.issues.forEach(issue => {
          console.log(`   ${colors.yellow}⚠️${colors.reset}  ${issue}`);
        });
      }
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.log(`   ${colors.blue}ℹ️${colors.reset}  ${warning}`);
        });
      }
    }
  }

  /**
   * Validate a single test file
   */
  validateTestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(__dirname, filePath);
    
    const validation = {
      path: filePath,
      relativePath,
      isValid: true,
      issues: [],
      warnings: []
    };

    // Check 1: Should not mock internal utilities
    const internalMockPattern = /vi\.mock\(['"`][^'"`]*utils[^'"`]*['"`]/;
    if (internalMockPattern.test(content)) {
      validation.isValid = false;
      validation.issues.push('Still mocking internal utilities (utils/)');
    }

    // Check 2: Should mock child_process for external commands
    const needsChildProcessMock = content.includes('executeCommand') || 
                                 content.includes('spawn') ||
                                 content.includes('external command');
    
    if (needsChildProcessMock && !content.includes("vi.mock('child_process'")) {
      validation.isValid = false;
      validation.issues.push('Missing child_process mock for external commands');
    }

    // Check 3: Should not import mocked utilities from utils
    const forbiddenImports = [
      'executeCommand',
      'validateRequiredParam', 
      'createTextResponse',
      'createErrorResponse'
    ];
    
    const utilityImportPattern = /import.*{([^}]*)}.*from.*utils/;
    const importMatch = content.match(utilityImportPattern);
    
    if (importMatch) {
      const importedUtilities = importMatch[1].split(',').map(s => s.trim());
      const forbiddenFound = importedUtilities.filter(util => 
        forbiddenImports.some(forbidden => util.includes(forbidden))
      );
      
      if (forbiddenFound.length > 0) {
        validation.isValid = false;
        validation.issues.push(`Importing forbidden utilities: ${forbiddenFound.join(', ')}`);
      }
    }

    // Check 4: Should have proper mock setup
    if (content.includes("vi.mock('child_process'")) {
      if (!content.includes('MockChildProcess') && !content.includes('mockProcess')) {
        validation.warnings.push('Missing MockChildProcess setup');
      }
      
      if (!content.includes('beforeEach')) {
        validation.warnings.push('Missing beforeEach mock setup');
      }
    }

    // Check 5: Test structure validation
    if (!content.includes('describe(')) {
      validation.isValid = false;
      validation.issues.push('Missing test suite structure (describe blocks)');
    }

    // Check 6: Export validation
    if (!content.includes('Export Field Validation')) {
      validation.warnings.push('Missing export field validation tests');
    }

    return validation;
  }

  /**
   * Run the test suite to verify functionality
   */
  async runTestSuite() {
    try {
      console.log(`${colors.yellow}Running full test suite (this may take a moment)...${colors.reset}`);
      
      const output = execSync('npm test', {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 180000, // 3 minute timeout
        stdio: 'pipe'
      });
      
      console.log(`${colors.green}✅ Test suite passed${colors.reset}`);
      
      // Parse test results for additional insights
      const lines = output.split('\n');
      const testSummary = lines.find(line => line.includes('test') && line.includes('pass'));
      if (testSummary) {
        console.log(`  ${testSummary.trim()}`);
      }
      
      return true;
    } catch (error) {
      console.error(`${colors.red}❌ Test suite failed${colors.reset}`);
      this.results.errors.push('Test suite execution failed');
      
      // Parse error output for specific failures
      const errorOutput = error.stdout || error.stderr || error.message;
      const lines = errorOutput.split('\n');
      
      // Look for specific test failures
      const failureLines = lines.filter(line => 
        line.includes('FAILED') || 
        line.includes('Error:') ||
        line.includes('TypeError:')
      ).slice(0, 5); // Limit to first 5 failures
      
      if (failureLines.length > 0) {
        console.log(`${colors.red}Key failures:${colors.reset}`);
        failureLines.forEach(line => {
          console.log(`  ${line.trim()}`);
        });
      }
      
      return false;
    }
  }

  /**
   * Verify integration testing patterns are correctly implemented
   */
  async verifyIntegrationPatterns() {
    const exampleFiles = [
      'src/plugins/device-project/__tests__/build_dev_proj.test.ts',
      'src/plugins/swift-package/__tests__/swift_package_build.test.ts'
    ];
    
    console.log('Comparing against known good integration testing patterns...\n');
    
    for (const examplePath of exampleFiles) {
      const fullPath = path.join(__dirname, examplePath);
      if (fs.existsSync(fullPath)) {
        console.log(`${colors.green}✅${colors.reset} Reference pattern: ${examplePath}`);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Analyze the pattern
        const hasChildProcessMock = content.includes("vi.mock('child_process'");
        const hasMockChildProcess = content.includes('MockChildProcess');
        const hasBeforeEach = content.includes('beforeEach');
        const noUtilityMocks = !content.includes("vi.mock('../../utils");
        
        console.log(`  - Child process mock: ${hasChildProcessMock ? '✅' : '❌'}`);
        console.log(`  - MockChildProcess class: ${hasMockChildProcess ? '✅' : '❌'}`);
        console.log(`  - beforeEach setup: ${hasBeforeEach ? '✅' : '❌'}`);
        console.log(`  - No utility mocks: ${noUtilityMocks ? '✅' : '❌'}`);
        console.log();
      } else {
        console.log(`${colors.yellow}⚠️${colors.reset}  Reference file not found: ${examplePath}`);
      }
    }
  }

  /**
   * Generate final validation report
   */
  generateFinalReport() {
    console.log(`\n${colors.bold}${colors.magenta}📋 VALIDATION REPORT${colors.reset}\n`);
    
    // Overall status
    const overallValid = this.results.errors.length === 0 && this.results.invalidFiles.length === 0;
    const status = overallValid ? 
      `${colors.green}✅ PASSED${colors.reset}` : 
      `${colors.red}❌ FAILED${colors.reset}`;
    
    console.log(`${colors.bold}Overall Status: ${status}${colors.reset}\n`);
    
    // File statistics
    console.log(`${colors.bold}File Validation:${colors.reset}`);
    console.log(`  Total files: ${this.results.totalFiles}`);
    console.log(`  Valid files: ${this.results.validFiles}`);
    console.log(`  Invalid files: ${this.results.invalidFiles.length}`);
    
    const validPercentage = ((this.results.validFiles / this.results.totalFiles) * 100).toFixed(1);
    console.log(`  Validation rate: ${validPercentage}%\n`);
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log(`${colors.red}❌ Critical Issues:${colors.reset}`);
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
      console.log();
    }
    
    // Invalid files details
    if (this.results.invalidFiles.length > 0) {
      console.log(`${colors.yellow}⚠️  Files Needing Attention:${colors.reset}`);
      this.results.invalidFiles.forEach(file => {
        console.log(`  ${file.relativePath}:`);
        file.issues.forEach(issue => {
          console.log(`    - ${issue}`);
        });
      });
      console.log();
    }
    
    // Recommendations
    console.log(`${colors.bold}${colors.cyan}💡 RECOMMENDATIONS${colors.reset}\n`);
    
    if (this.results.invalidFiles.length > 0) {
      console.log(`${colors.yellow}1. Fix Remaining Issues:${colors.reset}`);
      console.log(`   - ${this.results.invalidFiles.length} files still need manual fixes`);
      console.log(`   - Focus on removing utility mocks and adding child_process mocks\n`);
    }
    
    if (this.results.errors.some(e => e.includes('Test suite'))) {
      console.log(`${colors.yellow}2. Test Suite Issues:${colors.reset}`);
      console.log(`   - Some tests may need manual adjustment after mock changes`);
      console.log(`   - Review test logic to ensure integration testing approach\n`);
    }
    
    console.log(`${colors.yellow}3. Next Steps:${colors.reset}`);
    if (overallValid) {
      console.log(`   - All validations passed! 🎉`);
      console.log(`   - Consider running performance benchmarks`);
      console.log(`   - Review test coverage reports`);
    } else {
      console.log(`   - Address remaining validation issues`);
      console.log(`   - Re-run validation after fixes: node validate-test-fixes.js`);
      console.log(`   - Consider manual review for complex cases`);
    }
    
    console.log(`\n${colors.blue}📚 For reference, see TESTING.md integration testing guidelines${colors.reset}`);
  }

  /**
   * Find all test files recursively
   */
  findTestFiles(dir) {
    const testFiles = [];
    
    function walk(currentDir) {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
          testFiles.push(fullPath);
        }
      }
    }
    
    walk(dir);
    return testFiles;
  }
}

// Run the validator
const validator = new TestFixValidator();
validator.validate().catch(error => {
  console.error(`${colors.red}❌ Validation failed: ${error.message}${colors.reset}`);
  process.exit(1);
});