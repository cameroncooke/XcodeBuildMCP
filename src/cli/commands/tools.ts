import type { Argv } from 'yargs';
import type { ToolCatalog } from '../../runtime/types.ts';
import { formatToolList } from '../output.ts';

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

/**
 * Register the 'tools' command for listing available tools.
 */
export function registerToolsCommand(app: Argv, catalog: ToolCatalog): void {
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
      let tools = catalog.tools.map((t) => ({
        cliName: t.cliName,
        mcpName: t.mcpName,
        workflow: t.workflow,
        description: t.description,
        stateful: t.stateful,
      }));

      // Filter by workflow if specified
      if (argv.workflow) {
        const workflowFilter = (argv.workflow as string).toLowerCase();
        tools = tools.filter((t) => t.workflow.toLowerCase().includes(workflowFilter));
      }

      if (argv.json) {
        writeLine(JSON.stringify(tools, null, 2));
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
