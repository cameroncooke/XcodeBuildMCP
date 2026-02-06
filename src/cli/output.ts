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
 * Format a tool list for display.
 */
export function formatToolList(
  tools: Array<{ cliName: string; workflow: string; description?: string; stateful: boolean }>,
  options: { grouped?: boolean; verbose?: boolean } = {},
): string {
  const lines: string[] = [];

  if (options.grouped) {
    const byWorkflow = new Map<string, typeof tools>();
    for (const tool of tools) {
      const existing = byWorkflow.get(tool.workflow) ?? [];
      byWorkflow.set(tool.workflow, [...existing, tool]);
    }

    const sortedWorkflows = [...byWorkflow.keys()].sort();
    for (const workflow of sortedWorkflows) {
      lines.push(`\n${workflow}:`);
      const workflowTools = byWorkflow.get(workflow) ?? [];
      const sortedTools = workflowTools.sort((a, b) => a.cliName.localeCompare(b.cliName));

      for (const tool of sortedTools) {
        const statefulMarker = tool.stateful ? ' [stateful]' : '';
        if (options.verbose && tool.description) {
          lines.push(`  ${tool.cliName}${statefulMarker}`);
          lines.push(`    ${tool.description}`);
        } else {
          const desc = tool.description ? ` - ${truncate(tool.description, 60)}` : '';
          lines.push(`  ${tool.cliName}${statefulMarker}${desc}`);
        }
      }
    }
  } else {
    const sortedTools = [...tools].sort((a, b) => {
      const aFull = `${a.workflow} ${a.cliName}`;
      const bFull = `${b.workflow} ${b.cliName}`;
      return aFull.localeCompare(bFull);
    });

    for (const tool of sortedTools) {
      const fullCommand = `${tool.workflow} ${tool.cliName}`;
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
