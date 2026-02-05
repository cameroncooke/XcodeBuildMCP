import type { ToolCatalog, ToolInvoker, InvokeOptions } from './types.ts';
import type { ToolResponse } from '../types/common.ts';
import { createErrorResponse } from '../utils/responses/index.ts';
import { DaemonClient } from '../cli/daemon-client.ts';
import { ensureDaemonRunning, DEFAULT_DAEMON_STARTUP_TIMEOUT_MS } from '../cli/daemon-control.ts';

/**
 * Enrich nextSteps for CLI rendering.
 * Resolves MCP tool names to their workflow and CLI command name.
 */
function enrichNextStepsForCli(response: ToolResponse, catalog: ToolCatalog): ToolResponse {
  if (!response.nextSteps || response.nextSteps.length === 0) {
    return response;
  }

  return {
    ...response,
    nextSteps: response.nextSteps.map((step) => {
      const target = catalog.getByMcpName(step.tool);
      if (!target) {
        return step;
      }

      return {
        ...step,
        workflow: target.workflow,
        cliTool: target.cliName, // Canonical CLI name from manifest
      };
    }),
  };
}

export class DefaultToolInvoker implements ToolInvoker {
  constructor(private catalog: ToolCatalog) {}

  async invoke(
    toolName: string,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const resolved = this.catalog.resolve(toolName);

    if (resolved.ambiguous) {
      return createErrorResponse(
        'Ambiguous tool name',
        `Multiple tools match '${toolName}'. Use one of:\n- ${resolved.ambiguous.join('\n- ')}`,
      );
    }

    if (resolved.notFound || !resolved.tool) {
      return createErrorResponse(
        'Tool not found',
        `Unknown tool '${toolName}'. Run 'xcodebuildmcp tools' to see available tools.`,
      );
    }

    const tool = resolved.tool;

    const daemonAffinity = tool.daemonAffinity;
    const mustUseDaemon =
      tool.stateful || daemonAffinity === 'required' || Boolean(opts.forceDaemon);
    const prefersDaemon = daemonAffinity === 'preferred';

    if (opts.runtime === 'cli') {
      // Check for conflicting options
      if (opts.disableDaemon && opts.forceDaemon) {
        return createErrorResponse(
          'Conflicting options',
          `Cannot use both --daemon and --no-daemon flags together.`,
        );
      }

      if (mustUseDaemon) {
        // Check if daemon is disabled
        if (opts.disableDaemon) {
          return createErrorResponse(
            'Daemon required',
            `Tool '${tool.cliName}' is stateful and requires the daemon.\n` +
              `Remove the --no-daemon flag, or start the daemon manually:\n` +
              `  xcodebuildmcp daemon start`,
          );
        }

        // Route through daemon with auto-start
        const socketPath = opts.socketPath;
        if (!socketPath) {
          return createErrorResponse(
            'Socket path required',
            `No socket path configured for daemon communication.`,
          );
        }

        const client = new DaemonClient({ socketPath });
        const cliExposedWorkflowIds = opts.cliExposedWorkflowIds ?? opts.enabledWorkflows;
        const envOverrides: Record<string, string> = {};
        if (cliExposedWorkflowIds && cliExposedWorkflowIds.length > 0) {
          envOverrides.XCODEBUILDMCP_ENABLED_WORKFLOWS = cliExposedWorkflowIds.join(',');
        }
        if (opts.logLevel) {
          envOverrides.XCODEBUILDMCP_DAEMON_LOG_LEVEL = opts.logLevel;
        }
        const envOverrideValue = Object.keys(envOverrides).length > 0 ? envOverrides : undefined;

        // Check if daemon is running; auto-start if not
        const isRunning = await client.isRunning();
        if (!isRunning) {
          try {
            await ensureDaemonRunning({
              socketPath,
              workspaceRoot: opts.workspaceRoot,
              startupTimeoutMs: opts.daemonStartupTimeoutMs ?? DEFAULT_DAEMON_STARTUP_TIMEOUT_MS,
              env: envOverrideValue,
            });
          } catch (error) {
            return createErrorResponse(
              'Daemon auto-start failed',
              (error instanceof Error ? error.message : String(error)) +
                `\n\nYou can try starting the daemon manually:\n` +
                `  xcodebuildmcp daemon start`,
            );
          }
        }

        try {
          const response = await client.invokeTool(tool.cliName, args);
          return opts.runtime === 'cli' ? enrichNextStepsForCli(response, this.catalog) : response;
        } catch (error) {
          return createErrorResponse(
            'Daemon invocation failed',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (prefersDaemon && !opts.disableDaemon && opts.socketPath) {
        const client = new DaemonClient({ socketPath: opts.socketPath, timeout: 1000 });
        try {
          const isRunning = await client.isRunning();
          if (isRunning) {
            const tools = await client.listTools();
            const hasTool = tools.some((item) => item.name === tool.cliName);
            if (hasTool) {
              const response = await client.invokeTool(tool.cliName, args);
              return opts.runtime === 'cli'
                ? enrichNextStepsForCli(response, this.catalog)
                : response;
            }
          }
        } catch {
          // Fall back to direct invocation
        }
      }
    }

    // Direct invocation (CLI stateless or daemon internal)
    try {
      const response = await tool.handler(args);
      return opts.runtime === 'cli' ? enrichNextStepsForCli(response, this.catalog) : response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResponse('Tool execution failed', message);
    }
  }
}
