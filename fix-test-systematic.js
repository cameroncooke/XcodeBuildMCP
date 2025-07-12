#!/usr/bin/env node

/**
 * XcodeBuildMCP Systematic Test Architecture Fix Script
 * 
 * This script provides a systematic approach to fixing test architecture violations
 * by automatically refactoring tests to follow the integration testing pattern.
 * 
 * Usage: node fix-test-systematic.js [batch] [--dry-run] [--verify]
 * 
 * Batches:
 * - ui-testing: Fix all UI testing violations (11 files)
 * - logging: Fix all logging violations (4 files)  
 * - simulator-workspace: Fix simulator workspace violations (13 files)
 * - remaining: Fix all other scattered violations
 * - all: Fix all violations in order
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

// Violation patterns to fix
const PATTERNS_TO_REMOVE = [
  // Main utility mocking pattern
  /vi\.mock\(['"`][^'"`]*utils[^'"`]*['"`],\s*\(\)\s*=>\s*\({[\s\S]*?}\)\);?\s*/g,
  
  // Import statements for mocked utilities
  /import\s*{\s*[^}]*(?:validateRequiredParam|executeCommand|createTextResponse|createErrorResponse|createAxeNotAvailableResponse|getAxePath|getBundledAxeEnvironment|log|DependencyError|AxeError|SystemError)[^}]*}\s*from\s*['"`][^'"`]*utils[^'"`]*['"`];?\s*/g,
];

// Pattern to add (child_process mock)
const CHILD_PROCESS_MOCK = `// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}`;

// Import for EventEmitter if not present
const EVENT_EMITTER_IMPORT = `import { EventEmitter } from 'events';`;

// Batches of files to fix
const VIOLATION_BATCHES = {
  'ui-testing': [
    'src/plugins/ui-testing/__tests__/button.test.ts',
    'src/plugins/ui-testing/__tests__/describe_ui.test.ts', 
    'src/plugins/ui-testing/__tests__/gesture.test.ts',
    'src/plugins/ui-testing/__tests__/key_press.test.ts',
    'src/plugins/ui-testing/__tests__/key_sequence.test.ts',
    'src/plugins/ui-testing/__tests__/long_press.test.ts',
    'src/plugins/ui-testing/__tests__/screenshot.test.ts',
    'src/plugins/ui-testing/__tests__/swipe.test.ts',
    'src/plugins/ui-testing/__tests__/tap.test.ts',
    'src/plugins/ui-testing/__tests__/touch.test.ts',
    'src/plugins/ui-testing/__tests__/type_text.test.ts'
  ],
  'logging': [
    'src/plugins/logging/__tests__/start_device_log_cap.test.ts',
    'src/plugins/logging/__tests__/start_sim_log_cap.test.ts',
    'src/plugins/logging/__tests__/stop_device_log_cap.test.ts',
    'src/plugins/logging/__tests__/stop_sim_log_cap.test.ts'
  ],
  'simulator-workspace': [
    'src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts',
    'src/plugins/simulator-workspace/__tests__/build_sim_id_ws.test.ts',
    'src/plugins/simulator-workspace/__tests__/build_sim_name_ws.test.ts',
    'src/plugins/simulator-workspace/__tests__/describe_ui.test.ts',
    'src/plugins/simulator-workspace/__tests__/get_sim_app_path_id_ws.test.ts',
    'src/plugins/simulator-workspace/launch_app_logs_sim.test.ts',
    'src/plugins/simulator-workspace/launch_app_sim.test.ts',
    'src/plugins/simulator-workspace/reset_simulator_location.test.ts',
    'src/plugins/simulator-workspace/set_network_condition.test.ts',
    'src/plugins/simulator-workspace/set_sim_appearance.test.ts',
    'src/plugins/simulator-workspace/set_simulator_location.test.ts',
    'src/plugins/simulator-workspace/test_sim_id_ws.test.ts',
    'src/plugins/simulator-workspace/test_sim_name_ws.test.ts'
  ],
  'remaining': [
    'src/plugins/device-workspace/__tests__/get_device_app_path_ws.test.ts',
    'src/plugins/diagnostics/__tests__/diagnostic.test.ts',
    'src/plugins/discovery/__tests__/discover_tools.test.ts',
    'src/plugins/macos-shared/__tests__/stop_mac_app.test.ts',
    'src/plugins/macos-workspace/__tests__/stop_mac_app.test.ts',
    'src/plugins/simulator-project/test_sim_id_proj.test.ts',
    'src/plugins/simulator-project/test_sim_name_proj.test.ts',
    'src/plugins/simulator-shared/__tests__/launch_app_logs_sim.test.ts',
    'src/plugins/simulator-shared/__tests__/launch_app_sim.test.ts',
    'src/plugins/simulator-shared/__tests__/reset_simulator_location.test.ts',
    'src/plugins/simulator-shared/__tests__/set_network_condition.test.ts',
    'src/plugins/simulator-shared/__tests__/set_sim_appearance.test.ts',
    'src/plugins/simulator-shared/__tests__/set_simulator_location.test.ts',
    'src/plugins/utilities/__tests__/scaffold_ios_project.test.ts',
    'src/plugins/utilities/__tests__/scaffold_macos_project.test.ts'
  ]
};

class SystematicTestFixer {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verify = options.verify || false;
    this.verbose = options.verbose || false;
    this.stats = {
      filesProcessed: 0,
      filesFixed: 0,
      filesFailed: 0,
      backupsCreated: 0
    };
  }

  /**
   * Main entry point for systematic fixing
   */
  async fix(batch = 'all') {
    console.log(`${colors.bold}${colors.blue}🔧 XcodeBuildMCP Systematic Test Architecture Fix${colors.reset}\n`);
    
    if (this.dryRun) {
      console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified${colors.reset}\n`);
    }

    // Run initial audit
    console.log(`${colors.cyan}📊 Running initial audit...${colors.reset}`);
    await this.runAudit();

    if (batch === 'all') {
      await this.fixAllBatches();
    } else if (VIOLATION_BATCHES[batch]) {
      await this.fixBatch(batch);
    } else {
      console.error(`${colors.red}❌ Unknown batch: ${batch}${colors.reset}`);
      console.log(`Available batches: ${Object.keys(VIOLATION_BATCHES).join(', ')}, all`);
      process.exit(1);
    }

    // Run final audit and tests
    await this.finalValidation();
  }

  /**
   * Fix all batches in priority order
   */
  async fixAllBatches() {
    const batches = ['ui-testing', 'logging', 'simulator-workspace', 'remaining'];
    
    for (const batch of batches) {
      await this.fixBatch(batch);
      
      // Run audit after each batch
      console.log(`\n${colors.cyan}📊 Running audit after ${batch} batch...${colors.reset}`);
      await this.runAudit();
      
      // Prompt to continue (in interactive mode)
      if (!this.dryRun) {
        console.log(`${colors.yellow}✅ Batch '${batch}' completed. Press Enter to continue...${colors.reset}`);
        // In automated mode, continue immediately
      }
    }
  }

  /**
   * Fix a specific batch of files
   */
  async fixBatch(batchName) {
    const files = VIOLATION_BATCHES[batchName];
    if (!files) {
      console.error(`${colors.red}❌ Unknown batch: ${batchName}${colors.reset}`);
      return;
    }

    console.log(`\n${colors.bold}${colors.magenta}🚀 Fixing batch: ${batchName} (${files.length} files)${colors.reset}\n`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(__dirname, file);
      
      console.log(`${colors.blue}[${i + 1}/${files.length}]${colors.reset} ${file}`);
      
      try {
        await this.fixFile(filePath);
        this.stats.filesFixed++;
      } catch (error) {
        console.error(`  ${colors.red}❌ Failed: ${error.message}${colors.reset}`);
        this.stats.filesFailed++;
      }
      
      this.stats.filesProcessed++;
    }

    console.log(`\n${colors.green}✅ Batch '${batchName}' completed:${colors.reset}`);
    console.log(`  Fixed: ${this.stats.filesFixed} files`);
    console.log(`  Failed: ${this.stats.filesFailed} files`);
  }

  /**
   * Fix a single test file
   */
  async fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    
    // Create backup
    const backupPath = `${filePath}.backup-${Date.now()}`;
    if (!this.dryRun) {
      fs.writeFileSync(backupPath, originalContent);
      this.stats.backupsCreated++;
      if (this.verbose) {
        console.log(`  📄 Created backup: ${path.basename(backupPath)}`);
      }
    }

    let content = originalContent;
    let modifications = [];

    // Remove utility mocking patterns
    for (const pattern of PATTERNS_TO_REMOVE) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, '');
        modifications.push(`Removed utility mocking: ${matches.length} patterns`);
      }
    }

    // Add child_process mock if not present
    if (!content.includes("vi.mock('child_process'")) {
      // Find import section and add child_process mock
      const importLines = content.split('\n');
      let insertIndex = 0;
      
      // Find the right place to insert (after initial imports, before plugin import)
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].includes('from \'vitest\'') || 
            importLines[i].includes('from "vitest"')) {
          insertIndex = i + 1;
          break;
        }
      }

      // Add EventEmitter import if not present
      if (!content.includes('EventEmitter')) {
        importLines.splice(insertIndex, 0, EVENT_EMITTER_IMPORT);
        insertIndex++;
      }

      // Add child_process mock
      importLines.splice(insertIndex, 0, '', CHILD_PROCESS_MOCK, '');
      content = importLines.join('\n');
      modifications.push('Added child_process mock and MockChildProcess class');
    }

    // Add mock setup in beforeEach if needed
    if (!content.includes('vi.mocked(spawn)') && !content.includes('mockProcess')) {
      // Look for existing beforeEach or add one
      if (content.includes('beforeEach(')) {
        // Add mock setup to existing beforeEach
        content = content.replace(
          /(beforeEach\(\(\)\s*=>\s*{\s*)/,
          `$1vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
    `
        );
      } else {
        // Add new beforeEach after describe
        content = content.replace(
          /(describe\([^{]*{\s*)/,
          `$1let mockProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
  });

  `
        );
      }
      modifications.push('Added mock setup in beforeEach');
    }

    // Update handler tests to use integration testing approach
    // This is a complex transformation that may need manual refinement
    content = this.transformHandlerTests(content);
    if (content !== originalContent) {
      modifications.push('Transformed handler tests for integration testing');
    }

    // Write the fixed file
    if (!this.dryRun && content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ${colors.green}✅ Fixed${colors.reset}`);
      if (this.verbose && modifications.length > 0) {
        modifications.forEach(mod => console.log(`    - ${mod}`));
      }
    } else if (this.dryRun) {
      console.log(`  ${colors.yellow}🔍 Would fix${colors.reset}`);
      if (modifications.length > 0) {
        modifications.forEach(mod => console.log(`    - ${mod}`));
      }
    } else {
      console.log(`  ${colors.blue}ℹ️  No changes needed${colors.reset}`);
    }
  }

  /**
   * Transform handler tests to use integration testing approach
   */
  transformHandlerTests(content) {
    // This is a simplified transformation - complex cases may need manual review
    
    // Replace mocked utility calls with actual integration testing
    // This is where we'd need specific transformations for each violation pattern
    // For now, we'll remove the most obvious mocking patterns and add comments
    
    // Remove explicit mock setups in tests
    content = content.replace(
      /\(validateRequiredParam as MockedFunction[^;]+;/g,
      '// TODO: Remove mocked utility - test integration flow instead'
    );
    
    content = content.replace(
      /\(executeCommand as MockedFunction[^;]+;/g,
      '// TODO: Remove mocked utility - test integration flow instead'
    );

    return content;
  }

  /**
   * Run audit script
   */
  async runAudit() {
    try {
      const output = execSync('node audit-tests.js', { 
        cwd: __dirname,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Extract key metrics from audit output
      const lines = output.split('\n');
      const summaryStart = lines.findIndex(line => line.includes('Summary:'));
      
      if (summaryStart !== -1) {
        for (let i = summaryStart; i < summaryStart + 6 && i < lines.length; i++) {
          console.log(lines[i].replace(/\x1b\[[0-9;]*m/g, '')); // Strip colors
        }
      }
    } catch (error) {
      console.error(`${colors.red}❌ Audit failed: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Run tests to verify fixes
   */
  async runTests() {
    console.log(`\n${colors.cyan}🧪 Running tests to verify fixes...${colors.reset}`);
    
    try {
      const output = execSync('npm test', {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 120000, // 2 minute timeout
        stdio: 'pipe'
      });
      
      console.log(`${colors.green}✅ All tests passed${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}❌ Tests failed${colors.reset}`);
      console.error(error.stdout || error.message);
      return false;
    }
  }

  /**
   * Final validation after all fixes
   */
  async finalValidation() {
    console.log(`\n${colors.bold}${colors.magenta}🏁 Final Validation${colors.reset}\n`);
    
    // Run final audit
    console.log(`${colors.cyan}📊 Running final audit...${colors.reset}`);
    await this.runAudit();
    
    // Run tests if not in dry run mode
    if (!this.dryRun) {
      const testsPass = await this.runTests();
      
      if (!testsPass) {
        console.log(`\n${colors.yellow}⚠️  Some tests failed. Manual review may be needed.${colors.reset}`);
        console.log(`${colors.blue}💡 Check test output above and review transformed files.${colors.reset}`);
      }
    }

    // Print final statistics
    console.log(`\n${colors.bold}📈 Final Statistics:${colors.reset}`);
    console.log(`  Files processed: ${this.stats.filesProcessed}`);
    console.log(`  Files fixed: ${this.stats.filesFixed}`);
    console.log(`  Files failed: ${this.stats.filesFailed}`);
    console.log(`  Backups created: ${this.stats.backupsCreated}`);
    
    if (this.stats.backupsCreated > 0) {
      console.log(`\n${colors.blue}💾 Backup files created with timestamp suffixes${colors.reset}`);
      console.log(`${colors.yellow}   Remove backups after verification: rm -f **/*.backup-*${colors.reset}`);
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const batch = args.find(arg => !arg.startsWith('--')) || 'all';
const dryRun = args.includes('--dry-run');
const verify = args.includes('--verify');
const verbose = args.includes('--verbose');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
XcodeBuildMCP Systematic Test Architecture Fix Script

Usage: node fix-test-systematic.js [batch] [options]

Batches:
  ui-testing           Fix UI testing violations (11 files)
  logging              Fix logging violations (4 files)
  simulator-workspace  Fix simulator workspace violations (13 files)
  remaining            Fix remaining scattered violations (15 files)
  all                  Fix all violations in priority order (default)

Options:
  --dry-run           Show what would be fixed without making changes
  --verify            Run tests after fixes to verify correctness
  --verbose           Show detailed modification information
  --help, -h          Show this help message

Examples:
  node fix-test-systematic.js --dry-run          # Preview all fixes
  node fix-test-systematic.js ui-testing        # Fix only UI testing
  node fix-test-systematic.js all --verify      # Fix all and run tests
`);
  process.exit(0);
}

// Run the systematic fixer
const fixer = new SystematicTestFixer({ dryRun, verify, verbose });
fixer.fix(batch).catch(error => {
  console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});