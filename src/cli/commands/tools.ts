import type { Argv } from 'yargs';
import { formatToolList } from '../output.ts';
import {
  loadManifest,
  type ResolvedManifest,
  type ToolManifestEntry,
} from '../../core/manifest/load-manifest.ts';
import { getEffectiveCliName } from '../../core/manifest/schema.ts';
import { isWorkflowEnabledForRuntime, isToolExposedForRuntime } from '../../visibility/exposure.ts';
import type { PredicateContext } from '../../visibility/predicate-types.ts';
import { getConfig } from '../../utils/config-store.ts';
import { getMcpBridgeAvailability } from '../../integrations/xcode-tools-bridge/core.ts';

const CLI_EXCLUDED_WORKFLOWS = new Set(['session-management', 'workflow-discovery']);

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

type ToolListItem = {
  cliName: string;
  command: string;
  workflow: string;
  description: string;
  stateful: boolean;
  isCanonical: boolean;
  originWorkflow?: string;
};

type JsonToolBase = {
  name: string;
  command: string;
  description: string;
  stateful: boolean;
};

type JsonTool = JsonToolBase & {
  canonicalWorkflow?: string;
};

type JsonToolWithWorkflow = JsonTool & {
  workflow: string;
};

function toJsonToolBase(tool: ToolListItem): JsonToolBase {
  return {
    name: tool.cliName,
    command: tool.command,
    description: tool.description,
    stateful: tool.stateful,
  };
}

function withCanonicalWorkflow<T extends object>(
  tool: ToolListItem,
  base: T,
): T & {
  canonicalWorkflow?: string;
} {
  if (!tool.isCanonical && tool.originWorkflow) {
    return { ...base, canonicalWorkflow: tool.originWorkflow };
  }

  return base;
}

function toFlatJsonTool(tool: ToolListItem): JsonToolWithWorkflow {
  const base = {
    workflow: tool.workflow,
    ...toJsonToolBase(tool),
  };

  return withCanonicalWorkflow(tool, base);
}

function toGroupedJsonTool(tool: ToolListItem): JsonTool {
  return withCanonicalWorkflow(tool, toJsonToolBase(tool));
}

/**
 * Build CLI predicate context.
 * CLI is never running under Xcode and never has Xcode tools active.
 */
async function buildCliPredicateContext(): Promise<PredicateContext> {
  const bridge = await getMcpBridgeAvailability();
  return {
    runtime: 'cli',
    config: getConfig(),
    runningUnderXcode: false,
    xcodeToolsActive: false,
    xcodeToolsAvailable: bridge.available,
  };
}

/**
 * Build tool list from YAML manifest with predicate filtering.
 */
async function buildToolList(manifest: ResolvedManifest): Promise<ToolListItem[]> {
  const tools: ToolListItem[] = [];
  const seenToolIds = new Set<string>();
  const ctx = await buildCliPredicateContext();

  // Get all CLI-available workflows that pass predicate checks
  const cliWorkflows = Array.from(manifest.workflows.values()).filter(
    (wf) => !CLI_EXCLUDED_WORKFLOWS.has(wf.id) && isWorkflowEnabledForRuntime(wf, ctx),
  );

  for (const workflow of cliWorkflows) {
    for (const toolId of workflow.tools) {
      const tool = manifest.tools.get(toolId);
      if (!tool) continue;

      // Check tool availability and predicates for CLI
      if (!isToolExposedForRuntime(tool, ctx)) continue;

      const cliName = getEffectiveCliName(tool);

      // Determine if this is a canonical tool or re-export
      const isCanonical = isToolCanonicalInWorkflow(tool, workflow.id);
      const originWorkflow = isCanonical ? undefined : getCanonicalWorkflow(tool);

      // Track seen tools to avoid duplicates
      const toolKey = `${workflow.id}:${toolId}`;
      if (seenToolIds.has(toolKey)) continue;
      seenToolIds.add(toolKey);

      tools.push({
        cliName,
        command: `${workflow.id} ${cliName}`,
        workflow: workflow.id,
        description: tool.description ?? '',
        stateful: tool.routing?.stateful ?? false,
        isCanonical,
        originWorkflow,
      });
    }
  }

  return tools;
}

/**
 * Determine if a tool is canonical in a given workflow.
 * A tool is canonical if its module path matches the workflow ID.
 */
function isToolCanonicalInWorkflow(tool: ToolManifestEntry, workflowId: string): boolean {
  // Check if the module path contains the workflow ID
  // e.g., "mcp/tools/simulator/build_sim" is canonical for "simulator"
  const moduleParts = tool.module.split('/');
  const workflowPart = moduleParts[2]; // mcp/tools/<workflow>/<tool>
  return workflowPart === workflowId;
}

/**
 * Get the canonical workflow for a tool based on its module path.
 */
function getCanonicalWorkflow(tool: ToolManifestEntry): string | undefined {
  const moduleParts = tool.module.split('/');
  if (moduleParts.length >= 3) {
    return moduleParts[2]; // mcp/tools/<workflow>/<tool>
  }
  return undefined;
}

/**
 * Register the 'tools' command for listing available tools.
 */
export function registerToolsCommand(app: Argv): void {
  app.command(
    'tools',
    'List available tools',
    (yargs) => {
      return yargs
        .option('flat', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Show flat list instead of grouped by workflow',
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          default: false,
          describe: 'Show full descriptions',
        })
        .option('json', {
          type: 'boolean',
          default: false,
          describe: 'Output as JSON',
        })
        .option('workflow', {
          alias: 'w',
          type: 'string',
          describe: 'Filter by workflow name',
        });
    },
    async (argv) => {
      const manifest = loadManifest();
      let tools = await buildToolList(manifest);

      // Filter by workflow if specified
      if (argv.workflow) {
        const workflowFilter = (argv.workflow as string).toLowerCase();
        tools = tools.filter((t) => t.workflow.toLowerCase() === workflowFilter);
      }

      if (argv.json) {
        if (argv.flat) {
          const flatTools = [...tools]
            .sort((a, b) => {
              const aKey = `${a.workflow} ${a.cliName}`;
              const bKey = `${b.workflow} ${b.cliName}`;
              return aKey.localeCompare(bKey);
            })
            .map((tool) => toFlatJsonTool(tool));

          const canonicalCount = flatTools.filter((t) => !t.canonicalWorkflow).length;
          writeLine(
            JSON.stringify(
              {
                canonicalToolCount: canonicalCount,
                toolCount: flatTools.length,
                tools: flatTools,
              },
              null,
              2,
            ),
          );
          return;
        }

        const workflows = new Map<string, ToolListItem[]>();
        for (const tool of tools) {
          const workflowTools = workflows.get(tool.workflow) ?? [];
          workflowTools.push(tool);
          workflows.set(tool.workflow, workflowTools);
        }

        const grouped = Array.from(workflows.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([workflow, workflowTools]) => ({
            workflow,
            tools: [...workflowTools]
              .sort((a, b) => a.cliName.localeCompare(b.cliName))
              .map((tool) => toGroupedJsonTool(tool)),
          }));

        const canonicalCount = tools.filter((t) => t.isCanonical).length;
        writeLine(
          JSON.stringify(
            {
              workflowCount: grouped.length,
              canonicalToolCount: canonicalCount,
              toolCount: tools.length,
              workflows: grouped,
            },
            null,
            2,
          ),
        );
      } else {
        const totalCount = tools.length;
        const canonicalCount = tools.filter((t) => t.isCanonical).length;
        writeLine(`Available tools (${canonicalCount} canonical, ${totalCount} total):\n`);
        // Default to grouped view (use --flat for flat list)
        writeLine(
          formatToolList(tools, {
            grouped: !argv.flat,
            verbose: argv.verbose as boolean,
          }),
        );
      }
    },
  );
}
