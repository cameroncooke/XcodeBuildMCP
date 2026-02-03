#!/usr/bin/env node

/**
 * XcodeBuildMCP Tools Documentation Updater
 *
 * Automatically updates docs/TOOLS.md and docs/TOOLS-CLI.md with current tool and workflow information
 * using the build tools manifest.
 *
 * Usage:
 *   npx tsx scripts/update-tools-docs.ts [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run, -d       Show what would be updated without making changes
 *   --verbose, -v       Show detailed information about the update process
 *   --help, -h         Show this help message
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get project paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsPath = path.join(projectRoot, 'docs', 'TOOLS.md');
const docsCliPath = path.join(projectRoot, 'docs', 'TOOLS-CLI.md');
const manifestPath = path.join(projectRoot, 'build', 'tools-manifest.json');
const cliExcludedWorkflows = new Set(['session-management', 'workflow-discovery']);

type ToolsManifest = {
  generatedAt: string;
  stats: {
    totalTools: number;
    canonicalTools: number;
    reExportTools: number;
    workflowCount: number;
  };
  workflows: DocumentationWorkflow[];
  tools: DocumentationTool[];
};

// CLI options
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
};

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

if (options.help) {
  console.log(`
${colors.bright}${colors.blue}XcodeBuildMCP Tools Documentation Updater${colors.reset}

Automatically updates docs/TOOLS.md and docs/TOOLS-CLI.md with current tool and workflow information.

${colors.bright}Usage:${colors.reset}
  npx tsx scripts/update-tools-docs.ts [options]

${colors.bright}Options:${colors.reset}
  --dry-run, -d       Show what would be updated without making changes
  --verbose, -v       Show detailed information about the update process
  --help, -h         Show this help message

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npx tsx scripts/update-tools-docs.ts${colors.reset}                    # Update docs/TOOLS.md + docs/TOOLS-CLI.md
  ${colors.cyan}npx tsx scripts/update-tools-docs.ts --dry-run${colors.reset}          # Preview changes
  ${colors.cyan}npx tsx scripts/update-tools-docs.ts --verbose${colors.reset}          # Show detailed progress
`);
  process.exit(0);
}

/**
 * Generate the workflow section content
 */
function cleanToolDescription(description: string | undefined): string {
  if (!description) {
    return 'No description available';
  }

  return description
    .replace(/IMPORTANT:.*?Example:.*?\)/g, '') // Remove IMPORTANT sections
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

type DocumentationTool = {
  name: string;
  description?: string;
  isCanonical?: boolean;
  originWorkflowDisplayName?: string;
  workflow?: string;
  cliName?: string;
  originWorkflow?: string;
};

type DocumentationWorkflow = {
  name: string;
  displayName: string;
  description: string;
};

function generateWorkflowSection(
  workflow: DocumentationWorkflow,
  tools: DocumentationTool[],
): string {
  const toolCount = tools.length;

  let content = `### ${workflow.displayName} (\`${workflow.name}\`)\n`;
  content += `**Purpose**: ${workflow.description} (${toolCount} tools)\n\n`;

  // List each tool with its description
  const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  for (const tool of sortedTools) {
    let description = tool.description;
    if (tool.isCanonical === false) {
      if (tool.originWorkflowDisplayName) {
        description = `Defined in ${tool.originWorkflowDisplayName} workflow.`;
      } else {
        description = 'Defined in another workflow.';
      }
    }

    const cleanDescription = cleanToolDescription(description);
    content += `- \`${tool.name}\` - ${cleanDescription}\n`;
  }

  content += '\n\n';

  return content;
}

function loadManifest(): ToolsManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Missing tools manifest at ${path.relative(projectRoot, manifestPath)}. Run \"npm run build\" first.`,
    );
  }

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as ToolsManifest;
}

/**
 * Generate the complete TOOLS.md content
 */
function generateToolsDocumentation(manifest: ToolsManifest): string {
  const { workflows, stats, tools } = manifest;

  // Sort workflows by display name for consistent ordering
  const sortedWorkflows = [...workflows].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const workflowMeta = new Map(workflows.map((workflow) => [workflow.name, workflow]));
  const toolsByWorkflow = new Map<string, DocumentationTool[]>();
  for (const tool of tools) {
    const workflowKey = tool.workflow ?? '';
    const workflowTools = toolsByWorkflow.get(workflowKey) ?? [];
    workflowTools.push(tool);
    toolsByWorkflow.set(workflowKey, workflowTools);
  }
  const workflowSections = sortedWorkflows
    .map((workflow) => {
      const workflowTools = toolsByWorkflow.get(workflow.name) ?? [];
      const docTools = workflowTools.map((tool) => {
        const originWorkflow = tool.originWorkflow
          ? workflowMeta.get(tool.originWorkflow)?.displayName ?? tool.originWorkflow
          : undefined;

        return {
          name: tool.name,
          description: tool.description,
          isCanonical: tool.isCanonical,
          originWorkflowDisplayName: originWorkflow,
        };
      });

      return generateWorkflowSection(
        {
          name: workflow.name,
          displayName: workflow.displayName,
          description: workflow.description,
        },
        docTools,
      );
    })
    .join('\n');

  const lastUpdated = `${new Date(manifest.generatedAt).toISOString()} UTC`;

  const content = `# XcodeBuildMCP MCP Tools Reference

This document lists MCP tool names as exposed to MCP clients. XcodeBuildMCP provides ${stats.canonicalTools} canonical tools organized into ${stats.workflowCount} workflow groups for comprehensive Apple development workflows.

## Workflow Groups

${workflowSections}
## Summary Statistics

- **Canonical Tools**: ${stats.canonicalTools}
- **Total Tools**: ${stats.totalTools}
- **Workflow Groups**: ${stats.workflowCount}

---

*This documentation is automatically generated by \`scripts/update-tools-docs.ts\` from the tools manifest. Last updated: ${lastUpdated}*
`;

  return content;
}

/**
 * Generate CLI tools documentation content
 */
type CliDocumentationStats = {
  toolCount: number;
  canonicalToolCount: number;
  workflowCount: number;
};

type CliDocumentationResult = {
  content: string;
  stats: CliDocumentationStats;
};

function generateCliToolsDocumentation(manifest: ToolsManifest): CliDocumentationResult {
  const workflowMeta = new Map(manifest.workflows.map((workflow) => [workflow.name, workflow]));
  const toolsByWorkflow = new Map<string, DocumentationTool[]>();
  let canonicalToolCount = 0;
  for (const tool of manifest.tools) {
    if (cliExcludedWorkflows.has(tool.workflow)) {
      continue;
    }

    if (tool.isCanonical) {
      canonicalToolCount++;
    }

    const tools = toolsByWorkflow.get(tool.workflow) ?? [];
    const originWorkflow = tool.originWorkflow
      ? workflowMeta.get(tool.originWorkflow)?.displayName ?? tool.originWorkflow
      : undefined;

    tools.push({
      name: tool.cliName ?? tool.name,
      description: tool.description,
      isCanonical: tool.isCanonical,
      originWorkflowDisplayName: originWorkflow,
    });
    toolsByWorkflow.set(tool.workflow, tools);
  }

  const sortedWorkflows = [...manifest.workflows]
    .filter((workflow) => toolsByWorkflow.has(workflow.name))
    .filter((workflow) => !cliExcludedWorkflows.has(workflow.name))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const workflowSections = sortedWorkflows
    .map((workflow) => {
      const tools = toolsByWorkflow.get(workflow.name) ?? [];
      const meta = workflowMeta.get(workflow.name);
      return generateWorkflowSection(
        {
          name: workflow.name,
          displayName: meta?.displayName ?? workflow.name,
          description: meta?.description ?? `${workflow.name} related tools`,
        },
        tools,
      );
    })
    .join('\n');

  const workflowCount = sortedWorkflows.length;
  const totalTools = Array.from(toolsByWorkflow.values()).reduce(
    (sum, tools) => sum + tools.length,
    0,
  );

  const lastUpdated = `${new Date(manifest.generatedAt).toISOString()} UTC`;

  const content = `# XcodeBuildMCP CLI Tools Reference

This document lists CLI tool names as exposed by \`xcodebuildmcp <workflow> <tool>\`.

XcodeBuildMCP provides ${canonicalToolCount} canonical tools organized into ${workflowCount} workflow groups.

## Workflow Groups

${workflowSections}
## Summary Statistics

- **Canonical Tools**: ${canonicalToolCount}
- **Total Tools**: ${totalTools}
- **Workflow Groups**: ${workflowCount}

---

*This documentation is automatically generated by \`scripts/update-tools-docs.ts\` from the tools manifest. Last updated: ${lastUpdated}*
`;

  return {
    content,
    stats: {
      toolCount: totalTools,
      canonicalToolCount,
      workflowCount,
    },
  };
}

/**
 * Compare old and new content to show what changed
 */
function showDiff(oldContent: string, newContent: string): void {
  if (!options.verbose) return;

  console.log(`${colors.bright}${colors.cyan}📄 Content Comparison:${colors.reset}`);
  console.log('─'.repeat(50));

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const maxLength = Math.max(oldLines.length, newLines.length);
  let changes = 0;

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine !== newLine) {
      changes++;
      if (changes <= 10) {
        // Show first 10 changes
        console.log(`${colors.red}- Line ${i + 1}: ${oldLine}${colors.reset}`);
        console.log(`${colors.green}+ Line ${i + 1}: ${newLine}${colors.reset}`);
      }
    }
  }

  if (changes > 10) {
    console.log(`${colors.yellow}... and ${changes - 10} more changes${colors.reset}`);
  }

  console.log(`${colors.blue}Total changes: ${changes} lines${colors.reset}\n`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log(
      `${colors.bright}${colors.blue}🔧 XcodeBuildMCP Tools Documentation Updater${colors.reset}`,
    );

    if (options.dryRun) {
      console.log(
        `${colors.yellow}🔍 Running in dry-run mode - no files will be modified${colors.reset}`,
      );
    }

    console.log(`${colors.cyan}📊 Analyzing tools...${colors.reset}`);

    const manifest = loadManifest();

    if (options.verbose) {
      console.log(
        `${colors.green}✓ Found ${manifest.stats.canonicalTools} canonical tools in ${manifest.stats.workflowCount} workflows${colors.reset}`,
      );
    }

    // Generate new documentation content
    console.log(`${colors.cyan}📝 Generating documentation...${colors.reset}`);
    const mcpContent = generateToolsDocumentation(manifest);
    const cliDocumentation = generateCliToolsDocumentation(manifest);
    const cliContent = cliDocumentation.content;
    const cliStats = cliDocumentation.stats;

    const targets = [
      { label: 'MCP tools', path: docsPath, content: mcpContent },
      { label: 'CLI tools', path: docsCliPath, content: cliContent },
    ];

    const changes = targets.map((target) => {
      const existing = fs.existsSync(target.path)
        ? fs.readFileSync(target.path, 'utf-8')
        : '';

      const changed = existing !== target.content;
      return { ...target, existing, changed };
    });

    const changedTargets = changes.filter((target) => target.changed);

    // Check if content has changed
    if (changedTargets.length === 0) {
      console.log(`${colors.green}✅ Documentation is already up to date!${colors.reset}`);
      return;
    }

    // Show differences if verbose
    if (options.verbose) {
      for (const target of changedTargets) {
        if (target.existing) {
          console.log(
            `${colors.bright}${colors.magenta}📄 ${target.label} content comparison:${colors.reset}`,
          );
          showDiff(target.existing, target.content);
        }
      }
    }

    if (options.dryRun) {
      console.log(
        `${colors.yellow}📋 Dry run completed. Documentation would be updated with:${colors.reset}`,
      );
      for (const target of changedTargets) {
        console.log(`   - ${path.relative(projectRoot, target.path)} (${target.label})`);
      }
      console.log(`   - MCP tools: ${manifest.stats.canonicalTools} canonical tools`);
      console.log(`   - CLI tools: ${cliStats.toolCount} tools across ${cliStats.workflowCount} workflows`);
      console.log(`   - MCP lines: ${mcpContent.split('\n').length}`);
      console.log(`   - CLI lines: ${cliContent.split('\n').length}`);

      if (!options.verbose) {
        console.log(`\n${colors.cyan}💡 Use --verbose to see detailed changes${colors.reset}`);
      }

      return;
    }

    // Write new content
    console.log(`${colors.cyan}✏️  Writing updated documentation...${colors.reset}`);
    for (const target of changedTargets) {
      fs.writeFileSync(target.path, target.content, 'utf-8');
      console.log(
        `${colors.green}✅ Successfully updated ${path.relative(projectRoot, target.path)}!${colors.reset}`,
      );
    }

    if (options.verbose) {
      console.log(`\n${colors.bright}📈 Update Summary:${colors.reset}`);
      console.log(
        `   MCP tools: ${manifest.stats.canonicalTools} canonical (${manifest.stats.totalTools} total)`,
      );
      console.log(`   MCP workflows: ${manifest.stats.workflowCount}`);
      console.log(`   CLI tools: ${cliStats.toolCount} across ${cliStats.workflowCount} workflows`);
      console.log(`   MCP file size: ${(mcpContent.length / 1024).toFixed(1)}KB`);
      console.log(`   CLI file size: ${(cliContent.length / 1024).toFixed(1)}KB`);
      console.log(`   MCP lines: ${mcpContent.split('\n').length}`);
      console.log(`   CLI lines: ${cliContent.split('\n').length}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the updater
main();
