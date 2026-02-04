import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { resolveSelectedWorkflows } from '../utils/workflow-selection.ts';
import { shouldExposeTool } from '../utils/tool-visibility.ts';
import type { ToolCatalog, ToolDefinition, ToolResolution } from './types.ts';
import { toKebabCase, disambiguateCliNames } from './naming.ts';

export async function buildToolCatalog(opts: {
  enabledWorkflows: string[];
  excludeWorkflows?: string[];
}): Promise<ToolCatalog> {
  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(opts.enabledWorkflows, workflowGroups);

  const excludeSet = new Set(opts.excludeWorkflows?.map((w) => w.toLowerCase()) ?? []);
  const tools: ToolDefinition[] = [];

  for (const wf of selection.selectedWorkflows) {
    if (excludeSet.has(wf.directoryName.toLowerCase())) {
      continue;
    }
    for (const tool of wf.tools) {
      if (!shouldExposeTool(wf.directoryName, tool.name)) {
        continue;
      }
      const baseCliName = tool.cli?.name ?? toKebabCase(tool.name);
      tools.push({
        cliName: baseCliName, // Will be disambiguated below
        mcpName: tool.name,
        workflow: wf.directoryName,
        description: tool.description,
        annotations: tool.annotations,
        mcpSchema: tool.schema,
        cliSchema: tool.cli?.schema ?? tool.schema,
        stateful: Boolean(tool.cli?.stateful),
        daemonAffinity: tool.cli?.daemonAffinity,
        handler: tool.handler,
      });
    }
  }

  const disambiguated = disambiguateCliNames(tools);

  return createCatalog(disambiguated);
}

function createCatalog(tools: ToolDefinition[]): ToolCatalog {
  // Build lookup maps for fast resolution
  const byCliName = new Map<string, ToolDefinition>();
  const byMcpName = new Map<string, ToolDefinition>();
  const byMcpKebab = new Map<string, ToolDefinition[]>();

  for (const tool of tools) {
    byCliName.set(tool.cliName, tool);
    byMcpName.set(tool.mcpName.toLowerCase(), tool);

    // Also index by the kebab-case of MCP name (for aliases)
    const mcpKebab = toKebabCase(tool.mcpName);
    const existing = byMcpKebab.get(mcpKebab) ?? [];
    byMcpKebab.set(mcpKebab, [...existing, tool]);
  }

  return {
    tools,

    getByCliName(name: string): ToolDefinition | null {
      return byCliName.get(name) ?? null;
    },

    getByMcpName(name: string): ToolDefinition | null {
      return byMcpName.get(name.toLowerCase().trim()) ?? null;
    },

    resolve(input: string): ToolResolution {
      const normalized = input.toLowerCase().trim();

      // Try exact CLI name match first
      const exact = byCliName.get(normalized);
      if (exact) {
        return { tool: exact };
      }

      // Try kebab-case of MCP name (alias)
      const mcpKebab = toKebabCase(normalized);
      const aliasMatches = byMcpKebab.get(mcpKebab);
      if (aliasMatches && aliasMatches.length === 1) {
        return { tool: aliasMatches[0] };
      }
      if (aliasMatches && aliasMatches.length > 1) {
        return { ambiguous: aliasMatches.map((t) => t.cliName) };
      }

      // Try matching by MCP name directly (for underscore-style names)
      const byMcpDirect = tools.find((t) => t.mcpName.toLowerCase() === normalized);
      if (byMcpDirect) {
        return { tool: byMcpDirect };
      }

      return { notFound: true };
    },
  };
}

/**
 * Get a list of all available tool names for display.
 */
export function listToolNames(catalog: ToolCatalog): string[] {
  return catalog.tools.map((t) => t.cliName).sort();
}

/**
 * Get tools grouped by workflow for display.
 */
export function groupToolsByWorkflow(catalog: ToolCatalog): Map<string, ToolDefinition[]> {
  const groups = new Map<string, ToolDefinition[]>();

  for (const tool of catalog.tools) {
    const existing = groups.get(tool.workflow) ?? [];
    groups.set(tool.workflow, [...existing, tool]);
  }

  return groups;
}
