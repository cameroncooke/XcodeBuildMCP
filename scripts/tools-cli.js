#!/usr/bin/env node

/**
 * XcodeBuildMCP Tools CLI
 * 
 * A unified command-line tool that provides comprehensive information about 
 * XcodeBuildMCP tools and resources. Supports both runtime inspection 
 * (actual server state) and static analysis (source file counts).
 * 
 * Usage:
 *   node scripts/tools-cli.js [command] [options]
 * 
 * Commands:
 *   count, c        Show tool and workflow counts
 *   list, l         List all tools and resources
 *   static, s       Show static source file analysis
 *   help, h         Show this help message
 * 
 * Options:
 *   --runtime, -r        Use runtime inspection (respects env config)
 *   --static, -s         Use static file analysis (development mode)
 *   --tools, -t          Include tools in output
 *   --resources          Include resources in output  
 *   --workflows, -w      Include workflow information
 *   --verbose, -v        Show detailed information
 *   --help              Show help for specific command
 * 
 * Examples:
 *   node scripts/tools-cli.js count                    # Runtime tool count
 *   node scripts/tools-cli.js count --static          # Static file count
 *   node scripts/tools-cli.js list --tools            # Runtime tool list
 *   node scripts/tools-cli.js static --verbose        # Detailed static analysis
 *   node scripts/tools-cli.js count --runtime --static # Both counts
 */

import { spawn } from 'child_process';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const toolsDir = path.join(projectRoot, 'src', 'mcp', 'tools');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0] || 'count';
const options = {
  runtime: args.includes('--runtime') || args.includes('-r'),
  static: args.includes('--static') || args.includes('-s'),
  tools: args.includes('--tools') || args.includes('-t'),
  resources: args.includes('--resources'),
  workflows: args.includes('--workflows') || args.includes('-w'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h')
};

// Set sensible defaults for each command
if (!options.runtime && !options.static) {
  if (command === 'static' || command === 's') {
    options.static = true;
  } else {
    options.runtime = true;
  }
}

// Set sensible content defaults
if (command === 'list' || command === 'l') {
  if (!options.tools && !options.resources && !options.workflows) {
    options.tools = true; // Default to showing tools for list command
  }
} else if (!command || command === 'count' || command === 'c') {
  // For no command or count, show comprehensive summary
  if (!options.tools && !options.resources && !options.workflows) {
    options.workflows = true; // Show workflows by default for summary
  }
}

// Help text
const helpText = {
  main: `
${colors.bright}${colors.blue}XcodeBuildMCP Tools CLI${colors.reset}

A unified command-line tool for XcodeBuildMCP tool and resource information.

${colors.bright}COMMANDS:${colors.reset}
  count, c        Show tool and workflow counts
  list, l         List all tools and resources  
  static, s       Show static source file analysis
  help, h         Show this help message

${colors.bright}OPTIONS:${colors.reset}
  --runtime, -r        Use runtime inspection (respects env config)
  --static, -s         Use static file analysis (development mode)
  --tools, -t          Include tools in output
  --resources          Include resources in output
  --workflows, -w      Include workflow information
  --verbose, -v        Show detailed information

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.cyan}node scripts/tools-cli.js${colors.reset}                         # Runtime summary with workflows
  ${colors.cyan}node scripts/tools-cli.js list${colors.reset}                    # List runtime tools
  ${colors.cyan}node scripts/tools-cli.js list --static${colors.reset}           # List static tools
  ${colors.cyan}node scripts/tools-cli.js static${colors.reset}                  # Static analysis summary
  ${colors.cyan}node scripts/tools-cli.js count --static${colors.reset}          # Compare runtime vs static counts

${colors.bright}ANALYSIS MODES:${colors.reset}
  ${colors.green}Runtime${colors.reset}  Uses actual server inspection via Reloaderoo
           - Respects XCODEBUILDMCP_DYNAMIC_TOOLS environment variable
           - Shows tools actually enabled at runtime
           - Requires built server (npm run build)
           
  ${colors.yellow}Static${colors.reset}   Scans source files directly
           - Shows all tools in codebase regardless of config
           - Development-time analysis
           - No server build required
`,

  count: `
${colors.bright}COUNT COMMAND${colors.reset}

Shows tool and workflow counts using runtime or static analysis.

${colors.bright}Usage:${colors.reset} node scripts/tools-cli.js count [options]

${colors.bright}Options:${colors.reset}
  --runtime, -r        Count tools from running server
  --static, -s         Count tools from source files
  --workflows, -w      Include workflow directory counts

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}node scripts/tools-cli.js count${colors.reset}                    # Runtime count
  ${colors.cyan}node scripts/tools-cli.js count --static${colors.reset}          # Static count
  ${colors.cyan}node scripts/tools-cli.js count --workflows${colors.reset}       # Include workflows
`,

  list: `
${colors.bright}LIST COMMAND${colors.reset}

Lists tools and resources with optional details.

${colors.bright}Usage:${colors.reset} node scripts/tools-cli.js list [options]

${colors.bright}Options:${colors.reset}
  --runtime, -r        List from running server
  --static, -s         List from source files
  --tools, -t          Show tool names
  --resources          Show resource URIs
  --verbose, -v        Show detailed information

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}node scripts/tools-cli.js list --tools${colors.reset}            # Runtime tool list
  ${colors.cyan}node scripts/tools-cli.js list --resources${colors.reset}        # Runtime resource list
  ${colors.cyan}node scripts/tools-cli.js list --static --verbose${colors.reset} # Static detailed list
`,

  static: `
${colors.bright}STATIC COMMAND${colors.reset}

Performs detailed static analysis of source files.

${colors.bright}Usage:${colors.reset} node scripts/tools-cli.js static [options]

${colors.bright}Options:${colors.reset}
  --tools, -t          Show canonical tool details
  --workflows, -w      Show workflow directory analysis
  --verbose, -v        Show detailed file information

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}node scripts/tools-cli.js static${colors.reset}                  # Basic static analysis
  ${colors.cyan}node scripts/tools-cli.js static --verbose${colors.reset}        # Detailed analysis
  ${colors.cyan}node scripts/tools-cli.js static --workflows${colors.reset}      # Include workflow info
`
};

if (options.help) {
  console.log(helpText[command] || helpText.main);
  process.exit(0);
}

if (command === 'help' || command === 'h') {
  const helpCommand = args[1];
  console.log(helpText[helpCommand] || helpText.main);
  process.exit(0);
}

/**
 * Execute reloaderoo command and parse JSON response
 */
async function executeReloaderoo(reloaderooArgs) {
  const buildPath = path.resolve(__dirname, '..', 'build', 'index.js');

  if (!fs.existsSync(buildPath)) {
    throw new Error('Build not found. Please run "npm run build" first.');
  }

  const tempFile = `/tmp/reloaderoo-output-${Date.now()}.json`;
  const command = `npx -y reloaderoo@latest inspect ${reloaderooArgs.join(' ')} -- node "${buildPath}"`;

  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', `${command} > "${tempFile}"`], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      try {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}`));
          return;
        }

        const content = fs.readFileSync(tempFile, 'utf8');

        // Remove stderr log lines and find JSON
        const lines = content.split('\n');
        const cleanLines = [];

        for (const line of lines) {
          if (line.match(/^\[\d{4}-\d{2}-\d{2}T/) || line.includes('[INFO]') || line.includes('[DEBUG]') || line.includes('[ERROR]')) {
            continue;
          }

          const trimmed = line.trim();
          if (trimmed) {
            cleanLines.push(line);
          }
        }

        // Find JSON start
        let jsonStartIndex = -1;
        for (let i = 0; i < cleanLines.length; i++) {
          if (cleanLines[i].trim().startsWith('{')) {
            jsonStartIndex = i;
            break;
          }
        }

        if (jsonStartIndex === -1) {
          reject(new Error(`No JSON response found in output.\nOutput: ${content.substring(0, 500)}...`));
          return;
        }

        const jsonText = cleanLines.slice(jsonStartIndex).join('\n');
        const response = JSON.parse(jsonText);
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse JSON response: ${error.message}`));
      } finally {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn process: ${error.message}`));
    });
  });
}

/**
 * Get runtime server information
 */
async function getRuntimeInfo() {
  try {
    const toolsResponse = await executeReloaderoo(['list-tools']);
    const resourcesResponse = await executeReloaderoo(['list-resources']);

    let tools = [];
    let toolCount = 0;

    if (toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
      toolCount = toolsResponse.tools.length;
      tools = toolsResponse.tools.map(tool => ({
        name: tool.name,
        description: tool.description
      }));
    }

    let resources = [];
    let resourceCount = 0;

    if (resourcesResponse.resources && Array.isArray(resourcesResponse.resources)) {
      resourceCount = resourcesResponse.resources.length;
      resources = resourcesResponse.resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.title || resource.description || 'No description available'
      }));
    }

    return {
      tools,
      resources,
      toolCount,
      resourceCount,
      dynamicMode: process.env.XCODEBUILDMCP_DYNAMIC_TOOLS === 'true',
      mode: 'runtime'
    };
  } catch (error) {
    throw new Error(`Runtime analysis failed: ${error.message}`);
  }
}

/**
 * Check if a file is a re-export
 */
function isReExportFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim());

    const codeLines = lines.filter(line => {
      return line.length > 0 &&
        !line.startsWith('//') &&
        !line.startsWith('/*') &&
        !line.startsWith('*') &&
        line !== '*/';
    });

    if (codeLines.length === 0) {
      return false;
    }

    const reExportRegex = /^export\s*{\s*default\s*}\s*from\s*['"][^'"]+['"];?\s*$/;
    return codeLines.length === 1 && reExportRegex.test(codeLines[0]);
  } catch (error) {
    return false;
  }
}

/**
 * Get workflow directories
 */
function getWorkflowDirectories() {
  const workflowDirs = [];
  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(toolsDir, entry.name, 'index.ts');
      if (fs.existsSync(indexPath)) {
        workflowDirs.push(entry.name);
      }
    }
  }

  return workflowDirs;
}

/**
 * Get static file analysis
 */
async function getStaticInfo() {
  try {
    // Get workflow directories
    const workflowDirs = getWorkflowDirectories();

    // Find all tool files
    const files = await glob('**/*.ts', {
      cwd: toolsDir,
      ignore: ['**/__tests__/**', '**/index.ts', '**/*.test.ts'],
      absolute: true,
    });

    const canonicalTools = new Map();
    const reExportFiles = [];
    const toolsByWorkflow = new Map();

    for (const file of files) {
      const toolName = path.basename(file, '.ts');
      const workflowDir = path.basename(path.dirname(file));

      if (!toolsByWorkflow.has(workflowDir)) {
        toolsByWorkflow.set(workflowDir, { canonical: [], reExports: [] });
      }

      if (isReExportFile(file)) {
        reExportFiles.push({
          name: toolName,
          file,
          workflowDir,
          relativePath: path.relative(projectRoot, file)
        });
        toolsByWorkflow.get(workflowDir).reExports.push(toolName);
      } else {
        canonicalTools.set(toolName, {
          name: toolName,
          file,
          workflowDir,
          relativePath: path.relative(projectRoot, file)
        });
        toolsByWorkflow.get(workflowDir).canonical.push(toolName);
      }
    }

    return {
      tools: Array.from(canonicalTools.values()),
      reExportFiles,
      toolCount: canonicalTools.size,
      reExportCount: reExportFiles.length,
      workflowDirs,
      toolsByWorkflow,
      mode: 'static'
    };
  } catch (error) {
    throw new Error(`Static analysis failed: ${error.message}`);
  }
}

/**
 * Display summary information
 */
function displaySummary(runtimeData, staticData) {
  console.log(`${colors.bright}${colors.blue}📊 XcodeBuildMCP Tools Summary${colors.reset}`);
  console.log('═'.repeat(60));

  if (runtimeData) {
    console.log(`${colors.green}🚀 Runtime Analysis:${colors.reset}`);
    console.log(`   Mode: ${runtimeData.dynamicMode ? 'Dynamic' : 'Static'}`);
    console.log(`   Tools: ${runtimeData.toolCount}`);
    console.log(`   Resources: ${runtimeData.resourceCount}`);
    console.log(`   Total: ${runtimeData.toolCount + runtimeData.resourceCount}`);

    if (runtimeData.dynamicMode) {
      console.log(`   ${colors.yellow}ℹ️  Dynamic mode: Only enabled workflow tools shown${colors.reset}`);
    }
    console.log();
  }

  if (staticData) {
    console.log(`${colors.cyan}📁 Static Analysis:${colors.reset}`);
    console.log(`   Workflow directories: ${staticData.workflowDirs.length}`);
    console.log(`   Canonical tools: ${staticData.toolCount}`);
    console.log(`   Re-export files: ${staticData.reExportCount}`);
    console.log(`   Total tool files: ${staticData.toolCount + staticData.reExportCount}`);
    console.log();
  }
}

/**
 * Display workflow information
 */
function displayWorkflows(staticData) {
  if (!options.workflows || !staticData) return;

  console.log(`${colors.bright}📂 Workflow Directories:${colors.reset}`);
  console.log('─'.repeat(40));

  for (const workflowDir of staticData.workflowDirs) {
    const workflow = staticData.toolsByWorkflow.get(workflowDir) || { canonical: [], reExports: [] };
    const totalTools = workflow.canonical.length + workflow.reExports.length;

    console.log(`${colors.green}• ${workflowDir}${colors.reset} (${totalTools} tools)`);

    if (options.verbose) {
      if (workflow.canonical.length > 0) {
        console.log(`  ${colors.cyan}Canonical:${colors.reset} ${workflow.canonical.join(', ')}`);
      }
      if (workflow.reExports.length > 0) {
        console.log(`  ${colors.yellow}Re-exports:${colors.reset} ${workflow.reExports.join(', ')}`);
      }
    }
  }
  console.log();
}

/**
 * Display tool lists
 */
function displayTools(runtimeData, staticData) {
  if (!options.tools) return;

  if (runtimeData) {
    console.log(`${colors.bright}🛠️  Runtime Tools (${runtimeData.toolCount}):${colors.reset}`);
    console.log('─'.repeat(40));

    if (runtimeData.tools.length === 0) {
      console.log('   No tools available');
    } else {
      runtimeData.tools.forEach(tool => {
        if (options.verbose && tool.description) {
          console.log(`   ${colors.green}•${colors.reset} ${colors.bright}${tool.name}${colors.reset}`);
          console.log(`     ${tool.description}`);
        } else {
          console.log(`   ${colors.green}•${colors.reset} ${tool.name}`);
        }
      });
    }
    console.log();
  }

  if (staticData && options.static) {
    console.log(`${colors.bright}📁 Static Tools (${staticData.toolCount}):${colors.reset}`);
    console.log('─'.repeat(40));

    if (staticData.tools.length === 0) {
      console.log('   No tools found');
    } else {
      staticData.tools
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(tool => {
          if (options.verbose) {
            console.log(`   ${colors.green}•${colors.reset} ${colors.bright}${tool.name}${colors.reset} (${tool.workflowDir})`);
            console.log(`     ${tool.relativePath}`);
          } else {
            console.log(`   ${colors.green}•${colors.reset} ${tool.name}`);
          }
        });
    }
    console.log();
  }
}

/**
 * Display resource lists
 */
function displayResources(runtimeData) {
  if (!options.resources || !runtimeData) return;

  console.log(`${colors.bright}📚 Resources (${runtimeData.resourceCount}):${colors.reset}`);
  console.log('─'.repeat(40));

  if (runtimeData.resources.length === 0) {
    console.log('   No resources available');
  } else {
    runtimeData.resources.forEach(resource => {
      if (options.verbose) {
        console.log(`   ${colors.magenta}•${colors.reset} ${colors.bright}${resource.uri}${colors.reset}`);
        console.log(`     ${resource.description}`);
      } else {
        console.log(`   ${colors.magenta}•${colors.reset} ${resource.uri}`);
      }
    });
  }
  console.log();
}

/**
 * Main execution function
 */
async function main() {
  try {
    let runtimeData = null;
    let staticData = null;

    // Gather data based on options
    if (options.runtime) {
      console.log(`${colors.cyan}🔍 Gathering runtime information...${colors.reset}`);
      runtimeData = await getRuntimeInfo();
    }

    if (options.static) {
      console.log(`${colors.cyan}📁 Performing static analysis...${colors.reset}`);
      staticData = await getStaticInfo();
    }

    // For default command or workflows option, always gather static data for workflow info
    if (options.workflows && !staticData) {
      console.log(`${colors.cyan}📁 Gathering workflow information...${colors.reset}`);
      staticData = await getStaticInfo();
    }

    console.log(); // Blank line after gathering

    // Display based on command
    switch (command) {
      case 'count':
      case 'c':
        displaySummary(runtimeData, staticData);
        displayWorkflows(staticData);
        break;

      case 'list':
      case 'l':
        displaySummary(runtimeData, staticData);
        displayTools(runtimeData, staticData);
        displayResources(runtimeData);
        break;

      case 'static':
      case 's':
        if (!staticData) {
          console.log(`${colors.cyan}📁 Performing static analysis...${colors.reset}\n`);
          staticData = await getStaticInfo();
        }
        displaySummary(null, staticData);
        displayWorkflows(staticData);

        if (options.verbose) {
          displayTools(null, staticData);
          console.log(`${colors.bright}🔄 Re-export Files (${staticData.reExportCount}):${colors.reset}`);
          console.log('─'.repeat(40));
          staticData.reExportFiles.forEach(file => {
            console.log(`   ${colors.yellow}•${colors.reset} ${file.name} (${file.workflowDir})`);
            console.log(`     ${file.relativePath}`);
          });
        }
        break;

      default:
        // Default case (no command) - show runtime summary with workflows
        displaySummary(runtimeData, staticData);
        displayWorkflows(staticData);
        break;
    }

    console.log(`${colors.green}✅ Analysis complete!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the CLI
main();