import type { ToolCatalog, ToolDefinition, ToolInvoker, InvokeOptions } from './types.ts';
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

function buildDaemonEnvOverrides(opts: InvokeOptions): Record<string, string> | undefined {
  const envOverrides: Record<string, string> = {};

  if (opts.logLevel) {
    envOverrides.XCODEBUILDMCP_DAEMON_LOG_LEVEL = opts.logLevel;
  }

  return Object.keys(envOverrides).length > 0 ? envOverrides : undefined;
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

    return this.executeTool(resolved.tool, args, opts);
  }

  /**
   * Invoke a tool directly, bypassing catalog resolution.
   * Used by CLI where the correct ToolDefinition is already known
   * from workflow-scoped yargs routing.
   */
  async invokeDirect(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    return this.executeTool(tool, args, opts);
  }

  private async executeTool(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    opts: InvokeOptions,
  ): Promise<ToolResponse> {
    const xcodeIdeRemoteToolName = tool.xcodeIdeRemoteToolName;
    const isDynamicXcodeIdeTool =
      tool.workflow === 'xcode-ide' && typeof xcodeIdeRemoteToolName === 'string';

    if (opts.runtime === 'cli' && isDynamicXcodeIdeTool) {
      const socketPath = opts.socketPath;
      if (!socketPath) {
        return createErrorResponse(
          'Socket path required',
          `No socket path configured for daemon communication.`,
        );
      }

      const envOverrideValue = buildDaemonEnvOverrides(opts);
      const client = new DaemonClient({ socketPath });

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
        const response = await client.invokeXcodeIdeTool(xcodeIdeRemoteToolName, args);
        return enrichNextStepsForCli(response, this.catalog);
      } catch (error) {
        return createErrorResponse(
          'Xcode IDE invocation failed',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const mustUseDaemon = tool.stateful;

    if (opts.runtime === 'cli') {
      if (mustUseDaemon) {
        // Route through daemon with auto-start
        const socketPath = opts.socketPath;
        if (!socketPath) {
          return createErrorResponse(
            'Socket path required',
            `No socket path configured for daemon communication.`,
          );
        }

        const client = new DaemonClient({ socketPath });
        const envOverrideValue = buildDaemonEnvOverrides(opts);

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
          const response = await client.invokeTool(tool.mcpName, args);
          return opts.runtime === 'cli' ? enrichNextStepsForCli(response, this.catalog) : response;
        } catch (error) {
          return createErrorResponse(
            'Daemon invocation failed',
            error instanceof Error ? error.message : String(error),
          );
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
