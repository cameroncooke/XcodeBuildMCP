#!/usr/bin/env node

/**
 * Comprehensive Plugin Architecture Audit Script
 * 
 * This script validates:
 * 1. One-to-one relationship between canonical tools and their tests
 * 2. Re-export tools have corresponding canonical sources
 * 3. Workflow groups have complete index.ts files
 * 4. No orphaned files exist
 * 5. Architectural compliance with CLAUDE.md
 */

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = './src/plugins';
const SHARED_GROUPS = ['simulator-shared', 'device-shared', 'macos-shared'];
const CANONICAL_GROUPS = ['simulator-shared', 'device-shared', 'macos-shared', 'project-discovery', 'ui-testing', 'logging', 'utilities', 'diagnostics', 'discovery', 'swift-package'];
const PROJECT_GROUPS = ['simulator-project', 'device-project', 'macos-project'];
const WORKSPACE_GROUPS = ['simulator-workspace', 'device-workspace', 'macos-workspace'];

class PluginAudit {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.canonicalTools = new Map(); // tool name -> { group, path }
    this.allTools = new Map(); // tool name -> { group, path, isReExport, canonicalSource }
    this.testFiles = new Map(); // tool name -> { group, path }
    this.workflowIndexFiles = new Map(); // group -> { exists, path }
  }

  log(level, message) {
    this[level].push(message);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  // Get all TypeScript files in a directory, excluding __tests__
  getToolFiles(groupPath) {
    if (!fs.existsSync(groupPath)) return [];
    
    return fs.readdirSync(groupPath)
      .filter(file => file.endsWith('.ts') && file !== 'index.ts' && !file.includes('.test.ts'))
      .map(file => ({
        name: file.replace('.ts', ''),
        path: path.join(groupPath, file)
      }));
  }

  // Get all test files in __tests__ directory
  getTestFiles(groupPath) {
    const testsPath = path.join(groupPath, '__tests__');
    if (!fs.existsSync(testsPath)) return [];
    
    return fs.readdirSync(testsPath)
      .filter(file => file.endsWith('.test.ts') && file !== 'index.test.ts' && file !== 're-exports.test.ts')
      .map(file => ({
        name: file.replace('.test.ts', ''),
        path: path.join(testsPath, file)
      }));
  }

  // Check if a tool file is a re-export
  isReExport(filePath) {
    if (!fs.existsSync(filePath)) return false;
    
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('export { default } from') && (content.includes('// Re-export') || content.includes('// re-export'));
  }

  // Extract canonical source from re-export
  getCanonicalSource(filePath) {
    if (!fs.existsSync(filePath)) return null;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/export \{ default \} from ['"]\.\.\/([^/]+)\/([^'"]+)['"]/);
    return match ? { group: match[1], tool: match[2].replace('.js', '') } : null;
  }

  // Scan all plugin groups
  scanAllGroups() {
    if (!fs.existsSync(PLUGINS_DIR)) {
      this.log('errors', `Plugins directory not found: ${PLUGINS_DIR}`);
      return;
    }

    const groups = fs.readdirSync(PLUGINS_DIR)
      .filter(item => fs.statSync(path.join(PLUGINS_DIR, item)).isDirectory());

    // First pass: collect all tools and identify canonical vs re-exports
    for (const group of groups) {
      const groupPath = path.join(PLUGINS_DIR, group);
      
      // Check for index.ts
      const indexPath = path.join(groupPath, 'index.ts');
      this.workflowIndexFiles.set(group, {
        exists: fs.existsSync(indexPath),
        path: indexPath
      });

      // Get tools
      const tools = this.getToolFiles(groupPath);
      const tests = this.getTestFiles(groupPath);

      // Map test files
      for (const test of tests) {
        this.testFiles.set(`${group}:${test.name}`, {
          group,
          path: test.path
        });
      }

      // Process tools
      for (const tool of tools) {
        const toolKey = `${group}:${tool.name}`;
        const isReExportFile = this.isReExport(tool.path);
        
        if (isReExportFile) {
          const canonicalSource = this.getCanonicalSource(tool.path);
          this.allTools.set(toolKey, {
            group,
            path: tool.path,
            isReExport: true,
            canonicalSource
          });
        } else {
          // This is a canonical implementation
          this.allTools.set(toolKey, {
            group,
            path: tool.path,
            isReExport: false,
            canonicalSource: null
          });
          
          // Track canonical tools separately
          if (CANONICAL_GROUPS.includes(group)) {
            this.canonicalTools.set(tool.name, {
              group,
              path: tool.path
            });
          }
        }
      }
    }
  }

  // Validate canonical tools have tests
  validateCanonicalToolTests() {
    this.log('info', '=== Validating Canonical Tool Tests ===');
    
    for (const [toolName, toolInfo] of this.canonicalTools) {
      const testKey = `${toolInfo.group}:${toolName}`;
      
      if (!this.testFiles.has(testKey)) {
        this.log('errors', `Missing test file for canonical tool: ${toolInfo.group}/${toolName}.ts`);
        this.log('info', `  Expected: ${toolInfo.group}/__tests__/${toolName}.test.ts`);
      }
    }
  }

  // Validate re-exports point to valid canonical sources
  validateReExports() {
    this.log('info', '=== Validating Re-exports ===');
    
    for (const [toolKey, toolInfo] of this.allTools) {
      if (!toolInfo.isReExport) continue;
      
      const [group, toolName] = toolKey.split(':');
      
      if (!toolInfo.canonicalSource) {
        this.log('errors', `Re-export has invalid canonical source: ${group}/${toolName}.ts`);
        continue;
      }
      
      const { group: canonicalGroup, tool: canonicalTool } = toolInfo.canonicalSource;
      const canonicalKey = `${canonicalGroup}:${canonicalTool}`;
      
      if (!this.allTools.has(canonicalKey)) {
        this.log('errors', `Re-export points to non-existent canonical tool: ${group}/${toolName}.ts -> ${canonicalGroup}/${canonicalTool}.ts`);
        continue;
      }
      
      const canonicalToolInfo = this.allTools.get(canonicalKey);
      if (canonicalToolInfo.isReExport) {
        this.log('errors', `Re-export points to another re-export (chain detected): ${group}/${toolName}.ts -> ${canonicalGroup}/${canonicalTool}.ts`);
      }
      
      // Validate re-export rules
      if (PROJECT_GROUPS.includes(group) || WORKSPACE_GROUPS.includes(group)) {
        if (!CANONICAL_GROUPS.includes(canonicalGroup)) {
          this.log('errors', `Project/Workspace group re-exports from non-canonical group: ${group}/${toolName}.ts -> ${canonicalGroup}/${canonicalTool}.ts`);
        }
      }
    }
  }

  // Find orphaned test files
  validateOrphanedTests() {
    this.log('info', '=== Validating Orphaned Tests ===');
    
    for (const [testKey, testInfo] of this.testFiles) {
      const [group, toolName] = testKey.split(':');
      const toolKey = `${group}:${toolName}`;
      
      if (!this.allTools.has(toolKey)) {
        this.log('warnings', `Orphaned test file (no corresponding tool): ${testInfo.path}`);
      }
    }
  }

  // Validate workflow index files
  validateWorkflowIndex() {
    this.log('info', '=== Validating Workflow Index Files ===');
    
    for (const [group, indexInfo] of this.workflowIndexFiles) {
      if (SHARED_GROUPS.includes(group)) {
        // Shared groups shouldn't have workflow metadata
        if (indexInfo.exists) {
          const content = fs.readFileSync(indexInfo.path, 'utf8');
          if (content.includes('export const workflow')) {
            this.log('warnings', `Shared group has workflow metadata: ${group}/index.ts`);
          }
        }
      } else {
        // Non-shared groups should have workflow metadata
        if (!indexInfo.exists) {
          this.log('errors', `Missing index.ts file: ${group}/index.ts`);
        } else {
          const content = fs.readFileSync(indexInfo.path, 'utf8');
          if (!content.includes('export const workflow')) {
            this.log('warnings', `Workflow group missing workflow metadata: ${group}/index.ts`);
          }
        }
      }
    }
  }

  // Check for naming convention violations
  validateNamingConventions() {
    this.log('info', '=== Validating Naming Conventions ===');
    
    for (const [toolKey, toolInfo] of this.allTools) {
      const [group, toolName] = toolKey.split(':');
      
      // Skip re-exports from shared groups as they don't need suffix validation
      if (toolInfo.isReExport && toolInfo.canonicalSource && SHARED_GROUPS.includes(toolInfo.canonicalSource.group)) {
        continue;
      }
      
      if (PROJECT_GROUPS.includes(group)) {
        if (!toolName.endsWith('_proj') && !toolInfo.isReExport) {
          this.log('errors', `Project group tool missing _proj suffix: ${group}/${toolName}.ts`);
        }
      }
      
      if (WORKSPACE_GROUPS.includes(group)) {
        if (!toolName.endsWith('_ws') && !toolInfo.isReExport) {
          this.log('errors', `Workspace group tool missing _ws suffix: ${group}/${toolName}.ts`);
        }
      }
    }
  }

  // Check for missing essential workflow tools
  validateWorkflowCompleteness() {
    this.log('info', '=== Validating Workflow Completeness ===');
    
    const essentialTools = {
      'simulator-project': ['build_sim_id_proj', 'build_sim_name_proj', 'test_sim_id_proj', 'test_sim_name_proj'],
      'simulator-workspace': ['build_sim_id_ws', 'build_sim_name_ws', 'test_sim_id_ws', 'test_sim_name_ws'],
      'device-project': ['build_dev_proj', 'test_device_proj'],
      'device-workspace': ['build_dev_ws', 'test_device_ws'],
      'macos-project': ['build_mac_proj', 'test_macos_proj'],
      'macos-workspace': ['build_mac_ws', 'test_macos_ws']
    };
    
    for (const [group, requiredTools] of Object.entries(essentialTools)) {
      for (const toolName of requiredTools) {
        const toolKey = `${group}:${toolName}`;
        if (!this.allTools.has(toolKey)) {
          this.log('errors', `Missing essential workflow tool: ${group}/${toolName}.ts`);
        }
      }
    }
  }

  // Generate summary statistics
  generateSummary() {
    this.log('info', '=== Audit Summary ===');
    this.log('info', `Total tools found: ${this.allTools.size}`);
    this.log('info', `Canonical tools: ${this.canonicalTools.size}`);
    this.log('info', `Re-export tools: ${Array.from(this.allTools.values()).filter(t => t.isReExport).length}`);
    this.log('info', `Test files: ${this.testFiles.size}`);
    this.log('info', `Workflow groups: ${this.workflowIndexFiles.size}`);
    this.log('info', '');
    this.log('info', `Errors: ${this.errors.length}`);
    this.log('info', `Warnings: ${this.warnings.length}`);
    
    if (this.errors.length === 0) {
      this.log('info', '✅ All architectural requirements satisfied!');
    } else {
      this.log('info', '❌ Architectural violations found');
    }
  }

  // Run complete audit
  runAudit() {
    console.log('🔍 Starting Plugin Architecture Audit...\n');
    
    this.scanAllGroups();
    this.validateCanonicalToolTests();
    this.validateReExports();
    this.validateOrphanedTests();
    this.validateWorkflowIndex();
    this.validateNamingConventions();
    this.validateWorkflowCompleteness();
    this.generateSummary();
    
    // Return exit code
    return this.errors.length > 0 ? 1 : 0;
  }
}

// Run the audit
const audit = new PluginAudit();
const exitCode = audit.runAudit();
process.exit(exitCode);