import type { ToolResponse, OutputStyle } from '../types/common.ts';
import { processToolResponse } from '../utils/responses/index.ts';

export type OutputFormat = 'text' | 'json';

export interface PrintToolResponseOptions {
  format?: OutputFormat;
  style?: OutputStyle;
}

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

/**
 * Print a tool response to the terminal.
 * Applies runtime-aware rendering of next steps for CLI output.
 */
export function printToolResponse(
  response: ToolResponse,
  options: PrintToolResponseOptions = {},
): void {
  const { format = 'text', style = 'normal' } = options;

  // Apply next steps rendering for CLI runtime
  const processed = processToolResponse(response, 'cli', style);

  if (format === 'json') {
    writeLine(JSON.stringify(processed, null, 2));
  } else {
    printToolResponseText(processed);
  }

  if (response.isError) {
    process.exitCode = 1;
  }
}

/**
 * Print tool response content as text.
 */
function printToolResponseText(response: ToolResponse): void {
  for (const item of response.content ?? []) {
    if (item.type === 'text') {
      writeLine(item.text);
    } else if (item.type === 'image') {
      // For images, show a placeholder with metadata
      const sizeKb = Math.round((item.data.length * 3) / 4 / 1024);
      writeLine(`[Image: ${item.mimeType}, ~${sizeKb}KB base64]`);
      writeLine('  Use --output json to get the full image data');
    }
  }
}

/**
 * Get the base tool name without workflow prefix.
 * For disambiguated tools, strips the workflow prefix.
 */
function getBaseToolName(cliName: string, workflow: string): string {
  const prefix = `${workflow}-`;
  if (cliName.startsWith(prefix)) {
    return cliName.slice(prefix.length);
  }
  return cliName;
}

/**
 * Format a tool list for display.
 */
export function formatToolList(
  tools: Array<{ cliName: string; workflow: string; description?: string; stateful: boolean }>,
  options: { grouped?: boolean; verbose?: boolean } = {},
): string {
  const lines: string[] = [];

  if (options.grouped) {
    // Group by workflow - show subcommand names
    const byWorkflow = new Map<string, typeof tools>();
    for (const tool of tools) {
      const existing = byWorkflow.get(tool.workflow) ?? [];
      byWorkflow.set(tool.workflow, [...existing, tool]);
    }

    const sortedWorkflows = [...byWorkflow.keys()].sort();
    for (const workflow of sortedWorkflows) {
      lines.push(`\n${workflow}:`);
      const workflowTools = byWorkflow.get(workflow) ?? [];
      // Sort by base name (without prefix)
      const sortedTools = workflowTools.sort((a, b) => {
        const aBase = getBaseToolName(a.cliName, a.workflow);
        const bBase = getBaseToolName(b.cliName, b.workflow);
        return aBase.localeCompare(bBase);
      });

      for (const tool of sortedTools) {
        // Show subcommand name (without workflow prefix)
        const toolName = getBaseToolName(tool.cliName, tool.workflow);
        const statefulMarker = tool.stateful ? ' [stateful]' : '';
        if (options.verbose && tool.description) {
          lines.push(`  ${toolName}${statefulMarker}`);
          lines.push(`    ${tool.description}`);
        } else {
          const desc = tool.description ? ` - ${truncate(tool.description, 60)}` : '';
          lines.push(`  ${toolName}${statefulMarker}${desc}`);
        }
      }
    }
  } else {
    // Flat list - show full workflow-scoped command
    const sortedTools = [...tools].sort((a, b) => {
      const aFull = `${a.workflow} ${getBaseToolName(a.cliName, a.workflow)}`;
      const bFull = `${b.workflow} ${getBaseToolName(b.cliName, b.workflow)}`;
      return aFull.localeCompare(bFull);
    });

    for (const tool of sortedTools) {
      const toolName = getBaseToolName(tool.cliName, tool.workflow);
      const fullCommand = `${tool.workflow} ${toolName}`;
      const statefulMarker = tool.stateful ? ' [stateful]' : '';
      if (options.verbose && tool.description) {
        lines.push(`${fullCommand}${statefulMarker}`);
        lines.push(`  ${tool.description}`);
      } else {
        const desc = tool.description ? ` - ${truncate(tool.description, 60)}` : '';
        lines.push(`${fullCommand}${statefulMarker}${desc}`);
      }
    }
  }

  return lines.join('\n');
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
