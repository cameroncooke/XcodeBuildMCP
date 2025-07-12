#!/usr/bin/env node

/**
 * XcodeBuildMCP Test Architecture Audit Script
 * 
 * This script audits all test files to identify violations of the integration testing architecture
 * as defined in TESTING.md and CLAUDE.md.
 * 
 * Violations include:
 * - Mocking internal utilities (executeCommand, validateRequiredParam, etc.)
 * - Not following the prescribed integration testing approach
 * - Missing child_process mocking where external commands are used
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Patterns to identify violations
const VIOLATION_PATTERNS = {
  // Internal utility mocking (major violation)
  internalUtilMocking: /vi\.mock\(['"`][^'"`]*utils[^'"`]*['"`]/g,
  
  // Specific utility function mocking
  executeCommandMock: /executeCommand.*vi\.fn\(\)/g,
  validateParamMock: /validateRequiredParam.*vi\.fn\(\)/g,
  createResponseMock: /(createTextResponse|createErrorResponse).*vi\.fn\(\)/g,
  
  // Correct patterns (child_process mocking)
  childProcessMock: /vi\.mock\(['"`]child_process['"`]/g,
  
  // Import patterns that suggest violations
  utilityImports: /import.*{[^}]*(executeCommand|validateRequiredParam|createTextResponse|createErrorResponse)[^}]*}.*from.*utils/g,
};

// Internal utilities that should NOT be mocked
const FORBIDDEN_MOCKS = [
  'executeCommand',
  'executeXcodeBuildCommand', 
  'validateRequiredParam',
  'createTextResponse',
  'createErrorResponse',
  'createAxeNotAvailableResponse',
  'getAxePath',
  'getBundledAxeEnvironment',
  'log',
  'DependencyError',
  'AxeError',
  'SystemError',
  'ValidationError',
  'CommandError'
];

class TestAuditor {
  constructor() {
    this.results = {
      totalFiles: 0,
      violatingFiles: [],
      compliantFiles: [],
      summary: {
        majorViolations: 0,
        minorViolations: 0,
        compliant: 0,
        missingChildProcessMock: 0
      }
    };
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

  /**
   * Analyze a single test file
   */
  analyzeTestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(__dirname, filePath);
    
    const analysis = {
      path: relativePath,
      violations: [],
      severity: 'compliant',
      hasChildProcessMock: false,
      mockedUtilities: [],
      lineNumbers: {}
    };

    // Check for child_process mocking (good practice)
    if (VIOLATION_PATTERNS.childProcessMock.test(content)) {
      analysis.hasChildProcessMock = true;
    }

    // Check for internal utility mocking (violation)
    const internalMockMatches = content.match(VIOLATION_PATTERNS.internalUtilMocking);
    if (internalMockMatches) {
      analysis.violations.push({
        type: 'internal_utility_mocking',
        severity: 'major',
        description: 'Mocking internal utilities instead of external dependencies',
        matches: internalMockMatches
      });
      analysis.severity = 'major';
    }

    // Check for specific forbidden mocked functions
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      FORBIDDEN_MOCKS.forEach(utility => {
        if (line.includes(`${utility}.*vi.fn()`) || 
            (line.includes(`${utility} as MockedFunction`) && line.includes('mockReturn'))) {
          analysis.mockedUtilities.push(utility);
          analysis.lineNumbers[utility] = index + 1;
          
          if (!analysis.violations.find(v => v.type === 'forbidden_mock')) {
            analysis.violations.push({
              type: 'forbidden_mock',
              severity: 'major',
              description: 'Mocking forbidden internal utilities',
              utilities: []
            });
            analysis.severity = 'major';
          }
          
          const violation = analysis.violations.find(v => v.type === 'forbidden_mock');
          if (!violation.utilities.includes(utility)) {
            violation.utilities.push(utility);
          }
        }
      });
    });

    // Check if file needs child_process mocking but doesn't have it
    const needsExternalMocking = content.includes('spawn') || 
                                content.includes('executeCommand') ||
                                content.includes('child_process');
    
    if (needsExternalMocking && !analysis.hasChildProcessMock && analysis.violations.length === 0) {
      analysis.violations.push({
        type: 'missing_child_process_mock',
        severity: 'minor',
        description: 'May need child_process mocking for integration testing'
      });
      if (analysis.severity === 'compliant') {
        analysis.severity = 'minor';
      }
    }

    return analysis;
  }

  /**
   * Run audit on all test files
   */
  audit() {
    console.log(`${colors.bold}${colors.blue}🔍 XcodeBuildMCP Test Architecture Audit${colors.reset}\n`);
    
    const testDir = path.join(__dirname, 'src', 'plugins');
    const testFiles = this.findTestFiles(testDir);
    
    this.results.totalFiles = testFiles.length;
    
    console.log(`Found ${colors.bold}${testFiles.length}${colors.reset} test files\n`);
    
    // Analyze each file
    for (const filePath of testFiles) {
      const analysis = this.analyzeTestFile(filePath);
      
      if (analysis.violations.length > 0) {
        this.results.violatingFiles.push(analysis);
        
        if (analysis.severity === 'major') {
          this.results.summary.majorViolations++;
        } else {
          this.results.summary.minorViolations++;
        }
      } else {
        this.results.compliantFiles.push(analysis);
        this.results.summary.compliant++;
      }
    }
    
    this.generateReport();
  }

  /**
   * Generate comprehensive audit report
   */
  generateReport() {
    console.log(`${colors.bold}${colors.magenta}📊 AUDIT RESULTS${colors.reset}\n`);
    
    // Summary
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total files: ${this.results.totalFiles}`);
    console.log(`  ${colors.red}Major violations: ${this.results.summary.majorViolations}${colors.reset}`);
    console.log(`  ${colors.yellow}Minor violations: ${this.results.summary.minorViolations}${colors.reset}`);
    console.log(`  ${colors.green}Compliant: ${this.results.summary.compliant}${colors.reset}`);
    
    const violationRate = ((this.results.summary.majorViolations + this.results.summary.minorViolations) / this.results.totalFiles * 100).toFixed(1);
    console.log(`  ${colors.bold}Violation rate: ${violationRate}%${colors.reset}\n`);

    // Major violations details
    if (this.results.summary.majorViolations > 0) {
      console.log(`${colors.bold}${colors.red}🚨 MAJOR VIOLATIONS (${this.results.summary.majorViolations} files)${colors.reset}\n`);
      
      const majorViolations = this.results.violatingFiles.filter(f => f.severity === 'major');
      
      // Group by workflow
      const byWorkflow = {};
      majorViolations.forEach(file => {
        const workflow = file.path.split('/')[2] || 'unknown';
        if (!byWorkflow[workflow]) byWorkflow[workflow] = [];
        byWorkflow[workflow].push(file);
      });

      Object.entries(byWorkflow).forEach(([workflow, files]) => {
        console.log(`${colors.bold}${workflow}/ (${files.length} files):${colors.reset}`);
        files.forEach(file => {
          console.log(`  ${colors.red}✗${colors.reset} ${file.path}`);
          file.violations.forEach(violation => {
            console.log(`    - ${violation.description}`);
            if (violation.utilities) {
              console.log(`      Mocked utilities: ${violation.utilities.join(', ')}`);
            }
          });
        });
        console.log();
      });
    }

    // Examples of correct architecture
    if (this.results.summary.compliant > 0) {
      console.log(`${colors.bold}${colors.green}✅ COMPLIANT FILES (Examples)${colors.reset}\n`);
      
      const examples = this.results.compliantFiles
        .filter(f => f.hasChildProcessMock)
        .slice(0, 5);
        
      examples.forEach(file => {
        console.log(`  ${colors.green}✓${colors.reset} ${file.path}`);
      });
      
      if (examples.length > 0) {
        console.log(`\n${colors.green}These files follow the correct integration testing pattern:${colors.reset}`);
        console.log(`- Mock only child_process.spawn (external dependency)`);
        console.log(`- Allow all plugin logic and internal utilities to execute`);
        console.log(`- Test complete integration flow\n`);
      }
    }

    // Recommendations
    console.log(`${colors.bold}${colors.cyan}💡 RECOMMENDATIONS${colors.reset}\n`);
    
    if (this.results.summary.majorViolations > 0) {
      console.log(`${colors.yellow}1. Refactor Major Violations:${colors.reset}`);
      console.log(`   - Remove vi.mock('../../utils/index.js') from ${this.results.summary.majorViolations} files`);
      console.log(`   - Replace with vi.mock('child_process') for external dependency mocking`);
      console.log(`   - Allow executeCommand, validateRequiredParam, etc. to execute normally\n`);
    }
    
    console.log(`${colors.yellow}2. Follow Integration Testing Pattern:${colors.reset}`);
    console.log(`   - Test flow: Plugin → executeCommand → utilities → [MOCKED] child_process.spawn`);
    console.log(`   - Verify actual parameter validation and command generation`);
    console.log(`   - Test real integration between layers\n`);
    
    console.log(`${colors.yellow}3. Priority Order for Fixes:${colors.reset}`);
    console.log(`   - ui-testing/ (11 files) - All major violations`);
    console.log(`   - simulator-workspace/ (15+ files) - Mixed violations`);
    console.log(`   - logging/ (4 files) - All major violations`);
    console.log(`   - Other scattered violations\n`);

    // Architecture reminder
    console.log(`${colors.bold}${colors.blue}📚 ARCHITECTURE REMINDER${colors.reset}\n`);
    console.log(`According to TESTING.md, tests should:`);
    console.log(`${colors.green}✅ Mock external dependencies (child_process.spawn)${colors.reset}`);
    console.log(`${colors.green}✅ Test plugin interfaces and integration flows${colors.reset}`);
    console.log(`${colors.green}✅ Allow internal utilities to execute normally${colors.reset}`);
    console.log(`${colors.red}❌ Never mock executeCommand, validateRequiredParam, etc.${colors.reset}`);
    console.log(`${colors.red}❌ Avoid testing implementation details${colors.reset}\n`);

    // Generate fix script suggestion
    this.generateFixScript();
  }

  /**
   * Generate a script to help fix violations
   */
  generateFixScript() {
    const scriptPath = path.join(__dirname, 'fix-test-violations.sh');
    
    let script = `#!/bin/bash
# Auto-generated script to help fix test architecture violations
# Review each change before applying!

echo "🔧 XcodeBuildMCP Test Architecture Fix Script"
echo "This script will help fix the ${this.results.summary.majorViolations} major violations found."
echo ""
echo "⚠️  IMPORTANT: Review each change before applying!"
echo ""

`;

    const majorViolations = this.results.violatingFiles.filter(f => f.severity === 'major');
    
    majorViolations.forEach((file, index) => {
      script += `echo "Fixing ${index + 1}/${majorViolations.length}: ${file.path}"\n`;
      script += `# TODO: Manual fix required for ${file.path}\n`;
      script += `# 1. Remove vi.mock('../../utils/index.js')\n`;
      script += `# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))\n`;
      script += `# 3. Remove utility imports and mocks\n`;
      script += `# 4. Test integration flow instead\n\n`;
    });

    script += `echo "✅ All violations identified. Manual fixes required."\n`;
    script += `echo "See the audit report above for detailed guidance."\n`;

    fs.writeFileSync(scriptPath, script);
    console.log(`${colors.blue}📝 Generated fix helper script: ${scriptPath}${colors.reset}`);
    console.log(`   Run with: chmod +x fix-test-violations.sh && ./fix-test-violations.sh\n`);
  }
}

// Run the audit
const auditor = new TestAuditor();
auditor.audit();