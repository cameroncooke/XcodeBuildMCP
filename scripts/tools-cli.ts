#!/usr/bin/env node

/**
 * XcodeBuildMCP Tools CLI
 *
 * A unified command-line tool that provides comprehensive information about
 * XcodeBuildMCP tools and resources. Supports both runtime inspection
 * (actual server state) and static analysis (source file analysis).
 *
 * Usage:
 *   npm run tools [command] [options]
 *   npx tsx src/cli/tools-cli.ts [command] [options]
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
 *   --json               Output JSON format
 *   --help              Show help for specific command
 *
 * Examples:
 *   npm run tools                         # Runtime summary with workflows
 *   npm run tools:count                   # Runtime tool count
 *   npm run tools:static                  # Static file analysis
 *   npm run tools:list                    # List runtime tools
 *   npx tsx src/cli/tools-cli.ts --json   # JSON output
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { getStaticToolAnalysis, type StaticAnalysisResult } from './analysis/tools-analysis.js';
import { getSchemaAuditTools } from './analysis/tools-schema-audit.js';
import type { SchemaAuditTool } from './analysis/tools-schema-audit.js';

// Get project paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
} as const;

// Types
interface CLIOptions {
  runtime: boolean;
  static: boolean;
  tools: boolean;
  resources: boolean;
  workflows: boolean;
  verbose: boolean;
  json: boolean;
  help: boolean;
}

interface RuntimeTool {
  name: string;
  description: string;
}

interface RuntimeResource {
  uri: string;
  name: string;
  description: string;
}

interface RuntimeData {
  tools: RuntimeTool[];
  resources: RuntimeResource[];
  toolCount: number;
  resourceCount: number;
  mode: 'runtime';
}

// CLI argument parsing
const args = process.argv.slice(2);

// Find the command (first non-flag argument)
let command = 'count'; // default
for (const arg of args) {
  if (!arg.startsWith('-')) {
    command = arg;
    break;
  }
}

const options: CLIOptions = {
  runtime: args.includes('--runtime') || args.includes('-r'),
  static: args.includes('--static') || args.includes('-s'),
  tools: args.includes('--tools') || args.includes('-t'),
  resources: args.includes('--resources'),
  workflows: args.includes('--workflows') || args.includes('-w'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  json: args.includes('--json'),
  help: args.includes('--help') || args.includes('-h'),
};

// Set sensible defaults for each command
if (!options.runtime && !options.static) {
  if (command === 'static' || command === 's') {
    options.static = true;
  } else {
    // Default to static analysis for development-friendly usage
    options.static = true;
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
  schema, audit   Audit tool schemas (arguments and descriptions)
  static, s       Show static source file analysis
  help, h         Show this help message

${colors.bright}OPTIONS:${colors.reset}
  --runtime, -r        Use runtime inspection (respects env config)
  --static, -s         Use static file analysis (default, development mode)
  --tools, -t          Include tools in output
  --resources          Include resources in output
  --workflows, -w      Include workflow information
  --verbose, -v        Show detailed information
  --json               Output JSON format

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.cyan}npm run tools${colors.reset}                         # Static summary with workflows (default)
  ${colors.cyan}npm run tools list${colors.reset}                    # List tools
  ${colors.cyan}npm run tools schema${colors.reset}                  # Audit tool schemas
  ${colors.cyan}npm run tools --runtime${colors.reset}               # Runtime analysis (requires build)
  ${colors.cyan}npm run tools static${colors.reset}                  # Static analysis summary
  ${colors.cyan}npm run tools count --json${colors.reset}            # JSON output

${colors.bright}ANALYSIS MODES:${colors.reset}
  ${colors.green}Runtime${colors.reset}  Uses actual server inspection via Reloaderoo
           - Respects XCODEBUILDMCP_ENABLED_WORKFLOWS environment variable
           - Shows tools actually enabled at runtime
           - Requires built server (npm run build)
           
  ${colors.yellow}Static${colors.reset}   Scans source files directly using AST parsing
           - Shows all tools in codebase regardless of config
           - Development-time analysis with reliable description extraction
           - No server build required
`,

  count: `
${colors.bright}COUNT COMMAND${colors.reset}

Shows tool and workflow counts using runtime or static analysis.

${colors.bright}Usage:${colors.reset} npx tsx scripts/tools-cli.ts count [options]

${colors.bright}Options:${colors.reset}
  --runtime, -r        Count tools from running server
  --static, -s         Count tools from source files
  --workflows, -w      Include workflow directory counts
  --json               Output JSON format

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/tools-cli.ts count${colors.reset}                    # Runtime count
  ${colors.cyan}npx tsx scripts/tools-cli.ts count --static${colors.reset}          # Static count
  ${colors.cyan}npx tsx scripts/tools-cli.ts count --workflows${colors.reset}       # Include workflows
`,

  list: `
${colors.bright}LIST COMMAND${colors.reset}

Lists tools and resources with optional details.

${colors.bright}Usage:${colors.reset} npx tsx scripts/tools-cli.ts list [options]

${colors.bright}Options:${colors.reset}
  --runtime, -r        List from running server
  --static, -s         List from source files
  --tools, -t          Show tool names
  --resources          Show resource URIs
  --verbose, -v        Show detailed information
  --json               Output JSON format

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/tools-cli.ts list --tools${colors.reset}            # Runtime tool list
  ${colors.cyan}npx tsx scripts/tools-cli.ts list --resources${colors.reset}        # Runtime resource list
  ${colors.cyan}npx tsx scripts/tools-cli.ts list --static --verbose${colors.reset} # Static detailed list
`,

  schema: `
${colors.bright}SCHEMA COMMAND${colors.reset}

Audits tool schemas and prints argument descriptions (when set).

${colors.bright}Usage:${colors.reset} npx tsx scripts/tools-cli.ts schema [options]

${colors.bright}Options:${colors.reset}
  --json               Output JSON format

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/tools-cli.ts schema${colors.reset}              # Human-readable schema audit
  ${colors.cyan}npx tsx scripts/tools-cli.ts schema --json${colors.reset}       # JSON schema audit
`,

  audit: `
${colors.bright}SCHEMA COMMAND${colors.reset}

Audits tool schemas and prints argument descriptions (when set).

${colors.bright}Usage:${colors.reset} npx tsx scripts/tools-cli.ts audit [options]

${colors.bright}Options:${colors.reset}
  --json               Output JSON format

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/tools-cli.ts audit${colors.reset}               # Human-readable schema audit
  ${colors.cyan}npx tsx scripts/tools-cli.ts audit --json${colors.reset}        # JSON schema audit
`,

  static: `
${colors.bright}STATIC COMMAND${colors.reset}

Performs detailed static analysis of source files using AST parsing.

${colors.bright}Usage:${colors.reset} npx tsx scripts/tools-cli.ts static [options]

${colors.bright}Options:${colors.reset}
  --tools, -t          Show canonical tool details
  --workflows, -w      Show workflow directory analysis
  --verbose, -v        Show detailed file information
  --json               Output JSON format

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/tools-cli.ts static${colors.reset}                  # Basic static analysis
  ${colors.cyan}npx tsx scripts/tools-cli.ts static --verbose${colors.reset}        # Detailed analysis
  ${colors.cyan}npx tsx scripts/tools-cli.ts static --workflows${colors.reset}      # Include workflow info
`,
};

if (options.help) {
  console.log(helpText[command as keyof typeof helpText] || helpText.main);
  process.exit(0);
}

if (command === 'help' || command === 'h') {
  const helpCommand = args[1];
  console.log(helpText[helpCommand as keyof typeof helpText] || helpText.main);
  process.exit(0);
}

/**
 * Execute reloaderoo command and parse JSON response
 */
async function executeReloaderoo(reloaderooArgs: string[]): Promise<unknown> {
  const buildPath = path.resolve(__dirname, '..', 'build', 'index.js');

  if (!fs.existsSync(buildPath)) {
    throw new Error('Build not found. Please run "npm run build" first.');
  }

  const tempFile = `/tmp/reloaderoo-output-${Date.now()}.json`;
  const command = `npx -y reloaderoo@latest inspect ${reloaderooArgs.join(' ')} -- node "${buildPath}"`;

  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', `${command} > "${tempFile}"`], {
      stdio: 'inherit',
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
        const cleanLines: string[] = [];

        for (const line of lines) {
          if (
            line.match(/^\[\d{4}-\d{2}-\d{2}T/) ||
            line.includes('[INFO]') ||
            line.includes('[DEBUG]') ||
            line.includes('[ERROR]')
          ) {
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
          reject(
            new Error(`No JSON response found in output.\nOutput: ${content.substring(0, 500)}...`),
          );
          return;
        }

        const jsonText = cleanLines.slice(jsonStartIndex).join('\n');
        const response = JSON.parse(jsonText);
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse JSON response: ${(error as Error).message}`));
      } finally {
        try {
          fs.unlinkSync(tempFile);
        } catch {
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
async function getRuntimeInfo(): Promise<RuntimeData> {
  try {
    const toolsResponse = (await executeReloaderoo(['list-tools'])) as {
      tools?: { name: string; description: string }[];
    };
    const resourcesResponse = (await executeReloaderoo(['list-resources'])) as {
      resources?: { uri: string; name: string; description?: string; title?: string }[];
    };

    let tools: RuntimeTool[] = [];
    let toolCount = 0;

    if (toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
      toolCount = toolsResponse.tools.length;
      tools = toolsResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      }));
    }

    let resources: RuntimeResource[] = [];
    let resourceCount = 0;

    if (resourcesResponse.resources && Array.isArray(resourcesResponse.resources)) {
      resourceCount = resourcesResponse.resources.length;
      resources = resourcesResponse.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.title ?? resource.description ?? 'No description available',
      }));
    }

    return {
      tools,
      resources,
      toolCount,
      resourceCount,
      mode: 'runtime',
    };
  } catch (error) {
    throw new Error(`Runtime analysis failed: ${(error as Error).message}`);
  }
}

/**
 * Display summary information
 */
function displaySummary(
  runtimeData: RuntimeData | null,
  staticData: StaticAnalysisResult | null,
): void {
  if (options.json) {
    return; // JSON output handled separately
  }

  console.log(`${colors.bright}${colors.blue}📊 XcodeBuildMCP Tools Summary${colors.reset}`);
  console.log('═'.repeat(60));

  if (runtimeData) {
    console.log(`${colors.green}🚀 Runtime Analysis:${colors.reset}`);
    console.log(`   Tools: ${runtimeData.toolCount}`);
    console.log(`   Resources: ${runtimeData.resourceCount}`);
    console.log(`   Total: ${runtimeData.toolCount + runtimeData.resourceCount}`);
    console.log();
  }

  if (staticData) {
    console.log(`${colors.cyan}📁 Static Analysis:${colors.reset}`);
    console.log(`   Workflow directories: ${staticData.stats.workflowCount}`);
    console.log(`   Canonical tools: ${staticData.stats.canonicalTools}`);
    console.log(`   Re-export files: ${staticData.stats.reExportTools}`);
    console.log(`   Total tool files: ${staticData.stats.totalTools}`);
    console.log();
  }
}

/**
 * Display workflow information
 */
function displayWorkflows(staticData: StaticAnalysisResult | null): void {
  if (!options.workflows || !staticData || options.json) return;

  console.log(`${colors.bright}📂 Workflow Directories:${colors.reset}`);
  console.log('─'.repeat(40));

  for (const workflow of staticData.workflows) {
    const totalTools = workflow.toolCount;
    console.log(`${colors.green}• ${workflow.displayName}${colors.reset} (${totalTools} tools)`);

    if (options.verbose) {
      const canonicalTools = workflow.tools.filter((t) => t.isCanonical).map((t) => t.name);
      const reExportTools = workflow.tools.filter((t) => !t.isCanonical).map((t) => t.name);

      if (canonicalTools.length > 0) {
        console.log(`  ${colors.cyan}Canonical:${colors.reset} ${canonicalTools.join(', ')}`);
      }
      if (reExportTools.length > 0) {
        console.log(`  ${colors.yellow}Re-exports:${colors.reset} ${reExportTools.join(', ')}`);
      }
    }
  }
  console.log();
}

/**
 * Display tool lists
 */
function displayTools(
  runtimeData: RuntimeData | null,
  staticData: StaticAnalysisResult | null,
): void {
  if (!options.tools || options.json) return;

  if (runtimeData) {
    console.log(`${colors.bright}🛠️  Runtime Tools (${runtimeData.toolCount}):${colors.reset}`);
    console.log('─'.repeat(40));

    if (runtimeData.tools.length === 0) {
      console.log('   No tools available');
    } else {
      runtimeData.tools.forEach((tool) => {
        if (options.verbose && tool.description) {
          console.log(
            `   ${colors.green}•${colors.reset} ${colors.bright}${tool.name}${colors.reset}`,
          );
          console.log(`     ${tool.description}`);
        } else {
          console.log(`   ${colors.green}•${colors.reset} ${tool.name}`);
        }
      });
    }
    console.log();
  }

  if (staticData && options.static) {
    const canonicalTools = staticData.tools.filter((tool) => tool.isCanonical);
    console.log(`${colors.bright}📁 Static Tools (${canonicalTools.length}):${colors.reset}`);
    console.log('─'.repeat(40));

    if (canonicalTools.length === 0) {
      console.log('   No tools found');
    } else {
      canonicalTools
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((tool) => {
          if (options.verbose) {
            console.log(
              `   ${colors.green}•${colors.reset} ${colors.bright}${tool.name}${colors.reset} (${tool.workflow})`,
            );
            console.log(`     ${tool.description}`);
            console.log(`     ${colors.cyan}${tool.relativePath}${colors.reset}`);
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
function displayResources(runtimeData: RuntimeData | null): void {
  if (!options.resources || !runtimeData || options.json) return;

  console.log(`${colors.bright}📚 Resources (${runtimeData.resourceCount}):${colors.reset}`);
  console.log('─'.repeat(40));

  if (runtimeData.resources.length === 0) {
    console.log('   No resources available');
  } else {
    runtimeData.resources.forEach((resource) => {
      if (options.verbose) {
        console.log(
          `   ${colors.magenta}•${colors.reset} ${colors.bright}${resource.uri}${colors.reset}`,
        );
        console.log(`     ${resource.description}`);
      } else {
        console.log(`   ${colors.magenta}•${colors.reset} ${resource.uri}`);
      }
    });
  }
  console.log();
}

/**
 * Output JSON format - matches the structure of human-readable output
 */
function outputJSON(
  runtimeData: RuntimeData | null,
  staticData: StaticAnalysisResult | null,
): void {
  const output: Record<string, unknown> = {};

  // Add summary stats (equivalent to the summary table)
  if (runtimeData) {
    output.runtime = {
      toolCount: runtimeData.toolCount,
      resourceCount: runtimeData.resourceCount,
      totalCount: runtimeData.toolCount + runtimeData.resourceCount,
    };
  }

  if (staticData) {
    output.static = {
      workflowCount: staticData.stats.workflowCount,
      canonicalTools: staticData.stats.canonicalTools,
      reExportTools: staticData.stats.reExportTools,
      totalTools: staticData.stats.totalTools,
    };
  }

  // Add detailed data only if requested
  if (options.workflows && staticData) {
    output.workflows = staticData.workflows.map((w) => ({
      name: w.displayName,
      toolCount: w.toolCount,
      canonicalCount: w.canonicalCount,
      reExportCount: w.reExportCount,
    }));
  }

  if (options.tools) {
    if (runtimeData) {
      output.runtimeTools = runtimeData.tools.map((t) => t.name);
    }
    if (staticData) {
      output.staticTools = staticData.tools
        .filter((t) => t.isCanonical)
        .map((t) => t.name)
        .sort();
    }
  }

  if (options.resources && runtimeData) {
    output.resources = runtimeData.resources.map((r) => r.uri);
  }

  console.log(JSON.stringify(output, null, 2));
}

function isSchemaAuditCommand(commandName: string): boolean {
  return commandName === 'schema' || commandName === 'audit';
}

function displaySchemaAudit(tools: SchemaAuditTool[]): void {
  if (options.json) {
    return;
  }

  console.log(`${colors.bright}Tool Schema Audit:${colors.reset}`);
  console.log('─'.repeat(60));

  if (tools.length === 0) {
    console.log('No tools found.');
    console.log();
    return;
  }

  for (const tool of tools) {
    const toolDescription = tool.description ?? 'No description provided';
    console.log(`Tool Name: ${tool.name}`);
    console.log(`Tool Description: ${toolDescription}`);
    console.log(`Arguments (${tool.args.length}):`);

    if (tool.args.length === 0) {
      console.log('  (none)');
    } else {
      for (const arg of tool.args) {
        const argDescription = arg.description ?? 'No description provided';
        console.log(`  Argument Name: ${arg.name}`);
        console.log(`  Argument Description: ${argDescription}`);
      }
    }

    console.log();
  }
}

function outputSchemaAuditJSON(tools: SchemaAuditTool[]): void {
  console.log(
    JSON.stringify(
      {
        mode: 'schema-audit',
        toolCount: tools.length,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          args: tool.args.map((arg) => ({
            name: arg.name,
            description: arg.description,
          })),
        })),
      },
      null,
      2,
    ),
  );
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    let runtimeData: RuntimeData | null = null;
    let staticData: StaticAnalysisResult | null = null;
    let schemaAuditTools: SchemaAuditTool[] | null = null;
    const schemaAuditCommand = isSchemaAuditCommand(command);

    // Gather data based on options
    if (options.runtime && !schemaAuditCommand) {
      if (!options.json) {
        console.log(`${colors.cyan}🔍 Gathering runtime information...${colors.reset}`);
      }
      runtimeData = await getRuntimeInfo();
    }

    if (options.static && !schemaAuditCommand) {
      if (!options.json) {
        console.log(`${colors.cyan}📁 Performing static analysis...${colors.reset}`);
      }
      staticData = await getStaticToolAnalysis();
    }

    // For default command or workflows option, always gather static data for workflow info
    if (options.workflows && !staticData && !schemaAuditCommand) {
      if (!options.json) {
        console.log(`${colors.cyan}📁 Gathering workflow information...${colors.reset}`);
      }
      staticData = await getStaticToolAnalysis();
    }

    if (schemaAuditCommand) {
      if (!options.json) {
        console.log(`${colors.cyan}Gathering tool schema details...${colors.reset}`);
      }
      schemaAuditTools = await getSchemaAuditTools();
    }

    if (!options.json) {
      console.log(); // Blank line after gathering
    }

    // Handle JSON output
    if (options.json) {
      if (schemaAuditCommand) {
        outputSchemaAuditJSON(schemaAuditTools ?? []);
      } else {
        outputJSON(runtimeData, staticData);
      }
      return;
    }

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
          staticData = await getStaticToolAnalysis();
        }
        displaySummary(null, staticData);
        displayWorkflows(staticData);

        if (options.verbose) {
          displayTools(null, staticData);
          const reExportTools = staticData.tools.filter((t) => !t.isCanonical);
          console.log(
            `${colors.bright}🔄 Re-export Files (${reExportTools.length}):${colors.reset}`,
          );
          console.log('─'.repeat(40));
          reExportTools.forEach((file) => {
            console.log(`   ${colors.yellow}•${colors.reset} ${file.name} (${file.workflow})`);
            console.log(`     ${file.relativePath}`);
          });
        }
        break;

      case 'schema':
      case 'audit':
        if (!schemaAuditTools) {
          schemaAuditTools = await getSchemaAuditTools();
        }
        displaySchemaAudit(schemaAuditTools);
        break;

      default:
        // Default case (no command) - show runtime summary with workflows
        displaySummary(runtimeData, staticData);
        displayWorkflows(staticData);
        break;
    }

    if (!options.json) {
      console.log(`${colors.green}✅ Analysis complete!${colors.reset}`);
    }
  } catch (error) {
    if (options.json) {
      console.error(
        JSON.stringify(
          {
            success: false,
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`${colors.red}❌ Error: ${(error as Error).message}${colors.reset}`);
    }
    process.exit(1);
  }
}

// Run the CLI
main();
