import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Argv } from 'yargs';
import { formatToolList } from '../output.ts';

type ToolsManifestEntry = {
  name: string;
  cliName: string;
  workflow: string;
  description: string;
  originWorkflow?: string;
  isCanonical: boolean;
  stateful: boolean;
};

type ToolsManifest = {
  tools: ToolsManifestEntry[];
};

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, 'tools-manifest.json');
const CLI_EXCLUDED_WORKFLOWS = new Set(['session-management', 'workflow-discovery']);

function loadManifest(): ToolsManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing tools manifest at ${manifestPath}. Run "npm run build" first.`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as ToolsManifest;
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
    (argv) => {
      const manifest = loadManifest();
      let tools: ToolListItem[] = manifest.tools
        .filter((t) => !CLI_EXCLUDED_WORKFLOWS.has(t.workflow))
        .map((t) => ({
          cliName: t.cliName,
          command: `${t.workflow} ${t.cliName}`,
          workflow: t.workflow,
          description: t.description,
          stateful: t.stateful,
          isCanonical: t.isCanonical,
          originWorkflow: t.originWorkflow,
        }));

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

          writeLine(
            JSON.stringify(
              {
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

        writeLine(
          JSON.stringify(
            {
              workflowCount: grouped.length,
              toolCount: tools.length,
              workflows: grouped,
            },
            null,
            2,
          ),
        );
      } else {
        const count = tools.length;
        writeLine(`Available tools (${count}):\n`);
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
